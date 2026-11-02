import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { acceptFriend, listFriends, removeFriend, type FriendsList, type Person } from '../lib/friendsApi';

/**
 * Your friends on the profile page: requests waiting for you (accept or
 * decline), your friends (with how many of their messages are unread — you
 * read and reply in the world), and the requests you've sent (take them back).
 * Friends are made by tapping someone in the world, or on a collection's or
 * team's board.
 */
export function FriendsSection() {
  const intl = useIntl();
  const [list, setList] = useState<FriendsList | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    listFriends().then((l) => { setList(l); setFailed(false); }, () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  const run = async (id: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(id);
    try {
      await fn();
      if (done) toast.success(done);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const unfriend = (p: Person) => {
    if (!window.confirm(intl.formatMessage({ id: 'friends.confirmRemove' }, { name: p.name }))) return;
    void run(p.userId, () => removeFriend(p.userId));
  };

  const avatar = (p: Person) => p.avatarUrl
    ? <img src={p.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
    : <span className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-sm font-bold text-text-muted shrink-0">{p.name.charAt(0).toUpperCase()}</span>;

  const btn = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50';

  return (
    <section className="rounded-xl border border-border bg-bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-display font-bold text-text-primary">
          <Icon icon="lucide:users" className="text-accent-cyan" />
          <FormattedMessage id="friends.title" />
          {list && list.friends.length > 0 && <span className="text-text-muted font-normal">({list.friends.length})</span>}
        </h2>
        <Link to="/world" className="text-xs font-bold text-accent-cyan hover:underline"><FormattedMessage id="friends.openWorld" /></Link>
      </div>

      {failed && <p className="text-xs text-text-muted"><FormattedMessage id="friends.loadFailed" /></p>}
      {!list && !failed && <p className="text-xs text-text-muted"><FormattedMessage id="friends.loading" /></p>}

      {list && list.incoming.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent-green"><FormattedMessage id="friends.incoming" values={{ n: list.incoming.length }} /></p>
          {list.incoming.map((p) => (
            <div key={p.userId} className="flex items-center gap-3 rounded-lg bg-accent-green/5 p-2">
              {avatar(p)}
              <span className="flex-1 min-w-0 truncate text-sm font-semibold text-text-primary">{p.name}</span>
              <button type="button" disabled={busy === p.userId} onClick={() => void run(p.userId, () => acceptFriend(p.userId), intl.formatMessage({ id: 'friends.nowFriends' }, { name: p.name }))} className={`${btn} bg-accent-green text-bg-primary`}>
                <FormattedMessage id="friends.accept" />
              </button>
              <button type="button" disabled={busy === p.userId} onClick={() => void run(p.userId, () => removeFriend(p.userId))} className={`${btn} text-text-muted hover:text-accent-red`}>
                <FormattedMessage id="friends.decline" />
              </button>
            </div>
          ))}
        </div>
      )}

      {list && list.friends.length === 0 && list.incoming.length === 0 && (
        <p className="text-xs text-text-muted leading-relaxed"><FormattedMessage id="friends.empty" /></p>
      )}

      {list && list.friends.length > 0 && (
        <ul className="flex flex-col divide-y divide-border">
          {list.friends.map((f) => (
            <li key={f.userId} className="flex items-center gap-3 py-2">
              {avatar(f)}
              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm font-semibold text-text-primary">{f.name}</span>
                {f.unread > 0 && (
                  <span className="text-[11px] font-bold text-accent-pink flex items-center gap-1">
                    <Icon icon="lucide:mail" /> <FormattedMessage id="friends.unread" values={{ n: f.unread }} />
                  </span>
                )}
              </span>
              <button type="button" disabled={busy === f.userId} onClick={() => unfriend(f)} className={`${btn} text-text-muted hover:text-accent-red`} aria-label={intl.formatMessage({ id: 'friends.remove' }) + ': ' + f.name}>
                <Icon icon="lucide:user-minus" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {list && list.outgoing.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted"><FormattedMessage id="friends.outgoing" /></p>
          {list.outgoing.map((p) => (
            <div key={p.userId} className="flex items-center gap-3 py-1">
              {avatar(p)}
              <span className="flex-1 min-w-0 truncate text-sm text-text-secondary">{p.name}</span>
              <button type="button" disabled={busy === p.userId} onClick={() => void run(p.userId, () => removeFriend(p.userId))} className={`${btn} text-text-muted hover:text-accent-red`}>
                <FormattedMessage id="friends.cancel" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
