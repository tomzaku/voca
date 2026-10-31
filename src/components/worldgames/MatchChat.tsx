import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { cleanChat, type MatchLink } from '../../lib/worldLive';
import { PixelButton } from './pixel';

// Talking while you play: a chat between the two of you, under the game. It
// goes over the match's own line (link.send), so only the other player sees
// it — not everyone around — and through the same filter as the world's chat.
// No quicker than a line every few hundred milliseconds.

const GAP_MS = 600;

export function MatchChat({ link }: { link: MatchLink }) {
  const intl = useIntl();
  const [lines, setLines] = useState<{ key: number; mine: boolean; text: string }[]>([]);
  const [text, setText] = useState('');
  const lastSent = useRef(0);
  const nextKey = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  const add = (mine: boolean, t: string) => setLines((l) => [...l.slice(-29), { key: nextKey.current++, mine, text: t }]);

  useEffect(() => link.listen((d) => {
    if (d.kind !== 'say' || typeof d.text !== 'string') return;
    const t = cleanChat(d.text);
    if (t) add(false, t);
  }), [link]);
  // Newest line in view.
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [lines]);

  const send = () => {
    const t = cleanChat(text);
    const now = Date.now();
    if (!t || now - lastSent.current < GAP_MS) return;
    lastSent.current = now;
    link.send({ kind: 'say', text: t });
    add(true, t);
    setText('');
  };

  return (
    <div className="mt-3 px-inset px-notch p-2">
      {lines.length > 0 && (
        <div ref={box} className="max-h-24 overflow-y-auto mb-1.5 space-y-0.5">
          {lines.map((l) => (
            <p key={l.key} className="text-[13px] leading-snug break-words">
              <span className={`px-title !text-[12px] ${l.mine ? 'text-[var(--px-gold)]' : 'text-[var(--px-sky)]'}`}>
                {l.mine ? <FormattedMessage id="world.duelYou" /> : link.peer.name}
              </span>{' '}{l.text}
            </p>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <input
          value={text}
          maxLength={120}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') send(); }}
          placeholder={intl.formatMessage({ id: 'world.matchSay' }, { name: link.peer.name })}
          className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-[14px] outline-none border-b border-white/15"
        />
        <PixelButton tone="jade" onClick={send} className="!px-3 !py-1 !text-[12px]"><FormattedMessage id="world.liveSend" /></PixelButton>
      </div>
    </div>
  );
}
