// Shared pieces of the `settings` resource: the column mapping in both
// directions, and the whitelist that decides what a client may write.
//
// Everything here is a preference — something the user chose. The streak lives
// on the same row but is not part of this resource: it's earned, not chosen,
// and it has its own (`streak`).

/**
 * Columns the client may read and write, client name → column name.
 *
 * A whitelist, not a translation of the whole row: `api_keys_encrypted` lives
 * on the same row and nothing in the UI reads it, so it never leaves the
 * database. Adding a column here is the deliberate act of exposing it.
 */
export const FIELDS = {
  // Onboarding
  wordPack: 'word_pack',
  motherLanguage: 'mother_language',
  ttsEngine: 'tts_engine',
  ttsVoice: 'tts_voice',
  // Companion
  companionAnimal: 'companion_animal',
  companionName: 'companion_name',
  companionDress: 'companion_dress',
  // Where the learner left off
  activeCollection: 'active_collection',
  guessGame: 'guess_game',
  // Reminders
  reminderEnabled: 'reminder_enabled',
  reminderTimezone: 'reminder_timezone',
  reminderTimes: 'reminder_times',
  reminderDays: 'reminder_days',
  notifyStreak: 'notify_streak',
  notifyReview: 'notify_review',
} as const;

export type Field = keyof typeof FIELDS;

export const SELECT = Object.values(FIELDS).join(', ');

/** Row → the client's shape. Absent columns come back as null, not missing. */
export function toSettings(row: Record<string, unknown> | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, column] of Object.entries(FIELDS)) {
    out[name] = row?.[column] ?? null;
  }
  return out;
}

/**
 * A PATCH body → the columns to write. Only keys the caller actually sent are
 * included, so two features updating different settings can't overwrite each
 * other's — which is exactly what the old client-side upserts did.
 *
 * Unknown keys are ignored rather than rejected: an older client sending a
 * field this deploy doesn't know about should still save the rest.
 */
export function fromSettings(body: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [name, column] of Object.entries(FIELDS)) {
    if (name in body) patch[column] = name === 'companionDress' ? cleanDress(body[name]) : body[name] ?? null;
  }
  return patch;
}

/** The parts of a look the tailor's knows. */
const DRESS_PARTS = ['figure', 'hair', 'hairColor', 'outfit', 'hat'];

/**
 * A look, kept to what one is: the known parts, each a short string. It's a
 * JSON column a client writes, so anything else — extra keys, long values,
 * not an object at all — is dropped rather than stored. Which values are
 * valid is the client's to decide (it falls back on anything it doesn't know).
 */
export function cleanDress(v: unknown): Record<string, string> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const out: Record<string, string> = {};
  for (const part of DRESS_PARTS) {
    const value = (v as Record<string, unknown>)[part];
    if (typeof value === 'string' && value.length <= 24) out[part] = value;
  }
  return Object.keys(out).length ? out : null;
}
