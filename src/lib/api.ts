// One HTTP client for every edge function.
//
// Each resource module (progressApi, pickApi, …) was carrying its own copy of
// the same twenty lines: read the session, set apikey + bearer, JSON in, JSON
// out, time out, unwrap the error. This is that, once.
//
//   request.get('/progress', { params: { limit: 50 } })
//   request.post('/progress', { progress, event })
//   request.delete('/progress', { params: { word } })
//
// Paths are relative to /functions/v1, so '/progress/count' is the whole route.
//
// A call throws ApiError by default, carrying the server's own message — for
// failures the user should see. Pass `quiet: true` to get null instead, for
// calls with a local fallback where a failure should pass unnoticed:
//
//   request.get('/progress/count', { quiet: true })   // → T | null
//
// The flag sits at the call site on purpose: whether a failure is survivable is
// a fact about that call, not about the client.

import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const DEFAULT_TIMEOUT_MS = 8000;

/** A failed call: the HTTP status, and the server's `error` where it sent one. */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Query-string values. `undefined` and `''` are dropped, not sent empty. */
export type Params = Record<string, string | number | boolean | undefined | null>;

export interface Options {
  params?: Params;
  /** Milliseconds before the call is abandoned. Defaults to 8s. */
  timeout?: number;
  /** Caller's own cancellation — combined with the timeout, not replacing it. */
  signal?: AbortSignal;
  /** Resolve to null on failure instead of throwing. Needs a local fallback. */
  quiet?: boolean;
}

type Quiet = Options & { quiet: true };
type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

function url(path: string, params?: Params): string {
  const u = new URL(`${SUPABASE_URL}/functions/v1${path}`);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  }
  return u.toString();
}

/** The caller's signal and the timeout, whichever fires first. */
function signalFor(opts: Options): AbortSignal {
  const timeout = AbortSignal.timeout(opts.timeout ?? DEFAULT_TIMEOUT_MS);
  if (!opts.signal) return timeout;
  // AbortSignal.any is recent enough to be worth a guard; without it the
  // caller's own cancellation wins and the timeout is the fallback.
  return typeof AbortSignal.any === 'function'
    ? AbortSignal.any([opts.signal, timeout])
    : opts.signal;
}

async function send<T>(method: Method, path: string, body: unknown, opts: Options): Promise<T> {
  if (!supabase) throw new ApiError(0, 'Not connected.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new ApiError(401, 'Please sign in.');

  let response: Response;
  try {
    response = await fetch(url(path, opts.params), {
      method,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: signalFor(opts),
    });
  } catch {
    // Offline, DNS, CORS, timeout — nothing came back to read a status from.
    throw new ApiError(0, "Couldn't reach the server.");
  }

  // Parsed before the status check: an error body carries the message worth
  // showing, and a 204 or an HTML error page must not blow up here.
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data as { error?: string } | null)?.error;
    throw new ApiError(response.status, message || `Request failed (${response.status}).`);
  }
  return data as T;
}

/** `quiet` turns any failure into a null, with one line in the console. */
async function run<T>(method: Method, path: string, body: unknown, opts: Options): Promise<T | null> {
  if (!opts.quiet) return await send<T>(method, path, body, opts);
  try {
    return await send<T>(method, path, body, opts);
  } catch (err) {
    const status = err instanceof ApiError && err.status ? ` ${err.status}` : '';
    console.warn(`[voca] ${method} ${path}${status}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// The overloads are what make `quiet: true` visible in the type: with it a call
// resolves to `T | null`, without it to `T`.
function get<T>(path: string, opts: Quiet): Promise<T | null>;
function get<T>(path: string, opts?: Options): Promise<T>;
function get<T>(path: string, opts: Options = {}) {
  return run<T>('GET', path, undefined, opts);
}

function post<T>(path: string, body: unknown, opts: Quiet): Promise<T | null>;
function post<T>(path: string, body?: unknown, opts?: Options): Promise<T>;
function post<T>(path: string, body?: unknown, opts: Options = {}) {
  return run<T>('POST', path, body, opts);
}

function patch<T>(path: string, body: unknown, opts: Quiet): Promise<T | null>;
function patch<T>(path: string, body?: unknown, opts?: Options): Promise<T>;
function patch<T>(path: string, body?: unknown, opts: Options = {}) {
  return run<T>('PATCH', path, body, opts);
}

function del<T>(path: string, opts: Quiet): Promise<T | null>;
function del<T>(path: string, opts?: Options): Promise<T>;
function del<T>(path: string, opts: Options = {}) {
  return run<T>('DELETE', path, undefined, opts);
}

export const request = { get, post, patch, delete: del };
