import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import toast from 'react-hot-toast';
import { ApiError } from '../../lib/api';
import type { FriendsList, Person } from '../../lib/friendsApi';
import { conversation, markRead, sendMessage, type KeptMessage } from '../../lib/messagesApi';
import { HudSide, PixelButton, PixelIcon } from './pixel';

/**
 * Your friends, from the world's bar: who's in Huế now and where (with Go to
 * and Message), who isn't (Message still works — it's kept for them), and
 * requests waiting for you. Friends are made from a player's card here, or on
 * a collection's or team's board in the app.
 */
export function FriendsPanel({ list, failed, whereIs, onMessage, onGoTo, onAccept, onDecline, onClose }: {
  list: FriendsList | null;
  /** The list couldn't be loaded (and there's no earlier one to show). */
  failed: boolean;
  /** Where an online friend is (the area's name), or null if they're not in the world. */
  whereIs: (id: string) => string | null;
  onMessage: (p: Person) => void;
  onGoTo: (id: string) => void;
  onAccept: (p: Person) => void;
  onDecline: (p: Person) => void;
  onClose: () => void;
}) {
  const intl = useIntl();
  const friends = list?.friends ?? [];
  const here = friends.filter((f) => whereIs(f.userId) !== null);
  const away = friends.filter((f) => whereIs(f.userId) === null);

  const row = (f: (typeof friends)[number], online: boolean) => (
    <li key={f.userId} className="flex items-center gap-2">
      <span className={`w-2 h-2 shrink-0 ${online ? 'bg-[var(--px-good)]' : 'bg-white/20'}`} />
      <span className="flex-1 min-w-0">
        <span className={`block truncate text-[14px] ${online ? 'text-[#cfe8ff]' : 'text-[var(--px-muted)]'}`}>{f.name}</span>
        {online && <span className="block truncate text-[11px] text-[var(--px-muted)]">{whereIs(f.userId)}</span>}
      </span>
      <PixelButton
        tone={f.unread ? 'gold' : 'paper'}
        onClick={() => onMessage(f)}
        title={intl.formatMessage({ id: 'world.dmName' }, { name: f.name })}
        aria-label={intl.formatMessage({ id: 'world.dmName' }, { name: f.name })}
        className="!px-2 !py-0 !h-7 shrink-0 !text-[12px]"
      >
        <PixelIcon name="mail" size={2} />{f.unread > 0 && <span>{f.unread}</span>}
      </PixelButton>
      {online && (
        <PixelButton tone="jade" onClick={() => onGoTo(f.userId)} className="!px-2 !py-0 !h-7 !text-[12px] shrink-0">
          <PixelIcon name="compass" size={2} /> <FormattedMessage id="world.liveGoTo" />
        </PixelButton>
      )}
    </li>
  );

  return (
    <HudSide
      title={<span className="flex items-center gap-2"><PixelIcon name="people" size={2} /> <FormattedMessage id="world.friendsTitle" /></span>}
      footer={<PixelButton tone="paper" block onClick={onClose}><FormattedMessage id="world.close" /></PixelButton>}
    >
      {!list && (
        <p className="text-[13px] text-[var(--px-muted)]"><FormattedMessage id={failed ? 'world.friendsFailed' : 'world.friendsLoading'} /></p>
      )}

      {list && list.incoming.length > 0 && (
        <section className="space-y-1.5">
          <p className="text-[12px] text-[var(--px-gold)]"><FormattedMessage id="world.friendsRequests" values={{ n: list.incoming.length }} /></p>
          {list.incoming.map((p) => (
            <div key={p.userId} className="flex items-center gap-2">
              <span className="flex-1 min-w-0 truncate text-[14px]">{p.name}</span>
              <PixelButton tone="jade" onClick={() => onAccept(p)} className="!px-2 !py-0 !h-7 !text-[12px]"><FormattedMessage id="world.friendsAccept" /></PixelButton>
              <PixelButton tone="paper" onClick={() => onDecline(p)} className="!px-2 !py-0 !h-7 !text-[12px]"><FormattedMessage id="world.friendsDecline" /></PixelButton>
            </div>
          ))}
        </section>
      )}

      {list && friends.length === 0 && (
        <p className="text-[13px] text-[var(--px-muted)] leading-relaxed"><FormattedMessage id="world.friendsEmpty" /></p>
      )}
      {here.length > 0 && (
        <section className="space-y-1.5">
          <p className="text-[12px] text-[var(--px-good)]"><FormattedMessage id="world.friendsHere" values={{ n: here.length }} /></p>
          <ul className="space-y-1.5">{here.map((f) => row(f, true))}</ul>
        </section>
      )}
      {away.length > 0 && (
        <section className="space-y-1.5">
          <p className="text-[12px] text-[var(--px-muted)]"><FormattedMessage id="world.friendsAway" values={{ n: away.length }} /></p>
          <ul className="space-y-1.5">{away.map((f) => row(f, false))}</ul>
        </section>
      )}
    </HudSide>
  );
}

interface Line { key: string; mine: boolean; text: string; sentAt: string }

/**
 * A conversation with a friend: what you've said to each other, kept on the
 * server (the newest page first, older on request), and a box to write in.
 * Opening it marks their messages read. New ones arrive through the world's
 * private inbox, which hands them here while it's open (`register`).
 */
export function FriendChat({ friend, meId, register, onClose }: {
  friend: { id: string; name: string };
  meId: string;
  /** Hands the world a way to append a message that just arrived; null when closing. */
  register: (append: ((text: string) => void) | null) => void;
  onClose: () => void;
}) {
  const intl = useIntl();
  const [lines, setLines] = useState<Line[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const toLine = (m: KeptMessage, i: number): Line => ({ key: `${m.sentAt}-${i}`, mine: m.from === meId, text: m.text, sentAt: m.sentAt });

  useEffect(() => {
    let alive = true;
    conversation(friend.id).then((page) => {
      if (!alive) return;
      setLines(page.messages.map(toLine).reverse());
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    }, () => alive && setLines([]));
    void markRead(friend.id);
    register((t) => {
      setLines((l) => [...(l ?? []), { key: `in-${Date.now()}`, mine: false, text: t, sentAt: new Date().toISOString() }]);
      void markRead(friend.id);
    });
    return () => { alive = false; register(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per friend
  }, [friend.id]);

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [lines?.length]);

  const older = async () => {
    if (!cursor) return;
    try {
      const page = await conversation(friend.id, cursor);
      setLines((l) => [...page.messages.map(toLine).reverse(), ...(l ?? [])]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      const m = await sendMessage(friend.id, t);
      setLines((l) => [...(l ?? []), { key: `out-${m.sentAt}`, mine: true, text: m.text, sentAt: m.sentAt }]);
      setText('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : intl.formatMessage({ id: 'world.dmFailed' }));
    } finally {
      setSending(false);
    }
  };

  return (
    <HudSide
      title={<span className="flex items-center gap-2"><PixelIcon name="mail" size={2} /> {friend.name}</span>}
      footer={
        <div className="space-y-2">
          <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') onClose(); }}
              maxLength={120}
              autoFocus
              placeholder={intl.formatMessage({ id: 'world.friendChatPlaceholder' }, { name: friend.name })}
              className="flex-1 min-w-0 px-inset px-notch px-2.5 py-2 text-[14px] bg-transparent outline-none"
            />
            <PixelButton tone="gold" type="submit" disabled={sending || !text.trim()} className="!px-3 !py-2 !text-[13px]">
              <FormattedMessage id="world.dmSend" />
            </PixelButton>
          </form>
          <PixelButton tone="paper" block onClick={onClose} className="!py-2 !text-[13px]"><FormattedMessage id="world.close" /></PixelButton>
        </div>
      }
    >
      {lines === null && <p className="text-[13px] text-[var(--px-muted)]"><FormattedMessage id="world.friendsLoading" /></p>}
      {hasMore && (
        <PixelButton tone="paper" block onClick={() => void older()} className="!py-1.5 !text-[12px]"><FormattedMessage id="world.friendChatOlder" /></PixelButton>
      )}
      {lines && lines.length === 0 && (
        <p className="text-[13px] text-[var(--px-muted)] leading-relaxed"><FormattedMessage id="world.friendChatEmpty" values={{ name: friend.name }} /></p>
      )}
      {lines && lines.length > 0 && (
        <ul className="space-y-1.5">
          {lines.map((l) => (
            <li key={l.key} className={`flex ${l.mine ? 'justify-end' : 'justify-start'}`}>
              <span className={`max-w-[85%] px-notch px-2.5 py-1.5 text-[14px] leading-snug ${l.mine ? 'bg-[var(--px-gold)]/20 text-[#fff3c4]' : 'bg-white/10 text-[#ffd6ee]'}`}>
                {l.text}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div ref={end} />
    </HudSide>
  );
}
