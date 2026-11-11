import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { IPA_SOUNDS_VI, mouthTextVi } from '../data/ipaVi';
import type { IpaSound } from '../data/ipa';

/**
 * The IPA data's prose in the interface language. ipa.ts and articulation.ts
 * stay English (the contrast logic matches on those strings); this swaps in
 * the Vietnamese at display time.
 */
export function useIpaText() {
  const vi = useIntl().locale.startsWith('vi');
  const howTo = useCallback((s: IpaSound) => (vi && IPA_SOUNDS_VI[s.symbol]?.howTo) || s.howTo, [vi]);
  const tip = useCallback((s: IpaSound) => (vi && IPA_SOUNDS_VI[s.symbol]?.tip) || s.tip, [vi]);
  /** A mouth tag or contrast phrase from articulation.ts. */
  const mouth = useCallback((text: string) => (vi ? mouthTextVi(text) : text), [vi]);
  return { howTo, tip, mouth };
}
