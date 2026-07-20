import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { generateWordData, WORD_LIST } from '../../lib/wordService';
import { speakText, stopSpeaking } from '../../lib/tts';
import { playCorrect, playWrong, playSelect, playWin } from '../../lib/sfx';
import {
  QUESTION_TYPES, QUESTION_TYPE_META, SECONDS_PER_WORD, makeQuizConfig,
  type QuestionType, type QuizConfig, type RevealMode,
} from '../../lib/quizConfig';
import { MatchBoard, type MatchPair } from '../MatchBoard';
import { useVocabularyStore } from '../../hooks/useVocabulary';
import { useAuth } from '../../hooks/useAuth';

// The Quizzes building. Same setup options as the full Quiz page
// (src/components/QuizSetup.tsx) — question types, when answers show, a time
// limit and which words — but laid out for the world popup and played as an
// arena run: lives, a combo multiplier and a score. Answers feed the real SRS.

const MIN_WORDS = 2;
const LIVES = 3;
const BASE = 100;

type McqType = Exclude<QuestionType, 'match'>;

interface McqQuestion { kind: 'mcq'; type: McqType; word: string; prompt: string; options: string[]; }
interface MatchQuestion { kind: 'match'; pairs: MatchPair[]; }
type Question = McqQuestion | MatchQuestion;

interface WordInfo { definition: string; examples: string[]; }
interface Summary { score: number; correct: number; total: number; bestCombo: number; outOfLives: boolean; }

type Phase =
  | { name: 'setup' }
  | { name: 'loading' }
  | { name: 'error' }
  | { name: 'playing' }
  | { name: 'over'; summary: Summary };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmtTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function blankSentence(sentence: string, word: string): string | null {
  const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
  return re.test(sentence) ? sentence.replace(re, '_____') : null;
}

/** Map a question type to the answer-log label the progress store understands. */
function viaFor(type: McqType): 'choice' | 'gap' | 'listen' {
  return type === 'sentence' ? 'gap' : type === 'listen' ? 'listen' : 'choice';
}

function buildMcq(type: McqType, word: string, data: WordInfo, wrong: string[]): McqQuestion | null {
  const base = { kind: 'mcq' as const, word, options: shuffle([word, ...wrong]) };
  if (type === 'sentence') {
    for (const ex of data.examples ?? []) {
      const blanked = blankSentence(ex, word);
      if (blanked) return { ...base, type, prompt: blanked };
    }
    return null; // no usable example — caller falls back to a definition
  }
  if (type === 'listen') return { ...base, type, prompt: word };
  return { ...base, type, prompt: data.definition };
}

/** Mixed question list from the config — mirrors the shared quiz engine. */
function buildQuestions(config: QuizConfig, loaded: string[], dataMap: Record<string, WordInfo>): Question[] {
  const wrongPool = shuffle(WORD_LIST.map((w) => w.word).filter((w) => !loaded.includes(w)));
  const distractors = (word: string) =>
    shuffle([...loaded.filter((w) => w !== word), ...wrongPool]).slice(0, 3);
  const mcqTypes = config.types.filter((t): t is McqType => t !== 'match');
  const pickMcq = (): McqType => (mcqTypes.length ? mcqTypes[Math.floor(Math.random() * mcqTypes.length)] : 'definition');

  const pool = shuffle([...loaded]);
  const qs: Question[] = [];
  while (pool.length) {
    const t = config.types[Math.floor(Math.random() * config.types.length)];
    if (t === 'match' && pool.length >= 3) {
      const n = Math.min(pool.length, 3 + Math.floor(Math.random() * 3)); // 3–5
      qs.push({ kind: 'match', pairs: pool.splice(0, n).map((w) => ({ word: w, definition: dataMap[w].definition })) });
    } else {
      const word = pool.shift()!;
      const mt = t === 'match' ? pickMcq() : t;
      const q = buildMcq(mt, word, dataMap[word], distractors(word))
        ?? buildMcq('definition', word, dataMap[word], distractors(word))!;
      qs.push(q);
    }
  }
  return qs;
}

export function QuizArena({ words }: { words: string[] }) {
  const markWord = useVocabularyStore((s) => s.markWord);
  const { user } = useAuth();

  // ── Setup (same knobs as the Quiz page) ──
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(words));
  const [qTypes, setQTypes] = useState<Set<QuestionType>>(() => new Set(QUESTION_TYPES));
  const [reveal, setReveal] = useState<RevealMode>('each');
  const [autoTime, setAutoTime] = useState(true);
  const [durationSec, setDurationSec] = useState(() => words.length * SECONDS_PER_WORD);
  useEffect(() => { if (autoTime) setDurationSec(chosen.size * SECONDS_PER_WORD); }, [autoTime, chosen]);

  // The pool can arrive after mount (collections load async) — start with
  // everything selected whenever it changes.
  const wordsKey = words.join('|');
  useEffect(() => { setChosen(new Set(words)); }, [wordsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Run ──
  const [phase, setPhase] = useState<Phase>({ name: 'setup' });
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [gain, setGain] = useState<number | null>(null);

  const correctRef = useRef(0);
  const scoreRef = useRef(0);
  const bestRef = useRef(0);
  const livesRef = useRef(LIVES);
  const doneRef = useRef(false);

  const toggleType = (t: QuestionType) => setQTypes((prev) => {
    const next = new Set(prev);
    if (next.has(t)) { if (next.size > 1) next.delete(t); } else { next.add(t); playSelect(); }
    return next;
  });
  const toggleWord = (w: string) => setChosen((prev) => {
    const next = new Set(prev);
    if (next.has(w)) next.delete(w); else { next.add(w); playSelect(); }
    return next;
  });

  const start = useCallback(async () => {
    const cfg = makeQuizConfig([...chosen], QUESTION_TYPES.filter((t) => qTypes.has(t)), reveal, durationSec);
    setConfig(cfg);
    setPhase({ name: 'loading' });
    const dataMap: Record<string, WordInfo> = {};
    await Promise.all(cfg.words.map(async (w) => {
      try {
        const d = await generateWordData(w);
        dataMap[w] = { definition: d.definition, examples: d.examples ?? [] };
      } catch { /* skip words we can't load */ }
    }));
    const loaded = cfg.words.filter((w) => dataMap[w]);
    if (loaded.length < MIN_WORDS) { setPhase({ name: 'error' }); return; }

    correctRef.current = 0; scoreRef.current = 0; bestRef.current = 0;
    livesRef.current = LIVES; doneRef.current = false;
    setQuestions(buildQuestions(cfg, loaded, dataMap));
    setIndex(0); setPicked(null); setScore(0); setCombo(0); setLives(LIVES); setGain(null);
    setRemaining(cfg.durationSec > 0 ? cfg.durationSec : null);
    setPhase({ name: 'playing' });
  }, [chosen, qTypes, reveal, durationSec]);

  const question = questions[index];
  const total = questions.length;

  const finish = useCallback((outOfLives = false) => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopSpeaking();
    playWin();
    setPhase({ name: 'over', summary: {
      score: scoreRef.current, correct: correctRef.current, total, bestCombo: bestRef.current, outOfLives,
    } });
  }, [total]);

  /** Shared bookkeeping for a resolved question. */
  const resolve = useCallback((correct: boolean, wordsAnswered: { word: string; ok: boolean; via: 'choice' | 'gap' | 'listen' }[]) => {
    if (correct) {
      const points = BASE + combo * 25;
      playCorrect();
      setGain(points);
      setScore((s) => { const v = s + points; scoreRef.current = v; return v; });
      setCombo((c) => { const v = c + 1; bestRef.current = Math.max(bestRef.current, v); return v; });
      correctRef.current += 1;
    } else {
      playWrong();
      setCombo(0);
      livesRef.current -= 1;
      setLives(livesRef.current);
    }
    for (const a of wordsAnswered) markWord(a.word, a.ok ? 'known' : 'skipped', user?.id, a.ok ? 0 : 1, a.via);

    const dead = !correct && livesRef.current <= 0;
    const last = index + 1 >= total;
    setTimeout(() => {
      setGain(null);
      if (dead) finish(true);
      else if (last) finish();
      else { setIndex((i) => i + 1); setPicked(null); }
    }, reveal === 'each' ? (correct ? 750 : 1200) : 350);
  }, [combo, index, total, reveal, finish, markWord, user?.id]);

  const answerMcq = (option: string) => {
    if (phase.name !== 'playing' || picked !== null || question?.kind !== 'mcq') return;
    setPicked(option);
    const correct = option === question.word;
    resolve(correct, [{ word: question.word, ok: correct, via: viaFor(question.type) }]);
  };

  const completeMatch = (mistakes: number, links: Record<string, string>) => {
    if (phase.name !== 'playing' || question?.kind !== 'match') return;
    setPicked('__match__');
    resolve(mistakes === 0, question.pairs.map((p) => ({
      word: p.word, ok: links[p.word] === p.word, via: 'choice' as const,
    })));
  };

  // ── Total countdown (0 = untimed), matching the Quiz page's semantics ──
  useEffect(() => {
    if (phase.name !== 'playing' || !config || config.durationSec <= 0) return;
    const deadline = Date.now() + config.durationSec * 1000;
    const id = setInterval(() => {
      const rem = Math.max(0, (deadline - Date.now()) / 1000);
      setRemaining(rem);
      if (rem <= 0) { clearInterval(id); finish(); }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.name, config]);

  // ── Speak Listen questions ──
  useEffect(() => {
    if (phase.name !== 'playing') return;
    const q = questions[index];
    if (q?.kind === 'mcq' && q.type === 'listen') { stopSpeaking(); speakText(q.word); }
  }, [phase.name, index, questions]);

  useEffect(() => () => stopSpeaking(), []);

  // ── Setup screen ──
  if (phase.name === 'setup') {
    return (
      <div className="space-y-4">
        <Section title="Question types" aside={qTypes.size === QUESTION_TYPES.length ? 'Random mix' : `${qTypes.size} selected`}>
          <div className="grid grid-cols-2 gap-1.5">
            {QUESTION_TYPES.map((t) => (
              <Choice key={t} on={qTypes.has(t)} onClick={() => toggleType(t)} label={QUESTION_TYPE_META[t].label} hint={QUESTION_TYPE_META[t].hint} />
            ))}
          </div>
        </Section>

        <Section title="Show answers">
          <div className="grid grid-cols-2 gap-1.5">
            <Choice on={reveal === 'each'} onClick={() => setReveal('each')} label="After each" hint="Instant right/wrong" />
            <Choice on={reveal === 'end'} onClick={() => setReveal('end')} label="At the end" hint="All on the results" />
          </div>
        </Section>

        <Section
          title="Time limit"
          aside={
            <button
              onClick={() => setAutoTime(true)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                autoTime ? 'bg-accent-cyan/15 border-accent-cyan/30 text-accent-cyan' : 'bg-bg-card border-border text-text-muted hover:text-text-primary'
              }`}
            >
              Auto · {SECONDS_PER_WORD}s/word
            </button>
          }
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={durationSec}
              onChange={(e) => { setAutoTime(false); setDurationSec(Math.max(0, Math.floor(Number(e.target.value) || 0))); }}
              className="w-24 bg-bg-tertiary border-2 border-border rounded-lg px-2.5 py-1.5 text-sm text-text-primary font-code font-bold focus:outline-none focus:border-accent-cyan"
            />
            <span className="text-xs text-text-muted font-bold">sec</span>
            <span className="text-[11px] text-text-muted ml-auto">
              {durationSec === 0 ? 'No limit' : `≈ ${fmtTime(durationSec)}`}
            </span>
          </div>
        </Section>

        <Section
          title={`Words ${chosen.size}/${words.length}`}
          aside={
            <span className="flex gap-2">
              <button onClick={() => setChosen(new Set(words))} className="text-[11px] font-bold text-text-muted hover:text-text-primary">All</button>
              <button onClick={() => setChosen(new Set())} className="text-[11px] font-bold text-text-muted hover:text-text-primary">None</button>
            </span>
          }
        >
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {words.map((w) => {
              const on = chosen.has(w);
              return (
                <button
                  key={w}
                  onClick={() => toggleWord(w)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border-2 transition-all ${
                    on ? 'bg-accent-cyan text-bg-primary border-accent-cyan' : 'bg-bg-tertiary text-text-secondary border-border'
                  }`}
                >
                  {w}
                </button>
              );
            })}
          </div>
        </Section>

        <button
          onClick={start}
          disabled={chosen.size < MIN_WORDS}
          className="btn-3d w-full py-2.5 text-sm bg-accent-purple text-bg-primary font-bold disabled:opacity-40"
        >
          <Icon icon="lucide:swords" className="inline -mt-0.5 mr-1.5" />
          Enter the arena
        </button>
        {chosen.size < MIN_WORDS && (
          <p className="text-[11px] text-text-muted text-center">Pick at least {MIN_WORDS} words.</p>
        )}
      </div>
    );
  }

  if (phase.name === 'loading') {
    return (
      <div className="py-10 flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
        <p className="text-sm font-bold text-text-muted">Entering the arena…</p>
      </div>
    );
  }

  if (phase.name === 'error') {
    return (
      <div className="py-6 text-center">
        <div className="text-4xl mb-3">🥲</div>
        <p className="text-sm text-text-muted mb-4">Couldn't load enough of those words. Try picking others.</p>
        <button onClick={() => setPhase({ name: 'setup' })} className="btn-3d px-4 py-2 text-sm bg-accent-purple text-bg-primary font-bold">
          Back to setup
        </button>
      </div>
    );
  }

  // ── Results ──
  if (phase.name === 'over') {
    const { score: sc, correct, total: tot, bestCombo: bc, outOfLives } = phase.summary;
    const pct = tot ? Math.round((correct / tot) * 100) : 0;
    const msg = outOfLives ? 'Out of lives!' : pct >= 100 ? 'Flawless!' : pct >= 75 ? 'Great run!' : pct >= 50 ? 'Not bad!' : 'Keep training!';
    return (
      <div className="text-center animate-pop-in">
        <p className="text-xs font-bold text-accent-purple uppercase tracking-wider mb-1">
          {outOfLives ? 'Defeated' : 'Arena cleared'}
        </p>
        <div className="text-5xl font-display font-bold text-text-primary leading-none mb-1">{sc}</div>
        <p className="text-sm font-bold text-text-muted mb-4">points · {msg}</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          <Stat icon="lucide:target" label="Correct" value={`${correct}/${tot}`} color="text-accent-green" />
          <Stat icon="lucide:flame" label="Combo" value={`×${bc}`} color="text-accent-orange" />
          <Stat icon="lucide:percent" label="Accuracy" value={`${pct}%`} color="text-accent-cyan" />
        </div>
        <div className="flex gap-2">
          <button onClick={start} className="btn-3d flex-1 py-2.5 text-sm bg-accent-purple text-bg-primary font-bold">
            <Icon icon="lucide:rotate-ccw" className="inline -mt-0.5 mr-1" /> Again
          </button>
          <button
            onClick={() => setPhase({ name: 'setup' })}
            className="btn-3d px-3 py-2.5 text-sm bg-bg-tertiary text-text-secondary font-bold"
            title="Change settings"
          >
            <Icon icon="lucide:sliders-horizontal" />
          </button>
        </div>
      </div>
    );
  }

  // ── Playing ──
  if (!question) return null;
  const timed = remaining !== null;
  const timePct = timed && config?.durationSec ? (remaining / config.durationSec) * 100 : 100;
  const low = timed && remaining <= 5;

  return (
    <div>
      {/* Lives · score · combo */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: LIVES }).map((_, i) => (
            <Icon key={i} icon={i < lives ? 'lucide:heart' : 'lucide:heart-crack'} className={i < lives ? 'text-accent-red' : 'text-text-muted/40'} />
          ))}
        </div>
        <div className="relative flex items-center gap-2">
          {combo >= 2 && (
            <span className="flex items-center gap-0.5 text-xs font-bold text-accent-orange animate-pop-in">
              <Icon icon="lucide:flame" />×{combo}
            </span>
          )}
          <span className="font-display font-bold text-text-primary tabular-nums">{score}</span>
          {gain != null && <span className="absolute -top-5 right-0 text-sm font-bold text-accent-green animate-float-up">+{gain}</span>}
        </div>
      </div>

      {/* Time bar (only when a limit is set) */}
      {timed && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-2 rounded-full bg-bg-tertiary overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ease-linear ${low ? 'bg-accent-red' : 'bg-accent-cyan'}`}
              style={{ width: `${timePct}%` }}
            />
          </div>
          <span className={`text-[11px] font-bold tabular-nums ${low ? 'text-accent-red' : 'text-text-muted'}`}>{fmtTime(remaining)}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
          {question.kind === 'match' ? QUESTION_TYPE_META.match.ask : QUESTION_TYPE_META[question.type].ask}
        </span>
        <span className="text-[11px] font-bold text-text-muted">{index + 1}/{total}</span>
      </div>

      {question.kind === 'match' ? (
        <MatchBoard key={index} pairs={question.pairs} reveal={reveal === 'each'} onComplete={completeMatch} />
      ) : (
        <>
          {question.type === 'listen' ? (
            <button
              onClick={() => { stopSpeaking(); speakText(question.word); }}
              className="btn-3d w-full py-4 mb-3 bg-bg-tertiary text-accent-cyan font-bold flex items-center justify-center gap-2"
            >
              <Icon icon="lucide:volume-2" className="text-xl" /> Play again
            </button>
          ) : (
            <p className="text-base font-display font-bold text-text-primary mb-3 min-h-[3rem]">{question.prompt}</p>
          )}

          <div className="grid grid-cols-1 gap-2">
            {question.options.map((opt) => {
              const decided = picked !== null;
              const show = decided && reveal === 'each';
              const isAnswer = opt === question.word;
              const style = !show
                ? decided ? 'bg-bg-tertiary text-text-muted/60' : 'bg-bg-tertiary text-text-primary hover:bg-accent-purple/15'
                : isAnswer
                  ? 'bg-accent-green/20 text-accent-green border-accent-green'
                  : picked === opt
                    ? 'bg-accent-red/20 text-accent-red border-accent-red'
                    : 'bg-bg-tertiary text-text-muted/50';
              return (
                <button
                  key={opt}
                  onClick={() => { if (!decided) { playSelect(); answerMcq(opt); } }}
                  disabled={decided}
                  className={`btn-3d py-2.5 px-3 rounded-xl text-sm font-bold border-2 border-transparent transition-colors ${style}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{title}</h3>
        {typeof aside === 'string' ? <span className="text-[11px] font-bold text-text-muted">{aside}</span> : aside}
      </div>
      {children}
    </div>
  );
}

function Choice({ on, onClick, label, hint }: { on: boolean; onClick: () => void; label: string; hint: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-left px-2.5 py-2 rounded-xl border-2 transition-all ${
        on ? 'bg-accent-cyan/10 border-accent-cyan text-text-primary' : 'bg-bg-tertiary border-border text-text-muted'
      }`}
    >
      <div className="flex items-center gap-1 font-display font-bold text-xs">
        <Icon icon={on ? 'solar:check-circle-bold' : 'lucide:circle'} className={on ? 'text-accent-cyan' : 'text-text-muted'} />
        {label}
      </div>
      <p className="text-[10px] text-text-muted mt-0.5 leading-tight">{hint}</p>
    </button>
  );
}

function Stat({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-tertiary/50 p-2">
      <Icon icon={icon} className={`text-lg ${color}`} />
      <div className="text-sm font-display font-bold text-text-primary mt-0.5">{value}</div>
      <div className="text-[10px] font-bold text-text-muted uppercase tracking-wide">{label}</div>
    </div>
  );
}
