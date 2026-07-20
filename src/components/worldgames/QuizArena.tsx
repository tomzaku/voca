import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { generateWordData, WORD_LIST } from '../../lib/wordService';
import { playCorrect, playWrong, playSelect, playWin } from '../../lib/sfx';
import { useVocabularyStore } from '../../hooks/useVocabulary';
import { useAuth } from '../../hooks/useAuth';

// A richer in-world game: a timed multiple-choice "arena". Pick the word that
// matches each definition before the timer runs out. Lives, a combo multiplier,
// and time bonuses give it game feel; answers feed the real SRS through
// markWord, so playing here actually moves your progress.

const ROUND_SIZE = 8;   // questions per run
const LIVES = 3;
const TIME = 12;        // seconds per question
const BASE = 100;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Question { word: string; prompt: string; options: string[]; }
interface Summary { score: number; correct: number; total: number; bestCombo: number; }

type Phase =
  | { name: 'loading' }
  | { name: 'error' }
  | { name: 'playing' }
  | { name: 'over'; summary: Summary };

export function QuizArena({ words }: { words: string[] }) {
  const markWord = useVocabularyStore((s) => s.markWord);
  const { user } = useAuth();

  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [timeLeft, setTimeLeft] = useState(TIME);
  const [gain, setGain] = useState<number | null>(null); // floating +points

  const correctRef = useRef(0);
  const scoreRef = useRef(0);
  const bestRef = useRef(0);

  // ── Build a round from the word pool (cache-first, so seen words are free) ──
  const startRound = useCallback(async () => {
    setPhase({ name: 'loading' });
    const chosen = shuffle(words.filter((w) => /^[a-z]+(?:[ '-][a-z]+)*$/.test(w))).slice(0, ROUND_SIZE);
    const dataMap: Record<string, string> = {};
    await Promise.all(chosen.map(async (w) => {
      try { dataMap[w] = (await generateWordData(w)).definition; } catch { /* skip */ }
    }));
    const loaded = chosen.filter((w) => dataMap[w]);
    if (loaded.length < 2) { setPhase({ name: 'error' }); return; }

    const wrongPool = shuffle(WORD_LIST.map((w) => w.word).filter((w) => !loaded.includes(w)));
    const distractors = (word: string) =>
      shuffle([...loaded.filter((w) => w !== word), ...wrongPool]).slice(0, 3);
    const qs: Question[] = loaded.map((word) => ({
      word, prompt: dataMap[word], options: shuffle([word, ...distractors(word)]),
    }));

    correctRef.current = 0; scoreRef.current = 0; bestRef.current = 0;
    setQuestions(qs);
    setIndex(0); setPicked(null); setScore(0); setCombo(0);
    setLives(LIVES); setTimeLeft(TIME); setGain(null);
    setPhase({ name: 'playing' });
  }, [words]);

  useEffect(() => { startRound(); }, [startRound]);

  const question = questions[index];

  const finish = useCallback(() => {
    playWin();
    setPhase({ name: 'over', summary: {
      score: scoreRef.current, correct: correctRef.current, total: questions.length, bestCombo: bestRef.current,
    } });
  }, [questions.length]);

  const answer = useCallback((option: string | null) => {
    if (phase.name !== 'playing' || picked !== null || !question) return;
    const correct = option === question.word;
    setPicked(option ?? '__timeout__');

    if (correct) {
      const timeBonus = Math.round((timeLeft / TIME) * 50);
      const points = BASE + timeBonus + combo * 25;
      playCorrect();
      setGain(points);
      setScore((s) => { const v = s + points; scoreRef.current = v; return v; });
      setCombo((c) => { const v = c + 1; bestRef.current = Math.max(bestRef.current, v); return v; });
      correctRef.current += 1;
      markWord(question.word, 'known', user?.id, 0, 'choice');
    } else {
      playWrong();
      setCombo(0);
      setLives((l) => l - 1);
      markWord(question.word, 'skipped', user?.id, 1, 'choice');
    }

    const outOfLives = !correct && lives - 1 <= 0;
    const lastQuestion = index + 1 >= questions.length;
    setTimeout(() => {
      setGain(null);
      if (outOfLives || lastQuestion) finish();
      else { setIndex((i) => i + 1); setPicked(null); setTimeLeft(TIME); }
    }, correct ? 750 : 1200);
  }, [phase.name, picked, question, timeLeft, combo, lives, index, questions.length, finish, markWord, user?.id]);

  // ── Per-question countdown ──
  useEffect(() => {
    if (phase.name !== 'playing' || picked !== null) return;
    const deadline = Date.now() + timeLeft * 1000;
    const id = setInterval(() => {
      const rem = Math.max(0, (deadline - Date.now()) / 1000);
      setTimeLeft(rem);
      if (rem <= 0) { clearInterval(id); answer(null); }
    }, 100);
    return () => clearInterval(id);
    // Re-arm only when the question changes or an answer resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.name, index, picked]);

  // ── Loading / error ──
  if (phase.name === 'loading') {
    return (
      <div className="rounded-2xl border-2 border-border bg-bg-card p-10 flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
        <p className="text-sm font-bold text-text-muted">Entering the arena…</p>
      </div>
    );
  }
  if (phase.name === 'error') {
    return (
      <div className="rounded-2xl border-2 border-border bg-bg-card p-8 text-center">
        <div className="text-4xl mb-3">🥲</div>
        <h2 className="font-display font-bold text-text-primary mb-1">Not enough words</h2>
        <p className="text-sm text-text-muted mb-4">Study a collection with a few words, then come back.</p>
        <button onClick={startRound} className="btn-3d px-4 py-2 text-sm bg-accent-purple text-bg-primary font-bold">
          Try again
        </button>
      </div>
    );
  }

  // ── Results ──
  if (phase.name === 'over') {
    const { score: sc, correct, total, bestCombo: bc } = phase.summary;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    const msg = pct >= 100 ? 'Flawless!' : pct >= 75 ? 'Great run!' : pct >= 50 ? 'Not bad!' : 'Keep training!';
    return (
      <div className="rounded-2xl border-2 border-border bg-bg-card shadow-2xl p-6 text-center animate-pop-in">
        <p className="text-xs font-bold text-accent-purple uppercase tracking-wider mb-1">Arena cleared</p>
        <div className="text-6xl font-display font-bold text-text-primary leading-none mb-1">{sc}</div>
        <p className="text-sm font-bold text-text-muted mb-5">points · {msg}</p>
        <div className="grid grid-cols-3 gap-2 mb-6">
          <Stat icon="lucide:target" label="Correct" value={`${correct}/${total}`} color="text-accent-green" />
          <Stat icon="lucide:flame" label="Best combo" value={`×${bc}`} color="text-accent-orange" />
          <Stat icon="lucide:percent" label="Accuracy" value={`${pct}%`} color="text-accent-cyan" />
        </div>
        <button onClick={startRound} className="btn-3d w-full py-2.5 text-sm bg-accent-purple text-bg-primary font-bold">
          <Icon icon="lucide:rotate-ccw" className="inline -mt-0.5 mr-1.5" />
          Play again
        </button>
      </div>
    );
  }

  // ── Playing ──
  const timePct = (timeLeft / TIME) * 100;
  const low = timeLeft <= 4;
  return (
    <div className="rounded-2xl border-2 border-border bg-bg-card shadow-2xl p-5">
      {/* Top bar: lives, score, combo */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: LIVES }).map((_, i) => (
            <Icon
              key={i}
              icon={i < lives ? 'lucide:heart' : 'lucide:heart-crack'}
              className={i < lives ? 'text-accent-red' : 'text-text-muted/40'}
            />
          ))}
        </div>
        <div className="relative flex items-center gap-2">
          {combo >= 2 && (
            <span className="flex items-center gap-0.5 text-xs font-bold text-accent-orange animate-pop-in">
              <Icon icon="lucide:flame" />×{combo}
            </span>
          )}
          <span className="font-display font-bold text-text-primary tabular-nums">{score}</span>
          {gain != null && (
            <span className="absolute -top-5 right-0 text-sm font-bold text-accent-green animate-float-up">+{gain}</span>
          )}
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${low ? 'bg-accent-red' : 'bg-accent-cyan'}`}
          style={{ width: `${timePct}%` }}
        />
      </div>

      {/* Question */}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
          Which word means…
        </span>
        <span className="text-[11px] font-bold text-text-muted">{index + 1}/{questions.length}</span>
      </div>
      <p className="text-base font-display font-bold text-text-primary mb-4 min-h-[3rem]">{question.prompt}</p>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {question.options.map((opt) => {
          const isAnswer = opt === question.word;
          const isPicked = picked === opt;
          const decided = picked !== null;
          const style = !decided
            ? 'bg-bg-tertiary text-text-primary hover:bg-accent-purple/15'
            : isAnswer
              ? 'bg-accent-green/20 text-accent-green border-accent-green'
              : isPicked
                ? 'bg-accent-red/20 text-accent-red border-accent-red'
                : 'bg-bg-tertiary text-text-muted/50';
          return (
            <button
              key={opt}
              onClick={() => { if (!decided) { playSelect(); answer(opt); } }}
              disabled={decided}
              className={`btn-3d py-3 px-3 rounded-xl text-sm font-bold border-2 border-transparent transition-colors ${style}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-tertiary/50 p-2.5">
      <Icon icon={icon} className={`text-lg ${color}`} />
      <div className="text-sm font-display font-bold text-text-primary mt-0.5">{value}</div>
      <div className="text-[10px] font-bold text-text-muted uppercase tracking-wide">{label}</div>
    </div>
  );
}
