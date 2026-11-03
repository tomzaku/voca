// Spoken audio for devices that can't run a voice model themselves — phones and
// low-power desktops (the app's "Cloud" voice engine). Google Cloud
// Text-to-Speech does the synthesis; every clip is stored in the public
// `speech` bucket, so each sentence is paid for once and served from the CDN
// after that.
//
//   POST /speech  { text, voice? }  → 200 { url }
//
// `voice` is a slot, not a Google voice name — `female` (default) or `male`,
// which the two-speaker dialogues use. Which Google voice fills each slot is
// server config, so changing it never touches the client (and a new voice
// simply starts a fresh cache folder).
//
// POST rather than GET: the text can be a few hundred characters of sentence,
// and it's what creates the clip on a miss.
//
// Speed isn't a parameter: the client sets playbackRate, so one cached clip
// serves every speed setting.
//
// Open to visitors, like `word` — a guest on an iPhone should hear words too.
// Only a cache miss costs anything, so only a miss is counted: per user, per
// hashed IP for visitors, and one daily cap across everyone so a burst can't
// run past Google's free allowance unnoticed.
//
// Env:
//   GOOGLE_API_KEY             required — the project needs the Cloud
//                              Text-to-Speech API enabled
//   GOOGLE_TTS_VOICE_FEMALE    optional (default en-US-Chirp3-HD-Aoede)
//   GOOGLE_TTS_VOICE_MALE      optional (default en-US-Chirp3-HD-Charon)
//   SPEECH_USER_DAILY_LIMIT    new clips per signed-in user per day (default 300)
//   SPEECH_ANON_DAILY_LIMIT    new clips per visitor IP per day (default 60)
//   SPEECH_TOTAL_DAILY_LIMIT   new clips across everyone per day (default 3000)
//
// Deploy: `npm run db:push` (the bucket), then `supabase functions deploy speech`

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, optionalUser, serviceClient } from '../_shared/ai.ts';

const BUCKET = 'speech';
/** The client splits long text into sentences of ≤300; this leaves headroom. */
const MAX_CHARS = 500;

const VOICES = {
  female: () => Deno.env.get('GOOGLE_TTS_VOICE_FEMALE') || 'en-US-Chirp3-HD-Aoede',
  male: () => Deno.env.get('GOOGLE_TTS_VOICE_MALE') || 'en-US-Chirp3-HD-Charon',
} as const;
type Slot = keyof typeof VOICES;

async function sha256(s: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function publicUrl(path: string): string {
  return `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** A HEAD on the public URL: the same CDN path the client will play from. */
async function isCached(path: string): Promise<boolean> {
  const res = await fetch(publicUrl(path), { method: 'HEAD' });
  return res.ok;
}

/**
 * One day's budget of new clips under `key`. Reuses the keyed fixed-window
 * counter from the anon_rate_limit migration — it takes any key, not only
 * visitors'. Fails open on a database error, like the AI limits do.
 */
async function underLimit(svc: SupabaseClient, key: string, max: number): Promise<boolean> {
  const { data: allowed, error } = await svc.rpc('check_anon_rate_limit', {
    p_key: key,
    p_limit: max,
    p_window_seconds: 86400,
  });
  return !(allowed === false && !error);
}

async function callerKey(req: Request, userId: string | null): Promise<{ key: string; max: number }> {
  if (userId) {
    return { key: `speech:user:${userId}`, max: Number(Deno.env.get('SPEECH_USER_DAILY_LIMIT')) || 300 };
  }
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  return { key: `speech:ip:${await sha256(ip)}`, max: Number(Deno.env.get('SPEECH_ANON_DAILY_LIMIT')) || 60 };
}

/** Google Cloud TTS → MP3 bytes. Throws with Google's own message on failure. */
async function synthesize(text: string, voiceName: string): Promise<Uint8Array> {
  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': Deno.env.get('GOOGLE_API_KEY') ?? '',
      // Not Deno's default — see NO_USER_AGENT in _shared/ai.ts.
      'user-agent': '',
    },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: voiceName.split('-').slice(0, 2).join('-'), name: voiceName },
      audioConfig: { audioEncoding: 'MP3' },
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(`Google TTS ${res.status}: ${body?.error?.message ?? 'no detail'}`);
  }
  const { audioContent } = await res.json() as { audioContent?: string };
  if (!audioContent) throw new Error('Google TTS returned no audio.');
  return Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0));
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const sub = parts.slice(parts.lastIndexOf('speech') + 1).join('/');
  if (sub !== '' || req.method !== 'POST') return jsonResponse(404, { error: 'Not found' });

  let body: Record<string, unknown>;
  try {
    body = (await req.json() ?? {}) as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }

  // Collapse whitespace so "a  b" and "a b" share one clip.
  const text = typeof body.text === 'string' ? body.text.replace(/\s+/g, ' ').trim() : '';
  if (!text) return jsonResponse(400, { error: '"text" must be a non-empty string.' });
  if (text.length > MAX_CHARS) return jsonResponse(400, { error: `"text" must be at most ${MAX_CHARS} characters.` });
  const slot = (body.voice ?? 'female') as Slot;
  if (!(slot in VOICES)) return jsonResponse(400, { error: '"voice" must be one of: female, male.' });

  const svc = serviceClient();
  if (!svc) return jsonResponse(500, { error: 'Speech is not configured.' });

  const voiceName = VOICES[slot]();
  const path = `${voiceName}/${await sha256(text)}.mp3`;

  try {
    if (await isCached(path)) return jsonResponse(200, { url: publicUrl(path) });

    const { user } = await optionalUser(req);
    const caller = await callerKey(req, user?.id ?? null);
    const total = Number(Deno.env.get('SPEECH_TOTAL_DAILY_LIMIT')) || 3000;
    if (!await underLimit(svc, caller.key, caller.max) || !await underLimit(svc, 'speech:all', total)) {
      return jsonResponse(429, { error: 'Speech limit reached for today.' });
    }

    const mp3 = await synthesize(text, voiceName);
    // upsert: two callers missing at once both synthesize; the second write
    // just replaces an identical file instead of failing.
    const { error } = await svc.storage.from(BUCKET).upload(path, mp3, {
      contentType: 'audio/mpeg',
      cacheControl: '31536000',
      upsert: true,
    });
    if (error) throw new Error(`storage: ${error.message}`);
    console.log(`[speech] new clip voice=${voiceName} chars=${text.length}`);
    return jsonResponse(200, { url: publicUrl(path) });
  } catch (err) {
    console.error('[speech]', err);
    return jsonResponse(500, { error: 'Could not make audio.' });
  }
}

if (import.meta.main) Deno.serve(handler);
