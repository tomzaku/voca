// Client for the `story-gaps` resource — AI-written paragraphs built from a
// user's own vocabulary, each target word wrapped in [[ ]] (see
// ./wordService.ts#parseCloze for turning that into drag-and-drop blanks).
//
//   GET    /story-gaps          → { storyGaps }
//   POST   /story-gaps          → { storyGap }   Pro
//   DELETE /story-gaps/:id      → { ok }
//
// Listing is quiet (an empty history is a fine thing to show); generating
// throws — it's a paid action the user is actively waiting on, so a failure
// needs a visible toast, not a silent local fallback.

import { request } from './api';

export interface StoryGap {
  id: string;
  paragraph: string;
  words: string[];
  learnLang: string;
  createdAt: string;
}

/** Past generated stories, newest first. */
export async function fetchStoryGaps(): Promise<StoryGap[]> {
  const res = await request.get<{ storyGaps: StoryGap[] }>('/story-gaps', { quiet: true });
  return res?.storyGaps ?? [];
}

/** Generate and store a new story from these words. Pro-gated server-side. */
export async function createStoryGap(words: string[], learnLang: string): Promise<StoryGap> {
  const { storyGap } = await request.post<{ storyGap: StoryGap }>('/story-gaps', { words, learnLang });
  return storyGap;
}

/** Delete one of your own saved stories. */
export async function deleteStoryGap(id: string): Promise<void> {
  await request.delete(`/story-gaps/${id}`);
}
