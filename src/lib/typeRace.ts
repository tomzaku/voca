// The type race's rules, with no UI attached: a run of words to type against
// a train that keeps a steady pace. A word counts once it's typed right (a
// typo stays red until it's fixed); speed is the usual words-per-minute —
// five characters to a word, spaces included — and accuracy is the share of
// keystrokes that were right the first time.

/** Words for a race: shuffled from the pool, short ones and long ones mixed,
 *  only plain letters (and the odd hyphen or apostrophe). */
export function raceWords(pool: string[], count: number, random = Math.random): string[] {
  const usable = [...new Set(pool.map((w) => w.trim().toLowerCase()))].filter((w) => /^[a-z][a-z'-]{1,13}$/.test(w));
  for (let i = usable.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [usable[i], usable[j]] = [usable[j], usable[i]];
  }
  return usable.slice(0, count);
}

/** The characters of the whole race, spaces between words. */
export const raceLength = (words: string[]) => words.join(' ').length;

/** Words per minute for `chars` typed in `ms`. */
export function wpm(chars: number, ms: number): number {
  if (ms <= 0) return 0;
  return Math.round((chars / 5) / (ms / 60000));
}

/** How far the train has come (0–1) after `ms` at `trainWpm`. */
export function trainProgress(words: string[], trainWpm: number, ms: number): number {
  return Math.min(1, ((trainWpm * 5 * ms) / 60000) / raceLength(words));
}

/** How far you've come (0–1): the words done, and the right start of the one
 *  you're on. */
export function playerProgress(words: string[], done: number, typed: string): number {
  if (done >= words.length) return 1;
  const word = words[done];
  let right = 0;
  while (right < typed.length && right < word.length && typed[right] === word[right]) right++;
  const before = words.slice(0, done).join(' ').length + (done > 0 ? 1 : 0);
  return Math.min(1, (before + right) / raceLength(words));
}

/** Share of keystrokes right first time, as a whole percent. */
export function accuracy(right: number, total: number): number {
  return total ? Math.round((right / total) * 100) : 100;
}
