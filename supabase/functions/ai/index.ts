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
  underRateLimit,
} from '../_shared/ai.ts';

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

  try {
    const text = await callProvider(built.system, built.messages, built.maxTokens);
    return jsonResponse(200, { text });
  } catch (err) {
    return jsonResponse(502, { error: (err as Error).message || 'AI provider error.' });
  }
});
