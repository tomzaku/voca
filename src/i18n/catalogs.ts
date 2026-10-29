import type { Locale } from './locale';

// Catalogs are split by area — one file per feature under messages/<locale>/ —
// and picked up by glob, so adding an area never means editing this file.
// English is the source of truth: each vi file is typed against its en twin,
// so a missing or stray key is a type error rather than a blank in the UI.
//
// English ships in the main bundle (it's the fallback for every locale);
// other locales are a separate chunk loaded on first use, so the app shell
// doesn't carry every language at once.

export type Catalog = Record<string, string>;

type CatalogModule = { default: Catalog };

function merge(modules: Record<string, CatalogModule>): Catalog {
  const out: Catalog = {};
  for (const [path, mod] of Object.entries(modules)) {
    for (const [id, msg] of Object.entries(mod.default)) {
      if (import.meta.env.DEV && id in out) console.warn(`[i18n] duplicate id "${id}" in ${path}`);
      out[id] = msg;
    }
  }
  return out;
}

const loaders: Record<Exclude<Locale, 'en'>, () => Promise<Record<string, CatalogModule>>> = {
  vi: async () => {
    const files = import.meta.glob<CatalogModule>('./messages/vi/*.ts');
    const entries = await Promise.all(Object.entries(files).map(async ([p, load]) => [p, await load()] as const));
    return Object.fromEntries(entries);
  },
};

export const MESSAGES: Partial<Record<Locale, Catalog>> = {
  en: merge(import.meta.glob<CatalogModule>('./messages/en/*.ts', { eager: true })),
};

/** Resolves once `locale`'s catalog is in MESSAGES. Safe to call repeatedly. */
export async function loadMessages(locale: Locale): Promise<void> {
  if (MESSAGES[locale] || locale === 'en') return;
  MESSAGES[locale] = merge(await loaders[locale]());
}
