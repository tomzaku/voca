import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { useHunt, useTick } from '../hooks/useHunt';
import { previewHunt, type Play, type Preview } from '../lib/huntsApi';
import { clock, secondsUntil } from '../lib/hunt';
import { HuntQuestion, TreasureLock } from './hunt/HuntQuestion';
import { PhaseLabel, RaceTrack, SOLO_COLOR, TEAM_COLOR } from './hunt/teams';

/**
 * A student's phone in a treasure hunt, at /hunt/:code. No account needed:
 * type your name, land on a team, and follow the screen — find the card, answer
 * your question, wait for your teammates, open the treasure.
 *
 * A station's QR card links here with `?card=`, so scanning one with the
 * phone's own camera opens the page and reports the find in one go. The card's
 * code is printed under the QR too, for a phone whose camera won't scan.
 */
export function HuntPlay() {
  const { code: raw } = useParams<{ code: string }>();
  const code = (raw ?? '').toUpperCase();
  const [params, setParams] = useSearchParams();
  const hunt = useHunt(code || null);
  const { play, token, error, feedback } = hunt;
  const intl = useIntl();

  // Right/wrong, said once per answer.
  const seen = useRef(0);
  useEffect(() => {
    if (!feedback || feedback.at === seen.current) return;
    seen.current = feedback.at;
    if (feedback.kind === 'correct') toast.success(intl.formatMessage({ id: 'hunt.correct' }));
    else if (feedback.kind === 'wrong') toast.error(intl.formatMessage({ id: 'hunt.wrong' }));
    else if (feedback.kind !== 'found') return;
    else if (feedback.result === 'found') toast.success(intl.formatMessage({ id: 'hunt.found' }));
    else toast(intl.formatMessage({ id: `hunt.foundResult.${feedback.result}` }), { icon: '🔎' });
  }, [feedback, intl]);

  // A scanned card: report it as soon as there's a running hunt to report it
  // to — straight away, or once the student has joined, or once it starts.
  const card = params.get('card');
  const live = play?.hunt.status === 'live';
  const { found } = hunt;
  useEffect(() => {
    if (!card || !token || !live) return;
    const next = new URLSearchParams(params);
    next.delete('card');
    setParams(next, { replace: true });
    void found(card);
  }, [card, token, live, found, params, setParams]);

  if (!code) return <Shell><Notice icon="lucide:search-x" title={intl.formatMessage({ id: 'hunt.notFound' })} /></Shell>;
  if (!token) return <Shell><JoinForm code={code} onJoin={hunt.join} busy={hunt.busy} error={error} carryingCard={Boolean(card)} /></Shell>;
  if (!play) {
    return (
      <Shell>
        {hunt.loading ? <Spinner /> : <Notice icon="lucide:wifi-off" title={error ?? intl.formatMessage({ id: 'hunt.offline' })} />}
      </Shell>
    );
  }
  return <Shell><Race play={play} hunt={hunt} /></Shell>;
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="max-w-md mx-auto px-4 py-6 sm:py-10 animate-fade-in">{children}</div>;
}

function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
    </div>
  );
}

function Notice({ icon, title, body }: { icon: string; title: string; body?: string }) {
  return (
    <div className="text-center py-16">
      <Icon icon={icon} className="text-5xl text-text-muted mx-auto mb-4" />
      <h1 className="text-xl font-display font-extrabold text-text-primary mb-2">{title}</h1>
      {body && <p className="text-sm text-text-muted">{body}</p>}
    </div>
  );
}

function JoinForm({ code, onJoin, busy, error, carryingCard }: {
  code: string;
  onJoin: (name: string) => Promise<boolean>;
  busy: boolean;
  error: string | null;
  carryingCard: boolean;
}) {
  const intl = useIntl();
  const [name, setName] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    previewHunt(code).then((p) => alive && setPreview(p)).catch(() => alive && setMissing(true));
    return () => { alive = false; };
  }, [code]);

  if (missing) {
    return <Notice icon="lucide:search-x" title={intl.formatMessage({ id: 'hunt.notFound' })} body={intl.formatMessage({ id: 'hunt.notFoundBody' }, { code })} />;
  }
  if (preview?.status === 'ended') {
    return <Notice icon="lucide:flag" title={intl.formatMessage({ id: 'hunt.alreadyOver' })} />;
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-6">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2" aria-hidden>🗺️</div>
        <h1 className="text-2xl font-display font-extrabold text-text-primary">{preview?.title ?? intl.formatMessage({ id: 'hunt.title' })}</h1>
        <p className="text-xs text-text-muted mt-1">
          {preview && <FormattedMessage id="hunt.joinMeta" values={{ count: preview.playerCount, mode: preview.mode }} />}
        </p>
        {carryingCard && <p className="text-xs text-accent-yellow mt-2"><FormattedMessage id="hunt.joinFirst" /></p>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) void onJoin(name.trim()); }}>
        <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1" htmlFor="hunt-name">
          <FormattedMessage id="hunt.yourName" />
        </label>
        <input
          id="hunt-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          autoFocus
          placeholder={intl.formatMessage({ id: 'hunt.namePlaceholder' })}
          className="w-full bg-bg-tertiary border-2 border-border rounded-xl px-3 py-3 text-lg text-text-primary font-semibold focus:outline-none focus:border-accent-cyan mb-3"
        />
        {error && <p className="text-sm text-accent-red mb-3">{error}</p>}
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="w-full py-3.5 rounded-xl bg-accent-cyan text-bg-primary text-lg font-display font-extrabold disabled:opacity-40"
        >
          {busy ? <FormattedMessage id="hunt.joining" /> : <FormattedMessage id="hunt.join" />}
        </button>
      </form>
    </div>
  );
}

function Race({ play, hunt }: { play: Play; hunt: ReturnType<typeof useHunt> }) {
  const intl = useIntl();
  const { me, team, rival, outcome } = play;
  const status = play.hunt.status;
  const now = useTick(status === 'live' || Boolean(team.cooldownUntil));
  const left = secondsUntil(play.hunt.endsAt, hunt.skewMs, now);
  const cooldown = secondsUntil(team.cooldownUntil, hunt.skewMs, now);
  const solo = play.hunt.play === 'solo';
  const color = solo ? SOLO_COLOR : TEAM_COLOR[me.team];
  const myName = solo ? me.name : play.hunt.teamNames[me.team];

  return (
    <div className="space-y-4">
      {/* Who you are and how long is left. */}
      <div className="rounded-2xl p-4 text-white" style={{ background: color }}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider opacity-80"><FormattedMessage id={solo ? 'hunt.solo.playing' : 'hunt.youAreOn'} /></p>
            <p className="text-2xl font-display font-extrabold truncate">{myName}</p>
          </div>
          {status === 'live' && (
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider opacity-80"><FormattedMessage id="hunt.timeLeft" /></p>
              <p className="text-2xl font-display font-extrabold tabular-nums">{clock(left)}</p>
            </div>
          )}
        </div>
        <p className="text-xs mt-2 opacity-90 truncate">
          {solo
            ? me.rank && status !== 'lobby' ? <FormattedMessage id="hunt.solo.place" values={{ rank: me.rank, of: me.of }} /> : <FormattedMessage id="hunt.solo.classmates" values={{ n: me.of }} />
            : <>{me.name} · {play.teammates.filter((n) => n !== me.name).join(', ') || intl.formatMessage({ id: 'hunt.noTeammates' })}</>}
        </p>
      </div>

      {/* The race: both teams — or, solo, the leaders and you. */}
      <div className="rounded-2xl border border-border bg-bg-card p-4 space-y-2">
        {solo
          ? play.standings.map((s) => (
            <RaceTrack
              key={s.id}
              name={`${s.rank}. ${s.me ? intl.formatMessage({ id: 'teams.you' }) : s.name}`}
              team={0}
              color={s.me ? SOLO_COLOR : 'var(--color-text-muted)'}
              stations={play.hunt.stations}
              position={s.position}
              phase={s.phase}
              compact
            />
          ))
          : rival && ([me.team, (1 - me.team) as 0 | 1]).map((t) => {
            const s = t === me.team ? team : rival;
            return (
              <RaceTrack key={t} name={play.hunt.teamNames[t]} team={t} stations={play.hunt.stations} position={s.position} phase={s.phase} compact />
            );
          })}
      </div>

      <div className="rounded-2xl border border-border bg-bg-card p-5">
        <Stage play={play} hunt={hunt} cooldown={cooldown} />
      </div>

      {outcome.over && (
        <p className="text-center text-xs text-text-muted"><FormattedMessage id="hunt.thanks" /></p>
      )}
    </div>
  );
}

/** The middle of the screen: what to do right now. */
function Stage({ play, hunt, cooldown }: { play: Play; hunt: ReturnType<typeof useHunt>; cooldown: number }) {
  const intl = useIntl();
  const { team, me, outcome } = play;
  const status = play.hunt.status;

  if (status === 'lobby') {
    return (
      <div className="text-center py-4">
        <div className="text-4xl mb-3 animate-bounce" aria-hidden>⏳</div>
        <p className="font-display font-extrabold text-lg text-text-primary"><FormattedMessage id="hunt.waitStart" /></p>
        <p className="text-sm text-text-muted mt-1"><FormattedMessage id="hunt.waitStartBody" /></p>
      </div>
    );
  }

  if (play.hunt.play === 'solo' && (outcome.over || team.phase === 'done')) {
    const champ = outcome.champion;
    const first = champ?.id === me.id;
    return (
      <div className="text-center py-4">
        <div className="text-6xl mb-3" aria-hidden>{first ? '🏆' : team.phase === 'done' ? '🎉' : '⌛'}</div>
        <p className="font-display font-extrabold text-2xl text-text-primary">
          {first ? <FormattedMessage id="hunt.solo.youFirst" />
            : team.phase === 'done' ? <FormattedMessage id="hunt.solo.youFinished" values={{ rank: me.rank ?? 0 }} />
            : champ ? <FormattedMessage id="hunt.solo.theyFirst" values={{ name: champ.name }} />
            : <FormattedMessage id="hunt.finished" />}
        </p>
        {!outcome.over && <p className="text-sm text-text-muted mt-2"><FormattedMessage id="hunt.solo.waitOthers" /></p>}
        {outcome.over && me.rank && <p className="text-sm text-text-muted mt-2"><FormattedMessage id="hunt.solo.place" values={{ rank: me.rank, of: me.of }} /></p>}
      </div>
    );
  }

  if (outcome.over || team.phase === 'done') {
    const won = outcome.winner === me.team;
    const draw = outcome.over && outcome.winner === null;
    return (
      <div className="text-center py-4">
        <div className="text-6xl mb-3" aria-hidden>{won ? '🏆' : draw ? '🤝' : team.phase === 'done' ? '🎉' : '⌛'}</div>
        <p className="font-display font-extrabold text-2xl text-text-primary">
          {won ? <FormattedMessage id="hunt.youWon" />
            : draw ? <FormattedMessage id="hunt.draw" />
            : outcome.winner !== null ? <FormattedMessage id="hunt.theyWon" values={{ team: play.hunt.teamNames[outcome.winner] }} />
            : <FormattedMessage id="hunt.finished" />}
        </p>
        {team.phase === 'done' && !outcome.over && (
          <p className="text-sm text-text-muted mt-2"><FormattedMessage id="hunt.waitOthers" /></p>
        )}
      </div>
    );
  }

  if (team.phase === 'find') {
    return <FindStation play={play} onCard={hunt.found} busy={hunt.busy} />;
  }

  if (team.phase === 'final') {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-5xl mb-2" aria-hidden>🧰</div>
          <p className="font-display font-extrabold text-xl text-text-primary"><FormattedMessage id="hunt.finalTitle" /></p>
          <p className="text-sm text-text-muted mt-1"><FormattedMessage id="hunt.finalBody" values={{ n: team.treasureLength }} /></p>
        </div>
        <TreasureLock letters={team.letters} cooldown={cooldown} busy={hunt.busy} onAnswer={(a) => void hunt.answer(a)} />
      </div>
    );
  }

  // Solving: your own question, or — once you've answered — cheering on the rest.
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display font-extrabold text-text-primary">
          <FormattedMessage id="hunt.stationN" values={{ n: team.position + 1, total: play.hunt.stations }} />
        </p>
        <p className="text-xs font-bold text-text-muted"><PhaseLabel phase="solve" solved={team.solved} need={team.need} /></p>
      </div>
      {team.question ? (
        <HuntQuestion question={team.question} cooldown={cooldown} busy={hunt.busy} onAnswer={(a) => void hunt.answer(a)} loadImage={hunt.image} />
      ) : team.iSolved ? (
        <div className="text-center py-4">
          <div className="text-4xl mb-2" aria-hidden>✅</div>
          <p className="font-bold text-text-primary"><FormattedMessage id="hunt.youSolved" /></p>
          <p className="text-sm text-text-muted mt-1"><FormattedMessage id="hunt.helpTeammates" values={{ n: team.need - team.solved }} /></p>
        </div>
      ) : (
        <p className="text-sm text-text-muted">{intl.formatMessage({ id: 'hunt.loadingQuestion' })}</p>
      )}
    </div>
  );
}

/** Where the next station is: the teacher's clue and a box for the card's code, or a place in the world. */
function FindStation({ play, onCard, busy }: { play: Play; onCard: (card: string) => Promise<unknown>; busy: boolean }) {
  const intl = useIntl();
  const [typed, setTyped] = useState('');
  const { team } = play;

  if (play.hunt.mode === 'world') {
    return (
      <div className="text-center space-y-3">
        <div className="text-5xl" aria-hidden>🧭</div>
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted"><FormattedMessage id="hunt.goTo" /></p>
        <p className="font-display font-extrabold text-2xl text-text-primary">
          {team.place ? intl.formatMessage({ id: `places.${team.place}` }) : '…'}
        </p>
        <Link
          to={`/world?hunt=${play.hunt.code}`}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-accent-green text-bg-primary font-display font-extrabold"
        >
          <Icon icon="lucide:gamepad-2" />
          <FormattedMessage id="hunt.openWorld" />
        </Link>
        <p className="text-xs text-text-muted"><FormattedMessage id="hunt.worldHint" /></p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-5xl mb-2" aria-hidden>🔎</div>
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
          <FormattedMessage id="hunt.findCard" values={{ n: team.position + 1 }} />
        </p>
        <p className="font-display font-extrabold text-xl text-text-primary mt-1">
          {team.clue || intl.formatMessage({ id: 'hunt.noClue' })}
        </p>
      </div>
      <p className="text-sm text-text-muted text-center"><FormattedMessage id="hunt.scanHint" /></p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!typed.trim()) return;
          void onCard(typed.trim()).then(() => setTyped(''));
        }}
        className="flex gap-2"
      >
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value.toUpperCase())}
          maxLength={8}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder={intl.formatMessage({ id: 'hunt.cardCode' })}
          className="flex-1 min-w-0 bg-bg-tertiary border-2 border-border rounded-xl px-3 py-3 text-xl tracking-[0.3em] text-center text-text-primary font-display font-extrabold focus:outline-none focus:border-accent-cyan"
        />
        <button type="submit" disabled={busy || !typed.trim()} className="px-5 rounded-xl bg-accent-cyan text-bg-primary font-display font-extrabold disabled:opacity-40">
          <FormattedMessage id="hunt.check" />
        </button>
      </form>
    </div>
  );
}
