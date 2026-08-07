// Client for the `word-notes` resource — the notes under a word.
//
//   GET    /word-notes ?word=…   → { notes }
//   POST   /word-notes           → { note }
//   DELETE /word-notes/:id       → { ok }
//
// Reading is quiet (no notes is a fine thing to show); writing throws, so the
// UI can tell someone their note didn't post.

import { request } from './api';

export interface Note {
  id: string;
  word: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  isPrivate: boolean;
}

/** Notes on a word: everyone's public ones, plus your own private ones. */
export async function fetchNotes(word: string): Promise<Note[]> {
  const res = await request.get<{ notes: Note[] }>('/word-notes', {
    params: { word },
    quiet: true,
  });
  return res?.notes ?? [];
}

/** Post a note. The name it's signed with comes from your session. */
export async function postNote(word: string, content: string, isPrivate: boolean): Promise<Note> {
  const { note } = await request.post<{ note: Note }>('/word-notes', { word, content, isPrivate });
  return note;
}

/** Delete one of your own notes. */
export async function deleteNote(id: string): Promise<void> {
  await request.delete(`/word-notes/${id}`);
}
