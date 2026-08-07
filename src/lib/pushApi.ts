// Client for the `push` resource — this browser's Web Push subscription.
//
//   POST   /push  { endpoint, p256dh, auth } → { ok }
//   DELETE /push  ?endpoint=…                → { ok }
//
// One row per device: the endpoint is the browser's own push URL, so removing
// one device leaves the user's other devices subscribed.
//
// Quiet. Notifications are opt-in extra; failing to register shouldn't put an
// error in front of someone who was just toggling a switch. The caller reports
// the outcome instead.

import { request } from './api';

/** Register this browser. False if it didn't reach the server. */
export async function savePushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<boolean> {
  const res = await request.post<{ ok: true }>('/push', sub, { quiet: true });
  return Boolean(res?.ok);
}

/** Forget this browser. Idempotent — an unknown endpoint is already gone. */
export async function removePushSubscription(endpoint: string): Promise<void> {
  await request.delete('/push', { params: { endpoint }, quiet: true });
}
