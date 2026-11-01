import { FormattedMessage } from 'react-intl';
import type { Phase } from '../../lib/huntsApi';

/** Each team's colour, the same on every screen: the projector, the phones, the world. */
export const TEAM_COLOR = ['var(--color-accent-red)', 'var(--color-accent-blue)'] as const;
/** The same, as the pixel kit draws it in the world. */
export const TEAM_PX = ['#e0533f', '#4f8fe0'] as const;

/**
 * A team's run of stations as a row of dots — done, here, still to come — and
 * a chest at the end that opens when they do.
 */
export function RaceTrack({ name, team, stations, position, phase, compact = false }: {
  name: string;
  team: 0 | 1;
  stations: number;
  position: number;
  phase: Phase;
  compact?: boolean;
}) {
  const color = TEAM_COLOR[team];
  const dot = compact ? 'w-3 h-3' : 'w-5 h-5 sm:w-7 sm:h-7';
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`shrink-0 font-display font-extrabold truncate ${compact ? 'text-xs w-14' : 'text-base sm:text-xl w-24 sm:w-36'}`} style={{ color }}>
        {name}
      </span>
      <div className="flex items-center gap-1 sm:gap-1.5 flex-1">
        {Array.from({ length: stations }, (_, i) => {
          const done = i < position;
          const here = i === position && phase !== 'final' && phase !== 'done';
          return (
            <span
              key={i}
              className={`${dot} rounded-full shrink-0 transition-all ${here ? 'animate-pulse' : ''}`}
              style={{
                background: done ? color : 'transparent',
                border: `2px solid ${done || here ? color : 'var(--color-border)'}`,
              }}
            />
          );
        })}
        <span className={`shrink-0 ${compact ? 'text-sm' : 'text-xl sm:text-3xl'} ${phase === 'done' ? '' : 'grayscale opacity-50'}`} aria-hidden>
          {phase === 'done' ? '🏆' : '🧰'}
        </span>
      </div>
    </div>
  );
}

/** What a team is doing right now, in a few words. */
export function PhaseLabel({ phase, solved, need }: { phase: Phase; solved: number; need: number }) {
  if (phase === 'solve') return <FormattedMessage id="hunt.phase.solve" values={{ solved, need }} />;
  return <FormattedMessage id={`hunt.phase.${phase}`} />;
}
