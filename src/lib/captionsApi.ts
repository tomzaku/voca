// Client for the `captions` edge function — a YouTube video's captions as
// timed lines, for video shadowing on the Speak page.

import { request } from './api';
import type { CaptionLine } from './captions';

export interface CaptionTrack {
  lang: string;
  name: string;
  /** Speech recognition's, not a person's. */
  auto: boolean;
}

export interface VideoCaptions {
  video: { id: string; title: string };
  /** The track `lines` came from; null when there's none in the language. */
  track: CaptionTrack | null;
  /** Every track the video has. */
  tracks: CaptionTrack[];
  lines: CaptionLine[];
}

/** Two fetches to YouTube behind it on a miss. */
const TIMEOUT_MS = 20_000;

/**
 * Throws — a failure here is something to say ("paste the captions instead"),
 * and there's no copy of a video's captions on the device to fall back to.
 */
export function getCaptions(video: string, lang = 'en', signal?: AbortSignal): Promise<VideoCaptions> {
  return request.get<VideoCaptions>('/captions', { params: { video, lang }, timeout: TIMEOUT_MS, signal });
}
