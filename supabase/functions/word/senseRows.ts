// A word's other parts of speech, in `word_senses` (one row per sense, ranked
// most common first) with each sense's translations in
// `word_sense_translations`. The word_cache row itself is the primary sense.
// Populated by generation and by scripts/backfill-senses.mjs.

import { keepAlive, type Svc } from './db.ts';
import type { Sense, WordData } from './types.ts';

interface SenseRow {
  rank: number;
  part_of_speech: string;
  ipa_us: string | null;
  ipa_gb: string | null;
  definition: string;
  short_definition: string | null;
  examples: string[] | null;
  word_sense_translations: { translation: string }[];
}

function phonetics(us: string | null, gb: string | null): Record<string, string> | undefined {
  if (!us && !gb) return undefined;
  return { ...(us ? { 'en-US': us } : {}), ...(gb ? { 'en-GB': gb } : {}) };
}

/** The non-primary senses, translated into `motherLang` where a translation is stored. */
export async function fetchSenses(svc: Svc, wordKey: string, motherLang: string): Promise<Sense[]> {
  if (!svc) return [];
  const { data, error } = await svc
    .from('word_senses')
    .select('rank, part_of_speech, ipa_us, ipa_gb, definition, short_definition, examples, word_sense_translations(translation)')
    .eq('word', wordKey)
    .eq('word_sense_translations.lang', motherLang.toLowerCase())
    .order('rank', { ascending: true });
  if (error) {
    console.warn(`[word] senses read failed for "${wordKey}":`, error.message);
    return [];
  }
  // Rows only — `translations` is a backfill input, never part of the response.
  return ((data ?? []) as SenseRow[]).map((r) => ({
    partOfSpeech: r.part_of_speech,
    phonetics: phonetics(r.ipa_us, r.ipa_gb),
    definition: r.definition,
    shortDefinition: r.short_definition ?? undefined,
    translation: r.word_sense_translations[0]?.translation,
    examples: r.examples ?? [],
  }));
}

/**
 * Every part of speech for the response, primary first — [] for a word with
 * one meaning, so the key is always there and always an array.
 */
export function allSenses(primary: WordData, others: Sense[]): Sense[] {
  if (!others.length) return [];
  return [
    {
      partOfSpeech: primary.partOfSpeech ?? '',
      phonetics: primary.phonetics,
      definition: primary.definition ?? '',
      shortDefinition: primary.shortDefinition,
      translation: primary.translation,
      examples: primary.examples ?? [],
    },
    ...others,
  ];
}

/**
 * Store a fresh generation's other senses and mark the word checked, once
 * `rowWritten` says the word_cache row exists — the foreign key needs it.
 */
export function storeSenses(svc: Svc, wordKey: string, senses: Sense[], motherLang: string, rowWritten: Promise<boolean>): void {
  if (!svc) return;
  keepAlive(rowWritten
    .then((ok) => ok ? writeSenses(svc, wordKey, senses, motherLang) : undefined)
    .catch((err: unknown) => console.warn('[word] senses write failed:', err)));
}

/** Exported for scripts/backfill-senses.mjs, which writes the same rows. */
export async function writeSenses(svc: NonNullable<Svc>, wordKey: string, senses: Sense[], motherLang: string): Promise<void> {
  if (senses.length) {
    const { error } = await svc.from('word_senses').upsert(senses.map((s, i) => ({
      word: wordKey,
      rank: i + 1,
      part_of_speech: s.partOfSpeech,
      ipa_us: s.phonetics?.['en-US'] ?? null,
      ipa_gb: s.phonetics?.['en-GB'] ?? null,
      definition: s.definition,
      short_definition: s.shortDefinition ?? null,
      examples: s.examples,
    })), { onConflict: 'word,rank' });
    if (error) throw error;

    const translations = senses.flatMap((s, i) =>
      Object.entries({ ...s.translations, ...(s.translation ? { [motherLang.toLowerCase()]: s.translation } : {}) })
        .map(([lang, translation]) => ({ word: wordKey, rank: i + 1, lang, translation })));
    if (translations.length) {
      const { error: tErr } = await svc.from('word_sense_translations').upsert(translations, { onConflict: 'word,rank,lang' });
      if (tErr) throw tErr;
    }
  }
  const { error: markErr } = await svc
    .from('word_cache')
    .update({ senses_checked_at: new Date().toISOString() })
    .eq('word', wordKey);
  if (markErr) throw markErr;
}
