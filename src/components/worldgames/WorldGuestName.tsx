import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { randomName } from '../../lib/randomName';
import { playSelect } from '../../lib/sfx';
import { PixelButton, PixelIcon } from './pixel';

// The first thing a signed-out visitor sees: what to call them. A name is
// already filled in — a random one, rolled again with the dice — so going on
// is one tap, and no one walks around Huế as "User". Kept on this device as
// the buddy's name (the tailor's can change it later); signing in instead
// brings the account's own name.

const MAX = 24;

export function WorldGuestName({ onSave, onSignIn }: {
  onSave: (name: string) => void;
  onSignIn: () => void;
}) {
  const intl = useIntl();
  const [name, setName] = useState(() => randomName(intl.locale));
  const clean = name.replace(/\s+/g, ' ').trim();
  const reroll = () => { playSelect(); setName(randomName(intl.locale, name)); };
  const save = () => { if (clean) onSave(clean); };

  return (
    <div className="px absolute inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="world-guest-name-title"
        className="px-notch px-frame px-in-up w-[min(100%,400px)] p-4"
        onSubmit={(e) => { e.preventDefault(); save(); }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="px-inset px-notch w-12 h-12 shrink-0 flex items-center justify-center text-[var(--px-gold)]">
            <PixelIcon name="person" size={3} />
          </span>
          <h2 id="world-guest-name-title" className="px-title !text-[18px] leading-tight text-[var(--px-gold)]">
            <FormattedMessage id="world.guestName.title" />
          </h2>
        </div>
        <p className="text-[14px] leading-snug mb-3"><FormattedMessage id="world.guestName.body" /></p>

        <div className="flex gap-2 mb-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, MAX))}
            // Typing is for the name, not for walking the buddy.
            onKeyDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.target.select()}
            autoFocus
            maxLength={MAX}
            aria-label={intl.formatMessage({ id: 'world.guestName.title' })}
            placeholder={intl.formatMessage({ id: 'world.tailorNamePlaceholder' })}
            className="px-inset px-notch flex-1 min-w-0 px-3 py-2 text-[16px] font-bold text-[var(--px-text)] placeholder:text-[var(--px-muted)] focus:outline-none"
          />
          <PixelButton type="button" tone="paper" onClick={reroll} title={intl.formatMessage({ id: 'world.guestName.reroll' })} aria-label={intl.formatMessage({ id: 'world.guestName.reroll' })} className="!px-3">
            <PixelIcon name="retry" size={2} />
          </PixelButton>
        </div>

        <PixelButton type="submit" tone="gold" block disabled={!clean} className="!text-[14px] mb-2">
          ▶ <FormattedMessage id="world.guestName.go" />
        </PixelButton>
        <button type="button" onClick={onSignIn} className="block mx-auto text-[13px] text-[var(--px-muted)] underline underline-offset-2">
          <FormattedMessage id="world.guestName.signIn" />
        </button>
      </form>
    </div>
  );
}
