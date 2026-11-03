import { FormattedMessage } from 'react-intl';

/** "Show 3 more" / "Show less" under a list cut short. Renders nothing when
 *  nothing is hidden. */
export function MoreToggle({ hidden, open, onToggle, className = '' }: { hidden: number; open: boolean; onToggle: () => void; className?: string }) {
  if (hidden <= 0) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-xs font-bold text-text-muted hover:text-accent-cyan transition-colors cursor-pointer ${className}`}
    >
      {open ? <FormattedMessage id="word.showLess" /> : <FormattedMessage id="word.showMore" values={{ count: hidden }} />}
    </button>
  );
}
