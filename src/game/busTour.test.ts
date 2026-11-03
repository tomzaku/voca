import { describe, expect, it } from 'vitest';
import { tourOrder, TOUR_LOOP } from './busTour';

describe('tourOrder', () => {
  const stops = ['dongBa', 'kyDai', 'vanMieu', 'thienMu', 'tinhTam'];

  it('visits every other stop once, in loop order, and comes home', () => {
    // From Kỳ Đài: Tịnh Tâm, Văn Miếu, Thiên Mụ, round to Đông Ba, back to Kỳ Đài.
    expect(tourOrder(stops, 1)).toEqual([4, 2, 3, 0, 1]);
  });

  it('works from any stop', () => {
    for (let i = 0; i < stops.length; i++) {
      const t = tourOrder(stops, i);
      expect(t).toHaveLength(stops.length);
      expect(new Set(t).size).toBe(stops.length);
      expect(t[t.length - 1]).toBe(i);
    }
  });

  it('puts a stop the loop does not know at the end of the loop', () => {
    expect(tourOrder(['dongBa', 'newPlace', 'kyDai'], 0)).toEqual([2, 1, 0]);
  });

  it('names each place once', () => {
    expect(new Set(TOUR_LOOP).size).toBe(TOUR_LOOP.length);
  });
});
