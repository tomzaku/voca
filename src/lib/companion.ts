// The learning companion: a creature the user picks that grows as their
// vocabulary does. Growth (stage + unlocked skills) is DERIVED from how many
// words they've marked "known" — so it can't be gamed and needs no extra
// storage beyond the chosen animal + its name (see useCompanion).

export type AnimalId = 'fox' | 'owl' | 'cat' | 'turtle';

export interface Skill {
  name: string;
  /** A short preview of the trick — shown for locked skills too, as a teaser. */
  desc: string;
  icon: string;
}

export interface AnimalInfo {
  id: AnimalId;
  name: string;
  emoji: string;
  tagline: string;
  perkTitle: string;
  perkDesc: string;
  colors: { primary: string; secondary: string; belly: string };
  /** Five tricks, unlocked in order at SKILL_THRESHOLDS words known. */
  skills: Skill[];
}

export const ANIMALS: AnimalInfo[] = [
  {
    id: 'fox', name: 'Fox', emoji: '🦊', tagline: 'Clever & quick',
    perkTitle: 'Cunning', perkDesc: '+25% points on every win',
    colors: { primary: '#ff9f43', secondary: '#ee7d0f', belly: '#fff3e6' },
    skills: [
      { name: 'Pounce', icon: '🎯', desc: 'Leaps on new words the moment they appear.' },
      { name: 'Dig', icon: '⛏️', desc: 'Unearths the trickiest definitions with ease.' },
      { name: 'Dash', icon: '💨', desc: 'Answers in a flash to chase streak bonuses.' },
      { name: 'Trickster', icon: '🎭', desc: 'Sniffs out the sneakiest wrong choices.' },
      { name: 'Nine Tails', icon: '🔥', desc: 'A legend of the vocabulary forest.' },
    ],
  },
  {
    id: 'owl', name: 'Owl', emoji: '🦉', tagline: 'Wise & patient',
    perkTitle: 'Wisdom', perkDesc: 'Double streak-combo bonus',
    colors: { primary: '#b98bff', secondary: '#8b5cf6', belly: '#efe7ff' },
    skills: [
      { name: 'Hoot', icon: '🌙', desc: 'Calls out the right answer with confidence.' },
      { name: 'Night Sight', icon: '👁️', desc: 'Sees meaning even in the murkiest words.' },
      { name: 'Silent Wing', icon: '🪶', desc: 'Glides through quizzes without a slip.' },
      { name: 'Scholar', icon: '📚', desc: 'Remembers every word it has ever met.' },
      { name: 'Sage', icon: '🧙', desc: 'Wisdom of a thousand words learned.' },
    ],
  },
  {
    id: 'cat', name: 'Cat', emoji: '🐱', tagline: 'Curious & bold',
    perkTitle: 'Curiosity', perkDesc: '+5 bonus points per win',
    colors: { primary: '#94a3b8', secondary: '#64748b', belly: '#f1f5f9' },
    skills: [
      { name: 'Pounce', icon: '🐾', desc: 'Snatches up new words in an instant.' },
      { name: 'Whiskers', icon: '🐈', desc: 'Senses a meaning before you finish reading.' },
      { name: 'Climb', icon: '🧗', desc: 'Scales harder word packs with ease.' },
      { name: 'Prowl', icon: '🌘', desc: 'Hunts down every tempting distractor.' },
      { name: 'Nine Lives', icon: '✨', desc: 'Bounces back from any wrong guess.' },
    ],
  },
  {
    id: 'turtle', name: 'Turtle', emoji: '🐢', tagline: 'Steady & tough',
    perkTitle: 'Resilience', perkDesc: "A miss won't reset your streak (once a day)",
    colors: { primary: '#34e39b', secondary: '#10b981', belly: '#e6fbf1' },
    skills: [
      { name: 'Tuck', icon: '🛡️', desc: 'Shrugs off a wrong answer without a scratch.' },
      { name: 'Shell Up', icon: '🐚', desc: 'Guards your streak from a single slip.' },
      { name: 'Steady', icon: '🐢', desc: 'Slow and sure wins the vocabulary race.' },
      { name: 'Ancient', icon: '🗿', desc: 'Centuries of accumulated wordcraft.' },
      { name: 'Worldturtle', icon: '🌍', desc: 'Carries a whole language on its back.' },
    ],
  },
];

export function getAnimal(id: AnimalId): AnimalInfo {
  return ANIMALS.find((a) => a.id === id) ?? ANIMALS[0];
}

export function isAnimalId(v: unknown): v is AnimalId {
  return typeof v === 'string' && ANIMALS.some((a) => a.id === v);
}

// ─── Growth ─────────────────────────────────────────────────────────

export interface Stage {
  name: string;
  min: number; // words known to reach this stage
}

export const STAGES: Stage[] = [
  { name: 'Baby', min: 0 },
  { name: 'Young', min: 25 },
  { name: 'Grown', min: 75 },
  { name: 'Expert', min: 150 },
  { name: 'Master', min: 300 },
];

/** Words-known thresholds at which each of the five skills unlocks. */
export const SKILL_THRESHOLDS = [10, 40, 100, 200, 350];

export function stageIndex(known: number): number {
  let idx = 0;
  STAGES.forEach((s, i) => { if (known >= s.min) idx = i; });
  return idx;
}

export function nextStage(known: number): Stage | null {
  return STAGES[stageIndex(known) + 1] ?? null;
}

export function unlockedSkills(known: number): number {
  return SKILL_THRESHOLDS.filter((t) => known >= t).length;
}

// ─── Perks (applied by the game score store) ────────────────────────

/** Points a win awards, given the current streak and chosen companion perk. */
export function computeGain(streak: number, animalId: AnimalId | null): number {
  const combo = Math.min(streak, 10);
  if (animalId === 'owl') return 10 + combo * 4;   // Wisdom: double the combo bonus
  let gain = 10 + combo * 2;
  if (animalId === 'fox') gain = Math.round(gain * 1.25); // Cunning
  if (animalId === 'cat') gain += 5;                       // Curiosity
  return gain;
}
