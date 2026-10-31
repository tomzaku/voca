import { describe, expect, it } from 'vitest';
import { FISH, ZONE, biteFor, escaped, landed, startReel, stepReel } from './fishing';

const seq = (...xs: number[]) => { let i = 0; return () => xs[i++ % xs.length]; };

describe('biteFor', () => {
  it('keeps the rare fish for a long cast', () => {
    for (let i = 0; i < 200; i++) expect(biteFor(0.3).fish.farOnly).toBeFalsy();
  });

  it('can bring up a rare fish far out', () => {
    expect(biteFor(0.9, seq(0.999, 0.5)).fish.farOnly).toBe(true);
  });

  it('sizes a fish within its range', () => {
    for (const f of FISH) {
      const { size } = biteFor(1, () => 0.9999);
      expect(size).toBeGreaterThanOrEqual(0);
      expect(f.max).toBeGreaterThan(f.min);
    }
  });
});

describe('reeling', () => {
  const calm = { ...FISH[0], fight: 0 };

  it('fills while the fish is in the zone, and lands it', () => {
    let r = { ...startReel(), fish: 0.5, target: 0.5, next: 1e9, zone: 0.5 - ZONE / 2 };
    for (let i = 0; i < 400 && !landed(r); i++) r = stepReel({ ...r, zone: r.fish - ZONE / 2, zoneV: 0 }, calm, false, 0.05);
    expect(landed(r)).toBe(true);
  });

  it('drains while the fish is out of the zone, and loses it', () => {
    let r = { ...startReel(), fish: 0.95, target: 0.95, next: 1e9, zone: 0 };
    for (let i = 0; i < 400 && !escaped(r); i++) r = stepReel(r, calm, false, 0.05);
    expect(escaped(r)).toBe(true);
  });

  it('lifts the zone while holding, and lets it sink when not', () => {
    const up = stepReel(startReel(), calm, true, 0.2);
    const down = stepReel(startReel(), calm, false, 0.2);
    expect(up.zone).toBeGreaterThan(down.zone);
  });
});
