import { useMemo, useState } from 'react';
import { playSelect, playWin, playWrong } from '../lib/sfx';
import { shuffle, type QuizPair } from '../lib/quizEngine';

/** How one card on a match board should look right now. */
export type MatchCardState = 'default' | 'active' | 'linked' | 'correct' | 'wrong';

/**
 * The rules of one tap-to-connect match round, with no UI: tap a word and a
 * definition (either order) to link them, one-to-one; nothing is judged until
 * submit. With `reveal`, submit shows right/wrong in place and `finish` hands
 * the result back; without it, submit hands it straight back. The app's
 * MatchBoard and the world's pixel board both draw from this, so a round plays
 * the same wherever it is.
 */
export function useMatchBoard(
  pairs: QuizPair[],
  reveal: boolean,
  onComplete: (mistakes: number, links: Record<string, string>) => void,
) {
  const [active, setActive] = useState<{ side: 'L' | 'R'; word: string } | null>(null);
  // left word → the right definition's word it's linked to (one-to-one).
  const [links, setLinks] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  const rightPairs = useMemo(() => shuffle(pairs), [pairs]);
  const linkedCount = Object.keys(links).length;
  const allLinked = linkedCount === pairs.length;
  const mistakes = Object.entries(links).filter(([l, r]) => l !== r).length;

  const tap = (side: 'L' | 'R', word: string) => {
    if (revealed) return;
    playSelect();
    if (!active || active.side === side) {
      setActive({ side, word }); // first pick, or switch on the same side
      return;
    }
    const leftWord = side === 'L' ? word : active.word;
    const rightWord = side === 'R' ? word : active.word;
    setActive(null);
    // Keep it one-to-one: drop any prior link using either endpoint.
    setLinks((prev) => {
      const next: Record<string, string> = {};
      for (const [l, r] of Object.entries(prev)) {
        if (l === leftWord || r === rightWord) continue;
        next[l] = r;
      }
      next[leftWord] = rightWord;
      return next;
    });
  };

  const finish = () => {
    if (done) return;
    setDone(true);
    onComplete(mistakes, links);
  };

  const submit = () => {
    if (reveal) {
      setRevealed(true);
      if (mistakes === 0) playWin(); else playWrong();
    } else {
      finish();
    }
  };

  const cardState = (side: 'L' | 'R', word: string): MatchCardState => {
    const isLinked = side === 'L' ? word in links : Object.values(links).includes(word);
    if (revealed && isLinked) {
      const ok = side === 'L'
        ? links[word] === word
        : Object.entries(links).find(([, r]) => r === word)?.[0] === word;
      return ok ? 'correct' : 'wrong';
    }
    if (active?.side === side && active.word === word) return 'active';
    if (isLinked) return 'linked';
    return 'default';
  };

  /** The left word a card is linked to (itself, on the left), for pairing marks. */
  const linkOf = (side: 'L' | 'R', word: string): string | undefined =>
    side === 'L' ? (word in links ? word : undefined) : Object.entries(links).find(([, r]) => r === word)?.[0];

  return {
    links, rightPairs, linkedCount, allLinked, mistakes, revealed, done,
    tap, submit, finish, cardState, linkOf,
  };
}
