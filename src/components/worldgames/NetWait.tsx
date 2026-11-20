import { FormattedMessage } from 'react-intl';
import type { PeerState } from '../../lib/peerLink';
import { PixelButton, PixelLoader } from './pixel';

// What a two-player action game shows while it has no direct line to the
// other browser (lib/peerLink is direct only): the game is paused, and either
// it's still connecting, or these two networks can't reach each other — said
// plainly, so a frozen screen never reads as lag. It keeps trying either way.
export function NetWait({ state, name, onLeave }: { state: PeerState; name: string; onLeave: () => void }) {
  if (state === 'failed') {
    return (
      <>
        <p className="text-[14px] mb-1.5"><FormattedMessage id="world.netFailed" values={{ name }} /></p>
        <p className="text-[12px] text-[var(--px-muted)] mb-3"><FormattedMessage id="world.netFailedHint" /></p>
        <PixelButton tone="jade" block onClick={onLeave}><FormattedMessage id="world.duelDone" /></PixelButton>
      </>
    );
  }
  return <PixelLoader label={<FormattedMessage id="world.netConnecting" values={{ name }} />} />;
}
