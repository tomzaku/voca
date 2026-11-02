// Word-selection endpoint. Picks which words a user should study next from a
// candidate list, using the server-side user_word_progress rows — the
// authoritative, cross-device state — so a device with stale local progress
// still gets the words the user is actually incorrect on / has never checked.
//
//   POST { words: string[], exclude?: string[], count?: number, mode?: 'learn' | 'quiz',
//          sources?: { random?: boolean, unseen?: boolean, mistakes?: boolean, smart?: boolean } }
//   → 200 { words: string[] }   (ordered picks, drawn from the submitted list)
//
// 'learn' mirrors the client's pickNextWord: a 50/50 mix of difficult words
// (last round failed, or more wrong answers than correct) and never-answered
// words; correctly-answered words only return when their FSRS review is due.
// 'quiz' mirrors sampleQuizWords: an even round-robin over the pools the user
// checked — 'mistakes' (>30% wrong), 'unseen' (never answered) and 'random'
// (anything) — each defaulting to on when omitted. sources.smart overrides the
// pools and runs the learn algorithm instead (Smart word selection on the quiz
// settings screen).
// Dismissed (skipped-for-good) words are never picked in either mode.
//
// The client falls back to the same algorithm over local state when offline.
//
// Signing in isn't required: a visitor without an account simply has no progress
// rows, so every word reads as never-answered and they get the same selection
// the client would make on its own. Nothing here is generated or billed — it's
// a sort over a list the caller already sent.
//
// Deploy: `supabase functions deploy pick`

import { corsHeaders, jsonResponse, optionalUser } from '../_shared/ai.ts';
import { asWords, loadProgress, pickLearnWord, sampleQuizWords, type QuizSources } from '../_shared/pick.ts';

const MAX_WORDS = 1000;
const MAX_EXCLUDE = 100;
const MAX_COUNT = 20;

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

  const words = asWords(params.words, MAX_WORDS);
  if (words.length === 0) return jsonResponse(400, { error: '"words" must be a non-empty array.' });
  const exclude = new Set(asWords(params.exclude, MAX_EXCLUDE).map((w) => w.toLowerCase()));
  const count = Math.min(MAX_COUNT, Math.max(1, Number(params.count) || 1));
  const mode = params.mode === 'quiz' ? 'quiz' : 'learn';
  // Quiz pools — each defaults to on when omitted (old clients send none);
  // 'smart' defaults to off and overrides the pools when set.
  const src = (params.sources ?? {}) as Record<string, unknown>;
  let sources: QuizSources = {
    random: src.random !== false,
    unseen: src.unseen !== false,
    mistakes: src.mistakes !== false,
    smart: src.smart === true,
  };
  // Nothing checked would pick nothing — treat it as "everything".
  if (!sources.random && !sources.unseen && !sources.mistakes && !sources.smart) {
    sources = { random: true, unseen: true, mistakes: true, smart: false };
  }

  const prog = await loadProgress(auth.supabase, auth.user?.id ?? null);
  if (!prog) return jsonResponse(500, { error: 'Could not load progress.' });

  const now = Date.now();
  let picks: string[];
  if (mode === 'quiz' && !sources.smart) {
    picks = sampleQuizWords(words.filter((w) => !exclude.has(w.toLowerCase())), prog, count, sources);
  } else {
    picks = [];
    const taken = new Set(exclude);
    for (let i = 0; i < count; i++) {
      const w = pickLearnWord(words, prog, taken, now);
      if (!w) break;
      picks.push(w);
      taken.add(w.toLowerCase());
    }
  }

  console.log(`[pick] mode=${mode} candidates=${words.length} picked=${picks.length} user=${auth.user?.id ?? 'anon'}`);
  return jsonResponse(200, { words: picks });
}

if (import.meta.main) Deno.serve(handler);
