import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { I18nProvider } from './i18n/I18nProvider';
import { useLocale } from './i18n/locale';
import { loadMessages } from './i18n/catalogs';

// Wait for a non-English catalog before the first paint, so a Vietnamese user
// never sees the English fallback flash. English is bundled and resolves at once;
// a failed load still renders, in English.
loadMessages(useLocale.getState().locale)
  .catch((err) => console.error('[i18n] catalog load failed', err))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <I18nProvider>
          <App />
        </I18nProvider>
      </StrictMode>,
    );
  });
