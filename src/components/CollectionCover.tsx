import type { ReactNode } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage } from 'react-intl';
import { PHOTO_SCRIM, topicCover } from '../lib/topicTheme';

// A collection's cover — its photo or gradient, name, tags, how much of it you
// know, and what to do next. One component for the "Now studying" banner on
// /collections and the top of the collection's own page and popup, so the
// banner you click looks like what it opens.

/** A secondary action on the cover: translucent, so the art stays the backdrop. */
export const COVER_GLASS = 'flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm text-white text-xs font-bold hover:bg-white/25 transition-colors disabled:opacity-50';

/** The cover's one primary action. */
export const COVER_PRIMARY = 'btn-3d px-5 py-2.5 bg-white text-gray-900 text-sm font-bold flex items-center gap-1.5 disabled:opacity-80';

/** A tag under the name — word count, learners, owner. */
export function CoverChip({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
      {typeof icon === 'string' ? <Icon icon={icon} /> : icon}
      {children}
    </span>
  );
}

export function CollectionCover({
  id, name, description, icon, photo, kicker, chips, known, total, actions, flush = false, onOpen, openLabel,
}: {
  id: string;
  name: string;
  description?: string | null;
  /** A built-in topic's icon, shown in a tile beside the name. */
  icon?: string;
  photo?: string;
  /** A line above the name — "Now studying". */
  kicker?: ReactNode;
  chips?: ReactNode;
  /** Words known (the leaderboard's own test) out of the list's total. */
  known: number;
  total: number;
  actions?: ReactNode;
  /** Edge to edge, for the top of a popup — which floats its own close
   *  buttons over the top-right, hence the extra headroom. */
  flush?: boolean;
  /** Makes the whole cover a button (the banner opens its collection); the
   *  actions on it sit above and keep their own jobs. */
  onOpen?: () => void;
  openLabel?: string;
}) {
  const pct = total ? Math.round((known / total) * 100) : 0;
  return (
    <header
      className={`group relative overflow-hidden text-white ${flush ? 'px-6 pb-6 pt-16' : 'rounded-3xl px-5 sm:px-7 pb-6 pt-14 sm:pt-20 mb-6'}`}
      // The card's drop shadow reads as a stray glow line inside a popup.
      style={flush ? { ...topicCover(id), boxShadow: 'none' } : topicCover(id)}
    >
      {photo && (
        <img
          src={photo}
          alt=""
          decoding="async"
          className={`pointer-events-none absolute inset-0 w-full h-full object-cover ${onOpen ? 'transition-transform duration-500 group-hover:scale-[1.02]' : ''}`}
        />
      )}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={PHOTO_SCRIM} />
      {onOpen && (
        <button
          onClick={onOpen}
          aria-label={openLabel}
          className="absolute inset-0 rounded-3xl focus-visible:outline-2 focus-visible:outline-white"
        />
      )}

      <div className={`relative flex flex-col lg:flex-row lg:items-end gap-5 ${onOpen ? 'pointer-events-none' : ''}`}>
        <div className="flex-1 min-w-0">
          {kicker && (
            <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/80">{kicker}</p>
          )}
          <div className="flex items-center gap-3">
            {icon && (
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
                <Icon icon={icon} className="text-2xl" />
              </span>
            )}
            <h1 className="min-w-0 text-3xl sm:text-4xl font-display font-extrabold leading-tight break-words [text-shadow:0_1px_3px_rgba(0,0,0,0.3)]">
              {name}
            </h1>
          </div>
          {description && <p className="mt-2 max-w-2xl text-sm text-white/90">{description}</p>}

          {chips && <div className="flex flex-wrap items-center gap-1.5 mt-3 text-[11px] font-bold">{chips}</div>}

          <div className="mt-4 max-w-md">
            <div className="h-2 rounded-full bg-white/25 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs font-bold text-white/90 mt-1.5">
              <FormattedMessage id="collections.youKnowOf" values={{ known, total }} />
            </p>
          </div>
        </div>

        {/* One clear next step, and the other ways in beside it, quieter. */}
        {actions && (
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 lg:justify-end lg:max-w-[22rem]">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
