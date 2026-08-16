// Client for the `me` resource — what the server knows about the signed-in
// user beyond what their session already carries.
//
//   GET /me → { isPro, proExpiresAt, isTrial }
//
// Identity (id, email, name, avatar) is NOT here: it comes from the auth
// session, which the SDK decodes from the token locally. Reading it costs
// nothing and can't fail, so it should never become a fetch. Use `useAuth()`
// for who the user is, and this for what their account is entitled to.
//
// Quiet — a failed read reads as "not Pro", which hides a teaser rather than
// breaking a page.

import { request } from './api';

/** Server-side facts about the caller. Grows with entitlements, not identity. */
export interface Me {
  isPro: boolean;
  /** ISO datetime the Pro grant ends, or null for lifetime (or no grant). */
  proExpiresAt: string | null;
  /** True while `isPro` is true only because of the automatic 5-day signup trial. */
  isTrial: boolean;
}

export async function fetchMe(): Promise<Me | null> {
  return await request.get<Me>('/me', { quiet: true });
}
