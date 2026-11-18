import { describe, expect, it } from 'vitest';
import { COLS, LIVES, PATHS, T, build, callWave, canBuild, newGuard, sell, stepGuard, tileAt, upgrade } from './citadelGuard';

// The map has to be walkable and buildable, and the balance has to be
// roughly right: undefended, the gate falls; a handful of towers hold the
// first waves.

const run = (g: ReturnType<typeof newGuard>, seconds: number) => { for (let i = 0; i < seconds * 60; i++) stepGuard(g, 1 / 60, () => 0.5); };

describe('citadel guard', () => {
  it('runs both lanes along the road to the gate', () => {
    for (const p of PATHS) {
      expect(p.pts[p.pts.length - 1].x).toBeGreaterThanOrEqual((COLS - 1) * T);
      for (const pt of p.pts.slice(1, -1)) expect(tileAt(Math.floor(pt.x / T), Math.floor(pt.y / T))).toBe(1);
    }
  });

  it('builds only on free grass, with the gold for it, and only your own towers change', () => {
    const g = newGuard(2);
    expect(canBuild(g, 0, 2)).toBe(false); // the road
    expect(build(g, 0, 'archer', 2, 4)).toBe(true);
    expect(build(g, 1, 'archer', 2, 4)).toBe(false); // taken
    const id = g.towers[0].id;
    expect(upgrade(g, 1, id)).toBe(false);
    expect(sell(g, 1, id)).toBe(false);
    expect(upgrade(g, 0, id)).toBe(true);
    const before = g.gold[0];
    expect(sell(g, 0, id)).toBe(true);
    expect(g.gold[0]).toBe(before + Math.floor(90 * 0.7));
  });

  it('loses lives with nothing built', () => {
    const g = newGuard(1);
    callWave(g);
    run(g, 40);
    expect(g.lives).toBeLessThan(LIVES);
  });

  it('holds the first waves with a few towers at the merge', () => {
    const g = newGuard(1);
    for (const [c, r] of [[11, 5], [11, 7], [13, 5], [13, 7]]) expect(build(g, 0, 'archer', c, r)).toBe(true);
    for (let w = 0; w < 3; w++) {
      callWave(g);
      for (let i = 0; i < 90 * 60 && g.phase === 'wave'; i++) stepGuard(g, 1 / 60, () => 0.5);
    }
    expect(g.wave).toBe(3);
    expect(g.lives).toBe(LIVES);
  });
});
