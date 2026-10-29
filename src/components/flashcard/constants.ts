// Values shared across the flash card's pieces. Kept out of the component
// files so those export components only — anything else in them disables fast
// refresh for the whole module.

/** Level chip colours, keyed by the word's level. */
export const LEVEL_COLOR: Record<string, string> = {
  beginner: 'text-accent-green bg-accent-green/10',
  intermediate: 'text-accent-orange bg-accent-orange/10',
  advanced: 'text-accent-red bg-accent-red/10',
};

/** Display label (message id) for each level; the level values themselves are data. */
export const LEVEL_LABEL_ID: Record<string, string> = {
  beginner: 'word.levelBeginner',
  intermediate: 'word.levelIntermediate',
  advanced: 'word.levelAdvanced',
};

/** Where the Short/Full definition preference is remembered. */
export const FULL_DEF_KEY = 'voca-flashcard-full-def';
