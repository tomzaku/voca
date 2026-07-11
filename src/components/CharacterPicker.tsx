import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useCompanion } from '../hooks/useCompanion';
import { getAnimal } from '../lib/companion';
import {
  AVATAR_FRAME_H, AVATAR_FRAME_W, DEFAULT_AVATAR,
  HAIR_COLORS, HATS, PANTS, SKINS, TOPS,
  avatarLayerNames, avatarLayerUrl, composeAvatar,
  type AvatarConfig, type AvatarGender, type AvatarOption,
} from '../lib/avatar';

const loaded = new Map<string, Promise<HTMLImageElement>>();
function loadImage(url: string): Promise<HTMLImageElement> {
  if (!loaded.has(url)) {
    loaded.set(url, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    }));
  }
  return loaded.get(url)!;
}

/** The avatar's idle-down frame, composed live from its layers. */
function AvatarPreview({ config, scale = 2 }: { config: AvatarConfig; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = AVATAR_FRAME_W * scale;
  const h = AVATAR_FRAME_H * scale;
  useEffect(() => {
    let cancelled = false;
    Promise.all(avatarLayerNames(config).map((n) => loadImage(avatarLayerUrl(n))))
      .then((layers) => {
        if (cancelled || !ref.current) return;
        const sheet = composeAvatar(layers);
        const ctx = ref.current.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(sheet, 0, 0, AVATAR_FRAME_W, AVATAR_FRAME_H, 0, 0, w, h);
      })
      .catch(() => { /* sprite missing — preview stays blank */ });
    return () => { cancelled = true; };
  }, [config, w, h]);
  return <canvas ref={ref} width={w} height={h} style={{ imageRendering: 'pixelated' }} />;
}

/**
 * Customize the main character that walks the world map — an LPC paper doll:
 * body, skin, hair, shirt, pants and hat layers (or switch back to the animal
 * buddy). Cosmetic only: the companion's perks and growth are untouched.
 */
export function CharacterPicker({ onClose }: { onClose: () => void }) {
  const animalId = useCompanion((s) => s.animalId);
  const avatar = useCompanion((s) => s.avatar);
  const chooseAvatar = useCompanion((s) => s.chooseAvatar);
  const animal = getAnimal(animalId ?? 'fox');

  // Edits keep applying to this draft even while "Buddy" is selected, so
  // switching back to the avatar restores the last outfit.
  const [draft, setDraft] = useState<AvatarConfig>(avatar ?? DEFAULT_AVATAR);
  const useAvatar = avatar !== null;

  const apply = (patch: Partial<AvatarConfig>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    chooseAvatar(next);
  };

  const optionClass = (selected: boolean) =>
    `flex-1 py-2 rounded-xl border-2 text-xs font-bold capitalize transition-all ${
      selected
        ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan'
        : 'border-border bg-bg-tertiary text-text-muted hover:text-text-primary'
    }`;

  const swatchRow = (label: string, options: AvatarOption[], field: keyof AvatarConfig) => (
    <>
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => apply({ [field]: o.id })}
            title={o.name}
            className={`w-9 h-9 rounded-full border-2 transition-all ${
              useAvatar && draft[field] === o.id
                ? 'border-accent-cyan scale-110'
                : 'border-border hover:border-border-light'
            }`}
            style={{ background: o.swatch }}
          />
        ))}
      </div>
    </>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      // Keep keys away from the Phaser captures on window (bubble phase).
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-bg-card shadow-2xl p-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-display font-bold text-text-primary">Your character</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 shrink-0 rounded-full bg-bg-tertiary text-text-muted flex items-center justify-center hover:text-text-primary"
            title="Done"
          >
            <Icon icon="lucide:x" />
          </button>
        </div>

        {/* ── Live preview ── */}
        <div className="flex items-center justify-center mb-3 py-1 rounded-xl bg-bg-tertiary/60 border border-border">
          {useAvatar
            ? <AvatarPreview config={draft} />
            : <span className="text-[64px] leading-[128px]">{animal.emoji}</span>}
        </div>

        {/* ── Body ── */}
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Body</p>
        <div className="flex gap-2 mb-3">
          <button onClick={() => chooseAvatar(null)} className={optionClass(!useAvatar)}>
            <span className="mr-1">{animal.emoji}</span> Buddy
          </button>
          {(['male', 'female'] as const).map((g: AvatarGender) => (
            <button
              key={g}
              onClick={() => apply({ gender: g })}
              className={optionClass(useAvatar && draft.gender === g)}
            >
              {g}
            </button>
          ))}
        </div>

        {swatchRow('Skin', SKINS, 'skin')}
        {swatchRow('Hair', HAIR_COLORS, 'hair')}
        {swatchRow('Shirt', TOPS, 'top')}
        {swatchRow('Pants', PANTS, 'pants')}

        {/* ── Hat ── */}
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Hat</p>
        <div className="flex flex-wrap gap-1.5">
          {HATS.map((h) => (
            <button
              key={h.id}
              onClick={() => apply({ hat: h.id })}
              className={`px-2.5 py-1.5 rounded-full border text-[11px] font-bold transition-all ${
                useAvatar && draft.hat === h.id
                  ? 'border-accent-purple bg-accent-purple/10 text-accent-purple'
                  : 'border-border bg-bg-tertiary text-text-muted hover:text-text-primary'
              }`}
            >
              {h.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
