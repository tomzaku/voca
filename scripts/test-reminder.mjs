#!/usr/bin/env node
// Fire a daily-reminder push at a real device, without waiting for the hourly
// cron tick or hand-editing schedule columns in SQL.
//
// Reads .env for the project URL and the shared secret, so there's nothing to
// paste. `.env` is git-ignored, which is why CRON_SECRET is allowed to live
// there — it is the same secret the pg_cron job sends.
//
// Requires env (from .env):
//   VITE_SUPABASE_URL        https://<ref>.supabase.co
//   CRON_SECRET              must match the Supabase secret of the same name
//   TEST_REMINDER_EMAIL      optional default recipient
//
// Usage:
//   npm run notify:test                      # uses TEST_REMINDER_EMAIL
//   npm run notify:test -- you@example.com   # explicit recipient
//   npm run notify:test -- --scheduled       # run the real cron path instead

try {
  process.loadEnvFile('.env');
} catch {
  // Fine if it's absent — the vars may already be exported.
}

const { VITE_SUPABASE_URL, CRON_SECRET, TEST_REMINDER_EMAIL } = process.env;

const args = process.argv.slice(2);
const SCHEDULED = args.includes('--scheduled');
const email = args.find((a) => !a.startsWith('--')) ?? TEST_REMINDER_EMAIL;

function fail(message, hint) {
  console.error(`\n✗ ${message}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
}

if (!VITE_SUPABASE_URL) {
  fail('VITE_SUPABASE_URL is not set.', 'Add it to .env (see .env.example).');
}
if (!CRON_SECRET) {
  fail(
    'CRON_SECRET is not set.',
    'Add the same value you passed to `supabase secrets set CRON_SECRET=...` into .env.',
  );
}
if (!SCHEDULED && !email) {
  fail(
    'No recipient.',
    'Pass one — `npm run notify:test -- you@example.com` — or set TEST_REMINDER_EMAIL in .env.',
  );
}

const url = `${VITE_SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/notify`;

console.log(SCHEDULED ? '→ Running the scheduled path' : `→ Test send to ${email}`);
console.log(`  ${url}\n`);

const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-cron-secret': CRON_SECRET },
  // The scheduled path expects no body — that's how cron calls it.
  body: SCHEDULED ? undefined : JSON.stringify({ test: true, email }),
}).catch((err) => fail(`Could not reach the function: ${err.message}`));

const text = await response.text();
let payload;
try {
  payload = JSON.parse(text);
} catch {
  fail(`Unexpected non-JSON response (HTTP ${response.status})`, text.slice(0, 300));
}

// Translate the failures that actually happen into the fix, rather than making
// someone map a status code back to a cause.
if (!response.ok) {
  const hints = {
    401: 'CRON_SECRET in .env does not match the Supabase secret. Compare both.',
    404: 'That email has no push subscription — turn the Profile toggle on, on the device you want to reach.',
    500: 'Check `supabase functions logs notify` — usually a missing VAPID secret.',
  };
  fail(`HTTP ${response.status}: ${payload.error ?? text}`, hints[response.status]);
}

if (SCHEDULED) {
  console.log(`✓ Sent ${payload.sent}, pruned ${payload.pruned}`);
  if (payload.sent === 0) {
    console.log('  0 is expected unless someone is genuinely due this hour.');
  }
  process.exit(0);
}

console.log(`✓ Sent to ${payload.sent}/${payload.devices} device(s)`);
console.log(`  Action: ${payload.action ?? 'unknown'}`);
console.log(
  payload.word
    ? `  Featured “${payload.word}” — ${payload.due_count} word(s) due`
    : '  Nothing due, so a plain "push is working" message was sent.',
);
if (payload.pruned > 0) {
  console.log(`  Pruned ${payload.pruned} expired subscription(s).`);
}
if (payload.sent === 0) {
  console.log('\n  Nothing delivered — the subscription exists but the push service rejected it.');
  console.log('  Check `supabase functions logs notify`.');
}
