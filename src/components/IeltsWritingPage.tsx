import { useEffect, useRef, useState, useCallback } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import TextareaAutosize from 'react-textarea-autosize';
import { useAuth } from '../hooks/useAuth';
import { useIsPro } from '../hooks/useProStatus';
import { callAiAction } from '../lib/aiProviders';
import { ApiError } from '../lib/api';
import { randomIeltsWritingQuestion, type IeltsWritingQuestion, type IeltsTask } from '../data/ieltsWriting';
import { IELTS_CATEGORY_TIPS, IELTS_TASK_TIPS } from '../data/ieltsWritingTips';
import { listIeltsSubmissions, saveIeltsSubmission, type IeltsSubmission } from '../lib/ieltsSubmissionsApi';
import { parseIeltsScoreResult, type IeltsScoreResult } from '../lib/ieltsScoreResult';
import { IeltsChart } from './IeltsChart';

const MAX_ESSAY = 8000;

const TASK_META: Record<IeltsTask, { label: string; short: string }> = {
  1: { label: 'Task 1 — Report', short: 'Task 1' },
  2: { label: 'Task 2 — Essay', short: 'Task 2' },
};

/** Band-score colour, banded to match how examiners talk about scores. */
function bandColorClass(band: number): string {
  if (band >= 7) return 'text-accent-green';
  if (band >= 5.5) return 'text-accent-yellow';
  return 'text-accent-red';
}

function BandChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-bg-tertiary/50 p-2.5 text-center">
      <div className={`text-xl font-display font-bold tabular-nums ${bandColorClass(value)}`}>{value.toFixed(1)}</div>
      <div className="text-[10px] font-bold text-text-muted uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}

/**
 * IELTS Writing practice (band scoring is Pro): pull a random Task 1 or
 * Task 2 prompt from the static bank (src/data/ieltsWriting.ts — same
 * client-bundled-content posture as IELTS Speaking/Dialogue/Podcast, not a
 * table, not user-created), write a response, and get it scored like an
 * examiner would — one band per criterion, plus overall.
 */
export function IeltsWritingPage() {
  const { user } = useAuth();
  const { isPro, loading: proLoading } = useIsPro();
  const locked = !proLoading && !isPro;

  const [taskFilter, setTaskFilter] = useState<IeltsTask | undefined>(undefined);
  const [question, setQuestion] = useState<IeltsWritingQuestion | null>(() => randomIeltsWritingQuestion());

  const [essay, setEssay] = useState('');
  const [result, setResult] = useState<IeltsScoreResult | null>(null);
  const [scoring, setScoring] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [history, setHistory] = useState<IeltsSubmission[]>([]);
  const [showTips, setShowTips] = useState(false);
  const [showSample, setShowSample] = useState(false);

  const loadQuestion = useCallback((task?: IeltsTask) => {
    setEssay('');
    setResult(null);
    setShowTips(false);
    setShowSample(false);
    setQuestion(randomIeltsWritingQuestion(task));
  }, []);

  useEffect(() => { loadQuestion(taskFilter); }, [loadQuestion, taskFilter]);
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!user || !isPro) { setHistory([]); return; }
    void listIeltsSubmissions(undefined, 5).then((page) => setHistory(page.submissions));
  }, [user, isPro, result]);

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;

  const handleScore = async () => {
    if (locked) {
      toast(
        user ? 'IELTS band scoring is a Pro feature.' : 'Sign in with a Pro account to get a band score.',
        { icon: '👑' },
      );
      return;
    }
    if (!question) return;
    if (wordCount < 20) { toast.error('Write a bit more before asking for a score.'); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setScoring(true);
    setResult(null);
    try {
      const text = await callAiAction(
        'ielts_writing',
        {
          task: question.task,
          prompt: question.prompt,
          dataDescription: question.dataDescription ?? undefined,
          essay: essay.trim(),
        },
        { signal: controller.signal },
      );
      const parsed = parseIeltsScoreResult(text);
      if (!parsed) { toast.error("Couldn't read the examiner's response. Try again."); return; }
      setResult(parsed);
      try {
        await saveIeltsSubmission({ questionId: question.id, essay: essay.trim(), ...parsed });
      } catch {
        toast('Scored, but saving to your history failed.', { icon: '⚠️' });
      }
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else if ((err as Error).name !== 'AbortError') toast.error('Could not reach the AI. Try again.');
    } finally {
      setScoring(false);
    }
  };

  return (
    <div>
      <p className="text-sm text-text-muted mb-5">
        Practice IELTS Writing Task 1 (a report) or Task 2 (an essay) against a real prompt, then get
        an examiner-style band score. <span className="font-bold text-text-secondary">Band scoring is a Pro feature</span> —
        drafting is free for everyone.
      </p>

      {/* ── Task filter ── */}
      <div className="flex items-center gap-1.5 mb-4">
        {([undefined, 1, 2] as const).map((t) => {
          const active = taskFilter === t;
          return (
            <button
              key={t ?? 'any'}
              onClick={() => setTaskFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                active
                  ? 'border-accent-cyan bg-accent-cyan/15 text-accent-cyan'
                  : 'border-border bg-bg-card text-text-secondary hover:border-border-light'
              }`}
            >
              {t === undefined ? 'Either task' : TASK_META[t].short}
            </button>
          );
        })}
        <button
          onClick={() => loadQuestion(taskFilter)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-border bg-bg-card text-text-secondary hover:border-border-light transition-all"
        >
          <Icon icon="lucide:shuffle" /> New question
        </button>
      </div>

      {/* ── Prompt ── */}
      {!question ? null : (
        <div className="card-game border-accent-cyan p-4 sm:p-5 mb-4 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan uppercase tracking-wider">
              {TASK_META[question.task].label}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted uppercase tracking-wider">
              {question.category.replace(/-/g, ' ')}
            </span>
            <span className="text-[11px] text-text-muted ml-auto">
              ≥{question.minWords} words · {question.timeMinutes} min
            </span>
          </div>
          <p className="text-base text-text-primary leading-relaxed">{question.prompt}</p>
          {question.chartData && (
            <div className="mt-1 p-3 rounded-lg bg-bg-tertiary/60 border border-border">
              <IeltsChart data={question.chartData} />
            </div>
          )}
          {question.dataDescription && (
            <div className={question.chartData ? '' : 'mt-1 p-3 rounded-lg bg-bg-tertiary/60 border border-border'}>
              {!question.chartData && (
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Data described</p>
              )}
              <p className="text-sm text-text-secondary leading-relaxed">{question.dataDescription}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tips / model answer toggles ── */}
      {question && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setShowTips((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              showTips
                ? 'border-accent-purple bg-accent-purple/15 text-accent-purple'
                : 'border-border bg-bg-card text-text-secondary hover:border-border-light'
            }`}
          >
            <Icon icon="lucide:lightbulb" /> Tips for a higher band
          </button>
          <button
            onClick={() => setShowSample((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              showSample
                ? 'border-accent-purple bg-accent-purple/15 text-accent-purple'
                : 'border-border bg-bg-card text-text-secondary hover:border-border-light'
            }`}
          >
            <Icon icon="lucide:file-text" /> Model answer
          </button>
        </div>
      )}

      {question && showTips && (
        <div className="card-game border-accent-purple p-4 mb-4 space-y-3 animate-fade-in">
          <div>
            <p className="text-xs font-bold text-accent-purple uppercase tracking-wider mb-1.5">
              {TASK_META[question.task].label}
            </p>
            <ul className="space-y-1">
              {IELTS_TASK_TIPS[question.task].map((tip, i) => (
                <li key={i} className="text-sm text-text-secondary flex items-start gap-1.5">
                  <span className="text-accent-purple mt-0.5">•</span> {tip}
                </li>
              ))}
            </ul>
          </div>
          {IELTS_CATEGORY_TIPS[question.category] && (
            <div>
              <p className="text-xs font-bold text-accent-purple uppercase tracking-wider mb-1.5 capitalize">
                {question.category.replace(/-/g, ' ')} structure
              </p>
              <ul className="space-y-1">
                {IELTS_CATEGORY_TIPS[question.category].structure.map((tip, i) => (
                  <li key={i} className="text-sm text-text-secondary flex items-start gap-1.5">
                    <span className="text-accent-purple mt-0.5">•</span> {tip}
                  </li>
                ))}
              </ul>
              <p className="text-xs font-bold text-accent-purple uppercase tracking-wider mb-1.5 mt-3">Useful phrases</p>
              <div className="flex flex-wrap gap-1.5">
                {IELTS_CATEGORY_TIPS[question.category].phrases.map((phrase, i) => (
                  <span key={i} className="px-2 py-1 rounded-lg bg-bg-tertiary/60 border border-border text-xs text-text-secondary italic">
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {question && showSample && (
        <div className="card-game border-accent-purple p-4 mb-4 animate-fade-in">
          <p className="text-xs font-bold text-accent-purple uppercase tracking-wider mb-2">Model answer</p>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{question.sampleAnswer}</p>
        </div>
      )}

      {/* ── Essay ── */}
      <div className="card-game border-accent-cyan p-3 sm:p-4 mb-4">
        <TextareaAutosize
          value={essay}
          onChange={(e) => setEssay(e.target.value.slice(0, MAX_ESSAY))}
          placeholder="Write your response here…"
          minRows={6}
          maxRows={30}
          disabled={!question}
          className="w-full bg-transparent border-2 border-border rounded-xl px-4 py-3.5 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/60 resize-none leading-relaxed disabled:opacity-60"
        />
        <div className="flex items-center justify-between mt-2.5">
          <span className={`text-xs font-bold ${question && wordCount < question.minWords ? 'text-accent-orange' : 'text-text-muted'}`}>
            {wordCount} word{wordCount === 1 ? '' : 's'}{question ? ` (aim for ${question.minWords}+)` : ''}
          </span>
          <button
            onClick={handleScore}
            disabled={scoring || !question || wordCount < 20}
            className="btn-3d px-5 py-2.5 text-base bg-accent-cyan text-bg-primary font-bold disabled:opacity-60 flex items-center gap-2"
          >
            {scoring ? (
              <>
                <Icon icon="lucide:loader-2" className="animate-spin" /> Scoring…
              </>
            ) : (
              <>
                <Icon icon="lucide:award" /> Get my band score
                {locked && (
                  <span className="text-[9px] px-1 py-px rounded bg-bg-primary/20 font-extrabold uppercase tracking-wider">
                    Pro
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Result ── */}
      {result && (
        <section className="space-y-4 mb-6 animate-fade-in">
          <div className="card-game border-accent-green p-4 sm:p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center shrink-0">
                <div className={`text-4xl font-display font-bold tabular-nums ${bandColorClass(result.bandOverall)}`}>
                  {result.bandOverall.toFixed(1)}
                </div>
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Overall band</div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{result.summary}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <BandChip label={question?.task === 1 ? 'Task Achv.' : 'Task Resp.'} value={result.bandTask} />
              <BandChip label="Coherence" value={result.bandCoherence} />
              <BandChip label="Lexical" value={result.bandLexical} />
              <BandChip label="Grammar" value={result.bandGrammar} />
            </div>

            {result.strengths.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold text-accent-green uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Icon icon="lucide:thumbs-up" /> Strengths
                </p>
                <ul className="space-y-1">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-text-secondary flex items-start gap-1.5">
                      <span className="text-accent-green mt-0.5">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.improvements.length > 0 && (
              <div>
                <p className="text-xs font-bold text-accent-orange uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Icon icon="lucide:target" /> To improve
                </p>
                <ul className="space-y-1">
                  {result.improvements.map((s, i) => (
                    <li key={i} className="text-sm text-text-secondary flex items-start gap-1.5">
                      <span className="text-accent-orange mt-0.5">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Recent scores ── */}
      {history.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Recent scores</h2>
          <div className="flex flex-wrap gap-2">
            {history.map((s) => (
              <div
                key={s.id}
                title={new Date(s.createdAt).toLocaleString()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-bg-card"
              >
                <span className={`text-sm font-display font-bold tabular-nums ${bandColorClass(s.bandOverall)}`}>
                  {s.bandOverall.toFixed(1)}
                </span>
                <span className="text-[11px] text-text-muted">{s.wordCount}w</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
