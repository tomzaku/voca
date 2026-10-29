// The learning companion: a creature the user picks that grows as their
// vocabulary does. Growth (stage + unlocked skills) is DERIVED from how many
// words they've marked "known" — so it can't be gamed and needs no extra
// storage beyond the chosen animal + its name (see useCompanion).

import { t } from '../i18n';

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

// Names and descriptions are getters over the `companion` catalog, so every
// read is formatted in the language active at that moment — never frozen at
// import time — while callers keep reading `a.name` / `skill.desc` as before.
function animal(
  id: AnimalId,
  emoji: string,
  colors: AnimalInfo['colors'],
  skillIcons: string[],
): AnimalInfo {
  const k = `companion.${id}`;
  return {
    id, emoji, colors,
    get name() { return t(`${k}.name`); },
    get tagline() { return t(`${k}.tagline`); },
    get perkTitle() { return t(`${k}.perkTitle`); },
    get perkDesc() { return t(`${k}.perkDesc`); },
    skills: skillIcons.map((icon, i) => ({
      icon,
      get name() { return t(`${k}.skill${i + 1}.name`); },
      get desc() { return t(`${k}.skill${i + 1}.desc`); },
    })),
  };
}

export const ANIMALS: AnimalInfo[] = [
  animal('fox', '🦊', { primary: '#ff9f43', secondary: '#ee7d0f', belly: '#fff3e6' }, ['🎯', '⛏️', '💨', '🎭', '🔥']),
  animal('owl', '🦉', { primary: '#b98bff', secondary: '#8b5cf6', belly: '#efe7ff' }, ['🌙', '👁️', '🪶', '📚', '🧙']),
  animal('cat', '🐱', { primary: '#94a3b8', secondary: '#64748b', belly: '#f1f5f9' }, ['🐾', '🐈', '🧗', '🌘', '✨']),
  animal('turtle', '🐢', { primary: '#34e39b', secondary: '#10b981', belly: '#e6fbf1' }, ['🛡️', '🐚', '🐢', '🗿', '🌍']),
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

function stage(key: string, min: number): Stage {
  return { min, get name() { return t(`companion.stage.${key}`); } };
}

export const STAGES: Stage[] = [
  stage('baby', 0),
  stage('young', 25),
  stage('grown', 75),
  stage('expert', 150),
  stage('master', 300),
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
  return SKILL_THRESHOLDS.filter((n) => known >= n).length;
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
