// Example sentences in the learner's mother tongue — `word_cache.
// example_translations`, { "<mother_lang>": [one per example, same order] }.
//
// Free of Deno APIs, like senses.ts, because two callers ask for the same
// thing: the `word` function (in the full generation and as a top-up on a
// cache hit), and scripts/backfill-example-translations.mjs for rows cached
// before this existed. One copy of the wording and the checks keeps them alike.

/** The JSON field the full generation fills, beside "examples". */
export function exampleTranslationsField(motherLang: string): string {
  return `"exampleTranslations": ["each of the examples above, translated into natural ${motherLang} — same count, same order"]`;
}

/**
 * A standalone prompt for words already cached: one or more words, each with
 * its examples, into one or more languages. Asking for several at once is the
 * backfill's whole economy — the instructions cost the same for one word or
 * twenty.
 */
export function exampleTranslationsPrompt(
  items: { word: string; examples: string[] }[],
  langs: string[],
): string {
  const list = items
    .map((it) => `"${it.word}":\n${it.examples.map((ex, i) => `  ${i + 1}. ${ex}`).join('\n')}`)
    .join('\n\n');
  const shape = `{ "<word>": { ${langs.map((l) => `"${l.toLowerCase()}": ["…"]`).join(', ')} } }`;
  return `Translate each vocabulary word's example sentences into ${langs.join(', ')}. Translate the whole sentence naturally, as a teacher would for a student — not word by word — and keep the vocabulary word's meaning as used in that sentence.

${list}

Return ONLY a JSON object (no markdown), keyed by each word exactly as written above, each language's array holding one translation per example, same count and same order:
${shape}`;
}

/**
 * Untrusted model output → a translation per example, or null when it can't be
 * paired with them: a missing, extra or blank line would put a translation
 * under the wrong sentence, which is worse than showing none.
 */
export function asExampleTranslations(value: unknown, count: number): string[] | null {
  if (!Array.isArray(value) || value.length !== count || count === 0) return null;
  const out = value.map((v) => (typeof v === 'string' ? v.trim().slice(0, 400) : ''));
  return out.every(Boolean) ? out : null;
}

/** The stored translations for `lang`, if they still match `examples`. */
export function storedExampleTranslations(
  stored: Record<string, unknown> | null | undefined,
  lang: string,
  examples: string[],
): string[] | null {
  return asExampleTranslations(stored?.[lang.toLowerCase()], examples.length);
}
