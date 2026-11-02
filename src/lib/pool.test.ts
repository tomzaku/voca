import { describe, expect, it } from 'vitest';
import { BALL_R, canPlace, forgive, HEAD_X, newGame, rule, simulate, TABLE_H, TABLE_W, targetsFor, type Ball, type PoolState } from './pool';

/** A table with just these balls up (the rest down), and the cue ball where given. */
function table(up: Ball[], over: Partial<PoolState> = {}): PoolState {
  const g = newGame();
  const balls = g.balls.map((b) => {
    const u = up.find((x) => x.id === b.id);
    return u ? { ...u, down: false } : { ...b, down: true };
  });
  return { ...g, balls, inHand: false, breaking: false, ...over };
}

describe('simulate', () => {
  it('racks 15 balls and a cue ball that never overlap', () => {
    const g = newGame();
    expect(g.balls).toHaveLength(16);
    for (const a of g.balls) for (const b of g.balls) {
      if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(BALL_R * 2);
    }
  });

  it('a straight shot sends the object ball on along the same line', () => {
    const s = table([{ id: 0, x: 40, y: 50, down: false }, { id: 3, x: 80, y: 50, down: false }]);
    const r = simulate(s.balls, 0, 0.5);
    expect(r.firstHit).toBe(3);
    const three = r.balls.find((b) => b.id === 3)!;
    expect(three.x).toBeGreaterThan(80);
    expect(Math.abs(three.y - 50)).toBeLessThan(0.5);
  });

  it('drops a ball rolled at a corner pocket, and keeps everything on the cloth', () => {
    const s = table([{ id: 0, x: 30, y: 30, down: false }, { id: 5, x: 20, y: 20, down: false }]);
    const r = simulate(s.balls, Math.atan2(-10, -10), 0.4);
    expect(r.pocketed).toContain(5);
    for (const b of r.balls.filter((x) => !x.down)) {
      expect(b.x).toBeGreaterThanOrEqual(BALL_R - 0.01);
      expect(b.x).toBeLessThanOrEqual(TABLE_W - BALL_R + 0.01);
      expect(b.y).toBeGreaterThanOrEqual(BALL_R - 0.01);
      expect(b.y).toBeLessThanOrEqual(TABLE_H - BALL_R + 0.01);
    }
  });

  it('is the same shot every time — the other player replays it', () => {
    const g = newGame();
    const a = simulate(g.balls, 0.03, 1);
    const b = simulate(g.balls, 0.03, 1);
    expect(a.balls).toEqual(b.balls);
    expect(a.pocketed).toEqual(b.pocketed);
  });
});

const shot = (over: { balls: Ball[]; firstHit: number | null; pocketed: number[] }) => ({ frames: [], ...over });

describe('rule', () => {
  it('claims a group with the first legal pot, and the shooter goes again', () => {
    const s = table([{ id: 0, x: 40, y: 50, down: false }, { id: 3, x: 80, y: 50, down: false }, { id: 11, x: 120, y: 50, down: false }]);
    const after = s.balls.map((b) => (b.id === 3 ? { ...b, down: true } : b));
    const r = rule(s, shot({ balls: after, firstHit: 3, pocketed: [3] }), 2);
    expect(r.state.groups).toEqual(['solids', 'stripes']);
    expect(r.state.turn).toBe(0);
    expect(r.savable).toBe(false);
  });

  it('a scratch hands over the ball in hand — unless it is forgiven', () => {
    const s = table([{ id: 0, x: 40, y: 50, down: false }, { id: 3, x: 80, y: 50, down: false }], { groups: ['solids', 'stripes'] });
    const after = s.balls.map((b) => (b.id === 0 ? { ...b, down: true } : b));
    const r = rule(s, shot({ balls: after, firstHit: 3, pocketed: [0] }), 2);
    expect(r.state).toMatchObject({ turn: 1, inHand: true, foul: 'scratch' });
    expect(r.savable).toBe(true);
    expect(r.state.balls.find((b) => b.id === 0)!.down).toBe(false);
    expect(forgive(r.state, 0)).toMatchObject({ turn: 0, inHand: true, foul: null });
  });

  it('hitting the other group first is a foul', () => {
    const s = table([{ id: 0, x: 40, y: 50, down: false }, { id: 3, x: 80, y: 50, down: false }, { id: 11, x: 60, y: 50, down: false }], { groups: ['solids', 'stripes'] });
    const r = rule(s, shot({ balls: s.balls, firstHit: 11, pocketed: [] }), 2);
    expect(r.state.foul).toBe('wrongFirst');
    expect(r.state.turn).toBe(1);
  });

  it('the 8 wins once your group is cleared, and loses before', () => {
    const cleared = table([{ id: 0, x: 40, y: 50, down: false }, { id: 8, x: 80, y: 50, down: false }, { id: 12, x: 120, y: 50, down: false }], { groups: ['solids', 'stripes'] });
    expect(targetsFor(cleared, 0)).toEqual([8]);
    const down8 = cleared.balls.map((b) => (b.id === 8 ? { ...b, down: true } : b));
    expect(rule(cleared, shot({ balls: down8, firstHit: 8, pocketed: [8] }), 2).state.winner).toBe(0);

    const early = table([{ id: 0, x: 40, y: 50, down: false }, { id: 8, x: 80, y: 50, down: false }, { id: 2, x: 120, y: 50, down: false }], { groups: ['solids', 'stripes'] });
    const e = rule(early, shot({ balls: early.balls.map((b) => (b.id === 8 ? { ...b, down: true } : b)), firstHit: 2, pocketed: [8] }), 2);
    expect(e.state.winner).toBe(1);
    expect(e.savable).toBe(false);
  });

  it('solo: a foul is savable, the 8 early comes back, and clearing the table wins', () => {
    const s = table([{ id: 0, x: 40, y: 50, down: false }, { id: 8, x: 80, y: 50, down: false }, { id: 4, x: 120, y: 50, down: false }]);
    const early = rule(s, shot({ balls: s.balls.map((b) => (b.id === 8 ? { ...b, down: true } : b)), firstHit: 8, pocketed: [8] }), 1);
    expect(early.state.balls.find((b) => b.id === 8)!.down).toBe(false);
    const last = table([{ id: 0, x: 40, y: 50, down: false }, { id: 8, x: 80, y: 50, down: false }]);
    expect(rule(last, shot({ balls: last.balls.map((b) => (b.id === 8 ? { ...b, down: true } : b)), firstHit: 8, pocketed: [8] }), 1).state.winner).toBe(0);
  });
});

describe('canPlace', () => {
  it('keeps the cue ball on the cloth, off other balls, and behind the head string on a break', () => {
    const g = newGame();
    expect(canPlace(g.balls, { x: 30, y: 50 }, true)).toBe(true);
    expect(canPlace(g.balls, { x: HEAD_X + 5, y: 50 }, true)).toBe(false);
    expect(canPlace(g.balls, { x: g.balls[1].x, y: g.balls[1].y }, false)).toBe(false);
    expect(canPlace(g.balls, { x: -1, y: 50 }, false)).toBe(false);
  });
});
