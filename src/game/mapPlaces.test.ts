import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import en from '../i18n/messages/en/places';
import vi from '../i18n/messages/vi/places';
import { KEEPER_PLACES } from './mapPlaces';
import { ROOMS } from './rooms';

// Every place the world can tell the story of — a lit map label, a keeper's
// spot, or a room's ⓘ — has all of it, in both languages. The labels come from
// the generated map itself, so a place added to the generator without its
// story fails here.

type Prop = { name: string; value: unknown };
type MapObject = { type: string; properties?: Prop[] };
const map = JSON.parse(readFileSync(new URL('../../public/game/maps/hue.tmj', import.meta.url), 'utf8')) as {
  layers: { name: string; objects?: MapObject[] }[];
};
const labels = map.layers.find((l) => l.name === 'meta')!.objects!
  .filter((o) => o.type === 'label')
  .map((o) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value])) as Record<string, string>);

describe('map labels', () => {
  it('every label on show names its place', () => {
    expect(labels.filter((l) => l.hidden !== 'true' && !l.place).map((l) => l.text)).toEqual([]);
  });
});

describe('place stories', () => {
  const ids = [...new Set([
    ...labels.flatMap((l) => (l.place ? [l.place] : [])),
    ...Object.values(KEEPER_PLACES),
    ...Object.values(ROOMS).flatMap((r) => (r.place ? [r.place] : [])),
  ])];
  it.each(ids)('%s has its name, English name, introduction and fact', (id) => {
    for (const suffix of ['', 'En', 'About', 'Fact']) {
      expect(en, `${id}${suffix}`).toHaveProperty(`places.${id}${suffix}`);
      expect(vi, `${id}${suffix}`).toHaveProperty(`places.${id}${suffix}`);
    }
  });
});
