// The `turn` resource — relay servers for the world's peer-to-peer links
// (voice calls, the action games).
//
//   GET /turn → { iceServers: RTCIceServer[], expiresAt: string | null }
//
// STUN gets most pairs of players talking directly. Two phones on Vietnamese
// mobile data — both behind carrier-grade NAT — can't, and need a relay in
// the middle: Cloudflare Realtime TURN. Its credentials are minted here, per
// caller, and expire, so the app never ships a long-lived password that
// anyone could lift from the bundle and relay their own traffic on.
//
// Signed-in callers only, for the same reason: an open endpoint would hand
// relay bandwidth to anyone. Unconfigured (no CF_TURN_* secrets) or when
// Cloudflare fails, it answers an empty list — the client keeps STUN, which
// is what it had before.
//
// Secrets: CF_TURN_KEY_ID, CF_TURN_API_TOKEN (Cloudflare → Realtime → TURN).
// Deploy: `npm run deploy:turn`

import { corsHeaders, jsonResponse, requireUser } from '../_shared/ai.ts';

/** How long a credential lasts. Long enough to outlive a call or a match;
 *  the client asks again before it runs out. */
const TTL_S = 24 * 60 * 60;

type IceServer = { urls: string | string[]; username?: string; credential?: string };

/** Cloudflare lists port-53 URLs for networks that only let DNS out; browsers
 *  block that port and time out on it, slowing every connection. */
function withoutPort53(servers: IceServer[]): IceServer[] {
  return servers
    .map((s) => ({ ...s, urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u)) }))
    .filter((s) => s.urls.length > 0);
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const sub = parts.slice(parts.lastIndexOf('turn') + 1).join('/');
  if (sub !== '' || req.method !== 'GET') return jsonResponse(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });

  const keyId = Deno.env.get('CF_TURN_KEY_ID');
  const token = Deno.env.get('CF_TURN_API_TOKEN');
  if (!keyId || !token) return jsonResponse(200, { iceServers: [], expiresAt: null });

  try {
    const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: TTL_S }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Cloudflare ${res.status}: ${await res.text()}`);
    const data = await res.json() as { iceServers?: IceServer[] | IceServer };
    const list = Array.isArray(data.iceServers) ? data.iceServers : data.iceServers ? [data.iceServers] : [];
    return jsonResponse(200, {
      iceServers: withoutPort53(list),
      expiresAt: new Date(Date.now() + TTL_S * 1000).toISOString(),
    });
  } catch (e) {
    console.error('[turn]', e);
    return jsonResponse(200, { iceServers: [], expiresAt: null });
  }
}

if (import.meta.main) Deno.serve(handler);
