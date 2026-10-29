import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { playSelect } from '../lib/sfx';
import {
  MIN_QUIZ_WORDS, QUESTION_TYPES, QUESTION_TYPE_META, SECONDS_PER_WORD, makeQuizConfig,
  type QuestionType, type QuizConfig, type RevealMode,
} from '../lib/quizConfig';
import { createSharedQuiz, quizLink } from '../lib/quizShare';
import { progressLookup } from '../lib/progress';
import { sampleSmartWords } from '../lib/smartSample';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useAuth } from '../hooks/useAuth';
import { useGameWordPool } from '../hooks/useGameWordPool';
import { QuizRunner } from './QuizRunner';
import { FilterTabs } from './FilterTabs';

const MIN_WORDS = MIN_QUIZ_WORDS;

// Word chips shown before the list collapses behind a "Show more" button —
// a 900-word collection should not render a 900-chip wall.
const WORDS_SHOWN_STEP = 60;

// Most words `selectAll` preselects. The pool is already the batch there, but
// a month away can leave hundreds of reviews due, and at SECONDS_PER_WORD that
// is an hour-long quiz nobody finishes. The rest stay one "All" click away.
const MAX_PRESELECT = 30;

// Default for the Smart batch-size input: 30% of the pool, but never below
// MIN_WORDS. The user can type any size from MIN_WORDS up to the whole pool.
function smartCount(poolSize: number): number {
  return Math.max(MIN_WORDS, Math.ceil(poolSize * 0.3));
}

function fmtTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

interface Props {
  /** The word pool this quiz draws from (bookmarks, a collection, …). Omit to
   *  let the player pick their own list (Recent/Saved/Struggling/…) right
   *  here — History's inline row still passes its own filtered words. */
  words?: string[];
  onBack: () => void;
  /** Feed live practice answers into the learner's SRS (collection practice). */
  recordProgress?: boolean;
  /** The pool *is* the batch — preselect it (up to MAX_PRESELECT, in the order
   *  given) instead of smart-sampling a slice. For callers that already chose
   *  the words, like the review panel's due lists. */
  selectAll?: boolean;
}

/** Smart-sampled starting batch — shared between the initial pick and the
 *  reset that runs when a filter-picked pool changes underneath it. */
function initialBatch(words: string[], selectAll: boolean): string[] {
  return selectAll
    ? words.slice(0, MAX_PRESELECT)
    : sampleSmartWords(words, smartCount(words.length), progressLookup(useVocabularyStore.getState().progress));
}

export function QuizSetup({ words: explicitWords, onBack, recordProgress = false, selectAll = false }: Props) {
  const intl = useIntl();
  const { user } = useAuth();
  const explicit = explicitWords !== undefined;
  const pool = useGameWordPool('recent', !explicit);
  const words = explicit ? explicitWords! : pool.words;

  // ── Config (the settings) ──
  // Start with a smart batch selected (not the whole pool — a 900-word
  // collection should not default to a 900-question quiz).
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(initialBatch(words, selectAll)));
  const [qTypes, setQTypes] = useState<Set<QuestionType>>(() => new Set(QUESTION_TYPES));
  const [reveal, setReveal] = useState<RevealMode>('end');
  const [autoTime, setAutoTime] = useState(true);
  const [durationSec, setDurationSec] = useState(() => words.length * SECONDS_PER_WORD);
  // Smart select's batch-size input — declared here (not beside `applySmart`
  // below) so the pool-change reset effect can update it too.
  const [smartN, setSmartN] = useState(() => smartCount(words.length));

  // With no explicit list, the pool comes from a filter the player can change
  // right here — re-sample the batch whenever it does. Content-keyed (not the
  // array reference) so a caller re-render can't reset a mid-pick selection
  // under an explicit list.
  const wordsKey = words.join('|');
  useEffect(() => {
    if (explicit) return;
    setChosen(new Set(initialBatch(words, selectAll)));
    setSmartN(smartCount(words.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsKey, explicit]);

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
  const applySmart = (nRaw: number) => {
    const n = Math.max(MIN_WORDS, Math.min(words.length, nRaw || smartCount(words.length)));
    if (n !== smartN) setSmartN(n); // reflect the clamp back into the input
    const prog = progressLookup(useVocabularyStore.getState().progress);
    const picked = sampleSmartWords(words, n, prog);
    setChosen(new Set(picked));
    playSelect();
    if (picked.length < MIN_WORDS) {
      toast(intl.formatMessage({ id: 'quiz.setup.allCaughtUp' }));
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
        finishLabel={intl.formatMessage({ id: 'quiz.setup.backToList' })}
      />
    );
  }

  return (
    <div className="max-w-page mx-auto px-4 py-8 animate-fade-in">
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
          <h1 className="font-display font-extrabold text-2xl text-accent-cyan leading-none"><FormattedMessage id="quiz.setup.title" /></h1>
          <p className="text-xs text-text-muted font-bold mt-1"><FormattedMessage id="quiz.setup.subtitle" /></p>
        </div>
        <Link
          to="/quizzes"
          className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
          title={intl.formatMessage({ id: 'quiz.setup.myQuizzesTitle' })}
        >
          <Icon icon="lucide:folder" className="text-sm" /> <FormattedMessage id="quiz.setup.myQuizzes" />
        </Link>
      </div>

      {/* No explicit list from the caller — pick which words this quiz draws from. */}
      {!explicit && (
        <div className="mb-6">
          <FilterTabs active={pool.filter} counts={pool.counts} onSelect={pool.setFilter} />
        </div>
      )}

      {!explicit && pool.initialLoading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-sm text-text-muted">
          <div className="w-4 h-4 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
          <FormattedMessage id="quiz.setup.loadingWords" />
        </div>
      ) : (
      /* Desktop: settings rail on the left, word picker on the right. */
      <div className="lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-10 lg:items-start">
        <div>
          {/* ── Question types ── */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-display font-extrabold text-text-muted uppercase tracking-wider">{intl.formatMessage({ id: 'quiz.setup.questionTypes' })}</h2>
              <span className="text-[11px] font-bold text-text-muted">
                {qTypes.size === QUESTION_TYPES.length
                  ? intl.formatMessage({ id: 'quiz.setup.randomMix' })
                  : intl.formatMessage({ id: 'quiz.setup.typesSelected' }, { count: qTypes.size })}
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
                      {intl.formatMessage({ id: QUESTION_TYPE_META[t].labelId })}
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5 leading-tight">{intl.formatMessage({ id: QUESTION_TYPE_META[t].hintId })}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Show answers ── */}
          <div className="mb-6">
            <h2 className="text-xs font-display font-extrabold text-text-muted uppercase tracking-wider mb-2">{intl.formatMessage({ id: 'quiz.setup.showAnswers' })}</h2>
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: 'end', labelId: 'quiz.setup.revealEnd', hintId: 'quiz.setup.revealEndHint' },
                { v: 'each', labelId: 'quiz.setup.revealEach', hintId: 'quiz.setup.revealEachHint' },
              ] as { v: RevealMode; labelId: string; hintId: string }[]).map((o) => {
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
                      {intl.formatMessage({ id: o.labelId })}
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5 leading-tight">{intl.formatMessage({ id: o.hintId })}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Time limit ── */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-display font-extrabold text-text-muted uppercase tracking-wider">{intl.formatMessage({ id: 'quiz.setup.timeLimit' })}</h2>
              <button
                onClick={() => setAutoTime(true)}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                  autoTime ? 'bg-accent-cyan/15 border-accent-cyan/30 text-accent-cyan' : 'bg-bg-card border-border text-text-muted hover:text-text-primary'
                }`}
                title={intl.formatMessage({ id: 'quiz.setup.autoTitle' }, { sec: SECONDS_PER_WORD })}
              >
                <FormattedMessage id="quiz.setup.auto" values={{ sec: SECONDS_PER_WORD }} />
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
              <span className="text-sm text-text-muted font-bold"><FormattedMessage id="quiz.setup.seconds" /></span>
              <span className="text-xs text-text-muted ml-auto">
                {durationSec === 0
                  ? intl.formatMessage({ id: 'quiz.setup.noLimit' })
                  : intl.formatMessage({ id: 'quiz.setup.timeEstimate' }, { time: fmtTime(durationSec), count: chosen.size })}
              </span>
            </div>
          </div>
        </div>

        <div>
          {/* ── Words ── */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-display font-extrabold text-text-muted uppercase tracking-wider">
              <FormattedMessage id="quiz.setup.words" /> <span className="text-accent-cyan">{chosen.size}</span><span className="text-text-muted">/{words.length}</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={smartSelect}
                className="text-xs font-bold text-accent-cyan hover:opacity-80 transition-opacity flex items-center gap-1"
                title={intl.formatMessage({ id: 'quiz.setup.smartTitle' })}
              >
                <Icon icon="lucide:brain" className="text-sm" /> <FormattedMessage id="quiz.setup.smart" />
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
                title={intl.formatMessage({ id: 'quiz.setup.smartCountTitle' })}
                aria-label={intl.formatMessage({ id: 'quiz.setup.smartCountLabel' })}
              />
              <span className="text-border">·</span>
              <button onClick={() => setChosen(new Set(words))} className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors"><FormattedMessage id="quiz.setup.all" /></button>
              <span className="text-border">·</span>
              <button onClick={() => setChosen(new Set())} className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors"><FormattedMessage id="quiz.setup.none" /></button>
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
                  <FormattedMessage
                    id="quiz.setup.showMore"
                    values={{ more: Math.min(WORDS_SHOWN_STEP, words.length - shown), hidden: words.length - shown }}
                  />
                </button>
                <button
                  onClick={() => setShown(words.length)}
                  className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors"
                >
                  <FormattedMessage id="quiz.setup.showAll" />
                </button>
              </div>
              {(() => {
                const hiddenChosen = words.slice(shown).filter((w) => chosen.has(w)).length;
                return hiddenChosen > 0 && (
                  <span className="text-[11px] font-bold text-text-muted">
                    <FormattedMessage id="quiz.setup.hiddenSelected" values={{ count: hiddenChosen }} />
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
              <FormattedMessage id="quiz.setup.start" values={{ count: chosen.size }} />
            </button>
            <button
              onClick={() => setShareOpen(true)}
              disabled={chosen.size < MIN_WORDS}
              className="px-5 py-3.5 rounded-xl border-2 border-accent-cyan/40 text-accent-cyan text-sm font-display font-extrabold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-cyan/10 transition-all"
              title={intl.formatMessage({ id: 'quiz.setup.shareTitle' })}
            >
              <Icon icon="lucide:share-2" className="text-lg" />
              <FormattedMessage id="quiz.setup.share" />
            </button>
          </div>
          {chosen.size < MIN_WORDS && (
            <p className="text-center text-xs text-text-muted mt-3"><FormattedMessage id="quiz.setup.pickAtLeast" values={{ count: MIN_WORDS }} /></p>
          )}
        </div>
      </div>
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
  const intl = useIntl();
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
      toast.error((err as Error).message || intl.formatMessage({ id: 'quiz.share.createFailed' }));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast.success(intl.formatMessage({ id: 'quiz.share.linkCopied' })); }
    catch { toast.error(intl.formatMessage({ id: 'quiz.share.copyFailed' })); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-display font-extrabold text-text-primary"><FormattedMessage id="quiz.share.heading" /></h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors" aria-label={intl.formatMessage({ id: 'quiz.share.close' })}>
            <Icon icon="lucide:x" className="text-lg" />
          </button>
        </div>

        <div className="p-5">
          {!quizId ? (
            <>
              <p className="text-sm text-text-muted mb-4">
                <FormattedMessage
                  id="quiz.share.summary"
                  values={{
                    count: wordCount,
                    reveal: config.reveal,
                    timed: config.durationSec > 0 ? 'yes' : 'no',
                    time: fmtTime(config.durationSec),
                  }}
                />
              </p>

              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1"><FormattedMessage id="quiz.share.titleLabel" /></label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={intl.formatMessage({ id: 'quiz.share.titlePlaceholder' })}
                className="w-full bg-bg-tertiary border-2 border-border rounded-xl px-3 py-2 text-text-primary font-semibold focus:outline-none focus:border-accent-cyan transition-colors mb-4"
              />

              <label className="flex items-center gap-2.5 mb-5 cursor-pointer">
                <input type="checkbox" checked={requireAuth} onChange={(e) => setRequireAuth(e.target.checked)} className="w-4 h-4 accent-accent-cyan" />
                <span className="text-sm text-text-secondary font-medium"><FormattedMessage id="quiz.share.requireAuth" /></span>
              </label>

              {signedIn ? (
                <button onClick={create} disabled={busy} className="w-full py-3 rounded-xl bg-accent-cyan text-bg-primary font-display font-extrabold hover:opacity-90 transition-opacity disabled:opacity-50">
                  <FormattedMessage id={busy ? 'quiz.share.creating' : 'quiz.share.create'} />
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-text-muted mb-3"><FormattedMessage id="quiz.share.signInPrompt" /></p>
                  <button onClick={signInWithGoogle} className="w-full py-3 rounded-xl bg-accent-cyan text-bg-primary font-display font-extrabold hover:opacity-90 transition-opacity"><FormattedMessage id="quiz.share.signIn" /></button>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-accent-green mb-3"><FormattedMessage id="quiz.share.ready" /></p>
              <div className="flex gap-2 mb-4">
                <input readOnly value={link} className="flex-1 min-w-0 bg-bg-tertiary border-2 border-border rounded-xl px-3 py-2 text-text-primary text-sm font-code" />
                <button onClick={copy} className="px-4 rounded-xl bg-accent-cyan text-bg-primary font-display font-extrabold shrink-0" title={intl.formatMessage({ id: 'quiz.share.copyLink' })}>
                  <Icon icon="lucide:copy" />
                </button>
              </div>
              <Link
                to={`/quiz/${quizId}/results`}
                className="block w-full py-3 rounded-xl border-2 border-border text-center text-text-secondary font-display font-extrabold hover:border-border-light hover:text-text-primary transition-all"
              >
                <FormattedMessage id="quiz.share.viewResults" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
