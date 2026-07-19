import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { generateWordData, WORD_LIST } from '../lib/wordService';
import { speakText, stopSpeaking } from '../lib/tts';
import { playCorrect, playWrong, playSelect, playWin } from '../lib/sfx';
import {
  QUESTION_TYPES, QUESTION_TYPE_META, SECONDS_PER_WORD, makeQuizConfig,
  type QuestionType, type QuizConfig, type RevealMode,
} from '../lib/quizConfig';
import { MatchBoard, type MatchPair } from './MatchBoard';
import type { VocabularyWord } from '../types';

type GamePhase = 'select' | 'loading' | 'playing' | 'finished';

const MIN_WORDS = 2;

/** Single-word question types (everything except the multi-word 'match'). */
type McqType = Exclude<QuestionType, 'match'>;

/** A one-word multiple-choice question — the answer is always a word, so all
 *  MCQ types share the options grid and letter-hint boxes. */
interface McqQuestion {
  kind: 'mcq';
  type: McqType;
  word: string;         // the correct answer
  prompt: string;       // definition / blanked sentence / the word (spoken on 'listen')
  options: string[];    // four word choices
  synonyms?: string[];  // hints — only surfaced on 'definition' questions
  antonyms?: string[];
}

/** A mini matching round of 3–5 word↔definition pairs. */
interface MatchQuestion {
  kind: 'match';
  pairs: MatchPair[];
}

type Question = McqQuestion | MatchQuestion;

/** A recorded answer, for the end-of-quiz review. */
type Answer =
  | { kind: 'mcq'; question: McqQuestion; picked: string | null; correct: boolean }
  | { kind: 'match'; question: MatchQuestion; links: Record<string, string>; correct: boolean };

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fmtTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/** Replace the first whole-word occurrence of `word` in `sentence` with a
 *  blank. Returns null when the word doesn't appear verbatim (e.g. an inflected
 *  form), so the caller can fall back to another question type. */
function blankSentence(sentence: string, word: string): string | null {
  const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
  if (!re.test(sentence)) return null;
  return sentence.replace(re, '_____');
}

/** Build one MCQ of the given type for `word`, or null if the word lacks the
 *  data that type needs (e.g. no usable example for 'sentence'). */
function buildMcq(type: McqType, word: string, data: VocabularyWord, wrong: string[]): McqQuestion | null {
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

/** Turn a config + loaded word data into a mixed question list. */
function buildQuiz(config: QuizConfig, loaded: string[], dataMap: Record<string, VocabularyWord>): Question[] {
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

interface Props {
  bookmarks: string[];
  onBack: () => void;
}

export function BookmarkGame({ bookmarks, onBack }: Props) {
  const [phase, setPhase] = useState<GamePhase>('select');
  // ── Config (the settings) ──
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(bookmarks));
  const [qTypes, setQTypes] = useState<Set<QuestionType>>(() => new Set(QUESTION_TYPES));
  const [reveal, setReveal] = useState<RevealMode>('end');
  // Time limit in seconds. Auto = ~20s per selected word, kept in sync until the
  // user types their own value (0 = no limit).
  const [autoTime, setAutoTime] = useState(true);
  const [durationSec, setDurationSec] = useState(() => bookmarks.length * SECONDS_PER_WORD);
  // ── Play state ──
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [remaining, setRemaining] = useState<number | null>(null);

  const toggle = (word: string) => {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else { next.add(word); playSelect(); }
      return next;
    });
  };

  const toggleType = (t: QuestionType) => {
    setQTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) { if (next.size > 1) next.delete(t); } // keep at least one on
      else { next.add(t); playSelect(); }
      return next;
    });
  };

  // Keep the auto time limit synced to the word count until the user edits it.
  useEffect(() => {
    if (autoTime) setDurationSec(chosen.size * SECONDS_PER_WORD);
  }, [autoTime, chosen]);

  // Build a quiz from a config and start playing. Word data is cache-first, so
  // already-seen words load without AI.
  const runQuiz = async (cfg: QuizConfig) => {
    setPhase('loading');
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setAnswers([]);
    setQuestions([]);
    setRevealedIndices(new Set());

    const dataMap: Record<string, VocabularyWord> = {};
    await Promise.all(
      cfg.words.map(async (word) => {
        try { dataMap[word] = await generateWordData(word); } catch { /* skip */ }
      }),
    );

    const loaded = Object.keys(dataMap);
    if (loaded.length === 0) {
      toast.error('Could not load those words. Try again.');
      setPhase('select');
      return;
    }

    setConfig(cfg);
    setQuestions(buildQuiz(cfg, loaded, dataMap));
    setPhase('playing');
  };

  const start = () => {
    if (chosen.size < MIN_WORDS) return;
    runQuiz(makeQuizConfig([...chosen], QUESTION_TYPES.filter((t) => qTypes.has(t)), reveal, durationSec));
  };

  // ── Countdown for the whole quiz ──
  useEffect(() => {
    if (phase !== 'playing' || !config || config.durationSec <= 0) {
      setRemaining(null);
      return;
    }
    const deadline = Date.now() + config.durationSec * 1000;
    setRemaining(config.durationSec);
    const id = setInterval(() => {
      const rem = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) {
        clearInterval(id);
        setPhase('finished'); // time's up — go straight to the score
      }
    }, 250);
    return () => clearInterval(id);
  }, [phase, config]);

  const goNext = () => {
    const next = current + 1;
    if (next >= questions.length) {
      playWin();
      setPhase('finished');
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

    if (reveal === 'each') {
      correct ? playCorrect() : playWrong();
      setTimeout(goNext, 1400);
    } else {
      playSelect(); // no right/wrong hint when answers are deferred
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

  // Speak the current word aloud on a Listen question (auto-plays as it appears).
  useEffect(() => {
    if (phase !== 'playing') return;
    const q = questions[current];
    if (q?.kind === 'mcq' && q.type === 'listen') {
      stopSpeaking();
      speakText(q.word);
    }
  }, [phase, current, questions]);

  useEffect(() => () => stopSpeaking(), []);

  // ── Select (the quiz config) ─────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-bg-card border border-border text-text-secondary flex items-center justify-center shrink-0 hover:text-text-primary transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-accent-cyan leading-none">Quiz</h1>
            <p className="text-xs text-text-muted font-bold mt-1">Set it up, then start</p>
          </div>
        </div>

        {/* ── Question types ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-display font-extrabold text-text-muted uppercase tracking-wider">Question types</h2>
            <span className="text-[11px] font-bold text-text-muted">
              {qTypes.size === QUESTION_TYPES.length ? 'Random mix' : `${qTypes.size} selected`}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {QUESTION_TYPES.map((t) => {
              const on = qTypes.has(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`text-left px-3.5 py-2.5 rounded-xl border-2 transition-all ${
                    on ? 'bg-accent-cyan/10 border-accent-cyan text-text-primary' : 'bg-bg-card border-border text-text-muted hover:border-border-light'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-display font-extrabold text-sm">
                    <Icon icon={on ? 'solar:check-circle-bold' : 'lucide:circle'} className={on ? 'text-accent-cyan' : 'text-text-muted'} />
                    {QUESTION_TYPE_META[t].label}
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5 leading-tight">{QUESTION_TYPE_META[t].hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Show answers ── */}
        <div className="mb-6">
          <h2 className="text-xs font-display font-extrabold text-text-muted uppercase tracking-wider mb-2">Show answers</h2>
          <div className="grid grid-cols-2 gap-2">
            {([
              { v: 'end', label: 'At the end', hint: 'See every answer on the results screen' },
              { v: 'each', label: 'After each', hint: 'Instant right/wrong per question' },
            ] as { v: RevealMode; label: string; hint: string }[]).map((o) => {
              const on = reveal === o.v;
              return (
                <button
                  key={o.v}
                  onClick={() => setReveal(o.v)}
                  className={`text-left px-3.5 py-2.5 rounded-xl border-2 transition-all ${
                    on ? 'bg-accent-cyan/10 border-accent-cyan text-text-primary' : 'bg-bg-card border-border text-text-muted hover:border-border-light'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-display font-extrabold text-sm">
                    <Icon icon={on ? 'solar:check-circle-bold' : 'lucide:circle'} className={on ? 'text-accent-cyan' : 'text-text-muted'} />
                    {o.label}
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5 leading-tight">{o.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Time limit ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-display font-extrabold text-text-muted uppercase tracking-wider">Time limit</h2>
            <button
              onClick={() => setAutoTime(true)}
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                autoTime
                  ? 'bg-accent-cyan/15 border-accent-cyan/30 text-accent-cyan'
                  : 'bg-bg-card border-border text-text-muted hover:text-text-primary'
              }`}
              title={`Auto: ${SECONDS_PER_WORD}s per word`}
            >
              Auto · {SECONDS_PER_WORD}s/word
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={durationSec}
              onChange={(e) => {
                setAutoTime(false);
                setDurationSec(Math.max(0, Math.floor(Number(e.target.value) || 0)));
              }}
              className="w-28 bg-bg-card border-2 border-border rounded-xl px-3 py-2 text-text-primary font-code font-bold focus:outline-none focus:border-accent-cyan transition-colors"
            />
            <span className="text-sm text-text-muted font-bold">seconds</span>
            <span className="text-xs text-text-muted ml-auto">
              {durationSec === 0
                ? 'No limit'
                : `≈ ${fmtTime(durationSec)} for ${chosen.size} word${chosen.size === 1 ? '' : 's'}`}
            </span>
          </div>
        </div>

        {/* ── Words ── */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-display font-extrabold text-text-muted uppercase tracking-wider">
            Words <span className="text-accent-cyan">{chosen.size}</span><span className="text-text-muted">/{bookmarks.length}</span>
          </h2>
          <div className="flex gap-2">
            <button onClick={() => setChosen(new Set(bookmarks))} className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors">All</button>
            <span className="text-border">·</span>
            <button onClick={() => setChosen(new Set())} className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors">None</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {bookmarks.map((word) => {
            const on = chosen.has(word);
            return (
              <button
                key={word}
                onClick={() => toggle(word)}
                className={`px-3.5 py-2 rounded-full text-sm font-display font-extrabold border-2 transition-all hover:-translate-y-0.5 ${
                  on ? 'bg-accent-cyan text-bg-primary border-accent-cyan' : 'bg-bg-card text-text-secondary border-border hover:border-border-light'
                }`}
              >
                {on && <Icon icon="solar:check-circle-bold" className="inline mr-1 -mt-0.5" />}
                {word}
              </button>
            );
          })}
        </div>

        <button
          onClick={start}
          disabled={chosen.size < MIN_WORDS}
          className="w-full py-3.5 rounded-xl bg-accent-cyan text-bg-primary text-lg font-display font-extrabold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Start quiz ({chosen.size})
        </button>
        {chosen.size < MIN_WORDS && (
          <p className="text-center text-xs text-text-muted mt-3">Pick at least {MIN_WORDS} words.</p>
        )}
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
        <p className="text-sm text-text-muted">Preparing quiz…</p>
      </div>
    );
  }

  // ── Finished ─────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
    const msg = pct === 100 ? 'Perfect!' : pct >= 75 ? 'Great job!' : pct >= 50 ? 'Good effort!' : 'Keep practicing!';
    const showReview = config?.reveal === 'end' && answers.length > 0;

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

        <div className="flex gap-3 justify-center mt-8">
          <button onClick={onBack} className="px-5 py-2.5 rounded-xl border border-border text-text-muted text-sm hover:border-border-light hover:text-text-primary transition-all">Back to list</button>
          <button onClick={() => setPhase('select')} className="px-5 py-2.5 rounded-xl border border-border text-text-muted text-sm hover:border-border-light hover:text-text-primary transition-all">Pick words</button>
          <button onClick={start} className="px-5 py-2.5 rounded-xl bg-accent-cyan text-bg-primary text-sm font-medium hover:opacity-90 transition-opacity">Play again</button>
        </div>
      </div>
    );
  }

  // ── Playing ──────────────────────────────────────────────────────────
  const q = questions[current];

  const topBar = (
    <>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Quit
        </button>
        <div className="flex items-center gap-3 text-sm">
          {remaining !== null && (
            <span className={`font-code font-bold tabular-nums ${remaining <= 10 ? 'text-accent-red' : 'text-text-muted'}`}>
              {fmtTime(remaining)}
            </span>
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
        <MatchBoard key={current} pairs={q.pairs} reveal={config?.reveal === 'each'} onComplete={handleMatchComplete} />
      </div>
    );
  }

  const revealFeedback = reveal === 'each';

  return (
    <div className="max-w-lg mx-auto px-4 py-8 animate-fade-in">
      {topBar}

      {/* Question card — prompt varies by question type */}
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

      {/* Hints: synonyms + antonyms — only on definition questions. */}
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

      {/* Word letter boxes */}
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

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        {q.options.map((opt) => {
          let cls = 'border-border bg-bg-card text-text-primary hover:border-border-light hover:bg-bg-hover';
          if (selected) {
            if (revealFeedback) {
              // Immediate feedback: colour by correctness.
              if (opt === q.word) cls = 'border-accent-green bg-accent-green/10 text-accent-green';
              else if (opt === selected) cls = 'border-accent-red bg-accent-red/10 text-accent-red';
              else cls = 'border-border bg-bg-card text-text-muted opacity-40';
            } else {
              // Deferred: just show which one they picked, no right/wrong.
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

      {/* Feedback — only when answers are shown per question */}
      {selected && revealFeedback && (
        <p className={`text-center text-sm mt-5 font-medium animate-fade-in ${selected === q.word ? 'text-accent-green' : 'text-accent-red'}`}>
          {selected === q.word ? '✓ Correct!' : `✗ The answer is "${q.word}"`}
        </p>
      )}
    </div>
  );
}

/** End-of-quiz answer review (deferred-reveal mode). */
function QuizReview({ answers }: { answers: Answer[] }) {
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
    <Icon
      icon={ok ? 'solar:check-circle-bold' : 'solar:close-circle-bold'}
      className={`shrink-0 text-lg ${ok ? 'text-accent-green' : 'text-accent-red'}`}
    />
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
        {!a.correct && (
          <div className="text-xs text-accent-red mt-0.5">You picked: {a.picked ?? '—'}</div>
        )}
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
        <span className="font-display font-bold text-sm text-text-primary">
          Matching · {correctCount}/{pairs.length} correct
        </span>
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
