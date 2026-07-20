import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { playSelect } from '../lib/sfx';
import {
  QUESTION_TYPES, QUESTION_TYPE_META, SECONDS_PER_WORD, makeQuizConfig,
  type QuestionType, type QuizConfig, type RevealMode,
} from '../lib/quizConfig';
import { createSharedQuiz, quizLink } from '../lib/quizShare';
import { useAuth } from '../hooks/useAuth';
import { QuizRunner } from './QuizRunner';

const MIN_WORDS = 2;

function fmtTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

interface Props {
  /** The word pool this quiz draws from (bookmarks, a collection, …). */
  words: string[];
  onBack: () => void;
  /** Feed live practice answers into the learner's SRS (collection practice). */
  recordProgress?: boolean;
}

export function QuizSetup({ words, onBack, recordProgress = false }: Props) {
  const { user } = useAuth();

  // ── Config (the settings) ──
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(words));
  const [qTypes, setQTypes] = useState<Set<QuestionType>>(() => new Set(QUESTION_TYPES));
  const [reveal, setReveal] = useState<RevealMode>('end');
  const [autoTime, setAutoTime] = useState(true);
  const [durationSec, setDurationSec] = useState(() => words.length * SECONDS_PER_WORD);

  // ── Run state ──
  const [runConfig, setRunConfig] = useState<QuizConfig | null>(null);
  const [runKey, setRunKey] = useState(0);

  // ── Share dialog ──
  const [shareOpen, setShareOpen] = useState(false);

  const toggle = (word: string) => {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else { next.add(word); playSelect(); }
      return next;
    });
  };

  const toggleType = (t: QuestionType) => {
    setQTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) { if (next.size > 1) next.delete(t); }
      else { next.add(t); playSelect(); }
      return next;
    });
  };

  useEffect(() => {
    if (autoTime) setDurationSec(chosen.size * SECONDS_PER_WORD);
  }, [autoTime, chosen]);

  const buildConfig = (): QuizConfig =>
    makeQuizConfig([...chosen], QUESTION_TYPES.filter((t) => qTypes.has(t)), reveal, durationSec);

  const start = () => {
    if (chosen.size < MIN_WORDS) return;
    setRunConfig(buildConfig());
  };

  // Playing / results — delegated to the shared engine.
  if (runConfig) {
    return (
      <QuizRunner
        key={runKey}
        config={runConfig}
        recordProgress={recordProgress}
        onExit={onBack}
        onPickWords={() => setRunConfig(null)}
        onReplay={() => setRunKey((k) => k + 1)}
        finishLabel="Back to list"
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-bg-card border border-border text-text-secondary flex items-center justify-center shrink-0 hover:text-text-primary transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-display font-extrabold text-2xl text-accent-cyan leading-none">Quiz</h1>
          <p className="text-xs text-text-muted font-bold mt-1">Set it up, then start or share</p>
        </div>
        <Link
          to="/quizzes"
          className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
          title="Quizzes you've shared"
        >
          <Icon icon="lucide:folder" className="text-sm" /> My quizzes
        </Link>
      </div>

      {/* ── Question types ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-display font-extrabold text-text-muted uppercase tracking-wider">Question types</h2>
          <span className="text-[11px] font-bold text-text-muted">
            {qTypes.size === QUESTION_TYPES.length ? 'Random mix' : `${qTypes.size} selected`}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {QUESTION_TYPES.map((t) => {
            const on = qTypes.has(t);
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`text-left px-3.5 py-2.5 rounded-xl border-2 transition-all ${
                  on ? 'bg-accent-cyan/10 border-accent-cyan text-text-primary' : 'bg-bg-card border-border text-text-muted hover:border-border-light'
                }`}
              >
                <div className="flex items-center gap-1.5 font-display font-extrabold text-sm">
                  <Icon icon={on ? 'solar:check-circle-bold' : 'lucide:circle'} className={on ? 'text-accent-cyan' : 'text-text-muted'} />
                  {QUESTION_TYPE_META[t].label}
                </div>
                <p className="text-[11px] text-text-muted mt-0.5 leading-tight">{QUESTION_TYPE_META[t].hint}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Show answers ── */}
      <div className="mb-6">
        <h2 className="text-xs font-display font-extrabold text-text-muted uppercase tracking-wider mb-2">Show answers</h2>
        <div className="grid grid-cols-2 gap-2">
          {([
            { v: 'end', label: 'At the end', hint: 'See every answer on the results screen' },
            { v: 'each', label: 'After each', hint: 'Instant right/wrong per question' },
          ] as { v: RevealMode; label: string; hint: string }[]).map((o) => {
            const on = reveal === o.v;
            return (
              <button
                key={o.v}
                onClick={() => setReveal(o.v)}
                className={`text-left px-3.5 py-2.5 rounded-xl border-2 transition-all ${
                  on ? 'bg-accent-cyan/10 border-accent-cyan text-text-primary' : 'bg-bg-card border-border text-text-muted hover:border-border-light'
                }`}
              >
                <div className="flex items-center gap-1.5 font-display font-extrabold text-sm">
                  <Icon icon={on ? 'solar:check-circle-bold' : 'lucide:circle'} className={on ? 'text-accent-cyan' : 'text-text-muted'} />
                  {o.label}
                </div>
                <p className="text-[11px] text-text-muted mt-0.5 leading-tight">{o.hint}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Time limit ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-display font-extrabold text-text-muted uppercase tracking-wider">Time limit</h2>
          <button
            onClick={() => setAutoTime(true)}
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all ${
              autoTime ? 'bg-accent-cyan/15 border-accent-cyan/30 text-accent-cyan' : 'bg-bg-card border-border text-text-muted hover:text-text-primary'
            }`}
            title={`Auto: ${SECONDS_PER_WORD}s per word`}
          >
            Auto · {SECONDS_PER_WORD}s/word
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={durationSec}
            onChange={(e) => { setAutoTime(false); setDurationSec(Math.max(0, Math.floor(Number(e.target.value) || 0))); }}
            className="w-28 bg-bg-card border-2 border-border rounded-xl px-3 py-2 text-text-primary font-code font-bold focus:outline-none focus:border-accent-cyan transition-colors"
          />
          <span className="text-sm text-text-muted font-bold">seconds</span>
          <span className="text-xs text-text-muted ml-auto">
            {durationSec === 0 ? 'No limit' : `≈ ${fmtTime(durationSec)} for ${chosen.size} word${chosen.size === 1 ? '' : 's'}`}
          </span>
        </div>
      </div>

      {/* ── Words ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-display font-extrabold text-text-muted uppercase tracking-wider">
          Words <span className="text-accent-cyan">{chosen.size}</span><span className="text-text-muted">/{words.length}</span>
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setChosen(new Set(words))} className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors">All</button>
          <span className="text-border">·</span>
          <button onClick={() => setChosen(new Set())} className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors">None</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {words.map((word) => {
          const on = chosen.has(word);
          return (
            <button
              key={word}
              onClick={() => toggle(word)}
              className={`px-3.5 py-2 rounded-full text-sm font-display font-extrabold border-2 transition-all hover:-translate-y-0.5 ${
                on ? 'bg-accent-cyan text-bg-primary border-accent-cyan' : 'bg-bg-card text-text-secondary border-border hover:border-border-light'
              }`}
            >
              {on && <Icon icon="solar:check-circle-bold" className="inline mr-1 -mt-0.5" />}
              {word}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          onClick={start}
          disabled={chosen.size < MIN_WORDS}
          className="flex-1 py-3.5 rounded-xl bg-accent-cyan text-bg-primary text-lg font-display font-extrabold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Start ({chosen.size})
        </button>
        <button
          onClick={() => setShareOpen(true)}
          disabled={chosen.size < MIN_WORDS}
          className="px-5 py-3.5 rounded-xl border-2 border-accent-cyan/40 text-accent-cyan text-sm font-display font-extrabold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-cyan/10 transition-all"
          title="Share this quiz as a test for students"
        >
          <Icon icon="lucide:share-2" className="text-lg" />
          Share
        </button>
      </div>
      {chosen.size < MIN_WORDS && (
        <p className="text-center text-xs text-text-muted mt-3">Pick at least {MIN_WORDS} words.</p>
      )}

      {shareOpen && (
        <ShareDialog config={buildConfig()} wordCount={chosen.size} signedIn={Boolean(user)} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}

/** Modal: turn the current config into a shareable, trackable quiz. */
function ShareDialog({ config, wordCount, signedIn, onClose }: {
  config: QuizConfig;
  wordCount: number;
  signedIn: boolean;
  onClose: () => void;
}) {
  const { signInWithGoogle } = useAuth();
  const [title, setTitle] = useState('');
  const [requireAuth, setRequireAuth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(null);

  const link = quizId ? quizLink(quizId) : '';

  const create = async () => {
    setBusy(true);
    try {
      const quiz = await createSharedQuiz(config, title.trim() || null, requireAuth);
      setQuizId(quiz.id);
    } catch (err) {
      toast.error((err as Error).message || 'Could not create the quiz.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast.success('Link copied'); }
    catch { toast.error('Could not copy'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-display font-extrabold text-text-primary">Share as a test</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors" aria-label="Close">
            <Icon icon="lucide:x" className="text-lg" />
          </button>
        </div>

        <div className="p-5">
          {!quizId ? (
            <>
              <p className="text-sm text-text-muted mb-4">
                {wordCount} words · answers {config.reveal === 'end' ? 'at the end' : 'after each'}
                {config.durationSec > 0 ? ` · ${fmtTime(config.durationSec)} limit` : ' · no time limit'}
              </p>

              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Unit 3 vocabulary"
                className="w-full bg-bg-tertiary border-2 border-border rounded-xl px-3 py-2 text-text-primary font-semibold focus:outline-none focus:border-accent-cyan transition-colors mb-4"
              />

              <label className="flex items-center gap-2.5 mb-5 cursor-pointer">
                <input type="checkbox" checked={requireAuth} onChange={(e) => setRequireAuth(e.target.checked)} className="w-4 h-4 accent-accent-cyan" />
                <span className="text-sm text-text-secondary font-medium">Require students to sign in</span>
              </label>

              {signedIn ? (
                <button onClick={create} disabled={busy} className="w-full py-3 rounded-xl bg-accent-cyan text-bg-primary font-display font-extrabold hover:opacity-90 transition-opacity disabled:opacity-50">
                  {busy ? 'Creating…' : 'Create shareable link'}
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-text-muted mb-3">Sign in to create a trackable quiz.</p>
                  <button onClick={signInWithGoogle} className="w-full py-3 rounded-xl bg-accent-cyan text-bg-primary font-display font-extrabold hover:opacity-90 transition-opacity">Sign in</button>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-accent-green mb-3">Quiz ready! Share this link:</p>
              <div className="flex gap-2 mb-4">
                <input readOnly value={link} className="flex-1 min-w-0 bg-bg-tertiary border-2 border-border rounded-xl px-3 py-2 text-text-primary text-sm font-code" />
                <button onClick={copy} className="px-4 rounded-xl bg-accent-cyan text-bg-primary font-display font-extrabold shrink-0" title="Copy link">
                  <Icon icon="lucide:copy" />
                </button>
              </div>
              <Link
                to={`/quiz/${quizId}/results`}
                className="block w-full py-3 rounded-xl border-2 border-border text-center text-text-secondary font-display font-extrabold hover:border-border-light hover:text-text-primary transition-all"
              >
                View results →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
