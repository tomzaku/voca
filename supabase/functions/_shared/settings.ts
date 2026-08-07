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
    if (name in body) patch[column] = body[name] ?? null;
  }
  return patch;
}
