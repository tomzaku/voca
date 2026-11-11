/**
 * BBC Learning English's "The Sounds of English" — a free video for every
 * sound on the chart: a teacher's mouth close up, front and side, saying it
 * alone and in words. A real mouth shows what no drawing can.
 *
 * Each entry is the three words from that video's title. The link is a
 * YouTube search for its exact title (BBC's own upload comes up first)
 * rather than a hard-coded video id, which would break silently if BBC
 * re-uploads it.
 */
const WORDS: Record<string, string> = {
  ɪ: 'kit bid him',
  e: 'dress head bed',
  æ: 'trap stamp back',
  ʌ: 'strut mud love',
  ɒ: 'lot odd wash',
  ʊ: 'foot put good',
  ə: 'the of butter',
  iː: 'fleece sea machine',
  ɜː: 'nurse stir learn',
  ɑː: 'father start hard',
  ɔː: 'law north war',
  uː: 'blue two goose',
  eɪ: 'face day break',
  aɪ: 'price high try',
  ɔɪ: 'choice noise boy',
  aʊ: 'mouth now fowl',
  əʊ: 'boat show know',
  ɪə: 'near hear weary',
  eə: 'square fair pair',
  ʊə: 'tour pure cure',
  p: 'pack pan pop',
  b: 'back baby job',
  t: 'tin button get',
  d: 'odd did ladder',
  k: 'came lucky sick',
  g: 'get giggle ghost',
  f: 'fat coffee fluff',
  v: 'view heavy move',
  θ: 'thin throw thumb',
  ð: 'this other smooth',
  s: 'soon mister hiss',
  z: 'zero music roses',
  ʃ: 'ship sure national',
  ʒ: 'pleasure leisure vision',
  h: 'hot whole ahead',
  tʃ: 'teacher match church',
  dʒ: 'judge age soldier',
  m: 'hammer mime more',
  n: 'nice funny son',
  ŋ: 'rung anger thanks',
  l: 'light valley feel',
  r: 'right wrong sorry',
  j: 'yet use beauty',
  w: 'wet one when',
};

/** The BBC video for a chart sound, or null for a sound it doesn't cover. */
export function bbcVideoLink(symbol: string): string | null {
  const words = WORDS[symbol];
  if (!words) return null;
  const q = `BBC Learning English English Pronunciation /${symbol}/ ${words}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
