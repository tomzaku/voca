// Word families (decide → decision/noun, decisive/adjective, decidedly/adverb).
//
// A family is stored ONCE in word_families with every member mapped to it in
// word_family_members, so viewing any member finds it without a new AI call.

import { keepAlive, type Svc } from './db.ts';
import { asFamily } from './sanitize.ts';
import type { FamilyEntry, WordData } from './types.ts';

/**
 * Look up a word's family. Families include the word being viewed, so it's
 * filtered out of what we return.
 */
export async function fetchFamily(svc: Svc, wordKey: string, headword: string): Promise<FamilyEntry[]> {
  if (!svc) return [];
  const { data } = await svc
    .from('word_family_members')
    .select('word_families(members)')
    .eq('word', wordKey)
    .maybeSingle();
  const members = asFamily((data?.word_families as { members?: unknown } | null)?.members);
  const exclude = new Set([wordKey.toLowerCase(), headword.toLowerCase()]);
  return members.filter((m) => !exclude.has(m.word.toLowerCase()));
}

/**
 * Store a freshly generated family once and map every member (plus the English
 * seed) to it. Members that already belong to a family keep their mapping.
 */
export function storeFamily(svc: Svc, seedKey: string, d: WordData): void {
  if (!svc) return;
  const family = asFamily(d.wordFamily);
  if (family.length === 0) return;

  const headword = typeof d.word === 'string' ? d.word : seedKey;
  const seen = new Set<string>();
  const members: FamilyEntry[] = [];
  for (const m of [{ word: headword, pos: d.partOfSpeech ?? '' }, ...family]) {
    const key = m.word.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      members.push(m);
    }
  }

  keepAlive((async () => {
    const { data: fam, error } = await svc.from('word_families').insert({ members }).select('id').single();
    if (error || !fam) throw error ?? new Error('no family id');

    const keys = new Set(members.map((m) => m.word.toLowerCase()));
    keys.add(seedKey.toLowerCase()); // English seed always resolves, any learn language
    const rows = [...keys].map((word) => ({ word, family_id: fam.id }));
    const { error: mapErr } = await svc
      .from('word_family_members')
      .upsert(rows, { onConflict: 'word', ignoreDuplicates: true });
    if (mapErr) throw mapErr;
  })().catch((err: unknown) => console.warn('[word] family write failed:', err)));
}
