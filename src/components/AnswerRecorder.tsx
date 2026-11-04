import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

// Answer a speaking question out loud: record, read back what you said (the
// words appear as you speak where the browser can recognise them, otherwise
// once you stop — see useVoiceRecorder), and hear your own voice. Nothing
// leaves the device except through the browser's own recogniser; nothing is
// kept once you leave the question.
//
// Split in two so the card can place them apart: the button lives with the
// card's other actions, the answer panel appears only once there's something
// to show — an empty recorder shouldn't sit between the question and the sample.

/** Long enough for a full answer, short enough that a forgotten tap ends. */
const MAX_MS = 2 * 60_000;

export type AnswerRecording = ReturnType<typeof useAnswerRecorder>;

export function useAnswerRecorder(onAnswered?: () => void) {
  const [heard, setHeard] = useState<string | null>(null);
  const recorder = useVoiceRecorder({
    maxMs: MAX_MS,
    keepAudio: true,
    onTranscript: (text) => {
      setHeard(text);
      if (text) onAnswered?.();
    },
  });
  const start = () => { setHeard(null); void recorder.start(); };
  return { ...recorder, heard, start };
}

/** Record / Stop / Record again — sized to sit in the card's action bar. */
export function RecordButton({ rec }: { rec: AnswerRecording }) {
  const intl = useIntl();
  if (rec.phase === 'unsupported') return null;
  const recording = rec.phase === 'recording';
  const busy = rec.phase === 'requesting' || rec.phase === 'thinking';
  const label = recording ? 'conversation.recordStop' : rec.heard !== null ? 'conversation.recordAgain' : 'conversation.recordStart';
  return (
    <button
      onClick={recording ? rec.stop : rec.start}
      disabled={busy}
      aria-label={intl.formatMessage({ id: label })}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer ${
        recording ? 'bg-accent-red text-bg-primary animate-glow-pulse' : 'bg-accent-red/10 text-accent-red hover:bg-accent-red/20'
      }`}
    >
      <Icon icon={busy ? 'lucide:loader-circle' : recording ? 'lucide:square' : 'lucide:mic'} width={14} className={busy ? 'animate-spin' : ''} />
      <FormattedMessage id={label} />
    </button>
  );
}

/** What you said, and your voice to play back. Renders nothing until you record. */
export function AnswerPanel({ rec }: { rec: AnswerRecording }) {
  const intl = useIntl();
  const { phase, live, audioUrl, modelProgress, heard } = rec;
  const recording = phase === 'recording';
  const thinking = phase === 'thinking';
  const text = recording ? live : heard;

  if (phase === 'denied') {
    return (
      <div className="px-3 sm:px-4 py-3 border-t border-border">
        <p className="text-xs text-text-muted"><FormattedMessage id="conversation.recordDenied" /></p>
      </div>
    );
  }
  if (!recording && !thinking && heard === null) return null;

  const status = thinking
    ? modelProgress > 0 && modelProgress < 100
      ? intl.formatMessage({ id: 'games.speakPreparingModel' }, { pct: Math.round(modelProgress) })
      : intl.formatMessage({ id: 'conversation.recordTranscribing' })
    : null;

  return (
    <div className="px-3 sm:px-4 py-3 border-t border-border animate-fade-in">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
          {recording && <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />}
          <FormattedMessage id="conversation.recordYouSaid" />
          {status && <span className="font-normal text-text-muted">· {status}</span>}
          {recording && <Elapsed />}
        </span>
        {audioUrl && !recording && <Playback url={audioUrl} />}
      </div>
      {text ? (
        <p className="text-sm text-text-primary leading-relaxed">{text}</p>
      ) : heard === '' && !recording ? (
        <p className="text-xs text-text-muted"><FormattedMessage id="conversation.recordNothingHeard" /></p>
      ) : (
        <p className="text-sm text-text-muted">…</p>
      )}
    </div>
  );
}

const clock = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** "Listening · 0:47 / 2:00" while recording — so a quiet stretch with no
 *  new words doesn't read as the recording having stopped, and the limit
 *  isn't a surprise. Mounted with the recording, so it starts from zero. */
function Elapsed() {
  const [from] = useState(() => Date.now());
  const [now, setNow] = useState(from);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);
  return (
    <span className="font-normal text-text-muted tabular-nums">
      · <FormattedMessage id="conversation.recordListening" /> {clock(now - from)} / {clock(MAX_MS)}
    </span>
  );
}

/** Your recording: a play/pause button over a hidden <audio>. */
function Playback({ url }: { url: string }) {
  const intl = useIntl();
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <>
      <audio ref={ref} src={url} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} className="hidden" />
      <button
        onClick={() => { const el = ref.current; if (el) { if (playing) el.pause(); else void el.play(); } }}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-text-secondary bg-bg-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
        aria-label={intl.formatMessage({ id: playing ? 'conversation.recordPause' : 'conversation.recordPlay' })}
      >
        <Icon icon={playing ? 'lucide:pause' : 'lucide:play'} width={12} />
        <FormattedMessage id={playing ? 'conversation.recordPause' : 'conversation.recordPlay'} />
      </button>
    </>
  );
}
