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

const CACHE = 'voca-speech-v1';
/** ~20KB a clip, so this is a few tens of MB at most. */
const MAX_CLIPS = 1500;
/** Not a real host — Cache Storage just needs an http(s) URL as the key. */
const KEY_BASE = 'https://speech-cache.voca/';

export interface Clip {
  src: string;
  /** A blob URL we made, for the player to revoke when done. */
  owned: boolean;
}

async function keyFor(text: string, voice: SpeechVoice, ipa?: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clipHashInput(text, ipa)));
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return `${KEY_BASE}${encodeURIComponent(voice)}/${hex}`;
}

/** Null where Cache Storage is missing or refused (private mode, insecure origin). */
async function openCache(): Promise<Cache | null> {
  try {
    return typeof caches === 'undefined' ? null : await caches.open(CACHE);
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

/**
 * A playable source for `text` in `voice`: from the device cache when it's
 * there, otherwise from the server (and stored for next time). Null when the
 * server can't supply one — the caller reads with the device voice.
 */
export async function getClip(text: string, voice: SpeechVoice, ipa?: string): Promise<Clip | null> {
  const cache = await openCache();
  const key = cache ? await keyFor(text, voice, ipa) : '';

  if (cache) {
    try {
      const hit = await cache.match(key);
      if (hit) return { src: URL.createObjectURL(await hit.blob()), owned: true };
    } catch { /* a broken entry is just a miss */ }
  }

  const url = await speechUrl(text, voice, ipa);
  if (!url) return null;
  if (!cache) return { src: url, owned: false };

  try {
    const res = await fetch(url);
    if (!res.ok) return { src: url, owned: false };
    const blob = await res.blob();
    await cache.put(key, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } }));
    if (++putsSinceTrim >= 50) { putsSinceTrim = 0; void trim(cache).catch(() => {}); }
    return { src: URL.createObjectURL(blob), owned: true };
  } catch {
    // Quota full or the download failed: the URL still plays.
    return { src: url, owned: false };
  }
}
