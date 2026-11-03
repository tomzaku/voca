import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Replays must not reach the speech function at all — that's the point of the
// device cache — and any failure in it must still leave something playable.

const speechUrl = vi.fn<(text: string, voice: string) => Promise<string | null>>();
vi.mock('./speechApi', () => ({ speechUrl: (t: string, v: string) => speechUrl(t, v) }));

const { getClip } = await import('./speechCache');

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

beforeEach(() => {
  speechUrl.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue(new Response(new Blob(['mp3'], { type: 'audio/mpeg' })));
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps voices apart', async () => {
    vi.stubGlobal('caches', fakeCaches().api);
    await getClip('serendipity', 'female');
    await getClip('serendipity', 'male');
    expect(speechUrl).toHaveBeenCalledTimes(2);
  });

  it('returns null when the server has no clip, so the caller uses the device voice', async () => {
    vi.stubGlobal('caches', fakeCaches().api);
    speechUrl.mockResolvedValue(null);
    expect(await getClip('serendipity', 'female')).toBeNull();
  });

  it('plays the URL directly when Cache Storage is unavailable', async () => {
    vi.stubGlobal('caches', undefined);
    expect(await getClip('serendipity', 'female')).toEqual({ src: 'https://cdn.example/clip.mp3', owned: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back to the URL when the download fails', async () => {
    vi.stubGlobal('caches', fakeCaches().api);
    fetchMock.mockRejectedValue(new Error('offline'));
    expect(await getClip('serendipity', 'female')).toEqual({ src: 'https://cdn.example/clip.mp3', owned: false });
  });
});
