// The app's features, surfaced as buildings you walk up to in the world game.
// Kept dependency-free (no React) like the rest of src/game/ so the Phaser
// scene can import it directly. The React shell turns `route` into navigation.

export interface WorldFeature {
  /** Stable id; emitted through WORLD_EVENTS.near as `${FEATURE_ID_PREFIX}${id}`. */
  id: string;
  name: string;
  /** react-router path this building opens (see App.tsx routes). */
  route: string;
  /** One line shown on the building's card. */
  blurb: string;
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
  { id: 'learn',      name: 'Learn',      route: '/',           emoji: '📚', icon: 'lucide:sparkles', blurb: 'Flip cards and play guess games' },
  { id: 'speak',      name: 'Speak',      route: '/speaking',   emoji: '🎤', icon: 'lucide:mic',      blurb: 'Practice speaking out loud' },
  { id: 'quizzes',    name: 'Quizzes',    route: '/quizzes',    emoji: '📝', icon: 'lucide:file-pen', blurb: 'Take and manage your quizzes' },
  { id: 'level-test', name: 'Level Test', route: '/level-test', emoji: '🎯', icon: 'lucide:target',   blurb: 'Find your vocabulary level' },
  { id: 'history',    name: 'History',    route: '/history',    emoji: '📜', icon: 'lucide:history',   blurb: 'Revisit the words you have seen' },
  { id: 'buddy',      name: 'Buddy',      route: '/companion',  emoji: '🐾', icon: 'lucide:paw-print', blurb: 'Care for your companion' },
];
