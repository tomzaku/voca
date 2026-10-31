import { useIntl } from 'react-intl';
import { LOCALES, useLocale } from '../../i18n/locale';
import { PixelButton } from './pixel';

// The world's interface language: EN | VI, the one in use lit. Same store as
// the app's QuickPrefs, so switching here switches everywhere. With only two
// languages a tap anywhere on it flips to the other.

export function LanguageButton() {
  const intl = useIntl();
  const { locale, setLocale } = useLocale();
  const next = LOCALES.find((l) => l.id !== locale) ?? LOCALES[0];
  const label = intl.formatMessage({ id: 'world.language' });
  return (
    <PixelButton
      tone="paper"
      onClick={() => void setLocale(next.id)}
      title={`${label} · ${next.label}`}
      aria-label={`${label}: ${LOCALES.find((l) => l.id === locale)?.label}. ${next.label}?`}
      className="!px-2.5 !py-0 !h-[2.6rem] !text-[13px] !gap-1"
    >
      {LOCALES.map((l, i) => (
        <span key={l.id} className="inline-flex items-center gap-1">
          {i > 0 && <span className="opacity-40">|</span>}
          <span lang={l.id} className={l.id === locale ? '' : 'opacity-40'}>{l.id.toUpperCase()}</span>
        </span>
      ))}
    </PixelButton>
  );
}
