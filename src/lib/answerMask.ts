// Masking the answer word out of clue text (examples shown while guessing).
// Shared by the flashcard guess flow and the collection quiz.

// Irregular inflections that don't share a maskable stem with their lemma
// (draw → drew, take → took). Forms that already start with the lemma's stem
// (draw → drawn, take → taken after the silent-e drop) are omitted — the
// stem+suffix match below already covers them.
const IRREGULAR_FORMS: Record<string, string[]> = {
  arise: ['arose'], awake: ['awoke'], bear: ['bore', 'borne'],
  begin: ['began', 'begun'], bend: ['bent'], bind: ['bound'], bleed: ['bled'],
  blow: ['blew'], break: ['broke'], breed: ['bred'], bring: ['brought'],
  build: ['built'], buy: ['bought'], catch: ['caught'], choose: ['chose'],
  cling: ['clung'], come: ['came'], creep: ['crept'], deal: ['dealt'],
  dig: ['dug'], draw: ['drew'], dream: ['dreamt'], drink: ['drank', 'drunk'],
  drive: ['drove'], eat: ['ate'], fall: ['fell'], feed: ['fed'],
  feel: ['felt'], fight: ['fought'], find: ['found'], flee: ['fled'],
  fling: ['flung'], fly: ['flew', 'flown'], forbid: ['forbade'],
  forget: ['forgot'], forgive: ['forgave'], freeze: ['froze'], get: ['got'],
  give: ['gave'], grind: ['ground'], grow: ['grew'], hang: ['hung'],
  hold: ['held'], keep: ['kept'], kneel: ['knelt'], know: ['knew'],
  lay: ['laid'], lead: ['led'], leave: ['left'], lend: ['lent'],
  lie: ['lay', 'lain'], light: ['lit'], make: ['made'], meet: ['met'],
  pay: ['paid'], ride: ['rode'], ring: ['rang', 'rung'], rise: ['rose'],
  run: ['ran'], say: ['said'], see: ['saw'], seek: ['sought'],
  sell: ['sold'], send: ['sent'], shake: ['shook'], shine: ['shone'],
  shoot: ['shot'], shrink: ['shrank', 'shrunk'], sing: ['sang', 'sung'],
  sink: ['sank', 'sunk'], sit: ['sat'], sleep: ['slept'],
  speak: ['spoke', 'spoken'], spend: ['spent'], spin: ['spun'],
  spring: ['sprang', 'sprung'], stand: ['stood'], steal: ['stole', 'stolen'],
  stick: ['stuck'], sting: ['stung'], strike: ['struck'], strive: ['strove'],
  swear: ['swore', 'sworn'], sweep: ['swept'], swim: ['swam', 'swum'],
  swing: ['swung'], take: ['took'], teach: ['taught'], tear: ['tore', 'torn'],
  tell: ['told'], think: ['thought'], throw: ['threw'], tread: ['trod'],
  understand: ['understood'], wake: ['woke', 'woken'], wear: ['wore', 'worn'],
  weave: ['wove'], weep: ['wept'], win: ['won'], wind: ['wound'],
  write: ['wrote'],
};

// Derivational suffixes stripped (longest first) to reach a shared root, so
// "criticism" also masks criticize/criticized/critical. Only applied when the
// remaining root is long enough to stay distinctive.
const DERIVATIONAL_SUFFIXES = [
  'ization', 'isation', 'ically', 'ation', 'ition', 'ility', 'ement',
  'ness', 'ment', 'ance', 'ence', 'ship', 'hood',
  'ism', 'ist', 'ity', 'ive', 'ize', 'ise', 'ous', 'ful',
  'al', 'ic',
];

const MIN_ROOT = 4;

function derivationalRoot(token: string): string | null {
  for (const suffix of DERIVATIONAL_SUFFIXES) {
    if (token.endsWith(suffix) && token.length - suffix.length >= MIN_ROOT) {
      return token.slice(0, -suffix.length);
    }
  }
  return null;
}

/**
 * A regex matching the answer word, its inflections and close derivations
 * (adumbrate → adumbrated/adumbrating/…, draw → drew, criticism →
 * criticized). Drops a trailing silent 'e'/'y' so the stem covers
 * -ed/-ing/-ies forms, strips derivational suffixes down to a shared root,
 * and adds known irregular verb forms. Skips short tokens (a, an, of…).
 * Returns null when there's nothing worth matching.
 *
 * `family` takes the word's AI-generated wordFamily forms — they catch
 * stem-changing derivations no suffix rule can (decide → decision,
 * maintain → maintenance), each stemmed the same way as the answer.
 */
export function answerRegex(answer: string, family?: string[]): RegExp | null {
  const tokens = [answer, ...(family ?? [])]
    .flatMap((s) => s.toLowerCase().split(/[^a-z]+/))
    .filter((t) => t.length >= 3);
  const stems = new Set<string>();
  for (const token of tokens) {
    stems.add(/[ey]$/.test(token) ? token.slice(0, -1) : token);
    const root = derivationalRoot(token);
    if (root) stems.add(root);
    for (const form of IRREGULAR_FORMS[token] ?? []) stems.add(form);
  }
  if (stems.size === 0) return null;
  return new RegExp(`\\b(?:${[...stems].join('|')})[a-z]*\\b`, 'gi');
}

/**
 * Blank out the answer (and its inflections) in a piece of clue text —
 * otherwise the clue reveals the answer. Over-masking a rare look-alike is
 * fine; leaking the answer is not.
 */
export function maskAnswer(example: string, answer: string, family?: string[]): string {
  const re = answerRegex(answer, family);
  return re ? example.replace(re, '____') : example;
}

/** The mask-relevant forms of a word's family (wordFamily entries carry pos). */
export function familyForms(family?: { word: string }[]): string[] | undefined {
  return family?.map((f) => f.word);
}
