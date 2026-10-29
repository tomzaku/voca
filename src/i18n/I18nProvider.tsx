import type { ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import { useLocale } from './locale';
import { messagesFor, DEFAULT_LOCALE, onError } from './index';

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocale((s) => s.locale);
  return (
    <IntlProvider locale={locale} defaultLocale={DEFAULT_LOCALE} messages={messagesFor(locale)} onError={onError}>
      {children}
    </IntlProvider>
  );
}
