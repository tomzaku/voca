// The world's UI kit — a game HUD. Every screen inside a building is built
// from these, never from the app's cards and buttons, so the world reads as
// one game. Shared logic (quiz rules, progress) lives in src/lib and
// src/hooks; this folder is only how it looks.
//
// Layout follows strategy-game HUDs: an activity docks to the edges of the
// world (HudTop, HudBanner, HudActionBar, HudSide) and leaves the city
// visible in the middle; HudCenter is for the few screens that need room
// (a match board, a results card).

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { PixelIcon, type PixelIconName } from './PixelIcon';
import './pixel.css';

export { PixelIcon, type PixelIconName };

export type PixelTone = 'gold' | 'red' | 'jade' | 'sky' | 'paper' | 'good' | 'bad';

// ── HUD layout ──

/** Top centre: the run's vitals (lives, score, time). */
export function HudTop({ children }: { children: ReactNode }) {
  return (
    <div className="px absolute top-[3.75rem] xl:top-2 left-1/2 -translate-x-1/2 w-[min(560px,calc(100%-1rem))] pointer-events-auto px-in-down">
      <div className="px-notch px-frame px-4 py-2.5">{children}</div>
    </div>
  );
}

/** Under the top bar: what's being asked. */
export function HudBanner({ label, aside, children }: { label?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="px absolute top-[7.25rem] xl:top-[4.5rem] left-1/2 -translate-x-1/2 w-[min(640px,calc(100%-1rem))] pointer-events-auto px-in-down">
      <div className="px-notch px-frame px-5 py-3.5">
        {(label || aside) && (
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="px-title text-[var(--px-accent)]">{label}</span>
            <span className="px-title text-[var(--px-muted)]">{aside}</span>
          </div>
        )}
        <div className="text-[19px] leading-snug">{children}</div>
      </div>
    </div>
  );
}

/** Bottom centre: the answers, as a row of ability slots. */
export function HudActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="px absolute bottom-2 left-1/2 -translate-x-1/2 w-[min(760px,calc(100%-1rem))] pointer-events-auto px-in-up">
      <div className="px-notch px-frame p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">{children}</div>
    </div>
  );
}

/** One answer in the action bar, with its hotkey in the corner. */
export function HudSlot({ hotkey, state = 'idle', onClick, children }: {
  hotkey: string;
  state?: 'idle' | 'good' | 'bad' | 'dim';
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={state !== 'idle'}
      data-state={state}
      className={`px-slot px-notch relative min-h-[64px] px-3 pt-5 pb-3 text-left ${state === 'bad' ? 'px-shake' : ''}`}
    >
      <span className="absolute top-1 left-1.5 px-title !text-[12px] text-[var(--px-gold)]">{hotkey}</span>
      {state === 'good' && <PixelIcon name="check" size={2} className="absolute top-1.5 right-1.5 text-[var(--px-good)]" />}
      {state === 'bad' && <PixelIcon name="close" size={2} className="absolute top-1.5 right-1.5 text-[var(--px-bad)]" />}
      <span className="block text-[19px] font-bold leading-tight break-words">{children}</span>
    </button>
  );
}

/** Docked to the right like a shop panel — for setup and long forms. */
export function HudSide({ title, footer, children }: { title: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <div className="px absolute top-[3.75rem] md:top-2 right-2 bottom-2 w-[min(380px,calc(100%-1rem))] pointer-events-auto px-in-side">
      <div className="px-notch px-frame h-full flex flex-col">
        <div className="px-title !text-[17px] px-4 pt-3.5 pb-2.5 text-[var(--px-gold)] shrink-0">{title}</div>
        <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-4">{children}</div>
        {footer && <div className="shrink-0 px-4 pb-4 pt-2">{footer}</div>}
      </div>
    </div>
  );
}

/** Centred, for a match board or a results card. */
export function HudCenter({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="px absolute inset-0 flex items-center justify-center p-2 pt-[7.25rem] xl:pt-[4.5rem] pointer-events-none">
      <div className={`px-notch px-frame w-full ${wide ? 'max-w-[640px]' : 'max-w-[400px]'} max-h-full overflow-y-auto p-5 pointer-events-auto px-in-up`}>
        {children}
      </div>
    </div>
  );
}

// ── Pieces ──

export function PixelButton({ tone = 'gold', block = false, className = '', children, ...rest }: {
  tone?: PixelTone;
  block?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      data-tone={tone}
      className={`px-btn px-notch px-title !text-[16px] px-5 pt-3 pb-3.5 inline-flex items-center justify-center gap-2 ${block ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

/** A section label with an optional note or control on the right. */
export function PixelHeading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2">
      <h3 className="px-title text-[var(--px-accent)]">{children}</h3>
      {aside && <span className="text-[14px] text-[var(--px-muted)]">{aside}</span>}
    </div>
  );
}

/** A tick-box card: a label and a one-line hint. */
export function PixelOption({ on, onClick, label, hint }: { on: boolean; onClick: () => void; label: string; hint?: string }) {
  return (
    <button onClick={onClick} data-on={on} aria-pressed={on} className="px-pick px-notch text-left px-3 py-2.5">
      <span className="flex items-center gap-2">
        <span className="w-5 h-5 shrink-0 bg-[#0d0a08] shadow-[inset_0_0_0_2px_var(--px-ink)] flex items-center justify-center text-[var(--px-select)]">
          {on && <PixelIcon name="check" size={2} />}
        </span>
        <span className="px-title">{label}</span>
      </span>
      {hint && <span className="block text-[13px] font-medium text-[var(--px-muted)] mt-1 leading-snug">{hint}</span>}
    </button>
  );
}

/** A small toggle tag, e.g. one word in a word picker. */
export function PixelChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} data-on={on} aria-pressed={on} className="px-pick px-notch px-2.5 py-1 text-[14px] font-bold leading-tight">
      {children}
    </button>
  );
}

/** A Dota-style bar — life, time, progress — with its value written on it. */
export function PixelBar({ pct, color, label, className = '' }: { pct: number; color: string; label?: ReactNode; className?: string }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className={`px-bar ${className}`} style={{ '--fill': color } as CSSProperties}>
      <i style={{ width: `calc(${w}% - 4px)` }} />
      {label != null && <span>{label}</span>}
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
          className={i < lives ? 'text-[var(--px-bad)]' : 'text-[var(--px-muted)] opacity-50'}
        />
      ))}
    </span>
  );
}

/** Waiting: three blocks hopping in turn. */
export function PixelLoader({ label }: { label: ReactNode }) {
  return (
    <div className="py-8 flex flex-col items-center gap-4">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-3 h-3 bg-[var(--px-gold)] px-hop" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <p className="px-title text-[var(--px-muted)]">{label}</p>
    </div>
  );
}

export function PixelStat({ icon, label, value, color }: { icon: PixelIconName; label: string; value: string; color: string }) {
  return (
    <div className="px-inset px-notch p-2.5 flex flex-col items-center">
      <PixelIcon name={icon} size={3} className={color} />
      <div className="px-num text-[26px] leading-none mt-1.5">{value}</div>
      <div className="px-title !text-[12px] text-[var(--px-muted)] mt-1">{label}</div>
    </div>
  );
}
