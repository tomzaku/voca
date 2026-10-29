import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VocabularyWord } from '../types';

// The cache lives in localStorage and is keyed by the language pair; give the
// test a plain in-memory storage and a learn language it can switch.
let learn = 'English';
vi.mock('./languages', () => ({ getLearnLanguage: () => learn, getMotherLanguage: () => 'Vietnamese' }));

const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
});

const { keyBySearchResult } = await import('./wordService');

const word = (w: string, headword?: string): VocabularyWord => ({
  word: w, headword, definition: 'a structure that crosses water', examples: [], level: 'beginner', imageKeywords: [],
});

describe('keyBySearchResult', () => {
  beforeEach(() => { store.clear(); learn = 'English'; });

  it('keys a corrected search by the real word', () => {
    const r = keyBySearchResult(word('brigde', 'bridge'));
    expect(r.word).toBe('bridge');
    expect(r.headword).toBeUndefined();
  });

  it('keys a meaning typed in the mother language by the word it means', () => {
    expect(keyBySearchResult(word('cây cầu', 'bridge')).word).toBe('bridge');
  });

  it('leaves a search that was already the word alone', () => {
    const w = word('bridge');
    expect(keyBySearchResult(w)).toBe(w);
    expect(keyBySearchResult(word('Bridge', 'bridge')).word).toBe('Bridge');
  });

  it('keeps the seed when the headword is a translation (another learn language)', () => {
    learn = 'Japanese';
    expect(keyBySearchResult(word('bridge', '橋')).word).toBe('bridge');
  });

  it('prefers data already cached under the real word', () => {
    keyBySearchResult(word('brigde', 'bridge'));
    const again = keyBySearchResult({ ...word('bridje', 'bridge'), definition: 'other' });
    expect(again.definition).toBe('a structure that crosses water');
  });
});
