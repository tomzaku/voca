// The questions' pure rules, pinned: the answer is sealed (unreadable,
// unforgeable, yours only, and it expires), the prompt doesn't give the word
// away, and the wrong options are real, different words.

import { describe, expect, it } from 'vitest';
import { distractors, matches, open, promptFor, seal, TOKEN_TTL_MS } from './questions';

const SECRET = 'test-secret';

describe('sealed answers', () => {
  it('round-trips for the same player before it expires', async () => {
    const now = Date.now();
    const token = await seal({ a: 'luggage', u: 'me', e: now + TOKEN_TTL_MS }, SECRET);
    expect(token).not.toContain('luggage');
    expect((await open(token, SECRET, 'me', now))?.a).toBe('luggage');
  });

  it('refuses another player, an expired token, the wrong key, and a tampered one', async () => {
    const now = Date.now();
    const token = await seal({ a: 'luggage', u: 'me', e: now + 1000 }, SECRET);
    expect(await open(token, SECRET, 'someone-else', now)).toBeNull();
    expect(await open(token, SECRET, 'me', now + 2000)).toBeNull();
    expect(await open(token, 'other-secret', 'me', now)).toBeNull();
    const flipped = token.slice(0, -2) + (token.endsWith('A') ? 'B' : 'A') + token.slice(-1);
    expect(await open(flipped, SECRET, 'me', now)).toBeNull();
    expect(await open('not-a-token', SECRET, 'me', now)).toBeNull();
  });
});

describe('promptFor', () => {
  it('blanks the word and its forms when the definition uses them', () => {
    expect(promptFor('travel', 'A person who travels for fun; to travel.')).toBe('A person who ___ for fun; to ___.');
    expect(promptFor('dog', 'A pet that barks')).toBe('A pet that barks');
  });
});

describe('distractors', () => {
  it('gives three different words, never the answer, similar lengths first', () => {
    const pool = ['luggage', 'Luggage', 'hostel', 'passport', 'map', 'souvenir', 'itinerary', 'bus'];
    const d = distractors('luggage', pool, () => 0.3);
    expect(d).toHaveLength(3);
    expect(d.map((w) => w.toLowerCase())).not.toContain('luggage');
    expect(new Set(d.map((w) => w.toLowerCase())).size).toBe(3);
    expect(d).not.toContain('map');
    expect(d).not.toContain('bus');
  });

  it('matches a choice regardless of case and spaces', () => {
    expect(matches(' Luggage ', 'luggage')).toBe(true);
    expect(matches('baggage', 'luggage')).toBe(false);
  });
});
