import { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { PixelButton, PixelIcon } from './pixel';

// The story of the real place a skill's room stands in, as a toast under the
// skill bar's top-right corner: it shows as you step into the room (and again
// from the bar's ⓘ), then goes by itself after TOAST_MS — a little of the
// real city for someone who hasn't been, without standing in the way. Read
// more opens its memorial (PlaceMemorial): the story at length, and photos.
//
// On a phone the full card covers too much of the world, so it arrives as a
// slim chip — the place's name — under the status bar (where the minimap
// is on wider screens); a tap opens the story, which then stays until closed.

export const TOAST_MS = 10_000;

const wide = () => typeof window === 'undefined' || window.matchMedia('(min-width: 640px)').matches;

export function PlaceInfo({ id, onClose, onExpand }: { id: string; onClose: () => void; onExpand: () => void }) {
  // Phones start folded; opening it (being read) stops the clock.
  const [open, setOpen] = useState(wide);
  const [reading, setReading] = useState(false);
  useEffect(() => {
    if (reading) return;
    const t = setTimeout(onClose, TOAST_MS);
    return () => clearTimeout(t);
  }, [onClose, reading]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setReading(true); }}
        className="px absolute top-[calc(3.9rem+var(--sat,0px))] left-[calc(0.5rem+var(--sal,0px))] z-40 max-w-[calc(100%-1rem)] px-notch px-frame px-in-side flex items-center gap-2 pl-2 pr-3 py-1.5 text-left"
      >
        <span className="text-[var(--px-sky)] shrink-0"><PixelIcon name="info" size={2} /></span>
        <span className="min-w-0">
          <span className="block px-title !text-[13px] text-[var(--px-gold)] leading-tight truncate"><FormattedMessage id={`places.${id}`} /></span>
          <span className="block h-0.5 mt-1 bg-[#0d0a08] overflow-hidden">
            <span className="block h-full bg-[var(--px-gold)] origin-left" style={{ animation: `px-drain ${TOAST_MS}ms linear forwards` }} />
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="px absolute top-[calc(3.9rem+var(--sat,0px))] left-[calc(0.5rem+var(--sal,0px))] sm:left-auto sm:top-[calc(3.75rem+var(--sat,0px))] right-[calc(0.5rem+var(--sar,0px))] z-40 sm:w-[min(340px,calc(100%-1rem))] max-h-[calc(100%-5rem)] overflow-y-auto px-in-side">
      <div className="px-notch px-frame p-3.5">
        <div className="flex items-start gap-2.5 mb-2">
          <span className="px-inset px-notch w-9 h-9 shrink-0 flex items-center justify-center text-[var(--px-sky)]">
            <PixelIcon name="info" size={2} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="px-title !text-[16px] text-[var(--px-gold)] leading-tight"><FormattedMessage id={`places.${id}`} /></p>
            <p className="text-[12px] text-[var(--px-muted)]"><FormattedMessage id={`places.${id}En`} /></p>
          </div>
          <button onClick={onClose} aria-label="close" className="text-[var(--px-muted)] hover:text-[var(--px-text)] p-1">
            <PixelIcon name="close" size={2} />
          </button>
        </div>
        <p className="text-[14px] leading-snug"><FormattedMessage id={`places.${id}About`} /></p>
        <p className="text-[13px] leading-snug text-[var(--px-muted)] mt-2">
          <span className="px-title !text-[11px] text-[var(--px-accent)] mr-1.5"><FormattedMessage id="places.didYouKnow" /></span>
          <FormattedMessage id={`places.${id}Fact`} />
        </p>
        <PixelButton tone="gold" block onClick={onExpand} className="mt-3 !py-1.5 !text-[13px]">
          <FormattedMessage id="places.expand" />
        </PixelButton>
        {/* How long it has left, running down — unless it's being read. */}
        {!reading && (
          <div className="mt-3 h-1 bg-[#0d0a08] overflow-hidden">
            <div className="h-full bg-[var(--px-gold)] origin-left" style={{ animation: `px-drain ${TOAST_MS}ms linear forwards` }} />
          </div>
        )}
      </div>
    </div>
  );
}
