// Masking the answer word out of clue text (examples shown while guessing).
// Shared by the flashcard guess flow and the collection quiz.

/**
 * A regex matching the answer word and its inflections (adumbrate →
 * adumbrated/adumbrating/…). Drops a trailing silent 'e'/'y' so the stem covers
 * -ed/-ing/-ies forms, and skips short tokens (a, an, of…). Returns null when
 * there's nothing worth matching.
 */
export function answerRegex(answer: string): RegExp | null {
  const stems = answer
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length >= 3)
    .map((t) => (/[ey]$/.test(t) ? t.slice(0, -1) : t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (stems.length === 0) return null;
  return new RegExp(`\\b(?:${stems.join('|')})[a-z]*\\b`, 'gi');
}

/**
 * Blank out the answer (and its inflections) in an example — otherwise the
 * example reveals the answer. Over-masking a rare look-alike is fine; leaking
 * the answer is not.
 */
export function maskAnswer(example: string, answer: string): string {
  const re = answerRegex(answer);
  return re ? example.replace(re, '____') : example;
}
