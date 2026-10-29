import { useEffect, useRef, useState, type ReactNode } from 'react';
import Phaser from 'phaser';
import { FormattedMessage, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { useCompanion, useWordsKnown } from '../hooks/useCompanion';
import { getAnimal, stageIndex } from '../lib/companion';
import { WorldScene, ZOOM_STEPS, type WorldSceneData } from '../game/scenes/WorldScene';
import type { BuddyLook } from '../game/textures';
import {
  CREATE_STATION_ID, WORLD_EVENTS,
  type WorldArea, type WorldSnapshot, type WorldStation,
} from '../game/types';
import { FEATURE_ID_PREFIX, featureNodeId, type WorldFeature } from '../game/features';
import { PixelButton, PixelIcon, type PixelIconName } from './worldgames/pixel';

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

/** Minimap dot colour per node kind — the pixel kit's palette. */
const DOT: Record<string, string> = {
  mine: '#4f8fe0',
  joined: '#a77bf0',
  level: '#5fd068',
  feature: '#f0c050',
  create: '#b8a88e',
};

// labelId: the kind on a station card; groupId: its heading in the fast-travel list.
const KIND_META: Record<WorldStation['kind'], { labelId: string; groupId: string; icon: PixelIconName; color: string }> = {
  mine:   { labelId: 'world.kindMine',   groupId: 'world.groupMine',   icon: 'person', color: '#4f8fe0' },
  joined: { labelId: 'world.kindJoined', groupId: 'world.groupJoined', icon: 'people', color: '#a77bf0' },
  level:  { labelId: 'world.kindLevel',  groupId: 'world.groupLevel',  icon: 'cap',    color: '#5fd068' },
};

/** The card at the bottom when the buddy reaches a building, a plot or a
 *  collection — the world's version of a dialogue box. */
function WorldCard({ emoji, icon, color = 'var(--px-gold)', title, subtitle, children }: {
  emoji?: string;
  icon?: PixelIconName;
  color?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="px absolute bottom-2 left-1/2 -translate-x-1/2 z-20 w-[min(94%,420px)] px-in-up">
      <div className="px-notch px-frame p-3.5">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="px-inset px-notch w-10 h-10 shrink-0 flex items-center justify-center" style={{ color }}>
            {emoji ? <span className="text-[18px] leading-none">{emoji}</span> : icon && <PixelIcon name={icon} size={2} />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="px-title !text-[16px] truncate" style={{ color }}>{title}</p>
            {subtitle && <p className="text-[13px] text-[var(--px-muted)] leading-snug">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

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
  const intl = useIntl();
  // Phaser text is drawn once, so a language switch rebuilds the scene.
  const locale = intl.locale;
  const animalId = useCompanion((s) => s.animalId);
  const buddyName = useCompanion((s) => s.name);
  const known = useWordsKnown();
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

  // ── Zoom ── the scene owns the value; this mirrors it for the buttons.
  const [zoom, setZoom] = useState<number>(1);
  const zoomBy = (step: number) =>
    (gameRef.current?.scene.getScene(WorldScene.KEY) as WorldScene | null)?.zoomBy(step);
  const resetZoom = () =>
    (gameRef.current?.scene.getScene(WorldScene.KEY) as WorldScene | null)?.resetZoom();

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
    // Capped at 2: the art is 16px pixel art drawn 2×, so a 3× canvas costs
    // 2.25× the fill rate of a 2× one and buys nothing you can see.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    // A fresh scene starts at the default zoom, so the mirror must too.
    setZoom(1);
    const onZoom = (z: number) => setZoom(z);
    game.events.on(WORLD_EVENTS.near, onNear);
    game.events.on(WORLD_EVENTS.moved, onMoved);
    game.events.on(WORLD_EVENTS.area, onArea);
    game.events.on(WORLD_EVENTS.zoom, onZoom);
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
      game.events.off(WORLD_EVENTS.zoom, onZoom);
      game.destroy(true);
    };
  }, [animal.id, animal.name, stage, buddyName, locale]);

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
  // collection studies. +/- zoom, 0 resets.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'BUTTON');
      if (!typing && !live.current.paused) {
        const scene = gameRef.current?.scene.getScene(WorldScene.KEY) as WorldScene | null;
        if (e.key === '+' || e.key === '=') { e.preventDefault(); scene?.zoomBy(1); return; }
        if (e.key === '-' || e.key === '_') { e.preventDefault(); scene?.zoomBy(-1); return; }
        if (e.key === '0') { e.preventDefault(); scene?.resetZoom(); return; }
      }
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (typing) return;
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

      {/* ── HUD (DOM, on top of the canvas) ── the world's own controls, in the
             same pixel kit as the buildings' screens, stepping aside while a
             building's HUD is up. ── */}
      {!panel && (
        <div className="px absolute top-2 left-2 z-20 pointer-events-none">
          <span className="px-notch px-frame px-title !text-[12px] text-[var(--px-muted)] inline-block px-3 py-2">
            <span className="hidden sm:inline"><FormattedMessage id="world.hintWalkDesktop" /></span>
            <span className="sm:hidden"><FormattedMessage id="world.hintWalkMobile" /></span>
          </span>
        </div>
      )}
      {!panel && (
        <div className="px absolute top-2 right-2 z-20 flex items-center gap-2">
          {!animalId && (
            <Link to="/companion" className="px-btn px-notch px-title !text-[13px] px-3 py-2 inline-flex items-center gap-1.5" data-tone="gold">
              <PixelIcon name="paw" size={2} /> <FormattedMessage id="world.chooseBuddy" />
            </Link>
          )}
          <PixelButton
            tone={drawerOpen ? 'gold' : 'paper'}
            onClick={() => setDrawerOpen((o) => !o)}
            title={intl.formatMessage({ id: 'world.fastTravel' })}
            aria-label={intl.formatMessage({ id: 'world.fastTravel' })}
            className="!px-3 !py-2"
          >
            <PixelIcon name="compass" size={2} />
            <span className="hidden sm:inline"><FormattedMessage id="world.travel" /></span>
          </PixelButton>
        </div>
      )}

      {/* ── Zoom ── wheel/pinch work on the canvas; these are the discoverable
          version of the same thing, and show where you are in the range. */}
      {!panel && (
        <div className="px absolute bottom-2 right-2 z-20 px-notch px-frame p-1.5 flex flex-col items-center gap-1">
          <PixelButton
            tone="paper"
            onClick={() => zoomBy(1)}
            disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
            title={intl.formatMessage({ id: 'world.zoomIn' })}
            aria-label={intl.formatMessage({ id: 'world.zoomIn' })}
            className="!w-9 !h-9 !p-0"
          >
            <PixelIcon name="plus" size={2} />
          </PixelButton>
          <button
            onClick={resetZoom}
            title={intl.formatMessage({ id: 'world.zoomReset' })}
            className="px-num text-[14px] text-[var(--px-muted)] hover:text-[var(--px-text)] py-0.5"
          >
            {zoom}×
          </button>
          <PixelButton
            tone="paper"
            onClick={() => zoomBy(-1)}
            disabled={zoom <= ZOOM_STEPS[0]}
            title={intl.formatMessage({ id: 'world.zoomOut' })}
            aria-label={intl.formatMessage({ id: 'world.zoomOut' })}
            className="!w-9 !h-9 !p-0"
          >
            <PixelIcon name="minus" size={2} />
          </PixelButton>
        </div>
      )}

      {/* ── Fast-travel list ── */}
      {drawerOpen && (
        <>
          <div className="absolute inset-0 z-10" onClick={() => setDrawerOpen(false)} />
          <div className="px absolute top-14 right-2 bottom-2 z-20 w-[min(80%,280px)] px-notch px-frame flex flex-col px-in-side">
            <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
              <span className="px-title text-[var(--px-gold)]"><FormattedMessage id="world.fastTravel" /></span>
              <PixelButton tone="jade" onClick={() => { setDrawerOpen(false); onCreate(); }} className="!px-2.5 !py-1.5 !text-[12px]">
                <PixelIcon name="plus" size={1} /> <FormattedMessage id="world.new" />
              </PixelButton>
            </div>
            <div className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-3">
              {/* App pages first, then collections by kind. */}
              {features.length > 0 && (
                <div>
                  <p className="px-title !text-[11px] text-[var(--px-muted)] px-1 pb-1"><FormattedMessage id="world.places" /></p>
                  <div className="space-y-1">
                    {features.map((f) => (
                      <button key={f.id} onClick={() => travelTo(featureNodeId(f))} className="px-pick px-notch w-full flex items-center gap-2 px-2.5 py-1.5 text-left">
                        <span className="text-[14px] leading-none">{f.emoji}</span>
                        <span className="flex-1 min-w-0 truncate text-[15px] font-bold">{intl.formatMessage({ id: f.nameId })}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(['mine', 'joined', 'level'] as const).map((kind) => {
                const group = stations.filter((s) => s.kind === kind);
                if (group.length === 0) return null;
                return (
                  <div key={kind}>
                    <p className="px-title !text-[11px] text-[var(--px-muted)] px-1 pb-1"><FormattedMessage id={KIND_META[kind].groupId} /></p>
                    <div className="space-y-1">
                      {group.map((s) => (
                        <button key={s.id} onClick={() => travelTo(s.id)} data-on={s.active} className="px-pick px-notch w-full flex items-center gap-2 px-2.5 py-1.5 text-left">
                          <PixelIcon name={KIND_META[s.kind].icon} size={2} className="shrink-0" />
                          <span className="flex-1 min-w-0 truncate text-[15px] font-bold">{s.name}</span>
                          <span className="shrink-0 px-num text-[13px] text-[var(--px-muted)]">{s.pct}%</span>
                        </button>
                      ))}
                    </div>
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
          <div className="px absolute top-14 left-2 z-20 px-notch px-frame p-2 pointer-events-none">
            <svg
              width={MINIMAP_W}
              height={height}
              viewBox={`0 ${area.top} ${snap.worldW} ${h}`}
              preserveAspectRatio="none"
              shapeRendering="crispEdges"
              className="block"
              style={{ background: '#2f5a3a' }}
            >
              {here.map((n) => (
                <rect key={n.id} x={n.x - 40} y={n.y - 40} width={80} height={80} fill={DOT[n.kind] ?? DOT.create} />
              ))}
              <rect x={pos.x - 60} y={pos.y - 60} width={120} height={120} fill="#f05a4f" stroke="#fff" strokeWidth={20} />
            </svg>
            <p className="mt-1 text-center px-title !text-[10px] text-[var(--px-muted)]">{area.name}</p>
          </div>
        );
      })()}

      {/* ── Gate arrival card ── */}
      {arrival && (
        <div key={arrival.key} className="px absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="px-notch px-frame px-6 py-3 px-in-up">
            <p className="px-title !text-[20px] text-[var(--px-gold)]">{arrival.name}</p>
          </div>
        </div>
      )}

      {/* ── Feature building card (the buddy reached an app page) ── */}
      {!panel && nearestFeature && (
        <WorldCard
          emoji={nearestFeature.emoji}
          title={intl.formatMessage({ id: nearestFeature.nameId })}
          subtitle={intl.formatMessage({ id: nearestFeature.blurbId })}
        >
          <PixelButton tone="gold" block onClick={() => onOpenFeature(nearestFeature)}>
            <FormattedMessage id="world.enter" /> <span className="hidden sm:inline opacity-70">↵</span>
          </PixelButton>
        </WorldCard>
      )}

      {/* ── Build card (the buddy reached the empty plot) ── */}
      {!panel && atBuildSpot && (
        <WorldCard
          icon="plus"
          color="var(--px-jade)"
          title={intl.formatMessage({ id: 'world.emptyPlot' })}
          subtitle={intl.formatMessage({ id: 'world.emptyPlotBlurb' })}
        >
          <PixelButton tone="jade" block onClick={onCreate}>
            <PixelIcon name="plus" size={2} /> <FormattedMessage id="world.newCollection" />
          </PixelButton>
        </WorldCard>
      )}

      {/* ── Station card (opens when the buddy is close to a collection) ── */}
      {!panel && nearest && (
        <WorldCard
          icon={KIND_META[nearest.kind].icon}
          color={KIND_META[nearest.kind].color}
          title={nearest.name}
          subtitle={
            <>
              <FormattedMessage
                id="world.stationMeta"
                values={{
                  kind: intl.formatMessage({ id: KIND_META[nearest.kind].labelId }),
                  count: nearest.words.length,
                  pct: nearest.pct,
                }}
              />
              {(nearest.learners ?? 0) > 0 && (
                <> · <FormattedMessage id="world.learners" values={{ count: nearest.learners }} /></>
              )}
            </>
          }
        >
          <div className="flex items-center gap-2">
            <PixelButton tone={nearest.active ? 'jade' : 'gold'} className="flex-1" onClick={() => onStudy(nearest)}>
              <FormattedMessage id={nearest.active ? 'world.studying' : 'world.studyThis'} />
              <span className="hidden sm:inline opacity-70">↵</span>
            </PixelButton>
            {([
              ['eye', 'world.previewWords', () => onPreview(nearest)],
              ['play', 'world.quizCollection', () => onQuiz(nearest)],
              ['chart', 'world.progressStats', () => onStats(nearest)],
            ] as const).map(([icon, label, act]) => (
              <PixelButton
                key={icon}
                tone="paper"
                onClick={act}
                title={intl.formatMessage({ id: label })}
                aria-label={intl.formatMessage({ id: label })}
                className="!w-10 !h-11 !p-0"
              >
                <PixelIcon name={icon} size={2} />
              </PixelButton>
            ))}
            {/* Owner actions tucked behind an options menu, same as List view */}
            {nearest.kind === 'mine' && (
              <div className="relative shrink-0">
                <PixelButton
                  tone={menuOpen ? 'gold' : 'paper'}
                  onClick={() => setMenuOpen((o) => !o)}
                  title={intl.formatMessage({ id: 'world.options' })}
                  aria-label={intl.formatMessage({ id: 'world.options' })}
                  className="!w-10 !h-11 !p-0"
                >
                  <PixelIcon name="dots" size={2} />
                </PixelButton>
                {menuOpen && (
                  <>
                    {/* click-away backdrop */}
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 bottom-14 z-40 w-40 px-notch px-frame p-2 space-y-1">
                      {([
                        ['pencil', 'world.edit', () => onEdit(nearest), false],
                        ['share', 'world.share', () => onShare(nearest), false],
                        ['trash', 'world.delete', () => onDelete(nearest), true],
                      ] as const).map(([icon, label, act, danger]) => (
                        <button
                          key={icon}
                          onClick={() => { setMenuOpen(false); act(); }}
                          className={`px-pick px-notch w-full flex items-center gap-2 px-2.5 py-2 text-left text-[15px] font-bold ${danger ? 'text-[var(--px-bad)]' : ''}`}
                        >
                          <PixelIcon name={icon} size={2} /> <FormattedMessage id={label} />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </WorldCard>
      )}

      {/* ── Inside a building: its game is a HUD docked around the map, which
             stays visible (dimmed a touch) in the middle. ── */}
      {panel && (
        <div className="absolute inset-0 z-30 bg-black/30 animate-fade-in pointer-events-none">
          <div className="px absolute top-2 left-2 flex items-center gap-2 pointer-events-auto">
            <span className="px-notch px-frame px-title flex items-center gap-2 pl-3 pr-4 py-2.5">
              <span className="text-base leading-none">{panel.feature.emoji}</span>
              {intl.formatMessage({ id: panel.feature.nameId })}
            </span>
            <PixelButton tone="paper" onClick={panel.onClose} className="!px-3 !py-2.5">
              <PixelIcon name="close" size={2} />
              {intl.formatMessage({ id: 'world.leaveBuilding' })}
            </PixelButton>
          </div>
          {panel.content}
        </div>
      )}
    </div>
  );
}
