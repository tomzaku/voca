// On-device cache for cloud voice clips.
//
// The server already stores every clip, so Google is called once per sentence
// ever. This keeps the MP3 on the device too: a sentence heard before plays
// straight from Cache Storage — no call to the speech function, no download,
// and it works offline. Flash cards replay the same few words constantly, so
// this is most of what a learner hears.
//
// Keyed by the voice asked for plus the text, normalized the way the server
// normalizes it — and the IPA, when one was given, so each reading of "live"
// is its own entry. A slot (`female`/`male`) keeps whatever voice it had when the
// clip was cached; that only matters if the server's default voice changes,
// and the cache name below can be bumped for that.

import { speechUrl, type SpeechVoice } from './speechApi';
import { clipHashInput } from './speechChunks';

// v2: the default voice became Kokoro's recordings, so the Google clips v1
// holds for `female` are replaced rather than replayed forever.
const CACHE = 'voca-speech-v2';
const OLD_CACHES = ['voca-speech-v1'];
/** ~20KB a clip, so this is a few tens of MB at most. */
const MAX_CLIPS = 1500;
/** Not a real host — Cache Storage just needs an http(s) URL as the key. */
const KEY_BASE = 'https://speech-cache.voca/';

// Pre-recorded clips (scripts/pregen-speech.mjs) are fetched straight from
// the CDN: their name is the same hash this cache is keyed by, so there's
// nothing to ask the server. Asking costs ~1.3 s — the speech function is in
// Tokyo and checks S3 in Sydney — against ~0.2 s for a CDN hit. Only a miss
// (text nobody recorded, mostly AI dialogue) goes on to the function.
//
// Which folder each voice reads mirrors SPEECH_RECORDED_DEFAULTS on the
// server; add `male` here when kokoro-am_michael is recorded.
export const AUDIO_CDN = 'https://dtlkjqn6y6ve2.cloudfront.net';
export const RECORDED: Partial<Record<string, string>> = { female: 'kokoro-af_heart' };
/** A CDN answer is fast or the network is bad; either way, don't hold the read up. */
const DIRECT_TIMEOUT_MS = 4000;

export interface Clip {
  src: string;
  /** A blob URL we made, for the player to revoke when done. */
  owned: boolean;
}

/** The clip's name: what the server and the recording script hash too. */
async function hashOf(text: string, ipa?: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clipHashInput(text, ipa)));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** A pre-recorded clip straight from the CDN, or null when there isn't one. */
async function fetchRecorded(folder: string, hash: string): Promise<Blob | null> {
  try {
    const res = await fetch(`${AUDIO_CDN}/${folder}/${hash}.mp3`, { signal: AbortSignal.timeout(DIRECT_TIMEOUT_MS) });
    return res.ok ? await res.blob() : null;
  } catch {
    return null;
  }
}

let oldDropped = false;

/** Null where Cache Storage is missing or refused (private mode, insecure origin). */
async function openCache(): Promise<Cache | null> {
  try {
    if (typeof caches === 'undefined') return null;
    // A retired version is tens of MB nobody will read again.
    if (!oldDropped) {
      oldDropped = true;
      // Deferred, so a failure — even a synchronous one — never costs the clip.
      for (const name of OLD_CACHES) void Promise.resolve().then(() => caches.delete(name)).catch(() => {});
    }
    return await caches.open(CACHE);
  } catch {
    return null;
  }
}

let putsSinceTrim = 0;

/** Drop the oldest clips once over the cap. keys() is in insertion order. */
async function trim(cache: Cache) {
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_CLIPS))) await cache.delete(k);
}

/** Keep a clip for next time; a full quota just means it isn't kept. */
async function store(cache: Cache, key: string, blob: Blob) {
  try {
    await cache.put(key, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } }));
    if (++putsSinceTrim >= 50) { putsSinceTrim = 0; void trim(cache).catch(() => {}); }
  } catch { /* quota full */ }
}

/** A clip being fetched: its audio, or a URL to play when it couldn't be kept. */
type Fetched = { blob: Blob } | { url: string } | null;

/**
 * Fetches under way, by cache key — so a line warmed ahead (warmClip) and the
 * read that catches up with it share one request instead of asking twice.
 * Shared as a Blob, not a blob URL: each caller makes and revokes its own.
 */
const inflight = new Map<string, Promise<Fetched>>();

async function fetchClip(cache: Cache | null, key: string, hash: string, text: string, voice: SpeechVoice, ipa?: string): Promise<Fetched> {
  const folder = RECORDED[voice];
  const recorded = folder ? await fetchRecorded(folder, hash) : null;
  if (recorded) {
    if (cache) await store(cache, key, recorded);
    return { blob: recorded };
  }

  const url = await speechUrl(text, voice, ipa);
  if (!url) return null;
  if (!cache) return { url };

  try {
    const res = await fetch(url);
    if (!res.ok) return { url };
    const blob = await res.blob();
    await store(cache, key, blob);
    return { blob };
  } catch {
    // Quota full or the download failed: the URL still plays.
    return { url };
  }
}

/**
 * A playable source for `text` in `voice`: from the device cache when it's
 * there, else the pre-recorded clip from the CDN, else from the server — and
 * stored for next time. Null when none can supply one; the caller reads with
 * the device voice.
 */
export async function getClip(text: string, voice: SpeechVoice, ipa?: string): Promise<Clip | null> {
  const cache = await openCache();
  const hash = await hashOf(text, ipa);
  const key = `${KEY_BASE}${encodeURIComponent(voice)}/${hash}`;

  if (cache) {
    try {
      const hit = await cache.match(key);
      if (hit) return { src: URL.createObjectURL(await hit.blob()), owned: true };
    } catch { /* a broken entry is just a miss */ }
  }

  let pending = inflight.get(key);
  if (!pending) {
    pending = fetchClip(cache, key, hash, text, voice, ipa).finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  const got = await pending;
  if (!got) return null;
  return 'blob' in got ? { src: URL.createObjectURL(got.blob), owned: true } : { src: got.url, owned: false };
}

/**
 * Have a clip ready before it's read — any clip, asking the server when
 * nobody recorded it. Unlike prefetchClip this can cost a synthesis, so it's
 * for text about to be read for certain: the next lines of a script that's
 * already playing.
 */
export async function warmClip(text: string, voice: SpeechVoice): Promise<void> {
  const clip = await getClip(text, voice);
  if (clip?.owned) URL.revokeObjectURL(clip.src);
}

/**
 * Fetch a clip into the device cache ahead of a tap, so the speaker plays the
 * moment it's pressed. Recordings only: asking the server for text nobody
 * recorded would have Google make a clip that may never be played.
 */
export async function prefetchClip(text: string, voice: SpeechVoice, ipa?: string): Promise<void> {
  const folder = RECORDED[voice];
  const cache = folder ? await openCache() : null;
  if (!folder || !cache) return;
  const hash = await hashOf(text, ipa);
  const key = `${KEY_BASE}${encodeURIComponent(voice)}/${hash}`;
  try {
    if (await cache.match(key)) return;
  } catch { /* treat as a miss */ }
  const recorded = await fetchRecorded(folder, hash);
  if (recorded) await store(cache, key, recorded);
}
