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
