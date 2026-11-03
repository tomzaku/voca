import { useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

// Answer a speaking question out loud: record, read back what you said (the
// words appear as you speak where the browser can recognise them, otherwise
// once you stop — see useVoiceRecorder), and hear your own voice. Nothing
// leaves the device except through the browser's own recogniser; nothing is
// kept once you leave the question.

/** Long enough for a full answer, short enough that a forgotten tap ends. */
const MAX_MS = 2 * 60_000;

export function AnswerRecorder({ onAnswered }: { onAnswered?: () => void }) {
  const intl = useIntl();
  const [heard, setHeard] = useState<string | null>(null);
  const recorder = useVoiceRecorder({
    maxMs: MAX_MS,
    keepAudio: true,
    onTranscript: (text) => {
      setHeard(text);
      if (text) onAnswered?.();
    },
  });
  const { phase, live, audioUrl, modelProgress } = recorder;

  if (phase === 'unsupported') {
    return <p className="text-xs text-text-muted"><FormattedMessage id="conversation.recordUnsupported" /></p>;
  }

  const recording = phase === 'recording';
  const busy = phase === 'requesting' || phase === 'thinking';
  const start = () => { setHeard(null); void recorder.start(); };
  const text = recording ? live : heard;

  return (
    <div className="rounded-lg border border-accent-red/15 bg-accent-red/5 p-3 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={recording ? recorder.stop : start}
          disabled={busy}
          aria-label={intl.formatMessage({ id: recording ? 'conversation.recordStop' : 'conversation.recordStart' })}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer ${
            recording ? 'bg-accent-red text-bg-primary animate-glow-pulse' : 'bg-accent-red/15 text-accent-red hover:bg-accent-red/25'
          }`}
        >
          <Icon icon={busy ? 'lucide:loader-circle' : recording ? 'lucide:square' : 'lucide:mic'} width={14} className={busy ? 'animate-spin' : ''} />
          <FormattedMessage id={recording ? 'conversation.recordStop' : heard !== null ? 'conversation.recordAgain' : 'conversation.recordStart'} />
        </button>
        {audioUrl && !recording && <Playback url={audioUrl} />}
        <span className="text-[11px] text-text-muted">
          {phase === 'thinking'
            ? modelProgress > 0 && modelProgress < 100
              ? intl.formatMessage({ id: 'games.speakPreparingModel' }, { pct: Math.round(modelProgress) })
              : intl.formatMessage({ id: 'conversation.recordTranscribing' })
            : recording ? intl.formatMessage({ id: 'conversation.recordListening' }) : null}
        </span>
      </div>
      {phase === 'denied' && (
        <p className="text-xs text-text-muted"><FormattedMessage id="conversation.recordDenied" /></p>
      )}
      {text ? (
        <p className="text-sm text-text-primary leading-relaxed">
          <span className="text-[11px] font-semibold text-accent-red mr-1.5"><FormattedMessage id="conversation.recordYouSaid" /></span>
          {text}
        </p>
      ) : heard === '' && !recording && (
        <p className="text-xs text-text-muted"><FormattedMessage id="conversation.recordNothingHeard" /></p>
      )}
    </div>
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
        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold bg-accent-green/15 text-accent-green hover:bg-accent-green/25 transition-colors cursor-pointer"
        aria-label={intl.formatMessage({ id: playing ? 'conversation.recordPause' : 'conversation.recordPlay' })}
      >
        <Icon icon={playing ? 'lucide:pause' : 'lucide:play'} width={14} />
        <FormattedMessage id={playing ? 'conversation.recordPause' : 'conversation.recordPlay'} />
      </button>
    </>
  );
}
