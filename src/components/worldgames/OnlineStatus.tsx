import { FormattedMessage } from 'react-intl';
import { useAuth } from '../../hooks/useAuth';
import { PixelButton } from './pixel';

// Who you are and whether you're in the shared world, on your own menu.
// Signed in: your account — photo, name and email, as the Profile page reads
// them — online, where others can see you and ask you to play, and Sign out.
// Signed out: you're alone, and one tap signs you in (Google brings you
// straight back here).

export function OnlineStatus() {
  const { user, signInWithGoogle, signOut } = useAuth();

  if (!user) {
    return (
      <div className="px-inset px-notch p-3 mb-4 flex items-center gap-3">
        <span className="text-[20px] leading-none">⚪</span>
        <div className="flex-1 min-w-0">
          <p className="px-title !text-[14px]"><FormattedMessage id="world.liveOffline" /></p>
          <p className="text-[13px] text-[var(--px-muted)] leading-snug"><FormattedMessage id="world.liveSignIn" /></p>
        </div>
        <PixelButton tone="gold" onClick={() => void signInWithGoogle()} className="!px-3 !py-1.5 !text-[13px] shrink-0">
          <FormattedMessage id="world.liveSignInShort" />
        </PixelButton>
      </div>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const email = user.email ?? '';
  const name = (user.user_metadata?.full_name as string | undefined) || email.split('@')[0];
  return (
    <div className="px-inset px-notch p-3 mb-4">
      <div className="flex items-center gap-3">
        <span className="px-notch w-12 h-12 shrink-0 overflow-hidden bg-[#0d0a08] flex items-center justify-center">
          {avatarUrl
            // Google's photos refuse requests that carry a referrer.
            ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            : <span className="px-title !text-[20px] text-[var(--px-gold)]">{name.charAt(0).toUpperCase()}</span>}
        </span>
        <div className="flex-1 min-w-0">
          <p className="px-title !text-[16px] truncate">{name}</p>
          <p className="text-[13px] text-[var(--px-muted)] truncate">{email}</p>
        </div>
        <PixelButton tone="paper" onClick={() => void signOut()} className="!px-3 !py-1.5 !text-[13px] shrink-0">
          <FormattedMessage id="settings.signOut" />
        </PixelButton>
      </div>
      <p className="mt-2.5 flex items-center gap-2 text-[13px] text-[var(--px-muted)] leading-snug">
        <span className="leading-none">🟢</span>
        <span><span className="px-title !text-[13px] text-[var(--px-good)]"><FormattedMessage id="world.liveOnline" /></span> · <FormattedMessage id="world.liveOnlineBlurb" /></span>
      </p>
    </div>
  );
}
