import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { fetchMyQuizzes, quizLink, type SharedQuiz } from '../lib/quizShare';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function MyQuizzes() {
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
        toast.error((err as Error).message || 'Could not load your quizzes');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user, authLoading]);

  const copy = async (id: string) => {
    try { await navigator.clipboard.writeText(quizLink(id)); toast.success('Link copied'); }
    catch { toast.error('Could not copy'); }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-display font-extrabold text-text-primary mb-2">Sign in to see your quizzes</h1>
        <button onClick={signInWithGoogle} className="px-5 py-2.5 rounded-xl bg-accent-cyan text-bg-primary text-sm font-medium mt-2">Sign in</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-extrabold text-text-primary mb-1">My quizzes</h1>
      <p className="text-sm text-text-muted mb-6">Quizzes you've shared. Open one to track who took it.</p>

      {quizzes.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-4xl mb-3">🧩</div>
          <p className="text-sm text-text-muted mb-1">You haven't shared any quizzes yet.</p>
          <p className="text-xs text-text-muted">
            Go to <Link to="/bookmarks" className="text-accent-cyan hover:underline font-medium">History → Quiz</Link>, set it up, and hit <span className="font-bold">Share</span>.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {quizzes.map((q) => (
            <div key={q.id} className="rounded-xl border border-border bg-bg-card p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-text-primary truncate">{q.title || 'Untitled quiz'}</div>
                <div className="text-[11px] text-text-muted">
                  {q.config.words.length} words · {fmtDate(q.createdAt)}{q.requireAuth ? ' · sign-in required' : ''}
                </div>
              </div>
              <button onClick={() => copy(q.id)} className="w-9 h-9 rounded-lg flex items-center justify-center border border-border text-text-muted hover:text-accent-cyan hover:border-accent-cyan/30 transition-all" title="Copy student link">
                <Icon icon="lucide:copy" />
              </button>
              <Link to={`/quiz/${q.id}/results`} className="px-3 py-2 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-xs font-bold hover:bg-accent-cyan/20 transition-all whitespace-nowrap">
                Results
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
