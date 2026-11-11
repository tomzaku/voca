import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { usePronunciationCheck } from '../../hooks/usePronunciationCheck';
import { pronunciationModelCached } from '../../lib/pronunciation';
import { PHONEME_MODEL_MB } from '../../lib/pronunciationModel';
import { Coaching, PhoneTile, ScoreRing } from '../pronunciation/parts';
import { TEXT, VERDICT_ID, tone } from '../pronunciation/styles';

// "Say it" on the word card: one try at the word, scored sound by sound on the
// device (see lib/pronunciation.ts). Three layers, each only once it has
// something to show:
//
//   the mic        — big, with a live level meter, so you can see you're heard
//   the result     — a score ring and a tile per sound, coloured by how it came
//                    out, with what was heard instead on the ones that missed
//   the coaching   — for the sound you pick (the weakest, to start): the mouth
//                    diagram with your sound outlined over the target, and the
//                    IPA chart's own "how to" and tip for it
//
// Hear it / Hear yourself sit with the result: comparing the two by ear is
// half of what fixes a sound.

export function PronunciationCheck({ ipas, word, onHear }: {
  ipas: string[];
  /** The word as shown, for "Say “think”". */
  word: string;
  /** Play the word in the app's voice. */
  onHear: () => void;
}) {
  const intl = useIntl();
  const { phase, progress, result, empty, level, recordingUrl, start, stop } = usePronunciationCheck(ipas);
  const recording = phase === 'recording';
  const working = phase === 'working';
  // Which sound the coaching is about — tagged with its result, so a new try
  // goes back to the weakest sound rather than keeping an old pick.
  const [picked, setPicked] = useState<{ result: unknown; index: number } | null>(null);
  const pickedIndex = picked && picked.result === result ? picked.index : null;

  const weakest = result
    ? result.phones.reduce((w, p, i) => (p.score < result.phones[w].score ? i : w), 0)
    : -1;
  const focus = result ? result.phones[pickedIndex ?? weakest] : null;
  const showCoach = !!focus && (pickedIndex !== null || focus.status !== 'good');
  const micLabel = intl.formatMessage({ id: recording ? 'pron.stop' : 'pron.check' });

  return (
    <div className="mt-4 rounded-2xl border-2 border-border bg-bg-tertiary/40 overflow-hidden">
      {/* ── The mic ── */}
      <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
        <button
          onClick={recording ? stop : start}
          disabled={working}
          aria-label={micLabel}
          title={micLabel}
          className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-[background-color,box-shadow] disabled:opacity-70 ${recording
            ? 'bg-accent-red text-bg-primary'
            : 'btn-3d !rounded-full bg-accent-cyan text-bg-primary'}`}
          // The halo grows with your voice: proof the mic is hearing you.
          style={recording ? { boxShadow: `0 0 0 ${4 + level * 14}px rgba(239, 68, 68, 0.2)` } : undefined}
        >
          {working
            ? <span className="w-6 h-6 rounded-full border-[3px] border-bg-primary/30 border-t-bg-primary animate-spin" />
            : <Icon icon={recording ? 'lucide:square' : 'lucide:mic'} className="text-2xl" />}
        </button>

        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-text-primary leading-tight">
            {recording
              ? <FormattedMessage id="pron.listening" />
              : working
                ? <FormattedMessage id="pron.checking" />
                : <FormattedMessage id="pron.sayWord" values={{ word }} />}
          </p>
          {recording ? (
            <LevelMeter level={level} />
          ) : working && progress !== null && progress < 100 ? (
            <div className="mt-1.5">
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div className="h-full bg-accent-cyan transition-[width] duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-text-muted mt-1">
                <FormattedMessage id="pron.downloading" values={{ pct: Math.round(progress) }} />
              </p>
            </div>
          ) : (
            <p className="text-xs text-text-muted mt-0.5">
              {phase === 'denied' ? <span className="text-accent-red"><FormattedMessage id="pron.denied" /></span>
                : phase === 'error' ? <span className="text-accent-red"><FormattedMessage id="pron.error" /></span>
                : empty ? <FormattedMessage id="pron.nothingHeard" />
                : result ? <FormattedMessage id="pron.tapToRetry" />
                : pronunciationModelCached() ? <FormattedMessage id="pron.hint" />
                : <FormattedMessage id="pron.firstTime" values={{ mb: PHONEME_MODEL_MB }} />}
            </p>
          )}
        </div>

        <button
          onClick={onHear}
          className="btn-3d shrink-0 flex items-center gap-1.5 px-3 py-2 bg-bg-card text-text-secondary hover:text-accent-cyan text-sm"
          title={intl.formatMessage({ id: 'pron.hearIt' })}
        >
          <Icon icon="lucide:volume-2" />
          <span className="max-sm:hidden"><FormattedMessage id="pron.hearIt" /></span>
        </button>
      </div>

      {/* ── The result ── */}
      {result && !recording && !working && (
        <div className="border-t-2 border-border p-3 sm:p-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <ScoreRing score={result.score} />
            <div className="min-w-0 flex-1">
              <p className={`font-display font-extrabold text-lg leading-tight ${TEXT[tone(result.score)]}`}>
                <FormattedMessage id={VERDICT_ID[tone(result.score)]} />
              </p>
              {result.heard && (
                <p className="text-xs text-text-muted mt-0.5">
                  <FormattedMessage id="pron.weHeard" values={{ ipa: <span className="font-code">/{result.heard}/</span> }} />
                </p>
              )}
              {recordingUrl && <PlayButton url={recordingUrl} />}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5" role="list" aria-label={intl.formatMessage({ id: 'pron.sounds' })}>
            {result.phones.map((p, i) => (
              <PhoneTile
                key={i}
                phone={p}
                active={showCoach && focus === p}
                onClick={() => setPicked({ result, index: i })}
              />
            ))}
          </div>

          {showCoach && focus && <Coaching key={focus.ipa} phone={focus} />}
        </div>
      )}
    </div>
  );
}

/** Seven bars that rise with your voice. */
function LevelMeter({ level }: { level: number }) {
  const shape = [0.35, 0.6, 0.85, 1, 0.85, 0.6, 0.35];
  return (
    <div className="flex items-end gap-1 h-5 mt-1.5" aria-hidden>
      {shape.map((k, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-accent-red transition-[height] duration-75"
          style={{ height: `${Math.max(12, Math.min(100, level * k * 140))}%` }}
        />
      ))}
    </div>
  );
}

/** Play back the learner's own try. */
function PlayButton({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => { audioRef.current?.pause(); }, []);
  const toggle = () => {
    if (!audioRef.current || audioRef.current.src !== url) {
      audioRef.current?.pause();
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      void audioRef.current.play();
      setPlaying(true);
    }
  };
  return (
    <button onClick={toggle} className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-accent-cyan cursor-pointer">
      <Icon icon={playing ? 'lucide:square' : 'lucide:play'} />
      <FormattedMessage id="pron.hearYourself" />
    </button>
  );
}
