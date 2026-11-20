import { registerSW } from 'virtual:pwa-register';

// Why this exists: the browser only re-checks sw.js on a real navigation (or
// once a day). An installed PWA that's brought back from the background is a
// *resume*, not a navigation — so after a deploy the old build kept running
// until the OS happened to cold-start the app, minutes or hours later.
//
// Here we ask for an update ourselves at launch and every time the app comes
// back to the foreground. src/sw.ts skips waiting, so the new worker takes over
// as soon as it has precached the new build. Checks happen only on resume (not
// on a timer), so a reload never interrupts someone mid-quiz.
//
// A launch usually already runs the new build — src/sw.ts serves index.html
// network-first — so when the new worker takes over we reload only if this
// page is still the old build (it started offline, or the network was slow).

// Don't re-fetch sw.js on every quick app switch.
const MIN_GAP_MS = 30_000;

/** Whether the active worker precached the build this page is running. */
async function isCurrentBuild(): Promise<boolean> {
  // The built index.html loads exactly one hashed entry chunk; its URL names
  // the build. Under `npm run dev` it's /src/main.tsx, never precached, so dev
  // keeps the old always-reload behaviour.
  const entry = document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src;
  const worker = (await navigator.serviceWorker.getRegistration())?.active;
  if (!entry || !worker) return false;

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    // A worker from before this check existed never answers — reload, as before.
    const timer = setTimeout(() => resolve(false), 1000);
    channel.port1.onmessage = (e) => {
      clearTimeout(timer);
      resolve(e.data === true);
    };
    worker.postMessage({ type: 'HAS_BUILD', url: entry }, [channel.port2]);
  });
}

export function startPwaUpdates() {
  if (!('serviceWorker' in navigator)) return;

  registerSW({
    immediate: true,
    onNeedReload() {
      void isCurrentBuild().then((current) => {
        if (!current) window.location.reload();
      });
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      let lastCheck = Date.now();

      const check = () => {
        if (document.visibilityState !== 'visible' || !navigator.onLine) return;
        if (Date.now() - lastCheck < MIN_GAP_MS) return;
        lastCheck = Date.now();
        registration.update().catch(() => {
          /* offline or server hiccup — the next resume tries again */
        });
      };

      document.addEventListener('visibilitychange', check);
      window.addEventListener('focus', check);
      window.addEventListener('online', check);
    },
  });
}
