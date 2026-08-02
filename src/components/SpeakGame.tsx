// "Say the word" — the only round in the app that tests *production*.
//
// Every other game tests recognition: pick it, spell it, unscramble it. You can
// pass all of them and still be unable to produce the word out loud, which is
// the half of vocabulary that actually gets used in conversation.
//
// Transcription is Whisper running on-device (see lib/whisperStt), so this costs
// no AI credits, sends no audio anywhere, and works without a network once the
// model is cached. That model is a ~40MB first download, which is why the
// loading state below is explicit rather than a bare spinner.
//
// It lives in its own file rather than inside GuessGame.tsx with the others
// because microphone permission, model download and async transcription carry
// far more state than a keyboard-driven round.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { transcribeBlob } from '../lib/whisperStt';
import { spokenMatch } from '../lib/speechMatch';
import { stopSpeaking } from '../lib/tts';

/** Hard stop on a recording, so a forgotten tap can't record forever. */
const MAX_RECORDING_MS = 6000;

type Phase =
  | 'idle'
  | 'requesting' // waiting on the microphone permission prompt
  | 'recording'
  | 'thinking' // decoding + transcribing (may include the model download)
  | 'wrong'
  | 'denied' // permission refused — a dead end we have to explain
  | 'unsupported';

interface Props {
  word: string;
  family?: string[];
  disabled?: boolean;
  onSolve: () => void;
  onWrong: () => void;
  onGaveUp: () => void;
}

export function SpeakGame({ word, family, disabled, onSolve, onWrong, onGaveUp }: Props) {
  const [phase, setPhase] = useState<Phase>(() =>
    // Both are needed: Safari gates getUserMedia on a secure context, and
    // MediaRecorder is absent on some older mobile browsers even when it isn't.
    typeof MediaRecorder !== 'undefined' && typeof navigator?.mediaDevices !== 'undefined'
      ? 'idle'
      : 'unsupported',
  );
  const [heard, setHeard] = useState('');
  const [modelProgress, setModelProgress] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards every setState after an await — the parent unmounts this on solve.
  const aliveRef = useRef(true);

  useEffect(() => {
    return () => {
      aliveRef.current = false;
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleAudio = useCallback(
    async (blob: Blob) => {
      setPhase('thinking');
      try {
        const text = await transcribeBlob(blob, (p) => {
          if (aliveRef.current) setModelProgress(p);
        });
        if (!aliveRef.current) return;
        setHeard(text);
        if (spokenMatch(text, word, family)) {
          onSolve();
        } else {
          setAttempts((n) => n + 1);
          setPhase('wrong');
          onWrong();
        }
      } catch (err) {
        if (!aliveRef.current) return;
        console.warn('[voca] transcription failed:', err);
        setHeard('');
        setPhase('idle');
      }
    },
    [word, family, onSolve, onWrong],
  );

  const stopRecording = useCallback(() => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled) return;
    // The card reads the word aloud on a win; don't record our own playback.
    stopSpeaking();
    setPhase('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!aliveRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        // Release the mic immediately — a live indicator lingering after the
        // round is over is alarming, and rightly so.
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (blob.size > 0) void handleAudio(blob);
        else if (aliveRef.current) setPhase('idle');
      };

      recorder.start();
      setPhase('recording');
      stopTimerRef.current = setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch (err) {
      if (!aliveRef.current) return;
      console.warn('[voca] microphone unavailable:', err);
      setPhase('denied');
    }
  }, [disabled, handleAudio, stopRecording]);

  if (phase === 'unsupported') {
    return (
      <p className="text-center text-sm text-text-muted py-6">
        This browser can't record audio, so the speaking round isn't available here.
      </p>
    );
  }

  if (phase === 'denied') {
    return (
      <div className="text-center py-6 flex flex-col items-center gap-3">
        <p className="text-sm text-text-muted max-w-xs">
          Voca needs microphone access for the speaking round. Allow it in your browser's site
          settings, then try again.
        </p>
        <button onClick={onGaveUp} className="btn-3d px-4 py-2 text-sm bg-bg-tertiary text-text-secondary">
          Skip this round
        </button>
      </div>
    );
  }

  const busy = phase === 'requesting' || phase === 'thinking';

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <p className="text-sm text-text-muted text-center">
        {phase === 'recording'
          ? 'Listening — say the word'
          : phase === 'thinking'
            ? modelProgress > 0 && modelProgress < 100
              ? `Preparing the speech model… ${Math.round(modelProgress)}%`
              : 'Checking what you said…'
            : 'Say the word out loud'}
      </p>

      <button
        onClick={phase === 'recording' ? stopRecording : () => void startRecording()}
        disabled={disabled || busy}
        aria-label={phase === 'recording' ? 'Stop recording' : 'Start recording'}
        className={`w-24 h-24 rounded-full flex items-center justify-center border-[3px] transition-colors disabled:opacity-60 cursor-pointer ${
          phase === 'recording'
            ? 'bg-accent-red text-bg-primary border-accent-red animate-glow-pulse'
            : 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/40 hover:bg-accent-cyan/25'
        }`}
      >
        <Icon
          icon={busy ? 'lucide:loader-circle' : phase === 'recording' ? 'lucide:square' : 'lucide:mic'}
          className={`text-4xl ${busy ? 'animate-spin' : ''}`}
        />
      </button>

      {phase === 'wrong' && heard && (
        <div className="text-center">
          {/* Showing the transcript matters: without it a rejection feels
              arbitrary, and the learner can't tell a pronunciation problem from
              a mishearing. */}
          <p className="text-sm text-text-muted">
            Heard <span className="font-bold text-accent-red">“{heard}”</span>
          </p>
          <p className="text-xs text-text-muted/70 mt-0.5">Tap the mic to try again.</p>
        </div>
      )}

      {/* Offered only after a couple of honest attempts — immediately would
          invite skipping, never would trap someone the model can't hear. */}
      {attempts >= 2 && phase !== 'recording' && (
        <button
          onClick={onGaveUp}
          className="text-xs text-text-muted hover:text-text-primary underline cursor-pointer"
        >
          Show me the word
        </button>
      )}
    </div>
  );
}
