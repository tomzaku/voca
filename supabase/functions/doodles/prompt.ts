// How a cell is described to the image model.
//
// Kept apart from the edge function (and free of any Deno API) so it can be
// unit tested — see prompt.test.ts.
//
// The rule this exists to enforce: the model is never handed the word it is
// drawing. Given a quoted word it letters that word under the picture, and the
// flash card shows the doodle while the learner is still guessing, so the
// caption is the answer. A word the model never sees is one it cannot write.

/** Escape a string for use inside a RegExp. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Blank out the word (and its ordinary inflections) wherever it appears in a
 * definition, so sending the meaning can't smuggle the answer through.
 * Definitions do sometimes name their own headword — "harvest: the harvest
 * season", "bank: a river bank".
 */
export function maskWord(text: string, word: string): string {
  const w = word.trim();
  if (!w) return text;
  // Multi-word entries ("run for office") are matched whole; single words also
  // match their common endings so "harvesting" and "harvests" are caught.
  const suffix = /\s/.test(w) ? '' : '(?:s|es|ed|d|ing|er|ers|est|ly)?';
  // \b only means anything next to a word character. An entry that starts or
  // ends with punctuation would never match with one bolted on regardless.
  const open = /^\w/.test(w) ? '\\b' : '';
  const close = /\w$/.test(w) ? '\\b' : '';
  const re = new RegExp(`${open}${escapeRe(w)}${suffix}${close}`, 'gi');
  return text.replace(re, '___');
}

/**
 * What to tell the model a cell should show. The meaning where we have one —
 * with the word masked out of it — and only otherwise the word itself, which
 * is the single case where the prompt's no-caption rule has to carry the load
 * alone.
 */
export function cellSubject(word: string, definition?: string): string {
  const meaning = definition ? maskWord(definition, word).trim() : '';
  // A definition that was nothing but the word is no use once masked.
  return meaning && meaning.replace(/[_\s.,;:]/g, '').length > 0
    ? meaning
    : `the meaning of the word "${word}"`;
}
