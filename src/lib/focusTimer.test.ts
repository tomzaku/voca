import { describe, expect, it } from 'vitest';
import {
  clock, initialFocus, minutesToday, pause, phaseAt, reset, secondsCounted, secondsLeft, setMode, skip, start, tick,
} from './focusTimer';

const T0 = new Date('2026-10-31T09:00:00').getTime();
const MIN = 60_000;

describe('phaseAt', () => {
  it('runs work and breaks in turn, every third break the long one', () => {
    expect(Array.from({ length: 8 }, (_, i) => phaseAt(i))).toEqual([
      'work', 'short', 'work', 'short', 'work', 'long', 'work', 'short',
    ]);
  });
});

describe('pomodoro', () => {
  it('counts down from the work length while running', () => {
    const s = start(initialFocus(T0), T0);
    expect(secondsLeft(s, T0)).toBe(25 * 60);
    expect(secondsLeft(s, T0 + 10 * MIN)).toBe(15 * 60);
  });

  it('holds its time while paused', () => {
    const s = pause(start(initialFocus(T0), T0), T0 + 10 * MIN);
    expect(secondsLeft(s, T0 + 60 * MIN)).toBe(15 * 60);
  });

  it('moves on to the break when the work phase ends, and credits the minutes', () => {
    const { state, finished } = tick(start(initialFocus(T0), T0), T0 + 25 * MIN + 500);
    expect(finished).toBe('work');
    expect(phaseAt(state.phase)).toBe('short');
    expect(secondsLeft(state, T0 + 25 * MIN)).toBe(5 * 60);
    expect(state.today.seconds).toBe(25 * 60);
  });

  it('does nothing before the phase ends', () => {
    const s = start(initialFocus(T0), T0);
    expect(tick(s, T0 + MIN).finished).toBeNull();
  });

  it('credits worked time when paused mid-phase', () => {
    const s = pause(start(initialFocus(T0), T0), T0 + 10 * MIN);
    expect(s.today.seconds).toBe(10 * 60);
    expect(minutesToday(s, T0 + 10 * MIN)).toBe(10);
  });

  it('skips to the next phase, still running', () => {
    const s = skip(start(initialFocus(T0), T0), T0 + MIN);
    expect(phaseAt(s.phase)).toBe('short');
    expect(s.running).toBe(true);
  });

  it('resets to the start of work', () => {
    const s = reset(skip(initialFocus(T0), T0), T0);
    expect(s.phase).toBe(0);
    expect(secondsLeft(s, T0)).toBe(25 * 60);
  });
});

describe('free focus', () => {
  it('counts up, holds while paused, and credits the minutes', () => {
    let s = start(setMode(initialFocus(T0), 'free', T0), T0);
    expect(secondsCounted(s, T0 + 3 * MIN)).toBe(180);
    s = pause(s, T0 + 3 * MIN);
    expect(secondsCounted(s, T0 + 9 * MIN)).toBe(180);
    expect(s.today.seconds).toBe(180);
  });
});

describe('clock', () => {
  it('writes mm:ss, and h:mm:ss past the hour', () => {
    expect(clock(25 * 60)).toBe('25:00');
    expect(clock(65)).toBe('01:05');
    expect(clock(3725)).toBe('1:02:05');
  });
});
