// Client for the `ai-improve-writing` route — revised options, each carrying
// its own corrections, categorized with the same taxonomy English Practice
// uses (see ./learningCategories.ts) so both features render corrections the
// same way.
//
// Unlike every other `ai-*` action (see ./aiProviders.ts), this route hands
// back real structured JSON — { options: [{ text, corrections }, …] },
// already parsed and validated server-side — not a raw provider string to
// JSON.parse here, so it's called directly rather than through
// `callAiAction`.
//
// Corrections are scoped per option (not shared): Option 2 rephrasing
// "I are Tri" into "My name is Tri" isn't the same edit as Option 1's
// "I are" → "I am", so each option's "what changed" list describes its own
// edits. Highlighting *where* a correction applies inside `text` is a
// client-side diff against the original (see ./textDiff.ts + the matching in
// ImproveWritingPage.tsx) — not something the model marks up inline. An
// earlier version had the model wrap each changed span itself
// ({{N}}…{{/}}), but that syntax came back malformed often enough (missing
// closing tags, a correction whose "original" and "corrected" were
// identical) that broken markers leaked into the UI; a diff computed here
// can't come out malformed the way model-generated syntax can.

import { request } from './api';
import { AI_TIMEOUT_MS } from './aiProviders';
import type { LearningCategory } from './learningCategories';

export interface WritingCorrection {
  category: LearningCategory;
  original: string;
  corrected: string;
  explanation: string;
}

export interface ImproveWritingOption {
  text: string;
  corrections: WritingCorrection[];
}

export interface ImproveWritingResult {
  options: ImproveWritingOption[];
}

/** The shape `POST /ai-improve-writing` returns — already JSON, already
 *  validated server-side (unknown categories dropped, empty fields filtered). */
type RawImproveWritingResponse = ImproveWritingResult;

/**
 * Revise `text` per a template's `instructions`. Throws `ApiError` on
 * failure — this is a paid action the user is actively waiting on, so a
 * failure needs a visible toast, not a silent local fallback.
 */
export async function improveWriting(
  params: { instructions: string; text: string; categories: string[]; optionCount: 1 | 2 },
  opts: { signal?: AbortSignal } = {},
): Promise<ImproveWritingResult> {
  return request.post<RawImproveWritingResponse>('/ai-improve-writing', params, {
    signal: opts.signal,
    timeout: AI_TIMEOUT_MS,
  });
}
