import { create } from 'zustand';
import { loadMessages } from './catalogs';

// The interface language — separate from the language being learned and the
// mother language used for translations (src/lib/languages.ts). Those decide
// what words and translations are generated; this decides what the buttons say.

export type Locale = 'en' | 'vi';

export const LOCALES: { id: Locale; label: string; flag: string }[] = [
  // Each language is named in itself, so a user who can't read the current UI
  // can still find their own. Flags are Iconify icons rather than emoji, which
  // Windows renders as bare letters ("VN").
  { id: 'en', label: 'English', flag: 'circle-flags:us' },
  { id: 'vi', label: 'Tiếng Việt', flag: 'circle-flags:vn' },
];

const LOCALE_KEY = 'voca-ui-lang';

function isLocale(v: unknown): v is Locale {
  return v === 'en' || v === 'vi';
}

/** A saved choice wins; otherwise follow the browser (any vi-* → Vietnamese). */
function loadLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (isLocale(stored)) return stored;
  } catch { /* ignore */ }
  if (typeof navigator !== 'undefined') {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
    if (langs.some((l) => l?.toLowerCase().startsWith('vi'))) return 'vi';
  }
  return 'en';
}

function applyDom(locale: Locale) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
}

interface LocaleState {
  locale: Locale;
  /** Switches once `l`'s catalog has loaded, so nothing renders half-translated. */
  setLocale: (l: Locale) => Promise<void>;
}

const initialLocale: Locale = typeof window === 'undefined' ? 'en' : loadLocale();
applyDom(initialLocale);

export const useLocale = create<LocaleState>((set) => ({
  locale: initialLocale,
  setLocale: async (l) => {
    await loadMessages(l);
    try { localStorage.setItem(LOCALE_KEY, l); } catch { /* ignore */ }
    applyDom(l);
    set({ locale: l });
  },
}));
