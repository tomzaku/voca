// The word_cache table: one row per word holding the language-neutral content,
// reused by every user. Generating a word costs tokens; its definition, examples
// and so on are the same for everyone, so they're generated once.
//
// Translations are the exception — they differ per language — so they live in a
// per-language map on the row: normally one entry per mother tongue (a new one
// costs a cheap translate-only call instead of a full regeneration), but the map
// also doubles as a reverse search index — see `readByTranslation` below — so a
// word searched in the learner's mother tongue or learn language gets an entry
// too, keyed by whichever language it was typed in. `storeWord` seeds both the
// mother-tongue and learn-language entries on every generation (the model
// resolves and reproduces them verbatim in the same call — see generate.ts),
// and `mergeTranslations` adds one on to a row that already existed.
//
// Only the service role writes here, so clients can't poison the cache.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { underRateLimit } from '../_shared/ai.ts';
import { translateWord } from './generate.ts';
import { fireAndForget, type Svc } from './db.ts';
import { asArray, asLevel } from './sanitize.ts';
import type { WordData } from './types.ts';

/** A cached word: the shared content, plus every translation stored for it so far. */
export interface CachedWord {
  word: string; // the canonical English seed key — the word_cache primary key
  data: WordData;
  headword: string;
  translations: Record<string, string>;
}

// deno-lint-ignore no-explicit-any
function mapRow(row: Record<string, any>): CachedWord {
  const headword = (row.headword as string) ?? (row.word as string);
  return {
    word: row.word as string,
    headword,
    translations: (row.translations ?? {}) as Record<string, string>,
    data: {
      word: headword,
      phonetics: (row.phonetics ?? {}) as Record<string, string>,
      partOfSpeech: (row.part_of_speech as string) ?? undefined,
      definition: row.definition as string,
      shortDefinition: (row.short_definition as string) ?? undefined,
      examples: asArray(row.examples),
      synonyms: asArray(row.synonyms),
      antonyms: asArray(row.antonyms),
      collocations: asArray(row.collocations),
      level: (row.level as string) ?? undefined,
      imageKeywords: asArray(row.image_keywords),
    },
  };
}

/** Read a word from the cache. Null when absent (or when there's no service key). */
export async function readWord(svc: Svc, wordKey: string): Promise<CachedWord | null> {
  if (!svc) return null;
  const { data: row } = await svc.from('word_cache').select('*').eq('word', wordKey).maybeSingle();
  return row ? mapRow(row) : null;
}

// A jsonb path key (`translations->>key`) is spliced into the filter's column
// spec, not its value, so it isn't parameterized by supabase-js the way a value
// is. Language names are caller-supplied (`motherLang`/`learnLang`), so this
// whitelist is what keeps one from smuggling PostgREST filter syntax in.
const safeLangKey = (lang: string): string | null => (/^[a-z0-9 ]{1,40}$/.test(lang) ? lang : null);

/**
 * Reverse lookup: does any row already have this exact term stored as its
 * translation for the mother tongue or the learn language? A hit means a
 * repeat cross-language search (e.g. "chó" again) costs no AI call at all —
 * `storeWord`/`mergeTranslations` are what put the entry there the first time.
 */
export async function readByTranslation(
  svc: Svc,
  term: string,
  motherLang: string,
  learnLang: string,
): Promise<CachedWord | null> {
  if (!svc) return null;

  const motherKey = safeLangKey(motherLang.toLowerCase());
  if (motherKey) {
    const { data: row } = await svc.from('word_cache').select('*').eq(`translations->>${motherKey}`, term).maybeSingle();
    if (row) return mapRow(row);
  }

  const learnKey = safeLangKey(learnLang.toLowerCase());
  if (learnKey && learnKey !== motherKey) {
    const { data: row } = await svc.from('word_cache').select('*').eq(`translations->>${learnKey}`, term).maybeSingle();
    if (row) return mapRow(row);
  }

  return null;
}

/**
 * Add translation entries onto a row that's already cached, without clobbering
 * languages already stored there. Used when a generation call resolves to an
 * English seed that turns out to already be cached (see index.ts) — the fresh
 * generation is discarded in favor of the existing content, but the language
 * this search came in as is still worth recording for next time.
 */
export function mergeTranslations(svc: Svc, word: string, existing: Record<string, string>, entries: Record<string, string>): void {
  if (!svc) return;
  const merged = { ...existing, ...entries };
  fireAndForget(svc.from('word_cache').update({ translations: merged }).eq('word', word));
}

/**
 * Build the translations map for a fresh generation: the mother-tongue
 * translation (as always), plus the learn-language display word — the model
 * reproduces whichever of the two matches "${word}" verbatim (see
 * `buildPrompt`), so one of these entries is what makes a repeat cross-language
 * search a direct hit via `readByTranslation`.
 */
export function buildTranslations(learnLang: string, motherLang: string, d: WordData): Record<string, string> {
  const translations: Record<string, string> = {};
  if (typeof d.translation === 'string' && d.translation) translations[motherLang.toLowerCase()] = d.translation;
  if (typeof d.word === 'string' && d.word) translations[learnLang.toLowerCase()] = d.word;
  return translations;
}

/**
 * This user's translation of a cached word, generating and storing it if the word
 * has never been looked up in their mother tongue.
 *
 * Returns undefined rather than throwing when the top-up isn't possible (over the
 * rate limit, or the provider failed) — a cached word missing only its
 * translation still beats an error page.
 *
 * `userClient` is null for a signed-out visitor, and then a missing translation
 * stays missing: the rate limit counts against a user id, so there'd be nothing
 * holding an anonymous caller back from spending the AI budget one mother
 * tongue at a time.
 */
export async function translationFor(
  svc: Svc,
  userClient: SupabaseClient | null,
  wordKey: string,
  cached: CachedWord,
  motherLang: string,
): Promise<string | undefined> {
  const motherKey = motherLang.toLowerCase();
  const existing = cached.translations[motherKey];
  if (existing) return existing;
  if (!userClient) return undefined;
  if (!await underRateLimit(userClient)) return undefined;

  try {
    console.log(`[word] AI call: translate-only "${wordKey}" -> ${motherKey}`);
    const translation = await translateWord(cached.headword, String(cached.data.definition), motherLang);
    if (svc) {
      fireAndForget(
        svc.from('word_cache')
          .update({ translations: { ...cached.translations, [motherKey]: translation } })
          .eq('word', wordKey),
      );
    }
    return translation;
  } catch (err) {
    console.warn(`[word] translate-only failed for "${wordKey}":`, (err as Error).message);
    return undefined;
  }
}

/** Store a freshly generated word (non-blocking). See `buildTranslations` for the `translations` map. */
export function storeWord(svc: Svc, wordKey: string, learnLang: string, motherLang: string, d: WordData): void {
  if (!svc) return;
  fireAndForget(svc.from('word_cache').upsert({
    word: wordKey,
    headword: typeof d.word === 'string' ? d.word : wordKey,
    phonetics: d.phonetics ?? {},
    part_of_speech: d.partOfSpeech ?? null,
    definition: d.definition,
    short_definition: typeof d.shortDefinition === 'string' && d.shortDefinition
      ? d.shortDefinition.slice(0, 200)
      : null,
    examples: asArray(d.examples),
    synonyms: asArray(d.synonyms),
    antonyms: asArray(d.antonyms),
    collocations: asArray(d.collocations).slice(0, 15),
    image_keywords: asArray(d.imageKeywords),
    level: asLevel(d.level),
    translations: buildTranslations(learnLang, motherLang, d),
  }));
}
