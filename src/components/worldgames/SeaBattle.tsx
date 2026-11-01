import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { useMatch } from '../../hooks/useMatch';
import { FLEET, SEA, canPlace, firesNext, parseFleet, parseResult, randomFleet, shipCells, takeShot, type Ship, type ShotResult } from '../../lib/seaBattle';
import { playCorrect, playSelect, playWin, playWrong } from '../../lib/sfx';
import type { MatchLink } from '../../lib/worldLive';
import { MatchWindow } from './MatchWindow';
import { PixelButton } from './pixel';

// Sea Battle with another player (lib/seaBattle). First each of you hides a
// fleet — it starts shuffled; tap a ship to pick it, tap the sea to move it,
// rotate or shuffle. Once both are ready you fire, the host first, and a hit
// fires again. Your fleet stays on your device: a shot goes over, and the
// side it was fired at answers miss, hit or sunk. A shot or a "ready" is sent
// again until it's answered, so a dropped message only slows the game down.
//
// Every shot plays out on both screens — a burst or a splash on its square,
// the sea shaking on a hit, a sinking ship flashing — and a toast says what
// it means for the turn, since "hit, so fire again" is easy to miss.

const RESEND_MS = 2000;
const TOAST_MS = 1800;
const WATER = '#1f4f6b', HULL = '#9aa3ad', DARK = '#123447', WRECK = '#5a2a2a';

/** Where a square sits in its ship, to round off the bow and stern. */
function hullShape(s: Ship, i: number): CSSProperties {
  const cells = shipCells(s) ?? [];
  const first = cells[0] === i, last = cells[cells.length - 1] === i, r = '45%';
  return s.down
    ? { borderTopLeftRadius: first ? r : 0, borderTopRightRadius: first ? r : 0, borderBottomLeftRadius: last ? r : 0, borderBottomRightRadius: last ? r : 0 }
    : { borderTopLeftRadius: first ? r : 0, borderBottomLeftRadius: first ? r : 0, borderTopRightRadius: last ? r : 0, borderBottomRightRadius: last ? r : 0 };
}

/** The squares around a sunk ship: no ship can be there. */
function shore(cells: number[]): number[] {
  const out = new Set<number>();
  for (const i of cells) {
    const r = Math.floor(i / SEA), c = i % SEA;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < SEA && cc >= 0 && cc < SEA) out.add(rr * SEA + cc);
    }
  }
  cells.forEach((i) => out.delete(i));
  return [...out];
}

interface Square { style?: CSSProperties; mark?: ReactNode; ring?: boolean; fx?: 'burst' | 'splash'; sinking?: boolean }

/** One sea: an 8×8 grid, each square drawn by `square`. `fxKey` restarts
 *  a square's effect for each new shot. */
function SeaGrid({ square, onTap, can, max, fxKey = 0 }: {
  square: (i: number) => Square;
  onTap?: (i: number) => void;
  can?: (i: number) => boolean;
  max: number;
  fxKey?: number;
}) {
  return (
    <div className="grid gap-[2px] p-[3px] mx-auto px-notch" style={{ gridTemplateColumns: `repeat(${SEA}, minmax(0, 1fr))`, maxWidth: max, background: DARK }}>
      {Array.from({ length: SEA * SEA }, (_, i) => {
        const { style, mark, ring, fx, sinking } = square(i);
        const live = !!onTap && (can?.(i) ?? true);
        return (
          <button
            key={i}
            type="button"
            disabled={!live}
            onClick={() => onTap?.(i)}
            className={`relative aspect-square flex items-center justify-center px-title !text-[13px] leading-none ${live ? 'cursor-pointer hover:brightness-125' : ''} ${ring ? 'outline outline-2 outline-[var(--px-gold)] z-10' : ''} ${sinking ? 'px-sink' : ''}`}
            style={{ background: WATER, ...style }}
          >
            {fx === 'burst' && <span key={fxKey} className="px-burst absolute inset-0 rounded-full pointer-events-none z-20" />}
            {fx === 'splash' && <span key={fxKey} className="px-splash absolute inset-0 rounded-full pointer-events-none border-2 border-[#cfe6f2]" />}
            {mark && <span key={fx ? fxKey : undefined} className={fx ? 'px-pop relative z-10' : 'relative'}>{mark}</span>}
          </button>
        );
      })}
    </div>
  );
}

const HIT = <span style={{ color: '#ff5a4a' }}>✕</span>;
const MISS = <span style={{ color: '#cfe6f2', opacity: 0.7 }}>•</span>;

type Toast = { key: number; id: string; n?: number; tone: 'good' | 'bad' | 'info' };
const TONE = { good: 'var(--px-jade)', bad: 'var(--px-bad)', info: 'var(--px-text)' };

export function SeaBattle({ link, onClose }: { link: MatchLink; onClose: () => void }) {
  const name = link.peer.name;
  const [fleet, setFleet] = useState<Ship[]>(() => randomFleet());
  /** The ship picked up while hiding the fleet. */
  const [picked, setPicked] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [theyReady, setTheyReady] = useState(false);
  /** Every shot either way, in order, as answered — who fires next follows from it. */
  const [log, setLog] = useState<{ mine: boolean; r: ShotResult }[]>([]);
  /** A shot sent, still waiting for its answer. */
  const [pending, setPending] = useState<{ n: number; cell: number } | null>(null);
  /** Their fleet, shown once the game is over. */
  const [theirFleet, setTheirFleet] = useState<Ship[] | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const say = (t: Omit<Toast, 'key'>) => setToast({ ...t, key: Date.now() });
  /** The battle begins — whichever of us was ready second: who fires first. */
  const begin = () => say(link.host ? { id: 'world.seaGo', tone: 'good' } : { id: 'world.seaTheyFirst', tone: 'info' });

  const fired = new Map(log.filter((e) => e.mine).map((e) => [e.r.cell, e.r]));
  const taken = new Map(log.filter((e) => !e.mine).map((e) => [e.r.cell, e.r]));
  const iAmNext = firesNext(log.map((e) => ({ by: e.mine, hit: e.r.hit })), link.host, !link.host);
  const sunkByMe = [...fired.values()].filter((r) => r.sunk).length;
  const sunkByThem = [...taken.values()].filter((r) => r.sunk).length;
  const won = [...fired.values()].some((r) => r.lost);
  const lost = [...taken.values()].some((r) => r.lost);
  const over = won || lost;
  const battle = ready && theyReady;
  const last = log[log.length - 1] ?? null;

  const { start, left } = useMatch<true>(
    link,
    async () => true,
    (raw) => (raw === true ? true : null),
    (d) => {
      if (d.kind === 'placed') {
        // They may have missed mine and still be waiting: answer once more.
        if (ready && !theyReady) begin();
        setTheyReady(true);
        if (battle) link.send({ kind: 'placed' });
      } else if (d.kind === 'shot') {
        const cell = Number(d.cell);
        if (!Number.isInteger(cell) || cell < 0 || cell >= SEA * SEA) return;
        const before = taken.get(cell);
        if (before) { link.send({ kind: 'result', n: d.n, ...before }); return; }
        if (!battle || over || d.n !== log.length || iAmNext) return;
        const r = takeShot(fleet, new Set(taken.keys()), cell);
        setLog([...log, { mine: false, r }]);
        link.send({ kind: 'result', n: d.n, ...r });
        if (r.hit) playWrong(); else playSelect();
        if (r.lost) return;
        say(r.sunk ? { id: 'world.seaTheySunk', n: r.sunk.length, tone: 'bad' } : r.hit ? { id: 'world.seaTheyHit', tone: 'bad' } : { id: 'world.seaTheyMiss', tone: 'good' });
      } else if (d.kind === 'result') {
        const r = parseResult(d);
        if (!r || !pending || d.n !== pending.n || r.cell !== pending.cell) return;
        setLog([...log, { mine: true, r }]);
        setPending(null);
        if (r.hit) playCorrect(); else playSelect();
        if (r.lost) return;
        say(r.sunk ? { id: 'world.seaSunk', n: r.sunk.length, tone: 'good' } : r.hit ? { id: 'world.seaHit', tone: 'good' } : { id: 'world.seaMiss', tone: 'info' });
      } else if (d.kind === 'fleet') {
        setTheirFleet(parseFleet(d.fleet));
      }
    },
  );

  // Saying "ready", and a shot, again until it's heard.
  useEffect(() => {
    if (!start || !ready || theyReady) return;
    link.send({ kind: 'placed' });
    const t = window.setInterval(() => link.send({ kind: 'placed' }), RESEND_MS);
    return () => window.clearInterval(t);
  }, [start, ready, theyReady, link]);
  useEffect(() => {
    if (!pending) return;
    const t = window.setInterval(() => link.send({ kind: 'shot', ...pending }), RESEND_MS);
    return () => window.clearInterval(t);
  }, [pending, link]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  // At the end, show each other where everything was.
  useEffect(() => {
    if (!over) return;
    link.send({ kind: 'fleet', fleet });
    if (won) playWin();
  }, [over]); // eslint-disable-line react-hooks/exhaustive-deps

  const fire = (cell: number) => {
    if (!battle || over || pending || !iAmNext || fired.has(cell)) return;
    const shot = { n: log.length, cell };
    setPending(shot);
    setToast(null);
    link.send({ kind: 'shot', ...shot });
  };

  // ── Hiding the fleet ──
  const shipAt = (ships: Ship[], i: number) => ships.findIndex((s) => shipCells(s)?.includes(i));
  const move = (i: number) => {
    const at = shipAt(fleet, i);
    if (picked === null || (at >= 0 && at !== picked)) { setPicked(at >= 0 ? at : null); if (at >= 0) playSelect(); return; }
    if (at === picked) { setPicked(null); return; }
    const next = { ...fleet[picked], at: i };
    if (!canPlace(next, fleet.filter((_, k) => k !== picked))) { playWrong(); return; }
    setFleet(fleet.map((s, k) => (k === picked ? next : s)));
    playSelect();
  };
  const rotate = () => {
    if (picked === null) return;
    const next = { ...fleet[picked], down: !fleet[picked].down };
    if (!canPlace(next, fleet.filter((_, k) => k !== picked))) { playWrong(); return; }
    setFleet(fleet.map((s, k) => (k === picked ? next : s)));
  };

  /** The newest shot's effect, on whichever sea it landed. */
  const fxOn = (mine: boolean, i: number): Pick<Square, 'fx' | 'sinking'> =>
    last && last.mine === mine && (last.r.cell === i || last.r.sunk?.includes(i))
      ? { fx: last.r.cell === i ? (last.r.hit ? 'burst' : 'splash') : undefined, sinking: !!last.r.sunk?.includes(i) }
      : {};

  /** My sea: my ships, and where they've shot. */
  const theirSunk = new Set([...taken.values()].flatMap((r) => r.sunk ?? []));
  const mySquare = (i: number): Square => {
    const at = shipAt(fleet, i), r = taken.get(i);
    return {
      style: at >= 0 ? { background: theirSunk.has(i) ? WRECK : picked === at ? 'var(--px-gold)' : HULL, ...hullShape(fleet[at], i) } : undefined,
      mark: r ? (r.hit ? HIT : MISS) : null,
      ...fxOn(false, i),
    };
  };
  /** Their sea: what my shots found — and, at the end, their whole fleet. */
  const mySunk = new Set([...fired.values()].flatMap((r) => r.sunk ?? []));
  const clear = new Set([...fired.values()].flatMap((r) => (r.sunk ? shore(r.sunk) : [])));
  const theirSquare = (i: number): Square => {
    const r = fired.get(i), at = theirFleet ? shipAt(theirFleet, i) : -1;
    const style: CSSProperties | undefined = mySunk.has(i) ? { background: WRECK }
      : at >= 0 ? { background: HULL, opacity: 0.75, ...hullShape(theirFleet![at], i) }
      : r?.hit ? { background: '#7a3a2e' }
      : clear.has(i) && !r ? { background: '#1a4058' } : undefined;
    return { style, mark: r ? (r.hit ? HIT : MISS) : null, ring: pending?.cell === i, ...fxOn(true, i) };
  };

  const ships = (sunk: number) => <FormattedMessage id="world.seaShips" values={{ n: FLEET.length - sunk, of: FLEET.length }} />;
  const result = won ? 'won' : lost ? 'lost' : null;
  /** The sea that just took a hit shakes. */
  const shook = (mine: boolean) => (last?.mine === mine && last.r.hit ? 'px-shake' : '');

  const status = !ready ? <FormattedMessage id="world.seaPlace" />
    : !theyReady ? <FormattedMessage id="world.seaWaitPlace" values={{ name }} />
    : pending ? <FormattedMessage id="world.seaFiring" />
    : iAmNext ? <FormattedMessage id="world.seaYourTurn" />
    : <FormattedMessage id="world.seaTheirTurn" values={{ name }} />;

  return (
    <MatchWindow
      link={link} icon="ship" title={<FormattedMessage id="world.seaTitle" />} onClose={onClose}
      turn={result || !battle ? null : iAmNext ? 'me' : 'them'}
      mine={battle ? ships(sunkByThem) : ready ? <FormattedMessage id="world.seaReadyTag" /> : null}
      theirs={battle ? ships(sunkByMe) : theyReady ? <FormattedMessage id="world.seaReadyTag" /> : null}
      started={!!start} left={left} result={result}
    >
      <div className="relative">
        {!battle ? (
          <>
            <SeaGrid square={mySquare} onTap={ready ? undefined : move} max={320} />
            {!ready && (
              <div className="grid grid-cols-3 gap-1.5 mt-3">
                <PixelButton tone="paper" disabled={picked === null} onClick={rotate} className="!text-[13px] !px-2"><FormattedMessage id="world.seaRotate" /></PixelButton>
                <PixelButton tone="paper" onClick={() => { setFleet(randomFleet()); setPicked(null); }} className="!text-[13px] !px-2"><FormattedMessage id="world.seaShuffle" /></PixelButton>
                <PixelButton tone="jade" onClick={() => { setReady(true); setPicked(null); if (theyReady) begin(); }} className="!text-[13px] !px-2"><FormattedMessage id="world.seaReady" /></PixelButton>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-[12px] text-[var(--px-muted)] mb-1 text-center"><FormattedMessage id="world.seaTheirSea" values={{ name }} /></p>
            <div key={`t${log.length}`} className={shook(true)}>
              <SeaGrid square={theirSquare} onTap={over ? undefined : fire} can={(i) => iAmNext && !pending && !fired.has(i)} max={320} fxKey={log.length} />
            </div>
            <p className="text-[12px] text-[var(--px-muted)] mt-3 mb-1 text-center"><FormattedMessage id="world.seaYourSea" /></p>
            <div key={`m${log.length}`} className={shook(false)}>
              <SeaGrid square={mySquare} max={180} fxKey={log.length} />
            </div>
          </>
        )}

        {/* What the last shot means for the turn, over the sea. */}
        {toast && !over && (
          <div key={toast.key} className="px-toast px-notch px-frame absolute left-1/2 top-[30%] z-30 px-4 py-2 w-max max-w-[90%] text-center pointer-events-none">
            <p className="px-title !text-[15px]" style={{ color: TONE[toast.tone] }}>
              <FormattedMessage id={toast.id} values={{ name, n: toast.n ?? 0 }} />
            </p>
          </div>
        )}
      </div>
      {!over && <p className="text-[13px] text-center text-[var(--px-muted)] mt-3 min-h-[2.5rem]">{status}</p>}
    </MatchWindow>
  );
}
