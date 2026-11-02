// The `questions` resource — word questions for the world's games (the bus
// fare, the firework launch, a pool foul, a foosball power shot), made here so
// the player's device never sees the answer before they choose.
//
//   GET  /questions ?count=          → { questions, collection }
//        questions: { token, prompt, options }[]   no answer in sight
//   POST /questions/check { token, choice } → { correct, answer }
//
// Which words: the collection the caller is studying RIGHT NOW (their
// settings row, read here — so switching collections takes effect on the next
// question, whatever the device last loaded), picked by the same rules as the
// flash cards (_shared/pick.ts: difficult and new first, the rest when due).
// A visitor gets Curated. Built-in collections are read from
// _shared/systemCollections.json (`npm run export:collections`); a learner's
// own or a shared one from the `collections` table, through their RLS-scoped
// client.
//
// NO AI, EVER: a question is built from a definition already stored in
// word_cache — written once per word, the first time anyone looks it up, and
// shared by everyone. A word with no stored definition is skipped, not
// generated. So asking a word again — anyone, any game — costs nothing.
//
// The answer travels sealed in the token (AES-GCM under a server secret,
// _shared/questions.ts): the device carries it back with the choice, and
// only this function can read it.
//
// Deploy: `npm run deploy:questions`

import { corsHeaders, jsonResponse, optionalUser, serviceClient } from '../_shared/ai.ts';
import { loadProgress, pickLearnWord } from '../_shared/pick.ts';
import { distractors, matches, open, promptFor, seal, shuffle, TOKEN_TTL_MS, type Question } from '../_shared/questions.ts';
import SYSTEM from '../_shared/systemCollections.json' with { type: 'json' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_COUNT = 20;
const DEFAULT_COLLECTION = 'curated';
const SYSTEM_WORDS = SYSTEM as Record<string, string[]>;

function secret(): string | null {
  return Deno.env.get('QUESTIONS_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || null;
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const sub = parts.slice(parts.lastIndexOf('questions') + 1).join('/');
  const route = `${req.method} ${sub}`.trim();

  const key = secret();
  const db = serviceClient();
  if (!key || !db) return jsonResponse(500, { error: 'Questions are unavailable right now.' });
  const auth = await optionalUser(req);
  const me = auth.user?.id ?? '';

  try {
    if (route === 'GET') {
      const count = Math.min(MAX_COUNT, Math.max(1, Math.round(Number(url.searchParams.get('count')) || 1)));

      // The collection they're studying now.
      let collectionId = DEFAULT_COLLECTION;
      if (auth.user) {
        const { data } = await auth.supabase.from('user_settings').select('active_collection').eq('user_id', me).maybeSingle();
        if (typeof data?.active_collection === 'string' && data.active_collection) collectionId = data.active_collection;
      }
      let words: string[] = SYSTEM_WORDS[collectionId] ?? [];
      if (!words.length && UUID.test(collectionId)) {
        const { data } = await auth.supabase.from('collections').select('words').eq('id', collectionId).maybeSingle();
        words = Array.isArray(data?.words) ? (data.words as string[]) : [];
      }
      if (!words.length) { collectionId = DEFAULT_COLLECTION; words = SYSTEM_WORDS[DEFAULT_COLLECTION] ?? []; }

      // Picked as the flash cards pick, a few spare: not every word has a
      // stored definition yet.
      const prog = (await loadProgress(auth.supabase, auth.user ? me : null)) ?? (() => undefined);
      const taken = new Set<string>();
      const picks: string[] = [];
      const now = Date.now();
      for (let i = 0; i < count * 4 && picks.length < Math.min(words.length, 80); i++) {
        const w = pickLearnWord(words, prog, taken, now);
        if (!w) break;
        picks.push(w);
        taken.add(w.toLowerCase());
      }

      const defs = new Map<string, string>();
      const lookUp = async (ws: string[]) => {
        const want = [...new Set(ws.map((w) => w.toLowerCase()))].filter((w) => !defs.has(w)).slice(0, 200);
        if (!want.length) return;
        const { data, error } = await db.from('word_cache').select('word, definition').in('word', want);
        if (error) throw new Error(error.message);
        for (const r of data ?? []) if (r.definition) defs.set(String(r.word).toLowerCase(), String(r.definition));
      };
      await lookUp(picks);
      let chosen = picks.filter((w) => defs.has(w.toLowerCase())).slice(0, count);
      if (chosen.length < count) {
        // Short of stored definitions among the picks: any other word of the
        // collection that has one.
        await lookUp(shuffle(words.filter((w) => !taken.has(w.toLowerCase()))).slice(0, 200));
        const more = words.filter((w) => !taken.has(w.toLowerCase()) && defs.has(w.toLowerCase()));
        chosen = [...chosen, ...shuffle(more)].slice(0, count);
      }

      // Wrong options from the same collection — a small one borrows from Curated.
      const pool = words.length >= 8 ? words : [...words, ...(SYSTEM_WORDS[DEFAULT_COLLECTION] ?? [])];
      const expires = now + TOKEN_TTL_MS;
      const questions: Question[] = await Promise.all(chosen.map(async (word) => ({
        token: await seal({ a: word, u: me, e: expires }, key),
        prompt: promptFor(word, defs.get(word.toLowerCase())!),
        options: shuffle([word, ...distractors(word, pool)]),
      })));
      return jsonResponse(200, { questions, collection: collectionId });
    }

    if (route === 'POST check') {
      let body: Record<string, unknown>;
      try { body = await req.json(); } catch { return jsonResponse(400, { error: 'Invalid JSON body.' }); }
      const token = typeof body.token === 'string' ? body.token : '';
      const choice = typeof body.choice === 'string' ? body.choice.slice(0, 100) : '';
      const sealed = await open(token, key, me, Date.now());
      if (!sealed) return jsonResponse(400, { error: 'This question has expired — try another.' });
      return jsonResponse(200, { correct: matches(choice, sealed.a), answer: sealed.a });
    }

    return jsonResponse(404, { error: 'Not found' });
  } catch (err) {
    console.error('[questions]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
