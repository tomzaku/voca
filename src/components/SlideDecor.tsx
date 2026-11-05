import type { CSSProperties } from 'react';
import { Icon } from '@iconify/react';
import type { SlideAccent, SlideDecorKind } from '../lib/slideThemes';

// The backdrop of a themed slide deck (see slideThemes.ts for the rules it
// keeps): everything sits at the edges, anything that moves takes tens of
// seconds to do it, and `.slide-decor` freezes it all under
// prefers-reduced-motion. Purely decorative, so hidden from screen readers and
// from the pointer — a click on a star still advances the deck.

/** A fixed scatter, so the sky doesn't rearrange itself on every render. */
function scatter(n: number, seed: number) {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: n }, () => ({ x: rand(), y: rand(), r: rand(), t: rand() }));
}

const STARS = scatter(34, 7);
const BUBBLES = scatter(10, 3);

function Paper() {
  return (
    <>
      {/* Ruled lines and the red margin of a notebook page, faint enough to
          read over. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            'linear-gradient(to right, transparent 0, transparent 72px, rgba(225,80,80,0.28) 72px, rgba(225,80,80,0.28) 74px, transparent 74px)',
            'repeating-linear-gradient(to bottom, transparent 0, transparent 43px, rgba(70,120,200,0.13) 43px, rgba(70,120,200,0.13) 44px)',
          ].join(', '),
          backgroundPosition: '0 0, 0 96px',
        }}
      />
      {/* A strip of tape holding the page up, and a paper clip. */}
      <div className="absolute top-20 left-8 w-28 h-7 rotate-[-8deg] rounded-sm bg-[rgba(255,214,102,0.45)] shadow-sm" />
      <Icon icon="lucide:paperclip" className="absolute top-14 right-10 text-5xl text-[#a59d8a] rotate-[20deg] opacity-70" />
      <Icon icon="lucide:pencil" className="absolute bottom-20 right-8 text-4xl text-[#c9a25a] rotate-[-30deg] opacity-60 hidden sm:block" />
    </>
  );
}

function Chalk() {
  return (
    <>
      {/* Old smudges of wiped chalk. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(40% 25% at 18% 30%, rgba(255,255,255,0.05), transparent 70%)',
            'radial-gradient(35% 20% at 80% 65%, rgba(255,255,255,0.045), transparent 70%)',
            'radial-gradient(30% 18% at 60% 18%, rgba(255,255,255,0.035), transparent 70%)',
          ].join(', '),
        }}
      />
      {/* The wooden frame. */}
      <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 0 10px #7a4a24, inset 0 0 0 13px #5c3519, inset 0 0 40px 16px rgba(0,0,0,0.35)' }} />
      {/* The tray along the bottom, with chalk and a duster on it. */}
      <div className="absolute inset-x-0 bottom-0 h-3 bg-[#6b3f1d] shadow-[0_-2px_6px_rgba(0,0,0,0.35)]" />
      <div className="absolute bottom-3 left-[30%] w-10 h-2 rounded-full bg-[#f5f3e8] opacity-90" />
      <div className="absolute bottom-3 left-[calc(30%+48px)] w-7 h-2 rounded-full bg-[#ffe58a] opacity-90 rotate-[4deg]" />
      <div className="absolute bottom-3 right-[28%] w-16 h-4 rounded-sm bg-[#8a6a4a] border-b-4 border-[#d9d4c2]" />
    </>
  );
}

function Night() {
  return (
    <>
      {STARS.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x * 100}%`,
            top: `${s.y * 100}%`,
            width: 1.5 + s.r * 2.5,
            height: 1.5 + s.r * 2.5,
            animation: `themeTwinkle ${6 + s.t * 8}s ease-in-out ${-s.t * 10}s infinite`,
          }}
        />
      ))}
      {/* A crescent moon in the corner, glowing a little. */}
      <svg viewBox="0 0 100 100" className="absolute top-14 right-[8%] w-20 h-20 sm:w-28 sm:h-28" style={{ filter: 'drop-shadow(0 0 18px rgba(255,236,170,0.45))' }}>
        <path d="M62 10a40 40 0 1 0 28 62A32 32 0 1 1 62 10z" fill="#fff1c1" />
      </svg>
    </>
  );
}

function Cloud({ style }: { style: CSSProperties }) {
  return (
    <svg viewBox="0 0 120 50" className="absolute w-40 sm:w-56" style={style}>
      <path d="M20 45h80a18 18 0 0 0 0-36 26 26 0 0 0-48-4A20 20 0 0 0 20 45z" fill="#ffffff" opacity="0.85" />
    </svg>
  );
}

function Sunny() {
  return (
    <>
      {/* The sun, half off the edge below the toolbar (clear of the deck's
          name); its rays turn once every two minutes. */}
      <div className="absolute top-14 -left-24 w-48 h-48 sm:w-64 sm:h-64">
        <svg viewBox="0 0 200 200" className="absolute inset-0" style={{ animation: 'slideSpin 120s linear infinite' }}>
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x="96" y="6" width="8" height="34" rx="4" fill="#ffc43d" opacity="0.7" transform={`rotate(${i * 30} 100 100)`} />
          ))}
        </svg>
        <svg viewBox="0 0 200 200" className="absolute inset-0">
          <circle cx="100" cy="100" r="52" fill="#ffcf4d" />
        </svg>
      </div>
      {/* Clouds crossing the top, minutes apart. */}
      <Cloud style={{ top: '9%', animation: 'slideDrift 170s linear -40s infinite' }} />
      <Cloud style={{ top: '17%', animation: 'slideDrift 230s linear -150s infinite', transform: 'scale(0.7)' }} />
      {/* Soft hills along the bottom. */}
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 w-full h-20 sm:h-24">
        <path d="M0 70 Q200 20 420 60 T820 50 T1200 60 V120 H0z" fill="#cfe8a8" />
        <path d="M0 95 Q260 60 520 90 T1000 85 T1200 90 V120 H0z" fill="#b5dc8a" />
      </svg>
    </>
  );
}

/** A strip of waves twice the screen wide, slid by half to loop seamlessly. */
function Waves({ color, height, duration, offset }: { color: string; height: string; duration: number; offset: number }) {
  const crest = 'M0 30 Q75 0 150 30 T300 30 T450 30 T600 30 T750 30 T900 30 T1050 30 T1200 30 V60 H0z';
  return (
    <div className="absolute bottom-0 left-0 w-[200%] overflow-hidden" style={{ height, animation: `slideWave ${duration}s linear ${offset}s infinite` }}>
      <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="absolute inset-0 w-1/2 h-full"><path d={crest} fill={color} /></svg>
      <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="absolute inset-y-0 left-1/2 w-1/2 h-full"><path d={crest} fill={color} /></svg>
    </div>
  );
}

function Ocean() {
  return (
    <>
      {/* Bubbles only at the sides, rising slowly. */}
      {BUBBLES.map((b, i) => {
        const side = i % 2 === 0 ? b.x * 12 : 88 + b.x * 12;
        const size = 6 + b.r * 12;
        return (
          <span
            key={i}
            className="absolute rounded-full border border-white/50 bg-white/10"
            style={{
              left: `${side}%`,
              bottom: -30,
              width: size,
              height: size,
              animation: `themeRise ${22 + b.t * 16}s linear ${-b.t * 30}s infinite`,
            }}
          />
        );
      })}
      <Waves color="rgba(255,255,255,0.08)" height="5.5rem" duration={34} offset={-6} />
      <Waves color="rgba(255,255,255,0.12)" height="3.5rem" duration={22} offset={0} />
    </>
  );
}

function Photo({ src }: { src: string }) {
  return (
    <>
      {/* Blurred far enough to be a mood, not a picture to look at. */}
      <img
        src={src}
        alt=""
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'blur(22px) brightness(0.45) saturate(1.1)', animation: 'slideBreathe 40s ease-in-out infinite alternate' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_45%,rgba(0,0,0,0.15),rgba(0,0,0,0.55))]" />
    </>
  );
}

// ── Topic themes ────────────────────────────────────────────────────

const FLAG_COLORS = ['#f26b5b', '#ffc43d', '#5cc28a', '#4da3ff', '#a77bf3'];
const FLAGS = 21;

/** School: bunting across the top, letter blocks and crayons in the corners. */
function School() {
  return (
    <>
      {/* One swag of bunting just under the toolbar. */}
      <svg viewBox="0 0 1000 40" preserveAspectRatio="none" className="absolute inset-x-0 top-14 w-full h-10">
        <path d="M0 4 Q500 44 1000 4" fill="none" stroke="#8a7d6b" strokeWidth="1.5" vectorEffect="non-scaling-stroke" opacity="0.6" />
      </svg>
      {Array.from({ length: FLAGS }, (_, i) => {
        const t = i / (FLAGS - 1);
        // The same curve as the string: a quadratic dipping 20px mid-way.
        const sag = 4 + 40 * t * (1 - t) * 1.0;
        return (
          <span
            key={i}
            className="absolute -translate-x-1/2"
            style={{
              left: `${t * 100}%`,
              top: 56 + sag,
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: `16px solid ${FLAG_COLORS[i % FLAG_COLORS.length]}`,
              opacity: 0.75,
            }}
          />
        );
      })}
      {/* ABC blocks, stacked in the corner. */}
      <div className="absolute bottom-16 left-6 hidden sm:flex flex-col items-center gap-0.5 opacity-80">
        <Block letter="A" color="#f26b5b" />
        <div className="flex gap-0.5"><Block letter="B" color="#4da3ff" /><Block letter="C" color="#5cc28a" /></div>
      </div>
      {/* Crayons lying in the other corner. */}
      <svg viewBox="0 0 120 70" className="absolute bottom-16 right-6 w-28 sm:w-36 opacity-80 hidden sm:block">
        {['#f26b5b', '#ffc43d', '#4da3ff'].map((c, i) => (
          <g key={c} transform={`translate(6 ${12 + i * 18}) rotate(-8)`}>
            <rect width="88" height="12" rx="2" fill={c} />
            <rect x="14" width="6" height="12" fill="rgba(0,0,0,0.15)" />
            <path d="M88 0 L104 6 L88 12z" fill={c} />
          </g>
        ))}
      </svg>
    </>
  );
}

function Block({ letter, color }: { letter: string; color: string }) {
  return (
    <span
      className="w-10 h-10 rounded-md flex items-center justify-center font-display font-extrabold text-xl text-white shadow-sm"
      style={{ background: color, boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.15)' }}
    >
      {letter}
    </span>
  );
}

/** Travel: an old map — grid lines, a compass, passport stamps, a flight. */
function Travel() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            'repeating-linear-gradient(to right, transparent 0, transparent 119px, rgba(120,90,50,0.09) 119px, rgba(120,90,50,0.09) 120px)',
            'repeating-linear-gradient(to bottom, transparent 0, transparent 119px, rgba(120,90,50,0.09) 119px, rgba(120,90,50,0.09) 120px)',
          ].join(', '),
        }}
      />
      {/* The dashed route, and a small plane flying it once a minute. The
          route is a parabola; the plane's sideways move is linear and its
          rise-and-fall eased, which traces the same curve. */}
      <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-x-0 top-16 w-full h-24">
        <path d="M0 90 Q500 -30 1000 90" fill="none" stroke="#b5523b" strokeWidth="2" strokeDasharray="8 10" vectorEffect="non-scaling-stroke" opacity="0.45" />
      </svg>
      <div className="absolute top-16" style={{ animation: 'slideFlyX 60s linear infinite' }}>
        <div style={{ animation: 'slideFlyY 60s ease-in-out infinite' }}>
          {/* The icon points up-right; turned to fly along the route. */}
          <Icon icon="lucide:plane" className="text-2xl text-[#b5523b] -translate-x-1/2 -translate-y-1/2 rotate-45" />
        </div>
      </div>
      {/* A compass rose in one corner, stamps in the other. */}
      <svg viewBox="0 0 100 100" className="absolute bottom-14 left-6 w-20 h-20 sm:w-24 sm:h-24 opacity-50">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#857761" strokeWidth="2" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="#857761" strokeWidth="1" strokeDasharray="2 4" />
        <path d="M50 8 L57 50 L50 92 L43 50z" fill="#b5523b" opacity="0.8" />
        <path d="M8 50 L50 43 L92 50 L50 57z" fill="#857761" opacity="0.7" />
        <text x="50" y="7" textAnchor="middle" fontSize="9" fontWeight="700" fill="#857761">N</text>
      </svg>
      <Stamp className="bottom-16 right-8 rotate-[-14deg]" label="ARRIVED" color="#b5523b" />
      <Stamp className="top-36 right-[12%] rotate-[10deg] hidden sm:flex" label="VISA" color="#1e7fa8" />
    </>
  );
}

function Stamp({ className, label, color }: { className: string; label: string; color: string }) {
  return (
    <span
      className={`absolute flex flex-col items-center justify-center w-24 h-24 rounded-full border-[3px] border-double font-extrabold tracking-widest opacity-35 ${className}`}
      style={{ borderColor: color, color }}
    >
      <Icon icon="lucide:plane" className="text-lg" />
      <span className="text-[11px]">{label}</span>
    </span>
  );
}

/** Garden: vines in the top corners, grass and flowers along the bottom. */
function Vine({ side }: { side: 'left' | 'right' }) {
  return (
    // Mirrored around its own middle (the outer box), swaying from where it
    // hangs (the inner one) — one transform each, so neither undoes the other.
    <div className={`absolute top-12 ${side === 'left' ? 'left-4' : 'right-4 -scale-x-100'}`}>
      <div className="origin-top-left" style={{ animation: `slideSwayGentle 9s ease-in-out ${side === 'left' ? 0 : -4}s infinite alternate` }}>
      <svg viewBox="0 0 120 220" className="w-20 h-36 sm:w-28 sm:h-52">
        <path d="M10 0 C30 60 0 110 30 160 S40 210 50 220" fill="none" stroke="#5c9a4f" strokeWidth="3" strokeLinecap="round" />
        {[[22, 40, -30], [14, 90, 25], [30, 140, -20], [40, 190, 30]].map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx="16" ry="7" fill={i % 2 ? '#7cc06a' : '#5fae57'} transform={`rotate(${r} ${x} ${y}) translate(14 0)`} />
        ))}
      </svg>
      </div>
    </div>
  );
}

const BLADES = scatter(60, 11);
const FLOWERS = [[8, '#f28cb1'], [23, '#ffd23f'], [41, '#ffffff'], [64, '#f28cb1'], [79, '#b48cf2'], [93, '#ffd23f']] as const;

function Garden() {
  return (
    <>
      <Vine side="left" />
      <Vine side="right" />
      <svg viewBox="0 0 1000 60" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 w-full h-12 opacity-85">
        {BLADES.map((b, i) => {
          const x = (i / BLADES.length) * 1000 + b.x * 12;
          const h = 22 + b.r * 30;
          return <path key={i} d={`M${x} 60 Q${x + 4} ${60 - h / 2} ${x + (b.t - 0.5) * 14} ${60 - h}`} stroke={i % 3 ? '#7cc06a' : '#5fae57'} strokeWidth="5" fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      {FLOWERS.map(([x, c]) => (
        <svg key={x} viewBox="0 0 20 20" className="absolute bottom-6 w-5 h-5" style={{ left: `${x}%` }}>
          {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="10" cy="5" rx="3.5" ry="5" fill={c} transform={`rotate(${r} 10 10)`} />)}
          <circle cx="10" cy="10" r="3" fill="#f5a623" />
        </svg>
      ))}
      {/* One butterfly, resting in a corner and opening its wings slowly. */}
      <svg viewBox="0 0 40 30" className="absolute bottom-24 right-[14%] w-10 h-8 hidden sm:block">
        <g style={{ transformOrigin: '20px 15px', animation: 'slideFlap 3.2s ease-in-out infinite' }}>
          <ellipse cx="12" cy="11" rx="9" ry="8" fill="#f2a65a" />
          <ellipse cx="28" cy="11" rx="9" ry="8" fill="#f2a65a" />
          <ellipse cx="13" cy="21" rx="6" ry="5" fill="#e98a3d" />
          <ellipse cx="27" cy="21" rx="6" ry="5" fill="#e98a3d" />
        </g>
        <rect x="19" y="6" width="2" height="18" rx="1" fill="#5a3b22" />
      </svg>
    </>
  );
}

/** Kitchen: a checked tablecloth, a steaming mug, a couple of utensils. */
function Kitchen() {
  return (
    <>
      <Icon icon="lucide:utensils" className="absolute top-16 left-8 text-4xl text-[#c4572a] opacity-25 rotate-[-12deg]" />
      <Icon icon="lucide:chef-hat" className="absolute top-16 right-10 text-4xl text-[#c4572a] opacity-25 rotate-[10deg]" />
      <div
        className="absolute inset-x-0 bottom-0 h-14 shadow-[0_-3px_10px_rgba(0,0,0,0.06)]"
        style={{
          backgroundColor: '#fffaf4',
          backgroundImage: [
            'repeating-linear-gradient(90deg, rgba(214,72,58,0.28) 0 18px, transparent 18px 36px)',
            'repeating-linear-gradient(0deg, rgba(214,72,58,0.28) 0 18px, transparent 18px 36px)',
          ].join(', '),
        }}
      />
      {/* The mug sits on the cloth; its steam rises and fades. */}
      <div className="absolute bottom-10 right-[10%] hidden sm:block">
        {[0, 1, 2].map((i) => (
          <svg key={i} viewBox="0 0 10 30" className="absolute w-3 h-8 -top-9" style={{ left: 10 + i * 12, animation: `slideSteam 6s ease-in-out ${-i * 2}s infinite` }}>
            <path d="M5 30 C0 22 10 16 5 8 S5 2 5 0" fill="none" stroke="#b9a593" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ))}
        <svg viewBox="0 0 60 50" className="w-16 h-14">
          <path d="M44 14 h6 a8 8 0 0 1 0 16 h-6" fill="none" stroke="#c4572a" strokeWidth="4" />
          <rect x="4" y="6" width="42" height="40" rx="6" fill="#c4572a" />
          <rect x="4" y="6" width="42" height="7" rx="3" fill="#a64522" />
        </svg>
      </div>
    </>
  );
}

const CITY_STARS = STARS.slice(0, 14);

/** The skyline, laid out once: towers side by side, 4 units apart. */
const TOWERS = scatter(16, 21).reduce<{ x: number; w: number; h: number; i: number; t: number }[]>((acc, b, i) => {
  const prev = acc[acc.length - 1];
  const x = prev ? prev.x + prev.w + 4 : 0;
  acc.push({ x, w: 50 + b.x * 40, h: 70 + b.r * 130, i, t: b.t });
  return acc;
}, []);
const SKYLINE_WIDTH = TOWERS[TOWERS.length - 1].x + TOWERS[TOWERS.length - 1].w;

/** City: a dusk skyline, a few windows lighting up and going dark. */
function City() {
  return (
    <>
      {CITY_STARS.map((s, i) => (
        <span key={i} className="absolute rounded-full bg-white" style={{
          left: `${s.x * 100}%`, top: `${s.y * 45}%`, width: 2, height: 2,
          animation: `themeTwinkle ${7 + s.t * 8}s ease-in-out ${-s.t * 10}s infinite`,
        }} />
      ))}
      <svg viewBox={`0 0 ${SKYLINE_WIDTH} 200`} preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 w-full h-40 sm:h-48">
        {TOWERS.map((t) => (
          <g key={t.i}>
            <rect x={t.x} y={200 - t.h} width={t.w} height={t.h} fill={t.i % 2 ? '#10142e' : '#161b3a'} />
            {Array.from({ length: Math.floor((t.h - 16) / 18) }, (_, row) =>
              Array.from({ length: Math.floor((t.w - 10) / 14) }, (_, col) => {
                const n = (t.i * 31 + row * 7 + col * 13) % 23;
                if (n > 6) return null; // most windows stay dark
                return (
                  <rect
                    key={`${row}-${col}`}
                    x={t.x + 7 + col * 14}
                    y={200 - t.h + 10 + row * 18}
                    width="7"
                    height="9"
                    fill="#ffd479"
                    opacity="0.75"
                    style={n < 2 ? { animation: `slideWindow ${12 + n * 7 + t.t * 10}s ease-in-out ${-t.t * 20}s infinite` } : undefined}
                  />
                );
              }),
            )}
          </g>
        ))}
      </svg>
    </>
  );
}

export function SlideDecor({ kind, photo }: { kind: SlideDecorKind; photo?: string }) {
  if (kind === 'none' || (kind === 'photo' && !photo)) return null;
  return (
    <div aria-hidden className="slide-decor pointer-events-none absolute inset-0 overflow-hidden">
      {kind === 'paper' && <Paper />}
      {kind === 'chalk' && <Chalk />}
      {kind === 'night' && <Night />}
      {kind === 'sunny' && <Sunny />}
      {kind === 'ocean' && <Ocean />}
      {kind === 'school' && <School />}
      {kind === 'travel' && <Travel />}
      {kind === 'garden' && <Garden />}
      {kind === 'kitchen' && <Kitchen />}
      {kind === 'city' && <City />}
      {kind === 'photo' && photo && <Photo src={photo} />}
    </div>
  );
}

/**
 * The theme's one touch on the word — drawn in when each word appears, then
 * still. Sits behind (highlight) or under (chalk, route) the text, never over it.
 */
export function WordAccent({ kind, color }: { kind: SlideAccent; color?: string }) {
  if (kind === 'highlight') {
    return (
      <span
        aria-hidden
        className="slide-accent absolute -inset-x-2 bottom-[12%] h-[38%] -z-10 rounded-sm origin-left -rotate-1"
        style={{ background: color ?? 'rgba(255,214,102,0.55)', animation: 'slideSwipe 0.5s ease-out both' }}
      />
    );
  }
  if (kind === 'route') {
    // A dashed route from a start dot to a pin, unrolled left to right.
    return (
      <span aria-hidden className="slide-accent absolute left-0 right-0 -bottom-3 h-4 flex items-center origin-left" style={{ animation: 'slideSwipe 0.9s ease-out both', color: color ?? '#b5523b' }}>
        <span className="w-2.5 h-2.5 rounded-full bg-current shrink-0" />
        <span className="flex-1 mx-1 border-t-[3px] border-dashed border-current opacity-80" />
        <Icon icon="lucide:map-pin" className="text-xl shrink-0 -translate-y-1" />
      </span>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 300 20" preserveAspectRatio="none" className="slide-accent absolute left-0 -bottom-2 w-full h-4 overflow-visible">
      <path
        d="M4 12 C70 6 150 16 296 8"
        fill="none"
        stroke={color ?? '#ffe58a'}
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.85"
        strokeDasharray="320"
        strokeDashoffset="320"
        style={{ animation: 'slideDraw 0.8s ease-out 0.15s forwards' }}
      />
    </svg>
  );
}
