import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { speakText, stopSpeaking } from '../lib/tts';
import { playCorrect, playWrong } from '../lib/sfx';
import { Tabs } from './Tabs';

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

/** Two-way switch between sub-views of the current tab, styled exactly like
 *  the flash card's Short/Full definition switch (parts.tsx's
 *  `DefLengthToggle`) — one bordered pill with the active side filled in,
 *  since these are two settings of the current tab, not separate pages
 *  (that distinction is what makes List/Practice itself a `Tabs` strip). */
function PillSwitch<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-bg-tertiary p-0.5 text-xs font-bold select-none"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 rounded-full transition-colors ${
            value === opt.value ? 'bg-accent-cyan/20 text-accent-cyan' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {opt.label}
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
function CompareView({ onOpen, onPractice }: { onOpen: (symbol: string) => void; onPractice: (target: PracticeTarget) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {MINIMAL_PAIRS.map((pair) => {
        const focus = [pair.a.symbol, pair.b.symbol];
        return (
          <div key={pairKey(pair)} className="p-3 rounded-2xl border-[3px] border-border bg-bg-card tile-lip">
            <div className="flex items-stretch gap-2.5">
              <CompareSide side={pair.a} onOpen={onOpen} />
              <div className="flex items-center text-xs font-bold text-text-muted/60 shrink-0">vs</div>
              <CompareSide side={pair.b} onOpen={onOpen} />
            </div>
            <div className="flex items-center gap-1 mt-2.5 pt-2.5 border-t border-border/60">
              <button
                onClick={() => onPractice({ focus, mode: 'listen' })}
                className="flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-bold text-accent-cyan hover:opacity-70 transition-opacity"
              >
                <Icon icon="lucide:headphones" className="text-sm" /> Listen
              </button>
              <div className="w-px self-stretch bg-border/60" />
              <button
                onClick={() => onPractice({ focus, mode: 'sentence' })}
                className="flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-bold text-accent-purple hover:opacity-70 transition-opacity"
              >
                <Icon icon="lucide:message-square-text" className="text-sm" /> Sentences
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** One sound's own page: how to make it, a longer word list, and a link out
 *  to a real pronunciation video — rather than embedding one we can't verify
 *  still exists, a search always resolves to something current. */
function DetailView({ symbol, onBack, onPractice }: {
  symbol: string;
  onBack: () => void;
  onPractice: (target: PracticeTarget) => void;
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
            onClick={() => onPractice({ focus: [sound.symbol], mode: 'listen' })}
            className="btn-3d flex items-center justify-center gap-2 py-3 bg-accent-cyan text-bg-primary font-bold"
          >
            <Icon icon="lucide:headphones" className="text-lg" />
            Practice listening
          </button>
        )}

        <button
          onClick={() => onPractice({ focus: [sound.symbol], mode: 'sentence' })}
          className="btn-3d flex items-center justify-center gap-2 py-3 bg-accent-purple text-bg-primary font-bold"
        >
          <Icon icon="lucide:message-square-text" className="text-lg" />
          Practice sentences
        </button>
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
function ListenPracticeView({ focusSymbol, onClearFocus }: { focusSymbol: string | null; onClearFocus: () => void }) {
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
    <div className="rounded-2xl border-[3px] border-border bg-bg-card p-3 mb-4 max-h-80 overflow-y-auto">
      <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-2 px-1">
        Choose a sentence
      </h3>
      <div className="space-y-3">
        {groups.map(([symbol, rounds]) => (
          <div key={symbol}>
            <div className="font-code text-xs font-bold text-accent-cyan mb-1 px-1">/{symbol}/</div>
            <div className="space-y-0.5">
              {rounds.map((r) => {
                const active = sentenceRoundKey(r) === sentenceRoundKey(current);
                return (
                  <button
                    key={sentenceRoundKey(r)}
                    onClick={() => onPick(r)}
                    className={`block w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
                      active ? 'bg-accent-cyan/15 text-accent-cyan' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
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
function SentencePracticeView({ focusSymbols, onClearFocus }: { focusSymbols: string[]; onClearFocus: () => void }) {
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

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4 text-xs font-bold text-text-muted gap-3 flex-wrap">
        {focusSymbols.length > 0 ? (
          <span className="flex items-center gap-1.5">
            Practicing <span className="font-code text-accent-cyan">{focusSymbols.map((s) => `/${s}/`).join(' vs ')}</span>
            <button onClick={onClearFocus} className="text-text-muted underline decoration-dotted hover:text-accent-cyan">
              (all sounds)
            </button>
          </span>
        ) : (
          <span>Read it aloud, then record yourself saying it</span>
        )}
        <span className="font-code text-accent-cyan">/{round.symbol}/</span>
      </div>

      {picking ? (
        <SentencePicker pool={pool} current={round} onPick={pick} />
      ) : (
        <div key={sentenceRoundKey(round)} className="card-game border-accent-cyan p-5 mb-4">
          <p className="text-2xl sm:text-3xl font-display font-bold text-text-primary leading-snug mb-3">
            {round.sentence.text}
          </p>

          <SentenceIpa text={round.sentence.text} />

          <div className="flex flex-col gap-2.5 mt-4">
            <button
              onClick={readAloud}
              className="btn-3d flex items-center justify-center gap-2 py-2.5 bg-bg-card text-text-primary font-bold"
            >
              <Icon icon={playing ? 'lucide:loader-2' : 'lucide:volume-2'} className={`text-lg ${playing ? 'animate-spin' : ''}`} />
              Read aloud
            </button>

            <VoiceRecorder />
          </div>
        </div>
      )}

      <div className="flex gap-2.5">
        <button
          onClick={() => setPicking((p) => !p)}
          className="btn-3d flex-1 flex items-center justify-center gap-2 py-3 bg-bg-card text-text-primary font-bold"
        >
          <Icon icon={picking ? 'lucide:x' : 'lucide:list'} className="text-lg" />
          {picking ? 'Cancel' : 'Choose a sentence'}
        </button>
        {!picking && (
          <button onClick={next} className="btn-3d flex-1 py-3 bg-accent-cyan text-bg-primary font-bold">
            Next sentence
          </button>
        )}
      </div>
    </div>
  );
}

/** Standalone reference page: every IPA sound English uses (List → All
 *  sounds), commonly-confused sounds side by side (List → Compare), each
 *  sound's own how-to-say-it page plus a video link (Detail), and a
 *  minimal-pairs listening drill (Practice). */
export function IpaPage() {
  const { view, mode, practiceMode, symbol, focusSymbols, goList, goDetail, goPractice } = useIpaState();

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
          {view === 'list' && (
            <PillSwitch
              value={mode}
              options={[{ value: 'all', label: 'All sounds' }, { value: 'compare', label: 'Compare similar' }]}
              onChange={goList}
            />
          )}
          {view === 'practice' && (
            <PillSwitch
              value={practiceMode}
              options={[{ value: 'listen', label: 'Listen' }, { value: 'sentence', label: 'Sentences' }]}
              onChange={(m) => goPractice({ mode: m })}
            />
          )}
        </div>
      )}

      {view === 'list' && mode === 'all' && <AllSoundsView onOpen={goDetail} />}
      {view === 'list' && mode === 'compare' && (
        <CompareView onOpen={goDetail} onPractice={(target) => goPractice(target)} />
      )}
      {view === 'detail' && symbol && (
        <DetailView symbol={symbol} onBack={() => goList()} onPractice={(target) => goPractice(target)} />
      )}
      {view === 'practice' && practiceMode === 'listen' && (
        <ListenPracticeView focusSymbol={focusSymbols[0] ?? null} onClearFocus={() => goPractice({ focus: [] })} />
      )}
      {view === 'practice' && practiceMode === 'sentence' && (
        <SentencePracticeView focusSymbols={focusSymbols} onClearFocus={() => goPractice({ focus: [] })} />
      )}
    </div>
  );
}
