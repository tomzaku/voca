import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { generateWordData } from '../lib/wordService';
import { speakText, stopSpeaking } from '../lib/tts';
import { playCorrect, playWrong, playSelect, playWin } from '../lib/sfx';
import type { VocabularyWord } from '../types';

// Question formats. "random" mixes the other four, one per question.
export type QuizMode = 'random' | 'choice' | 'letters' | 'listen' | 'gap';

const MODES: { id: QuizMode; label: string; icon: string; description: string }[] = [
  { id: 'random',  label: 'Random',   icon: 'lucide:dices',        description: 'A mix of every question type' },
  { id: 'choice',  label: 'Choice',   icon: 'lucide:list-checks',  description: 'Pick the word from its definition' },
  { id: 'letters', label: 'Letters',  icon: 'lucide:type',         description: 'Type the word from its definition' },
  { id: 'listen',  label: 'Listen',   icon: 'lucide:headphones',   description: 'Hear the word and type it' },
  { id: 'gap',     label: 'Fill gap', icon: 'lucide:text-cursor-input', description: 'Complete the example sentence' },
];

const COUNTS = [5, 10, 15, 20];
const DEFAULT_COUNT = 10;

type QuestionType = Exclude<QuizMode, 'random'>;

interface Question {
  type: QuestionType;
  word: string;
  prompt: string;       // definition (choice/letters) or masked sentence (gap); unused for listen
  options?: string[];   // choice/gap
  pos?: string;         // part of speech, shown as a hint on letters questions
  hint?: string;        // letter skeleton (first · middle · last), letters only
}

// Letter skeleton hint: reveal the first, middle and last letters, hide the
// rest (serendipity → "s · · · · n · · · · y"). Short words only get the ends.
function letterHint(word: string): string {
  const chars = [...word];
  const last = chars.length - 1;
  const mid = chars.length >= 5 ? Math.floor(last / 2) : -1;
  return chars
    .map((ch, i) => (i === 0 || i === last || i === mid ? ch : '·'))
    .join(' ');
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Blank the answer (and inflections) out of an example sentence — same stem
// approach as the flashcard's maskAnswer.
function maskWord(sentence: string, answer: string): string {
  const stems = answer.toLowerCase().split(/[^a-z]+/)
    .filter((t) => t.length >= 3)
    .map((t) => (/[ey]$/.test(t) ? t.slice(0, -1) : t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!stems.length) return sentence;
  return sentence.replace(new RegExp(`\\b(?:${stems.join('|')})[a-z]*\\b`, 'gi'), '____');
}

interface Props {
  name: string;
  words: string[];
  onBack: () => void;
}

/**
 * Quiz for a collection. Starts on a settings screen (question format + how
 * many questions, default random × 10), then plays through sampled words.
 */
export function CollectionQuiz({ name, words, onBack }: Props) {
  const [phase, setPhase] = useState<'settings' | 'loading' | 'playing' | 'finished'>('settings');
  const [mode, setMode] = useState<QuizMode>('random');
  const [count, setCount] = useState(DEFAULT_COUNT);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<'correct' | 'wrong' | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => stopSpeaking(), []);

  const start = async () => {
    setPhase('loading');
    const sampled = shuffle(words).slice(0, Math.min(count, words.length));

    const dataMap: Record<string, VocabularyWord> = {};
    await Promise.all(sampled.map(async (word) => {
      try { dataMap[word] = await generateWordData(word, 'intermediate'); } catch { /* skip */ }
    }));
    const loaded = sampled.filter((w) => dataMap[w]);
    if (loaded.length === 0) { setPhase('settings'); return; }

    const pool = words.filter((w) => !loaded.includes(w));
    const qs: Question[] = loaded.map((word) => {
      const data = dataMap[word];
      let type: QuestionType = mode === 'random'
        ? shuffle<QuestionType>(['choice', 'letters', 'listen', 'gap'])[0]
        : mode;
      // Fill-gap needs example sentences that actually contain the word.
      // Give two examples when available — more context to infer the answer.
      const gapExamples = data.examples
        .filter((ex) => maskWord(ex, data.headword || word) !== ex)
        .slice(0, 2)
        .map((ex) => maskWord(ex, data.headword || word));
      if (type === 'gap' && gapExamples.length === 0) type = 'choice';

      const distractors = shuffle([...loaded.filter((w) => w !== word), ...pool]).slice(0, 3);
      return {
        type,
        word,
        prompt: type === 'gap' ? gapExamples.join('\n') : data.definition,
        options: type === 'choice' || type === 'gap' ? shuffle([word, ...distractors]) : undefined,
        pos: data.partOfSpeech,
        hint: type === 'letters' ? letterHint(word) : undefined,
      };
    });

    setQuestions(shuffle(qs));
    setCurrent(0); setScore(0); setAnswered(null); setPicked(null); setTyped('');
    setPhase('playing');
  };

  const q = questions[current];

  // Auto-speak listen questions when they appear.
  useEffect(() => {
    if (phase !== 'playing' || !q) return;
    if (q.type === 'listen') { stopSpeaking(); speakText(q.word); }
    if (q.type === 'letters' || q.type === 'listen') setTimeout(() => inputRef.current?.focus(), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, current]);

  const grade = (ok: boolean) => {
    setAnswered(ok ? 'correct' : 'wrong');
    if (ok) { playCorrect(); setScore((s) => s + 1); } else { playWrong(); }
  };

  const pickOption = (opt: string) => {
    if (answered) return;
    setPicked(opt);
    grade(opt === q.word);
  };

  const submitTyped = () => {
    if (answered || !typed.trim()) return;
    grade(typed.trim().toLowerCase() === q.word.toLowerCase());
  };

  const next = () => {
    playSelect();
    stopSpeaking();
    if (current + 1 >= questions.length) {
      playWin();
      setPhase('finished');
      return;
    }
    setCurrent((c) => c + 1);
    setAnswered(null); setPicked(null); setTyped('');
  };

  // ── Settings ──
  if (phase === 'settings') {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <button onClick={onBack} className="flex items-center gap-1 text-xs font-bold text-text-muted hover:text-text-primary mb-4">
          <Icon icon="lucide:chevron-left" /> Back
        </button>
        <h1 className="text-2xl font-display font-bold text-text-primary mb-1">Quiz — {name}</h1>
        <p className="text-sm text-text-muted mb-6">Set up your round, then start.</p>

        <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Question type</h2>
        <div className="space-y-1.5 mb-6">
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg border transition-all ${
                  active ? 'border-accent-cyan/50 bg-accent-cyan/10' : 'border-border bg-bg-card hover:border-border-light'
                }`}
              >
                <Icon icon={m.icon} className={`text-lg shrink-0 ${active ? 'text-accent-cyan' : 'text-text-muted'}`} />
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm font-bold ${active ? 'text-accent-cyan' : 'text-text-primary'}`}>{m.label}</span>
                  <span className="block text-xs text-text-muted">{m.description}</span>
                </span>
                {active && <Icon icon="lucide:check" className="text-accent-cyan shrink-0" />}
              </button>
            );
          })}
        </div>

        <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Questions</h2>
        <div className="flex gap-2 mb-8">
          {COUNTS.map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              disabled={n > words.length}
              className={`btn-3d flex-1 py-2.5 text-sm font-extrabold disabled:opacity-40 ${
                count === n ? 'bg-accent-cyan text-bg-primary' : 'bg-bg-card text-text-secondary'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <button onClick={start} className="btn-3d w-full py-3 bg-accent-green text-bg-primary font-bold">
          Start quiz
        </button>
      </div>
    );
  }

  // ── Loading ──
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
        <p className="text-sm text-text-muted">Preparing your quiz…</p>
      </div>
    );
  }

  // ── Finished ──
  if (phase === 'finished') {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">{pct >= 80 ? '🏆' : pct >= 50 ? '🎉' : '💪'}</div>
        <h1 className="text-2xl font-display font-bold text-text-primary mb-1">
          {score} / {questions.length}
        </h1>
        <p className="text-sm text-text-muted mb-8">{pct >= 80 ? 'Outstanding!' : pct >= 50 ? 'Nice work — keep going!' : 'Practice makes perfect.'}</p>
        <div className="flex gap-3">
          <button onClick={() => setPhase('settings')} className="btn-3d flex-1 py-3 bg-accent-cyan text-bg-primary font-bold">
            Play again
          </button>
          <button onClick={onBack} className="btn-3d flex-1 py-3 bg-bg-card text-text-secondary font-bold">
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Playing ──
  const typeMeta = MODES.find((m) => m.id === q.type)!;
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Progress */}
      <div className="flex items-center justify-between mb-2 text-xs font-bold text-text-muted">
        <span>{current + 1} / {questions.length}</span>
        <span className="flex items-center gap-1"><Icon icon={typeMeta.icon} /> {typeMeta.label}</span>
        <span className="text-accent-green">{score} ✓</span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden mb-6">
        <div className="h-full bg-accent-cyan rounded-full transition-all" style={{ width: `${(current / questions.length) * 100}%` }} />
      </div>

      {/* Prompt */}
      <div className="card-game border-accent-cyan p-5 mb-5">
        {q.type === 'listen' ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => { stopSpeaking(); speakText(q.word); }}
              className="btn-3d w-12 h-12 rounded-xl bg-accent-cyan text-bg-primary flex items-center justify-center"
              title="Play again"
            >
              <Icon icon="lucide:volume-2" className="text-xl" />
            </button>
            <p className="text-sm text-text-muted">Listen and type the word you hear.</p>
          </div>
        ) : q.type === 'gap' ? (
          <ul className="space-y-2">
            {q.prompt.split('\n').map((ex, i) => (
              <li key={i} className="flex gap-2.5 text-text-primary leading-relaxed">
                <span className="text-accent-cyan shrink-0 mt-0.5">▸</span>
                <span>{ex}</span>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <p className="text-text-primary leading-relaxed">{q.prompt}</p>
            {q.type === 'letters' && (
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center flex-wrap gap-3">
                {q.hint && (
                  <span className="font-code text-lg font-bold text-accent-cyan tracking-wide">{q.hint}</span>
                )}
                {q.pos && (
                  <span className="text-[10px] font-medium text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded">
                    {q.pos}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Answer area */}
      {q.options ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {q.options.map((opt) => {
            const isPicked = picked === opt;
            const isAnswer = answered && opt === q.word;
            return (
              <button
                key={opt}
                onClick={() => pickOption(opt)}
                disabled={!!answered}
                className={`px-4 py-3 rounded-2xl border-[3px] text-base font-display font-extrabold text-left transition-all tile-lip ${
                  isAnswer
                    ? 'border-accent-green bg-accent-green/15 text-accent-green'
                    : isPicked
                      ? 'border-accent-red bg-accent-red/15 text-accent-red animate-shake'
                      : answered
                        ? 'border-border bg-bg-tertiary text-text-muted opacity-60'
                        : 'border-border bg-bg-tertiary text-text-primary hover:border-accent-cyan hover:-translate-y-0.5'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (answered ? next() : submitTyped())}
            disabled={!!answered}
            placeholder="Type the word…"
            autoComplete="off" autoCorrect="off" spellCheck={false}
            className={`flex-1 bg-bg-card border-[3px] rounded-2xl px-4 py-3 font-display font-bold text-text-primary focus:outline-none transition-colors ${
              answered === 'correct' ? 'border-accent-green' : answered === 'wrong' ? 'border-accent-red' : 'border-border focus:border-accent-cyan'
            }`}
          />
          {!answered && (
            <button onClick={submitTyped} disabled={!typed.trim()} className="btn-3d px-5 bg-accent-cyan text-bg-primary font-bold disabled:opacity-40">
              Check
            </button>
          )}
        </div>
      )}

      {/* Feedback + next */}
      {answered && (
        <div className="mt-5 animate-fade-in">
          {answered === 'wrong' && (
            <p className="text-sm text-text-secondary mb-3">
              Answer: <span className="font-bold text-accent-green">{q.word}</span>
            </p>
          )}
          <button onClick={next} className="btn-3d w-full py-3 bg-accent-cyan text-bg-primary font-bold">
            {current + 1 >= questions.length ? 'See results' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}
