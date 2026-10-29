// The app's features, surfaced as buildings you walk up to in the world game.
// Kept dependency-free (no React) like the rest of src/game/ so the Phaser
// scene can import it directly. The React shell turns `route` into navigation.

export interface WorldFeature {
  /** Stable id; emitted through WORLD_EVENTS.near as `${FEATURE_ID_PREFIX}${id}`. */
  id: string;
  /** Message id (world catalog) — formatted when drawn, so it follows the language. */
  nameId: string;
  /** react-router path this building opens (see App.tsx routes). */
  route: string;
  /** Message id for the one line shown on the building's card. */
  blurbId: string;
  /** Emoji drawn on the building marker + name pill. */
  emoji: string;
  /** Iconify (Lucide) name for the DOM card and fast-travel list. */
  icon: string;
}

/** Namespace for feature ids so React can tell them apart from collection ids
 *  and CREATE_STATION_ID in the `near` payload. */
export const FEATURE_ID_PREFIX = 'feat:';

export const featureNodeId = (f: WorldFeature) => `${FEATURE_ID_PREFIX}${f.id}`;

/** The buildings placed in the world, in a sensible walk order. */
export const WORLD_FEATURES: WorldFeature[] = [
  { id: 'learn',      nameId: 'world.featureLearn',      route: '/',           emoji: '📚', icon: 'lucide:sparkles', blurbId: 'world.featureLearnBlurb' },
  { id: 'speak',      nameId: 'world.featureSpeak',      route: '/speaking',   emoji: '🎤', icon: 'lucide:mic',      blurbId: 'world.featureSpeakBlurb' },
  { id: 'quizzes',    nameId: 'world.featureQuizzes',    route: '/quizzes',    emoji: '📝', icon: 'lucide:file-pen', blurbId: 'world.featureQuizzesBlurb' },
  { id: 'level-test', nameId: 'world.featureLevelTest', route: '/level-test', emoji: '🎯', icon: 'lucide:target',   blurbId: 'world.featureLevelTestBlurb' },
  { id: 'history',    nameId: 'world.featureHistory',    route: '/history',    emoji: '📜', icon: 'lucide:history',   blurbId: 'world.featureHistoryBlurb' },
  { id: 'buddy',      nameId: 'world.featureBuddy',      route: '/companion',  emoji: '🐾', icon: 'lucide:paw-print', blurbId: 'world.featureBuddyBlurb' },
  { id: 'review',     nameId: 'world.featureReview',     route: '/review',     emoji: '🪷', icon: 'lucide:repeat',     blurbId: 'world.featureReviewBlurb' },
  { id: 'listening',  nameId: 'world.featureListening',  route: '/listening',  emoji: '🎧', icon: 'lucide:headphones', blurbId: 'world.featureListeningBlurb' },
];
