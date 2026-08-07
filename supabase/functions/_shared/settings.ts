// Shared pieces of the `settings` resource: the column mapping in both
// directions, and the whitelist that decides what a client may write.

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

/**
 * Read-only fields, returned by GET but never accepted from a PATCH.
 *
 * The streak is the server's own tally — it moves only through the
 * record_learning_day function, which enforces "one day counts once". Letting
 * a client PATCH streak_count would make the number meaningless.
 */
export const READ_ONLY = {
  streakCount: 'streak_count',
  longestStreak: 'longest_streak',
  lastActiveDay: 'last_active_day',
} as const;

export const SELECT = [...Object.values(FIELDS), ...Object.values(READ_ONLY)].join(', ');

/** Row → the client's shape. Absent columns come back as null, not missing. */
export function toSettings(row: Record<string, unknown> | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, column] of Object.entries({ ...FIELDS, ...READ_ONLY })) {
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
