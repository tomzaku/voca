// Word-data endpoint. Cache-first: it usually returns stored vocabulary data
// with NO AI call, which is why it lives apart from the always-generative `ai`
// function. Returns the word object directly (not a `{ text }` wrapper).
//
//   POST { word, learnLang, motherLang }
//   → 200 { word, phonetics:{ "en-US":…, "en-GB":… }, partOfSpeech, definition,
//           translation, examples, synonyms, antonyms, collocations,
//           wordFamily:[{word,pos}], idioms:[{idiom,meaning,example}],
//           level, imageKeywords }
//   → 200 { status: 'unknown', word, suggestions } when the word isn't real —
//           a typo or nonsense. The client shows a "did you mean" page.
//
// The flow, in order — each step exists to avoid the next one's cost:
//
//   word_cache?    → hit: return it (no AI call)
//   word_rejects?  → hit: return suggestions (no AI call)
//   generate       → one AI call, which either produces the word or judges it
//                    unreal; the result is stored in whichever table it belongs
//                    to, so nobody pays for this word again.
//
// `level` is decided here, not by the client: word_cache holds ONE level per
// word for everyone, so a per-request level could only ever apply to whoever
// happened to search it first.
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
  requireUser,
  serviceClient,
  underRateLimit,
} from '../_shared/ai.ts';
import { readWord, storeWord, translationFor } from './cache.ts';
import { readReject, storeReject } from './rejects.ts';
import { fetchFamily, storeFamily } from './family.ts';
import { fetchIdioms, storeIdioms } from './idioms.ts';
import { generateWordData } from './generate.ts';
import { isVerdict } from './sanitize.ts';
import type { Generated } from './types.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });

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
  console.log(`[word] request word="${wordKey}" learn=${learnKey} mother=${motherLang} user=${auth.user.id}`);

  // ── 1. Known word? ──
  const cached = await readWord(svc, wordKey);
  if (cached) {
    const [translation, wordFamily, idioms] = await Promise.all([
      translationFor(svc, auth.supabase, wordKey, cached, motherLang),
      fetchFamily(svc, wordKey, cached.headword),
      fetchIdioms(svc, wordKey),
    ]);
    console.log(`[word] cache HIT "${wordKey}" (${Date.now() - t0}ms, family=${wordFamily.length}, idioms=${idioms.length})`);
    return jsonResponse(200, { ...cached.data, translation, wordFamily, idioms });
  }

  // ── 2. Known typo? ──
  const suggestions = await readReject(svc, wordKey, learnKey);
  if (suggestions) {
    console.log(`[word] reject HIT "${wordKey}" (${Date.now() - t0}ms, no AI call)`);
    return jsonResponse(200, { status: 'unknown', word: wordKey, suggestions });
  }

  // ── 3. Neither — ask the AI, and remember whatever it says ──
  if (!await underRateLimit(auth.supabase)) {
    console.warn(`[word] rate-limited user=${auth.user.id} word="${wordKey}"`);
    return jsonResponse(429, { error: 'Too many requests — please slow down and try again shortly.' });
  }

  console.log(`[word] cache MISS "${wordKey}" — AI call: full generation`);
  let result: Generated;
  try {
    result = await generateWordData(word, learnLang, motherLang);
  } catch (err) {
    console.error(`[word] generation FAILED "${wordKey}" (${Date.now() - t0}ms):`, (err as Error).message);
    return jsonResponse(502, { error: (err as Error).message || 'Failed to generate word data.' });
  }

  if (isVerdict(result)) {
    storeReject(svc, wordKey, learnKey, result.suggestions);
    console.log(`[word] REJECTED "${wordKey}" (${Date.now() - t0}ms, suggestions=${result.suggestions.length})`);
    return jsonResponse(200, { status: 'unknown', word: wordKey, suggestions: result.suggestions });
  }

  storeWord(svc, wordKey, motherLang, result);
  storeFamily(svc, wordKey, result);
  storeIdioms(svc, wordKey, result);
  console.log(`[word] generated "${wordKey}" (${Date.now() - t0}ms, family=${result.wordFamily?.length ?? 0})`);
  return jsonResponse(200, result);
});
