// Client for the `collections` resource — the word lists a user owns and the
// ones they've joined. Nothing else should touch `collections` or
// `collection_members` (see CLAUDE.md).
//
//   GET    /collections             → { mine, joined }
//   POST   /collections             → { collection }
//   GET    /collections/:id         → { collection, owner }
//   PATCH  /collections/:id         → { collection }
//   DELETE /collections/:id         → { ok }
//   POST   /collections/:id/join    → { ok }
//   GET    /collections/:id/members → { members }  ranked, most words known first
//   GET    /collections/:id/invite  → { invite }   open to signed-out visitors
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

/** Who made a list — display name and avatar only, never the email. */
export interface CollectionOwner {
  name: string | null;
  avatarUrl: string | null;
}

/** What a share link shows a visitor before they sign in. */
export interface CollectionInvite {
  name: string;
  description: string | null;
  wordCount: number;
  /** The first few words, enough to see what the list is about. */
  sampleWords: string[];
  memberCount: number;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
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

/** One collection plus who made it — what the detail page shows. Null if it isn't visible. */
export async function fetchCollectionDetail(
  id: string,
): Promise<{ collection: Collection; owner: CollectionOwner } | null> {
  return await request.get<{ collection: Collection; owner: CollectionOwner }>(`/collections/${id}`, { quiet: true });
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

/** Members of a shared list and their progress, best first. Empty when unreachable. */
export async function fetchMembers(id: string): Promise<MemberProgress[]> {
  const res = await request.get<{ members: MemberProgress[] }>(`/collections/${id}/members`, { quiet: true });
  return res?.members ?? [];
}

/** Who shared a public list. Works signed out; null if it isn't public. */
export async function fetchInvite(id: string): Promise<CollectionInvite | null> {
  const res = await request.get<{ invite: CollectionInvite }>(`/collections/${id}/invite`, {
    allowAnon: true,
    quiet: true,
  });
  return res?.invite ?? null;
}

export { ApiError };
