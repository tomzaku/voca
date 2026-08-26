import { Icon } from '@iconify/react';

export interface TabItem<T extends string = string> {
  value: T;
  label: string;
  icon?: string;
}

interface TabsProps<T extends string> {
  value: T;
  items: TabItem<T>[];
  onChange: (value: T) => void;
  /** `md` for a page's primary view switch, `sm` for a secondary one nested
   *  under it (e.g. IpaPage's List/Practice vs its All/Compare sub-tabs). */
  size?: 'md' | 'sm';
  className?: string;
}

/**
 * Underlined tab strip — Ant Design's default "line" style: a shared
 * baseline the whole row sits on, with the active tab's own segment of it
 * colored in, rather than each option boxed in its own pill (that's
 * `parts.tsx`'s `DefLengthToggle`, a switch between two values, not a set of
 * views). Reach for this whenever the options are pages/views of the same
 * screen; reach for the pill switch when they're two settings of one thing.
 */
export function Tabs<T extends string>({ value, items, onChange, size = 'md', className = '' }: TabsProps<T>) {
  return (
    <div role="tablist" className={`inline-flex border-b border-border ${className}`}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={`flex items-center gap-1.5 -mb-px border-b-2 font-bold whitespace-nowrap transition-colors ${
              size === 'md' ? 'px-4 py-2.5 text-sm' : 'px-3 py-2 text-xs'
            } ${
              active
                ? 'border-accent-cyan text-accent-cyan'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            {item.icon && <Icon icon={item.icon} className="text-base" />}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
