import { useIntl } from 'react-intl';
import { useTheme } from '../../hooks/useTheme';
import { PixelButton, PixelIcon } from './pixel';

// Day or night over Huế: sun | moon, the one in use lit — the app's own
// light and dark theme (useTheme), which the world follows, lamps and all.
// A tap flips to the other.

export function DayNightButton() {
  const intl = useIntl();
  const { theme, toggleTheme } = useTheme();
  const label = intl.formatMessage({ id: 'world.dayNight' });
  return (
    <PixelButton
      tone="paper"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      aria-pressed={theme === 'dark'}
      className="!px-2.5 !py-0 !h-[2.6rem] !gap-1.5"
    >
      <span className={theme === 'light' ? 'text-[var(--px-gold)]' : 'opacity-40'}><PixelIcon name="sun" size={2} /></span>
      <span className="opacity-40">|</span>
      <span className={theme === 'dark' ? 'text-[var(--px-sky)]' : 'opacity-40'}><PixelIcon name="moon" size={2} /></span>
    </PixelButton>
  );
}
