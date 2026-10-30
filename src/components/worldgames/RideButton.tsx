import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { drawRide, type Ride } from '../../game/vehicles';
import type { Look } from '../../game/wardrobe';
import { LookSprite } from './LookSprite';
import { PixelButton } from './pixel';

// The world's ride switch: walk, a bicycle, or a xích lô — the button shows
// the one you're on, drawn from the same pixel art the city rides (and your
// buddy on foot when walking). B does the same from the keyboard.

export function RideButton({ ride, look, onNext }: { ride: Ride; look: Look; onNext: () => void }) {
  const intl = useIntl();
  const src = useMemo(() => (ride === 'walk' ? null : drawRide(ride, 0).toDataURL()), [ride]);
  const label = intl.formatMessage({ id: `world.ride.${ride}` });
  return (
    <PixelButton
      tone={ride === 'walk' ? 'paper' : 'gold'}
      onClick={onNext}
      title={`${label} · ${intl.formatMessage({ id: 'world.rideHint' })}`}
      aria-label={label}
      className="!px-2.5 !py-1.5 !h-[2.6rem]"
    >
      {src
        ? <img src={src} alt="" className="h-6 w-auto" style={{ imageRendering: 'pixelated' }} />
        : <LookSprite look={look} scale={1.4} />}
      <span className="hidden sm:inline">{label}</span>
    </PixelButton>
  );
}
