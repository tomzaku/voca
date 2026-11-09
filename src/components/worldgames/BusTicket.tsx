import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { fetchQuestions, type WordQuestion } from '../../lib/questionsApi';
import { playSelect } from '../../lib/sfx';
import { PixelLoader } from './pixel';
import { WordQuestionCard } from './WordQuestion';

// A bus ticket, bought from the Travel drawer: the fare is one word. The
// conductor reads out a definition and you pick the word — right or wrong you
// get your ticket, once you've read the word explained (WordQuestionCard),
// and the bus takes you. The question comes from the server (lib/questionsApi), from the
// collection you're studying, its answer sealed until you choose. Nothing is
// written to your progress; it's a moment's practice, not a test. With no
// question to ask, the ride is free. Either way, ticket in hand, the bus comes
// by itself a moment later.

/** How long the bus takes to come once you have your ticket. */
const ARRIVES_MS = 2000;

type Stage =
  | { kind: 'loading' }
  | { kind: 'free' }
  | { kind: 'ask'; q: WordQuestion }
  | { kind: 'answered'; q: WordQuestion; correct: boolean; answer: string };

export function BusTicket({ stop, onBoard, onClose }: { stop: string; onBoard: () => void; onClose: () => void }) {
  const [stage, setStage] = useState<Stage>({ kind: 'loading' });

  useEffect(() => {
    let live = true;
    fetchQuestions(1).then((qs) => {
      if (!live) return;
      setStage(qs[0] ? { kind: 'ask', q: qs[0] } : { kind: 'free' });
    });
    return () => { live = false; };
  }, []);

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

        {stage.kind === 'ask' && (
          <WordQuestionCard
            q={stage.q}
            lead={<p className="text-[13px] text-[var(--px-muted)]"><FormattedMessage id="world.busAsk" /></p>}
            onAnswered={(correct, answer) => setStage({ kind: 'answered', q: stage.q, correct, answer })}
          />
        )}
        {stage.kind === 'answered' && (
          <>
            <p className="text-[14px] mb-3">
              {stage.correct
                ? <FormattedMessage id="world.busRight" />
                : <FormattedMessage id="world.busWrong" values={{ word: <b>{stage.answer}</b> }} />}
            </p>
            <BusComing />
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
