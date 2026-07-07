import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { AnimalAvatar } from './AnimalAvatar';
import { useCompanion } from '../hooks/useCompanion';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { getAnimal, stageIndex } from '../lib/companion';

/** A collection rendered as a station on the map. */
export interface WorldStation {
  id: string;
  name: string;
  kind: 'mine' | 'joined' | 'level';
  words: string[];
  /** Percent of the words the viewer has finished. */
  pct: number;
  /** Currently the active (studying) collection. */
  active: boolean;
}

interface Props {
  stations: WorldStation[];
  onStudy: (s: WorldStation) => void;
  onPreview: (s: WorldStation) => void;
  onQuiz: (s: WorldStation) => void;
}

// ── World geometry ──
const WORLD_W = 860;          // fixed world width (camera pans if viewport is narrower)
const TOP_Y = 210;            // y of the first station
const GAP_Y = 190;            // vertical spacing between stations
const SPAWN = { x: WORLD_W / 2, y: 80 };
const SPEED = 250;            // buddy speed, px/s
const REACH = 105;            // distance at which a station "opens"

const KIND_META: Record<WorldStation['kind'], { label: string; icon: string; color: string }> = {
  mine:   { label: 'My collection', icon: 'lucide:user',           color: 'var(--color-accent-cyan)' },
  joined: { label: 'Joined',        icon: 'lucide:users',          color: 'var(--color-accent-purple)' },
  level:  { label: 'Level',         icon: 'lucide:graduation-cap', color: 'var(--color-accent-green)' },
};

const DECOR = ['🌳', '🌷', '🪨', '🌲', '🍄', '🌼', '🌾', '🌻'];

interface Placed extends WorldStation {
  x: number;
  y: number;
  /** First station of its kind — carries the zone label chip. */
  zoneStart: boolean;
}

/** Stations zig-zag left/right down a winding path. */
function layoutStations(stations: WorldStation[]): Placed[] {
  return stations.map((s, i) => ({
    ...s,
    x: (i % 2 === 0 ? 235 : WORLD_W - 235) + Math.round(Math.sin(i * 2.1) * 28),
    y: TOP_Y + i * GAP_Y,
    zoneStart: i === 0 || stations[i - 1].kind !== s.kind,
  }));
}

/**
 * Explore mode for the Collections page: a tiny top-down world where your
 * companion strolls a winding path and every collection is a station along it.
 * Walk close (arrows/WASD, or tap the ground) and the station opens with
 * Study / Preview / Quiz actions — Gather.town, vocabulary edition.
 *
 * Movement runs on refs + requestAnimationFrame so React only re-renders when
 * the nearest station changes, never per frame.
 */
export function CollectionWorld({ stations, onStudy, onPreview, onQuiz }: Props) {
  const animalId = useCompanion((s) => s.animalId);
  const buddyName = useCompanion((s) => s.name);
  const known = useVocabularyStore(
    (s) => Object.values(s.progress).filter((e) => e.status === 'known').length,
  );
  const animal = getAnimal(animalId ?? 'fox');
  const stage = stageIndex(known);

  const placed = useMemo(() => layoutStations(stations), [stations]);
  const worldH = TOP_Y + Math.max(placed.length - 1, 0) * GAP_Y + 170;

  // Ambient props scattered beside the path, deterministic per station.
  const decor = useMemo(
    () =>
      placed.map((p, i) => ({
        emoji: DECOR[i % DECOR.length],
        x: p.x < WORLD_W / 2 ? WORLD_W - 120 - (i % 3) * 55 : 90 + (i % 3) * 55,
        y: p.y + GAP_Y / 2 - 30,
      })),
    [placed],
  );

  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const walkRef = useRef<HTMLDivElement>(null);
  const targetMarkRef = useRef<HTMLDivElement>(null);

  const [nearestId, setNearestId] = useState<string | null>(null);
  const nearest = nearestId ? placed.find((p) => p.id === nearestId) ?? null : null;

  // Mutable game state — never triggers renders.
  const game = useRef({
    x: SPAWN.x, y: SPAWN.y,
    camX: 0, camY: 0, camSet: false,
    keys: new Set<string>(),
    target: null as { x: number; y: number } | null,
    facing: 1,
    nearestId: null as string | null,
  });

  // Latest props for the loop/keyboard without re-subscribing.
  const live = useRef({ placed, onStudy });
  live.current = { placed, onStudy };

  // ── Keyboard ──
  useEffect(() => {
    const DIRS: Record<string, string> = {
      arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down',
      arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
    };
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const dir = DIRS[e.key.toLowerCase()];
      if (dir) {
        e.preventDefault();
        game.current.keys.add(dir);
        game.current.target = null; // keyboard overrides tap-to-walk
      } else if ((e.key === 'Enter' || e.key === ' ') && game.current.nearestId) {
        const s = live.current.placed.find((p) => p.id === game.current.nearestId);
        if (s) { e.preventDefault(); live.current.onStudy(s); }
      }
    };
    const up = (e: KeyboardEvent) => {
      const dir = DIRS[e.key.toLowerCase()];
      if (dir) game.current.keys.delete(dir);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // ── Game loop ──
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const g = game.current;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      // Velocity from keys, else from the tap target.
      let vx = 0, vy = 0;
      if (g.keys.size > 0) {
        if (g.keys.has('left')) vx -= 1;
        if (g.keys.has('right')) vx += 1;
        if (g.keys.has('up')) vy -= 1;
        if (g.keys.has('down')) vy += 1;
        const len = Math.hypot(vx, vy) || 1;
        vx = (vx / len) * SPEED; vy = (vy / len) * SPEED;
      } else if (g.target) {
        const dx = g.target.x - g.x, dy = g.target.y - g.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 6) g.target = null;
        else { vx = (dx / dist) * SPEED; vy = (dy / dist) * SPEED; }
      }

      g.x = Math.min(Math.max(g.x + vx * dt, 44), WORLD_W - 44);
      g.y = Math.min(Math.max(g.y + vy * dt, 50), worldH - 50);
      if (vx !== 0) g.facing = vx > 0 ? 1 : -1;

      // Camera follows, clamped to the world (centered if the world fits).
      const vp = viewportRef.current;
      if (vp) {
        const vw = vp.clientWidth, vh = vp.clientHeight;
        const tx = WORLD_W <= vw ? (WORLD_W - vw) / 2 : Math.min(Math.max(g.x - vw / 2, 0), WORLD_W - vw);
        const ty = worldH <= vh ? 0 : Math.min(Math.max(g.y - vh / 2, 0), worldH - vh);
        if (!g.camSet) { g.camX = tx; g.camY = ty; g.camSet = true; }
        const ease = Math.min(dt * 7, 1);
        g.camX += (tx - g.camX) * ease;
        g.camY += (ty - g.camY) * ease;
      }

      // Paint (transforms only — no React).
      if (worldRef.current) {
        worldRef.current.style.transform = `translate3d(${-Math.round(g.camX)}px, ${-Math.round(g.camY)}px, 0)`;
      }
      if (playerRef.current) {
        playerRef.current.style.transform = `translate(${g.x}px, ${g.y}px)`;
      }
      if (faceRef.current) faceRef.current.style.transform = `scaleX(${g.facing})`;
      const moving = vx !== 0 || vy !== 0;
      walkRef.current?.classList.toggle('world-walking', moving);
      const mark = targetMarkRef.current;
      if (mark) {
        mark.style.display = g.target ? '' : 'none';
        if (g.target) mark.style.transform = `translate(${g.target.x}px, ${g.target.y}px)`;
      }

      // Nearest station within reach → open its card (rare state change).
      let best: Placed | null = null;
      let bestD = REACH;
      for (const p of live.current.placed) {
        const d = Math.hypot(p.x - g.x, p.y - g.y);
        if (d < bestD) { best = p; bestD = d; }
      }
      const id = best?.id ?? null;
      if (id !== g.nearestId) { g.nearestId = id; setNearestId(id); }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [worldH]);

  /** Tap/click the ground → walk there. */
  const walkTo = (e: React.PointerEvent) => {
    const world = worldRef.current;
    if (!world) return;
    const rect = world.getBoundingClientRect();
    game.current.target = {
      x: Math.min(Math.max(e.clientX - rect.left, 44), WORLD_W - 44),
      y: Math.min(Math.max(e.clientY - rect.top, 50), worldH - 50),
    };
    game.current.keys.clear();
  };

  // The path polyline: spawn → every station, drawn as a wide rounded stroke.
  const pathD = useMemo(() => {
    const pts = [[SPAWN.x, SPAWN.y - 10], ...placed.map((p) => [p.x, p.y + 26])];
    return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  }, [placed]);

  return (
    <div
      ref={viewportRef}
      className="relative h-[62vh] min-h-[400px] rounded-2xl border-2 border-border overflow-hidden select-none touch-none"
      style={{ background: 'var(--color-bg-secondary)' }}
    >
      {/* ── The world (camera pans this) ── */}
      <div
        ref={worldRef}
        className="absolute top-0 left-0 will-change-transform world-ground"
        style={{ width: WORLD_W, height: worldH }}
        onPointerDown={walkTo}
      >
        {/* Path */}
        <svg className="absolute inset-0 pointer-events-none" width={WORLD_W} height={worldH}>
          <path d={pathD} fill="none" stroke="var(--color-bg-card)" strokeWidth="52" strokeLinejoin="round" strokeLinecap="round" />
          <path d={pathD} fill="none" stroke="var(--color-border)" strokeWidth="52" strokeLinejoin="round" strokeLinecap="round" opacity="0.25" strokeDasharray="2 26" />
        </svg>

        {/* Ambient props */}
        {decor.map((d, i) => (
          <span
            key={i}
            className="absolute text-2xl pointer-events-none opacity-80"
            style={{ left: d.x, top: d.y, transform: 'translate(-50%, -50%)' }}
          >
            {d.emoji}
          </span>
        ))}

        {/* Spawn sign */}
        <div
          className="absolute pointer-events-none text-center"
          style={{ left: SPAWN.x, top: SPAWN.y - 58, transform: 'translateX(-50%)' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted bg-bg-card/80 border border-border rounded-full px-2 py-0.5">
            Word Meadow
          </span>
        </div>

        {/* Stations */}
        {placed.map((p) => {
          const meta = KIND_META[p.kind];
          const near = p.id === nearestId;
          return (
            <div key={p.id} className="absolute" style={{ left: p.x, top: p.y, transform: 'translate(-50%, -50%)' }}>
              {p.zoneStart && (
                <span
                  className="absolute left-1/2 -translate-x-1/2 -top-12 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border"
                  style={{ color: meta.color, borderColor: meta.color, background: 'var(--color-bg-secondary)' }}
                >
                  {p.kind === 'mine' ? 'My collections' : p.kind === 'joined' ? 'Joined' : 'Levels'}
                </span>
              )}
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  // Walking up to it opens the card — same as strolling over.
                  game.current.target = { x: p.x, y: p.y + 62 };
                  game.current.keys.clear();
                }}
                className={`w-[104px] flex flex-col items-center gap-1 rounded-2xl border-2 bg-bg-card p-2 pt-2.5 transition-all ${
                  near ? 'scale-110 shadow-xl' : 'hover:scale-105'
                }`}
                style={{
                  borderColor: near || p.active ? meta.color : 'var(--color-border)',
                  boxShadow: near ? `0 0 22px ${meta.color}55` : undefined,
                }}
              >
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${near ? 'world-station-glow' : ''}`}
                  style={{ background: `color-mix(in srgb, ${meta.color} 18%, transparent)`, color: meta.color }}
                >
                  <Icon icon={meta.icon} className="text-lg" />
                </span>
                <span className="w-full text-[11px] font-display font-bold text-text-primary leading-tight text-center line-clamp-2">
                  {p.name}
                </span>
                <span className="text-[9px] font-bold text-text-muted">{p.words.length} words</span>
                <span className="w-full h-1 rounded-full bg-bg-tertiary overflow-hidden">
                  <span className="block h-full rounded-full" style={{ width: `${p.pct}%`, background: meta.color }} />
                </span>
              </button>
              {p.active && (
                <span
                  className="absolute left-1/2 -translate-x-1/2 -bottom-6 whitespace-nowrap text-[9px] font-extrabold uppercase tracking-wider rounded-full px-2 py-0.5"
                  style={{ background: meta.color, color: 'var(--color-bg-primary)' }}
                >
                  Studying
                </span>
              )}
            </div>
          );
        })}

        {/* Tap-to-walk marker */}
        <div
          ref={targetMarkRef}
          className="absolute -top-2 -left-2 w-4 h-4 rounded-full border-2 pointer-events-none world-target-ping"
          style={{ display: 'none', borderColor: 'var(--color-accent-yellow)' }}
        />

        {/* ── The buddy ── */}
        <div ref={playerRef} className="absolute top-0 left-0 pointer-events-none z-10" style={{ transform: `translate(${SPAWN.x}px, ${SPAWN.y}px)` }}>
          <div className="relative -translate-x-1/2 -translate-y-[70%]">
            <span
              className="absolute left-1/2 bottom-0.5 w-11 h-3 -translate-x-1/2 rounded-full"
              style={{ background: 'rgba(0,0,0,0.28)' }}
            />
            <div ref={faceRef}>
              <div ref={walkRef} className="world-buddy">
                <AnimalAvatar animalId={animal.id} stage={stage} mood="static" size={72} />
              </div>
            </div>
            <span className="absolute left-1/2 -bottom-4 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-text-primary bg-bg-card/85 border border-border rounded-full px-2 py-px">
              {buddyName || animal.name}
            </span>
          </div>
        </div>
      </div>

      {/* ── HUD (fixed to the viewport) ── */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[11px] font-bold text-text-muted bg-bg-card/85 border border-border rounded-full px-2.5 py-1 pointer-events-none">
        <Icon icon="lucide:gamepad-2" className="text-accent-yellow" />
        <span className="hidden sm:inline">Walk with WASD / arrows, or tap the ground</span>
        <span className="sm:hidden">Tap the ground to walk</span>
      </div>
      {!animalId && (
        <Link
          to="/companion"
          className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px] font-bold text-accent-orange bg-bg-card/85 border border-accent-orange/40 rounded-full px-2.5 py-1"
        >
          <Icon icon="lucide:paw-print" />
          Choose your buddy
        </Link>
      )}

      {/* ── Station card (opens when the buddy is close) ── */}
      {nearest && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(94%,380px)] rounded-2xl border-2 bg-bg-card shadow-2xl p-3 animate-fade-in"
          style={{ borderColor: KIND_META[nearest.kind].color }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center"
              style={{
                background: `color-mix(in srgb, ${KIND_META[nearest.kind].color} 18%, transparent)`,
                color: KIND_META[nearest.kind].color,
              }}
            >
              <Icon icon={KIND_META[nearest.kind].icon} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-text-primary text-sm truncate">{nearest.name}</p>
              <p className="text-[10px] font-bold text-text-muted">
                {KIND_META[nearest.kind].label} · {nearest.words.length} words · {nearest.pct}% done
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStudy(nearest)}
              className="btn-3d flex-1 py-2 text-xs font-bold text-bg-primary"
              style={{ background: KIND_META[nearest.kind].color }}
            >
              {nearest.active ? 'Studying ✓' : 'Study this'}
              <span className="hidden sm:inline opacity-70"> · Enter ↵</span>
            </button>
            <button
              onClick={() => onPreview(nearest)}
              title="Preview words"
              className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center border border-border bg-bg-tertiary text-text-muted hover:text-accent-cyan transition-all"
            >
              <Icon icon="lucide:eye" className="text-sm" />
            </button>
            <button
              onClick={() => onQuiz(nearest)}
              title="Quiz this collection"
              className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center border border-border bg-bg-tertiary text-text-muted hover:text-accent-green transition-all"
            >
              <Icon icon="lucide:play" className="text-sm" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
