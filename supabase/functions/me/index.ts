// The `me` resource — what the server knows about the caller that their token
// doesn't already say.
//
//   GET /me → { isPro, proExpiresAt, isTrial }
//
// Identity (id, email, display name, avatar) is deliberately NOT here. It rides
// in the session JWT, so the client already has it for free, offline, with no
// call that can fail. Returning it would turn a property read into a round
// trip, and someone would end up fetching an endpoint to render an avatar.
//
// So this carries entitlements and server-side facts only. Today that's the Pro
// grant; a plan tier, a quota or a role would belong here too, rather than
// spawning an endpoint apiece.
//
// The Pro answer is advisory — it's what the UI shows and gates on. Every
// feature that costs money re-checks server-side at the point of use
// (proGateError in _shared/ai.ts), so a client that lies to itself about being
// Pro still can't spend anything. Nothing here can grant Pro either: rows in
// `pro_users` are written out of band, never by a client — except the 5-day
// trial, which a DB trigger inserts (note = 'trial') the moment a new
// `auth.users` row appears (see the pro_trial migration).
//
// Deploy: `supabase functions deploy me`

import { corsHeaders, jsonResponse, requireUser } from '../_shared/ai.ts';

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return jsonResponse(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });

  // The user-scoped client can only see this user's own row (RLS), so a row
  // coming back is proof the grant is theirs.
  const { data, error } = await auth.supabase
    .from('pro_users')
    .select('expires_at, note')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error) {
    console.error('[me]', error);
    return jsonResponse(500, { error: 'Could not load your account.' });
  }

  const expiresAt = (data?.expires_at as string | null | undefined) ?? null;
  // A NULL expiry is a lifetime grant; otherwise Pro lasts until that moment.
  const isPro = Boolean(data) && (!expiresAt || new Date(expiresAt) > new Date());
  const isTrial = isPro && data?.note === 'trial';
  return jsonResponse(200, { isPro, proExpiresAt: isPro ? expiresAt : null, isTrial });
}

if (import.meta.main) Deno.serve(handler);
