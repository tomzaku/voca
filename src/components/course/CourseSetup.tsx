import { useMemo, useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage } from 'react-intl';
import { LevelPicker } from '../LevelPicker';
import { DEFAULT_GOAL, GOAL_OPTIONS, useDailyGoal } from '../../hooks/useDailyGoal';
import { useCourse } from '../../hooks/useCourse';
import { useVocabularyStore } from '../../hooks/useVocabulary';
import { localDateString } from '../../hooks/useStreak';
import {
  CEFR, IELTS_BANDS, SKILL_ICON, cefrOfCollection, currentStage, daysLeft, makeChoice, planStages, tasksFor, tasksPerDay,
  type Cefr, type CourseChoice, type CourseId,
} from '../../lib/course';
import { PlanDuration } from './PlanCard';

type Step = 'goal' | 'band' | 'level' | 'test' | 'time' | 'plan';

interface Props {
  /** The course is saved; study starts on `collectionId`. */
  onDone: (collectionId: string, label: string) => void;
  /** "Skip" — no course, just start with common words. Hidden when absent. */
  onSkip?: () => void;
}

/**
 * Onboarding, one question per screen: what you're learning for, where you
 * are, how much time you have — then the plan those answers add up to. The old
 * start card put all of it (and twelve shortcuts) on one screen; a new learner
 * shouldn't have to read a menu before their first word.
 *
 * Nothing is saved until "Start my plan", so backing out leaves no half-course.
 */
export function CourseSetup({ onDone, onSkip }: Props) {
  const [step, setStep] = useState<Step>('goal');
  const [courseId, setCourseId] = useState<CourseId>('everyday');
  const [band, setBand] = useState<string>('6.5');
  const [level, setLevel] = useState<Cefr>('A1');
  const [goal, setGoalChoice] = useState<number>(useDailyGoal.getState().chosen ? useDailyGoal.getState().goal : DEFAULT_GOAL);
  const saveGoal = useDailyGoal((s) => s.setGoal);
  const saveCourse = useCourse((s) => s.setCourse);

  const steps: Step[] = courseId === 'ielts' ? ['goal', 'band', 'level', 'time', 'plan'] : ['goal', 'level', 'time', 'plan'];
  const at = steps.indexOf(step === 'test' ? 'level' : step);
  const back = () => setStep(step === 'test' ? 'level' : steps[Math.max(0, at - 1)]);

  const pickLevel = (l: Cefr) => { setLevel(l); setStep('time'); };

  const choice = useMemo(
    () => makeChoice(courseId, level, courseId === 'ielts' ? band : undefined, localDateString()),
    [courseId, level, band],
  );

  const start = () => {
    saveGoal(goal);
    saveCourse(choice);
    const stage = currentStage(planStages(choice, useVocabularyStore.getState().progress));
    onDone(stage.collectionId, stage.cefr);
  };

  return (
    <div>
      {/* Progress dots + back, so it's clear how short this is. */}
      <div className="flex items-center justify-between mb-4 min-h-6">
        {at > 0 ? (
          <button onClick={back} className="flex items-center gap-1 text-xs font-bold text-text-muted hover:text-text-primary">
            <Icon icon="lucide:chevron-left" /> <FormattedMessage id="common.back" />
          </button>
        ) : <span />}
        <div className="flex gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <span key={s} className={`h-1.5 rounded-full transition-all ${i <= at ? 'w-5 bg-accent-purple' : 'w-1.5 bg-border'}`} />
          ))}
        </div>
      </div>

      {step === 'goal' && (
        <>
          <Title id="course.goal.title" sub="course.goal.subtitle" />
          <div className="flex flex-col gap-3">
            <BigChoice
              icon="lucide:messages-square"
              tone="bg-accent-cyan"
              title="course.everyday.name"
              hint="course.everyday.hint"
              onClick={() => { setCourseId('everyday'); setStep('level'); }}
            />
            <BigChoice
              icon="lucide:graduation-cap"
              tone="bg-accent-purple"
              title="course.ielts.name"
              hint="course.ielts.hint"
              onClick={() => { setCourseId('ielts'); setStep('band'); }}
            />
          </div>
          {onSkip && (
            <div className="text-center mt-5">
              <button onClick={onSkip} className="text-sm font-bold text-text-muted hover:text-text-primary">
                <FormattedMessage id="course.skip" />
              </button>
            </div>
          )}
        </>
      )}

      {step === 'band' && (
        <>
          <Title id="course.band.title" sub="course.band.subtitle" />
          <div role="radiogroup" className="grid grid-cols-3 gap-2">
            {IELTS_BANDS.map((b) => (
              <button
                key={b}
                role="radio"
                aria-checked={band === b}
                onClick={() => { setBand(b); setStep('level'); }}
                className={`btn-3d py-3 rounded-xl text-xl font-display font-bold tabular-nums ${
                  band === b ? 'bg-accent-purple text-bg-primary' : 'bg-bg-tertiary text-text-primary'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'level' && (
        <>
          <Title id="course.level.title" sub="course.level.subtitle" />
          <div className="flex flex-col gap-3">
            <BigChoice
              icon="lucide:target"
              tone="bg-accent-cyan"
              title="course.level.test"
              hint="course.level.testHint"
              onClick={() => setStep('test')}
            />
            <BigChoice
              icon="lucide:sprout"
              tone="bg-accent-green"
              title="course.level.beginner"
              hint="course.level.beginnerHint"
              onClick={() => pickLevel('A1')}
            />
          </div>
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted mt-6 mb-2">
            <FormattedMessage id="course.level.know" />
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {CEFR.map((c) => (
              <button
                key={c}
                onClick={() => pickLevel(c)}
                className="btn-3d py-2 rounded-lg bg-bg-tertiary text-sm font-display font-bold text-accent-cyan"
              >
                {c}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'test' && (
        <LevelPicker onDone={(r) => pickLevel(cefrOfCollection(r.collectionId) ?? 'A1')} />
      )}

      {step === 'time' && (
        <>
          <Title id="course.time.title" sub="course.time.subtitle" />
          <div role="radiogroup" className="flex flex-col gap-2">
            {GOAL_OPTIONS.map((n) => (
              <button
                key={n}
                role="radio"
                aria-checked={goal === n}
                onClick={() => { setGoalChoice(n); setStep('plan'); }}
                className={`btn-3d flex items-center gap-3 px-4 py-3 rounded-xl text-left ${
                  goal === n ? 'bg-accent-orange text-bg-primary' : 'bg-bg-tertiary text-text-primary'
                }`}
              >
                <span className="font-bold flex-1"><FormattedMessage id={`flashcard.start.goal${n}`} /></span>
                <span className="text-xs font-bold opacity-80">
                  <FormattedMessage id="course.time.option" values={{ words: n, tasks: tasksPerDay(n) }} />
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'plan' && <PlanPreview choice={choice} goal={goal} onStart={start} />}
    </div>
  );
}

function Title({ id, sub }: { id: string; sub: string }) {
  return (
    <>
      <h2 className="text-xl font-display font-bold text-text-primary"><FormattedMessage id={id} /></h2>
      <p className="text-sm text-text-muted mt-1 mb-5"><FormattedMessage id={sub} /></p>
    </>
  );
}

function BigChoice({ icon, tone, title, hint, onClick }: { icon: string; tone: string; title: string; hint: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`btn-3d w-full flex items-center gap-3 px-4 py-4 rounded-xl ${tone} text-bg-primary text-left`}>
      <Icon icon={icon} className="text-3xl shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block font-bold text-base"><FormattedMessage id={title} /></span>
        <span className="block text-xs opacity-85"><FormattedMessage id={hint} /></span>
      </span>
      <Icon icon="lucide:chevron-right" className="text-xl shrink-0" />
    </button>
  );
}

/** The answers, added up: where you're going, how long, and what a day looks like. */
function PlanPreview({ choice, goal, onStart }: { choice: CourseChoice; goal: number; onStart: () => void }) {
  const progress = useVocabularyStore((s) => s.progress);
  const stages = planStages(choice, progress);
  const days = daysLeft(stages, goal);
  const tasks = tasksFor(choice, goal, choice.startedOn);

  return (
    <>
      <Title id="course.plan.title" sub="course.plan.subtitle" />
      <div className="rounded-xl bg-bg-tertiary p-4 flex flex-col gap-3">
        <Row icon="lucide:flag">
          {choice.id === 'ielts'
            ? <FormattedMessage id="course.plan.ieltsGoal" values={{ band: choice.band, target: choice.target }} />
            : <FormattedMessage id="course.plan.everydayGoal" values={{ target: choice.target }} />}
        </Row>
        <Row icon="lucide:route">
          <FormattedMessage id="course.plan.path" values={{ path: stages.map((s) => s.cefr).join(' → ') }} />
        </Row>
        <Row icon="lucide:calendar-check">
          <PlanDuration days={days} />
        </Row>
      </div>

      <p className="text-xs font-bold uppercase tracking-wide text-text-muted mt-5 mb-2">
        <FormattedMessage id="course.plan.aDay" />
      </p>
      <ul className="flex flex-col gap-1.5 mb-5">
        <li className="flex items-center gap-2 text-sm text-text-primary">
          <Icon icon="lucide:sparkles" className="text-accent-cyan" />
          <FormattedMessage id="plan.words" values={{ n: goal }} />
        </li>
        {tasks.map((t) => (
          <li key={t.key} className="flex items-center gap-2 text-sm text-text-primary">
            <Icon icon={SKILL_ICON[t.skill]} className="text-accent-purple" />
            <FormattedMessage id={t.labelId} />
          </li>
        ))}
      </ul>

      <button onClick={onStart} className="btn-3d w-full py-3 rounded-xl bg-accent-green text-bg-primary font-bold">
        <FormattedMessage id="course.plan.start" />
      </button>
    </>
  );
}

function Row({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-sm font-bold text-text-primary">
      <Icon icon={icon} className="text-lg text-accent-purple shrink-0" />
      <span>{children}</span>
    </div>
  );
}
