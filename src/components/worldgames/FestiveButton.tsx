import { useIntl } from 'react-intl';
import { useFestive } from '../../hooks/useFestive';
import { PixelButton, PixelIcon } from './pixel';

// Lunar New Year over Huế: a lantern, lit while the decorations are up. A tap
// turns them on or off here and now — an explicit choice, so it leaves "Auto"
// (Settings → Festive decorations puts it back).

export function FestiveButton() {
  const intl = useIntl();
  const { active, setMode } = useFestive();
  const label = intl.formatMessage({ id: active ? 'world.festiveOff' : 'world.festiveOn' });
  return (
    <PixelButton
      tone={active ? 'gold' : 'paper'}
      onClick={() => setMode(active ? 'off' : 'on')}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className="!px-2.5 !py-0 !h-[2.6rem]"
    >
      <span className={active ? 'text-[#d42a2a]' : 'opacity-50'}><PixelIcon name="lantern" size={2} /></span>
    </PixelButton>
  );
}
