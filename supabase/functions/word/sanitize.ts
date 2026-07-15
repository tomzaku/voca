// Turning untrusted model output into the shapes in types.ts.
//
// Everything the model returns is parsed JSON from an LLM that goes straight into
// cache tables shared by every user, so nothing here trusts its input: each
// helper keeps only well-formed entries, caps their size, and drops the rest.

import type { FamilyEntry, Generated, IdiomEntry, Level, Verdict } from './types.ts';

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
