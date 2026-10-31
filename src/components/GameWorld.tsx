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
import { KEEPER_PLACES } from '../game/mapPlaces';
import { keeperLookFor, type BuddyLook, type VillagerLook } from '../game/textures';
import { DEFAULT_LOOK, type Look } from '../game/wardrobe';
import {
  WORLD_EVENTS, type BusRide, type WorldArea, type WorldSnapshot,
} from '../game/types';
import { COLLECTIONS_KEEPER, FEATURE_ID_PREFIX, featureNodeId, type WorldFeature, type WorldSkill } from '../game/features';
import { PixelButton, PixelIcon, type PixelIconName } from './worldgames/pixel';
import { PlaceInfo } from './worldgames/PlaceInfo';
import { RideButton } from './worldgames/RideButton';
import { RIDES, type Ride } from '../game/vehicles';
import { LookSprite } from './worldgames/LookSprite';
import { WorldLoading } from './worldgames/WorldLoading';
import { BusTicket } from './worldgames/BusTicket';
import { FocusZone } from './worldgames/FocusZone';
import { StreetPiano } from './worldgames/StreetPiano';
import { TypeRace } from './worldgames/TypeRace';
import { Fishing } from './worldgames/Fishing';
import { useFocus } from '../hooks/useFocus';
import { clock, secondsCounted, secondsLeft } from '../lib/focusTimer';
import { setRainSound } from '../lib/rainSound';
import { playWin } from '../lib/sfx';
import { useAuth } from '../hooks/useAuth';
import { WorldLive, type Facing, type LiveMessage } from '../lib/worldLive';

export type { WorldStation } from '../game/types';

interface Props {
  /** The skills, whose keepers the scene places; their activities fill the
   *  travel drawer. */
  skills: WorldSkill[];
  /** A keeper was reached and entered: open its menu. */
  onOpenFeature: (f: WorldFeature) => void;
  /** Your portrait in the status bar: you — your clothes and your buddy. */
  onOpenProfile: () => void;
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

/** The playground's games, by the id the map's `play` points give them. */
const PLAYS: Record<string, { emoji: string }> = { piano: { emoji: '🎹' }, race: { emoji: '🚆' }, fish: { emoji: '🎣' } };

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
  skills, onOpenFeature, onOpenProfile, onOpenActivity, paused = false, panel = null,
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
  // Progress: the streak in the status bar, and the lanterns on the river.
  const streak = useStreak((s) => s.count);
  const mastered = useProgressCounts().counts.mastered;
  const progress = useMemo(() => ({ mastered }), [mastered]);
  const animal = getAnimal(animalId ?? 'fox');
  const stage = stageIndex(known);

  const frameRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const [nearestId, setNearestId] = useState<string | null>(null);
  const nearestFeature = features.find((f) => featureNodeId(f) === nearestId) ?? null;
  // The story of the place a room stands in, as a toast: shown on stepping
  // in, and again from the skill bar's ⓘ (`n` restarts its clock).
  const [placeToast, setPlaceToast] = useState<{ id: string; n: number } | null>(null);
  // The bus: the stop a ticket's being bought for, and the journey on it.
  const [busTicket, setBusTicket] = useState<{ index: number; place: string } | null>(null);
  const [busRide, setBusRide] = useState<BusRide | null>(null);
  // The stops (their place ids), read from the scene as the drawer opens.
  const [busStops, setBusStops] = useState<string[]>([]);
  // ── The shared world ── everyone in Huế at once (lib/worldLive): their
  // buddies walk here, wave and chat; you can block anyone.
  const { user } = useAuth();
  const liveRef = useRef<WorldLive | null>(null);
  const [online, setOnline] = useState(0);
  const [peerCard, setPeerCard] = useState<{ id: string; name: string } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [chatHidden, setChatHidden] = useState(false);
  const chatHiddenRef = useRef(chatHidden);
  useEffect(() => { chatHiddenRef.current = chatHidden; }, [chatHidden]);
  // The latest of me, for the connection to announce.
  const meRef = useRef({ name: '', look: DEFAULT_LOOK });
  useEffect(() => {
    meRef.current = { name: buddyName || animal.name, look: worn ?? DEFAULT_LOOK };
    liveRef.current?.updateMe(meRef.current);
  }, [buddyName, animal.name, worn]);
  // The Focus Zone: whether the buddy is at it, whether its window is open,
  // and the timer (which runs on whether or not it is).
  const [atFocus, setAtFocus] = useState(false);
  // The playground: the game the buddy is at, and the one open.
  const [atPlay, setAtPlay] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [focusOpen, setFocusOpen] = useState(false);
  const focusTimer = useFocus((s) => s.timer);
  const rain = useFocus((s) => s.rain);
  const [focusNow, setFocusNow] = useState(() => Date.now());
  // Each second: move a pomodoro on when its phase ends (with a chime), and
  // keep the status bar's clock fresh.
  useEffect(() => {
    const t = setInterval(() => {
      if (useFocus.getState().tick()) playWin();
      setFocusNow(Date.now());
    }, 1000);
    return () => clearInterval(t);
  }, []);
  // The stop whose shelter the buddy is standing at (-1 for none).
  const [atBusStop, setAtBusStop] = useState(-1);
  const showPlace = (id: string) => setPlaceToast((t) => ({ id, n: (t?.n ?? 0) + 1 }));
  const hidePlace = useCallback(() => setPlaceToast(null), []);

  // ── Getting about: walk, bicycle or xích lô — remembered on this device ──
  const [ride, setRideState] = useState<Ride>(() => {
    try { const r = localStorage.getItem('voca-world-ride') as Ride | null; return r && RIDES.includes(r) ? r : 'walk'; } catch { return 'walk'; }
  });
  const rideRef = useRef(ride);
  const nextRideRef = useRef(() => {});
  const nextRide = () => setRideState((r) => {
    const next = RIDES[(RIDES.indexOf(r) + 1) % RIDES.length];
    try { localStorage.setItem('voca-world-ride', next); } catch { /* ignore */ }
    return next;
  });

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
  // Local development only: where the buddy and the pointer are, in map tiles.
  const [debugPos, setDebugPos] = useState<{ buddy: [number, number]; cursor: [number, number] | null } | null>(null);
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
    if (kb) kb.enabled = !paused && busTicket === null && !focusOpen && !playing && !chatOpen;
  }, [paused, busTicket, focusOpen, playing, chatOpen]);

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
      ride: rideRef.current,
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
    const onNear = (id: string | null) => {
      setNearestId(id);
      // A keeper's place tells its story as you walk up — Đông Ba, the boat…
      const feature = id?.startsWith(FEATURE_ID_PREFIX) ? id.slice(FEATURE_ID_PREFIX.length) : null;
      const place = feature && (ROOMS[feature]?.place ?? KEEPER_PLACES[feature]);
      if (place) setPlaceToast((t) => ({ id: place, n: (t?.n ?? 0) + 1 }));
    };
    // Arriving at a named place tells its story (leaving lets it fade).
    const onLandmark = (id: string | null) => { if (id) setPlaceToast((t) => ({ id, n: (t?.n ?? 0) + 1 })); };
    const onMoved = (p: { x: number; y: number; areaIndex: number; facing?: Facing; moving?: boolean }) => {
      setPos(p);
      liveRef.current?.move(p.x, p.y, p.facing ?? 'down', !!p.moving);
    };
    const onArea = ({ area }: { index: number; area: WorldArea }) => {
      arrivalKey.current += 1;
      setArrival({ name: area.name, key: arrivalKey.current });
    };
    // A fresh scene starts at the default zoom, so the mirror must too.
    setZoom(1);
    const onZoom = (z: number) => setZoom(z);
    game.events.on(WORLD_EVENTS.near, onNear);
    game.events.on(WORLD_EVENTS.landmark, onLandmark);
    game.events.on(WORLD_EVENTS.moved, onMoved);
    game.events.on(WORLD_EVENTS.area, onArea);
    game.events.on(WORLD_EVENTS.zoom, onZoom);
    game.events.on(WORLD_EVENTS.bus, setBusRide);
    game.events.on(WORLD_EVENTS.busStop, setAtBusStop);
    game.events.on(WORLD_EVENTS.focus, setAtFocus);
    game.events.on(WORLD_EVENTS.play, setAtPlay);
    const onPeer = (id: string) => { const p = liveRef.current?.peer(id); if (p) setPeerCard({ id, name: p.name }); };
    game.events.on(WORLD_EVENTS.peer, onPeer);
    if (import.meta.env.DEV) game.events.on(WORLD_EVENTS.debug, setDebugPos);
    const ro = new ResizeObserver(() => {
      game.scale.resize(parent.clientWidth * dpr, parent.clientHeight * dpr);
    });
    ro.observe(parent);
    gameRef.current = game;
    return () => {
      gameRef.current = null;
      ro.disconnect();
      game.events.off(WORLD_EVENTS.near, onNear);
      game.events.off(WORLD_EVENTS.landmark, onLandmark);
      game.events.off(WORLD_EVENTS.moved, onMoved);
      game.events.off(WORLD_EVENTS.area, onArea);
      game.events.off(WORLD_EVENTS.zoom, onZoom);
      game.events.off(WORLD_EVENTS.bus, setBusRide);
      game.events.off(WORLD_EVENTS.busStop, setAtBusStop);
      game.events.off(WORLD_EVENTS.focus, setAtFocus);
      game.events.off(WORLD_EVENTS.play, setAtPlay);
      game.events.off(WORLD_EVENTS.peer, onPeer);
      if (import.meta.env.DEV) game.events.off(WORLD_EVENTS.debug, setDebugPos);
      game.destroy(true);
    };
  }, [animal.id, animal.name, stage, buddyName, locale]);

  const scene = () => gameRef.current?.scene.getScene(WorldScene.KEY) as WorldScene | null;
  // Join the shared world while signed in.
  useEffect(() => {
    if (!user) return;
    const live = new WorldLive({ id: user.id, ...meRef.current }, {
      peer: (id, peer) => { scene()?.setPeer(id, peer); setOnline(live.count()); },
      message: (m: LiveMessage) => {
        if (m.kind === 'wave') scene()?.bubble(m.from, '👋');
        else if (m.kind === 'chat' && !chatHiddenRef.current) scene()?.bubble(m.from, m.text);
      },
    });
    live.connect();
    liveRef.current = live;
    const beat = setInterval(() => live.heartbeat(), 2500);
    return () => { clearInterval(beat); live.disconnect(); liveRef.current = null; };
  }, [user]);
  const sendChat = () => {
    const text = chatText.trim();
    if (!text) return;
    liveRef.current?.send({ kind: 'chat', text });
    scene()?.bubble(null, text);
    setChatText('');
  };

  // Rain to focus to: heard, and seen over the world.
  useEffect(() => {
    setRainSound(rain);
    scene()?.setRain(rain);
    return () => setRainSound(false);
  }, [rain]);

  // Getting on or off a ride happens in the running scene; B and the button
  // both step to the next one.
  useEffect(() => { nextRideRef.current = nextRide; });
  useEffect(() => {
    rideRef.current = ride;
    scene()?.setRide(ride);
  }, [ride]);

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
  useEffect(() => { if (drawerOpen || atBusStop >= 0) setBusStops(scene()?.busStops() ?? []); }, [drawerOpen, atBusStop]);

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
        if (e.key === 'b' || e.key === 'B') { e.preventDefault(); nextRideRef.current(); return; }
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
      {/* Local development only: the position readout, in the map generator's
          tiles, for saying exactly where something on the map is wrong. */}
      {import.meta.env.DEV && debugPos && (
        <div className="absolute bottom-2 left-2 z-30 pointer-events-none rounded bg-black/70 px-2 py-1 font-mono text-[11px] text-white">
          you {debugPos.buddy.join(', ')}
          {debugPos.cursor && <> · cursor {debugPos.cursor.join(', ')}</>}
          <span className="text-white/50"> · P logs it</span>
        </div>
      )}

      {/* ── Status bar ── the world's menu (back to the app), you — your
             buddy as dressed, your name — and what the city shows of your
             progress: your streak and the river's lanterns. ── */}
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
            onClick={onOpenProfile}
            title={intl.formatMessage({ id: 'world.statusYou' })}
            className="px-notch px-frame flex items-center gap-2.5 pl-1.5 pr-3.5 h-[3.25rem] text-left hover:brightness-110"
          >
            <span className="px-inset px-notch w-10 h-10 flex items-end justify-center overflow-hidden shrink-0">
              <LookSprite look={dress} scale={2} />
            </span>
            <span className="min-w-0">
              <span className="block px-title !text-[14px] text-[var(--px-gold)] truncate max-w-[10rem]">{buddyName || animal.name}</span>
              {/* Your streak, and what the lanterns mean — they're progress, not scenery. */}
              <span className="flex items-center gap-3 text-[12px] font-bold">
                <span className="flex items-center gap-1 text-[var(--px-gold)]" title={intl.formatMessage({ id: 'world.progressStreak' }, { count: streak })}>
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
          {/* The focus timer, while it runs: its time, and back to it. */}
          {focusTimer.running && !focusOpen && (
            <PixelButton tone="paper" onClick={() => setFocusOpen(true)} title={intl.formatMessage({ id: 'world.focusTitle' })} className="!px-2.5 !py-1.5 !text-[13px] px-num">
              🧘 {clock(focusTimer.mode === 'pomodoro' ? secondsLeft(focusTimer, focusNow) : secondsCounted(focusTimer, focusNow))}
            </PixelButton>
          )}
          {/* The shared world: who's here, and the chat bar. */}
          {user && (
            <PixelButton tone={chatOpen ? 'gold' : 'paper'} onClick={() => setChatOpen((o) => !o)} title={intl.formatMessage({ id: 'world.liveChat' })} className="!px-2.5 !py-1.5 !text-[13px] px-num">
              💬 {online}
            </PixelButton>
          )}
          <RideButton ride={ride} look={worn ?? DEFAULT_LOOK} onNext={nextRide} />
          <PixelButton
            tone={drawerOpen ? 'gold' : 'paper'}
            onClick={() => { setPlaceToast(null); setDrawerOpen((o) => !o); }}
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
            </div>
            <div className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-3">
              {/* By bus: every stop in the city — picking one buys a ticket
                  (a word) and the bus drives you there. */}
              <DrawerSection
                open={!folded.has('bus')}
                onToggle={() => toggleFold('bus')}
                title={<><span className="text-[14px] leading-none">🚌</span> <FormattedMessage id="world.bus" /></>}
              >
                {busStops.map((place, i) => (
                  <button
                    key={place}
                    disabled={!!busRide}
                    onClick={() => { setDrawerOpen(false); setBusTicket({ index: i, place }); }}
                    className="px-pick px-notch w-full flex items-center gap-2 px-2.5 py-1.5 text-left"
                  >
                    <span className="flex-1 min-w-0 truncate text-[14px] font-bold">{intl.formatMessage({ id: `places.${place}` })}</span>
                    <span className="text-[12px] leading-none">🚏</span>
                  </button>
                ))}
              </DrawerSection>
              {/* A drawer of sections: each skill with its activities (picking
                  one walks to the keeper and opens it). Every section folds. */}
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

      {/* ── The bus: buying the ticket, then the ride. ── */}
      {/* ── Another player, tapped: wave, or block. ── */}
      {!panel && peerCard && (
        <WorldCard emoji="👤" title={peerCard.name} subtitle={<FormattedMessage id="world.livePeer" />}>
          <div className="grid grid-cols-3 gap-1.5">
            <PixelButton tone="gold" onClick={() => { liveRef.current?.send({ kind: 'wave', to: peerCard.id }); scene()?.bubble(null, '👋'); setPeerCard(null); }} className="!px-2 !text-[13px]">
              👋 <FormattedMessage id="world.liveWave" />
            </PixelButton>
            <PixelButton tone="bad" onClick={() => { liveRef.current?.block(peerCard.id); setPeerCard(null); }} className="!px-2 !text-[13px]">
              <FormattedMessage id="world.liveBlock" />
            </PixelButton>
            <PixelButton tone="paper" onClick={() => setPeerCard(null)} className="!px-2 !text-[13px]">
              <FormattedMessage id="world.busNotNow" />
            </PixelButton>
          </div>
        </WorldCard>
      )}

      {/* ── The chat bar ── */}
      {!panel && chatOpen && (
        <div className="px absolute left-1/2 -translate-x-1/2 bottom-2 z-30 w-[min(94%,460px)] px-notch px-frame p-2 flex gap-1.5 px-in-up" onKeyDown={(e) => e.stopPropagation()}>
          <input
            autoFocus
            value={chatText}
            maxLength={120}
            onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); if (e.key === 'Escape') setChatOpen(false); }}
            placeholder={intl.formatMessage({ id: 'world.liveSay' })}
            className="px-inset px-notch flex-1 min-w-0 px-3 py-2 text-[14px] bg-transparent outline-none"
          />
          <PixelButton tone="jade" onClick={sendChat} className="!px-3 !text-[13px]"><FormattedMessage id="world.liveSend" /></PixelButton>
          <PixelButton tone="paper" onClick={() => setChatHidden((h) => !h)} title={intl.formatMessage({ id: chatHidden ? 'world.liveShowChat' : 'world.liveHideChat' })} className="!px-2.5 !text-[13px]">
            {chatHidden ? '🔕' : '🔔'}
          </PixelButton>
        </div>
      )}

      {/* ── The playground: the street piano, the type race ── */}
      {!panel && !nearestFeature && atPlay && !playing && !busRide && busTicket === null && (
        <WorldCard
          emoji={PLAYS[atPlay]?.emoji ?? '🎲'}
          title={<FormattedMessage id={`world.${atPlay}Title`} />}
          subtitle={<FormattedMessage id={`world.${atPlay}Blurb`} />}
        >
          <PixelButton tone="gold" block onClick={() => setPlaying(atPlay)}><FormattedMessage id="world.play" /></PixelButton>
        </WorldCard>
      )}
      {!panel && playing === 'piano' && <StreetPiano onClose={() => setPlaying(null)} />}
      {!panel && playing === 'race' && <TypeRace onClose={() => setPlaying(null)} />}
      {!panel && playing === 'fish' && <Fishing onClose={() => setPlaying(null)} />}

      {/* ── The Focus Zone on Ngự Bình ── */}
      {!panel && !nearestFeature && atFocus && !focusOpen && !busRide && busTicket === null && (
        <WorldCard emoji="🧘" title={<FormattedMessage id="world.focusTitle" />} subtitle={<FormattedMessage id="world.focusBlurb" />}>
          <PixelButton tone="gold" block onClick={() => setFocusOpen(true)}><FormattedMessage id="world.enter" /></PixelButton>
        </WorldCard>
      )}
      {!panel && focusOpen && <FocusZone onClose={() => setFocusOpen(false)} />}

      {/* At a stop's shelter: the bus is in the Travel drawer. */}
      {!panel && !nearestFeature && atBusStop >= 0 && !busRide && busTicket === null && !drawerOpen && busStops[atBusStop] && (
        <WorldCard
          emoji="🚏"
          title={intl.formatMessage({ id: `places.${busStops[atBusStop]}` })}
          subtitle={<FormattedMessage id="world.busStopHere" />}
        >
          <PixelButton
            tone="gold"
            block
            onClick={() => { setFolded((f) => { const n = new Set(f); n.delete('bus'); return n; }); setPlaceToast(null); setDrawerOpen(true); }}
          >
            🚌 <FormattedMessage id="world.busTake" />
          </PixelButton>
        </WorldCard>
      )}
      {!panel && busTicket !== null && (
        <BusTicket
          stop={intl.formatMessage({ id: `places.${busTicket.place}` })}
          onBoard={() => { scene()?.busTo(busTicket.index); setBusTicket(null); }}
          onClose={() => setBusTicket(null)}
        />
      )}
      {!panel && busRide && (
        <WorldCard
          emoji="🚌"
          title={<FormattedMessage id="world.busRiding" />}
          subtitle={<FormattedMessage id="world.busTo" values={{ place: intl.formatMessage({ id: `places.${busRide.place}` }) }} />}
        >
          <p className="text-[13px] text-[var(--px-muted)]"><FormattedMessage id="world.busHint" /></p>
        </WorldCard>
      )}

      {placeToast && <PlaceInfo key={placeToast.n} id={placeToast.id} onClose={hidePlace} />}

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
