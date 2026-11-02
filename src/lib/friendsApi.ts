// Client for the `friends` resource (supabase/functions/friends): asking,
// accepting, the list. Routes only.
//
// Loud by default — each is something the user just pressed. `friendStatuses`
// is quiet: it only decides how an "Add friend" button looks, and a list of
// learners is fine without it.

import { request } from './api';

export type FriendStatus = 'none' | 'friends' | 'sent' | 'received' | 'you';

export interface Person {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

export interface Friend extends Person {
  since: string;
  /** Their messages you haven't read. */
  unread: number;
}

export interface FriendRequest extends Person {
  at: string;
}

export interface FriendsList {
  friends: Friend[];
  /** They asked you. */
  incoming: FriendRequest[];
  /** You asked them. */
  outgoing: FriendRequest[];
}

export async function listFriends(): Promise<FriendsList> {
  return request.get<FriendsList>('/friends');
}

/** How each of these people stands with you — for the buttons on a list. Empty if it fails. */
export async function friendStatuses(ids: string[]): Promise<Record<string, FriendStatus>> {
  if (!ids.length) return {};
  const res = await request.get<{ statuses: Record<string, FriendStatus> }>('/friends/status', {
    params: { ids: ids.slice(0, 100).join(',') },
    quiet: true,
  });
  return res?.statuses ?? {};
}

/** Ask — or, if they'd already asked you, accept. */
export async function requestFriend(userId: string): Promise<FriendStatus> {
  return (await request.post<{ status: FriendStatus }>('/friends', { userId })).status;
}

export async function acceptFriend(userId: string): Promise<FriendStatus> {
  return (await request.post<{ status: FriendStatus }>('/friends/accept', { userId })).status;
}

/** Unfriend, decline, or take back a request. */
export async function removeFriend(userId: string): Promise<void> {
  await request.delete('/friends', { params: { userId } });
}
