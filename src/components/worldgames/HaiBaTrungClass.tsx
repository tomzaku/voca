import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FormattedDate, FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '../../hooks/useAuth';
import { useTeams } from '../../hooks/useTeams';
import { shownAnswer, useTakeTest } from '../../hooks/useTakeTest';
import {
  fetchTest,
  formatDuration,
  listTests,
  type Check,
  type Leader,
  type ReviewItem,
  type TestQuestion,
  type TestSummary,
} from '../../lib/testsApi';
import { PixelQuestion } from './HuntHud';
import { PixelButton, PixelChip, PixelIcon, PixelLoader } from './pixel';

// Hai Bà Trưng's classroom, kept by the teacher in the forecourt: the work
// you've been set and how your class stands. Its two boards —
//   Homework     every test sent to a collection you own or have joined
//                (lib/testsApi), taken here at a desk, one question at a time
//   Class board  your teams' leaderboards (hooks/useTeams)
// Taking a test runs on hooks/useTakeTest, as the app's test page does; only
// the drawing is the world's own. A test you sent opens in the app, where its
// results are.

const DATE = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' } as const;

type Tab = 'homework' | 'board';

export function HaiBaTrungClass({ onClose }: { onClose: () => void }) {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('homework');
  const [testId, setTestId] = useState<string | null>(null);

  return (
    <div className="px absolute inset-0 z-40 flex items-end sm:items-center justify-center p-3 bg-black/25" onKeyDown={(e) => e.stopPropagation()}>
      <div className="px-notch px-frame w-full max-w-[640px] p-4 px-in-up max-h-full overflow-y-auto">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="px-title !text-[18px] text-[var(--px-gold)] flex items-center gap-2"><PixelIcon name="pencil" size={2} /> <FormattedMessage id="world.classTitle" /></p>
            <p className="text-[12px] opacity-80"><FormattedMessage id="world.classHow" /></p>
          </div>
          <PixelButton tone="paper" onClick={onClose} className="!px-2.5 !py-1 !text-[13px] shrink-0"><FormattedMessage id="world.close" /></PixelButton>
        </div>

        {!user ? (
          loading ? <PixelLoader label={<FormattedMessage id="world.classLoading" />} /> : (
            <div className="px-notch px-inset p-4 space-y-3 text-center">
              <p><FormattedMessage id="world.classSignIn" /></p>
              <Link to="/login" className="px-btn px-notch px-title inline-block px-4 py-2" data-tone="gold"><FormattedMessage id="tests.signIn" /></Link>
            </div>
          )
        ) : (
          <>
            {!testId && (
              <div className="flex gap-1.5 mb-3">
                <PixelChip on={tab === 'homework'} onClick={() => setTab('homework')}><FormattedMessage id="world.classHomework" /></PixelChip>
                <PixelChip on={tab === 'board'} onClick={() => setTab('board')}><FormattedMessage id="world.classBoard" /></PixelChip>
              </div>
            )}
            {tab === 'board'
              ? <ClassBoard userId={user.id} />
              : testId
                ? <Desk id={testId} onBack={() => setTestId(null)} />
                : <Homework onOpen={setTestId} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Homework ──────────────────────────────────────────────────────────────

function Homework({ onOpen }: { onOpen: (id: string) => void }) {
  const [tests, setTests] = useState<TestSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Whether a test is still open is decided once, when the board opens.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    listTests().then((t) => alive && setTests(t), (err) => alive && setError((err as Error).message));
    return () => { alive = false; };
  }, []);

  if (error) return <p className="px-notch px-inset p-3 text-[var(--px-bad)]">{error}</p>;
  if (!tests) return <PixelLoader label={<FormattedMessage id="world.classLoading" />} />;
  if (!tests.length) return <p className="px-notch px-inset p-4 text-[14px]"><FormattedMessage id="world.classNoTests" /></p>;

  const open = (t: TestSummary) => Date.parse(t.dueAt) > now;
  const groups: [string, TestSummary[]][] = [
    ['world.classToDo', tests.filter((t) => !t.isOwner && !t.myResult && open(t))],
    ['world.classDone', tests.filter((t) => !t.isOwner && t.myResult)],
    ['world.classMissed', tests.filter((t) => !t.isOwner && !t.myResult && !open(t))],
    ['world.classSent', tests.filter((t) => t.isOwner)],
  ];

  return (
    <div className="space-y-3">
      {groups.filter(([, list]) => list.length).map(([title, list]) => (
        <section key={title}>
          <p className="px-title !text-[12px] text-[var(--px-muted)] mb-1"><FormattedMessage id={title} /></p>
          <ul className="space-y-1.5">
            {list.map((t) => (
              <li key={t.id} className="px-notch px-inset p-2.5 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[16px] truncate">{t.title}</p>
                  <p className="text-[12px] text-[var(--px-muted)] truncate">
                    {t.collectionName}
                    {' · '}
                    <FormattedMessage id={open(t) ? 'tests.due' : 'tests.closedOn'} values={{ date: <FormattedDate value={t.dueAt} {...DATE} /> }} />
                    {' · '}
                    <FormattedMessage id="tests.questions" values={{ n: t.questionCount }} />
                  </p>
                </div>
                {t.isOwner ? (
                  <Link to={`/tests/${t.id}`} className="px-btn px-notch px-title !text-[13px] px-2.5 py-1.5 shrink-0" data-tone="paper">
                    <FormattedMessage id="tests.handedIn" values={{ done: t.submittedCount, total: t.memberCount }} />
                  </Link>
                ) : t.myResult ? (
                  <PixelButton tone="jade" onClick={() => onOpen(t.id)} className="!px-2.5 !py-1.5 !text-[15px] shrink-0 tabular-nums">
                    {t.myResult.score}/{t.myResult.total}
                  </PixelButton>
                ) : open(t) ? (
                  <PixelButton tone="gold" onClick={() => onOpen(t.id)} className="!px-2.5 !py-1.5 !text-[13px] shrink-0">
                    <FormattedMessage id={t.startedAt ? 'tests.continue' : 'tests.take'} />
                  </PixelButton>
                ) : (
                  <span className="px-title !text-[12px] text-[var(--px-bad)] shrink-0"><FormattedMessage id="tests.missed" /></span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** One test at a desk: taking it, or — once handed in — how it went. */
function Desk({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<{
    test: TestSummary;
    questions: TestQuestion[];
    checked: Check[];
    review: ReviewItem[] | null;
    leaderboard: Leader[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justDone, setJustDone] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchTest(id).then((d) => alive && setData(d), (err) => alive && setError((err as Error).message));
    return () => { alive = false; };
  }, [id]);

  return (
    <div className="space-y-3">
      <PixelButton tone="paper" onClick={onBack} className="!px-2.5 !py-1 !text-[13px]">
        <PixelIcon name="back" size={1} /> <FormattedMessage id="world.classBackToList" />
      </PixelButton>
      {error ? <p className="px-notch px-inset p-3 text-[var(--px-bad)]">{error}</p>
        : !data ? <PixelLoader label={<FormattedMessage id="world.classLoading" />} />
          : data.review
            ? <Review test={data.test} questions={data.questions} review={data.review} leaderboard={data.leaderboard} celebrate={justDone} />
            : (
              <Take
                test={data.test}
                questions={data.questions}
                initialChecked={data.checked}
                leaderboard={data.leaderboard}
                onStarted={(test, questions, checked) => setData({ ...data, test, questions, checked })}
                onDone={(test, review, leaderboard) => { setJustDone(true); setData({ ...data, test, review, leaderboard }); }}
              />
            )}
    </div>
  );
}

function Heading({ test }: { test: TestSummary }) {
  return (
    <div>
      <p className="px-title !text-[16px]">{test.title}</p>
      <p className="text-[12px] text-[var(--px-muted)]">
        {test.collectionName}
        {' · '}
        <FormattedMessage id="tests.due" values={{ date: <FormattedDate value={test.dueAt} {...DATE} /> }} />
        {' · '}
        <FormattedMessage id="tests.questions" values={{ n: test.questionCount }} />
      </p>
    </div>
  );
}

function Take({ test, questions, initialChecked, leaderboard, onStarted, onDone }: {
  test: TestSummary;
  questions: TestQuestion[];
  initialChecked: Check[];
  leaderboard: Leader[];
  onStarted: (test: TestSummary, questions: TestQuestion[], checked: Check[]) => void;
  onDone: (test: TestSummary, review: ReviewItem[], leaderboard: Leader[]) => void;
}) {
  const t = useTakeTest({ test, questions, initialChecked, onStarted, onDone });
  const [openedAt] = useState(() => Date.now());
  // Handing in with gaps asks once more, here rather than in a browser dialog.
  const [confirming, setConfirming] = useState(false);
  const { at, setAt } = t;

  if (Date.parse(test.dueAt) <= openedAt) {
    return (
      <>
        <Heading test={test} />
        <p className="px-notch px-inset p-3"><FormattedMessage id="tests.closedMissed" /></p>
      </>
    );
  }

  if (at < 0) {
    return (
      <>
        <Heading test={test} />
        <div className="px-notch px-inset p-3 space-y-2 text-[14px]">
          <p><FormattedMessage id="tests.intro" /></p>
          <p className="flex items-start gap-2 text-[12px] text-[var(--px-muted)]">
            <PixelIcon name="hourglass" size={1} /> <FormattedMessage id={test.startedAt ? 'tests.clockRunning' : 'tests.timedHint'} />
          </p>
          {t.instant && (
            <p className="flex items-start gap-2 text-[12px] text-[var(--px-muted)]">
              <PixelIcon name="bolt" size={1} /> <FormattedMessage id="tests.instantIntro" />
            </p>
          )}
        </div>
        <PixelButton tone="jade" block disabled={t.starting} onClick={() => void t.begin()}>
          <FormattedMessage id={t.starting ? 'tests.starting' : test.startedAt ? 'tests.continue' : 'tests.start'} />
        </PixelButton>
        <TopThree test={test} leaders={leaderboard} />
      </>
    );
  }

  if (at >= questions.length) {
    const missing = questions.length - t.answered;
    return (
      <>
        <Heading test={test} />
        <div className="px-notch px-inset p-3 space-y-3">
          <p className="px-title"><FormattedMessage id="tests.answeredOf" values={{ n: t.answered, total: questions.length }} /></p>
          {t.instant && <p className="text-[13px]"><FormattedMessage id="tests.rightSoFar" values={{ n: t.rightSoFar }} /></p>}
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, i) => {
              const mark = t.checked[q.id];
              const tone = mark ? (mark.correct ? 'good' : 'bad') : t.isAnswered(q.id) ? 'jade' : 'paper';
              return (
                <PixelButton key={q.id} tone={tone} onClick={() => { setConfirming(false); setAt(i); }} className="!w-9 !h-9 !p-0 !text-[14px] justify-center">
                  {i + 1}
                </PixelButton>
              );
            })}
          </div>
          <p className="text-[12px] text-[var(--px-muted)]"><FormattedMessage id="tests.onceOnly" /></p>
        </div>
        {confirming && missing > 0 && (
          <p className="px-notch px-inset p-3 text-[var(--px-bad)] text-[14px]"><FormattedMessage id="tests.confirmUnanswered" values={{ n: missing }} /></p>
        )}
        <PixelButton
          tone="jade"
          block
          disabled={t.sending}
          onClick={() => { if (missing > 0 && !confirming) setConfirming(true); else void t.handIn(); }}
        >
          <PixelIcon name="mail" size={2} /> <FormattedMessage id={t.sending ? 'tests.handingIn' : 'tests.handIn'} />
        </PixelButton>
      </>
    );
  }

  const q = questions[at];
  const prev = shownAnswer(t.answers[q.id]);
  const mark = t.checked[q.id];
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2.5 px-inset">
          <div className="h-full bg-[var(--px-gold)]" style={{ width: `${(at / questions.length) * 100}%` }} />
        </div>
        <span className="px-title !text-[12px] tabular-nums">{at + 1}/{questions.length}</span>
      </div>
      <div className={`px-notch px-inset p-3 ${mark && !mark.correct && t.fresh === q.id ? 'animate-shake' : ''}`}>
        <PixelQuestion question={q} cooldown={0} busy={t.checking || !!mark} onAnswer={(a) => void t.answer(q, a)} loadImage={t.loadImage} />
        {mark ? (
          <p className={`px-title mt-3 flex items-center gap-1.5 ${mark.correct ? 'text-[var(--px-good)]' : 'text-[var(--px-bad)]'}`}>
            <PixelIcon name={mark.correct ? 'check' : 'close'} size={2} />
            <FormattedMessage id={mark.correct ? 'tests.markRight' : 'tests.markWrong'} />
            {mark.correct && t.streakAt(at) > 1 && <span className="flex items-center gap-1"><PixelIcon name="flame" size={1} />{t.streakAt(at)}</span>}
            {!mark.correct && <span className="normal-case text-[var(--px-text)]"><FormattedMessage id="tests.theAnswerWas" values={{ answer: <b>{mark.answer}</b> }} /></span>}
          </p>
        ) : prev && !t.instant ? (
          <p className="mt-3 text-[12px] text-[var(--px-muted)]"><FormattedMessage id="tests.yourAnswer" values={{ answer: <b>{prev}</b> }} /></p>
        ) : null}
      </div>
      <div className="flex justify-between gap-2">
        <PixelButton tone="paper" disabled={at === 0} onClick={() => setAt(at - 1)} className="!text-[13px]">
          <FormattedMessage id="tests.previous" />
        </PixelButton>
        <PixelButton tone={mark ? 'jade' : 'paper'} onClick={() => setAt(at + 1)} className="!text-[13px]">
          <FormattedMessage id={mark ? (at + 1 < questions.length ? 'tests.next' : 'tests.finish') : prev ? 'tests.next' : 'tests.skip'} />
        </PixelButton>
      </div>
    </>
  );
}

function Review({ test, questions, review, leaderboard, celebrate }: {
  test: TestSummary;
  questions: TestQuestion[];
  review: ReviewItem[];
  leaderboard: Leader[];
  celebrate: boolean;
}) {
  const result = test.myResult;
  const revealed = review.some((r) => r.answer !== null);
  const byId = new Map(questions.map((q) => [q.id, q]));
  return (
    <>
      <Heading test={test} />
      {result && (
        <div className={`px-notch px-inset p-4 text-center ${celebrate ? 'px-in-up' : ''}`}>
          <p className="px-title !text-[12px] text-[var(--px-good)]"><FormattedMessage id="tests.yourScore" /></p>
          <p className="px-title !text-[36px] text-[var(--px-gold)] tabular-nums">{result.score}/{result.total}</p>
          {result.durationMs !== null && (
            <p className="text-[12px] text-[var(--px-muted)] flex items-center justify-center gap-1">
              <PixelIcon name="hourglass" size={1} /> <FormattedMessage id="tests.tookTime" values={{ time: formatDuration(result.durationMs) }} />
            </p>
          )}
        </div>
      )}
      <TopThree test={test} leaders={leaderboard} />
      {!revealed && <p className="text-[12px] text-[var(--px-muted)]"><FormattedMessage id="tests.answersAfterDue" /></p>}
      <ol className="space-y-1.5">
        {review.map((r, i) => {
          const q = byId.get(r.questionId);
          return (
            <li key={r.questionId} className="px-notch px-inset p-2.5 flex gap-2.5 text-[14px]">
              <span className={r.correct ? 'text-[var(--px-good)]' : 'text-[var(--px-bad)]'}><PixelIcon name={r.correct ? 'check' : 'close'} size={2} /></span>
              <div className="min-w-0">
                <p>
                  <span className="text-[var(--px-muted)]">{i + 1}. </span>
                  {q?.prompt || q?.slotPrompts?.join(' · ') || q?.say || q?.scrambled || <FormattedMessage id={`hunt.type.${q?.type ?? 'custom'}`} />}
                </p>
                <p className="text-[12px] text-[var(--px-muted)]">
                  <FormattedMessage id="tests.youSaid" values={{ answer: <b>{r.given || '—'}</b> }} />
                  {r.answer !== null && !r.correct && (
                    <> · <FormattedMessage id="tests.rightAnswer" values={{ answer: <b className="text-[var(--px-good)]">{r.answer}</b> }} /></>
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

/** The test's top three, when the teacher shows it. */
function TopThree({ test, leaders }: { test: TestSummary; leaders: Leader[] }) {
  if (!test.showLeaderboard) return null;
  return (
    <div className="px-notch px-inset p-3">
      <p className="px-title !text-[13px] text-[var(--px-gold)] flex items-center gap-1.5 mb-1.5"><PixelIcon name="star" size={1} /> <FormattedMessage id="tests.topThree" /></p>
      {leaders.length === 0
        ? <p className="text-[12px] text-[var(--px-muted)]"><FormattedMessage id="tests.topThreeEmpty" /></p>
        : (
          <ol className="space-y-1">
            {leaders.map((l, i) => (
              <li key={i} className={`flex items-center gap-2 text-[14px] ${l.isMe ? 'text-[var(--px-good)]' : ''}`}>
                <span className="px-title w-5">{i + 1}</span>
                <span className="flex-1 min-w-0 truncate">{l.name}{l.isMe && <> (<FormattedMessage id="tests.you" />)</>}</span>
                <span className="tabular-nums font-bold">{l.score}/{l.total}</span>
                {l.durationMs !== null && <span className="tabular-nums text-[12px] text-[var(--px-muted)]">{formatDuration(l.durationMs)}</span>}
              </li>
            ))}
          </ol>
        )}
    </div>
  );
}

// ── Class board ───────────────────────────────────────────────────────────

function ClassBoard({ userId }: { userId: string }) {
  const intl = useIntl();
  const { teams, activeTeamId, rows, myRank, scoring, loading, saving, error, ensureLoaded, selectTeam, setJoined, joinWithCode } = useTeams();
  const [code, setCode] = useState('');
  useEffect(() => { void ensureLoaded(); }, [ensureLoaded]);

  const team = teams.find((t) => t.id === activeTeamId) ?? null;
  const shownMe = rows.some((r) => r.user_id === userId);

  return (
    <div className="space-y-3">
      {teams.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {teams.map((t) => (
            <PixelChip key={t.id} on={t.id === activeTeamId} onClick={() => void selectTeam(t.id)}>{t.name}</PixelChip>
          ))}
        </div>
      )}
      {error && <p className="px-notch px-inset p-3 text-[var(--px-bad)]">{error}</p>}
      {team && !team.joined && (
        <div className="px-notch px-inset p-3 space-y-2">
          <p className="text-[13px]"><FormattedMessage id="teams.joinPrompt" /></p>
          <PixelButton tone="gold" disabled={saving} onClick={() => void setJoined(team.id, true)}>
            <FormattedMessage id={saving ? 'teams.joining' : 'teams.joinName'} values={{ name: team.name }} />
          </PixelButton>
        </div>
      )}
      {loading && !rows.length ? <PixelLoader label={<FormattedMessage id="teams.loadingBoard" />} /> : team && (
        <div className="px-notch px-inset p-3">
          <p className="px-title !text-[14px] text-[var(--px-gold)] flex items-center gap-1.5 mb-1">
            <PixelIcon name="chart" size={1} /> <FormattedMessage id="teams.teamLeaderboard" values={{ name: team.name }} />
          </p>
          {scoring && (
            <p className="text-[12px] text-[var(--px-muted)] mb-2">
              {scoring.windowDays !== null
                ? <FormattedMessage id="teams.rankedByWindow" values={{ days: scoring.windowDays }} />
                : <FormattedMessage id="teams.rankedByPeriod" />}
            </p>
          )}
          {!rows.length ? <p className="text-[13px]"><FormattedMessage id="teams.nobodyJoined" /></p> : (
            <ol className="space-y-1">
              {rows.map((r) => (
                <li key={r.user_id} className={`flex items-center gap-2 text-[14px] ${r.user_id === userId ? 'text-[var(--px-good)]' : ''}`}>
                  <span className="px-title w-7 tabular-nums">{r.rank}</span>
                  <span className="flex-1 min-w-0 truncate">
                    {r.display_name ?? intl.formatMessage({ id: 'teams.learner' })}
                    {r.user_id === userId && <> (<FormattedMessage id="teams.you" />)</>}
                  </span>
                  {r.streak > 0 && <span className="flex items-center gap-0.5 text-[12px] text-[var(--px-muted)] tabular-nums"><PixelIcon name="flame" size={1} />{r.streak}</span>}
                  <span className="tabular-nums font-bold">{r.score} <FormattedMessage id="teams.pts" /></span>
                </li>
              ))}
            </ol>
          )}
          {myRank !== null && !shownMe && (
            <p className="px-title !text-[13px] mt-2 text-[var(--px-good)]"><FormattedMessage id="teams.yourRank" values={{ rank: myRank }} /></p>
          )}
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); if (code.trim()) void joinWithCode(code.trim()).then((ok) => ok && setCode('')); }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={intl.formatMessage({ id: 'teams.inviteCode' })}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="px-inset px-notch flex-1 min-w-0 px-3 py-2 text-[15px] bg-transparent outline-none"
        />
        <PixelButton type="submit" tone="sky" disabled={saving || !code.trim()} className="!text-[13px]"><FormattedMessage id="teams.join" /></PixelButton>
      </form>
    </div>
  );
}
