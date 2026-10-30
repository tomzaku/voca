import { useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { PixelButton, PixelIcon } from './pixel';

// A landmark's story, opened from its plaque on the map, the card that shows
// when you walk by, or the travel drawer's guide: its name as Huế says it,
// what it's called in English, a short introduction and one thing worth
// knowing — a little of the real city for someone who hasn't been.

export function PlaceInfo({ id, onClose }: { id: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); onClose(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="px absolute inset-0 z-40 flex items-center justify-center p-3 bg-black/30 animate-fade-in" onClick={onClose}>
      <div className="px-notch px-frame w-full max-w-[460px] max-h-full overflow-y-auto p-5 px-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-3">
          <span className="px-inset px-notch w-11 h-11 shrink-0 flex items-center justify-center text-[20px]">📜</span>
          <div className="flex-1 min-w-0">
            <p className="px-title !text-[19px] text-[var(--px-gold)] leading-tight"><FormattedMessage id={`places.${id}`} /></p>
            <p className="text-[13px] text-[var(--px-muted)]"><FormattedMessage id={`places.${id}En`} /></p>
          </div>
          <button onClick={onClose} aria-label="close" className="text-[var(--px-muted)] hover:text-[var(--px-text)] p-1">
            <PixelIcon name="close" size={2} />
          </button>
        </div>
        <p className="text-[16px] leading-relaxed"><FormattedMessage id={`places.${id}About`} /></p>
        <div className="px-inset px-notch p-3 mt-4">
          <p className="px-title !text-[12px] text-[var(--px-accent)] mb-1 flex items-center gap-1.5">
            <PixelIcon name="star" size={1} /> <FormattedMessage id="places.didYouKnow" />
          </p>
          <p className="text-[15px] leading-snug"><FormattedMessage id={`places.${id}Fact`} /></p>
        </div>
        <PixelButton tone="gold" block className="mt-4" onClick={onClose}>
          <FormattedMessage id="places.close" /> <span className="opacity-70">↵</span>
        </PixelButton>
      </div>
    </div>
  );
}
