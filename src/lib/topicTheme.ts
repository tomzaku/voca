// Per-topic tinting for topic collections (tile on /collections, header on the
// detail page). Built from the theme's own accent tokens with `color-mix`, so
// the same topic reads correctly in light and dark without its own palette.

import type { CSSProperties } from 'react';
import type { TopicColor } from '../data/topicWords';

const accent = (c: TopicColor) => `var(--color-accent-${c})`;
const mix = (c: TopicColor, pct: number, base = 'var(--color-bg-card)') =>
  `color-mix(in srgb, ${accent(c)} ${pct}%, ${base})`;

/** Card surface: a soft wash of the topic colour fading into the card. */
export function topicSurface(c: TopicColor, active = false): CSSProperties {
  return {
    background: `linear-gradient(140deg, ${mix(c, active ? 30 : 18)} 0%, ${mix(c, active ? 12 : 4)} 55%, var(--color-bg-card) 100%)`,
    borderColor: active ? accent(c) : mix(c, 35, 'var(--color-border)'),
  };
}

/** Solid badge behind the topic icon. */
export function topicBadge(c: TopicColor): CSSProperties {
  return { background: accent(c), color: 'var(--color-bg-card)' };
}

/** Text or decorative-icon colour in the topic accent. */
export function topicInk(c: TopicColor): CSSProperties {
  return { color: accent(c) };
}
