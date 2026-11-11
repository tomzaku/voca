import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { MouthDiagram } from '../MouthDiagram';
import { chartSymbol, ipaChartLink } from '../../lib/pronunciation';
import type { PhoneScore } from '../../lib/phonemeScore';
import type { IpaSound } from '../../data/ipa';
import { BAR, TEXT, TILE, tone } from './styles';
import { useIpaText } from '../../hooks/useIpaText';

// The pieces of a pronunciation result, shared by the word card's check
// (flashcard/PronunciationCheck) and the sentence results (SentenceScore).

export function ScoreRing({ score }: { score: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className={`relative w-16 h-16 shrink-0 ${TEXT[tone(score)]}`}>
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" stroke="currentColor" opacity="0.15" />
        <circle
          cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round" stroke="currentColor"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-xl">{score}</span>
    </div>
  );
}

export function PhoneTile({ phone, active, onClick }: { phone: PhoneScore; active: boolean; onClick: () => void }) {
  const intl = useIntl();
  const title = phone.heard === null
    ? `/${phone.ipa}/ · ${phone.score}`
    : phone.heard
      ? intl.formatMessage({ id: 'pron.heardInstead' }, { expected: phone.ipa, heard: phone.heard, score: phone.score })
      : intl.formatMessage({ id: 'pron.notHeard' }, { expected: phone.ipa });
  return (
    <button
      role="listitem"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`flex flex-col items-center min-w-12 px-2 pt-1.5 pb-1 rounded-xl border-2 transition-transform cursor-pointer ${TILE[phone.status]} ${active ? 'ring-2 ring-current -translate-y-0.5' : 'hover:-translate-y-0.5'}`}
    >
      <span className="font-code font-bold text-lg leading-none">{phone.ipa}</span>
      <span className="w-full h-1 rounded-full bg-current/15 mt-1.5 overflow-hidden">
        <span className={`block h-full rounded-full ${BAR[phone.status]}`} style={{ width: `${Math.max(6, phone.score)}%` }} />
      </span>
      <span className="font-code text-[10px] leading-none mt-1 h-2.5">
        {phone.heard === null ? '' : `→${phone.heard || '∅'}`}
      </span>
    </button>
  );
}


// The chart's 44 sounds with their "how to" and tip — loaded when coaching
// first opens, since it's a large module most cards never need.
let soundsPromise: Promise<Map<string, IpaSound>> | null = null;
function loadSounds() {
  soundsPromise ??= import('../../data/ipa').then(({ IPA_SOUNDS }) => new Map(IPA_SOUNDS.map((s) => [s.symbol, s])));
  return soundsPromise;
}

const SoundCompare = lazy(() => import('./SoundCompare'));

/** A sound's symbol with a speaker to hear it — its recording, or the voice
 *  reading it (lib/ipaPlayback, loaded on first tap). */
function SaySymbol({ label, symbol, className }: { label: string; symbol: string; className: string }) {
  const intl = useIntl();
  const [playing, setPlaying] = useState(false);
  const say = async () => {
    setPlaying(true);
    const { saySound } = await import('../../lib/ipaPlayback');
    if (!saySound(symbol, () => setPlaying(false))) setPlaying(false);
  };
  return (
    <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
      <span className={`font-code ${className}`}>/{label}/</span>
      <button
        onClick={say}
        title={intl.formatMessage({ id: 'pron.hearSymbol' }, { ipa: `/${symbol}/` })}
        aria-label={intl.formatMessage({ id: 'pron.hearSymbol' }, { ipa: `/${symbol}/` })}
        className={`p-0.5 rounded align-middle transition-colors ${playing ? 'text-accent-cyan' : 'text-text-muted hover:text-accent-cyan'}`}
      >
        <Icon icon={playing ? 'lucide:audio-lines' : 'lucide:volume-2'} className="text-base" />
      </button>
    </span>
  );
}

/** Keyed by sound upstream, so a new pick starts empty rather than on the last one's text. */
export function Coaching({ phone }: { phone: PhoneScore }) {
  const symbol = chartSymbol(phone.ipa);
  // Off-chart sounds (the /a/ said for /æ/) are kept: they can still be
  // drawn, heard and compared, just not linked to a chart page.
  const heardSymbol = phone.heard ? chartSymbol(phone.heard) ?? phone.heard : null;
  const canCompare = !!symbol && !!heardSymbol && heardSymbol !== symbol && phone.status !== 'good';
  const [comparing, setComparing] = useState(false);
  const [sound, setSound] = useState<IpaSound | null>(null);
  const text = useIpaText();
  useEffect(() => {
    let live = true;
    if (symbol) void loadSounds().then((m) => { if (live) setSound(m.get(symbol) ?? null); });
    return () => { live = false; };
  }, [symbol]);
  const link = ipaChartLink(phone.ipa);
  const good = phone.status === 'good';

  return (
    <div className="mt-3 flex gap-3 sm:gap-4 rounded-xl bg-bg-card border border-border p-3 animate-fade-in">
      {symbol && (
        <div className="shrink-0 w-36 sm:w-44">
          {/* Your sound outlined over the one to make — the difference is
              often visible: the tongue tip that never left the ridge. */}
          {canCompare ? (
            <button onClick={() => setComparing(true)} className="block w-full rounded-lg hover:bg-bg-tertiary transition-colors" aria-label={`/${symbol}/ – /${heardSymbol}/`}>
              <MouthDiagram symbol={symbol} ghost={heardSymbol!} view="both" className="w-full" />
            </button>
          ) : (
            <MouthDiagram symbol={symbol} view="both" className="w-full" />
          )}
        </div>
      )}
      <div className="min-w-0 text-sm">
        <p className="font-bold text-text-primary">
          {good
            ? <FormattedMessage id="pron.coachGood" values={{ ipa: symbol ? <SaySymbol label={phone.ipa} symbol={symbol} className="text-accent-green" /> : <span className="font-code text-accent-green">/{phone.ipa}/</span> }} />
            : phone.heard
              ? <FormattedMessage id="pron.coachHeard" values={{
                  ipa: symbol ? <SaySymbol label={phone.ipa} symbol={symbol} className="text-accent-green" /> : <span className="font-code text-accent-green">/{phone.ipa}/</span>,
                  heard: <SaySymbol label={phone.heard} symbol={heardSymbol!} className="text-accent-red" />,
                }} />
              : <FormattedMessage id="pron.coachMissing" values={{ ipa: symbol ? <SaySymbol label={phone.ipa} symbol={symbol} className="text-accent-red" /> : <span className="font-code text-accent-red">/{phone.ipa}/</span> }} />}
        </p>
        {canCompare && (
          <button
            onClick={() => setComparing(true)}
            className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg bg-accent-cyan/10 text-accent-cyan text-xs font-extrabold hover:bg-accent-cyan/20 transition-colors"
          >
            <Icon icon="lucide:git-compare-arrows" />
            <FormattedMessage id="pron.compareSounds" values={{ a: `/${symbol}/`, b: `/${heardSymbol}/` }} />
          </button>
        )}
        {comparing && canCompare && (
          <Suspense fallback={null}>
            <SoundCompare target={symbol!} heard={heardSymbol!} onClose={() => setComparing(false)} />
          </Suspense>
        )}
        {sound && (
          <>
            <p className="text-text-secondary mt-1 leading-snug">{text.howTo(sound)}</p>
            {!good && (
              <p className="flex gap-1.5 text-text-muted text-xs mt-1.5 leading-snug">
                <Icon icon="lucide:lightbulb" className="shrink-0 mt-px text-accent-yellow" />
                <span>{text.tip(sound)}</span>
              </p>
            )}
          </>
        )}
        {link && (
          <Link to={link} className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-accent-cyan hover:underline">
            <FormattedMessage id="pron.practise" values={{ ipa: `/${symbol}/` }} />
            <Icon icon="lucide:arrow-right" />
          </Link>
        )}
      </div>
    </div>
  );
}

/** Seven bars that rise with your voice. */
export function LevelMeter({ level }: { level: number }) {
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
export function PlayButton({ url }: { url: string }) {
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
