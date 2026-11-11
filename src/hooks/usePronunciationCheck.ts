import { scorePronunciation } from '../lib/pronunciation';
import { useScoredTake } from './useScoredTake';

export type { CheckPhase } from './useScoredTake';

/** A single word is well under this; it's the stop for a forgotten tap. */
const MAX_MS = 4000;

/** One try at a word, scored sound by sound against its IPA (every accent given). */
export function usePronunciationCheck(ipas: string[]) {
  return useScoredTake((blob, onProgress) => scorePronunciation(blob, ipas, onProgress), MAX_MS);
}
