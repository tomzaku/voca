// English conversation practice — the "Practice English" drawer, opened from
// the FAB or from a topic on the /speaking page. Split out of the `ai` function
// because this is the chattiest AI feature we have (a generative call on every
// turn, plus a long summary), so it deserves its own deploy, its own logs and
// its own scaling knobs.
//
//   POST /chat/start    { topicId, mode, … }        → { text }
//   POST /chat/reply    { topicId, mode, messages } → { text }
//   POST /chat/summary  { conversationText }        → { text }
//
// SECURITY: a fixed set of named operations, not a raw prompt passthrough —
// same contract as the `ai` function. The client may only invoke the three
// routes below with small, validated params; it can NOT supply the system
// prompt or arbitrary conversation. Every prompt lives here, server-side.
// Practising is Pro-only and rate-limited per user.
//
// Configure via `supabase secrets set` (shared with the `ai` function):
//   AI_PROVIDER  anthropic | openai | perplexity | google   (default: google)
//   AI_MODEL     optional model override
//   ANTHROPIC_API_KEY / OPENAI_API_KEY / PERPLEXITY_API_KEY / GOOGLE_API_KEY
//   AI_RATE_LIMIT (default 60), AI_RATE_WINDOW_SECONDS (default 60)
//
// Deploy: `supabase functions deploy chat`

import {
  BadRequest,
  callProvider,
  type ChatMessage,
  corsHeaders,
  jsonResponse,
  oneOf,
  optLine,
  proGateError,
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

// ─── Topics & modes ─────────────────────────────────────────────────

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
  // Sessions launched from the /speaking page. Its topic catalogue (short
  // conversations, podcasts, IELTS) lives in the client data files and is far
  // too large to mirror here, so those sessions come in under this one id and
  // carry the subject as the capped `topicLabel`/`focus` params below.
  speaking: 'Speaking Practice',
};
const TOPIC_IDS = Object.keys(ENGLISH_TOPIC_LABELS);
const PRACTICE_MODES = ['smooth', 'feedback'] as const;

// ─── Prompts ────────────────────────────────────────────────────────

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

/** Optional subject the client can pin the session to — see the `speaking` id. */
interface ChatContext {
  /** Display label for the topic, e.g. "Hometown & Travel". */
  label?: string | null;
  /** A specific prompt to open with, e.g. a speaking question or podcast title. */
  focus?: string | null;
}

function chatSystemPrompt(topicId: string, mode: string, ctx: ChatContext = {}): string {
  const topicLabel = ctx.label || ENGLISH_TOPIC_LABELS[topicId] || topicId;
  const topicRule = topicId === 'random' && !ctx.label
    ? 'Pick a random interesting topic for each question'
    : `Stay on the topic of "${topicLabel}" but explore different angles`;
  const focusRule = ctx.focus
    ? `\n- The session is built around this question: "${ctx.focus}" — open with it, then follow up on the user's answer and stay close to it`
    : '';

  if (mode === 'smooth') {
    return `You are a friendly English conversation partner helping someone practice their English speaking skills. The topic is: "${topicLabel}".

Rules:
- Ask one question at a time — keep it conversational and natural
- ${topicRule}${focusRule}
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
- ${topicRule}${focusRule}
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

/**
 * The optional subject a session is pinned to. Both fields are plain content —
 * short, single-line and capped — that gets quoted into the system prompt this
 * function owns; neither can replace or extend that prompt.
 */
function chatContext(p: Record<string, unknown>): ChatContext {
  return { label: optLine(p, 'topicLabel', 60), focus: optLine(p, 'focus', 400) };
}

// ─── Action registry ────────────────────────────────────────────────
// Each builder validates its own params and returns the exact request. Every
// action here is Pro-only — see the handler.

const ACTIONS: Record<string, (p: Record<string, unknown>) => BuiltRequest> = {
  start(p) {
    const topicId = oneOf(p, 'topicId', TOPIC_IDS);
    const mode = oneOf(p, 'mode', PRACTICE_MODES);
    return {
      system: chatSystemPrompt(topicId, mode, chatContext(p)),
      messages: [{ role: 'user', content: 'Start the conversation. Greet me and ask me the first question.' }],
      maxTokens: mode === 'feedback' ? 1024 : 512,
    };
  },

  reply(p) {
    const topicId = oneOf(p, 'topicId', TOPIC_IDS);
    const mode = oneOf(p, 'mode', PRACTICE_MODES);
    const messages = sanitizeHistory(p.messages, 60, 4000);
    if (messages.length === 0) throw new BadRequest('"messages" must not be empty.');
    return {
      system: chatSystemPrompt(topicId, mode, chatContext(p)),
      messages,
      maxTokens: mode === 'feedback' ? 1024 : 512,
    };
  },

  summary(p) {
    const conversationText = reqStr(p, 'conversationText', 40000);
    return {
      system: summarySystemPrompt(),
      messages: [{ role: 'user', content: `Here is my conversation:\n\n${conversationText}` }],
      maxTokens: 2048,
    };
  },
};

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use AI features.' });

  if (!await underRateLimit(auth.supabase)) {
    return jsonResponse(429, { error: 'Too many requests — please slow down and try again shortly.' });
  }

  // The operation is the path — POST /chat/reply — not a field in the body.
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const action = parts[parts.lastIndexOf('chat') + 1] ?? '';
  if (!(action in ACTIONS)) return jsonResponse(404, { error: 'Not found' });

  let params: Record<string, unknown>;
  try {
    params = (await req.json() ?? {}) as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }

  // Practising burns a generative call per turn, so the whole function is
  // Pro-only. The client UI also gates it, but this is the real enforcement.
  const denied = await proGateError(auth.supabase, auth.user.id);
  if (denied) return denied;

  let built: BuiltRequest;
  try {
    built = ACTIONS[action](params);
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
}

if (import.meta.main) Deno.serve(handler);
