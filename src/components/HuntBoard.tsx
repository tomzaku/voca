import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '../hooks/useAuth';
import { useTick } from '../hooks/useHunt';
import { clock, secondsUntil } from '../lib/hunt';
import { endHunt, fetchBoard, huntLink, movePlayer, startHunt, type Board } from '../lib/huntsApi';
import { QrCode } from './hunt/QrCode';
import { HuntResults } from './hunt/HuntResults';
import { PhaseLabel, RaceTrack, TEAM_COLOR } from './hunt/teams';

const POLL_MS = 2500;

/**
 * The teacher's screen for one hunt, at /hunts/:id — made for a projector.
 * Before the start it's the lobby: a big join code and QR, and the two teams
 * filling up, with a tap to move a student across. Then it's the race: each
 * team's run of stations, what they're doing now, and a feed of who just
 * found or solved what. At the end, the winner and the treasure word.
 */
export function HuntBoard() {
  const { id = '' } = useParams<{ id: string }>();
  const intl = useIntl();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Both teams home is the end of the race, whatever the clock says.
  const live = board?.hunt.status === 'live' && !board.outcome.over;
  const now = useTick(live);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setBoard(await fetchBoard(id, signal));
      setError(null);
    } catch (err) {
      if (!signal?.aborted) setError((err as Error).message);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading || !user) return;
    let ctrl = new AbortController();
    void load(ctrl.signal);
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      ctrl.abort();
      ctrl = new AbortController();
      void load(ctrl.signal);
    }, POLL_MS);
    return () => { ctrl.abort(); window.clearInterval(timer); };
  }, [load, user, authLoading]);

  const act = async (fn: () => Promise<Board>) => {
    setBusy(true);
    try { setBoard(await fn()); } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };

  if (!authLoading && !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-display font-extrabold text-text-primary mb-4"><FormattedMessage id="hunt.teacher.signInTitle" /></h1>
        <button onClick={signInWithGoogle} className="px-5 py-2.5 rounded-xl bg-accent-cyan text-bg-primary text-sm font-bold"><FormattedMessage id="quiz.share.signIn" /></button>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        {error ? <p className="text-text-muted">{error}</p> : <div className="w-10 h-10 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />}
        <Link to="/hunts" className="text-sm text-accent-cyan font-bold"><FormattedMessage id="hunt.teacher.back" /></Link>
      </div>
    );
  }

  const { hunt, teams, outcome } = board;
  const left = secondsUntil(hunt.endsAt, 0, now);
  const players = teams.reduce((n, t) => n + t.players.length, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Title bar: name, clock, and the teacher's controls. */}
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/hunts" className="p-2 rounded-xl bg-bg-tertiary text-text-muted" aria-label={intl.formatMessage({ id: 'hunt.teacher.back' })}>
          <Icon icon="lucide:arrow-left" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-text-primary truncate">{hunt.title}</h1>
          <p className="text-sm text-text-muted">
            <FormattedMessage id={`hunt.status.${outcome.over ? 'ended' : hunt.status}`} /> · <FormattedMessage id={`hunt.mode.${hunt.mode}`} /> · <FormattedMessage id="hunt.teacher.stations" values={{ n: hunt.stations }} />
          </p>
        </div>
        {live && <div className="text-4xl font-display font-extrabold tabular-nums text-text-primary">{clock(left)}</div>}
        <Link to={`/hunts/${hunt.id}/try`} className="px-4 py-2.5 rounded-xl bg-bg-tertiary text-sm font-bold text-text-primary flex items-center gap-1.5">
          <Icon icon="lucide:gamepad-2" /> <FormattedMessage id="hunt.try.button" />
        </Link>
        {hunt.mode === 'qr' && (
          <Link to={`/hunts/${hunt.id}/cards`} className="px-4 py-2.5 rounded-xl bg-bg-tertiary text-sm font-bold text-text-primary flex items-center gap-1.5">
            <Icon icon="lucide:printer" /> <FormattedMessage id="hunt.teacher.printCards" />
          </Link>
        )}
        {hunt.status === 'lobby' && (
          <button
            disabled={busy || players === 0}
            onClick={() => void act(() => startHunt(hunt.id))}
            className="px-5 py-2.5 rounded-xl bg-accent-green text-bg-primary font-display font-extrabold flex items-center gap-1.5 disabled:opacity-40"
          >
            <Icon icon="lucide:play" /> <FormattedMessage id="hunt.teacher.start" />
          </button>
        )}
        {live && (
          <button
            disabled={busy}
            onClick={() => { if (window.confirm(intl.formatMessage({ id: 'hunt.teacher.confirmEnd' }))) void act(() => endHunt(hunt.id)); }}
            className="px-4 py-2.5 rounded-xl bg-accent-red/15 text-accent-red font-bold flex items-center gap-1.5"
          >
            <Icon icon="lucide:square" /> <FormattedMessage id="hunt.teacher.end" />
          </button>
        )}
      </div>

      {hunt.status === 'lobby' && <Lobby board={board} busy={busy} onMove={(p, t) => void act(() => movePlayer(hunt.id, p, t))} />}

      {hunt.status !== 'lobby' && (
        <>
          {outcome.over && (
            <div className="rounded-3xl p-6 text-center text-white" style={{ background: outcome.winner === null ? 'var(--color-accent-purple)' : TEAM_COLOR[outcome.winner] }}>
              <div className="text-6xl mb-2" aria-hidden>{outcome.winner === null ? '🤝' : '🏆'}</div>
              <p className="text-3xl sm:text-4xl font-display font-extrabold">
                {outcome.winner === null
                  ? <FormattedMessage id="hunt.draw" />
                  : <FormattedMessage id="hunt.teamWins" values={{ team: teams[outcome.winner].name }} />}
              </p>
              <p className="mt-2 text-lg opacity-90"><FormattedMessage id="hunt.treasureWas" values={{ word: hunt.treasure }} /></p>
            </div>
          )}

          <div className="rounded-3xl border border-border bg-bg-card p-5 sm:p-8 space-y-6">
            {teams.map((t) => (
              <div key={t.team} className="space-y-2">
                <RaceTrack name={t.name} team={t.team} stations={hunt.stations} position={t.position} phase={t.phase} />
                <p className="text-sm text-text-muted pl-1">
                  <PhaseLabel phase={t.phase} solved={t.solved} need={t.need} />
                  {' · '}{t.players.map((p) => p.name).join(', ')}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-bg-card p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2"><FormattedMessage id="hunt.teacher.feed" /></h2>
            {board.feed.length === 0 ? (
              <p className="text-sm text-text-muted"><FormattedMessage id="hunt.teacher.feedEmpty" /></p>
            ) : (
              <ul className="space-y-1">
                {board.feed.map((e, i) => (
                  <li key={`${e.at}-${i}`} className="text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TEAM_COLOR[e.team] }} />
                    <span className="text-text-muted tabular-nums text-xs w-14 shrink-0">{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span className="text-text-primary">
                      <FormattedMessage
                        id={`hunt.feed.${e.kind}`}
                        values={{ who: e.player ?? '—', team: teams[e.team].name, n: teams[e.team].order.indexOf(e.station) + 1 }}
                      />
                      {e.given && <span className="text-accent-red"> — “{e.given}”</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <HuntResults huntId={hunt.id} over={outcome.over} />
        </>
      )}
    </div>
  );
}

function Lobby({ board, busy, onMove }: { board: Board; busy: boolean; onMove: (player: string, team: 0 | 1) => void }) {
  const intl = useIntl();
  const { hunt, teams } = board;
  const link = huntLink(hunt.code);
  return (
    <div className="grid lg:grid-cols-[auto_1fr] gap-5">
      <div className="rounded-3xl border border-border bg-bg-card p-6 flex flex-col items-center text-center gap-3">
        <p className="text-sm font-bold uppercase tracking-wider text-text-muted"><FormattedMessage id="hunt.teacher.joinAt" /></p>
        <QrCode text={link} size={220} />
        <p className="text-xs text-text-muted break-all max-w-[240px]">{link}</p>
        <p className="text-5xl font-display font-extrabold tracking-[0.2em] text-text-primary">{hunt.code}</p>
        <button
          onClick={() => { navigator.clipboard.writeText(link).then(() => toast.success(intl.formatMessage({ id: 'hunt.teacher.copied' }))).catch(() => {}); }}
          className="text-sm font-bold text-accent-cyan flex items-center gap-1"
        >
          <Icon icon="lucide:copy" /> <FormattedMessage id="hunt.teacher.copyLink" />
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {teams.map((t) => (
          <div key={t.team} className="rounded-3xl border-2 bg-bg-card p-5" style={{ borderColor: TEAM_COLOR[t.team] }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-display font-extrabold" style={{ color: TEAM_COLOR[t.team] }}>{t.name}</h2>
              <span className="text-sm font-bold text-text-muted">{t.players.length}</span>
            </div>
            {t.players.length === 0 ? (
              <p className="text-sm text-text-muted"><FormattedMessage id="hunt.teacher.waitingPlayers" /></p>
            ) : (
              <ul className="space-y-1.5">
                {t.players.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 rounded-xl bg-bg-tertiary px-3 py-2">
                    <span className="flex-1 font-bold text-text-primary truncate">{p.name}</span>
                    <button
                      disabled={busy}
                      onClick={() => onMove(p.id, t.team === 0 ? 1 : 0)}
                      className="text-xs font-bold px-2 py-1 rounded-lg text-white disabled:opacity-40"
                      style={{ background: TEAM_COLOR[t.team === 0 ? 1 : 0] }}
                      title={intl.formatMessage({ id: 'hunt.teacher.moveTo' }, { team: teams[t.team === 0 ? 1 : 0].name })}
                    >
                      → {teams[t.team === 0 ? 1 : 0].name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        <p className="sm:col-span-2 text-sm text-text-muted">
          <FormattedMessage id="hunt.teacher.lobbyHint" values={{ need: hunt.need, min: hunt.durationMin }} />
        </p>
        <Link
          to={`/hunts/${hunt.id}/try`}
          className="sm:col-span-2 rounded-2xl border-2 border-dashed border-accent-cyan/50 bg-accent-cyan/5 p-4 flex items-center gap-3 hover:bg-accent-cyan/10 transition-colors"
        >
          <Icon icon="lucide:gamepad-2" className="text-2xl text-accent-cyan shrink-0" />
          <span className="flex-1">
            <span className="block font-bold text-text-primary"><FormattedMessage id="hunt.try.callout" /></span>
            <span className="block text-xs text-text-muted"><FormattedMessage id="hunt.try.calloutBody" /></span>
          </span>
          <Icon icon="lucide:chevron-right" className="text-text-muted" />
        </Link>
      </div>
    </div>
  );
}
