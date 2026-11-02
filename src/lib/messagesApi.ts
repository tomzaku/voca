// Client for the `messages` resource — private messages between players in
// the world. Sent through the server (which stamps who it's from) and received
// on the player's own private Realtime channel; see lib/worldLive.ts.
//
//   POST /messages             { to, text } → { message }
//   GET  /messages ?with=&after= → { messages, hasMore, cursor }   a friend conversation
//   POST /messages/read         { with }     → { ok }
//
// Messages between friends are kept on the server; to anyone else they're
// only delivered. Not quiet: a message that didn't send should say so.

import { request } from './api';

export interface SentMessage {
  to: string;
  text: string;
  /** ISO datetime the server sent it. */
  sentAt: string;
  /** Kept on the server (you're friends), so they'll see it even if they're away. */
  kept: boolean;
}

export interface KeptMessage {
  from: string;
  to: string;
  text: string;
  sentAt: string;
}

export async function sendMessage(to: string, text: string): Promise<SentMessage> {
  const { message } = await request.post<{ message: SentMessage }>('/messages', { to, text });
  return message;
}

/** A page of a conversation with a friend, newest first. Pass the previous page's `cursor` for older ones. */
export async function conversation(withId: string, after?: string): Promise<{ messages: KeptMessage[]; hasMore: boolean; cursor: string | null }> {
  return request.get('/messages', { params: { with: withId, after } });
}

/** Their messages to you, marked read. Quiet: an unread badge that lingers is no error. */
export async function markRead(withId: string): Promise<void> {
  await request.post('/messages/read', { with: withId }, { quiet: true });
}
