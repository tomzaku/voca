import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { BALL_R, canPlace, groupOf, HEAD_X, POCKET_R, POCKETS, TABLE_H, TABLE_W, type Ball } from '../../lib/pool';
import { PixelBar, PixelButton } from './pixel';

/** Each ball's colour; 9–15 are the same colours as a band on white. */
const COLOR: Record<number, string> = {
  0: '#f6f1e4', 1: '#f2c230', 2: '#2f5fd0', 3: '#d43a30', 4: '#7a3fb0', 5: '#f08a24', 6: '#2e9a4e', 7: '#8a2a2a', 8: '#1a1a1e',
};
const colorOf = (id: number) => COLOR[id > 8 ? id - 8 : id];

/** Space round the cloth, in table units: the wooden rail. */
const RAIL = 9;

/**
 * The table, drawn on a canvas and played with the pointer: move over the
 * cloth to preview a direction (a guide line runs to the first ball or
 * cushion, with a ghost ball where they'd meet), click or tap to LOCK it,
 * then hold Shoot to charge the power and let go to strike. Locked or
 * charging, the pointer can wander — over to the Shoot button, say — without
 * moving the aim; click the cloth again to re-aim. With the ball in hand,
 * drag the cue ball to place it first.
 *
 * It only shows and aims; the rules are the caller's (lib/pool). A shot to
 * replay comes in as `replay` — frames of positions — and plays through at
 * the speed it was simulated, then `onReplayed`.
 */
export function PoolTable({ balls, canShoot, inHand, breaking, targets, replay, onReplayed, onShoot }: {
  balls: Ball[];
  /** It's your shot and the table is still. */
  canShoot: boolean;
  /** You may move the cue ball before shooting. */
  inHand: boolean;
  /** On the break, the cue ball stays behind the head string. */
  breaking: boolean;
  /** The balls you're allowed to hit first — ringed, so you know. */
  targets: number[];
  replay: Ball[][] | null;
  onReplayed: () => void;
  onShoot: (angle: number, power: number, cue: { x: number; y: number }) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const [angle, setAngle] = useState(0);
  const [cue, setCue] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  // A clicked direction stays put until the next click.
  const [locked, setLocked] = useState(false);
  const [charge, setCharge] = useState<number | null>(null);   // ms the shot began charging
  const [now, setNow] = useState(0);
  const [frame, setFrame] = useState(0);

  // The cue ball as shown: where you've placed it, or where it lies.
  const lying = balls.find((b) => b.id === 0)!;
  const cueAt = cue ?? { x: lying.x, y: lying.y };
  useEffect(() => { setCue(null); setLocked(false); }, [balls]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.min(720, el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = width / (TABLE_W + RAIL * 2);
  const height = (TABLE_H + RAIL * 2) * scale;
  const toPx = useCallback((x: number) => (x + RAIL) * scale, [scale]);

  // A shot replaying: one frame per animation frame.
  useEffect(() => {
    if (!replay) return;
    setFrame(0);
    let i = 0, raf = 0;
    const tick = () => {
      i++;
      if (i >= replay.length) { onReplayed(); return; }
      setFrame(i);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per shot
  }, [replay]);

  // Charging: the power swings up and back while Shoot is held.
  useEffect(() => {
    if (charge === null) return;
    let raf = 0;
    const tick = () => { setNow(performance.now()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [charge]);
  const power = charge === null ? 0 : (() => { const t = ((now - charge) / 1600) % 2; return Math.max(0.05, t < 1 ? t : 2 - t); })();

  const shown = replay ? replay[Math.min(frame, replay.length - 1)] : balls.map((b) => (b.id === 0 ? { ...b, ...cueAt } : b));
  const aiming = canShoot && !replay;

  /** Where the aim line meets the first ball or cushion. */
  const guide = (() => {
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let best = Infinity, hit: Ball | null = null;
    for (const b of shown) {
      if (b.id === 0 || b.down) continue;
      // Ray against a circle of radius 2R round the ball's centre.
      const fx = cueAt.x - b.x, fy = cueAt.y - b.y;
      const bq = fx * dx + fy * dy;
      const c = fx * fx + fy * fy - (BALL_R * 2) ** 2;
      const disc = bq * bq - c;
      if (disc < 0) continue;
      const t = -bq - Math.sqrt(disc);
      if (t > 0 && t < best) { best = t; hit = b; }
    }
    const wall = Math.min(
      dx > 0 ? (TABLE_W - BALL_R - cueAt.x) / dx : dx < 0 ? (BALL_R - cueAt.x) / dx : Infinity,
      dy > 0 ? (TABLE_H - BALL_R - cueAt.y) / dy : dy < 0 ? (BALL_R - cueAt.y) / dy : Infinity,
    );
    const t = Math.min(best, wall);
    return { x: cueAt.x + dx * t, y: cueAt.y + dy * t, hit: best <= wall ? hit : null };
  })();

  // Draw.
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(width * dpr);
    cv.height = Math.round(height * dpr);
    const c = cv.getContext('2d')!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Rail and cloth.
    c.fillStyle = '#5a3420'; c.fillRect(0, 0, width, height);
    c.fillStyle = '#7a4a2c'; c.fillRect(scale * 2, scale * 2, width - scale * 4, height - scale * 4);
    c.fillStyle = '#1f7a4a'; c.fillRect(toPx(0), toPx(0), TABLE_W * scale, TABLE_H * scale);
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(toPx(0), toPx(0), TABLE_W * scale, 2 * scale);
    // The head string and foot spot, faintly.
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(toPx(HEAD_X), toPx(0)); c.lineTo(toPx(HEAD_X), toPx(TABLE_H)); c.stroke();
    // Diamonds on the rail.
    c.fillStyle = '#e8d8a8';
    for (let i = 1; i < 8; i++) if (i !== 4) { c.fillRect(toPx((TABLE_W / 8) * i) - 1.5, scale * 3.5, 3, 3); c.fillRect(toPx((TABLE_W / 8) * i) - 1.5, height - scale * 3.5 - 3, 3, 3); }
    // Pockets.
    c.fillStyle = '#0c0c0e';
    for (const p of POCKETS) { c.beginPath(); c.arc(toPx(p.x), toPx(p.y), POCKET_R * scale, 0, Math.PI * 2); c.fill(); }

    // Aim: the guide line and a ghost ball where it meets the first ball.
    if (aiming && !dragging) {
      // Dashed white while previewing; solid gold once locked.
      c.setLineDash(locked ? [] : [4, 4]); c.strokeStyle = locked ? 'rgba(255,214,90,0.95)' : 'rgba(255,255,255,0.7)'; c.lineWidth = locked ? 2 : 1.5;
      c.beginPath(); c.moveTo(toPx(cueAt.x), toPx(cueAt.y)); c.lineTo(toPx(guide.x), toPx(guide.y)); c.stroke();
      c.setLineDash([]);
      if (guide.hit) {
        c.strokeStyle = 'rgba(255,255,255,0.6)';
        c.beginPath(); c.arc(toPx(guide.x), toPx(guide.y), BALL_R * scale, 0, Math.PI * 2); c.stroke();
        // Where the object ball will head.
        const nx = guide.hit.x - guide.x, ny = guide.hit.y - guide.y, n = Math.hypot(nx, ny) || 1;
        c.strokeStyle = 'rgba(255,230,140,0.75)';
        c.beginPath(); c.moveTo(toPx(guide.hit.x), toPx(guide.hit.y)); c.lineTo(toPx(guide.hit.x + (nx / n) * 22), toPx(guide.hit.y + (ny / n) * 22)); c.stroke();
      }
      // The cue, pulled back by the power.
      const back = (BALL_R + 3 + power * 18) * scale;
      const ex = toPx(cueAt.x) - Math.cos(angle) * back, ey = toPx(cueAt.y) - Math.sin(angle) * back;
      c.strokeStyle = '#d8b878'; c.lineWidth = Math.max(2, scale * 1.2); c.lineCap = 'round';
      c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex - Math.cos(angle) * 70 * scale, ey - Math.sin(angle) * 70 * scale); c.stroke();
      c.lineCap = 'butt';
    }

    // Balls.
    for (const b of shown) {
      if (b.down) continue;
      const x = toPx(b.x), y = toPx(b.y), r = BALL_R * scale;
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.arc(x + 1, y + 1.5, r, 0, Math.PI * 2); c.fill();
      const stripe = b.id > 8;
      c.fillStyle = stripe ? '#f6f1e4' : colorOf(b.id);
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      if (stripe) {
        c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.clip();
        c.fillStyle = colorOf(b.id); c.fillRect(x - r, y - r * 0.5, r * 2, r);
        c.restore();
      }
      if (b.id !== 0 && r > 4) {
        c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r * 0.45, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#111'; c.font = `bold ${Math.max(6, r * 0.75)}px monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(String(b.id), x, y + 0.5);
      }
      c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2); c.fill();
      // A ring round the balls you may hit first.
      if (aiming && targets.includes(b.id)) {
        c.strokeStyle = 'rgba(255,214,90,0.8)'; c.lineWidth = 1.2;
        c.beginPath(); c.arc(x, y, r + 1.8, 0, Math.PI * 2); c.stroke();
      }
    }
    // The cue ball in hand: a dashed ring says you can move it.
    if (aiming && inHand) {
      c.setLineDash([3, 3]); c.strokeStyle = canPlace(balls, cueAt, breaking) ? '#9dff6a' : '#ff5a5a'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(toPx(cueAt.x), toPx(cueAt.y), (BALL_R + 2.5) * scale, 0, Math.PI * 2); c.stroke();
      c.setLineDash([]);
    }
  });

  const toTable = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale - RAIL, y: (e.clientY - r.top) / scale - RAIL };
  };
  const down = (e: React.PointerEvent) => {
    if (!aiming || charge !== null) return;
    const p = toTable(e);
    if (inHand && Math.hypot(p.x - cueAt.x, p.y - cueAt.y) < BALL_R * 3) {
      setDragging(true);
      setLocked(false);
      (e.target as Element).setPointerCapture(e.pointerId);
      return;
    }
    // Click (or tap) to aim there and lock it.
    setAngle(Math.atan2(p.y - cueAt.y, p.x - cueAt.x));
    setLocked(true);
  };
  const move = (e: React.PointerEvent) => {
    if (!aiming) return;
    const p = toTable(e);
    if (dragging) {
      const x = Math.max(BALL_R, Math.min(TABLE_W - BALL_R, p.x)), y = Math.max(BALL_R, Math.min(TABLE_H - BALL_R, p.y));
      setCue({ x: breaking ? Math.min(x, HEAD_X) : x, y });
      return;
    }
    // Preview only: a locked aim, or one being charged, doesn't follow the mouse.
    if (e.pointerType === 'mouse' && !locked && charge === null) setAngle(Math.atan2(p.y - cueAt.y, p.x - cueAt.x));
  };
  const up = () => setDragging(false);

  const placeOk = !inHand || canPlace(balls, cueAt, breaking);
  const startCharge = () => { if (aiming && placeOk && charge === null) { setCharge(performance.now()); setNow(performance.now()); } };
  const release = () => {
    if (charge === null) return;
    const p = power;
    setCharge(null);
    onShoot(angle, p, cueAt);
  };

  // Space charges too; ← → nudge the aim for a fine shot.
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) { e.preventDefault(); startCharge(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (charge !== null) return;
        setLocked(true);
        setAngle((a) => a + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 0.02 : 0.004));
      }
    };
    const ku = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); release(); } };
    window.addEventListener('keydown', kd, true);
    window.addEventListener('keyup', ku, true);
    return () => { window.removeEventListener('keydown', kd, true); window.removeEventListener('keyup', ku, true); };
  });

  return (
    <div ref={wrap} className="w-full select-none">
      <canvas
        ref={canvas}
        style={{ width, height, touchAction: 'none' }}
        className="block mx-auto cursor-crosshair"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />
      <div className="flex items-center gap-3 mt-3" style={{ maxWidth: width, marginInline: 'auto' }}>
        <PixelButton
          tone="gold"
          disabled={!aiming || !placeOk}
          onPointerDown={(e) => { e.preventDefault(); startCharge(); }}
          onPointerUp={release}
          onPointerLeave={release}
          className="!px-4 !py-2 !text-[14px] shrink-0"
        >
          <FormattedMessage id={charge === null ? 'world.poolShoot' : 'world.poolRelease'} />
        </PixelButton>
        <div className="flex-1"><PixelBar pct={Math.round(power * 100)} color="var(--px-gold)" /></div>
      </div>
      {aiming && (
        <p className="text-[11px] opacity-70 mt-1.5 text-center">
          {locked && <span className="text-[var(--px-gold)]">🔒 <FormattedMessage id="world.poolLocked" /> · </span>}
          <FormattedMessage id={inHand && !locked ? 'world.poolHintInHand' : locked ? 'world.poolHintLocked' : 'world.poolHint'} />
        </p>
      )}
    </div>
  );
}

/** "Solids" / "Stripes" as a little row of their balls, for the player strip. */
export function GroupChip({ group, balls }: { group: 'solids' | 'stripes' | null; balls: Ball[] }) {
  if (!group) return <span className="text-[11px] opacity-70"><FormattedMessage id="world.poolOpen" /></span>;
  const ids = group === 'solids' ? [1, 2, 3, 4, 5, 6, 7] : [9, 10, 11, 12, 13, 14, 15];
  return (
    <span className="flex gap-0.5" title={group}>
      {ids.map((id) => {
        const down = balls.find((b) => b.id === id)?.down;
        return (
          <span
            key={id}
            className={`w-2.5 h-2.5 rounded-full ${down ? 'opacity-25' : ''}`}
            style={{ background: groupOf(id) === 'stripes' ? `linear-gradient(#f6f1e4 30%, ${colorOf(id)} 30% 70%, #f6f1e4 70%)` : colorOf(id) }}
          />
        );
      })}
    </span>
  );
}
