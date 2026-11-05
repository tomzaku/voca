import type { CSSProperties } from 'react';
import { Icon } from '@iconify/react';
import type { SlideDecorKind } from '../lib/slideThemes';

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

export function SlideDecor({ kind, photo }: { kind: SlideDecorKind; photo?: string }) {
  if (kind === 'none' || (kind === 'photo' && !photo)) return null;
  return (
    <div aria-hidden className="slide-decor pointer-events-none absolute inset-0 overflow-hidden">
      {kind === 'paper' && <Paper />}
      {kind === 'chalk' && <Chalk />}
      {kind === 'night' && <Night />}
      {kind === 'sunny' && <Sunny />}
      {kind === 'ocean' && <Ocean />}
      {kind === 'photo' && photo && <Photo src={photo} />}
    </div>
  );
}

/**
 * The theme's one touch on the word — drawn in when each word appears, then
 * still. Sits behind (highlight) or under (chalk) the text, never over it.
 */
export function WordAccent({ kind }: { kind: 'highlight' | 'chalk' }) {
  if (kind === 'highlight') {
    return (
      <span
        aria-hidden
        className="slide-accent absolute -inset-x-2 bottom-[12%] h-[38%] -z-10 rounded-sm bg-[rgba(255,214,102,0.55)] origin-left -rotate-1"
        style={{ animation: 'slideSwipe 0.5s ease-out both' }}
      />
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 300 20" preserveAspectRatio="none" className="slide-accent absolute left-0 -bottom-2 w-full h-4 overflow-visible">
      <path
        d="M4 12 C70 6 150 16 296 8"
        fill="none"
        stroke="#ffe58a"
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
