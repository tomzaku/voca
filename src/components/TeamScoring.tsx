// A team's scoring period: the note everyone sees, and the controls its owner
// gets to move it.
//
// Both exist because the score is DERIVED rather than accumulated — the server
// recomputes it from each learner's review log against the team's period every
// time a board is read. So "put everyone back to zero" is a date change, it's
// exact, and undoing it restores every score to the point. Nothing here edits
// anyone's progress, which the panel says out loud: a button labelled "reset
// scores" reads like it might.

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl, type IntlShape } from 'react-intl';
import { useTeams } from '../hooks/useTeams';
import type { Scoring, Team } from '../lib/teamsApi';

const DAY_MS = 86_400_000;

function shortDate(intl: IntlShape, iso: string): string {
  return intl.formatDate(iso, { day: 'numeric', month: 'short' });
}

/** Whole days from now until `iso`, rounded up — 0 means it lands today. */
function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS));
}

/** "3 days left" — the only part of a deadline anyone reads. */
function remaining(intl: IntlShape, iso: string): string {
  const d = daysUntil(iso);
  return d === 0
    ? intl.formatMessage({ id: 'teams.endsToday' })
    : intl.formatMessage({ id: 'teams.daysLeft' }, { count: d });
}

/** `<input type="date">` gives a local YYYY-MM-DD; a period ends at the end of it. */
function endOfLocalDay(value: string): string {
  return new Date(`${value}T23:59:59`).toISOString();
}

function todayPlus(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toLocaleDateString('sv');
}

/**
 * What period the board on screen covers, for everyone on it — not just the
 * owner who set it. Silent on the rolling default, which the score tooltip
 * already explains; a line saying "the last 30 days" over every board is noise.
 */
export function PeriodNote({ scoring }: { scoring: Scoring }) {
  const intl = useIntl();
  if (scoring.state === 'rolling') return null;

  const closed = scoring.state === 'closed';
  const text = closed
    ? intl.formatMessage({ id: 'teams.periodClosed' }, { date: shortDate(intl, scoring.until!) })
    : scoring.state === 'upcoming'
    ? intl.formatMessage({ id: 'teams.periodUpcoming' }, { date: shortDate(intl, scoring.since) })
    : scoring.until
    ? intl.formatMessage({ id: 'teams.periodChallenge' }, {
        date: shortDate(intl, scoring.until),
        remaining: remaining(intl, scoring.until),
      })
    : intl.formatMessage({ id: 'teams.periodSince' }, { date: shortDate(intl, scoring.since) });

  return (
    <p
      className={`flex items-center gap-1.5 text-[11px] font-bold ${
        closed ? 'text-text-muted' : 'text-accent-cyan'
      }`}
    >
      <Icon icon={closed ? 'lucide:flag' : 'lucide:timer'} className="shrink-0" />
      {text}
    </p>
  );
}

/**
 * The owner's controls. Collapsed by default, like the invite panel above it:
 * a period is set once and then looked at, so it shouldn't push the standings
 * down the page.
 */
export function ScoringPanel({ team }: { team: Team }) {
  const intl = useIntl();
  const setScoring = useTeams((s) => s.setScoring);
  const saving = useTeams((s) => s.saving);
  const [open, setOpen] = useState(false);
  // Null = not asking anything. Otherwise the reset that's one confirmation
  // away, held as the thing it will do rather than as a "mode".
  const [pending, setPending] = useState<'now' | 'challenge' | 'rolling' | null>(null);
  const [endsOn, setEndsOn] = useState(() => todayPlus(7));

  const apply = async (kind: 'now' | 'challenge' | 'rolling') => {
    const now = new Date().toISOString();
    const ok = await setScoring(
      team.id,
      kind === 'rolling'
        ? {}
        : kind === 'now'
        ? { since: now }
        : { since: now, until: endOfLocalDay(endsOn) },
    );
    if (ok) setPending(null);
  };

  const summary = team.scoredUntil
    ? intl.formatMessage({ id: 'teams.summaryChallenge' }, { date: shortDate(intl, team.scoredUntil) })
    : team.scoredSince
    ? intl.formatMessage({ id: 'teams.summarySince' }, { date: shortDate(intl, team.scoredSince) })
    : intl.formatMessage({ id: 'teams.summaryRolling' });

  return (
    <div className="rounded-xl bg-bg-tertiary/50 px-4 py-3 flex flex-col gap-2">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-[11px] font-bold text-text-secondary hover:text-text-primary cursor-pointer"
      >
        <Icon
          icon="lucide:chevron-right"
          className={`transition-transform ${open ? 'rotate-90' : ''}`}
        />
        <FormattedMessage id="teams.scoringPeriod" />
        <span className="font-normal text-text-muted">· {summary}</span>
      </button>

      {open && (
        <>
          <p className="text-[11px] text-text-muted leading-relaxed">
            <FormattedMessage id="teams.scoringExplainer" />
          </p>

          {pending === null && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setPending('now')}
                className="btn-3d px-3 py-1.5 text-[11px] font-bold bg-bg-tertiary text-text-secondary"
              >
                <Icon icon="lucide:rotate-ccw" className="inline -mt-0.5 mr-1" />
                <FormattedMessage id="teams.resetToZero" />
              </button>
              <button
                onClick={() => setPending('challenge')}
                className="btn-3d px-3 py-1.5 text-[11px] font-bold bg-bg-tertiary text-text-secondary"
              >
                <Icon icon="lucide:flag" className="inline -mt-0.5 mr-1" />
                <FormattedMessage id="teams.runChallenge" />
              </button>
              {(team.scoredSince || team.scoredUntil) && (
                <button
                  onClick={() => setPending('rolling')}
                  className="btn-3d px-3 py-1.5 text-[11px] font-bold bg-bg-tertiary text-text-secondary"
                >
                  <FormattedMessage id="teams.backToRolling" />
                </button>
              )}
            </div>
          )}

          {/* A challenge needs a date before it can be confirmed, so it asks for
              one in the same place it asks whether to go ahead. */}
          {pending === 'challenge' && (
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[11px] font-bold text-text-secondary">
                <FormattedMessage id="teams.endsAfter" />
                <input
                  type="date"
                  value={endsOn}
                  min={todayPlus(1)}
                  max={todayPlus(365)}
                  onChange={(e) => setEndsOn(e.target.value)}
                  className="rounded-lg bg-bg-card border border-border px-2 py-1 text-[11px] text-text-primary"
                />
              </label>
              <p className="text-[11px] text-text-muted">
                <FormattedMessage id="teams.challengeHint" />
              </p>
            </div>
          )}

          {pending !== null && (
            <p className="text-[11px] text-text-secondary">
              {pending === 'rolling'
                ? intl.formatMessage({ id: 'teams.confirmRolling' })
                : pending === 'now'
                ? intl.formatMessage({ id: 'teams.confirmReset' }, { count: team.memberCount })
                : ''}{' '}
              <button
                onClick={() => apply(pending)}
                disabled={saving || (pending === 'challenge' && !endsOn)}
                className="font-bold text-accent-red hover:underline cursor-pointer disabled:opacity-50"
              >
                <FormattedMessage id={saving ? 'teams.working' : 'teams.doIt'} />
              </button>
              {' · '}
              <button
                onClick={() => setPending(null)}
                className="font-bold text-text-muted hover:underline cursor-pointer"
              >
                <FormattedMessage id="teams.cancel" />
              </button>
            </p>
          )}
        </>
      )}
    </div>
  );
}
