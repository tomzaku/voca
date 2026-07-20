import { useEffect, useRef, useState, type ReactNode } from 'react';
import Phaser from 'phaser';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { MemberAvatars } from './MemberAvatars';
import { useCompanion } from '../hooks/useCompanion';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { getAnimal, stageIndex } from '../lib/companion';
import { WorldScene, type WorldSceneData } from '../game/scenes/WorldScene';
import type { BuddyLook } from '../game/textures';
import {
  CREATE_STATION_ID, WORLD_EVENTS,
  type WorldArea, type WorldSnapshot, type WorldStation,
} from '../game/types';
import { FEATURE_ID_PREFIX, featureNodeId, type WorldFeature } from '../game/features';

export type { WorldStation } from '../game/types';

interface Props {
  stations: WorldStation[];
  /** App pages placed as buildings; walking up opens a card that opens the
   *  page in-game (the parent renders it over the world). */
  features: WorldFeature[];
  onOpenFeature: (f: WorldFeature) => void;
  /** True while an in-game panel covers the world: freeze the buddy's controls
   *  so the panel's own keyboard (typing, space, arrows) isn't swallowed. */
  paused?: boolean;
  /** The building you stepped into, shown as a popup *inside* the world frame —
   *  the map stays visible behind it, so you never leave the game. */
  panel?: { feature: WorldFeature; content: ReactNode; onClose: () => void } | null;
  onStudy: (s: WorldStation) => void;
  onPreview: (s: WorldStation) => void;
  onQuiz: (s: WorldStation) => void;
  onStats: (s: WorldStation) => void;
  onCreate: () => void;
  /** Owner actions — only offered on the user's own (`kind: 'mine'`) stations. */
  onEdit: (s: WorldStation) => void;
  onShare: (s: WorldStation) => void;
  onDelete: (s: WorldStation) => void;
}

const MIN_H = 440; // viewport height floor
const MINIMAP_W = 96; // px

/** Minimap dot colour per node kind. */
const DOT: Record<string, string> = {
  mine: 'var(--color-accent-cyan)',
  joined: 'var(--color-accent-purple)',
  level: 'var(--color-accent-green)',
  feature: 'var(--color-accent-yellow)',
  create: 'var(--color-text-muted)',
};

const KIND_META: Record<WorldStation['kind'], { label: string; icon: string; color: string }> = {
  mine:   { label: 'My collection', icon: 'lucide:user',           color: 'var(--color-accent-cyan)' },
  joined: { label: 'Joined',        icon: 'lucide:users',          color: 'var(--color-accent-purple)' },
  level:  { label: 'Level',         icon: 'lucide:graduation-cap', color: 'var(--color-accent-green)' },
};

/**
 * The standalone world game. The world itself (movement, camera, stations,
 * feature buildings, scenery) is a Phaser scene — see src/game/ — while this
 * component owns the canvas lifecycle and renders the DOM UI on top: HUD chips,
 * the fast-travel drawer, and the card that opens when the buddy walks up to a
 * collection or an app-page building.
 */
export function GameWorld({
  stations, features, onOpenFeature, paused = false, panel = null,
  onStudy, onPreview, onQuiz, onStats, onCreate, onEdit, onShare, onDelete,
}: Props) {
  const animalId = useCompanion((s) => s.animalId);
  const buddyName = useCompanion((s) => s.name);
  const known = useVocabularyStore(
    (s) => Object.values(s.progress).filter((e) => e.status === 'known').length,
  );
  const animal = getAnimal(animalId ?? 'fox');
  const stage = stageIndex(known);

  const frameRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const [nearestId, setNearestId] = useState<string | null>(null);
  const isFeature = nearestId?.startsWith(FEATURE_ID_PREFIX) ?? false;
  const nearestFeature = isFeature
    ? features.find((f) => featureNodeId(f) === nearestId) ?? null
    : null;
  const nearest = (!isFeature && nearestId && nearestId !== CREATE_STATION_ID)
    ? stations.find((s) => s.id === nearestId) ?? null
    : null;
  const atBuildSpot = nearestId === CREATE_STATION_ID;

  // ── Fast-travel drawer (top right) ──
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Owner ⋯ menu on the station card ──
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [nearestId]);

  // ── Minimap + gate arrival card ──
  const [snap, setSnap] = useState<WorldSnapshot | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number; areaIndex: number } | null>(null);
  const [arrival, setArrival] = useState<{ name: string; key: number } | null>(null);
  const arrivalKey = useRef(0);

  // The arrival card announces the area, then fades.
  useEffect(() => {
    if (!arrival) return;
    const t = setTimeout(() => setArrival(null), 1700);
    return () => clearTimeout(t);
  }, [arrival]);

  const travelTo = (id: string) => {
    (gameRef.current?.scene.getScene(WorldScene.KEY) as WorldScene | null)?.travelTo(id);
    setDrawerOpen(false);
  };

  // Latest props for stable event/keyboard handlers.
  const live = useRef({ stations, onStudy, features, onOpenFeature, nearestId, paused });
  live.current = { stations, onStudy, features, onOpenFeature, nearestId, paused };

  // Freeze the world's own keyboard while a panel covers it, so Phaser doesn't
  // preventDefault space/arrows the panel's inputs need.
  useEffect(() => {
    const kb = gameRef.current?.input.keyboard;
    if (kb) kb.enabled = !paused;
  }, [paused]);

  // The world fills the page: the frame stretches from wherever it starts down
  // to the bottom of the window (12px page padding), never below MIN_H.
  const [vpH, setVpH] = useState(MIN_H);
  useEffect(() => {
    const measure = () => {
      const el = frameRef.current;
      if (!el) return;
      setVpH(Math.max(MIN_H, Math.floor(window.innerHeight - el.getBoundingClientRect().top - 12)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // ── Phaser lifecycle: one game per buddy identity ──
  useEffect(() => {
    const parent = frameRef.current;
    if (!parent) return;
    // Render at native device resolution (the camera zooms to compensate),
    // otherwise the browser upscales the canvas on retina screens and both
    // text and sprites come out blurry.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const look: BuddyLook = { kind: 'animal', id: animal.id };
    const data: WorldSceneData = {
      stations: live.current.stations,
      features: live.current.features,
      look,
      stage,
      buddyName: buddyName || animal.name,
      dpr,
    };
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      transparent: true,
      pixelArt: true, // crisp nearest-neighbor scaling for the 16px buddy sprites
      width: Math.max(parent.clientWidth, 320) * dpr,
      height: Math.max(parent.clientHeight, 320) * dpr,
      scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr },
    });
    game.scene.add(WorldScene.KEY, WorldScene, true, data);
    const onNear = (id: string | null) => setNearestId(id);
    const onMoved = (p: { x: number; y: number; areaIndex: number }) => setPos(p);
    const onArea = ({ area }: { index: number; area: WorldArea }) => {
      arrivalKey.current += 1;
      setArrival({ name: area.name, key: arrivalKey.current });
    };
    game.events.on(WORLD_EVENTS.near, onNear);
    game.events.on(WORLD_EVENTS.moved, onMoved);
    game.events.on(WORLD_EVENTS.area, onArea);
    const ro = new ResizeObserver(() => {
      game.scale.resize(parent.clientWidth * dpr, parent.clientHeight * dpr);
    });
    ro.observe(parent);
    gameRef.current = game;
    return () => {
      gameRef.current = null;
      ro.disconnect();
      game.events.off(WORLD_EVENTS.near, onNear);
      game.events.off(WORLD_EVENTS.moved, onMoved);
      game.events.off(WORLD_EVENTS.area, onArea);
      game.destroy(true);
    };
  }, [animal.id, animal.name, stage, buddyName]);

  const scene = () => gameRef.current?.scene.getScene(WorldScene.KEY) as WorldScene | null;

  // Push station-data changes into the running scene, then re-read the minimap.
  useEffect(() => {
    const s = scene();
    s?.setStations(stations);
    if (s) setSnap(s.snapshot());
  }, [stations]);

  // The first position report means the scene is live — grab the layout then.
  useEffect(() => {
    if (!pos || snap) return;
    setSnap(scene()?.snapshot() ?? null);
  }, [pos, snap]);

  // Follow theme switches (the scene resolves colors from CSS variables).
  useEffect(() => {
    const observer = new MutationObserver(() => scene()?.applyTheme());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Enter/Space acts on whatever the buddy is standing at: a feature opens, a
  // collection studies.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON')) return;
      const { stations: all, onStudy: study, features: feats, onOpenFeature: open, nearestId: id, paused: frozen } = live.current;
      if (frozen || !id) return;
      if (id.startsWith(FEATURE_ID_PREFIX)) {
        const f = feats.find((x) => featureNodeId(x) === id);
        if (f) { e.preventDefault(); open(f); }
        return;
      }
      const s = all.find((x) => x.id === id);
      if (s) { e.preventDefault(); study(s); }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  return (
    <div
      ref={frameRef}
      className="relative rounded-2xl border-2 border-border overflow-hidden select-none touch-none"
      style={{ background: 'var(--color-bg-secondary)', height: vpH }}
    >
      {/* Phaser mounts its canvas here (fills the frame via Scale.RESIZE). */}

      {/* ── HUD (DOM, on top of the canvas) ── */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[11px] font-bold text-text-muted bg-bg-card/85 border border-border rounded-full px-2.5 py-1 pointer-events-none">
        <Icon icon="lucide:gamepad-2" className="text-accent-yellow" />
        <span className="hidden sm:inline">Walk with WASD / arrows, or tap the ground</span>
        <span className="sm:hidden">Tap the ground to walk</span>
      </div>
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {!animalId && (
          <Link
            to="/companion"
            className="flex items-center gap-1.5 text-[11px] font-bold text-accent-orange bg-bg-card/85 border border-accent-orange/40 rounded-full px-2.5 py-1"
          >
            <Icon icon="lucide:paw-print" />
            Choose your buddy
          </Link>
        )}
        <button
          onClick={() => setDrawerOpen((o) => !o)}
          title="Fast travel"
          className={`flex items-center gap-1.5 text-[11px] font-bold rounded-full px-2.5 py-1.5 border transition-all ${
            drawerOpen
              ? 'bg-accent-cyan text-bg-primary border-accent-cyan'
              : 'bg-bg-card/85 text-text-primary border-border hover:border-accent-cyan/60'
          }`}
        >
          <Icon icon="lucide:compass" className="text-sm" />
          <span className="hidden sm:inline">Travel</span>
        </button>
      </div>

      {/* ── Fast-travel drawer ── */}
      {drawerOpen && (
        <>
          <div className="absolute inset-0 z-10" onClick={() => setDrawerOpen(false)} />
          <div className="absolute top-12 right-3 bottom-3 z-20 w-[min(78%,260px)] flex flex-col rounded-2xl border-2 border-border bg-bg-card/95 backdrop-blur-sm shadow-2xl animate-fade-in overflow-hidden">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Fast travel</span>
              <button
                onClick={() => { setDrawerOpen(false); onCreate(); }}
                className="flex items-center gap-1 text-[11px] font-bold text-accent-cyan hover:underline"
              >
                <Icon icon="lucide:plus" /> New
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
              {/* App pages first, then collections by kind. */}
              {features.length > 0 && (
                <div>
                  <p className="px-1.5 pt-2 pb-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">Places</p>
                  {features.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => travelTo(featureNodeId(f))}
                      className="w-full flex items-center gap-2 px-1.5 py-1.5 rounded-lg text-left hover:bg-bg-tertiary transition-colors"
                    >
                      <Icon icon={f.icon} className="shrink-0 text-sm" style={{ color: 'var(--color-accent-yellow)' }} />
                      <span className="flex-1 min-w-0 text-xs font-bold text-text-primary truncate">{f.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {(['mine', 'joined', 'level'] as const).map((kind) => {
                const group = stations.filter((s) => s.kind === kind);
                if (group.length === 0) return null;
                return (
                  <div key={kind}>
                    <p className="px-1.5 pt-2 pb-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      {KIND_META[kind].label}
                      {kind !== 'joined' && 's'}
                    </p>
                    {group.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => travelTo(s.id)}
                        className="w-full flex items-center gap-2 px-1.5 py-1.5 rounded-lg text-left hover:bg-bg-tertiary transition-colors"
                      >
                        <Icon
                          icon={KIND_META[s.kind].icon}
                          className="shrink-0 text-sm"
                          style={{ color: KIND_META[s.kind].color }}
                        />
                        <span className="flex-1 min-w-0 text-xs font-bold text-text-primary truncate">
                          {s.name}
                        </span>
                        {s.active && <Icon icon="lucide:check" className="shrink-0 text-xs text-accent-green" />}
                        <span className="shrink-0 text-[10px] font-bold text-text-muted">{s.pct}%</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Minimap ── the area you're in, its buildings, and you ── */}
      {!panel && snap && pos && (() => {
        const area = snap.areas[pos.areaIndex];
        if (!area) return null;
        const h = area.bottom - area.top;
        const height = Math.max(28, Math.round((MINIMAP_W * h) / snap.worldW));
        const here = snap.nodes.filter((n) => n.y >= area.top && n.y < area.bottom);
        return (
          <div className="absolute top-12 left-3 z-20 rounded-xl border-2 border-border bg-bg-card/85 backdrop-blur-sm p-1.5 shadow-lg pointer-events-none">
            <svg
              width={MINIMAP_W}
              height={height}
              viewBox={`0 ${area.top} ${snap.worldW} ${h}`}
              preserveAspectRatio="none"
              className="block rounded"
              style={{ background: 'var(--color-bg-tertiary)' }}
            >
              {here.map((n) => (
                <circle key={n.id} cx={n.x} cy={n.y} r={38} fill={DOT[n.kind] ?? DOT.create} />
              ))}
              <circle cx={pos.x} cy={pos.y} r={52} fill="var(--color-accent-pink)" stroke="white" strokeWidth={16} />
            </svg>
            <p className="mt-1 text-center text-[9px] font-bold uppercase tracking-wider text-text-muted leading-none">
              {area.name}
            </p>
          </div>
        );
      })()}

      {/* ── Gate arrival card ── */}
      {arrival && (
        <div key={arrival.key} className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="px-6 py-3 rounded-2xl border-2 border-accent-yellow bg-bg-card/90 backdrop-blur-sm shadow-2xl animate-pop-in">
            <p className="font-display font-bold text-lg text-text-primary tracking-wide text-center">
              {arrival.name}
            </p>
          </div>
        </div>
      )}

      {/* ── Feature building card (the buddy reached an app page) ── */}
      {!panel && nearestFeature && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(94%,380px)] rounded-2xl border-2 border-accent-yellow bg-bg-card shadow-2xl p-3 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-accent-yellow/15 text-accent-yellow">
              <Icon icon={nearestFeature.icon} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-text-primary text-sm">{nearestFeature.name}</p>
              <p className="text-[10px] font-bold text-text-muted">{nearestFeature.blurb}</p>
            </div>
          </div>
          <button
            onClick={() => onOpenFeature(nearestFeature)}
            className="btn-3d w-full py-2 text-xs font-bold text-bg-primary bg-accent-yellow"
          >
            Enter
            <span className="hidden sm:inline opacity-70"> · Enter ↵</span>
          </button>
        </div>
      )}

      {/* ── Build card (the buddy reached the empty plot) ── */}
      {!panel && atBuildSpot && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(94%,380px)] rounded-2xl border-2 border-accent-cyan bg-bg-card shadow-2xl p-3 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-accent-cyan/15 text-accent-cyan">
              <Icon icon="lucide:hammer" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-text-primary text-sm">Empty plot</p>
              <p className="text-[10px] font-bold text-text-muted">
                Build a new collection from your own word list
              </p>
            </div>
          </div>
          <button
            onClick={onCreate}
            className="btn-3d w-full py-2 text-xs font-bold text-bg-primary bg-accent-cyan"
          >
            <Icon icon="lucide:plus" className="inline -mt-0.5 mr-1" />
            New collection
          </button>
        </div>
      )}

      {/* ── Station card (opens when the buddy is close to a collection) ── */}
      {!panel && nearest && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[min(94%,380px)] rounded-2xl border-2 bg-bg-card shadow-2xl p-3 animate-fade-in"
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
                {(nearest.learners ?? 0) > 0 && ` · ${nearest.learners} learner${nearest.learners === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>
          {/* Who else studies here — public/joined collections only. */}
          {nearest.kind !== 'level' && (
            <div className="-mt-1 mb-2">
              <MemberAvatars collectionId={nearest.id} name={nearest.name} />
            </div>
          )}
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
            <button
              onClick={() => onStats(nearest)}
              title="Progress stats"
              className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center border border-border bg-bg-tertiary text-text-muted hover:text-accent-purple transition-all"
            >
              <Icon icon="lucide:chart-pie" className="text-sm" />
            </button>
            {/* Owner actions tucked behind an options menu, same as List view */}
            {nearest.kind === 'mine' && (
              <div className="relative shrink-0">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  title="Options"
                  className="w-9 h-9 rounded-lg flex items-center justify-center border border-border bg-bg-tertiary text-text-muted hover:text-text-primary transition-all"
                >
                  <Icon icon="lucide:ellipsis-vertical" className="text-sm" />
                </button>
                {menuOpen && (
                  <>
                    {/* click-away backdrop */}
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 bottom-11 z-40 w-36 rounded-xl border-2 border-border bg-bg-card shadow-xl overflow-hidden animate-fade-in">
                      <button
                        onClick={() => { setMenuOpen(false); onEdit(nearest); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                      >
                        <Icon icon="lucide:pencil" className="text-sm" /> Edit
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); onShare(nearest); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-text-secondary hover:bg-bg-tertiary hover:text-accent-cyan transition-colors"
                      >
                        <Icon icon="lucide:share-2" className="text-sm" /> Share
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); onDelete(nearest); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-text-muted hover:bg-accent-red/10 hover:text-accent-red transition-colors"
                      >
                        <Icon icon="lucide:trash-2" className="text-sm" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Inside a building: its game plays in a popup over the map, in the
             same card style as the world's other cards. ── */}
      {panel && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-3 bg-bg-primary/70 backdrop-blur-[2px] animate-fade-in">
          <div className="w-full max-w-sm max-h-full flex flex-col rounded-2xl border-2 border-accent-yellow bg-bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-border shrink-0">
              <span className="text-lg leading-none">{panel.feature.emoji}</span>
              <span className="flex-1 min-w-0 truncate font-display font-bold text-sm text-text-primary">
                {panel.feature.name}
              </span>
              <button
                onClick={panel.onClose}
                title="Leave the building"
                className="w-7 h-7 shrink-0 rounded-full bg-bg-tertiary text-text-muted flex items-center justify-center hover:text-text-primary transition-colors"
              >
                <Icon icon="lucide:x" className="text-sm" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">{panel.content}</div>
          </div>
        </div>
      )}
    </div>
  );
}
