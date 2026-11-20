import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { useMatch } from '../../hooks/useMatch';
import { PeerLink, type PeerData, type PeerState } from '../../lib/peerLink';
import {
  BOMB_KINDS, BUG_KINDS, BUG_SIZE, DROP_KINDS, H, LIVES, MAX_LEVEL, SHIP_H, SHIP_W, SHOT_KINDS, W, WEAPONS,
  DRONE_S, OVERDRIVE_S, PERKS, PERK_MAX, applyDrop, draftFor, dronePos, droneShots, isDraftWave, overdrive, reach, slowMo, takePerk, bombBox, bossOf, bugBox, crash, fireDelay, hurtShip, isBoss, moveShip, moveShots, multiplier, newShip, newSwarm, noteHurt, nova, overlap,
  shipBox, shotBox, shotGone, shotsFor, stepSwarm, type PerkKind, type BombKind, type BossKind, type BugKind, type DropKind, type ShotKind, type Ship, type Shot, type Swarm, type Weapon,
} from '../../lib/bugSwarm';
import { STEP } from '../../lib/rooftop';
import { playBoing, playCoin, playHurt, playJump, playStomp, playWin } from '../../lib/sfx';
import type { MatchLink } from '../../lib/worldLive';
import { Kbd, PixelIcon, PixelLoader } from './pixel';
import { NetWait } from './NetWait';
import './bugSwarm.css';
import { SHIP_COLORS, SHOT_COLORS, drawBomb, drawBug, drawDrop, drawDrone, drawFx, drawOverdrive, drawShip, drawSlowTint, drawShot, drawSpace, engineEmber, explode, hitSpark, novaBlast, scorePop, stepFx, type BugPose, type Fx, WEAPON_COLOR } from './bugSwarmArt';

// Bug Swarm, on screen: a wave shooter for two in the world (or one,
// practising). The rules are lib/bugSwarm; the art is bugSwarmArt.
//
// Over the network (lib/peerLink — WebRTC straight between the browsers,
// paused while there's no such line): the host runs the swarm and sends it,
// with its own ship, many times a second; the guest sends its ship. Each
// draws the other's half a moment in the past, between two snapshots, so it
// moves smoothly. The guest's own shots are drawn the moment it fires (the
// host fires the real ones from the guest's ship), and whatever hits the
// guest's ship is the guest's to say.
//
// On a phone you drag anywhere: the ship moves with your finger's movement
// (not to where it is, so a thumb never covers it), and fires while you hold.

/** When a message arrived — on the same clock the frames are drawn by. */
const clock = () => performance.now();

const DELAY_DIRECT = 60;
const SEND_DIRECT = 2;

/** A ship as sent: x, y, gun level, lives, alive, invulnerable, shield, firing, weapon, novas, overdrive left, then its perks in PERKS order. */
type ShipWire = number[];
const shipWire = (s: Ship): ShipWire => [Math.round(s.x * 10) / 10, Math.round(s.y * 10) / 10, s.level, s.lives, s.alive ? 1 : 0, Math.round(s.inv * 10) / 10, Math.round(s.shield * 10) / 10, s.firing ? 1 : 0, WEAPONS.indexOf(s.weapon), s.novas, Math.round(s.odT * 10) / 10, ...PERKS.map((p) => s.perks[p])];
function shipFrom(w: unknown, into: Ship) {
  if (!Array.isArray(w) || w.length < 11 + PERKS.length || !w.every((v) => typeof v === 'number' && Number.isFinite(v))) return false;
  const [x, y, lv, li, al, iv, sh, f, wp, nv, od] = w as ShipWire;
  PERKS.forEach((p, i) => { into.perks[p] = Math.max(0, Math.min(PERK_MAX[p], w[11 + i] as number)); });
  Object.assign(into, { x, y, level: Math.max(1, Math.min(5, lv)), lives: Math.max(0, Math.min(9, li)), alive: !!al, inv: iv, shield: sh, firing: !!f, weapon: WEAPONS[wp] ?? 'blaster', novas: Math.max(0, Math.min(9, nv)), odT: Math.max(0, Math.min(OVERDRIVE_S, od)) });
  return true;
}

interface HostSnap {
  t: number;
  bugs: Map<number, { kind: BugKind; x: number; y: number; hp: number; max: number }>;
  shots: { x: number; y: number; vx: number; vy: number; kind: ShotKind }[];
  bombs: Map<number, { x: number; y: number; kind: BombKind }>;
  drops: Map<number, { kind: DropKind; x: number; y: number }>;
}
interface ShipSnap { t: number; x: number; y: number }

interface Game {
  round: number;
  swarm: Swarm;
  me: Ship;
  partner: Ship | null;
  partnerSnaps: ShipSnap[];
  partnerCool: number;
  hostSnaps: HostSnap[];
  /** Guest: shots drawn the moment they're fired. */
  localShots: Shot[];
  /** Guest: larvae and power-ups it has already met, hidden until the host's next word. */
  hidden: Set<number>;
  /** Bugs on screen last frame, to burst the ones that are gone. */
  seen: Map<number, BugSeen>;
  /** When the last frame was drawn, for how fast each bug moved since. */
  drawnAt: number;
  fx: Fx[];
  /** Host: rockets, kills and novas since the last message to the guest. */
  blastsOut: { x: number; y: number }[];
  killsOut: { x: number; y: number; pts: number; owner: number }[];
  novasOut: { x: number; y: number; owner: number }[];
  hurt: Map<number, number>;
  /** Screen shake left, from a hit or a boss going down. */
  shake: number;
  /** How far each ship leans, from how fast it's sliding sideways. */
  tilt: { me: number; partner: number; meX: number; partnerX: number };
  steps: number;
  t: number;
  over: boolean;
}

/** A bug as last drawn: where, and how it was moving and turned — smoothed,
 *  since the swarm steps at its own rate and a frame may land between two. */
interface BugSeen { x: number; y: number; kind: BugKind; hp: number; vx: number; vy: number; rot: number }

/** How long a hit squashes a bug (its white flash is the first 0.12 s of it). */
const SQUASH_S = 0.3;

/** How a bug is held this frame (see BugPose): facing the way it flies when
 *  it swoops, leaning and bobbing in the formation, squashing when hit. */
function poseFor(b: { id: number; kind: BugKind }, seen: BugSeen, t: number, hitAge: number | undefined): BugPose {
  const boss = isBoss(b.kind);
  const k = hitAge === undefined ? 0 : Math.max(0, 1 - hitAge / SQUASH_S);
  const wob = k * Math.cos((hitAge ?? 0) * 38);
  const breathe = Math.sin(t * 5 + b.id * 1.3) * (boss ? 0.015 : 0.04);
  return {
    rot: boss ? seen.rot * 0.3 : seen.rot,
    sx: 1 + breathe + wob * (boss ? 0.08 : 0.25),
    sy: 1 - breathe - wob * (boss ? 0.06 : 0.2),
    dy: Math.sin(t * 2.6 + b.id * 0.9) * (boss ? 1.5 : 1.1) + k * (boss ? 1 : 2.5),
  };
}

/** Where a bug should face: down the line it's flying when it's moving fast
 *  (a swoop, a dive, the climb back), just a lean into its sway when not. */
function headingFor(vx: number, vy: number) {
  const speed = Math.hypot(vx, vy);
  const lean = Math.max(-0.3, Math.min(0.3, -vx / 140));
  if (speed < 50) return lean;
  const face = Math.atan2(-vx, vy);
  const k = Math.min(1, (speed - 50) / 40);
  return lean + angleTo(lean, face) * k;
}
/** The signed shortest turn from one angle to another. */
const angleTo = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

interface Hud { wave: number; scores: [number, number]; combo: number; meter: number; overdrive: boolean; slow: boolean; me: { lives: number; level: number; weapon: Weapon; novas: number; perks: Record<PerkKind, number> }; partner: { lives: number; alive: boolean; weapon: Weapon } | null; banner: 'wave' | BossKind | null; boss: { kind: BossKind; frac: number } | null; over: boolean }

function newGame(index: number, round: number, solo: boolean): Game {
  return {
    round, swarm: newSwarm(), me: newShip(index), partner: solo ? null : newShip(1 - index), partnerSnaps: [], partnerCool: 0,
    hostSnaps: [], localShots: [], hidden: new Set(), seen: new Map(), drawnAt: 0, fx: [], blastsOut: [], killsOut: [], novasOut: [], hurt: new Map(), shake: 0, tilt: { me: 0, partner: 0, meX: 0, partnerX: 0 }, steps: 0, t: 0, over: false,
  };
}

const BUG_TINT: Record<BugKind, string> = { splitter: '#5ce0a8', mite: '#ff6ad5', firefly: '#d8ff5a', shell: '#9fb4d0', golden: '#ffd23f', beetle: '#b48aff', moth: '#ffe7a8', wasp: '#ffd23f', queen: '#ff3b5c', mantis: '#7dff8a', spider: '#ff2a5a', hornet: '#ffb030' };
const BOSS_HUE: Record<BossKind, string> = { queen: '#ff3b5c', mantis: '#40ff70', spider: '#ff2040', hornet: '#ff9020' };
const BEST = 'voca-swarm-best';
const readBest = () => { try { return Number(localStorage.getItem(BEST)) || 0; } catch { return 0; } };
/** The play area inside a canvas of this size: its scale and where it starts. */
const field = (cw: number, ch: number) => {
  const s = Math.min(cw / W, ch / H);
  return { s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2 };
};
/**
 * Outside the play area the sky dims away — the bugs come from there, you
 * can't go there — and the play area's sides glow faintly, so its edge reads
 * as a field rather than a box cut out of black.
 */
function drawEdges(c: CanvasRenderingContext2D, sky: { x: number; y: number; w: number; h: number }) {
  const fade = (x0: number, x1: number) => {
    const g = c.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, 'rgba(2,1,8,0)');
    g.addColorStop(0.35, 'rgba(2,1,8,0.45)');
    g.addColorStop(1, 'rgba(2,1,8,0.7)');
    c.fillStyle = g;
    c.fillRect(Math.min(x0, x1), sky.y, Math.abs(x1 - x0), sky.h);
  };
  if (sky.x < 0) { fade(0, sky.x); fade(W, sky.x + sky.w); }
  if (sky.y < 0) { c.fillStyle = 'rgba(2,1,8,0.55)'; c.fillRect(0, sky.y, W, -sky.y); c.fillRect(0, H, W, sky.h + sky.y - H); }
  if (sky.x >= -0.5) return;
  // The rails: brightest at the middle, gone at the ends.
  c.globalCompositeOperation = 'lighter';
  for (const [x, hue] of [[0, '160,112,255'], [W, '155,231,255']] as const) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(${hue},0)`); g.addColorStop(0.5, `rgba(${hue},0.55)`); g.addColorStop(1, `rgba(${hue},0)`);
    c.fillStyle = g;
    c.fillRect(x - 0.25, 0, 0.5, H);
    const halo = c.createLinearGradient(x - 6, 0, x + 6, 0);
    halo.addColorStop(0, `rgba(${hue},0)`); halo.addColorStop(0.5, `rgba(${hue},0.08)`); halo.addColorStop(1, `rgba(${hue},0)`);
    c.fillStyle = halo;
    c.fillRect(x - 6, 0, 12, H);
  }
  c.globalCompositeOperation = 'source-over';
}
const isTouch = () => typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches ?? false);

export function BugSwarm({ link, onClose }: { link: MatchLink | null; onClose: () => void }) {
  const solo = !link;
  const index = link && !link.host ? 1 : 0;
  const host = index === 0;
  const partnerName = link?.peer.name ?? '';
  const { start, left } = useMatch<{ v: number }>(
    link,
    () => Promise.resolve({ v: 1 }),
    (raw) => (raw && typeof raw === 'object' && (raw as { v?: unknown }).v === 1 ? { v: 1 } : null),
  );
  const started = solo || !!start;

  const game = useRef<Game>(newGame(index, 0, solo));
  const keys = useRef({ left: false, right: false, up: false, down: false, fire: false, nova: false, od: false, pick: 0 });
  /** The perks on offer, while a draft is open; and the wave it was for. */
  const [draft, setDraft] = useState<PerkKind[] | null>(null);
  const drafted = useRef(0);
  const draftRef = useRef<PerkKind[] | null>(null);
  /** Where the ship should be while a finger (or the mouse) is down. */
  const finger = useRef<{ x: number; y: number } | null>(null);
  const drag = useRef<{ fx: number; fy: number; sx: number; sy: number } | null>(null);
  const [best, setBest] = useState(readBest);
  const [touch] = useState(isTouch);
  const peer = useRef<PeerLink | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ w: W, h: H });
  const [net, setNet] = useState<PeerState>(solo ? 'direct' : 'connecting');
  /** How far the direct line's setup got, shown if it fails. */
  const [netDetail, setNetDetail] = useState('');
  // No direct line, no game: it pauses (both sides) until there is one — see NetWait.
  const playing = started && (solo || net === 'direct');
  const [hud, setHud] = useState<Hud>({ wave: 0, scores: [0, 0], combo: 1, meter: 0, overdrive: false, slow: false, me: { lives: LIVES, level: 1, weapon: 'blaster', novas: 1, perks: newShip(0).perks }, partner: solo ? null : { lives: LIVES, alive: true, weapon: 'blaster' }, banner: null, boss: null, over: false });

  // Snapshots are placed by when they were *sent*, on our clock: arrival
  // time lets a packet that queued, or a burst the relay held and let go
  // together, bunch up and jump. `offset` is their clock to ours — the
  // quickest trip seen, creeping up slowly so drift can't strand it.
  const sync = useRef<{ offset: number | null; last: number }>({ offset: null, last: -Infinity });
  /** When a snapshot stands, on our clock — or null if a newer one already came. */
  function placed(sent: unknown, now: number): number | null {
    if (typeof sent !== 'number' || !Number.isFinite(sent)) return now;
    const c = sync.current;
    // A clock far behind the last means a reloaded page: start over.
    if (sent < c.last - 5000) { c.offset = null; c.last = -Infinity; }
    // The fast channel doesn't keep order: an older state is no use.
    if (sent <= c.last) return null;
    c.last = sent;
    const trip = now - sent;
    c.offset = c.offset === null || trip < c.offset ? trip : c.offset + (trip - c.offset) * 0.01;
    return sent + c.offset;
  }

  function receive(d: PeerData) {
    const g = game.current;
    if (d.k === 'again' && typeof d.r === 'number' && d.r > g.round) { restart(d.r); return; }
    if (d.r !== g.round || !g.partner) return;
    const now = clock();
    if (d.k === 's') {
      const at = placed(d.ts, now);
      if (at === null) return;
      const before = g.partner.lives;
      if (!shipFrom(d.ship, g.partner)) return;
      if (host && g.partner.lives < before) noteHurt(g.swarm, 1);
      g.partnerSnaps.push({ t: at, x: g.partner.x, y: g.partner.y });
      if (g.partnerSnaps.length > 30) g.partnerSnaps.shift();
      if (!host) readSwarm(g, d, at);
    } else if (host && d.k === 'crash' && typeof d.id === 'number') {
      crash(g.swarm, d.id);
    } else if (host && d.k === 'nova' && typeof d.x === 'number' && typeof d.y === 'number') {
      nova(g.swarm, 1, d.x, d.y);
    } else if (host && d.k === 'od') {
      overdrive(g.swarm, 1);
    } else if (host && d.k === 'grab' && typeof d.id === 'number') {
      if (g.swarm.drops.find((x) => x.id === d.id)?.kind === 'time') slowMo(g.swarm);
      g.swarm.drops = g.swarm.drops.filter((x) => x.id !== d.id);
    }
  }

  /** Guest: the swarm as the host last sent it. */
  function readSwarm(g: Game, d: PeerData, now: number) {
    const nums = (v: unknown) => (Array.isArray(v) ? v.map((x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0)) : []);
    const b = nums(d.b), s = nums(d.s), m = nums(d.m), dr = nums(d.d);
    const snap: HostSnap = { t: now, bugs: new Map(), shots: [], bombs: new Map(), drops: new Map() };
    for (let i = 0; i + 5 < b.length; i += 6) snap.bugs.set(b[i], { kind: BUG_KINDS[b[i + 1]] ?? 'beetle', x: b[i + 2], y: b[i + 3], hp: b[i + 4], max: Math.max(1, b[i + 5]) });
    for (let i = 0; i + 4 < s.length; i += 5) snap.shots.push({ x: s[i], y: s[i + 1], vx: s[i + 2], vy: s[i + 3], kind: SHOT_KINDS[s[i + 4]] ?? 'bolt' });
    for (let i = 0; i + 3 < m.length; i += 4) snap.bombs.set(m[i], { x: m[i + 1], y: m[i + 2], kind: BOMB_KINDS[m[i + 3]] ?? 'larva' });
    // Rockets the host's game saw go off.
    const bl = nums(d.bl);
    for (let i = 0; i + 1 < bl.length; i += 2) explode(g.fx, bl[i], bl[i + 1], false, '#ff8a3a');
    for (let i = 0; i + 3 < dr.length; i += 4) snap.drops.set(dr[i], { kind: DROP_KINDS[dr[i + 1]] ?? 'gun', x: dr[i + 2], y: dr[i + 3] });
    g.hostSnaps.push(snap);
    if (g.hostSnaps.length > 20) g.hostSnaps.shift();
    if (typeof d.w === 'number') g.swarm.wave = d.w;
    const sc = nums(d.sc);
    if (sc.length === 2) g.swarm.scores = [sc[0], sc[1]];
    const cb = nums(d.cb);
    if (cb.length === 2) g.swarm.combo = [cb[0], cb[1]];
    const mt = nums(d.mt);
    // Our own meter we emptied ourselves the moment we used it; the host's word catches up.
    if (mt.length === 2) { g.swarm.meter = [mt[0], mt[1]]; if (g.me.odT > 0) g.swarm.meter[index] = 0; }
    if (typeof d.sl === 'number') g.swarm.slowT = d.sl;
    const kp = nums(d.kp);
    for (let i = 0; i + 3 < kp.length; i += 4) scorePop(g.fx, kp[i], kp[i + 1], kp[i + 2], kp[i + 2] >= 200 ? '#ffd23f' : SHIP_COLORS[kp[i + 3]] ?? '#fff');
    const nv = nums(d.nv);
    // Our own nova was shown the moment we set it off.
    for (let i = 0; i + 2 < nv.length; i += 3) if (nv[i + 2] !== index) novaBlast(g.fx, nv[i], nv[i + 1]);
  }

  function restart(round: number) {
    game.current = newGame(index, round, solo);
    // A new run drafts afresh.
    drafted.current = 0;
    draftRef.current = null;
    setDraft(null);
    setHud((h) => ({ ...h, over: false }));
  }
  const again = () => {
    const r = game.current.round + 1;
    peer.current?.sendSure({ k: 'again', r });
    restart(r);
  };

  // Keys, caught before the world gets them.
  useEffect(() => {
    const map = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': return 'left';
        case 'ArrowRight': case 'KeyD': return 'right';
        case 'ArrowUp': case 'KeyW': return 'up';
        case 'ArrowDown': case 'KeyS': return 'down';
        case 'Space': case 'KeyJ': case 'KeyK': case 'KeyZ': return 'fire';
        case 'KeyX': case 'KeyB': return 'nova';
        case 'KeyC': case 'ShiftLeft': case 'ShiftRight': return 'od';
        case 'Digit1': case 'Digit2': case 'Digit3': return 'pick';
        default: return null;
      }
    };
    const handle = (down: boolean) => (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      const k = map(e);
      if (!k) return;
      e.preventDefault();
      e.stopPropagation();
      // A nova goes off once per press, on the way down.
      if (k === 'nova' || k === 'od') { if (down && !e.repeat) keys.current[k] = true; return; }
      if (k === 'pick') { if (down) keys.current.pick = Number(e.code.slice(-1)); return; }
      keys.current[k] = down;
    };
    const kd = handle(true), ku = handle(false);
    const blur = () => { keys.current = { left: false, right: false, up: false, down: false, fire: false, nova: false, od: false, pick: 0 }; finger.current = null; };
    window.addEventListener('keydown', kd, true);
    window.addEventListener('keyup', ku, true);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', kd, true); window.removeEventListener('keyup', ku, true); window.removeEventListener('blur', blur); };
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const scale = Math.min(width / W, height / H);
      setFit({ w: Math.floor(W * scale), h: Math.floor(H * scale) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const delay = () => DELAY_DIRECT;

  /** The swarm as this player sees it: the host's own, or the host's a moment ago. */
  function shown(now: number) {
    const g = game.current;
    const s = g.swarm;
    if (host) {
      return {
        bugs: s.bugs.map((b) => ({ id: b.id, kind: b.kind, x: b.x, y: b.y, hp: b.hp, max: b.maxHp })),
        shots: s.shots.map((x) => ({ x: x.x, y: x.y, vx: x.vx, vy: x.vy, kind: x.kind, owner: x.owner })),
        bombs: s.bombs.map((b) => ({ id: b.id, x: b.x, y: b.y, kind: b.kind })),
        drops: s.drops.map((d) => ({ id: d.id, kind: d.kind, x: d.x, y: d.y })),
      };
    }
    const snaps = g.hostSnaps;
    if (!snaps.length) return { bugs: [], shots: [], bombs: [], drops: [] };
    const at = now - delay();
    let a = snaps[snaps.length - 1], b = a;
    for (let i = snaps.length - 1; i > 0; i--) if (snaps[i - 1].t <= at) { a = snaps[i - 1]; b = snaps[i]; break; }
    if (at < snaps[0].t) a = b = snaps[0];
    const k = b.t === a.t ? 1 : Math.max(0, Math.min(1, (at - a.t) / (b.t - a.t)));
    const lerp = <T extends { x: number; y: number }>(p: T | undefined, q: T) => (p ? { ...q, x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k } : q);
    const ahead = Math.max(0, at - a.t) / 1000;
    return {
      bugs: [...b.bugs].map(([id, q]) => ({ id, ...lerp(a.bugs.get(id), q) })),
      shots: a.shots.map((x) => ({ x: x.x + x.vx * ahead, y: x.y + x.vy * ahead, vx: x.vx, vy: x.vy, kind: x.kind, owner: 0 })),
      bombs: [...b.bombs].filter(([id]) => !g.hidden.has(id)).map(([id, q]) => ({ id, ...lerp(a.bombs.get(id), q) })),
      drops: [...b.drops].filter(([id]) => !g.hidden.has(id)).map(([id, q]) => ({ id, ...lerp(a.drops.get(id), q) })),
    };
  }

  function pick(p: PerkKind | undefined) {
    if (!p) return;
    takePerk(game.current.me, p);
    draftRef.current = null;
    setDraft(null);
    playCoin();
  }

  /** Sets off my overdrive, if the meter's full. */
  function goOverdrive() {
    const g = game.current;
    if (g.over || !g.me.alive || g.swarm.meter[index] < 1) return;
    if (host) overdrive(g.swarm, index);
    else { g.swarm.meter[index] = 0; peer.current?.sendSure({ k: 'od', r: g.round }); }
    g.me.odT = OVERDRIVE_S;
    playJump();
    g.shake = Math.max(g.shake, 0.4);
  }

  /** Sets off one of my novas, if I have one. */
  function setOffNova() {
    const g = game.current;
    const me = g.me;
    if (g.over || !me.alive || me.novas <= 0) return;
    me.novas -= 1;
    playBoing();
    const x = me.x + SHIP_W / 2, y = me.y + SHIP_H / 2;
    if (host) { nova(g.swarm, index, x, y); return; }
    // The guest asks the host, and shows it now: the blast, and every bullet it can see gone.
    peer.current?.sendSure({ k: 'nova', r: g.round, x: Math.round(x), y: Math.round(y) });
    novaBlast(g.fx, x, y);
    g.shake = Math.max(g.shake, 0.8);
    for (const snap of g.hostSnaps) for (const id of snap.bombs.keys()) g.hidden.add(id);
  }

  function step(now: number) {
    const g = game.current;
    if (g.over) return;
    g.t += STEP;
    g.steps += 1;
    const me = g.me;
    const k = keys.current;
    const toward = finger.current;
    if (k.nova) { k.nova = false; setOffNova(); }
    if (k.od) { k.od = false; goOverdrive(); }
    if (k.pick) { const n = k.pick; k.pick = 0; if (draftRef.current) pick(draftRef.current[n - 1]); }
    moveShip(me, STEP, { dx: (k.right ? 1 : 0) - (k.left ? 1 : 0), dy: (k.down ? 1 : 0) - (k.up ? 1 : 0) }, toward);
    me.firing = me.alive && (k.fire || !!finger.current);
    if (me.firing && me.cool <= 0) {
      me.cool = fireDelay(me);
      if (host) g.swarm.shots.push(...shotsFor(me, index));
      else g.localShots.push(...shotsFor(me, index));
    }
    // Drones fire on their own, whenever there's anything to shoot.
    if (me.alive && me.perks.drone && me.droneCool <= 0) {
      me.droneCool = DRONE_S;
      if (host) g.swarm.shots.push(...droneShots(me, index, g.t)); else g.localShots.push(...droneShots(me, index, g.t));
    }

    if (host) {
      // The guest's shots, fired from where it says its ship is.
      const p = g.partner;
      if (p) {
        g.partnerCool = Math.max(0, g.partnerCool - STEP);
        if (p.alive && p.firing && g.partnerCool <= 0) { g.partnerCool = fireDelay(p); g.swarm.shots.push(...shotsFor(p, 1)); }
        p.droneCool = Math.max(0, p.droneCool - STEP);
        if (p.alive && p.perks.drone && p.droneCool <= 0) { p.droneCool = DRONE_S; g.swarm.shots.push(...droneShots(p, 1, g.t)); }
      }
      stepSwarm(g.swarm, p ? [me, p] : [me], STEP);
      for (const x of g.swarm.blasts) { explode(g.fx, x.x, x.y, false, '#ff8a3a'); if (g.partner) g.blastsOut.push(x); }
      for (const x of g.swarm.kills) { scorePop(g.fx, x.x, x.y, x.pts, x.pts >= 200 ? '#ffd23f' : SHIP_COLORS[x.owner]); if (g.partner) g.killsOut.push(x); }
      for (const x of g.swarm.novas) { novaBlast(g.fx, x.x, x.y); g.shake = Math.max(g.shake, 0.8); if (g.partner) g.novasOut.push(x); }
      g.swarm.blasts = []; g.swarm.kills = []; g.swarm.novas = [];
    } else {
      moveShots(g.localShots, shown(now).bugs, STEP);
    }

    // What touches my ship is mine to say.
    const view = shown(now);
    if (!host) {
      // A beam goes on through; anything else stops at the first bug it meets.
      g.localShots = g.localShots.filter((s) => !shotGone(s) && (s.kind === 'beam' || !view.bugs.some((b) => overlap(shotBox(s), bugBox(b)))));
    }
    if (me.alive) {
      const sb = shipBox(me);
      for (const b of view.bombs) {
        if (!overlap(sb, bombBox(b))) continue;
        if (host) g.swarm.bombs = g.swarm.bombs.filter((x) => x.id !== b.id); else g.hidden.add(b.id);
        if (hurtShip(me)) { playHurt(); explode(g.fx, me.x + SHIP_W / 2, me.y + SHIP_H / 2, false, SHIP_COLORS[index]); g.shake = 0.6; if (host) noteHurt(g.swarm, 0); }
        break;
      }
      for (const b of view.bugs) {
        if (isBoss(b.kind) || !overlap(sb, bugBox(b))) continue;
        if (hurtShip(me)) {
          playHurt();
          explode(g.fx, me.x + SHIP_W / 2, me.y + SHIP_H / 2, false, SHIP_COLORS[index]);
          g.shake = 0.6;
          if (host) noteHurt(g.swarm, 0);
          if (host) crash(g.swarm, b.id); else peer.current?.sendSure({ k: 'crash', r: g.round, id: b.id });
        }
        break;
      }
      for (const d of view.drops) {
        if (Math.hypot(d.x - (me.x + SHIP_W / 2), d.y - (me.y + SHIP_H / 2)) > reach(me) + 6) continue;
        applyDrop(me, d.kind);
        playCoin();
        if (host && d.kind === 'time') slowMo(g.swarm);
        if (host) g.swarm.drops = g.swarm.drops.filter((x) => x.id !== d.id);
        else { g.hidden.add(d.id); peer.current?.sendSure({ k: 'grab', r: g.round, id: d.id }); }
      }
    }

    if (peer.current && g.partner && g.steps % SEND_DIRECT === 0) {
      const msg: PeerData = { k: 's', r: g.round, ts: Math.round(clock() * 10) / 10, ship: shipWire(me) };
      if (host) {
        const s = g.swarm;
        const r1 = (v: number) => Math.round(v * 10) / 10;
        msg.w = s.wave;
        msg.sc = s.scores;
        msg.b = s.bugs.flatMap((b) => [b.id, BUG_KINDS.indexOf(b.kind), r1(b.x), r1(b.y), r1(b.hp), b.maxHp]);
        msg.s = s.shots.filter((x) => x.owner === 0).flatMap((x) => [r1(x.x), r1(x.y), Math.round(x.vx), Math.round(x.vy), SHOT_KINDS.indexOf(x.kind)]);
        msg.m = s.bombs.flatMap((b) => [b.id, r1(b.x), r1(b.y), BOMB_KINDS.indexOf(b.kind)]);
        msg.bl = g.blastsOut.flatMap((x) => [r1(x.x), r1(x.y)]);
        msg.kp = g.killsOut.flatMap((x) => [r1(x.x), r1(x.y), x.pts, x.owner]);
        msg.nv = g.novasOut.flatMap((x) => [r1(x.x), r1(x.y), x.owner]);
        msg.cb = s.combo;
        msg.mt = s.meter.map((v) => Math.round(v * 100) / 100);
        msg.sl = Math.round(s.slowT * 10) / 10;
        g.blastsOut = []; g.killsOut = []; g.novasOut = [];
        msg.d = s.drops.flatMap((d) => [d.id, DROP_KINDS.indexOf(d.kind), r1(d.x), r1(d.y)]);
      }
      peer.current.sendFast(msg);
    }

    const skyClear = host ? !g.swarm.bugs.length : !!g.hostSnaps.length && g.hostSnaps[g.hostSnaps.length - 1].bugs.size === 0;
    if (me.alive && skyClear && isDraftWave(g.swarm.wave) && drafted.current !== g.swarm.wave) {
      drafted.current = g.swarm.wave;
      const offer = draftFor(me.perks);
      if (offer.length) { draftRef.current = offer; setDraft(offer); playJump(); }
    }
    // The next wave is in and nothing was chosen: the first on offer.
    if (draftRef.current && g.swarm.wave > drafted.current) pick(draftRef.current[0]);

    if (!me.alive && (!g.partner || !g.partner.alive)) {
      g.over = true;
      const mine = g.swarm.scores[index];
      if (mine > readBest()) { try { localStorage.setItem(BEST, String(mine)); } catch { /* private mode */ } setBest(mine); }
      publishHud();
    }

    g.fx = stepFx(g.fx, STEP);
    g.shake = Math.max(0, g.shake - STEP * 1.8);
    for (const [id, t] of g.hurt) if (g.t - t > SQUASH_S) g.hurt.delete(id);
  }

  function draw(now: number) {
    const cv = canvas.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    // Drawn at the screen's own resolution (the art is made to be sharp), the
    // canvas filling the screen and the play area centred in it; the sky goes
    // on past its edges, so a tall phone or a wide monitor is all space.
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cw = cv.clientWidth, ch = cv.clientHeight;
    const pw = Math.max(1, Math.round(cw * dpr)), ph = Math.max(1, Math.round(ch * dpr));
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
    const { s: sc, ox, oy } = field(cw, ch);
    c.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);
    c.imageSmoothingEnabled = true;
    const sky = { x: -ox / sc, y: -oy / sc, w: cw / sc, h: ch / sc };
    const g = game.current;
    const view = shown(now);

    // Bugs gone since last frame explode; bugs that lost health flash and spark.
    const dt = g.drawnAt ? Math.min(0.1, Math.max(0.001, (now - g.drawnAt) / 1000)) : 0;
    g.drawnAt = now;
    const ease = 1 - Math.exp(-dt * 12), turn = 1 - Math.exp(-dt * 9);
    const seen: Game['seen'] = new Map();
    for (const b of view.bugs) {
      const before = g.seen.get(b.id);
      const vx = before && dt ? before.vx + ((b.x - before.x) / dt - before.vx) * ease : 0;
      const vy = before && dt ? before.vy + ((b.y - before.y) / dt - before.vy) * ease : 0;
      const was = before?.rot ?? 0;
      seen.set(b.id, { x: b.x, y: b.y, kind: b.kind, hp: b.hp, vx, vy, rot: was + angleTo(was, headingFor(vx, vy)) * turn });
      if (before && b.hp < before.hp) {
        g.hurt.set(b.id, g.t);
        hitSpark(g.fx, b.x + BUG_SIZE[b.kind].w / 2, b.y + BUG_SIZE[b.kind].h, '#ffffff');
      }
    }
    for (const [id, b] of g.seen) {
      if (seen.has(id)) continue;
      if (b.y > -10 && b.y < H && b.x > -14 && b.x < W) {
        explode(g.fx, b.x + BUG_SIZE[b.kind].w / 2, b.y + BUG_SIZE[b.kind].h / 2, isBoss(b.kind), BUG_TINT[b.kind]);
        playStomp();
        if (isBoss(b.kind)) { playWin(); g.shake = 1.2; }
      }
    }
    g.seen = seen;

    c.save();
    if (g.shake > 0) c.translate((Math.random() - 0.5) * g.shake * 6, (Math.random() - 0.5) * g.shake * 6);
    drawSpace(c, g.t, sky.x, sky.y, sky.w, sky.h);
    for (const d of view.drops) drawDrop(c, d.kind, d.x, d.y, g.t, d.id);
    for (const b of view.bugs) {
      const hit = g.hurt.get(b.id);
      const age = hit === undefined ? undefined : g.t - hit;
      drawBug(c, b.kind, b.x, b.y, g.t, b.id, age === undefined ? 0 : Math.max(0, 1 - age / 0.12), poseFor(b, seen.get(b.id)!, g.t, age));
    }
    for (const s of view.shots) drawShot(c, s.kind, s.x, s.y, s.vx, s.vy, SHOT_COLORS[s.owner] ?? SHOT_COLORS[0]);
    for (const s of g.localShots) drawShot(c, s.kind, s.x, s.y, s.vx, s.vy, SHOT_COLORS[index]);
    for (const b of view.bombs) drawBomb(c, b.x, b.y, g.t, b.id, b.kind);

    // Ships lean into a slide.
    const lean = (x: number, was: number, cur: number) => cur + (Math.max(-1, Math.min(1, (x - was) / 2)) - cur) * 0.2;
    if (g.partner?.alive) {
      const at = now - delay();
      const snaps = g.partnerSnaps;
      let pos = snaps[snaps.length - 1] ?? g.partner;
      for (let i = snaps.length - 1; i > 0; i--) {
        const a = snaps[i - 1], b = snaps[i];
        if (a.t <= at && at <= b.t) { const k = (at - a.t) / Math.max(1, b.t - a.t); pos = { t: at, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; break; }
      }
      g.tilt.partner = lean(pos.x, g.tilt.partnerX, g.tilt.partner);
      g.tilt.partnerX = pos.x;
      if (Math.random() < 0.6) engineEmber(g.fx, pos.x + SHIP_W / 2, pos.y + SHIP_H + 4);
      if (g.partner.odT > 0) drawOverdrive(c, pos.x + SHIP_W / 2, pos.y + SHIP_H / 2, g.t);
      drawShip(c, pos.x, pos.y, SHIP_COLORS[1 - index], { t: g.t, inv: g.partner.odT > 0 ? 0 : g.partner.inv, shield: g.partner.shield, tilt: g.tilt.partner, name: partnerName.slice(0, 12) });
      for (let i = 0; i < g.partner.perks.drone; i++) { const d = dronePos(pos, i, g.t); drawDrone(c, d.x, d.y, SHIP_COLORS[1 - index], g.t); }
    }
    if (g.me.alive) {
      g.tilt.me = lean(g.me.x, g.tilt.meX, g.tilt.me);
      g.tilt.meX = g.me.x;
      if (Math.random() < 0.6) engineEmber(g.fx, g.me.x + SHIP_W / 2, g.me.y + SHIP_H + 4);
      if (g.me.odT > 0) drawOverdrive(c, g.me.x + SHIP_W / 2, g.me.y + SHIP_H / 2, g.t);
      drawShip(c, g.me.x, g.me.y, SHIP_COLORS[index], { t: g.t, inv: g.me.odT > 0 ? 0 : g.me.inv, shield: g.me.shield, tilt: g.tilt.me });
      for (let i = 0; i < g.me.perks.drone; i++) { const d = dronePos(g.me, i, g.t); drawDrone(c, d.x, d.y, SHIP_COLORS[index], g.t); }
    }
    drawFx(c, g.fx);
    if (g.swarm.slowT > 0) drawSlowTint(c, sky.x, sky.y, sky.w, sky.h, g.swarm.slowT);
    c.restore();
    drawEdges(c, sky);
  }

  const bannerUntil = useRef<{ wave: number; until: number }>({ wave: 0, until: 0 });
  function publishHud() {
    const g = game.current;
    const s = g.swarm;
    const b = bannerUntil.current;
    if (s.wave !== b.wave) { b.wave = s.wave; b.until = g.t + 2.2; }
    const banner = s.wave > 0 && g.t < b.until ? (bossOf(s.wave) ?? 'wave') : null;
    const bb = shown(clock()).bugs.find((x) => isBoss(x.kind));
    const next: Hud = {
      wave: s.wave, scores: [...s.scores] as [number, number], combo: multiplier(s.combo[index]),
      meter: Math.round(s.meter[index] * 20) / 20, overdrive: g.me.odT > 0, slow: s.slowT > 0,
      me: { lives: g.me.lives, level: g.me.level, weapon: g.me.weapon, novas: g.me.novas, perks: { ...g.me.perks } },
      partner: g.partner ? { lives: g.partner.lives, alive: g.partner.alive, weapon: g.partner.weapon } : null, banner,
      boss: bb ? { kind: bb.kind as BossKind, frac: Math.round(Math.max(0, bb.hp / bb.max) * 200) / 200 } : null, over: g.over,
    };
    setHud((h) => (JSON.stringify(h) === JSON.stringify(next) ? h : next));
  }

  // The direct line, opened as soon as the match is — while the game is still being set up.
  useEffect(() => {
    if (!link) return;
    const p = new PeerLink(link);
    peer.current = p;
    const offState = p.onState((st) => { setNet(st); setNetDetail(p.describe()); });
    const offData = p.listen((d) => receive(d));
    return () => { offState(); offData(); p.close(); peer.current = null; };
  }, [link]); // eslint-disable-line react-hooks/exhaustive-deps

  // The loop: fixed steps for the rules, a frame drawn whenever the screen asks.
  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now(), acc = 0, hudAt = 0;
    const frame = (now: number) => {
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      while (acc >= STEP) { step(now); acc -= STEP; }
      draw(now);
      if (now - hudAt > 150) { hudAt = now; publishHud(); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  // At the end (or once they've left): R or Enter plays again, Esc leaves.
  useEffect(() => {
    if (!hud.over && !left) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'escape') onClose();
      else if (!left && (k === 'r' || k === 'enter')) again();
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [hud.over, left]); // eslint-disable-line react-hooks/exhaustive-deps

  const toGame = (e: PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    const { s: sc, ox, oy } = field(r.width, r.height);
    return { x: (e.clientX - r.left - ox) / sc, y: (e.clientY - r.top - oy) / sc };
  };
  // A drag moves the ship by as much as the finger moved (a little more, so
  // a short thumb covers the screen), from wherever the drag began.
  const SENSE = 1.4;
  const pointer = {
    onPointerDown: (e: PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      const p = toGame(e), me = game.current.me;
      drag.current = { fx: p.x, fy: p.y, sx: me.x, sy: me.y };
      finger.current = { x: me.x, y: me.y };
    },
    onPointerMove: (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const p = toGame(e);
      finger.current = { x: d.sx + (p.x - d.fx) * SENSE, y: d.sy + (p.y - d.fy) * SENSE };
    },
    onPointerUp: () => { finger.current = null; drag.current = null; },
    onPointerCancel: () => { finger.current = null; drag.current = null; },
  };

  const overlay = (children: ReactNode, accent = '#a070ff') => (
    <div className="bs-scrim absolute inset-0 z-10 flex items-center justify-center p-4">
      <div className="bs-glass bs-edge bs-modal" style={{ '--accent': accent } as CSSProperties}>{children}</div>
    </div>
  );
  const mine = hud.scores[index], theirs = hud.scores[1 - index];
  const comboColor = ['', '', '#7dffc4', '#ffd23f', '#ff9f1c', '#ff4d6d'][hud.combo] ?? '#ff4d6d';
  const bannerHue = hud.banner && hud.banner !== 'wave' ? BOSS_HUE[hud.banner] : '#a070ff';
  const odFill = hud.overdrive ? 1 : hud.meter;
  const newBest = mine >= best && mine > 0;

  return (
    <div className="px bs absolute inset-0 z-40 flex flex-col select-none bg-[#04020c]" style={{ touchAction: 'none' }} onKeyDown={(e) => e.stopPropagation()}>
      <div className="bs-header relative z-10 shrink-0 flex items-center justify-between gap-3 pt-[calc(0.45rem+var(--sat,0px))] pb-[0.45rem] pl-[calc(0.75rem+var(--sal,0px))] pr-[calc(0.75rem+var(--sar,0px))]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="bs-badge shrink-0"><PixelIcon name="bug" size={2} /></span>
          <p className="bs-display bs-gradient-text text-[17px] tracking-[0.16em] truncate" style={{ '--accent': '#ffd23f' } as CSSProperties}>
            <FormattedMessage id="world.swarmTitle" />
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!solo && (
            <span className={`bs-glass bs-pill-btn !py-1 ${net === 'direct' ? '!text-[#7dffc4]' : ''}`}>
              <span className={`bs-live-dot ${net === 'direct' ? 'on' : ''}`} />
              <FormattedMessage id={`world.rooftopNet.${net}`} />
            </span>
          )}
          <button onClick={onClose} className="bs-glass bs-pill-btn bs-display !text-[12px] !tracking-[0.14em]">
            <FormattedMessage id="world.focusLeave" />
          </button>
        </div>
      </div>

      <div ref={box} className="relative flex-1 min-h-0 flex items-center justify-center pb-[var(--sab,0px)]">
        <canvas ref={canvas} {...pointer} className="absolute inset-0 block w-full h-full" style={{ touchAction: 'none' }} />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* The scoreboard: across the top of the screen, as wide as the play area. */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 p-2 sm:p-2.5 grid grid-cols-[1fr_auto_1fr] items-start gap-2" style={{ width: Math.max(fit.w, 300) }}>
            <div className="flex flex-col items-start gap-1.5">
              <Panel name={<FormattedMessage id="world.duelYou" />} color={SHIP_COLORS[index]} score={mine} lives={hud.me.lives} level={hud.me.level} weapon={hud.me.weapon} meter={odFill} />
              {PERKS.some((p) => hud.me.perks[p] > 0) && (
                <div className="flex flex-wrap gap-1.5 max-w-[130px]">
                  {PERKS.filter((p) => hud.me.perks[p] > 0).map((p) => (
                    <span key={p} className="bs-perk">
                      <PerkIcon perk={p} className="w-3.5 h-3.5" />
                      {hud.me.perks[p] > 1 && <b>{hud.me.perks[p]}</b>}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-1.5 pt-1">
              {hud.wave > 0 && (
                <span className="bs-glass bs-wave bs-display whitespace-nowrap">
                  <FormattedMessage id="world.swarmWave" values={{ n: <b key="n" className="bs-num text-[14px]">{String(hud.wave).padStart(2, '0')}</b> }} />
                </span>
              )}
              {hud.combo > 1 && (
                <span key={hud.combo} className="bs-combo bs-display bs-gradient-text" style={{ '--accent': comboColor } as CSSProperties}>
                  <FormattedMessage id="world.swarmCombo" values={{ n: hud.combo }} />
                </span>
              )}
            </div>
            <div className="flex flex-col items-end">
              {hud.partner
                ? <Panel name={partnerName} color={SHIP_COLORS[1 - index]} score={theirs} lives={hud.partner.lives} level={null} weapon={hud.partner.weapon} right dim={!hud.partner.alive} />
                : <Panel name={<FormattedMessage id="world.swarmBest" />} color="#ffd23f" score={Math.max(best, mine)} lives={null} level={null} right />}
            </div>
          </div>

          {/* A boss's health, under the scoreboard. */}
          {hud.boss && !hud.over && (
            <div className="bs-boss absolute top-[5.6rem] sm:top-[6.2rem] left-1/2 -translate-x-1/2" style={{ animation: 'bs-fade-up 0.4s ease-out both' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="bs-eyebrow" style={{ color: BOSS_HUE[hud.boss.kind] }}><FormattedMessage id={`world.swarmBoss.${hud.boss.kind}`} /></span>
                <span className="bs-num text-[11px] text-white/70">{Math.ceil(hud.boss.frac * 100)}%</span>
              </div>
              <div className="bs-boss-bar"><i style={{ width: `${hud.boss.frac * 100}%` }} /></div>
            </div>
          )}

          {started && hud.banner && !hud.over && (
            <div key={`${hud.banner}${hud.wave}`} className="bs-banner absolute inset-x-0 top-[30%] flex flex-col items-center text-center px-4" style={{ '--accent': bannerHue } as CSSProperties}>
              <div className="flex items-center justify-center gap-3 w-full mb-2">
                <span className="bs-streak" />
                <span className="bs-eyebrow text-white/80">
                  {hud.banner === 'wave' ? <FormattedMessage id="world.swarmTitle" /> : <FormattedMessage id="world.swarmWave" values={{ n: hud.wave }} />}
                </span>
                <span className="bs-streak r" />
              </div>
              <p className="bs-banner-title bs-display bs-gradient-text">
                <FormattedMessage id={hud.banner === 'wave' ? 'world.swarmWave' : `world.swarmBoss.${hud.banner}`} values={{ n: hud.wave }} />
              </p>
            </div>
          )}
          {started && hud.wave <= 1 && !hud.over && (
            <p className="bs-glass bs-hint absolute bottom-[calc(6.5rem+var(--sab,0px))] left-1/2 -translate-x-1/2 text-center" style={{ width: Math.min(fit.w - 24, 380) }}>
              <FormattedMessage id={touch ? 'world.swarmHintTouch' : 'world.swarmHint'} />
            </p>
          )}
          {!hud.over && !hud.me.lives && hud.partner?.alive && (
            <p className="bs-glass bs-hint absolute top-[5.6rem] left-1/2 -translate-x-1/2 whitespace-nowrap">
              <FormattedMessage id="world.swarmOut" values={{ name: partnerName }} />
            </p>
          )}
        </div>

        {/* The draft: three perks to choose from, every third wave. */}
        {draft && !hud.over && !left && (
          <div className="absolute inset-x-0 top-[30%] flex flex-col items-center px-3">
            <div className="flex items-center justify-center gap-3 w-full mb-3" style={{ '--accent': '#ffd23f' } as CSSProperties}>
              <span className="bs-streak" />
              <p className="bs-display bs-gradient-text text-[20px] tracking-[0.18em]" style={{ filter: 'drop-shadow(0 0 12px #ff9f1c)' }}><FormattedMessage id="world.swarmDraft" /></p>
              <span className="bs-streak r" />
            </div>
            <div className="flex gap-2.5 w-full justify-center" style={{ maxWidth: Math.max(320, fit.w) }}>
              {draft.map((p, i) => (
                <button key={p} onClick={() => pick(p)} className="bs-draft-card bs-glass bs-edge" style={{ animationDelay: `${i * 0.07}s` }}>
                  <span className="bs-key">{i + 1}</span>
                  <span className="bs-draft-icon"><PerkIcon perk={p} className="w-6 h-6" /></span>
                  <p className="bs-display text-[15px] text-white leading-tight tracking-[0.06em]"><FormattedMessage id={`world.swarmPerk.${p}`} /></p>
                  <p className="text-[11px] text-white/65 leading-snug mt-1 min-h-[2.4em]"><FormattedMessage id={`world.swarmPerkHow.${p}`} /></p>
                  <div className="flex justify-center gap-1 mt-2.5">
                    {Array.from({ length: PERK_MAX[p] }, (_, k) => (
                      <span key={k} className={`bs-pip ${k < hud.me.perks[p] ? 'on' : ''}`} style={k === hud.me.perks[p] ? { background: 'rgba(255,210,63,0.45)', boxShadow: '0 0 0 1px #ffd23f' } : undefined} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Overdrive: the ring fills with kills; full, it's a button. Nova: a count. */}
        {started && !hud.over && !left && hud.me.lives > 0 && (
          <>
            <button
              onClick={goOverdrive}
              disabled={hud.meter < 1 || hud.overdrive}
              aria-label="overdrive"
              className={`bs-action right-[calc(5.5rem+var(--sar,0px))] bottom-[calc(0.85rem+var(--sab,0px))] ${hud.meter >= 1 && !hud.overdrive ? 'ready' : ''}`}
              style={{ touchAction: 'none', '--accent': '#ffd23f', '--p': odFill } as CSSProperties}
            >
              <span className="ring" /><span className="disc" />
              <span className="face">
                <svg viewBox="0 0 20 20" className="w-6 h-6"><path d="M11.5 1.5 4 11h5l-1.5 7.5L16 8.5h-5.2Z" fill="#fff6c8" stroke="#ffb030" strokeWidth="0.8" strokeLinejoin="round" /></svg>
                <span className="bs-eyebrow !text-[9px] !tracking-[0.12em] text-white/80">{hud.overdrive ? <FormattedMessage id="world.swarmOverdriveOn" /> : <Kbd>C</Kbd>}</span>
              </span>
            </button>
            <button
              onClick={setOffNova}
              disabled={hud.me.novas <= 0}
              aria-label="nova"
              className={`bs-action right-[calc(0.85rem+var(--sar,0px))] bottom-[calc(0.85rem+var(--sab,0px))] ${hud.me.novas > 0 ? '' : 'dim'}`}
              style={{ touchAction: 'none', '--accent': '#9be7ff', '--p': hud.me.novas > 0 ? 1 : 0 } as CSSProperties}
            >
              <span className="ring" /><span className="disc" />
              <span className="face">
                <svg viewBox="0 0 20 20" className="w-6 h-6" fill="none" stroke="#e6faff" strokeWidth="1.6" strokeLinecap="round">
                  {Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2, r = i % 2 ? 5 : 8.5; return <line key={i} x1={10} y1={10} x2={10 + Math.cos(a) * r} y2={10 + Math.sin(a) * r} />; })}
                  <circle cx="10" cy="10" r="2.2" fill="#e6faff" />
                </svg>
                <span className="bs-eyebrow !text-[9px] text-white/80"><Kbd>X</Kbd></span>
              </span>
              <span className="bs-count bs-num">{hud.me.novas}</span>
            </button>
          </>
        )}

        {!started && !left && overlay(<PixelLoader label={<FormattedMessage id="world.duelWaiting" values={{ name: partnerName }} />} />)}
        {started && !playing && !left && overlay(<NetWait state={net} name={partnerName} onLeave={onClose} detail={netDetail} />)}
        {left && overlay(
          <>
            <p className="text-[15px] text-white/90 mb-4"><FormattedMessage id="world.duelLeft" values={{ name: partnerName }} /></p>
            <button className="bs-btn primary w-full" onClick={onClose}><FormattedMessage id="world.duelDone" /><Kbd>Esc</Kbd></button>
          </>,
        )}
        {hud.over && !left && overlay(
          <>
            <p className="bs-eyebrow text-white/55 mb-1"><FormattedMessage id="world.swarmTitle" /></p>
            <p className="bs-display bs-gradient-text text-[26px] leading-tight tracking-[0.08em] mb-3" style={{ '--accent': '#ff6a8a' } as CSSProperties}>
              <FormattedMessage id="world.swarmOver" values={{ n: hud.wave }} />
            </p>
            <p className="bs-num text-[52px] leading-none text-white mb-3" style={{ textShadow: `0 0 24px ${SHIP_COLORS[index]}` }}>{mine.toLocaleString()}</p>
            {solo && newBest && <p className="mb-3"><span className="bs-new-best bs-display"><FormattedMessage id="world.swarmNewBest" /></span></p>}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bs-stat">
                <p className="bs-eyebrow text-white/50"><FormattedMessage id="world.swarmWave" values={{ n: '' }} /></p>
                <p className="bs-num text-[20px] text-white">{hud.wave}</p>
              </div>
              {hud.partner ? (
                <div className="bs-stat">
                  <p className="bs-eyebrow truncate" style={{ color: SHIP_COLORS[1 - index] }}>{partnerName}</p>
                  <p className="bs-num text-[20px] text-white">{theirs.toLocaleString()}</p>
                </div>
              ) : (
                <div className="bs-stat">
                  <p className="bs-eyebrow text-[#ffd23f]/80"><FormattedMessage id="world.swarmBest" /></p>
                  <p className="bs-num text-[20px] text-white">{best.toLocaleString()}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="bs-btn primary" onClick={again}><FormattedMessage id="world.rooftopAgain" /><Kbd>R</Kbd></button>
              <button className="bs-btn ghost" onClick={onClose}><FormattedMessage id="world.duelDone" /><Kbd>Esc</Kbd></button>
            </div>
          </>,
          '#ff4d6d',
        )}
      </div>
    </div>
  );
}

/** One player's corner of the scoreboard: name, score, lives, gun — and, for me, the overdrive meter. */
function Panel({ name, color, score, lives, level, weapon, meter, right = false, dim = false }: {
  name: ReactNode; color: string; score: number; lives: number | null; level: number | null; weapon?: Weapon; meter?: number; right?: boolean; dim?: boolean;
}) {
  return (
    <div
      className={`bs-glass bs-edge bs-card transition-opacity ${right ? 'text-right' : ''} ${dim ? 'opacity-45' : ''}`}
      style={{ '--accent': color } as CSSProperties}
    >
      <div className={`flex items-center gap-1.5 ${right ? 'justify-end' : ''}`}>
        {!right && <span className="bs-avatar" />}
        <p className="bs-eyebrow truncate max-w-[110px]" style={{ color }}>{name}</p>
        {right && <span className="bs-avatar" />}
      </div>
      <p className="bs-score bs-num mt-1">{score.toLocaleString()}</p>
      {(lives !== null || level !== null || weapon) && (
        <div className={`mt-1.5 flex items-center gap-2 ${right ? 'justify-end' : ''}`}>
          {lives !== null && (
            <span className="flex gap-[3px]">
              {Array.from({ length: Math.max(0, lives) }, (_, i) => (
                <svg key={i} viewBox="0 0 10 9" className="w-[11px] h-[11px]" style={{ filter: 'drop-shadow(0 0 3px #ff4d6d)' }}><path d="M5 8.5 1 4.6A2.3 2.3 0 0 1 5 1.8a2.3 2.3 0 0 1 4 2.8Z" fill="#ff4d6d" /></svg>
              ))}
            </span>
          )}
          {weapon && (
            <span className="bs-chip" style={{ '--chip': WEAPON_COLOR[weapon] } as CSSProperties}><FormattedMessage id={`world.swarmWeapon.${weapon}`} /></span>
          )}
        </div>
      )}
      {level !== null && (
        <div className="bs-pips mt-1.5">
          {Array.from({ length: MAX_LEVEL }, (_, i) => <span key={i} className={`bs-pip ${i < level ? 'on' : ''}`} />)}
        </div>
      )}
      {meter !== undefined && (
        <div className={`bs-meter ${meter >= 1 ? 'full' : ''}`}><i style={{ width: `${meter * 100}%` }} /></div>
      )}
    </div>
  );
}

/** A perk's mark: a small drawing of what it does. */
function PerkIcon({ perk, className = '' }: { perk: PerkKind; className?: string }) {
  const stroke = { fill: 'none', stroke: '#ffd23f', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const shape: Record<PerkKind, ReactNode> = {
    rapid: <><path d="M4 12 10 6l6 6" {...stroke} /><path d="M4 17l6-6 6 6" {...stroke} /></>,
    power: <path d="M11.5 1.5 4 11h5l-1.5 7.5L16 8.5h-5.2Z" fill="#ffd23f" />,
    drone: <><circle cx="10" cy="10" r="3" fill="#ffd23f" /><ellipse cx="10" cy="10" rx="8" ry="3.5" {...stroke} strokeWidth={1.2} /></>,
    magnet: <path d="M5 3v7a5 5 0 0 0 10 0V3M5 6h3M12 6h3" {...stroke} />,
    armor: <path d="M10 2 3.5 4.5V9c0 4.2 2.8 7.3 6.5 9 3.7-1.7 6.5-4.8 6.5-9V4.5Z" {...stroke} />,
    novas: <>{Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2, r = i % 2 ? 4.5 : 8; return <line key={i} x1="10" y1="10" x2={10 + Math.cos(a) * r} y2={10 + Math.sin(a) * r} {...stroke} strokeWidth={1.4} />; })}</>,
    pierce: <><path d="M2 10h16M14 6l4 4-4 4" {...stroke} /><path d="M8 4v12" {...stroke} strokeWidth={1.2} strokeDasharray="2 2" /></>,
    charge: <><rect x="3" y="6" width="12" height="8" rx="1.5" {...stroke} /><path d="M17 9v2" {...stroke} /><path d="M5.5 8.5h3v3h-3z" fill="#ffd23f" /><path d="M9.5 8.5h3v3h-3z" fill="#ffd23f" /></>,
  };
  return <svg viewBox="0 0 20 20" className={className}>{shape[perk]}</svg>;
}
