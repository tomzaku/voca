import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '../hooks/useAuth';
import { fetchSharedQuiz, fetchAttempts, quizLink, type SharedQuiz, type QuizAttempt } from '../lib/quizShare';
import { QuizReview, type Answer } from './QuizRunner';

function fmtTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function QuizResults() {
  const intl = useIntl();
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const [quiz, setQuiz] = useState<SharedQuiz | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id || authLoading) return;
      if (!user) { setLoading(false); return; }
      try {
        const [q, a] = await Promise.all([fetchSharedQuiz(id), fetchAttempts(id)]);
        if (!alive) return;
        setQuiz(q);
        setAttempts(a);
      } catch (err) {
        toast.error((err as Error).message || intl.formatMessage({ id: 'quiz.results.loadFailed' }));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, user, authLoading]);

  const copyLink = async () => {
    if (!id) return;
    try { await navigator.clipboard.writeText(quizLink(id)); toast.success(intl.formatMessage({ id: 'quiz.share.linkCopied' })); }
    catch { toast.error(intl.formatMessage({ id: 'quiz.share.copyFailed' })); }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
        <p className="text-sm text-text-muted"><FormattedMessage id="quiz.results.loading" /></p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-display font-extrabold text-text-primary mb-2"><FormattedMessage id="quiz.results.signInTitle" /></h1>
        <p className="text-sm text-text-muted mb-6"><FormattedMessage id="quiz.results.signInBody" /></p>
        <button onClick={signInWithGoogle} className="px-5 py-2.5 rounded-xl bg-accent-cyan text-bg-primary text-sm font-medium"><FormattedMessage id="quiz.share.signIn" /></button>
      </div>
    );
  }

  const isOwner = quiz && quiz.ownerId === user.id;
  const avg = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + (a.total ? a.score / a.total : 0), 0) / attempts.length * 100)
    : 0;

  return (
    <div className="max-w-page mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/quizzes" className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 mb-1">
            <Icon icon="lucide:chevron-left" /> <FormattedMessage id="quiz.setup.myQuizzes" />
          </Link>
          <h1 className="text-2xl font-display font-extrabold text-text-primary">{quiz?.title || intl.formatMessage({ id: 'quiz.results.defaultTitle' })}</h1>
        </div>
        <button onClick={copyLink} className="px-3 py-2 rounded-xl border border-border text-text-muted text-xs font-bold hover:text-text-primary hover:border-border-light transition-all flex items-center gap-1.5">
          <Icon icon="lucide:copy" /> <FormattedMessage id="quiz.share.copyLink" />
        </button>
      </div>

      {!isOwner && quiz && (
        <p className="text-sm text-text-muted mb-4"><FormattedMessage id="quiz.results.notOwner" /></p>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-bg-card p-4 text-center">
          <div className="text-2xl font-display font-extrabold text-accent-cyan">{attempts.length}</div>
          <div className="text-[11px] text-text-muted mt-0.5"><FormattedMessage id="quiz.results.attempts" /></div>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-4 text-center">
          <div className="text-2xl font-display font-extrabold text-accent-green">{intl.formatNumber(avg / 100, { style: 'percent' })}</div>
          <div className="text-[11px] text-text-muted mt-0.5"><FormattedMessage id="quiz.results.averageScore" /></div>
        </div>
      </div>

      {attempts.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-4xl mb-3">🫥</div>
          <p className="text-sm text-text-muted"><FormattedMessage id="quiz.results.empty" /></p>
        </div>
      ) : (
        <div className="space-y-2">
          {attempts.map((a) => {
            const pct = a.total ? Math.round((a.score / a.total) * 100) : 0;
            const isOpen = expanded === a.id;
            return (
              <div key={a.id} className="rounded-xl border border-border bg-bg-card overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : a.id)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-bg-tertiary transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-text-primary truncate">{a.studentName}</div>
                    <div className="text-[11px] text-text-muted">{intl.formatDate(a.createdAt, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {fmtTime(a.durationSec)}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-display font-extrabold ${pct >= 75 ? 'text-accent-green' : pct >= 50 ? 'text-accent-orange' : 'text-accent-red'}`}>
                      {a.score}/{a.total}
                    </div>
                    <div className="text-[11px] text-text-muted">{intl.formatNumber(pct / 100, { style: 'percent' })}</div>
                  </div>
                  <Icon icon="lucide:chevron-down" className={`text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-border pt-3 animate-fade-in">
                    <QuizReview answers={a.answers as Answer[]} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
