import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  IPA_SOUNDS,
  MINIMAL_PAIRS,
  pairsForSymbol,
  youtubeSearchUrl,
  type IpaCategory,
  type IpaSound,
  type MinimalPair,
} from '../data/ipa';
import { speakText, stopSpeaking } from '../lib/tts';
import { playCorrect, playWrong } from '../lib/sfx';
import { Tabs } from './Tabs';

type View = 'list' | 'practice' | 'detail';
type ListMode = 'all' | 'compare';

function pairKey(pair: MinimalPair): string {
  return `${pair.a.word}-${pair.b.word}`;
}

// Query-param state rather than component state, so a link to one sound's
// detail page, the practice tab, or the compare sub-view survives a refresh
// — same convention as /speaking and /listening's own `?tab=`. `mode` (the
// List sub-view) is carried along untouched by goDetail/goPractice, so
// "back" from a sound's detail page returns to whichever List sub-view sent
// you there.
function useIpaState() {
  const [params, setParams] = useSearchParams();
  const rawView = params.get('view');
  const view: View = rawView === 'practice' ? 'practice' : rawView === 'detail' ? 'detail' : 'list';
  const mode: ListMode = params.get('mode') === 'compare' ? 'compare' : 'all';
  const symbol = params.get('symbol');

  const goList = useCallback((m?: ListMode) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('view');
      next.delete('symbol');
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

  const goPractice = useCallback((sym?: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', 'practice');
      if (sym) next.set('symbol', sym); else next.delete('symbol');
      return next;
    }, { replace: true });
  }, [setParams]);

  return { view, mode, symbol, goList, goDetail, goPractice };
}

/** Two-way switch between the List sub-views, styled exactly like the flash
 *  card's Short/Full definition switch (parts.tsx's `DefLengthToggle`) — one
 *  bordered pill with the active side filled in, since All sounds/Compare
 *  similar are two settings of the same List view, not separate pages (that
 *  distinction is what still makes List/Practice a `Tabs` strip above it). */
function ListModeSwitch({ mode, onChange }: { mode: ListMode; onChange: (m: ListMode) => void }) {
  return (
    <div
      role="tablist"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-bg-tertiary p-0.5 text-xs font-bold select-none"
    >
      {([
        ['all', 'All sounds'],
        ['compare', 'Compare similar'],
      ] as const).map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={mode === value}
          onClick={() => onChange(value)}
          className={`px-3 py-1 rounded-full transition-colors ${
            mode === value ? 'bg-accent-cyan/20 text-accent-cyan' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Small pill that speaks one example word on click — toggles to a stop icon
 *  mid-playback, same affordance as the flash card's own speaker buttons. */
function WordChip({ word }: { word: string }) {
  const [playing, setPlaying] = useState(false);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    stopSpeaking();
    setPlaying(true);
    speakText(word, { onEnd: () => setPlaying(false) }).catch(() => setPlaying(false));
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-bg-tertiary text-text-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-all"
    >
      <Icon icon={playing ? 'lucide:square' : 'lucide:volume-2'} className="text-[11px]" />
      {word}
    </button>
  );
}

function SoundCard({ sound, onOpen }: { sound: IpaSound; onOpen: (symbol: string) => void }) {
  return (
    <div
      onClick={() => onOpen(sound.symbol)}
      className="p-3 rounded-2xl border-[3px] border-border bg-bg-card tile-lip cursor-pointer hover:border-accent-cyan/50 transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-code text-2xl font-bold text-accent-cyan">/{sound.symbol}/</span>
        <Icon icon="lucide:chevron-right" className="text-text-muted/50 text-sm" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sound.examples.map((w) => <WordChip key={w} word={w} />)}
      </div>
    </div>
  );
}

/** Every sound, grouped by category — the plain reference list. */
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
      {groups.map(({ category, sounds }) => (
        <section key={category}>
          <h2 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-3">
            {CATEGORY_LABELS[category]}
            <span className="ml-1.5 normal-case font-normal text-text-muted/60">({sounds.length})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {sounds.map((sound) => <SoundCard key={sound.symbol} sound={sound} onOpen={onOpen} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

/** One side of a comparison card — a sound the learner mixes up with its
 *  partner, plus the one-line "how to say it" so the difference in mouth
 *  position is right there next to the symbol, not a click away. */
function CompareSide({ side, onOpen }: { side: MinimalPair['a']; onOpen: (symbol: string) => void }) {
  const sound = IPA_SOUNDS.find((s) => s.symbol === side.symbol);
  return (
    <button
      onClick={() => onOpen(side.symbol)}
      className="flex-1 min-w-0 text-left p-3 rounded-xl bg-bg-tertiary hover:bg-accent-cyan/10 transition-all"
    >
      <div className="font-code text-xl font-bold text-accent-cyan mb-1.5">/{side.symbol}/</div>
      <WordChip word={side.word} />
      {sound && <p className="text-[11px] text-text-muted mt-2 leading-snug">{sound.howTo}</p>}
    </button>
  );
}

/** Sounds people actually confuse, side by side — /ɪ/ next to /iː/, /θ/ next
 *  to /ð/, and so on — reusing the same pairs the Practice quiz draws from,
 *  so "what's different about these two" and "can I hear the difference"
 *  stay backed by one list instead of two that could drift apart. */
function CompareView({ onOpen, onPractice }: { onOpen: (symbol: string) => void; onPractice: (symbol: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {MINIMAL_PAIRS.map((pair) => (
        <div key={pairKey(pair)} className="p-3 rounded-2xl border-[3px] border-border bg-bg-card tile-lip">
          <div className="flex items-stretch gap-2.5">
            <CompareSide side={pair.a} onOpen={onOpen} />
            <div className="flex items-center text-xs font-bold text-text-muted/60 shrink-0">vs</div>
            <CompareSide side={pair.b} onOpen={onOpen} />
          </div>
          <button
            onClick={() => onPractice(pair.a.symbol)}
            className="flex items-center justify-center gap-1.5 w-full mt-2.5 pt-2.5 border-t border-border/60 text-xs font-bold text-accent-cyan hover:opacity-70 transition-opacity"
          >
            <Icon icon="lucide:headphones" className="text-sm" /> Practice this pair
          </button>
        </div>
      ))}
    </div>
  );
}

/** One sound's own page: how to make it, a longer word list, and a link out
 *  to a real pronunciation video — rather than embedding one we can't verify
 *  still exists, a search always resolves to something current. */
function DetailView({ symbol, onBack, onPractice }: {
  symbol: string;
  onBack: () => void;
  onPractice: (symbol: string) => void;
}) {
  const sound = IPA_SOUNDS.find((s) => s.symbol === symbol);
  const pairs = useMemo(() => pairsForSymbol(symbol), [symbol]);
  const allExamples = useMemo(
    () => sound ? [...sound.examples, ...sound.moreExamples] : [],
    [sound],
  );

  if (!sound) {
    return (
      <div>
        <p className="text-sm text-text-muted mb-4">Unknown sound.</p>
        <button onClick={onBack} className="text-sm font-bold text-accent-cyan">← Back to list</button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-text-muted hover:text-accent-cyan transition-all mb-4">
        <Icon icon="lucide:arrow-left" className="text-sm" /> List
      </button>

      <div className="card-game border-accent-cyan p-6 mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-code text-4xl font-bold text-accent-cyan">/{sound.symbol}/</span>
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider bg-bg-tertiary px-2 py-1 rounded-full">
            {CATEGORY_LABELS[sound.category]}
          </span>
        </div>
        <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-1">How to say it</h3>
        <p className="text-sm text-text-primary leading-relaxed">{sound.howTo}</p>
      </div>

      <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-2">Example words</h3>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {allExamples.map((w) => <WordChip key={w} word={w} />)}
      </div>

      <div className="flex flex-col gap-2.5">
        <a
          href={youtubeSearchUrl(sound.symbol)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-3d flex items-center justify-center gap-2 py-3 bg-bg-card text-text-primary font-bold"
        >
          <Icon icon="lucide:youtube" className="text-lg text-accent-red" />
          Watch pronunciation videos on YouTube
        </a>

        {pairs.length > 0 && (
          <button
            onClick={() => onPractice(sound.symbol)}
            className="btn-3d flex items-center justify-center gap-2 py-3 bg-accent-cyan text-bg-primary font-bold"
          >
            <Icon icon="lucide:headphones" className="text-lg" />
            Practice this sound
          </button>
        )}
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
 *  `focusSymbol` narrows the pool to pairs contrasting one sound, reached from
 *  that sound's detail page or the Compare view; otherwise every pair is
 *  fair game. */
function PracticeView({ focusSymbol, onClearFocus }: { focusSymbol: string | null; onClearFocus: () => void }) {
  const pool = useMemo(() => {
    if (!focusSymbol) return MINIMAL_PAIRS;
    const filtered = pairsForSymbol(focusSymbol);
    return filtered.length > 0 ? filtered : MINIMAL_PAIRS;
  }, [focusSymbol]);

  const [round, setRound] = useState<Round>(() => randomRound(pool));
  const [picked, setPicked] = useState<'a' | 'b' | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
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

  const pick = (side: 'a' | 'b') => {
    if (picked) return;
    setPicked(side);
    const ok = side === round.correct;
    if (ok) playCorrect(); else playWrong();
    setScore((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1 }));
  };

  const next = () => {
    setPicked(null);
    setRound(randomRound(pool, pairKey(round.pair)));
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4 text-xs font-bold text-text-muted">
        {focusSymbol ? (
          <span className="flex items-center gap-1.5">
            Practicing <span className="font-code text-accent-cyan">/{focusSymbol}/</span>
            <button onClick={onClearFocus} className="text-text-muted underline decoration-dotted hover:text-accent-cyan">
              (all sounds)
            </button>
          </span>
        ) : (
          <span>Listen and pick the word you heard</span>
        )}
        <span className="text-accent-green">{score.correct} / {score.total}</span>
      </div>

      <div className="card-game border-accent-cyan p-6 mb-5 flex flex-col items-center gap-3">
        <button
          onClick={() => playPrompt(round)}
          className="btn-3d w-16 h-16 rounded-2xl bg-accent-cyan text-bg-primary flex items-center justify-center"
          title="Play again"
        >
          <Icon icon={playing ? 'lucide:loader-2' : 'lucide:volume-2'} className={`text-2xl ${playing ? 'animate-spin' : ''}`} />
        </button>
        <p className="text-xs text-text-muted">Tap to hear it again</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {round.order.map((side) => {
          const opt = round.pair[side];
          const isPicked = picked === side;
          const isAnswer = picked && side === round.correct;
          return (
            <button
              key={side}
              onClick={() => pick(side)}
              disabled={!!picked}
              className={`px-4 py-4 rounded-2xl border-[3px] text-center font-display font-extrabold tile-lip transition-all ${
                isAnswer
                  ? 'border-accent-green bg-accent-green/15 text-accent-green'
                  : isPicked
                    ? 'border-accent-red bg-accent-red/15 text-accent-red animate-shake'
                    : picked
                      ? 'border-border bg-bg-tertiary text-text-muted opacity-60'
                      : 'border-border bg-bg-tertiary text-text-primary hover:border-accent-cyan hover:-translate-y-0.5'
              }`}
            >
              <div className="text-lg">{opt.word}</div>
              <div className="font-code text-xs opacity-70 mt-0.5">/{opt.symbol}/</div>
            </button>
          );
        })}
      </div>

      {picked && (
        <button onClick={next} className="btn-3d w-full mt-5 py-3 bg-accent-cyan text-bg-primary font-bold">
          Next
        </button>
      )}
    </div>
  );
}

/** Standalone reference page: every IPA sound English uses (List → All
 *  sounds), commonly-confused sounds side by side (List → Compare), each
 *  sound's own how-to-say-it page plus a video link (Detail), and a
 *  minimal-pairs listening drill (Practice). */
export function IpaPage() {
  const { view, mode, symbol, goList, goDetail, goPractice } = useIpaState();

  return (
    <div className="mx-auto max-w-page px-4 py-8">
      <h1 className="flex items-center gap-1.5 mb-6 text-base">
        <Link to="/speaking" className="font-medium text-text-muted hover:text-text-secondary transition-colors">
          Speak
        </Link>
        <span className="text-text-muted/50">/</span>
        <span className="font-bold text-text-primary">IPA Sounds</span>
      </h1>

      {view !== 'detail' && (
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <Tabs
            value={view === 'practice' ? 'practice' : 'list'}
            items={[{ value: 'list', label: 'List' }, { value: 'practice', label: 'Practice' }]}
            onChange={(v) => v === 'list' ? goList() : goPractice()}
          />
          {view === 'list' && <ListModeSwitch mode={mode} onChange={goList} />}
        </div>
      )}

      {view === 'list' && mode === 'all' && <AllSoundsView onOpen={goDetail} />}
      {view === 'list' && mode === 'compare' && <CompareView onOpen={goDetail} onPractice={goPractice} />}
      {view === 'detail' && symbol && (
        <DetailView symbol={symbol} onBack={() => goList()} onPractice={(sym) => goPractice(sym)} />
      )}
      {view === 'practice' && (
        <PracticeView focusSymbol={symbol} onClearFocus={() => goPractice()} />
      )}
    </div>
  );
}
