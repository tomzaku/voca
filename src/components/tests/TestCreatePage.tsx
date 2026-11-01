import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '../../hooks/useAuth';
import { fetchCollectionDetail, type Collection } from '../../lib/collectionsApi';
import { problemOf, questionsToSave, type EditableQuestion } from '../../lib/hunt';
import { createSet, fetchSet, listSets, saveSet, type SetSummary } from '../../lib/questionSetsApi';
import { createTest } from '../../lib/testsApi';
import { QuestionEditor } from '../hunt/QuestionEditor';
import { Selector } from '../Selector';

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
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [pictures, setPictures] = useState<Record<string, string>>({});
  const addPictures = useCallback((add: Record<string, string>) => setPictures((p) => ({ ...p, ...add })), []);
  const [sets, setSets] = useState<SetSummary[]>([]);
  // The set these questions save to: one she opened, or a new one on send.
  const [setId, setSetId] = useState<string | null>(null);
  const [setTitle_, setSetTitle] = useState('');
  const [sending, setSending] = useState(false);

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

  const openSet = async (setIdToOpen: string) => {
    if (questions.length && !window.confirm(intl.formatMessage({ id: 'tests.replaceQuestions' }))) return;
    try {
      const set = await fetchSet(setIdToOpen);
      setQuestions(set.questions);
      setSetId(set.id);
      setSetTitle(set.title);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const askable = questions.filter((q) => !problemOf(q)).length;
  const dueOk = Date.parse(due) > Date.now();
  const ready = !!col && title.trim() && askable > 0 && dueOk && !sending;

  const send = async () => {
    if (!ready || !col) return;
    setSending(true);
    try {
      const name = setId ? setTitle_ : title.trim();
      const set = setId
        ? await saveSet(setId, name, questionsToSave(questions))
        : await createSet(name, questionsToSave(questions));
      setSetId(set.id);
      const test = await createTest({ collectionId: col.id, setId: set.id, title: title.trim(), dueAt: new Date(due).toISOString(), showLeaderboard });
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

      <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-5">
        <div className="grid sm:grid-cols-[1fr_auto] gap-4">
          <div>
            <label className={label} htmlFor="test-title"><FormattedMessage id="tests.name" /></label>
            <input id="test-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={input} />
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

<label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={showLeaderboard} onChange={(e) => setShowLeaderboard(e.target.checked)} className="mt-1 accent-[var(--color-accent-green)] w-4 h-4" />
            <span>
              <span className="block text-sm font-bold text-text-primary"><FormattedMessage id="tests.leaderboardToggle" /></span>
              <span className="block text-xs text-text-muted"><FormattedMessage id="tests.leaderboardHint" /></span>
            </span>
          </label>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <span className={label + ' !mb-0'}><FormattedMessage id="tests.questionsLabel" /></span>
            {sets.length > 0 && (
              <Selector
                align="right"
                value=""
                ariaLabel={intl.formatMessage({ id: 'tests.useSaved' })}
                options={[
                  { value: '', label: intl.formatMessage({ id: 'tests.useSaved' }) },
                  ...sets.map((s) => ({ value: s.id, label: `${s.title} (${s.questionCount})` })),
                ]}
                onChange={(v) => { if (v) void openSet(v); }}
              />
            )}
          </div>
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
            {setId
              ? <FormattedMessage id="hunt.sets.savesTo" values={{ title: setTitle_ }} />
              : <FormattedMessage id="tests.savesAsSet" />}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void send()}
          disabled={!ready}
          className="btn-3d w-full py-3 bg-accent-green text-bg-primary font-display font-extrabold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Icon icon={sending ? 'lucide:loader-2' : 'lucide:send'} className={sending ? 'animate-spin' : ''} />
          <FormattedMessage id={sending ? 'tests.sending' : 'tests.send'} values={{ n: askable }} />
        </button>
      </div>
    </div>
  );
}
