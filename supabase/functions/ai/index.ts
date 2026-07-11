// Server-side AI proxy for the always-generative features (conversation, tutor,
// dialogues, story-gaps, translation). Word data lives in its own cache-first
// `word` function — see supabase/functions/word/index.ts.
//
// SECURITY: this is an ACTION API, not a raw prompt passthrough. The client may
// only invoke a fixed set of named actions with small, validated params — it
// can NOT supply the system prompt or arbitrary conversation. Every system
// prompt and template lives here, server-side. A signed-in user is required,
// and each user is rate-limited.
//
// Configure via `supabase secrets set`:
//   AI_PROVIDER  anthropic | openai | perplexity | google   (default: google)
//   AI_MODEL     optional model override
//   ANTHROPIC_API_KEY / OPENAI_API_KEY / PERPLEXITY_API_KEY / GOOGLE_API_KEY
//   AI_RATE_LIMIT (default 60), AI_RATE_WINDOW_SECONDS (default 60)
//   GOOGLE_API_KEY is also needed (regardless of AI_PROVIDER) for the pro
//   mind-map doodles; MINDMAP_IMAGE_MODEL overrides the image model
//   (default imagen-4.0-fast-generate-001).
//
// Deploy: `supabase functions deploy ai`

import {
  BadRequest,
  callProvider,
  type ChatMessage,
  corsHeaders,
  jsonResponse,
  oneOf,
  reqStr,
  requireUser,
  sanitizeHistory,
  serviceClient,
  underRateLimit,
} from '../_shared/ai.ts';
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';

/** What each action builder produces — everything the provider call needs. */
interface BuiltRequest {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
}

// ─── English conversation prompts ───────────────────────────────────

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

// Actions in this set additionally require a row in `pro_users` (granted
// manually — see the pro_users migration). Checked in the request handler.
const PRO_ACTIONS = new Set(['mindmap', 'mindmap_doodle']);

// ─── Doodle image generation (pro mind map) ─────────────────────────
// Unlike every other action, `mindmap_doodle` returns an image, not text, so
// it bypasses the ACTIONS/callProvider path. It always uses Google's image
// API regardless of AI_PROVIDER — set GOOGLE_API_KEY for doodles to work.
//
// Default model is Imagen 4 Fast: ~2x lower latency and ~half the price of
// the Gemini image model. Neither offers outputs below 1024×1024 — "1K" is
// the floor — so speed comes from the model choice, not a smaller canvas.
// Override with MINDMAP_IMAGE_MODEL: an `imagen-*` id uses the :predict
// endpoint, anything else (e.g. gemini-2.5-flash-image) uses :generateContent.

const DOODLE_THUMB = 192; // px — the map shows doodles in a 126px box; 192 keeps them crisp on retina

/** Downscale a generated doodle to a small PNG thumbnail data URI so the
 *  shared cache stores ~15KB per word, not ~1.5MB. Falls back to the
 *  original image if decoding fails. */
async function shrinkDoodle(mime: string, b64: string): Promise<string> {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const img = await Image.decode(bytes);
    img.resize(DOODLE_THUMB, DOODLE_THUMB);
    const png = await img.encode();
    let out = '';
    const CHUNK = 0x8000; // btoa input built in chunks — spreading 15KB+ at once overflows the arg limit
    for (let i = 0; i < png.length; i += CHUNK) {
      out += String.fromCharCode(...png.subarray(i, i + CHUNK));
    }
    return `data:image/png;base64,${btoa(out)}`;
  } catch {
    return `data:${mime};base64,${b64}`;
  }
}

/** Throw a friendly error for a failed image API response. */
async function throwImageApiError(res: Response, model: string): Promise<never> {
  const body = await res.text().catch(() => '');
  // Free-tier keys have ZERO image-generation quota ("limit: 0") — surface
  // that as a plain sentence instead of Google's multi-line quota dump.
  if (res.status === 429 && /free_tier|limit:\s*0/.test(body)) {
    throw new Error(
      'The Google API key has no image-generation quota (free tier). Enable billing on its Google Cloud project to generate doodles.',
    );
  }
  let msg = '';
  try {
    msg = JSON.parse(body)?.error?.message || '';
  } catch { /* not JSON */ }
  throw new Error(`Image API error ${res.status} (model=${model})${msg ? `: ${msg}` : ''}`);
}

async function generateDoodle(word: string, definition: string): Promise<{ mime: string; b64: string }> {
  const apiKey = Deno.env.get('GOOGLE_API_KEY') ?? '';
  if (!apiKey) throw new Error('Doodles require a Google API key on the server.');
  const model = Deno.env.get('MINDMAP_IMAGE_MODEL') || 'imagen-4.0-fast-generate-001';

  const prompt = `A tiny hand-drawn doodle that hints at the meaning of the English word "${word}"${
    definition ? ` (meaning: ${definition})` : ''
  }. Style: quick felt-tip pen sketchnote doodle, 2-3 flat accent colors, plain transparent background, ONE simple centered drawing with thick clean lines, like a margin doodle in a study notebook. Absolutely no text, letters, or numbers in the image.`;

  const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey };

  // Imagen models use the :predict endpoint with a different payload shape.
  if (model.startsWith('imagen')) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: '1:1' },
        }),
      },
    );
    if (!res.ok) await throwImageApiError(res, model);
    const data = await res.json();
    const pred: { mimeType?: string; bytesBase64Encoded?: string } | undefined =
      data.predictions?.[0];
    if (!pred?.bytesBase64Encoded) throw new Error('The image model returned no image.');
    return { mime: pred.mimeType || 'image/png', b64: pred.bytesBase64Encoded };
  }

  // Gemini image models (e.g. gemini-2.5-flash-image) via :generateContent.
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    },
  );
  if (!res.ok) await throwImageApiError(res, model);
  const data = await res.json();
  const parts: { inlineData?: { mimeType?: string; data?: string } }[] =
    data.candidates?.[0]?.content?.parts ?? [];
  const inline = parts.find((p) => p.inlineData?.data)?.inlineData;
  if (!inline?.data) throw new Error('The image model returned no image.');
  return { mime: inline.mimeType || 'image/png', b64: inline.data };
}

const ACTIONS: Record<string, (p: Record<string, unknown>) => BuiltRequest> = {
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

  // Pro-only: interactive mind map of the user's saved words. Returns a
  // jsMind-style "node_tree" JSON document that the WordMindMap component
  // renders (collapsible branches, per-word definitions, emoji per node).
  mindmap(p) {
    if (!Array.isArray(p.words)) throw new BadRequest('"words" must be an array.');
    const words = p.words
      .filter((w): w is string => typeof w === 'string')
      .slice(0, 40)
      .map((w) => w.trim().slice(0, 60))
      .filter(Boolean);
    if (words.length < 2) throw new BadRequest('"words" needs at least 2 entries.');
    const list = words.map((w) => `"${w}"`).join(', ');

    const prompt = `Organize these English vocabulary words into a mind map that helps a learner memorize them: ${list}.

Group the words into ${Math.min(Math.max(Math.ceil(words.length / 5), 2), 8)} (or so) themed branches with short, memorable names (e.g. "Emotions & Attitudes", "Actions & Behavior"). Every input word must appear exactly once, as a leaf node under exactly one branch, spelled EXACTLY as given above.

Return ONLY this JSON (jsMind node_tree format), no markdown, no extra text:
{
  "meta": { "name": "vocabulary-mindmap", "version": "1.0" },
  "format": "node_tree",
  "data": {
    "id": "root",
    "topic": "a short catchy title for the whole map (2-4 words)",
    "emoji": "one emoji for the map",
    "children": [
      {
        "id": "branch-1",
        "topic": "theme name",
        "emoji": "one emoji hinting at the theme",
        "children": [
          {
            "id": "word-<the word>",
            "topic": "<the word exactly as given>",
            "emoji": "one emoji hinting at the word's meaning",
            "definition": "very short plain-English definition (max 12 words)",
            "children": []
          }
        ]
      }
    ]
  }
}`;

    return {
      system: 'You design vocabulary mind maps for language learners. Return ONLY valid JSON matching the requested schema — no markdown fences, no commentary.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: Math.min(600 + words.length * 60, 4000),
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

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use AI features.' });

  if (!await underRateLimit(auth.supabase)) {
    return jsonResponse(429, { error: 'Too many requests — please slow down and try again shortly.' });
  }

  let payload: { action?: string; params?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }

  const action = payload.action;
  if (!action || typeof action !== 'string' || !(action in ACTIONS || action === 'mindmap_doodle')) {
    return jsonResponse(400, { error: `Unknown action "${action}".` });
  }

  if (PRO_ACTIONS.has(action)) {
    // The user-scoped client can only see the caller's own pro_users row
    // (RLS), so a returned row is proof this user has Pro. A NULL expires_at
    // is a lifetime grant; otherwise Pro lasts until that moment.
    const { data: proRow, error: proErr } = await auth.supabase
      .from('pro_users')
      .select('expires_at')
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (proErr) return jsonResponse(500, { error: 'Could not verify Pro status.' });
    if (!proRow) return jsonResponse(403, { error: 'This feature requires a Pro account.' });
    if (proRow.expires_at && new Date(proRow.expires_at) <= new Date()) {
      return jsonResponse(403, { error: 'Your Pro access has expired.' });
    }
  }

  // Image action — returns { image: dataUri } instead of { text }.
  if (action === 'mindmap_doodle') {
    let word: string;
    let definition: string;
    let cachedOnly: boolean;
    try {
      const p = payload.params ?? {};
      word = reqStr(p, 'word', 60);
      definition = typeof p.definition === 'string' ? p.definition.slice(0, 200) : '';
      cachedOnly = p.cachedOnly === true;
    } catch (err) {
      if (err instanceof BadRequest) return jsonResponse(400, { error: err.message });
      return jsonResponse(400, { error: 'Invalid request parameters.' });
    }

    // A doodle is the same for everyone, so it lives on the word's shared
    // cache row (same keying as the `word` function) — generated once, ever.
    const wordKey = word.toLowerCase();
    const svc = serviceClient();
    if (svc) {
      const { data: row } = await svc
        .from('word_cache')
        .select('doodle')
        .eq('word', wordKey)
        .maybeSingle();
      if (row?.doodle) return jsonResponse(200, { image: row.doodle });
    }

    // cachedOnly = a free lookup: never falls through to paid generation.
    // The client uses it on map open; generation waits for an explicit
    // "Sketch doodles" click.
    if (cachedOnly) return jsonResponse(200, { image: null });

    try {
      const { mime, b64 } = await generateDoodle(word, definition);
      const image = await shrinkDoodle(mime, b64);
      // Save onto the word's cache row. Bookmarked words practically always
      // have one (created when the word was learned); if not, the update
      // matches nothing and the doodle is simply regenerated next time.
      if (svc) await svc.from('word_cache').update({ doodle: image }).eq('word', wordKey);
      return jsonResponse(200, { image });
    } catch (err) {
      return jsonResponse(502, { error: (err as Error).message || 'Image generation failed.' });
    }
  }

  let built: BuiltRequest;
  try {
    built = ACTIONS[action](payload.params ?? {});
  } catch (err) {
    if (err instanceof BadRequest) return jsonResponse(400, { error: err.message });
    return jsonResponse(400, { error: 'Invalid request parameters.' });
  }

  try {
    const text = await callProvider(built.system, built.messages, built.maxTokens);
    return jsonResponse(200, { text });
  } catch (err) {
    return jsonResponse(502, { error: (err as Error).message || 'AI provider error.' });
  }
});
