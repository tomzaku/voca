// Interactive mind map of the user's saved words — a Pro feature.
//
// The `mindmap` AI action (pro-gated server-side) returns a jsMind-style
// "node_tree" JSON document: themed branches with one leaf per word carrying
// an emoji + short definition. Rendering is a small custom RADIAL renderer
// (no mind-map library: they all lay out left/right columns only, and we
// want theme cards surrounding the root on ALL sides like a study poster).
// Each theme is one card listing its words; cards are distributed
// right/left/top/bottom around the center title and connected with thick
// hand-drawn SVG strokes. Pan (drag) and zoom (wheel/buttons) are hand-rolled
// on a CSS transform. Clicking a word opens its word page. Results are cached
// in localStorage per word-set so coming back doesn't spend another AI call —
// "Redraw" forces a fresh map.
//
// Each word also gets a small hand-drawn doodle image hinting at its meaning
// (the `mindmap_doodle_sheet` action → Gemini image model → base64 data URI,
// 16 words per generated image). Doodles are downscaled to thumbnails in a
// canvas and cached in localStorage PER WORD (independent of the map), so a
// doodle is only ever generated once — redrawing the map reuses them. The
// word's emoji shows as a placeholder until its doodle exists.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import './wordMindMap.css';
import { callAiAction, callAiDoodleSheet } from '../lib/aiProviders';
import { isTtsPlaying, speakText, stopSpeaking } from '../lib/tts';

interface MindMapNode {
  id: string;
  topic: string;
  emoji?: string;
  definition?: string;
  children: MindMapNode[];
}

// The user asked for this exact title in the center — the AI's generated
// title is ignored on purpose.
const ROOT_TOPIC = 'Master English Vocabulary';

// Branch line/border colors. The map canvas is always white paper (whatever
// the app theme), so these are the deeper accent variants that stay legible
// on white.
const PALETTE = ['#0bb5d6', '#8b5cf6', '#f97316', '#10b862', '#ec4899', '#3b6cff', '#f5a800', '#f43f6b'];

// Doodle generation is affordable again: words are drawn as SHEETS — one
// generated 1024px image holds a grid of up to 16 doodles, cropped apart
// server-side — so a word costs ~$0.001 instead of ~$0.02. Flip this off to
// hide the "Sketch doodles" button (cached doodles keep loading for free).
const DOODLE_GENERATION_ENABLED = true;
const SHEET_SIZE = 16; // words per generated sheet — keep in sync with SHEET_MAX server-side

const CACHE_PREFIX = 'voca-mindmap-v1:';
// v7: v3-v6 held sheet crops from failed layout attempts (invisible grids,
// non-square grids, mini-tables inside cells, and an uncapped 38-word 7x7
// sheet), so all are deliberately abandoned (NOT in the legacy list). v1/v2
// were known-good single doodles; they still migrate locally (no AI call).
const DOODLE_PREFIX = 'voca-doodle-v7:';
const DOODLE_PREFIXES_LEGACY = ['voca-doodle-v2:', 'voca-doodle-v1:'];
const DOODLE_SIZE = 192; // thumbnail px — sized for the 126px display box on retina screens
const MAX_DEPTH = 4;
const MAX_WORDS = 40; // the server's `mindmap` action caps words at 40

/** Stable cache key for a word set — order-insensitive. */
function cacheKey(words: string[]): string {
  return CACHE_PREFIX + [...words].sort().join('|').toLowerCase();
}

function doodleKey(word: string): string {
  return word.trim().toLowerCase();
}

/**
 * Turn the doodle's flat background transparent. The background color is
 * sampled from the image's own border ring rather than assumed to be pure
 * white — Gemini's "plain white background" is really off-white/cream, and
 * lossy WebP re-encoding of cached thumbs shifts it further. Alpha only ever
 * decreases, so re-running this on an already-keyed thumbnail is safe.
 */
function keyOutBackground(ctx: CanvasRenderingContext2D, size: number): void {
  const imgData = ctx.getImageData(0, 0, size, size);
  const px = imgData.data;

  // Background estimate: average the border-ring pixels that are still
  // opaque (skips already-transparent areas of re-processed thumbs) and
  // light (skips ink strokes crossing the edge).
  let r = 0, g = 0, b = 0, n = 0;
  const sample = (x: number, y: number) => {
    const i = (y * size + x) * 4;
    if (px[i + 3] < 200) return;
    if ((px[i] + px[i + 1] + px[i + 2]) / 3 < 128) return;
    r += px[i];
    g += px[i + 1];
    b += px[i + 2];
    n += 1;
  };
  for (let x = 0; x < size; x++) for (const y of [0, 1, size - 2, size - 1]) sample(x, y);
  for (let y = 2; y < size - 2; y++) for (const x of [0, 1, size - 2, size - 1]) sample(x, y);
  const bg = n > 0 ? [r / n, g / n, b / n] : [255, 255, 255];

  for (let i = 0; i < px.length; i += 4) {
    const dist = Math.max(
      Math.abs(px[i] - bg[0]),
      Math.abs(px[i + 1] - bg[1]),
      Math.abs(px[i + 2] - bg[2]),
    );
    // Within ~20 of the background (compression noise, paper texture) →
    // transparent; ramp up to fully opaque by 64 to avoid hard halos.
    const alpha = dist <= 20 ? 0 : dist >= 64 ? 255 : Math.round(((dist - 20) / 44) * 255);
    px[i + 3] = Math.min(px[i + 3], alpha);
  }
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Downscale a (large) generated image to a small square thumbnail data URI
 * with its background keyed out, so the doodle floats on the map instead of
 * sitting in a pale box.
 */
function shrinkDataUri(dataUri: string, size = DOODLE_SIZE): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUri);
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      keyOutBackground(ctx, size);
      // toDataURL silently falls back to PNG where WebP isn't supported —
      // both formats keep the alpha channel.
      resolve(canvas.toDataURL('image/webp', 0.8));
    };
    img.onerror = () => reject(new Error('Could not decode doodle image.'));
    img.src = dataUri;
  });
}

/** Coerce one parsed JSON node into a MindMapNode, dropping anything malformed. */
function toNode(raw: unknown, depth: number, fallbackId: string): MindMapNode | null {
  if (depth > MAX_DEPTH || typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const topic = typeof o.topic === 'string' ? o.topic.trim() : '';
  if (!topic) return null;
  const children = Array.isArray(o.children)
    ? o.children
        .map((c, i) => toNode(c, depth + 1, `${fallbackId}-${i}`))
        .filter((c): c is MindMapNode => c !== null)
    : [];
  return {
    id: typeof o.id === 'string' && o.id ? o.id : fallbackId,
    topic,
    emoji: typeof o.emoji === 'string' ? o.emoji : undefined,
    definition: typeof o.definition === 'string' ? o.definition : undefined,
    children,
  };
}

/** Parse the AI response — accepts the jsMind envelope or a bare root node. */
function parseMindMap(text: string): MindMapNode {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('The AI returned an unreadable mind map — try redrawing.');
  }
  const rootRaw = (parsed as Record<string, unknown>)?.data ?? parsed;
  const root = toNode(rootRaw, 0, 'root');
  if (!root || root.children.length === 0) {
    throw new Error('The AI returned an empty mind map — try redrawing.');
  }
  return root;
}

// ─── Radial renderer ─────────────────────────────────────────────────

interface Pt { x: number; y: number }

/**
 * One wavy hand-drawn marker stroke between two points. The wobble is seeded
 * (per branch index) so re-renders don't make the lines jiggle.
 */
function sketchPath(from: Pt, to: Pt, seed: number): string {
  const wobble = (k: number, amp: number) => Math.sin(seed + k * 2.1) * amp;
  const midX = (from.x + to.x) / 2 + wobble(1, 14);
  const midY = (from.y + to.y) / 2 + wobble(2, 10);
  // Q to a wobbled midpoint, then T mirrors the control point — one smooth
  // continuous wave, like a single confident marker sweep.
  return `M ${from.x} ${from.y} Q ${from.x + wobble(0, 9)} ${(from.y + midY) / 2} ${midX} ${midY} T ${to.x} ${to.y}`;
}

type Slot = 'right' | 'left' | 'top' | 'bottom';
const SLOT_ORDER: Slot[] = ['right', 'left', 'top', 'bottom'];

/** Theme card: title + one row per word (doodle/emoji, word, speak button,
 *  inline definition). */
function ThemeCard({
  branch,
  color,
  defsOpen,
  doodles,
  onWordClick,
  onSpeak,
  speakingWord,
  innerRef,
}: {
  branch: MindMapNode;
  color: string;
  defsOpen: boolean;
  doodles: Record<string, string>;
  onWordClick: (word: string) => void;
  onSpeak: (word: MindMapNode) => void;
  speakingWord: string | null;
  innerRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={innerRef} className="mm-node" style={{ borderColor: color }}>
      <div className="mm-card-title" style={{ color }}>
        {branch.emoji ? `${branch.emoji} ` : ''}
        {branch.topic}
      </div>
      {branch.children.map((w) => {
        const doodle = doodles[doodleKey(w.topic)];
        const isSpeaking = speakingWord === w.topic;
        return (
          <div key={w.id} className="mm-row">
            {doodle ? (
              <img className="mm-doodle" src={doodle} alt="" />
            ) : (
              <span className="mm-emoji">{w.emoji ?? '✏️'}</span>
            )}
            <span className="mm-row-text">
              <span className="mm-word" title={`Open “${w.topic}”`} onClick={() => onWordClick(w.topic)}>
                {w.topic}
              </span>
              <button
                className={`mm-speak ${isSpeaking ? 'mm-speak-on' : ''}`}
                title={isSpeaking ? 'Stop' : `Speak “${w.topic}”`}
                onClick={() => onSpeak(w)}
              >
                <Icon icon={isSpeaking ? 'lucide:square' : 'lucide:volume-2'} />
              </button>
              {defsOpen && w.definition && <span className="mm-def">— {w.definition}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Poster-style radial map: the root title in the center, theme cards
 * distributed around it on all four sides (cycling right/left/top/bottom),
 * connected by thick sketchy strokes. Layout is a plain flex "ring" (columns
 * left/right, bands above/below the root) so variable-height cards can never
 * overlap; the connector SVG is measured off the real DOM after each render.
 */
function RadialMap({
  tree,
  defsOpen,
  doodles,
  tick,
  onWordClick,
}: {
  tree: MindMapNode;
  defsOpen: boolean;
  doodles: Record<string, string>;
  tick: number;
  onWordClick: (word: string) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  const [view, setView] = useState({ x: 0, y: 0, s: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [lines, setLines] = useState<{ d: string; color: string }[]>([]);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);
  const centeredForRef = useRef<MindMapNode | null>(null);
  const dragRef = useRef<{ px: number; py: number; vx: number; vy: number } | null>(null);
  const dragMovedRef = useRef(false);

  // Stop any in-flight speech when the map unmounts.
  useEffect(() => () => stopSpeaking(), []);

  const speak = (w: MindMapNode) => {
    if (dragMovedRef.current) return; // pan release, not a click
    if (speakingWord === w.topic && isTtsPlaying()) {
      stopSpeaking();
      setSpeakingWord(null);
      return;
    }
    stopSpeaking();
    setSpeakingWord(w.topic);
    const text = w.definition ? `${w.topic}. ${w.definition}` : w.topic;
    void speakText(text, { onEnd: () => setSpeakingWord((cur) => (cur === w.topic ? null : cur)) });
  };

  // Which side of the root each theme lands on.
  const slots = useMemo(
    () => tree.children.map((_, i) => SLOT_ORDER[i % SLOT_ORDER.length]),
    [tree],
  );
  const bySlot = (slot: Slot) =>
    tree.children
      .map((b, i) => ({ b, i }))
      .filter(({ i }) => slots[i] === slot);

  const centerView = useCallback(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return;
    const s0 = viewRef.current.s;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width / s0;
    const h = rect.height / s0;
    const s = Math.max(Math.min(viewport.clientWidth / w, viewport.clientHeight / h, 1), 0.3);
    setView({ x: (viewport.clientWidth - w * s) / 2, y: (viewport.clientHeight - h * s) / 2, s });
  }, []);

  // Measure the DOM and (re)draw connector strokes; recenter on a new tree.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const rootEl = rootRef.current;
    if (!canvas || !rootEl) return;
    const s = viewRef.current.s;
    const cRect = canvas.getBoundingClientRect();
    setCanvasSize({ w: cRect.width / s, h: cRect.height / s });

    const rel = (r: DOMRect) => ({
      x: (r.left - cRect.left) / s + r.width / s / 2,
      y: (r.top - cRect.top) / s + r.height / s / 2,
      w: r.width / s,
      h: r.height / s,
    });
    const root = rel(rootEl.getBoundingClientRect());

    const next: { d: string; color: string }[] = [];
    tree.children.forEach((b, i) => {
      const el = cardRefs.current.get(b.id);
      if (!el) return;
      const card = rel(el.getBoundingClientRect());
      const dx = card.x - root.x;
      const dy = card.y - root.y;
      // Attach to facing edges: horizontally for side cards, vertically for
      // cards above/below the root.
      const horizontal = Math.abs(dx) * root.h > Math.abs(dy) * root.w;
      const from: Pt = horizontal
        ? { x: root.x + Math.sign(dx) * root.w * 0.46, y: root.y }
        : { x: root.x, y: root.y + Math.sign(dy) * root.h * 0.46 };
      const to: Pt = horizontal
        ? { x: card.x - Math.sign(dx) * card.w * 0.5, y: card.y }
        : { x: card.x, y: card.y - Math.sign(dy) * card.h * 0.5 };
      next.push({ d: sketchPath(from, to, i * 3.7 + 1), color: PALETTE[i % PALETTE.length] });
    });
    setLines(next);

    if (centeredForRef.current !== tree) {
      centeredForRef.current = tree;
      centerView();
    }
  }, [tree, defsOpen, tick, centerView]);

  // Wheel zoom around the cursor. Native listener — React's onWheel is
  // passive, so preventDefault (needed to stop page scroll) wouldn't work.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setView((v) => {
        const s = Math.min(2.5, Math.max(0.2, v.s * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
        const k = s / v.s;
        return { s, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k };
      });
    };
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, []);

  const zoomBy = (factor: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const mx = viewport.clientWidth / 2;
    const my = viewport.clientHeight / 2;
    setView((v) => {
      const s = Math.min(2.5, Math.max(0.2, v.s * factor));
      const k = s / v.s;
      return { s, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k };
    });
  };

  const cardRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  };

  const renderCards = (slot: Slot) =>
    bySlot(slot).map(({ b, i }) => (
      <ThemeCard
        key={b.id}
        branch={b}
        color={PALETTE[i % PALETTE.length]}
        defsOpen={defsOpen}
        doodles={doodles}
        onWordClick={(w) => {
          if (dragMovedRef.current) return; // pan release, not a click
          onWordClick(w);
        }}
        onSpeak={speak}
        speakingWord={speakingWord}
        innerRef={cardRef(b.id)}
      />
    ));

  return (
    <div
      ref={viewportRef}
      className="word-mindmap relative h-[calc(100vh-11rem)] min-h-[30rem] rounded-2xl border-2 border-border overflow-hidden animate-fade-in cursor-grab select-none touch-none"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        // Words and speak buttons keep normal click behavior — starting a
        // pan (and especially pointer capture) on them would retarget the
        // click to this container and swallow it.
        if ((e.target as HTMLElement).closest?.('.mm-word, .mm-speak')) {
          dragMovedRef.current = false; // clear any previous pan so the click guard passes
          return;
        }
        dragRef.current = { px: e.clientX, py: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y };
        dragMovedRef.current = false;
      }}
      onPointerMove={(e) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = e.clientX - d.px;
        const dy = e.clientY - d.py;
        // Capture only once it's clearly a drag — capturing on pointer-down
        // would hijack the click events of everything inside the map.
        if (!dragMovedRef.current && Math.abs(dx) + Math.abs(dy) > 4) {
          dragMovedRef.current = true;
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        }
        if (dragMovedRef.current) setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }));
      }}
      onPointerUp={() => { dragRef.current = null; }}
      onPointerCancel={() => { dragRef.current = null; }}
    >
      <div
        ref={canvasRef}
        className="mm-canvas"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}
      >
        <svg className="mm-lines" width={canvasSize.w} height={canvasSize.h} aria-hidden>
          {lines.map((l, i) => (
            <path key={i} d={l.d} stroke={l.color} />
          ))}
        </svg>
        <div className="mm-ring">
          <div className="mm-col">{renderCards('left')}</div>
          <div className="mm-center">
            <div className="mm-band">{renderCards('top')}</div>
            <div ref={rootRef} className="mm-root-node">
              {tree.emoji ? `${tree.emoji} ` : ''}
              {ROOT_TOPIC}
            </div>
            <div className="mm-band">{renderCards('bottom')}</div>
          </div>
          <div className="mm-col">{renderCards('right')}</div>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        {([['lucide:plus', () => zoomBy(1.25), 'Zoom in'],
           ['lucide:minus', () => zoomBy(1 / 1.25), 'Zoom out'],
           ['lucide:maximize', centerView, 'Fit to screen']] as const).map(([icon, fn, label]) => (
          <button
            key={icon}
            onClick={fn}
            title={label}
            className="w-8 h-8 rounded-lg bg-white/90 border border-[#b7c9ef] text-[#262357] flex items-center justify-center hover:bg-white transition-all shadow-sm"
          >
            <Icon icon={icon} className="text-sm" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function WordMindMap({ words, onBack }: { words: string[]; onBack: () => void }) {
  const navigate = useNavigate();
  // Picker phase: `chosen` is null until the user confirms which words go on
  // the map — nothing is generated (or spent) before that.
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(words.slice(0, MAX_WORDS)));
  const [tree, setTree] = useState<MindMapNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Definitions render inline in the theme cards (poster style) — on by default.
  const [defsOpen, setDefsOpen] = useState(true);

  const loadedKeyRef = useRef<string | null>(null);

  // Doodles live in a ref (mutated by background workers); bumping the tick
  // tells the refresh effect to redraw the map with whatever has arrived.
  const doodlesRef = useRef<Record<string, string>>({});
  const [doodleTick, setDoodleTick] = useState(0);
  const [sketching, setSketching] = useState<{ done: number; total: number } | null>(null);
  // Words with no doodle anywhere (local, server cache) — generating them
  // costs real money, so it waits for an explicit "Sketch doodles" click.
  const [unsketched, setUnsketched] = useState<MindMapNode[]>([]);
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);

  const key = useMemo(() => (chosen ? cacheKey(chosen) : null), [chosen]);

  const load = useCallback(
    async (force: boolean) => {
      if (!key || !chosen) return;
      // Re-picking the same word set keeps the already-loaded map (and the
      // user's pan/zoom); only a changed set or Redraw reloads.
      if (!force && loadedKeyRef.current === key) return;
      setLoading(true);
      setError(null);
      setDefsOpen(true);

      if (!force) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            setTree(JSON.parse(cached) as MindMapNode);
            loadedKeyRef.current = key;
            setLoading(false);
            return;
          }
        } catch { /* corrupt cache — fall through and regenerate */ }
      }

      try {
        const text = await callAiAction('mindmap', { words: chosen });
        const root = parseMindMap(text);
        setTree(root);
        loadedKeyRef.current = key;
        try {
          localStorage.setItem(key, JSON.stringify(root));
        } catch { /* storage full — the map still renders */ }
      } catch (err) {
        setError((err as Error).message || 'Could not build the mind map.');
      } finally {
        setLoading(false);
      }
    },
    [key, chosen],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  // Load doodles for the current tree — FREE sources only. localStorage and
  // migrated legacy thumbs paint immediately, then the shared server cache
  // (word_cache) is pulled for the rest. Whatever is still missing goes to
  // `unsketched` and waits for the paid, explicit "Sketch doodles" click.
  useEffect(() => {
    if (!tree) return;
    let cancelled = false;
    setUnsketched([]);

    const leaves = tree.children.flatMap((b) => b.children);
    const missing: MindMapNode[] = [];
    const migrate: { k: string; legacy: string }[] = [];
    for (const w of leaves) {
      const k = doodleKey(w.topic);
      if (doodlesRef.current[k]) continue;
      try {
        const cached = localStorage.getItem(DOODLE_PREFIX + k);
        if (cached) {
          doodlesRef.current[k] = cached;
          continue;
        }
        // Older thumbnail (white or badly-keyed background): re-key it
        // locally instead of paying to regenerate.
        const legacy = DOODLE_PREFIXES_LEGACY
          .map((p) => localStorage.getItem(p + k))
          .find((v): v is string => Boolean(v));
        if (legacy) {
          migrate.push({ k, legacy });
          continue;
        }
      } catch { /* storage unavailable — regenerate below */ }
      missing.push(w);
    }
    console.log(
      `[mindmap] doodles: ${leaves.length} words — local=${leaves.length - missing.length - migrate.length} migrate=${migrate.length} toLookup=${missing.length}`,
    );
    setDoodleTick((t) => t + 1); // paint cached doodles

    if (migrate.length > 0) {
      void (async () => {
        for (const { k, legacy } of migrate) {
          if (cancelled) return;
          try {
            const thumb = await shrinkDataUri(legacy);
            doodlesRef.current[k] = thumb;
            try {
              localStorage.setItem(DOODLE_PREFIX + k, thumb);
              for (const p of DOODLE_PREFIXES_LEGACY) localStorage.removeItem(p + k);
            } catch { /* storage full — the in-memory copy still renders */ }
          } catch { /* undecodable old thumb — it'll regenerate next visit */ }
        }
        if (!cancelled) setDoodleTick((t) => t + 1);
      })();
    }

    if (missing.length === 0) return;

    // Pull server-cached doodles in ONE batched request (a free lookup —
    // cachedOnly never generates). Misses become the sketchable set.
    void (async () => {
      let images: Record<string, string> = {};
      try {
        images = await callAiDoodleSheet(
          missing.map((w) => ({ word: w.topic, definition: w.definition })),
          { cachedOnly: true },
        );
      } catch (err) {
        // Lookup failed (e.g. offline) — everything stays sketchable.
        console.warn(`[mindmap] cachedOnly batch lookup failed: ${(err as Error).message}`);
      }
      if (cancelled) return;

      const remaining: MindMapNode[] = [];
      let pulled = 0;
      for (const w of missing) {
        const img = images[w.topic];
        if (!img) {
          remaining.push(w);
          continue;
        }
        try {
          const thumb = await shrinkDataUri(img);
          if (cancelled) return;
          const k = doodleKey(w.topic);
          doodlesRef.current[k] = thumb;
          pulled += 1;
          try {
            localStorage.setItem(DOODLE_PREFIX + k, thumb);
          } catch { /* storage full — the in-memory copy still renders */ }
        } catch {
          remaining.push(w); // undecodable image — offer it for sketching
        }
      }
      console.log(`[mindmap] server cache pull done: hits=${pulled} unsketched=${remaining.length}`);
      if (pulled > 0) setDoodleTick((t) => t + 1);
      setUnsketched(remaining);
    })();

    return () => {
      cancelled = true;
    };
  }, [tree]);

  // Explicit, paid generation of the words that have no doodle anywhere.
  // Words go up in SHEETS of up to 9 — the server draws them as a grid in one
  // generated image and crops it apart, so a sheet costs the same as a single
  // doodle used to.
  const sketchDoodles = () => {
    const targets = unsketched;
    if (targets.length === 0 || sketching) return;
    setUnsketched([]);
    setSketching({ done: 0, total: targets.length });

    const sheets: MindMapNode[][] = [];
    for (let i = 0; i < targets.length; i += SHEET_SIZE) {
      sheets.push(targets.slice(i, i + SHEET_SIZE));
    }

    const failed: MindMapNode[] = [];
    let done = 0;
    let succeeded = 0;
    let firstError = '';
    // Sheets go sequentially — each is one slow image generation, and
    // parallel sheets would just trip the per-user rate limit.
    void (async () => {
      for (const sheet of sheets) {
        if (!aliveRef.current) return;
        try {
          console.log(`[mindmap] sketching sheet of ${sheet.length}: [${sheet.map((w) => w.topic).join(', ')}]`);
          const images = await callAiDoodleSheet(
            sheet.map((w) => ({ word: w.topic, definition: w.definition })),
          );
          console.log(`[mindmap] sheet returned ${Object.keys(images).length}/${sheet.length} images`);
          for (const w of sheet) {
            const img = images[w.topic];
            if (!img) {
              failed.push(w);
              continue;
            }
            try {
              const thumb = await shrinkDataUri(img);
              if (!aliveRef.current) return;
              const k = doodleKey(w.topic);
              doodlesRef.current[k] = thumb;
              succeeded += 1;
              try {
                localStorage.setItem(DOODLE_PREFIX + k, thumb);
              } catch { /* storage full — the in-memory copy still renders */ }
            } catch {
              failed.push(w);
            }
          }
        } catch (err) {
          console.error(`[mindmap] sheet failed: ${(err as Error).message}`);
          failed.push(...sheet);
          if (!firstError) firstError = (err as Error).message || 'Unknown error.';
        }
        done += sheet.length;
        if (!aliveRef.current) return;
        setSketching({ done, total: targets.length });
        setDoodleTick((t) => t + 1); // paint each finished sheet
      }
      if (!aliveRef.current) return;
      setSketching(null);
      setUnsketched(failed); // failures stay available for another attempt
      setDoodleTick((t) => t + 1);
      if (succeeded === 0 && firstError) {
        toast.error(`Doodles couldn't be sketched: ${firstError}`, { duration: 8000 });
      } else if (failed.length > 0) {
        toast(`${failed.length} doodle(s) failed — try sketching again.`, { icon: '✍️' });
      }
    })();
  };

  // (Doodle arrivals bump `doodleTick`, which re-renders RadialMap — no
  // imperative refresh needed with the React renderer.)
  const toggleDefs = () => setDefsOpen((v) => !v);

  const redraw = () => {
    void load(true);
    toast('Drawing a fresh mind map…', { icon: '✍️' });
  };

  const togglePick = (word: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(word)) {
        next.delete(word);
      } else if (next.size >= MAX_WORDS) {
        toast(`A mind map fits up to ${MAX_WORDS} words.`, { icon: '✋' });
        return prev;
      } else {
        next.add(word);
      }
      return next;
    });
  };

  // ── Picker phase — choose the words before anything is generated ──
  if (chosen === null) {
    const overflow = words.length > MAX_WORDS;
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg-card text-text-muted text-xs font-medium hover:text-text-primary hover:border-border-light transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
          <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent-yellow/15 text-accent-yellow text-[10px] font-extrabold uppercase tracking-wider">
            <Icon icon="lucide:crown" className="text-xs" />
            Pro
          </span>
        </div>

        <h1 className="font-display font-extrabold text-2xl text-text-primary mb-1">
          Pick words for your mind map
        </h1>
        <p className="text-sm text-text-muted mb-5">
          Choose 2–{MAX_WORDS} saved words to organize into themes.
          {overflow && ` You have ${words.length} saved words — the first ${MAX_WORDS} are pre-selected.`}
        </p>

        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setPicked(new Set(words.slice(0, MAX_WORDS)))}
            className="px-3 py-1.5 rounded-lg border border-border bg-bg-card text-text-muted text-xs font-medium hover:text-text-primary hover:border-border-light transition-all"
          >
            Select all
          </button>
          <button
            onClick={() => setPicked(new Set())}
            className="px-3 py-1.5 rounded-lg border border-border bg-bg-card text-text-muted text-xs font-medium hover:text-text-primary hover:border-border-light transition-all"
          >
            Clear
          </button>
          <span className="ml-auto text-xs font-bold text-accent-cyan">
            {picked.size}/{Math.min(words.length, MAX_WORDS)} selected
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {words.map((word) => {
            const on = picked.has(word);
            return (
              <button
                key={word}
                onClick={() => togglePick(word)}
                className={`px-3 py-1.5 rounded-full border text-sm font-display font-bold transition-all ${
                  on
                    ? 'bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan'
                    : 'bg-bg-card border-border text-text-muted hover:text-text-primary hover:border-border-light'
                }`}
              >
                {word}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setChosen([...picked])}
          disabled={picked.size < 2}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-cyan/15 border-2 border-accent-cyan/40 text-accent-cyan font-display font-extrabold hover:bg-accent-cyan/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon icon="lucide:pencil-line" className="text-base" />
          Build mind map ({picked.size} words)
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-3 py-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg-card text-text-muted text-xs font-medium hover:text-text-primary hover:border-border-light transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>
        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent-yellow/15 text-accent-yellow text-[10px] font-extrabold uppercase tracking-wider">
          <Icon icon="lucide:crown" className="text-xs" />
          Pro
        </span>
        <span className="hidden sm:block text-[11px] text-text-muted">
          drag to pan · scroll to zoom · click a word to study it
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setChosen(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg-card text-text-muted text-xs font-medium hover:text-text-primary hover:border-border-light transition-all"
            title="Pick a different set of words"
          >
            <Icon icon="lucide:list-checks" className="text-sm" />
            Change words
          </button>
          {sketching && (
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent-purple/10 border border-accent-purple/20 text-accent-purple text-xs font-medium">
              <span className="w-3 h-3 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
              Sketching doodles {sketching.done}/{sketching.total}
            </span>
          )}
          {DOODLE_GENERATION_ENABLED && !sketching && unsketched.length > 0 && (
            <button
              onClick={sketchDoodles}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-purple/10 border border-accent-purple/20 text-accent-purple text-xs font-medium hover:bg-accent-purple/20 transition-all"
              title={`Generate hand-drawn doodles for ${unsketched.length} word(s) with AI — drawn ${SHEET_SIZE} to a sheet to keep cost low, then cached for everyone forever`}
            >
              <Icon icon="lucide:paintbrush" className="text-sm" />
              Sketch doodles ({unsketched.length})
            </button>
          )}
          {tree && !loading && (
            <button
              onClick={toggleDefs}
              className="px-3 py-1.5 rounded-lg border border-border bg-bg-card text-text-muted text-xs font-medium hover:text-text-primary hover:border-border-light transition-all"
            >
              {defsOpen ? 'Hide definitions' : 'Show all definitions'}
            </button>
          )}
          <button
            onClick={redraw}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-orange/10 border border-accent-orange/20 text-accent-orange text-xs font-medium hover:bg-accent-orange/20 transition-all disabled:opacity-50"
            title="Generate a fresh mind map"
          >
            <Icon icon="lucide:refresh-cw" className="text-sm" />
            Redraw
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      {loading ? (
        <div className="py-24 flex flex-col items-center gap-4 text-center">
          <div className="w-10 h-10 rounded-full border-4 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
          <div>
            <p className="text-sm font-bold text-text-primary">Drawing your mind map…</p>
            <p className="text-xs text-text-muted mt-1">Grouping {chosen.length} words into themes</p>
          </div>
        </div>
      ) : error ? (
        <div className="py-24 text-center">
          <div className="text-4xl mb-4">🫤</div>
          <p className="text-sm text-text-primary font-bold mb-2">{error}</p>
          <button
            onClick={() => void load(true)}
            className="mt-2 px-4 py-2 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-sm font-medium hover:bg-accent-cyan/20 transition-all"
          >
            Try again
          </button>
        </div>
      ) : tree ? (
        <RadialMap
          tree={tree}
          defsOpen={defsOpen}
          doodles={doodlesRef.current}
          tick={doodleTick}
          onWordClick={(word) => navigate(`/?word=${encodeURIComponent(word)}`)}
        />
      ) : null}
    </div>
  );
}
