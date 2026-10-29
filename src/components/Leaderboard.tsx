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
import { FormattedMessage, useIntl } from 'react-intl';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useIsPro } from '../hooks/useProStatus';
import { useTeams, type BoardRow, type Scoring } from '../hooks/useTeams';
import { TeamForm } from './TeamForm';
import { InvitePanel, TeamJoinDialog } from './TeamInvite';
import { PeriodNote, ScoringPanel } from './TeamScoring';

/** Medal colours for the podium; everyone else gets a plain number. */
const PODIUM = ['text-accent-yellow', 'text-text-secondary', 'text-accent-orange'];

/**
 * What the score means, written from the server's own weights (they ride along
 * with every board) so this can never describe a formula that isn't the one
 * being used. A rank with no explanation is the first thing anyone asks about.
 */
function ScoreHelp({ scoring }: { scoring: Scoring }) {
  const intl = useIntl();
  const { windowDays, points } = scoring;
  const b = (c: React.ReactNode[]) => <b>{c}</b>;
  const day = (iso: string) => intl.formatDate(iso, { day: 'numeric', month: 'short' });

  // The period is the first thing to state, because it's what makes the score
  // mean something — and it's the team's, not a constant.
  const covers = windowDays !== null
    ? intl.formatMessage({ id: 'teams.coversWindow' }, { days: windowDays })
    : scoring.until
    ? intl.formatMessage({ id: 'teams.coversRange' }, { from: day(scoring.since), to: day(scoring.until) })
    : intl.formatMessage({ id: 'teams.coversSince' }, { date: day(scoring.since) });

  return (
    <div className="rounded-xl bg-bg-tertiary/50 p-4 text-[11px] text-text-secondary leading-relaxed">
      <p className="font-bold text-text-primary mb-2">{covers}</p>
      <ul className="flex flex-col gap-1">
        <li>
          <FormattedMessage id="teams.helpCorrect" values={{ count: points.correctDay, b }} />
        </li>
        <li>
          <FormattedMessage id="teams.helpMastered" values={{ count: points.mastered, b }} />
        </li>
        <li>
          <FormattedMessage id="teams.helpStreak" values={{ count: points.streakDay, b }} />
        </li>
      </ul>
      <p className="mt-2 text-text-muted">
        <FormattedMessage id={windowDays !== null ? 'teams.helpRolling' : 'teams.helpPeriod'} />{' '}
        <FormattedMessage id="teams.helpUpdates" />
      </p>
    </div>
  );
}

function Avatar({ row }: { row: BoardRow }) {
  const intl = useIntl();
  const name = row.display_name || intl.formatMessage({ id: 'teams.learner' });
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
  const intl = useIntl();
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
          {row.display_name || intl.formatMessage({ id: 'teams.learner' })}
          {isMe && <span className="ml-1.5 text-[11px] font-bold text-accent-cyan"><FormattedMessage id="teams.you" /></span>}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-text-muted">
          <Icon icon="lucide:flame" className="text-accent-orange" />
          <span className="tabular-nums">{row.streak}</span>
          <span><FormattedMessage id="teams.dayStreakBest" values={{ longest: row.longest }} /></span>
        </span>
      </span>
      {/* The score is what the order is built on, so it's the number that gets
          the weight; the lifetime word count sits under it as context. */}
      <span className="shrink-0 text-right">
        <span className="block font-display font-extrabold tabular-nums text-accent-green">
          {row.score}
        </span>
        <span className="block text-[10px] text-text-muted tabular-nums">
          <FormattedMessage id="teams.wordCount" values={{ count: row.learned }} />
        </span>
      </span>
    </li>
  );
}

export function Leaderboard() {
  const intl = useIntl();
  const { user } = useAuth();
  const teams = useTeams((s) => s.teams);
  const activeTeamId = useTeams((s) => s.activeTeamId);
  const rows = useTeams((s) => s.rows);
  const loading = useTeams((s) => s.loading);
  const saving = useTeams((s) => s.saving);
  const error = useTeams((s) => s.error);
  const myRank = useTeams((s) => s.myRank);
  const me = useTeams((s) => s.me);
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

  // `/dashboard#leaderboard` — how the badge on the Learn page links here. A
  // client-side navigation doesn't act on a hash, and the board sits well below
  // the fold, so arriving at the top of the dashboard would look like the link
  // went nowhere. The frame's delay is for the page above it laying out first.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash !== '#leaderboard') return;
    const raf = requestAnimationFrame(() => {
      document.getElementById('leaderboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, [hash]);

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
        {teams.length > 1
          ? <FormattedMessage id="teams.leaderboards" />
          : <FormattedMessage id="teams.teamLeaderboard" values={{ name: team?.name ?? 'Global' }} />}
        {scoring && (
          <button
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            aria-label={intl.formatMessage({ id: 'teams.scoreHelpLabel' })}
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
          <FormattedMessage id="teams.leave" />
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
          <FormattedMessage id="teams.signInPrompt" />
        </p>
        <Link
          to="/login"
          className="btn-3d self-start px-4 py-2 text-xs font-bold bg-accent-cyan text-bg-primary"
        >
          <FormattedMessage id="teams.signIn" />
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
        <div role="tablist" aria-label={intl.formatMessage({ id: 'teams.tabsLabel' })} className="contents">
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
          <FormattedMessage id="teams.inviteCode" />
        </button>

        {isPro && (
          <button
            onClick={() => setCreating(true)}
            className="btn-3d px-3 py-1.5 text-[11px] font-bold bg-bg-tertiary text-text-secondary"
          >
            <Icon icon="lucide:plus" className="inline -mt-0.5" /> <FormattedMessage id="teams.newTeam" />
          </button>
        )}
      </div>

      {/* Above the owner tools, because it's for everyone on the board — what
          period these standings cover, and how long is left of it. */}
      {scoring && <PeriodNote scoring={scoring} />}

      {/* Owner tools for the team on screen. */}
      {team?.isOwner && (
        <>
          <InvitePanel team={team} />
          <ScoringPanel team={team} />
        </>
      )}

      {team && !team.joined && (
        <div className="flex flex-col gap-3 rounded-xl bg-bg-tertiary/50 p-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            <FormattedMessage id="teams.joinPrompt" />
          </p>
          <button
            onClick={() => setJoined(team.id, true)}
            disabled={saving}
            className="btn-3d self-start px-4 py-2 text-xs font-bold bg-accent-cyan text-bg-primary disabled:opacity-50"
          >
            {saving
              ? <FormattedMessage id="teams.joining" />
              : <FormattedMessage id="teams.joinName" values={{ name: team.name.toLowerCase() }} />}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-accent-red">{error}</p>}

      {loading && rows.length === 0 && <p className="text-xs text-text-muted"><FormattedMessage id="teams.loadingBoard" /></p>}

      {!loading && rows.length === 0 && !error && (
        <p className="text-xs text-text-muted"><FormattedMessage id="teams.nobodyJoined" /></p>
      )}

      {rows.length > 0 && (
        <ol className="flex flex-col gap-1 -mx-1">
          {rows.map((r) => (
            <Row key={r.user_id} row={r} isMe={r.user_id === user.id} />
          ))}
          {rankBelow !== null && (
            <>
              <li className="text-center text-text-muted/60 leading-none py-1">···</li>
              <li className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-accent-cyan/10 ring-1 ring-accent-cyan/40 text-xs font-bold text-text-primary">
                <span><FormattedMessage id="teams.yourRank" values={{ rank: rankBelow }} /></span>
                {me && (
                  <span className="font-display font-extrabold tabular-nums text-accent-green">
                    {me.score}
                  </span>
                )}
              </li>
            </>
          )}
        </ol>
      )}

      <p className="text-[11px] text-text-muted/70">
        {scoring && scoring.windowDays === null
          ? <FormattedMessage id="teams.rankedByPeriod" />
          : <FormattedMessage id="teams.rankedByWindow" values={{ days: scoring?.windowDays ?? 30 }} />}{' '}
        <FormattedMessage id="teams.onlyJoined" />
      </p>

      {creating && <TeamForm onClose={() => setCreating(false)} />}
      {joining !== null && (
        <TeamJoinDialog key={joining} initialCode={joining} onClose={closeJoin} />
      )}
    </section>
  );
}
