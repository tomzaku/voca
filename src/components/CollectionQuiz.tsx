import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { generateWordData } from '../lib/wordService';
import { speakText, stopSpeaking } from '../lib/tts';
import { playCorrect, playWrong, playSelect, playWin } from '../lib/sfx';
import { familyForms, maskAnswer } from '../lib/answerMask';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useAuth } from '../hooks/useAuth';
import { progressLookup } from '../lib/progress';
import { sampleSmartWords } from '../lib/smartSample';
import { fetchPickedWords, type QuizSources } from '../lib/pickApi';
import { SynAnt } from './SynAnt';
import type { VocabularyWord } from '../types';

// Question formats. "random" mixes the other four, one per question.
export type QuizMode = 'random' | 'choice' | 'letters' | 'listen' | 'gap';

const MODES: { id: QuizMode; labelId: string; icon: string; descriptionId: string }[] = [
  { id: 'random',  labelId: 'collections.modeRandom',  icon: 'lucide:dices',        descriptionId: 'collections.modeRandomDesc' },
  { id: 'choice',  labelId: 'collections.modeChoice',  icon: 'lucide:list-checks',  descriptionId: 'collections.modeChoiceDesc' },
  { id: 'letters', labelId: 'collections.modeLetters', icon: 'lucide:type',         descriptionId: 'collections.modeLettersDesc' },
  { id: 'listen',  labelId: 'collections.modeListen',  icon: 'lucide:headphones',   descriptionId: 'collections.modeListenDesc' },
  { id: 'gap',     labelId: 'collections.modeGap',     icon: 'lucide:text-cursor-input', descriptionId: 'collections.modeGapDesc' },
];

const COUNTS = [5, 10, 15, 20];
const DEFAULT_COUNT = 10;

// Word-selection pools (checkboxes on the settings screen, at least one on).
// 'smart' is exclusive: it picks like the Learn page (difficult/new mix + due
// reviews), so combining it with the pools would be redundant.
const SOURCES: { id: keyof QuizSources; labelId: string; icon: string; descriptionId: string }[] = [
  { id: 'smart',    labelId: 'collections.sourceSmart',    icon: 'lucide:brain',   descriptionId: 'collections.sourceSmartDesc' },
  { id: 'random',   labelId: 'collections.sourceRandom',   icon: 'lucide:shuffle', descriptionId: 'collections.sourceRandomDesc' },
  { id: 'unseen',   labelId: 'collections.sourceUnseen',   icon: 'lucide:eye-off', descriptionId: 'collections.sourceUnseenDesc' },
  { id: 'mistakes', labelId: 'collections.sourceMistakes', icon: 'lucide:target',  descriptionId: 'collections.sourceMistakesDesc' },
];

type QuestionType = Exclude<QuizMode, 'random'>;

interface Question {
  type: QuestionType;
  word: string;
  prompt: string;       // definition (choice/letters) or masked sentence (gap); unused for listen
  options?: string[];   // choice/gap
  pos?: string;         // part of speech, shown as a hint on letters questions
  hint?: string;        // letter skeleton (first · middle · last), letters only
  data?: VocabularyWord; // full word data — choice shows masked examples + syn/ant
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

/**
 * Sample quiz words from the checked pools: "mistakes" (high mistake rate,
 * >30% of answers wrong), "unseen" (never answered) and "random" (anything).
 * Draws round-robin so each checked pool gets an even share; when a pool runs
 * short the others fill in. With random unchecked, the quiz may come up
 * shorter than requested. Dismissed (skipped-for-good) words are left out
 * entirely. This is the local fallback — the server's `pick` function
 * (mode 'quiz') runs the same algorithm against the authoritative synced
 * progress.
 */
function sampleQuizWords(words: string[], count: number, sources: QuizSources): string[] {
  const prog = progressLookup(useVocabularyStore.getState().progress);
  if (sources.smart) return sampleSmartWords(words, count, prog);

  const available = words.filter((w) => prog(w)?.status !== 'dismissed');
  const pools: string[][] = [];
  if (sources.mistakes) pools.push(shuffle(available.filter((w) => {
    const p = prog(w);
    const total = (p?.correct ?? 0) + (p?.wrong ?? 0);
    return total > 0 && (p?.wrong ?? 0) / total > 0.3;
  })));
  if (sources.unseen) pools.push(shuffle(available.filter((w) => {
    const p = prog(w);
    return !p?.status && !p?.dueAt;
  })));
  if (sources.random) pools.push(shuffle(available.length ? available : words));

  const n = Math.min(count, available.length || words.length);
  const sampled: string[] = [];
  const chosen = new Set<string>();
  const idx = pools.map(() => 0);
  while (sampled.length < n) {
    let advanced = false;
    for (let i = 0; i < pools.length && sampled.length < n; i++) {
      while (idx[i] < pools[i].length) {
        const w = pools[i][idx[i]++];
        if (!chosen.has(w)) {
          chosen.add(w);
          sampled.push(w);
          advanced = true;
          break;
        }
      }
    }
    if (!advanced) break; // every checked pool is exhausted
  }
  return sampled;
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
  const intl = useIntl();
  const { user } = useAuth();
  const markWord = useVocabularyStore((s) => s.markWord);
  const [phase, setPhase] = useState<'settings' | 'loading' | 'playing' | 'finished'>('settings');
  const [mode, setMode] = useState<QuizMode>('random');
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [sources, setSources] = useState<QuizSources>({ random: true, unseen: true, mistakes: true, smart: false });

  const toggleSource = (key: keyof QuizSources) =>
    setSources((s) => {
      // Smart replaces the pools (it already blends difficult/new/due words),
      // so checking it unchecks them — and vice versa.
      if (key === 'smart') {
        return s.smart ? s : { random: false, unseen: false, mistakes: false, smart: true };
      }
      const next = { ...s, [key]: !s[key], smart: false };
      // At least one pool must stay checked, or there is nothing to quiz.
      return next.random || next.unseen || next.mistakes ? next : s;
    });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<'correct' | 'wrong' | null>(null);
  // Words answered incorrectly this round — summarized on the results screen.
  const [missed, setMissed] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => stopSpeaking(), []);

  const start = async () => {
    setPhase('loading');
    // Server-side sample (authoritative cross-device progress), local fallback.
    const sampled =
      (await fetchPickedWords({ words, count, mode: 'quiz', sources }))
      ?? sampleQuizWords(words, count, sources);

    const dataMap: Record<string, VocabularyWord> = {};
    await Promise.all(sampled.map(async (word) => {
      try { dataMap[word] = await generateWordData(word); } catch { /* skip */ }
    }));
    const loaded = sampled.filter((w) => dataMap[w]);
    if (loaded.length === 0) { setPhase('settings'); return; }

    const pool = words.filter((w) => !loaded.includes(w));
    const qs: Question[] = loaded.map((word) => {
      const data = dataMap[word];
      let type: QuestionType = mode === 'random'
        ? shuffle<QuestionType>(['choice', 'letters', 'listen', 'gap'])[0]
        : mode;
      const answer = data.headword || word;
      const family = familyForms(data.wordFamily);
      // Fill-gap needs example sentences that actually contain the word.
      // Give two examples when available — more context to infer the answer.
      const gapExamples = data.examples
        .filter((ex) => maskAnswer(ex, answer, family) !== ex)
        .slice(0, 2)
        .map((ex) => maskAnswer(ex, answer, family));
      if (type === 'gap' && gapExamples.length === 0) type = 'choice';

      const distractors = shuffle([...loaded.filter((w) => w !== word), ...pool]).slice(0, 3);
      return {
        type,
        word,
        // Mask the answer out of the definition too — AI definitions sometimes
        // restate the word ("to draw criticism means…").
        prompt: type === 'gap'
          ? gapExamples.join('\n')
          : maskAnswer(data.definition, answer, family),
        options: type === 'choice' || type === 'gap' ? shuffle([word, ...distractors]) : undefined,
        pos: data.partOfSpeech,
        hint: type === 'letters' ? letterHint(word) : undefined,
        data,
      };
    });

    setQuestions(shuffle(qs));
    setCurrent(0); setScore(0); setAnswered(null); setPicked(null); setTyped(''); setMissed([]);
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
    if (ok) { playCorrect(); setScore((s) => s + 1); }
    else { playWrong(); setMissed((m) => [...m, q.word]); }
    // Record the answer in word progress (tally + history + SR schedule) —
    // the same store the flash cards write to, so quiz sampling learns from it.
    markWord(q.word, ok ? 'known' : 'skipped', user?.id, 0, q.type);
  };

  const pickOption = (opt: string) => {
    if (answered) return;
    setPicked(opt);
    grade(opt === q.word);
    // Read the selected word aloud (just after the correct/wrong chime) so the
    // learner hears the pronunciation of every option they pick.
    stopSpeaking();
    setTimeout(() => speakText(opt), 250);
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
          <Icon icon="lucide:chevron-left" /> <FormattedMessage id="collections.back" />
        </button>
        <h1 className="text-2xl font-display font-bold text-text-primary mb-1"><FormattedMessage id="collections.quizTitle" values={{ name }} /></h1>
        <p className="text-sm text-text-muted mb-6"><FormattedMessage id="collections.setUpRound" /></p>

        <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2"><FormattedMessage id="collections.questionType" /></h2>
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
                  <span className={`block text-sm font-bold ${active ? 'text-accent-cyan' : 'text-text-primary'}`}><FormattedMessage id={m.labelId} /></span>
                  <span className="block text-xs text-text-muted"><FormattedMessage id={m.descriptionId} /></span>
                </span>
                {active && <Icon icon="lucide:check" className="text-accent-cyan shrink-0" />}
              </button>
            );
          })}
        </div>

        <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2"><FormattedMessage id="collections.wordSelection" /></h2>
        <div className="space-y-1.5 mb-6">
          {SOURCES.map((s) => {
            const active = sources[s.id];
            return (
              <button
                key={s.id}
                onClick={() => toggleSource(s.id)}
                className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg border transition-all ${
                  active ? 'border-accent-cyan/50 bg-accent-cyan/10' : 'border-border bg-bg-card hover:border-border-light'
                }`}
              >
                <Icon icon={s.icon} className={`text-lg shrink-0 ${active ? 'text-accent-cyan' : 'text-text-muted'}`} />
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm font-bold ${active ? 'text-accent-cyan' : 'text-text-primary'}`}><FormattedMessage id={s.labelId} /></span>
                  <span className="block text-xs text-text-muted"><FormattedMessage id={s.descriptionId} /></span>
                </span>
                <span
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    active ? 'border-accent-cyan bg-accent-cyan text-bg-primary' : 'border-border'
                  }`}
                >
                  {active && <Icon icon="lucide:check" className="text-sm" />}
                </span>
              </button>
            );
          })}
        </div>

        <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2"><FormattedMessage id="collections.questions" /></h2>
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
          <FormattedMessage id="collections.startQuiz" />
        </button>
      </div>
    );
  }

  // ── Loading ──
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
        <p className="text-sm text-text-muted"><FormattedMessage id="collections.preparingQuiz" /></p>
      </div>
    );
  }

  // ── Finished ──
  if (phase === 'finished') {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-4 text-sm font-display font-bold text-text-muted">
          <Icon icon="lucide:library" className="text-accent-purple" />
          {name}
        </div>
        <div className="text-5xl mb-4">{pct >= 80 ? '🏆' : pct >= 50 ? '🎉' : '💪'}</div>
        <h1 className="text-2xl font-display font-bold text-text-primary mb-1">
          {score} / {questions.length}
        </h1>
        <p className="text-sm text-text-muted mb-8"><FormattedMessage id={pct >= 80 ? 'collections.resultGreat' : pct >= 50 ? 'collections.resultGood' : 'collections.resultKeepGoing'} /></p>

        {/* Missed words — tap one to open its flash card and study it */}
        {missed.length > 0 && (
          <div className="card-game p-4 sm:p-5 mb-8 text-left">
            <h2 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-1">
              <FormattedMessage id="collections.wordsToReview" />
            </h2>
            <p className="text-xs text-text-muted mb-3">
              <FormattedMessage id="collections.youMissed" values={{ count: missed.length }} />
            </p>
            <div className="flex flex-wrap gap-1.5">
              {missed.map((w) => (
                <Link
                  key={w}
                  to={`/?word=${encodeURIComponent(w)}`}
                  title={intl.formatMessage({ id: 'collections.openWord' }, { word: w })}
                  className="flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/20 hover:bg-accent-red/20 hover:border-accent-red/40 transition-all"
                >
                  {w}
                  <Icon icon="lucide:arrow-up-right" className="text-xs opacity-70" />
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => setPhase('settings')} className="btn-3d flex-1 py-3 bg-accent-cyan text-bg-primary font-bold">
            <FormattedMessage id="collections.playAgain" />
          </button>
          <button onClick={onBack} className="btn-3d flex-1 py-3 bg-bg-card text-text-secondary font-bold">
            <FormattedMessage id="collections.done" />
          </button>
        </div>
      </div>
    );
  }

  // ── Playing ──
  const typeMeta = MODES.find((m) => m.id === q.type)!;
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Collection being quizzed */}
      <div className="flex items-center justify-center gap-1.5 mb-3 text-sm font-display font-bold text-text-primary">
        <Icon icon="lucide:library" className="text-accent-purple" />
        <span className="truncate">{name}</span>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between mb-2 text-xs font-bold text-text-muted">
        <span>{current + 1} / {questions.length}</span>
        <span className="flex items-center gap-1"><Icon icon={typeMeta.icon} /> <FormattedMessage id={typeMeta.labelId} /></span>
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
              title={intl.formatMessage({ id: 'collections.playAgainAudio' })}
            >
              <Icon icon="lucide:volume-2" className="text-xl" />
            </button>
            <p className="text-sm text-text-muted"><FormattedMessage id="collections.listenPrompt" /></p>
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
            {/* Choice & Letters get the fuller clue card (like Guess the Word):
                masked examples + synonyms/antonyms. */}
            {(q.type === 'choice' || q.type === 'letters') && q.data && (
              <>
                {(() => {
                  const answer = q.data!.headword || q.word;
                  const examples = q.data!.examples
                    .map((ex) => maskAnswer(ex, answer, familyForms(q.data!.wordFamily)))
                    .slice(0, 2);
                  if (examples.length === 0) return null;
                  return (
                    <div className="mt-3 pt-3 border-t border-border/60">
                      <h4 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-2"><FormattedMessage id="collections.examples" /></h4>
                      <ul className="space-y-2">
                        {examples.map((ex, i) => (
                          <li key={i} className="flex gap-2.5 text-sm text-text-secondary leading-relaxed">
                            <span className="text-accent-cyan shrink-0 mt-0.5">▸</span>
                            <span className="italic">{ex}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
                <SynAnt wordData={q.data} maskWord={q.data.headword || q.word} />
              </>
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
            placeholder={intl.formatMessage({ id: 'collections.typeTheWord' })}
            autoComplete="off" autoCorrect="off" spellCheck={false}
            className={`flex-1 bg-bg-card border-[3px] rounded-2xl px-4 py-3 font-display font-bold text-text-primary focus:outline-none transition-colors ${
              answered === 'correct' ? 'border-accent-green' : answered === 'wrong' ? 'border-accent-red' : 'border-border focus:border-accent-cyan'
            }`}
          />
          {!answered && (
            <button onClick={submitTyped} disabled={!typed.trim()} className="btn-3d px-5 bg-accent-cyan text-bg-primary font-bold disabled:opacity-40">
              <FormattedMessage id="collections.check" />
            </button>
          )}
        </div>
      )}

      {/* Feedback + next */}
      {answered && (
        <div className="mt-5 animate-fade-in">
          {answered === 'wrong' && (
            <p className="text-sm text-text-secondary mb-3">
              <FormattedMessage
                id="collections.answer"
                values={{ word: q.word, b: (c) => <span className="font-bold text-accent-green">{c}</span> }}
              />
            </p>
          )}
          <button onClick={next} className="btn-3d w-full py-3 bg-accent-cyan text-bg-primary font-bold">
            <FormattedMessage id={current + 1 >= questions.length ? 'collections.seeResults' : 'collections.next'} />
          </button>
        </div>
      )}
    </div>
  );
}
