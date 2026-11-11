import { useState } from 'react';

/** The slider's position, for one or more mouth diagrams that should move
 *  together (the Compare dialog's two sides). `null` is playing. */
export function useMouthControls() {
  const [at, setAt] = useState<number | null>(null);
  return { at, setAt };
}
