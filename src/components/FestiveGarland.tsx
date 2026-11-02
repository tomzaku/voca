import { useFestive } from '../hooks/useFestive';

/**
 * A string of Tết lanterns hanging just under the top bar while the festive
 * decorations are up (Settings → Festive decorations). Purely decoration:
 * it lets clicks through and is hidden from screen readers.
 */
export function FestiveGarland() {
  const active = useFestive((s) => s.active);
  if (!active) return null;
  // Spread evenly; the in-between ones drop out on a phone to leave room.
  const spots = [4, 16, 28, 40, 52, 64, 76, 88, 96];
  // Tied at each lantern, sagging between: from the left edge, through every
  // lantern's top, to the right edge.
  const ties = [0, ...spots, 100];
  const cord = ties.slice(1).reduce((d, x, i) => `${d} Q${(ties[i] + x) / 2} 5 ${x} 1`, 'M0 1');
  return (
    <div aria-hidden className="pointer-events-none absolute left-0 right-0 top-full h-9 overflow-visible">
      {/* The cord, dipping between the lanterns. */}
      <svg className="absolute inset-x-0 top-0 w-full h-3" viewBox="0 0 100 6" preserveAspectRatio="none">
        <path
          d={cord}
          fill="none"
          stroke="#9c1414"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {spots.map((left, i) => (
        <span
          key={left}
          className={`festive-sway absolute top-1 ${i % 2 ? 'hidden sm:block' : ''}`}
          style={{ left: `${left}%`, animationDelay: `${(i * 0.37) % 1.6}s` }}
        >
          <Lantern />
        </span>
      ))}
    </div>
  );
}

/** A small round red lantern with gold caps and a tassel. */
function Lantern() {
  return (
    <svg width="14" height="24" viewBox="0 0 14 24" className="drop-shadow-sm">
      <rect x="6.25" y="0" width="1.5" height="3" fill="#c98f12" />
      <rect x="4" y="3" width="6" height="2" rx="0.5" fill="#ffcf3f" />
      <ellipse cx="7" cy="10.5" rx="6.5" ry="6" fill="#d42a2a" />
      <path d="M4.5 5.5 Q3 10.5 4.5 15.5 M9.5 5.5 Q11 10.5 9.5 15.5 M7 4.5 V16.5" stroke="#9c1414" strokeWidth="0.8" fill="none" />
      <ellipse cx="4.2" cy="8.5" rx="1" ry="2" fill="#ff7a6a" opacity="0.8" />
      <rect x="4" y="16" width="6" height="2" rx="0.5" fill="#ffcf3f" />
      <rect x="6.25" y="18" width="1.5" height="6" fill="#c98f12" />
    </svg>
  );
}
