// Word-level diff between the original text and a revised option, for the
// colorful "what changed" highlight inside each option card. Wraps `diff`
// (jsdiff) so the rest of the app only sees the shape it needs.
//
// This is deterministic — it runs on two strings the app already has, not on
// the model getting a marker syntax right. An earlier version asked the model
// to wrap each changed span inline ({{N}}…{{/}}) so the client wouldn't have
// to diff at all; in practice models frequently botched it (missing closing
// tags, empty markers, "original"/"corrected" wrapping identical text) and
// the broken syntax leaked straight into the UI. A client-side diff can't
// come out malformed the way model-generated syntax can.

import { diffWords } from 'diff';

export interface DiffSegment {
  value: string;
  added: boolean;
  removed: boolean;
  /** Character offset where this segment starts in the ORIGINAL text —
   *  meaningful for `removed`/unchanged segments (they're text still "there"
   *  in the original); an `added` segment doesn't occupy original text, so
   *  this holds the position it was inserted at instead. */
  originalStart: number;
  /** Character offset where this segment starts in the REVISED text —
   *  meaningful for `added`/unchanged segments; a `removed` segment holds
   *  the position it was cut from instead. */
  revisedStart: number;
}

/**
 * `diffWords` already ignores pure whitespace differences (so a re-wrapped
 * paragraph doesn't read as one giant change) and merges consecutive
 * unchanged words into one segment.
 *
 * The offsets let a caller match a segment back to *where* it is in each
 * text (see ImproveWritingPage's `matchCorrection`) rather than only *what*
 * it says — a short phrase can appear more than once, and content alone
 * can't tell two occurrences apart.
 */
export function diffOption(original: string, revised: string): DiffSegment[] {
  let o = 0;
  let r = 0;
  return diffWords(original, revised).map((part) => {
    const seg: DiffSegment = {
      value: part.value,
      added: Boolean(part.added),
      removed: Boolean(part.removed),
      originalStart: o,
      revisedStart: r,
    };
    if (!seg.added) o += part.value.length;
    if (!seg.removed) r += part.value.length;
    return seg;
  });
}
