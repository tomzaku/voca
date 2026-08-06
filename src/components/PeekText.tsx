import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { peekWord, useWordPeek } from '../hooks/useWordPeek';
import { answerRegex } from '../lib/answerMask';

/**
 * Prose whose individual words open their own meaning when you rest on them.
 *
 * A definition or an example sentence is where an unknown word actually stops a
 * learner — but every word can't be a button without turning a sentence into a
 * wall of chips. So the text stays plain text, and simply resting the pointer
 * on a word for a moment opens the peek popup for it. No click, no press: the
 * gesture is "I'm looking at this one".
 *
 * The short delay is what keeps it from firing while you read — a cursor
 * crossing a line of text doesn't linger anywhere — and the rainbow makes the
 * one word that's arming itself unmistakable.
 *
 * Used in revealed mode only — while guessing, the definition is masked and
 * looking words up in it would hand over the answer.
 */

/** How long the pointer must rest on a word before its meaning opens. */
const HOVER_MS = 700;
/** How long the same word stays inert after opening — see `enter`. */
const COOLDOWN_MS = 900;

/** Word-ish runs, keeping internal apostrophes and hyphens ("don't", "well-known"). */
const WORD_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

interface Segment {
  text: string;
  /** The card's own word — highlighted, and inert: you're on it already. */
  isAnswer: boolean;
}

/** Split text around the answer word and its inflections, preserving order. */
function splitOnAnswer(text: string, answer?: string): Segment[] {
  const re = answer ? answerRegex(answer) : null;
  if (!re) return [{ text, isAnswer: false }];
  const out: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), isAnswer: false });
    out.push({ text: m[0], isAnswer: true });
    last = m.index + m[0].length;
    if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-length matches
  }
  if (last < text.length) out.push({ text: text.slice(last), isAnswer: false });
  return out;
}

export function PeekText({ text, highlight, boldHighlight = false, className = '' }: {
  text: string;
  /** The card's word (and its inflections) — left inert wherever it appears. */
  highlight?: string;
  /** Also render those matches bold and purple, as the examples list does. */
  boldHighlight?: boolean;
  className?: string;
}) {
  const segments = useMemo(() => splitOnAnswer(text, highlight), [text, highlight]);

  // Which word is arming, as its render key — restarting on a new word restarts
  // the animation from zero rather than continuing the previous sweep.
  const [arming, setArming] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  /** The word that last opened a popup, and when — see the cooldown in `enter`. */
  const fired = useRef<{ key: string; at: number } | null>(null);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setArming(null);
  }, []);

  useEffect(() => cancel, [cancel]);

  const enter = (key: string, word: string, e: React.PointerEvent<HTMLSpanElement>) => {
    // A popup already open covers the text, so nothing behind it should arm.
    if (useWordPeek.getState().word) return;
    // Dismissing the popup can re-expose the very word that opened it under a
    // motionless cursor, which some browsers report as a fresh enter. Without
    // this the popup would reopen itself two seconds after being closed.
    const last = fired.current;
    if (last && last.key === key && Date.now() - last.at < COOLDOWN_MS) return;

    const el = e.currentTarget;
    if (timer.current !== null) clearTimeout(timer.current);
    setArming(key);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setArming(null);
      fired.current = { key, at: Date.now() };
      // A short buzz where the platform supports it — on a phone the finger is
      // covering the word, so the animation finishing isn't necessarily visible.
      navigator.vibrate?.(15);
      peekWord(word, el);
    }, HOVER_MS);
  };

  // The duration lives in one place: this custom property drives both the
  // rainbow sweep on the word and the progress bar under it.
  const armingStyle = { '--peek-ms': `${HOVER_MS}ms` } as CSSProperties;

  let key = 0;
  const nodes: ReactNode[] = [];
  for (const seg of segments) {
    if (seg.isAnswer) {
      nodes.push(
        boldHighlight
          ? <strong key={`a${key++}`} className="font-extrabold text-accent-purple">{seg.text}</strong>
          : <span key={`a${key++}`}>{seg.text}</span>,
      );
      continue;
    }
    // Plain prose: every word becomes its own target, punctuation and spacing
    // pass through untouched so the sentence reads normally.
    let last = 0;
    for (const m of seg.text.matchAll(WORD_RE)) {
      const at = m.index;
      if (at > last) nodes.push(seg.text.slice(last, at));
      const word = m[0];
      const k = `w${key++}`;
      nodes.push(
        <span
          key={k}
          className={`peek-word ${arming === k ? 'is-arming' : ''}`}
          style={arming === k ? armingStyle : undefined}
          onPointerEnter={(e) => enter(k, word, e)}
          onPointerLeave={cancel}
          onPointerCancel={cancel}
        >
          {word}
        </span>,
      );
      last = at + word.length;
    }
    if (last < seg.text.length) nodes.push(seg.text.slice(last));
  }

  // Scrolling away from a word the pointer never leaves would otherwise arm it
  // under a finger that's long gone.
  return (
    <span className={className} onPointerLeave={cancel}>
      {nodes}
    </span>
  );
}
