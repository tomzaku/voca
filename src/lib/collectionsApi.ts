// Client for the `collections` resource — the word lists a user owns and the
// ones they've joined. Nothing else should touch `collections` or
// `collection_members` (see CLAUDE.md).
//
//   GET    /collections             → { mine, joined }
//   POST   /collections             → { collection }
//   GET    /collections/:id         → { collection }
//   PATCH  /collections/:id         → { collection }
//   DELETE /collections/:id         → { ok }
//   POST   /collections/:id/join    → { ok }
//   GET    /collections/:id/members → { members }
//
// Reads are quiet — the store caches collections in localStorage and shows
// that copy when the server can't be reached. Writes throw, because a create
// or rename that silently didn't happen is worse than an error message.

import { ApiError, request } from './api';

export interface Collection {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  words: string[];
  isPublic: boolean;
  memberCount: number;
}

/** One member of a shared collection, with how far through it they are. */
export interface MemberProgress {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  done: number;
  total: number;
}

/** Everything the user can see: what they own, and what they've joined. */
export async function fetchCollections(): Promise<{ mine: Collection[]; joined: Collection[] } | null> {
  return await request.get<{ mine: Collection[]; joined: Collection[] }>('/collections', { quiet: true });
}

/** One collection by id — what a shared link opens. Null if it isn't visible. */
export async function fetchCollection(id: string): Promise<Collection | null> {
  const res = await request.get<{ collection: Collection }>(`/collections/${id}`, { quiet: true });
  return res?.collection ?? null;
}

/** Create a list owned by the caller. Throws ApiError with the server's message. */
export async function createCollection(name: string, words: string[]): Promise<Collection> {
  const { collection } = await request.post<{ collection: Collection }>('/collections', { name, words });
  return collection;
}

/**
 * Change a list. Only the fields passed are written, so a rename can't blank
 * the words. Throws ApiError.
 */
export async function updateCollection(
  id: string,
  patch: { name?: string; words?: string[]; isPublic?: boolean },
): Promise<Collection> {
  const { collection } = await request.patch<{ collection: Collection }>(`/collections/${id}`, patch);
  return collection;
}

/** Delete a list. Idempotent — deleting one that's already gone succeeds. */
export async function deleteCollection(id: string): Promise<void> {
  await request.delete(`/collections/${id}`);
}

/**
 * Count the caller as a learner of this list. Idempotent, and quiet: it's a
 * side effect of picking a collection to study, never something to interrupt
 * that with.
 */
export async function joinCollection(id: string): Promise<void> {
  await request.post(`/collections/${id}/join`, undefined, { quiet: true });
}

/** Members of a shared list and their progress. Empty when unreachable. */
export async function fetchMembers(id: string): Promise<MemberProgress[]> {
  const res = await request.get<{ members: MemberProgress[] }>(`/collections/${id}/members`, { quiet: true });
  return res?.members ?? [];
}

export { ApiError };
