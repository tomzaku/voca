import { useState } from 'react';

export type MouthView = 'both' | '3d';
const VIEW_KEY = 'voca.mouthView';

/** The flat/3D choice and the slider's position, for one or more diagrams
 *  that should move together (the Compare dialog's two sides). The view is
 *  remembered; the slider always starts playing. */
export function useMouthControls() {
  const [view, setViewState] = useState<MouthView>(() => {
    try { return localStorage.getItem(VIEW_KEY) === '3d' ? '3d' : 'both'; } catch { return 'both'; }
  });
  const [at, setAt] = useState<number | null>(null);
  const setView = (v: MouthView) => {
    setViewState(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* private mode */ }
  };
  return { view, setView, at, setAt };
}
