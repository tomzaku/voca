import { describe, expect, it } from 'vitest';
import { HIGH, KEY_FOR, LOW, PIANO_SONGS, midiOf, parseMelody } from './pianoSongs';

describe('midiOf', () => {
  it('reads pitches with sharps and flats', () => {
    expect(midiOf('C4')).toBe(60);
    expect(midiOf('A4')).toBe(69);
    expect(midiOf('F#3')).toBe(54);
    expect(midiOf('Bb4')).toBe(70);
  });
});

describe('parseMelody', () => {
  it('reads pitches and beats, ignores fingers, drops rests, keeps a chord’s top note', () => {
    expect(parseMelody('E4/3 D4/2:2 r C4+E4+G4:0.5')).toEqual([
      { midi: 64, beats: 1 }, { midi: 62, beats: 2 }, { midi: 67, beats: 0.5 },
    ]);
  });
});

describe('the songs', () => {
  it.each(PIANO_SONGS.map((s) => [s.title, s] as const))('%s fits on the keyboard', (_, s) => {
    expect(s.notes.length).toBeGreaterThan(10);
    for (const n of s.notes) {
      expect(n.midi).toBeGreaterThanOrEqual(LOW);
      expect(n.midi).toBeLessThanOrEqual(HIGH);
    }
  });

  it('every note of every song has a computer key', () => {
    const keyed = new Set(Object.values(KEY_FOR));
    for (const s of PIANO_SONGS) for (const n of s.notes) expect(keyed.has(n.midi), `${s.id} ${n.midi}`).toBe(true);
  });
});
