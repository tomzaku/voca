import { useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { useIntl } from 'react-intl';
import { acceptFriend, removeFriend, requestFriend, type FriendStatus } from '../lib/friendsApi';

/**
 * The small button on a learner's row: Add friend → Requested (tap to take
 * it back) → Friends ✓; or Accept, when they asked you first. Nothing for
 * yourself, or before the status is known.
 */
export function AddFriendButton({ userId, name, status, onChange }: {
  userId: string;
  name: string;
  status: FriendStatus | undefined;
  onChange: (s: FriendStatus) => void;
}) {
  const intl = useIntl();
  const [busy, setBusy] = useState(false);
  if (!status || status === 'you') return null;

  const act = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (status === 'none') {
        const s = await requestFriend(userId);
        onChange(s);
        toast.success(intl.formatMessage({ id: s === 'friends' ? 'friends.nowFriends' : 'friends.requestSent' }, { name }));
      } else if (status === 'received') {
        onChange(await acceptFriend(userId));
        toast.success(intl.formatMessage({ id: 'friends.nowFriends' }, { name }));
      } else if (status === 'sent') {
        await removeFriend(userId);
        onChange('none');
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const look: Record<Exclude<FriendStatus, 'you'>, { icon: string; label: string; cls: string }> = {
    none: { icon: 'lucide:user-plus', label: intl.formatMessage({ id: 'friends.add' }), cls: 'text-text-muted hover:text-accent-cyan hover:bg-accent-cyan/10' },
    sent: { icon: 'lucide:user-check', label: intl.formatMessage({ id: 'friends.requested' }), cls: 'text-accent-cyan/70' },
    received: { icon: 'lucide:user-plus', label: intl.formatMessage({ id: 'friends.accept' }), cls: 'text-accent-green bg-accent-green/10' },
    friends: { icon: 'lucide:users', label: intl.formatMessage({ id: 'friends.isFriend' }), cls: 'text-accent-green' },
  };
  const l = look[status];
  return (
    <button
      type="button"
      onClick={() => void act()}
      disabled={busy || status === 'friends'}
      title={status === 'sent' ? intl.formatMessage({ id: 'friends.cancelHint' }) : l.label}
      aria-label={`${l.label}: ${name}`}
      className={`shrink-0 flex items-center gap-1 px-1.5 py-1 rounded-lg text-[11px] font-bold transition-colors disabled:cursor-default ${l.cls}`}
    >
      <Icon icon={busy ? 'lucide:loader-2' : l.icon} className={`text-sm ${busy ? 'animate-spin' : ''}`} />
      <span className="hidden sm:inline">{l.label}</span>
    </button>
  );
}
