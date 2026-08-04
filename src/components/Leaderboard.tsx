// Team leaderboards, shown on the dashboard.
//
// Opt-in in both directions: a learner who hasn't joined a team sees its board
// but is not on it, and "Leave" takes them off again. The join button spells
// out exactly what becomes visible to the others, because a progress number
// tied to a real name and avatar is not something to share by accident.
//
// The team picker only appears once there's more than one team to pick — today
// Global is the only one, and a lone tab is just noise.

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useIsPro } from '../hooks/useProStatus';
import { useTeams, type BoardRow, type Scoring } from '../hooks/useTeams';
import { TeamForm } from './TeamForm';
import { InvitePanel, TeamJoinDialog } from './TeamInvite';

/** Medal colours for the podium; everyone else gets a plain number. */
const PODIUM = ['text-accent-yellow', 'text-text-secondary', 'text-accent-orange'];

/**
 * What the score means, written from the server's own weights (they ride along
 * with every board) so this can never describe a formula that isn't the one
 * being used. A rank with no explanation is the first thing anyone asks about.
 */
function ScoreHelp({ scoring }: { scoring: Scoring }) {
  const { windowDays, points } = scoring;
  const plural = (n: number) => `${n} point${n === 1 ? '' : 's'}`;

  return (
    <div className="rounded-xl bg-bg-tertiary/50 p-4 text-[11px] text-text-secondary leading-relaxed">
      <p className="font-bold text-text-primary mb-2">
        Your score covers the last {windowDays} days
      </p>
      <ul className="flex flex-col gap-1">
        <li>
          <b>{plural(points.correctDay)}</b> for each word you answer correctly — once per word per
          day, so drilling one word all afternoon counts once.
        </li>
        <li>
          <b>{plural(points.mastered)}</b> for each word that reaches Mastered.
        </li>
        <li>
          <b>{plural(points.streakDay)}</b> for every day of your current streak.
        </li>
      </ul>
      <p className="mt-2 text-text-muted">
        Older activity drops out of the window, so a place on the board has to be held — it isn't a
        lifetime total. Your numbers update when you open this page.
      </p>
    </div>
  );
}

function Avatar({ row }: { row: BoardRow }) {
  const name = row.display_name || 'Learner';
  return (
    <span className="w-9 h-9 shrink-0 rounded-full overflow-hidden flex items-center justify-center bg-bg-tertiary">
      {row.avatar_url ? (
        <img src={row.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-[11px] font-extrabold text-accent-purple">
          {name[0]?.toUpperCase() ?? '?'}
        </span>
      )}
    </span>
  );
}

function Row({ row, isMe }: { row: BoardRow; isMe: boolean }) {
  const medal = row.rank <= 3 ? PODIUM[row.rank - 1] : null;
  return (
    <li
      className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
        isMe ? 'bg-accent-cyan/10 ring-1 ring-accent-cyan/40' : ''
      }`}
    >
      <span
        className={`w-7 shrink-0 flex items-center justify-center font-display font-extrabold tabular-nums ${
          medal ?? 'text-text-muted text-sm'
        }`}
      >
        {medal ? <Icon icon="lucide:medal" className="text-xl" /> : row.rank}
      </span>
      <Avatar row={row} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-text-primary truncate">
          {row.display_name || 'Learner'}
          {isMe && <span className="ml-1.5 text-[11px] font-bold text-accent-cyan">you</span>}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-text-muted">
          <Icon icon="lucide:flame" className="text-accent-orange" />
          <span className="tabular-nums">{row.streak}</span>
          <span>day streak · best {row.longest}</span>
        </span>
      </span>
      {/* The score is what the order is built on, so it's the number that gets
          the weight; the lifetime word count sits under it as context. */}
      <span className="shrink-0 text-right">
        <span className="block font-display font-extrabold tabular-nums text-accent-green">
          {row.score}
        </span>
        <span className="block text-[10px] text-text-muted tabular-nums">
          {row.learned} word{row.learned === 1 ? '' : 's'}
        </span>
      </span>
    </li>
  );
}

export function Leaderboard() {
  const { user } = useAuth();
  const teams = useTeams((s) => s.teams);
  const activeTeamId = useTeams((s) => s.activeTeamId);
  const rows = useTeams((s) => s.rows);
  const loading = useTeams((s) => s.loading);
  const saving = useTeams((s) => s.saving);
  const error = useTeams((s) => s.error);
  const myRank = useTeams((s) => s.myRank);
  const scoring = useTeams((s) => s.scoring);
  const load = useTeams((s) => s.load);
  const selectTeam = useTeams((s) => s.selectTeam);
  const setJoined = useTeams((s) => s.setJoined);
  const { isPro } = useIsPro();
  const [showHelp, setShowHelp] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  // An invite link lands here as ?team=<code>. The board sits well below the
  // fold, so the invite opens as a dialog rather than waiting to be scrolled
  // to — but it still only offers to join, never joins on sight: arriving at a
  // page that has already signed you up to share your progress is not
  // something to do silently.
  const [searchParams, setSearchParams] = useSearchParams();
  const invitedCode = searchParams.get('team') ?? '';
  const [manualOpen, setManualOpen] = useState(false);
  // Derived rather than mirrored into state: the URL is what says an invite is
  // open, so closing means taking the code out of it.
  const joining = manualOpen ? '' : invitedCode || null;

  const closeJoin = () => {
    setManualOpen(false);
    // Drop the code so a refresh (or a back-navigation) doesn't reopen an
    // invite the user just dismissed or accepted.
    if (invitedCode) {
      const next = new URLSearchParams(searchParams);
      next.delete('team');
      setSearchParams(next, { replace: true });
    }
  };

  const team = teams.find((t) => t.id === activeTeamId) ?? null;

  const header = (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-display font-bold text-text-primary">
        <Icon icon="lucide:globe" className="text-accent-cyan" />
        {teams.length > 1 ? 'Leaderboards' : `${team?.name ?? 'Global'} leaderboard`}
        {scoring && (
          <button
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            aria-label="How the score is worked out"
            className="w-5 h-5 shrink-0 rounded-full bg-bg-tertiary text-text-muted text-[11px] font-bold flex items-center justify-center hover:text-text-primary cursor-pointer"
          >
            ?
          </button>
        )}
      </h2>
      {team?.joined && user && (
        <button
          onClick={() => setJoined(team.id, false)}
          disabled={saving}
          className="text-[11px] font-bold text-text-muted hover:text-accent-red cursor-pointer disabled:opacity-50"
        >
          Leave
        </button>
      )}
    </div>
  );

  // Signed out there's no progress to share and no identity to show — a board
  // is other people's data, so it stays behind the sign-in.
  if (!user) {
    return (
      <section className="rounded-2xl border-[3px] border-border bg-bg-card p-5 sm:p-6 flex flex-col gap-3">
        {header}
        <p className="text-xs text-text-muted leading-relaxed">
          Sign in to compare your progress with learners around the world.
        </p>
        <Link
          to="/login"
          className="btn-3d self-start px-4 py-2 text-xs font-bold bg-accent-cyan text-bg-primary"
        >
          Sign in
        </Link>
      </section>
    );
  }

  // The board returns the top places; a member ranked below them comes back as
  // a number alone, shown after a break rather than pretending the list runs on.
  const inTop = rows.some((r) => r.user_id === user.id);
  const rankBelow = !inTop && myRank !== null ? myRank : null;

  return (
    // The id is a scroll target: joining from an invite dialog offers to bring
    // the user down to the board they just joined.
    <section
      id="leaderboard"
      className="rounded-2xl border-[3px] border-border bg-bg-card p-5 sm:p-6 flex flex-col gap-4"
    >
      {header}

      {showHelp && scoring && <ScoreHelp scoring={scoring} />}

      {/* The strip is where teams are browsed and picked, so the two ways of
          getting a new one — an invite code, or creating your own — live at the
          end of it rather than somewhere else on the panel. It always renders:
          the invite button is most needed by someone who has only Global. */}
      <div className="flex flex-wrap gap-1.5">
        <div role="tablist" aria-label="Leaderboard teams" className="contents">
          {teams.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === activeTeamId}
              onClick={() => selectTeam(t.id)}
              className={`btn-3d px-3 py-1.5 text-[11px] font-bold ${
                t.id === activeTeamId
                  ? 'bg-accent-cyan text-bg-primary'
                  : 'bg-bg-tertiary text-text-secondary'
              }`}
            >
              {!t.isPublic && <Icon icon="lucide:lock" className="inline mr-1 -mt-0.5" />}
              {t.name}
              <span className="ml-1.5 opacity-70 tabular-nums">{t.memberCount}</span>
            </button>
          ))}
        </div>

        {/* Separated from the tabs by a hairline: these add a team rather than
            switch to one, and a tablist shouldn't contain things that aren't
            tabs. */}
        <span className="w-px self-stretch bg-border mx-0.5" />

        <button
          onClick={() => setManualOpen(true)}
          className="btn-3d px-3 py-1.5 text-[11px] font-bold bg-bg-tertiary text-text-secondary"
        >
          <Icon icon="lucide:ticket" className="inline -mt-0.5 mr-1" />
          Invite code
        </button>

        {isPro && (
          <button
            onClick={() => setCreating(true)}
            className="btn-3d px-3 py-1.5 text-[11px] font-bold bg-bg-tertiary text-text-secondary"
          >
            <Icon icon="lucide:plus" className="inline -mt-0.5" /> New team
          </button>
        )}
      </div>

      {/* Owner tools for the team on screen. */}
      {team?.isOwner && <InvitePanel team={team} />}

      {team && !team.joined && (
        <div className="flex flex-col gap-3 rounded-xl bg-bg-tertiary/50 p-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            Your progress is private. Join to appear on this board — the other members will see your
            name, avatar, words learned and streak. Nothing else is shared, and you can leave at any
            time.
          </p>
          <button
            onClick={() => setJoined(team.id, true)}
            disabled={saving}
            className="btn-3d self-start px-4 py-2 text-xs font-bold bg-accent-cyan text-bg-primary disabled:opacity-50"
          >
            {saving ? 'Joining…' : `Join ${team.name.toLowerCase()}`}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-accent-red">{error}</p>}

      {loading && rows.length === 0 && <p className="text-xs text-text-muted">Loading the board…</p>}

      {!loading && rows.length === 0 && !error && (
        <p className="text-xs text-text-muted">Nobody has joined yet — be the first name up there.</p>
      )}

      {rows.length > 0 && (
        <ol className="flex flex-col gap-1 -mx-1">
          {rows.map((r) => (
            <Row key={r.user_id} row={r} isMe={r.user_id === user.id} />
          ))}
          {rankBelow !== null && (
            <>
              <li className="text-center text-text-muted/60 leading-none py-1">···</li>
              <li className="px-3 py-2 rounded-xl bg-accent-cyan/10 ring-1 ring-accent-cyan/40 text-xs font-bold text-text-primary">
                You're #{rankBelow}
              </li>
            </>
          )}
        </ol>
      )}

      <p className="text-[11px] text-text-muted/70">
        Ranked by score over the last {scoring?.windowDays ?? 30} days. Only learners who joined are
        counted.
      </p>

      {creating && <TeamForm onClose={() => setCreating(false)} />}
      {joining !== null && (
        <TeamJoinDialog key={joining} initialCode={joining} onClose={closeJoin} />
      )}
    </section>
  );
}
