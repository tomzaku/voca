import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Replays must not reach the speech function at all — that's the point of the
// device cache — and any failure in it must still leave something playable.

const speechUrl = vi.fn<(text: string, voice: string, ipa?: string) => Promise<string | null>>();
vi.mock('./speechApi', () => ({ speechUrl: (t: string, v: string, ipa?: string) => speechUrl(t, v, ipa) }));

const { getClip, warmClip } = await import('./speechCache');

/** Just enough of Cache Storage: one named cache, keyed by URL string. */
function fakeCaches() {
  const store = new Map<string, Response>();
  const cache = {
    match: async (k: string) => store.get(k)?.clone(),
    put: async (k: string, r: Response) => { store.set(k, r); },
    keys: async () => [...store.keys()].map((k) => new Request(k)),
    delete: async (k: Request | string) => store.delete(typeof k === 'string' ? k : k.url),
  };
  return { store, api: { open: async () => cache } };
}

const fetchMock = vi.fn<(url: string) => Promise<Response>>();
/** Downloads of a server clip, leaving out the recordings-CDN lookups. */
const serverDownloads = () => fetchMock.mock.calls.filter(([u]) => !u.includes('cloudfront.net')).length;

beforeEach(() => {
  speechUrl.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  // The recordings CDN has nothing unless a test says so; the server's clip URL plays.
  fetchMock.mockImplementation(async (url: string) => url.includes('cloudfront.net')
    ? new Response(null, { status: 404 })
    : new Response(new Blob(['mp3'], { type: 'audio/mpeg' })));
  speechUrl.mockResolvedValue('https://cdn.example/clip.mp3');
});
afterEach(() => vi.unstubAllGlobals());

describe('getClip', () => {
  it('fetches once, then replays from the device without calling the server', async () => {
    const { store, api } = fakeCaches();
    vi.stubGlobal('caches', api);

    const first = await getClip('serendipity', 'female');
    expect(first?.owned).toBe(true);
    expect(speechUrl).toHaveBeenCalledTimes(1);
    expect(store.size).toBe(1);

    const again = await getClip('  serendipity ', 'female'); // same text once normalized
    expect(again?.owned).toBe(true);
    expect(speechUrl).toHaveBeenCalledTimes(1);
    expect(serverDownloads()).toBe(1);
  });

  it('keeps voices apart', async () => {
    vi.stubGlobal('caches', fakeCaches().api);
    await getClip('serendipity', 'female');
    await getClip('serendipity', 'male');
    expect(speechUrl).toHaveBeenCalledTimes(2);
  });

  it('keeps each reading of a word apart, and asks the server for the one meant', async () => {
    vi.stubGlobal('caches', fakeCaches().api);
    await getClip('live', 'female', 'lˈɪv');
    await getClip('live', 'female', 'lˈaɪv');
    await getClip('live', 'female', 'lˈɪv');
    expect(speechUrl.mock.calls).toEqual([['live', 'female', 'lˈɪv'], ['live', 'female', 'lˈaɪv']]);
  });

  it('plays a pre-recorded clip straight from the CDN, without asking the server', async () => {
    const { store, api } = fakeCaches();
    vi.stubGlobal('caches', api);
    fetchMock.mockImplementation(async () => new Response(new Blob(['kokoro'], { type: 'audio/mpeg' })));

    const clip = await getClip('live', 'female', 'lˈɪv');
    expect(clip?.owned).toBe(true);
    expect(speechUrl).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][0]).toMatch(/cloudfront\.net\/kokoro-af_heart\/[0-9a-f]{64}\.mp3$/);
    expect(store.size).toBe(1);
  });

  it('only looks for recordings of voices that have them', async () => {
    vi.stubGlobal('caches', fakeCaches().api);
    await getClip('serendipity', 'en-US-Chirp3-HD-Kore');
    expect(fetchMock.mock.calls.some(([u]) => u.includes('cloudfront.net'))).toBe(false);
    expect(speechUrl).toHaveBeenCalledTimes(1);
  });

  it('returns null when the server has no clip, so the caller uses the device voice', async () => {
    vi.stubGlobal('caches', fakeCaches().api);
    speechUrl.mockResolvedValue(null);
    expect(await getClip('serendipity', 'female')).toBeNull();
  });

  it('plays the URL directly when Cache Storage is unavailable', async () => {
    vi.stubGlobal('caches', undefined);
    expect(await getClip('serendipity', 'female')).toEqual({ src: 'https://cdn.example/clip.mp3', owned: false });
    expect(serverDownloads()).toBe(0);
  });

  it('falls back to the URL when the download fails', async () => {
    vi.stubGlobal('caches', fakeCaches().api);
    fetchMock.mockRejectedValue(new Error('offline'));
    expect(await getClip('serendipity', 'female')).toEqual({ src: 'https://cdn.example/clip.mp3', owned: false });
  });

  it('a read that catches up with a warm-up shares its request', async () => {
    const { api } = fakeCaches();
    vi.stubGlobal('caches', api);
    const [, a, b] = await Promise.all([warmClip('next line', 'male'), getClip('next line', 'male'), getClip('next line', 'male')]);
    expect(speechUrl).toHaveBeenCalledTimes(1);
    expect(serverDownloads()).toBe(1);
    // Each caller revokes its own blob URL, so they mustn't share one.
    expect(a?.owned && b?.owned).toBe(true);
    expect(a?.src).not.toBe(b?.src);
  });
});
