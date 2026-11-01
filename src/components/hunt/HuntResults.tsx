import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { fetchResults, type Results } from '../../lib/huntsApi';
import { TEAM_COLOR } from './teams';

/**
 * How the class did, question by question and student by student — read
 * from every answer the hunt recorded. The hardest questions come first, each
 * with the wrong answers given most: that's what a teacher teaches from next.
 *
 * Read once when it opens and again on request, or when the race ends — not
 * on the board's every poll, since it reads every answer of the hunt.
 */
export function HuntResults({ huntId, over }: { huntId: string; over: boolean }) {
  const intl = useIntl();
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setResults(await fetchResults(huntId));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [huntId]);

  useEffect(() => { void load(); }, [load, over]);

  const pct = (correct: number, attempts: number) => (attempts ? Math.round((correct / attempts) * 100) : null);
  // Hardest first: lowest share right, then most attempted. Unanswered last.
  const questions = [...(results?.questions ?? [])].sort((a, b) => {
    const pa = pct(a.correct, a.attempts);
    const pb = pct(b.correct, b.attempts);
    if (pa === null || pb === null) return pa === null ? (pb === null ? 0 : 1) : -1;
    return pa - pb || b.attempts - a.attempts;
  });

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted"><FormattedMessage id="hunt.results.title" /></h2>
        <button onClick={() => void load()} disabled={busy} className="text-xs font-bold text-accent-cyan flex items-center gap-1 disabled:opacity-40">
          <Icon icon="lucide:refresh-cw" className={busy ? 'animate-spin' : ''} /> <FormattedMessage id="hunt.results.refresh" />
        </button>
      </div>

      {error && <p className="text-sm text-accent-red">{error}</p>}
      {!results ? (
        !error && <p className="text-sm text-text-muted"><FormattedMessage id="hunt.results.loading" /></p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted">
                  <th className="py-1.5 pr-2 font-bold"><FormattedMessage id="hunt.results.question" /></th>
                  <th className="py-1.5 pr-2 font-bold whitespace-nowrap"><FormattedMessage id="hunt.results.right" /></th>
                  <th className="py-1.5 font-bold"><FormattedMessage id="hunt.results.commonWrong" /></th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => {
                  const p = pct(q.correct, q.attempts);
                  return (
                    <tr key={q.id} className="border-t border-border align-top">
                      <td className="py-2 pr-2">
                        <span className="text-[11px] font-bold text-accent-cyan mr-1.5"><FormattedMessage id={`hunt.typeName.${q.type}`} /></span>
                        <span className="text-text-primary">{q.prompt || intl.formatMessage({ id: `hunt.type.${q.type}` })}</span>
                        <span className="block text-xs text-accent-green font-bold mt-0.5">✓ {q.answer}</span>
                      </td>
                      <td className="py-2 pr-2 whitespace-nowrap">
                        {p === null ? (
                          <span className="text-text-muted">—</span>
                        ) : (
                          <span className={`font-bold ${p < 50 ? 'text-accent-red' : p < 80 ? 'text-accent-orange' : 'text-accent-green'}`}>
                            {p}% <span className="text-xs font-normal text-text-muted">({q.correct}/{q.attempts})</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-text-secondary">
                        {q.wrong.length
                          ? q.wrong.map((w) => <span key={w.given} className="inline-block mr-2">“{w.given}” <span className="text-xs text-text-muted">×{w.count}</span></span>)
                          : <span className="text-text-muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-border align-top">
                  <td className="py-2 pr-2">
                    <span className="text-[11px] font-bold text-accent-yellow mr-1.5"><FormattedMessage id="hunt.results.treasure" /></span>
                    <span className="block text-xs text-accent-green font-bold mt-0.5">✓ {results.hunt.treasure}</span>
                  </td>
                  <td className="py-2 pr-2 whitespace-nowrap font-bold text-text-primary">
                    {results.treasure.attempts ? `${results.treasure.correct}/${results.treasure.attempts}` : '—'}
                  </td>
                  <td className="py-2 text-text-secondary">
                    {results.treasure.wrong.map((w) => <span key={w.given} className="inline-block mr-2">“{w.given}” <span className="text-xs text-text-muted">×{w.count}</span></span>)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2"><FormattedMessage id="hunt.results.students" /></h3>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {results.players.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg bg-bg-tertiary px-3 py-1.5 text-sm">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TEAM_COLOR[p.team] }} />
                  <span className="flex-1 truncate text-text-primary font-bold">{p.name}</span>
                  <span className="text-text-muted text-xs">
                    <FormattedMessage id="hunt.results.studentLine" values={{ correct: p.correct, attempts: p.attempts }} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
