/** True on small screens — below Tailwind's `sm` breakpoint (640px). */
export function isMobile(): boolean {
  return window.matchMedia('(max-width: 639px)').matches;
}

/**
 * True on Apple platforms, where the shortcut modifier is ⌘ and not Ctrl.
 *
 * `navigator.platform` is deprecated but remains the only signal every browser
 * agrees on — `userAgentData` is Chromium-only, and sniffing the user agent for
 * "Mac" catches iPadOS pretending to be a desktop.
 */
export function isApple(): boolean {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

/**
 * True on iOS/iPadOS specifically — unlike `isApple`, which also matches macOS.
 * This matters for push: Safari on iOS only exposes the Push API to apps
 * installed on the Home Screen, a restriction macOS Safari doesn't have.
 *
 * Modern iPadOS reports itself as "MacIntel", so a touch-capable Mac is really
 * an iPad.
 */
export function isIos(): boolean {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** True when running as an installed PWA rather than in a browser tab. */
export function isStandalone(): boolean {
  return (
    // The manifest asks for `fullscreen` first and falls back to `standalone`,
    // so an installed app can report either.
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    // iOS Safari's own non-standard flag — the only signal it gives.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
