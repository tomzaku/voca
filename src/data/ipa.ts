// The 44 sounds of English, as commonly taught in ESL/IPA charts (RP-leaning
// symbols — e.g. /ɒ/, /əʊ/ — since that's the standard reference set most
// learners meet first). Static, hand-checked reference data: unlike a
// looked-up word's phonetics (word/phonemize.ts, generated per word via
// eSpeak), this list of sounds and their example words never changes, so
// there's nothing here worth a round trip to an edge function.
//
// Example-word audio plays through the same TTS pipeline as everywhere else
// (src/lib/tts.ts) — phonemizer produces text transcriptions, not audio, and
// these symbol -> example-word mappings are fixed by construction, so a
// per-word phonemize call would be pure overhead here.

export type IpaCategory = 'vowel-short' | 'vowel-long' | 'diphthong' | 'consonant';

export const CATEGORY_LABELS: Record<IpaCategory, string> = {
  'vowel-short': 'Short vowels',
  'vowel-long': 'Long vowels',
  diphthong: 'Diphthongs',
  consonant: 'Consonants',
};

// Display order for the chart — vowels simple-to-complex, then consonants.
export const CATEGORY_ORDER: IpaCategory[] = ['vowel-short', 'vowel-long', 'diphthong', 'consonant'];

export interface IpaSound {
  symbol: string;
  category: IpaCategory;
  /** Shown on the chart card — kept short (3) so every card is the same size. */
  examples: string[];
  /** Extra words shown only on the detail page — chart stays uncluttered. */
  moreExamples: string[];
  /** One line on tongue/lip/jaw position and voicing — the detail page's
   *  answer to "how do I actually make this sound". */
  howTo: string;
}

export const IPA_SOUNDS: IpaSound[] = [
  // ── Short vowels ──
  { symbol: 'ɪ', category: 'vowel-short', examples: ['sit', 'pin', 'dish'], moreExamples: ['bit', 'kiss', 'lip', 'big', 'fish', 'drink', 'ill', 'sing'],
    howTo: 'Tongue high and toward the front, lips relaxed and slightly spread — shorter and looser than /iː/.' },
  { symbol: 'e', category: 'vowel-short', examples: ['bed', 'pen', 'red'], moreExamples: ['bell', 'ten', 'get', 'went', 'yes', 'egg', 'seven', 'help'],
    howTo: 'Mouth half-open, tongue mid and forward, lips relaxed — like /ɪ/ but with the jaw dropped a little more.' },
  { symbol: 'æ', category: 'vowel-short', examples: ['cat', 'hat', 'bag'], moreExamples: ['bad', 'man', 'apple', 'black', 'hand', 'bank', 'sad', 'add'],
    howTo: 'Jaw drops low, lips spread wide, tongue low and forward — the widest smile of the short vowels.' },
  { symbol: 'ʌ', category: 'vowel-short', examples: ['cup', 'run', 'luck'], moreExamples: ['love', 'mother', 'come', 'blood', 'sun', 'money', 'young', 'done'],
    howTo: 'Mouth barely open, tongue central and relaxed, lips neutral — a short, clipped "uh".' },
  { symbol: 'ɒ', category: 'vowel-short', examples: ['hot', 'dog', 'top'], moreExamples: ['box', 'watch', 'shop', 'lot', 'stop', 'clock', 'want', 'wash'],
    howTo: 'Lips rounded, jaw dropped, tongue low and back — the British "o" in "hot" (many American speakers merge this with /ɑː/).' },
  { symbol: 'ʊ', category: 'vowel-short', examples: ['book', 'put', 'foot'], moreExamples: ['good', 'look', 'wood', 'cook', 'full', 'push', 'sugar', 'woman'],
    howTo: 'Lips loosely rounded, tongue high and back, short and relaxed — not as tense or rounded as /uː/.' },
  { symbol: 'ə', category: 'vowel-short', examples: ['about', 'sofa', 'banana'], moreExamples: ['doctor', 'upon', 'common', 'camera', 'ago', 'taken', 'paper', 'support'],
    howTo: 'The most relaxed vowel in English (the "schwa") — the mouth barely moves, tongue central. Only appears in unstressed syllables.' },

  // ── Long vowels ──
  { symbol: 'iː', category: 'vowel-long', examples: ['see', 'tree', 'sheep'], moreExamples: ['three', 'key', 'cheese', 'please', 'green', 'sleep', 'people', 'believe'],
    howTo: 'Lips spread into a tight smile, tongue high and forward, held longer and tenser than /ɪ/.' },
  { symbol: 'ɜː', category: 'vowel-long', examples: ['bird', 'girl', 'learn'], moreExamples: ['word', 'nurse', 'work', 'first', 'turn', 'shirt', 'early', 'herself'],
    howTo: 'Lips neutral, tongue mid-central, jaw slightly open — held long, like a British "er".' },
  { symbol: 'ɑː', category: 'vowel-long', examples: ['car', 'father', 'class'], moreExamples: ['park', 'heart', 'palm', 'dark', 'fast', 'start', 'laugh', 'bath'],
    howTo: 'Mouth wide open, tongue low and back, lips relaxed — a long, open "ah".' },
  { symbol: 'ɔː', category: 'vowel-long', examples: ['door', 'saw', 'ball'], moreExamples: ['more', 'walk', 'thought', 'sport', 'talk', 'law', 'morning', 'small'],
    howTo: 'Lips rounded and pushed forward, tongue mid-back, jaw dropped — held long.' },
  { symbol: 'uː', category: 'vowel-long', examples: ['blue', 'food', 'moon'], moreExamples: ['two', 'shoe', 'true', 'school', 'soon', 'group', 'juice', 'through'],
    howTo: 'Lips tightly rounded and pushed forward, tongue high and back, held long and tense.' },

  // ── Diphthongs — two vowels gliding together, named by their start -> end ──
  { symbol: 'eɪ', category: 'diphthong', examples: ['day', 'name', 'rain'], moreExamples: ['play', 'wait', 'they', 'eight', 'face', 'table', 'break', 'weight'],
    howTo: 'Starts at /e/ and glides up toward /ɪ/ — lips move from relaxed to slightly spread as you say it.' },
  { symbol: 'aɪ', category: 'diphthong', examples: ['my', 'time', 'light'], moreExamples: ['fly', 'night', 'buy', 'five', 'like', 'smile', 'high', 'right'],
    howTo: 'Starts open and low, glides up toward /ɪ/ — the jaw closes as the sound finishes.' },
  { symbol: 'ɔɪ', category: 'diphthong', examples: ['boy', 'coin', 'noise'], moreExamples: ['toy', 'voice', 'join', 'enjoy', 'point', 'choice', 'oil', 'boil'],
    howTo: 'Starts rounded like /ɔː/, glides toward /ɪ/ — the lips unround as the tongue rises.' },
  { symbol: 'aʊ', category: 'diphthong', examples: ['now', 'house', 'town'], moreExamples: ['cow', 'mouth', 'sound', 'out', 'about', 'down', 'found', 'loud'],
    howTo: 'Starts open and low, glides toward /ʊ/ — the lips round as the sound closes.' },
  { symbol: 'əʊ', category: 'diphthong', examples: ['go', 'home', 'boat'], moreExamples: ['no', 'road', 'phone', 'know', 'over', 'only', 'most', 'though'],
    howTo: 'Starts central (schwa), glides toward /ʊ/ — the lips round only at the end.' },
  { symbol: 'ɪə', category: 'diphthong', examples: ['near', 'ear', 'here'], moreExamples: ['idea', 'beer', 'weird', 'clear', 'year', 'really', 'appear', 'fear'],
    howTo: 'Starts at /ɪ/, glides toward schwa — common before "r" in non-rhotic British English.' },
  { symbol: 'eə', category: 'diphthong', examples: ['hair', 'chair', 'care'], moreExamples: ['bear', 'where', 'fair', 'stairs', 'there', 'airport', 'wear', 'square'],
    howTo: 'Starts at /e/, glides toward schwa — the jaw opens slightly as it fades.' },
  { symbol: 'ʊə', category: 'diphthong', examples: ['pure', 'tour', 'sure'], moreExamples: ['cure', 'moor', 'endure', 'during', 'jury'],
    howTo: 'Starts at /ʊ/, glides toward schwa — increasingly rare in modern speech, often replaced by /ɔː/, so genuine examples are thin on the ground.' },

  // ── Consonants ──
  { symbol: 'p', category: 'consonant', examples: ['pen', 'map', 'apple'], moreExamples: ['park', 'stop', 'paper', 'pepper', 'play', 'sleep', 'happy', 'up'],
    howTo: 'Lips press together, then release with a puff of air — voiceless, no vibration in the throat.' },
  { symbol: 'b', category: 'consonant', examples: ['bad', 'cab', 'table'], moreExamples: ['boy', 'rabbit', 'bubble', 'robot', 'club', 'baby'],
    howTo: 'Lips press together, then release — same spot as /p/ but with the vocal cords vibrating (voiced).' },
  { symbol: 't', category: 'consonant', examples: ['ten', 'sit', 'better'], moreExamples: ['top', 'cat', 'letter', 'tent', 'little', 'water', 'night', 'invite'],
    howTo: 'Tongue tip taps the ridge behind your top teeth, then releases with a puff of air — voiceless.' },
  { symbol: 'd', category: 'consonant', examples: ['dog', 'red', 'ladder'], moreExamples: ['day', 'bed', 'dad', 'road', 'body', 'good'],
    howTo: 'Tongue tip taps the ridge behind your top teeth, then releases — same spot as /t/ but voiced.' },
  { symbol: 'k', category: 'consonant', examples: ['cat', 'sick', 'kitchen'], moreExamples: ['key', 'back', 'cookie', 'kick', 'milk', 'week', 'cake', 'black'],
    howTo: 'The back of the tongue touches the soft palate, then releases with a puff of air — voiceless.' },
  { symbol: 'g', category: 'consonant', examples: ['go', 'big', 'garden'], moreExamples: ['get', 'bag', 'giggle', 'dog', 'game', 'guest', 'egg', 'ago'],
    howTo: 'The back of the tongue touches the soft palate, then releases — same spot as /k/ but voiced.' },
  { symbol: 'f', category: 'consonant', examples: ['fan', 'leaf', 'coffee'], moreExamples: ['fun', 'life', 'phone', 'laugh', 'half', 'family'],
    howTo: 'Top teeth rest lightly on the bottom lip, air pushes through the gap — voiceless.' },
  { symbol: 'v', category: 'consonant', examples: ['van', 'love', 'seven'], moreExamples: ['very', 'live', 'view', 'give', 'travel', 'movie'],
    howTo: 'Top teeth rest lightly on the bottom lip, air pushes through — same as /f/ but voiced, felt as a buzz on the lip.' },
  { symbol: 'θ', category: 'consonant', examples: ['think', 'bath', 'three'], moreExamples: ['thumb', 'tooth', 'birthday', 'math', 'nothing', 'thick', 'throw', 'mouth'],
    howTo: 'Tongue tip pokes gently between the teeth, air hisses past it — voiceless, as in "think".' },
  { symbol: 'ð', category: 'consonant', examples: ['this', 'mother', 'weather'], moreExamples: ['that', 'brother', 'smooth', 'the', 'father', 'other'],
    howTo: 'Tongue tip pokes gently between the teeth, air hisses past it — same spot as /θ/ but voiced, as in "this".' },
  { symbol: 's', category: 'consonant', examples: ['sun', 'bus', 'city'], moreExamples: ['see', 'listen', 'sister', 'nice', 'sound', 'face'],
    howTo: 'Tongue tip near the ridge behind the teeth, a narrow channel hisses air out — voiceless.' },
  { symbol: 'z', category: 'consonant', examples: ['zoo', 'buzz', 'lazy'], moreExamples: ['zip', 'easy', 'music', 'zero', 'busy', 'these'],
    howTo: 'Same tongue position as /s/ — but voiced, felt as a buzz.' },
  { symbol: 'ʃ', category: 'consonant', examples: ['she', 'wash', 'sugar'], moreExamples: ['shop', 'wish', 'nation', 'sure', 'shoe', 'fish', 'station', 'special'],
    howTo: 'Tongue pulled back a little further than /s/, lips slightly rounded — voiceless "sh".' },
  { symbol: 'ʒ', category: 'consonant', examples: ['vision', 'treasure', 'usual'], moreExamples: ['pleasure', 'measure', 'garage', 'decision', 'casual', 'television', 'occasion', 'leisure'],
    howTo: 'Same tongue position as /ʃ/ — but voiced. Rare in English, and almost never at the start of a word.' },
  { symbol: 'h', category: 'consonant', examples: ['hat', 'house', 'ahead'], moreExamples: ['hello', 'home', 'behind', 'hope', 'happy', 'help', 'who', 'hand'],
    howTo: 'A light puff of breath from the throat, with no contact between tongue and mouth — voiceless.' },
  { symbol: 'tʃ', category: 'consonant', examples: ['chair', 'watch', 'teacher'], moreExamples: ['church', 'catch', 'cheese', 'kitchen', 'much', 'teach', 'match', 'question'],
    howTo: 'A /t/ released straight into /ʃ/ in one quick motion — voiceless, as in "church".' },
  { symbol: 'dʒ', category: 'consonant', examples: ['jump', 'bridge', 'danger'], moreExamples: ['judge', 'age', 'giant', 'gym', 'large', 'magic', 'enjoy', 'general'],
    howTo: 'A /d/ released straight into /ʒ/ in one quick motion — voiced, as in "judge".' },
  { symbol: 'm', category: 'consonant', examples: ['man', 'summer', 'drum'], moreExamples: ['mum', 'animal', 'moon', 'family', 'time', 'room'],
    howTo: 'Lips press together, air hums out through the nose — voiced.' },
  { symbol: 'n', category: 'consonant', examples: ['no', 'sun', 'dinner'], moreExamples: ['nine', 'banana', 'name', 'window', 'morning', 'run'],
    howTo: 'Tongue tip touches the ridge behind the teeth, air hums out through the nose — voiced.' },
  { symbol: 'ŋ', category: 'consonant', examples: ['sing', 'king', 'morning'], moreExamples: ['thing', 'long', 'singer', 'tongue', 'bank', 'think', 'young', 'english'],
    howTo: 'Back of the tongue touches the soft palate, air hums out through the nose — never appears at the start of an English word.' },
  { symbol: 'l', category: 'consonant', examples: ['leg', 'ball', 'yellow'], moreExamples: ['love', 'tell', 'apple', 'light', 'people', 'well'],
    howTo: 'Tongue tip touches the ridge behind the teeth, air flows around the sides of the tongue — voiced.' },
  { symbol: 'r', category: 'consonant', examples: ['red', 'carry', 'sorry'], moreExamples: ['run', 'very', 'road', 'right', 'green', 'story'],
    howTo: 'Tongue curls back slightly without touching the roof of the mouth — voiced, no trill in English.' },
  { symbol: 'j', category: 'consonant', examples: ['yes', 'yellow', 'use'], moreExamples: ['you', 'few', 'music', 'year', 'university', 'yesterday'],
    howTo: 'Tongue high and forward like /iː/, then glides quickly into the next vowel — voiced, as in "yes".' },
  { symbol: 'w', category: 'consonant', examples: ['wet', 'away', 'swim'], moreExamples: ['window', 'sweet', 'quick', 'one', 'work', 'west', 'always', 'twenty'],
    howTo: 'Lips round tightly like /uː/, then glide quickly into the next vowel — voiced, as in "wet".' },
];

export interface MinimalPair {
  a: { symbol: string; word: string };
  b: { symbol: string; word: string };
}

// Classic minimal pairs for the listening exercise — two words that differ
// by exactly the one sound being contrasted, so hearing them apart is a
// direct test of that contrast. Covers a mix of commonly-confused vowel and
// consonant pairs, not every symbol above.
export const MINIMAL_PAIRS: MinimalPair[] = [
  { a: { symbol: 'iː', word: 'sheep' }, b: { symbol: 'ɪ', word: 'ship' } },
  { a: { symbol: 'e', word: 'pen' }, b: { symbol: 'æ', word: 'pan' } },
  { a: { symbol: 'æ', word: 'cat' }, b: { symbol: 'ʌ', word: 'cut' } },
  { a: { symbol: 'ɒ', word: 'cot' }, b: { symbol: 'ɔː', word: 'caught' } },
  { a: { symbol: 'ʊ', word: 'full' }, b: { symbol: 'uː', word: 'fool' } },
  { a: { symbol: 'p', word: 'pat' }, b: { symbol: 'b', word: 'bat' } },
  { a: { symbol: 't', word: 'town' }, b: { symbol: 'd', word: 'down' } },
  { a: { symbol: 'k', word: 'coat' }, b: { symbol: 'g', word: 'goat' } },
  { a: { symbol: 'f', word: 'fan' }, b: { symbol: 'v', word: 'van' } },
  { a: { symbol: 'θ', word: 'teeth' }, b: { symbol: 'ð', word: 'teethe' } },
  { a: { symbol: 's', word: 'sip' }, b: { symbol: 'z', word: 'zip' } },
  { a: { symbol: 'ʃ', word: 'share' }, b: { symbol: 'tʃ', word: 'chair' } },
  { a: { symbol: 'l', word: 'light' }, b: { symbol: 'r', word: 'right' } },
  { a: { symbol: 'n', word: 'sin' }, b: { symbol: 'ŋ', word: 'sing' } },
  { a: { symbol: 'dʒ', word: 'jet' }, b: { symbol: 'j', word: 'yet' } },
  { a: { symbol: 'v', word: 'vest' }, b: { symbol: 'w', word: 'west' } },
];

/** Every pair that exercises a given symbol — feeds the detail page's
 *  "Practice this sound" link, which narrows Practice mode to just these. */
export function pairsForSymbol(symbol: string): MinimalPair[] {
  return MINIMAL_PAIRS.filter((p) => p.a.symbol === symbol || p.b.symbol === symbol);
}

// No curated video ID here — a wrong/dead link would be worse than a search.
// A YouTube search for the symbol reliably surfaces real pronunciation guides.
export function youtubeSearchUrl(symbol: string): string {
  const query = `how to pronounce IPA ${symbol} sound English`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
