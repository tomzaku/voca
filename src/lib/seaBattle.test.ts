import { describe, expect, it } from 'vitest';
import { FLEET, SEA, canPlace, dragTo, firesNext, nearestFit, fleetReady, parseFleet, randomFleet, shipCells, takeShot, type Ship } from './seaBattle';

describe('shipCells', () => {
  it('runs across or down from its bow, and not off the sea', () => {
    expect(shipCells({ size: 3, at: 0, down: false })).toEqual([0, 1, 2]);
    expect(shipCells({ size: 3, at: 0, down: true })).toEqual([0, SEA, 2 * SEA]);
    expect(shipCells({ size: 3, at: SEA - 2, down: false })).toBeNull();
    expect(shipCells({ size: 3, at: (SEA - 2) * SEA, down: true })).toBeNull();
  });
});

describe('canPlace', () => {
  const boat: Ship = { size: 2, at: 0, down: false };
  it('keeps ships from touching, corners included', () => {
    expect(canPlace({ size: 2, at: SEA + 2, down: false }, [boat])).toBe(false);
    expect(canPlace({ size: 2, at: 3, down: false }, [boat])).toBe(true);
    expect(canPlace({ size: 2, at: 2 * SEA, down: false }, [boat])).toBe(true);
  });
});

describe('randomFleet', () => {
  it('always places the whole fleet legally', () => {
    for (let k = 0; k < 50; k++) {
      const f = randomFleet();
      expect(f.map((s) => s.size)).toEqual([...FLEET]);
      expect(fleetReady(f)).toBe(true);
    }
  });
});

describe('takeShot', () => {
  const fleet: Ship[] = [{ size: 2, at: 0, down: false }, { size: 2, at: 3, down: false }];
  it('says miss, hit, sunk, and lost', () => {
    expect(takeShot(fleet, new Set(), 20)).toEqual({ cell: 20, hit: false, sunk: null, lost: false });
    expect(takeShot(fleet, new Set(), 0)).toEqual({ cell: 0, hit: true, sunk: null, lost: false });
    expect(takeShot(fleet, new Set([0]), 1)).toEqual({ cell: 1, hit: true, sunk: [0, 1], lost: false });
    expect(takeShot(fleet, new Set([0, 1, 3]), 4)).toEqual({ cell: 4, hit: true, sunk: [3, 4], lost: true });
  });
});

describe('parseFleet', () => {
  it('takes a legal fleet and nothing else', () => {
    const f = randomFleet();
    expect(parseFleet(JSON.parse(JSON.stringify(f)))).toEqual(f);
    expect(parseFleet(f.slice(1))).toBeNull();
    expect(parseFleet('nope')).toBeNull();
  });
});

describe('firesNext', () => {
  it('keeps the turn after a hit and passes it on a miss', () => {
    expect(firesNext([], 'a', 'b')).toBe('a');
    expect(firesNext([{ by: 'a', hit: true }], 'a', 'b')).toBe('a');
    expect(firesNext([{ by: 'a', hit: true }, { by: 'a', hit: false }], 'a', 'b')).toBe('b');
    expect(firesNext([{ by: 'a', hit: false }, { by: 'b', hit: false }], 'a', 'b')).toBe('a');
  });
});

describe('nearestFit', () => {
  const others: Ship[] = [{ size: 2, at: 2 * SEA, down: false }];
  it('keeps a ship where it is when it fits', () => {
    const s: Ship = { size: 3, at: 5 * SEA, down: false };
    expect(nearestFit(s, others)).toEqual(s);
  });
  it('slides a blocked ship to the closest spot that fits', () => {
    const turned: Ship = { size: 3, at: 0, down: true };
    const fit = nearestFit(turned, others)!;
    expect(canPlace(fit, others)).toBe(true);
    expect(fit.down).toBe(true);
    expect(fit.at).toBe(3);
  });
  it('gives up beyond its reach', () => {
    expect(nearestFit({ size: 3, at: 0, down: true }, others, 0)).toBeNull();
  });
});

describe('dragTo', () => {
  it('moves the grabbed square onto the cell, staying on the sea', () => {
    expect(dragTo({ size: 3, at: 0, down: false }, 1, 2 * SEA + 4)).toEqual({ size: 3, at: 2 * SEA + 3, down: false });
    expect(dragTo({ size: 3, at: 0, down: false }, 0, SEA - 1)).toEqual({ size: 3, at: SEA - 3, down: false });
    expect(dragTo({ size: 3, at: 0, down: true }, 2, 1)).toEqual({ size: 3, at: 1, down: true });
  });
});
