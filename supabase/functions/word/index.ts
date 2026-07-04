// Word-data endpoint. Cache-first: it usually returns stored vocabulary data
// with NO AI call, which is why it lives apart from the always-generative `ai`
// function. Returns the word object directly (not a `{ text }` wrapper).
//
//   POST { word, level, learnLang, motherLang }
//   → 200 { word, phonetic, phonetics:{ "en-US":…, "en-GB":… }, partOfSpeech, definition,
//           translation, examples, synonyms, antonyms, collocations, level,
//           imageKeywords }
//
// Cache model (word_cache): one row per word holds the language-neutral content;
// translations are a per-mother-tongue map. A new mother tongue triggers a cheap
// translate-only call rather than regenerating the whole word. Only the service
// role writes the cache, so it can't be poisoned by clients.
//
// Deploy: `supabase functions deploy word`

import {
  BadRequest,
  callProvider,
  corsHeaders,
  jsonResponse,
  oneOf,
  reqStr,
  requireUser,
  serviceClient,
  stripFences,
  underRateLimit,
  type ChatMessage,
} from '../_shared/ai.ts';

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const GENERATE_ATTEMPTS = 4;

interface WordData {
  word?: string;
  phonetics?: Record<string, string>; // keyed by locale, e.g. { "en-US": "…", "en-GB": "…" }
  partOfSpeech?: string;
  definition?: string;
  translation?: string;
  examples?: string[];
  synonyms?: string[];
  antonyms?: string[];
  collocations?: string[];
  level?: string;
  imageKeywords?: string[];
}

const asArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

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

  let word: string, level: string, learnLang: string, motherLang: string;
  try {
    word = reqStr(params, 'word', 100);
    level = oneOf(params, 'level', LEVELS, 'intermediate');
    learnLang = reqStr(params, 'learnLang', 40);
    motherLang = reqStr(params, 'motherLang', 40);
  } catch (err) {
    if (err instanceof BadRequest) return jsonResponse(400, { error: err.message });
    return jsonResponse(400, { error: 'Invalid request parameters.' });
  }

  const wordKey = word.toLowerCase();
  const motherKey = motherLang.toLowerCase();
  const svc = serviceClient();

  // ── Cache hit ──
  if (svc) {
    const { data: row } = await svc.from('word_cache').select('*').eq('word', wordKey).maybeSingle();
    if (row) {
      const translations = (row.translations ?? {}) as Record<string, string>;
      let translation = translations[motherKey];
      // Cached, but not in this user's language — top it up cheaply instead of
      // regenerating (skipped if the user is over their rate limit). Collocations
      // are handled by the one-off backfill script, so no top-up needed here.
      if (!translation && await underRateLimit(auth.supabase)) {
        try {
          translation = await translateWord(String(row.headword ?? wordKey), String(row.definition), motherLang);
          mergeTranslation(wordKey, translations, motherKey, translation);
        } catch { /* return cached content without a translation this once */ }
      }
      return jsonResponse(200, wordDataFromRow(row, translation));
    }
  }

  // ── Cache miss → generate ──
  if (!await underRateLimit(auth.supabase)) {
    return jsonResponse(429, { error: 'Too many requests — please slow down and try again shortly.' });
  }

  let data: WordData;
  try {
    data = await generateWordData(word, level, learnLang, motherLang);
  } catch (err) {
    return jsonResponse(502, { error: (err as Error).message || 'Failed to generate word data.' });
  }

  if (svc) storeWord(svc, wordKey, motherKey, data);
  return jsonResponse(200, data);
});

// ─── AI generation ──────────────────────────────────────────────────

async function generateWordData(
  word: string,
  level: string,
  learnLang: string,
  motherLang: string,
): Promise<WordData> {
  const isEnglish = learnLang.toLowerCase() === 'english';
  const system = 'You are a vocabulary tutor. Return ONLY valid JSON, no markdown, no explanation.';

  const headwordSpec = isEnglish
    ? `"word": "${word}",`
    : `"word": "the single ${learnLang} word that best translates the English word \\"${word}\\"",`;

  const prompt = `Generate vocabulary data for ${
    isEnglish ? `the English word "${word}"` : `the ${learnLang} equivalent of the English word "${word}"`
  } (level: ${level}).

Return this exact JSON structure (no markdown, no extra text):
{
  ${headwordSpec}
  "phonetics": { "en-US": "US IPA like /wɜːrd/", "en-GB": "UK IPA like /wɜːd/" },
  "partOfSpeech": "noun | verb | adjective | adverb | etc",
  "definition": "Clear, concise definition in 1-2 sentences${isEnglish ? '' : `, written in ${learnLang}`}",
  "translation": "the word's meaning translated into ${motherLang} (the most natural equivalent)",
  "examples": [
    "Natural example sentence showing the word in context.",
    "Another example with different usage.",
    "A third example if the word has notable nuance."
  ],
  "synonyms": ["synonym1", "synonym2", "synonym3"],
  "antonyms": ["antonym1", "antonym2"],
  "collocations": ["natural phrase 1", "natural phrase 2", "phrase 3", "phrase 4", "phrase 5"],
  "level": "${level}",
  "imageKeywords": ["concrete visual noun 1", "concept 2"]
}

Provide EXACTLY 5 "collocations": short, natural word pairings that commonly go with the word (e.g. for "decision": "make a decision", "tough decision", "final decision"). The "translation" field MUST be written in ${motherLang}.${
    isEnglish ? '' : ` The "word", "definition", "examples", "synonyms", "antonyms", and "collocations" MUST all be written in ${learnLang}.`
  } For imageKeywords, always use 1-2 simple concrete English nouns or short phrases that visually represent the meaning (used for image search).`;

  const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
  let lastError: unknown;
  for (let attempt = 1; attempt <= GENERATE_ATTEMPTS; attempt++) {
    try {
      const raw = await callProvider(system, messages, 700);
      const data = JSON.parse(stripFences(raw)) as WordData;
      if (typeof data.definition === 'string' && data.definition) return data;
      throw new Error('Model returned incomplete word data.');
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to generate word data.');
}

/** Cheap translate-only call: reuse cached English content, fetch just the mother-tongue word. */
async function translateWord(word: string, definition: string, motherLang: string): Promise<string> {
  const system = 'You are a translator. Return ONLY the translation — no quotes, no notes, no extra text.';
  const messages: ChatMessage[] = [{
    role: 'user',
    content: `Translate the English word "${word}" (meaning: ${definition}) into ${motherLang}. Give the single most natural ${motherLang} equivalent (one word or short phrase). Return only the translation.`,
  }];
  const text = await callProvider(system, messages, 40);
  return text.trim().replace(/^["']|["']$/g, '').slice(0, 200);
}

// ─── Cache read / write ─────────────────────────────────────────────

/** Rebuild the object the client expects from a cached row + this user's translation. */
function wordDataFromRow(row: Record<string, unknown>, translation?: string): WordData {
  const phonetics = (row.phonetics ?? {}) as Record<string, string>;
  return {
    word: (row.headword as string) ?? (row.word as string),
    phonetics,
    partOfSpeech: (row.part_of_speech as string) ?? undefined,
    definition: row.definition as string,
    translation: translation || undefined,
    examples: asArray(row.examples),
    synonyms: asArray(row.synonyms),
    antonyms: asArray(row.antonyms),
    collocations: asArray(row.collocations),
    level: (row.level as string) ?? undefined,
    imageKeywords: asArray(row.image_keywords),
  };
}

// deno-lint-ignore no-explicit-any
type Svc = any;

/** Store a freshly generated word (non-blocking). */
function storeWord(svc: Svc, wordKey: string, motherKey: string, d: WordData): void {
  const hasTranslation = typeof d.translation === 'string' && d.translation.length > 0;
  const row = {
    word: wordKey,
    headword: typeof d.word === 'string' ? d.word : wordKey,
    phonetics: d.phonetics ?? {},
    part_of_speech: d.partOfSpeech ?? null,
    definition: d.definition,
    examples: asArray(d.examples),
    synonyms: asArray(d.synonyms),
    antonyms: asArray(d.antonyms),
    collocations: asArray(d.collocations),
    image_keywords: asArray(d.imageKeywords),
    level: d.level ?? null,
    translations: hasTranslation ? { [motherKey]: d.translation } : {},
  };
  fireAndForget(svc.from('word_cache').upsert(row));
}

/** Merge one mother-tongue translation into an existing row's map (non-blocking). */
function mergeTranslation(wordKey: string, existing: Record<string, string>, motherKey: string, translation: string): void {
  const svc = serviceClient();
  if (!svc) return;
  fireAndForget(svc.from('word_cache').update({ translations: { ...existing, [motherKey]: translation } }).eq('word', wordKey));
}

function fireAndForget(query: PromiseLike<{ error: unknown }>): void {
  const p = Promise.resolve(query).then((res) => {
    if (res.error) console.warn('[word] cache write failed:', res.error);
  });
  const rt = (globalThis as unknown as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(p);
}
