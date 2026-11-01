import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { useMatch } from '../../hooks/useMatch';
import { FLEET, SEA, canPlace, parseFleet, parseResult, randomFleet, shipCells, takeShot, type Ship, type ShotResult } from '../../lib/seaBattle';
import { playCorrect, playSelect, playWin, playWrong } from '../../lib/sfx';
import type { MatchLink } from '../../lib/worldLive';
import { MatchWindow } from './MatchWindow';
import { PixelButton } from './pixel';

// Sea Battle with another player (lib/seaBattle). First each of you hides a
// fleet — it starts shuffled; tap a ship to pick it, tap the sea to move it,
// rotate or shuffle. Once both are ready you take turns firing, the host
// first. Your fleet stays on your device: a shot goes over, and the side it
// was fired at answers miss, hit or sunk. A shot or a "ready" is sent again
// until it's answered, so a dropped message only slows the game down.

const RESEND_MS = 2000;
const WATER = '#1f4f6b', HULL = '#9aa3ad', DARK = '#123447';

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

/** One sea: an 8×8 grid, each square drawn by `square`. */
function SeaGrid({ square, onTap, can, max }: {
  square: (i: number) => { style?: CSSProperties; mark?: ReactNode; ring?: boolean };
  onTap?: (i: number) => void;
  can?: (i: number) => boolean;
  max: number;
}) {
  return (
    <div className="grid gap-[2px] p-[3px] mx-auto px-notch" style={{ gridTemplateColumns: `repeat(${SEA}, minmax(0, 1fr))`, maxWidth: max, background: DARK }}>
      {Array.from({ length: SEA * SEA }, (_, i) => {
        const { style, mark, ring } = square(i);
        const live = !!onTap && (can?.(i) ?? true);
        return (
          <button
            key={i}
            type="button"
            disabled={!live}
            onClick={() => onTap?.(i)}
            className={`aspect-square flex items-center justify-center px-title !text-[13px] leading-none ${live ? 'cursor-pointer hover:brightness-125' : ''} ${ring ? 'outline outline-2 outline-[var(--px-gold)] z-10' : ''}`}
            style={{ background: WATER, ...style }}
          >
            {mark}
          </button>
        );
      })}
    </div>
  );
}

const HIT = <span style={{ color: '#ff5a4a' }}>✕</span>;
const MISS = <span style={{ color: '#cfe6f2', opacity: 0.7 }}>•</span>;

export function SeaBattle({ link, onClose }: { link: MatchLink; onClose: () => void }) {
  const name = link.peer.name;
  const [fleet, setFleet] = useState<Ship[]>(() => randomFleet());
  /** The ship picked up while hiding the fleet. */
  const [picked, setPicked] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [theyReady, setTheyReady] = useState(false);
  /** My shots at them, as they answered. */
  const [fired, setFired] = useState<Map<number, ShotResult>>(() => new Map());
  /** Their shots at me, as I answered — kept to answer a repeat the same way. */
  const [taken, setTaken] = useState<Map<number, ShotResult>>(() => new Map());
  /** A shot sent, still waiting for its answer. */
  const [pending, setPending] = useState<{ n: number; cell: number } | null>(null);
  /** Their fleet, shown once the game is over. */
  const [theirFleet, setTheirFleet] = useState<Ship[] | null>(null);
  /** The latest shot either way, to say what happened. */
  const [news, setNews] = useState<{ mine: boolean; r: ShotResult } | null>(null);

  const shots = fired.size + taken.size;
  const iAmNext = (shots % 2 === 0) === link.host;
  const sunkByMe = [...fired.values()].filter((r) => r.sunk).length;
  const sunkByThem = [...taken.values()].filter((r) => r.sunk).length;
  const won = [...fired.values()].some((r) => r.lost);
  const lost = [...taken.values()].some((r) => r.lost);
  const over = won || lost;
  const battle = ready && theyReady;

  const { start, left } = useMatch<true>(
    link,
    async () => true,
    (raw) => (raw === true ? true : null),
    (d) => {
      const s = { ready, battle, shots, iAmNext, taken, fleet, pending, over };
      if (d.kind === 'placed') {
        // They may have missed mine and still be waiting: answer once more.
        setTheyReady(true);
        if (s.ready && s.battle) link.send({ kind: 'placed' });
      } else if (d.kind === 'shot') {
        const cell = Number(d.cell);
        if (!Number.isInteger(cell) || cell < 0 || cell >= SEA * SEA) return;
        const before = s.taken.get(cell);
        if (before) { link.send({ kind: 'result', n: d.n, ...before }); return; }
        if (!s.battle || s.over || d.n !== s.shots || s.iAmNext) return;
        const r = takeShot(s.fleet, new Set(s.taken.keys()), cell);
        setTaken(new Map(s.taken).set(cell, r));
        setNews({ mine: false, r });
        if (r.hit) playWrong(); else playSelect();
        link.send({ kind: 'result', n: d.n, ...r });
      } else if (d.kind === 'result') {
        const r = parseResult(d);
        if (!r || !s.pending || d.n !== s.pending.n || r.cell !== s.pending.cell) return;
        setFired((f) => new Map(f).set(r.cell, r));
        setPending(null);
        setNews({ mine: true, r });
        if (r.hit) playCorrect(); else playSelect();
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

  // At the end, show each other where everything was.
  useEffect(() => {
    if (!over) return;
    link.send({ kind: 'fleet', fleet });
    if (won) playWin();
  }, [over]); // eslint-disable-line react-hooks/exhaustive-deps

  const fire = (cell: number) => {
    if (!battle || over || pending || !iAmNext || fired.has(cell)) return;
    const shot = { n: shots, cell };
    setPending(shot);
    setNews(null);
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

  /** My sea: my ships, and where they've shot. */
  const mySquare = (i: number) => {
    const at = shipAt(fleet, i), r = taken.get(i);
    const sunk = r?.hit && [...taken.values()].some((t) => t.sunk?.includes(i));
    return {
      style: at >= 0 ? { background: sunk ? '#5a2a2a' : picked === at ? 'var(--px-gold)' : HULL, ...hullShape(fleet[at], i) } : undefined,
      mark: r ? (r.hit ? HIT : MISS) : null,
    };
  };
  /** Their sea: what my shots found — and, at the end, their whole fleet. */
  const sunkCells = new Set([...fired.values()].flatMap((r) => r.sunk ?? []));
  const clear = new Set([...fired.values()].flatMap((r) => (r.sunk ? shore(r.sunk) : [])));
  const theirSquare = (i: number) => {
    const r = fired.get(i), at = theirFleet ? shipAt(theirFleet, i) : -1;
    const style: CSSProperties | undefined = sunkCells.has(i) ? { background: '#5a2a2a' }
      : at >= 0 ? { background: HULL, opacity: 0.75, ...hullShape(theirFleet![at], i) }
      : r?.hit ? { background: '#7a3a2e' }
      : clear.has(i) && !r ? { background: '#1a4058' } : undefined;
    return { style, mark: r ? (r.hit ? HIT : MISS) : null, ring: pending?.cell === i };
  };

  const ships = (sunk: number) => <FormattedMessage id="world.seaShips" values={{ n: FLEET.length - sunk, of: FLEET.length }} />;
  const result = won ? 'won' : lost ? 'lost' : null;

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
      {!battle ? (
        <>
          <SeaGrid square={mySquare} onTap={ready ? undefined : move} max={320} />
          {!ready && (
            <div className="grid grid-cols-3 gap-1.5 mt-3">
              <PixelButton tone="paper" disabled={picked === null} onClick={rotate} className="!text-[13px] !px-2"><FormattedMessage id="world.seaRotate" /></PixelButton>
              <PixelButton tone="paper" onClick={() => { setFleet(randomFleet()); setPicked(null); }} className="!text-[13px] !px-2"><FormattedMessage id="world.seaShuffle" /></PixelButton>
              <PixelButton tone="jade" onClick={() => { setReady(true); setPicked(null); }} className="!text-[13px] !px-2"><FormattedMessage id="world.seaReady" /></PixelButton>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-[12px] text-[var(--px-muted)] mb-1 text-center"><FormattedMessage id="world.seaTheirSea" values={{ name }} /></p>
          <SeaGrid square={theirSquare} onTap={over ? undefined : fire} can={(i) => iAmNext && !pending && !fired.has(i)} max={320} />
          <p className="text-[12px] text-[var(--px-muted)] mt-3 mb-1 text-center"><FormattedMessage id="world.seaYourSea" /></p>
          <SeaGrid square={mySquare} max={180} />
        </>
      )}
      <p className="text-[13px] text-center text-[var(--px-muted)] mt-3 min-h-[2.5rem]">
        {news && !over && (
          <span style={{ color: news.r.hit === news.mine ? 'var(--px-jade)' : 'var(--px-bad)' }}>
            <FormattedMessage
              id={news.mine ? (news.r.sunk ? 'world.seaSunk' : news.r.hit ? 'world.seaHit' : 'world.seaMiss') : (news.r.sunk ? 'world.seaTheySunk' : news.r.hit ? 'world.seaTheyHit' : 'world.seaTheyMiss')}
              values={{ name, n: news.r.sunk?.length ?? 0 }}
            />{' '}
          </span>
        )}
        {!over && status}
      </p>
    </MatchWindow>
  );
}
