import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { buildMcq, loadQuizData, shuffle, type McqQuestion } from '../../lib/quizEngine';
import { WORD_LIST } from '../../lib/wordService';
import { playCorrect, playSelect, playWrong } from '../../lib/sfx';
import { PixelButton, PixelLoader } from './pixel';
import { useWorld } from './world';

// A bus ticket, bought from the Travel drawer: the fare is one word. The
// conductor reads out a definition and you pick the word — right or wrong you
// get your ticket (a wrong answer shows the right word), and the bus takes
// you. Nothing is written to your progress; it's a moment's practice, not a
// test. With no words to ask yet, the ride is free. Either way the bus comes
// by itself a moment later — no second button to press.

/** How long the bus takes to come once you have your ticket. */
const ARRIVES_MS = 2000;

type Stage =
  | { kind: 'loading' }
  | { kind: 'free' }
  | { kind: 'ask'; q: McqQuestion }
  | { kind: 'answered'; q: McqQuestion; picked: string };

export function BusTicket({ stop, onBoard, onClose }: { stop: string; onBoard: () => void; onClose: () => void }) {
  const { wordPool } = useWorld();
  // The word asked, picked once as the booth opens; no words, a free ride.
  const [word] = useState(() => wordPool[Math.floor(Math.random() * wordPool.length)] as string | undefined);
  const [stage, setStage] = useState<Stage>(() => (word ? { kind: 'loading' } : { kind: 'free' }));

  useEffect(() => {
    if (!word) return;
    let live = true;
    loadQuizData([word]).then(({ dataMap }) => {
      if (!live) return;
      const data = dataMap[word];
      const wrong = shuffle(WORD_LIST.map((w) => w.word).filter((w) => w !== word)).slice(0, 3);
      const q = data && buildMcq('definition', word, data, wrong);
      setStage(q ? { kind: 'ask', q } : { kind: 'free' });
    }).catch(() => live && setStage({ kind: 'free' }));
    return () => { live = false; };
  }, [word]);

  const pick = (q: McqQuestion, option: string) => {
    if (option === q.word) playCorrect(); else playWrong();
    setStage({ kind: 'answered', q, picked: option });
  };
  // Ticket in hand (or a free ride): the bus comes.
  // (The latest onBoard, so the parent re-rendering doesn't restart the wait.)
  const ticketed = stage.kind === 'answered' || stage.kind === 'free';
  const boardRef = useRef(onBoard);
  useEffect(() => { boardRef.current = onBoard; });
  useEffect(() => {
    if (!ticketed) return;
    const t = setTimeout(() => { playSelect(); boardRef.current(); }, ARRIVES_MS);
    return () => clearTimeout(t);
  }, [ticketed]);

  return (
    <div className="px absolute inset-0 z-40 flex items-center justify-center p-3 bg-black/30" onKeyDown={(e) => e.stopPropagation()}>
      <div className="px-notch px-frame w-full max-w-[420px] p-5 px-in-up">
        <p className="px-title !text-[18px] text-[var(--px-gold)] mb-0.5">🚌 <FormattedMessage id="world.busTicketTitle" /></p>
        <p className="text-[13px] text-[var(--px-muted)] mb-4">{stop}</p>

        {stage.kind === 'loading' && <PixelLoader label={<FormattedMessage id="world.busLoading" />} />}

        {stage.kind === 'free' && (
          <>
            <p className="text-[15px] mb-4"><FormattedMessage id="world.busFree" /></p>
            <BusComing />
          </>
        )}

        {(stage.kind === 'ask' || stage.kind === 'answered') && (
          <>
            <p className="text-[13px] text-[var(--px-muted)] mb-1"><FormattedMessage id="world.busAsk" /></p>
            <p className="px-inset px-notch p-3 text-[15px] leading-snug mb-3">{stage.q.prompt}</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {stage.q.options.map((o) => {
                const done = stage.kind === 'answered';
                const tone = !done ? 'paper' : o === stage.q.word ? 'good' : o === stage.picked ? 'bad' : 'paper';
                return (
                  <PixelButton key={o} tone={tone} disabled={done} onClick={() => pick(stage.q, o)} className="!text-[14px] !px-2">
                    {o}
                  </PixelButton>
                );
              })}
            </div>
            {stage.kind === 'answered' && (
              <>
                <p className="text-[14px] mb-3">
                  {stage.picked === stage.q.word
                    ? <FormattedMessage id="world.busRight" />
                    : <FormattedMessage id="world.busWrong" values={{ word: <b>{stage.q.word}</b> }} />}
                </p>
                <BusComing />
              </>
            )}
          </>
        )}

        {/* Until you have a ticket, you can still walk away. */}
        {!ticketed && stage.kind !== 'loading' && (
          <button onClick={onClose} className="mt-3 w-full text-center text-[13px] text-[var(--px-muted)] hover:text-[var(--px-text)]">
            <FormattedMessage id="world.busNotNow" />
          </button>
        )}
      </div>
    </div>
  );
}

/** The bus on its way: a line, and the moment it has left to arrive. */
function BusComing() {
  return (
    <div>
      <p className="px-title !text-[13px] text-[var(--px-gold)] mb-1.5"><FormattedMessage id="world.busComing" /></p>
      <div className="h-1.5 bg-[#0d0a08] overflow-hidden">
        <div className="h-full bg-[var(--px-gold)] origin-left" style={{ animation: `px-drain ${ARRIVES_MS}ms linear forwards` }} />
      </div>
    </div>
  );
}
