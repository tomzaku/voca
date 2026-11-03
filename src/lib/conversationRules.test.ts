import { describe, expect, it } from 'vitest';
import { highlightPhrases, phrasesUsed, pickQuestion } from './conversationRules';
import type { SpeakingQuestion } from '../data/englishSpeaking';

const q = (id: string): SpeakingQuestion => ({ id, topic: 'Daily Life', difficulty: 'easy', question: id, sampleAnswers: [] });

describe('pickQuestion', () => {
  const bank = [q('a'), q('b'), q('c')];
  it('asks a question never practiced first', () => {
    expect(pickQuestion(bank, { a: { count: 1, practicedAt: 1 }, b: { count: 1, practicedAt: 2 } })?.id).toBe('c');
  });
  it('then the one practiced longest ago, skipping the ones just asked', () => {
    const all = { a: { count: 1, practicedAt: 5 }, b: { count: 1, practicedAt: 1 }, c: { count: 1, practicedAt: 3 } };
    expect(pickQuestion(bank, all)?.id).toBe('b');
    expect(pickQuestion(bank, all, new Set(['b']))?.id).toBe('c');
  });
  it('treats an unmarked question as fresh, and runs out cleanly', () => {
    expect(pickQuestion([q('a')], { a: { count: 0 } })?.id).toBe('a');
    expect(pickQuestion([q('a')], {}, new Set(['a']))).toBeNull();
  });
});

describe('phrasesUsed', () => {
  it('matches a phrase whose gap the learner filled in', () => {
    expect(phrasesUsed("Well, I'd describe myself as curious.", ["I'd describe myself as...", 'I really enjoy...'])).toEqual(["I'd describe myself as..."]);
  });
  it('needs every part of a split phrase, in order', () => {
    const phrase = ['not that... but that...'];
    expect(phrasesUsed('Not that it was hard, but that it was new', phrase)).toEqual(phrase);
    expect(phrasesUsed('but that it was new, not that it was hard', phrase)).toEqual([]);
  });
  it('matches whole words only', () => {
    expect(phrasesUsed('I really enjoyed it', ['I really enjoy...'])).toEqual([]);
  });
});

describe('highlightPhrases', () => {
  const marked = (text: string, phrases: string[]) =>
    highlightPhrases(text, phrases).filter((h) => h.phrase).map((h) => h.text);

  it('marks the fixed words of each phrase, across a "..." gap', () => {
    const text = "That's easy, it would be noodle soup. Ask me again after seven days, though.";
    expect(marked(text, ["that's easy, it would be...", 'ask me again after..., though']))
      .toEqual(["That's easy, it would be", 'Ask me again after', 'though']);
  });

  it('treats curly and straight apostrophes alike and keeps the text whole', () => {
    const text = 'I don’t think I’d get bored.';
    const runs = highlightPhrases(text, ["I don't think I'd get bored"]);
    expect(runs.map((r) => r.text).join('')).toBe(text);
    expect(runs[0].phrase).toBe("I don't think I'd get bored");
  });

  it('lets punctuation between words differ, as speech has none', () => {
    expect(marked('a bit of everything honestly, pop', ['A bit of everything, honestly'])).toEqual(['a bit of everything honestly']);
  });

  it('marks nothing inside another word', () => {
    expect(marked('the easy part', ['as'])).toEqual([]);
  });
});
