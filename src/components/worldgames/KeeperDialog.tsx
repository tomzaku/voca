import { useEffect, useState, type ReactNode } from 'react';
import { VILLAGER_FRAME, VILLAGER_LOOKS, type VillagerLook } from '../../game/textures';
import { propLayers, type KeeperDress } from '../../game/keeperLooks';
import { LookSprite } from './LookSprite';
import { playSelect } from '../../lib/sfx';
import { PixelButton } from './pixel';

// A keeper talking to you, the way a game's message box does: their portrait
// and name, the line typing itself out, and your answers underneath — the
// one they suggest first, on Enter. A click or Enter while it's still typing
// shows the whole line instead.

/** Each look is one row of the villager atlas, frames 1px apart
 *  (scripts/compose-villagers.mjs). */
const ATLAS_STRIDE = VILLAGER_FRAME + 1;
const ATLAS_WIDTH = 357;
const PORTRAIT_SCALE = 3;

function Portrait({ look, dress }: { look: VillagerLook; dress?: KeeperDress }) {
  const row = VILLAGER_LOOKS.indexOf(look);
  const size = VILLAGER_FRAME * PORTRAIT_SCALE;
  if (dress) {
    return (
      <span className="px-inset px-notch shrink-0 w-[4.5rem] h-[4.5rem] flex items-end justify-center overflow-hidden">
        <LookSprite look={dress.look} extra={propLayers(dress)} scale={PORTRAIT_SCALE} />
      </span>
    );
  }
  return (
    <span className="px-inset px-notch shrink-0 w-[4.5rem] h-[4.5rem] flex items-end justify-center overflow-hidden">
      <span
        aria-hidden
        className="px-sprite block"
        style={{
          width: size,
          height: size,
          backgroundImage: `url(${import.meta.env.BASE_URL}game/characters/villagers.png)`,
          backgroundPosition: `0 ${-row * ATLAS_STRIDE * PORTRAIT_SCALE}px`,
          backgroundSize: `${ATLAS_WIDTH * PORTRAIT_SCALE}px auto`,
        }}
      />
    </span>
  );
}

/** Characters revealed per tick (~16ms): quick enough not to wait on. */
const TYPE_STEP = 2;

export function KeeperDialog({ look, dress, name, line, primary, onPrimary, secondary, onSecondary }: {
  look: VillagerLook;
  /** The keeper as dressed, for their portrait. */
  dress?: KeeperDress;
  name: ReactNode;
  line: string;
  primary: ReactNode;
  onPrimary: () => void;
  secondary: ReactNode;
  onSecondary: () => void;
}) {
  const [shown, setShown] = useState(0);
  const [lastLine, setLastLine] = useState(line);
  if (line !== lastLine) { setLastLine(line); setShown(0); }
  const typing = shown < line.length;

  useEffect(() => {
    if (!typing) return;
    const id = setInterval(() => setShown((n) => Math.min(line.length, n + TYPE_STEP)), 16);
    return () => clearInterval(id);
  }, [typing, line]);

  const go = () => { playSelect(); onPrimary(); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (typing) setShown(line.length); else go();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="px absolute bottom-2 left-1/2 -translate-x-1/2 w-[min(720px,calc(100%-1rem))] pointer-events-auto px-in-up">
      <div className="px-notch px-frame p-3.5" onClick={() => typing && setShown(line.length)}>
        <div className="flex gap-3.5">
          <Portrait look={look} dress={dress} />
          <div className="flex-1 min-h-[4.5rem]">
            <p className="px-title !text-[13px] text-[var(--px-gold)] mb-1">{name}</p>
            <p className="text-[17px] leading-snug">
              {line.slice(0, shown)}
              {typing && <span className="px-blink text-[var(--px-gold)]">▌</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 mt-3">
          <PixelButton tone="paper" onClick={(e) => { e.stopPropagation(); playSelect(); onSecondary(); }}>{secondary}</PixelButton>
          <PixelButton tone="gold" onClick={(e) => { e.stopPropagation(); go(); }} disabled={typing}>
            ▶ {primary} <span className="hidden sm:inline opacity-70">↵</span>
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
