// The main-character avatar for the world map (Gather-style): one LPC base
// body per gender, customized by stacking transparent layers — skin (body +
// head), hair, shirt, pants, hat. Layers are fetched and baked by
// scripts/fetch-lpc-avatar.mjs into public/game/avatar/ (one 576x256 sheet
// per layer: 64px frames, rows = down/up/left/right, col 0 = idle,
// cols 1-8 = walk cycle).
//
// Art: Liberated Pixel Cup (LPC) assets, CC-BY-SA 3.0 / GPL 3.0 — authors in
// public/game/avatar/CREDITS.csv. Cosmetic only: the companion (perks,
// skills, stages) is untouched.

export type AvatarGender = 'male' | 'female';

export interface AvatarConfig {
  gender: AvatarGender;
  skin: string;
  hair: string;
  top: string;
  pants: string;
  hat: string;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  gender: 'male', skin: 'light', hair: 'dark_brown', top: 'blue', pants: 'black', hat: 'none',
};

export interface AvatarOption {
  id: string;
  name: string;
  /** Swatch for the picker. */
  swatch: string;
}

export const SKINS: AvatarOption[] = [
  { id: 'light', name: 'Light', swatch: '#f7d7b5' },
  { id: 'olive', name: 'Olive', swatch: '#cfa671' },
  { id: 'bronze', name: 'Bronze', swatch: '#a56f2f' },
  { id: 'brown', name: 'Brown', swatch: '#8d5524' },
  { id: 'black', name: 'Black', swatch: '#5a3a20' },
];

export const HAIR_COLORS: AvatarOption[] = [
  { id: 'black', name: 'Black', swatch: '#2f2f38' },
  { id: 'dark_brown', name: 'Dark brown', swatch: '#5a3a26' },
  { id: 'blonde', name: 'Blonde', swatch: '#e6c65c' },
  { id: 'carrot', name: 'Carrot', swatch: '#d1642e' },
  { id: 'gray', name: 'Gray', swatch: '#9a9aa0' },
  { id: 'blue', name: 'Blue', swatch: '#4a6ad0' },
];

export const TOPS: AvatarOption[] = [
  { id: 'white', name: 'White', swatch: '#e8e8e8' },
  { id: 'blue', name: 'Blue', swatch: '#4a6ad0' },
  { id: 'green', name: 'Green', swatch: '#3f9e4d' },
  { id: 'red', name: 'Red', swatch: '#c03a3a' },
];

export const PANTS: AvatarOption[] = [
  { id: 'black', name: 'Black', swatch: '#3a3a40' },
  { id: 'blue', name: 'Blue', swatch: '#4a5a8a' },
  { id: 'brown', name: 'Brown', swatch: '#7a5230' },
  { id: 'forest', name: 'Forest', swatch: '#3a6a45' },
];

export interface HatInfo {
  id: string;
  name: string;
}

export const HATS: HatInfo[] = [
  { id: 'none', name: 'No hat' },
  { id: 'bandana', name: 'Bandana' },
  { id: 'feather', name: 'Feather cap' },
  { id: 'bowler', name: 'Bowler' },
  { id: 'hood', name: 'Hood' },
  { id: 'crown', name: 'Crown' },
];

// ── Sheet layout (must match fetch-lpc-avatar.mjs) ──

export const AVATAR_FRAME_W = 64;
export const AVATAR_FRAME_H = 64;
export const AVATAR_SHEET = { width: 576, height: 256, columns: 9 };
/** Row per facing direction in a baked layer sheet. */
export const AVATAR_DIR_ROW = { down: 0, up: 1, left: 2, right: 3 } as const;

/** Layer sheet names for a config, bottom to top. */
export function avatarLayerNames(c: AvatarConfig): string[] {
  const g = c.gender;
  const layers = [
    `body-${g}-${c.skin}`,
    `head-${g}-${c.skin}`,
    `shoes-${g}`,
    `pants-${g}-${c.pants}`,
    `top-${g}-${c.top}`,
    `hair-${g}-${c.hair}`,
  ];
  if (c.hat !== 'none') layers.push(`hat-${c.hat}`);
  return layers;
}

export function avatarLayerUrl(name: string): string {
  return `${import.meta.env.BASE_URL}game/avatar/${name}.png`;
}

/** Unique texture/cache key for a full avatar configuration. */
export function avatarKey(c: AvatarConfig): string {
  return `avatar-${c.gender}-${c.skin}-${c.hair}-${c.top}-${c.pants}-${c.hat}`;
}

export function isAvatarConfig(v: unknown): v is AvatarConfig {
  if (!v || typeof v !== 'object') return false;
  const c = v as Record<string, unknown>;
  return (c.gender === 'male' || c.gender === 'female')
    && SKINS.some((x) => x.id === c.skin)
    && HAIR_COLORS.some((x) => x.id === c.hair)
    && TOPS.some((x) => x.id === c.top)
    && PANTS.some((x) => x.id === c.pants)
    && HATS.some((x) => x.id === c.hat);
}

type Drawable = HTMLImageElement | HTMLCanvasElement;

/** Stack the layer sheets (given in avatarLayerNames order) onto one canvas. */
export function composeAvatar(layers: Drawable[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SHEET.width;
  canvas.height = AVATAR_SHEET.height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  for (const layer of layers) ctx.drawImage(layer, 0, 0);
  return canvas;
}
