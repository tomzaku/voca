import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '../hooks/useAuth';
import { fetchMyQuizzes, quizLink, type SharedQuiz } from '../lib/quizShare';

export function MyQuizzes() {
  const intl = useIntl();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [quizzes, setQuizzes] = useState<SharedQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (authLoading) return;
      if (!user) { setLoading(false); return; }
      try {
        const q = await fetchMyQuizzes();
        if (alive) setQuizzes(q);
      } catch (err) {
        toast.error((err as Error).message || intl.formatMessage({ id: 'quiz.mine.loadFailed' }));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user, authLoading]);

  const copy = async (id: string) => {
    try { await navigator.clipboard.writeText(quizLink(id)); toast.success(intl.formatMessage({ id: 'quiz.share.linkCopied' })); }
    catch { toast.error(intl.formatMessage({ id: 'quiz.share.copyFailed' })); }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
        <p className="text-sm text-text-muted"><FormattedMessage id="quiz.mine.loading" /></p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-display font-extrabold text-text-primary mb-2"><FormattedMessage id="quiz.mine.signInTitle" /></h1>
        <button onClick={signInWithGoogle} className="px-5 py-2.5 rounded-xl bg-accent-cyan text-bg-primary text-sm font-medium mt-2"><FormattedMessage id="quiz.share.signIn" /></button>
      </div>
    );
  }

  return (
    <div className="max-w-page mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-extrabold text-text-primary mb-1"><FormattedMessage id="quiz.setup.myQuizzes" /></h1>
      <p className="text-sm text-text-muted mb-6"><FormattedMessage id="quiz.mine.subtitle" /></p>

      {quizzes.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-4xl mb-3">🧩</div>
          <p className="text-sm text-text-muted mb-1"><FormattedMessage id="quiz.mine.empty" /></p>
          <p className="text-xs text-text-muted">
            <FormattedMessage
              id="quiz.mine.emptyHint"
              values={{
                link: (c) => <Link to="/history" className="text-accent-cyan hover:underline font-medium">{c}</Link>,
                b: (c) => <span className="font-bold">{c}</span>,
              }}
            />
          </p>
        </div>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {quizzes.map((q) => (
            <div key={q.id} className="rounded-xl border border-border bg-bg-card p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-text-primary truncate">{q.title || intl.formatMessage({ id: 'quiz.mine.untitled' })}</div>
                <div className="text-[11px] text-text-muted">
                  <FormattedMessage
                    id="quiz.mine.meta"
                    values={{
                      count: q.config.words.length,
                      date: intl.formatDate(q.createdAt, { month: 'short', day: 'numeric', year: 'numeric' }),
                      auth: q.requireAuth ? 'yes' : 'no',
                    }}
                  />
                </div>
              </div>
              <button onClick={() => copy(q.id)} className="w-9 h-9 rounded-lg flex items-center justify-center border border-border text-text-muted hover:text-accent-cyan hover:border-accent-cyan/30 transition-all" title={intl.formatMessage({ id: 'quiz.mine.copyStudentLink' })}>
                <Icon icon="lucide:copy" />
              </button>
              <Link to={`/quiz/${q.id}/results`} className="px-3 py-2 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-bold hover:bg-accent-cyan/20 transition-all whitespace-nowrap">
                <FormattedMessage id="quiz.mine.results" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
