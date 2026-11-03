import { Icon } from '@iconify/react';
import { useIntl } from 'react-intl';

/** A "+3" pill at the end of a list cut short — sits inline as the list's last
 *  item, so it costs no line of its own. Open, it turns into a collapse arrow.
 *  Renders nothing when nothing is hidden. */
export function MoreToggle({ hidden, open, onToggle, className = '' }: { hidden: number; open: boolean; onToggle: () => void; className?: string }) {
  const intl = useIntl();
  if (hidden <= 0) return null;
  const label = open ? intl.formatMessage({ id: 'word.showLess' }) : intl.formatMessage({ id: 'word.showMore' }, { count: hidden });
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      aria-expanded={open}
      className={`inline-flex items-center justify-center min-w-7 px-2 py-0.5 rounded-full border border-dashed border-border text-[11px] sm:text-xs font-bold text-text-muted hover:text-accent-cyan hover:border-accent-cyan/40 transition-colors cursor-pointer align-middle ${className}`}
    >
      {open ? <Icon icon="lucide:chevron-up" width={14} /> : `+${hidden}`}
    </button>
  );
}
