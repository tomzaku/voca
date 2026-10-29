// The world's pixel UI kit. Every screen inside a building is built from these
// — never from the app's cards and buttons — so the world reads as one game.
// Shared logic (quiz rules, progress) lives in src/lib and src/hooks; this
// folder is only how it looks.

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { PixelIcon, type PixelIconName } from './PixelIcon';
import './pixel.css';

export { PixelIcon, type PixelIconName };

export type PixelTone = 'gold' | 'red' | 'jade' | 'sky' | 'paper' | 'good' | 'bad';

/** The window a building's game opens in: wood frame, lacquer title bar. */
export function PixelPanel({ title, emoji, onClose, closeLabel, children }: {
  title: string;
  emoji?: string;
  onClose?: () => void;
  closeLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="px px-notch px-frame w-full max-w-sm max-h-full flex flex-col p-[6px]">
      <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--px-lacquer)] text-[#fff3dc] shrink-0 shadow-[inset_0_-3px_0_rgba(0,0,0,0.3)]">
        {emoji && <span className="text-base leading-none">{emoji}</span>}
        <span className="px-title flex-1 min-w-0 truncate">{title}</span>
        {onClose && (
          <button
            onClick={onClose}
            title={closeLabel}
            aria-label={closeLabel}
            className="px-btn px-notch w-7 h-7 flex items-center justify-center"
            data-tone="paper"
          >
            <PixelIcon name="close" size={2} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3">{children}</div>
    </div>
  );
}

export function PixelButton({ tone = 'gold', block = false, className = '', children, ...rest }: {
  tone?: PixelTone;
  block?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      data-tone={tone}
      className={`px-btn px-notch px-title !text-[13px] px-4 pt-2.5 pb-3 inline-flex items-center justify-center gap-2 ${block ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

/** A section label with an optional note or control on the right. */
export function PixelHeading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-1.5">
      <h3 className="px-title text-[var(--px-accent)]">{children}</h3>
      {aside && <span className="text-[17px] text-[var(--px-muted)]">{aside}</span>}
    </div>
  );
}

/** A tick-box card: a label and a one-line hint. */
export function PixelOption({ on, onClick, label, hint }: { on: boolean; onClick: () => void; label: string; hint?: string }) {
  return (
    <button onClick={onClick} data-on={on} aria-pressed={on} className="px-pick px-notch text-left px-2.5 py-2">
      <span className="flex items-center gap-1.5">
        <span className="w-5 h-5 shrink-0 bg-[var(--px-paper)] shadow-[inset_0_0_0_2px_var(--px-ink)] flex items-center justify-center text-[var(--px-select)]">
          {on && <PixelIcon name="check" size={2} />}
        </span>
        <span className="px-title !text-[11px]">{label}</span>
      </span>
      {hint && <span className="block text-[16px] text-[var(--px-muted)] mt-1 leading-none">{hint}</span>}
    </button>
  );
}

/** A small toggle tag, e.g. one word in a word picker. */
export function PixelChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} data-on={on} aria-pressed={on} className="px-pick px-notch px-2 py-0.5 text-[18px] leading-none">
      {children}
    </button>
  );
}

/** A meter of square cells — time left, a level, a streak. */
export function PixelCells({ pct, cells = 16, color }: { pct: number; cells?: number; color?: string }) {
  const lit = Math.round((Math.max(0, Math.min(100, pct)) / 100) * cells);
  return (
    <div className="px-cells flex-1" style={color ? ({ '--cell': color } as React.CSSProperties) : undefined}>
      {Array.from({ length: cells }, (_, i) => <span key={i} data-on={i < lit} />)}
    </div>
  );
}

export function PixelHearts({ lives, max }: { lives: number; max: number }) {
  return (
    <span className="flex items-center gap-1" aria-label={`${lives}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <PixelIcon
          key={i}
          name={i < lives ? 'heart' : 'heartEmpty'}
          size={3}
          className={i < lives ? 'text-[var(--px-bad)]' : 'text-[var(--px-muted)] opacity-60'}
        />
      ))}
    </span>
  );
}

/** Waiting: three blocks hopping in turn. */
export function PixelLoader({ label }: { label: ReactNode }) {
  return (
    <div className="py-10 flex flex-col items-center gap-4">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-3 h-3 bg-[var(--px-gold)] px-hop" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <p className="text-[20px] text-[var(--px-muted)]">{label}</p>
    </div>
  );
}

export function PixelStat({ icon, label, value, color }: { icon: PixelIconName; label: string; value: string; color: string }) {
  return (
    <div className="px-inset px-notch p-2 flex flex-col items-center">
      <PixelIcon name={icon} size={3} className={color} />
      <div className="text-[26px] leading-none mt-1">{value}</div>
      <div className="px-title !text-[9px] text-[var(--px-muted)] mt-0.5">{label}</div>
    </div>
  );
}
