import type { ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { useCompanion } from '../../hooks/useCompanion';
import { DEFAULT_LOOK, type Look } from '../../game/wardrobe';
import type { MatchLink } from '../../lib/worldLive';
import { LookSprite } from './LookSprite';
import { MatchChat } from './MatchChat';
import { PixelButton, PixelIcon, PixelLoader, type PixelIconName } from './pixel';

// The frame the turn-based games with another player share (Word Caro, Word
// Chain, Ô ăn quan): a window over the world, the two of you along the top
// with whose turn it is, then the game — and the ending: who won, or that
// they left, and the way back. Under it all, a chat between the two of you.

export function MatchWindow({ link, icon, title, onClose, turn, mine, theirs, started, left, result, children }: {
  link: MatchLink;
  icon: PixelIconName;
  title: ReactNode;
  onClose: () => void;
  /** Whose turn it is, to mark — null between turns or at the end. */
  turn: 'me' | 'them' | null;
  /** What to show under each name: a score, lives, a mark. */
  mine?: ReactNode;
  theirs?: ReactNode;
  started: boolean;
  left: boolean;
  result: 'won' | 'lost' | 'draw' | null;
  children: ReactNode;
}) {
  const look = useCompanion((s) => s.dress) ?? DEFAULT_LOOK;
  const name = link.peer.name;
  const player = (who: ReactNode, l: Look, extra: ReactNode, on: boolean) => (
    <div className={`flex items-center gap-2 px-1.5 py-1 ${on ? 'outline outline-2 outline-[var(--px-gold)] bg-[var(--px-gold)]/15' : ''}`}>
      <LookSprite look={l} scale={2} />
      <div className="min-w-0">
        <p className="text-[13px] truncate">{who}</p>
        <div className="text-[13px] text-[var(--px-gold)] px-num">{extra}</div>
      </div>
    </div>
  );
  return (
    <div className="px absolute inset-0 z-40 flex items-end sm:items-center justify-center p-3 bg-black/25" onKeyDown={(e) => e.stopPropagation()}>
      <div className="px-notch px-frame w-full max-w-[560px] p-4 px-in-up max-h-[94%] overflow-y-auto">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="px-title !text-[18px] text-[var(--px-gold)] flex items-center gap-2"><PixelIcon name={icon} size={2} /> {title}</p>
          <button onClick={onClose} className="px-title !text-[12px] text-[var(--px-muted)] hover:text-[var(--px-text)] mt-1">
            <FormattedMessage id="world.focusLeave" />
          </button>
        </div>
        <div className="px-inset px-notch p-1.5 mb-3 grid grid-cols-2 gap-2">
          {player(<FormattedMessage id="world.duelYou" />, look, mine, turn === 'me')}
          {player(name, link.peer.look, theirs, turn === 'them')}
        </div>

        {!started && !left && <PixelLoader label={<FormattedMessage id="world.duelWaiting" values={{ name }} />} />}
        {started && !result && !left && children}

        {(result || left) && (
          <div className="text-center">
            {result && started && children}
            {left && !result && <p className="text-[14px] text-[var(--px-muted)] mb-2"><FormattedMessage id="world.duelLeft" values={{ name }} /></p>}
            {result && (
              <p className="px-title !text-[22px] my-3" style={{ color: result === 'won' ? 'var(--px-jade)' : result === 'lost' ? 'var(--px-bad)' : undefined }}>
                <FormattedMessage id={`world.duel.${result}`} values={{ name }} />
              </p>
            )}
            <PixelButton tone="jade" block onClick={onClose}><FormattedMessage id="world.duelDone" /></PixelButton>
          </div>
        )}
        {/* Talk while you play — just the two of you. */}
        {started && !left && <MatchChat link={link} />}
      </div>
    </div>
  );
}

/** A countdown bar for a turn: full at `since`, empty after `seconds`. */
export function TurnBar({ since, seconds, now }: { since: number; seconds: number; now: number }) {
  return (
    <div className="h-1.5 bg-black/30 mb-2">
      <div className="h-full bg-[var(--px-gold)]" style={{ width: `${Math.max(0, 1 - (now - since) / (seconds * 1000)) * 100}%` }} />
    </div>
  );
}
