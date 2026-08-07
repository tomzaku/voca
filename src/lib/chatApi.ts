// Client for the English Practice conversations — proxied through the `chat`
// Supabase Edge Function, which holds the provider API key server-side. The
// browser only sends the signed-in user's Supabase JWT.
//
//   POST /chat/start    { topicId, mode, … }        → { text }
//   POST /chat/reply    { topicId, mode, messages } → { text }
//   POST /chat/summary  { conversationText }        → { text }
//
// Separate from `aiProviders.ts` (the `ai` function) on purpose: practice chat
// is the chattiest AI feature we have, so it gets its own function to deploy
// and scale. The client picks one of the three routes and passes small params,
// never a prompt — every prompt lives server-side. Practising requires Pro;
// the function enforces it. See supabase/functions/chat/index.ts.

import { request } from './api';

export type ChatAction = 'start' | 'reply' | 'summary';

/** A turn can take a while to generate, and the drawer can be closed mid-flight. */
const TIMEOUT_MS = 60_000;

/**
 * Throws ApiError with the server's message — a failed turn is shown in the
 * conversation, not swallowed.
 */
export async function callChatAction(
  action: ChatAction,
  params: Record<string, unknown>,
  opts: { signal?: AbortSignal } = {},
): Promise<string> {
  const { text } = await request.post<{ text: string }>(`/chat/${action}`, params, {
    signal: opts.signal,
    timeout: TIMEOUT_MS,
  });
  return text || 'No response received.';
}
