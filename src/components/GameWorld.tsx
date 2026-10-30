import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Phaser from 'phaser';
import { FormattedMessage, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { useCompanion, useWordsKnown } from '../hooks/useCompanion';
import { useStreak } from '../hooks/useStreak';
import { useProgressCounts } from '../hooks/useProgressQuery';
import { getAnimal, stageIndex } from '../lib/companion';
import { WorldScene, ZOOM_STEPS, type WorldSceneData } from '../game/scenes/WorldScene';
import { RoomScene, type RoomSceneData } from '../game/scenes/RoomScene';
import { ROOMS } from '../game/rooms';
import { KEEPER_DRESS } from '../game/keeperLooks';
import { keeperLookFor, type BuddyLook, type VillagerLook } from '../game/textures';
import { DEFAULT_LOOK, type Look } from '../game/wardrobe';
import {
  WORLD_EVENTS,
  type WorldArea, type WorldSnapshot, type WorldStation,
} from '../game/types';
import { COLLECTIONS_KEEPER, featureNodeId, type WorldFeature, type WorldSkill } from '../game/features';
import { PixelButton, PixelIcon, type PixelIconName } from './worldgames/pixel';
import { KIND_META } from './worldgames/collectionKinds';
import { PlaceInfo } from './worldgames/PlaceInfo';
import { LookSprite } from './worldgames/LookSprite';
import { WorldLoading } from './worldgames/WorldLoading';

export type { WorldStation } from '../game/types';

interface Props {
  /** Your collections and the levels — listed in the travel drawer; on the
   *  map they're one keeper's (COLLECTIONS_KEEPER). */
  stations: WorldStation[];
  /** The skills, whose keepers the scene places; their activities fill the
   *  travel drawer. */
  skills: WorldSkill[];
  /** A keeper was reached and entered: open its menu. */
  onOpenFeature: (f: WorldFeature) => void;
  /** A collection picked from the travel drawer: open the collections'
   *  keeper on it. */
  onOpenCollection: (id: string) => void;
  /** An activity picked straight from the travel drawer. */
  onOpenActivity: (activityId: string) => void;
  /** True while an in-game panel covers the world: freeze the buddy's controls
   *  so the panel's own keyboard (typing, space, arrows) isn't swallowed. */
  paused?: boolean;
  /** The building you stepped into, shown as a popup *inside* the world frame —
   *  the map stays visible behind it, so you never leave the game. */
  panel?: {
    title: string;
    emoji: string;
    content: ReactNode;
    onClose: () => void;
    /** Inside an activity: back to the skill's menu. */
    onBack?: () => void;
    /** The skill's tools, on the right of the bar from any of its screens. */
    tools?: ReactNode;
    /** The skill whose room to stand in (ROOMS) instead of over the city. */
    room?: string;
    /** The room's keeper is talking to you: a speech bubble over their head. */
    talking?: boolean;
    /** Dress the buddy in this for now — the tailor's, as you try things on. */
    dress?: Look;
  } | null;
  onCreate: () => void;
}

const MIN_H = 360; // viewport height floor
const MINIMAP_W = 96; // px

/** Minimap dot colour per node kind — the pixel kit's palette. */
const DOT: Record<string, string> = {
  mine: '#4f8fe0',
  joined: '#a77bf0',
  level: '#5fd068',
  feature: '#f0c050',
  create: '#b8a88e',
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

/** One foldable section of the travel drawer. `onTitle`, when given, makes
 *  the title itself a destination (a skill's keeper); the chevron folds. */
function DrawerSection({ title, open, onToggle, onTitle, children }: {
  title: ReactNode;
  open: boolean;
  onToggle: () => void;
  onTitle?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="px-inset px-notch p-1.5">
      <div className="flex items-center gap-1">
        <button
          onClick={onTitle ?? onToggle}
          className="flex-1 min-w-0 flex items-center gap-1.5 px-1.5 py-1 px-title !text-[13px] text-[var(--px-text)] hover:text-[var(--px-gold)] text-left"
        >
          {title}
        </button>
        <button onClick={onToggle} aria-expanded={open} className="w-7 h-7 flex items-center justify-center text-[var(--px-muted)] hover:text-[var(--px-gold)]">
          <PixelIcon name={open ? 'minus' : 'plus'} size={1} />
        </button>
      </div>
      {open && <div className="space-y-1 mt-1">{children}</div>}
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
  stations, skills, onOpenFeature, onOpenActivity, onOpenCollection, paused = false, panel = null, onCreate,
}: Props) {
  const intl = useIntl();
  const features = useMemo<WorldFeature[]>(() => [...skills, COLLECTIONS_KEEPER], [skills]);
  // Phaser text is drawn once, so a language switch rebuilds the scene.
  const locale = intl.locale;
  const animalId = useCompanion((s) => s.animalId);
  const buddyName = useCompanion((s) => s.name);
  const worn = useCompanion((s) => s.dress);
  const dress = panel?.dress ?? worn ?? DEFAULT_LOOK;
  const dressRef = useRef(dress);
  const known = useWordsKnown();
  // What the city shows of progress: the streak flag and the river lanterns.
  const streak = useStreak((s) => s.count);
  const mastered = useProgressCounts().counts.mastered;
  const progress = useMemo(() => ({ streak, mastered }), [streak, mastered]);
  const animal = getAnimal(animalId ?? 'fox');
  const stage = stageIndex(known);

  const frameRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const [nearestId, setNearestId] = useState<string | null>(null);
  const nearestFeature = features.find((f) => featureNodeId(f) === nearestId) ?? null;
  // The story of the place a room stands in, as a toast: shown on stepping
  // in, and again from the skill bar's ⓘ (`n` restarts its clock).
  const [placeToast, setPlaceToast] = useState<{ id: string; n: number } | null>(null);
  const showPlace = (id: string) => setPlaceToast((t) => ({ id, n: (t?.n ?? 0) + 1 }));
  const hidePlace = useCallback(() => setPlaceToast(null), []);

  // ── The world's menu (status bar) ──
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Fast-travel drawer (top right) ──
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Drawer sections folded shut, by key (a skill id or a collection kind).
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const toggleFold = (key: string) => setFolded((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

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
  const live = useRef({ features, onOpenFeature, nearestId, paused, progress });
  live.current = { features, onOpenFeature, nearestId, paused, progress };

  // Freeze the world's own keyboard while a panel covers it, so Phaser doesn't
  // preventDefault space/arrows the panel's inputs need.
  useEffect(() => {
    const kb = gameRef.current?.input.keyboard;
    if (kb) kb.enabled = !paused;
  }, [paused]);

  // The world fills the screen: the frame stretches from wherever it starts
  // (the top, full-screen) to the bottom of the window, never below MIN_H.
  const [vpH, setVpH] = useState(MIN_H);
  useEffect(() => {
    const measure = () => {
      const el = frameRef.current;
      if (!el) return;
      setVpH(Math.max(MIN_H, Math.floor(window.innerHeight - el.getBoundingClientRect().top)));
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
      features: live.current.features,
      look,
      dress: dressRef.current,
      stage,
      buddyName: buddyName || animal.name,
      dpr,
      progress: live.current.progress,
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
    game.scene.add(RoomScene.KEY, RoomScene, false);
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

  // Entering a skill with a room steps inside: the city sleeps (keeping where
  // you stood) and the room takes the canvas; leaving wakes the city.
  const roomId = panel?.room && ROOMS[panel.room] ? panel.room : null;
  const talking = !!panel?.talking;
  const talkingRef = useRef(talking);
  // Stepping into a room introduces its place; leaving takes the toast away.
  useEffect(() => {
    const place = roomId ? ROOMS[roomId].place : undefined;
    setPlaceToast(place ? { id: place, n: 0 } : null);
  }, [roomId]);
  useEffect(() => {
    talkingRef.current = talking;
    (gameRef.current?.scene.getScene(RoomScene.KEY) as RoomScene | null)?.setTalking(talking);
  }, [talking]);
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    if (roomId) {
      const data: RoomSceneData = {
        room: ROOMS[roomId],
        look: { kind: 'animal', id: animal.id },
        stage,
        keeperLook: (ROOMS[roomId].keeperLook as VillagerLook | undefined)
          ?? keeperLookFor(Math.max(0, features.findIndex((f) => f.id === roomId))),
        keeperDress: KEEPER_DRESS[roomId],
        talking: talkingRef.current,
        dress: dressRef.current,
      };
      game.scene.sleep(WorldScene.KEY);
      game.scene.start(RoomScene.KEY, data);
      return () => {
        if (gameRef.current !== game) return;
        game.scene.stop(RoomScene.KEY);
        game.scene.wake(WorldScene.KEY);
        (game.scene.getScene(WorldScene.KEY) as WorldScene | null)?.cameras.main.fadeIn(220, 0, 0, 0);
      };
    }
  }, [roomId, animal.id, stage, features]);

  // Inside a skill, Esc leaves it. (Not Backspace for Menu — the spelling
  // round uses it to take a letter back.)
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); panel.onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);

  // New clothes from the tailor's go straight onto the buddy, wherever it is.
  useEffect(() => {
    dressRef.current = dress;
    scene()?.setDress(dress);
    const game = gameRef.current;
    if (game?.scene.isActive(RoomScene.KEY)) (game.scene.getScene(RoomScene.KEY) as RoomScene).setDress(dress);
  }, [dress]);

  // Progress changes (an answer, a new day of study) re-hoist the flag and
  // refloat the lanterns in the running scene.
  useEffect(() => { scene()?.setProgress(progress); }, [progress]);

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

  // Enter/Space opens the keeper the buddy is standing at. +/- zoom, 0 resets.
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
      const { features: feats, onOpenFeature: open, nearestId: id, paused: frozen } = live.current;
      if (frozen || !id) return;
      const f = feats.find((x) => featureNodeId(x) === id);
      if (f) { e.preventDefault(); open(f); }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  return (
    <div
      ref={frameRef}
      className="relative overflow-hidden select-none touch-none"
      style={{ background: '#1c120c', height: vpH }}
    >
      {/* Phaser mounts its canvas here (fills the frame via Scale.RESIZE). */}

      {/* The title card, until the map has drawn and your buddy stands in it. */}
      {!pos && <WorldLoading />}

      {/* ── HUD (DOM, on top of the canvas) ── the world's own controls, in the
             same pixel kit as the buildings' screens, stepping aside while a
             building's HUD is up. ── */}
      {/* ── Status bar ── the world's menu (back to the app), you — your
             buddy as dressed, your name — and what the city shows of your
             progress: the flag's streak and the river's lanterns. ── */}
      {!panel && (
        // Above the minimap (z-20), so the menu opens over it.
        <div className="px absolute top-2 left-2 z-30 flex items-start gap-2">
          <div className="relative">
            <PixelButton
              tone={menuOpen ? 'gold' : 'paper'}
              onClick={() => setMenuOpen((o) => !o)}
              title={intl.formatMessage({ id: 'world.menu' })}
              aria-label={intl.formatMessage({ id: 'world.menu' })}
              aria-expanded={menuOpen}
              className="!w-11 !h-[3.25rem] !p-0"
            >
              <PixelIcon name="dots" size={2} />
            </PixelButton>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute left-0 top-[3.6rem] z-40 w-52 px-notch px-frame p-2 space-y-1">
                  {([['/', 'world.menuApp'], ['/settings', 'world.menuSettings']] as const).map(([to, label]) => (
                    <Link key={to} to={to} className="px-pick px-notch block px-3 py-2 px-title !text-[14px]">
                      <FormattedMessage id={label} />
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => { const you = features.find((f) => f.id === 'you'); if (you) onOpenFeature(you); }}
            title={intl.formatMessage({ id: 'world.statusYou' })}
            className="px-notch px-frame flex items-center gap-2.5 pl-1.5 pr-3.5 h-[3.25rem] text-left hover:brightness-110"
          >
            <span className="px-inset px-notch w-10 h-10 flex items-end justify-center overflow-hidden shrink-0">
              <LookSprite look={dress} scale={2} />
            </span>
            <span className="min-w-0">
              <span className="block px-title !text-[14px] text-[var(--px-gold)] truncate max-w-[10rem]">{buddyName || animal.name}</span>
              {/* What the flag and the lanterns mean — they're progress, not scenery. */}
              <span className="flex items-center gap-3 text-[12px] font-bold">
                <span className="flex items-center gap-1 text-[var(--px-gold)]" title={intl.formatMessage({ id: 'world.progressFlag' }, { count: streak })}>
                  <PixelIcon name="flame" size={2} /> {streak}
                </span>
                <span className="text-[var(--px-text)]" title={intl.formatMessage({ id: 'world.progressLanterns' }, { count: mastered })}>
                  🏮 {mastered}
                </span>
              </span>
            </span>
          </button>
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
              {/* A drawer of sections: each skill with its activities (picking
                  one walks to the keeper and opens it), then your collections
                  and the levels. Every section folds. */}
              <p className="px-title !text-[11px] text-[var(--px-muted)] px-1"><FormattedMessage id="world.skills" /></p>
              {skills.map((skill) => (
                <DrawerSection
                  key={skill.id}
                  open={!folded.has(skill.id)}
                  onToggle={() => toggleFold(skill.id)}
                  title={<><span className="text-[14px] leading-none">{skill.emoji}</span> {intl.formatMessage({ id: skill.nameId })}</>}
                  onTitle={() => travelTo(featureNodeId(skill))}
                >
                  {skill.activities.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => { travelTo(featureNodeId(skill)); onOpenActivity(a.id); }}
                      className="px-pick px-notch w-full flex items-center gap-2 px-2.5 py-1.5 text-left"
                    >
                      <span className="text-[13px] leading-none">{a.emoji}</span>
                      <span className="flex-1 min-w-0 truncate text-[14px] font-bold">{intl.formatMessage({ id: a.nameId })}</span>
                      <PixelIcon
                        name={a.kind === 'learn' ? 'sword' : a.kind === 'practice' ? 'skull' : 'search'}
                        size={1}
                        className={a.kind === 'learn' ? 'text-[var(--px-jade)]' : a.kind === 'practice' ? 'text-[var(--px-bad)]' : 'text-[var(--px-sky)]'}
                      />
                    </button>
                  ))}
                </DrawerSection>
              ))}
              {(['mine', 'joined', 'level', 'topic'] as const).map((kind) => {
                const group = stations.filter((s) => s.kind === kind);
                if (group.length === 0) return null;
                return (
                  <DrawerSection
                    key={kind}
                    open={!folded.has(kind)}
                    onToggle={() => toggleFold(kind)}
                    title={<><PixelIcon name={KIND_META[kind].icon} size={2} /> <FormattedMessage id={KIND_META[kind].groupId} /></>}
                  >
                    {group.map((s) => (
                      <button key={s.id} onClick={() => { travelTo(featureNodeId(COLLECTIONS_KEEPER)); onOpenCollection(s.id); }} data-on={s.active} className="px-pick px-notch w-full flex items-center gap-2 px-2.5 py-1.5 text-left">
                        <span className="flex-1 min-w-0 truncate text-[14px] font-bold">{s.name}</span>
                        <span className="shrink-0 px-num text-[13px] text-[var(--px-muted)]">{s.pct}%</span>
                      </button>
                    ))}
                  </DrawerSection>
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
          <div className="px absolute top-[4.25rem] left-2 z-20 px-notch px-frame p-2 pointer-events-none">
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

      {panel && placeToast && <PlaceInfo key={placeToast.n} id={placeToast.id} onClose={hidePlace} />}

      {/* ── Inside a skill: a bar across the top says where you are and holds
             the two ways out (Menu, Leave); the activity's HUD docks below it
             around the map. The layer swallows clicks on the map, so your
             character stays put until you leave. ── */}
      {panel && (
        <div className={`absolute inset-0 z-30 animate-fade-in ${roomId ? '' : 'bg-black/20'}`}>
          <div className="px absolute top-0 inset-x-0 z-10 px-frame px-3 h-[3.25rem] flex items-center gap-3">
            <span className="text-[20px] leading-none shrink-0">{panel.emoji}</span>
            <span className="px-title !text-[16px] text-[var(--px-gold)] truncate">{panel.title}</span>
            <span className="flex-1" />
            {roomId && ROOMS[roomId].place && (
              <PixelButton
                tone={placeToast ? 'sky' : 'paper'}
                onClick={() => showPlace(ROOMS[roomId].place!)}
                title={intl.formatMessage({ id: `places.${ROOMS[roomId].place}` })}
                aria-label={intl.formatMessage({ id: `places.${ROOMS[roomId].place}` })}
                className="!py-2 !px-3"
              >
                <PixelIcon name="info" size={2} />
              </PixelButton>
            )}
            {panel.tools}
            {panel.onBack && (
              <PixelButton tone="gold" onClick={panel.onBack} className="!py-2">
                <PixelIcon name="sliders" size={2} /> <FormattedMessage id="world.menuBack" />
              </PixelButton>
            )}
            <PixelButton tone="red" onClick={panel.onClose} className="!py-2">
              <PixelIcon name="close" size={2} /> <FormattedMessage id="world.leaveBuilding" />
              <span className="hidden sm:inline opacity-60 !text-[11px]">Esc</span>
            </PixelButton>
          </div>
          {panel.content}
        </div>
      )}
    </div>
  );
}
