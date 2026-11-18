import { describe, expect, it } from 'vitest';
import { PLAYER_H, ROWS, STEP, T, buildLevel, newPlayer, stepPlayer, type World } from './rooftop';

// The level's co-op depends on jump height: one jump must not clear the
// five-tile wall, and a jump off a partner's head must.

const level = buildLevel();
const world = (): World => ({ level, open: new Set(), solo: false, platforms: [] });

/** How high one held jump lifts the feet, standing on the start street. */
function jumpHeight() {
  const p = newPlayer(level.spawns[0]);
  const w = world();
  for (let i = 0; i < 30; i++) stepPlayer(p, { left: false, right: false, jump: false }, w, STEP);
  const floor = p.y;
  let top = floor;
  for (let i = 0; i < 90; i++) {
    stepPlayer(p, { left: false, right: false, jump: true }, w, STEP);
    top = Math.min(top, p.y);
  }
  return floor - top;
}

describe('rooftop level', () => {
  it('has both starts, checkpoints and a goal', () => {
    expect(level.tiles.length).toBe(level.w * ROWS);
    expect(level.spawns).toHaveLength(2);
    expect(level.checkpoints.length).toBeGreaterThan(3);
    expect(level.goalX).toBeGreaterThan(level.w * T * 0.8);
  });

  it('links every gate to a plate', () => {
    const plateGroups = new Set(level.plates.values());
    for (const g of level.gates.values()) expect(plateGroups.has(g)).toBe(true);
  });

  it('jumps over four tiles but not five — five takes a partner', () => {
    const h = jumpHeight();
    expect(h).toBeGreaterThan(4 * T);
    expect(h).toBeLessThan(5 * T);
    expect(h + PLAYER_H).toBeGreaterThan(5 * T);
  });
});
