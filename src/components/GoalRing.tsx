import { Icon } from '@iconify/react';

/**
 * Today's progress toward the daily goal, drawn as a ring around the streak
 * flame — so the header answers "have I done enough today?" without a number
 * to read. Full and green once the goal is met.
 */
export function GoalRing({ done, goal, active, size = 26 }: {
  done: number;
  goal: number;
  /** Today already counts toward the streak — the flame is lit. */
  active: boolean;
  size?: number;
}) {
  const met = done >= goal;
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, goal > 0 ? done / goal : 0);
  const tone = met ? 'text-accent-green' : active ? 'text-accent-orange' : 'text-text-muted';

  return (
    <span className={`relative inline-flex items-center justify-center shrink-0 ${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <Icon
        icon={met ? 'lucide:check' : active ? 'lucide:flame' : 'lucide:flame-kindling'}
        className="text-[13px]"
        aria-hidden
      />
    </span>
  );
}
