import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useMatch } from '../../hooks/useMatch';
import { canPlay, initialOan, oanResult, playOan, type Dir, type OanState, type Side } from '../../lib/oAnQuan';
import { playWin } from '../../lib/sfx';
import type { MatchLink } from '../../lib/worldLive';
import { MatchWindow } from './MatchWindow';

// Ô ăn quan with another player — the stone game (lib/oAnQuan). The host's
// row is 1–5 and the host goes first. Each of you sees the board from your
// own side: your row along the bottom, left to right, and "→" always sows
// towards your right. A move plays out stone by stone on both screens.

const STEP_MS = 170;

/** The squares as laid out for a side: top row, bottom row, left and right mandarins. */
const layout = (side: Side) => side === 0
  ? { top: [11, 10, 9, 8, 7], bottom: [1, 2, 3, 4, 5], left: 0, right: 6 }
  : { top: [5, 4, 3, 2, 1], bottom: [7, 8, 9, 10, 11], left: 6, right: 0 };

/** A stable number in [0, 1) for a stone, so each keeps its look and place. */
const rand = (a: number, b: number, c = 0) => {
  let h = Math.imul(a + 1, 374761393) + Math.imul(b + 7, 668265263) + Math.imul(c + 3, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** River pebbles: greys, browns, a slate, a creamy one. */
const PEBBLES = ['#9b9a92', '#7f766a', '#b9ab92', '#5f6772', '#a8896a', '#cfc6b4', '#8c6f58', '#6f7b6d'];

/** One small stone (dân): an uneven oval in its own colour, lit from the top left. */
function Pebble({ x, y, seed }: { x: number; y: number; seed: number }) {
  const rx = 6.5 + rand(seed, 1) * 3, ry = 5 + rand(seed, 2) * 2.5, rot = rand(seed, 3) * 180;
  const fill = PEBBLES[Math.floor(rand(seed, 4) * PEBBLES.length)];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <ellipse cx={1.5} cy={2.5} rx={rx} ry={ry} fill="#000" opacity={0.28} />
      <ellipse rx={rx} ry={ry} fill={fill} stroke="#3a2c20" strokeWidth={1} />
      <ellipse cx={-rx * 0.35} cy={-ry * 0.35} rx={rx * 0.35} ry={ry * 0.3} fill="#fff" opacity={0.35} />
    </g>
  );
}

/** The mandarin (quan): a big dark stone, worth ten. */
function Mandarin({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={3} cy={5} rx={21} ry={17} fill="#000" opacity={0.3} />
      <ellipse rx={21} ry={17} fill="#4b4f57" stroke="#22252a" strokeWidth={1.5} />
      <ellipse rx={13} ry={10} cx={2} cy={2} fill="#3e4249" />
      <ellipse cx={-8} cy={-7} rx={7} ry={4.5} fill="#fff" opacity={0.3} />
    </g>
  );
}

// The board, in its own units: five squares of 100 between two half-moons.
const SQ = 100, TOP = 20, MID = 120, BOT = 220, X0 = 110, X1 = X0 + 5 * SQ, W = X1 + 110;

/** Where stone k of n sits in a box: scattered on a loose grid, never quite
 *  in a line, the same place every time. */
function spots(n: number, box: { x: number; y: number; w: number; h: number }, seed: number) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * (box.w / box.h))));
  const rows = Math.max(1, Math.ceil(n / cols));
  return Array.from({ length: n }, (_, k) => {
    const c = k % cols, r = Math.floor(k / cols);
    return {
      x: box.x + ((c + 0.5) / cols) * box.w + (rand(seed, k, 5) - 0.5) * (box.w / cols) * 0.6,
      y: box.y + ((r + 0.5) / rows) * box.h + (rand(seed, k, 6) - 0.5) * (box.h / rows) * 0.6,
    };
  });
}

/** The board as drawn on the ground: chalk on packed earth, seen from your side. */
export function OanBoard({ view, me, hot, chosen, canChoose, onChoose, onSow, label }: {
  view: OanState;
  me: Side;
  /** The square a stone just landed in (or was taken from), while a move plays. */
  hot: number | null;
  chosen: number | null;
  canChoose: (i: number) => boolean;
  onChoose: (i: number | null) => void;
  onSow: (i: number, dir: Dir) => void;
  label: (i: number) => string;
}) {
  const { top, bottom, left, right } = layout(me);
  const cells: { i: number; x: number; y: number }[] = [
    ...top.map((i, k) => ({ i, x: X0 + k * SQ, y: TOP })),
    ...bottom.map((i, k) => ({ i, x: X0 + k * SQ, y: MID })),
  ];
  const chalk = { fill: 'none', stroke: '#f1e7d0', strokeWidth: 4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, opacity: 0.9 };
  const quanAt = (i: number) => view.quan[i === 0 ? 0 : 1];
  const half = (i: number, side: 'l' | 'r') => {
    const cx = side === 'l' ? X0 - 52 : X1 + 52;
    return (
      <g key={`q${i}`}>
        {hot === i && <path d={side === 'l' ? `M${X0},${TOP} A100,100 0 0 0 ${X0},${BOT} Z` : `M${X1},${TOP} A100,100 0 0 1 ${X1},${BOT} Z`} fill="#f6d77a" opacity={0.35} />}
        {quanAt(i) && <Mandarin x={cx} y={MID - 26} />}
        {spots(view.cells[i], { x: cx - 34, y: MID - (quanAt(i) ? 2 : 40), w: 68, h: quanAt(i) ? 60 : 80 }, 100 + i).map((p, k) => <Pebble key={k} x={p.x} y={p.y} seed={i * 97 + k} />)}
        {view.cells[i] > 0 && <text x={cx} y={BOT - 8} textAnchor="middle" fontSize={15} fill="#fff6dd" fontFamily="monospace" opacity={0.85}>{view.cells[i]}</text>}
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${W} 240`} className="w-full h-auto select-none" role="img" aria-label="Ô ăn quan">
      <defs>
        <pattern id="earth" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#a97b4f" />
          {Array.from({ length: 14 }, (_, k) => (
            <circle key={k} cx={rand(k, 11) * 40} cy={rand(k, 12) * 40} r={0.8 + rand(k, 13) * 1.6} fill={rand(k, 14) > 0.5 ? '#8f6540' : '#bf9264'} />
          ))}
        </pattern>
      </defs>
      <rect x={0} y={0} width={W} height={240} rx={14} fill="url(#earth)" />
      {/* Chalk: the long box, its middle line, the cross lines, the half-moons. */}
      <path d={`M${X0},${TOP} H${X1} M${X0},${BOT} H${X1} M${X0},${MID} H${X1}`} {...chalk} />
      {Array.from({ length: 6 }, (_, k) => <path key={k} d={`M${X0 + k * SQ},${TOP} V${BOT}`} {...chalk} />)}
      <path d={`M${X0},${TOP} A100,100 0 0 0 ${X0},${BOT}`} {...chalk} />
      <path d={`M${X1},${TOP} A100,100 0 0 1 ${X1},${BOT}`} {...chalk} />
      {half(left, 'l')}
      {half(right, 'r')}

      {cells.map(({ i, x, y }) => {
        const can = canChoose(i), on = chosen === i;
        return (
          <g key={i}>
            {(hot === i || on) && <rect x={x + 4} y={y + 4} width={SQ - 8} height={SQ - 8} fill={on ? '#ffe08a' : '#f6d77a'} opacity={on ? 0.28 : 0.35} />}
            {spots(view.cells[i], { x: x + 12, y: y + 12, w: SQ - 24, h: SQ - 30 }, i).map((p, k) => <Pebble key={k} x={p.x} y={p.y} seed={i * 97 + k} />)}
            {view.cells[i] > 0 && <text x={x + SQ - 10} y={y + SQ - 8} textAnchor="end" fontSize={14} fill="#fff6dd" fontFamily="monospace" opacity={0.85}>{view.cells[i]}</text>}
            {can && !on && (
              <rect x={x} y={y} width={SQ} height={SQ} fill="transparent" className="cursor-pointer hover:fill-white/10" onClick={() => onChoose(i)}>
                <title>{label(i)}</title>
              </rect>
            )}
            {/* Chosen: tap a side to sow that way. */}
            {on && ([-1, 1] as Dir[]).map((dir) => (
              <g key={dir} className="cursor-pointer" onClick={() => onSow(i, dir)}>
                <rect x={dir === -1 ? x : x + SQ / 2} y={y} width={SQ / 2} height={SQ} fill="transparent" className="hover:fill-white/15" />
                <path d={dir === -1 ? `M${x + 32},${y + 32} l-16,18 l16,18` : `M${x + SQ - 32},${y + 32} l16,18 l-16,18`} {...chalk} stroke="#ffe08a" strokeWidth={6} />
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function OAnQuan({ link, onClose }: { link: MatchLink; onClose: () => void }) {
  const intl = useIntl();
  const me: Side = link.host ? 0 : 1;
  const [game, setGame] = useState<OanState>(() => initialOan());
  /** What's on screen: a step of a move playing out, or the game itself. */
  const [shown, setShown] = useState<OanState | null>(null);
  /** The square that just changed in the move playing out. */
  const [hot, setHot] = useState<number | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const timer = useRef(0);

  const animate = (steps: OanState[]) => {
    window.clearInterval(timer.current);
    let i = 0;
    setShown(steps[0] ?? null);
    timer.current = window.setInterval(() => {
      i += 1;
      if (i >= steps.length) { window.clearInterval(timer.current); setShown(null); setHot(null); return; }
      const changed = steps[i].cells.findIndex((n, k) => n !== steps[i - 1].cells[k]);
      setHot(changed >= 0 ? changed : null);
      setShown(steps[i]);
    }, STEP_MS);
  };
  useEffect(() => () => window.clearInterval(timer.current), []);

  const { start, left } = useMatch<true>(
    link,
    async () => true,
    (raw) => (raw === true ? true : null),
    (d) => {
      if (d.kind !== 'move' || d.move !== game.moves || game.turn === me) return;
      const r = playOan(game, Number(d.square), d.dir === -1 ? -1 : 1);
      if (r.state !== game) { setGame(r.state); animate(r.steps); }
    },
  );

  const playing = shown !== null;
  const myTurn = !!start && !game.over && game.turn === me && !playing;
  const play = (square: number, dir: Dir) => {
    if (!myTurn) return;
    const r = playOan(game, square, dir);
    if (r.state === game) return;
    link.send({ kind: 'move', move: game.moves, square, dir });
    setGame(r.state);
    setChosen(null);
    animate(r.steps);
  };

  const view = shown ?? game;
  const result = game.over && !playing ? oanResult(game, me) : null;
  useEffect(() => { if (result === 'won') playWin(); }, [result]);
  const them: Side = me === 0 ? 1 : 0;

  return (
    <MatchWindow
      link={link} icon="stones" title={<FormattedMessage id="world.oanTitle" />} onClose={onClose}
      turn={result ? null : !start ? null : game.turn === me ? 'me' : 'them'}
      mine={<FormattedMessage id="world.oanPoints" values={{ n: view.score[me] }} />}
      theirs={<FormattedMessage id="world.oanPoints" values={{ n: view.score[them] }} />}
      started={!!start} left={left} result={result}
    >
      <div className="mb-3 px-notch overflow-hidden">
        <OanBoard
          view={view}
          me={me}
          hot={hot}
          chosen={chosen}
          canChoose={(i) => myTurn && canPlay(game, i)}
          onChoose={setChosen}
          onSow={play}
          label={(i) => intl.formatMessage({ id: 'world.oanSquare' }, { n: view.cells[i] })}
        />
      </div>
      {!result && (
        <p className="text-[13px] text-center text-[var(--px-muted)]">
          <FormattedMessage id={playing ? 'world.oanSowing' : myTurn ? 'world.oanYourTurn' : 'world.oanTheirTurn'} values={{ name: link.peer.name }} />
        </p>
      )}
    </MatchWindow>
  );
}
