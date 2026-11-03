import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
import { VendorTalk } from './worldgames/VendorTalk';
import { PlaceMemorial } from './worldgames/PlaceMemorial';
import { RideButton } from './worldgames/RideButton';
import { LanguageButton } from './worldgames/LanguageButton';
import { DayNightButton } from './worldgames/DayNightButton';
import { FestiveButton } from './worldgames/FestiveButton';
import { FriendChat, FriendsPanel } from './worldgames/FriendsPanel';
import { acceptFriend, friendStatuses, listFriends, removeFriend, requestFriend, type FriendStatus, type FriendsList } from '../lib/friendsApi';
import { CaiLuongStage } from './worldgames/CaiLuongStage';
import { FortuneSticks } from './worldgames/FortuneSticks';
import { PoolMatch, PoolSolo } from './worldgames/PoolGames';
import { Foosball } from './worldgames/Foosball';
import { QuocHocLadder } from './worldgames/QuocHocLadder';
import { FireworksLaunch } from './worldgames/FireworksLaunch';
import { startDonTune, stopDonTune } from '../lib/donTune';
import { useFestive } from '../hooks/useFestive';
import { RIDES, type Ride } from '../game/vehicles';
import { REACTIONS, REACTION_ICONS, REACTION_MS, type Gift, type Reaction } from '../game/reactions';
import { LookSprite } from './worldgames/LookSprite';
import { WorldLoading } from './worldgames/WorldLoading';
import { WorldIntro, type IntroStop } from './worldgames/WorldIntro';
import { BusTicket } from './worldgames/BusTicket';
import { FocusZone } from './worldgames/FocusZone';
import { StreetPiano } from './worldgames/StreetPiano';
import { TypeRace } from './worldgames/TypeRace';
import { WordDuel } from './worldgames/WordDuel';
import { TalkCall } from './worldgames/TalkCall';
import { WordCaro } from './worldgames/WordCaro';
import { CARO_BIG } from '../lib/wordCaro';
import { WordChain } from './worldgames/WordChain';
import { OAnQuan } from './worldgames/OAnQuan';
import { Poker } from './worldgames/Poker';
import { MemoryMatch } from './worldgames/MemoryMatch';
import { TienLen } from './worldgames/TienLen';
import { ChessMatch } from './worldgames/ChessMatch';
import { SeaBattle } from './worldgames/SeaBattle';
import { Fishing } from './worldgames/Fishing';
import { useFocus } from '../hooks/useFocus';
import { clock, secondsCounted, secondsLeft } from '../lib/focusTimer';
import { setRainSound } from '../lib/rainSound';
import { playWin } from '../lib/sfx';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { sendMessage } from '../lib/messagesApi';
import { ApiError } from '../lib/api';
import { WorldLive, watchWorldCount, cleanChat, type Facing, MatchBus, type LiveMessage, type Match, type MatchGame, type MatchLink } from '../lib/worldLive';

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
  /** The buddy reached a named place on the map, or left it (its `places` id,
   *  or null) — a treasure hunt's station opens when its landmark is reached. */
  onLandmark?: (place: string | null) => void;
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

/** A phone, or anything short on memory: the world runs light there (the 1×
 *  map in place of the high-detail patches, a 1.5× canvas) — those GPUs are
 *  bound by texture memory and fill rate long before the CPU. */
function liteDevice(): boolean {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return coarse || (memory !== undefined && memory <= 4);
}
const MINIMAP_W = 96; // px

/** Minimap dot colour per node kind — the pixel kit's palette. */
const DOT: Record<string, string> = {
  mine: '#4f8fe0',
  joined: '#a77bf0',
  level: '#5fd068',
  feature: '#f0c050',
  create: '#b8a88e',
};

type MinimapPos = { x: number; y: number; areaIndex: number };

/** The area you're in, its buildings, and you. Holds the buddy's position as
 *  its own state, so walking re-renders this and not the whole world screen.
 *  Hidden on phones — where it'd re-render for nothing, it doesn't subscribe. */
function Minimap({ snap, initial, listeners }: {
  snap: WorldSnapshot;
  initial: MinimapPos | null;
  listeners: Set<(p: MinimapPos) => void>;
}) {
  const [pos, setPos] = useState(initial);
  useEffect(() => {
    const shown = window.matchMedia('(min-width: 640px) and (min-height: 521px)');
    const on = (p: MinimapPos) => { if (shown.matches) setPos(p); };
    listeners.add(on);
    return () => { listeners.delete(on); };
  }, [listeners]);
  if (!pos) return null;
  const area = snap.areas[pos.areaIndex];
  if (!area) return null;
  const h = area.bottom - area.top;
  const height = Math.max(28, Math.round((MINIMAP_W * h) / snap.worldW));
  const here = snap.nodes.filter((n) => n.y >= area.top && n.y < area.bottom);
  return (
    <div className="px absolute top-[calc(4.25rem+var(--sat))] left-[calc(0.5rem+var(--sal))] z-20 px-notch px-frame p-2 pointer-events-none hidden sm:block [@media(max-height:520px)]:hidden">
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
}

/** The card at the bottom when the buddy reaches a building, a plot or a
 *  collection — the world's version of a dialogue box. */
/** A line of chat: who (you in gold), and what they said. */
/** A line of chat. Private ones (`dm`) are pink and say who they're between;
 *  a tap on one you received replies to its sender. */
function ChatLine({ name, text, mine, dm, onReply }: { name: string; text: string; mine: boolean; dm?: boolean; onReply?: () => void }) {
  const intl = useIntl();
  const who = dm
    ? intl.formatMessage({ id: mine ? 'world.dmTo' : 'world.dmFrom' }, { name })
    : name;
  const line = (
    <>
      {dm && <span className="text-[#f08ac8] align-[-1px] mr-1 inline-block"><PixelIcon name="mail" size={1} /></span>}
      <span className={`px-title !text-[12px] ${dm ? 'text-[#f08ac8]' : mine ? 'text-[var(--px-gold)]' : 'text-[var(--px-sky)]'}`}>{who}</span>{' '}
      <span className={dm ? 'text-[#ffd6ee]' : undefined}>{text}</span>
    </>
  );
  const cls = 'text-[13px] leading-snug text-white break-words [text-shadow:0_1px_0_#000]';
  return onReply
    ? <button type="button" onClick={onReply} title={intl.formatMessage({ id: 'world.dmReply' }, { name })} className={`${cls} block text-left w-full hover:brightness-125`}>{line}</button>
    : <p className={cls}>{line}</p>;
}

function WorldCard({ emoji, icon, color = 'var(--px-gold)', title, subtitle, children }: {
  emoji?: string;
  icon?: PixelIconName;
  color?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="px absolute bottom-[calc(3.75rem+var(--sab))] sm:bottom-[calc(0.5rem+var(--sab))] left-1/2 -translate-x-1/2 z-20 w-[min(94%,420px)] max-h-[calc(100%-8rem-var(--sat)-var(--sab))] flex flex-col px-in-up">
      <div className="px-notch px-frame p-3.5 overflow-y-auto min-h-0">
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

/** Each thing two players can do together, by its mark. */
const MATCH_ICONS: Record<MatchGame, PixelIconName> = { duel: 'sword', race: 'train', talk: 'mic', caro: 'grid', caro7: 'grid', chain: 'link', oan: 'stones', poker: 'cards', chess: 'knight', memory: 'memory', tienlen: 'fan', sea: 'ship', pool: 'eightball' };

/** One group on a player's card: a small heading over its buttons. */
function PeerSection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-2">
      <p className="px-title !text-[11px] text-[var(--px-muted)] mb-1">{title}</p>
      <div className="grid grid-cols-2 gap-1.5">{children}</div>
    </div>
  );
}

/** Set once the welcome (WorldIntro) has been seen or skipped on this device. */
const INTRO_SEEN = 'voca-world-intro-seen';

/** The playground's games, by the id the map's `play` points give them. */
// A game's mark on its card: a pixel icon where the kit has one, else an emoji.
const PLAYS: Record<string, { emoji?: string; icon?: PixelIconName }> = {
  piano: { emoji: '🎹' }, race: { icon: 'train' }, fish: { emoji: '🎣' },
  cailuong: { icon: 'stage' }, fortune: { icon: 'sticks' }, fireworks: { icon: 'firework' }, pool: { icon: 'eightball' }, foosball: { icon: 'foos' }, ladder: { icon: 'cap' }, train: { icon: 'train' },
};

/** Where Ga Huế's trains will go, in the board's order (world.train.<id>). */
const TRAIN_TRIPS = ['bachMa', 'thuanAn', 'langCo'] as const;

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
  skills, onOpenFeature, onOpenProfile, onOpenActivity, onLandmark, paused = false, panel = null,
}: Props) {
  const intl = useIntl();
  // The scene's listeners are bound once; a ref keeps them on the latest callback.
  const onLandmarkRef = useRef(onLandmark);
  useEffect(() => { onLandmarkRef.current = onLandmark; });
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
  // A ticket to one stop, or (`tour`) for the sightseeing loop round them all.
  const [busTicket, setBusTicket] = useState<{ index: number; place: string; tour?: boolean } | null>(null);
  const [busRide, setBusRide] = useState<BusRide | null>(null);
  // The stops (their place ids), read from the scene as the drawer opens.
  const [busStops, setBusStops] = useState<string[]>([]);
  // ── The shared world ── everyone in Huế at once (lib/worldLive): their
  // buddies walk here, wave and chat; you can block anyone.
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const signedIn = !!user;
  // The welcome, for someone new and signed out — once per device, and again
  // from the ⓘ button beside Sign in.
  const [intro, setIntro] = useState(false);
  const liveRef = useRef<WorldLive | null>(null);
  const [online, setOnline] = useState(0);
  // Everyone in Huế, me included — shown to the signed-out too, as a reason
  // to sign in. Signed in it's the peers WorldLive sees, plus me.
  const [watched, setWatched] = useState(0);
  const [peerCard, setPeerCard] = useState<{ id: string; name: string } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [reactOpen, setReactOpen] = useState(false);
  const [chatHidden, setChatHidden] = useState(false);
  // The chat's history while the world is open: yours and others' lines.
  const [chatLog, setChatLog] = useState<{ key: string; name: string; text: string; mine: boolean; dm?: { id: string } }[]>([]);
  // Private messages: who the chat bar is sending to (null: everyone), and
  // whether one arrived while the chat was shut.
  const [dmTo, setDmTo] = useState<{ id: string; name: string } | null>(null);
  const [dmUnread, setDmUnread] = useState(false);
  const chatOpenRef = useRef(chatOpen);
  useEffect(() => {
    chatOpenRef.current = chatOpen;
    if (chatOpen) setDmUnread(false); else setDmTo(null);
  }, [chatOpen]);
  // ── Friends: the list (loaded on entering the world), the panel, and a
  // friend's conversation, kept on the server. A message to a friend opens
  // that rather than the open chat's private line.
  const [friends, setFriends] = useState<FriendsList | null>(null);
  const friendsRef = useRef<FriendsList | null>(null);
  useEffect(() => { friendsRef.current = friends; }, [friends]);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendChat, setFriendChat] = useState<{ id: string; name: string } | null>(null);
  /** Appends a message that just arrived to the open conversation (FriendChat registers it). */
  const friendAppend = useRef<{ id: string; append: (text: string) => void } | null>(null);
  const [peerFriend, setPeerFriend] = useState<FriendStatus | undefined>(undefined);
  // A failed load leaves the world as it was; the panel just says so.
  const [friendsFailed, setFriendsFailed] = useState(false);
  const loadFriends = useCallback(() => {
    listFriends().then((l) => { setFriends(l); setFriendsFailed(false); }, () => setFriendsFailed(true));
  }, []);
  const isFriend = (id: string) => !!friendsRef.current?.friends.some((f) => f.userId === id);
  const friendsBadge = (friends?.incoming.length ?? 0) + (friends?.friends.reduce((n, f) => n + f.unread, 0) ?? 0);
  const openFriendChat = (id: string, name: string) => {
    setFriendChat({ id, name });
    setFriendsOpen(false); setPeerCard(null); setChatOpen(false);
    // Reading it clears its unread count.
    setFriends((l) => l && { ...l, friends: l.friends.map((f) => (f.userId === id ? { ...f, unread: 0 } : f)) });
  };
  const messagePeer = (id: string, name: string) => {
    if (isFriend(id)) { openFriendChat(id, name); return; }
    setDmTo({ id, name }); setPeerCard(null); setReactOpen(false); setChatOpen(true);
  };
  const chatHiddenRef = useRef(chatHidden);
  useEffect(() => { chatHiddenRef.current = chatHidden; }, [chatHidden]);
  // Games with another player: the one I've asked for, the one I've been
  // asked to, and the one being played. One at a time — anyone asking while
  // I'm busy is turned down for me.
  const [asking, setAsking] = useState<{ id: string; to: string; name: string; game: MatchGame } | null>(null);
  const [invite, setInvite] = useState<{ id: string; from: string; name: string; game: MatchGame } | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const busyRef = useRef({ asking, invite, match });
  useEffect(() => { busyRef.current = { asking, invite, match }; }, [asking, invite, match]);
  // A game's line through the connection, which plugs itself in while open.
  const [bus] = useState(() => new MatchBus());
  const link = useMemo<MatchLink | null>(() => match && bus.link(match), [match, bus]);
  // The latest of me, for the connection to announce.
  const meRef = useRef({ name: '', look: DEFAULT_LOOK });
  useEffect(() => {
    meRef.current = { name: buddyName || animal.name, look: worn ?? DEFAULT_LOOK };
    liveRef.current?.updateMe(meRef.current);
  }, [buddyName, animal.name, worn]);
  // The Focus Zone: whether the buddy is at it, whether its window is open,
  // and the timer (which runs on whether or not it is).
  const [atFocus, setAtFocus] = useState(false);
  // The food stall whose vendor the buddy is at, and one they've said goodbye
  // to — quiet until the buddy walks away from it.
  const [atVendor, setAtVendor] = useState<string | null>(null);
  const [vendorDone, setVendorDone] = useState<string | null>(null);
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
  // A place's memorial, opened from its card: its story at length.
  const [memorial, setMemorial] = useState<string | null>(null);
  const closeMemorial = useCallback(() => setMemorial(null), []);

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
  // The scene is live once it first reports the buddy's position. The
  // position itself isn't state here: it changes ten times a second while
  // walking, and only the minimap needs it — so it goes to listeners (the
  // minimap's own state), not to a re-render of this whole screen.
  const [sceneUp, setSceneUp] = useState(false);
  const posListeners = useRef(new Set<(p: MinimapPos) => void>());
  const lastPos = useRef<MinimapPos | null>(null);
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
    if (kb) kb.enabled = !paused && busTicket === null && !focusOpen && !playing && !chatOpen && !match && !memorial && !intro;
  }, [paused, busTicket, focusOpen, playing, chatOpen, match, memorial, intro]);

  // The world fills the screen: the frame stretches from wherever it starts
  // (the top, full-screen) to the bottom of the window, never below MIN_H.
  const [vpH, setVpH] = useState(MIN_H);
  useEffect(() => {
    const measure = () => {
      const el = frameRef.current;
      if (!el) return;
      // The visible area where there is one: on a phone it shrinks for the
      // keyboard, so the chat box stays above it.
      const h = window.visualViewport?.height ?? window.innerHeight;
      setVpH(Math.max(MIN_H, Math.floor(h - el.getBoundingClientRect().top)));
    };
    measure();
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => { window.removeEventListener('resize', measure); window.visualViewport?.removeEventListener('resize', measure); };
  }, []);

  // ── Phaser lifecycle: one game per buddy identity ──
  useEffect(() => {
    const parent = frameRef.current;
    if (!parent) return;
    // Render at native device resolution (the camera zooms to compensate),
    // otherwise the browser upscales the canvas on retina screens and both
    // text and sprites come out blurry.
    // Capped at 2: the art is 16px pixel art drawn 2×, so a 3× canvas costs
    // 2.25× the fill rate of a 2× one and buys nothing you can see. On a
    // phone, 1.5: ~44% fewer pixels a frame, each layer (ground, roofs, night
    // veil, lights) drawn over all of them.
    const lite = liteDevice();
    const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2);
    const look: BuddyLook = { kind: 'animal', id: animal.id };
    const data: WorldSceneData = {
      features: live.current.features,
      look,
      dress: dressRef.current,
      ride: rideRef.current,
      stage,
      buddyName: buddyName || animal.name,
      dpr,
      lite,
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
      // A keeper's place tells its story as you walk up — Tàng Thư Lâu, the market…
      const feature = id?.startsWith(FEATURE_ID_PREFIX) ? id.slice(FEATURE_ID_PREFIX.length) : null;
      const place = feature && (ROOMS[feature]?.place ?? KEEPER_PLACES[feature]);
      if (place) setPlaceToast((t) => ({ id: place, n: (t?.n ?? 0) + 1 }));
    };
    // Arriving at a named place tells its story (leaving lets it fade).
    const onLandmark = (id: string | null) => {
      onLandmarkRef.current?.(id);
      if (id) setPlaceToast((t) => ({ id, n: (t?.n ?? 0) + 1 }));
    };
    const onMoved = (p: { x: number; y: number; areaIndex: number; facing?: Facing; moving?: boolean }) => {
      lastPos.current = p;
      setSceneUp(true);
      for (const f of posListeners.current) f(p);
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
    const onVendor = (id: string | null) => { setAtVendor(id); if (!id) setVendorDone(null); };
    game.events.on(WORLD_EVENTS.vendor, onVendor);
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
      game.events.off(WORLD_EVENTS.vendor, onVendor);
      game.events.off(WORLD_EVENTS.play, setAtPlay);
      game.events.off(WORLD_EVENTS.peer, onPeer);
      if (import.meta.env.DEV) game.events.off(WORLD_EVENTS.debug, setDebugPos);
      game.destroy(true);
    };
  }, [animal.id, animal.name, stage, buddyName, locale]);

  const scene = () => gameRef.current?.scene.getScene(WorldScene.KEY) as WorldScene | null;
  // Join the shared world while signed in — keyed on the account, not the
  // user object, which auth replaces on every session refresh (a rejoin each
  // time you came back to the tab).
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    loadFriends();
    const live = new WorldLive({ id: userId, ...meRef.current }, {
      peer: (id, peer) => {
        scene()?.setPeer(id, peer);
        setOnline(live.count());
        if (peer) return;
        // Gone: so is any game with them.
        const b = busyRef.current;
        if (b.match?.peer.id === id) bus.deliver({ kind: 'left' });
        if (b.invite?.from === id) setInvite(null);
        if (b.asking?.to === id) setAsking(null);
      },
      dm: (from, text) => {
        // A friend's conversation that's open takes it there; otherwise a
        // friend's message counts as unread on the Friends button.
        const friend = friendsRef.current?.friends.find((f) => f.userId === from);
        if (friendAppend.current?.id === from) { friendAppend.current.append(text); return; }
        if (friend) setFriends((l) => l && { ...l, friends: l.friends.map((f) => (f.userId === from ? { ...f, unread: f.unread + 1 } : f)) });
        const name = live.peer(from)?.name ?? friend?.name ?? '?';
        setChatLog((l) => [...l.slice(-29), { key: `${Date.now()}${Math.random()}`, name, text, mine: false, dm: { id: from } }]);
        if (!chatOpenRef.current) setDmUnread(true);
      },
      message: (m: LiveMessage) => {
        const b = busyRef.current;
        if (m.kind === 'wave') scene()?.react(m.from, 'wave');
        else if (m.kind === 'react') scene()?.react(m.from, m.reaction);
        else if (m.kind === 'gift') {
          // Over the giver, and over whoever it's for — you, with a note.
          scene()?.react(m.from, m.gift);
          if (m.to === userId) {
            scene()?.react(null, m.gift);
            setGiftNote({ key: Date.now(), name: live.peer(m.from)?.name ?? '?' });
          } else scene()?.react(m.to, m.gift);
        }
        else if (m.kind === 'chat' && !chatHiddenRef.current) {
          scene()?.bubble(m.from, m.text);
          const name = live.peer(m.from)?.name ?? '?';
          setChatLog((l) => [...l.slice(-29), { key: `${Date.now()}${Math.random()}`, name, text: m.text, mine: false }]);
        }
        else if (m.kind === 'invite') {
          const p = live.peer(m.from);
          if (!p || b.asking || b.invite || b.match) live.send({ kind: 'reply', to: m.from, id: m.id, ok: false });
          else setInvite({ id: m.id, from: m.from, name: p.name, game: m.game as MatchGame });
        } else if (m.kind === 'reply') {
          // From the one who asked me: they've called it off.
          if (b.invite?.id === m.id && b.invite.from === m.from) { setInvite(null); return; }
          if (b.asking?.id !== m.id || b.asking.to !== m.from) return;
          const p = live.peer(m.from);
          setAsking(null);
          if (m.ok && p) setMatch({ id: m.id, game: b.asking.game, host: true, peer: { id: p.id, name: p.name, look: p.look } });
          else scene()?.bubble(m.from, '🙅');
        } else if (m.kind === 'play' && b.match?.id === m.id && b.match.peer.id === m.from) {
          bus.deliver(m.data);
        }
      },
    });
    void live.connect();
    liveRef.current = live;
    bus.plug(live);
    const beat = setInterval(() => live.heartbeat(), 2500);
    return () => { clearInterval(beat); live.disconnect(); liveRef.current = null; bus.plug(null); };
  }, [userId, bus, loadFriends]);
  useEffect(() => {
    if (userId || authLoading) return;
    return watchWorldCount(setWatched);
  }, [userId, authLoading]);
  const players = userId ? online + 1 : watched;
  // Fast travel to another player, from the who's-here list or their card.
  // The card's friend button reflects where you stand with them.
  const peerCardId = peerCard?.id;
  useEffect(() => {
    setPeerFriend(undefined);
    if (!peerCardId) return;
    let alive = true;
    friendStatuses([peerCardId]).then((s) => alive && setPeerFriend(s[peerCardId]));
    return () => { alive = false; };
  }, [peerCardId]);
  const befriend = async (id: string, name: string) => {
    try {
      const s = peerFriend === 'received' ? await acceptFriend(id) : await requestFriend(id);
      setPeerFriend(s);
      toast.success(intl.formatMessage({ id: s === 'friends' ? 'friends.nowFriends' : 'friends.requestSent' }, { name }));
      loadFriends();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const goToPeer = (id: string) => { scene()?.travelToPeer(id); setChatOpen(false); setPeerCard(null); };
  // Where someone is: the area of the map they're in.
  const areaAt = (y: number) => snap?.areas.find((a) => y >= a.top && y < a.bottom)?.name;
  // Positions don't re-render the shell; while the list is up, refresh it.
  const [, setListTick] = useState(0);
  useEffect(() => {
    if (!chatOpen) return;
    const t = setInterval(() => setListTick((n) => n + 1), 2000);
    return () => clearInterval(t);
  }, [chatOpen]);
  /** Ask someone to a game; they have half a minute to answer. */
  const askToPlay = (to: string, name: string, game: MatchGame) => {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    liveRef.current?.send({ kind: 'invite', to, game, id });
    setAsking({ id, to, name, game });
    setPeerCard(null);
  };
  const cancelAsking = () => {
    if (asking) liveRef.current?.send({ kind: 'reply', to: asking.to, id: asking.id, ok: false });
    setAsking(null);
  };
  const answerInvite = (ok: boolean) => {
    if (!invite) return;
    liveRef.current?.send({ kind: 'reply', to: invite.from, id: invite.id, ok });
    const p = liveRef.current?.peer(invite.from);
    if (ok && p) { setPlaying(null); setMatch({ id: invite.id, game: invite.game, host: false, peer: { id: p.id, name: p.name, look: p.look } }); }
    setInvite(null);
  };
  const endMatch = () => { link?.send({ kind: 'left' }); setMatch(null); };
  // Unanswered for half a minute: it's a no.
  const answerInviteRef = useRef(answerInvite);
  const cancelAskingRef = useRef(cancelAsking);
  useEffect(() => { answerInviteRef.current = answerInvite; cancelAskingRef.current = cancelAsking; });
  useEffect(() => {
    if (!invite) return;
    const t = setTimeout(() => answerInviteRef.current(false), 30000);
    return () => clearTimeout(t);
  }, [invite]);
  useEffect(() => {
    if (!asking) return;
    const t = setTimeout(() => cancelAskingRef.current(), 30000);
    return () => clearTimeout(t);
  }, [asking]);

  /** React, for everyone around to see — no quicker than one plays. */
  const lastReact = useRef(0);
  const react = useCallback((reaction: Reaction) => {
    const now = Date.now();
    if (now - lastReact.current < REACTION_MS) return;
    lastReact.current = now;
    scene()?.react(null, reaction);
    liveRef.current?.send({ kind: 'react', reaction });
  }, []);

  /** Give someone a gift: over you both, for everyone around to see. */
  const give = (to: string, gift: Gift) => {
    const now = Date.now();
    if (now - lastReact.current < REACTION_MS) return;
    lastReact.current = now;
    scene()?.react(null, gift);
    scene()?.react(to, gift);
    liveRef.current?.send({ kind: 'gift', to, gift });
  };
  const [giftNote, setGiftNote] = useState<{ key: number; name: string } | null>(null);
  useEffect(() => {
    if (!giftNote) return;
    const t = setTimeout(() => setGiftNote(null), 4000);
    return () => clearTimeout(t);
  }, [giftNote]);

  const [dmSending, setDmSending] = useState(false);
  const sendChat = () => {
    const text = chatText.trim();
    if (!text) return;
    if (dmTo) {
      if (dmSending) return;
      // Nothing is stored: a message to someone who's gone would just vanish.
      if (!liveRef.current?.peer(dmTo.id)) { toast.error(intl.formatMessage({ id: 'world.dmGone' }, { name: dmTo.name })); return; }
      const to = dmTo;
      setDmSending(true);
      sendMessage(to.id, text)
        .then((m) => {
          setChatLog((l) => [...l.slice(-29), { key: `${Date.now()}${Math.random()}`, name: to.name, text: cleanChat(m.text), mine: true, dm: { id: to.id } }]);
          setChatText('');
        })
        .catch((err) => toast.error(err instanceof ApiError ? err.message : intl.formatMessage({ id: 'world.dmFailed' })))
        .finally(() => setDmSending(false));
      return;
    }
    liveRef.current?.send({ kind: 'chat', text });
    scene()?.bubble(null, text);
    setChatLog((l) => [...l.slice(-29), { key: `${Date.now()}${Math.random()}`, name: meRef.current.name, text: cleanChat(text), mine: true }]);
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

  // 1–6 react and "/" opens the chat, while walking about (not typing, not in
  // a game or a skill).
  useEffect(() => {
    if (panel || chatOpen || playing || match || busTicket !== null || focusOpen || memorial) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable]')) return;
      if (e.key === '/') {
        // preventDefault so the "/" isn't typed into the box it opens.
        if (signedIn) { e.preventDefault(); setReactOpen(false); setChatOpen(true); }
        return;
      }
      const r = REACTIONS[Number(e.key) - 1];
      if (r) { e.preventDefault(); react(r); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, chatOpen, playing, match, busTicket, focusOpen, memorial, react, signedIn]);

  // First time here and signed out: the welcome, once the world has drawn
  // (and auth has had its say, so a signed-in visitor never sees it flash).
  useEffect(() => {
    if (authLoading || user || !sceneUp) return;
    try { if (localStorage.getItem(INTRO_SEEN)) return; } catch { return; }
    setIntro(true);
  }, [authLoading, user, sceneUp]);
  const closeIntro = useCallback(() => {
    setIntro(false);
    try { localStorage.setItem(INTRO_SEEN, '1'); } catch { /* ignore */ }
  }, []);
  const introGo = (stop: IntroStop) => {
    closeIntro();
    const sc = scene();
    if (stop === 'keeper' && skills[0]) sc?.travelTo(featureNodeId(skills[0]));
    else if (stop === 'history') sc?.travelToPlace('ngoMon');
    else if (stop === 'games') sc?.travelToPlay('piano');
  };

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
    if (!sceneUp || snap) return;
    setSnap(scene()?.snapshot() ?? null);
  }, [sceneUp, snap]);

  // Tết decorations: hung when the scene is up, and on every switch after.
  // (The first position report is the scene saying it's live.)
  const festive = useFestive((s) => s.active);
  useEffect(() => { if (sceneUp) scene()?.setFestive(festive); }, [festive, sceneUp]);
  // The launch pad is only there while Tết is.
  const playHere = atPlay === 'fireworks' && !festive ? null : atPlay;

  // The đờn tune off the cải lương stage: heard while you stand by it, not
  // once you're up performing (the voices need the quiet).
  const byStage = atPlay === 'cailuong' && !playing;
  useEffect(() => {
    if (byStage) startDonTune(); else stopDonTune();
  }, [byStage]);
  useEffect(() => stopDonTune, []);

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
      // The phone's notch, home bar and rounded corners, for the HUD to keep clear of.
      style={{
        background: '#1c120c', height: vpH,
        '--sat': 'env(safe-area-inset-top, 0px)', '--sab': 'env(safe-area-inset-bottom, 0px)',
        '--sal': 'env(safe-area-inset-left, 0px)', '--sar': 'env(safe-area-inset-right, 0px)',
      } as CSSProperties}
    >
      {/* Phaser mounts its canvas here (fills the frame via Scale.RESIZE). */}

      {/* The title card, until the map has drawn and your buddy stands in it. */}
      {!sceneUp && <WorldLoading />}
      {!panel && intro && sceneUp && (
        <WorldIntro onGo={introGo} onSignIn={() => { closeIntro(); void signInWithGoogle(); }} onClose={closeIntro} />
      )}

      {/* ── HUD (DOM, on top of the canvas) ── the world's own controls, in the
             same pixel kit as the buildings' screens, stepping aside while a
             building's HUD is up. ── */}
      {/* Local development only: the position readout, in the map generator's
          tiles, for saying exactly where something on the map is wrong. */}
      {import.meta.env.DEV && debugPos && (
        <div className="absolute top-[3.6rem] right-2 z-30 pointer-events-none rounded bg-black/70 px-2 py-1 font-mono text-[11px] text-white hidden sm:block">
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
        <div className="px absolute top-[calc(0.5rem+var(--sat))] left-[calc(0.5rem+var(--sal))] z-30 flex items-start gap-2">
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
                  {/* Day or night, and the language — in the bar on wider screens. */}
                  <div className="sm:hidden flex items-center gap-2 pb-1 mb-1 border-b border-white/10"><LanguageButton /><DayNightButton /><FestiveButton /></div>
                  {([['/', 'world.menuApp'], ['/settings', 'world.menuSettings']] as const).map(([to, label]) => (
                    <Link key={to} to={to} className="px-pick px-notch block px-3 py-2 px-title !text-[14px]">
                      <FormattedMessage id={label} />
                    </Link>
                  ))}
                  {/* The app's own bar (and its sign out) is hidden here. */}
                  <button
                    onClick={() => { setMenuOpen(false); void (user ? signOut() : signInWithGoogle()); }}
                    className="px-pick px-notch block w-full text-left px-3 py-2 px-title !text-[14px]"
                  >
                    <FormattedMessage id={user ? 'settings.signOut' : 'world.liveSignInShort'} />
                  </button>
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
        <div className="px absolute top-[calc(0.5rem+var(--sat))] right-[calc(0.5rem+var(--sar))] z-20 flex flex-wrap justify-end items-center gap-2 max-w-[calc(100%-13.5rem)] sm:max-w-none">
          {user && !animalId && (
            <Link to="/companion" className="px-btn px-notch px-title !text-[13px] px-3 h-[2.6rem] inline-flex items-center gap-1.5" data-tone="gold">
              <PixelIcon name="paw" size={2} /> <span className="hidden sm:inline"><FormattedMessage id="world.chooseBuddy" /></span>
            </Link>
          )}
          {/* The focus timer, while it runs: its time, and back to it. */}
          {focusTimer.running && !focusOpen && (
            <PixelButton tone="paper" onClick={() => setFocusOpen(true)} title={intl.formatMessage({ id: 'world.focusTitle' })} className="!px-2.5 !py-0 !h-[2.6rem] !text-[13px] px-num">
              🧘 {clock(focusTimer.mode === 'pomodoro' ? secondsLeft(focusTimer, focusNow) : secondsCounted(focusTimer, focusNow))}
            </PixelButton>
          )}
          {/* Signed out, you're on your own: say so, plainly, and sign in from
              here — Google brings you straight back to the world. (Signed in,
              the chat sits at the bottom left.) */}
          {!user && (
            <PixelButton tone="paper" onClick={() => setIntro(true)} title={intl.formatMessage({ id: 'world.intro.welcome.title' })} aria-label={intl.formatMessage({ id: 'world.intro.welcome.title' })} className="!px-2.5 !py-0 !h-[2.6rem]">
              <PixelIcon name="info" size={2} />
            </PixelButton>
          )}
          {!user && (
            <PixelButton tone="gold" onClick={() => void signInWithGoogle()} title={players > 0 ? `${intl.formatMessage({ id: 'world.livePlayers' }, { n: players })} · ${intl.formatMessage({ id: 'world.liveSignIn' })}` : intl.formatMessage({ id: 'world.liveSignIn' })} className="!px-2.5 !py-0 !h-[2.6rem] !text-[13px]">
              👥 {players > 0 && <span className="px-num">{players}</span>} <span className="hidden sm:inline"><FormattedMessage id="world.liveSignInButton" /></span>
              <span className="sm:hidden"><FormattedMessage id="world.liveSignInShort" /></span>
            </PixelButton>
          )}
          {/* On a phone these two live in the ⋮ menu, to leave the bar room. */}
          <span className="hidden sm:contents"><LanguageButton /><DayNightButton /><FestiveButton /></span>
          {user && (
            <PixelButton
              tone={friendsOpen ? 'gold' : 'paper'}
              onClick={() => { if (!friendsOpen) loadFriends(); setFriendsOpen((o) => !o); setFriendChat(null); }}
              title={intl.formatMessage({ id: 'world.friendsTitle' })}
              aria-label={intl.formatMessage({ id: 'world.friendsTitle' })}
              className="relative !px-2.5 !py-0 !h-[2.6rem]"
            >
              <PixelIcon name="people" size={2} />
              {friendsBadge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 flex items-center justify-center bg-[#e0457b] text-white text-[11px] px-notch">{friendsBadge}</span>
              )}
            </PixelButton>
          )}
          <RideButton ride={ride} look={worn ?? DEFAULT_LOOK} onNext={nextRide} />
          <PixelButton
            tone={drawerOpen ? 'gold' : 'paper'}
            onClick={() => { setPlaceToast(null); setDrawerOpen((o) => !o); }}
            title={intl.formatMessage({ id: 'world.fastTravel' })}
            aria-label={intl.formatMessage({ id: 'world.fastTravel' })}
            className="!px-3 !py-0 !h-[2.6rem]"
          >
            <PixelIcon name="compass" size={2} />
            <span className="hidden sm:inline"><FormattedMessage id="world.travel" /></span>
          </PixelButton>
        </div>
      )}

      {/* ── Zoom ── wheel/pinch work on the canvas; these are the discoverable
          version of the same thing, and show where you are in the range. On
          a phone, pinching is the way, and the room goes to the cards. */}
      {!panel && (
        <div className="px absolute bottom-[calc(0.5rem+var(--sab))] right-[calc(0.5rem+var(--sar))] z-20 px-notch px-frame p-1.5 hidden sm:flex flex-col items-center gap-1">
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
          <div className="px absolute top-[calc(3.5rem+var(--sat))] right-[calc(0.5rem+var(--sar))] bottom-[calc(0.5rem+var(--sab))] z-20 w-[min(80%,280px)] px-notch px-frame flex flex-col px-in-side">
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
                {busStops.length > 1 && (
                  <button
                    disabled={!!busRide}
                    onClick={() => { setDrawerOpen(false); setBusTicket({ index: -1, place: '', tour: true }); }}
                    className="px-pick px-notch w-full flex items-center gap-2 px-2.5 py-1.5 text-left"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-[14px] font-bold text-[var(--px-gold)]"><FormattedMessage id="world.tourName" /></span>
                      <span className="block truncate text-[11px] text-[var(--px-muted)]"><FormattedMessage id="world.tourBlurb" values={{ n: busStops.length }} /></span>
                    </span>
                    <PixelIcon name="compass" size={2} />
                  </button>
                )}
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
      {!panel && snap && (
        <Minimap snap={snap} initial={lastPos.current} listeners={posListeners.current} />
      )}

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

      {/* ── Friends: the panel, and a friend's conversation ── */}
      {!panel && friendsOpen && (
        <FriendsPanel
          list={friends}
          failed={friendsFailed && !friends}
          whereIs={(id) => { const p = liveRef.current?.peer(id); return p ? (areaAt(p.y) || intl.formatMessage({ id: 'world.friendsInHue' })) : null; }}
          onMessage={(p) => openFriendChat(p.userId, p.name)}
          onGoTo={(id) => { setFriendsOpen(false); goToPeer(id); }}
          onAccept={(p) => { acceptFriend(p.userId).then(() => { toast.success(intl.formatMessage({ id: 'friends.nowFriends' }, { name: p.name })); loadFriends(); }, (e) => toast.error((e as Error).message)); }}
          onDecline={(p) => { removeFriend(p.userId).then(loadFriends, (e) => toast.error((e as Error).message)); }}
          onClose={() => setFriendsOpen(false)}
        />
      )}
      {!panel && friendChat && userId && (
        <FriendChat
          key={friendChat.id}
          friend={friendChat}
          meId={userId}
          register={(append) => { friendAppend.current = append ? { id: friendChat.id, append } : null; }}
          onClose={() => setFriendChat(null)}
        />
      )}

      {/* ── The bus: buying the ticket, then the ride. ── */}
      {/* ── Another player, tapped: what you can do together, grouped — learn
          (a call with a dialogue to follow), play, or just say hi. Blocking is
          hidden for now (rarely used); the connection still honours a block
          list. ── */}
      {!panel && peerCard && (
        <WorldCard icon="person" title={peerCard.name} subtitle={<FormattedMessage id="world.livePeer" />}>
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <PixelButton tone="gold" onClick={() => messagePeer(peerCard.id, peerCard.name)} className="!px-2 !py-2 !text-[13px]">
              <PixelIcon name="mail" size={2} /> <FormattedMessage id="world.dmShort" />
            </PixelButton>
            <PixelButton tone="jade" onClick={() => goToPeer(peerCard.id)} className="!px-2 !py-2 !text-[13px]">
              <PixelIcon name="compass" size={2} /> <FormattedMessage id="world.liveGoTo" />
            </PixelButton>
            {peerFriend && peerFriend !== 'you' && (
              <PixelButton
                tone={peerFriend === 'received' ? 'jade' : 'paper'}
                onClick={() => void befriend(peerCard.id, peerCard.name)}
                disabled={peerFriend === 'friends' || peerFriend === 'sent'}
                className="!px-2 !py-2 !text-[13px] col-span-2"
              >
                <PixelIcon name="people" size={2} />
                <FormattedMessage id={`world.friend.${peerFriend}`} />
              </PixelButton>
            )}
          </div>
          <PeerSection title={<FormattedMessage id="world.peerLearn" />}>
            <PixelButton tone="gold" onClick={() => askToPlay(peerCard.id, peerCard.name, 'talk')} className="!px-3 !py-2 !text-[13px] col-span-2 !justify-start text-left">
              <PixelIcon name="mic" size={2} />
              <span className="flex flex-col leading-tight">
                <FormattedMessage id="world.talkInvite" />
                <span className="!font-normal text-[11px] opacity-75 normal-case tracking-normal"><FormattedMessage id="world.talkInviteHint" /></span>
              </span>
            </PixelButton>
          </PeerSection>
          <PeerSection title={<FormattedMessage id="world.peerPlay" />}>
            <PixelButton tone="jade" onClick={() => askToPlay(peerCard.id, peerCard.name, 'duel')} className="!px-2 !text-[13px]">
              <PixelIcon name="sword" size={2} /> <FormattedMessage id="world.duelTitle" />
            </PixelButton>
            <PixelButton tone="jade" onClick={() => askToPlay(peerCard.id, peerCard.name, 'race')} className="!px-2 !text-[13px]">
              <PixelIcon name="train" size={2} /> <FormattedMessage id="world.raceTitle" />
            </PixelButton>
            <PixelButton tone="jade" onClick={() => askToPlay(peerCard.id, peerCard.name, 'caro')} className="!px-2 !text-[13px]">
              <PixelIcon name="grid" size={2} /> <FormattedMessage id="world.caroTitle" />
            </PixelButton>
            <PixelButton tone="jade" onClick={() => askToPlay(peerCard.id, peerCard.name, 'caro7')} className="!px-2 !text-[13px]">
              <PixelIcon name="grid" size={2} /> <FormattedMessage id="world.caroBigTitle" />
            </PixelButton>
            <PixelButton tone="jade" onClick={() => askToPlay(peerCard.id, peerCard.name, 'memory')} className="!px-2 !text-[13px]">
              <PixelIcon name="memory" size={2} /> <FormattedMessage id="world.memoryTitle" />
            </PixelButton>
            <PixelButton tone="jade" onClick={() => askToPlay(peerCard.id, peerCard.name, 'tienlen')} className="!px-2 !text-[13px]">
              <PixelIcon name="fan" size={2} /> <FormattedMessage id="world.tlTitle" />
            </PixelButton>
            <PixelButton tone="jade" onClick={() => askToPlay(peerCard.id, peerCard.name, 'chain')} className="!px-2 !text-[13px]">
              <PixelIcon name="link" size={2} /> <FormattedMessage id="world.chainTitle" />
            </PixelButton>
            <PixelButton tone="jade" onClick={() => askToPlay(peerCard.id, peerCard.name, 'oan')} className="!px-2 !text-[13px]">
              <PixelIcon name="stones" size={2} /> <FormattedMessage id="world.oanTitle" />
            </PixelButton>
            <PixelButton tone="jade" onClick={() => askToPlay(peerCard.id, peerCard.name, 'poker')} className="!px-2 !text-[13px]">
              <PixelIcon name="cards" size={2} /> <FormattedMessage id="world.pokerTitle" />
            </PixelButton>
            <PixelButton tone="jade" onClick={() => askToPlay(peerCard.id, peerCard.name, 'chess')} className="!px-2 !text-[13px]">
              <PixelIcon name="knight" size={2} /> <FormattedMessage id="world.chessTitle" />
            </PixelButton>
            <PixelButton tone="jade" onClick={() => askToPlay(peerCard.id, peerCard.name, 'sea')} className="!px-2 !text-[13px]">
              <PixelIcon name="ship" size={2} /> <FormattedMessage id="world.seaTitle" />
            </PixelButton>
            <PixelButton tone="jade" onClick={() => askToPlay(peerCard.id, peerCard.name, 'pool')} className="!px-2 !text-[13px]">
              <PixelIcon name="eightball" size={2} /> <FormattedMessage id="world.poolTitle" />
            </PixelButton>
          </PeerSection>
          <PeerSection title={<FormattedMessage id="world.peerHi" />}>
            <PixelButton tone="paper" onClick={() => { react('wave'); setPeerCard(null); }} className="!px-2 !text-[13px]">
              <span style={{ color: REACTION_ICONS.wave.color }}><PixelIcon rows={REACTION_ICONS.wave.rows} size={2} /></span> <FormattedMessage id="world.liveWave" />
            </PixelButton>
            <PixelButton tone="paper" onClick={() => { give(peerCard.id, 'flower'); setPeerCard(null); }} className="!px-2 !text-[13px]">
              <span style={{ color: REACTION_ICONS.flower.color }}><PixelIcon rows={REACTION_ICONS.flower.rows} size={2} /></span> <FormattedMessage id="world.giveFlower" />
            </PixelButton>
          </PeerSection>
          <PixelButton tone="paper" block onClick={() => setPeerCard(null)} className="!py-2 !text-[13px] mt-1">
            <FormattedMessage id="world.busNotNow" />
          </PixelButton>
        </WorldCard>
      )}

      {/* A gift for you: who it's from, for a moment. */}
      {giftNote && (
        <div key={giftNote.key} className="px absolute top-16 left-1/2 -translate-x-1/2 z-30 px-notch px-frame px-in-up px-3 py-2 flex items-center gap-2 pointer-events-none">
          <span style={{ color: REACTION_ICONS.flower.color }}><PixelIcon rows={REACTION_ICONS.flower.rows} size={2} /></span>
          <span className="text-[14px]"><FormattedMessage id="world.gotFlower" values={{ name: giftNote.name }} /></span>
        </div>
      )}

      {/* ── Games with another player: asking, being asked, and playing. ── */}
      {!panel && asking && !match && (
        <WorldCard emoji="⏳" title={asking.name} subtitle={<FormattedMessage id="world.liveAsking" values={{ game: asking.game }} />}>
          <PixelButton tone="paper" block onClick={cancelAsking}><FormattedMessage id="world.liveCancel" /></PixelButton>
        </WorldCard>
      )}
      {!panel && invite && !match && (
        <WorldCard icon={MATCH_ICONS[invite.game]} title={invite.name} subtitle={<FormattedMessage id="world.liveInvite" values={{ game: invite.game }} />}>
          <div className="grid grid-cols-2 gap-1.5">
            <PixelButton tone="jade" onClick={() => answerInvite(true)} className="!text-[13px]"><FormattedMessage id="world.play" /></PixelButton>
            <PixelButton tone="paper" onClick={() => answerInvite(false)} className="!text-[13px]"><FormattedMessage id="world.busNotNow" /></PixelButton>
          </div>
        </WorldCard>
      )}
      {link?.game === 'duel' && <WordDuel key={link.id} link={link} onClose={endMatch} />}
      {link?.game === 'race' && <TypeRace key={link.id} versus={link} onClose={endMatch} />}
      {link?.game === 'talk' && <TalkCall key={link.id} link={link} onClose={endMatch} />}
      {link?.game === 'caro' && <WordCaro key={link.id} link={link} onClose={endMatch} />}
      {link?.game === 'caro7' && <WordCaro key={link.id} link={link} onClose={endMatch} board={CARO_BIG} />}
      {link?.game === 'memory' && <MemoryMatch key={link.id} link={link} onClose={endMatch} />}
      {link?.game === 'tienlen' && <TienLen key={link.id} link={link} onClose={endMatch} />}
      {link?.game === 'chain' && <WordChain key={link.id} link={link} onClose={endMatch} />}
      {link?.game === 'oan' && <OAnQuan key={link.id} link={link} onClose={endMatch} />}
      {link?.game === 'poker' && <Poker key={link.id} link={link} onClose={endMatch} />}
      {link?.game === 'chess' && <ChessMatch key={link.id} link={link} onClose={endMatch} />}
      {link?.game === 'pool' && <PoolMatch key={link.id} link={link} onClose={endMatch} />}
      {link?.game === 'sea' && <SeaBattle key={link.id} link={link} onClose={endMatch} />}

      {/* ── The chat ── who's here, at the bottom left, and the bar beside it. ── */}
      {!panel && user && (
        <div className="px absolute left-[calc(0.5rem+var(--sal))] bottom-[calc(0.5rem+var(--sab))] z-30 flex flex-col gap-1.5 w-[calc(100%-5rem)] max-w-[520px] pointer-events-none">
          {/* The history: open, the recent lines to scroll back through;
              closed, the newest few, each fading after a while. See-through,
              so the world stays in view. */}
          {/* Who's here: everyone else in Huế, where they are, and a way there. */}
          {chatOpen && (
            <div className="bg-black/55 px-notch px-2.5 py-1.5 pointer-events-auto">
              <p className="flex items-center gap-1.5 text-[12px] text-[var(--px-muted)] mb-1">
                <span className="w-2 h-2 bg-[var(--px-good)] shrink-0" />
                <FormattedMessage id="world.livePlayers" values={{ n: players }} />
              </p>
              {(liveRef.current?.list().length ?? 0) === 0 ? (
                <p className="text-[13px] text-[var(--px-muted)]"><FormattedMessage id="world.liveAlone" /></p>
              ) : (
                <ul className="max-h-32 overflow-y-auto space-y-1">
                  {liveRef.current?.list().map((p) => (
                    <li key={p.id} className="flex items-center gap-2">
                      <button type="button" onClick={() => setPeerCard({ id: p.id, name: p.name })} className="flex-1 min-w-0 text-left truncate text-[14px] hover:text-[var(--px-gold)]">
                        <span className="text-[#cfe8ff]">{p.name}</span>
                        {areaAt(p.y) && <span className="text-[12px] text-[var(--px-muted)]"> · {areaAt(p.y)}</span>}
                      </button>
                      <PixelButton tone="paper" onClick={() => messagePeer(p.id, p.name)} title={intl.formatMessage({ id: 'world.dmName' }, { name: p.name })} aria-label={intl.formatMessage({ id: 'world.dmName' }, { name: p.name })} className="!px-2 !py-0 !h-7 shrink-0">
                        <PixelIcon name="mail" size={2} />
                      </PixelButton>
                      <PixelButton tone="jade" onClick={() => goToPeer(p.id)} title={intl.formatMessage({ id: 'world.liveGoToName' }, { name: p.name })} className="!px-2 !py-0 !h-7 !text-[12px] shrink-0">
                        <PixelIcon name="compass" size={2} /> <FormattedMessage id="world.liveGoTo" />
                      </PixelButton>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {chatLog.length > 0 && (chatOpen ? (
            <div ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }} className="max-h-44 overflow-y-auto bg-black/45 px-notch px-2.5 py-1.5 space-y-0.5 pointer-events-auto">
              {chatLog.map((c) => (
                <ChatLine key={c.key} name={c.name} text={c.text} mine={c.mine} dm={!!c.dm} onReply={c.dm ? () => setDmTo({ id: c.dm!.id, name: c.name }) : undefined} />
              ))}
            </div>
          ) : (
            <div className="space-y-0.5">
              {chatLog.slice(-5).map((c) => (
                <div key={c.key} className="px-chat-fade w-fit max-w-full bg-black/35 px-2 py-0.5"><ChatLine name={c.name} text={c.text} mine={c.mine} dm={!!c.dm} /></div>
              ))}
            </div>
          ))}
          <div className="flex items-end gap-1.5">
            <PixelButton tone={chatOpen ? 'gold' : 'paper'} onClick={() => setChatOpen((o) => !o)} title={intl.formatMessage({ id: 'world.liveChat' })} className="relative !px-2.5 !py-0 !h-[2.6rem] !text-[13px] px-num shrink-0 pointer-events-auto">
              💬 {players}
              {dmUnread && <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#f08ac8] shadow-[0_0_0_2px_#000]" aria-label={intl.formatMessage({ id: 'world.dmUnread' })} />}
            </PixelButton>
            {/* Reactions: the picker, opening upward; 1–6 do the same. */}
            {!chatOpen && (
              <div className="relative pointer-events-auto">
                {reactOpen && (
                  <div className="absolute bottom-full left-0 mb-1.5 px-notch px-frame p-1 grid grid-cols-6 gap-1 w-max">
                    {REACTIONS.map((r, i) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => react(r)}
                        title={`${intl.formatMessage({ id: `world.react.${r}` })} · ${i + 1}`}
                        aria-label={intl.formatMessage({ id: `world.react.${r}` })}
                        className="px-btn px-notch relative w-10 h-10 inline-flex items-center justify-center"
                        data-tone="paper"
                        style={{ color: REACTION_ICONS[r].color }}
                      >
                        <PixelIcon rows={REACTION_ICONS[r].rows} size={3} />
                        <span className="absolute bottom-0 right-1 text-[9px] text-[var(--px-ink,#1c120c)] opacity-50 px-num">{i + 1}</span>
                      </button>
                    ))}
                  </div>
                )}
                <PixelButton
                  tone={reactOpen ? 'gold' : 'paper'}
                  onClick={() => setReactOpen((o) => !o)}
                  title={intl.formatMessage({ id: 'world.react' })}
                  aria-label={intl.formatMessage({ id: 'world.react' })}
                  aria-expanded={reactOpen}
                  className="!px-2.5 !py-0 !h-[2.6rem]"
                >
                  <span style={{ color: REACTION_ICONS.dance.color }}><PixelIcon rows={REACTION_ICONS.dance.rows} size={2} /></span>
                </PixelButton>
              </div>
            )}
            {chatOpen && (
              <div className="flex-1 min-w-0 h-[2.6rem] px-notch px-frame p-1 flex gap-1 px-in-up pointer-events-auto" onKeyDown={(e) => e.stopPropagation()}>
                {dmTo && (
                  <button
                    type="button"
                    onClick={() => setDmTo(null)}
                    title={intl.formatMessage({ id: 'world.dmToEveryone' })}
                    className="px-notch shrink-0 max-w-[40%] px-2 inline-flex items-center gap-1 bg-[#5a1f45] text-[#ffd6ee] text-[12px]"
                  >
                    <PixelIcon name="mail" size={1} />
                    <span className="truncate">{dmTo.name}</span>
                    <PixelIcon name="close" size={1} />
                  </button>
                )}
                <input
                  autoFocus
                  value={chatText}
                  maxLength={120}
                  onChange={(e) => setChatText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendChat();
                    if (e.key === 'Escape') { if (dmTo) setDmTo(null); else setChatOpen(false); }
                  }}
                  placeholder={dmTo ? intl.formatMessage({ id: 'world.dmSay' }, { name: dmTo.name }) : intl.formatMessage({ id: 'world.liveSay' })}
                  className="px-inset px-notch flex-1 min-w-0 px-3 text-[14px] bg-transparent outline-none"
                />
                <PixelButton tone="jade" onClick={sendChat} disabled={dmSending} className="!px-3 !py-0 !text-[13px]"><FormattedMessage id="world.liveSend" /></PixelButton>
                <PixelButton tone="paper" onClick={() => setChatHidden((h) => !h)} title={intl.formatMessage({ id: chatHidden ? 'world.liveShowChat' : 'world.liveHideChat' })} className="!px-2.5 !py-0 !text-[13px]">
                  {chatHidden ? '🔕' : '🔔'}
                </PixelButton>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── The playground: the street piano, the type race ── */}
      {/* Ga Huế's departures board: trips out of town, none running yet. */}
      {!panel && !nearestFeature && playHere === 'train' && !busRide && busTicket === null && (
        <WorldCard
          icon="train"
          title={<FormattedMessage id="world.trainTitle" />}
          subtitle={<FormattedMessage id="world.trainBlurb" />}
        >
          <ul className="space-y-1.5">
            {TRAIN_TRIPS.map((trip) => (
              <li key={trip} className="px-inset px-notch flex items-center gap-2.5 px-2.5 py-2">
                <div className="flex-1 min-w-0">
                  <p className="px-title !text-[13px] text-[var(--px-text)]"><FormattedMessage id={`world.train.${trip}`} /></p>
                  <p className="text-[12px] text-[var(--px-muted)] leading-snug"><FormattedMessage id={`world.train.${trip}Note`} /></p>
                </div>
                <span className="px-title !text-[11px] shrink-0 text-[var(--px-gold)] whitespace-nowrap"><FormattedMessage id="world.trainSoon" /></span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 flex items-center gap-1.5 text-[12px] text-[var(--px-muted)]">
            <PixelIcon name="hourglass" size={1} />
            <FormattedMessage id="world.trainBuilding" />
          </p>
        </WorldCard>
      )}
      {!panel && !nearestFeature && playHere && playHere !== 'train' && !playing && !busRide && busTicket === null && (
        <WorldCard
          emoji={PLAYS[playHere]?.emoji ?? (PLAYS[playHere]?.icon ? undefined : '🎲')}
          icon={PLAYS[playHere]?.icon}
          title={<FormattedMessage id={`world.${playHere}Title`} />}
          subtitle={<FormattedMessage id={`world.${playHere}Blurb`} />}
        >
          <PixelButton tone="gold" block onClick={() => setPlaying(playHere)}><FormattedMessage id="world.play" /></PixelButton>
        </WorldCard>
      )}
      {!panel && playing === 'piano' && <StreetPiano onClose={() => setPlaying(null)} />}
      {!panel && playing === 'race' && <TypeRace onClose={() => setPlaying(null)} />}
      {!panel && playing === 'fish' && <Fishing onClose={() => setPlaying(null)} />}
      {!panel && playing === 'cailuong' && <CaiLuongStage onClose={() => setPlaying(null)} />}
      {!panel && playing === 'fortune' && <FortuneSticks onClose={() => setPlaying(null)} />}
      {!panel && playing === 'pool' && <PoolSolo onClose={() => setPlaying(null)} />}
      {!panel && playing === 'foosball' && <Foosball onClose={() => setPlaying(null)} />}
      {!panel && playing === 'ladder' && <QuocHocLadder onClose={() => setPlaying(null)} />}
      {!panel && playing === 'fireworks' && festive && (
        <FireworksLaunch onClose={() => setPlaying(null)} onLaunch={(word, big) => scene()?.launchFirework(word, big)} />
      )}

      {/* ── The food market: a vendor telling you about their dish ── */}
      {!panel && !nearestFeature && atVendor && atVendor !== vendorDone && !busRide && busTicket === null && (
        <VendorTalk key={atVendor} id={atVendor} onClose={() => setVendorDone(atVendor)} />
      )}

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
          {busStops.length > 1 && (
            <PixelButton tone="jade" block className="mt-2" onClick={() => setBusTicket({ index: -1, place: '', tour: true })}>
              <PixelIcon name="compass" size={2} /> <FormattedMessage id="world.tourName" />
            </PixelButton>
          )}
        </WorldCard>
      )}
      {!panel && busTicket !== null && (
        <BusTicket
          stop={busTicket.tour ? intl.formatMessage({ id: 'world.tourName' }) : intl.formatMessage({ id: `places.${busTicket.place}` })}
          onBoard={() => { if (busTicket.tour) scene()?.busTour(); else scene()?.busTo(busTicket.index); setBusTicket(null); }}
          onClose={() => setBusTicket(null)}
        />
      )}
      {!panel && busRide?.state === 'riding' && (
        <WorldCard
          emoji="🚌"
          title={<FormattedMessage id="world.busRiding" />}
          subtitle={<FormattedMessage id="world.busTo" values={{ place: intl.formatMessage({ id: `places.${busRide.place}` }) }} />}
        >
          <p className="text-[13px] text-[var(--px-muted)]"><FormattedMessage id="world.busHint" /></p>
          <PixelButton tone="paper" block className="mt-2" onClick={() => scene()?.busHopOff()}><FormattedMessage id="world.busHopOff" /></PixelButton>
        </WorldCard>
      )}
      {/* The sightseeing tour: the guide's word on each stop as the bus
          stands there (the place's own story, as its info card tells it). */}
      {!panel && busRide?.state === 'touring' && (
        <WorldCard
          icon="compass"
          title={<FormattedMessage id="world.tourName" />}
          subtitle={
            <FormattedMessage
              id={busRide.stopped ? 'world.tourAt' : busRide.at === busRide.of ? 'world.tourHome' : 'world.tourNext'}
              values={{ place: intl.formatMessage({ id: `places.${busRide.place}` }), n: busRide.at, total: busRide.of }}
            />
          }
        >
          {busRide.stopped ? (
            <div key={busRide.place} className="space-y-1.5 animate-fade-in">
              <p className="px-title !text-[15px] text-[var(--px-gold)] leading-tight">
                <FormattedMessage id={`places.${busRide.place}`} />
                <span className="ml-2 text-[12px] text-[var(--px-muted)] normal-case"><FormattedMessage id={`places.${busRide.place}En`} /></span>
              </p>
              <p className="text-[13px] leading-snug"><FormattedMessage id={`places.${busRide.place}About`} /></p>
              <p className="text-[12px] leading-snug text-[var(--px-muted)]">
                <span className="px-title !text-[11px] text-[var(--px-accent)] mr-1.5"><FormattedMessage id="places.didYouKnow" /></span>
                <FormattedMessage id={`places.${busRide.place}Fact`} />
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-[var(--px-muted)]"><FormattedMessage id="world.tourHint" /></p>
          )}
          <PixelButton tone="paper" block className="mt-2.5" onClick={() => scene()?.busHopOff()}><FormattedMessage id="world.busHopOff" /></PixelButton>
        </WorldCard>
      )}

      {placeToast && <PlaceInfo key={placeToast.n} id={placeToast.id} onClose={hidePlace} onExpand={() => { setMemorial(placeToast.id); setPlaceToast(null); }} />}
      {memorial && <PlaceMemorial id={memorial} onClose={closeMemorial} />}

      {/* ── Inside a skill: a bar across the top says where you are and holds
             the two ways out (Menu, Leave); the activity's HUD docks below it
             around the map. The layer swallows clicks on the map, so your
             character stays put until you leave. ── */}
      {panel && (
        <div className={`absolute inset-0 z-30 animate-fade-in ${roomId ? '' : 'bg-black/20'}`}>
          {/* The bar's frame runs up under the notch; its contents and the
              activity's HUD (laid out from the layer's top) start below it. */}
          <div className="px absolute top-0 inset-x-0 z-10 px-frame pt-[var(--sat)] pl-[calc(0.75rem+var(--sal))] pr-[calc(0.75rem+var(--sar))] h-[calc(3.25rem+var(--sat))] flex items-center gap-3">
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
            <PixelButton tone="red" onClick={panel.onClose} className="!py-2">
              <PixelIcon name="close" size={2} /> <FormattedMessage id="world.leaveBuilding" />
              <span className="hidden sm:inline opacity-60 !text-[11px]">Esc</span>
            </PixelButton>
          </div>
          <div className="absolute inset-x-0 bottom-0 top-[var(--sat)]">{panel.content}</div>
        </div>
      )}
    </div>
  );
}
