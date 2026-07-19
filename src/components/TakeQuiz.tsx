import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { fetchSharedQuiz, recordAttempt, type SharedQuiz } from '../lib/quizShare';
import { QUESTION_TYPE_META } from '../lib/quizConfig';
import { QuizRunner, type QuizResult } from './QuizRunner';

function accountName(user: { user_metadata?: Record<string, unknown>; email?: string } | null): string {
  if (!user) return '';
  const meta = user.user_metadata ?? {};
  return (meta.full_name as string) || (meta.name as string) || user.email || 'Student';
}

export function TakeQuiz() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();

  const [quiz, setQuiz] = useState<SharedQuiz | null>(null);
  const [stage, setStage] = useState<'loading' | 'intro' | 'taking' | 'notfound'>('loading');
  const [name, setName] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) { setStage('notfound'); return; }
      try {
        const q = await fetchSharedQuiz(id);
        if (!alive) return;
        if (!q) { setStage('notfound'); return; }
        setQuiz(q);
        setStage('intro');
      } catch {
        if (alive) setStage('notfound');
      }
    })();
    return () => { alive = false; };
  }, [id]);

  // Keep the name field in step with the signed-in account.
  useEffect(() => {
    if (user) setName(accountName(user));
  }, [user]);

  if (stage === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
        <p className="text-sm text-text-muted">Loading quiz…</p>
      </div>
    );
  }

  if (stage === 'notfound' || !quiz) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-xl font-display font-extrabold text-text-primary mb-2">Quiz not found</h1>
        <p className="text-sm text-text-muted mb-6">This link may be broken or the quiz was removed.</p>
        <button onClick={() => navigate('/')} className="px-5 py-2.5 rounded-xl bg-accent-cyan text-bg-primary text-sm font-medium">Go home</button>
      </div>
    );
  }

  const needAuth = quiz.requireAuth && !user;

  const handleFinish = async (r: QuizResult) => {
    try {
      await recordAttempt({
        quizId: quiz.id,
        studentId: user?.id ?? null,
        studentName: name.trim() || 'Anonymous',
        score: r.score,
        total: r.total,
        answers: r.answers,
        durationSec: r.durationSec,
      });
      toast.success('Your answers were submitted');
    } catch (err) {
      toast.error((err as Error).message || 'Could not submit your answers');
    }
  };

  if (stage === 'taking') {
    return (
      <QuizRunner
        config={quiz.config}
        preloadedData={quiz.wordData}
        onExit={() => navigate('/')}
        onFinish={handleFinish}
        finishLabel="Done"
      />
    );
  }

  // ── Intro ──
  const cfg = quiz.config;
  const typeLabels = cfg.types.map((t) => QUESTION_TYPE_META[t].label).join(' · ');
  const canStart = !needAuth && name.trim().length > 0;

  return (
    <div className="max-w-md mx-auto px-4 py-12 animate-fade-in">
      <div className="rounded-2xl border border-border bg-bg-card p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📝</div>
          <h1 className="text-xl font-display font-extrabold text-text-primary">{quiz.title || 'Vocabulary quiz'}</h1>
          <p className="text-xs text-text-muted mt-1">
            {cfg.words.length} words · {typeLabels}
            {cfg.durationSec > 0 && ` · ${Math.round(cfg.durationSec / 60) || 1} min`}
          </p>
        </div>

        {needAuth ? (
          <div className="text-center">
            <p className="text-sm text-text-secondary mb-4">This quiz requires you to sign in first.</p>
            <button onClick={signInWithGoogle} className="w-full py-3 rounded-xl bg-accent-cyan text-bg-primary font-display font-extrabold hover:opacity-90 transition-opacity">Sign in</button>
          </div>
        ) : (
          <>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={Boolean(user)}
              placeholder="Enter your name"
              className="w-full bg-bg-tertiary border-2 border-border rounded-xl px-3 py-2.5 text-text-primary font-semibold focus:outline-none focus:border-accent-cyan transition-colors mb-1 disabled:opacity-70"
            />
            {user && <p className="text-[11px] text-text-muted mb-4">Signed in — your attempt is recorded to your account.</p>}
            {!user && <p className="text-[11px] text-text-muted mb-4">Your name is shown to the teacher with your results.</p>}

            <button
              onClick={() => setStage('taking')}
              disabled={!canStart}
              className="w-full py-3.5 rounded-xl bg-accent-cyan text-bg-primary text-lg font-display font-extrabold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              <Icon icon="lucide:play" className="text-lg" />
              Start quiz
            </button>
          </>
        )}
      </div>
    </div>
  );
}
