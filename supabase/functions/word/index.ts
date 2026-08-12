// Word-data endpoint. Cache-first: it usually returns stored vocabulary data
// with NO AI call, which is why it lives apart from the always-generative `ai`
// function.
//
//   POST /word  { word, learnLang, motherLang }
//   → 200 { word, suggestions }
//
// One shape either way, as everywhere else:
//
//   word        the vocabulary object — phonetics { "en-US":…, "en-GB":… },
//               partOfSpeech, definition, translation, examples, synonyms,
//               antonyms, collocations, wordFamily [{word,pos}],
//               idioms [{idiom,meaning,example}], level, imageKeywords —
//               or null when the lookup isn't a real word (a typo, nonsense).
//   suggestions "did you mean" spellings, filled in exactly when word is null.
//
// The flow, in order — each step exists to avoid the next one's cost:
//
//   word_cache?             → hit: return it (no AI call)
//   translations, reversed? → hit: a prior "chó"/"perro"-style search already
//                              resolved this term (no AI call) — see below.
//   word_rejects?           → hit: return suggestions (no AI call)
//   generate                → the only step that costs anything: ONE AI call
//                              that settles validity, which of the learner's
//                              three languages the term was typed in, and the
//                              full entry, all at once — see generate.ts.
//
// Every real result is stored in whichever table it belongs to, so nobody pays
// for the same word — in any of these languages — twice.
//
// **A word typed in the mother tongue or the learn language, not just
// English.** The cache is keyed on an English seed (`seedWord` in the
// generation response), but the search term itself may be English, the
// mother tongue, or the learn language — the single generation call resolves
// which. The model reproduces the matching language's form verbatim, which
// `storeWord` writes into `translations` (the same per-language map used for
// mother-tongue translations) under that language's key — see cache.ts — so
// the exact string typed is a direct, AI-free hit next time.
//
// `level` is decided here, not by the client: word_cache holds ONE level per
// word for everyone, so a per-request level could only ever apply to whoever
// happened to search it first.
//
// **Signing in is not required to READ.** The cache is shared by everyone, so a
// visitor without an account sees any word already in it — that's the flash card
// working before you sign up. Only generation is gated: producing a word nobody
// has looked up costs tokens, and the rate limit budgets per user id, so an
// anonymous caller could neither be billed nor throttled. They get a 401 asking
// them to sign in, and only for words the cache has never seen.
//
// Storage lives in cache.ts / rejects.ts / family.ts / idioms.ts; prompts and
// provider calls in generate.ts; shapes in types.ts, with sanitize.ts turning
// untrusted model output into them.
//
// Deploy: `supabase functions deploy word`

import {
  BadRequest,
  corsHeaders,
  jsonResponse,
  reqStr,
  optionalUser,
  serviceClient,
  underRateLimit,
} from '../_shared/ai.ts';
import { buildTranslations, type CachedWord, mergeTranslations, readByTranslation, readWord, storeWord, translationFor } from './cache.ts';
import { readReject, storeReject } from './rejects.ts';
import { fetchFamily, storeFamily } from './family.ts';
import { fetchIdioms, storeIdioms } from './idioms.ts';
import { generateWordData } from './generate.ts';
import { asSeedWord, isVerdict } from './sanitize.ts';

type Svc = ReturnType<typeof serviceClient>;
type Auth = Awaited<ReturnType<typeof optionalUser>>;

/** Build the 200 response for a word already in the cache: translation, family, idioms. */
async function hitResponse(svc: Svc, auth: Auth, cached: CachedWord, motherLang: string): Promise<Response> {
  const [translation, wordFamily, idioms] = await Promise.all([
    // Null client for a visitor: they get the translations already stored,
    // never a fresh translate call (nobody to rate-limit).
    translationFor(svc, auth.user ? auth.supabase : null, cached.word, cached, motherLang),
    fetchFamily(svc, cached.word, cached.headword),
    fetchIdioms(svc, cached.word),
  ]);
  return jsonResponse(200, { word: { ...cached.data, translation, wordFamily, idioms }, suggestions: [] });
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const auth = await optionalUser(req);

  let params: Record<string, unknown>;
  try {
    params = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }

  let word: string, learnLang: string, motherLang: string;
  try {
    word = reqStr(params, 'word', 100);
    learnLang = reqStr(params, 'learnLang', 40);
    motherLang = reqStr(params, 'motherLang', 40);
  } catch (err) {
    if (err instanceof BadRequest) return jsonResponse(400, { error: err.message });
    return jsonResponse(400, { error: 'Invalid request parameters.' });
  }

  const wordKey = word.toLowerCase();
  const learnKey = learnLang.toLowerCase();
  const svc = serviceClient();
  const t0 = Date.now();
  console.log(`[word] request word="${wordKey}" learn=${learnKey} mother=${motherLang} user=${auth.user?.id ?? 'anon'}`);

  // ── 1. Known word? ──
  const cached = await readWord(svc, wordKey);
  if (cached) {
    console.log(`[word] cache HIT "${wordKey}" (${Date.now() - t0}ms)`);
    return await hitResponse(svc, auth, cached, motherLang);
  }

  // ── 1.5 Known under a different language — a prior cross-language search? ──
  const byTranslation = await readByTranslation(svc, wordKey, motherLang, learnLang);
  if (byTranslation) {
    console.log(`[word] translation HIT "${wordKey}" -> "${byTranslation.word}" (${Date.now() - t0}ms, no AI call)`);
    return await hitResponse(svc, auth, byTranslation, motherLang);
  }

  // ── 2. Known typo? ──
  const suggestions = await readReject(svc, wordKey, learnKey);
  if (suggestions) {
    console.log(`[word] reject HIT "${wordKey}" (${Date.now() - t0}ms, no AI call)`);
    return jsonResponse(200, { word: null, suggestions });
  }

  // ── 3. None of the above — ask the AI, and remember whatever it says ──
  // The only step that costs anything, and the only one that needs an account.
  if (!auth.user) {
    console.log(`[word] cache MISS "${wordKey}" — anonymous, not generating`);
    return jsonResponse(401, { error: 'Please sign in to look up a new word.' });
  }
  if (!await underRateLimit(auth.supabase)) {
    console.warn(`[word] rate-limited user=${auth.user.id} word="${wordKey}"`);
    return jsonResponse(429, { error: 'Too many requests — please slow down and try again shortly.' });
  }

  console.log(`[word] cache MISS "${wordKey}" — AI call: full generation`);
  let result;
  try {
    result = await generateWordData(word, learnLang, motherLang);
  } catch (err) {
    console.error(`[word] generation FAILED "${wordKey}" (${Date.now() - t0}ms):`, (err as Error).message);
    return jsonResponse(502, { error: (err as Error).message || 'Failed to generate word data.' });
  }

  if (isVerdict(result)) {
    storeReject(svc, wordKey, learnKey, result.suggestions);
    console.log(`[word] REJECTED "${wordKey}" (${Date.now() - t0}ms, suggestions=${result.suggestions.length})`);
    return jsonResponse(200, { word: null, suggestions: result.suggestions });
  }

  // The model resolved which language "${word}" was in and settled on this
  // English seed key — strip it before the response reaches the client, it's
  // an internal cache key, not part of the documented word shape.
  const { seedWord, ...data } = result;
  const resolvedKey = asSeedWord(seedWord, wordKey);

  const already = resolvedKey !== wordKey ? await readWord(svc, resolvedKey) : null;
  if (already) {
    // This concept was already cached under its canonical key — reuse the
    // existing content rather than overwrite it with this one-off
    // regeneration, and just record the language this search came in as.
    mergeTranslations(svc, resolvedKey, already.translations, buildTranslations(learnLang, motherLang, data));
    console.log(`[word] resolved "${wordKey}" -> "${resolvedKey}" (${Date.now() - t0}ms, already cached)`);
    return await hitResponse(svc, auth, already, motherLang);
  }

  storeWord(svc, resolvedKey, learnLang, motherLang, data);
  storeFamily(svc, resolvedKey, data);
  storeIdioms(svc, resolvedKey, data);
  console.log(`[word] generated "${wordKey}" -> "${resolvedKey}" (${Date.now() - t0}ms, family=${data.wordFamily?.length ?? 0})`);
  return jsonResponse(200, { word: data, suggestions: [] });
}

if (import.meta.main) Deno.serve(handler);
