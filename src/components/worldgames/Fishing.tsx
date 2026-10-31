import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { BITE_MS, FISH, ZONE, biteFor, escaped, landed, startReel, stepReel, waitFor, type Fish, type Reel } from '../../lib/fishing';
import { playCorrect, playSelect, playWin, playWrong } from '../../lib/sfx';
import { PixelButton } from './pixel';

// Fishing off the ironwood boardwalk: hold to swing back and let go to cast
// (further for longer, and only far out do the rare ones bite); wait for the
// bobber to dip and strike; then reel — hold to lift your catch zone, let go
// to let it sink, and keep the fish in it until the line's full. Your catches
// go in a creel kept on this device. Space, a click or a tap does it all.
// The rules are lib/fishing.

type Phase =
  | { kind: 'ready' }
  | { kind: 'charging'; since: number }
  | { kind: 'waiting'; power: number; biteAt: number }
  | { kind: 'bite'; power: number; until: number }
  | { kind: 'reeling'; fish: Fish; size: number; reel: Reel }
  | { kind: 'caught'; fish: Fish; size: number }
  | { kind: 'lost'; why: 'early' | 'late' | 'escaped' };

const CREEL = 'voca-creel';
type Creel = Record<string, { count: number; best: number }>;
const loadCreel = (): Creel => { try { return JSON.parse(localStorage.getItem(CREEL) ?? '{}') as Creel; } catch { return {}; } };

/** How far the cast goes for how long you held (it swings back and forth). */
const powerOf = (ms: number) => { const t = (ms / 1100) % 2; return t < 1 ? t : 2 - t; };

/** A fish, drawn in a few blocks of its colour. */
function FishIcon({ fish, size = 40 }: { fish: Fish; size?: number }) {
  return (
    <svg width={size} height={size * 0.55} viewBox="0 0 20 11" shapeRendering="crispEdges" aria-hidden>
      <rect x="3" y="3" width="11" height="5" fill={fish.color} />
      <rect x="5" y="2" width="7" height="7" fill={fish.color} />
      <rect x="14" y="2" width="2" height="2" fill={fish.color} /><rect x="14" y="7" width="2" height="2" fill={fish.color} />
      <rect x="16" y="1" width="2" height="2" fill={fish.color} /><rect x="16" y="8" width="2" height="2" fill={fish.color} />
      <rect x="3" y="7" width="11" height="1" fill="#000" opacity="0.25" />
      <rect x="5" y="4" width="1" height="1" fill="#111" />
      <rect x="1" y="5" width="2" height="1" fill={fish.color} />
    </svg>
  );
}

export function Fishing({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>({ kind: 'ready' });
  const [creel, setCreel] = useState<Creel>(loadCreel);
  const [now, setNow] = useState(() => Date.now());
  const holding = useRef(false);
  // The latest phase, for the frame loop and the key handlers — kept in step
  // as it's set, so a frame never acts on a phase that's already moved on.
  const phaseRef = useRef(phase);
  const go = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  // The clock: the cast's swing, the bite's timing, the reel's motion.
  useEffect(() => {
    let last = performance.now(), raf = 0;
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const n = Date.now();
      setNow(n);
      const p = phaseRef.current;
      if (p.kind === 'waiting' && n >= p.biteAt) { playSelect(); go({ kind: 'bite', power: p.power, until: n + BITE_MS }); }
      else if (p.kind === 'bite' && n >= p.until) { playWrong(); go({ kind: 'lost', why: 'late' }); }
      else if (p.kind === 'reeling') {
        const reel = stepReel(p.reel, p.fish, holding.current, dt);
        if (landed(reel)) {
          playWin();
          setCreel((c) => {
            const prev = c[p.fish.id] ?? { count: 0, best: 0 };
            const next = { ...c, [p.fish.id]: { count: prev.count + 1, best: Math.max(prev.best, p.size) } };
            try { localStorage.setItem(CREEL, JSON.stringify(next)); } catch { /* ignore */ }
            return next;
          });
          go({ kind: 'caught', fish: p.fish, size: p.size });
        } else if (escaped(reel)) { playWrong(); go({ kind: 'lost', why: 'escaped' }); }
        else go({ ...p, reel });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  /** Press: start the swing, strike a bite, or start reeling in. */
  const press = () => {
    holding.current = true;
    const p = phaseRef.current, n = Date.now();
    if (p.kind === 'ready' || p.kind === 'caught' || p.kind === 'lost') go({ kind: 'charging', since: n });
    else if (p.kind === 'waiting') { playWrong(); go({ kind: 'lost', why: 'early' }); }
    else if (p.kind === 'bite') { playCorrect(); const { fish, size } = biteFor(p.power); go({ kind: 'reeling', fish, size, reel: startReel() }); }
  };
  /** Release: let the cast fly. */
  const release = () => {
    holding.current = false;
    const p = phaseRef.current, n = Date.now();
    if (p.kind === 'charging') { playSelect(); go({ kind: 'waiting', power: powerOf(n - p.since), biteAt: n + waitFor() }); }
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); press(); } };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); release(); } };
    window.addEventListener('keydown', down, true);
    window.addEventListener('keyup', up, true);
    return () => { window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', up, true); };
  }, []);

  // Where the bobber sits on the water: further out for a longer cast.
  const power = phase.kind === 'charging' ? powerOf(now - phase.since) : 'power' in phase ? phase.power : 0.5;
  const bobberX = 12 + power * 76;
  const dip = phase.kind === 'bite' ? 6 + Math.sin(now / 50) * 3 : phase.kind === 'waiting' ? Math.sin(now / 400) * 1.5 : 0;
  const caughtList = FISH.filter((f) => creel[f.id]);

  const prompt: Record<Phase['kind'], string> = {
    ready: 'world.fishReady', charging: 'world.fishCharging', waiting: 'world.fishWaiting', bite: 'world.fishBite',
    reeling: 'world.fishReeling', caught: 'world.fishCaught', lost: 'world.fishLost',
  };

  return (
    <div className="px absolute inset-0 z-40 flex items-end sm:items-center justify-center p-3 bg-black/25" onKeyDown={(e) => e.stopPropagation()}>
      <div className="px-notch px-frame w-full max-w-[560px] p-4 px-in-up">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="px-title !text-[18px] text-[var(--px-gold)]">🎣 <FormattedMessage id="world.fishTitle" /></p>
            <p className="text-[13px] text-[var(--px-muted)]"><FormattedMessage id="places.dragonBoat" /></p>
          </div>
          <button onClick={onClose} className="px-title !text-[12px] text-[var(--px-muted)] hover:text-[var(--px-text)] mt-1">
            <FormattedMessage id="world.focusLeave" />
          </button>
        </div>

        {/* The water, and the line: press and hold here (or Space). */}
        <div
          className="relative h-44 px-notch overflow-hidden select-none touch-none cursor-pointer"
          style={{ background: 'linear-gradient(#5ea8d8, #2f6f9e)' }}
          onPointerDown={(e) => { e.preventDefault(); press(); }}
          onPointerUp={release}
          onPointerLeave={() => { if (holding.current) release(); }}
        >
          {[18, 42, 70, 96, 128].map((y, i) => (
            <span key={i} className="absolute h-[2px] w-10 bg-white/40" style={{ top: y, left: `${(i * 23 + now / 60) % 110 - 10}%` }} />
          ))}
          {phase.kind !== 'reeling' && phase.kind !== 'ready' && phase.kind !== 'caught' && phase.kind !== 'lost' && (
            <span className="absolute w-3 h-4" style={{ left: `${bobberX}%`, top: 70 + dip }}>
              <span className="block w-3 h-2 bg-[#e8483a]" /><span className="block w-3 h-2 bg-white" />
            </span>
          )}
          {phase.kind === 'charging' && (
            <div className="absolute left-3 right-3 bottom-3 h-2 bg-black/30">
              <div className="h-full bg-[var(--px-gold)]" style={{ width: `${power * 100}%` }} />
            </div>
          )}
          {phase.kind === 'reeling' && (
            <div className="absolute inset-y-3 right-6 w-10 bg-black/35 border-2 border-[#1c1714]">
              <div className="absolute inset-x-0 bg-[var(--px-jade)]/60 border-y-2 border-[var(--px-jade)]" style={{ bottom: `${phase.reel.zone * 100}%`, height: `${ZONE * 100}%` }} />
              <span className="absolute left-1/2 -translate-x-1/2 translate-y-1/2" style={{ bottom: `${phase.reel.fish * 100}%` }}><FishIcon fish={phase.fish} size={26} /></span>
            </div>
          )}
          {phase.kind === 'reeling' && (
            <div className="absolute inset-y-3 right-2 w-2 bg-black/35">
              <div className="absolute bottom-0 inset-x-0 bg-[var(--px-gold)]" style={{ height: `${phase.reel.catch * 100}%` }} />
            </div>
          )}
          {phase.kind === 'caught' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <FishIcon fish={phase.fish} size={96} />
              <p className="px-title !text-[18px] mt-1">{phase.fish.name}</p>
              <p className="px-num !text-[14px]">{phase.size} cm</p>
            </div>
          )}
        </div>

        <p className="mt-2 mb-3 text-[14px] min-h-[1.5em]" style={{ color: phase.kind === 'bite' ? 'var(--px-gold)' : undefined }}>
          <FormattedMessage id={prompt[phase.kind]} values={{ why: phase.kind === 'lost' ? phase.why : '' }} />
        </p>

        {/* The creel. */}
        <div className="px-inset px-notch p-2">
          <p className="px-title !text-[12px] text-[var(--px-muted)] mb-1"><FormattedMessage id="world.fishCreel" /></p>
          {caughtList.length === 0
            ? <p className="text-[13px] text-[var(--px-muted)]"><FormattedMessage id="world.fishEmpty" /></p>
            : (
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {caughtList.map((f) => (
                  <span key={f.id} className="flex items-center gap-1 text-[13px]">
                    <FishIcon fish={f} size={22} /> {f.name} ×{creel[f.id].count} · {creel[f.id].best} cm
                  </span>
                ))}
              </div>
            )}
        </div>
        <div className="mt-3 sm:hidden">
          <PixelButton tone="paper" block onClick={onClose}><FormattedMessage id="world.focusLeave" /></PixelButton>
        </div>
      </div>
    </div>
  );
}
