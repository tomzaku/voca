import { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

// Shared demo action clips (from LottieFiles' free CDN). Skills cycle through
// them. Lazy-imported so each clip is its own chunk — swap a file here to change
// a skill's effect, or extend to a per-skill map later.
const CLIPS = [
  () => import('../assets/lottie/confetti.json'),
  () => import('../assets/lottie/trophy.json'),
  () => import('../assets/lottie/check.json'),
  () => import('../assets/lottie/success.json'),
];

/** A one-shot Lottie effect burst, overlaid on the companion avatar during a skill preview. */
export default function SkillFx({ index }: { index: number }) {
  const [data, setData] = useState<object | null>(null);

  useEffect(() => {
    let alive = true;
    CLIPS[index % CLIPS.length]().then((m) => {
      if (alive) setData((m as { default: object }).default);
    });
    return () => { alive = false; };
  }, [index]);

  if (!data) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <Lottie animationData={data} loop={false} autoplay style={{ width: '160%', height: '160%' }} />
    </div>
  );
}
