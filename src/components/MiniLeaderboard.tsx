// The learner's own line from the team board, small enough to sit on top of the
// buddy card while they're studying.
//
// It shows only their place and their score — the standings themselves are a
// page of other people's data, and belong on the dashboard. What it adds over
// that page is timing: answering a word correctly raises the score, and this is
// on screen at the moment it does, so the rise gets counted up rather than
// silently appearing the next time the board is opened.

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTeams } from '../hooks/useTeams';

/** Podium colours, matching the full board's medals. */
const PODIUM = ['text-accent-yellow', 'text-text-secondary', 'text-accent-orange'];

const COUNT_MS = 900;

/**
 * A number that rolls up to its new value instead of jumping. Only rises are
 * animated — a score dropping out of the rolling window isn't a moment worth
 * drawing the eye to, and it snaps. Honours reduced-motion.
 */
function useCountUp(value: number): number {
  const [shown, setShown] = useState(value);
  // What's on screen right now, so a roll interrupted by a second answer picks
  // up from the number the learner can see rather than restarting.
  const shownRef = useRef(value);

  useEffect(() => {
    const from = shownRef.current;
    if (from === value) return;
    const reduce =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || value < from) {
      shownRef.current = value;
      const snap = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(snap);
    }

    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / COUNT_MS, 1);
      // Ease out, so the last few points land slowly enough to read.
      const eased = 1 - (1 - t) ** 3;
      shownRef.current = Math.round(from + (value - from) * eased);
      setShown(shownRef.current);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return shown;
}

export function MiniLeaderboard() {
  const { user } = useAuth();
  const me = useTeams((s) => s.me);
  const myRank = useTeams((s) => s.myRank);
  const teams = useTeams((s) => s.teams);
  const activeTeamId = useTeams((s) => s.activeTeamId);
  const scoreGain = useTeams((s) => s.scoreGain);
  const gainId = useTeams((s) => s.gainId);
  const loading = useTeams((s) => s.loading);
  const ensureLoaded = useTeams((s) => s.ensureLoaded);

  // The board isn't loaded by studying — this is often the first thing on the
  // page that wants it, so it asks for it (once).
  useEffect(() => {
    if (user) void ensureLoaded();
  }, [user, ensureLoaded]);

  // The flair belongs to a gain that happens while this is on screen. The
  // store's `scoreGain` stands until the next refresh, which outlasts the
  // animation by a long way — so a gain counts as spent once its float has
  // played, and one that pre-dates this mount starts out spent. Otherwise the
  // celebration replays every time the learner comes back to the card.
  const [spentGainId, setSpentGainId] = useState(gainId);
  const gain = gainId === spentGainId ? 0 : scoreGain;

  const team = teams.find((t) => t.id === activeTeamId) ?? null;
  const score = me?.score ?? null;
  const shown = useCountUp(score ?? 0);

  // Signed out, or the board hasn't arrived: nothing to say, and a placeholder
  // rank would be worse than no strip at all.
  if (!user || !team) return null;

  const rank = me?.rank ?? myRank;
  const medal = rank !== null && rank <= 3 ? PODIUM[rank - 1] : null;

  // Membership is read off the team rather than off `me`, which arrives one
  // request later — otherwise the invitation to join flashes up at someone who
  // joined long ago.
  if (!team.joined) {
    return (
      <Link
        to="/dashboard#leaderboard"
        className="flex items-center gap-2 px-4 py-2 border-b-2 border-border text-[11px] font-bold text-text-muted hover:text-accent-cyan transition-colors"
      >
        <Icon icon="lucide:trophy" className="text-accent-yellow shrink-0" />
        <span className="truncate">Join the {team.name.toLowerCase()} leaderboard</span>
        <Icon icon="lucide:chevron-right" className="ml-auto shrink-0" />
      </Link>
    );
  }

  // Joined, but the standings for it are still on their way.
  if (rank === null && loading) return null;

  return (
    <Link
      to="/dashboard#leaderboard"
      title={`Your place on the ${team.name} leaderboard`}
      className="flex items-center gap-2 px-4 py-2 border-b-2 border-border hover:bg-bg-tertiary/40 transition-colors"
    >
      {/* Place. The key re-mounts the pill on every gain so the pop replays —
          the rank often doesn't change, and the pulse is what says "that
          counted" even when the number in it stays put. */}
      <span
        key={`rank-${gainId}`}
        className={`flex items-center gap-1 shrink-0 font-display font-extrabold tabular-nums ${
          gain > 0 ? 'animate-tile-pop' : ''
        } ${medal ?? 'text-text-secondary'}`}
      >
        <Icon icon="lucide:trophy" className={medal ? 'text-base' : 'text-base text-accent-yellow'} />
        <span className="text-sm">{rank !== null ? `#${rank}` : '—'}</span>
      </span>

      <span className="min-w-0 flex-1 text-[10px] text-text-muted truncate">
        {team.name} · {team.memberCount} learner{team.memberCount === 1 ? '' : 's'}
      </span>

      {/* Score, with the gain floating off it. `relative` on the wrapper keeps
          the float anchored here rather than to the card. Absent only against a
          server too old to send it, where the place alone still stands. */}
      {score !== null && (
        <span className="relative shrink-0 flex items-baseline gap-1">
          <span
            key={`score-${gainId}`}
            className={`font-display font-extrabold tabular-nums text-accent-green ${
              gain > 0 ? 'animate-tile-pop' : ''
            }`}
          >
            {shown}
          </span>
          <span className="text-[10px] text-text-muted">pts</span>
          {gain > 0 && (
            <span
              key={`gain-${gainId}`}
              onAnimationEnd={() => setSpentGainId(gainId)}
              className="absolute -top-3 right-0 text-[11px] font-display font-bold text-accent-green animate-float-up whitespace-nowrap pointer-events-none"
            >
              +{gain}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
