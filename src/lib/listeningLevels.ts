import type { Podcast } from '../data/englishListening';

// Level badges and filter chips shared by Podcasts and Comprehension, which
// use the same three levels. Spelled out in full — Tailwind only keeps
// classes it finds as whole strings.

export type ListeningLevel = Podcast['level'];

export const LEVEL_CLASS: Record<ListeningLevel, string> = {
  Intermediate: 'text-accent-green bg-accent-green/10 border-accent-green/20',
  'Upper-Intermediate': 'text-accent-orange bg-accent-orange/10 border-accent-orange/20',
  Advanced: 'text-accent-red bg-accent-red/10 border-accent-red/20',
};

export const LEVEL_CHIPS = (['Intermediate', 'Upper-Intermediate', 'Advanced'] as const)
  .map((l) => ({ key: l, label: l, className: LEVEL_CLASS[l] }));
