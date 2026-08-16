// AI client — requests are proxied through our Supabase Edge Functions, each
// one a standalone `ai-*` resource that holds the provider API key
// server-side. The browser only sends the signed-in user's Supabase JWT; no
// AI key ever touches the client.
//
// One function per operation — POST /ai-cloze, /ai-tutor-reply, … — not one
// function dispatching on an action field. The client passes small params and
// cannot supply the system prompt, the model, or a token budget: those live
// in the edge function, so no route can be used as a generic LLM. See
// supabase/functions/ai-*/index.ts for the routes.
//
// English Practice conversations go to the separate `chat` function instead —
// see ./chatApi.ts.

import { request } from './api';

/** Generation is slow; the caller may also cancel with its own signal. */
const TIMEOUT_MS = 60_000;

export type AiAction =
  | 'cloze'
  | 'word_dialogues'
  | 'translate_word'
  | 'tutor_start'
  | 'tutor_reply'
  | 'mindmap'
  | 'improve_writing'
  | 'ielts_writing';

/** Action name → its standalone `ai-*` function. */
const ACTION_PATHS: Record<AiAction, string> = {
  cloze: '/ai-cloze',
  word_dialogues: '/ai-word-dialogues',
  translate_word: '/ai-translate-word',
  tutor_start: '/ai-tutor-start',
  tutor_reply: '/ai-tutor-reply',
  mindmap: '/ai-mindmap',
  improve_writing: '/ai-improve-writing',
  ielts_writing: '/ai-ielts-writing',
};

export async function callAiAction(
  action: AiAction,
  params: Record<string, unknown>,
  opts: { signal?: AbortSignal } = {},
): Promise<string> {
  // Throws ApiError with the server's message — every caller shows it.
  const data = await request.post<Record<string, unknown>>(ACTION_PATHS[action], params, {
    signal: opts.signal,
    timeout: TIMEOUT_MS,
  });
  return (data.text as string) || 'No response received.';
}
