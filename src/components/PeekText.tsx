import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { peekWord, useWordPeek } from '../hooks/useWordPeek';
import { answerRegex } from '../lib/answerMask';
import { warmWordData } from '../lib/wordService';

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

/** Mouse: how long the pointer must rest on a word before its meaning opens. */
const HOVER_MS = 700;
/**
 * When to start fetching the word, well before the popup is due to open.
 *
 * A word that isn't cached takes a server round trip, so opening the popup at
 * the end of the dwell and only then asking means the learner watches a
 * skeleton for the whole fetch. Firing the request part-way through the dwell
 * spends the rest of it usefully — often the data is there by the time the
 * popup appears. It's short enough to still be a rest rather than a pass-over,
 * and a warm-up costs nothing for a word this device already holds.
 */
const WARM_MS = 200;
/**
 * Touch: how long a finger must stay on the word. Touch has no hover — a
 * finger is either down or gone — so the gesture there is a deliberate press
 * and hold, on the usual long-press timing, not a dwell.
 */
const HOLD_MS = 500;
/** Finger drift (px) that means the touch was a scroll, not a hold. */
const MOVE_TOLERANCE = 12;
/** How long the same word stays inert after opening — see `start`. */
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

  // Which word is arming and for how long — the duration travels with it so the
  // progress bar under a held word is honest about the shorter touch timing.
  const [arming, setArming] = useState<{ key: string; ms: number } | null>(null);
  const timer = useRef<number | null>(null);
  /** The earlier, quieter timer: fetches the word, doesn't open anything. */
  const warmTimer = useRef<number | null>(null);
  /** The in-flight gesture: touch holds cancel on drift, mouse dwells don't. */
  const gesture = useRef<{ touch: boolean; x: number; y: number } | null>(null);
  /** The word that last opened a popup, and when — see the cooldown in `start`. */
  const fired = useRef<{ key: string; at: number } | null>(null);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    // Only the pending fetch is cancellable; one already sent stays sent — its
    // answer lands in the cache either way, which is the point of warming.
    if (warmTimer.current !== null) {
      clearTimeout(warmTimer.current);
      warmTimer.current = null;
    }
    gesture.current = null;
    setArming(null);
  }, []);

  useEffect(() => cancel, [cancel]);

  const start = (key: string, word: string, e: React.PointerEvent<HTMLSpanElement>) => {
    // A popup already open covers the text, so nothing behind it should arm.
    if (useWordPeek.getState().word) return;
    // Dismissing the popup can re-expose the very word that opened it under a
    // motionless cursor, which some browsers report as a fresh enter. Without
    // this the popup would reopen itself a moment after being closed.
    const last = fired.current;
    if (last && last.key === key && Date.now() - last.at < COOLDOWN_MS) return;

    const touch = e.pointerType !== 'mouse';
    const ms = touch ? HOLD_MS : HOVER_MS;
    const el = e.currentTarget;
    if (timer.current !== null) clearTimeout(timer.current);
    if (warmTimer.current !== null) clearTimeout(warmTimer.current);
    gesture.current = { touch, x: e.clientX, y: e.clientY };
    setArming({ key, ms });
    warmTimer.current = window.setTimeout(() => {
      warmTimer.current = null;
      warmWordData(word);
    }, WARM_MS);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      gesture.current = null;
      setArming(null);
      fired.current = { key, at: Date.now() };
      // A short buzz where the platform supports it — on a phone the finger is
      // covering the word, so the animation finishing isn't necessarily visible.
      navigator.vibrate?.(15);
      peekWord(word, el);
    }, ms);
  };

  // A finger that travels is scrolling the page, not holding a word. A mouse
  // that moves inside the word it's already resting on is doing nothing at all,
  // so only touch gestures are cancelled on movement.
  const onMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g?.touch) return;
    if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > MOVE_TOLERANCE) cancel();
  };

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
          className={`peek-word ${arming?.key === k ? 'is-arming' : ''}`}
          style={arming?.key === k ? { '--peek-ms': `${arming.ms}ms` } as CSSProperties : undefined}
          // Mouse arms by arriving; touch arms by staying down. Splitting them
          // is what keeps a scroll on a phone from opening popups.
          onPointerEnter={(e) => { if (e.pointerType === 'mouse') start(k, word, e); }}
          onPointerDown={(e) => { if (e.pointerType !== 'mouse') start(k, word, e); }}
          onPointerUp={cancel}
          onPointerLeave={cancel}
          onPointerCancel={cancel}
          // Android fires a context menu at roughly the same moment as a long
          // press, which would tear the gesture in half.
          onContextMenu={(e) => { if (gesture.current?.touch) e.preventDefault(); }}
        >
          {word}
        </span>,
      );
      last = at + word.length;
    }
    if (last < seg.text.length) nodes.push(seg.text.slice(last));
  }

  return (
    <span className={className} onPointerMove={onMove} onPointerLeave={cancel}>
      {nodes}
    </span>
  );
}
