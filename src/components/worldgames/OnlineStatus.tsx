import { FormattedMessage } from 'react-intl';
import { useAuth } from '../../hooks/useAuth';
import { PixelButton } from './pixel';

// Whether you're in the shared world, on your own menu: signed in, others
// can see you and ask you to play; signed out, you're alone — and one tap
// signs you in (Google brings you straight back here), as one signs you out.

export function OnlineStatus() {
  const { user, signInWithGoogle, signOut } = useAuth();
  return (
    <div className="px-inset px-notch p-3 mb-4 flex items-center gap-3">
      <span className="text-[20px] leading-none">{user ? '🟢' : '⚪'}</span>
      <div className="flex-1 min-w-0">
        <p className="px-title !text-[14px]"><FormattedMessage id={user ? 'world.liveOnline' : 'world.liveOffline'} /></p>
        <p className="text-[13px] text-[var(--px-muted)] leading-snug">
          <FormattedMessage id={user ? 'world.liveOnlineBlurb' : 'world.liveSignIn'} />
        </p>
      </div>
      {user ? (
        <PixelButton tone="paper" onClick={() => void signOut()} className="!px-3 !py-1.5 !text-[13px] shrink-0">
          <FormattedMessage id="settings.signOut" />
        </PixelButton>
      ) : (
        <PixelButton tone="gold" onClick={() => void signInWithGoogle()} className="!px-3 !py-1.5 !text-[13px] shrink-0">
          <FormattedMessage id="world.liveSignInShort" />
        </PixelButton>
      )}
    </div>
  );
}
