import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

// Real, hand-drawn cat animations (not the flat CSS-bounce SVG). Only the cat
// has these — whatever companion a user picked for its gameplay perk, these
// specific real-animation moments always show the cat.
const CLIPS = {
  idle: () => import('../assets/lottie/cat/idle.json'),
  search: () => import('../assets/lottie/cat/search.json'),
  correct: () => import('../assets/lottie/cat/correct.json'),
  wrong: () => import('../assets/lottie/cat/wrong.json'),
  think: () => import('../assets/lottie/cat/think.json'),
} as const;

export type CatPose = keyof typeof CLIPS;

interface Props {
  pose: CatPose;
  size?: number;
  loop?: boolean;
  className?: string;
}

export function CatMascot({ pose, size = 120, loop = true, className }: Props) {
  const [data, setData] = useState<object | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    CLIPS[pose]().then((m) => { if (alive) setData((m as { default: object }).default); });
    return () => { alive = false; };
  }, [pose]);

  if (!data) return null;
  return (
    <Lottie animationData={data} loop={loop} autoplay style={{ width: size, height: size }} className={className} />
  );
}
