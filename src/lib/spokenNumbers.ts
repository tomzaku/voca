// Numbers as they're said. Speech recognition writes "three" as "3" and a
// learner may type either, so anything that compares spoken English against
// a sentence turns digits into words first.

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES: [number, string][] = [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand'], [100, 'hundred']];

/** 325 → ["three", "hundred", "twenty", "five"]. */
export function numberWords(n: number): string[] {
  if (n < 20) return [ONES[n]];
  if (n < 100) return n % 10 ? [TENS[Math.floor(n / 10)], ONES[n % 10]] : [TENS[n / 10]];
  for (const [size, name] of SCALES) {
    if (n >= size) {
      const rest = n % size;
      return [...numberWords(Math.floor(n / size)), name, ...(rest ? numberWords(rest) : [])];
    }
  }
  return [String(n)];
}

const ORDINAL: Record<string, string> = {
  one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth',
};
export function ordinalWords(n: number): string[] {
  const w = numberWords(n);
  const last = w[w.length - 1];
  w[w.length - 1] = ORDINAL[last] ?? (last.endsWith('y') ? `${last.slice(0, -1)}ieth` : `${last}th`);
  return w;
}

/** Every number in `text` ("3", "25th") spelled out in words. */
export function spellNumbers(text: string): string {
  return text.replace(/\d+(st|nd|rd|th)?/gi, (m, suffix: string | undefined) => {
    if (m.length > 12) return m;
    const n = parseInt(m, 10);
    return ` ${(suffix ? ordinalWords(n) : numberWords(n)).join(' ')} `;
  });
}
