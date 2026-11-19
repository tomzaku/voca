import { describe, expect, it } from 'vitest';
import { BOSSES, applyDrop, bossOf, isBoss, multiplier, newShip, newSwarm, noteHurt, nova, shotsFor, stepSwarm } from './bugSwarm';

// Every fifth wave a boss, the four in turn; and weapons that level up when
// you pick up the same one, and swap when you pick up another.

const run = (s: ReturnType<typeof newSwarm>, ships: ReturnType<typeof newShip>[], seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) stepSwarm(s, ships, 1 / 60, () => 0.5);
};

describe('bug swarm', () => {
  it('sends the four bosses in turn, every fifth wave', () => {
    expect([1, 4, 6].map(bossOf)).toEqual([null, null, null]);
    expect([5, 10, 15, 20, 25].map(bossOf)).toEqual([...BOSSES, 'queen']);
  });

  it('brings each boss in, and each one attacks', () => {
    for (const [i, kind] of BOSSES.entries()) {
      const s = newSwarm();
      s.wave = 5 * (i + 1) - 1;
      s.between = 0;
      const ship = newShip(0);
      ship.inv = 1e9;
      run(s, [ship], 8);
      expect(s.bugs.some((b) => b.kind === kind && isBoss(b.kind))).toBe(true);
      expect(s.bombs.length).toBeGreaterThan(0);
    }
  });

  it('levels a weapon picked up twice, and swaps to another at the same level', () => {
    const ship = newShip(0);
    applyDrop(ship, 'laser');
    expect(ship).toMatchObject({ weapon: 'laser', level: 1 });
    applyDrop(ship, 'laser');
    applyDrop(ship, 'gun');
    expect(ship.level).toBe(3);
    applyDrop(ship, 'rockets');
    expect(ship).toMatchObject({ weapon: 'rockets', level: 3 });
  });

  it('fires each weapon its own way', () => {
    const ship = newShip(0);
    for (const [weapon, kind] of [['blaster', 'bolt'], ['laser', 'beam'], ['rockets', 'rocket'], ['scatter', 'pellet']] as const) {
      ship.weapon = weapon;
      ship.level = 3;
      const shots = shotsFor(ship, 0);
      expect(shots.length).toBeGreaterThan(0);
      expect(shots.every((x) => x.kind === kind)).toBe(true);
    }
  });

  it('lets a laser go through a line of bugs', () => {
    const s = newSwarm();
    s.between = 99;
    for (let i = 0; i < 3; i++) s.bugs.push({ id: 100 + i, kind: 'beetle', hp: 0.5, maxHp: 1, x: 100, y: 100 - i * 20, hx: 100, hy: 100 - i * 20, mode: 'home', t: 1, sx: 0, sy: 0, side: 1, vx: 0, a1: 9, a2: 9 });
    const ship = newShip(0);
    // Aimed at the bugs' middle: the formation sways a few pixels as the beam climbs.
    ship.x = 104; ship.weapon = 'laser';
    s.shots.push(...shotsFor(ship, 0));
    const before = s.bugs.length;
    for (let i = 0; i < 30; i++) stepSwarm(s, [ship], 1 / 60, () => 0.99);
    expect(before - s.bugs.filter((b) => b.id >= 100).length).toBe(3);
  });
});

describe('bug swarm: combos and novas', () => {
  const beetle = (id: number, x: number, y: number, hp = 1) =>
    ({ id, kind: 'beetle' as const, hp, maxHp: hp, x, y, hx: x, hy: y, mode: 'home' as const, t: 1, sx: 0, sy: 0, side: 1 as const, vx: 0, a1: 9, a2: 9 });

  it('multiplies the score as a combo grows, up to ×5', () => {
    expect([0, 3, 4, 8, 12, 16, 40].map(multiplier)).toEqual([1, 1, 2, 3, 4, 5, 5]);
  });

  it('clears every bullet and pays the one who set it off; a boss survives', () => {
    const s = newSwarm();
    s.bombs.push({ id: 1, x: 10, y: 10, vx: 0, vy: 50, kind: 'larva' });
    s.bugs.push(beetle(10, 50, 50), beetle(11, 80, 50));
    s.bugs.push({ ...beetle(12, 100, 30, 2), kind: 'queen' });
    nova(s, 1, 100, 300);
    expect(s.bombs).toHaveLength(0);
    expect(s.bugs.map((b) => b.id)).toEqual([12]);
    expect(s.bugs[0].hp).toBeGreaterThan(0);
    expect(s.scores[1]).toBeGreaterThan(0);
    expect(s.combo[1]).toBe(2);
  });

  it('breaks the combo on a hit', () => {
    const s = newSwarm();
    s.combo = [7, 0];
    noteHurt(s, 0);
    expect(s.combo[0]).toBe(0);
    expect(s.clean).toBe(false);
  });

  it('brings shells and fireflies in, more bugs, as the waves go on', () => {
    const count = (wave: number) => {
      const s = newSwarm();
      s.wave = wave - 1;
      s.between = 0;
      stepSwarm(s, [newShip(0)], 1 / 60, () => 0.5);
      return s.bugs;
    };
    expect(count(1).length).toBeLessThan(count(8).length);
    expect(count(1).some((b) => b.kind === 'shell' || b.kind === 'firefly')).toBe(false);
    expect(count(8).some((b) => b.kind === 'shell')).toBe(true);
    expect(count(8).some((b) => b.kind === 'firefly')).toBe(true);
  });
});
