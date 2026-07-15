// The word_rejects table: the negative counterpart to word_cache.
//
// Discovering that a word ISN'T real costs tokens just like generating a real
// one, and the verdict is the same for everyone — so it's stored once and reused.
// A repeat search for "recieve" then makes no AI call at all, for any user.
//
// Keyed by (word, learn_lang): a verdict only holds within the language it was
// made in. Only the service role writes here, so nobody can mark a real word as a
// typo for everyone else.

import { fireAndForget, type Svc } from './db.ts';
import { asArray } from './sanitize.ts';

/**
 * Bump when the prompt or model changes in a way that could alter a judgement.
 * Older rows are then ignored and re-checked on their next search.
 *
 * This is the escape hatch for the cache's one real risk: a model will
 * occasionally reject a rare-but-real word, and without a version to invalidate
 * on, that one wrong answer would be permanent for every user.
 *
 * Bump `rejectKey` in src/lib/wordService.ts at the same time — clients cache
 * verdicts too, and won't otherwise notice.
 */
const REJECT_VERSION = 1;

/** A stored verdict's suggestions, or null if we have no current verdict on the word. */
export async function readReject(svc: Svc, wordKey: string, learnKey: string): Promise<string[] | null> {
  if (!svc) return null;
  const { data: row } = await svc
    .from('word_rejects')
    .select('suggestions, version')
    .eq('word', wordKey)
    .eq('learn_lang', learnKey)
    .maybeSingle();
  if (!row || Number(row.version) < REJECT_VERSION) return null;

  // Count the hit so one-off keyboard mashing can be told apart from real typos
  // and pruned.
  fireAndForget(svc.rpc('bump_word_reject', { p_word: wordKey, p_learn_lang: learnKey }));
  return asArray(row.suggestions);
}

/** Store a "not a real word" verdict (non-blocking) so nobody pays to discover it twice. */
export function storeReject(svc: Svc, wordKey: string, learnKey: string, suggestions: string[]): void {
  if (!svc) return;
  fireAndForget(svc.from('word_rejects').upsert(
    { word: wordKey, learn_lang: learnKey, suggestions, version: REJECT_VERSION, hits: 1 },
    { onConflict: 'word,learn_lang' },
  ));
}
