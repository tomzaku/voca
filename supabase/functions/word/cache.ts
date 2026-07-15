// The word_cache table: one row per word holding the language-neutral content,
// reused by every user. Generating a word costs tokens; its definition, examples
// and so on are the same for everyone, so they're generated once.
//
// Translations are the exception — they differ per mother tongue — so they live
// in a per-language map on the row, and a new mother tongue costs a cheap
// translate-only call instead of a full regeneration.
//
// Only the service role writes here, so clients can't poison the cache.

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { underRateLimit } from '../_shared/ai.ts';
import { translateWord } from './generate.ts';
import { fireAndForget, type Svc } from './db.ts';
import { asArray, asLevel } from './sanitize.ts';
import type { WordData } from './types.ts';

/** A cached word: the shared content, plus every translation stored for it so far. */
export interface CachedWord {
  data: WordData;
  headword: string;
  translations: Record<string, string>;
}

/** Read a word from the cache. Null when absent (or when there's no service key). */
export async function readWord(svc: Svc, wordKey: string): Promise<CachedWord | null> {
  if (!svc) return null;
  const { data: row } = await svc.from('word_cache').select('*').eq('word', wordKey).maybeSingle();
  if (!row) return null;

  const headword = (row.headword as string) ?? wordKey;
  return {
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

/**
 * This user's translation of a cached word, generating and storing it if the word
 * has never been looked up in their mother tongue.
 *
 * Returns undefined rather than throwing when the top-up isn't possible (over the
 * rate limit, or the provider failed) — a cached word missing only its
 * translation still beats an error page.
 */
export async function translationFor(
  svc: Svc,
  userClient: SupabaseClient,
  wordKey: string,
  cached: CachedWord,
  motherLang: string,
): Promise<string | undefined> {
  const motherKey = motherLang.toLowerCase();
  const existing = cached.translations[motherKey];
  if (existing) return existing;
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

/** Store a freshly generated word (non-blocking). */
export function storeWord(svc: Svc, wordKey: string, motherLang: string, d: WordData): void {
  if (!svc) return;
  const hasTranslation = typeof d.translation === 'string' && d.translation.length > 0;
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
    translations: hasTranslation ? { [motherLang.toLowerCase()]: d.translation } : {},
  }));
}
