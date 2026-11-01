import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { FormattedDate, FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '../../hooks/useAuth';
import { fetchCollectionDetail, type Collection } from '../../lib/collectionsApi';
import { importQuestions, problemOf, questionsToSave, type EditableQuestion } from '../../lib/hunt';
import { createSet, listSets, saveSet, type SetSummary } from '../../lib/questionSetsApi';
import { createTest } from '../../lib/testsApi';
import { ImportQuestions } from '../hunt/ImportQuestions';
import { QuestionEditor } from '../hunt/QuestionEditor';
import { ThemePicker, ThemePreviewButton, type PreviewQuestion } from './ThemedStage';
import type { TestTheme } from '../../lib/testThemes';

/** `<input type="datetime-local">` speaks local time with no zone. */
function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** A week from today, at the end of the day — homework's natural deadline. */
function defaultDue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 0, 0);
  return toLocalInput(d);
}

/**
 * Sending a test to a collection's members: the same question editor a
 * treasure hunt uses, primed with the collection's words, plus a name and a
 * due date. The questions are saved as a question set first — so the teacher
 * can send it again, or play it as a hunt — and the test copies them.
 *
 * Two steps, questions first: they're the real work, and doing them first
 * means the theme preview in step two plays her own questions, and Send sits
 * beside the last things she checks — the due date and the look.
 *
 * Free for every collection owner; only the editor's AI helpers are Pro.
 */
export function TestCreatePage() {
  const { id = '' } = useParams();
  const intl = useIntl();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [col, setCol] = useState<Collection | null>(null);
  const [missing, setMissing] = useState(false);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(defaultDue);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [theme, setTheme] = useState<TestTheme>('ocean');
  const [instantFeedback, setInstantFeedback] = useState(false);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [pictures, setPictures] = useState<Record<string, string>>({});
  const addPictures = useCallback((add: Record<string, string>) => setPictures((p) => ({ ...p, ...add })), []);
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [importing, setImporting] = useState(false);
  // The new set Send saved the questions as — kept so a retry after a failed
  // send updates it rather than making a second copy.
  const [savedSetId, setSavedSetId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // Questions first, then the settings and Send — see the header comment.
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetchCollectionDetail(id).then((res) => {
      if (!alive) return;
      if (!res || res.collection.ownerId !== user.id) { setMissing(true); return; }
      setCol(res.collection);
      setTitle((t) => t || intl.formatMessage({ id: 'tests.defaultTitle' }, { name: res.collection.name }));
    });
    listSets().then((s) => alive && setSets(s)).catch(() => { /* she can still build one here */ });
    return () => { alive = false; };
  }, [id, user, intl]);


  const askable = questions.filter((q) => !problemOf(q)).length;

  // Her questions as a student will get them, with their answers — so the
  // preview can mark them itself. Pictures come from the editor's own copies.
  const previewQuestions: PreviewQuestion[] = questions.filter((q) => !problemOf(q)).map((q) => ({
    question: {
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      options: q.options ?? null,
      image: q.imageWord ? q.id : null,
      slotPrompts: q.slotPrompts ?? null,
      say: q.say ?? null,
      scrambled: q.scrambled ?? null,
      length: q.options || q.type === 'custom' ? null : q.answer.length,
    },
    answer: q.answer,
    accept: q.accept,
    slots: q.slots,
  }));
  const previewImage = useCallback(async (key: string) => {
    const word = questions.find((q) => q.id === key)?.imageWord;
    const src = word ? pictures[word] : undefined;
    if (!src) throw new Error('No picture');
    return src;
  }, [questions, pictures]);
  const dueOk = Date.parse(due) > Date.now();
  const ready = !!col && title.trim() && askable > 0 && dueOk && !sending;

  const send = async () => {
    if (!ready || !col) return;
    setSending(true);
    try {
      // Imported questions are copies, so the test's questions are always a
      // new set of their own — the sets she imported from stay as they were.
      const set = savedSetId
        ? await saveSet(savedSetId, title.trim(), questionsToSave(questions))
        : await createSet(title.trim(), questionsToSave(questions));
      setSavedSetId(set.id);
      const test = await createTest({ collectionId: col.id, setId: set.id, title: title.trim(), dueAt: new Date(due).toISOString(), showLeaderboard, theme, instantFeedback });
      toast.success(intl.formatMessage({ id: 'tests.sent' }));
      navigate(`/tests/${test.id}`, { replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-text-secondary"><FormattedMessage id="tests.signInToSend" /></p>
        <Link to="/login" className="btn-3d inline-block px-5 py-2.5 bg-accent-cyan text-bg-primary font-bold"><FormattedMessage id="tests.signIn" /></Link>
      </div>
    );
  }
  if (missing) {
    return <p className="max-w-xl mx-auto px-4 py-16 text-center text-text-secondary"><FormattedMessage id="tests.notYourCollection" /></p>;
  }
  if (!col) {
    return <div className="flex justify-center py-16"><Icon icon="lucide:loader-2" className="text-3xl text-text-muted animate-spin" /></div>;
  }

  const label = 'block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5';
  const input = 'w-full bg-bg-tertiary border-2 border-border rounded-xl px-3 py-2.5 text-text-primary font-semibold focus:outline-none focus:border-accent-cyan';
  const go = (to: 1 | 2) => {
    if (to === 2 && askable === 0) return;
    setStep(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <Link to={`/collections/${col.id}`} className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary">
        <Icon icon="lucide:arrow-left" /> {col.name}
      </Link>
      <div>
        <h1 className="text-2xl font-display font-extrabold text-text-primary"><FormattedMessage id="tests.newTitle" /></h1>
        <p className="text-sm text-text-muted mt-1">
          <FormattedMessage id="tests.newHint" values={{ n: col.memberCount }} />
        </p>
      </div>

      {/* The steps — a tab bar too: step 2 opens once there's a question to ask. */}
      <ol className="grid grid-cols-2 gap-2">
        {([1, 2] as const).map((n) => {
          const on = step === n;
          const done = n === 1 && step === 2;
          const locked = n === 2 && askable === 0;
          return (
            <li key={n}>
              <button
                type="button"
                onClick={() => go(n)}
                disabled={locked}
                aria-current={on ? 'step' : undefined}
                className={`w-full flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
                  on ? 'border-accent-cyan bg-accent-cyan/10' : 'border-border hover:border-border-light'
                }`}
              >
                <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-sm font-display font-extrabold ${
                  done ? 'bg-accent-green text-bg-primary' : on ? 'bg-accent-cyan text-bg-primary' : 'bg-bg-tertiary text-text-muted'
                }`}>
                  {done ? <Icon icon="lucide:check" /> : n}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-text-primary truncate"><FormattedMessage id={n === 1 ? 'tests.stepQuestions' : 'tests.stepSettings'} /></span>
                  <span className="block text-xs text-text-muted truncate">
                    {n === 1
                      ? <FormattedMessage id="tests.questions" values={{ n: askable }} />
                      : <FormattedMessage id="tests.stepSettingsHint" />}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Step 1 stays mounted while hidden, so the editor keeps its words and lookups. */}
      <div className={`rounded-2xl border border-border bg-bg-card p-5 space-y-5 ${step === 1 ? '' : 'hidden'}`}>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <span className={label + ' !mb-0'}><FormattedMessage id="tests.questionsLabel" /></span>
            {sets.length > 0 && (
              <button
                type="button"
                onClick={() => setImporting(true)}
                className="px-3 py-1.5 rounded-xl bg-bg-tertiary text-xs font-bold text-text-primary flex items-center gap-1.5 hover:text-accent-cyan"
              >
                <Icon icon="lucide:library" /> <FormattedMessage id="tests.importBank" />
              </button>
            )}
          </div>
          {importing && (
            <ImportQuestions
              sets={sets}
              current={questions}
              onImport={(picked) => {
                const next = importQuestions(questions, picked);
                setQuestions(next);
                setImporting(false);
                toast.success(intl.formatMessage({ id: 'hunt.import.done' }, { n: next.length - questions.length }));
              }}
              onClose={() => setImporting(false)}
            />
          )}
          <QuestionEditor
            questions={questions}
            onChange={setQuestions}
            pictures={pictures}
            onPictures={addPictures}
            needed={1}
            initialWords={col.words}
          />
          <p className="mt-3 text-xs text-text-muted flex items-center gap-1.5">
            <Icon icon="lucide:save" />
            <FormattedMessage id="tests.savesAsSet" />
          </p>
        </div>

        <button
          type="button"
          onClick={() => go(2)}
          disabled={askable === 0}
          className="btn-3d w-full py-3 bg-accent-cyan text-bg-primary font-display font-extrabold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {askable === 0
            ? <FormattedMessage id="tests.needAQuestion" />
            : <><FormattedMessage id="tests.nextSettings" /> <Icon icon="lucide:arrow-right" /></>}
        </button>
      </div>

      {step === 2 && (
        <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-5 animate-fade-in">
          <div className="grid sm:grid-cols-[1fr_auto] gap-4">
            <div>
              <label className={label} htmlFor="test-title"><FormattedMessage id="tests.name" /></label>
              <input
                id="test-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                className={input}
              />
            </div>
            <div>
              <label className={label} htmlFor="test-due"><FormattedMessage id="tests.dueLabel" /></label>
              <input
                id="test-due"
                type="datetime-local"
                value={due}
                min={toLocalInput(new Date())}
                onChange={(e) => setDue(e.target.value)}
                className={`${input} ${dueOk ? '' : '!border-accent-red'}`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className={label + ' !mb-0'}><FormattedMessage id="tests.themeLabel" /></span>
              <ThemePreviewButton theme={theme} instant={instantFeedback} questions={previewQuestions} loadImage={previewImage} />
            </div>
            <ThemePicker value={theme} onChange={setTheme} />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={instantFeedback} onChange={(e) => setInstantFeedback(e.target.checked)} className="mt-1 accent-[var(--color-accent-green)] w-4 h-4" />
            <span>
              <span className="block text-sm font-bold text-text-primary"><FormattedMessage id="tests.instantToggle" /></span>
              <span className="block text-xs text-text-muted"><FormattedMessage id="tests.instantHint" /></span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={showLeaderboard} onChange={(e) => setShowLeaderboard(e.target.checked)} className="mt-1 accent-[var(--color-accent-green)] w-4 h-4" />
            <span>
              <span className="block text-sm font-bold text-text-primary"><FormattedMessage id="tests.leaderboardToggle" /></span>
              <span className="block text-xs text-text-muted"><FormattedMessage id="tests.leaderboardHint" /></span>
            </span>
          </label>

          {/* What's about to go out, in one line, right above the button. */}
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-bg-tertiary px-3 py-2.5 text-sm text-text-secondary">
            <Icon icon="lucide:clipboard-check" className="text-accent-green" />
            <FormattedMessage id="tests.questions" values={{ n: askable }} />
            <span aria-hidden>·</span>
            {dueOk
              ? <FormattedMessage id="tests.due" values={{ date: <FormattedDate value={new Date(due)} weekday="short" month="short" day="numeric" hour="numeric" minute="2-digit" /> }} />
              : <span className="text-accent-red"><FormattedMessage id="tests.duePassed" /></span>}
            <span aria-hidden>·</span>
            <FormattedMessage id={`tests.theme.${theme}`} />
            {instantFeedback && <><span aria-hidden>·</span><FormattedMessage id="tests.summaryInstant" /></>}
            {showLeaderboard && <><span aria-hidden>·</span><FormattedMessage id="tests.topThree" /></>}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => go(1)}
              className="px-4 py-3 rounded-xl bg-bg-tertiary text-sm font-bold text-text-primary flex items-center gap-1.5 hover:text-accent-cyan"
            >
              <Icon icon="lucide:arrow-left" /> <FormattedMessage id="tests.back" />
            </button>
            <button
              type="button"
              onClick={() => void send()}
              disabled={!ready}
              className="btn-3d flex-1 py-3 bg-accent-green text-bg-primary font-display font-extrabold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Icon icon={sending ? 'lucide:loader-2' : 'lucide:send'} className={sending ? 'animate-spin' : ''} />
              <FormattedMessage id={sending ? 'tests.sending' : 'tests.send'} values={{ n: askable }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
