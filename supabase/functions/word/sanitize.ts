// Turning untrusted model output into the shapes in types.ts.
//
// Everything the model returns is parsed JSON from an LLM that goes straight into
// cache tables shared by every user, so nothing here trusts its input: each
// helper keeps only well-formed entries, caps their size, and drops the rest.

import type { FamilyEntry, Generated, IdiomEntry, Level, Sense, Usage, Verdict } from './types.ts';

/** Did the model judge the word unreal, rather than generate it? */
export const isVerdict = (g: Generated): g is Verdict => (g as Verdict).valid === false;

export const asArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

// A Record rather than an array so the build fails right here if `Level` ever
// gains a member — a list would just silently drift out of sync with the type.
const LEVELS: Record<Level, true> = { beginner: true, intermediate: true, advanced: true };

/** Keep the model's level only if it's one of ours — this column is shared by every user. */
export const asLevel = (v: unknown): Level | null =>
  typeof v === 'string' && Object.hasOwn(LEVELS, v) ? (v as Level) : null;

/** Sanitize a suggestions list: lowercased real-looking words, never the word itself. */
export const asSuggestions = (v: unknown, self: string): string[] => {
  const seen = new Set([self.toLowerCase()]);
  const out: string[] = [];
  for (const s of asArray(v)) {
    const key = s.toLowerCase().trim().slice(0, 60);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length === 5) break;
  }
  return out;
};

/** Sanitize a word-family array: keep well-formed { word, pos } entries only. */
export const asFamily = (v: unknown): FamilyEntry[] =>
  (Array.isArray(v) ? v : [])
    .filter((e): e is FamilyEntry => !!e && typeof e.word === 'string' && typeof e.pos === 'string')
    .map((e) => ({ word: e.word.slice(0, 60), pos: e.pos.slice(0, 30) }))
    .slice(0, 8);

/**
 * Sanitize the model's resolved `seedWord` (the English cache key it settled
 * on, from whichever of the three languages "${word}" turned out to be in).
 * Falls back to `fallback` (the literal search term) when missing or empty, so
 * a malformed response degrades to the old literal-English behavior rather
 * than storing under a blank key.
 */
export const asSeedWord = (v: unknown, fallback: string): string => {
  const s = typeof v === 'string' ? v.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 60) : '';
  return s || fallback;
};

/** Sanitize an idioms array: keep well-formed { idiom, meaning, example? } entries only. */
export const asIdioms = (v: unknown): IdiomEntry[] =>
  (Array.isArray(v) ? v : [])
    .filter((e): e is IdiomEntry => !!e && typeof e.idiom === 'string' && typeof e.meaning === 'string')
    .map((e) => ({
      idiom: e.idiom.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.!]+$/, '').slice(0, 80),
      meaning: e.meaning.trim().slice(0, 200),
      example: typeof e.example === 'string' && e.example.trim() ? e.example.trim().slice(0, 300) : undefined,
    }))
    .filter((e) => e.idiom && e.meaning)
    .slice(0, 6);

const asText = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;

/** A { language: text } map from the backfill prompt, keys lowercased. */
const asTranslations = (v: unknown): Record<string, string> | undefined => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, t] of Object.entries(v as Record<string, unknown>)) {
    const key = k.toLowerCase().trim();
    const text = asText(t, 200);
    if (/^[a-z ]{1,40}$/.test(key) && text) out[key] = text;
  }
  return Object.keys(out).length ? out : undefined;
};

/** IPA keyed by locale; only en-US / en-GB, only strings. */
export const asPhonetics = (v: unknown): Record<string, string> | undefined => {
  if (!v || typeof v !== 'object') return undefined;
  const out: Record<string, string> = {};
  for (const locale of ['en-US', 'en-GB']) {
    const ipa = asText((v as Record<string, unknown>)[locale], 60);
    if (ipa) out[locale] = ipa;
  }
  return Object.keys(out).length ? out : undefined;
};

/**
 * Sanitize the model's other parts of speech: well-formed entries only, at
 * most one per part of speech and never the primary's, three at most.
 */
export const asSenses = (v: unknown, primaryPos: string | undefined): Sense[] => {
  const seen = new Set([(primaryPos ?? '').toLowerCase().trim()]);
  const out: Sense[] = [];
  for (const e of Array.isArray(v) ? v : []) {
    if (!e || typeof e !== 'object') continue;
    const pos = asText(e.partOfSpeech, 30)?.toLowerCase();
    const definition = asText(e.definition, 400);
    if (!pos || !definition || seen.has(pos)) continue;
    seen.add(pos);
    out.push({
      partOfSpeech: pos,
      phonetics: asPhonetics(e.phonetics),
      definition,
      shortDefinition: asText(e.shortDefinition, 200),
      translation: asText(e.translation, 200),
      translations: asTranslations(e.translations),
      examples: asArray(e.examples).map((x) => x.trim().slice(0, 300)).filter(Boolean).slice(0, 3),
    });
    if (out.length === 3) break;
  }
  return out;
};

/** Same sounds, ignoring stress marks, slashes and spacing — eSpeak marks stress, the model often doesn't. */
export const sameIpa = (a: string | undefined, b: string | undefined): boolean =>
  !!a && !!b && a.replace(/[\/ˈˌ.\s]/g, '') === b.replace(/[\/ˈˌ.\s]/g, '');

const CEFR = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

/** Short lowercase tags, deduplicated: "Formal" and "formal " are one label. */
const asTags = (v: unknown, max: number): string[] =>
  [...new Set(asArray(v).map((t) => t.trim().toLowerCase().slice(0, 30)).filter(Boolean))].slice(0, max);

/**
 * A list of small records, each keeping only the named string fields. An entry
 * missing any `required` field is dropped — a mistake with no correction, or a
 * pattern with no example, is worse than none.
 */
function asRecords<K extends string>(
  v: unknown,
  keys: readonly K[],
  required: readonly K[],
  max: number,
  maxLen = 200,
): Record<K, string>[] {
  const out: Record<K, string>[] = [];
  for (const e of Array.isArray(v) ? v : []) {
    if (!e || typeof e !== 'object') continue;
    const rec = {} as Record<K, string>;
    for (const k of keys) rec[k] = asText((e as Record<string, unknown>)[k], maxLen) ?? '';
    if (required.some((k) => !rec[k])) continue;
    out.push(rec);
    if (out.length === max) break;
  }
  return out;
}

/**
 * Sanitize a usage answer — from the model, or a stored row read back in the
 * same shape. Anything malformed becomes the empty value for its field, so
 * the result is always a complete Usage.
 */
export function asUsage(v: unknown): Usage {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const cefr = typeof o.cefr === 'string' ? o.cefr.trim().toUpperCase() : '';
  const freq = Number(o.frequency);
  return {
    cefr: CEFR.has(cefr) ? cefr : null,
    frequency: Number.isInteger(freq) && freq >= 1 && freq <= 3 ? freq : null,
    syllables: asText(o.syllables, 60) ?? null,
    labels: asTags(o.labels, 5),
    grammar: asTags(o.grammar, 5),
    patterns: asRecords(o.patterns, ['pattern', 'example'], ['pattern', 'example'], 6),
    forms: asRecords(o.forms, ['label', 'form'], ['label', 'form'], 8, 60),
    variants: asRecords(o.variants, ['region', 'spelling'], ['region', 'spelling'], 3, 60),
    // The model sometimes "corrects" a sentence into itself.
    mistakes: asRecords(o.mistakes, ['wrong', 'right', 'why'], ['wrong', 'right'], 4)
      .filter((m) => m.wrong.toLowerCase() !== m.right.toLowerCase()),
    confusables: asRecords(o.confusables, ['word', 'difference'], ['word', 'difference'], 3),
    synonymNotes: asRecords(o.synonymNotes, ['word', 'difference'], ['word', 'difference'], 5),
    phrasalVerbs: asRecords(o.phrasalVerbs, ['phrase', 'meaning'], ['phrase', 'meaning'], 10),
    origin: asText(o.origin, 300) ?? null,
  };
}
