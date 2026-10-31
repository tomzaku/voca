// What your buddy can wear — the options of the tailor's shop — and how a
// look becomes the wardrobe atlas's layers (scripts/compose-wardrobe.mjs;
// keep the lists in step with it). Pure, so the shop, the scenes and the
// settings all read a look the same way.
//
// An outfit is a garment and a colour: pick áo dài, then which áo dài — each
// garment comes in its own range, the first being what you start in.

export const HAIR_STYLES = ['none', 'shorthair', 'bowlhair', 'curlyhair', 'longhair', 'mophair', 'spikeyhair'] as const;
export const HAIR_COLORS = ['dark', 'brown', 'grey'] as const;
export const GARMENTS = {
  everyday: ['red', 'blue', 'green', 'yellow', 'black', 'orange', 'teal', 'sky', 'lavender', 'maroon', 'white', 'pink'],
  aoDai: ['purple', 'white', 'red', 'blue', 'yellow', 'pink', 'green', 'lavender', 'sky', 'teal', 'maroon', 'cream', 'orange'],
  aoThe: ['black', 'navy', 'brown', 'maroon', 'teal', 'purple'],
  aoBaBa: ['black', 'brown', 'white', 'navy', 'cream', 'maroon', 'teal'],
  uniform: ['white'],
  jeans: ['red', 'blue', 'green', 'yellow', 'black', 'white', 'pink', 'orange', 'teal', 'sky', 'lavender', 'cream'],
  longBao: ['yellow', 'red', 'maroon', 'navy'],
  striped: ['red', 'navy', 'black', 'green', 'orange', 'teal', 'sky', 'pink'],
  dress: ['red', 'pink', 'yellow', 'sky', 'lavender', 'teal', 'white', 'cream', 'maroon', 'green'],
  overalls: ['blue', 'red', 'green', 'brown', 'pink', 'orange', 'black'],
  tracksuit: ['red', 'blue', 'black', 'green', 'navy', 'teal', 'orange', 'maroon'],
} as const;
export const HATS = ['none', 'nonLa', 'khanDong', 'cap', 'mandarin', 'crown'] as const;

export type Garment = keyof typeof GARMENTS;
export const GARMENT_IDS = Object.keys(GARMENTS) as Garment[];

export interface Look {
  hair: (typeof HAIR_STYLES)[number];
  hairColor: (typeof HAIR_COLORS)[number];
  outfit: Garment;
  /** One of GARMENTS[outfit]. */
  outfitColor: string;
  hat: (typeof HATS)[number];
}

/** The look before anyone visits the tailor: the bald villager in everyday
 *  clothes — exactly how the buddy was drawn before there was a wardrobe. */
export const DEFAULT_LOOK: Look = { hair: 'none', hairColor: 'dark', outfit: 'everyday', outfitColor: 'red', hat: 'none' };

/** Swatches for the colours, as the atlas paints them (their light shade). */
export const COLOR_SWATCH: Record<string, string> = {
  red: '#e93245', purple: '#804898', white: '#f6f6fa', blue: '#487ac4', yellow: '#f0c440',
  pink: '#ec8cac', green: '#4e9c6a', black: '#343444', navy: '#324074', brown: '#885a3c',
  orange: '#f08c38', teal: '#2ca29e', sky: '#84c4f0', lavender: '#bca8e8', maroon: '#922838', cream: '#f4e8c8',
  dark: '#5d3b4a', grey: '#bcb8c0',
};

export const WARDROBE_KEY = 'wardrobe';

/** The atlas layers to draw, bottom first. Hair under a hat is the trimmed
 *  copy, so nothing pokes through. */
export function lookLayers(look: Look): string[] {
  const layers = [`body.${look.outfit}.${look.outfitColor}`];
  if (look.hair !== 'none') layers.push(`hair.${look.hair}.${look.hairColor}${look.hat !== 'none' ? '.hat' : ''}`);
  if (look.hat !== 'none') layers.push(`hat.${look.hat}`);
  return layers;
}

/** A garment in a colour it comes in — the colour kept if it can, else its first. */
export function wearGarment(look: Look, outfit: Garment): Look {
  const colours: readonly string[] = GARMENTS[outfit];
  return { ...look, outfit, outfitColor: colours.includes(look.outfitColor) ? look.outfitColor : colours[0] };
}

const pick = <T extends readonly string[]>(list: T, v: unknown, fallback: T[number]): T[number] =>
  (typeof v === 'string' && (list as readonly string[]).includes(v) ? v : fallback) as T[number];

/** A look from storage or the server: anything unknown falls back to the
 *  default for that part, so an old or tampered value still dresses you. */
export function parseLook(v: unknown): Look {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const outfit = pick(GARMENT_IDS, o.outfit, DEFAULT_LOOK.outfit);
  return {
    hair: pick(HAIR_STYLES, o.hair, DEFAULT_LOOK.hair),
    hairColor: pick(HAIR_COLORS, o.hairColor, DEFAULT_LOOK.hairColor),
    outfit,
    outfitColor: pick(GARMENTS[outfit], o.outfitColor, GARMENTS[outfit][0]),
    hat: pick(HATS, o.hat, DEFAULT_LOOK.hat),
  };
}
