// Daily learning reminders. Unlike `ai` and `word`, this function is NOT called
// by the client — pg_cron invokes it every 30 minutes and it fans out Web Push
// to every device whose owner's local clock has reached one of their reminder
// times. Which message they get (review nudge vs streak warning) is decided per
// row by `chooseAction`.
//
// SECURITY: there is no signed-in user here, so `requireUser` doesn't apply.
// The function runs with service-role privileges (it must read across users to
// find who is due), which makes the shared-secret guard below the only thing
// standing between the internet and everyone's push endpoints. Deploy with
// --no-verify-jwt so cron can reach it, and CRON_SECRET becomes mandatory.
//
// Configure via `supabase secrets set`:
//   CRON_SECRET          required — must match the x-cron-secret header
//   VAPID_PUBLIC_KEY     required — same key the client subscribes with
//   VAPID_PRIVATE_KEY    required — never leaves the server
//   VAPID_SUBJECT        optional — mailto: or https: contact (default mailto)
//   APP_BASE             optional — base path the app is served from (default /voca)
//
// Two modes, both behind the same secret:
//   POST (no body)                      scheduled run — all users due this slot
//   POST {"test":true,"email":"..."}    send to one user now, ignoring the
//                                       hour/weekday/dedupe gates
//
// Deploy: `supabase functions deploy notify --no-verify-jwt`

import webpush from 'npm:web-push@3.6.7';
import { corsHeaders, jsonResponse, serviceClient } from '../_shared/ai.ts';

interface ReminderRow {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  due_count: number;
  /** The word to name in the copy — null when nothing is due. */
  word: string | null;
  streak: number;
  streak_at_risk: boolean;
  review_due: boolean;
}

/**
 * Which message this row should get. A streak about to break outranks a review
 * nudge: the review queue will still be there tomorrow, the streak won't.
 */
function chooseAction(row: ReminderRow): ActionId {
  // Both booleans already account for the user's per-type switches, so this
  // only has to decide precedence.
  if (row.streak_at_risk) return 'streak_at_risk';
  return row.review_due ? 'review_word' : 'test_ping';
}

// Base path the app is served from. Trailing slashes are normalised away so
// the URLs below can append their own.
const APP_BASE = (Deno.env.get('APP_BASE') ?? '/voca').replace(/\/+$/, '');

/**
 * URL-safe base64, mirroring `encodeWord` in src/lib/wordCode.ts — the two must
 * stay in step, since the client decodes what we produce here. Edge functions
 * bundle only from supabase/, so it can't be imported.
 */
function encodeWord(word: string): string {
  const bytes = new TextEncoder().encode(word);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Push services return these when a subscription is permanently gone. */
const DEAD_SUBSCRIPTION = new Set([404, 410]);

// ─── Notification actions ────────────────────────────────────────────
//
// Every notification this app can send is one named ACTION, and each action
// owns both its copy and its destination. This mirrors the `{action, params}`
// shape of the `ai` function, and it exists so that adding a second kind of
// notification (a lost streak, a shared collection, a quiz invite) is a new
// entry in this table rather than another branch threaded through the sender.
//
// The action name also travels in the payload, so the service worker can key
// off it — grouping, icons, routing — without re-deriving intent from copy.

/** Everything an action's copy or URL may depend on. */
interface ActionContext {
  word: string | null;
  dueCount: number;
  streak: number;
}

interface ActionDefinition {
  /**
   * Copy variants. One is picked at random per send: the same sentence every
   * morning stops registering within a week.
   */
  templates: Array<(ctx: ActionContext) => { title: string; body: string }>;
  /** Where tapping it lands. */
  url: (ctx: ActionContext) => string;
}

const ACTIONS = {
  /**
   * The daily spaced-repetition nudge.
   *
   * A count ("12 words ready") describes a backlog, and a backlog is easy to
   * swipe away. Naming one word asks a question, and a question is hard not to
   * answer — so the word goes in the title, where a lock screen shows it, and
   * the tap opens exactly that card rather than a list.
   */
  review_word: {
    templates: [
      ({ word }) => ({
        title: `Still remember “${word}”?`,
        body: 'Ten seconds to prove it — before it slips away.',
      }),
      ({ word }) => ({
        title: `Hey — “${word}” is fading`,
        body: 'One quick look now and it sticks for weeks.',
      }),
      ({ word }) => ({
        title: `“${word}” wants another shot`,
        body: 'You almost had this one last time. Try again?',
      }),
      ({ word }) => ({
        title: `Psst… “${word}”`,
        body: "Your brain's about to file it away. Rescue it?",
      }),
      ({ word }) => ({
        title: `Got a minute for “${word}”?`,
        body: "That's all it takes to make it yours for good.",
      }),
    ],
    // Lands on the quick-review check, not the full card: the notification has
    // already given the word away, so asking them to guess it is a non-question
    // — whether they recall its *meaning* is the part still worth testing.
    url: ({ word }) => `${APP_BASE}/quick?w=${encodeWord(word!)}`,
  },

  /**
   * Last call before a streak breaks.
   *
   * Loss aversion does the work here, so the copy names what's about to be
   * lost and how little it costs to keep — never a scolding. Only sent at the
   * user's final slot of the day, when the urgency is real.
   */
  streak_at_risk: {
    templates: [
      ({ streak }) => ({
        title: `Your ${streak}-day streak ends at midnight`,
        body: 'One word is enough to keep it alive.',
      }),
      ({ streak }) => ({
        title: `${streak} days — don't stop now`,
        body: "You haven't studied today. A minute saves the run.",
      }),
      ({ streak }) => ({
        title: `Keep the ${streak}-day run going?`,
        body: 'One answer before bed and it carries into tomorrow.',
      }),
      ({ streak }) => ({
        title: `${streak} days of work on the line`,
        body: 'It only takes one word to hold onto it.',
      }),
    ],
    // Deep link to a due word when there is one, so the tap lands on something
    // answerable rather than a home screen they still have to navigate.
    url: ({ word }) => (word ? `${APP_BASE}/quick?w=${encodeWord(word)}` : `${APP_BASE}/`),
  },

  /** Delivery check with an empty queue — says what it is instead of inventing a word. */
  test_ping: {
    templates: [
      () => ({
        title: 'Test reminder',
        body: 'Push is working. You have no words due right now.',
      }),
    ],
    url: () => `${APP_BASE}/`,
  },
} satisfies Record<string, ActionDefinition>;

type ActionId = keyof typeof ACTIONS;

/** Render one action into the JSON the service worker receives. */
function buildPayload(action: ActionId, ctx: ActionContext): string {
  const { templates, url } = ACTIONS[action];
  const pick = templates[Math.floor(Math.random() * templates.length)];
  // `action` rides along so the worker can group/route without parsing copy.
  return JSON.stringify({ action, ...pick(ctx), url: url(ctx) });
}

interface SendResult {
  delivered: string[];
  dead: string[];
}

/**
 * Deliver to every row. Shared by the scheduled and test paths so a test
 * exercises the real encryption/VAPID/transport code, not a parallel version
 * of it that could drift.
 */
async function sendAll(
  rows: ReminderRow[],
  payloadFor: (row: ReminderRow) => string,
): Promise<SendResult> {
  const delivered: string[] = [];
  const dead: string[] = [];

  // Sequential rather than parallel: a push service will rate-limit a burst,
  // and an hourly job has no deadline worth risking that for.
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        payloadFor(row),
      );
      delivered.push(row.endpoint);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status && DEAD_SUBSCRIPTION.has(status)) {
        // Uninstalled app or cleared browser data. Without pruning, these
        // accumulate forever and every run retries them.
        dead.push(row.endpoint);
      } else {
        console.error('[notify] push failed', status, (err as Error).message);
      }
    }
  }

  return { delivered, dead };
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const secret = Deno.env.get('CRON_SECRET') ?? '';
  // Fail closed: an unset secret would otherwise leave this wide open.
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return jsonResponse(401, { error: 'unauthorized' });
  }

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
  if (!publicKey || !privateKey) {
    return jsonResponse(500, { error: 'VAPID keys not configured' });
  }
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:noreply@voca.app',
    publicKey,
    privateKey,
  );

  const supabase = serviceClient();
  if (!supabase) return jsonResponse(500, { error: 'service role key not configured' });

  // Cron sends no body at all, so a parse failure just means "scheduled run".
  const body = (await req.json().catch(() => ({}))) as { test?: boolean; email?: string };

  // ─── Test send ─────────────────────────────────────────────────────
  // Targets one user, ignores every schedule gate, and deliberately does NOT
  // stamp last_sent_at — testing must not consume that user's real reminder
  // for the day.
  if (body.test) {
    if (!body.email) return jsonResponse(400, { error: 'test sends require an email' });

    const { data: testData, error: testError } = await supabase.rpc('test_reminder_targets', {
      p_email: body.email,
    });
    if (testError) return jsonResponse(500, { error: testError.message });

    const testRows = (testData ?? []) as ReminderRow[];
    if (testRows.length === 0) {
      return jsonResponse(404, {
        error: 'no push subscriptions for that email — enable reminders on a device first',
      });
    }

    // With nothing due there's no word to name, so fall back to a plain ping —
    // a test still has to reach the device to prove delivery works.
    const { delivered: testDelivered, dead: testDead } = await sendAll(testRows, (r) =>
      buildPayload(chooseAction(r), {
        word: r.word,
        dueCount: r.due_count,
        streak: r.streak,
      }),
    );

    if (testDead.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', testDead);
    }

    return jsonResponse(200, {
      test: true,
      devices: testRows.length,
      sent: testDelivered.length,
      pruned: testDead.length,
      due_count: testRows[0]?.due_count ?? 0,
      word: testRows[0]?.word ?? null,
      action: testRows[0] ? chooseAction(testRows[0]) : null,
    });
  }

  // ─── Scheduled run ─────────────────────────────────────────────────

  const { data, error } = await supabase.rpc('pending_review_reminders');
  if (error) return jsonResponse(500, { error: error.message });

  const rows = (data ?? []) as ReminderRow[];
  if (rows.length === 0) return jsonResponse(200, { sent: 0, pruned: 0 });

  const { delivered, dead } = await sendAll(rows, (r) =>
    buildPayload(chooseAction(r), {
      word: r.word,
      dueCount: r.due_count,
      streak: r.streak,
    }),
  );

  // Stamping only the ones that actually went out means a transient failure is
  // retried next hour instead of being silently skipped for a day.
  if (delivered.length > 0) {
    const { error: stampError } = await supabase
      .from('push_subscriptions')
      .update({ last_sent_at: new Date().toISOString() })
      .in('endpoint', delivered);
    if (stampError) console.error('[notify] failed to stamp last_sent_at', stampError.message);
  }

  if (dead.length > 0) {
    const { error: pruneError } = await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', dead);
    if (pruneError) console.error('[notify] failed to prune subscriptions', pruneError.message);
  }

  return jsonResponse(200, { sent: delivered.length, pruned: dead.length });
}

if (import.meta.main) Deno.serve(handler);
