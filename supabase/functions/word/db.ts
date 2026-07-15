// Database plumbing shared by the `word` function's cache modules.

// The supabase-js query builders are deeply generic and we have no generated
// table types here; `any` keeps the cache modules readable.
// deno-lint-ignore no-explicit-any
export type Svc = any;

type EdgeRuntime = { waitUntil(p: Promise<unknown>): void };

/**
 * Keep a promise alive past the response. Cache writes are all fire-and-forget —
 * the user shouldn't wait on them — but the isolate can be frozen the moment we
 * respond, so without this the write may never land.
 */
export function keepAlive(p: Promise<unknown>): void {
  const rt = (globalThis as unknown as { EdgeRuntime?: EdgeRuntime }).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(p);
}

/** Run a cache write without blocking the response, logging (not throwing) failures. */
export function fireAndForget(query: PromiseLike<{ error: unknown }>): void {
  keepAlive(
    Promise.resolve(query).then((res) => {
      if (res.error) console.warn('[word] cache write failed:', res.error);
    }),
  );
}
