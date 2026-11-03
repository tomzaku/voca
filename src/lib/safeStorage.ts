import type { StateStorage } from 'zustand/middleware';
import { evictDoodles } from './doodles';

// localStorage for the persisted stores, made safe to write to.
//
// A plain `localStorage.setItem` throws once the ~5MB quota is full, and
// zustand's persist calls it inside `set()` — so the throw lands in whatever
// action changed the state. A full disk once froze the flash card on "Correct!":
// `markWord` threw before the card could reveal, and before the answer reached
// the server. Here a full quota first frees the doodle cache (every thumbnail
// is a free re-fetch from the server) and tries again; if it still doesn't fit,
// the write is dropped with a warning and the app carries on from memory.

function isQuotaError(e: unknown): boolean {
  return e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
}

export const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try { return localStorage.getItem(name); } catch { return null; }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
      return;
    } catch (e) {
      if (!isQuotaError(e)) { console.warn(`[storage] couldn't save ${name}`, e); return; }
    }
    evictDoodles();
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      console.warn(`[storage] ${name} doesn't fit in localStorage even after freeing doodles`, e);
    }
  },
  removeItem: (name) => {
    try { localStorage.removeItem(name); } catch { /* storage unavailable */ }
  },
};
