import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  IPA_SOUNDS,
  MINIMAL_PAIRS,
  pairsForSymbol,
  sentencesForSymbols,
  youtubeSearchUrl,
  type IpaCategory,
  type IpaSentenceRound,
  type IpaSound,
  type MinimalPair,
} from '../data/ipa';
import { IPA_RECORDINGS, recordingUrl } from '../data/ipaAudio';
import { speakText, stopSpeaking } from '../lib/tts';
import { playCorrect, playWrong } from '../lib/sfx';
import { MouthDiagram, MouthTags } from './MouthDiagram';
import { articulationFor, contrast, sameMouth } from '../data/articulation';

type View = 'list' | 'practice' | 'detail';
type ListMode = 'all' | 'compare';
type PracticeMode = 'listen' | 'sentence';
/** What Practice is currently drilling — no symbols means the full pool. */
type PracticeTarget = { focus: string[]; mode: PracticeMode };

function pairKey(pair: MinimalPair): string {
  return `${pair.a.word}-${pair.b.word}`;
}

// Query-param state rather than component state, so a link to one sound's
// detail page, the practice tab, or the compare sub-view survives a refresh
// — same convention as /speaking and /listening's own `?tab=`. `mode` (the
// List sub-view) is carried along untouched by goDetail/goPractice, so
// "back" from a sound's detail page returns to whichever List sub-view sent
// you there. `focus`/`pmode` work the same way for Practice: switching
// between Listen and Sentences with the pill below keeps whatever focus
// (one sound, a compared pair, or none) sent you into Practice.
function useIpaState() {
  const [params, setParams] = useSearchParams();
  const rawView = params.get('view');
  const view: View = rawView === 'practice' ? 'practice' : rawView === 'detail' ? 'detail' : 'list';
  const mode: ListMode = params.get('mode') === 'compare' ? 'compare' : 'all';
  const practiceMode: PracticeMode = params.get('pmode') === 'sentence' ? 'sentence' : 'listen';
  const symbol = params.get('symbol');
  const focusRaw = params.get('focus');
  const focusSymbols = useMemo(() => focusRaw ? focusRaw.split(',').filter(Boolean) : [], [focusRaw]);

  const goList = useCallback((m?: ListMode) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('view');
      next.delete('symbol');
      next.delete('focus');
      next.delete('pmode');
      if ((m ?? mode) === 'compare') next.set('mode', 'compare'); else next.delete('mode');
      return next;
    }, { replace: true });
  }, [setParams, mode]);

  const goDetail = useCallback((sym: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', 'detail');
      next.set('symbol', sym);
      return next;
    }, { replace: true });
  }, [setParams]);

  // `focus` is left untouched when omitted (so the Listen/Sentences pill can
  // switch modes without dropping a pair's focus) — pass `focus: []`
  // explicitly to clear it.
  const goPractice = useCallback((opts?: { focus?: string[]; mode?: PracticeMode }) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', 'practice');
      next.delete('symbol');
      if (opts?.mode) next.set('pmode', opts.mode);
      if (opts?.focus !== undefined) {
        if (opts.focus.length > 0) next.set('focus', opts.focus.join(',')); else next.delete('focus');
      }
      return next;
    }, { replace: true });
  }, [setParams]);

  return { view, mode, practiceMode, symbol, focusSymbols, goList, goDetail, goPractice };
}

/** Colour per sound family, so a symbol reads as "long vowel" or "consonant"
 *  at a glance everywhere it appears — chart, compare, detail, quiz. */
const CATEGORY_STYLE: Record<IpaCategory, { text: string; chip: string; hover: string; dot: string; blurb: string }> = {
  'vowel-short': {
    text: 'text-accent-cyan', chip: 'bg-accent-cyan/10 text-accent-cyan', hover: 'hover:border-accent-cyan/60', dot: 'bg-accent-cyan',
    blurb: 'Quick and relaxed',
  },
  'vowel-long': {
    text: 'text-accent-blue', chip: 'bg-accent-blue/10 text-accent-blue', hover: 'hover:border-accent-blue/60', dot: 'bg-accent-blue',
    blurb: 'Held longer — that’s what the ː means',
  },
  diphthong: {
    text: 'text-accent-purple', chip: 'bg-accent-purple/10 text-accent-purple', hover: 'hover:border-accent-purple/60', dot: 'bg-accent-purple',
    blurb: 'Two vowels gliding into one',
  },
  consonant: {
    text: 'text-accent-orange', chip: 'bg-accent-orange/10 text-accent-orange', hover: 'hover:border-accent-orange/60', dot: 'bg-accent-orange',
    blurb: 'Made by stopping or squeezing the air',
  },
};

const soundFor = (symbol: string) => IPA_SOUNDS.find((s) => s.symbol === symbol);
const styleFor = (symbol: string) => CATEGORY_STYLE[soundFor(symbol)?.category ?? 'consonant'];

// One recording at a time across the page, and never over the TTS voice.
let soundAudio: HTMLAudioElement | null = null;
function stopAll() {
  stopSpeaking();
  soundAudio?.pause();
  soundAudio = null;
}

/** Speak a word — or play a sound's recording — toggling to a stop icon
 *  mid-playback. `playing` is the word, or `/symbol/` for a sound. */
function useSpeak() {
  const [playing, setPlaying] = useState<string | null>(null);
  const speak = useCallback((text: string) => {
    stopAll();
    if (playing === text) { setPlaying(null); return; }
    setPlaying(text);
    speakText(text, { onEnd: () => setPlaying(null) }).catch(() => setPlaying(null));
  }, [playing]);
  const speakSound = useCallback((symbol: string) => {
    const key = `/${symbol}/`;
    stopAll();
    if (playing === key) { setPlaying(null); return; }
    const rec = IPA_RECORDINGS[symbol];
    if (!rec) {
      // Diphthongs have no recording: a word is the honest substitute.
      const word = soundFor(symbol)?.examples[0];
      if (!word) return;
      setPlaying(key);
      speakText(word, { onEnd: () => setPlaying(null) }).catch(() => setPlaying(null));
      return;
    }
    const audio = new Audio(recordingUrl(rec));
    soundAudio = audio;
    setPlaying(key);
    const done = () => { if (soundAudio === audio) soundAudio = null; setPlaying((p) => (p === key ? null : p)); };
    audio.onended = done;
    audio.onerror = done;
    audio.onpause = done;
    audio.play().catch(done);
  }, [playing]);
  return { playing, speak, speakSound };
}

/** "Recording: Peter Isotalo · CC BY-SA 3.0" — the attribution the licence asks for. */
function RecordingCredit({ symbol }: { symbol: string }) {
  const rec = IPA_RECORDINGS[symbol];
  if (!rec) {
    return (
      <p className="mt-2 text-[11px] text-text-muted">
        There’s no standard recording of /{symbol}/ on its own, so 🔊 plays an example word.
      </p>
    );
  }
  return (
    <p className="mt-2 text-[11px] text-text-muted">
      Recording:{' '}
      <a href={rec.page} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-accent-cyan">
        {rec.author}
      </a>
      {' '}· {rec.license} · Wikimedia Commons
    </p>
  );
}

/** Round button that says the sound itself — /θ/, not "think". */
function SoundButton({ symbol, size = 'sm', className = '' }: { symbol: string; size?: 'sm' | 'lg'; className?: string }) {
  const { playing, speakSound } = useSpeak();
  const on = playing === `/${symbol}/`;
  const word = IPA_RECORDINGS[symbol] ? null : soundFor(symbol)?.examples[0];
  return (
    <button
      onClick={(e) => { e.stopPropagation(); speakSound(symbol); }}
      title={word ? `Hear /${symbol}/ in “${word}”` : `Hear /${symbol}/`}
      aria-label={`Hear the sound /${symbol}/`}
      className={`shrink-0 rounded-full flex items-center justify-center transition-all ${
        size === 'lg' ? 'w-12 h-12 text-xl' : 'w-8 h-8 text-sm'
      } ${on ? 'bg-accent-cyan text-bg-primary' : 'bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20'} ${className}`}
    >
      <Icon icon={on ? 'lucide:audio-lines' : 'lucide:volume-2'} className={on ? 'animate-pulse' : ''} />
    </button>
  );
}

/** Small pill that speaks one example word on click — toggles to a stop icon
 *  mid-playback, same affordance as the flash card's own speaker buttons. */
function WordChip({ word }: { word: string }) {
  const { playing, speak } = useSpeak();
  return (
    <button
      onClick={(e) => { e.stopPropagation(); speak(word); }}
      className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-bg-tertiary text-text-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-all"
    >
      <Icon icon={playing === word ? 'lucide:square' : 'lucide:volume-2'} className="text-[11px]" />
      {word}
    </button>
  );
}

type NavKey = 'chart' | 'compare' | 'listen' | 'sentence';

/** The page's one navigation row — the four things you can do here, rather
 *  than a List/Practice strip with a second switch under each half. */
function ModeNav({ active, onChange }: { active: NavKey; onChange: (k: NavKey) => void }) {
  const items: { key: NavKey; label: string; icon: string }[] = [
    { key: 'chart', label: 'Sound chart', icon: 'lucide:layout-grid' },
    { key: 'compare', label: 'Compare', icon: 'lucide:git-compare-arrows' },
    { key: 'listen', label: 'Listening quiz', icon: 'lucide:headphones' },
    { key: 'sentence', label: 'Sentences', icon: 'lucide:mic' },
  ];
  return (
    <nav role="tablist" className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-2xl border-2 border-border bg-bg-tertiary">
      {items.map((it) => {
        const on = active === it.key;
        return (
          <button
            key={it.key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(it.key)}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-sm font-extrabold transition-all ${
              on ? 'bg-bg-card text-text-primary tile-lip' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Icon icon={it.icon} className={on ? 'text-accent-cyan' : ''} />
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}

/** "Practicing /ɪ/ vs /iː/ ×" above a practice view, or its plain hint. */
function FocusBar({ symbols, hint, onClear, children }: {
  symbols: string[];
  hint: string;
  onClear: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap mb-4 min-h-8">
      {symbols.length > 0 ? (
        <span className="flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-accent-cyan/10 text-xs font-bold text-accent-cyan">
          Practicing {symbols.map((s) => `/${s}/`).join(' vs ')}
          <button
            onClick={onClear}
            title="Practice every sound"
            aria-label="Practice every sound"
            className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-accent-cyan/20"
          >
            <Icon icon="lucide:x" className="text-xs" />
          </button>
        </span>
      ) : (
        <span className="text-xs font-bold text-text-muted">{hint}</span>
      )}
      {children}
    </div>
  );
}

function SoundCard({ sound, onOpen }: { sound: IpaSound; onOpen: (symbol: string) => void }) {
  const style = CATEGORY_STYLE[sound.category];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(sound.symbol)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(sound.symbol); }}
      className={`group flex flex-col gap-3 p-3.5 rounded-2xl border-2 border-border bg-bg-card cursor-pointer transition-all hover:-translate-y-0.5 ${style.hover}`}
    >
      <div className="flex items-start justify-between">
        <span className={`font-code text-3xl font-black leading-none ${style.text}`}>/{sound.symbol}/</span>
        <SoundButton symbol={sound.symbol} />
      </div>
      <div className="flex flex-wrap gap-1">
        {sound.examples.map((w) => <WordChip key={w} word={w} />)}
      </div>
    </div>
  );
}

/** Every sound, grouped by category — the plain reference chart. */
function AllSoundsView({ onOpen }: { onOpen: (symbol: string) => void }) {
  const groups = useMemo(() => {
    const byCategory = new Map<IpaCategory, IpaSound[]>();
    for (const sound of IPA_SOUNDS) {
      if (!byCategory.has(sound.category)) byCategory.set(sound.category, []);
      byCategory.get(sound.category)!.push(sound);
    }
    return CATEGORY_ORDER
      .filter((c) => byCategory.has(c))
      .map((category) => ({ category, sounds: byCategory.get(category)! }));
  }, []);

  return (
    <div className="space-y-8">
      <p className="flex items-center gap-1.5 text-xs text-text-muted">
        <Icon icon="lucide:info" />
        Tap <Icon icon="lucide:volume-2" className="text-accent-cyan" /> to hear the sound, a word to hear it in use, or the card to see how the mouth makes it.
      </p>
      {groups.map(({ category, sounds }) => {
        const style = CATEGORY_STYLE[category];
        return (
          <section key={category}>
            <div className="flex items-baseline gap-2 mb-3 px-1">
              <span className={`w-2.5 h-2.5 rounded-full self-center ${style.dot}`} />
              <h2 className="font-display font-extrabold text-text-primary">{CATEGORY_LABELS[category]}</h2>
              <span className="text-xs font-bold text-text-muted">{sounds.length}</span>
              <span className="hidden sm:inline text-xs text-text-muted">· {style.blurb}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
              {sounds.map((sound) => <SoundCard key={sound.symbol} sound={sound} onOpen={onOpen} />)}
            </div>
          </section>
        );
      })}
      <p className="text-[11px] text-text-muted">
        Sound recordings from Wikimedia Commons (CC BY-SA and public domain) — each sound’s page credits its recording.
        Diphthongs have no standard recording, so theirs play an example word.
      </p>
    </div>
  );
}

/** One side of a comparison card: the mouth making the sound with the other
 *  sound outlined over it, its symbol and word, and what it does differently
 *  — so the difference is spelled out, not left to spotting a few pixels. */
function CompareSide({ side, other, animate, onOpen }: {
  side: MinimalPair['a'];
  other: MinimalPair['a'];
  animate: boolean;
  onOpen: (symbol: string) => void;
}) {
  const same = sameMouth(side.symbol, other.symbol);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(side.symbol)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(side.symbol); }}
      className="flex-1 min-w-0 flex flex-col p-3 rounded-xl bg-bg-tertiary hover:bg-bg-hover cursor-pointer transition-colors"
    >
      <MouthDiagram symbol={side.symbol} ghost={same ? undefined : other.symbol} animate={animate} className="w-full h-32 mb-2" />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="flex items-center gap-1.5">
          <span className={`font-code text-xl font-black ${styleFor(side.symbol).text}`}>/{side.symbol}/</span>
          <SoundButton symbol={side.symbol} />
        </span>
        <WordChip word={side.word} />
      </div>
      <ContrastList symbol={side.symbol} other={other.symbol} />
    </div>
  );
}

/** What one sound does differently from the other, as a short bullet list. */
function ContrastList({ symbol, other }: { symbol: string; other: string }) {
  const points = contrast(symbol, other);
  if (points.length === 0) return null;
  return (
    <ul className="space-y-0.5">
      {points.map((t) => (
        <li key={t} className="flex items-start gap-1 text-[11px] font-bold text-text-secondary leading-snug">
          <Icon icon="lucide:chevron-right" className={`shrink-0 mt-px ${styleFor(symbol).text}`} />
          {t}
        </li>
      ))}
    </ul>
  );
}

/** Words that differ only by the pair's two sounds, as wrapping "a ⇄ b"
 *  pills — the headline pair first, the left word always the left side's
 *  sound. Tap either word to hear it; saying a pill left-to-right is the
 *  drill. */
function WordPairs({ pair }: { pair: MinimalPair }) {
  const rows: [string, string][] = [[pair.a.word, pair.b.word], ...pair.more];
  return (
    <div className="mt-3 rounded-xl bg-bg-secondary px-3 py-2.5">
      <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-text-muted">
        Word pairs · <span className={`font-code ${styleFor(pair.a.symbol).text}`}>/{pair.a.symbol}/</span>
        {' ⇄ '}
        <span className={`font-code ${styleFor(pair.b.symbol).text}`}>/{pair.b.symbol}/</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {rows.map(([a, b]) => <PairPill key={a + b} a={a} b={b} aClass={styleFor(pair.a.symbol).text} bClass={styleFor(pair.b.symbol).text} />)}
      </div>
    </div>
  );
}

function PairPill({ a, b, aClass, bClass }: { a: string; b: string; aClass: string; bClass: string }) {
  const { playing, speak } = useSpeak();
  const word = (w: string, cls: string) => (
    <button
      onClick={(e) => { e.stopPropagation(); speak(w); }}
      title={`Hear “${w}”`}
      className={`px-1 rounded hover:bg-bg-hover transition-colors ${playing === w ? cls : 'text-text-primary'}`}
    >
      {w}
    </button>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold pl-1 pr-1 py-0.5 rounded-full bg-bg-card border border-border">
      {word(a, aClass)}
      <Icon icon="lucide:arrow-left-right" className="text-[10px] text-text-muted" />
      {word(b, bClass)}
    </span>
  );
}

/** Both sounds' spellings, each under its own column, one row per letter
 *  group. Letters that spell *both* sounds come first and share a row — "i"
 *  is /iː/ in "machine" but /ɪ/ in "sit" — because that's exactly where
 *  reading a word aloud goes wrong. Below them the rest pack side by side. */
function SpellingColumns({ a, b }: { a: string; b: string }) {
  const left = new Map(soundFor(a)?.spellings ?? []);
  const right = new Map(soundFor(b)?.spellings ?? []);
  // Shared letters on one row each; the rest just packed side by side, so
  // neither column runs on alone with gaps opposite it.
  const shared = [...left.keys()].filter((l) => right.has(l));
  const onlyLeft = [...left.keys()].filter((l) => !right.has(l));
  const onlyRight = [...right.keys()].filter((l) => !left.has(l));
  const rows: [string | undefined, string | undefined][] = [
    ...shared.map((l) => [l, l] as [string, string]),
    ...Array.from({ length: Math.max(onlyLeft.length, onlyRight.length) }, (_, i) => [onlyLeft[i], onlyRight[i]] as [string | undefined, string | undefined]),
  ];
  if (rows.length === 0) return null;

  const cell = (symbol: string, l: string | undefined, words: string[] | undefined) =>
    l && words ? (
      <div className="min-w-0 rounded-xl bg-bg-tertiary p-2.5">
        <span className={`inline-block mb-1.5 px-2 py-0.5 rounded-lg font-code text-sm font-black ${CATEGORY_STYLE[soundFor(symbol)!.category].chip}`}>
          {l}
        </span>
        <div className="flex flex-wrap gap-1">
          {words.map((w) => <WordChip key={w} word={w} />)}
        </div>
      </div>
    ) : <div />;

  return (
    <div className="mt-3">
      <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-wider text-text-muted">
        {shared.length > 0 ? 'Spellings · same letters line up' : 'Spellings · no letters in common — the spelling tells you which'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {rows.map(([l, r]) => (
          <Fragment key={`${l}|${r}`}>
            {cell(a, l, l ? left.get(l) : undefined)}
            {cell(b, r, r ? right.get(r) : undefined)}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/** Sounds people actually confuse, side by side — /ɪ/ next to /iː/, /θ/ next
 *  to /ð/, and so on — reusing the same pairs the Practice quiz draws from,
 *  so "what's different about these two" and "can I hear the difference"
 *  stay backed by one list instead of two that could drift apart. */
function CompareView({ onOpen, onPractice }: { onOpen: (symbol: string) => void; onPractice: (target: PracticeTarget) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {MINIMAL_PAIRS.map((pair) => (
        <CompareCard key={pairKey(pair)} pair={pair} onOpen={onOpen} onPractice={onPractice} />
      ))}
    </div>
  );
}

/** One pair. Both mouths move together while the card is hovered or focused
 *  — two loops started apart would never line up for comparing. `autoPlay`
 *  keeps them moving regardless, for a sound's page where there are only a
 *  card or two rather than a whole grid of loops. */
function CompareCard({ pair, autoPlay = false, spellings = false, onOpen, onPractice }: {
  pair: MinimalPair;
  autoPlay?: boolean;
  /** Both sounds' spelling groups under their columns (a sound's page). */
  spellings?: boolean;
  onOpen: (symbol: string) => void;
  onPractice: (target: PracticeTarget) => void;
}) {
  const [hovered, setActive] = useState(false);
  const active = autoPlay || hovered;
  const focus = [pair.a.symbol, pair.b.symbol];
  const same = sameMouth(pair.a.symbol, pair.b.symbol);
  const voiced = articulationFor(pair.a.symbol)?.voiced ? pair.a : pair.b;
  const voiceless = voiced === pair.a ? pair.b : pair.a;
  return (
    <div
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      className="p-3 rounded-2xl border-2 border-border bg-bg-card"
    >
      <div className="relative flex items-stretch gap-2">
        <CompareSide side={pair.a} other={pair.b} animate={active} onOpen={onOpen} />
        <span className="absolute left-1/2 top-16 -translate-x-1/2 w-8 h-8 rounded-full bg-bg-card border-2 border-border flex items-center justify-center text-[10px] font-black text-text-muted pointer-events-none">
          VS
        </span>
        <CompareSide side={pair.b} other={pair.a} animate={active} onOpen={onOpen} />
      </div>
      <p className="flex items-start gap-1.5 mt-2.5 px-1 text-[11px] text-text-muted leading-snug">
        {same ? (
          <>
            <Icon icon="lucide:hand" className="shrink-0 text-sm text-accent-cyan" />
            <span>
              <b className="text-text-secondary">Same mouth shape</b> — only the voice changes. Hand on your throat:
              /{voiced.symbol}/ buzzes, /{voiceless.symbol}/ is just air.
            </span>
          </>
        ) : (
          <>
            <span className="shrink-0 mt-1.5 w-4 border-t-2 border-dashed border-accent-yellow" />
            <span>Dashed outline is the other sound{autoPlay ? '' : ' — hover to see both move'}.</span>
          </>
        )}
      </p>
      <WordPairs pair={pair} />
      {spellings && <SpellingColumns a={pair.a.symbol} b={pair.b.symbol} />}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={() => onPractice({ focus, mode: 'listen' })}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent-cyan/10 text-xs font-extrabold text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
        >
          <Icon icon="lucide:headphones" className="text-sm" /> Hear the difference
        </button>
        <button
          onClick={() => onPractice({ focus, mode: 'sentence' })}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent-purple/10 text-xs font-extrabold text-accent-purple hover:bg-accent-purple/20 transition-colors"
        >
          <Icon icon="lucide:mic" className="text-sm" /> Say sentences
        </button>
      </div>
    </div>
  );
}

/** One sound's own page: the mouth making it, how to make it, a longer word
 *  list, the sounds it's confused with, and a link out to real pronunciation
 *  videos — a search rather than one embedded video we can't verify still
 *  exists. */
function DetailView({ symbol, onBack, onOpen, onPractice }: {
  symbol: string;
  onBack: () => void;
  onOpen: (symbol: string) => void;
  onPractice: (target: PracticeTarget) => void;
}) {
  const sound = soundFor(symbol);
  const pairs = useMemo(() => pairsForSymbol(symbol), [symbol]);
  const { playing, speak, speakSound } = useSpeak();
  // Prev/next and "often confused with" swap the sound in place; start each
  // one at the top rather than wherever the last one was scrolled to.
  useEffect(() => { window.scrollTo({ top: 0 }); }, [symbol]);

  if (!sound) {
    return (
      <div>
        <p className="text-sm text-text-muted mb-4">Unknown sound.</p>
        <button onClick={onBack} className="text-sm font-bold text-accent-cyan">← Back to the chart</button>
      </div>
    );
  }

  const style = CATEGORY_STYLE[sound.category];
  const index = IPA_SOUNDS.indexOf(sound);
  const prev = IPA_SOUNDS[(index - 1 + IPA_SOUNDS.length) % IPA_SOUNDS.length];
  const next = IPA_SOUNDS[(index + 1) % IPA_SOUNDS.length];

  // The usual mistake — mostly about the sound this one slides into — heads
  // the confused-with and spellings columns, since it speaks to both.
  const tip = (
    <section className="flex items-start gap-2.5 rounded-2xl border-2 border-accent-orange/30 bg-accent-orange/5 px-4 py-3 mb-4">
      <Icon icon="lucide:triangle-alert" className="shrink-0 mt-0.5 text-accent-orange" />
      <p className="text-sm text-text-primary leading-relaxed">
        <b className="text-accent-orange">Watch out · </b>{sound.tip}
      </p>
    </section>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-text-muted hover:text-accent-cyan transition-colors">
          <Icon icon="lucide:arrow-left" className="text-sm" /> Sound chart
        </button>
        <div className="flex items-center gap-1.5">
          {[{ s: prev, icon: 'lucide:chevron-left', label: 'Previous sound' }, { s: next, icon: 'lucide:chevron-right', label: 'Next sound' }].map(({ s, icon, label }) => (
            <button
              key={label}
              onClick={() => onOpen(s.symbol)}
              title={`${label}: /${s.symbol}/`}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border-2 border-border bg-bg-card text-xs font-extrabold text-text-secondary hover:text-text-primary hover:border-border-light transition-colors"
            >
              {icon.endsWith('left') && <Icon icon={icon} />}
              <span className="font-code">/{s.symbol}/</span>
              {icon.endsWith('right') && <Icon icon={icon} />}
            </button>
          ))}
        </div>
      </div>

      {/* Hero: the moving mouth beside the symbol and how to make it */}
      <div className="card-game p-5 sm:p-6 mb-5 grid grid-cols-1 sm:grid-cols-[15rem_1fr] gap-5 items-center">
        <div className="rounded-2xl bg-bg-secondary border-2 border-border p-3">
          <MouthDiagram symbol={sound.symbol} className="w-full h-auto" />
          <div className="mt-2"><MouthTags symbol={sound.symbol} /></div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className={`font-code text-5xl font-black leading-none ${style.text}`}>/{sound.symbol}/</span>
            <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full ${style.chip}`}>
              {CATEGORY_LABELS[sound.category]}
            </span>
          </div>
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">How to say it</h3>
          <p className="text-[15px] text-text-primary leading-relaxed mb-4">{sound.howTo}</p>
          <div className="flex flex-wrap gap-2">
            {IPA_RECORDINGS[sound.symbol] && <button
              onClick={() => speakSound(sound.symbol)}
              className="btn-3d inline-flex items-center gap-2 px-4 py-2.5 bg-accent-cyan text-bg-primary"
            >
              <Icon icon={playing === `/${sound.symbol}/` ? 'lucide:audio-lines' : 'lucide:volume-2'} className="text-lg" />
              Hear /{sound.symbol}/
            </button>}
            <button
              onClick={() => speak(sound.examples[0])}
              className="btn-3d inline-flex items-center gap-2 px-4 py-2.5 bg-bg-card text-text-primary"
            >
              <Icon icon={playing === sound.examples[0] ? 'lucide:square' : 'lucide:volume-2'} className="text-lg" />
              In “{sound.examples[0]}”
            </button>
          </div>
          <RecordingCredit symbol={sound.symbol} />
        </div>
      </div>

      {tip}

      {/* One card per confused pair, the two sounds as columns all the way
          down: mouths, word pairs, then both sounds' spellings. A sound with
          no pair just lists its own spellings. */}
      {pairs.length > 0 ? (
        <section className="mb-5">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 px-1">
            Often confused with
          </h3>
          <div className="flex flex-col gap-4">
            {pairs.map((pair) => {
              // This page's sound always on the left, so every card reads "this vs that".
              const flip = pair.b.symbol === symbol;
              return (
                <CompareCard
                  key={pairKey(pair)}
                  pair={flip ? { a: pair.b, b: pair.a, more: pair.more.map(([x, y]) => [y, x]) } : pair}
                  autoPlay
                  spellings
                  onOpen={onOpen}
                  onPractice={onPractice}
                />
              );
            })}
          </div>
        </section>
      ) : (
        <section className="mb-5">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 px-1">
            Spellings{' '}
            <span className="normal-case tracking-normal font-semibold">
              · {sound.spellings.reduce((n, [, words]) => n + words.length, 0)} words — tap to hear
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
            {sound.spellings.map(([letters, words]) => (
              <div key={letters} className="rounded-2xl border-2 border-border bg-bg-card p-3">
                <span className={`inline-block mb-2 px-2 py-0.5 rounded-lg font-code text-base font-black ${style.chip}`}>{letters}</span>
                <div className="flex flex-wrap gap-1.5">
                  {words.map((w) => <WordChip key={w} word={w} />)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {pairs.length > 0 && (
          <button
            onClick={() => onPractice({ focus: [sound.symbol], mode: 'listen' })}
            className="btn-3d flex items-center justify-center gap-2 py-3 bg-accent-cyan text-bg-primary"
          >
            <Icon icon="lucide:headphones" className="text-lg" />
            Listening quiz
          </button>
        )}
        <button
          onClick={() => onPractice({ focus: [sound.symbol], mode: 'sentence' })}
          className="btn-3d flex items-center justify-center gap-2 py-3 bg-accent-purple text-bg-primary"
        >
          <Icon icon="lucide:mic" className="text-lg" />
          Say sentences
        </button>
        <a
          href={youtubeSearchUrl(sound.symbol)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-3d flex items-center justify-center gap-2 py-3 bg-bg-card text-text-primary"
        >
          <Icon icon="lucide:youtube" className="text-lg text-accent-red" />
          Videos
        </a>
      </div>
    </div>
  );
}

interface Round {
  pair: MinimalPair;
  correct: 'a' | 'b';
  order: ['a', 'b'] | ['b', 'a'];
}

function randomRound(pool: MinimalPair[], avoidKey?: string): Round {
  let pair: MinimalPair;
  do {
    pair = pool[Math.floor(Math.random() * pool.length)];
  } while (pool.length > 1 && pairKey(pair) === avoidKey);
  return {
    pair,
    correct: Math.random() < 0.5 ? 'a' : 'b',
    order: Math.random() < 0.5 ? ['a', 'b'] : ['b', 'a'],
  };
}

/** Minimal-pairs listening quiz: play one word from a pair the learner often
 *  confuses (ship/sheep, thin/... teethe, etc.), pick which one they heard.
 *  `focusSymbols` narrows the pool to pairs contrasting its first sound,
 *  reached from a sound's detail page or the Compare view; otherwise every
 *  pair is fair game. After each answer both words can be heard again and
 *  both mouths are shown side by side — the moment the difference matters.
 *  Keys: 1/2 pick, Space replays, Enter goes on. */
function ListenPracticeView({ focusSymbols, onClearFocus }: { focusSymbols: string[]; onClearFocus: () => void }) {
  const focusSymbol = focusSymbols[0] ?? null;
  const pool = useMemo(() => {
    if (!focusSymbol) return MINIMAL_PAIRS;
    const filtered = pairsForSymbol(focusSymbol);
    return filtered.length > 0 ? filtered : MINIMAL_PAIRS;
  }, [focusSymbol]);

  const [round, setRound] = useState<Round>(() => randomRound(pool));
  const [picked, setPicked] = useState<'a' | 'b' | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0, streak: 0 });
  const [playing, setPlaying] = useState(false);

  // A new focus (or leaving one) starts a fresh round from the right pool.
  useEffect(() => {
    setRound(randomRound(pool));
    setPicked(null);
  }, [pool]);

  const playPrompt = useCallback((r: Round) => {
    stopSpeaking();
    setPlaying(true);
    speakText(r.pair[r.correct].word, { onEnd: () => setPlaying(false) }).catch(() => setPlaying(false));
  }, []);

  // Auto-speak each new round, same as CollectionQuiz's "listen" questions.
  useEffect(() => {
    playPrompt(round);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const pick = useCallback((side: 'a' | 'b') => {
    if (picked) return;
    setPicked(side);
    const ok = side === round.correct;
    if (ok) playCorrect(); else playWrong();
    setScore((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1, streak: ok ? s.streak + 1 : 0 }));
  }, [picked, round]);

  const next = useCallback(() => {
    setPicked(null);
    setRound(randomRound(pool, pairKey(round.pair)));
  }, [pool, round]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]')) return;
      if (e.key === '1' || e.key === '2') pick(round.order[Number(e.key) - 1]);
      else if (e.key === ' ') { e.preventDefault(); playPrompt(round); }
      else if (e.key === 'Enter' && picked) { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pick, next, playPrompt, round, picked]);

  const answer = round.pair[round.correct];
  const gotIt = picked === round.correct;

  return (
    <div className="max-w-xl mx-auto">
      <FocusBar symbols={focusSymbols} hint="Listen, then pick the word you heard" onClear={onClearFocus}>
        <div className="flex items-center gap-2 text-xs font-extrabold">
          <span className="px-2 py-1 rounded-full bg-accent-green/10 text-accent-green">
            {score.correct} / {score.total}
          </span>
          {score.streak >= 2 && (
            <span className="px-2 py-1 rounded-full bg-accent-orange/10 text-accent-orange animate-pop-in">
              🔥 {score.streak}
            </span>
          )}
        </div>
      </FocusBar>

      <div className="card-game p-6 mb-4 flex flex-col items-center gap-3 text-center">
        <button
          onClick={() => playPrompt(round)}
          className="btn-3d w-20 h-20 rounded-full bg-accent-cyan text-bg-primary flex items-center justify-center"
          title="Play again (Space)"
          aria-label="Play the word again"
        >
          <Icon icon={playing ? 'lucide:audio-lines' : 'lucide:volume-2'} className={`text-3xl ${playing ? 'animate-pulse' : ''}`} />
        </button>
        <p className="font-display font-extrabold text-text-primary">Which word did you hear?</p>
        <p className="hidden sm:block text-[11px] text-text-muted">
          <kbd className="px-1 rounded bg-bg-tertiary">Space</kbd> to replay
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {round.order.map((side, i) => {
          const opt = round.pair[side];
          const isPicked = picked === side;
          const isAnswer = picked && side === round.correct;
          return (
            <button
              key={side}
              onClick={() => pick(side)}
              disabled={!!picked}
              className={`relative px-4 py-5 rounded-2xl border-2 text-center font-display font-extrabold tile-lip transition-all ${
                isAnswer
                  ? 'border-accent-green bg-accent-green/15 text-accent-green'
                  : isPicked
                    ? 'border-accent-red bg-accent-red/15 text-accent-red animate-shake'
                    : picked
                      ? 'border-border bg-bg-card text-text-muted opacity-60'
                      : 'border-border bg-bg-card text-text-primary hover:border-accent-cyan hover:-translate-y-0.5'
              }`}
            >
              <kbd className="hidden sm:flex absolute top-2 left-2 w-5 h-5 items-center justify-center rounded bg-bg-tertiary text-[10px] text-text-muted">
                {i + 1}
              </kbd>
              <div className="text-xl">{opt.word}</div>
              <div className="font-code text-xs opacity-70 mt-0.5">/{opt.symbol}/</div>
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="mt-4 rounded-2xl border-2 border-border bg-bg-card p-4 animate-fade-in">
          <p className={`flex items-center gap-1.5 font-display font-extrabold mb-3 ${gotIt ? 'text-accent-green' : 'text-accent-red'}`}>
            <Icon icon={gotIt ? 'lucide:circle-check' : 'lucide:circle-x'} className="text-lg" />
            {gotIt ? 'Nice — ' : 'Not quite — it was '}“{answer.word}” /{answer.symbol}/
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(['a', 'b'] as const).map((side) => {
              const opt = round.pair[side];
              const other = round.pair[side === 'a' ? 'b' : 'a'];
              return (
                <div key={side} className="rounded-xl bg-bg-tertiary p-2.5 flex flex-col items-center gap-1.5">
                  <MouthDiagram
                    symbol={opt.symbol}
                    ghost={sameMouth(opt.symbol, other.symbol) ? undefined : other.symbol}
                    animate={false}
                    className="w-full h-24"
                  />
                  <div className="flex items-center gap-2">
                    <span className={`font-code font-black ${styleFor(opt.symbol).text}`}>/{opt.symbol}/</span>
                    <WordChip word={opt.word} />
                  </div>
                  <div className="self-stretch"><ContrastList symbol={opt.symbol} other={other.symbol} /></div>
                </div>
              );
            })}
          </div>
          <button onClick={next} className="btn-3d w-full mt-4 py-3 bg-accent-cyan text-bg-primary">
            Next <span className="hidden sm:inline text-xs opacity-70">(Enter)</span>
          </button>
        </div>
      )}
    </div>
  );
}

// eSpeak-via-WASM, loaded only once a sentence actually needs it — the same
// package word/phonemize.ts calls server-side for single words, dynamically
// imported here exactly like ttsBenchmark.ts's KittenTTS path, so nobody pays
// for the WASM download until Sentence practice is opened. `en-gb-x-rp`, not
// `en-us`: this chart's own symbols are RP (/ɒ/, /əʊ/, /eə/, /ɪə/, /ʊə/...),
// and eSpeak's American voice renames or merges several of them (/ɒ/→/ɑ/,
// /əʊ/→/oʊ/) — matching the chart's accent keeps this transcription
// consistent with it instead of silently disagreeing.
const sentenceIpaCache = new Map<string, string>();

async function phonemizeSentence(text: string): Promise<string> {
  const cached = sentenceIpaCache.get(text);
  if (cached) return cached;
  const { phonemize } = await import('phonemizer');
  const words = await phonemize(text, 'en-gb-x-rp');
  const ipa = `/${words.join(' ')}/`;
  sentenceIpaCache.set(text, ipa);
  return ipa;
}

/** The sentence's IPA transcription — visible by default (the whole point of
 *  Sentence practice is following the phonetics while reading aloud), with a
 *  hide toggle for anyone who'd rather test themselves first. Fetched (and
 *  cached) as soon as the sentence appears rather than deferred to a click. */
function SentenceIpa({ text }: { text: string }) {
  const [show, setShow] = useState(true);
  const [ipa, setIpa] = useState<string | null>(null);
  // Starts true, not reset in the effect below: the parent keys each round's
  // whole card on the sentence, so this component remounts (fresh initial
  // state) rather than receiving a changed `text` prop on the same instance.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    phonemizeSentence(text)
      .then((result) => { if (alive) setIpa(result); })
      .catch((err) => {
        console.warn('[ipa] sentence phonemize failed:', err);
        if (alive) setIpa(null);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [text]);

  return (
    <div>
      <button
        onClick={() => setShow((s) => !s)}
        className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-accent-cyan transition-colors mb-1.5"
      >
        <Icon icon={show ? 'lucide:eye-off' : 'lucide:eye'} className="text-sm" />
        {show ? 'Hide IPA' : 'Show IPA'}
      </button>
      {show && (
        <p className="font-code text-xl sm:text-2xl text-accent-cyan leading-snug">
          {loading ? 'Loading…' : ipa ?? "Couldn't load IPA for this sentence."}
        </p>
      )}
    </div>
  );
}

/** A stopped recording, ready to hear back — a small play/pause button
 *  driving a hidden <audio>, matching the app's own icon-button affordance
 *  rather than a native <audio controls> bar. */
function RecordingPlayback({ url, onRerecord }: { url: string; onRerecord: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause(); else void el.play();
  };

  return (
    <div className="flex items-center gap-2.5">
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
      <button
        onClick={toggle}
        className="btn-3d w-10 h-10 shrink-0 rounded-xl bg-accent-green/15 text-accent-green flex items-center justify-center"
        title={playing ? 'Pause' : 'Play your recording'}
      >
        <Icon icon={playing ? 'lucide:pause' : 'lucide:play'} className="text-base" />
      </button>
      <span className="text-xs text-text-muted flex-1">Your recording</span>
      <button
        onClick={onRerecord}
        className="flex items-center gap-1 text-xs font-bold text-text-muted hover:text-accent-cyan transition-colors"
      >
        <Icon icon="lucide:rotate-ccw" className="text-sm" /> Re-record
      </button>
    </div>
  );
}

const MAX_RECORDING_MS = 10_000;

type RecorderState = 'idle' | 'requesting' | 'recording' | 'recorded' | 'denied' | 'unsupported';

/** Record yourself saying the sentence, then hear it back — no transcription
 *  or grading (that's SpeakGame's job for single words); this is purely a
 *  mirror so a learner can compare their own recording against the model
 *  read-aloud, which is what makes self-correction possible at all. */
function VoiceRecorder() {
  const [state, setState] = useState<RecorderState>(() =>
    typeof MediaRecorder !== 'undefined' && typeof navigator?.mediaDevices !== 'undefined'
      ? 'idle'
      : 'unsupported',
  );
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlRef = useRef<string | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const stopRecording = useCallback(() => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const startRecording = useCallback(async () => {
    stopSpeaking();
    setState('requesting');
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
        stream.getTracks().forEach((t) => t.stop());
        if (!aliveRef.current) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (blob.size > 0) {
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          setAudioUrl(url);
          setState('recorded');
        } else {
          setState('idle');
        }
      };

      recorder.start();
      setState('recording');
      stopTimerRef.current = setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch (err) {
      if (!aliveRef.current) return;
      console.warn('[ipa] microphone unavailable:', err);
      setState('denied');
    }
  }, [stopRecording]);

  if (state === 'unsupported') {
    return <p className="text-xs text-text-muted">Recording isn't supported in this browser.</p>;
  }

  if (state === 'denied') {
    return (
      <p className="text-xs text-text-muted">
        Microphone access was denied — allow it in your browser's site settings to record yourself.
      </p>
    );
  }

  if (state === 'recorded' && audioUrl) {
    return <RecordingPlayback url={audioUrl} onRerecord={() => setState('idle')} />;
  }

  return (
    <button
      onClick={state === 'recording' ? stopRecording : () => void startRecording()}
      disabled={state === 'requesting'}
      className={`btn-3d flex items-center justify-center gap-2 py-2.5 font-bold disabled:opacity-60 ${
        state === 'recording' ? 'bg-accent-red text-bg-primary animate-glow-pulse' : 'bg-bg-card text-text-primary'
      }`}
    >
      <Icon icon={state === 'recording' ? 'lucide:square' : 'lucide:mic'} className="text-lg" />
      {state === 'recording' ? 'Stop recording' : state === 'requesting' ? 'Requesting mic…' : 'Record yourself'}
    </button>
  );
}

function randomSentenceRound(pool: IpaSentenceRound[], avoidKey?: string): IpaSentenceRound {
  let round: IpaSentenceRound;
  do {
    round = pool[Math.floor(Math.random() * pool.length)];
  } while (pool.length > 1 && `${round.symbol}-${round.sentence.text}` === avoidKey);
  return round;
}

function sentenceRoundKey(r: IpaSentenceRound): string {
  return `${r.symbol}-${r.sentence.text}`;
}

/** Every sentence in the current pool, grouped by sound, so a learner can
 *  jump straight to a specific one instead of only cycling random rounds —
 *  the same "browse instead of only shuffle" gap `randomSentenceRound` alone
 *  left open. */
function SentencePicker({ pool, current, onPick }: {
  pool: IpaSentenceRound[];
  current: IpaSentenceRound;
  onPick: (r: IpaSentenceRound) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, IpaSentenceRound[]>();
    for (const r of pool) {
      if (!map.has(r.symbol)) map.set(r.symbol, []);
      map.get(r.symbol)!.push(r);
    }
    return [...map.entries()];
  }, [pool]);

  return (
    <div className="rounded-2xl border-2 border-border bg-bg-card p-3 mb-4 max-h-96 overflow-y-auto animate-fade-in">
      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 px-1">
        Choose a sentence
      </h3>
      <div className="space-y-3">
        {groups.map(([symbol, rounds]) => (
          <div key={symbol}>
            <div className={`font-code text-sm font-black mb-1 px-1 ${styleFor(symbol).text}`}>/{symbol}/</div>
            <div className="space-y-0.5">
              {rounds.map((r) => {
                const active = sentenceRoundKey(r) === sentenceRoundKey(current);
                return (
                  <button
                    key={sentenceRoundKey(r)}
                    onClick={() => onPick(r)}
                    className={`block w-full text-left px-2.5 py-2 rounded-lg text-sm transition-colors ${
                      active ? 'bg-accent-cyan/15 text-accent-cyan font-bold' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                    }`}
                  >
                    {r.sentence.text}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Sentence-practice mode: a sentence built around one sound's target word,
 *  read aloud by the app, then recorded and read back by the learner, with
 *  the sentence's own IPA a tap away — the production counterpart to
 *  `ListenPracticeView`'s recognition quiz. `focusSymbols` narrows the pool
 *  to one sound (from its detail page) or a pair (from Compare); empty means
 *  every sound's sentences are fair game. Short and long sentences are pooled
 *  together — no separate filter to switch between them. */
function SentencePracticeView({ focusSymbols, onClearFocus, onOpen }: {
  focusSymbols: string[];
  onClearFocus: () => void;
  onOpen: (symbol: string) => void;
}) {
  const [picking, setPicking] = useState(false);

  const pool = useMemo(() => {
    const focused = sentencesForSymbols(focusSymbols);
    return focused.length > 0 ? focused : sentencesForSymbols([]);
  }, [focusSymbols]);

  const [round, setRound] = useState<IpaSentenceRound>(() => randomSentenceRound(pool));
  const [playing, setPlaying] = useState(false);

  // A new focus starts a fresh round from the right pool — adjusted during
  // render (React's own recommended pattern for resetting state off a
  // changed value) rather than in an effect, so it's one render instead of
  // a render-then-effect-then-render cascade.
  const [poolForRound, setPoolForRound] = useState(pool);
  if (pool !== poolForRound) {
    setPoolForRound(pool);
    setRound(randomSentenceRound(pool));
    setPicking(false);
  }

  const readAloud = () => {
    stopSpeaking();
    setPlaying(true);
    speakText(round.sentence.text, { onEnd: () => setPlaying(false) }).catch(() => setPlaying(false));
  };

  const next = () => {
    setRound((r) => randomSentenceRound(pool, sentenceRoundKey(r)));
  };

  const pick = (r: IpaSentenceRound) => {
    setRound(r);
    setPicking(false);
  };

  const style = styleFor(round.symbol);

  return (
    <div className="max-w-2xl mx-auto">
      <FocusBar symbols={focusSymbols} hint="Listen, record yourself, then compare" onClear={onClearFocus} />

      {picking ? (
        <SentencePicker pool={pool} current={round} onPick={pick} />
      ) : (
        <div key={sentenceRoundKey(round)} className="card-game p-5 sm:p-6 mb-4 animate-fade-in">
          <div className="flex items-start justify-between gap-4 mb-4">
            <button
              onClick={() => onOpen(round.symbol)}
              className={`flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-1 rounded-full ${style.chip} hover:opacity-80`}
              title={`How to make /${round.symbol}/`}
            >
              Tongue twister for <span className="font-code text-sm">/{round.symbol}/</span>
              <Icon icon="lucide:arrow-up-right" />
            </button>
            <MouthDiagram symbol={round.symbol} className="w-20 h-auto shrink-0 -mt-1" />
          </div>

          <p className="text-2xl sm:text-3xl font-display font-extrabold text-text-primary leading-snug mb-4">
            {round.sentence.text}
          </p>

          <SentenceIpa text={round.sentence.text} />

          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-5">
            <li className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-text-muted px-1">1 · Listen</span>
              <button
                onClick={readAloud}
                className="btn-3d flex items-center justify-center gap-2 py-2.5 bg-bg-card text-text-primary"
              >
                <Icon icon={playing ? 'lucide:audio-lines' : 'lucide:volume-2'} className={`text-lg ${playing ? 'animate-pulse' : ''}`} />
                Read aloud
              </button>
            </li>
            <li className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-text-muted px-1">2 · Say it and hear yourself</span>
              <VoiceRecorder />
            </li>
          </ol>
        </div>
      )}

      <div className="flex gap-2.5">
        <button
          onClick={() => setPicking((p) => !p)}
          className="btn-3d flex-1 flex items-center justify-center gap-2 py-3 bg-bg-card text-text-primary"
        >
          <Icon icon={picking ? 'lucide:x' : 'lucide:list'} className="text-lg" />
          {picking ? 'Cancel' : 'Choose a sentence'}
        </button>
        {!picking && (
          <button onClick={next} className="btn-3d flex-1 flex items-center justify-center gap-2 py-3 bg-accent-cyan text-bg-primary">
            Next sentence <Icon icon="lucide:arrow-right" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Standalone reference page: every IPA sound English uses (Sound chart),
 *  commonly-confused sounds side by side (Compare), each sound's own page
 *  with an animated mouth and how-to (Detail), a minimal-pairs listening
 *  quiz, and read-aloud sentence practice. */
export function IpaPage() {
  const { view, mode, practiceMode, symbol, focusSymbols, goList, goDetail, goPractice } = useIpaState();

  const active: NavKey =
    view === 'practice' ? practiceMode : mode === 'compare' ? 'compare' : 'chart';
  const navigate = (k: NavKey) => {
    if (k === 'chart') goList('all');
    else if (k === 'compare') goList('compare');
    else goPractice({ mode: k });
  };

  return (
    <div className="mx-auto max-w-page px-4 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-1.5 mb-1 text-xs font-bold">
          <Link to="/speaking" className="text-text-muted hover:text-text-secondary transition-colors">Speak</Link>
          <span className="text-text-muted/50">/</span>
          <span className="text-text-secondary">IPA Sounds</span>
        </div>
        <h1 className="font-title font-black text-2xl sm:text-3xl text-text-primary leading-tight">IPA Sounds</h1>
        <p className="text-sm text-text-muted">
          The {IPA_SOUNDS.length} sounds of British English — see how the mouth makes each one, hear it, then practise.
        </p>
      </header>

      {view !== 'detail' && (
        <div className="mb-6">
          <ModeNav active={active} onChange={navigate} />
        </div>
      )}

      {view === 'list' && mode === 'all' && <AllSoundsView onOpen={goDetail} />}
      {view === 'list' && mode === 'compare' && (
        <CompareView onOpen={goDetail} onPractice={(target) => goPractice(target)} />
      )}
      {view === 'detail' && symbol && (
        <DetailView symbol={symbol} onBack={() => goList()} onOpen={goDetail} onPractice={(target) => goPractice(target)} />
      )}
      {view === 'practice' && practiceMode === 'listen' && (
        <ListenPracticeView focusSymbols={focusSymbols} onClearFocus={() => goPractice({ focus: [] })} />
      )}
      {view === 'practice' && practiceMode === 'sentence' && (
        <SentencePracticeView focusSymbols={focusSymbols} onClearFocus={() => goPractice({ focus: [] })} onOpen={goDetail} />
      )}
    </div>
  );
}
