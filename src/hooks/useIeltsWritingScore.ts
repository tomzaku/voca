import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useIntl } from 'react-intl';
import { useAuth } from './useAuth';
import { useIsPro } from './useProStatus';
import { callAiAction } from '../lib/aiProviders';
import { ApiError } from '../lib/api';
import { saveIeltsSubmission } from '../lib/ieltsSubmissionsApi';
import { parseIeltsScoreResult, type IeltsScoreResult } from '../lib/ieltsScoreResult';
import type { IeltsWritingQuestion } from '../data/ieltsWriting';

// Scoring an IELTS essay, headless — the Writing page's IELTS tab and the
// world's exam hall both mark through this. It's a paid Pro action: a locked
// account gets a nudge instead of a call, the score is saved to the user's
// history, and every failure is a toast because the learner is waiting on it.

/** Below this many words there's nothing for an examiner to mark. */
export const IELTS_MIN_TO_SCORE = 20;

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function useIeltsWritingScore() {
  const intl = useIntl();
  const { user } = useAuth();
  const { isPro, loading: proLoading } = useIsPro();
  const locked = !proLoading && !isPro;
  const [result, setResult] = useState<IeltsScoreResult | null>(null);
  const [scoring, setScoring] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const reset = () => { abortRef.current?.abort(); setResult(null); setScoring(false); };

  const score = async (question: IeltsWritingQuestion, essay: string) => {
    if (locked) {
      toast(intl.formatMessage({ id: user ? 'writing.ieltsProFeature' : 'writing.ieltsSignInPro' }), { icon: '👑' });
      return;
    }
    if (wordCount(essay) < IELTS_MIN_TO_SCORE) { toast.error(intl.formatMessage({ id: 'writing.ieltsWriteMore' })); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setScoring(true);
    setResult(null);
    try {
      const text = await callAiAction(
        'ielts_writing',
        {
          task: question.task,
          prompt: question.prompt,
          dataDescription: question.dataDescription ?? undefined,
          essay: essay.trim(),
        },
        { signal: controller.signal },
      );
      const parsed = parseIeltsScoreResult(text);
      if (!parsed) { toast.error(intl.formatMessage({ id: 'writing.ieltsParseFailed' })); return; }
      setResult(parsed);
      try {
        await saveIeltsSubmission({ questionId: question.id, essay: essay.trim(), ...parsed });
      } catch {
        toast(intl.formatMessage({ id: 'writing.ieltsSaveFailed' }), { icon: '⚠️' });
      }
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else if ((err as Error).name !== 'AbortError') toast.error(intl.formatMessage({ id: 'writing.aiUnreachable' }));
    } finally {
      setScoring(false);
    }
  };

  return { score, scoring, result, reset, locked };
}
