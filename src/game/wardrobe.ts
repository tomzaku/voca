// What your buddy can wear — the options of the tailor's shop — and how a
// look becomes the wardrobe atlas's layers (scripts/compose-wardrobe.mjs;
// keep the lists in step with it). Pure, so the shop, the scenes and the
// settings all read a look the same way.

/** Boy or girl: the girl's body has lashes; either can wear anything. */
export const FIGURES = ['boy', 'girl'] as const;
export const HAIR_STYLES = ['none', 'shorthair', 'bowlhair', 'curlyhair', 'longhair', 'mophair', 'spikeyhair'] as const;
export const HAIR_COLORS = ['dark', 'brown', 'grey'] as const;
export const OUTFITS = ['everyday', 'aoDaiPurple', 'aoDaiWhite', 'aoDaiRed', 'aoDaiBlue', 'aoDaiYellow', 'aoThe'] as const;
export const HATS = ['none', 'nonLa', 'khanDong'] as const;

export interface Look {
  figure: (typeof FIGURES)[number];
  hair: (typeof HAIR_STYLES)[number];
  hairColor: (typeof HAIR_COLORS)[number];
  outfit: (typeof OUTFITS)[number];
  hat: (typeof HATS)[number];
}

/** The look before anyone visits the tailor: the bald villager in everyday
 *  clothes — exactly how the buddy was drawn before there was a wardrobe. */
export const DEFAULT_LOOK: Look = { figure: 'boy', hair: 'none', hairColor: 'dark', outfit: 'everyday', hat: 'none' };

export const WARDROBE_KEY = 'wardrobe';

/** The atlas layers to draw, bottom first. Hair under a hat is the trimmed
 *  copy, so nothing pokes through. */
export function lookLayers(look: Look): string[] {
  const layers = [`body.${look.outfit}${look.figure === 'girl' ? '.girl' : ''}`];
  if (look.hair !== 'none') layers.push(`hair.${look.hair}.${look.hairColor}${look.hat !== 'none' ? '.hat' : ''}`);
  if (look.hat !== 'none') layers.push(`hat.${look.hat}`);
  return layers;
}

/** What the tailor dresses you in when you say boy or girl — Huế's own
 *  clothes to start from, all of it changeable. */
export const STARTER: Record<Look['figure'], Look> = {
  boy: { figure: 'boy', hair: 'shorthair', hairColor: 'dark', outfit: 'aoThe', hat: 'khanDong' },
  girl: { figure: 'girl', hair: 'longhair', hairColor: 'dark', outfit: 'aoDaiPurple', hat: 'nonLa' },
};

const pick = <T extends readonly string[]>(list: T, v: unknown, fallback: T[number]): T[number] =>
  (typeof v === 'string' && (list as readonly string[]).includes(v) ? v : fallback) as T[number];

/** A look from storage or the server: anything unknown falls back to the
 *  default for that part, so an old or tampered value still dresses you. */
export function parseLook(v: unknown): Look {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return {
    figure: pick(FIGURES, o.figure, DEFAULT_LOOK.figure),
    hair: pick(HAIR_STYLES, o.hair, DEFAULT_LOOK.hair),
    hairColor: pick(HAIR_COLORS, o.hairColor, DEFAULT_LOOK.hairColor),
    outfit: pick(OUTFITS, o.outfit, DEFAULT_LOOK.outfit),
    hat: pick(HATS, o.hat, DEFAULT_LOOK.hat),
  };
}
