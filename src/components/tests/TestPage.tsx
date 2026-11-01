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
  checkAnswer,
  formatDuration,
  startTest,
  submitTest,
  updateTest,
  type Answers,
  type Check,
  type Leader,
  type ReviewItem,
  type TestQuestion,
  type TestResults,
  type TestSummary,
} from '../../lib/testsApi';
import { HuntQuestion } from '../hunt/HuntQuestion';
import { playCorrect, playSelect, playWin, playWrong } from '../../lib/sfx';
import { themeLook } from '../../lib/testThemes';
import { Confetti, CountUp, Marked, ThemedProgress, ThemedStage, ThemePicker, ThemePreviewButton } from './ThemedStage';

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
  const [data, setData] = useState<{
    test: TestSummary;
    questions: TestQuestion[];
    checked: Check[];
    review: ReviewItem[] | null;
    leaderboard: Leader[];
  } | null>(null);
  // Set when this visit handed the test in — the score lands with a burst.
  const [justDone, setJustDone] = useState(false);
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
        : (
          <ThemedStage theme={data.test.theme}>
            {data.review
              ? <Review test={data.test} questions={data.questions} review={data.review} leaderboard={data.leaderboard} celebrate={justDone} />
              : (
                <TakeTest
                  test={data.test}
                  questions={data.questions}
                  initialChecked={data.checked}
                  leaderboard={data.leaderboard}
                  onStarted={(test, questions, checked) => setData({ ...data, test, questions, checked })}
                  onDone={(test, review, leaderboard) => { setJustDone(true); setData({ ...data, test, review, leaderboard }); }}
                />
              )}
          </ThemedStage>
        )}
    </div>
  );
}

/**
 * The test's top three, when the teacher shows it. Before a student hands in
 * it's the score to beat; after, it's where they landed — their own row, if
 * they made it, is marked.
 */
function Leaderboard({ leaders, test }: { leaders: Leader[]; test: TestSummary }) {
  if (!test.showLeaderboard) return null;
  const medal = ['text-accent-yellow', 'text-text-secondary', 'text-accent-orange'];
  return (
    <section className="rounded-2xl border border-border bg-bg-card p-4 space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-display font-bold text-text-primary">
        <Icon icon="lucide:trophy" className="text-accent-yellow" />
        <FormattedMessage id="tests.topThree" />
      </h2>
      {leaders.length === 0
        ? <p className="text-xs text-text-muted"><FormattedMessage id="tests.topThreeEmpty" /></p>
        : (
          <ol className="space-y-1">
            {leaders.map((l, i) => (
              <li key={i} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm ${l.isMe ? 'bg-accent-green/15' : ''}`}>
                <Icon icon="lucide:medal" className={`text-lg shrink-0 ${medal[i]}`} />
                <span className="flex-1 min-w-0 truncate font-semibold text-text-primary">
                  {l.name}{l.isMe && <span className="text-text-muted font-normal"> (<FormattedMessage id="tests.you" />)</span>}
                </span>
                <span className="text-right leading-tight">
                  <span className="block font-bold tabular-nums text-text-primary">{l.score}/{l.total}</span>
                  {l.durationMs !== null && <span className="block text-[11px] tabular-nums text-text-muted">{formatDuration(l.durationMs)}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
    </section>
  );
}

/** A running clock from the student's Start — ticks once a second. */
function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);
  if (now === null) return null;
  return (
    <span className="flex items-center gap-1 text-xs font-bold tabular-nums text-text-muted">
      <Icon icon="lucide:timer" /> {formatDuration(now - Date.parse(since))}
    </span>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="max-w-xl mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">{children}</div>;
}

function Header({ test }: { test: TestSummary }) {
  const open = Date.parse(test.dueAt) > useOpenedAt();
  const onStage = !!themeLook(test.theme).background;
  return (
    <div className={onStage ? 'drop-shadow' : ''}>
      <h1 className={`text-2xl font-display font-extrabold ${onStage ? 'text-white' : 'text-text-primary'}`}>{test.title}</h1>
      <p className={`text-sm mt-1 ${onStage ? 'text-white/85' : 'text-text-muted'}`}>
        <FormattedMessage id={open ? 'tests.due' : 'tests.closedOn'} values={{ date: <FormattedDate value={test.dueAt} {...DATE} /> }} />
        {' · '}
        <FormattedMessage id="tests.questions" values={{ n: test.questionCount }} />
      </p>
    </div>
  );
}

// ── Student ────────────────────────────────────────────────────────────────

function TakeTest({ test, questions, initialChecked, leaderboard, onStarted, onDone }: {
  test: TestSummary;
  questions: TestQuestion[];
  /** Answers already marked, in an instant-feedback test. */
  initialChecked: Check[];
  leaderboard: Leader[];
  onStarted: (test: TestSummary, questions: TestQuestion[], checked: Check[]) => void;
  onDone: (test: TestSummary, review: ReviewItem[], leaderboard: Leader[]) => void;
}) {
  const intl = useIntl();
  const [answers, setAnswers] = useState<Answers>(() => readDraft(test.id));
  // -1 is the cover page; questions.length the hand-in page.
  const [at, setAt] = useState(-1);
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState<Record<string, Check>>(() => Object.fromEntries(initialChecked.map((c) => [c.questionId, c])));
  // The question just marked here — it gets the burst or the shake; one
  // marked on an earlier visit is shown quietly.
  const [fresh, setFresh] = useState<string | null>(null);
  const loadImage = useCallback((key: string) => fetchTestImage(test.id, key), [test.id]);
  const open = Date.parse(test.dueAt) > useOpenedAt();
  const instant = test.instantFeedback;
  const look = themeLook(test.theme);
  const onStage = !!look.background;
  const isAnswered = (qid: string) => !!checked[qid] || !!shown(answers[qid]).trim();
  const answered = questions.filter((q) => isAnswered(q.id)).length;
  const rightSoFar = Object.values(checked).filter((c) => c.correct).length;

  const answer = async (q: TestQuestion, a: string | string[]) => {
    const next = { ...answers, [q.id]: a };
    setAnswers(next);
    writeDraft(test.id, next);
    if (!instant) {
      playSelect();
      setAt((i) => i + 1);
      return;
    }
    if (checked[q.id] || checking) return;
    setChecking(true);
    try {
      const c = await checkAnswer(test.id, q.id, a);
      setChecked((m) => ({ ...m, [q.id]: c }));
      setFresh(q.id);
      if (c.correct) playCorrect(); else playWrong();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setChecking(false);
    }
  };

  /** Right answers in a row, ending at question `i` — the streak shown after a hit. */
  const streakAt = (i: number) => {
    let n = 0;
    for (let k = i; k >= 0 && checked[questions[k].id]?.correct; k--) n++;
    return n;
  };

  // The server starts the clock and only then sends the questions. Pressing
  // Start again after a reload keeps the clock it already has.
  const begin = async () => {
    if (test.startedAt && questions.length) { setAt(0); return; }
    setStarting(true);
    try {
      const res = await startTest(test.id);
      setChecked(Object.fromEntries(res.checked.map((c) => [c.questionId, c])));
      onStarted(res.test, res.questions, res.checked);
      setAt(0);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const handIn = async () => {
    if (answered < questions.length && !window.confirm(intl.formatMessage({ id: 'tests.confirmUnanswered' }, { n: questions.length - answered }))) return;
    setSending(true);
    try {
      const res = await submitTest(test.id, answers);
      writeDraft(test.id, null);
      playWin();
      onDone(res.test, res.review, res.leaderboard);
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
          <p className="flex items-start gap-2 text-xs text-text-muted">
            <Icon icon="lucide:timer" className="text-sm shrink-0 mt-px" />
            <FormattedMessage id={test.startedAt ? 'tests.clockRunning' : 'tests.timedHint'} />
          </p>
          {instant && (
            <p className="flex items-start gap-2 text-xs text-text-muted">
              <Icon icon="lucide:zap" className="text-sm shrink-0 mt-px" />
              <FormattedMessage id="tests.instantIntro" />
            </p>
          )}
          <button
            type="button"
            onClick={() => void begin()}
            disabled={starting}
            className="btn-3d w-full py-3 bg-accent-green text-bg-primary font-display font-extrabold disabled:opacity-60 animate-jelly"
          >
            <FormattedMessage id={starting ? 'tests.starting' : test.startedAt ? 'tests.continue' : 'tests.start'} />
          </button>
        </div>
        <Leaderboard leaders={leaderboard} test={test} />
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
          {instant && (
            <p className="text-sm text-text-secondary">
              <FormattedMessage id="tests.rightSoFar" values={{ n: rightSoFar }} />
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setAt(i)}
                className={`w-9 h-9 rounded-lg text-sm font-bold border-2 animate-tile-in ${
                  checked[q.id]
                    ? checked[q.id].correct ? 'border-accent-green bg-accent-green text-bg-primary' : 'border-accent-red bg-accent-red text-white'
                    : isAnswered(q.id) ? 'border-accent-green bg-accent-green/15 text-text-primary' : 'border-border text-text-muted'
                }`}
                style={{ animationDelay: `${i * 25}ms` }}
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
  const mark = checked[q.id];
  const navText = onStage ? 'text-white/85 hover:text-white' : 'text-text-muted hover:text-text-primary';
  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-3 ${onStage ? 'text-white' : ''}`}>
        <ThemedProgress theme={test.theme} at={at} total={questions.length} />
        <span className={`text-xs font-bold tabular-nums ${onStage ? 'text-white' : 'text-text-muted'}`}>{at + 1}/{questions.length}</span>
        {test.startedAt && <Elapsed since={test.startedAt} />}
      </div>
      <div
        key={q.id}
        className={`relative rounded-3xl border border-border bg-bg-card p-5 shadow-xl animate-question-in ${mark && !mark.correct && fresh === q.id ? 'animate-shake' : ''}`}
      >
        {mark?.correct && fresh === q.id && <Confetti />}
        <HuntQuestion
          question={q}
          cooldown={0}
          busy={checking || !!mark}
          onAnswer={(a) => void answer(q, a)}
          loadImage={loadImage}
          tileColors={look.tiles}
          reveal={mark ? { given: mark.given, answer: mark.answer } : undefined}
        />
        {mark ? (
          <Marked check={mark} fresh={fresh === q.id} streak={mark.correct ? streakAt(at) : 0} />
        ) : prev && !instant ? (
          <p className="mt-4 text-xs text-text-muted">
            <FormattedMessage id="tests.yourAnswer" values={{ answer: <b className="text-text-primary">{prev}</b> }} />
          </p>
        ) : null}
      </div>
      <div className="flex justify-between">
        <button type="button" onClick={() => setAt(at - 1)} disabled={at === 0} className={`px-3 py-2 text-sm font-bold disabled:opacity-30 flex items-center gap-1 ${navText}`}>
          <Icon icon="lucide:chevron-left" /> <FormattedMessage id="tests.previous" />
        </button>
        {mark ? (
          <button type="button" onClick={() => setAt(at + 1)} className="btn-3d px-5 py-2.5 bg-accent-green text-bg-primary font-display font-extrabold flex items-center gap-1 animate-pop-in">
            <FormattedMessage id={at + 1 < questions.length ? 'tests.next' : 'tests.finish'} /> <Icon icon="lucide:chevron-right" />
          </button>
        ) : (
          <button type="button" onClick={() => setAt(at + 1)} className={`px-3 py-2 text-sm font-bold flex items-center gap-1 ${navText}`}>
            <FormattedMessage id={prev ? 'tests.next' : 'tests.skip'} /> <Icon icon="lucide:chevron-right" />
          </button>
        )}
      </div>
    </div>
  );
}


function Review({ test, questions, review, leaderboard, celebrate }: {
  test: TestSummary;
  questions: TestQuestion[];
  review: ReviewItem[];
  leaderboard: Leader[];
  /** Just handed in on this visit: the score counts up under confetti. */
  celebrate: boolean;
}) {
  const result = test.myResult;
  const revealed = review.some((r) => r.answer !== null);
  const byId = new Map(questions.map((q) => [q.id, q]));
  return (
    <>
      <Header test={test} />
      {result && (
        <div className={`relative overflow-hidden rounded-3xl border-[3px] border-accent-green bg-bg-card p-6 text-center shadow-xl ${celebrate ? 'animate-bounce-in' : ''}`}>
          {celebrate && <Confetti count={48} />}
          <p className="text-xs font-bold uppercase tracking-wider text-accent-green"><FormattedMessage id="tests.yourScore" /></p>
          <p className="text-5xl font-display font-extrabold text-text-primary mt-1 tabular-nums">
            {celebrate ? <CountUp to={result.score} /> : result.score}/{result.total}
          </p>
          {result.durationMs !== null && (
            <p className="text-xs text-text-muted mt-1 flex items-center justify-center gap-1">
              <Icon icon="lucide:timer" /> <FormattedMessage id="tests.tookTime" values={{ time: formatDuration(result.durationMs) }} />
            </p>
          )}
        </div>
      )}
      <Leaderboard leaders={leaderboard} test={test} />
      {!revealed && (
        <p className={`text-xs ${themeLook(test.theme).background ? 'text-white/85' : 'text-text-muted'}`}><FormattedMessage id="tests.answersAfterDue" /></p>
      )}
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

  const change = async (fields: Parameters<typeof updateTest>[1]) => {
    try {
      onChange(await updateTest(test.id, fields));
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
        <div className="pt-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider"><FormattedMessage id="tests.themeLabel" /></p>
            <ThemePreviewButton theme={test.theme} instant={test.instantFeedback} questions={[]} />
          </div>
          <ThemePicker value={test.theme} onChange={(theme) => void change({ theme })} />
        </div>
        <label className="flex items-start gap-3 cursor-pointer pt-1">
          <input type="checkbox" checked={test.instantFeedback} onChange={(e) => void change({ instantFeedback: e.target.checked })} className="mt-1 accent-[var(--color-accent-green)] w-4 h-4" />
          <span>
            <span className="block text-sm font-bold text-text-primary"><FormattedMessage id="tests.instantToggle" /></span>
            <span className="block text-xs text-text-muted"><FormattedMessage id="tests.instantHint" /></span>
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={test.showLeaderboard} onChange={(e) => void change({ showLeaderboard: e.target.checked })} className="mt-1 accent-[var(--color-accent-green)] w-4 h-4" />
          <span>
            <span className="block text-sm font-bold text-text-primary"><FormattedMessage id="tests.leaderboardToggle" /></span>
            <span className="block text-xs text-text-muted"><FormattedMessage id="tests.leaderboardHint" /></span>
          </span>
        </label>
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
                  <span className="w-12 text-right text-xs tabular-nums text-text-muted">{s.durationMs !== null ? formatDuration(s.durationMs) : '—'}</span>
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
