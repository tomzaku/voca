import { useEffect, useState } from 'react';

const TYPE_MS = 70;
const DELETE_MS = 35;
const HOLD_MS = 1600;
const GAP_MS = 350;

/**
 * Types each example out, holds it, deletes it, and moves to the next, for as
 * long as `active`. Returns the text so far — '' between examples — or null
 * before the first one starts. Nothing runs, and null comes back, with no
 * examples or when the reader has asked for reduced motion.
 */
export function useTypedExample(examples: string[], active: boolean): string | null {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!active || examples.length === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let index = 0;
    let len = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const target = examples[index];
      if (!deleting) {
        len += 1;
        setText(target.slice(0, len));
        if (len < target.length) { timer = setTimeout(step, TYPE_MS); return; }
        deleting = true;
        timer = setTimeout(step, HOLD_MS);
        return;
      }
      len -= 1;
      setText(target.slice(0, len));
      if (len > 0) { timer = setTimeout(step, DELETE_MS); return; }
      deleting = false;
      index = (index + 1) % examples.length;
      timer = setTimeout(step, GAP_MS);
    };
    timer = setTimeout(step, GAP_MS);
    return () => { clearTimeout(timer); setText(null); };
  }, [examples, active]);
  return text;
}
