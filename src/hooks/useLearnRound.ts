import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useTeams } from './useTeams';
import { useVocabularyStore } from './useVocabulary';
import { recentAccuracy, smartPick, type RealGuessGameMode } from './useGuessGame';
import { useWordSearch } from './useWordSearch';
import { generateWordData, pickNextWords } from '../lib/wordService';
import type { AnswerVia, VocabularyWord } from '../types';

/**
 * How a Learn round is written down, wherever it was played: a solve is a
 * successful review ('known', with the round's wrong attempts), giving up is
 * a lapse ('skipped'), and a solve or a "know it" also counts towards the
 * learner's team. The flash card and the world's Đông Ba stall both record
 * through this.
 */
export function useLearnRecorder() {
  const { user } = useAuth();
  const markWord = useVocabularyStore((s) => s.markWord);
  return {
    solved: (word: string, mistakes: number, via: AnswerVia) => {
      markWord(word, 'known', user?.id, mistakes, via);
      if (user) void useTeams.getState().recordAnswer();
    },
    gaveUp: (word: string, mistakes: number, via: AnswerVia) => {
      markWord(word, 'skipped', user?.id, mistakes, via);
    },
  };
}

export type LearnPhase = 'loading' | 'guessing' | 'solved' | 'gaveUp' | 'empty';

/**
 * One Learn round after another, headless: the next word is chosen exactly as
 * the flash card chooses it (pickNextWords — struggling and new words, due
 * reviews; a word sent from a search first), the game by the same smart
 * ladder, and the result recorded by useLearnRecorder. `playable` lists the
 * games the caller can draw; a pick outside it falls back down the ladder.
 *
 * `pickWord` replaces the picking with a fixed queue (Thiên Mụ's due words):
 * it returns the next word, or null when the queue is done ('empty').
 */
export function useLearnRound(playable: RealGuessGameMode[], pickWord?: () => string | null) {
  const recorder = useLearnRecorder();
  const [phase, setPhase] = useState<LearnPhase>('loading');
  const [wordData, setWordData] = useState<VocabularyWord | null>(null);
  const [game, setGame] = useState<RealGuessGameMode>('choice');
  const [mistakes, setMistakes] = useState(0);
  const mistakesRef = useRef(0);
  // Words from this sitting, so the next pick doesn't hand one straight back.
  const recent = useRef<string[]>([]);
  const playableKey = playable.join(',');
  // One load at a time: a second call while a word is loading (React's dev
  // double-mount, or Enter pressed twice) would otherwise take a second word
  // off a queue and skip the first.
  const loading = useRef(false);

  const next = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    setPhase('loading');
    setMistakes(0);
    mistakesRef.current = 0;
    try {
      let picked: { word: string } | undefined;
      if (pickWord) {
        const w = pickWord();
        picked = w ? { word: w } : undefined;
      } else {
        // A word sent over from a search ("learn it") goes first; otherwise
        // the usual pick.
        const requested = useWordSearch.getState().pending;
        if (requested) useWordSearch.getState().consume();
        [picked] = requested ? [{ word: requested }] : await pickNextWords(new Set(recent.current));
      }
      if (!picked) { setPhase('empty'); return; }
      const data = await generateWordData(picked.word);
      recent.current = [...recent.current, picked.word].slice(-20);
      const all = useVocabularyStore.getState().progress;
      let g = smartPick(all[picked.word], recentAccuracy(all));
      // Climb back down the ladder to something this screen can draw.
      if (!playable.includes(g)) g = g === 'speak' && playable.includes('listen') ? 'listen' : playable[0];
      setGame(g);
      setWordData(data);
      setPhase('guessing');
    } catch {
      setPhase('empty');
    } finally {
      loading.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playableKey]);

  useEffect(() => { void next(); }, [next]);

  /** The word as the player guesses it (the learn-language headword). */
  const answer = wordData ? (wordData.headword || wordData.word) : '';

  const miss = () => {
    mistakesRef.current += 1;
    setMistakes(mistakesRef.current);
  };
  const solve = () => {
    if (!wordData || phase !== 'guessing') return;
    recorder.solved(wordData.word, mistakesRef.current, game);
    setPhase('solved');
  };
  const giveUp = () => {
    if (!wordData || phase !== 'guessing') return;
    recorder.gaveUp(wordData.word, mistakesRef.current, game);
    setPhase('gaveUp');
  };

  return { phase, wordData, answer, game, mistakes, miss, solve, giveUp, next };
}
