import { useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { PixelIcon } from './pixel';

// The story of the real place a skill's room stands in, as a toast under the
// skill bar's top-right corner: it shows as you step into the room (and again
// from the bar's ⓘ), then goes by itself after TOAST_MS — a little of the
// real city for someone who hasn't been, without standing in the way.

export const TOAST_MS = 10_000;

export function PlaceInfo({ id, onClose }: { id: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, TOAST_MS);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="px absolute top-[3.75rem] right-2 z-40 w-[min(340px,calc(100%-1rem))] px-in-side">
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
        {/* How long it has left, running down. */}
        <div className="mt-3 h-1 bg-[#0d0a08] overflow-hidden">
          <div className="h-full bg-[var(--px-gold)] origin-left" style={{ animation: `px-drain ${TOAST_MS}ms linear forwards` }} />
        </div>
      </div>
    </div>
  );
}
