// Captions of a YouTube video, as timed lines to shadow — the Speak page's
// "Video" practice plays a line of a song or a film scene, pauses, and you say
// it back.
//
//   GET /captions?video=<id or URL>&lang=en
//     → 200 { video: { id, title }, track: CaptionTrack | null, tracks, lines }
//
// `lines` is `[]` with `track: null` when the video has no captions in `lang`;
// `tracks` then says which languages it does have. The client falls back to
// captions the learner pastes in (an .srt or .vtt), parsed on the device.
//
// The browser can't read these itself — YouTube sends no CORS headers — so the
// fetch happens here. YouTube's caption list comes from its player API (the
// Android client's answer still carries plain caption URLs); the watch page is
// the fallback. Either can start refusing a datacenter IP at any time: that's a
// 502, and the paste box is the answer to it.
//
// Signed-in only — it's a proxy, and a signed-out one is an open one. Results
// are kept in this instance's memory for a while; a video's captions don't
// change, and a class all opening the same song shouldn't each cost a fetch.
//
// Deploy: `supabase functions deploy captions`

import { corsHeaders, jsonResponse, requireUser } from '../_shared/ai.ts';
import { type CaptionLine, type CaptionTrack, parseTrack, pickTrack, videoIdOf } from '../_shared/captions.ts';

interface SourceTrack extends CaptionTrack { url: string }
interface Payload {
  video: { id: string; title: string };
  track: CaptionTrack | null;
  tracks: CaptionTrack[];
  lines: CaptionLine[];
}

const ANDROID_VERSION = '20.10.38';
const FETCH_TIMEOUT_MS = 8000;
const CACHE_MAX = 300;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; payload: Payload }>();

class Upstream extends Error {}

function timed(ms = FETCH_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(ms);
}

type RawTrack = {
  baseUrl?: string;
  languageCode?: string;
  kind?: string;
  name?: { simpleText?: string; runs?: { text?: string }[] };
};

function tracksOf(player: unknown): { title: string; tracks: SourceTrack[]; status: string } {
  const p = player as {
    playabilityStatus?: { status?: string };
    videoDetails?: { title?: string };
    captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: RawTrack[] } };
  };
  const raw = p.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  return {
    status: p.playabilityStatus?.status ?? '',
    title: p.videoDetails?.title ?? '',
    tracks: raw
      .filter((t) => t.baseUrl && t.languageCode)
      .map((t) => ({
        url: t.baseUrl!,
        lang: t.languageCode!,
        auto: t.kind === 'asr',
        name: t.name?.simpleText ?? t.name?.runs?.map((r) => r.text ?? '').join('') ?? t.languageCode!,
      })),
  };
}

/** The player API, as the Android app asks it. */
async function fromPlayerApi(id: string) {
  const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST',
    signal: timed(),
    headers: {
      'content-type': 'application/json',
      'user-agent': `com.google.android.youtube/${ANDROID_VERSION} (Linux; U; Android 14) gzip`,
    },
    body: JSON.stringify({
      context: { client: { clientName: 'ANDROID', clientVersion: ANDROID_VERSION, androidSdkVersion: 34, hl: 'en', gl: 'US' } },
      videoId: id,
    }),
  });
  if (!res.ok) throw new Upstream(`player ${res.status}`);
  return tracksOf(await res.json());
}

/** The watch page's embedded player response. */
async function fromWatchPage(id: string) {
  const res = await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, {
    signal: timed(),
    // Without it, a European egress gets the cookie-consent page instead.
    headers: { 'accept-language': 'en-US,en;q=0.9', cookie: 'CONSENT=YES+1; SOCS=CAI' },
  });
  if (!res.ok) throw new Upstream(`watch ${res.status}`);
  const html = await res.text();
  const m = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;\s*(?:var\s|<\/script>)/s);
  if (!m) throw new Upstream('no player response on the watch page');
  return tracksOf(JSON.parse(m[1]));
}

async function fetchLines(track: SourceTrack): Promise<CaptionLine[]> {
  // The listed URL may name a format (srv3, json3) or not (srv1); parseTrack
  // reads all of them, so take whatever it gives.
  const res = await fetch(track.url, { signal: timed() });
  if (!res.ok) throw new Upstream(`timedtext ${res.status}`);
  return parseTrack(await res.text());
}

async function load(id: string, lang: string): Promise<Payload> {
  const key = `${id}:${lang}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.payload;

  let found: Awaited<ReturnType<typeof fromPlayerApi>> | null = null;
  try {
    found = await fromPlayerApi(id);
  } catch (err) {
    console.warn('[captions] player API', id, err);
  }
  // A bot check or a refused client answers with no tracks rather than an error.
  if (!found || !found.tracks.length) {
    try {
      const page = await fromWatchPage(id);
      if (page.tracks.length || !found) found = page;
    } catch (err) {
      console.warn('[captions] watch page', id, err);
      if (!found) throw new Upstream('YouTube could not be reached.');
    }
  }
  if (!found.title && !found.tracks.length && found.status && found.status !== 'OK') {
    throw new Upstream(`playability ${found.status}`);
  }

  const chosen = pickTrack(found.tracks, lang);
  const lines = chosen ? await fetchLines(chosen) : [];
  const strip = ({ lang, name, auto }: SourceTrack): CaptionTrack => ({ lang, name, auto });
  const payload: Payload = {
    video: { id, title: found.title },
    track: chosen ? strip(chosen) : null,
    tracks: found.tracks.map(strip),
    lines,
  };
  // Only a real answer is kept: an empty one may be a refusal that passes.
  if (lines.length) {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), payload });
  }
  return payload;
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const sub = parts.slice(parts.lastIndexOf('captions') + 1).join('/');
  if (sub !== '' || req.method !== 'GET') return jsonResponse(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });

  const id = videoIdOf((url.searchParams.get('video') ?? '').slice(0, 300));
  if (!id) return jsonResponse(400, { error: 'That doesn’t look like a YouTube link.' });
  const lang = (url.searchParams.get('lang') || 'en').toLowerCase();
  if (!/^[a-z]{2,3}$/.test(lang)) return jsonResponse(400, { error: '"lang" must be a language code like "en".' });

  try {
    return jsonResponse(200, await load(id, lang));
  } catch (err) {
    console.error('[captions]', id, err);
    if (err instanceof Upstream) {
      return jsonResponse(502, { error: 'YouTube didn’t send the captions for this video. Paste the transcript instead.' });
    }
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
