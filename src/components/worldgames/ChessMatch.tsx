import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Chess, type Square } from 'chess.js';
import { useMatch } from '../../hooks/useMatch';
import { mySide, outcome, parseMove, parseStart, play, targets, type ChessMove, type ChessStart, type Side } from '../../lib/chessMatch';
import type { MatchLink } from '../../lib/worldLive';
import { playCorrect, playWin, playWrong } from '../../lib/sfx';
import { MatchWindow } from './MatchWindow';
import { PixelButton } from './pixel';

// Chess with another player in Huế, on a wooden board turned your way: tap
// one of your pieces to see where it can go, then where it goes. The rules
// are chess.js's (lib/chessMatch checks what comes over the wire); each move
// carries its number, so one arriving late or twice is let go. A pawn at the
// far end becomes a queen. Resign ends it. Nothing is written to progress.

const FILES = 'abcdefgh';

/** The pieces in square pixels, drawn here — a chess set of its own. */
const PIECE: Record<string, string[]> = {
  p: ['....##....', '...####...', '...####...', '....##....', '...####...', '..######..', '.########.'],
  r: ['.##.##.##.', '.########.', '..######..', '..######..', '..######..', '.########.', '##########'],
  n: ['...###....', '..#####...', '.###.###..', '.#######..', '....####..', '...#####..', '..######..', '.########.'],
  b: ['....##....', '...#..#...', '...##.#...', '...####...', '....##....', '...####...', '..######..', '.########.'],
  q: ['.#..##..#.', '.##.##.##.', '.########.', '..######..', '...####...', '..######..', '.########.'],
  k: ['....##....', '...####...', '....##....', '.########.', '..######..', '...####...', '..######..', '.########.'],
};

function Piece({ type, color }: { type: string; color: Side }) {
  const rows = PIECE[type];
  const fill = color === 'w' ? '#f6eedc' : '#2a1d16';
  const edge = color === 'w' ? '#5a4030' : '#d8c8a8';
  return (
    <svg viewBox={`-1 -1 12 ${rows.length + 2}`} className="w-[78%] h-[78%]" shapeRendering="crispEdges" aria-hidden
      style={{ filter: `drop-shadow(1px 0 0 ${edge}) drop-shadow(-1px 0 0 ${edge}) drop-shadow(0 1px 0 ${edge}) drop-shadow(0 -1px 0 ${edge})` }}>
      {rows.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={fill} /> : null)))}
    </svg>
  );
}

export function ChessMatch({ link, onClose }: { link: MatchLink; onClose: () => void }) {
  // The moves so far; the board is them played out (which also keeps the
  // history chess.js needs to see a position come round three times).
  const [played, setPlayed] = useState<ChessMove[]>([]);
  const g = useMemo(() => { const c = new Chess(); for (const m of played) play(c, m); return c; }, [played]);
  /** The board after `m`, or null if it isn't legal now. */
  const after = (m: ChessMove) => { const c = new Chess(); for (const p of played) play(c, p); return play(c, m) ? c : null; };
  const [side, setSide] = useState<Side | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [last, setLast] = useState<{ from: string; to: string } | null>(null);
  const [resigned, setResigned] = useState<'me' | 'them' | null>(null);

  const { left } = useMatch<ChessStart>(
    link,
    async () => ({ hostWhite: Math.random() < 0.5 }),
    parseStart,
    (d) => {
      if (d.kind === 'resign') { setResigned('them'); return; }
      if (d.kind !== 'move' || d.n !== played.length || !side || g.turn() === side) return;
      const m = parseMove(d);
      const next = m && after(m);
      if (!m || !next) return;
      setPlayed([...played, m]); setLast({ from: m.from, to: m.to }); setPicked(null);
      if (next.inCheck()) playWrong();
    },
    (start) => setSide(mySide(link.host, start)),
  );

  const end = outcome(g);
  const over = end.kind !== 'playing' || resigned !== null;
  const myTurn = !!side && !over && g.turn() === side;
  const result = resigned === 'me' ? 'lost' : resigned === 'them' ? 'won'
    : end.kind === 'checkmate' ? (end.winner === side ? 'won' : 'lost') : end.kind === 'draw' ? 'draw' : null;
  useEffect(() => { if (result === 'won') playWin(); }, [result]);

  const moves = picked ? targets(g, picked) : [];
  const tap = (sq: string) => {
    if (!myTurn) return;
    const piece = g.get(sq as Square);
    if (picked && moves.includes(sq)) {
      const m = { from: picked, to: sq };
      if (after(m)) {
        link.send({ kind: 'move', n: played.length, ...m });
        playCorrect();
        setPlayed([...played, m]); setLast(m);
      }
      setPicked(null);
    } else setPicked(piece && piece.color === side ? sq : null);
  };
  const resign = () => { link.send({ kind: 'resign' }); setResigned('me'); };

  // The board turned your way: your pieces at the bottom.
  const ranks = side === 'b' ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const files = side === 'b' ? [...FILES].reverse() : [...FILES];
  const checkAt = g.inCheck() ? g.findPiece({ type: 'k', color: g.turn() })[0] : null;
  const name = link.peer.name;

  return (
    <MatchWindow
      link={link} icon="knight" title={<FormattedMessage id="world.chessTitle" />} onClose={onClose}
      turn={result ? null : myTurn ? 'me' : side ? 'them' : null}
      mine={side && <FormattedMessage id={side === 'w' ? 'world.chessWhite' : 'world.chessBlack'} />}
      theirs={side && <FormattedMessage id={side === 'w' ? 'world.chessBlack' : 'world.chessWhite'} />}
      started={!!side} left={left} result={result}
    >
      <div className="grid grid-cols-8 mx-auto mb-3 border-4 border-[#3a2418] select-none" style={{ maxWidth: 360 }}>
        {ranks.flatMap((r) => files.map((f) => {
          const sq = `${f}${r}`;
          const piece = g.get(sq as Square);
          const dark = (FILES.indexOf(f) + r) % 2 === 0;
          const target = moves.includes(sq);
          const lit = last && (last.from === sq || last.to === sq);
          return (
            <button
              key={sq}
              type="button"
              onClick={() => tap(sq)}
              aria-label={sq}
              className="relative aspect-square flex items-center justify-center"
              style={{ background: sq === picked ? '#d6b04a' : sq === checkAt ? '#c8483a' : lit ? (dark ? '#a89048' : '#d8c47a') : dark ? '#a8744a' : '#e8d2a6' }}
            >
              {piece && <Piece type={piece.type} color={piece.color} />}
              {target && <span className={`absolute ${piece ? 'inset-0.5 border-[3px] border-black/35' : 'w-[28%] h-[28%] bg-black/30'}`} />}
            </button>
          );
        }))}
      </div>
      {!result ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[14px] text-[var(--px-muted)]">
            {g.inCheck() && myTurn && <span className="text-[var(--px-bad)] font-bold mr-1"><FormattedMessage id="world.chessCheck" /></span>}
            <FormattedMessage id={myTurn ? 'world.chessYourMove' : 'world.chessTheirMove'} values={{ name }} />
          </p>
          <PixelButton tone="paper" onClick={resign} className="!px-3 !py-1.5 !text-[13px]"><FormattedMessage id="world.chessResign" /></PixelButton>
        </div>
      ) : (
        end.kind === 'draw' && <p className="text-[14px] text-center text-[var(--px-muted)]"><FormattedMessage id={`world.chessDraw.${end.why}`} /></p>
      )}
    </MatchWindow>
  );
}
