import { useState } from 'react';
import { Icon } from '@iconify/react';

export interface SelectorOption<T extends string = string> {
  value: T;
  label: string;
  icon?: string;
  description?: string;
}

interface Props<T extends string> {
  value: T;
  options: SelectorOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
  /** Extra classes for the trigger button. */
  className?: string;
  /** Which edge the menu lines up with — `right` for a trigger at the right of its row. */
  align?: 'left' | 'right';
  /** Fill the row: the trigger stretches, its label left and chevron right. */
  block?: boolean;
}

/**
 * Compact dropdown selector styled like the app's 3D buttons. Unlike a native
 * <select> — whose popup the browser positions on its own, sometimes nowhere
 * near the control — the menu is anchored right below the trigger.
 * NOTE: the menu is positioned inside the nearest scroll/overflow context, so
 * give the surrounding card enough room below the trigger (it scrolls at
 * max-h-72 when the option list is long).
 */
export function Selector<T extends string>({ value, options, onChange, ariaLabel, className = '', align = 'left', block = false }: Props<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];

  const pick = (v: T) => {
    setOpen(false);
    if (v !== value) onChange(v);
  };

  return (
    <div className={`relative ${block ? 'flex-1 min-w-0' : ''}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        className={`btn-3d flex items-center gap-1.5 px-3 py-1.5 text-xs bg-bg-tertiary text-text-primary ${block ? 'w-full' : ''} ${className}`}
      >
        {current.icon && <Icon icon={current.icon} className="text-base text-accent-purple" />}
        <span className={block ? 'flex-1 min-w-0 truncate text-left' : ''}>{current.label}</span>
        <Icon
          icon="lucide:chevron-down"
          className={`text-sm text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            aria-label={ariaLabel}
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 z-40 min-w-[12rem] ${block ? 'w-full' : ''} max-h-72 overflow-y-auto rounded-xl border-2 border-border bg-bg-card shadow-xl p-1 animate-fade-in`}
          >
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(o.value)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-bold transition-colors ${
                    selected
                      ? 'bg-accent-purple/10 text-accent-purple'
                      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  }`}
                >
                  {o.icon && <Icon icon={o.icon} className="text-base shrink-0" />}
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{o.label}</span>
                    {o.description && (
                      <span className="block text-[10px] font-semibold text-text-muted truncate">
                        {o.description}
                      </span>
                    )}
                  </span>
                  {selected && <Icon icon="lucide:check" className="text-sm shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
