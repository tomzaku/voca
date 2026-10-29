// Cover art for topic collections — the tile on /collections and the banner on
// the detail page. Each topic has a CC0 photo (public/topic-covers/<id>.webp,
// sources in CREDITS.md there) under a dark scrim, so the white text reads on
// any photo. The topic's gradient sits behind the photo as its placeholder
// while it loads (and as the cover if it ever fails); every gradient stop
// keeps white text at 4.5:1 or better — check any new colour against that.

import type { CSSProperties } from 'react';

const GRADIENTS: Record<string, [string, string, string]> = {
  'topic-food': ['#c4410c', '#b8400c', '#c2255c'],
  'topic-cooking': ['#c92a2a', '#a61e4d', '#862e9c'],
  'topic-home': ['#a65a06', '#9c4f0f', '#7a3e16'],
  'topic-family': ['#d6336c', '#b02a6f', '#7048e8'],
  'topic-health': ['#087f5b', '#0a7262', '#1864ab'],
  'topic-clothes': ['#7048e8', '#9c36b5', '#c2255c'],
  'topic-travel': ['#0b7285', '#1971c2', '#4c3fd1'],
  'topic-transport': ['#364fc7', '#1c3faa', '#0b4a6f'],
  'topic-nature': ['#2b7a38', '#1f7a4d', '#0b7285'],
  'topic-weather': ['#1971c2', '#3b5bdb', '#5f3dc4'],
  'topic-animals': ['#c05600', '#a5520b', '#5c7a10'],
  'topic-sports': ['#087f5b', '#0b7285', '#1864ab'],
  'topic-shopping': ['#c2255c', '#a61e4d', '#c4410c'],
  'topic-feelings': ['#862e9c', '#c2255c', '#e03131'],
  'topic-personality': ['#5f3dc4', '#3b5bdb', '#0b7285'],
  'topic-school': ['#1864ab', '#364fc7', '#5f3dc4'],
  'topic-city': ['#343a40', '#3b3f6b', '#5f3dc4'],
  'topic-entertainment': ['#a61e4d', '#862e9c', '#3b2d8f'],
  'topic-routine': ['#0b7285', '#087f5b', '#5c7a10'],
  'topic-celebrations': ['#d6336c', '#a832c2', '#c4410c'],
};
const PALETTE = Object.values(GRADIENTS);

// Levels wear their band's hue from the ladder on /collections (A1 green, B1
// blue, …), in shades deep enough for white text. Kept out of PALETTE so
// adding them didn't reshuffle the hashed covers of users' collections.
const LEVEL_GRADIENTS: Record<string, [string, string, string]> = {
  curated: ['#0b7285', '#0a6b7c', '#1864ab'],
  'level-1': ['#087f5b', '#2b7a38', '#0b6e4f'],
  'level-2': ['#0b7285', '#0a6b7c', '#1864ab'],
  'level-3': ['#1c3faa', '#1864ab', '#364fc7'],
  'level-4': ['#5f3dc4', '#6741d9', '#862e9c'],
  'level-5': ['#c4410c', '#b8400c', '#a65a06'],
  'level-6': ['#c92a2a', '#a61e4d', '#c2255c'],
};

/** A topic's or level's own gradient; any other id (a user's collection) gets
 *  one of the topic set, picked by a stable hash so it never changes. */
function gradientFor(id: string): [string, string, string] {
  if (GRADIENTS[id]) return GRADIENTS[id];
  if (LEVEL_GRADIENTS[id]) return LEVEL_GRADIENTS[id];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** The gradient cover, plus a drop shadow tinted with its deepest colour. */
export function topicCover(id: string): CSSProperties {
  const [from, via, to] = gradientFor(id);
  return {
    backgroundImage: [
      'radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0) 45%)',
      'radial-gradient(90% 80% at 0% 100%, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 60%)',
      `linear-gradient(135deg, ${from} 0%, ${via} 50%, ${to} 100%)`,
    ].join(', '),
    boxShadow: `0 12px 24px -14px ${to}`,
  };
}

/** The topic's cover photo. Lives in public/, so it isn't part of the bundle
 *  or the service worker's precache — it loads (lazily) when shown. */
export function topicPhoto(id: string): string {
  return `${import.meta.env.BASE_URL}topic-covers/${id}.webp`;
}

/** Darkens a photo enough for white text: light at the top (for the small
 *  action buttons), heavy at the bottom where the title sits. */
export const PHOTO_SCRIM: CSSProperties = {
  backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.62) 40%, rgba(0,0,0,0.25) 70%, rgba(0,0,0,0.32) 100%)',
};
