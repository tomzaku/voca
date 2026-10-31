import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useMatch } from '../../hooks/useMatch';
import { canPlay, initialOan, oanResult, playOan, type Dir, type OanState, type Side } from '../../lib/oAnQuan';
import { playWin } from '../../lib/sfx';
import type { MatchLink } from '../../lib/worldLive';
import { MatchWindow } from './MatchWindow';
import { PixelButton } from './pixel';

// Ô ăn quan with another player — the stone game (lib/oAnQuan). The host's
// row is 1–5 and the host goes first. Each of you sees the board from your
// own side: your row along the bottom, left to right, and "→" always sows
// towards your right. A move plays out stone by stone on both screens.

const STEP_MS = 170;

/** The squares as laid out for a side: top row, bottom row, left and right mandarins. */
const layout = (side: Side) => side === 0
  ? { top: [11, 10, 9, 8, 7], bottom: [1, 2, 3, 4, 5], left: 0, right: 6 }
  : { top: [5, 4, 3, 2, 1], bottom: [7, 8, 9, 10, 11], left: 6, right: 0 };

/** A square's stones: dots while they fit, then the count. */
function Stones({ n, big }: { n: number; big?: boolean }) {
  if (n === 0) return null;
  if (n > (big ? 12 : 8)) return <span className="px-num !text-[16px]">{n}</span>;
  return (
    <span className="flex flex-wrap justify-center gap-[3px] max-w-[44px]">
      {Array.from({ length: n }, (_, i) => <span key={i} className="w-[7px] h-[7px] bg-[#d8d0c0] shadow-[1px_1px_0_#0006]" />)}
    </span>
  );
}

export function OAnQuan({ link, onClose }: { link: MatchLink; onClose: () => void }) {
  const intl = useIntl();
  const me: Side = link.host ? 0 : 1;
  const [game, setGame] = useState<OanState>(() => initialOan());
  /** What's on screen: a step of a move playing out, or the game itself. */
  const [shown, setShown] = useState<OanState | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const timer = useRef(0);

  const animate = (steps: OanState[]) => {
    window.clearInterval(timer.current);
    let i = 0;
    setShown(steps[0] ?? null);
    timer.current = window.setInterval(() => {
      i += 1;
      if (i >= steps.length) { window.clearInterval(timer.current); setShown(null); return; }
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
  const { top, bottom, left: lq, right: rq } = layout(me);
  const them: Side = me === 0 ? 1 : 0;

  const square = (i: number, mine: boolean) => {
    const can = mine && myTurn && canPlay(game, i);
    return (
      <div key={i} className="relative">
        <button
          type="button"
          disabled={!can}
          onClick={() => setChosen(chosen === i ? null : i)}
          className={`px-inset px-notch w-full aspect-square flex items-center justify-center p-1 ${chosen === i ? 'outline outline-2 outline-[var(--px-gold)]' : can ? 'hover:bg-white/10 cursor-pointer' : ''}`}
          aria-label={intl.formatMessage({ id: 'world.oanSquare' }, { n: view.cells[i] })}
        >
          <Stones n={view.cells[i]} />
        </button>
        {chosen === i && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-10 flex gap-1">
            <PixelButton tone="gold" onClick={() => play(i, -1)} className="!px-2 !py-1 !text-[13px]" aria-label={intl.formatMessage({ id: 'world.oanLeft' })}>◀</PixelButton>
            <PixelButton tone="gold" onClick={() => play(i, 1)} className="!px-2 !py-1 !text-[13px]" aria-label={intl.formatMessage({ id: 'world.oanRight' })}>▶</PixelButton>
          </div>
        )}
      </div>
    );
  };
  const mandarin = (i: number, side: 'left' | 'right') => (
    <div className={`px-inset px-notch row-span-2 flex flex-col items-center justify-center gap-1.5 p-1 ${side === 'left' ? 'rounded-l-[40px]' : 'rounded-r-[40px]'}`}>
      {view.quan[i === 0 ? 0 : 1] && <span className="w-5 h-5 bg-[#c9a24a] shadow-[2px_2px_0_#0006]" title={intl.formatMessage({ id: 'world.oanQuan' })} />}
      <Stones n={view.cells[i]} big />
    </div>
  );

  return (
    <MatchWindow
      link={link} icon="stones" title={<FormattedMessage id="world.oanTitle" />} onClose={onClose}
      turn={result ? null : !start ? null : game.turn === me ? 'me' : 'them'}
      mine={<FormattedMessage id="world.oanPoints" values={{ n: view.score[me] }} />}
      theirs={<FormattedMessage id="world.oanPoints" values={{ n: view.score[them] }} />}
      started={!!start} left={left} result={result}
    >
      <div className="grid gap-1.5 mb-10" style={{ gridTemplateColumns: '1.1fr repeat(5, minmax(0, 1fr)) 1.1fr' }}>
        {mandarin(lq, 'left')}
        {top.map((i) => square(i, false))}
        {mandarin(rq, 'right')}
        {bottom.map((i) => square(i, true))}
      </div>
      {!result && (
        <p className="text-[13px] text-center text-[var(--px-muted)]">
          <FormattedMessage id={playing ? 'world.oanSowing' : myTurn ? 'world.oanYourTurn' : 'world.oanTheirTurn'} values={{ name: link.peer.name }} />
        </p>
      )}
    </MatchWindow>
  );
}
