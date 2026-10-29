import { createIntl, createIntlCache, type IntlShape } from 'react-intl';
import { useLocale, type Locale } from './locale';
import { MESSAGES } from './catalogs';

export type { Catalog } from './catalogs';

export const DEFAULT_LOCALE: Locale = 'en';

/** The loaded catalog for `locale`, or English while it's still loading. */
export function messagesFor(locale: Locale) {
  return MESSAGES[locale] ?? MESSAGES.en!;
}

const cache = createIntlCache();
const intls = new Map<Locale, IntlShape>();

/**
 * The intl object for the current locale, for code that runs outside React —
 * toasts fired from hooks/lib, notifications, `document.title`. Components use
 * `useIntl()` instead so they re-render when the language changes.
 */
export function getIntl(): IntlShape {
  const locale = useLocale.getState().locale;
  let intl = intls.get(locale);
  if (!intl) {
    intl = createIntl({ locale, defaultLocale: DEFAULT_LOCALE, messages: messagesFor(locale), onError }, cache);
    // Don't pin the English stand-in for a catalog that's still loading.
    if (MESSAGES[locale]) intls.set(locale, intl);
  }
  return intl;
}

/** Shorthand for `getIntl().formatMessage({ id }, values)` outside React. */
export function t(id: string, values?: Record<string, string | number | Date>): string {
  return getIntl().formatMessage({ id }, values);
}

// Missing translations fall back to English (or the id) on their own; only
// log them in dev, and keep real formatting errors loud everywhere.
export function onError(err: { code?: string; message: string }) {
  if (err.code === 'MISSING_TRANSLATION') {
    if (import.meta.env.DEV) console.warn(`[i18n] ${err.message}`);
    return;
  }
  console.error(err);
}
