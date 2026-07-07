/** True on small screens — below Tailwind's `sm` breakpoint (640px). */
export function isMobile(): boolean {
  return window.matchMedia('(max-width: 639px)').matches;
}
