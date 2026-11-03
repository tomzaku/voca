import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import {
  checkAnswer,
  fetchTestImage,
  startTest,
  submitTest,
  type Answers,
  type Check,
  type Leader,
  type ReviewItem,
  type TestQuestion,
  type TestSummary,
} from '../lib/testsApi';
import { playCorrect, playSelect, playWin, playWrong } from '../lib/sfx';

// Taking a collection test, with no screen attached: the answers so far (kept
// on this device too), which question is up, the server's marks in an
// instant-feedback test, Start and hand-in. The app's test page and the
// world's classroom at Hai Bà Trưng each draw it their own way.

/** Answers so far live on this device too, so a refresh mid-test loses nothing. */
const draftKey = (id: string) => `voca:test-draft:${id}`;
function readDraft(id: string): Answers {
  try {
    const raw = localStorage.getItem(draftKey(id));
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Answers : {};
  } catch {
    return {};
  }
}
function writeDraft(id: string, answers: Answers | null) {
  try {
    if (answers) localStorage.setItem(draftKey(id), JSON.stringify(answers));
    else localStorage.removeItem(draftKey(id));
  } catch { /* private mode: the test still works, it just won't survive a refresh */ }
}

/** An answer as one line of text — a matching answer's words joined. */
export const shownAnswer = (a: string | string[] | undefined) => (Array.isArray(a) ? a.join(' · ') : a ?? '');

export function useTakeTest({ test, questions, initialChecked, onStarted, onDone }: {
  test: TestSummary;
  questions: TestQuestion[];
  /** Answers already marked, in an instant-feedback test. */
  initialChecked: Check[];
  onStarted: (test: TestSummary, questions: TestQuestion[], checked: Check[]) => void;
  onDone: (test: TestSummary, review: ReviewItem[], leaderboard: Leader[]) => void;
}) {
  const [answers, setAnswers] = useState<Answers>(() => readDraft(test.id));
  // -1 is the cover page; questions.length the hand-in page.
  const [at, setAt] = useState(-1);
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState<Record<string, Check>>(() => Object.fromEntries(initialChecked.map((c) => [c.questionId, c])));
  // The question just marked here — it gets the burst or the shake; one
  // marked on an earlier visit is shown quietly.
  const [fresh, setFresh] = useState<string | null>(null);
  const loadImage = useCallback((key: string) => fetchTestImage(test.id, key), [test.id]);
  const instant = test.instantFeedback;
  const isAnswered = (qid: string) => !!checked[qid] || !!shownAnswer(answers[qid]).trim();
  const answered = questions.filter((q) => isAnswered(q.id)).length;
  const rightSoFar = Object.values(checked).filter((c) => c.correct).length;

  const answer = async (q: TestQuestion, a: string | string[]) => {
    const next = { ...answers, [q.id]: a };
    setAnswers(next);
    writeDraft(test.id, next);
    if (!instant) {
      playSelect();
      setAt((i) => i + 1);
      return;
    }
    if (checked[q.id] || checking) return;
    setChecking(true);
    try {
      const c = await checkAnswer(test.id, q.id, a);
      setChecked((m) => ({ ...m, [q.id]: c }));
      setFresh(q.id);
      if (c.correct) playCorrect(); else playWrong();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setChecking(false);
    }
  };

  /** Right answers in a row, ending at question `i` — the streak shown after a hit. */
  const streakAt = (i: number) => {
    let n = 0;
    for (let k = i; k >= 0 && checked[questions[k].id]?.correct; k--) n++;
    return n;
  };

  // The server starts the clock and only then sends the questions. Pressing
  // Start again after a reload keeps the clock it already has.
  const begin = async () => {
    if (test.startedAt && questions.length) { setAt(0); return; }
    setStarting(true);
    try {
      const res = await startTest(test.id);
      setChecked(Object.fromEntries(res.checked.map((c) => [c.questionId, c])));
      onStarted(res.test, res.questions, res.checked);
      setAt(0);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setStarting(false);
    }
  };

  /** Hands it in, once — ask first if any are unanswered (`answered` < questions). */
  const handIn = async () => {
    setSending(true);
    try {
      const res = await submitTest(test.id, answers);
      writeDraft(test.id, null);
      playWin();
      onDone(res.test, res.review, res.leaderboard);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return {
    answers, at, setAt, checked, fresh, starting, checking, sending, instant,
    answered, rightSoFar, isAnswered, streakAt, loadImage, answer, begin, handIn,
  };
}
