import { describe, expect, it } from 'vitest';
import en from '../i18n/messages/en/places';
import vi from '../i18n/messages/vi/places';
import { LABEL_PLACES } from './mapPlaces';
import { ROOMS } from './rooms';

// Every place the world can tell the story of — a lit map label, or a room's
// ⓘ — has all of it, in both languages.

describe('place stories', () => {
  const ids = [...Object.values(LABEL_PLACES), ...Object.values(ROOMS).flatMap((r) => (r.place ? [r.place] : []))];
  it.each(ids)('%s has its name, English name, introduction and fact', (id) => {
    for (const suffix of ['', 'En', 'About', 'Fact']) {
      expect(en, `${id}${suffix}`).toHaveProperty(`places.${id}${suffix}`);
      expect(vi, `${id}${suffix}`).toHaveProperty(`places.${id}${suffix}`);
    }
  });
});
