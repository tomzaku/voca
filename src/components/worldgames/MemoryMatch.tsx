import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useMatch } from '../../hooks/useMatch';
import { MEMORY_PAIRS, flip, initialMemory, layMemory, parseLayout, type MemoryCard, type MemoryState, type Seat } from '../../lib/memoryMatch';
import { playCorrect, playWin } from '../../lib/sfx';
import type { MatchLink } from '../../lib/worldLive';
import { memoryWords } from './duelQuestions';
import { MatchWindow } from './MatchWindow';
import { useWorld } from './world';

// Memory Match (lật thẻ) with another player (lib/memoryMatch): find each
// English word's meaning among sixteen cards face down. The host lays them
// out from the host's own words and turns first; a miss stays face up for a
// moment, so both of you can try to remember where it was.

const PEEK_MS = 1600;

export function MemoryMatch({ link, onClose }: { link: MatchLink; onClose: () => void }) {
  const { wordPool } = useWorld();
  const me: Seat = link.host ? 0 : 1;
  const them: Seat = me === 0 ? 1 : 0;
  const [game, setGame] = useState<MemoryState | null>(null);
  /** The two cards of a miss, while they're still showing. */
  const [peek, setPeek] = useState<[number, number] | null>(null);
  const peekTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(peekTimer.current), []);

  /** A flip played: show a miss for a moment, cheer a pair. */
  const apply = (next: MemoryState, prev: MemoryState) => {
    setGame(next);
    if (next.missed && next.missed !== prev.missed) {
      setPeek(next.missed);
      window.clearTimeout(peekTimer.current);
      peekTimer.current = window.setTimeout(() => setPeek(null), PEEK_MS);
    } else if (next.pairs[0] + next.pairs[1] > prev.pairs[0] + prev.pairs[1]) {
      setPeek(null);
      playCorrect();
    } else setPeek(null);
  };

  const { start, left } = useMatch<MemoryCard[]>(
    link,
    async () => layMemory(await memoryWords(wordPool, MEMORY_PAIRS)),
    parseLayout,
    (d) => {
      if (!game || d.kind !== 'flip' || d.n !== game.flips) return;
      const next = flip(game, them, Number(d.card));
      if (next !== game) apply(next, game);
    },
    (cards) => setGame(initialMemory(cards)),
  );

  const myTurn = !!game && !game.over && game.turn === me;
  const turn = (i: number) => {
    if (!game || !myTurn || peek) return;
    const next = flip(game, me, i);
    if (next === game) return;
    link.send({ kind: 'flip', n: game.flips, card: i });
    apply(next, game);
  };

  const result = game?.over ? (game.pairs[me] > game.pairs[them] ? 'won' : game.pairs[me] < game.pairs[them] ? 'lost' : 'draw') : null;
  useEffect(() => { if (result === 'won') playWin(); }, [result]);
  const name = link.peer.name;

  return (
    <MatchWindow
      link={link} icon="memory" title={<FormattedMessage id="world.memoryTitle" />} onClose={onClose}
      turn={!game || result ? null : myTurn ? 'me' : 'them'}
      mine={game && <FormattedMessage id="world.memoryPairs" values={{ n: game.pairs[me] }} />}
      theirs={game && <FormattedMessage id="world.memoryPairs" values={{ n: game.pairs[them] }} />}
      started={!!start && !!game} left={left} result={result}
    >
      {game && (
        <>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {game.cards.map((c, i) => {
              const owner = game.owner[i];
              const up = owner !== null || game.open === i || peek?.includes(i);
              const tone = owner === me ? 'var(--px-gold)' : owner === them ? 'var(--px-sky)' : undefined;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => turn(i)}
                  disabled={!myTurn || up || !!peek}
                  className={`px-notch aspect-[4/5] p-1 flex items-center justify-center text-center leading-tight transition-transform ${up ? 'bg-[#f6f0e2] text-[#2b1a10] border-2' : 'border-2 border-[#5b1f1a] bg-[repeating-linear-gradient(45deg,#2f6b45_0_5px,#25573a_5px_10px)]'} ${myTurn && !up && !peek ? 'hover:-translate-y-0.5 cursor-pointer' : ''} ${peek?.includes(i) ? 'outline outline-2 outline-[var(--px-bad)]' : ''}`}
                  style={up ? { borderColor: tone ?? '#2b1a10', boxShadow: tone ? `inset 0 0 0 2px ${tone}` : undefined } : undefined}
                >
                  {up && (c.kind === 'word'
                    ? <span className="px-title !text-[13px] sm:!text-[15px] break-words">{c.text}</span>
                    : <span className="text-[10px] sm:text-[11px] line-clamp-5">{c.text}</span>)}
                </button>
              );
            })}
          </div>
          {!result && (
            <p className="text-[13px] text-center text-[var(--px-muted)]">
              <FormattedMessage id={myTurn ? (game.open === null ? 'world.memoryPickFirst' : 'world.memoryPickSecond') : 'world.memoryWait'} values={{ name }} />
            </p>
          )}
        </>
      )}
    </MatchWindow>
  );
}
