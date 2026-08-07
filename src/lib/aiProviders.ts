// AI client — requests are proxied through our Supabase Edge Function (`ai`),
// which holds the provider API key server-side. The browser only sends the
// signed-in user's Supabase JWT; no AI key ever touches the client.
//
// One route per operation — POST /ai/cloze, /ai/tutor_reply, … The client
// passes small params and cannot supply the system prompt, the model, or a
// token budget: those live in the edge function, so the endpoint can't be used
// as a generic LLM. See supabase/functions/ai/index.ts for the routes.
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
  | 'mindmap';

function postAi(
  action: string,
  params: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  // Throws ApiError with the server's message — every caller shows it.
  return request.post<Record<string, unknown>>(`/ai/${action}`, params, {
    signal,
    timeout: TIMEOUT_MS,
  });
}

export async function callAiAction(
  action: AiAction,
  params: Record<string, unknown>,
  opts: { signal?: AbortSignal } = {},
): Promise<string> {
  const data = await postAi(action, params, opts.signal);
  return (data.text as string) || 'No response received.';
}
