import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { useMatch } from '../../hooks/useMatch';
import { PeerLink, type PeerData, type PeerState } from '../../lib/peerLink';
import {
  LIVES, PLAYER_H, PLAYER_W, RESPAWN_S, STEP, T, TIME_LIMIT,
  boatPlatforms, boatX, buildLevel, coinsTouched, hurts, kill, meet, newEnemies, newPlayer, plateUnder, respawn,
  stepDead, stepEnemy, stepPlayer, type Enemy, type Input, type Level, type Platform, type Player, type World,
} from '../../lib/rooftop';
import { playBoing, playCoin, playHurt, playJump, playStomp, playWin } from '../../lib/sfx';
import type { MatchLink } from '../../lib/worldLive';
import { Kbd, PixelButton, PixelIcon, PixelLoader } from './pixel';
import { NetWait } from './NetWait';
import {
  COLORS, VIEW_H, drawBoat, drawCoin, drawEdgeArrow, drawEnemy, drawGoalGate, drawRunner, drawSky, drawSquashed, drawTiles,
} from './rooftopDraw';

// Rooftop Run, on screen: a co-op platformer for two players in the world
// (or one, practising). The rules are lib/rooftop; the art is rooftopDraw.
//
// Over the network (lib/peerLink — WebRTC straight between the browsers,
// paused while there's no such line), each player owns their own runner
// and sends where it is many times a second; the other draws it a moment in
// the past, between two positions it has, so it moves smoothly. The host
// also owns the enemies and sends them with its runner. Events that must
// land — a coin taken, an enemy stomped, starting again — go on the reliable
// channel. Everything else (gates, lives, the finish) each side works out
// from the same two runners, so the two screens agree without a referee.

const ICONS = {
  left: ['...#', '..##', '.###', '####', '.###', '..##', '...#'],
  right: ['#...', '##..', '###.', '####', '###.', '##..', '#...'],
  up: ['...#...', '..###..', '.#####.', '#######'],
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
};

/** How far behind a partner is drawn, so there's a later position to move toward. */
const DELAY_DIRECT = 60;
/** Steps between positions sent: 30 a second (the game only runs on a direct line). */
const SEND_DIRECT = 2;

interface Snap { t: number; x: number; y: number; vx: number; vy: number; f: number; gr: boolean; d: boolean; run: number }
interface Remote {
  snaps: Snap[];
  goal: boolean;
  deaths: number;
  cp: number;
  plate: number | null;
  shown: { x: number; y: number } | null;
}
interface Fx { kind: 'pop' | 'squash' | 'spark'; x: number; y: number; t: number; enemy?: Enemy['kind']; h?: number; vx?: number; vy?: number; color?: string }

interface Game {
  round: number;
  level: Level;
  me: Player;
  enemies: Enemy[];
  /** Guest: the host's enemies as last sent, with when. */
  enemySnaps: { t: number; e: number[] }[];
  /** Guest: enemies it stomped that the host hasn't confirmed yet. */
  stomped: Set<number>;
  taken: Set<number>;
  bumps: Map<number, number>;
  t: number;
  steps: number;
  remote: Remote | null;
  fx: Fx[];
  camX: number;
  over: null | { result: 'won' | 'lost'; why: 'goal' | 'lives' | 'time' };
  loseAt: number | null;
}

interface Hud { coins: number; lives: number; time: number; waiting: boolean; hint: 'start' | 'wall' | 'gate' | null; over: Game['over'] }

const newRemote = (): Remote => ({ snaps: [], goal: false, deaths: 0, cp: 0, plate: null, shown: null });

function newGame(level: Level, index: number, round: number, solo: boolean): Game {
  return {
    round, level,
    me: newPlayer(level.spawns[index] ?? level.spawns[0]),
    enemies: newEnemies(level),
    enemySnaps: [], stomped: new Set(), taken: new Set(), bumps: new Map(),
    t: 0, steps: 0,
    remote: solo ? null : newRemote(),
    fx: [], camX: 0, over: null, loseAt: null,
  };
}

/** A position `delay` ms ago, between the two snapshots either side of it. */
function sample(snaps: Snap[], at: number): Snap | null {
  if (!snaps.length) return null;
  if (at >= snaps[snaps.length - 1].t) {
    const s = snaps[snaps.length - 1];
    // A little past the newest: carry on along its velocity, briefly.
    const ahead = Math.min(at - s.t, 100) / 1000;
    return s.d ? s : { ...s, x: s.x + s.vx * ahead, y: s.gr ? s.y : s.y + s.vy * ahead };
  }
  for (let i = snaps.length - 1; i > 0; i--) {
    const a = snaps[i - 1], b = snaps[i];
    if (a.t <= at && at <= b.t) {
      const k = b.t === a.t ? 1 : (at - a.t) / (b.t - a.t);
      // A jump of more than two tiles is a respawn: don't slide across.
      if (Math.abs(b.x - a.x) > 2 * T) return k < 0.5 ? a : b;
      return { ...b, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
  }
  return snaps[0];
}

const isTouch = () => typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches ?? false);

export function RooftopRun({ link, onClose }: { link: MatchLink | null; onClose: () => void }) {
  const solo = !link;
  const index = link && !link.host ? 1 : 0;
  const partnerName = link?.peer.name ?? '';
  const { start, left } = useMatch<{ v: number }>(
    link,
    () => Promise.resolve({ v: 1 }),
    (raw) => (raw && typeof raw === 'object' && (raw as { v?: unknown }).v === 1 ? { v: 1 } : null),
  );
  const started = solo || !!start;

  const level = useMemo(buildLevel, []);
  const cpAt = useMemo(() => {
    const m = new Map<number, number>();
    let n = 1;
    level.tiles.forEach((ch, i) => { if (ch === 'C') m.set(i, n++); });
    return m;
  }, [level]);
  /** Where each gate group stands, for the hints. */
  const gateX = useMemo(() => {
    const m = new Map<number, number>();
    for (const [i, g] of level.gates) m.set(g, Math.min(m.get(g) ?? Infinity, (i % level.w) * T));
    return m;
  }, [level]);

  const game = useRef<Game>(newGame(level, index, 0, solo));
  const input = useRef<Input>({ left: false, right: false, jump: false });
  const peer = useRef<PeerLink | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(400);
  const [fit, setFit] = useState({ w: 400, h: 240 });
  const [net, setNet] = useState<PeerState>(solo ? 'direct' : 'connecting');
  // No direct line, no game: it pauses (both sides) until there is one — see NetWait.
  const playing = started && (solo || net === 'direct');
  const [hud, setHud] = useState<Hud>({ coins: 0, lives: LIVES, time: TIME_LIMIT, waiting: false, hint: 'start', over: null });
  const [touch] = useState(isTouch);

  // The direct line, opened as soon as the match is — while the game is still being set up.
  useEffect(() => {
    if (!link) return;
    const p = new PeerLink(link);
    peer.current = p;
    const offState = p.onState(setNet);
    const offData = p.listen((d) => receive(d));
    return () => { offState(); offData(); p.close(); peer.current = null; };
  }, [link]); // eslint-disable-line react-hooks/exhaustive-deps

  function receive(d: PeerData) {
    const g = game.current;
    if (d.k === 'again' && typeof d.r === 'number' && d.r > g.round) { restart(d.r); return; }
    if (d.r !== g.round || !g.remote) return;
    if (d.k === 's') {
      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
      const s: Snap = { t: performance.now(), x: num(d.x), y: num(d.y), vx: num(d.vx), vy: num(d.vy), f: d.f === -1 ? -1 : 1, gr: !!d.gr, d: !!d.d, run: num(d.run) };
      const snaps = g.remote.snaps;
      snaps.push(s);
      if (snaps.length > 30) snaps.shift();
      g.remote.goal = !!d.g;
      g.remote.deaths = Math.max(0, Math.min(99, num(d.n)));
      g.remote.cp = Math.max(0, Math.min(level.checkpoints.length - 1, num(d.cp)));
      g.remote.plate = typeof d.pl === 'number' && level.plates.has(d.pl) ? d.pl : null;
      if (index === 1 && Array.isArray(d.e)) {
        g.enemySnaps.push({ t: s.t, e: d.e.map(num) });
        if (g.enemySnaps.length > 20) g.enemySnaps.shift();
      }
    } else if (d.k === 'coin' && typeof d.i === 'number') {
      take(g, d.i, false);
    } else if (d.k === 'stomp' && typeof d.id === 'number') {
      const e = g.enemies[d.id];
      // Kept down even while older positions (still saying it's alive) are drawn.
      g.stomped.add(d.id);
      if (e && e.alive) {
        e.alive = false;
        g.fx.push({ kind: 'squash', x: e.x, y: e.y, t: g.t, enemy: e.kind, h: e.h });
      }
    }
  }

  function take(g: Game, i: number, mine: boolean) {
    if (g.taken.has(i)) return;
    g.taken.add(i);
    const c = i % level.w, r = Math.floor(i / level.w);
    if (level.tiles[i] === '?') g.fx.push({ kind: 'pop', x: c * T + 8, y: r * T - 4, t: g.t });
    else for (let k = 0; k < 4; k++) g.fx.push({ kind: 'spark', x: c * T + 8, y: r * T + 8, t: g.t, vx: (k - 1.5) * 30, vy: -40 - k * 10, color: '#fff1a8' });
    if (mine) {
      playCoin();
      peer.current?.sendSure({ k: 'coin', r: g.round, i });
    }
  }

  function restart(round: number) {
    game.current = newGame(level, index, round, solo);
    setHud((h) => ({ ...h, over: null }));
  }

  const again = () => {
    const r = game.current.round + 1;
    peer.current?.sendSure({ k: 'again', r });
    restart(r);
  };

  // Keys, caught before the world gets them (so the avatar outside doesn't walk too).
  useEffect(() => {
    const map = (e: KeyboardEvent): keyof Input | null => {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': return 'left';
        case 'ArrowRight': case 'KeyD': return 'right';
        case 'ArrowUp': case 'KeyW': case 'Space': case 'KeyZ': case 'KeyK': return 'jump';
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
      input.current[k] = down;
    };
    const kd = handle(true), ku = handle(false);
    const blur = () => { input.current = { left: false, right: false, jump: false }; };
    window.addEventListener('keydown', kd, true);
    window.addEventListener('keyup', ku, true);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', kd, true); window.removeEventListener('keyup', ku, true); window.removeEventListener('blur', blur); };
  }, []);

  // The view: 15 tiles high, as wide as the screen's shape allows, scaled up whole.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const w = Math.round(Math.max(240, Math.min(440, (VIEW_H * width) / height)));
      const scale = Math.min(width / w, height / VIEW_H);
      setViewW(w);
      setFit({ w: Math.floor(w * scale), h: Math.floor(VIEW_H * scale) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The loop: fixed steps for the rules, a frame drawn whenever the screen asks.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let hudAt = 0;
    const frame = (now: number) => {
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      while (acc >= STEP) { step(now); acc -= STEP; }
      draw(now);
      if (now - hudAt > 200) { hudAt = now; publishHud(); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }); // re-bound each render so it reads the latest view width; cheap

  function partnerAt(now: number): Snap | null {
    const g = game.current;
    if (!g.remote) return null;
    return sample(g.remote.snaps, now - DELAY_DIRECT);
  }

  /** The enemies as this player sees them: its own (host), or the host's, a moment ago. */
  function shownEnemies(now: number): Enemy[] {
    const g = game.current;
    if (index === 0) return g.enemies;
    const at = now - DELAY_DIRECT;
    const snaps = g.enemySnaps;
    if (snaps.length) {
      let a = snaps[0], b = snaps[0];
      for (let i = snaps.length - 1; i > 0; i--) if (snaps[i - 1].t <= at) { a = snaps[i - 1]; b = snaps[i]; break; }
      if (at >= snaps[snaps.length - 1].t) a = b = snaps[snaps.length - 1];
      const k = b.t === a.t ? 1 : Math.max(0, Math.min(1, (at - a.t) / (b.t - a.t)));
      g.enemies.forEach((e, i) => {
        const ax = a.e[i * 3], ay = a.e[i * 3 + 1], bx = b.e[i * 3], by = b.e[i * 3 + 1], f = b.e[i * 3 + 2];
        if (bx === undefined) return;
        e.x = ax + (bx - ax) * k;
        e.y = ay + (by - ay) * k;
        e.ground = Math.abs(by - ay) < 0.5;
        if (f === 0) { if (e.alive && !g.stomped.has(e.id)) g.fx.push({ kind: 'squash', x: e.x, y: e.y, t: g.t, enemy: e.kind, h: e.h }); e.alive = false; }
        else { e.dir = f > 0 ? 1 : -1; if (!g.stomped.has(e.id)) e.alive = true; }
      });
    }
    return g.enemies;
  }

  function step(now: number) {
    const g = game.current;
    if (g.over) return;
    g.t += STEP;
    g.steps += 1;
    const me = g.me;
    const r = g.remote;

    // Gates: open while someone's on a plate of theirs (alone, always).
    const pressed = new Set<number>();
    const myPlate = me.dead ? null : plateUnder(level, me);
    if (myPlate !== null) pressed.add(myPlate);
    if (r?.plate != null) pressed.add(r.plate);
    const open = new Set<number>(solo ? [...level.gates.values()] : [...pressed].map((i) => level.plates.get(i) ?? 0));

    // Things to stand on: the boats, and your partner's head.
    const platforms: Platform[] = boatPlatforms(level, g.t);
    const p = partnerAt(now);
    if (r && p && !p.d) {
      const prev = r.shown ?? { x: p.x, y: p.y };
      platforms.push({ id: 'partner', x: p.x, y: p.y, w: PLAYER_W, dx: p.x - prev.x, dy: p.y - prev.y });
      r.shown = { x: p.x, y: p.y };
    }
    const world: World = { level, open, solo, platforms };
    const cp = Math.max(me.cp, r?.cp ?? 0);
    const lives = LIVES - me.deaths - (r?.deaths ?? 0);

    if (me.dead) {
      stepDead(me, STEP);
      if (me.dead > RESPAWN_S && lives > 0) {
        const at = level.checkpoints[cp];
        respawn(me, { x: at.x + index * 14, y: at.y });
      }
    } else {
      const prevBottom = me.y + me.h;
      for (const ev of stepPlayer(me, input.current, world, STEP)) {
        if (ev.kind === 'jump') playJump();
        else if (ev.kind === 'spring') playBoing();
        else if (ev.kind === 'bump') {
          g.bumps.set(ev.tile, g.t);
          if (level.tiles[ev.tile] === '?' && !g.taken.has(ev.tile)) take(g, ev.tile, true);
          else playStomp();
        }
      }
      for (const i of coinsTouched(level, me)) take(g, i, true);
      for (let i = me.cp + 1; i < level.checkpoints.length; i++) if (me.x >= level.checkpoints[i].x - 8) me.cp = i;
      if (!me.goal && me.x + me.w / 2 >= level.goalX) { me.goal = true; playWin(); }
      if (hurts(world, me)) { kill(me); playHurt(); }
      else {
        for (const e of shownEnemies(now)) {
          if (!e.alive || g.stomped.has(e.id)) continue;
          const m = meet(me, prevBottom, e, input.current.jump);
          if (m === 'stomp') {
            playStomp();
            g.fx.push({ kind: 'squash', x: e.x, y: e.y, t: g.t, enemy: e.kind, h: e.h });
            if (index === 0) e.alive = false; else g.stomped.add(e.id);
            peer.current?.sendSure({ k: 'stomp', r: g.round, id: e.id });
            break;
          }
          if (m === 'hurt') { kill(me); playHurt(); break; }
        }
      }
    }

    if (index === 0) for (const e of g.enemies) stepEnemy(e, world, STEP);

    // Tell the partner where we are.
    if (peer.current && r) {
      const every = SEND_DIRECT;
      if (g.steps % every === 0) {
        const msg: PeerData = {
          k: 's', r: g.round, x: Math.round(me.x * 10) / 10, y: Math.round(me.y * 10) / 10, vx: Math.round(me.vx), vy: Math.round(me.vy),
          f: me.facing, gr: me.ground, d: !!me.dead, run: Math.round(me.run * 100) / 100, g: me.goal, n: me.deaths, cp: me.cp, pl: myPlate ?? -1,
        };
        if (index === 0) msg.e = g.enemies.flatMap((e) => [Math.round(e.x), Math.round(e.y), e.alive ? e.dir : 0]);
        peer.current.sendFast(msg);
      }
    }

    // The end.
    const livesNow = LIVES - me.deaths - (r?.deaths ?? 0);
    if (me.goal && (solo || r?.goal)) g.over = { result: 'won', why: 'goal' };
    else if (g.t >= TIME_LIMIT) g.over = { result: 'lost', why: 'time' };
    else if (livesNow <= 0) {
      g.loseAt ??= g.t + 1.2;
      if (g.t >= g.loseAt) g.over = { result: 'lost', why: 'lives' };
    }
    if (g.over) { if (g.over.result === 'won') playWin(); publishHud(); }

    // Effects age out.
    g.fx = g.fx.filter((f) => g.t - f.t < (f.kind === 'squash' ? 0.5 : 0.6));
  }

  function draw(now: number) {
    const cv = canvas.current;
    if (!cv) return;
    const c = cv.getContext('2d');
    if (!c) return;
    const W = viewW;
    if (cv.width !== W || cv.height !== VIEW_H) { cv.width = W; cv.height = VIEW_H; }
    c.imageSmoothingEnabled = false;
    const g = game.current;
    const me = g.me;
    const p = partnerAt(now);

    // The camera follows you — or your partner, once you're through the gate.
    const follow = me.goal && p ? p : me;
    const lead = (follow === me ? me.facing : 0) * 24;
    const target = Math.max(0, Math.min(level.w * T - W, follow.x + PLAYER_W / 2 - W / 2 + lead));
    g.camX += (target - g.camX) * 0.12;
    if (Math.abs(target - g.camX) > W) g.camX = target;
    const camX = Math.round(g.camX);

    drawSky(c, W, camX, g.t);
    drawGoalGate(c, level, camX);
    const pressed = new Set<number>();
    const myPlate = me.dead ? null : plateUnder(level, me);
    if (myPlate !== null) pressed.add(myPlate);
    if (g.remote?.plate != null) pressed.add(g.remote.plate);
    const open = new Set<number>(solo ? [...level.gates.values()] : [...pressed].map((i) => level.plates.get(i) ?? 0));
    drawTiles(c, level, camX, W, { taken: g.taken, open, pressed, bumps: g.bumps, cpAt, cp: Math.max(me.cp, g.remote?.cp ?? 0), t: g.t });
    level.boats.forEach((b) => drawBoat(c, b, boatX(b, g.t), camX));

    for (const e of shownEnemies(now)) {
      if (!e.alive || g.stomped.has(e.id)) continue;
      if (e.x + e.w < camX - 16 || e.x > camX + W + 16) continue;
      drawEnemy(c, e.kind, e.x - camX, e.y, e.dir, !e.ground, g.t);
    }
    for (const f of g.fx) {
      const age = g.t - f.t;
      if (f.kind === 'squash' && f.enemy) drawSquashed(c, f.enemy, f.x - camX, f.y, f.h ?? 12);
      else if (f.kind === 'pop') drawCoin(c, f.x - camX, f.y - age * 60, g.t * 2);
      else if (f.kind === 'spark') { c.fillStyle = f.color ?? '#fff'; c.fillRect(Math.round(f.x + (f.vx ?? 0) * age - camX), Math.round(f.y + (f.vy ?? 0) * age + 80 * age * age), 2, 2); }
    }

    const other = COLORS[1 - index];
    if (p) {
      const sx = p.x - camX;
      if (sx + PLAYER_W < 0 || sx > W) drawEdgeArrow(c, W, sx, p.y + PLAYER_H / 2, other);
      else drawRunner(c, sx, p.y, { color: other, facing: p.f, run: p.run, ground: p.gr, dead: p.d, name: partnerName.slice(0, 12) });
    }
    if (!(me.dead && me.y > VIEW_H)) drawRunner(c, me.x - camX, me.y, { color: COLORS[index], facing: me.facing, run: me.run, ground: me.ground, dead: !!me.dead });
  }

  function publishHud() {
    const g = game.current;
    const me = g.me;
    const lives = Math.max(0, LIVES - me.deaths - (g.remote?.deaths ?? 0));
    let hint: Hud['hint'] = null;
    if (g.t < 6) hint = 'start';
    else if (!solo) {
      const near = (x: number | undefined) => x !== undefined && Math.abs(me.x - x) < 9 * T;
      if (near(gateX.get(1)) && me.x < (gateX.get(1) ?? 0) + 7 * T) hint = 'wall';
      else if (near(gateX.get(2))) hint = 'gate';
    }
    const next: Hud = { coins: g.taken.size, lives, time: Math.max(0, Math.ceil(TIME_LIMIT - g.t)), waiting: me.goal && !!g.remote && !g.remote.goal, hint, over: g.over };
    setHud((h) => (h.coins === next.coins && h.lives === next.lives && h.time === next.time && h.waiting === next.waiting && h.hint === next.hint && h.over === next.over ? h : next));
  }

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

  const hold = (k: keyof Input) => ({
    onPointerDown: (e: PointerEvent) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); input.current[k] = true; },
    onPointerUp: () => { input.current[k] = false; },
    onPointerCancel: () => { input.current[k] = false; },
    onLostPointerCapture: () => { input.current[k] = false; },
    onContextMenu: (e: MouseEvent) => e.preventDefault(),
  });

  const mm = Math.floor(hud.time / 60), ss = String(hud.time % 60).padStart(2, '0');
  const overlay = (children: ReactNode) => (
    <div className="absolute inset-0 flex items-center justify-center bg-black/55 p-4">
      <div className="px-notch px-frame p-4 w-full max-w-[340px] text-center px-in-up">{children}</div>
    </div>
  );

  return (
    <div className="px px-frame absolute inset-0 z-40 flex flex-col select-none" style={{ touchAction: 'none' }} onKeyDown={(e) => e.stopPropagation()}>
      {/* The bar: what's at stake, and the way out. */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 pt-[calc(0.5rem+var(--sat,0px))] pb-1.5 pl-[calc(0.75rem+var(--sal,0px))] pr-[calc(0.75rem+var(--sar,0px))]">
        <p className="px-title !text-[16px] text-[var(--px-gold)] flex items-center gap-2 min-w-0">
          <PixelIcon name="flag" size={2} /> <span className="truncate"><FormattedMessage id="world.rooftopTitle" /></span>
        </p>
        <div className="flex items-center gap-3 text-[13px] px-num">
          <span className="text-[var(--px-gold)]">● {hud.coins}</span>
          <span className="flex items-center gap-1 text-[#ff8a8a]"><PixelIcon rows={ICONS.heart} size={1} /> {hud.lives}</span>
          <span className={hud.time <= 30 ? 'text-[#ff8a8a]' : ''}>{mm}:{ss}</span>
          {!solo && (
            <span className={`hidden sm:inline text-[11px] ${net === 'direct' ? 'text-[var(--px-jade)]' : 'text-[var(--px-muted)]'}`}>
              <FormattedMessage id={`world.rooftopNet.${net}`} />
            </span>
          )}
        </div>
        <button onClick={onClose} className="px-title !text-[12px] text-[var(--px-muted)] hover:text-[var(--px-text)] shrink-0">
          <FormattedMessage id="world.focusLeave" />
        </button>
      </div>

      <div ref={box} className="relative flex-1 min-h-0 flex items-center justify-center bg-black">
        <canvas ref={canvas} width={viewW} height={VIEW_H} style={{ width: fit.w, height: fit.h, imageRendering: 'pixelated' }} />

        {started && !hud.over && !left && hud.hint && (
          <p className="absolute top-2 left-1/2 -translate-x-1/2 max-w-[92%] text-center text-[12px] px-2 py-1 bg-black/55 pointer-events-none">
            <FormattedMessage id={hud.hint === 'start' ? (touch ? 'world.rooftopHintTouch' : 'world.rooftopHintKeys') : `world.rooftopHint.${hud.hint}`} values={{ name: partnerName }} />
          </p>
        )}
        {hud.waiting && !hud.over && !left && (
          <p className="absolute bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 text-[13px] px-2 py-1 bg-black/60 text-[var(--px-gold)] pointer-events-none">
            <FormattedMessage id="world.rooftopWaiting" values={{ name: partnerName }} />
          </p>
        )}

        {!started && !left && overlay(<PixelLoader label={<FormattedMessage id="world.duelWaiting" values={{ name: partnerName }} />} />)}
        {started && !playing && !left && overlay(<NetWait state={net} name={partnerName} onLeave={onClose} />)}
        {left && overlay(
          <>
            <p className="text-[14px] mb-3"><FormattedMessage id="world.duelLeft" values={{ name: partnerName }} /></p>
            <PixelButton tone="jade" block onClick={onClose}><FormattedMessage id="world.duelDone" /> <Kbd>Esc</Kbd></PixelButton>
          </>,
        )}
        {hud.over && !left && overlay(
          <>
            <p className="px-title !text-[20px] mb-1" style={{ color: hud.over.result === 'won' ? 'var(--px-jade)' : 'var(--px-bad)' }}>
              <FormattedMessage id={`world.rooftopEnd.${hud.over.why}`} values={{ solo: solo ? 'yes' : 'no' }} />
            </p>
            <p className="text-[13px] mb-3 opacity-90"><FormattedMessage id="world.rooftopCoins" values={{ n: hud.coins }} /></p>
            <div className="grid grid-cols-2 gap-2">
              <PixelButton tone="gold" onClick={again}><FormattedMessage id="world.rooftopAgain" /> <Kbd>R</Kbd></PixelButton>
              <PixelButton tone="paper" onClick={onClose}><FormattedMessage id="world.duelDone" /> <Kbd>Esc</Kbd></PixelButton>
            </div>
          </>,
        )}

        {touch && started && !hud.over && !left && (
          <>
            <div className="absolute left-[calc(0.75rem+var(--sal,0px))] bottom-[calc(0.75rem+var(--sab,0px))] flex gap-3">
              <button {...hold('left')} aria-label="left" className="w-16 h-16 rounded-full bg-white/15 active:bg-white/35 border-2 border-white/30 flex items-center justify-center text-white">
                <PixelIcon rows={ICONS.left} size={4} />
              </button>
              <button {...hold('right')} aria-label="right" className="w-16 h-16 rounded-full bg-white/15 active:bg-white/35 border-2 border-white/30 flex items-center justify-center text-white">
                <PixelIcon rows={ICONS.right} size={4} />
              </button>
            </div>
            <button {...hold('jump')} aria-label="jump" className="absolute right-[calc(0.75rem+var(--sar,0px))] bottom-[calc(0.75rem+var(--sab,0px))] w-20 h-20 rounded-full bg-[var(--px-gold)]/30 active:bg-[var(--px-gold)]/60 border-2 border-[var(--px-gold)]/60 flex items-center justify-center text-white">
              <PixelIcon rows={ICONS.up} size={4} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
