import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import { useSearchParams } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  bareWord,
  drillAnswer,
  GRAMMAR_LESSONS,
  GRAMMAR_LEVELS,
  lessonById,
  type Drill,
  type GrammarLesson,
  type Text,
} from '../data/grammar';
import { isCompleted, useGrammarProgress } from '../hooks/useGrammarProgress';
import { useAuth } from '../hooks/useAuth';
import { useLocale } from '../i18n/locale';
import { PASS_SCORE } from '../lib/grammarApi';
import { speakText, stopSpeaking } from '../lib/tts';
import { playCorrect, playWin, playWrong } from '../lib/sfx';

// The Grammar course: lessons in a fixed order, each one rule → examples →
// a round of drills. Passing a round unlocks the next lesson; a locked one
// can still be "tested out of" by taking its drills cold, so a learner who
// already knows the early lessons isn't made to sit through them.
//
// The URL carries where you are (`?lesson=<id>`, `&mode=test`), so a lesson
// is linkable and the browser's back button leaves it.

type Mode = 'learn' | 'test';

/** Lesson prose in the interface language — the English sentences stay English. */
function useTr() {
  const locale = useLocale((s) => s.locale);
  return (t: Text) => t[locale] ?? t.en;
}

/** `**part**` → that part highlighted, the rest plain. */
function Highlight({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
        i % 2 ? <strong key={i} className="text-accent-cyan font-extrabold">{part}</strong> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}

function SpeakButton({ text }: { text: string }) {
  const intl = useIntl();
  const [on, setOn] = useState(false);
  const plain = text.replace(/\*\*/g, '').replace(/\s*\(.*\)\s*$/, '');
  return (
    <button
      onClick={() => {
        if (on) { stopSpeaking(); setOn(false); return; }
        void speakText(plain, { onStart: () => setOn(true), onEnd: () => setOn(false) });
      }}
      aria-label={intl.formatMessage({ id: 'grammar.listen' })}
      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
        on ? 'bg-accent-cyan text-bg-primary' : 'bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20'
      }`}
    >
      <Icon icon={on ? 'lucide:audio-lines' : 'lucide:volume-2'} className={on ? 'animate-pulse' : ''} />
    </button>
  );
}

// ─── Course list ─────────────────────────────────────────────────────

/** A lesson is open once the one before it is passed — or once it's been tried. */
function useUnlocked() {
  const records = useGrammarProgress((s) => s.records);
  return useMemo(() => {
    const open = new Set<string>();
    GRAMMAR_LESSONS.forEach((l, i) => {
      if (i === 0 || records[l.id] || isCompleted(records[GRAMMAR_LESSONS[i - 1].id])) open.add(l.id);
    });
    return open;
  }, [records]);
}

function CourseList({ onOpen }: { onOpen: (id: string, mode: Mode) => void }) {
  const tr = useTr();
  const records = useGrammarProgress((s) => s.records);
  const unlocked = useUnlocked();
  const done = GRAMMAR_LESSONS.filter((l) => isCompleted(records[l.id])).length;
  // The first lesson not yet passed — what "Continue" means.
  const next = GRAMMAR_LESSONS.find((l) => !isCompleted(records[l.id]));

  return (
    <>
      <div className="card-game p-4 mb-6 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-text-muted mb-1.5">
            <FormattedMessage id="grammar.progress" values={{ done, total: GRAMMAR_LESSONS.length }} />
          </div>
          <div className="h-3 rounded-full bg-bg-tertiary overflow-hidden">
            <div className="h-full bg-accent-green transition-all" style={{ width: `${(done / GRAMMAR_LESSONS.length) * 100}%` }} />
          </div>
        </div>
        {next && (
          <button onClick={() => onOpen(next.id, 'learn')} className="btn-3d shrink-0 px-4 py-2.5 bg-accent-green text-bg-primary text-sm">
            <FormattedMessage id={done ? 'grammar.continue' : 'grammar.start'} />
          </button>
        )}
      </div>

      {GRAMMAR_LEVELS.map(({ level, title }) => {
        const lessons = GRAMMAR_LESSONS.filter((l) => l.level === level);
        if (!lessons.length) return null;
        return (
          <section key={level} className="mb-8">
            <h2 className="flex items-baseline gap-2 mb-3">
              <span className="px-2 py-0.5 rounded-lg bg-accent-purple/15 text-accent-purple text-xs font-extrabold">{level}</span>
              <span className="font-title font-black text-lg text-text-primary">{tr(title)}</span>
            </h2>
            <ol className="space-y-2">
              {lessons.map((lesson) => {
                const n = GRAMMAR_LESSONS.indexOf(lesson) + 1;
                const rec = records[lesson.id];
                const passed = isCompleted(rec);
                const open = unlocked.has(lesson.id);
                const current = lesson.id === next?.id;
                return (
                  <li key={lesson.id}>
                    <div
                      className={`flex items-center gap-3 rounded-2xl border-2 p-3 transition-colors ${
                        current ? 'border-accent-green/50 bg-accent-green/5' : 'border-border bg-bg-card'
                      } ${open ? '' : 'opacity-70'}`}
                    >
                      <span
                        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold ${
                          passed ? 'bg-accent-green text-bg-primary' : open ? 'bg-accent-cyan/15 text-accent-cyan' : 'bg-bg-tertiary text-text-muted'
                        }`}
                      >
                        {passed ? <Icon icon="lucide:check" /> : open ? n : <Icon icon="lucide:lock" className="text-xs" />}
                      </span>
                      <button
                        disabled={!open}
                        onClick={() => onOpen(lesson.id, 'learn')}
                        className="flex-1 min-w-0 text-left disabled:cursor-default"
                      >
                        <div className="font-bold text-text-primary truncate">{tr(lesson.title)}</div>
                        <div className="text-xs text-text-muted truncate">{tr(lesson.summary)}</div>
                      </button>
                      {rec && (
                        <span className={`shrink-0 text-xs font-extrabold ${passed ? 'text-accent-green' : 'text-accent-orange'}`}>
                          {rec.bestScore}%
                        </span>
                      )}
                      {!open && (
                        <button
                          onClick={() => onOpen(lesson.id, 'test')}
                          className="shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-full bg-bg-tertiary text-text-secondary hover:text-accent-cyan hover:bg-accent-cyan/10"
                        >
                          <FormattedMessage id="grammar.testOut" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </>
  );
}

// ─── Learn step ──────────────────────────────────────────────────────

function LearnStep({ lesson, onPractice }: { lesson: GrammarLesson; onPractice: () => void }) {
  const tr = useTr();
  return (
    <div className="space-y-4 animate-fade-in">
      <p className="text-text-secondary leading-relaxed">{tr(lesson.rule)}</p>

      <div className="rounded-2xl border-2 border-accent-purple/30 bg-accent-purple/5 p-4">
        <div className="text-xs font-extrabold uppercase tracking-wide text-accent-purple mb-2"><FormattedMessage id="grammar.form" /></div>
        <ul className="space-y-1">
          {lesson.pattern.map((p) => <li key={p} className="font-mono text-sm text-text-primary">{p}</li>)}
        </ul>
      </div>

      <div className="rounded-2xl border-2 border-border bg-bg-card p-4">
        <div className="text-xs font-extrabold uppercase tracking-wide text-text-muted mb-2"><FormattedMessage id="grammar.examples" /></div>
        <ul className="space-y-2">
          {lesson.examples.map((ex) => (
            <li key={ex} className="flex items-center gap-2.5">
              <SpeakButton text={ex} />
              <span className="text-text-primary"><Highlight text={ex} /></span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border-2 border-accent-orange/30 bg-accent-orange/5 px-4 py-3">
        <Icon icon="lucide:lightbulb" className="shrink-0 mt-0.5 text-accent-orange" />
        <div>
          <div className="text-xs font-extrabold text-accent-orange mb-1"><FormattedMessage id="grammar.viNoteTitle" /></div>
          <p className="text-sm text-text-secondary leading-relaxed">{tr(lesson.viNote)}</p>
        </div>
      </div>

      <button onClick={onPractice} className="btn-3d w-full py-3 bg-accent-green text-bg-primary">
        <FormattedMessage id="grammar.practice" values={{ count: lesson.drills.length }} />
      </button>
    </div>
  );
}

// ─── Drills ──────────────────────────────────────────────────────────

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** One drill, answered once. `onAnswer` fires the moment it's graded. */
function DrillCard({ drill, onAnswer, answered }: { drill: Drill; onAnswer: (ok: boolean) => void; answered: boolean }) {
  const grade = (ok: boolean) => {
    if (ok) playCorrect(); else playWrong();
    onAnswer(ok);
  };
  if (drill.kind === 'choice') return <ChoiceDrill drill={drill} answered={answered} grade={grade} />;
  if (drill.kind === 'error') return <ErrorDrill drill={drill} answered={answered} grade={grade} />;
  return <OrderDrill drill={drill} answered={answered} grade={grade} />;
}

type DrillProps<K extends Drill['kind']> = { drill: Extract<Drill, { kind: K }>; answered: boolean; grade: (ok: boolean) => void };

function Instruction({ id }: { id: string }) {
  return <div className="text-xs font-extrabold uppercase tracking-wide text-text-muted mb-3"><FormattedMessage id={id} /></div>;
}

function ChoiceDrill({ drill, answered, grade }: DrillProps<'choice'>) {
  const [picked, setPicked] = useState<number | null>(null);
  const [before, after] = drill.prompt.split('___');
  return (
    <>
      <Instruction id="grammar.drillChoice" />
      <p className="text-xl font-bold text-text-primary mb-5 leading-relaxed">
        {before}
        <span className={`inline-block min-w-16 px-2 mx-0.5 border-b-[3px] text-center ${
          picked === null ? 'border-text-muted' : picked === drill.answer ? 'border-accent-green text-accent-green' : 'border-accent-red text-accent-red'
        }`}>
          {picked === null ? ' ' : drill.options[picked]}
        </span>
        {after}
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {drill.options.map((opt, i) => {
          // One full set of colours per state: Tailwind doesn't let a later
          // class in the string override an earlier one of the same kind.
          const state = !answered
            ? 'border-border bg-bg-card text-text-primary hover:border-accent-cyan'
            : i === drill.answer ? 'bg-accent-green/15 border-accent-green text-accent-green'
            : i === picked ? 'bg-accent-red/10 border-accent-red text-accent-red'
            : 'border-border bg-bg-card text-text-primary opacity-50';
          return (
            <button
              key={opt}
              disabled={answered}
              onClick={() => { setPicked(i); grade(i === drill.answer); }}
              className={`rounded-xl border-2 px-3 py-2.5 font-bold transition-colors ${state}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </>
  );
}

function ErrorDrill({ drill, answered, grade }: DrillProps<'error'>) {
  const [picked, setPicked] = useState<number | null>(null);
  const tokens = drill.sentence.split(' ');
  const wrongAt = tokens.findIndex((t) => bareWord(t) === drill.wrong);
  return (
    <>
      <Instruction id="grammar.drillError" />
      <div className="flex flex-wrap gap-1.5 text-xl font-bold">
        {tokens.map((t, i) => {
          const state = !answered
            ? 'text-text-primary hover:bg-accent-cyan/10 hover:text-accent-cyan'
            // Underlined, not struck out: some mistakes are a missing word
            // just before this one, so "very" isn't itself wrong.
            : i === wrongAt ? 'bg-accent-red/15 text-accent-red underline decoration-wavy decoration-2 underline-offset-4'
            : i === picked ? 'bg-accent-orange/15 text-accent-orange'
            : 'text-text-primary';
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => { setPicked(i); grade(i === wrongAt); }}
              className={`rounded-lg px-1.5 py-0.5 transition-colors ${state}`}
            >
              {t}
            </button>
          );
        })}
      </div>
    </>
  );
}

function OrderDrill({ drill, answered, grade }: DrillProps<'order'>) {
  // Indexes into `drill.chunks`, so a word that appears twice stays two tiles.
  const [bank] = useState(() => {
    let order = shuffle(drill.chunks.map((_, i) => i));
    // A shuffle that lands on the answer isn't a drill.
    for (let tries = 0; tries < 5 && order.every((v, i) => v === i); tries++) order = shuffle(order);
    return order;
  });
  const [placed, setPlaced] = useState<number[]>([]);
  const left = bank.filter((i) => !placed.includes(i));
  const ok = placed.map((i) => drill.chunks[i]).join(' ') === drill.chunks.join(' ');

  const tile = 'rounded-xl border-2 px-3 py-1.5 font-bold transition-colors';
  return (
    <>
      <Instruction id="grammar.drillOrder" />
      <div className={`min-h-14 flex flex-wrap gap-2 rounded-2xl border-2 border-dashed p-2 mb-3 ${
        answered ? (ok ? 'border-accent-green bg-accent-green/5' : 'border-accent-red bg-accent-red/5') : 'border-border'
      }`}>
        {placed.map((i) => (
          <button
            key={i}
            disabled={answered}
            onClick={() => setPlaced((p) => p.filter((x) => x !== i))}
            className={`${tile} border-accent-cyan/40 bg-accent-cyan/10 text-text-primary`}
          >
            {drill.chunks[i]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 min-h-11">
        {left.map((i) => (
          <button
            key={i}
            disabled={answered}
            onClick={() => setPlaced((p) => [...p, i])}
            className={`${tile} border-border bg-bg-card text-text-primary hover:border-accent-cyan`}
          >
            {drill.chunks[i]}
          </button>
        ))}
      </div>
      {!answered && (
        <button
          disabled={left.length > 0}
          onClick={() => grade(ok)}
          className="btn-3d mt-4 w-full py-2.5 bg-accent-cyan text-bg-primary"
        >
          <FormattedMessage id="grammar.check" />
        </button>
      )}
    </>
  );
}

function PracticeStep({ lesson, onFinish }: { lesson: GrammarLesson; onFinish: (correct: number) => void }) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const drill = lesson.drills[index];
  const answered = results.length > index;
  const last = index === lesson.drills.length - 1;

  const next = () => {
    if (last) onFinish(results.filter(Boolean).length);
    else setIndex((i) => i + 1);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 flex gap-1">
          {lesson.drills.map((_, i) => (
            <span
              key={i}
              className={`h-2 flex-1 rounded-full ${
                i < results.length ? (results[i] ? 'bg-accent-green' : 'bg-accent-red') : i === index ? 'bg-accent-cyan' : 'bg-border'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-bold text-text-muted">{index + 1}/{lesson.drills.length}</span>
      </div>

      <div key={index} className="card-game p-5 animate-question-in">
        <DrillCard drill={drill} answered={answered} onAnswer={(ok) => setResults((r) => [...r, ok])} />
        {answered && (
          <div className="mt-5 animate-fade-in">
            <div className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 ${results[index] ? 'bg-accent-green/10' : 'bg-accent-red/10'}`}>
              <Icon
                icon={results[index] ? 'lucide:circle-check' : 'lucide:circle-x'}
                className={`shrink-0 mt-0.5 text-lg ${results[index] ? 'text-accent-green' : 'text-accent-red'}`}
              />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-extrabold ${results[index] ? 'text-accent-green' : 'text-accent-red'}`}>
                  <FormattedMessage id={results[index] ? 'grammar.correct' : 'grammar.notQuite'} />
                </div>
                <div className="text-text-primary font-bold">{drillAnswer(drill)}</div>
              </div>
              <SpeakButton text={drillAnswer(drill)} />
            </div>
            <button onClick={next} className="btn-3d mt-4 w-full py-2.5 bg-accent-green text-bg-primary">
              <FormattedMessage id={last ? 'grammar.seeResult' : 'grammar.next'} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Result ──────────────────────────────────────────────────────────

function ResultStep({ score, onRetry, onReview, onNext, onCourse }: {
  score: number;
  onRetry: () => void;
  onReview: () => void;
  onNext: (() => void) | null;
  onCourse: () => void;
}) {
  const passed = score >= PASS_SCORE;
  useEffect(() => { if (passed) playWin(); }, [passed]);
  return (
    <div className="card-game p-6 text-center animate-bounce-in">
      <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-3 ${
        passed ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-orange/15 text-accent-orange'
      }`}>
        <Icon icon={passed ? 'lucide:trophy' : 'lucide:rotate-ccw'} />
      </div>
      <div className="font-title font-black text-4xl text-text-primary">{score}%</div>
      <p className="mt-1 text-sm text-text-secondary">
        <FormattedMessage id={passed ? 'grammar.passed' : 'grammar.notPassed'} values={{ pass: PASS_SCORE }} />
      </p>
      <div className="mt-6 grid gap-2">
        {passed && onNext && (
          <button onClick={onNext} className="btn-3d py-3 bg-accent-green text-bg-primary">
            <FormattedMessage id="grammar.nextLesson" />
          </button>
        )}
        {!passed && (
          <button onClick={onReview} className="btn-3d py-3 bg-accent-cyan text-bg-primary">
            <FormattedMessage id="grammar.reviewRule" />
          </button>
        )}
        <button onClick={onRetry} className="btn-3d py-2.5 bg-bg-tertiary text-text-primary">
          <FormattedMessage id="grammar.tryAgain" />
        </button>
        <button onClick={onCourse} className="py-2 text-sm font-bold text-text-muted hover:text-text-secondary">
          <FormattedMessage id="grammar.backToCourse" />
        </button>
      </div>
    </div>
  );
}

// ─── Lesson ──────────────────────────────────────────────────────────

function LessonView({ lesson, mode, onOpen, onCourse }: {
  lesson: GrammarLesson;
  mode: Mode;
  onOpen: (id: string, mode: Mode) => void;
  onCourse: () => void;
}) {
  const tr = useTr();
  const recordAttempt = useGrammarProgress((s) => s.recordAttempt);
  const [step, setStep] = useState<'learn' | 'practice' | 'result'>(mode === 'test' ? 'practice' : 'learn');
  const [score, setScore] = useState(0);
  // Bumped on retry so the drills remount with a fresh shuffle and no answers.
  const [round, setRound] = useState(0);
  const n = GRAMMAR_LESSONS.indexOf(lesson);
  const nextLesson = GRAMMAR_LESSONS[n + 1];

  let body: ReactNode;
  if (step === 'learn') {
    body = <LearnStep lesson={lesson} onPractice={() => setStep('practice')} />;
  } else if (step === 'practice') {
    body = (
      <PracticeStep
        key={round}
        lesson={lesson}
        onFinish={(correct) => {
          setScore(recordAttempt(lesson.id, correct, lesson.drills.length).lastScore);
          setStep('result');
        }}
      />
    );
  } else {
    body = (
      <ResultStep
        score={score}
        onRetry={() => { setRound((r) => r + 1); setStep('practice'); }}
        onReview={() => setStep('learn')}
        onNext={nextLesson ? () => onOpen(nextLesson.id, 'learn') : null}
        onCourse={onCourse}
      />
    );
  }

  return (
    <>
      <header className="mb-5">
        <div className="flex items-center gap-1.5 mb-1 text-xs font-bold">
          <button onClick={onCourse} className="text-text-muted hover:text-text-secondary transition-colors"><FormattedMessage id="grammar.title" /></button>
          <span className="text-text-muted/50">/</span>
          <span className="text-text-secondary">{lesson.level} · <FormattedMessage id="grammar.lessonN" values={{ n: n + 1 }} /></span>
        </div>
        <h1 className="font-title font-black text-2xl sm:text-3xl text-text-primary leading-tight">{tr(lesson.title)}</h1>
        {mode === 'test' && step !== 'result' && (
          <p className="mt-1 text-sm text-text-muted"><FormattedMessage id="grammar.testOutHint" values={{ pass: PASS_SCORE }} /></p>
        )}
      </header>
      {body}
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export function GrammarPage() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const sync = useGrammarProgress((s) => s.sync);
  // Another device may have got further; fold its progress in once per visit.
  useEffect(() => { if (user) void sync(); }, [user, sync]);
  useEffect(() => () => stopSpeaking(), []);

  const lesson = lessonById(params.get('lesson') ?? '');
  const mode: Mode = params.get('mode') === 'test' ? 'test' : 'learn';

  const open = (id: string, m: Mode) => {
    setParams(m === 'test' ? { lesson: id, mode: 'test' } : { lesson: id });
    window.scrollTo({ top: 0 });
  };
  const course = () => { setParams({}); window.scrollTo({ top: 0 }); };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {lesson ? (
        // Keyed so moving to the next lesson starts it from the top.
        <LessonView key={`${lesson.id}:${mode}`} lesson={lesson} mode={mode} onOpen={open} onCourse={course} />
      ) : (
        <>
          <header className="mb-6">
            <h1 className="font-title font-black text-2xl sm:text-3xl text-text-primary leading-tight"><FormattedMessage id="grammar.title" /></h1>
            <p className="text-sm text-text-muted"><FormattedMessage id="grammar.subtitle" /></p>
          </header>
          <CourseList onOpen={open} />
        </>
      )}
    </div>
  );
}
