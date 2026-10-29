import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { FormattedMessage, useIntl, type IntlShape } from 'react-intl';
import { useAuth } from '../hooks/useAuth';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { useProgressForWords } from '../hooks/useProgressQuery';
import { BUCKET_META, BUCKET_ORDER, progressLookup, wordBucket, type WordBucket } from '../lib/progress';
import { isDue, dueTime } from '../lib/spacedRepetition';
import type { WordProgress } from '../types';

// Bucket display order + styling, from the one table every screen shares — so
// a word reads as the same thing here, on the flash card and in History.
// Ordered as a progression, like the dashboard's bar. Every legend/row carries
// an icon and a text label, so state is never communicated by color alone.
const BUCKETS = BUCKET_ORDER.map((id) => ({ id, ...BUCKET_META[id] }));

/** "in 5m / in 3h / in 2d" or "now" for a future due time. */
function fmtDue(intl: IntlShape, dueAt: string, now: number): string {
  const ms = new Date(dueAt).getTime() - now;
  if (ms <= 0) return intl.formatMessage({ id: 'collections.dueNowShort' });
  if (ms < 3_600_000) return intl.formatRelativeTime(Math.max(1, Math.round(ms / 60_000)), 'minute', { style: 'narrow' });
  if (ms < 86_400_000) return intl.formatRelativeTime(Math.round(ms / 3_600_000), 'hour', { style: 'narrow' });
  return intl.formatRelativeTime(Math.round(ms / 86_400_000), 'day', { style: 'narrow' });
}

/** When the scheduler would next show a word, as a short human label. */
function nextShow(intl: IntlShape, bucket: WordBucket, p: WordProgress | undefined, now: number): string {
  if (bucket === 'dismissed') return intl.formatMessage({ id: 'collections.never' });
  if (bucket === 'mastered') return intl.formatMessage({ id: 'collections.graduated' });
  if (bucket === 'pending') return intl.formatMessage({ id: 'collections.anytime' });
  return p?.dueAt ? fmtDue(intl, p.dueAt, now) : intl.formatMessage({ id: 'collections.anytime' });
}

/** A struggling word already due — the one schedule worth flagging. */
const isOverdue = (bucket: WordBucket, p: WordProgress | undefined, now: number) =>
  bucket === 'difficult' && !!p?.dueAt && new Date(p.dueAt).getTime() <= now;

const MAX_ROWS = 200;

// Word-list filter tabs. "Known" = answered correctly (or graduated);
// "Unknown" = everything not known yet; "Mistaken" = any wrong answer ever.
type ListTab = 'all' | 'known' | 'unknown' | 'mistaken';

const isKnown = (p: WordProgress | undefined) => p?.status === 'known' || !!p?.mastered;

const TAB_FILTERS: { id: ListTab; labelId: string; match: (p: WordProgress | undefined) => boolean }[] = [
  { id: 'all',      labelId: 'collections.tabAll',      match: () => true },
  { id: 'known',    labelId: 'collections.tabKnown',    match: (p) => isKnown(p) },
  { id: 'unknown',  labelId: 'collections.tabUnknown',  match: (p) => !isKnown(p) },
  { id: 'mistaken', labelId: 'collections.tabMistaken', match: (p) => (p?.wrong ?? 0) > 0 },
];

interface Props {
  name: string;
  words: string[];
  onClose: () => void;
}

/**
 * Per-collection analytics popup: how many words are not started / struggling /
 * learning / mastered / skipped, plus a per-word list of what the scheduler
 * will show next and when.
 */
export function CollectionStats({ name, words, onClose }: Props) {
  const intl = useIntl();
  const { user } = useAuth();
  const localProgress = useVocabularyStore((s) => s.progress);
  const triageWord = useVocabularyStore((s) => s.triageWord);
  const now = Date.now();
  // Progress for this collection's words, asked for by name rather than
  // filtered out of a full local copy — so the panel is right even on a device
  // that hasn't finished syncing. The local map answers until it lands, and
  // stays the fallback if the call fails.
  const progress = useProgressForWords(words, localProgress);

  const { counts, rows, dueNow, answered, correctTotal, wrongTotal } = useMemo(() => {
    const prog = progressLookup(progress);
    const counts: Record<WordBucket, number> = { pending: 0, difficult: 0, learning: 0, mastered: 0, dismissed: 0 };
    const rows: { word: string; bucket: WordBucket; p: WordProgress | undefined }[] = [];
    let dueNow = 0;
    let answered = 0;
    let correctTotal = 0;
    let wrongTotal = 0;
    for (const word of words) {
      const p = prog(word);
      const bucket = wordBucket(p);
      counts[bucket]++;
      rows.push({ word, bucket, p });
      if (bucket !== 'dismissed' && isDue(p, now)) dueNow++;
      if (p?.status === 'known' || p?.status === 'skipped') answered++;
      correctTotal += p?.correct ?? 0;
      wrongTotal += p?.wrong ?? 0;
    }
    // Order like the scheduler thinks: struggling first (due soonest first),
    // then not-started, learning by due time, mastered, skipped last.
    const bucketRank: Record<WordBucket, number> = { difficult: 0, pending: 1, learning: 2, mastered: 3, dismissed: 4 };
    rows.sort((a, b) =>
      bucketRank[a.bucket] - bucketRank[b.bucket] || dueTime(a.p) - dueTime(b.p) || a.word.localeCompare(b.word),
    );
    return { counts, rows, dueNow, answered, correctTotal, wrongTotal };
  }, [progress, words, now]);

  const total = words.length;
  const shownBuckets = BUCKETS.filter((b) => counts[b.id] > 0);

  // ── Word-list filter ──
  const [tab, setTab] = useState<ListTab>('all');
  const tabCount = (t: (typeof TAB_FILTERS)[number]) => rows.filter((r) => t.match(r.p)).length;
  const filteredRows = rows.filter((r) => TAB_FILTERS.find((t) => t.id === tab)!.match(r.p));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-bg-card shadow-2xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="flex items-center gap-2 font-display font-bold text-text-primary truncate">
            <Icon icon="lucide:chart-pie" className="text-accent-purple shrink-0" />
            <span className="truncate">{name}</span>
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 shrink-0 rounded-full bg-bg-tertiary text-text-muted flex items-center justify-center hover:text-text-primary"
            title={intl.formatMessage({ id: 'collections.close' })}
          >
            <Icon icon="lucide:x" />
          </button>
        </div>
        <p className="text-xs text-text-muted mb-4">
          <FormattedMessage id="collections.statsSummary" values={{ count: total, answered }} />
          {dueNow > 0 && <> · <span className="font-bold text-accent-orange"><FormattedMessage id="collections.dueNowCount" values={{ count: dueNow }} /></span></>}
        </p>

        {/* ── Distribution meter (labels + counts carry the data; colors reinforce) ── */}
        {total > 0 && (
          <>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-bg-tertiary mb-2.5">
              {shownBuckets.map((b, i) => (
                <span key={b.id} className="flex h-full" style={{ width: `${(counts[b.id] / total) * 100}%` }}>
                  {i > 0 && <span className="w-0.5 h-full shrink-0" />}
                  <span className={`flex-1 h-full ${b.bar} ${b.id === 'dismissed' ? 'opacity-60' : ''}`} />
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-4">
              {BUCKETS.map((b) => (
                <div key={b.id} className="flex items-center gap-1.5 text-xs" title={intl.formatMessage({ id: b.hintId })}>
                  <Icon icon={b.icon} className={`${b.text} text-sm shrink-0`} />
                  <span className="text-text-secondary"><FormattedMessage id={b.labelId} /></span>
                  <span className={`ml-auto font-display font-extrabold ${b.text}`}>{counts[b.id]}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Lifetime answers across the collection ── */}
        {(correctTotal > 0 || wrongTotal > 0) && (
          <p className="text-xs text-text-muted mb-4">
            <FormattedMessage
              id="collections.allAnswers"
              values={{
                correct: correctTotal,
                wrong: wrongTotal,
                ok: (c) => <span className="font-bold text-accent-green">{c}</span>,
                bad: (c) => <span className="font-bold text-accent-red">{c}</span>,
              }}
            />
          </p>
        )}

        {/* ── Per-word schedule: what comes back and when ── */}
        <h4 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-2">
          <FormattedMessage id="collections.wordsNextReview" />
        </h4>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {TAB_FILTERS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all ${
                tab === t.id
                  ? 'border-accent-purple bg-accent-purple/10 text-accent-purple'
                  : 'border-border bg-bg-tertiary text-text-muted hover:text-text-primary'
              }`}
            >
              <FormattedMessage id={t.labelId} /> · {tabCount(t)}
            </button>
          ))}
        </div>
        <div className="divide-y divide-border/60 rounded-xl border border-border overflow-hidden">
          {filteredRows.length === 0 && (
            <p className="px-3 py-3 text-xs text-text-muted bg-bg-tertiary/40">
              <FormattedMessage id="collections.noWordsYet" />
            </p>
          )}
          {filteredRows.slice(0, MAX_ROWS).map(({ word, bucket, p }) => {
            const meta = BUCKETS.find((b) => b.id === bucket)!;
            return (
              <div key={word} className="flex items-center gap-2 px-3 py-2 text-sm bg-bg-tertiary/40">
                <span title={intl.formatMessage({ id: meta.labelId })} className="shrink-0 flex items-center">
                  <Icon icon={meta.icon} className={`${meta.text} text-sm`} />
                </span>
                <Link
                  to={`/?word=${encodeURIComponent(word)}`}
                  className="flex-1 min-w-0 truncate font-bold text-text-primary hover:text-accent-cyan hover:underline"
                  title={intl.formatMessage({ id: 'collections.openWord' }, { word })}
                >
                  {word}
                </Link>
                {((p?.correct ?? 0) > 0 || (p?.wrong ?? 0) > 0) && (
                  <span className="text-[11px] text-text-muted shrink-0" title={intl.formatMessage({ id: 'collections.correctWrongTitle' })}>
                    ✓{p?.correct ?? 0} ✗{p?.wrong ?? 0}
                  </span>
                )}
                <span className={`text-[11px] font-bold shrink-0 ${isOverdue(bucket, p, now) ? 'text-accent-orange' : 'text-text-muted'}`}>
                  {nextShow(intl, bucket, p, now)}
                </span>
                {/* Manual triage — one button, matching the word's state:
                    mastered words offer "Don't know" (bring it back), everything
                    else offers "Know it" (graduate it out of the random pick). */}
                {bucket === 'mastered' ? (
                  <button
                    onClick={() => triageWord(word, false, user?.id)}
                    title={intl.formatMessage({ id: 'collections.bringBackTitle' })}
                    className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-md border border-border bg-bg-tertiary text-text-muted hover:text-accent-red hover:border-accent-red/40 transition-all"
                  >
                    <FormattedMessage id="collections.dontKnow" />
                  </button>
                ) : (
                  <button
                    onClick={() => triageWord(word, true, user?.id)}
                    title={intl.formatMessage({ id: 'collections.knowItTitle' })}
                    className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-md border border-border bg-bg-tertiary text-text-muted hover:text-accent-green hover:border-accent-green/40 transition-all"
                  >
                    <FormattedMessage id="collections.knowIt" />
                  </button>
                )}
              </div>
            );
          })}
          {filteredRows.length > MAX_ROWS && (
            <p className="px-3 py-2 text-xs text-text-muted bg-bg-tertiary/40">
              <FormattedMessage id="collections.moreWords" values={{ count: filteredRows.length - MAX_ROWS }} />
            </p>
          )}
        </div>

        <p className="text-[11px] text-text-muted leading-relaxed mt-3">
          <FormattedMessage id="collections.schedulerExplainer" />
        </p>
      </div>
    </div>
  );
}
