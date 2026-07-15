// Idioms ("work like a dog").
//
// Idiom text lives once in `idioms` (unique on the text) with words mapped to it
// through `word_idioms`, so "work like a dog" is shared by both "work" and "dog".
// Populated by English generation and by the backfill script.

import { keepAlive, type Svc } from './db.ts';
import { asIdioms } from './sanitize.ts';
import type { IdiomEntry, WordData } from './types.ts';

/** Look up a word's idioms, most commonly heard first. */
export async function fetchIdioms(svc: Svc, wordKey: string): Promise<IdiomEntry[]> {
  if (!svc) return [];
  const { data } = await svc
    .from('word_idioms')
    .select('rank, idioms(idiom, meaning, example)')
    .eq('word', wordKey)
    .order('rank', { ascending: true });
  return asIdioms(((data ?? []) as { idioms: unknown }[]).map((r) => r.idioms));
}

/**
 * Store freshly generated idioms and mark the word checked so the backfill skips
 * it. Marked ONLY when the model actually answered the idioms request (an array,
 * possibly empty) — non-English generations don't ask for idioms and stay
 * unchecked, so the English backfill can still cover those words.
 */
export function storeIdioms(svc: Svc, seedKey: string, d: WordData): void {
  if (!svc) return;
  if (!Array.isArray(d.idioms)) return;
  const idioms = asIdioms(d.idioms);

  keepAlive((async () => {
    if (idioms.length) {
      const unique = [...new Map(idioms.map((e) => [e.idiom, e])).values()];
      const { data: rows, error } = await svc
        .from('idioms')
        .upsert(
          unique.map((e) => ({ idiom: e.idiom, meaning: e.meaning, example: e.example ?? null })),
          { onConflict: 'idiom' },
        )
        .select('id, idiom');
      if (error || !rows) throw error ?? new Error('no idiom ids');

      // The model returns idioms most-common-in-speech first; the position is the
      // rank. Merge (not ignore) on conflict so regeneration re-ranks.
      const rankByIdiom = new Map(unique.map((e, i) => [e.idiom, i + 1]));
      const links = (rows as { id: string; idiom: string }[])
        .map((r) => ({ word: seedKey, idiom_id: r.id, rank: rankByIdiom.get(r.idiom) ?? 100 }));
      const { error: linkErr } = await svc.from('word_idioms').upsert(links, { onConflict: 'word,idiom_id' });
      if (linkErr) throw linkErr;
    }

    const { error: markErr } = await svc
      .from('word_cache')
      .update({ idioms_checked_at: new Date().toISOString() })
      .eq('word', seedKey);
    if (markErr) throw markErr;
  })().catch((err: unknown) => console.warn('[word] idioms write failed:', err)));
}
