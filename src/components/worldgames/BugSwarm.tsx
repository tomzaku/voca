import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { useMatch } from '../../hooks/useMatch';
import { PeerLink, type PeerData, type PeerState } from '../../lib/peerLink';
import {
  BOMB_KINDS, BUG_KINDS, BUG_SIZE, DROP_KINDS, H, LIVES, MAX_LEVEL, SHIP_H, SHIP_W, SHOT_KINDS, W, WEAPONS,
  MAX_NOVAS, applyDrop, bombBox, bossOf, bugBox, crash, dropBox, fireDelay, hurtShip, isBoss, moveShip, moveShots, multiplier, newShip, newSwarm, noteHurt, nova, overlap,
  shipBox, shotBox, shotGone, shotsFor, stepSwarm, type BombKind, type BossKind, type BugKind, type DropKind, type ShotKind, type Ship, type Shot, type Swarm, type Weapon,
} from '../../lib/bugSwarm';
import { STEP } from '../../lib/rooftop';
import { playBoing, playCoin, playHurt, playStomp, playWin } from '../../lib/sfx';
import type { MatchLink } from '../../lib/worldLive';
import { Kbd, PixelButton, PixelIcon, PixelLoader } from './pixel';
import { SHIP_COLORS, SHOT_COLORS, drawBomb, drawBug, drawDrop, drawBossBar, drawFx, drawShip, drawShot, drawSpace, engineEmber, explode, hitSpark, novaBlast, scorePop, stepFx, type Fx, WEAPON_COLOR } from './bugSwarmArt';

// Bug Swarm, on screen: a wave shooter for two in the world (or one,
// practising). The rules are lib/bugSwarm; the art is bugSwarmArt.
//
// Over the network (lib/peerLink — WebRTC straight between the browsers, the
// match link when that can't connect): the host runs the swarm and sends it,
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
const DELAY_SERVER = 280;
const SEND_DIRECT = 2;
const SEND_SERVER = 12;

/** A ship as sent: x, y, gun level, lives, alive, invulnerable, shield, firing, weapon, novas. */
type ShipWire = [number, number, number, number, number, number, number, number, number, number];
const shipWire = (s: Ship): ShipWire => [Math.round(s.x * 10) / 10, Math.round(s.y * 10) / 10, s.level, s.lives, s.alive ? 1 : 0, Math.round(s.inv * 10) / 10, Math.round(s.shield * 10) / 10, s.firing ? 1 : 0, WEAPONS.indexOf(s.weapon), s.novas];
function shipFrom(w: unknown, into: Ship) {
  if (!Array.isArray(w) || w.length < 10 || !w.every((v) => typeof v === 'number' && Number.isFinite(v))) return false;
  const [x, y, lv, li, al, iv, sh, f, wp, nv] = w as ShipWire;
  Object.assign(into, { x, y, level: Math.max(1, Math.min(5, lv)), lives: Math.max(0, Math.min(9, li)), alive: !!al, inv: iv, shield: sh, firing: !!f, weapon: WEAPONS[wp] ?? 'blaster', novas: Math.max(0, Math.min(MAX_NOVAS, nv)) });
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
  seen: Map<number, { x: number; y: number; kind: BugKind; hp: number }>;
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

interface Hud { wave: number; scores: [number, number]; combo: number; me: { lives: number; level: number; weapon: Weapon; novas: number }; partner: { lives: number; alive: boolean; weapon: Weapon } | null; banner: 'wave' | BossKind | null; over: boolean }

function newGame(index: number, round: number, solo: boolean): Game {
  return {
    round, swarm: newSwarm(), me: newShip(index), partner: solo ? null : newShip(1 - index), partnerSnaps: [], partnerCool: 0,
    hostSnaps: [], localShots: [], hidden: new Set(), seen: new Map(), fx: [], blastsOut: [], killsOut: [], novasOut: [], hurt: new Map(), shake: 0, tilt: { me: 0, partner: 0, meX: 0, partnerX: 0 }, steps: 0, t: 0, over: false,
  };
}

const BUG_TINT: Record<BugKind, string> = { firefly: '#d8ff5a', shell: '#9fb4d0', golden: '#ffd23f', beetle: '#b48aff', moth: '#ffe7a8', wasp: '#ffd23f', queen: '#ff3b5c', mantis: '#7dff8a', spider: '#ff2a5a', hornet: '#ffb030' };
const BOSS_HUE: Record<BossKind, string> = { queen: '#ff3b5c', mantis: '#40ff70', spider: '#ff2040', hornet: '#ff9020' };
const BEST = 'voca-swarm-best';
const readBest = () => { try { return Number(localStorage.getItem(BEST)) || 0; } catch { return 0; } };
/** The play area inside a canvas of this size: its scale and where it starts. */
const field = (cw: number, ch: number) => {
  const s = Math.min(cw / W, ch / H);
  return { s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2 };
};
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
  const keys = useRef({ left: false, right: false, up: false, down: false, fire: false, nova: false });
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
  const [hud, setHud] = useState<Hud>({ wave: 0, scores: [0, 0], combo: 1, me: { lives: LIVES, level: 1, weapon: 'blaster', novas: 1 }, partner: solo ? null : { lives: LIVES, alive: true, weapon: 'blaster' }, banner: null, over: false });

  function receive(d: PeerData) {
    const g = game.current;
    if (d.k === 'again' && typeof d.r === 'number' && d.r > g.round) { restart(d.r); return; }
    if (d.r !== g.round || !g.partner) return;
    const now = clock();
    if (d.k === 's') {
      const before = g.partner.lives;
      if (!shipFrom(d.ship, g.partner)) return;
      if (host && g.partner.lives < before) noteHurt(g.swarm, 1);
      g.partnerSnaps.push({ t: now, x: g.partner.x, y: g.partner.y });
      if (g.partnerSnaps.length > 30) g.partnerSnaps.shift();
      if (!host) readSwarm(g, d, now);
    } else if (host && d.k === 'crash' && typeof d.id === 'number') {
      crash(g.swarm, d.id);
    } else if (host && d.k === 'nova' && typeof d.x === 'number' && typeof d.y === 'number') {
      nova(g.swarm, 1, d.x, d.y);
    } else if (host && d.k === 'grab' && typeof d.id === 'number') {
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
    const kp = nums(d.kp);
    for (let i = 0; i + 3 < kp.length; i += 4) scorePop(g.fx, kp[i], kp[i + 1], kp[i + 2], kp[i + 2] >= 200 ? '#ffd23f' : SHIP_COLORS[kp[i + 3]] ?? '#fff');
    const nv = nums(d.nv);
    // Our own nova was shown the moment we set it off.
    for (let i = 0; i + 2 < nv.length; i += 3) if (nv[i + 2] !== index) novaBlast(g.fx, nv[i], nv[i + 1]);
  }

  function restart(round: number) {
    game.current = newGame(index, round, solo);
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
      if (k === 'nova') { if (down && !e.repeat) keys.current.nova = true; return; }
      keys.current[k] = down;
    };
    const kd = handle(true), ku = handle(false);
    const blur = () => { keys.current = { left: false, right: false, up: false, down: false, fire: false, nova: false }; finger.current = null; };
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

  const delay = () => (peer.current?.direct ? DELAY_DIRECT : DELAY_SERVER);

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
    moveShip(me, STEP, { dx: (k.right ? 1 : 0) - (k.left ? 1 : 0), dy: (k.down ? 1 : 0) - (k.up ? 1 : 0) }, toward);
    me.firing = me.alive && (k.fire || !!finger.current);
    if (me.firing && me.cool <= 0) {
      me.cool = fireDelay(me);
      if (host) g.swarm.shots.push(...shotsFor(me, index));
      else g.localShots.push(...shotsFor(me, index));
    }

    if (host) {
      // The guest's shots, fired from where it says its ship is.
      const p = g.partner;
      if (p) {
        g.partnerCool = Math.max(0, g.partnerCool - STEP);
        if (p.alive && p.firing && g.partnerCool <= 0) { g.partnerCool = fireDelay(p); g.swarm.shots.push(...shotsFor(p, 1)); }
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
        if (!overlap(sb, dropBox(d))) continue;
        applyDrop(me, d.kind);
        playCoin();
        if (host) g.swarm.drops = g.swarm.drops.filter((x) => x.id !== d.id);
        else { g.hidden.add(d.id); peer.current?.sendSure({ k: 'grab', r: g.round, id: d.id }); }
      }
    }

    if (peer.current && g.partner && g.steps % (peer.current.direct ? SEND_DIRECT : SEND_SERVER) === 0) {
      const msg: PeerData = { k: 's', r: g.round, ship: shipWire(me) };
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
        g.blastsOut = []; g.killsOut = []; g.novasOut = [];
        msg.d = s.drops.flatMap((d) => [d.id, DROP_KINDS.indexOf(d.kind), r1(d.x), r1(d.y)]);
      }
      peer.current.sendFast(msg);
    }

    if (!me.alive && (!g.partner || !g.partner.alive)) {
      g.over = true;
      const mine = g.swarm.scores[index];
      if (mine > readBest()) { try { localStorage.setItem(BEST, String(mine)); } catch { /* private mode */ } setBest(mine); }
      publishHud();
    }

    g.fx = stepFx(g.fx, STEP);
    g.shake = Math.max(0, g.shake - STEP * 1.8);
    for (const [id, t] of g.hurt) if (g.t - t > 0.12) g.hurt.delete(id);
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
    const seen: Game['seen'] = new Map();
    for (const b of view.bugs) {
      const before = g.seen.get(b.id);
      seen.set(b.id, { x: b.x, y: b.y, kind: b.kind, hp: b.hp });
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
    for (const d of view.drops) drawDrop(c, d.kind, d.x, d.y, g.t);
    for (const b of view.bugs) {
      const hit = g.hurt.get(b.id);
      drawBug(c, b.kind, b.x, b.y, g.t, b.id, hit === undefined ? 0 : 1 - (g.t - hit) / 0.12);
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
      drawShip(c, pos.x, pos.y, SHIP_COLORS[1 - index], { t: g.t, inv: g.partner.inv, shield: g.partner.shield, tilt: g.tilt.partner, name: partnerName.slice(0, 12) });
    }
    if (g.me.alive) {
      g.tilt.me = lean(g.me.x, g.tilt.meX, g.tilt.me);
      g.tilt.meX = g.me.x;
      if (Math.random() < 0.6) engineEmber(g.fx, g.me.x + SHIP_W / 2, g.me.y + SHIP_H + 4);
      drawShip(c, g.me.x, g.me.y, SHIP_COLORS[index], { t: g.t, inv: g.me.inv, shield: g.me.shield, tilt: g.tilt.me });
    }
    drawFx(c, g.fx);
    c.restore();
    // Outside the play area, a little darker: the bugs come from there, you can't go there.
    c.fillStyle = 'rgba(0,0,0,0.35)';
    if (sky.x < 0) { c.fillRect(sky.x, sky.y, -sky.x, sky.h); c.fillRect(W, sky.y, sky.w + sky.x - W, sky.h); }
    if (sky.y < 0) { c.fillRect(0, sky.y, W, -sky.y); c.fillRect(0, H, W, sky.h + sky.y - H); }
    const boss = view.bugs.find((b) => isBoss(b.kind));
    if (boss) drawBossBar(c, boss.hp / boss.max, g.t);
  }

  const bannerUntil = useRef<{ wave: number; until: number }>({ wave: 0, until: 0 });
  function publishHud() {
    const g = game.current;
    const s = g.swarm;
    const b = bannerUntil.current;
    if (s.wave !== b.wave) { b.wave = s.wave; b.until = g.t + 2.2; }
    const banner = s.wave > 0 && g.t < b.until ? (bossOf(s.wave) ?? 'wave') : null;
    const next: Hud = {
      wave: s.wave, scores: [...s.scores] as [number, number], combo: multiplier(s.combo[index]),
      me: { lives: g.me.lives, level: g.me.level, weapon: g.me.weapon, novas: g.me.novas },
      partner: g.partner ? { lives: g.partner.lives, alive: g.partner.alive, weapon: g.partner.weapon } : null, banner, over: g.over,
    };
    setHud((h) => (JSON.stringify(h) === JSON.stringify(next) ? h : next));
  }

  // The direct line, opened as soon as the match is — while the game is still being set up.
  useEffect(() => {
    if (!link) return;
    const p = new PeerLink(link);
    peer.current = p;
    const offState = p.onState(setNet);
    const offData = p.listen((d) => receive(d));
    return () => { offState(); offData(); p.close(); peer.current = null; };
  }, [link]); // eslint-disable-line react-hooks/exhaustive-deps

  // The loop: fixed steps for the rules, a frame drawn whenever the screen asks.
  useEffect(() => {
    if (!started) return;
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
  }, [started]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const overlay = (children: ReactNode) => (
    <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4">
      <div className="px-notch px-frame p-4 w-full max-w-[320px] text-center px-in-up">{children}</div>
    </div>
  );
  const mine = hud.scores[index], theirs = hud.scores[1 - index];

  return (
    <div className="px absolute inset-0 z-40 flex flex-col select-none bg-[#04020c]" style={{ touchAction: 'none' }} onKeyDown={(e) => e.stopPropagation()}>
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 pt-[calc(0.4rem+var(--sat,0px))] pb-1 pl-[calc(0.75rem+var(--sal,0px))] pr-[calc(0.75rem+var(--sar,0px))]">
        <p className="px-title !text-[14px] text-[var(--px-gold)] flex items-center gap-2 min-w-0">
          <PixelIcon name="bug" size={2} /> <span className="truncate"><FormattedMessage id="world.swarmTitle" /></span>
        </p>
        {!solo && (
          <span className={`text-[11px] ${net === 'direct' ? 'text-[var(--px-jade)]' : 'text-[var(--px-muted)]'}`}>
            <FormattedMessage id={`world.rooftopNet.${net}`} />
          </span>
        )}
        <button onClick={onClose} className="px-title !text-[12px] text-[var(--px-muted)] hover:text-[var(--px-text)] shrink-0 py-1">
          <FormattedMessage id="world.focusLeave" />
        </button>
      </div>

      <div ref={box} className="relative flex-1 min-h-0 flex items-center justify-center pb-[var(--sab,0px)]">
        <canvas ref={canvas} {...pointer} className="absolute inset-0 block w-full h-full" style={{ touchAction: 'none' }} />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* The scoreboard: across the top of the screen, as wide as the play area. */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 p-1.5 sm:p-2 flex items-start justify-between gap-1.5" style={{ width: fit.w }}>
            <Panel name={<FormattedMessage id="world.duelYou" />} color={SHIP_COLORS[index]} score={mine} lives={hud.me.lives} level={hud.me.level} weapon={hud.me.weapon} />
            <div className="flex flex-col items-center gap-1">
              {hud.wave > 0 && (
                <span className="mt-1 px-2 py-0.5 rounded-full bg-black/45 border border-white/10 px-title !text-[10px] text-white/85 whitespace-nowrap">
                  <FormattedMessage id="world.swarmWave" values={{ n: hud.wave }} />
                </span>
              )}
              {hud.combo > 1 && (
                <span key={hud.combo} className="px-title !text-[15px] px-in-up" style={{ color: ['', '', '#7dffc4', '#ffd23f', '#ff9f1c', '#ff4d6d'][hud.combo], textShadow: '0 0 10px currentColor' }}>
                  <FormattedMessage id="world.swarmCombo" values={{ n: hud.combo }} />
                </span>
              )}
            </div>
            {hud.partner
              ? <Panel name={partnerName} color={SHIP_COLORS[1 - index]} score={theirs} lives={hud.partner.lives} level={null} weapon={hud.partner.weapon} right dim={!hud.partner.alive} />
              : <Panel name={<FormattedMessage id="world.swarmBest" />} color="#ffd23f" score={Math.max(best, mine)} lives={null} level={null} right />}
          </div>

          {started && hud.banner && !hud.over && (
            <div key={`${hud.banner}${hud.wave}`} className="absolute inset-x-0 top-[32%] text-center pointer-events-none px-in-up">
              {hud.banner !== 'wave' && (
                <p className="px-title !text-[12px] text-white/80 mb-1"><FormattedMessage id="world.swarmWave" values={{ n: hud.wave }} /></p>
              )}
              <p className="px-title !text-[26px] sm:!text-[30px] text-white" style={{ textShadow: `0 0 12px ${hud.banner === 'wave' ? '#a070ff' : BOSS_HUE[hud.banner]}, 0 0 28px ${hud.banner === 'wave' ? '#6040ff' : BOSS_HUE[hud.banner]}` }}>
                <FormattedMessage id={hud.banner === 'wave' ? 'world.swarmWave' : `world.swarmBoss.${hud.banner}`} values={{ n: hud.wave }} />
              </p>
            </div>
          )}
          {started && hud.wave <= 1 && !hud.over && (
            <p className="absolute top-[4.5rem] left-1/2 -translate-x-1/2 text-center text-[11px] px-2 py-1 rounded bg-black/55 text-white/85" style={{ width: Math.min(fit.w - 16, 360) }}>
              <FormattedMessage id={touch ? 'world.swarmHintTouch' : 'world.swarmHint'} />
            </p>
          )}
          {!hud.over && !hud.me.lives && hud.partner?.alive && (
            <p className="absolute top-16 left-1/2 -translate-x-1/2 text-[12px] px-2 py-1 rounded bg-black/60 pointer-events-none whitespace-nowrap">
              <FormattedMessage id="world.swarmOut" values={{ name: partnerName }} />
            </p>
          )}
        </div>
        {started && !hud.over && !left && hud.me.lives > 0 && (
            <button
              onClick={setOffNova}
              disabled={hud.me.novas <= 0}
              aria-label="nova"
              className="absolute right-[calc(0.75rem+var(--sar,0px))] bottom-[calc(0.75rem+var(--sab,0px))] w-16 h-16 rounded-full border-2 border-[#9be7ff]/70 bg-[#9be7ff]/15 active:bg-[#9be7ff]/40 disabled:opacity-35 flex flex-col items-center justify-center text-white shadow-[0_0_18px_rgba(155,231,255,0.35)]"
              style={{ touchAction: 'none' }}
            >
              <svg viewBox="0 0 20 20" className="w-6 h-6" fill="none" stroke="#e6faff" strokeWidth="1.6" strokeLinecap="round">
                {Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2, r = i % 2 ? 5 : 8.5; return <line key={i} x1={10} y1={10} x2={10 + Math.cos(a) * r} y2={10 + Math.sin(a) * r} />; })}
                <circle cx="10" cy="10" r="2.2" fill="#e6faff" />
              </svg>
              <span className="text-[11px] font-bold leading-none mt-0.5">{hud.me.novas}<Kbd>X</Kbd></span>
            </button>
        )}
        {!started && !left && overlay(<PixelLoader label={<FormattedMessage id="world.duelWaiting" values={{ name: partnerName }} />} />)}
        {left && overlay(
          <>
            <p className="text-[14px] mb-3"><FormattedMessage id="world.duelLeft" values={{ name: partnerName }} /></p>
            <PixelButton tone="jade" block onClick={onClose}><FormattedMessage id="world.duelDone" /> <Kbd>Esc</Kbd></PixelButton>
          </>,
        )}
        {hud.over && !left && overlay(
          <>
            <p className="px-title !text-[20px] mb-1 text-[var(--px-gold)]"><FormattedMessage id="world.swarmOver" values={{ n: hud.wave }} /></p>
            <p className="text-[13px] mb-1">
              <FormattedMessage id="world.swarmScore" values={{ n: mine }} />
              {hud.partner && <> · {partnerName}: {theirs}</>}
            </p>
            {solo && (
              <p className="text-[12px] mb-3 text-[var(--px-gold)]">
                <FormattedMessage id={mine >= best && mine > 0 ? 'world.swarmNewBest' : 'world.swarmBestIs'} values={{ n: best }} />
              </p>
            )}
            <div className={`grid grid-cols-2 gap-2 ${solo ? '' : 'mt-2'}`}>
              <PixelButton tone="gold" onClick={again}><FormattedMessage id="world.rooftopAgain" /> <Kbd>R</Kbd></PixelButton>
              <PixelButton tone="paper" onClick={onClose}><FormattedMessage id="world.duelDone" /> <Kbd>Esc</Kbd></PixelButton>
            </div>
          </>,
        )}
      </div>
    </div>
  );
}

/** One player's corner of the scoreboard: name, score, lives, gun. */
function Panel({ name, color, score, lives, level, weapon, right = false, dim = false }: {
  name: ReactNode; color: string; score: number; lives: number | null; level: number | null; weapon?: Weapon; right?: boolean; dim?: boolean;
}) {
  return (
    <div
      className={`rounded-md bg-black/45 backdrop-blur-sm border border-white/10 px-2 py-1 min-w-[78px] ${right ? 'text-right' : ''} ${dim ? 'opacity-45' : ''}`}
      style={{ boxShadow: `inset ${right ? -3 : 3}px 0 0 ${color}` }}
    >
      <p className="text-[10px] uppercase tracking-wider truncate max-w-[110px]" style={{ color }}>{name}</p>
      <p className="text-[17px] sm:text-[19px] leading-tight font-bold tabular-nums text-white" style={{ textShadow: `0 0 8px ${color}` }}>{score.toLocaleString()}</p>
      {(lives !== null || level !== null || weapon) && (
        <div className={`mt-0.5 flex items-center gap-1.5 ${right ? 'justify-end' : ''}`}>
          {lives !== null && (
            <span className="flex gap-[2px]">
              {Array.from({ length: Math.max(0, lives) }, (_, i) => (
                <svg key={i} viewBox="0 0 10 9" className="w-2.5 h-2.5"><path d="M5 8.5 1 4.6A2.3 2.3 0 0 1 5 1.8a2.3 2.3 0 0 1 4 2.8Z" fill="#ff4d6d" /></svg>
              ))}
            </span>
          )}
          {weapon && (
            <span className="text-[9px] uppercase tracking-wide" style={{ color: WEAPON_COLOR[weapon] }}><FormattedMessage id={`world.swarmWeapon.${weapon}`} /></span>
          )}
          {level !== null && (
            <span className="flex gap-[2px] items-end">
              {Array.from({ length: MAX_LEVEL }, (_, i) => (
                <span key={i} className="w-[3px] rounded-[1px]" style={{ height: 4 + i * 1.5, background: i < level ? '#ffd23f' : 'rgba(255,255,255,0.18)' }} />
              ))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
