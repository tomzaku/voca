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
import { progressLookup } from '../lib/progress';
import { sampleSmartWords } from '../lib/smartSample';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useAuth } from '../hooks/useAuth';
import { QuizRunner } from './QuizRunner';

const MIN_WORDS = 2;

// Word chips shown before the list collapses behind a "Show more" button —
// a 900-word collection should not render a 900-chip wall.
const WORDS_SHOWN_STEP = 60;

// Default for the Smart batch-size input: 30% of the pool, but never below
// MIN_WORDS. The user can type any size from MIN_WORDS up to the whole pool.
function smartCount(poolSize: number): number {
  return Math.max(MIN_WORDS, Math.ceil(poolSize * 0.3));
}

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
  // Start with a smart batch selected (not the whole pool — a 900-word
  // collection should not default to a 900-question quiz).
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(
    sampleSmartWords(words, smartCount(words.length), progressLookup(useVocabularyStore.getState().progress)),
  ));
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

  // Smart select — a batch picked with the Learn rotation: a 50/50 mix of
  // difficult and never-answered words, then due reviews. The input beside
  // the button sets the batch size and applies as you type (no submit needed
  // on mobile); the Smart button reshuffles.
  const [smartN, setSmartN] = useState(() => smartCount(words.length));
  const applySmart = (nRaw: number) => {
    const n = Math.max(MIN_WORDS, Math.min(words.length, nRaw || smartCount(words.length)));
    if (n !== smartN) setSmartN(n); // reflect the clamp back into the input
    const prog = progressLookup(useVocabularyStore.getState().progress);
    const picked = sampleSmartWords(words, n, prog);
    setChosen(new Set(picked));
    playSelect();
    if (picked.length < MIN_WORDS) {
      toast('You’re all caught up — no words need practice right now.');
    }
  };
  const smartSelect = () => applySmart(smartN);

  // How many word chips are rendered — grows via "Show more" / "Show all".
  const [shown, setShown] = useState(WORDS_SHOWN_STEP);

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
        <div className="flex items-center gap-2">
          <button
            onClick={smartSelect}
            className="text-xs font-bold text-accent-cyan hover:opacity-80 transition-opacity flex items-center gap-1"
            title="Pick words like the Learn page: difficult and new first, then due reviews. Click again to reshuffle."
          >
            <Icon icon="lucide:brain" className="text-sm" /> Smart
          </button>
          <input
            type="number"
            min={MIN_WORDS}
            max={words.length}
            value={smartN || ''}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSmartN(v);
              // Apply as you type once the value is usable; out-of-range
              // values wait for blur/Enter so clamping doesn't fight typing.
              if (v >= MIN_WORDS && v <= words.length) applySmart(v);
            }}
            onBlur={() => {
              // In-range values already applied on change; only rescue
              // out-of-range ones here (clamp + apply).
              if (smartN < MIN_WORDS || smartN > words.length) applySmart(smartN);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') smartSelect(); }}
            className="w-12 px-1.5 py-0.5 rounded-md bg-bg-card border border-border text-xs font-bold text-text-primary text-center focus:outline-none focus:border-accent-cyan/50 transition-colors"
            title="How many words Smart picks"
            aria-label="Smart batch size"
          />
          <span className="text-border">·</span>
          <button onClick={() => setChosen(new Set(words))} className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors">All</button>
          <span className="text-border">·</span>
          <button onClick={() => setChosen(new Set())} className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors">None</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {words.slice(0, shown).map((word) => {
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

      {words.length > shown && (
        <div className="flex flex-col items-center gap-1.5 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShown((n) => n + WORDS_SHOWN_STEP)}
              className="px-4 py-2 rounded-full text-xs font-bold bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-border-light transition-colors"
            >
              Show {Math.min(WORDS_SHOWN_STEP, words.length - shown)} more · {words.length - shown} hidden
            </button>
            <button
              onClick={() => setShown(words.length)}
              className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors"
            >
              Show all
            </button>
          </div>
          {(() => {
            const hiddenChosen = words.slice(shown).filter((w) => chosen.has(w)).length;
            return hiddenChosen > 0 && (
              <span className="text-[11px] font-bold text-text-muted">
                {hiddenChosen} selected word{hiddenChosen === 1 ? '' : 's'} in the hidden part
              </span>
            );
          })()}
        </div>
      )}
      {words.length <= shown && <div className="mb-3" />}

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
