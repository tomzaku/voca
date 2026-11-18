import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { useMatch } from '../../hooks/useMatch';
import { PeerLink, type PeerData, type PeerState } from '../../lib/peerLink';
import {
  BUG_KINDS, BUG_SIZE, DROP_KINDS, H, LIVES, SHIP_H, SHIP_W, W,
  applyDrop, bombBox, bugBox, crash, dropBox, fireDelay, hurtShip, isQueenWave, moveShip, newShip, newSwarm, overlap,
  shipBox, shotsFor, stepSwarm, type BugKind, type DropKind, type Ship, type Shot, type Swarm,
} from '../../lib/bugSwarm';
import { STEP } from '../../lib/rooftop';
import { playCoin, playHurt, playStomp, playWin } from '../../lib/sfx';
import type { MatchLink } from '../../lib/worldLive';
import { Kbd, PixelButton, PixelIcon, PixelLoader } from './pixel';
import { SHIP_COLORS, SHOT_COLORS, drawBackground, drawBomb, drawBug, drawDrop, drawHealth, drawShip, drawShot } from './bugSwarmDraw';

// Bug Swarm, on screen: a wave shooter for two in the world (or one,
// practising). The rules are lib/bugSwarm; the art is bugSwarmDraw.
//
// Over the network (lib/peerLink — WebRTC straight between the browsers, the
// match link when that can't connect): the host runs the swarm and sends it,
// with its own ship, many times a second; the guest sends its ship. Each
// draws the other's half a moment in the past, between two snapshots, so it
// moves smoothly. The guest's own shots are drawn the moment it fires (the
// host fires the real ones from the guest's ship), and whatever hits the
// guest's ship is the guest's to say.

const ICONS = {
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
};

/** When a message arrived — on the same clock the frames are drawn by. */
const clock = () => performance.now();

const DELAY_DIRECT = 60;
const DELAY_SERVER = 280;
const SEND_DIRECT = 2;
const SEND_SERVER = 12;

/** A ship as sent: x, y, gun level, lives, alive, invulnerable, shield, firing. */
type ShipWire = [number, number, number, number, number, number, number, number];
const shipWire = (s: Ship): ShipWire => [Math.round(s.x * 10) / 10, Math.round(s.y * 10) / 10, s.level, s.lives, s.alive ? 1 : 0, Math.round(s.inv * 10) / 10, Math.round(s.shield * 10) / 10, s.firing ? 1 : 0];
function shipFrom(w: unknown, into: Ship) {
  if (!Array.isArray(w) || w.length < 8 || !w.every((v) => typeof v === 'number' && Number.isFinite(v))) return false;
  const [x, y, lv, li, al, iv, sh, f] = w as ShipWire;
  Object.assign(into, { x, y, level: Math.max(1, Math.min(5, lv)), lives: Math.max(0, Math.min(9, li)), alive: !!al, inv: iv, shield: sh, firing: !!f });
  return true;
}

interface HostSnap {
  t: number;
  bugs: Map<number, { kind: BugKind; x: number; y: number; hp: number; max: number }>;
  shots: { x: number; y: number; vx: number }[];
  bombs: Map<number, { x: number; y: number }>;
  drops: Map<number, { kind: DropKind; x: number; y: number }>;
}
interface ShipSnap { t: number; x: number; y: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }

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
  particles: Particle[];
  hurt: Map<number, number>;
  steps: number;
  t: number;
  over: boolean;
}

interface Hud { wave: number; scores: [number, number]; me: { lives: number; level: number }; partner: { lives: number; alive: boolean } | null; banner: string | null; over: boolean }

function newGame(index: number, round: number, solo: boolean): Game {
  return {
    round, swarm: newSwarm(), me: newShip(index), partner: solo ? null : newShip(1 - index), partnerSnaps: [], partnerCool: 0,
    hostSnaps: [], localShots: [], hidden: new Set(), seen: new Map(), particles: [], hurt: new Map(), steps: 0, t: 0, over: false,
  };
}

function burst(g: Game, x: number, y: number, big: boolean) {
  const n = big ? 60 : 12;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = (big ? 40 : 25) + Math.random() * (big ? 120 : 70);
    g.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * (big ? 0.8 : 0.3), color: ['#ffd23f', '#ff9f1c', '#ff5a3c', '#ffffff'][i % 4] });
  }
}

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
  const keys = useRef({ left: false, right: false, up: false, down: false, fire: false });
  const finger = useRef<{ x: number; y: number } | null>(null);
  const peer = useRef<PeerLink | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ w: W, h: H });
  const [net, setNet] = useState<PeerState>(solo ? 'direct' : 'connecting');
  const [hud, setHud] = useState<Hud>({ wave: 0, scores: [0, 0], me: { lives: LIVES, level: 1 }, partner: solo ? null : { lives: LIVES, alive: true }, banner: null, over: false });

  function receive(d: PeerData) {
    const g = game.current;
    if (d.k === 'again' && typeof d.r === 'number' && d.r > g.round) { restart(d.r); return; }
    if (d.r !== g.round || !g.partner) return;
    const now = clock();
    if (d.k === 's') {
      if (!shipFrom(d.ship, g.partner)) return;
      g.partnerSnaps.push({ t: now, x: g.partner.x, y: g.partner.y });
      if (g.partnerSnaps.length > 30) g.partnerSnaps.shift();
      if (!host) readSwarm(g, d, now);
    } else if (host && d.k === 'crash' && typeof d.id === 'number') {
      crash(g.swarm, d.id);
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
    for (let i = 0; i + 2 < s.length; i += 3) snap.shots.push({ x: s[i], y: s[i + 1], vx: s[i + 2] });
    for (let i = 0; i + 2 < m.length; i += 3) snap.bombs.set(m[i], { x: m[i + 1], y: m[i + 2] });
    for (let i = 0; i + 3 < dr.length; i += 4) snap.drops.set(dr[i], { kind: DROP_KINDS[dr[i + 1]] ?? 'gun', x: dr[i + 2], y: dr[i + 3] });
    g.hostSnaps.push(snap);
    if (g.hostSnaps.length > 20) g.hostSnaps.shift();
    if (typeof d.w === 'number') g.swarm.wave = d.w;
    const sc = nums(d.sc);
    if (sc.length === 2) g.swarm.scores = [sc[0], sc[1]];
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
      keys.current[k] = down;
    };
    const kd = handle(true), ku = handle(false);
    const blur = () => { keys.current = { left: false, right: false, up: false, down: false, fire: false }; finger.current = null; };
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
        shots: s.shots.map((x) => ({ x: x.x, y: x.y, owner: x.owner })),
        bombs: s.bombs.map((b) => ({ id: b.id, x: b.x, y: b.y })),
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
      shots: a.shots.map((x) => ({ x: x.x + x.vx * ahead, y: x.y - Math.sqrt(Math.max(0, 330 * 330 - x.vx * x.vx)) * ahead, owner: 0 })),
      bombs: [...b.bombs].filter(([id]) => !g.hidden.has(id)).map(([id, q]) => ({ id, ...lerp(a.bombs.get(id), q) })),
      drops: [...b.drops].filter(([id]) => !g.hidden.has(id)).map(([id, q]) => ({ id, ...lerp(a.drops.get(id), q) })),
    };
  }

  function step(now: number) {
    const g = game.current;
    if (g.over) return;
    g.t += STEP;
    g.steps += 1;
    const me = g.me;
    const k = keys.current;
    const toward = finger.current ? { x: finger.current.x - SHIP_W / 2, y: finger.current.y - 28 } : null;
    moveShip(me, STEP, { dx: (k.right ? 1 : 0) - (k.left ? 1 : 0), dy: (k.down ? 1 : 0) - (k.up ? 1 : 0) }, toward);
    me.firing = me.alive && (k.fire || !!finger.current);
    if (me.firing && me.cool <= 0) {
      me.cool = fireDelay(me.level);
      if (host) g.swarm.shots.push(...shotsFor(me, index));
      else g.localShots.push(...shotsFor(me, index));
    }

    if (host) {
      // The guest's shots, fired from where it says its ship is.
      const p = g.partner;
      if (p) {
        g.partnerCool = Math.max(0, g.partnerCool - STEP);
        if (p.alive && p.firing && g.partnerCool <= 0) { g.partnerCool = fireDelay(p.level); g.swarm.shots.push(...shotsFor(p, 1)); }
      }
      stepSwarm(g.swarm, p ? [me, p] : [me], STEP);
    } else {
      for (const s of g.localShots) { s.x += s.vx * STEP; s.y += s.vy * STEP; }
    }

    // What touches my ship is mine to say.
    const view = shown(now);
    if (!host) {
      g.localShots = g.localShots.filter((s) => s.y > -10 && !view.bugs.some((b) => overlap({ x: s.x, y: s.y, w: 2, h: 6 }, bugBox(b))));
    }
    if (me.alive) {
      const sb = shipBox(me);
      for (const b of view.bombs) {
        if (!overlap(sb, bombBox(b))) continue;
        if (host) g.swarm.bombs = g.swarm.bombs.filter((x) => x.id !== b.id); else g.hidden.add(b.id);
        if (hurtShip(me)) { playHurt(); burst(g, me.x + SHIP_W / 2, me.y + SHIP_H / 2, false); }
        break;
      }
      for (const b of view.bugs) {
        if (b.kind === 'queen' || !overlap(sb, bugBox(b))) continue;
        if (hurtShip(me)) {
          playHurt();
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
        msg.b = s.bugs.flatMap((b) => [b.id, BUG_KINDS.indexOf(b.kind), r1(b.x), r1(b.y), b.hp, b.maxHp]);
        msg.s = s.shots.filter((x) => x.owner === 0).flatMap((x) => [r1(x.x), r1(x.y), Math.round(x.vx)]);
        msg.m = s.bombs.flatMap((b) => [b.id, r1(b.x), r1(b.y)]);
        msg.d = s.drops.flatMap((d) => [d.id, DROP_KINDS.indexOf(d.kind), r1(d.x), r1(d.y)]);
      }
      peer.current.sendFast(msg);
    }

    if (!me.alive && (!g.partner || !g.partner.alive)) { g.over = true; publishHud(); }

    for (const p of g.particles) { p.x += p.vx * STEP; p.y += p.vy * STEP; p.life -= STEP; }
    g.particles = g.particles.filter((p) => p.life > 0);
    for (const [id, t] of g.hurt) if (g.t - t > 0.12) g.hurt.delete(id);
  }

  function draw(now: number) {
    const cv = canvas.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    c.imageSmoothingEnabled = false;
    const g = game.current;
    const view = shown(now);

    // Bugs gone since last frame burst; bugs that lost health flash.
    const seen: Game['seen'] = new Map();
    for (const b of view.bugs) {
      const before = g.seen.get(b.id);
      seen.set(b.id, { x: b.x, y: b.y, kind: b.kind, hp: b.hp });
      if (before && b.hp < before.hp) g.hurt.set(b.id, g.t);
    }
    for (const [id, b] of g.seen) {
      if (seen.has(id)) continue;
      if (b.y > -10 && b.y < H) {
        burst(g, b.x + BUG_SIZE[b.kind].w / 2, b.y + BUG_SIZE[b.kind].h / 2, b.kind === 'queen');
        playStomp();
        if (b.kind === 'queen') playWin();
      }
    }
    g.seen = seen;

    drawBackground(c, g.t);
    for (const d of view.drops) drawDrop(c, d.kind, d.x, d.y, g.t);
    for (const b of view.bugs) {
      drawBug(c, b.kind, b.x, b.y, g.t, b.id, g.hurt.has(b.id) ? 0.12 - (g.t - (g.hurt.get(b.id) ?? 0)) : 0);
      if (b.kind === 'queen') drawHealth(c, b.x, b.y - 8, BUG_SIZE.queen.w, b.hp / b.max);
    }
    for (const s of view.shots) drawShot(c, s.x, s.y, SHOT_COLORS[s.owner] ?? SHOT_COLORS[0]);
    for (const s of g.localShots) drawShot(c, s.x, s.y, SHOT_COLORS[index]);
    for (const b of view.bombs) drawBomb(c, b.x, b.y, g.t);

    if (g.partner?.alive) {
      const at = now - delay();
      const snaps = g.partnerSnaps;
      let pos = snaps[snaps.length - 1] ?? g.partner;
      for (let i = snaps.length - 1; i > 0; i--) {
        const a = snaps[i - 1], b = snaps[i];
        if (a.t <= at && at <= b.t) { const k = (at - a.t) / Math.max(1, b.t - a.t); pos = { t: at, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; break; }
      }
      drawShip(c, pos.x, pos.y, SHIP_COLORS[1 - index], { t: g.t, inv: g.partner.inv, shield: g.partner.shield, name: partnerName.slice(0, 10) });
    }
    if (g.me.alive) drawShip(c, g.me.x, g.me.y, SHIP_COLORS[index], { t: g.t, inv: g.me.inv, shield: g.me.shield });

    for (const p of g.particles) { c.fillStyle = p.color; c.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
  }

  const bannerUntil = useRef<{ wave: number; until: number }>({ wave: 0, until: 0 });
  function publishHud() {
    const g = game.current;
    const s = g.swarm;
    const b = bannerUntil.current;
    if (s.wave !== b.wave) { b.wave = s.wave; b.until = g.t + 2.2; }
    const banner = s.wave > 0 && g.t < b.until ? (isQueenWave(s.wave) ? 'queen' : 'wave') : null;
    const next: Hud = {
      wave: s.wave, scores: [...s.scores] as [number, number], me: { lives: g.me.lives, level: g.me.level },
      partner: g.partner ? { lives: g.partner.lives, alive: g.partner.alive } : null, banner, over: g.over,
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
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const pointer = {
    onPointerDown: (e: PointerEvent) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); finger.current = toGame(e); },
    onPointerMove: (e: PointerEvent) => { if (finger.current) finger.current = toGame(e); },
    onPointerUp: () => { finger.current = null; },
    onPointerCancel: () => { finger.current = null; },
  };

  const hearts = (n: number, color: string) => (
    <span className="flex items-center gap-0.5" style={{ color }}>
      {Array.from({ length: Math.max(0, n) }, (_, i) => <PixelIcon key={i} rows={ICONS.heart} size={1} />)}
    </span>
  );
  const overlay = (children: ReactNode) => (
    <div className="absolute inset-0 flex items-center justify-center bg-black/55 p-4">
      <div className="px-notch px-frame p-4 w-full max-w-[320px] text-center px-in-up">{children}</div>
    </div>
  );
  const mine = hud.scores[index], theirs = hud.scores[1 - index];

  return (
    <div className="px px-frame absolute inset-0 z-40 flex flex-col select-none" style={{ touchAction: 'none' }} onKeyDown={(e) => e.stopPropagation()}>
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 pt-[calc(0.5rem+var(--sat,0px))] pb-1.5 pl-[calc(0.75rem+var(--sal,0px))] pr-[calc(0.75rem+var(--sar,0px))]">
        <p className="px-title !text-[16px] text-[var(--px-gold)] flex items-center gap-2 min-w-0">
          <PixelIcon name="bug" size={2} /> <span className="truncate"><FormattedMessage id="world.swarmTitle" /></span>
        </p>
        {!solo && (
          <span className={`hidden sm:inline text-[11px] ${net === 'direct' ? 'text-[var(--px-jade)]' : 'text-[var(--px-muted)]'}`}>
            <FormattedMessage id={`world.rooftopNet.${net}`} />
          </span>
        )}
        <button onClick={onClose} className="px-title !text-[12px] text-[var(--px-muted)] hover:text-[var(--px-text)] shrink-0">
          <FormattedMessage id="world.focusLeave" />
        </button>
      </div>
      <div className="shrink-0 flex items-center justify-between gap-3 px-3 pb-1.5 text-[12px] px-num">
        <span className="flex items-center gap-2" style={{ color: SHIP_COLORS[index] }}>
          <FormattedMessage id="world.duelYou" /> {mine} {hearts(hud.me.lives, SHIP_COLORS[index])}
          <span className="text-[var(--px-gold)]">{'▮'.repeat(hud.me.level)}</span>
        </span>
        {hud.wave > 0 && <span className="text-[var(--px-muted)]"><FormattedMessage id="world.swarmWave" values={{ n: hud.wave }} /></span>}
        {hud.partner && (
          <span className="flex items-center gap-2 min-w-0" style={{ color: SHIP_COLORS[1 - index] }}>
            {hearts(hud.partner.lives, SHIP_COLORS[1 - index])} <span className="truncate max-w-[80px]">{partnerName}</span> {theirs}
          </span>
        )}
      </div>

      <div ref={box} className="relative flex-1 min-h-0 flex items-center justify-center bg-black">
        <canvas ref={canvas} width={W} height={H} {...pointer} style={{ width: fit.w, height: fit.h, imageRendering: 'pixelated', touchAction: 'none' }} />

        {started && hud.banner && !hud.over && (
          <p className="absolute top-[30%] left-1/2 -translate-x-1/2 px-title !text-[22px] text-[var(--px-gold)] pointer-events-none px-in-up whitespace-nowrap">
            <FormattedMessage id={hud.banner === 'queen' ? 'world.swarmQueen' : 'world.swarmWave'} values={{ n: hud.wave }} />
          </p>
        )}
        {started && hud.wave <= 1 && !hud.over && (
          <p className="absolute bottom-2 left-1/2 -translate-x-1/2 max-w-[92%] text-center text-[12px] px-2 py-1 bg-black/55 pointer-events-none">
            <FormattedMessage id="world.swarmHint" />
          </p>
        )}
        {!hud.over && !hud.me.lives && hud.partner?.alive && (
          <p className="absolute top-2 left-1/2 -translate-x-1/2 text-[12px] px-2 py-1 bg-black/60 pointer-events-none">
            <FormattedMessage id="world.swarmOut" values={{ name: partnerName }} />
          </p>
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
            <p className="text-[13px] mb-3">
              <FormattedMessage id="world.swarmScore" values={{ n: mine }} />
              {hud.partner && <> · {partnerName}: {theirs}</>}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <PixelButton tone="gold" onClick={again}><FormattedMessage id="world.rooftopAgain" /> <Kbd>R</Kbd></PixelButton>
              <PixelButton tone="paper" onClick={onClose}><FormattedMessage id="world.duelDone" /> <Kbd>Esc</Kbd></PixelButton>
            </div>
          </>,
        )}
      </div>
    </div>
  );
}
