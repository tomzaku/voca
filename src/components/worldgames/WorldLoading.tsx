import { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useCompanion } from '../../hooks/useCompanion';
import { DEFAULT_LOOK } from '../../game/wardrobe';
import { LookSprite } from './LookSprite';
import './pixel/pixel.css';

// The world's title card while it loads — first the game's code, then the
// map: the river at Huế behind, "Voca · Huế", and your buddy walking on the
// spot in whatever it wears, with how to get about underneath.

const WALK = [9, 10, 11, 12, 13, 14, 15, 16];

export function WorldLoading() {
  const look = useCompanion((s) => s.dress) ?? DEFAULT_LOOK;
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((n) => (n + 1) % WALK.length), 100);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="px absolute inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: '#1c120c',
        backgroundImage: `linear-gradient(rgba(20,12,8,0.55), rgba(20,12,8,0.75)), url(${import.meta.env.BASE_URL}game/rooms/listening.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        imageRendering: 'pixelated',
      }}
    >
      <div className="px-notch px-frame px-8 py-6 flex flex-col items-center text-center">
        <p className="px-title !text-[34px] leading-none text-[var(--px-gold)]">Voca · Huế</p>
        <p className="text-[14px] text-[var(--px-muted)] mt-2"><FormattedMessage id="world.loadingTagline" /></p>
        <div className="my-5"><LookSprite look={look} scale={4} frame={WALK[step]} /></div>
        <div className="flex gap-2 mb-4">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-2.5 h-2.5 bg-[var(--px-gold)] px-hop" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p className="px-title !text-[11px] text-[var(--px-muted)]">
          <span className="hidden sm:inline"><FormattedMessage id="world.hintWalkDesktop" /></span>
          <span className="sm:hidden"><FormattedMessage id="world.hintWalkMobile" /></span>
        </p>
      </div>
    </div>
  );
}
