import { FormattedMessage } from 'react-intl';
import { useMatchBoard, type MatchCardState } from '../../../hooks/useMatchBoard';
import type { QuizPair } from '../../../lib/quizEngine';
import { PixelButton, PixelIcon } from '.';

// The world's match board: the same round as the Quiz page's MatchBoard (both
// run on useMatchBoard), drawn as a pixel game. Instead of ink lines, a linked
// word and definition carry the same numbered seal, which reads at any size
// and needs no DOM measuring.

const SEALS = ['#e2b240', '#4f9c86', '#5b8fd6', '#c86b9b', '#d9823b'];

export function PixelMatchBoard({ pairs, reveal, onComplete }: {
  pairs: QuizPair[];
  reveal: boolean;
  onComplete: (mistakes: number, links: Record<string, string>) => void;
}) {
  const board = useMatchBoard(pairs, reveal, onComplete);
  const { rightPairs, linkedCount, allLinked, mistakes, revealed, done, tap, submit, finish, cardState, linkOf } = board;
  // Seal number = the left word's position, so each pair keeps its colour.
  const sealOf = (side: 'L' | 'R', word: string) => {
    const left = linkOf(side, word);
    return left === undefined ? -1 : pairs.findIndex((p) => p.word === left);
  };

  const card = (side: 'L' | 'R', word: string, text: string) => {
    const state: MatchCardState = cardState(side, word);
    const seal = sealOf(side, word);
    const ring = state === 'correct' ? 'var(--px-good)' : state === 'wrong' ? 'var(--px-bad)' : state === 'active' ? 'var(--px-select)' : undefined;
    return (
      <button
        key={word}
        onClick={() => tap(side, word)}
        disabled={revealed}
        data-on={state === 'active'}
        className={`px-pick px-notch w-full text-left px-3 py-2.5 flex items-start gap-2 ${state === 'wrong' ? 'px-shake' : ''}`}
        style={ring ? { boxShadow: `inset 0 0 0 2px var(--px-ink), inset 0 0 0 4px ${ring}` } : undefined}
      >
        <span
          className="w-4 h-4 shrink-0 mt-0.5 flex items-center justify-center px-title !text-[9px] text-[#1a120c]"
          style={{
            background: seal >= 0 ? SEALS[seal % SEALS.length] : 'transparent',
            boxShadow: 'inset 0 0 0 2px var(--px-ink)',
          }}
        >
          {seal >= 0 ? seal + 1 : ''}
        </span>
        <span className={side === 'L' ? 'px-title !text-[16px]' : 'text-[14px] leading-snug'}>{text}</span>
      </button>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-[2fr_3fr] gap-2">
        <div className="space-y-2">{pairs.map((p) => card('L', p.word, p.word))}</div>
        <div className="space-y-2">{rightPairs.map((p) => card('R', p.word, p.definition))}</div>
      </div>

      <div className="mt-4">
        {!revealed ? (
          <PixelButton tone="jade" block onClick={submit} disabled={!allLinked}>
            {!allLinked
              ? <FormattedMessage id="quiz.match.connectAll" values={{ linked: linkedCount, total: pairs.length }} />
              : <FormattedMessage id={reveal ? 'quiz.match.checkAnswers' : 'quiz.match.submit'} />}
          </PixelButton>
        ) : (
          <div className="text-center">
            <p className={`px-title mb-3 flex items-center justify-center gap-1.5 ${mistakes === 0 ? 'text-[var(--px-good)]' : 'text-[var(--px-bad)]'}`}>
              <PixelIcon name={mistakes === 0 ? 'check' : 'close'} size={2} />
              {mistakes === 0
                ? <FormattedMessage id="quiz.match.allCorrect" />
                : <FormattedMessage id="quiz.match.someWrong" values={{ count: mistakes }} />}
            </p>
            <PixelButton block onClick={finish} disabled={done}>
              <FormattedMessage id="quiz.match.continue" />
            </PixelButton>
          </div>
        )}
      </div>
    </div>
  );
}
