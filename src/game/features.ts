// The world's skills — one keeper each, standing at the skill's home
// landmark. Walking up to a keeper opens a menu of the skill's activities,
// grouped the way a game would: Learn (battle the creeps — small rounds, one
// at a time), Practice (face the boss — test what you know) and Tools. Every
// app page is an activity of some skill, so the city stays one organised map
// rather than a building per page.
//
// Kept dependency-free (no React) like the rest of src/game/ so the Phaser
// scene can import it directly; the scene places the keepers (WorldFeature),
// the React shell renders the menus and the activities themselves — each
// activity a file of its own (src/components/worldgames/activities/).

export interface WorldFeature {
  /** Stable id; emitted through WORLD_EVENTS.near as `${FEATURE_ID_PREFIX}${id}`,
   *  and the map's keeper slot for it carries the same id. */
  id: string;
  /** Message id (world catalog) — formatted when drawn, so it follows the language. */
  nameId: string;
  /** react-router path of the skill's page in the app. */
  route: string;
  /** Message id for the one line shown on the keeper's card. */
  blurbId: string;
  /** Emoji drawn on the keeper's badge and in menus. */
  emoji: string;
  /** Iconify (Lucide) name, for app-side lists. */
  icon: string;
}

/** Learn: battle the creeps. Practice: face the boss. Tool: look things up. */
export type ActivityKind = 'learn' | 'practice' | 'tool';

export interface WorldActivity {
  /** Its file in src/components/worldgames/activities/ — and its screen. */
  id: string;
  kind: ActivityKind;
  nameId: string;
  blurbId: string;
  emoji: string;
  /** The landmark it belongs to — shown in menus so the map still means something. */
  place: string;
}

export interface WorldSkill extends WorldFeature {
  activities: WorldActivity[];
}

/** Namespace for keeper ids in the `near` payload. */
export const FEATURE_ID_PREFIX = 'feat:';

export const featureNodeId = (f: WorldFeature) => `${FEATURE_ID_PREFIX}${f.id}`;

/** The skills, in the order menus and the travel drawer list them. Their
 *  activities aren't listed here: each declares itself, with the skill it
 *  belongs to, in src/components/worldgames/activities/. */
export const SKILLS: WorldFeature[] = [
  { id: 'vocabulary', nameId: 'world.skillVocabulary', blurbId: 'world.skillVocabularyBlurb', route: '/', emoji: '📚', icon: 'lucide:sparkles' },
  { id: 'speaking', nameId: 'world.skillSpeaking', blurbId: 'world.skillSpeakingBlurb', route: '/speaking', emoji: '🎤', icon: 'lucide:mic' },
  { id: 'listening', nameId: 'world.skillListening', blurbId: 'world.skillListeningBlurb', route: '/listening', emoji: '🎧', icon: 'lucide:headphones' },
  { id: 'writing', nameId: 'world.skillWriting', blurbId: 'world.skillWritingBlurb', route: '/writing/improve', emoji: '🖌️', icon: 'lucide:pen-line' },
  { id: 'you', nameId: 'world.skillYou', blurbId: 'world.skillYouBlurb', route: '/companion', emoji: '🐾', icon: 'lucide:paw-print' },
];

/** The keeper of your collections and the levels: one person before Điện
 *  Thái Hòa whose menu lists them all — study one, preview, quiz, manage. */
export const COLLECTIONS_KEEPER: WorldFeature = {
  id: 'collections', nameId: 'world.collectionsKeeper', blurbId: 'world.collectionsKeeperBlurb',
  route: '/collections', emoji: '🗂️', icon: 'lucide:library',
};

/** The keepers the scene places — one per skill, and the collections'. */
export const WORLD_FEATURES: WorldFeature[] = [...SKILLS, COLLECTIONS_KEEPER];
