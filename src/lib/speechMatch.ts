// Deciding whether what someone said is the word they were asked for.
//
// This can't be string equality. Whisper returns a sentence with punctuation
// and capitals (" Ubiquitous."), it mishears unstressed syllables, and a
// learner with an accent is still *correct* — marking them wrong for that is
// the fastest way to make a speaking exercise feel hostile and get abandoned.
//
// So: normalize hard, accept any inflected form the word data already knows
// about, and allow an edit-distance budget that grows with word length. Short
// words get no budget at all, because at three letters almost everything is
// within one edit of everything else.

/**
 * How many single-character errors to forgive, by target length. "cat" vs
 * "cut" is a different word; "ubiquitous" vs "ubiquitious" is the same word
 * heard imperfectly.
 */
function editBudget(length: number): number {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  return 2;
}

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalizeSpoken(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    // Combining marks — "café" and "cafe" are the same spoken word.
    .replace(/[̀-ͯ]/g, '')
    // Keep the apostrophe: it distinguishes "wont" from "won't".
    .replace(/[^a-z\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Levenshtein distance, iterative with a single row of state. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1, // deletion
        row[j - 1] + 1, // insertion
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1), // substitution
      );
    }
    prev = row;
  }
  return prev[b.length];
}

/** Every contiguous run of `size` words in `tokens`, as space-joined strings. */
function windows(tokens: string[], size: number): string[] {
  if (size <= 0 || size > tokens.length) return [];
  const out: string[] = [];
  for (let i = 0; i + size <= tokens.length; i++) {
    out.push(tokens.slice(i, i + size).join(' '));
  }
  return out;
}

/**
 * Did `transcript` contain `target` (or one of its `family` forms)?
 *
 * Matching is done per-phrase rather than on the whole transcript, because
 * Whisper reliably pads a single spoken word into a sentence — asked for
 * "ebb" it may return "Ebb." or "It's ebb." Requiring the transcript to *equal*
 * the word would fail almost every correct answer.
 */
export function spokenMatch(
  transcript: string,
  target: string,
  family: string[] = [],
): boolean {
  const said = normalizeSpoken(transcript);
  if (!said) return false;

  const tokens = said.split(' ');
  const candidates = [target, ...family]
    .map(normalizeSpoken)
    .filter((c) => c.length > 0);

  for (const candidate of candidates) {
    const size = candidate.split(' ').length;
    const budget = editBudget(candidate.replace(/\s/g, '').length);

    for (const window of windows(tokens, size)) {
      if (window === candidate) return true;
      if (budget > 0 && editDistance(window, candidate) <= budget) return true;
    }
  }
  return false;
}
