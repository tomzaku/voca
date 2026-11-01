import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage } from 'react-intl';
import { TEST_THEMES, themeLook, type TestTheme } from '../../lib/testThemes';

/**
 * The world a themed test is played in: its background, and a handful of
 * pieces drifting about behind the question card. Classic has neither — it's
 * the app as it always looked.
 *
 * The pieces are placed by their index, not at random, so the layout is the
 * same on every render and the same for every student.
 */
export function ThemedStage({ theme, children }: { theme: TestTheme; children: React.ReactNode }) {
  const look = themeLook(theme);
  const pieces = useMemo(
    () => Array.from({ length: look.deco.length ? 14 : 0 }, (_, i) => ({
      icon: look.deco[i % look.deco.length],
      left: `${(i * 37 + 7) % 96}%`,
      top: `${(i * 53 + 11) % 90}%`,
      size: 18 + ((i * 7) % 4) * 8,
      duration: `${9 + ((i * 5) % 7)}s`,
      delay: `${-((i * 1.7) % 9)}s`,
    })),
    [look],
  );
  if (!look.background) return <div className="space-y-5">{children}</div>;
  return (
    <div className="relative overflow-hidden rounded-3xl p-4 sm:p-6 min-h-[70vh] text-white" style={{ background: look.background }}>
      <div aria-hidden className="absolute inset-0">
        {pieces.map((p, i) => (
          <Icon
            key={i}
            icon={p.icon}
            className="theme-deco"
            data-motion={look.motion}
            style={{
              left: p.left,
              // Rising and falling pieces travel the full height; the others stay put.
              ...(look.motion === 'twinkle' || look.motion === 'sway' ? { top: p.top } : {}),
              width: p.size,
              height: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>
      <div className="relative space-y-5">{children}</div>
    </div>
  );
}

/** The progress track, with the theme's runner moving along it. */
export function ThemedProgress({ theme, at, total }: { theme: TestTheme; at: number; total: number }) {
  const look = themeLook(theme);
  const pct = total ? (at / total) * 100 : 0;
  return (
    <div className="relative flex-1 h-3 rounded-full bg-black/20 dark:bg-white/10">
      <div className="h-full rounded-full bg-accent-green transition-all duration-500" style={{ width: `${pct}%` }} />
      <Icon
        icon={look.runner}
        aria-hidden
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-2xl animate-bob transition-all duration-500 drop-shadow"
        style={{ left: `${Math.max(3, pct)}%`, color: look.background ? '#fff' : 'var(--color-accent-cyan)' }}
      />
    </div>
  );
}

/** The teacher's choice of look: a small preview of each theme. */
export function ThemePicker({ value, onChange }: { value: TestTheme; onChange: (t: TestTheme) => void }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {TEST_THEMES.map((t) => {
        const look = themeLook(t);
        const on = value === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            aria-pressed={on}
            className={`relative h-20 rounded-xl overflow-hidden flex flex-col items-center justify-center gap-1 border-[3px] transition-transform hover:-translate-y-0.5 ${
              on ? 'border-accent-cyan scale-[1.03]' : 'border-transparent'
            } ${look.background ? 'text-white' : 'bg-bg-tertiary text-text-primary'}`}
            style={look.background ? { background: look.background } : undefined}
          >
            <Icon icon={look.icon} className={`text-2xl ${on ? 'animate-bob' : ''}`} />
            <span className="text-[11px] font-bold"><FormattedMessage id={`tests.theme.${t}`} /></span>
            <span className="absolute bottom-1 inset-x-2 flex gap-0.5">
              {look.tiles.map((c) => <span key={c} className="flex-1 h-1 rounded-full" style={{ background: c }} />)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const BURST_COLORS = ['#22d3ee', '#34e39b', '#ff9f43', '#b98bff', '#ffd23f', '#ff6ec7'];

/** A one-off shower of confetti, for a right answer or a handed-in test. */
export function Confetti({ count = 28 }: { count?: number }) {
  // Random once per burst — a new burst is a new component.
  const [pieces] = useState(() =>
    Array.from({ length: count }, () => ({
      dx: `${(Math.random() * 2 - 1) * 220}px`,
      dy: `${40 + Math.random() * 170}px`,
      rot: `${(Math.random() * 2 - 1) * 540}deg`,
      delay: `${Math.random() * 0.12}s`,
      color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
    })));
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{ background: p.color, '--dx': p.dx, '--dy': p.dy, '--rot': p.rot, animationDelay: p.delay } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/** Counts up from 0 to `to` — the score landing. */
export function CountUp({ to, ms = 900 }: { to: number; ms?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setN(Math.round(to * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [to, ms]);
  return <>{n}</>;
}
