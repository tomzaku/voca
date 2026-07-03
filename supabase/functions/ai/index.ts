// Server-side AI proxy (Option A: app-owned key).
//
// The browser calls this function with the current user's Supabase JWT; the
// function holds the real provider API key as a secret and makes the upstream
// call. No AI key ever reaches the client.
//
// SECURITY: this is an ACTION API, not a raw prompt passthrough. The client may
// only invoke a fixed set of named actions with small, validated params — it
// can NOT supply the system prompt or arbitrary conversation. Every system
// prompt and prompt template lives here, server-side, so the endpoint can't be
// abused as a general-purpose LLM. A valid signed-in user is also required.
//
// Configure via `supabase secrets set`:
//   AI_PROVIDER        anthropic | openai | perplexity | google   (default: google)
//   AI_MODEL           optional model override
//   ANTHROPIC_API_KEY / OPENAI_API_KEY / PERPLEXITY_API_KEY / GOOGLE_API_KEY
// (SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically.)
//
// Deploy: `supabase functions deploy ai`

import { createClient } from 'jsr:@supabase/supabase-js@2';

type Provider = 'anthropic' | 'openai' | 'perplexity' | 'google';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PROVIDER = (Deno.env.get('AI_PROVIDER') ?? 'google') as Provider;

const KEY_ENV: Record<Provider, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
  google: 'GOOGLE_API_KEY',
};

const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-4o',
  perplexity: 'sonar',
  google: 'gemini-2.5-flash',
};

interface ChatMessage {
  role: string;
  content: string;
}

/** What each action builder produces — everything the provider call needs. */
interface BuiltRequest {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── Input validation helpers ───────────────────────────────────────
// Thrown validation errors become 400s. Caps keep any single request small so
// the endpoint can't be turned into a bulk text generator.

class BadRequest extends Error {}

function reqStr(params: Record<string, unknown>, key: string, maxLen: number): string {
  const v = params[key];
  if (typeof v !== 'string') throw new BadRequest(`Missing or invalid "${key}".`);
  const trimmed = v.trim();
  if (!trimmed) throw new BadRequest(`"${key}" must not be empty.`);
  return trimmed.slice(0, maxLen);
}

function oneOf<T extends string>(params: Record<string, unknown>, key: string, allowed: readonly T[], fallback?: T): T {
  const v = params[key];
  if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) return v as T;
  if (fallback !== undefined) return fallback;
  throw new BadRequest(`"${key}" must be one of: ${allowed.join(', ')}.`);
}

/** Sanitize a client-supplied conversation: known roles, capped count & length. */
function sanitizeHistory(v: unknown, maxCount: number, maxLen: number): ChatMessage[] {
  if (!Array.isArray(v)) throw new BadRequest('"history" must be an array.');
  return v.slice(-maxCount).map((m) => {
    const content = typeof m?.content === 'string' ? m.content.slice(0, maxLen) : '';
    const role = m?.role === 'assistant' ? 'assistant' : 'user';
    return { role, content };
  }).filter((m) => m.content);
}

// ─── English conversation prompts (ported from the old client) ──────

const ENGLISH_TOPIC_LABELS: Record<string, string> = {
  'daily-life': 'Daily Life',
  travel: 'Travel',
  technology: 'Technology',
  work: 'Work & Career',
  food: 'Food & Cooking',
  health: 'Health & Fitness',
  entertainment: 'Entertainment',
  culture: 'Culture & Society',
  education: 'Education',
  environment: 'Environment',
  random: 'Random',
};
const TOPIC_IDS = Object.keys(ENGLISH_TOPIC_LABELS);
const PRACTICE_MODES = ['smooth', 'feedback'] as const;

const LEARNINGS_BLOCK_INSTRUCTION = `

IMPORTANT — at the very end of EVERY response (after your conversational text), append a structured data block with any corrections or tips. Use this exact format:

~~~learnings
[
  {"category": "grammar", "original": "what the user said", "corrected": "the corrected version", "explanation": "why"},
  {"category": "vocabulary", "original": "word used", "corrected": "better alternative", "explanation": "why it's more natural"},
  {"category": "rephrase", "original": "user's sentence", "corrected": "more native phrasing", "explanation": "why this sounds more natural"},
  {"category": "tip", "original": "", "corrected": "the tip or idiom", "explanation": "when to use it"}
]
~~~

Rules for the block:
- Include ALL applicable categories — omit any that don't apply
- If there are no corrections or tips, output an empty array: ~~~learnings\\n[]\\n~~~
- The block is hidden from the user — they only see the conversational text above it
- Always include the block, even if the array is empty

IMPORTANT — this is SPEAKING practice, not writing practice:
- Do NOT correct capitalization, punctuation, or formatting
- Focus on grammar structure, word choice, natural phrasing
- Corrections should reflect how native speakers actually talk in casual conversation
- Contractions like "gonna", "wanna", "gotta" are natural in spoken English`;

function chatSystemPrompt(topicId: string, mode: string): string {
  const topicLabel = ENGLISH_TOPIC_LABELS[topicId] ?? topicId;

  if (mode === 'smooth') {
    return `You are a friendly English conversation partner helping someone practice their English speaking skills. The topic is: "${topicLabel}".

Rules:
- Ask one question at a time — keep it conversational and natural
- ${topicId === 'random' ? 'Pick a random interesting topic for each question' : `Stay on the topic of "${topicLabel}" but explore different angles`}
- After the user responds, briefly acknowledge their answer (1 sentence), then ask a follow-up or new question
- Do NOT correct grammar in your conversational text — just keep it flowing naturally
- Keep your responses concise — 2-4 sentences max
- Be warm, patient, and encouraging
- Do NOT use bullet points or lists — keep it conversational
${LEARNINGS_BLOCK_INSTRUCTION}`;
  }

  return `You are a friendly English conversation partner helping someone practice their English speaking skills. The topic is: "${topicLabel}".

Rules:
- Ask one question at a time — keep it conversational and natural
- ${topicId === 'random' ? 'Pick a random interesting topic for each question' : `Stay on the topic of "${topicLabel}" but explore different angles`}
- After the user responds, briefly acknowledge their answer (1 sentence)
- Then provide detailed feedback on their English. Use this EXACT format for each issue:

  📝 **Grammar:** You said "_original_" → "_corrected_". (explanation)
  📖 **Vocabulary:** "_word used_" → "_better alternative_". (why it's more natural)
  🔄 **Rephrase:** A more native way to say "_original_" would be: "_rephrased_"
  💡 **Tip:** (useful idiom, collocation, or pattern)

- After the feedback, ask a follow-up question
- Be warm and encouraging
${LEARNINGS_BLOCK_INSTRUCTION}`;
}

function summarySystemPrompt(): string {
  return `You are an English language coach. Analyze ALL of the user's messages and provide a detailed summary.

Format your response like this:

## Grammar Issues

For each grammar mistake:
- **What you said:** "the exact quote"
- **Corrected:** "the corrected version"
- **Rule:** brief explanation

## Vocabulary & Phrasing

For unnatural or non-native phrasing:
- **What you said:** "the phrase"
- **More natural:** "the native-sounding alternative"
- **Why:** why it sounds more natural

## Native Speaker Tips

3-5 specific tips to sound more natural based on patterns you noticed.

## What You Did Well

Mention 2-3 things the user did well.

Be thorough but encouraging.
${LEARNINGS_BLOCK_INSTRUCTION}`;
}

// ─── Action registry ────────────────────────────────────────────────
// Each builder validates its own params and returns the exact request. Adding a
// capability means adding one entry here — never widening the client contract.

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

const ACTIONS: Record<string, (p: Record<string, unknown>) => BuiltRequest> = {
  word_data(p) {
    const word = reqStr(p, 'word', 100);
    const level = oneOf(p, 'level', LEVELS, 'intermediate');
    const learnLang = reqStr(p, 'learnLang', 40);
    const motherLang = reqStr(p, 'motherLang', 40);
    const isEnglish = learnLang.toLowerCase() === 'english';

    const headwordSpec = isEnglish
      ? `"word": "${word}",`
      : `"word": "the single ${learnLang} word that best translates the English word \\"${word}\\"",`;

    const prompt = `Generate vocabulary data for ${
      isEnglish ? `the English word "${word}"` : `the ${learnLang} equivalent of the English word "${word}"`
    } (level: ${level}).

Return this exact JSON structure (no markdown, no extra text):
{
  ${headwordSpec}
  "phonetic": "IPA phonetic notation like /wɜːrd/",
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
  "level": "${level}",
  "imageKeywords": ["concrete visual noun 1", "concept 2"]
}

The "translation" field MUST be written in ${motherLang}.${
      isEnglish ? '' : ` The "word", "definition", "examples", "synonyms", and "antonyms" MUST all be written in ${learnLang}.`
    } For imageKeywords, always use 1-2 simple concrete English nouns or short phrases that visually represent the meaning (used for image search).`;

    return {
      system: 'You are a vocabulary tutor. Return ONLY valid JSON, no markdown, no explanation.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 700,
    };
  },

  cloze(p) {
    if (!Array.isArray(p.words)) throw new BadRequest('"words" must be an array.');
    const words = p.words
      .filter((w): w is string => typeof w === 'string')
      .slice(0, 30)
      .map((w) => w.trim().slice(0, 60))
      .filter(Boolean);
    if (words.length < 2) throw new BadRequest('"words" needs at least 2 entries.');
    const learnLang = reqStr(p, 'learnLang', 40);
    const isEnglish = learnLang.toLowerCase() === 'english';
    const list = words.map((w) => `"${w}"`).join(', ');

    const prompt = `Write ONE coherent, engaging paragraph (about ${Math.min(
      Math.max(words.length * 22, 70),
      170,
    )} words) suitable for a language learner.${
      isEnglish ? '' : ` Write the paragraph in ${learnLang}.`
    }

You MUST use each of these vocabulary words exactly once, in a natural context: ${list}.

${
      isEnglish
        ? 'Wrap each of those target words in double square brackets, e.g. she felt [[anxious]] about it.'
        : `For each English word above, use its most natural ${learnLang} equivalent and wrap THAT ${learnLang} word in double square brackets, e.g. [[word]].`
    } Only wrap the ${words.length} target words — nothing else. Do not wrap the same word more than once.

Return this exact JSON (no markdown, no extra text):
{ "paragraph": "the paragraph text with each target word wrapped in [[ ]]" }`;

    return {
      system: 'You write short, engaging vocabulary-practice paragraphs. Return ONLY valid JSON, no markdown, no explanation.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 600,
    };
  },

  word_dialogues(p) {
    const word = reqStr(p, 'word', 100);
    return {
      system: 'You generate short example dialogues for vocabulary learning. Return ONLY the dialogues, no extra text.',
      messages: [{
        role: 'user',
        content: `Create 3 short, natural dialogues (2 lines each) that naturally use the word "${word}".

Format exactly like this:
A: sentence using the word
B: response

A: another use
B: response

A: third use
B: response`,
      }],
      maxTokens: 300,
    };
  },

  translate_word(p) {
    const word = reqStr(p, 'word', 100);
    const targetLang = reqStr(p, 'targetLang', 40);
    return {
      system: 'You are a bilingual vocabulary tutor. Be concise and practical.',
      messages: [{
        role: 'user',
        content: `Translate and explain the English word "${word}" for a ${targetLang} speaker.

Provide:
1. **${targetLang} equivalent** — the most natural translation
2. **Example** — one English sentence with ${targetLang} translation below it
3. **Note** — one brief usage tip in ${targetLang}

Keep it short and practical.`,
      }],
      maxTokens: 250,
    };
  },

  tutor_start(p) {
    const word = reqStr(p, 'word', 100);
    const definition = reqStr(p, 'definition', 1000);
    return {
      system: `You are a friendly vocabulary tutor testing the student on the word "${word}". Definition: ${definition}. Keep replies brief (1-3 sentences). Be warm and encouraging.`,
      messages: [{ role: 'user', content: `Ask the student one engaging question to test their understanding of "${word}". Options: use it in a sentence, describe a situation, or explain it in their own words.` }],
      maxTokens: 150,
    };
  },

  tutor_reply(p) {
    const word = reqStr(p, 'word', 100);
    const definition = reqStr(p, 'definition', 1000);
    const isLast = p.isLast === true;
    const history = sanitizeHistory(p.history, 40, 4000);
    return {
      system: `You are a friendly vocabulary tutor. Word: "${word}". Definition: ${definition}. Be brief (1-3 sentences). ${isLast ? 'This is the final turn — give a warm closing summary.' : ''}`,
      messages: [
        ...history,
        { role: 'user', content: isLast ? 'Give brief closing feedback and summarize what they learned.' : 'Give brief feedback on their answer, then ask one follow-up question.' },
      ],
      maxTokens: 180,
    };
  },

  chat_start(p) {
    const topicId = oneOf(p, 'topicId', TOPIC_IDS);
    const mode = oneOf(p, 'mode', PRACTICE_MODES);
    return {
      system: chatSystemPrompt(topicId, mode),
      messages: [{ role: 'user', content: 'Start the conversation. Greet me and ask me the first question.' }],
      maxTokens: mode === 'feedback' ? 1024 : 512,
    };
  },

  chat_reply(p) {
    const topicId = oneOf(p, 'topicId', TOPIC_IDS);
    const mode = oneOf(p, 'mode', PRACTICE_MODES);
    const messages = sanitizeHistory(p.messages, 60, 4000);
    if (messages.length === 0) throw new BadRequest('"messages" must not be empty.');
    return {
      system: chatSystemPrompt(topicId, mode),
      messages,
      maxTokens: mode === 'feedback' ? 1024 : 512,
    };
  },

  chat_summary(p) {
    const conversationText = reqStr(p, 'conversationText', 40000);
    return {
      system: summarySystemPrompt(),
      messages: [{ role: 'user', content: `Here is my conversation:\n\n${conversationText}` }],
      maxTokens: 2048,
    };
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  // Require a real signed-in user (rejects the bare anon key / no token).
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return jsonResponse(401, { error: 'Please sign in to use AI features.' });

  // Per-user rate limit (fixed window). Tunable without a redeploy via secrets:
  //   AI_RATE_LIMIT (default 60), AI_RATE_WINDOW_SECONDS (default 60).
  const rateLimit = Number(Deno.env.get('AI_RATE_LIMIT')) || 60;
  const rateWindow = Number(Deno.env.get('AI_RATE_WINDOW_SECONDS')) || 60;
  const { data: allowed, error: rlErr } = await supabase.rpc('check_ai_rate_limit', {
    p_limit: rateLimit,
    p_window_seconds: rateWindow,
  });
  // Fail open on infra errors (e.g. migration not applied yet); block only on an
  // explicit false so a broken limiter never takes down all AI features.
  if (allowed === false && !rlErr) {
    return jsonResponse(429, { error: 'Too many requests — please slow down and try again shortly.' });
  }

  let payload: { action?: string; params?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }

  const action = payload.action;
  if (!action || typeof action !== 'string' || !(action in ACTIONS)) {
    return jsonResponse(400, { error: `Unknown action "${action}".` });
  }

  let built: BuiltRequest;
  try {
    built = ACTIONS[action](payload.params ?? {});
  } catch (err) {
    if (err instanceof BadRequest) return jsonResponse(400, { error: err.message });
    return jsonResponse(400, { error: 'Invalid request parameters.' });
  }

  const apiKey = Deno.env.get(KEY_ENV[PROVIDER]) ?? '';
  if (!apiKey) return jsonResponse(500, { error: `Server is missing the ${PROVIDER} API key.` });

  const model = Deno.env.get('AI_MODEL') || DEFAULT_MODEL[PROVIDER];
  const max = Math.min(built.maxTokens, 4000);

  try {
    const text = PROVIDER === 'anthropic'
      ? await callAnthropic(apiKey, model, built.system, built.messages, max)
      : await callOpenAICompatible(PROVIDER, apiKey, model, built.system, built.messages, max);
    return jsonResponse(200, { text });
  } catch (err) {
    return jsonResponse(502, { error: (err as Error).message || 'AI provider error.' });
  }
});

async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || `API error: ${res.status}`);
  }
  const data = await res.json();
  // Skip any leading `thinking` block; grab the first text block.
  const text = (data.content as { type: string; text?: string }[] | undefined)
    ?.find((b) => b.type === 'text')?.text;
  return text || 'No response received.';
}

function endpointFor(provider: Provider): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions';
    case 'perplexity':
      return 'https://api.perplexity.ai/chat/completions';
    case 'google':
      return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function callOpenAICompatible(
  provider: Provider,
  apiKey: string,
  model: string,
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  const res = await fetch(endpointFor(provider), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || err?.message || `API error: ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response received.';
}
