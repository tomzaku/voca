// The `speaking` resource — AI-generated speaking-practice dialogues built
// from a user's own vocabulary words and a topic they picked. Pro-only to
// create (every round is a fresh generative call, like `ai`'s cloze/mindmap
// actions); free to list/replay, since a stored dialogue costs nothing more
// to read. See supabase/migrations/20260811000000_speaking_dialogues.sql.
//
//   GET    /speaking          → { dialogues }               newest first, capped
//   POST   /speaking          { words, topic? } → { dialogue }   Pro
//   DELETE /speaking/:id                         → { ok }
//
// `topic` is optional — an empty/missing topic asks the model to pick one
// that suits the words and report it back, instead of failing the request.
//
// Rows are per-user (RLS-scoped, not a shared cache like word_cache) because
// the content depends on which words and topic this user chose. Written only
// through the caller's own client — user_id comes from the session, never the
// request body — same as `progress` and `word-notes`.
//
// Deploy: `supabase functions deploy speaking`

import {
  BadRequest,
  callProvider,
  type ChatMessage,
  corsHeaders,
  jsonResponse,
  optLine,
  proGateError,
  requireUser,
  stripFences,
  underRateLimit,
} from '../_shared/ai.ts';

const MIN_WORDS = 3;
const MAX_WORDS = 16;
const MAX_LIST = 40;
const UUID = /^[0-9a-f-]{36}$/i;

interface Candidate {
  topic: string;
  title: string;
  situation: string;
  speakers: { a: string; b: string };
  lines: { speaker: 'a' | 'b'; text: string }[];
}

function toDialogue(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    topic: r.topic as string,
    title: r.title as string,
    situation: r.situation as string,
    speakers: (r.speakers as { a: string; b: string } | null) ?? { a: 'A', b: 'B' },
    lines: (r.lines as { speaker: 'a' | 'b'; text: string }[] | null) ?? [],
    words: (r.words as string[] | null) ?? [],
    createdAt: r.created_at as string,
  };
}

/** Trimmed, deduped, length-capped word list — mirrors `ai`'s cloze/mindmap validation. */
function normalizeWords(input: unknown): string[] {
  if (!Array.isArray(input)) throw new BadRequest('"words" must be an array.');
  const seen = new Set<string>();
  const words: string[] = [];
  for (const w of input) {
    if (typeof w !== 'string') continue;
    const trimmed = w.trim().slice(0, 60);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    words.push(trimmed);
    if (words.length >= MAX_WORDS) break;
  }
  if (words.length < MIN_WORDS) throw new BadRequest(`"words" needs at least ${MIN_WORDS} entries.`);
  return words;
}

function buildPrompt(words: string[], topic: string | null): { system: string; messages: ChatMessage[]; maxTokens: number } {
  const list = words.map((w) => `"${w}"`).join(', ');
  const lineTarget = Math.min(Math.max(words.length + 4, 8), 20);
  const topicClause = topic
    ? `practicing the topic "${topic}"`
    : 'for a natural everyday situation that suits these words — pick whatever topic fits them best';

  const prompt = `Write a short, natural two-person spoken dialogue for a language learner, ${topicClause}.

You MUST use each of these vocabulary words naturally at least once somewhere in the dialogue: ${list}. The first time each word appears, wrap it in double square brackets, e.g. "Could I get an [[iced latte]]?". Do not wrap the same word more than once, and do not wrap any other words.

Write about ${lineTarget} lines total, alternating naturally between the two speakers (not strictly one-for-one). Give the two speakers short role names or first names that fit the topic and scene (e.g. "Barista" / "Customer", not "Speaker A" / "Speaker B").

Return ONLY this exact JSON, no markdown, no extra text:
{
  "topic": "a short topic label for this conversation (2-4 words)${topic ? `, exactly "${topic}"` : ''}",
  "title": "short title for this conversation (4-8 words)",
  "situation": "one sentence describing the scene",
  "speakers": { "a": "name/role for speaker A", "b": "name/role for speaker B" },
  "lines": [ { "speaker": "a", "text": "..." }, { "speaker": "b", "text": "..." } ]
}`;

  return {
    system: 'You write short, natural spoken dialogues for language learners. Return ONLY valid JSON, no markdown, no explanation.',
    messages: [{ role: 'user', content: prompt }],
    maxTokens: Math.min(900 + words.length * 70, 2600),
  };
}

/** Best-effort parse + shape validation. Null on anything unusable, so the caller can retry. */
function parseDialogue(text: string): Candidate | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(stripFences(text));
  } catch {
    return null;
  }

  const topic = typeof parsed.topic === 'string' ? parsed.topic.trim().slice(0, 60) : '';
  const title = typeof parsed.title === 'string' ? parsed.title.trim().slice(0, 120) : '';
  const situation = typeof parsed.situation === 'string' ? parsed.situation.trim().slice(0, 300) : '';
  const speakersRaw = parsed.speakers as Record<string, unknown> | undefined;
  const a = typeof speakersRaw?.a === 'string' && speakersRaw.a.trim() ? speakersRaw.a.trim().slice(0, 40) : 'A';
  const b = typeof speakersRaw?.b === 'string' && speakersRaw.b.trim() ? speakersRaw.b.trim().slice(0, 40) : 'B';

  const linesRaw = Array.isArray(parsed.lines) ? parsed.lines : [];
  const lines = linesRaw
    .map((l): { speaker: 'a' | 'b'; text: string } | null => {
      const row = l as Record<string, unknown>;
      const speaker = row?.speaker;
      const text2 = row?.text;
      if ((speaker !== 'a' && speaker !== 'b') || typeof text2 !== 'string') return null;
      const trimmed = text2.trim().slice(0, 300);
      return trimmed ? { speaker, text: trimmed } : null;
    })
    .filter((l): l is { speaker: 'a' | 'b'; text: string } => l !== null)
    .slice(0, 24);

  if (!title || !situation || lines.length < 4) return null;
  return { topic, title, situation, speakers: { a, b }, lines };
}

/** One retry on a malformed response — the round trip is already paid for. */
async function generate(words: string[], topic: string | null): Promise<Candidate> {
  const built = buildPrompt(words, topic);
  let lastText = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    lastText = await callProvider(built.system, built.messages, built.maxTokens);
    const candidate = parseDialogue(lastText);
    if (candidate) return candidate;
  }
  console.warn(`[speaking] unusable response after retry: ${lastText.slice(0, 200)}`);
  throw new Error('Could not generate a dialogue — please try again.');
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const [id] = parts.slice(parts.lastIndexOf('speaking') + 1);
  if (id !== undefined && !UUID.test(id)) return jsonResponse(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });
  const db = auth.supabase;

  try {
    if (id === undefined && req.method === 'GET') {
      const { data, error } = await db
        .from('speaking_dialogues')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_LIST);
      if (error) throw new Error(error.message);
      return jsonResponse(200, { dialogues: (data ?? []).map(toDialogue) });
    }

    if (id === undefined && req.method === 'POST') {
      if (!await underRateLimit(db)) {
        return jsonResponse(429, { error: 'Too many requests — please slow down and try again shortly.' });
      }
      const denied = await proGateError(db, auth.user.id);
      if (denied) return denied;

      let body: Record<string, unknown>;
      try {
        body = (await req.json() ?? {}) as Record<string, unknown>;
      } catch {
        return jsonResponse(400, { error: 'Invalid JSON body.' });
      }
      const words = normalizeWords(body.words);
      const topic = optLine(body, 'topic', 60); // null = let the model pick one

      let candidate: Candidate;
      try {
        candidate = await generate(words, topic);
      } catch (err) {
        return jsonResponse(502, { error: (err as Error).message || 'AI provider error.' });
      }

      const { data, error } = await db
        .from('speaking_dialogues')
        .insert({
          user_id: auth.user.id,
          topic: topic || candidate.topic || 'Conversation',
          title: candidate.title,
          situation: candidate.situation,
          speakers: candidate.speakers,
          lines: candidate.lines,
          words,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return jsonResponse(200, { dialogue: toDialogue(data) });
    }

    if (id !== undefined && req.method === 'DELETE') {
      // The delete policy allows only your own dialogues; a stranger's id
      // simply matches no row, which is the same answer as one that never
      // existed.
      const { error } = await db.from('speaking_dialogues').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return jsonResponse(200, { ok: true });
    }

    return jsonResponse(404, { error: 'Not found' });
  } catch (err) {
    if (err instanceof BadRequest) return jsonResponse(400, { error: err.message });
    console.error('[speaking]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
