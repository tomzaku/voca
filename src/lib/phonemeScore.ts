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
  // Most Americans merge "cot" and "caught": "on" as /ɑːn/ is standard.
  'ɔ': ['ɔː', 'ɑ', 'ɑː', 'ɒ'],
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
 * Score each expected phone on the frames the alignment gave it. `lenient`
 * marks phones of weak words, which may reduce or drop — see scoreSentence.
 */
function scorePhones(f: Frames, vocab: Vocab, expected: string[], spans: [number, number][], lenient?: boolean[]): PhoneScore[] {
  const decoded = lineUp(expected, lenient, greedyDecode(f, vocab), vocab);
  return expected.map((ipa, i): PhoneScore => {
    const [a, b] = spans[i];
    const ids = acceptedIds(ipa, vocab, lenient?.[i]);
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
    let score = Math.round(100 * Math.exp(gop / 2));
    const top = [...rivals].sort((x, y) => y[1] - x[1])[0];
    let heard = score < GOOD && top ? (top[0] === BLANK ? '' : vocab.tokens[top[0]]) : null;
    const d = decoded[i];
    if (d.kind === 'swap') {
      // The decode heard another sound here outright: that outranks a score
      // the alignment propped up on some in-between frame.
      score = Math.min(score, SWAPPED_SCORE);
      heard = d.heard;
    } else if (heard === '' && (d.kind === 'match' || lenient?.[i])) {
      // Low only because silence crowded its frames, but either the decode
      // heard it (a soft final /ɹ/), or it's in a weak word that drops sounds
      // in normal speech ("and" as /ən/, "for" as /fɚ/) — not a mistake.
      score = Math.max(score, GOOD);
      heard = null;
    }
    return { ipa, score, status: score >= GOOD ? 'good' : score >= CLOSE ? 'close' : 'wrong', heard };
  });
}

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((n, x) => n + x, 0) / xs.length) : 0);

/**
 * Score a recording against one expected pronunciation.
 */
export function scoreWord(f: Frames, vocab: Vocab, expectedIpa: string): WordScore | null {
  const expected = tokenizeIpa(expectedIpa, vocab);
  if (!expected.length) return null;
  const spans = forcedAlign(f, expected.map((p) => vocab.ids.get(p)!));
  if (!spans) return null;
  const phones = scorePhones(f, vocab, expected, spans);
  return { score: mean(phones.map((p) => p.score)), phones, heard: greedyDecode(f, vocab).join('') };
}

export interface SentenceWord {
  /** The word as written in the sentence. */
  text: string;
  /** 0..100; 0 for a word with no sounds we can score (a stray symbol). */
  score: number;
  status: PhoneStatus;
  /** Left out altogether — most of its sounds weren't heard at all. */
  missing: boolean;
  phones: PhoneScore[];
}

export interface SentenceScore {
  /** 0..100 — the mean of the scored words' scores. */
  score: number;
  /** 0..100 — the share of words that were said at all. */
  completeness: number;
  words: SentenceWord[];
  heard: string;
}

/**
 * Words that are nearly always said weakly in a sentence — "to" as /tə/,
 * "and" as /ən/, "can" as /kən/. Their vowels may come out as any reduced
 * vowel without counting as a mistake; eSpeak gives some weak forms itself,
 * but not all, and a learner saying the strong form isn't wrong either.
 */
const WEAK = new Set([
  'a', 'an', 'the', 'to', 'of', 'and', 'or', 'but', 'for', 'from', 'at', 'as', 'than', 'that',
  'can', 'could', 'do', 'does', 'was', 'were', 'have', 'has', 'had', 'is', 'are', 'am', 'be', 'been',
  'will', 'would', 'shall', 'should', 'must', 'some', 'there', 'them', 'his', 'her', 'him', 'you', 'your',
  'we', 'us', 'our', 'he', 'she', 'me', 'my', 'by', 'into', 'on', 'in', 'with', 'just',
]);

/**
 * Score a sentence: every word's expected IPA, aligned as one sequence over
 * the whole recording, then grouped back into words. `words[i].ipa` is that
 * word's transcription (one accent); a word with none is kept for display
 * and scored 0.
 */
export function scoreSentence(f: Frames, vocab: Vocab, words: { text: string; ipa: string }[]): SentenceScore | null {
  const expected: string[] = [];
  const lenient: boolean[] = [];
  const owner: number[] = [];
  words.forEach((w, i) => {
    const weak = WEAK.has(w.text.toLowerCase().replace(/[^a-z']/g, ''));
    for (const p of tokenizeIpa(w.ipa, vocab)) {
      expected.push(p);
      lenient.push(weak);
      owner.push(i);
    }
  });
  if (!expected.length) return null;
  const spans = forcedAlign(f, expected.map((p) => vocab.ids.get(p)!));
  if (!spans) return null;
  const phones = scorePhones(f, vocab, expected, spans, lenient);

  const out: SentenceWord[] = words.map((w, i) => {
    const mine = phones.filter((_, k) => owner[k] === i);
    const score = mean(mine.map((p) => p.score));
    const dropped = mine.filter((p) => p.heard === '').length;
    return {
      text: w.text,
      score,
      status: score >= GOOD ? 'good' : score >= CLOSE ? 'close' : 'wrong',
      missing: mine.length > 0 && dropped / mine.length > 0.5,
      phones: mine,
    };
  });
  const scored = out.filter((w) => w.phones.length);
  return {
    score: mean(scored.map((w) => w.score)),
    completeness: Math.round((100 * scored.filter((w) => !w.missing).length) / Math.max(1, scored.length)),
    words: out,
    heard: greedyDecode(f, vocab).join(''),
  };
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

/** A phone the free decode heard in place of an expected one scores at most this. */
const SWAPPED_SCORE = 30;

/** Combos split into their parts, so the decode lines up phone for phone with the expected. */
const COMBO_PARTS: Record<string, string[]> = {
  'ɑːɹ': ['ɑː', 'ɹ'], 'ɔːɹ': ['ɔː', 'ɹ'], 'oːɹ': ['oː', 'ɹ'], 'ɪɹ': ['ɪ', 'ɹ'], 'ɛɹ': ['ɛ', 'ɹ'], 'ʊɹ': ['ʊ', 'ɹ'],
  'aɪɚ': ['aɪ', 'ɚ'], 'aɪə': ['aɪ', 'ə'], 'əl': ['ə', 'l'], 'iə': ['i', 'ə'], 'ɪə': ['ɪ', 'ə'],
};

/** What the free decode had at an expected phone's place. */
type Decoded = { kind: 'match' } | { kind: 'swap'; heard: string } | { kind: 'gap' };

// Edit costs: a substitution costs more than one gap but less than two, so a
// real swap stays a swap while an extra sound next to a right one ("vænd"
// for "fæn f…") isn't explained as a chain of swaps.
const SWAP_COST = 3;
const GAP_COST = 2;
/** A vowel heard as a consonant (or back) is no near miss — dearer than two gaps. */
const CROSS_SWAP_COST = 5;
const isVowel = (p: string) => /^[aeiouyɪɛæʌʊəɐᵻɑɒɔɜɚ]/.test(p);
const swapCost = (a: string, b: string) => (isVowel(a) === isVowel(b) ? SWAP_COST : CROSS_SWAP_COST);

/**
 * The free decode lined up against the expected phones.
 *
 * Forced alignment alone can be fooled over a long clip: it is free to put
 * /l/ on a transition frame where /l/ only narrowly loses to the /ɹ/ that was
 * really said, which still scores high — while the decode, with nothing to
 * steer it, plainly says /ɹ/. So the two sequences are lined up by edit
 * distance (a variant counts as a match): a swap there is evidence of a wrong
 * sound, and a match is evidence it was said. A gap is neither — the decode
 * merges a doubled sound across words ("some more").
 */
function lineUp(expected: string[], lenient: boolean[] | undefined, decoded: string[], vocab: Vocab): Decoded[] {
  const dec = decoded.flatMap((d) => COMBO_PARTS[d] ?? [d]);
  const n = expected.length, m = dec.length, W = m + 1;
  const ok = expected.map((e, i) => new Set(acceptedIds(e, vocab, lenient?.[i]).map((id) => vocab.tokens[id])));
  const cost = new Uint32Array((n + 1) * W);
  for (let i = 0; i <= n; i++) cost[i * W] = i * GAP_COST;
  for (let j = 0; j <= m; j++) cost[j] = j * GAP_COST;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = cost[(i - 1) * W + j - 1] + (ok[i - 1].has(dec[j - 1]) ? 0 : swapCost(expected[i - 1], dec[j - 1]));
      cost[i * W + j] = Math.min(diag, cost[(i - 1) * W + j] + GAP_COST, cost[i * W + j - 1] + GAP_COST);
    }
  }
  const out: Decoded[] = expected.map(() => ({ kind: 'gap' }));
  let i = n, j = m;
  while (i > 0 && j > 0) {
    const here = cost[i * W + j];
    const match = ok[i - 1].has(dec[j - 1]);
    if (here === cost[(i - 1) * W + j - 1] + (match ? 0 : swapCost(expected[i - 1], dec[j - 1]))) {
      out[i - 1] = match ? { kind: 'match' } : { kind: 'swap', heard: dec[j - 1] };
      i--; j--;
    } else if (here === cost[(i - 1) * W + j] + GAP_COST) i--;
    else j--;
  }
  return out;
}

/**
 * Ids that count as saying `ipa`: itself, its accent variants, and combos
 * containing it — plus, for a weak-form vowel, any reduced vowel.
 */
function acceptedIds(ipa: string, vocab: Vocab, weak = false): number[] {
  const ok = [ipa, ...(ALSO_OK[ipa] ?? []), ...COMBOS.filter((c) => c.startsWith(ipa) || c.endsWith(ipa))];
  if (weak && isVowel(ipa)) ok.push('ə', 'ɐ', 'ᵻ', 'ɪ', 'ʊ', 'ʌ', 'ɚ', 'ɜː');
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

