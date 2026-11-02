import { describe, expect, it } from 'vitest';
import { arm, earnPower, GOAL, H, menOf, newMatch, restart, step, W, WIN_SCORE, type FoosState } from './foosball';

const still = { y: H / 2, kick: false };
const fixed = () => 0.5;

/** Runs `n` steps with the same input. */
function run(s: FoosState, n: number, input = still, level: 'easy' | 'normal' | 'hard' = 'normal') {
  for (let i = 0; i < n && !s.scored; i++) s = step(s, input, level, fixed);
  return s;
}

describe('foosball', () => {
  it('sets out eight rods, alternating sides, 1-2-3-5-5-3-2-1 players', () => {
    const s = newMatch();
    expect(s.rods.map((r) => r.men.length)).toEqual([1, 2, 3, 5, 5, 3, 2, 1]);
    expect(s.rods.map((r) => r.side)).toEqual(['you', 'you', 'cpu', 'you', 'cpu', 'you', 'cpu', 'cpu']);
    for (const r of s.rods) for (const m of menOf({ ...r, offset: r.max })) expect(m).toBeLessThan(H);
  });

  it('slides your rods towards your pointer, no faster than a rod moves', () => {
    const s = step(newMatch(), { y: 5, kick: false }, 'normal', fixed);
    const goalie = s.rods[0];
    expect(goalie.offset).toBeLessThan(0);
    expect(goalie.offset).toBeGreaterThan(-2);
  });

  it('a ball rolled into a goal mouth scores, and the side that conceded kicks off', () => {
    let s = newMatch();
    // Clear the rods out of the way and roll the ball into the computer's goal.
    s = { ...s, rods: [], ball: { x: W - 5, y: H / 2, vx: 80, vy: 0 } };
    s = run(s, 60);
    expect(s.scored).toBe('you');
    expect(s.score.you).toBe(1);
    expect(s.kickoff).toBe('cpu');
    expect(restart(s).scored).toBeNull();
  });

  it('the end wall beside the mouth sends it back', () => {
    let s: FoosState = { ...newMatch(), rods: [] };
    s = { ...s, ball: { x: W - 5, y: H / 2 + GOAL / 2 + 6, vx: 80, vy: 0 } };
    s = run(s, 30);
    expect(s.scored).toBeNull();
    expect(s.ball.vx).toBeLessThan(0);
  });

  it('a kick from your rod sends the ball towards their goal; a power shot faster, once', () => {
    const base = newMatch();
    const attack = base.rods[5];
    const at = { x: attack.x + 1, y: menOf(attack)[1], vx: -5, vy: 0 };
    const kicked = step({ ...base, ball: at }, { y: at.y, kick: true }, 'normal', fixed);
    expect(kicked.ball.vx).toBeGreaterThan(50);

    const charged = arm(earnPower({ ...base, ball: at }));
    expect(charged.armed).toBe(true);
    const power = step(charged, { y: at.y, kick: true }, 'normal', fixed);
    expect(power.ball.vx).toBeGreaterThan(kicked.ball.vx);
    expect(power.power).toBe(0);
    expect(power.armed).toBe(false);
  });

  it('the first to five wins', () => {
    let s: FoosState = { ...newMatch(), rods: [], score: { you: WIN_SCORE - 1, cpu: 0 }, ball: { x: W - 3, y: H / 2, vx: 80, vy: 0 } };
    s = run(s, 30);
    expect(s.winner).toBe('you');
  });

  it('nudges a ball that has stopped dead', () => {
    let s: FoosState = { ...newMatch(), rods: [], ball: { x: W / 2, y: 10, vx: 0, vy: 0 } };
    s = run(s, 120 * 3);
    expect(Math.hypot(s.ball.x - W / 2, s.ball.y - 10)).toBeGreaterThan(0);
  });
});
