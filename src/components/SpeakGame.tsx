// "Say the word" — the only round in the app that tests *production*.
//
// Every other game tests recognition: pick it, spell it, unscramble it. You can
// pass all of them and still be unable to produce the word out loud, which is
// the half of vocabulary that actually gets used in conversation.
//
// Recording and on-device transcription live in useVoiceRecorder, shared with
// the world's Đông Ba chè stall; this file decides whether what was heard is the
// word.
//
// It lives in its own file rather than inside GuessGame.tsx with the others
// because microphone permission, model download and async transcription carry
// far more state than a keyboard-driven round.

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { spokenMatch } from '../lib/speechMatch';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

/** Hard stop on a recording, so a forgotten tap can't record forever. */
const MAX_RECORDING_MS = 6000;

interface Props {
  word: string;
  family?: string[];
  disabled?: boolean;
  onSolve: () => void;
  onWrong: () => void;
  onGaveUp: () => void;
}

export function SpeakGame({ word, family, disabled, onSolve, onWrong, onGaveUp }: Props) {
  const intl = useIntl();
  const [heard, setHeard] = useState('');
  const [wrong, setWrong] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const recorder = useVoiceRecorder({
    maxMs: MAX_RECORDING_MS,
    onTranscript: (text) => {
      setHeard(text);
      if (text && spokenMatch(text, word, family)) {
        onSolve();
      } else if (text) {
        setAttempts((n) => n + 1);
        setWrong(true);
        onWrong();
      }
    },
  });
  const { modelProgress } = recorder;
  // A miss shows until the next recording starts.
  const phase = wrong && recorder.phase === 'idle' ? 'wrong' : recorder.phase;
  const startRecording = () => { if (!disabled) { setWrong(false); void recorder.start(); } };
  const stopRecording = recorder.stop;

  if (phase === 'unsupported') {
    return (
      <p className="text-center text-sm text-text-muted py-6">
        <FormattedMessage id="games.speakUnsupported" />
      </p>
    );
  }

  if (phase === 'denied') {
    return (
      <div className="text-center py-6 flex flex-col items-center gap-3">
        <p className="text-sm text-text-muted max-w-xs">
          <FormattedMessage id="games.speakDenied" />
        </p>
        <button onClick={onGaveUp} className="btn-3d px-4 py-2 text-sm bg-bg-tertiary text-text-secondary">
          <FormattedMessage id="games.skipRound" />
        </button>
      </div>
    );
  }

  const busy = phase === 'requesting' || phase === 'thinking';

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <p className="text-sm text-text-muted text-center">
        {phase === 'recording'
          ? intl.formatMessage({ id: 'games.speakListening' })
          : phase === 'thinking'
            ? modelProgress > 0 && modelProgress < 100
              ? intl.formatMessage({ id: 'games.speakPreparingModel' }, { pct: Math.round(modelProgress) })
              : intl.formatMessage({ id: 'games.speakChecking' })
            : intl.formatMessage({ id: 'games.speakSayIt' })}
      </p>

      <button
        onClick={phase === 'recording' ? stopRecording : startRecording}
        disabled={disabled || busy}
        aria-label={intl.formatMessage({ id: phase === 'recording' ? 'games.stopRecording' : 'games.startRecording' })}
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
            <FormattedMessage
              id="games.speakHeard"
              values={{ heard, b: (c) => <span className="font-bold text-accent-red">{c}</span> }}
            />
          </p>
          <p className="text-xs text-text-muted/70 mt-0.5"><FormattedMessage id="games.speakTryAgain" /></p>
        </div>
      )}

      {/* Offered only after a couple of honest attempts — immediately would
          invite skipping, never would trap someone the model can't hear. */}
      {attempts >= 2 && phase !== 'recording' && (
        <button
          onClick={onGaveUp}
          className="text-xs text-text-muted hover:text-text-primary underline cursor-pointer"
        >
          <FormattedMessage id="games.showMeWord" />
        </button>
      )}
    </div>
  );
}
