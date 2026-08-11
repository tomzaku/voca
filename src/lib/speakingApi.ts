// Client for the `speaking` resource — AI-generated speaking-practice
// dialogues built from a user's own vocabulary and a topic they picked.
//
//   GET    /speaking          → { dialogues }
//   POST   /speaking          → { dialogue }   Pro
//   DELETE /speaking/:id      → { ok }
//
// Listing is quiet (an empty history is a fine thing to show); generating
// throws — it's a paid action the user is actively waiting on, so a failure
// needs a visible toast, not a silent local fallback.

import { request } from './api';

export interface SpeakingDialogue {
  id: string;
  topic: string;
  title: string;
  situation: string;
  speakers: { a: string; b: string };
  lines: { speaker: 'a' | 'b'; text: string }[];
  words: string[];
  createdAt: string;
}

/** Past generated conversations, newest first. */
export async function fetchSpeakingDialogues(): Promise<SpeakingDialogue[]> {
  const res = await request.get<{ dialogues: SpeakingDialogue[] }>('/speaking', { quiet: true });
  return res?.dialogues ?? [];
}

/** Generate and store a new dialogue from these words and topic. Pro-gated server-side. */
export async function createSpeakingDialogue(words: string[], topic: string): Promise<SpeakingDialogue> {
  const { dialogue } = await request.post<{ dialogue: SpeakingDialogue }>('/speaking', { words, topic });
  return dialogue;
}

/** Delete one of your own saved conversations. */
export async function deleteSpeakingDialogue(id: string): Promise<void> {
  await request.delete(`/speaking/${id}`);
}
