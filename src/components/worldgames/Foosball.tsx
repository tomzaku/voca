import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { arm, BALL_R, earnPower, FOOT_X, FOOT_Y, GOAL, H, menOf, newMatch, restart, step, W, WIN_SCORE, type FoosState, type Level } from '../../lib/foosball';
import { playCorrect, playSelect, playWin, playWrong } from '../../lib/sfx';
import type { WordQuestion } from '../../lib/questionsApi';
import { PixelButton, PixelChip, PixelIcon } from './pixel';
import { useWordQuestions } from '../../hooks/useWordQuestions';
import { WordQuestionCard } from './WordQuestion';

const STEP_MS = 1000 / 120;
const RAIL = 4;
const LEVELS: Level[] = ['easy', 'normal', 'hard'];

/**
 * Foosball (bi lắc) at the street table, against the computer. Your rods
 * follow your pointer up and down; click, tap or Space kicks with all of
 * them — the one at the ball strikes. After each goal a word question comes
 * before the kick-off: answer it right for a power shot (armed with the
 * button or Shift, spent on your next kick). The rules are lib/foosball.
 */
export function Foosball({ onClose }: { onClose: () => void }) {
  const [level, setLevel] = useState<Level | null>(null);
  const [game, setGame] = useState<FoosState>(() => newMatch());
  const live = useRef(game);
  const input = useRef({ y: H / 2, kick: false });
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [question, setQuestion] = useState<WordQuestion | null>(null);
  // From the server, sealed, from the collection you're studying; none, and kick-offs just go on.
  const { next: nextQuestion } = useWordQuestions(6);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.min(760, el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The match clock: fixed steps, however fast the screen draws.
  const paused = !level || !!question || !!game.scored || !!game.winner;
  useEffect(() => {
    if (paused) return;
    let raf = 0, last = performance.now(), acc = 0;
    const tick = (now: number) => {
      acc += Math.min(100, now - last);
      last = now;
      let s = live.current;
      while (acc >= STEP_MS) {
        s = step(s, input.current, level!);
        input.current.kick = false;
        acc -= STEP_MS;
        if (s.scored) break;
      }
      live.current = s;
      setGame(s);
      if (!s.scored) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, level]);

  // A goal: a moment to see it, then the question (or straight on).
  const scored = game.scored;
  useEffect(() => {
    if (!scored) return;
    if (scored === 'you') playCorrect(); else playWrong();
    if (game.winner) { if (game.winner === 'you') playWin(); return; }
    const t = window.setTimeout(() => {
      const q = nextQuestion();
      if (q) setQuestion(q);
      else { live.current = restart(live.current); setGame(live.current); }
    }, 1300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per goal
  }, [scored, game.score.you, game.score.cpu]);

  const answered = (right: boolean) => {
    let s = restart(live.current);
    if (right) s = earnPower(s);
    live.current = s;
    setGame(s);
    setQuestion(null);
  };

  const kick = () => { input.current.kick = true; };
  const toggleArm = () => { live.current = arm(live.current); setGame(live.current); playSelect(); };

  // Keys: Space kicks, Shift arms the power shot, ↑ ↓ move.
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); kick(); }
      if (e.key === 'Shift' && !e.repeat) toggleArm();
      if (e.key === 'ArrowUp') { e.preventDefault(); input.current.y = Math.max(0, input.current.y - 4); }
      if (e.key === 'ArrowDown') { e.preventDefault(); input.current.y = Math.min(H, input.current.y + 4); }
    };
    window.addEventListener('keydown', kd, true);
    return () => window.removeEventListener('keydown', kd, true);
  });

  const scale = width / (W + RAIL * 2);
  const height = (H + RAIL * 2) * scale;
  const px = (v: number) => (v + RAIL) * scale;

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    input.current.y = Math.max(0, Math.min(H, (e.clientY - r.top) / scale - RAIL));
  };

  // Draw.
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(width * dpr); cv.height = Math.round(height * dpr);
    const c = cv.getContext('2d')!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // The box and the pitch, mown in stripes.
    c.fillStyle = '#3a2214'; c.fillRect(0, 0, width, height);
    for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#2e8a4a' : '#2a7f44'; c.fillRect(px((W / 12) * i), px(0), (W / 12) * scale + 1, H * scale); }
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.5;
    c.strokeRect(px(0), px(0), W * scale, H * scale);
    c.beginPath(); c.moveTo(px(W / 2), px(0)); c.lineTo(px(W / 2), px(H)); c.stroke();
    c.beginPath(); c.arc(px(W / 2), px(H / 2), 9 * scale, 0, Math.PI * 2); c.stroke();
    c.strokeRect(px(0), px(H / 2 - 14), 12 * scale, 28 * scale);
    c.strokeRect(px(W - 12), px(H / 2 - 14), 12 * scale, 28 * scale);
    // The goals: dark mouths in the end walls.
    c.fillStyle = '#0c0c0e';
    c.fillRect(px(-RAIL), px(H / 2 - GOAL / 2), RAIL * scale, GOAL * scale);
    c.fillRect(px(W), px(H / 2 - GOAL / 2), RAIL * scale, GOAL * scale);

    // The ball (under the rods, as on a real table).
    const b = game.ball;
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.arc(px(b.x) + 1, px(b.y) + 1.5, BALL_R * scale, 0, Math.PI * 2); c.fill();
    c.fillStyle = game.armed ? '#ffd23f' : '#f6f1e4'; c.beginPath(); c.arc(px(b.x), px(b.y), BALL_R * scale, 0, Math.PI * 2); c.fill();

    // Rods and their players.
    for (const r of game.rods) {
      c.strokeStyle = '#b8bcc4'; c.lineWidth = Math.max(1.5, scale * 0.7);
      c.beginPath(); c.moveTo(px(r.x), 0); c.lineTo(px(r.x), height); c.stroke();
      const mine = r.side === 'you';
      const kicking = game.t < game.kickUntil[r.side];
      const swing = kicking ? (mine ? 1 : -1) * FOOT_X * 0.9 : 0;
      for (const m of menOf(r)) {
        // The foot, swung forward while kicking.
        c.fillStyle = mine ? '#8a1414' : '#123a8a';
        c.fillRect(px(r.x - FOOT_X / 2 + swing), px(m - FOOT_Y), FOOT_X * scale, FOOT_Y * 2 * scale);
        // Shirt and head, on the rod.
        c.fillStyle = mine ? '#d42a2a' : '#2f5fd0';
        c.fillRect(px(r.x - 1.6), px(m - 1.6), 3.2 * scale, 3.2 * scale);
        c.fillStyle = '#f1c9a0';
        c.beginPath(); c.arc(px(r.x), px(m), 1 * scale, 0, Math.PI * 2); c.fill();
      }
    }
    // Your pointer's line, faint, so you can see where your team is lining up.
    if (!paused) {
      c.strokeStyle = 'rgba(255,90,90,0.25)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(px(0), px(input.current.y)); c.lineTo(px(W), px(input.current.y)); c.stroke();
    }
  });

  return (
    <div className="px absolute inset-0 z-40 flex items-end sm:items-center justify-center p-3 bg-black/25" onKeyDown={(e) => e.stopPropagation()}>
      <div className="px-notch px-frame w-full max-w-[800px] p-4 px-in-up max-h-full overflow-y-auto">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="px-title !text-[18px] text-[var(--px-gold)] flex items-center gap-2"><PixelIcon name="foos" size={2} /> <FormattedMessage id="world.foosTitle" /></p>
            <p className="text-[12px] opacity-80"><FormattedMessage id="world.foosHow" /></p>
          </div>
          <PixelButton tone="paper" onClick={onClose} className="!px-2.5 !py-1 !text-[13px] shrink-0"><FormattedMessage id="world.close" /></PixelButton>
        </div>

        {!level ? (
          <div className="py-4 text-center space-y-3">
            <p className="text-[14px]"><FormattedMessage id="world.foosPickLevel" /></p>
            <div className="flex justify-center gap-2">
              {LEVELS.map((l) => (
                <PixelChip key={l} on={false} onClick={() => { const s = newMatch('you'); live.current = s; setGame(s); setLevel(l); }}>
                  <FormattedMessage id={`world.foosLevel.${l}`} />
                </PixelChip>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2 text-[14px]">
              <span className="px-title !text-[18px]"><span className="text-[#ff7a6a]">{game.score.you}</span> <span className="opacity-60">–</span> <span className="text-[#7aa8ff]">{game.score.cpu}</span></span>
              <span className="text-[12px] opacity-70"><FormattedMessage id="world.foosFirstTo" values={{ n: WIN_SCORE }} /></span>
              <PixelButton tone={game.armed ? 'gold' : 'paper'} onClick={toggleArm} disabled={game.power === 0} className="!px-2.5 !py-1 !text-[12px]">
                <PixelIcon name="bolt" size={1} /> <FormattedMessage id="world.foosPower" values={{ n: game.power }} />
              </PixelButton>
            </div>
            <div ref={wrap} className="relative w-full select-none">
              <canvas
                ref={canvas}
                style={{ width, height, touchAction: 'none' }}
                className="block mx-auto cursor-ns-resize"
                onPointerMove={point}
                onPointerDown={(e) => { point(e); kick(); }}
              />
              {game.scored && !question && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className={`px-title !text-[34px] animate-bounce-in drop-shadow ${game.scored === 'you' ? 'text-[var(--px-gold)]' : 'text-[#7aa8ff]'}`}>
                    <FormattedMessage id={game.winner ? (game.winner === 'you' ? 'world.foosYouWin' : 'world.foosCpuWins') : game.scored === 'you' ? 'world.foosGoal' : 'world.foosTheyScore'} />
                  </p>
                </div>
              )}
            </div>
            {question && (
              <div className="mt-3 px-notch px-inset p-3">
                <WordQuestionCard
                  q={question}
                  lead={<p className="text-[13px] text-[var(--px-gold)] flex items-center gap-1.5"><PixelIcon name="bolt" size={1} /> <FormattedMessage id="world.foosEarn" /></p>}
                  onAnswered={answered}
                />
              </div>
            )}
            {game.winner && (
              <div className="mt-3 text-center">
                <PixelButton tone="gold" onClick={() => { const s = newMatch('you'); live.current = s; setGame(s); }}><FormattedMessage id="world.foosAgain" /></PixelButton>
              </div>
            )}
            {!game.winner && <p className="text-[11px] opacity-70 mt-2 text-center"><FormattedMessage id="world.foosHint" /></p>}
          </>
        )}
      </div>
    </div>
  );
}
