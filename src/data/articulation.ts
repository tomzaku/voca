// Mouth positions for the IPA page's animated diagram — one side-view pose
// (jaw, lips, tongue, soft palate) per sound in `IPA_SOUNDS`, in the
// diagram's own SVG coordinates (viewBox 0 0 200 170, facing left: lips near
// x≈40, the throat near x≈155). Diphthongs and affricates carry two poses
// and the diagram glides between them, which is the whole point of showing
// those sounds moving rather than as a still.

export interface MouthPose {
  /** 0 closed … 1 wide open. */
  jaw: number;
  /** 0 spread … 1 tightly rounded and pushed forward. */
  round: number;
  /** 1 = lips pressed together (/p b m/). */
  close: number;
  /** 1 = lower lip tucked up against the top teeth (/f v/). */
  labio: number;
  /** Tongue body (the hump) and tip. */
  bx: number;
  by: number;
  tx: number;
  ty: number;
  /** 0 raised (air out of the mouth) … 1 lowered (air out of the nose). */
  velum: number;
}

export interface Articulation {
  poses: MouthPose[];
  voiced: boolean;
  /** Air escapes through the nose. */
  nasal: boolean;
  /** A hissing stream of air through a narrow gap — drawn at the lips. */
  airflow: boolean;
  /** Short tags under the diagram: "Tongue high · front", "Lips rounded". */
  tags: string[];
}

/** Mouth at rest — where every animation starts and ends. */
export const REST_POSE: MouthPose = { jaw: 0.12, round: 0, close: 0, labio: 0, bx: 108, by: 82, tx: 58, ty: 86, velum: 0 };

/** A vowel from the classic chart axes: `front` 0 back … 1 front, `height`
 *  0 low (open) … 1 high (close), `round` lip rounding. The tip rests behind
 *  the lower teeth and the jaw opens as the tongue drops. */
function vowel(front: number, height: number, round = 0): MouthPose {
  const jaw = 0.12 + (1 - height) * 0.78;
  return {
    jaw,
    round,
    close: 0,
    labio: 0,
    bx: 124 - front * 38,
    by: 62 + (1 - height) * 30,
    tx: 58,
    ty: 84 + jaw * 10,
    velum: 0,
  };
}

function vowelTags(front: number, height: number, round: number): string[] {
  const h = height >= 0.7 ? 'high' : height >= 0.4 ? 'mid' : 'low';
  const f = front >= 0.7 ? 'front' : front >= 0.35 ? 'central' : 'back';
  return [`Tongue ${h} · ${f}`, round >= 0.5 ? 'Lips rounded' : 'Lips relaxed'];
}

const V: Record<string, [number, number, number]> = {
  ɪ: [0.8, 0.8, 0],
  e: [0.85, 0.55, 0],
  æ: [0.8, 0.15, 0],
  ʌ: [0.45, 0.3, 0],
  ɒ: [0.1, 0.08, 0.6],
  ʊ: [0.2, 0.8, 0.6],
  ə: [0.5, 0.5, 0],
  iː: [1, 1, 0],
  ɜː: [0.5, 0.48, 0],
  ɑː: [0.05, 0, 0],
  ɔː: [0.1, 0.45, 0.8],
  uː: [0.05, 1, 1],
  a: [0.6, 0, 0],
};

const DIPHTHONGS: Record<string, [string, string]> = {
  eɪ: ['e', 'ɪ'],
  aɪ: ['a', 'ɪ'],
  ɔɪ: ['ɔː', 'ɪ'],
  aʊ: ['a', 'ʊ'],
  əʊ: ['ə', 'ʊ'],
  ɪə: ['ɪ', 'ə'],
  eə: ['e', 'ə'],
  ʊə: ['ʊ', 'ə'],
};

// Consonant places, as tongue/lip targets. The tongue body sits roughly
// neutral unless the place is made with it (palatal, velar).
const P = {
  bilabial: { ...REST_POSE, jaw: 0.04, close: 1 },
  labiodental: { ...REST_POSE, jaw: 0.08, labio: 1 },
  dental: { ...REST_POSE, jaw: 0.22, tx: 48, ty: 73, bx: 96, by: 78 },
  alveolar: { ...REST_POSE, jaw: 0.1, tx: 63, ty: 61, bx: 100, by: 72 },
  sibilant: { ...REST_POSE, jaw: 0.08, tx: 62, ty: 64, bx: 98, by: 70 },
  postalveolar: { ...REST_POSE, jaw: 0.1, round: 0.5, tx: 69, ty: 62, bx: 96, by: 64 },
  affricateStop: { ...REST_POSE, jaw: 0.1, round: 0.5, tx: 67, ty: 59, bx: 96, by: 64 },
  retroflex: { ...REST_POSE, jaw: 0.16, round: 0.4, tx: 75, ty: 63, bx: 106, by: 74 },
  palatal: { ...REST_POSE, jaw: 0.1, tx: 58, ty: 82, bx: 88, by: 58 },
  velar: { ...REST_POSE, jaw: 0.14, tx: 58, ty: 85, bx: 136, by: 55 },
  glottal: { ...REST_POSE, jaw: 0.38 },
  labiovelar: { ...REST_POSE, jaw: 0.1, round: 1, bx: 128, by: 62 },
} satisfies Record<string, MouthPose>;

type C = [poses: MouthPose[], voiced: boolean, tags: string[], extra?: { nasal?: boolean; airflow?: boolean }];

const CONSONANTS: Record<string, C> = {
  p: [[P.bilabial], false, ['Both lips', 'Stop']],
  b: [[P.bilabial], true, ['Both lips', 'Stop']],
  m: [[P.bilabial], true, ['Both lips', 'Nasal'], { nasal: true }],
  f: [[P.labiodental], false, ['Lip + top teeth', 'Hiss'], { airflow: true }],
  v: [[P.labiodental], true, ['Lip + top teeth', 'Buzz'], { airflow: true }],
  θ: [[P.dental], false, ['Tongue between teeth', 'Hiss'], { airflow: true }],
  ð: [[P.dental], true, ['Tongue between teeth', 'Buzz'], { airflow: true }],
  t: [[P.alveolar], false, ['Tip on gum ridge', 'Stop']],
  d: [[P.alveolar], true, ['Tip on gum ridge', 'Stop']],
  n: [[P.alveolar], true, ['Tip on gum ridge', 'Nasal'], { nasal: true }],
  l: [[P.alveolar], true, ['Tip on gum ridge', 'Air round the sides']],
  s: [[P.sibilant], false, ['Tip near gum ridge', 'Hiss'], { airflow: true }],
  z: [[P.sibilant], true, ['Tip near gum ridge', 'Buzz'], { airflow: true }],
  ʃ: [[P.postalveolar], false, ['Tongue behind gum ridge', 'Lips forward'], { airflow: true }],
  ʒ: [[P.postalveolar], true, ['Tongue behind gum ridge', 'Lips forward'], { airflow: true }],
  tʃ: [[P.affricateStop, P.postalveolar], false, ['Stop, then hiss', 'Lips forward'], { airflow: true }],
  dʒ: [[P.affricateStop, P.postalveolar], true, ['Stop, then buzz', 'Lips forward'], { airflow: true }],
  r: [[P.retroflex], true, ['Tip curled back', 'No contact']],
  j: [[P.palatal], true, ['Tongue up to hard palate']],
  k: [[P.velar], false, ['Back of tongue up', 'Stop']],
  g: [[P.velar], true, ['Back of tongue up', 'Stop']],
  ŋ: [[P.velar], true, ['Back of tongue up', 'Nasal'], { nasal: true }],
  h: [[P.glottal], false, ['Open mouth', 'Breath from throat'], { airflow: true }],
  w: [[P.labiovelar], true, ['Lips rounded', 'Back of tongue up']],
};

const NASAL_VELUM = 1;

/** The diagram's script for one sound, or null for a symbol it doesn't know. */
export function articulationFor(symbol: string): Articulation | null {
  const v = V[symbol];
  if (v && symbol !== 'a') {
    return { poses: [vowel(...v)], voiced: true, nasal: false, airflow: false, tags: vowelTags(...v) };
  }
  const d = DIPHTHONGS[symbol];
  if (d) {
    const [from, to] = d.map((s) => V[s]);
    return {
      poses: [vowel(...from), vowel(...to)],
      voiced: true,
      nasal: false,
      airflow: false,
      tags: ['Glides between two vowels', from[2] >= 0.5 || to[2] >= 0.5 ? 'Lips change shape' : 'Lips relaxed'],
    };
  }
  const c = CONSONANTS[symbol];
  if (c) {
    const [poses, voiced, tags, extra] = c;
    const nasal = !!extra?.nasal;
    return {
      poses: nasal ? poses.map((p) => ({ ...p, velum: NASAL_VELUM })) : poses,
      voiced,
      nasal,
      airflow: !!extra?.airflow,
      tags: [...tags, voiced ? 'Voiced' : 'Voiceless'],
    };
  }
  return null;
}
