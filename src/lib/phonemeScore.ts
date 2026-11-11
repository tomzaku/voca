// Scoring how well each sound of a word was said, from a phoneme recogniser's
// output — pure math, no model, so it runs (and is tested) anywhere.
//
// The recogniser (wav2vec2-lv-60-espeak-cv-ft, see pronunciation.ts) gives,
// for every ~20ms frame of audio, a log-probability for each of its ~390 eSpeak
// IPA phones plus a CTC "blank". Two things are read from that:
//
// - **What was heard**: the greedy decode — best phone per frame, repeats and
//   blanks collapsed. Shown as "we heard /sɪŋk/".
// - **How well each expected phone was said**: a CTC forced alignment pins
//   every phone of the expected IPA to the frames where it was most plausibly
//   said, and its score there is how its probability compares with the best
//   competing phone's — "goodness of pronunciation" (GOP). Asking about the
//   expected phone, rather than diffing two transcripts, is what makes this a
//   measurement: the recogniser isn't asked to guess the word, only how much
//   each frame sounds like the sound that should be there.
//
// Accents aren't errors: a phone also counts as said if a close variant was
// (ALSO_OK), and the caller scores against both the US and UK IPA and keeps
// the better one.

export type PhoneStatus = 'good' | 'close' | 'wrong';

export interface PhoneScore {
  /** The expected phone, as an IPA token. */
  ipa: string;
  /** 0..100. */
  score: number;
  status: PhoneStatus;
  /**
   * What was said there instead, when it wasn't this phone: another phone,
   * or '' when it was left out entirely. Null when it was said right.
   */
  heard: string | null;
}

export interface WordScore {
  /** 0..100 — the mean of the phone scores. */
  score: number;
  phones: PhoneScore[];
  /** The whole recording as the recogniser heard it, e.g. "sɪŋk". */
  heard: string;
}

/** Recogniser output: `T` frames × `V` tokens of log-probabilities, row-major. */
export interface Frames {
  logp: Float32Array;
  T: number;
  V: number;
}

export const GOOD = 70;
const BLANK = 0;
export const CLOSE = 40;

/**
 * The phones English is written in by eSpeak (the model's training labels).
 * The model also knows Mandarin tones, Polish retroflexes and so on, and on a
 * short clip those win often enough to be noise — "ship" heard as Mandarin
 * /s./ — so decoding and the rival check only look at these.
 *
 * The r-coloured and diphthong-plus-schwa tokens (ɑːɹ, ɪə…) are listed as
 * COMBOS: the model emits them as often as their parts, so an expected phone
 * also counts as said when a combo containing it was.
 */
const ENGLISH = [
  'p', 'b', 't', 'd', 'k', 'ɡ', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h', 'm', 'n', 'ŋ', 'l', 'ɹ', 'w', 'j',
  'tʃ', 'dʒ', 'ɾ', 'ʔ', 'n̩', 'l̩',
  'ɪ', 'ɛ', 'æ', 'ʌ', 'ʊ', 'ə', 'ɐ', 'ᵻ', 'i', 'iː', 'u', 'uː', 'ɑ', 'ɑː', 'ɒ', 'ɔ', 'ɔː', 'ɜ', 'ɜː', 'ɚ',
  'aɪ', 'eɪ', 'oʊ', 'əʊ', 'aʊ', 'ɔɪ', 'eə', 'ʊə', 'e', 'o', 'a',
];
const COMBOS = ['ɑːɹ', 'ɔːɹ', 'oːɹ', 'ɪɹ', 'ɛɹ', 'ʊɹ', 'aɪɚ', 'aɪə', 'əl', 'iə', 'ɪə'];

/**
 * Accent and reduction variants a listener wouldn't call a mistake, per
 * expected phone. Deliberately one-way and not transitive: /ɪ/ may come out as
 * /i/ ("think" said /θiŋk/ is normal American), but /ɪ/ as /iː/ is ship →
 * sheep, the error this exists to catch.
 */
const ALSO_OK: Record<string, string[]> = {
  'ɪ': ['i', 'ᵻ'],
  'ᵻ': ['ɪ', 'ə', 'ɐ', 'i'],
  'ə': ['ɐ', 'ᵻ', 'ɪ', 'ʌ'],
  'ɐ': ['ə', 'ʌ'],
  'ʌ': ['ɐ', 'ə'],
  'i': ['iː', 'ɪ'],
  'iː': ['i'],
  'u': ['uː', 'ʊ'],
  'uː': ['u'],
  'ɑː': ['ɑ', 'ɒ', 'a'],
  'ɑ': ['ɑː', 'ɒ', 'a'],
  'ɒ': ['ɑː', 'ɑ', 'ɔ'],
  'ɔː': ['ɔ', 'ɒ', 'ɑː'],
  'ɜː': ['ɜ', 'ɚ'],
  'ɚ': ['ɜː', 'ə', 'ɜ'],
  'oʊ': ['əʊ', 'o'],
  'əʊ': ['oʊ', 'o'],
  'eɪ': ['e'],
  'eə': ['ɛ', 'e'],
  'ɪə': ['ɪ'],
  'ʊə': ['ʊ', 'ɔː'],
  // American /t/ is flapped ("water") or unreleased at the end ("light"),
  // which the model hears as /d/.
  't': ['ɾ', 'ʔ', 'd'],
  'd': ['ɾ'],
  'ɾ': ['t', 'd'],
  'ɹ': ['ɚ'],
  'l': ['l̩'],
  'n': ['n̩'],
};

/** The model's vocabulary, with the subsets scoring needs, built once per model. */
export interface Vocab {
  /** Token by id. */
  tokens: string[];
  /** Id by token. */
  ids: Map<string, number>;
  /** Ids decoding and the rival check may pick: English phones and combos. */
  english: number[];
}

export function makeVocab(byToken: Record<string, number>): Vocab {
  const tokens: string[] = [];
  for (const [tok, id] of Object.entries(byToken)) tokens[id] = tok;
  const ids = new Map(Object.entries(byToken));
  const english = [...ENGLISH, ...COMBOS].map((t) => ids.get(t)).filter((id): id is number => id !== undefined);
  return { tokens, ids, english };
}

/**
 * The expected IPA as recogniser tokens: stress, syllable marks and slashes
 * stripped, then longest match against the vocabulary — the same way the
 * model's own eSpeak training labels were cut up, so "aɪ" is one token, not two.
 * Only English phones, never COMBOS — those are matched at scoring time.
 * Characters the vocabulary doesn't know are dropped.
 */
export function tokenizeIpa(ipa: string, vocab: Vocab): string[] {
  const s = ipa.replace(/[/[\]ˈˌ.\s‿-]/g, '').replace(/ː+/g, 'ː').replace(/ɝ/g, 'ɜː');
  const maxLen = 3;
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    let tok = '';
    for (let n = Math.min(maxLen, s.length - i); n > 0; n--) {
      const cand = s.slice(i, i + n);
      if (SINGLES.has(cand) && vocab.ids.has(cand)) { tok = cand; break; }
    }
    if (tok) { out.push(tok); i += tok.length; } else i++;
  }
  return out;
}

/** Best token per frame, repeats merged, blanks and specials dropped. */
export function greedyDecode(f: Frames, vocab: Vocab, blank = 0): string[] {
  const out: string[] = [];
  const pick = [blank, ...vocab.english];
  let prev = -1;
  for (let t = 0; t < f.T; t++) {
    const row = t * f.V;
    let k = blank;
    for (const id of pick) if (f.logp[row + id] > f.logp[row + k]) k = id;
    if (k !== prev && k !== blank) out.push(vocab.tokens[k]);
    prev = k;
  }
  return out;
}

/**
 * CTC Viterbi forced alignment: for each target token, the frames it occupies
 * on the most likely path that spells exactly `target` (blanks allowed between
 * and around). Null when the audio is too short to fit the target at all.
 */
export function forcedAlign(f: Frames, target: number[], blank = 0): [number, number][] | null {
  const { logp, T, V } = f;
  const S = 2 * target.length + 1; // blank, t0, blank, t1, …, blank
  const label = (s: number) => (s % 2 === 0 ? blank : target[(s - 1) >> 1]);
  if (T < target.length) return null;

  const NEG = -Infinity;
  const dp = new Float64Array(T * S).fill(NEG);
  const back = new Int8Array(T * S); // how far back s came from: 0, 1 or 2
  dp[0] = logp[blank];
  if (S > 1) dp[1] = logp[label(1)];
  for (let t = 1; t < T; t++) {
    for (let s = 0; s < S; s++) {
      let best = dp[(t - 1) * S + s], from = 0;
      if (s > 0 && dp[(t - 1) * S + s - 1] > best) { best = dp[(t - 1) * S + s - 1]; from = 1; }
      // Skip a blank only between two different tokens — CTC's rule.
      if (s > 1 && s % 2 === 1 && label(s) !== label(s - 2) && dp[(t - 1) * S + s - 2] > best) {
        best = dp[(t - 1) * S + s - 2]; from = 2;
      }
      if (best === NEG) continue;
      dp[t * S + s] = best + logp[t * V + label(s)];
      back[t * S + s] = from;
    }
  }

  let s = S === 1 || dp[(T - 1) * S + S - 1] >= dp[(T - 1) * S + S - 2] ? S - 1 : S - 2;
  if (dp[(T - 1) * S + s] === NEG) return null;
  const spans: [number, number][] = target.map(() => [Infinity, -Infinity]);
  for (let t = T - 1; t >= 0; t--) {
    if (s % 2 === 1) {
      const span = spans[(s - 1) >> 1];
      span[0] = Math.min(span[0], t);
      span[1] = Math.max(span[1], t);
    }
    s -= back[t * S + s];
  }
  return spans;
}

/**
 * Score a recording against one expected pronunciation.
 */
export function scoreWord(f: Frames, vocab: Vocab, expectedIpa: string): WordScore | null {
  const expected = tokenizeIpa(expectedIpa, vocab);
  if (!expected.length) return null;
  const heard = greedyDecode(f, vocab).join('');
  const spans = forcedAlign(f, expected.map((p) => vocab.ids.get(p)!));
  if (!spans) return null;

  const phones = expected.map((ipa, i): PhoneScore => {
    const [a, b] = spans[i];
    const ids = acceptedIds(ipa, vocab);
    let sum = 0;
    const rivals = new Map<number, number>();
    for (let t = a; t <= b; t++) {
      const row = t * f.V;
      const own = logSumExp(f.logp, row, ids);
      // The best phone that isn't this one (or a variant of it) — or
      // silence: a phone the alignment had to put on a blank frame wasn't
      // said at all, the dropped final consonant being the classic case.
      let rival = f.logp[row + BLANK], rivalId = BLANK;
      for (const k of vocab.english) {
        if (ids.includes(k)) continue;
        if (f.logp[row + k] > rival) { rival = f.logp[row + k]; rivalId = k; }
      }
      sum += Math.min(0, own - rival);
      if (rival > own) rivals.set(rivalId, (rivals.get(rivalId) ?? 0) + 1);
    }
    const gop = sum / (b - a + 1); // ≤ 0: how far below its best rival, on average
    const score = Math.round(100 * Math.exp(gop / 2));
    const top = [...rivals].sort((x, y) => y[1] - x[1])[0];
    return {
      ipa,
      score,
      status: score >= GOOD ? 'good' : score >= CLOSE ? 'close' : 'wrong',
      heard: score < GOOD && top ? (top[0] === BLANK ? '' : vocab.tokens[top[0]]) : null,
    };
  });

  const score = Math.round(phones.reduce((n, p) => n + p.score, 0) / phones.length);
  return { score, phones, heard };
}

/** Score against each accent's IPA and keep the best — an accent isn't an error. */
export function scoreBest(f: Frames, vocab: Vocab, ipas: string[]): (WordScore & { ipa: string }) | null {
  let best: (WordScore & { ipa: string }) | null = null;
  for (const ipa of new Set(ipas.filter(Boolean))) {
    const r = scoreWord(f, vocab, ipa);
    if (r && (!best || r.score > best.score)) best = { ...r, ipa };
  }
  return best;
}

/** Turn raw logits into log-probabilities per frame, in place. */
export function logSoftmax(f: Frames): Frames {
  const { logp, T, V } = f;
  for (let t = 0; t < T; t++) {
    const row = t * V;
    let max = -Infinity;
    for (let k = 0; k < V; k++) max = Math.max(max, logp[row + k]);
    let sum = 0;
    for (let k = 0; k < V; k++) sum += Math.exp(logp[row + k] - max);
    const lse = max + Math.log(sum);
    for (let k = 0; k < V; k++) logp[row + k] -= lse;
  }
  return f;
}

/** Ids that count as saying `ipa`: itself, its accent variants, and combos containing it. */
function acceptedIds(ipa: string, vocab: Vocab): number[] {
  const ok = [ipa, ...(ALSO_OK[ipa] ?? []), ...COMBOS.filter((c) => c.startsWith(ipa) || c.endsWith(ipa))];
  return [...new Set(ok)].map((p) => vocab.ids.get(p)).filter((id): id is number => id !== undefined);
}

const SINGLES = new Set(ENGLISH);

function logSumExp(a: Float32Array, row: number, ids: number[]): number {
  let max = -Infinity;
  for (const k of ids) max = Math.max(max, a[row + k]);
  if (max === -Infinity) return max;
  let sum = 0;
  for (const k of ids) sum += Math.exp(a[row + k] - max);
  return max + Math.log(sum);
}

