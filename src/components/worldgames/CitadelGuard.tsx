import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { useMatch } from '../../hooks/useMatch';
import { PeerLink, type PeerData, type PeerState } from '../../lib/peerLink';
import {
  COLS, ENEMY_KINDS, H, ROWS, T, TOWERS, TOWER_KINDS, W,
  build, callWave, canBuild, newGuard, refund, sell, stepGuard, towerAt, upgrade, upgradeCost,
  type EnemyKind, type Guard, type TowerKind,
} from '../../lib/citadelGuard';
import { STEP } from '../../lib/rooftop';
import { playCoin, playHurt, playJump, playSelect, playStomp } from '../../lib/sfx';
import type { MatchLink } from '../../lib/worldLive';
import { Kbd, PixelButton, PixelIcon, PixelLoader } from './pixel';
import { NetWait } from './NetWait';
import { OWNER_COLORS, drawCursor, drawEnemy, drawGround, drawRange, drawShot, drawTower } from './citadelGuardDraw';

// Citadel Guard, on screen: a tower defence for two in the world (or one,
// practising). The rules are lib/citadelGuard; the art is citadelGuardDraw.
//
// The host runs the whole game and sends it many times a second (over
// lib/peerLink — WebRTC straight between the browsers, and paused while
// there's no such line). The guest asks for what it wants built, upgraded or
// sold on the reliable channel and draws what comes back, its monsters a
// moment in the past so they march smoothly. Each side also sends where its
// cursor is, so you can see what your partner is pointing at.

const ICONS = {
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  coin: ['.###.', '##.##', '#.#.#', '##.##', '.###.'],
};

const DELAY_DIRECT = 110;
const SEND_DIRECT = 3;
const SHOT_LIFE: Record<TowerKind, number> = { archer: 0.18, cannon: 0.35, frost: 0.22, firework: 0.4 };
/** When a message arrived — on the same clock the frames are drawn by. */
const clock = () => performance.now();

type Action =
  | { a: 'build'; kind: TowerKind; c: number; row: number }
  | { a: 'up'; id: number }
  | { a: 'sell'; id: number }
  | { a: 'next' }
  | { a: 'speed' };

interface EnemyView { kind: EnemyKind; x: number; y: number; hp: number; max: number; slowed: boolean }
interface Snap { t: number; enemies: Map<number, EnemyView> }
interface Fx { kind: TowerKind; x0: number; y0: number; x1: number; y1: number; t0: number }
interface Puff { x: number; y: number; t0: number }

interface Game {
  round: number;
  /** The host's game; on the guest, the last of it the host sent (enemies aside). */
  g: Guard;
  snaps: Snap[];
  fx: Fx[];
  puffs: Puff[];
  seen: Map<number, { x: number; y: number }>;
  partnerCur: [number, number] | null;
  outbox: Fx[];
  steps: number;
  t: number;
  lives: number;
}

interface Hud {
  lives: number; wave: number; phase: Guard['phase']; countdown: number; gold: number[]; speed: number; over: boolean;
  sel: { id: number; kind: TowerKind; level: number; mine: boolean; up: number | null; refund: number } | null;
}

const newGame = (round: number, players: number): Game => ({
  round, g: newGuard(players), snaps: [], fx: [], puffs: [], seen: new Map(), partnerCur: null, outbox: [], steps: 0, t: 0, lives: newGuard(players).lives,
});

const isAction = (d: PeerData): Action | null => {
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  if (d.a === 'build' && TOWER_KINDS.includes(d.kind as TowerKind) && num(d.c) && num(d.row)) return { a: 'build', kind: d.kind as TowerKind, c: d.c as number, row: d.row as number };
  if ((d.a === 'up' || d.a === 'sell') && num(d.id)) return { a: d.a, id: d.id as number };
  if (d.a === 'next' || d.a === 'speed') return { a: d.a };
  return null;
};

export function CitadelGuard({ link, onClose }: { link: MatchLink | null; onClose: () => void }) {
  const solo = !link;
  const index = link && !link.host ? 1 : 0;
  const host = index === 0;
  const players = solo ? 1 : 2;
  const partnerName = link?.peer.name ?? '';
  const { start, left } = useMatch<{ v: number }>(
    link,
    () => Promise.resolve({ v: 1 }),
    (raw) => (raw && typeof raw === 'object' && (raw as { v?: unknown }).v === 1 ? { v: 1 } : null),
  );
  const started = solo || !!start;

  const game = useRef<Game>(newGame(0, players));
  const peer = useRef<PeerLink | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const cursor = useRef<[number, number] | null>(null);
  const buildRef = useRef<TowerKind | null>(null);
  const selRef = useRef<number | null>(null);
  const [buildKind, setBuildKindState] = useState<TowerKind | null>(null);
  const [fit, setFit] = useState({ w: W, h: H });
  const [net, setNet] = useState<PeerState>(solo ? 'direct' : 'connecting');
  /** How far the direct line's setup got, shown if it fails. */
  const [netDetail, setNetDetail] = useState('');
  // No direct line, no game: it pauses (both sides) until there is one — see NetWait.
  const playing = started && (solo || net === 'direct');
  const [hud, setHud] = useState<Hud>({ lives: 20, wave: 0, phase: 'build', countdown: 30, gold: [0, 0], speed: 1, over: false, sel: null });

  const setBuildKind = (k: TowerKind | null) => { buildRef.current = k; setBuildKindState(k); if (k) selRef.current = null; };
  const select = (id: number | null) => { selRef.current = id; if (id !== null) setBuildKind(null); publishHud(); };

  function receive(d: PeerData) {
    const gm = game.current;
    if (d.k === 'again' && typeof d.r === 'number' && d.r > gm.round) { restart(d.r); return; }
    if (d.r !== gm.round) return;
    if (host) {
      if (d.k === 'c') gm.partnerCur = parseCur(d.cur);
      else if (d.k === 'act') { const a = isAction(d); if (a) act(1, a); }
      return;
    }
    if (d.k !== 's') return;
    const nums = (v: unknown) => (Array.isArray(v) ? v.map((x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0)) : []);
    const now = clock();
    const e = nums(d.e), tw = nums(d.tw), sh = nums(d.sh), gold = nums(d.g);
    const snap: Snap = { t: now, enemies: new Map() };
    for (let i = 0; i + 6 < e.length; i += 7) {
      snap.enemies.set(e[i], { kind: ENEMY_KINDS[e[i + 1]] ?? 'beetle', x: e[i + 2], y: e[i + 3], hp: e[i + 4], max: Math.max(1, e[i + 5]), slowed: !!e[i + 6] });
    }
    gm.snaps.push(snap);
    if (gm.snaps.length > 20) gm.snaps.shift();
    const g = gm.g;
    g.towers = [];
    for (let i = 0; i + 6 < tw.length; i += 7) {
      g.towers.push({ id: tw[i], owner: tw[i + 1], kind: TOWER_KINDS[tw[i + 2]] ?? 'archer', level: tw[i + 3], c: tw[i + 4], r: tw[i + 5], aim: tw[i + 6] / 100, cool: 0, spent: 0 });
    }
    for (let i = 0; i + 4 < sh.length; i += 5) gm.fx.push({ kind: TOWER_KINDS[sh[i]] ?? 'archer', x0: sh[i + 1], y0: sh[i + 2], x1: sh[i + 3], y1: sh[i + 4], t0: gm.t + DELAY_DIRECT / 1000 });
    if (gold.length) g.gold = gold;
    // Refunds aren't sent: worked out here from what each tower cost.
    for (const t of g.towers) t.spent = TOWERS[t.kind].cost.slice(0, t.level).reduce((a, b) => a + b, 0);
    if (typeof d.l === 'number') g.lives = d.l;
    if (typeof d.w === 'number') g.wave = d.w;
    g.phase = d.ph === 1 ? 'wave' : 'build';
    if (typeof d.cd === 'number') g.countdown = d.cd;
    g.speed = d.sp === 2 ? 2 : 1;
    g.over = !!d.ov;
    gm.partnerCur = parseCur(d.cur);
  }

  const parseCur = (v: unknown): [number, number] | null =>
    Array.isArray(v) && v.length === 2 && v.every((x) => Number.isInteger(x)) ? [v[0] as number, v[1] as number] : null;

  /** The host doing what a player asked: `owner` is who asked. */
  function act(owner: number, a: Action) {
    const g = game.current.g;
    let ok = false;
    if (a.a === 'build') ok = build(g, owner, a.kind, a.c, a.row);
    else if (a.a === 'up') ok = upgrade(g, owner, a.id);
    else if (a.a === 'sell') ok = sell(g, owner, a.id);
    else if (a.a === 'next') { ok = g.phase === 'build'; callWave(g); }
    else { g.speed = g.speed === 1 ? 2 : 1; ok = true; }
    if (ok && owner === index) {
      if (a.a === 'build') playSelect(); else if (a.a === 'up') playCoin(); else if (a.a === 'sell') playStomp(); else if (a.a === 'next') playJump();
    }
    if (a.a === 'sell' && ok && selRef.current === a.id) selRef.current = null;
  }

  /** Mine to do, or the host's to do for me. */
  function request(a: Action) {
    const gm = game.current;
    if (gm.g.over) return;
    if (host) { act(index, a); publishHud(); return; }
    peer.current?.sendSure({ k: 'act', r: gm.round, ...a });
    if (a.a === 'build') playSelect(); else if (a.a === 'up') playCoin(); else if (a.a === 'sell') { playStomp(); if (selRef.current === a.id) selRef.current = null; } else if (a.a === 'next') playJump();
  }

  function restart(round: number) {
    game.current = newGame(round, players);
    selRef.current = null;
    setHud((h) => ({ ...h, over: false, sel: null }));
  }
  const again = () => {
    const r = game.current.round + 1;
    peer.current?.sendSure({ k: 'again', r });
    restart(r);
  };

  /** A tile picked (clicked, tapped, or Enter on the cursor). */
  function pick(c: number, r: number) {
    const g = game.current.g;
    const t = towerAt(g, c, r);
    if (t) { select(selRef.current === t.id ? null : t.id); return; }
    const kind = buildRef.current;
    if (kind && canBuild(g, c, r) && (g.gold[index] ?? 0) >= TOWERS[kind].cost[0]) { request({ a: 'build', kind, c, row: r }); return; }
    select(null);
  }

  function step(now: number) {
    const gm = game.current;
    const g = gm.g;
    gm.t += STEP;
    gm.steps += 1;
    if (host && !g.over) {
      for (let i = 0; i < g.speed; i++) stepGuard(g, STEP);
      for (const s of g.shots) { gm.fx.push({ ...s, t0: gm.t }); gm.outbox.push({ ...s, t0: gm.t }); }
      g.shots = [];
    }
    if (g.lives < gm.lives) playHurt();
    gm.lives = g.lives;

    if (peer.current && link && gm.steps % SEND_DIRECT === 0) {
      const cur = cursor.current;
      if (host) {
        const r1 = (v: number) => Math.round(v * 10) / 10;
        peer.current.sendFast({
          k: 's', r: gm.round,
          e: g.enemies.flatMap((e) => [e.id, ENEMY_KINDS.indexOf(e.kind), r1(e.x), r1(e.y), Math.ceil(e.hp), e.max, e.slowT > 0 ? 1 : 0]),
          tw: g.towers.flatMap((t) => [t.id, t.owner, TOWER_KINDS.indexOf(t.kind), t.level, t.c, t.r, Math.round(t.aim * 100)]),
          sh: gm.outbox.flatMap((s) => [TOWER_KINDS.indexOf(s.kind), r1(s.x0), r1(s.y0), r1(s.x1), r1(s.y1)]),
          g: g.gold, l: g.lives, w: g.wave, ph: g.phase === 'wave' ? 1 : 0, cd: Math.round(g.countdown * 10) / 10, sp: g.speed, ov: g.over, cur,
        });
        gm.outbox = [];
      } else {
        peer.current.sendFast({ k: 'c', r: gm.round, cur });
      }
    }
    gm.fx = gm.fx.filter((f) => gm.t - f.t0 < SHOT_LIFE[f.kind]);
    gm.puffs = gm.puffs.filter((p) => gm.t - p.t0 < 0.35);
    void now;
  }

  /** The monsters as this player sees them: the host's own, or the host's a moment ago. */
  function shownEnemies(now: number): (EnemyView & { id: number })[] {
    const gm = game.current;
    if (host) return gm.g.enemies.map((e) => ({ id: e.id, kind: e.kind, x: e.x, y: e.y, hp: e.hp, max: e.max, slowed: e.slowT > 0 }));
    const snaps = gm.snaps;
    if (!snaps.length) return [];
    const at = now - DELAY_DIRECT;
    let a = snaps[snaps.length - 1], b = a;
    for (let i = snaps.length - 1; i > 0; i--) if (snaps[i - 1].t <= at) { a = snaps[i - 1]; b = snaps[i]; break; }
    if (at < snaps[0].t) a = b = snaps[0];
    const k = b.t === a.t ? 1 : Math.max(0, Math.min(1, (at - a.t) / (b.t - a.t)));
    return [...b.enemies].map(([id, q]) => {
      const p = a.enemies.get(id);
      return { id, ...q, x: p ? p.x + (q.x - p.x) * k : q.x, y: p ? p.y + (q.y - p.y) * k : q.y };
    });
  }

  function draw(now: number) {
    const cv = canvas.current;
    const c = cv?.getContext('2d');
    if (!cv || !c) return;
    c.imageSmoothingEnabled = false;
    const gm = game.current;
    const g = gm.g;
    drawGround(c);

    const enemies = shownEnemies(now);
    // Monsters gone since last frame, short of the gate, went up in smoke.
    const seen = new Map<number, { x: number; y: number }>();
    for (const e of enemies) seen.set(e.id, { x: e.x, y: e.y });
    for (const [id, p] of gm.seen) if (!seen.has(id) && p.x < W - 2 * T) gm.puffs.push({ ...p, t0: gm.t });
    gm.seen = seen;

    const sel = selRef.current !== null ? g.towers.find((t) => t.id === selRef.current) : undefined;
    if (sel) drawRange(c, sel.c, sel.r, TOWERS[sel.kind].range[sel.level - 1], true);
    const cur = cursor.current;
    const kind = buildRef.current;
    if (cur && kind) drawRange(c, cur[0], cur[1], TOWERS[kind].range[0], canBuild(g, cur[0], cur[1]));

    for (const t of g.towers) drawTower(c, t.kind, t.level, t.c, t.r, t.owner, t.aim, gm.t);
    for (const e of [...enemies].sort((p, q) => p.y - q.y)) drawEnemy(c, e.kind, e.x, e.y, gm.t, e.id, e.hp / e.max, e.slowed);
    for (const f of gm.fx) {
      const k = (gm.t - f.t0) / SHOT_LIFE[f.kind];
      if (k >= 0 && k <= 1) drawShot(c, f.kind, f.x0, f.y0, f.x1, f.y1, k);
    }
    for (const p of gm.puffs) {
      const k = (gm.t - p.t0) / 0.35;
      c.fillStyle = `rgba(240,235,220,${0.7 * (1 - k)})`;
      for (let i = 0; i < 5; i++) c.fillRect(Math.round(p.x + Math.cos(i * 1.3) * 6 * k), Math.round(p.y + Math.sin(i * 1.3) * 6 * k), 2, 2);
    }
    if (gm.partnerCur) drawCursor(c, gm.partnerCur[0], gm.partnerCur[1], OWNER_COLORS[1 - index], true);
    if (cur) drawCursor(c, cur[0], cur[1], kind && !canBuild(g, cur[0], cur[1]) && !towerAt(g, cur[0], cur[1]) ? '#ff6b6b' : '#ffffff');
  }

  function publishHud() {
    const g = game.current.g;
    const t = selRef.current !== null ? g.towers.find((x) => x.id === selRef.current) : undefined;
    if (selRef.current !== null && !t) selRef.current = null;
    const next: Hud = {
      lives: g.lives, wave: g.wave, phase: g.phase, countdown: Math.max(0, Math.ceil(g.countdown)), gold: [...g.gold], speed: g.speed, over: g.over,
      sel: t ? { id: t.id, kind: t.kind, level: t.level, mine: t.owner === index, up: upgradeCost(t), refund: refund(t) } : null,
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

  // Keys: 1–4 a tower, arrows/WASD the cursor, Enter builds or picks, U
  // upgrade, X sell, Space the next wave, F speed, Esc lets go. At the end,
  // R/Enter plays again and Esc leaves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (el && el.closest?.('input, textarea, [contenteditable]'))) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const gm = game.current;
      let done = true;
      if (gm.g.over || left) {
        if (k === 'Escape') onClose();
        else if (!left && (k === 'r' || k === 'Enter')) again();
        else done = false;
      } else if (['1', '2', '3', '4'].includes(k)) {
        const kind = TOWER_KINDS[Number(k) - 1];
        setBuildKind(buildRef.current === kind ? null : kind);
        if (!cursor.current) cursor.current = [8, 6];
      } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'].includes(k)) {
        const [c, r] = cursor.current ?? [8, 6];
        const dc = k === 'ArrowLeft' || k === 'a' ? -1 : k === 'ArrowRight' || k === 'd' ? 1 : 0;
        const dr = k === 'ArrowUp' || k === 'w' ? -1 : k === 'ArrowDown' || k === 's' ? 1 : 0;
        cursor.current = [Math.max(0, Math.min(COLS - 1, c + dc)), Math.max(0, Math.min(ROWS - 1, r + dr))];
      } else if (k === 'Enter') {
        if (cursor.current) pick(cursor.current[0], cursor.current[1]); else cursor.current = [8, 6];
      } else if (k === 'u' && selRef.current !== null) request({ a: 'up', id: selRef.current });
      else if ((k === 'x' || k === 'Delete' || k === 'Backspace') && selRef.current !== null) request({ a: 'sell', id: selRef.current });
      else if (k === ' ' || k === 'n') request({ a: 'next' });
      else if (k === 'f') request({ a: 'speed' });
      else if (k === 'Escape' && (buildRef.current || selRef.current !== null)) { setBuildKind(null); select(null); }
      else done = false;
      if (done) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const tileOf = (e: PointerEvent): [number, number] => {
    const r = canvas.current!.getBoundingClientRect();
    return [
      Math.max(0, Math.min(COLS - 1, Math.floor(((e.clientX - r.left) / r.width) * COLS))),
      Math.max(0, Math.min(ROWS - 1, Math.floor(((e.clientY - r.top) / r.height) * ROWS))),
    ];
  };
  const pointer = {
    onPointerMove: (e: PointerEvent) => { cursor.current = tileOf(e); },
    onPointerDown: (e: PointerEvent) => { e.preventDefault(); const [c, r] = tileOf(e); cursor.current = [c, r]; pick(c, r); },
    onPointerLeave: (e: PointerEvent) => { if (e.pointerType === 'mouse') cursor.current = null; },
  };

  const overlay = (children: ReactNode) => (
    <div className="absolute inset-0 flex items-center justify-center bg-black/55 p-4">
      <div className="px-notch px-frame p-4 w-full max-w-[320px] text-center px-in-up">{children}</div>
    </div>
  );
  const myGold = hud.gold[index] ?? 0;
  const coin = <span className="text-[var(--px-gold)] inline-flex"><PixelIcon rows={ICONS.coin} size={1} /></span>;

  return (
    <div className="px px-frame absolute inset-0 z-40 flex flex-col select-none" onKeyDown={(e) => e.stopPropagation()}>
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 pt-[calc(0.5rem+var(--sat,0px))] pb-1.5 pl-[calc(0.75rem+var(--sal,0px))] pr-[calc(0.75rem+var(--sar,0px))]">
        <p className="px-title !text-[16px] text-[var(--px-gold)] flex items-center gap-2 min-w-0">
          <PixelIcon name="gate" size={2} /> <span className="truncate"><FormattedMessage id="world.guardTitle" /></span>
        </p>
        <div className="flex items-center gap-3 text-[13px] px-num">
          <span className="flex items-center gap-1 text-[#ff8a8a]"><PixelIcon rows={ICONS.heart} size={1} /> {hud.lives}</span>
          <span className="text-[var(--px-muted)]"><FormattedMessage id="world.guardWave" values={{ n: hud.wave }} /></span>
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
        <canvas ref={canvas} width={W} height={H} {...pointer} style={{ width: fit.w, height: fit.h, imageRendering: 'pixelated', touchAction: 'none', cursor: buildKind ? 'crosshair' : 'pointer' }} />
        {started && hud.wave === 0 && !hud.over && (
          <p className="absolute top-2 left-1/2 -translate-x-1/2 max-w-[92%] text-center text-[12px] px-2 py-1 bg-black/60 pointer-events-none">
            <FormattedMessage id="world.guardHint" />
          </p>
        )}
        {!started && !left && overlay(<PixelLoader label={<FormattedMessage id="world.duelWaiting" values={{ name: partnerName }} />} />)}
        {started && !playing && !left && overlay(<NetWait state={net} name={partnerName} onLeave={onClose} detail={netDetail} />)}
        {left && overlay(
          <>
            <p className="text-[14px] mb-3"><FormattedMessage id="world.duelLeft" values={{ name: partnerName }} /></p>
            <PixelButton tone="jade" block onClick={onClose}><FormattedMessage id="world.duelDone" /> <Kbd>Esc</Kbd></PixelButton>
          </>,
        )}
        {hud.over && !left && overlay(
          <>
            <p className="px-title !text-[20px] mb-3 text-[#ff8a8a]"><FormattedMessage id="world.guardOver" values={{ n: hud.wave }} /></p>
            <div className="grid grid-cols-2 gap-2">
              <PixelButton tone="gold" onClick={again}><FormattedMessage id="world.rooftopAgain" /> <Kbd>R</Kbd></PixelButton>
              <PixelButton tone="paper" onClick={onClose}><FormattedMessage id="world.duelDone" /> <Kbd>Esc</Kbd></PixelButton>
            </div>
          </>,
        )}
      </div>

      {/* The build bar: your gold, the four towers, the chosen tower, the next wave. */}
      <div className="shrink-0 px-3 pt-2 pb-[calc(0.5rem+var(--sab,0px))] pl-[calc(0.75rem+var(--sal,0px))] pr-[calc(0.75rem+var(--sar,0px))] flex flex-wrap items-center gap-2 text-[12px]">
        <span className="flex items-center gap-1 px-num" style={{ color: OWNER_COLORS[index] }}>{coin} {myGold}</span>
        {!solo && <span className="flex items-center gap-1 px-num opacity-80 max-w-[110px] truncate" style={{ color: OWNER_COLORS[1 - index] }}>{partnerName}: {hud.gold[1 - index] ?? 0}</span>}
        <div className="flex gap-1.5 flex-wrap">
          {TOWER_KINDS.map((k, i) => (
            <PixelButton
              key={k}
              tone={buildKind === k ? 'gold' : 'paper'}
              disabled={myGold < TOWERS[k].cost[0]}
              onClick={() => setBuildKind(buildKind === k ? null : k)}
              className="!px-2 !py-1 !text-[12px]"
            >
              <FormattedMessage id={`world.guardTower.${k}`} /> <span className="px-num opacity-80">{TOWERS[k].cost[0]}</span> <Kbd>{i + 1}</Kbd>
            </PixelButton>
          ))}
        </div>
        {hud.sel && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-num">
              <FormattedMessage id="world.guardLevel" values={{ tower: <FormattedMessage id={`world.guardTower.${hud.sel.kind}`} />, n: hud.sel.level }} />
              {!hud.sel.mine && <> · <FormattedMessage id="world.guardTheirs" values={{ name: partnerName }} /></>}
            </span>
            {hud.sel.mine && (
              <>
                <PixelButton tone="jade" disabled={hud.sel.up === null || myGold < hud.sel.up} onClick={() => request({ a: 'up', id: hud.sel!.id })} className="!px-2 !py-1 !text-[12px]">
                  {hud.sel.up === null ? <FormattedMessage id="world.guardMax" /> : <FormattedMessage id="world.guardUpgrade" values={{ cost: hud.sel.up }} />} <Kbd>U</Kbd>
                </PixelButton>
                <PixelButton tone="paper" onClick={() => request({ a: 'sell', id: hud.sel!.id })} className="!px-2 !py-1 !text-[12px]">
                  <FormattedMessage id="world.guardSell" values={{ n: hud.sel.refund }} /> <Kbd>X</Kbd>
                </PixelButton>
              </>
            )}
          </div>
        )}
        <div className="ml-auto flex gap-1.5">
          <PixelButton tone="paper" onClick={() => request({ a: 'speed' })} className="!px-2 !py-1 !text-[12px]">×{hud.speed} <Kbd>F</Kbd></PixelButton>
          <PixelButton tone="jade" disabled={hud.phase !== 'build'} onClick={() => request({ a: 'next' })} className="!px-2 !py-1 !text-[12px]">
            {hud.phase === 'build'
              ? <><FormattedMessage id="world.guardNext" /> <span className="px-num opacity-80">{hud.countdown}s</span></>
              : <FormattedMessage id="world.guardMarching" values={{ n: hud.wave }} />}
            <Kbd>Space</Kbd>
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
