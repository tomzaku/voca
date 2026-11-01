import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { FormattedDate, FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '../../hooks/useAuth';
import { ApiError } from '../../lib/api';
import {
  deleteTest,
  fetchTest,
  fetchTestImage,
  fetchTestResults,
  submitTest,
  updateTest,
  type Answers,
  type ReviewItem,
  type TestQuestion,
  type TestResults,
  type TestSummary,
} from '../../lib/testsApi';
import { HuntQuestion } from '../hunt/HuntQuestion';

const DATE = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' } as const;

/** Answers so far live on this device too, so a refresh mid-test loses nothing. */
const draftKey = (id: string) => `voca:test-draft:${id}`;
function readDraft(id: string): Answers {
  try {
    const raw = localStorage.getItem(draftKey(id));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Answers : {};
  } catch {
    return {};
  }
}
function writeDraft(id: string, answers: Answers | null) {
  try {
    if (answers) localStorage.setItem(draftKey(id), JSON.stringify(answers));
    else localStorage.removeItem(draftKey(id));
  } catch { /* private mode: the test still works, it just won't survive a refresh */ }
}

/** The moment the page opened — whether a test is open is decided once, not on every render. */
function useOpenedAt(): number {
  return useState(() => Date.now())[0];
}

const shown = (a: string | string[] | undefined) => (Array.isArray(a) ? a.join(' · ') : a ?? '');

/**
 * One collection test at /tests/:id — the link a teacher shares. Its owner
 * sees how the class did; a student takes it, one question at a time, and
 * hands it in once. After that they see their score and which they got
 * right, and the right answers once the due date has passed.
 */
export function TestPage() {
  const { id = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<{ test: TestSummary; questions: TestQuestion[]; review: ReviewItem[] | null } | null>(null);
  const [error, setError] = useState<{ notFound: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetchTest(id).then(
      (d) => alive && setData(d),
      (err) => alive && setError({ notFound: err instanceof ApiError && err.status === 404, message: (err as Error).message }),
    );
    return () => { alive = false; };
  }, [id, user]);

  if (!authLoading && !user) {
    return (
      <Centered>
        <Icon icon="lucide:clipboard-check" className="text-5xl text-accent-green" />
        <p className="text-text-secondary"><FormattedMessage id="tests.signInToTake" /></p>
        <Link to="/login" className="btn-3d inline-block px-5 py-2.5 bg-accent-cyan text-bg-primary font-bold"><FormattedMessage id="tests.signIn" /></Link>
      </Centered>
    );
  }
  if (error) {
    return (
      <Centered>
        <p className="text-text-secondary">{error.notFound ? <FormattedMessage id="tests.notFound" /> : error.message}</p>
      </Centered>
    );
  }
  if (!data) return <Centered><Icon icon="lucide:loader-2" className="text-3xl text-text-muted animate-spin" /></Centered>;

  const back = (
    <Link to={`/collections/${data.test.collectionId}`} className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary">
      <Icon icon="lucide:arrow-left" /> <FormattedMessage id="tests.backToCollection" />
    </Link>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {back}
      {data.test.isOwner
        ? <OwnerView test={data.test} onChange={(test) => setData({ ...data, test })} />
        : data.review
          ? <Review test={data.test} questions={data.questions} review={data.review} />
          : <TakeTest test={data.test} questions={data.questions} onDone={(test, review) => setData({ ...data, test, review })} />}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="max-w-xl mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">{children}</div>;
}

function Header({ test }: { test: TestSummary }) {
  const open = Date.parse(test.dueAt) > useOpenedAt();
  return (
    <div>
      <h1 className="text-2xl font-display font-extrabold text-text-primary">{test.title}</h1>
      <p className="text-sm text-text-muted mt-1">
        <FormattedMessage id={open ? 'tests.due' : 'tests.closedOn'} values={{ date: <FormattedDate value={test.dueAt} {...DATE} /> }} />
        {' · '}
        <FormattedMessage id="tests.questions" values={{ n: test.questionCount }} />
      </p>
    </div>
  );
}

// ── Student ────────────────────────────────────────────────────────────────

function TakeTest({ test, questions, onDone }: {
  test: TestSummary;
  questions: TestQuestion[];
  onDone: (test: TestSummary, review: ReviewItem[]) => void;
}) {
  const intl = useIntl();
  const [answers, setAnswers] = useState<Answers>(() => readDraft(test.id));
  // -1 is the cover page; questions.length the hand-in page.
  const [at, setAt] = useState(-1);
  const [sending, setSending] = useState(false);
  const loadImage = useCallback((key: string) => fetchTestImage(test.id, key), [test.id]);
  const open = Date.parse(test.dueAt) > useOpenedAt();
  const answered = questions.filter((q) => shown(answers[q.id]).trim()).length;

  const answer = (q: TestQuestion, a: string | string[]) => {
    const next = { ...answers, [q.id]: a };
    setAnswers(next);
    writeDraft(test.id, next);
    setAt((i) => i + 1);
  };

  const handIn = async () => {
    if (answered < questions.length && !window.confirm(intl.formatMessage({ id: 'tests.confirmUnanswered' }, { n: questions.length - answered }))) return;
    setSending(true);
    try {
      const res = await submitTest(test.id, answers);
      writeDraft(test.id, null);
      onDone(res.test, res.review);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <>
        <Header test={test} />
        <p className="rounded-xl bg-bg-tertiary p-4 text-text-secondary"><FormattedMessage id="tests.closedMissed" /></p>
      </>
    );
  }

  if (at < 0) {
    return (
      <>
        <Header test={test} />
        <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-4">
          <p className="text-text-secondary"><FormattedMessage id="tests.intro" /></p>
          <button
            type="button"
            onClick={() => setAt(0)}
            className="btn-3d w-full py-3 bg-accent-green text-bg-primary font-display font-extrabold"
          >
            <FormattedMessage id={answered ? 'tests.continue' : 'tests.start'} />
          </button>
        </div>
      </>
    );
  }

  if (at >= questions.length) {
    return (
      <>
        <Header test={test} />
        <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-4">
          <p className="text-lg font-bold text-text-primary">
            <FormattedMessage id="tests.answeredOf" values={{ n: answered, total: questions.length }} />
          </p>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setAt(i)}
                className={`w-9 h-9 rounded-lg text-sm font-bold border-2 ${shown(answers[q.id]).trim() ? 'border-accent-green bg-accent-green/15 text-text-primary' : 'border-border text-text-muted'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted"><FormattedMessage id="tests.onceOnly" /></p>
          <button
            type="button"
            onClick={() => void handIn()}
            disabled={sending}
            className="btn-3d w-full py-3 bg-accent-green text-bg-primary font-display font-extrabold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Icon icon={sending ? 'lucide:loader-2' : 'lucide:send'} className={sending ? 'animate-spin' : ''} />
            <FormattedMessage id={sending ? 'tests.handingIn' : 'tests.handIn'} />
          </button>
        </div>
      </>
    );
  }

  const q = questions[at];
  const prev = shown(answers[q.id]);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-bg-tertiary overflow-hidden">
          <div className="h-full bg-accent-green transition-all" style={{ width: `${(at / questions.length) * 100}%` }} />
        </div>
        <span className="text-xs font-bold text-text-muted tabular-nums">{at + 1}/{questions.length}</span>
      </div>
      <div className="rounded-2xl border border-border bg-bg-card p-5">
        <HuntQuestion key={q.id} question={q} cooldown={0} busy={false} onAnswer={(a) => answer(q, a)} loadImage={loadImage} />
        {prev && (
          <p className="mt-4 text-xs text-text-muted">
            <FormattedMessage id="tests.yourAnswer" values={{ answer: <b className="text-text-primary">{prev}</b> }} />
          </p>
        )}
      </div>
      <div className="flex justify-between">
        <button type="button" onClick={() => setAt(at - 1)} disabled={at === 0} className="px-3 py-2 text-sm font-bold text-text-muted hover:text-text-primary disabled:opacity-30 flex items-center gap-1">
          <Icon icon="lucide:chevron-left" /> <FormattedMessage id="tests.previous" />
        </button>
        <button type="button" onClick={() => setAt(at + 1)} className="px-3 py-2 text-sm font-bold text-text-muted hover:text-text-primary flex items-center gap-1">
          <FormattedMessage id={prev ? 'tests.next' : 'tests.skip'} /> <Icon icon="lucide:chevron-right" />
        </button>
      </div>
    </div>
  );
}

function Review({ test, questions, review }: { test: TestSummary; questions: TestQuestion[]; review: ReviewItem[] }) {
  const result = test.myResult;
  const revealed = review.some((r) => r.answer !== null);
  const byId = new Map(questions.map((q) => [q.id, q]));
  return (
    <>
      <Header test={test} />
      {result && (
        <div className="rounded-2xl border-[3px] border-accent-green bg-accent-green/10 p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-accent-green"><FormattedMessage id="tests.yourScore" /></p>
          <p className="text-4xl font-display font-extrabold text-text-primary mt-1">{result.score}/{result.total}</p>
        </div>
      )}
      {!revealed && <p className="text-xs text-text-muted"><FormattedMessage id="tests.answersAfterDue" /></p>}
      <ol className="space-y-2">
        {review.map((r, i) => {
          const q = byId.get(r.questionId);
          return (
            <li key={r.questionId} className="rounded-xl border border-border bg-bg-card p-3 flex gap-3">
              <Icon icon={r.correct ? 'lucide:circle-check' : 'lucide:circle-x'} className={`text-xl shrink-0 mt-0.5 ${r.correct ? 'text-accent-green' : 'text-accent-red'}`} />
              <div className="min-w-0 text-sm">
                <p className="text-text-primary">
                  <span className="text-text-muted">{i + 1}. </span>
                  {q?.prompt || q?.slotPrompts?.join(' · ') || q?.say || q?.scrambled || <FormattedMessage id={`hunt.type.${q?.type ?? 'custom'}`} />}
                </p>
                <p className="text-text-secondary mt-0.5">
                  <FormattedMessage id="tests.youSaid" values={{ answer: <b>{r.given || '—'}</b> }} />
                  {r.answer !== null && !r.correct && (
                    <> · <FormattedMessage id="tests.rightAnswer" values={{ answer: <b className="text-accent-green">{r.answer}</b> }} /></>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

// ── Teacher ────────────────────────────────────────────────────────────────

function OwnerView({ test, onChange }: { test: TestSummary; onChange: (t: TestSummary) => void }) {
  const intl = useIntl();
  const navigate = useNavigate();
  const [results, setResults] = useState<TestResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [due, setDue] = useState('');

  const load = useCallback(() => {
    fetchTestResults(test.id).then((r) => { setResults(r); setError(null); }, (err) => setError((err as Error).message));
  }, [test.id]);
  useEffect(load, [load]);

  const link = `${window.location.origin}/tests/${test.id}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(intl.formatMessage({ id: 'tests.linkCopied' }));
    } catch {
      toast.error(link);
    }
  };

  const saveDue = async () => {
    try {
      onChange(await updateTest(test.id, { dueAt: new Date(due).toISOString() }));
      setDue('');
      toast.success(intl.formatMessage({ id: 'tests.dueChanged' }));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const remove = async () => {
    if (!window.confirm(intl.formatMessage({ id: 'tests.confirmDelete' }))) return;
    try {
      await deleteTest(test.id);
      navigate(`/collections/${test.collectionId}`, { replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // Hardest first: the questions to teach again.
  const hardest = [...(results?.questions ?? [])].sort((a, b) => a.right / Math.max(1, a.right + a.wrong) - b.right / Math.max(1, b.right + b.wrong));

  return (
    <>
      <Header test={test} />

      <div className="rounded-2xl border border-border bg-bg-card p-4 space-y-3">
        <p className="text-xs font-bold text-text-muted uppercase tracking-wider"><FormattedMessage id="tests.shareLink" /></p>
        <div className="flex gap-2">
          <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="flex-1 min-w-0 bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-xs text-text-secondary font-code" />
          <button type="button" onClick={() => void copy()} className="btn-3d shrink-0 px-3 py-2 text-xs font-bold bg-accent-cyan text-bg-primary flex items-center gap-1.5">
            <Icon icon="lucide:copy" /> <FormattedMessage id="tests.copy" />
          </button>
        </div>
        <p className="text-xs text-text-muted"><FormattedMessage id="tests.shareHint" /></p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            type="datetime-local"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            aria-label={intl.formatMessage({ id: 'tests.changeDue' })}
            className="bg-bg-tertiary border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary"
          />
          <button type="button" onClick={() => void saveDue()} disabled={!due} className="px-3 py-1.5 rounded-lg bg-bg-tertiary text-xs font-bold text-text-primary disabled:opacity-40">
            <FormattedMessage id="tests.changeDue" />
          </button>
          <span className="flex-1" />
          <button type="button" onClick={() => void remove()} className="px-3 py-1.5 text-xs font-bold text-text-muted hover:text-accent-red flex items-center gap-1">
            <Icon icon="lucide:trash-2" /> <FormattedMessage id="tests.delete" />
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-accent-red">{error}</p>}
      {!results && !error && <div className="flex justify-center py-8"><Icon icon="lucide:loader-2" className="text-2xl text-text-muted animate-spin" /></div>}

      {results && (
        <>
          <section className="rounded-2xl border border-border bg-bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-display font-bold text-text-primary">
                <FormattedMessage id="tests.handedIn" values={{ done: results.students.length, total: results.students.length + results.waiting.length }} />
              </h2>
              <button type="button" onClick={load} className="text-xs font-bold text-text-muted hover:text-text-primary flex items-center gap-1">
                <Icon icon="lucide:refresh-cw" /> <FormattedMessage id="tests.refresh" />
              </button>
            </div>
            {results.students.length === 0 && <p className="text-xs text-text-muted"><FormattedMessage id="tests.noneYet" /></p>}
            <ul className="divide-y divide-border">
              {results.students.map((s) => (
                <li key={s.userId} className="flex items-center gap-3 py-2 text-sm">
                  <span className="flex-1 min-w-0 truncate font-semibold text-text-primary">{s.name}</span>
                  <span className="text-xs text-text-muted"><FormattedDate value={s.submittedAt} {...DATE} /></span>
                  <span className="w-14 text-right font-bold tabular-nums text-text-primary">{s.score}/{s.total}</span>
                </li>
              ))}
            </ul>
            {results.waiting.length > 0 && (
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5"><FormattedMessage id="tests.notYet" values={{ n: results.waiting.length }} /></p>
                <p className="text-sm text-text-secondary">{results.waiting.map((w) => w.name).join(', ')}</p>
              </div>
            )}
          </section>

          {results.students.length > 0 && (
            <section className="rounded-2xl border border-border bg-bg-card p-4 space-y-3">
              <h2 className="text-sm font-display font-bold text-text-primary"><FormattedMessage id="tests.byQuestion" /></h2>
              <ul className="space-y-3">
                {hardest.map((q) => {
                  const total = q.right + q.wrong;
                  const pct = total ? Math.round((q.right / total) * 100) : 0;
                  return (
                    <li key={q.id} className="text-sm">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 text-text-primary">{q.prompt || <FormattedMessage id={`hunt.type.${q.type}`} />} <span className="text-text-muted">→ <b>{q.answer}</b></span></p>
                        <span className={`shrink-0 font-bold tabular-nums ${pct < 50 ? 'text-accent-red' : 'text-accent-green'}`}>{pct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                        <div className={`h-full ${pct < 50 ? 'bg-accent-red' : 'bg-accent-green'}`} style={{ width: `${pct}%` }} />
                      </div>
                      {q.commonWrong.length > 0 && (
                        <p className="mt-1 text-xs text-text-muted">
                          <FormattedMessage id="tests.commonWrong" values={{ list: q.commonWrong.map((w) => `${w.given} (${w.count})`).join(', ') }} />
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
