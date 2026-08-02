// Daily review reminders. Unlike `ai` and `word`, this function is NOT called
// by the client — pg_cron invokes it once an hour and it fans out Web Push to
// every device whose owner's local clock has just reached their reminder hour.
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
//   APP_PATH             optional — path the notification opens (default /voca/history)
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
}

const APP_PATH = Deno.env.get('APP_PATH') ?? '/voca/history';

/** Push services return these when a subscription is permanently gone. */
const DEAD_SUBSCRIPTION = new Set([404, 410]);

function buildPayload(due: number): string {
  const word = due === 1 ? 'word' : 'words';
  return JSON.stringify({
    title: `${due} ${word} ready for review`,
    // Reviewing right as recall starts to fade is the whole point of the
    // schedule — say why it's worth opening, not just that it exists.
    body: "You're about to forget these. A minute now makes them stick.",
    url: APP_PATH,
  });
}

Deno.serve(async (req: Request) => {
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

  const { data, error } = await supabase.rpc('pending_review_reminders');
  if (error) return jsonResponse(500, { error: error.message });

  const rows = (data ?? []) as ReminderRow[];
  if (rows.length === 0) return jsonResponse(200, { sent: 0, pruned: 0 });

  const delivered: string[] = [];
  const dead: string[] = [];

  // Sequential rather than parallel: a push service will rate-limit a burst,
  // and an hourly job has no deadline worth risking that for.
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        buildPayload(row.due_count),
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
});
