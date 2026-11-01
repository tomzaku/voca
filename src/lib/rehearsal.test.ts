// A teacher's rehearsal walks Team Red's real route and grades by the
// server's own rules — and a wrong answer moves on to the next question,
// as it does in class.

import { describe, expect, it } from 'vitest';
import {
  answer,
  currentAnswer,
  currentQuestion,
  currentStation,
  found,
  rehearsalLetters,
  startRehearsal,
  type Rehearsal,
} from './rehearsal';

const q = (word: string) => ({ type: 'definition' as const, prompt: `means ${word}`, options: [word, 'nope'], answer: word });

const HUNT: Rehearsal = {
  title: 'Test',
  mode: 'qr',
  play: 'teams',
  treasure: 'CAT',
  need: 2,
  teamNames: ['Red', 'Blue'],
  stations: [
    { index: 0, place: null, clue: 'desk', letter: 'C', questions: [q('one'), q('uno')] },
    { index: 1, place: null, clue: 'door', letter: 'A', questions: [{ type: 'match', prompt: '', slotPrompts: ['purrs', 'barks'], slots: ['cat', 'dog'], options: ['dog', 'cat'], answer: 'cat · dog' }] },
    { index: 2, place: null, clue: '', letter: 'T', questions: [{ type: 'custom', prompt: 'Sky?', answer: 'grey', accept: ['gray'] }] },
  ],
};

describe('rehearsal', () => {
  it('starts at Team Red’s first station, looking for it', () => {
    const s = startRehearsal();
    expect(s.phase).toBe('find');
    expect(currentStation(HUNT, s)?.clue).toBe('desk');
    expect(currentQuestion(HUNT, s)).toBeNull();
  });

  it('shows the question once the card is found — without its answer', () => {
    const s = found(startRehearsal());
    const pq = currentQuestion(HUNT, s)!;
    expect(pq.prompt).toBe('means one');
    expect(pq).not.toHaveProperty('answer');
  });

  it('moves to the next question in the pool after a miss', () => {
    let s = found(startRehearsal());
    s = answer(HUNT, s, 'nope');
    expect(s.last).toBe('wrong');
    expect(currentQuestion(HUNT, s)!.prompt).toBe('means uno');
    expect(currentAnswer(HUNT, s)).toBe('uno');
  });

  it('collects the letter and walks on, through matching and typed questions, to the treasure', () => {
    let s = found(startRehearsal());
    s = answer(HUNT, s, 'ONE');
    expect([s.phase, s.letters, s.last]).toEqual(['find', ['C'], 'right']);
    s = found(s);
    expect(currentAnswer(HUNT, s)).toBe('cat · dog');
    s = answer(HUNT, s, ['dog', 'cat']);
    expect(s.last).toBe('wrong');
    s = answer(HUNT, s, ['cat', 'dog']);
    s = answer(HUNT, found(s), 'Gray');
    expect(s.phase).toBe('final');
    expect(rehearsalLetters(s)).toEqual(['A', 'C', 'T']);
    expect(currentAnswer(HUNT, s)).toBe('CAT');
    expect(answer(HUNT, s, 'act').last).toBe('wrong');
    expect(answer(HUNT, s, 'cat').phase).toBe('done');
  });

  it('ignores answers when nothing is being asked', () => {
    const s = startRehearsal();
    expect(answer(HUNT, s, 'one')).toBe(s);
  });
});
