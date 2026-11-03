import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { FormattedDate, FormattedMessage } from 'react-intl';
import { listTests, type TestSummary } from '../../lib/testsApi';
import { isTestOpen, testTitle } from '../../lib/testLabels';

/**
 * A collection's tests. The owner sees each one's turnout and a button to
 * send a new one; a member sees what's waiting for them — a test still open
 * and not yet taken leads the list, highlighted, since that's the card they
 * came for. Read once on open: a test list doesn't change under you.
 */
export function CollectionTests({ collectionId, isOwner }: { collectionId: string; isOwner: boolean }) {
  const [tests, setTests] = useState<TestSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Open/closed is judged as of opening the page, not re-read on each render.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    listTests(collectionId).then((t) => alive && setTests(t), () => alive && setFailed(true));
    return () => { alive = false; };
  }, [collectionId]);

  // A member with nothing sent has no use for an empty box; the owner needs
  // it for the button.
  if (!isOwner && (failed || !tests?.length)) return null;

  const open = (t: TestSummary) => isTestOpen(t, now);
  // A built-in collection's tests are practice: no teacher, no deadline.
  const practice = !!tests?.length && tests.every((t) => t.practiceNumber != null);
  const todo = (t: TestSummary) => !t.isOwner && !t.myResult && open(t);
  const sorted = [...(tests ?? [])].sort((a, b) => Number(todo(b)) - Number(todo(a)));

  return (
    <section className="rounded-2xl border-[3px] border-border bg-bg-card p-5 sm:p-6 flex flex-col gap-4 self-start w-full">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-display font-bold text-text-primary">
          <Icon icon="lucide:clipboard-check" className="text-accent-green" />
          <FormattedMessage id={practice ? 'tests.practiceHeading' : 'tests.title'} />
        </h2>
        {isOwner && (
          <Link
            to={`/collections/${collectionId}/tests/new`}
            className="btn-3d px-3 py-1.5 text-xs font-bold bg-accent-green text-bg-primary flex items-center gap-1.5"
          >
            <Icon icon="lucide:plus" /> <FormattedMessage id="tests.new" />
          </Link>
        )}
      </div>

      {practice && <p className="text-xs text-text-muted leading-relaxed"><FormattedMessage id="tests.practiceHint" /></p>}

      {isOwner && tests?.length === 0 && (
        <p className="text-xs text-text-muted leading-relaxed"><FormattedMessage id="tests.emptyOwner" /></p>
      )}
      {failed && <p className="text-xs text-text-muted"><FormattedMessage id="tests.loadFailed" /></p>}

      <div className="flex flex-col gap-2">
        {sorted.map((t) => (
          <Link
            key={t.id}
            to={`/tests/${t.id}`}
            className={`flex items-center gap-3 rounded-xl p-3 border-2 transition-colors ${
              todo(t) ? 'border-accent-green bg-accent-green/10 hover:bg-accent-green/15' : 'border-border hover:border-accent-cyan/50'
            }`}
          >
            <Icon
              icon={t.myResult ? 'lucide:circle-check' : todo(t) ? 'lucide:pencil-line' : open(t) ? 'lucide:clock' : 'lucide:lock'}
              className={`text-xl shrink-0 ${t.myResult ? 'text-accent-green' : todo(t) ? 'text-accent-green' : 'text-text-muted'}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">{testTitle(t)}</p>
              <p className="text-xs text-text-muted">
                {t.dueAt === null ? <FormattedMessage id="tests.noDeadline" /> : (
                  <FormattedMessage
                    id={open(t) ? 'tests.due' : 'tests.closedOn'}
                    values={{ date: <FormattedDate value={t.dueAt} month="short" day="numeric" hour="numeric" minute="2-digit" /> }}
                  />
                )}
                {' · '}
                <FormattedMessage id="tests.questions" values={{ n: t.questionCount }} />
              </p>
            </div>
            <span className="shrink-0 text-xs font-bold">
              {t.isOwner ? (
                <span className="text-text-secondary">
                  <FormattedMessage id="tests.turnout" values={{ done: t.submittedCount, total: Math.max(t.memberCount, t.submittedCount) }} />
                </span>
              ) : t.myResult ? (
                <span className="text-accent-green">{t.myResult.score}/{t.myResult.total}</span>
              ) : todo(t) ? (
                <span className="text-accent-green"><FormattedMessage id="tests.take" /></span>
              ) : (
                <span className="text-text-muted"><FormattedMessage id="tests.missed" /></span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
