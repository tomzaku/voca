import { useState } from 'react';
import { checkAnswer, type WordQuestion } from '../../lib/questionsApi';
import { playCorrect, playWrong } from '../../lib/sfx';
import { PixelButton, type PixelTone } from './pixel';

/**
 * One question: the prompt and four options. Choosing asks the server
 * whether it was right — this device doesn't know — then shows the answer
 * and calls `onAnswered` a moment later.
 */
export function WordQuestionCard({ q, onAnswered, lead }: {
  q: WordQuestion;
  onAnswered: (correct: boolean, answer: string) => void;
  /** A line above the prompt: what the question is for. */
  lead?: React.ReactNode;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; answer: string } | null>(null);

  const pick = async (o: string) => {
    if (picked) return;
    setPicked(o);
    const r = await checkAnswer(q.token, o);
    // Couldn't check (offline, expired): counted as wrong, with no answer to show.
    const res = r ?? { correct: false, answer: '' };
    setResult(res);
    if (res.correct) playCorrect(); else playWrong();
    window.setTimeout(() => onAnswered(res.correct, res.answer), 1100);
  };

  const tone = (o: string): PixelTone => {
    if (!picked) return 'paper';
    if (!result) return o === picked ? 'gold' : 'paper';
    if (result.answer && o.toLowerCase() === result.answer.toLowerCase()) return 'good';
    return o === picked ? 'bad' : 'paper';
  };

  return (
    <div className="space-y-2">
      {lead}
      <p className="px-inset px-notch p-3 text-[15px] leading-snug">{q.prompt}</p>
      <div className="grid grid-cols-2 gap-2">
        {q.options.map((o) => (
          <PixelButton key={o} tone={tone(o)} block onClick={() => void pick(o)} disabled={!!picked} className="!py-2 !text-[14px] !px-2">
            {o}
          </PixelButton>
        ))}
      </div>
    </div>
  );
}
