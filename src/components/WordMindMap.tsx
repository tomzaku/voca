// Interactive mind map of the user's saved words — a Pro feature.
//
// The `mindmap` AI action (pro-gated server-side) returns a jsMind-style
// "node_tree" JSON document: themed branches with one leaf per word carrying
// an emoji + short definition. We render it with mind-elixir (MindElixir.SIDE
// puts the root in the center with branches radiating both ways) skinned to
// look hand-written — see wordMindMap.css. Each word hides its definition in
// a collapsed child node (mind-elixir's native +/− expander toggles it), and
// double-clicking a word opens its word page. Results are cached in
// localStorage per word-set so coming back doesn't spend another AI call —
// "Redraw" forces a fresh map.
//
// Each word also gets a small hand-drawn doodle image hinting at its meaning
// (the `mindmap_doodle` action → Gemini image model → base64 data URI). Big
// generated images are downscaled to a thumbnail in a canvas and cached in
// localStorage PER WORD (independent of the map), so a doodle is only ever
// generated once — redrawing the map reuses them. The word's emoji shows as a
// placeholder while its doodle is being sketched (or if generation fails).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import MindElixir, { type MindElixirData, type MindElixirInstance, type NodeObj } from 'mind-elixir';
import 'mind-elixir/style.css';
import './wordMindMap.css';
import { callAiAction, callAiDoodle } from '../lib/aiProviders';

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
// on white. mind-elixir wants concrete colors for the SVG strokes.
const PALETTE = ['#0bb5d6', '#8b5cf6', '#f97316', '#10b862', '#ec4899', '#3b6cff', '#f5a800', '#f43f6b'];

// Fixed ink color for the paper look — deliberately NOT a theme variable
// (muted/def ink lives in wordMindMap.css).
const INK = '#262357';

// Doodle GENERATION is switched off: 1024px is the smallest any current
// image model produces (~$0.02+/word), which is too expensive. Doodles that
// already exist (localStorage / shared word_cache) still load and render for
// free. Flip this to true to bring back the "Sketch doodles" button once a
// cheaper/smaller model exists — the whole pipeline underneath still works.
const DOODLE_GENERATION_ENABLED = false;

const CACHE_PREFIX = 'voca-mindmap-v1:';
// v3 doodles key out the background by sampling the image's actual border
// color (Gemini "white" is really off-white, and lossy WebP shifts it more —
// a fixed near-255 threshold missed it). Older cache entries are reprocessed
// locally — no AI call.
const DOODLE_PREFIX = 'voca-doodle-v3:';
const DOODLE_PREFIXES_LEGACY = ['voca-doodle-v2:', 'voca-doodle-v1:'];
const DOODLE_SIZE = 192; // thumbnail px — sized for the 126px display box on retina screens
// Parallel doodle generations. Generation latency (~5-15s each, fixed-size
// 1024px output) dominates; more workers cut wall-clock time. Kept below the
// per-user AI rate limit (60/min) with headroom for the map request itself.
const DOODLE_CONCURRENCY = 5;
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

/** Escape text before it goes into a node's dangerouslySetInnerHTML. */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/**
 * Convert the AI tree into mind-elixir data. Word→id mapping is returned so
 * the double-click handler can resolve a clicked topic back to its word.
 * Definitions become each word's only child, collapsed unless `defsOpen`.
 * `doodles` maps doodleKey(word) → thumbnail data URI; a word with a doodle
 * shows it, otherwise its emoji stands in.
 */
function toMindElixirData(
  tree: MindMapNode,
  defsOpen: boolean,
  doodles: Record<string, string>,
): { data: MindElixirData; wordById: Map<string, string> } {
  const wordById = new Map<string, string>();

  const branches: NodeObj[] = tree.children.map((branch, i) => {
    const hex = PALETTE[i % PALETTE.length];
    return {
      id: branch.id,
      topic: branch.topic,
      dangerouslySetInnerHTML: `<span class="mm-branch">${branch.emoji ? `${esc(branch.emoji)} ` : ''}${esc(branch.topic)}</span>`,
      branchColor: hex,
      style: { color: hex, border: `2px solid ${hex}`, background: '#ffffff' },
      expanded: true,
      children: branch.children.map((w): NodeObj => {
        wordById.set(w.id, w.topic);
        const doodle = doodles[doodleKey(w.topic)];
        const visual = doodle
          ? `<img class="mm-doodle" src="${doodle}" alt="" /> `
          : w.emoji
            ? `<span class="mm-emoji">${esc(w.emoji)}</span> `
            : '';
        return {
          id: w.id,
          topic: w.topic,
          dangerouslySetInnerHTML: `<span class="mm-word">${visual}${esc(w.topic)}</span>`,
          expanded: defsOpen,
          children: w.definition
            ? [{
                id: `${w.id}-def`,
                topic: w.definition,
                dangerouslySetInnerHTML: `<span class="mm-def">${esc(w.definition)}</span>`,
              }]
            : [],
        };
      }),
    };
  });

  return {
    data: {
      nodeData: {
        id: 'root',
        topic: ROOT_TOPIC,
        dangerouslySetInnerHTML: `<span class="mm-root">${tree.emoji ? `${esc(tree.emoji)} ` : ''}${esc(ROOT_TOPIC)}</span>`,
        children: branches,
      },
    },
    wordById,
  };
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
  const [defsOpen, setDefsOpen] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mindRef = useRef<MindElixirInstance | null>(null);
  const wordByIdRef = useRef<Map<string, string>>(new Map());
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
      setDefsOpen(false);

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

  // (Re)mount the mind-elixir instance whenever we have a tree to draw.
  // `chosen` is a dep so returning to the picker (which unmounts the map div)
  // destroys the instance, and confirming the same word set remounts it.
  useEffect(() => {
    const el = mapRef.current;
    if (!tree || !el || !chosen) return;

    const { data, wordById } = toMindElixirData(tree, false, doodlesRef.current);
    wordByIdRef.current = wordById;

    const mind = new MindElixir({
      el,
      direction: MindElixir.SIDE, // root in the center, branches both ways
      editable: false,
      contextMenu: false,
      keypress: false,
      toolBar: true, // zoom / re-center buttons, bottom right
      theme: {
        name: 'Sketch',
        palette: PALETTE,
        // Fixed ink-on-white-paper colors — the map stays white in both app
        // themes (blue/dark canvases made the sketch hard to read).
        cssVar: {
          '--main-color': INK,
          '--main-bgcolor': '#ffffff',
          '--color': INK,
          '--bgcolor': 'transparent',
          '--selected': '#0bb5d6',
          '--root-color': INK,
          '--root-bgcolor': '#ffffff',
          '--root-border-color': '#8ea6e6',
          // Asymmetric radii = the wobbly hand-drawn outline
          '--root-radius': '235px 25px 215px 25px / 25px 215px 25px 235px',
          '--main-radius': '255px 15px 225px 15px / 15px 225px 15px 255px',
          '--topic-padding': '3px 10px',
          '--panel-color': INK,
          '--panel-bgcolor': '#ffffff',
          '--panel-border-color': '#b7c9ef',
        },
      },
    });
    mind.init(data);
    mindRef.current = mind;

    // Double-click a word topic → open its word page. Capture phase so we win
    // over any internal dblclick handling; children of me-tpc don't receive
    // pointer events, so the target resolves to the topic element itself.
    const onDblClick = (e: MouseEvent) => {
      const tpc = (e.target as HTMLElement).closest?.('me-tpc') as (HTMLElement & { nodeObj?: NodeObj }) | null;
      const id = tpc?.nodeObj?.id;
      const word = id ? wordByIdRef.current.get(id) : undefined;
      if (!word) return;
      e.stopPropagation();
      navigate(`/?word=${encodeURIComponent(word)}`);
    };
    el.addEventListener('dblclick', onDblClick, true);

    return () => {
      el.removeEventListener('dblclick', onDblClick, true);
      mind.destroy();
      mindRef.current = null;
    };
  }, [tree, chosen, navigate]);

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

    // Pull server-cached doodles (a free lookup — cachedOnly never generates).
    const queue = [...missing];
    const remaining: MindMapNode[] = [];
    let pulled = 0;
    const worker = async () => {
      for (;;) {
        const w = queue.shift();
        if (!w || cancelled) return;
        try {
          const img = await callAiDoodle(w.topic, w.definition, { cachedOnly: true });
          if (cancelled) return;
          if (img) {
            const thumb = await shrinkDataUri(img);
            const k = doodleKey(w.topic);
            doodlesRef.current[k] = thumb;
            pulled += 1;
            try {
              localStorage.setItem(DOODLE_PREFIX + k, thumb);
            } catch { /* storage full — the in-memory copy still renders */ }
          } else {
            remaining.push(w);
          }
        } catch {
          remaining.push(w); // lookup failed — offer it for sketching anyway
        }
      }
    };
    void Promise.all(Array.from({ length: DOODLE_CONCURRENCY }, worker)).then(() => {
      if (cancelled) return;
      if (pulled > 0) setDoodleTick((t) => t + 1);
      setUnsketched(remaining);
    });

    return () => {
      cancelled = true;
    };
  }, [tree]);

  // Explicit, paid generation of the words that have no doodle anywhere.
  const sketchDoodles = () => {
    const targets = unsketched;
    if (targets.length === 0 || sketching) return;
    setUnsketched([]);
    setSketching({ done: 0, total: targets.length });

    const queue = [...targets];
    const failed: MindMapNode[] = [];
    let done = 0;
    let succeeded = 0;
    let firstError = '';
    const worker = async () => {
      for (;;) {
        const w = queue.shift();
        if (!w || !aliveRef.current) return;
        try {
          const raw = await callAiDoodle(w.topic, w.definition);
          if (!raw) throw new Error('No doodle image received.');
          const thumb = await shrinkDataUri(raw);
          if (!aliveRef.current) return;
          const k = doodleKey(w.topic);
          doodlesRef.current[k] = thumb;
          succeeded += 1;
          try {
            localStorage.setItem(DOODLE_PREFIX + k, thumb);
          } catch { /* storage full — the in-memory copy still renders */ }
        } catch (err) {
          failed.push(w);
          if (!firstError) firstError = (err as Error).message || 'Unknown error.';
        }
        done += 1;
        if (!aliveRef.current) return;
        setSketching({ done, total: targets.length });
        // Repaint in waves so early doodles show up without a jarring
        // full-map refresh after every single image.
        if (done % 8 === 0) setDoodleTick((t) => t + 1);
      }
    };
    void Promise.all(Array.from({ length: DOODLE_CONCURRENCY }, worker)).then(() => {
      if (!aliveRef.current) return;
      setSketching(null);
      setUnsketched(failed); // failures stay available for another attempt
      setDoodleTick((t) => t + 1);
      if (succeeded === 0 && firstError) {
        toast.error(`Doodles couldn't be sketched: ${firstError}`, { duration: 8000 });
      } else if (firstError) {
        toast(`${failed.length} doodle(s) failed — try sketching again.`, { icon: '✍️' });
      }
    });
  };

  // Redraw the map when new doodles arrive.
  useEffect(() => {
    if (doodleTick === 0 || !tree || !mindRef.current) return;
    const { data, wordById } = toMindElixirData(tree, defsOpen, doodlesRef.current);
    wordByIdRef.current = wordById;
    mindRef.current.refresh(data);
    // defsOpen is read but must not trigger this effect — toggleDefs already
    // refreshes; reacting to it here would refresh twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doodleTick, tree]);

  const toggleDefs = () => {
    if (!tree || !mindRef.current) return;
    const next = !defsOpen;
    setDefsOpen(next);
    const { data, wordById } = toMindElixirData(tree, next, doodlesRef.current);
    wordByIdRef.current = wordById;
    mindRef.current.refresh(data);
  };

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
    <div className="max-w-6xl mx-auto px-4 py-8">
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
          drag to pan · scroll to zoom · <b>+</b> shows a definition · double-click a word to study it
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
              title={`Generate hand-drawn doodles for ${unsketched.length} word(s) with AI — one-time cost, cached for everyone afterwards`}
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
        <div
          ref={mapRef}
          className="word-mindmap h-[calc(100vh-14rem)] min-h-[30rem] rounded-2xl border-2 border-border overflow-hidden animate-fade-in"
        />
      ) : null}
    </div>
  );
}
