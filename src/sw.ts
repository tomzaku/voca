/// <reference lib="webworker" />

// Custom service worker. We build with vite-plugin-pwa's `injectManifest`
// strategy rather than `generateSW` for one reason: push notifications need a
// `push` listener, and a generated worker has nowhere to put one.
//
// Everything above the push section reproduces what `generateSW` used to emit
// (precache the shell + serve index.html for SPA navigations) — if you change
// the precache config in vite.config.ts, this file is what consumes it.

import { NavigationRoute, registerRoute } from 'workbox-routing';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';

// This file is a module, so the declaration shadows the global `self` at module
// scope rather than clashing with the WorkerGlobalScope one. Note that
// `self.__WB_MANIFEST` below must appear *verbatim* — workbox-build injects the
// precache manifest by string-matching it, so aliasing `self` breaks the build.
declare let self: ServiceWorkerGlobalScope;

// ─── Precache (unchanged behaviour) ──────────────────────────────────

cleanupOutdatedCaches();
const manifest = self.__WB_MANIFEST;
precacheAndRoute(manifest);

// ─── App shell: network first ────────────────────────────────────────
//
// GitHub Pages has no SPA rewrite, so every navigation (deep links like
// /quiz/123 included) is answered with index.html.
//
// It used to come straight from the precache. That made every launch after a
// deploy run the *old* build until this worker had downloaded the entire new
// one in the background (megabytes of chunks) and reloaded the page — 10–30 s
// of the stale app. Now the shell comes from the network when it answers
// quickly, so the new build starts at once: its hashed chunks aren't in the old
// precache, so they fall through to the network too. Offline, or on a
// connection too slow to wait for, the precached shell still starts the app.

const SHELL_TIMEOUT_MS = 3000;
const precachedShell = createHandlerBoundToURL('index.html');

registerRoute(
  new NavigationRoute(async (options) => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), SHELL_TIMEOUT_MS);
    try {
      // `no-cache` revalidates against the server instead of trusting the HTTP
      // cache — Pages sends max-age=600, which would hide a deploy for 10 min.
      const res = await fetch(new URL('index.html', self.registration.scope), {
        cache: 'no-cache',
        signal: abort.signal,
      });
      if (res.ok) return res;
    } catch {
      /* offline or too slow — use the precached shell */
    } finally {
      clearTimeout(timer);
    }
    return precachedShell(options);
  }),
);

// The page asks this when a new worker takes over: "is the build I'm running
// the one you precached?" If the shell came from the network it already is,
// and reloading would only flash the screen; if it came from an old precache,
// the page must reload before it lazy-loads chunks that no longer exist.
const precachedUrls = new Set(
  manifest.map((e) => new URL(typeof e === 'string' ? e : e.url, self.registration.scope).href),
);

self.addEventListener('message', (event) => {
  const data = event.data as { type?: string; url?: string } | null;
  if (data?.type !== 'HAS_BUILD' || typeof data.url !== 'string') return;
  event.ports[0]?.postMessage(precachedUrls.has(new URL(data.url).href));
});

// `registerType: 'autoUpdate'` relies on the worker activating immediately
// instead of waiting for every tab to close. generateSW injected these; with
// injectManifest they're ours to declare.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Push notifications ──────────────────────────────────────────────

/**
 * Payload shape sent by the `notify` edge function.
 *
 * `action` names which kind of notification this is (see the ACTIONS table in
 * supabase/functions/notify/index.ts). It's carried so the worker can group and
 * route by intent rather than inferring it from the copy — and so a future
 * action type needs no change here.
 */
interface PushPayload {
  action: string;
  title: string;
  body: string;
  url: string;
}

// Only shown if a push arrives with a missing or unparseable body — the server
// normally names an actual word. Kept in the same warm register so a rare
// fallback doesn't read like a different app.
const FALLBACK: PushPayload = {
  action: 'review_word',
  title: 'A word is waiting for you',
  body: 'Got a minute to make it stick?',
  // The server normally sends a deep link to a specific card; with no payload
  // to read, home is the only honest destination.
  url: '/',
};

self.addEventListener('push', (event) => {
  // A push with no/non-JSON body still shows something rather than nothing —
  // Chrome fires a generic "site updated in background" notice otherwise.
  let payload = FALLBACK;
  try {
    if (event.data) payload = { ...FALLBACK, ...(event.data.json() as Partial<PushPayload>) };
  } catch {
    /* keep the fallback */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      // Group per action, not globally: a later review reminder should replace
      // an earlier one rather than stacking a week of unread nags — but it must
      // not silently swallow an unrelated notification of a different kind.
      tag: `voca-${payload.action}`,
      data: { url: payload.url, action: payload.action },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | null)?.url ?? FALLBACK.url;

  // Focus an already-open Voca tab if there is one; only open a new window as
  // a last resort, so tapping the reminder doesn't pile up duplicate tabs.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          void client.navigate(url).catch(() => undefined);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

export {};
