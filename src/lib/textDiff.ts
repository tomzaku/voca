// Word-level diff between the original text and a revised option, for the
// colorful "what changed" highlight inside each option card. Wraps `diff`
// (jsdiff) so the rest of the app only sees the shape it needs.

import { diffWords } from 'diff';

export interface DiffSegment {
  value: string;
  added: boolean;
  removed: boolean;
}

/**
 * `diffWords` already ignores pure whitespace differences (so a re-wrapped
 * paragraph doesn't read as one giant change) and merges consecutive
 * unchanged words into one segment.
 */
export function diffOption(original: string, revised: string): DiffSegment[] {
  return diffWords(original, revised).map((part) => ({
    value: part.value,
    added: Boolean(part.added),
    removed: Boolean(part.removed),
  }));
}
