// Captions of a YouTube video, as timed lines to shadow — the Speak page's
// "Video Shadowing" plays a line of a song or a talk, pauses, and you say it
// back.
//
//   GET /captions?video=<id or URL>&lang=en
//     → 200 { video: { id, title }, track: CaptionTrack | null, tracks, lines }
//
// `lines` is `[]` with `track: null` when the video has no captions in `lang`;
// `tracks` then says which languages it does have. The client falls back to a
// transcript the learner pastes in, parsed on the device.
//
// The captions come from Supadata (supadata.ai), a transcript service, rather
// than from YouTube directly: YouTube refuses requests from cloud servers, and
// getting around that would mean evading its bot checks. `mode=native` asks
// only for captions the video already has — one credit each — never an
// AI-generated transcript, which is billed per minute. The title comes from
// YouTube's public oEmbed endpoint.
//
// Without SUPADATA_API_KEY only captions already stored come back; for any
// other video the route answers 503 and the app goes straight to the paste box.
//
// Signed-in only: every miss spends a credit. A video's captions don't
// change, so once fetched they're kept for good in `video_captions` (and in
// this instance's memory for a while) — each video costs one credit ever, and
// the sample videos open at once.
//
// Env:
//   SUPADATA_API_KEY   from https://dash.supadata.ai — `supabase secrets set`
//
// Deploy: `npm run deploy:captions`

import { corsHeaders, jsonResponse, requireUser, serviceClient } from '../_shared/ai.ts';
import { type CaptionLine, type CaptionTrack, fromSegments, videoIdOf } from '../_shared/captions.ts';

interface Payload {
  video: { id: string; title: string };
  track: CaptionTrack | null;
  tracks: CaptionTrack[];
  lines: CaptionLine[];
}

const SUPADATA = 'https://api.supadata.ai/v1';
const FETCH_TIMEOUT_MS = 10_000;
/** A long video is answered with a job to poll; this is how long to wait on it. */
const JOB_POLLS = 6;
const JOB_POLL_MS = 1500;
const CACHE_MAX = 300;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; payload: Payload }>();

/** The service failed in a way the learner can't fix — they paste instead. */
class Upstream extends Error {}

type Segment = { text?: string; offset?: number; duration?: number; lang?: string };
type Transcript = { content?: Segment[] | string; lang?: string; availableLangs?: string[] };

async function supadata(path: string, key: string): Promise<Response> {
  return await fetch(`${SUPADATA}${path}`, {
    headers: { 'x-api-key': key },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

/** The transcript, or null when the video has none. */
async function transcript(id: string, lang: string, key: string): Promise<Transcript | null> {
  const q = new URLSearchParams({ url: `https://www.youtube.com/watch?v=${id}`, lang, text: 'false', mode: 'native' });
  const res = await supadata(`/transcript?${q}`, key);
  // 206 is the service's "transcript unavailable"; 404 an unknown video.
  if (res.status === 206 || res.status === 404) return null;
  if (res.status === 202) {
    const { jobId } = await res.json() as { jobId?: string };
    if (!jobId) throw new Upstream('202 without a job id');
    return await awaitJob(jobId, key);
  }
  if (!res.ok) throw new Upstream(`transcript ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return await res.json() as Transcript;
}

async function awaitJob(jobId: string, key: string): Promise<Transcript | null> {
  for (let i = 0; i < JOB_POLLS; i++) {
    await new Promise((r) => setTimeout(r, JOB_POLL_MS));
    const res = await supadata(`/transcript/${encodeURIComponent(jobId)}`, key);
    if (!res.ok) throw new Upstream(`job ${res.status}`);
    const job = await res.json() as Transcript & { status?: string };
    if (job.status === 'completed') return job;
    if (job.status === 'failed') return null;
  }
  throw new Upstream('job still running');
}

/** The video's title from YouTube's public oEmbed — '' if it won't say. */
async function titleOf(id: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return '';
    return String((await res.json() as { title?: unknown }).title ?? '').slice(0, 200);
  } catch {
    return '';
  }
}

function remember(cacheKey: string, payload: Payload) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(cacheKey, { at: Date.now(), payload });
}

/** Captions fetched before, by anyone — null if never (or the table's unreachable). */
async function stored(id: string, lang: string): Promise<Payload | null> {
  const svc = serviceClient();
  if (!svc) return null;
  const { data, error } = await svc.from('video_captions')
    .select('title, track, tracks, lines').eq('video_id', id).eq('lang', lang).maybeSingle();
  if (error) console.warn('[captions] read', id, error.message);
  if (!data) return null;
  return { video: { id, title: data.title }, track: data.track, tracks: data.tracks, lines: data.lines };
}

async function store(id: string, lang: string, p: Payload) {
  const svc = serviceClient();
  if (!svc) return;
  const { error } = await svc.from('video_captions').upsert({
    video_id: id, lang, title: p.video.title, track: p.track, tracks: p.tracks, lines: p.lines,
  });
  // Not fatal: the learner has their captions; the next one pays again.
  if (error) console.warn('[captions] store', id, error.message);
}

async function load(id: string, lang: string, key: string | undefined): Promise<Payload | null> {
  const cacheKey = `${id}:${lang}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.payload;

  const kept = await stored(id, lang);
  if (kept) { remember(cacheKey, kept); return kept; }
  if (!key) return null;

  const [t, title] = await Promise.all([transcript(id, lang, key), titleOf(id)]);
  const tracks: CaptionTrack[] = (t?.availableLangs ?? []).map((l) => ({ lang: l, name: l, auto: false }));
  // Asked for `lang`, the service answers with the first language it has when
  // that one's missing — which isn't English to shadow.
  const got = t?.lang ?? '';
  const matches = got === lang || got.startsWith(`${lang}-`);
  const lines = matches && Array.isArray(t?.content)
    ? fromSegments(t.content
      .filter((s) => typeof s.text === 'string' && typeof s.offset === 'number')
      .map((s) => ({ start: s.offset! / 1000, end: (s.offset! + (s.duration ?? 0)) / 1000, text: s.text! })))
    : [];

  const payload: Payload = {
    video: { id, title },
    // The service doesn't say whether a track is a person's or speech
    // recognition's, so none is marked automatic.
    track: lines.length ? { lang: got, name: got, auto: false } : null,
    tracks,
    lines,
  };
  if (lines.length) {
    remember(cacheKey, payload);
    await store(id, lang, payload);
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
    // Without a key, captions fetched before still come back.
    const payload = await load(id, lang, Deno.env.get('SUPADATA_API_KEY'));
    if (!payload) return jsonResponse(503, { error: 'Automatic captions aren’t set up yet. Paste the transcript instead.' });
    return jsonResponse(200, payload);
  } catch (err) {
    console.error('[captions]', id, err);
    if (err instanceof Upstream || (err instanceof DOMException && err.name === 'TimeoutError')) {
      return jsonResponse(502, { error: 'Couldn’t get the captions for this video. Paste the transcript instead.' });
    }
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
