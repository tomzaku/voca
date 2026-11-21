// Client for the `turn` resource, and the ICE server list every peer-to-peer
// link in the app uses (voiceCall, peerLink).
//
//   GET /turn → { iceServers, expiresAt }
//
// STUN is always there; the TURN relay joins it once fetched. Quiet: without
// the relay (signed out, offline, not configured) a link still tries STUN,
// which is what it had before — only the stubborn networks miss out.

import { request } from './api';

interface TurnReply {
  iceServers: RTCIceServer[];
  expiresAt: string | null;
}

const STUN: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
/** Ask again this long before the credentials run out, so a call never starts on a dying one. */
const REFRESH_EARLY_MS = 60 * 60 * 1000;
/** After an empty answer, wait this long before asking again. */
const RETRY_MS = 5 * 60 * 1000;

let relay: RTCIceServer[] = [];
let freshUntil = 0;
let pending: Promise<void> | null = null;

/** Fetch (or refresh) the relay credentials. Safe to call often. */
export function prefetchIceServers(): Promise<void> {
  if (Date.now() < freshUntil) return Promise.resolve();
  pending ??= request.get<TurnReply>('/turn', { quiet: true, timeout: 8000 })
    .then((r) => {
      if (r?.iceServers.length && r.expiresAt) {
        relay = r.iceServers;
        freshUntil = new Date(r.expiresAt).getTime() - REFRESH_EARLY_MS;
      } else {
        freshUntil = Date.now() + RETRY_MS;
      }
    })
    .finally(() => { pending = null; });
  return pending;
}

/** What's known right now — for a connection that can't wait (peerLink's retries pick up the relay once it lands). */
export function currentIceServers(): RTCIceServer[] {
  void prefetchIceServers();
  return [...STUN, ...relay];
}

/** STUN plus the relay, waiting (briefly) for the relay if it isn't here yet. */
export async function getIceServers(): Promise<RTCIceServer[]> {
  await prefetchIceServers();
  return [...STUN, ...relay];
}
