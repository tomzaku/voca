// Client for the `messages` resource — private messages between players in
// the world. Sent through the server (which stamps who it's from) and received
// on the player's own private Realtime channel; see lib/worldLive.ts.
//
//   POST /messages { to, text } → { message }
//
// Not quiet: a message that didn't send should say so, not vanish.

import { request } from './api';

export interface SentMessage {
  to: string;
  text: string;
  /** ISO datetime the server sent it. */
  sentAt: string;
}

export async function sendMessage(to: string, text: string): Promise<SentMessage> {
  const { message } = await request.post<{ message: SentMessage }>('/messages', { to, text });
  return message;
}
