import { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useMatch } from '../../hooks/useMatch';
import { playCorrect, playWin, playWrong } from '../../lib/sfx';
import { CARO_SECONDS, CARO_SMALL, caroQuestion, initialCaro, playCaro, type CaroBoard, type CaroState, type Mark } from '../../lib/wordCaro';
import { parseQuestions, type DuelQuestion } from '../../lib/wordDuel';
import type { MatchLink } from '../../lib/worldLive';
import { duelQuestions } from './duelQuestions';
import { MatchWindow, TurnBar } from './MatchWindow';
import { PixelButton } from './pixel';
import { useWorld } from './world';

// Word Caro with another player: tic-tac-toe where each square is won by
// answering a word question (lib/wordCaro). The host is ✕ and goes first.
// While one player answers, the other sees the same question — so both
// learn the word either way. `board` is 3×3 (three in a row) or the big 7×7
// (five in a row).

const MARK: Record<Mark, string> = { x: '✕', o: '◯' };

export function WordCaro({ link, onClose, board = CARO_SMALL }: { link: MatchLink; onClose: () => void; board?: CaroBoard }) {
  const { wordPool } = useWorld();
  const me: Mark = link.host ? 'x' : 'o';
  const [game, setGame] = useState<CaroState>(() => initialCaro(board.size));
  /** The square being answered for, by whoever's turn it is. */
  const [asking, setAsking] = useState<{ cell: number; since: number } | null>(null);
  /** The last answer, to flash right or wrong on its square. */
  const [flash, setFlash] = useState<{ cell: number; correct: boolean; option: string | null } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [questions, setQuestions] = useState<DuelQuestion[] | null>(null);

  const { left } = useMatch<DuelQuestion[]>(
    link,
    () => duelQuestions(wordPool, board.questions),
    (raw) => parseQuestions(raw, board.questions),
    (d) => {
      if (!questions) return;
      if (d.kind === 'pick' && Number.isInteger(d.cell) && d.move === game.moves && game.turn !== me) setAsking({ cell: Number(d.cell), since: Date.now() });
      else if (d.kind === 'move' && d.move === game.moves && game.turn !== me) {
        const option = typeof d.option === 'string' ? d.option : null;
        const r = playCaro(game, { cell: Number(d.cell), option }, caroQuestion(questions, game.moves), board);
        if (r.state !== game) { setGame(r.state); setFlash({ cell: Number(d.cell), correct: r.correct, option }); setAsking(null); }
      }
    },
    setQuestions,
  );

  const myTurn = !!questions && !game.winner && game.turn === me;
  const q = questions && asking ? caroQuestion(questions, game.moves) ?? null : null;

  const pick = (cell: number) => {
    if (!myTurn || asking || game.board[cell]) return;
    setAsking({ cell, since: Date.now() });
    setFlash(null);
    link.send({ kind: 'pick', move: game.moves, cell });
  };
  const answer = (option: string | null) => {
    if (!questions || !asking || !myTurn) return;
    const r = playCaro(game, { cell: asking.cell, option }, caroQuestion(questions, game.moves), board);
    if (r.correct) playCorrect(); else playWrong();
    link.send({ kind: 'move', move: game.moves, cell: asking.cell, option });
    setFlash({ cell: asking.cell, correct: r.correct, option });
    setGame(r.state);
    setAsking(null);
  };

  // My clock: the bar, and running out of time.
  useEffect(() => {
    if (!asking) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (myTurn && n - asking.since >= CARO_SECONDS * 1000) answer(null);
    }, 100);
    return () => clearInterval(t);
  });

  const result = game.winner ? (game.winner === 'draw' ? 'draw' : game.winner === me ? 'won' : 'lost') : null;
  useEffect(() => { if (result === 'won') playWin(); }, [result]);
  const count = (m: Mark) => game.board.filter((c) => c === m).length;
  const name = link.peer.name;

  return (
    <MatchWindow
      link={link} icon="grid" title={<FormattedMessage id={board.size > 3 ? 'world.caroBigTitle' : 'world.caroTitle'} />} onClose={onClose}
      turn={result ? null : myTurn ? 'me' : questions ? 'them' : null}
      mine={<>{MARK[me]} · {count(me)}</>} theirs={<>{MARK[me === 'x' ? 'o' : 'x']} · {count(me === 'x' ? 'o' : 'x')}</>}
      started={!!questions} left={left} result={result}
    >
      <div className={`grid mx-auto mb-3 ${board.size > 3 ? 'gap-1' : 'gap-1.5'}`} style={{ gridTemplateColumns: `repeat(${board.size}, minmax(0, 1fr))`, maxWidth: board.size > 3 ? 340 : 260 }}>
        {game.board.map((c, i) => {
          const lit = game.line?.includes(i), hot = asking?.cell === i, flashed = flash?.cell === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              disabled={!myTurn || !!asking || !!c}
              className={`px-inset px-notch aspect-square flex items-center justify-center px-title ${board.size > 3 ? '!text-[18px]' : '!text-[34px]'} ${lit ? 'bg-[var(--px-gold)]/35' : hot ? 'outline outline-2 outline-[var(--px-gold)]' : ''} ${myTurn && !asking && !c ? 'hover:bg-white/10 cursor-pointer' : ''}`}
              style={{ color: c === 'x' ? 'var(--px-sky)' : c === 'o' ? 'var(--px-bad)' : flashed && !flash.correct ? 'var(--px-muted)' : undefined }}
            >
              {c ? MARK[c] : flashed && !flash.correct ? '·' : ''}
            </button>
          );
        })}
      </div>

      {q && asking ? (
        <>
          <TurnBar since={asking.since} seconds={CARO_SECONDS} now={now} />
          <p className="text-[13px] text-[var(--px-muted)] mb-1">
            {myTurn ? <FormattedMessage id="world.caroYourQuestion" /> : <FormattedMessage id="world.caroTheirQuestion" values={{ name }} />}
          </p>
          <p className="px-inset px-notch p-3 text-[15px] leading-snug mb-3">{q.prompt}</p>
          <div className="grid grid-cols-2 gap-2">
            {q.options.map((o) => (
              <PixelButton key={o} tone="paper" disabled={!myTurn} onClick={() => answer(o)} className="!text-[14px] !px-2">{o}</PixelButton>
            ))}
          </div>
        </>
      ) : (
        <p className="text-[14px] text-center text-[var(--px-muted)] min-h-[2.5rem]">
          {flash && questions && (
            <span style={{ color: flash.correct ? 'var(--px-jade)' : 'var(--px-bad)' }}>
              <FormattedMessage id={flash.correct ? 'world.caroRight' : 'world.caroWrong'} values={{ word: caroQuestion(questions, game.moves - 1)?.word ?? '' }} />{' '}
            </span>
          )}
          {!game.winner && <FormattedMessage id={myTurn ? 'world.caroPick' : 'world.caroWait'} values={{ name }} />}
        </p>
      )}
    </MatchWindow>
  );
}
