import { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { generateWordData, WORD_LIST } from '../lib/wordService';
import { speakText, stopSpeaking } from '../lib/tts';
import { playCorrect, playWrong, playSelect, playWin } from '../lib/sfx';
import { QUESTION_TYPE_META, type QuestionType, type QuizConfig } from '../lib/quizConfig';
import type { MiniWordData } from '../lib/quizShare';
import { MatchBoard, type MatchPair } from './MatchBoard';

/** Single-word question types (everything except the multi-word 'match'). */
type McqType = Exclude<QuestionType, 'match'>;

interface McqQuestion {
  kind: 'mcq';
  type: McqType;
  word: string;
  prompt: string;
  options: string[];
  synonyms?: string[];
  antonyms?: string[];
}

interface MatchQuestion {
  kind: 'match';
  pairs: MatchPair[];
}

type Question = McqQuestion | MatchQuestion;

/** A recorded answer — serialized into an attempt and rendered in the review. */
export type Answer =
  | { kind: 'mcq'; question: McqQuestion; picked: string | null; correct: boolean }
  | { kind: 'match'; question: MatchQuestion; links: Record<string, string>; correct: boolean };

export interface QuizResult {
  score: number;
  total: number;
  answers: Answer[];
  durationSec: number;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fmtTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function blankSentence(sentence: string, word: string): string | null {
  const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
  if (!re.test(sentence)) return null;
  return sentence.replace(re, '_____');
}

function buildMcq(type: McqType, word: string, data: MiniWordData, wrong: string[]): McqQuestion | null {
  const base = {
    kind: 'mcq' as const,
    word,
    options: shuffle([word, ...wrong]),
    synonyms: data.synonyms,
    antonyms: data.antonyms,
  };
  if (type === 'sentence') {
    for (const ex of data.examples ?? []) {
      const blanked = blankSentence(ex, word);
      if (blanked) return { ...base, type, prompt: blanked };
    }
    return null;
  }
  if (type === 'listen') return { ...base, type, prompt: word };
  return { ...base, type, prompt: data.definition };
}

function buildQuiz(config: QuizConfig, loaded: string[], dataMap: Record<string, MiniWordData>): Question[] {
  const wrongPool = shuffle(WORD_LIST.map((w) => w.word).filter((w) => !loaded.includes(w)));
  const distractors = (word: string) =>
    shuffle([...loaded.filter((w) => w !== word), ...wrongPool]).slice(0, 3);

  const types = config.types;
  const mcqTypes = types.filter((t): t is McqType => t !== 'match');
  const pickMcqType = (): McqType => (mcqTypes.length ? mcqTypes[Math.floor(Math.random() * mcqTypes.length)] : 'definition');

  const pool = shuffle([...loaded]);
  const qs: Question[] = [];
  while (pool.length) {
    const t = types[Math.floor(Math.random() * types.length)];
    if (t === 'match' && pool.length >= 3) {
      const n = Math.min(pool.length, 3 + Math.floor(Math.random() * 3)); // 3–5
      const pairs = pool.splice(0, n).map((w) => ({ word: w, definition: dataMap[w].definition }));
      qs.push({ kind: 'match', pairs });
    } else {
      const word = pool.shift()!;
      const mt = t === 'match' ? pickMcqType() : t;
      const q = buildMcq(mt, word, dataMap[word], distractors(word))
        ?? buildMcq('definition', word, dataMap[word], distractors(word))!;
      qs.push(q);
    }
  }
  return qs;
}

/**
 * The quiz player: builds a mixed question list from a config, runs it (with an
 * optional countdown), and shows the score. Used for both bookmark practice and
 * shared tests. Reports the result once via `onFinish`; navigation on the score
 * screen is driven by the callbacks the parent supplies.
 */
export function QuizRunner({ config, preloadedData, onExit, onReplay, onPickWords, onFinish, finishLabel = 'Done' }: {
  config: QuizConfig;
  /** Word data snapshot (shared quizzes). When given, no word-service calls are
   *  made — so anonymous students can take the quiz. Omit for live practice. */
  preloadedData?: Record<string, MiniWordData>;
  onExit: () => void;
  onReplay?: () => void;
  onPickWords?: () => void;
  onFinish?: (r: QuizResult) => void;
  finishLabel?: string;
}) {
  const [phase, setPhase] = useState<'loading' | 'playing' | 'finished'>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [remaining, setRemaining] = useState<number | null>(null);
  const startRef = useRef<number>(Date.now());
  const finishedRef = useRef(false);

  const revealFeedback = config.reveal === 'each';

  // ── Build the quiz (cache-first word data → no AI for seen words) ──
  useEffect(() => {
    let alive = true;
    (async () => {
      let dataMap: Record<string, MiniWordData>;
      if (preloadedData) {
        // Shared quiz — everything is already snapshotted, no fetching needed.
        dataMap = preloadedData;
      } else {
        dataMap = {};
        await Promise.all(
          config.words.map(async (w) => {
            try { dataMap[w] = await generateWordData(w); } catch { /* skip */ }
          }),
        );
      }
      if (!alive) return;
      const loaded = config.words.filter((w) => dataMap[w]);
      if (loaded.length === 0) {
        toast.error('Could not load the quiz words. Try again.');
        onExit();
        return;
      }
      setQuestions(buildQuiz(config, loaded, dataMap));
      startRef.current = Date.now();
      setPhase('playing');
    })();
    return () => { alive = false; stopSpeaking(); };
    // Build once per config; onExit is only used on the load-error path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setPhase('finished');
  };

  // Report the result once, when we land on the score screen.
  useEffect(() => {
    if (phase !== 'finished') return;
    const durationSec = Math.round((Date.now() - startRef.current) / 1000);
    onFinish?.({ score, total: questions.length, answers, durationSec });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Countdown ──
  useEffect(() => {
    if (phase !== 'playing' || config.durationSec <= 0) { setRemaining(null); return; }
    const deadline = Date.now() + config.durationSec * 1000;
    setRemaining(config.durationSec);
    const id = setInterval(() => {
      const rem = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) { clearInterval(id); finish(); }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, config]);

  // ── Speak on Listen questions ──
  useEffect(() => {
    if (phase !== 'playing') return;
    const q = questions[current];
    if (q?.kind === 'mcq' && q.type === 'listen') {
      stopSpeaking();
      speakText(q.word);
    }
  }, [phase, current, questions]);

  const goNext = () => {
    const next = current + 1;
    if (next >= questions.length) {
      playWin();
      finish();
    } else {
      setCurrent(next);
      setSelected(null);
      setRevealedIndices(new Set());
    }
  };

  const handleSelect = (option: string) => {
    if (selected !== null) return;
    const q = questions[current];
    if (q.kind !== 'mcq') return;
    setSelected(option);
    const correct = option === q.word;
    if (correct) setScore((s) => s + 1);
    setAnswers((a) => [...a, { kind: 'mcq', question: q, picked: option, correct }]);
    if (revealFeedback) {
      correct ? playCorrect() : playWrong();
      setTimeout(goNext, 1400);
    } else {
      playSelect();
      setTimeout(goNext, 350);
    }
  };

  const handleMatchComplete = (mistakes: number, links: Record<string, string>) => {
    const q = questions[current];
    if (q.kind !== 'match') return;
    const correct = mistakes === 0;
    if (correct) setScore((s) => s + 1);
    setAnswers((a) => [...a, { kind: 'match', question: q, links, correct }]);
    goNext();
  };

  const revealLetter = (i: number) => {
    if (selected !== null || revealedIndices.has(i)) return;
    playSelect();
    setRevealedIndices((prev) => new Set([...prev, i]));
  };

  // ── Loading ──
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
        <p className="text-sm text-text-muted">Preparing quiz…</p>
      </div>
    );
  }

  // ── Finished ──
  if (phase === 'finished') {
    const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
    const msg = pct === 100 ? 'Perfect!' : pct >= 75 ? 'Great job!' : pct >= 50 ? 'Good effort!' : 'Keep practicing!';
    const showReview = config.reveal === 'end' && answers.length > 0;

    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center animate-fade-in">
        <div className="text-7xl font-display font-bold text-text-primary mb-1">
          {score}
          <span className="text-text-muted text-3xl">/{questions.length}</span>
        </div>
        <p className="text-accent-cyan font-display font-bold text-xl mb-1">{msg}</p>
        <p className="text-text-muted text-sm mb-8">
          {pct}% correct{answers.length < questions.length ? ` · answered ${answers.length}/${questions.length}` : ''}
        </p>

        <div className="w-full h-2 bg-bg-tertiary rounded-full mb-8 overflow-hidden">
          <div className="h-full bg-accent-cyan rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>

        {showReview && <QuizReview answers={answers} />}

        <div className="flex flex-wrap gap-3 justify-center mt-8">
          <button onClick={onExit} className="px-5 py-2.5 rounded-xl bg-accent-cyan text-bg-primary text-sm font-medium hover:opacity-90 transition-opacity">{finishLabel}</button>
          {onPickWords && (
            <button onClick={onPickWords} className="px-5 py-2.5 rounded-xl border border-border text-text-muted text-sm hover:border-border-light hover:text-text-primary transition-all">Pick words</button>
          )}
          {onReplay && (
            <button onClick={onReplay} className="px-5 py-2.5 rounded-xl border border-border text-text-muted text-sm hover:border-border-light hover:text-text-primary transition-all">Play again</button>
          )}
        </div>
      </div>
    );
  }

  // ── Playing ──
  const q = questions[current];

  const topBar = (
    <>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onExit} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Quit
        </button>
        <div className="flex items-center gap-3 text-sm">
          {remaining !== null && (
            <span className={`font-code font-bold tabular-nums ${remaining <= 10 ? 'text-accent-red' : 'text-text-muted'}`}>{fmtTime(remaining)}</span>
          )}
          <span className="text-text-muted">
            <span className="text-text-primary font-medium">{current + 1}</span>
            <span className="text-text-muted">/{questions.length}</span>
          </span>
          <span className="text-accent-green font-medium">{score} ✓</span>
        </div>
      </div>
      <div className="w-full h-1 bg-bg-tertiary rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-accent-cyan rounded-full transition-all duration-500" style={{ width: `${(current / questions.length) * 100}%` }} />
      </div>
    </>
  );

  if (q.kind === 'match') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
        {topBar}
        <div className="bg-bg-card border border-border rounded-2xl p-4 mb-6 text-center">
          <p className="text-xs font-display font-bold text-text-muted uppercase tracking-wider">{QUESTION_TYPE_META.match.ask}</p>
          <p className="text-[11px] text-text-muted mt-1">Tap a word, then its meaning. Submit when you're done.</p>
        </div>
        <MatchBoard key={current} pairs={q.pairs} reveal={revealFeedback} onComplete={handleMatchComplete} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 animate-fade-in">
      {topBar}

      <div className="bg-bg-card border border-border rounded-2xl p-6 mb-6">
        <p className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-4">{QUESTION_TYPE_META[q.type].ask}</p>
        {q.type === 'listen' ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <button
              onClick={() => { stopSpeaking(); speakText(q.word); }}
              className="w-16 h-16 rounded-full bg-accent-cyan text-bg-primary flex items-center justify-center hover:opacity-90 transition-opacity"
              title="Play again"
            >
              <Icon icon="solar:volume-loud-bold" className="text-3xl" />
            </button>
            <p className="text-xs text-text-muted font-bold">Tap to hear it again</p>
          </div>
        ) : (
          <p className="text-text-primary leading-relaxed text-base">{q.prompt}</p>
        )}
      </div>

      {q.type === 'definition' && ((q.synonyms?.length ?? 0) > 0 || (q.antonyms?.length ?? 0) > 0) && (
        <div className="bg-bg-card border border-border rounded-2xl px-5 py-4 mb-5 space-y-2.5">
          <p className="text-xs font-display font-bold text-text-muted uppercase tracking-wider">Hints</p>
          {q.synonyms && q.synonyms.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-text-muted shrink-0">Synonyms:</span>
              {q.synonyms.map((s) => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">{s}</span>
              ))}
            </div>
          )}
          {q.antonyms && q.antonyms.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-text-muted shrink-0">Antonyms:</span>
              {q.antonyms.map((a) => (
                <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/20">{a}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-1.5 justify-center mb-5 flex-wrap">
        {q.word.split('').map((letter, i) => {
          const isShown = revealedIndices.has(i);
          const canReveal = selected === null && !isShown;
          return (
            <button
              key={i}
              onClick={() => canReveal && revealLetter(i)}
              disabled={!canReveal}
              title={canReveal ? 'Click to reveal this letter' : undefined}
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-sm uppercase border-2 transition-all ${
                isShown
                  ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan cursor-default'
                  : canReveal
                  ? 'border-border bg-bg-tertiary text-transparent select-none hover:border-accent-cyan/40 hover:bg-accent-cyan/5 cursor-pointer'
                  : 'border-border bg-bg-tertiary text-transparent select-none cursor-default'
              }`}
            >
              {isShown ? letter : '·'}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {q.options.map((opt) => {
          let cls = 'border-border bg-bg-card text-text-primary hover:border-border-light hover:bg-bg-hover';
          if (selected) {
            if (revealFeedback) {
              if (opt === q.word) cls = 'border-accent-green bg-accent-green/10 text-accent-green';
              else if (opt === selected) cls = 'border-accent-red bg-accent-red/10 text-accent-red';
              else cls = 'border-border bg-bg-card text-text-muted opacity-40';
            } else {
              cls = opt === selected
                ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan'
                : 'border-border bg-bg-card text-text-muted opacity-40';
            }
          }
          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={selected !== null}
              className={`py-4 px-3 rounded-xl border font-display font-bold text-sm text-center transition-all ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {selected && revealFeedback && (
        <p className={`text-center text-sm mt-5 font-medium animate-fade-in ${selected === q.word ? 'text-accent-green' : 'text-accent-red'}`}>
          {selected === q.word ? '✓ Correct!' : `✗ The answer is "${q.word}"`}
        </p>
      )}
    </div>
  );
}

/** Answer review — used on the score screen and in the teacher's results view. */
export function QuizReview({ answers }: { answers: Answer[] }) {
  return (
    <div className="text-left mt-2">
      <h3 className="text-xs font-display font-extrabold text-text-muted uppercase tracking-wider mb-3">Review</h3>
      <div className="space-y-2">
        {answers.map((a, i) => (a.kind === 'mcq'
          ? <McqReviewRow key={i} a={a} />
          : <MatchReviewRow key={i} a={a} />))}
      </div>
    </div>
  );
}

function ResultIcon({ ok }: { ok: boolean }) {
  return (
    <Icon icon={ok ? 'solar:check-circle-bold' : 'solar:close-circle-bold'} className={`shrink-0 text-lg ${ok ? 'text-accent-green' : 'text-accent-red'}`} />
  );
}

function McqReviewRow({ a }: { a: Extract<Answer, { kind: 'mcq' }> }) {
  const q = a.question;
  const context = q.type === 'listen' ? 'Heard aloud' : q.prompt;
  return (
    <div className="flex gap-2.5 items-start rounded-xl border border-border bg-bg-card p-3">
      <ResultIcon ok={a.correct} />
      <div className="min-w-0">
        <div className="font-display font-bold text-sm text-text-primary">{q.word}</div>
        <div className="text-xs text-text-muted line-clamp-2">{context}</div>
        {!a.correct && <div className="text-xs text-accent-red mt-0.5">Answered: {a.picked ?? '—'}</div>}
      </div>
    </div>
  );
}

function MatchReviewRow({ a }: { a: Extract<Answer, { kind: 'match' }> }) {
  const pairs = a.question.pairs;
  const correctCount = pairs.filter((p) => a.links[p.word] === p.word).length;
  return (
    <div className="rounded-xl border border-border bg-bg-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <ResultIcon ok={a.correct} />
        <span className="font-display font-bold text-sm text-text-primary">Matching · {correctCount}/{pairs.length} correct</span>
      </div>
      <div className="space-y-1 pl-1">
        {pairs.map((p) => {
          const ok = a.links[p.word] === p.word;
          return (
            <div key={p.word} className="flex gap-1.5 text-xs items-start">
              <Icon icon={ok ? 'solar:check-circle-bold' : 'solar:close-circle-bold'} className={`shrink-0 mt-0.5 ${ok ? 'text-accent-green' : 'text-accent-red'}`} />
              <span className="font-bold text-text-primary shrink-0">{p.word}</span>
              {!ok && <span className="text-text-muted">→ {p.definition}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
