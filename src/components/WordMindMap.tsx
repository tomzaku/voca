// Interactive mind map of the user's saved words — a Pro feature.
//
// The `mindmap` AI action (pro-gated server-side) returns a jsMind-style
// "node_tree" JSON document: themed branches with one leaf per word carrying
// an emoji, and — filled in server-side from word_cache, not by the model —
// a short definition, a mother-tongue translation, IPA and one example. The
// "Show" menu picks which of those four each word displays; the map is cached
// per word set AND mother tongue, since the translations are baked in at
// generation time. Rendering is a small custom RADIAL renderer
// (no mind-map library: they all lay out left/right columns only, and we
// want theme cards surrounding the root on ALL sides like a study poster).
// Each theme is one card listing its words; cards are distributed
// right/left/top/bottom around the center title and connected with thick
// hand-drawn SVG strokes. Pan (drag) and zoom (wheel/buttons) are hand-rolled
// on a CSS transform. The poster is also rearrangeable: cards and the center
// title can be dragged, and each connector can be bent by its midpoint handle
// (double-click either to reset it). Those edits are the user's own, saved
// separately from the map so a redraw doesn't inherit them. "Export PNG"
// rasterizes the whole poster at its natural size (src/lib/mapImage.ts).
// Clicking a word opens its word page. Results are cached in localStorage per
// word-set so coming back doesn't spend another AI call, and — for a signed-in
// user — also saved server-side (the `mindmap` resource) so the same word set
// resolves without an AI call even after localStorage is cleared or on another
// device. "Redraw" forces a fresh map and overwrites both caches.
//
// Each word also gets a small hand-drawn doodle image hinting at its meaning
// (the `doodles` edge function → Gemini image model → base64 data URI,
// 16 words per generated image). Doodles are downscaled to thumbnails in a
// canvas and cached in localStorage PER WORD (independent of the map), so a
// doodle is only ever generated once — redrawing the map reuses them. The
// word's emoji shows as a placeholder until its doodle exists.

import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import './wordMindMap.css';
import { callAiAction } from '../lib/aiProviders';
import {
  DOODLE_SHEET_SIZE as SHEET_SIZE,
  callDoodles,
  doodleKey,
  readLegacyDoodle,
  readLocalDoodle,
  shrinkDataUri,
  writeLocalDoodle,
} from '../lib/doodles';
import { getMotherLanguage } from '../lib/languages';
import { downloadBlob, mindMapToPngBlob } from '../lib/mapImage';
import { type MindMapNode, type SavedMindmap, fetchMindmap, listMindmaps, saveMindmap } from '../lib/mindmapApi';
import { isTtsPlaying, speakText, stopSpeaking } from '../lib/tts';

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

/** Which per-word lines the cards show. Each is a row in the Show menu. */
interface MapFields {
  definitions: boolean;
  translation: boolean;
  phonetics: boolean;
  examples: boolean;
}

// Definitions on by default — that's what the map showed before this menu
// existed. The rest are opt-in: all four at once turns every card into a wall
// of text, which is the opposite of what a poster is for.
const DEFAULT_FIELDS: MapFields = {
  definitions: true,
  translation: false,
  phonetics: false,
  examples: false,
};

// A display preference, not a property of one map — it applies to whichever
// word set you open next, so it isn't scoped by cache key.
const FIELDS_KEY = 'voca-mindmap-fields-v1';

function readFields(): MapFields {
  try {
    const raw = localStorage.getItem(FIELDS_KEY);
    if (!raw) return DEFAULT_FIELDS;
    const parsed = JSON.parse(raw) as Partial<Record<keyof MapFields, unknown>>;
    const pick = (k: keyof MapFields) =>
      typeof parsed?.[k] === 'boolean' ? (parsed[k] as boolean) : DEFAULT_FIELDS[k];
    return {
      definitions: pick('definitions'),
      translation: pick('translation'),
      phonetics: pick('phonetics'),
      examples: pick('examples'),
    };
  } catch {
    return DEFAULT_FIELDS;
  }
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

// v2 keys carry the mother tongue: the cached tree holds the translations the
// server attached at generation time, so a map built for one mother tongue
// can't be reused for another. Bumping the version also retires v1 entries,
// which predate the translation/IPA/example fields entirely.
const CACHE_PREFIX = 'voca-mindmap-v2:';
const MAX_DEPTH = 4;
const MAX_WORDS = 40; // the server's `mindmap` action caps words at 40

/** Stable cache key for a word set + mother tongue — order-insensitive. */
function cacheKey(words: string[], motherLang: string): string {
  return `${CACHE_PREFIX}${motherLang.toLowerCase()}:${[...words].sort().join('|').toLowerCase()}`;
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
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  return {
    id: typeof o.id === 'string' && o.id ? o.id : fallbackId,
    topic,
    emoji: typeof o.emoji === 'string' ? o.emoji : undefined,
    definition: str(o.definition),
    translation: str(o.translation),
    phonetic: str(o.phonetic),
    example: str(o.example),
    children,
  };
}

/**
 * Best-effort repair of a JSON document truncated mid-stream (the model hit
 * its token cap, or the stream was cut). Walks the text tracking string state
 * and the open-bracket stack, rewinds to the last point where a full value had
 * just landed — so a half-written key/value is dropped, not kept — then closes
 * the still-open brackets. Returns null when nothing salvageable precedes the
 * cut. `toNode` drops any leaf that survives only partially.
 */
function repairTruncatedJson(text: string): string | null {
  const stack: ('{' | '[')[] = [];
  let inString = false;
  let escape = false;
  let afterColon = false; // inside an object, we've seen `key:` and expect a value
  let safe = -1; // index just past the last point safe to truncate + close

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') {
        inString = false;
        const inObj = stack[stack.length - 1] === '{';
        // A closed string is a safe cut point only when it's a completed
        // value (array element, or object value after a colon) — never a
        // dangling object key, which would need a value to be valid.
        if (!inObj || afterColon) {
          afterColon = false;
          safe = i + 1;
        }
      }
      continue;
    }
    switch (ch) {
      case '"':
        inString = true;
        break;
      case '{':
      case '[':
        stack.push(ch);
        afterColon = false;
        break;
      case '}':
      case ']':
        stack.pop();
        afterColon = false;
        safe = i + 1; // a container just closed → safe to cut here
        break;
      case ':':
        afterColon = true;
        break;
      case ',':
        afterColon = false;
        break;
      default: {
        // Bare literal (number/true/false/null) as an object value or array
        // element: consume the whole token; its end is safe only if a
        // delimiter follows (otherwise the token itself may be truncated).
        const inValueSlot = afterColon || stack[stack.length - 1] === '[';
        if (inValueSlot && /[-\d.eE+tfnalsru]/.test(ch)) {
          let j = i;
          while (j < text.length && /[-\d.eE+tfnalsru]/.test(text[j])) j++;
          if (j < text.length) {
            safe = j;
            afterColon = false;
          }
          i = j - 1;
        }
        break;
      }
    }
  }

  if (safe <= 0) return null;
  const head = text.slice(0, safe).replace(/,\s*$/, '');
  // Rebuild the open-bracket stack for `head` to know what to close.
  const closers: string[] = [];
  let s2 = false;
  let e2 = false;
  for (let i = 0; i < head.length; i++) {
    const ch = head[i];
    if (s2) {
      if (e2) e2 = false;
      else if (ch === '\\') e2 = true;
      else if (ch === '"') s2 = false;
      continue;
    }
    if (ch === '"') s2 = true;
    else if (ch === '{') closers.push('}');
    else if (ch === '[') closers.push(']');
    else if (ch === '}' || ch === ']') closers.pop();
  }
  return head + closers.reverse().join('');
}

/** Parse the AI response — accepts the jsMind envelope or a bare root node. */
function parseMindMap(text: string): MindMapNode {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // The stream was likely cut off mid-node — salvage the complete prefix
    // rather than failing the whole map.
    const repaired = repairTruncatedJson(cleaned);
    if (repaired) {
      try {
        parsed = JSON.parse(repaired);
      } catch { /* fall through to the error below */ }
    }
    if (parsed === undefined) {
      throw new Error('The AI returned an unreadable mind map — try redrawing.');
    }
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

// Shaft half-widths at the root end and where it meets the arrowhead — the
// line swells slightly as it travels outward, like a marker pressed harder
// toward the target. Kept thin: a fat shaft reads as a blob, not a stroke.
const ARROW_W_START = 2.5;
const ARROW_W_END = 9;
// Arrowhead length. Effectively constant — every connector on the poster
// should land with the same weight — but capped as a fraction of the
// connector so the short root→top/bottom hops don't become all head.
const ARROW_HEAD_RATIO = 0.38;
const ARROW_HEAD_MIN = 14;
const ARROW_HEAD_MAX = 32;

// Displacing BOTH cubic control points by a vector v moves the curve's
// midpoint by 3/8·v + 3/8·v. Dragging the midpoint handle inverts that, so the
// handle tracks the pointer exactly: bend += drag / MID_GAIN.
const MID_GAIN = 0.75;

interface ArrowGeom {
  /** Filled silhouette — shaft + head as one outline. */
  fill: string;
  /** Bare centerline, for the invisible grab target. */
  line: string;
  /** Where the drag handle sits (the curve's midpoint). */
  knob: Pt;
}

/**
 * Hand-drawn arrow from the root to a card, as ONE filled path: a gently-bowed
 * cubic shaft (wobbled control points — no S-curves) that tapers from
 * ARROW_W_START to ARROW_W_END, capped by a solid triangular head. SVG strokes
 * can't vary width, so the centerline is sampled and offset perpendicular on
 * both sides, and the head's barb corners continue the same outline — shaft
 * and head are one silhouette, never two overlapping shapes.
 *
 * `d` is the unit direction the stroke leaves the root AND arrives at the card
 * with (both edges face each other); the curve's tangent at the neck is `d`
 * too, so the head sits square on the shaft. The wobble is seeded per branch
 * so re-renders don't make the lines jiggle, and `bend` is the user's own
 * displacement on top of it (see MID_GAIN).
 */
function sketchArrow(from: Pt, to: Pt, d: Pt, seed: number, bend?: Pt): ArrowGeom {
  const wobble = (k: number, amp: number) => Math.sin(seed + k * 2.1) * amp;
  const span = Math.hypot(to.x - from.x, to.y - from.y);
  // Control handles lean out along `d`. Capped at a fraction of the span as
  // well, or on the short root→top/bottom hops p1 would land beyond p2 and
  // fold the curve into a loop.
  const ext = Math.min(Math.max(span * 0.32, 12), 170, span * 0.42);
  const perpX = -d.y;
  const perpY = d.x;
  const bx = bend?.x ?? 0;
  const by = bend?.y ?? 0;
  const p0 = from;
  const p1 = { x: from.x + d.x * ext + perpX * wobble(0, 10) + bx, y: from.y + d.y * ext + perpY * wobble(0, 10) + by };
  const p2 = { x: to.x - d.x * ext + perpX * wobble(1, 10) + bx, y: to.y - d.y * ext + perpY * wobble(1, 10) + by };
  const p3 = to;

  // Sample the whole curve — endpoint to endpoint — then cut the head off the
  // end by ARC LENGTH. Deriving the head from the curve rather than from `d`
  // is what lets a dragged arrow keep a sane arrowhead: however far the user
  // bends it, the barbs stay square to the direction the stroke actually
  // arrives from.
  const STEPS = 48;
  const pts: Pt[] = [];
  const run: number[] = [0];
  for (let j = 0; j <= STEPS; j++) {
    const t = j / STEPS;
    const mt = 1 - t;
    pts.push({
      x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
      y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
    });
    if (j > 0) run.push(run[j - 1] + Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y));
  }
  const total = run[STEPS] || 1;
  const headLen = Math.min(
    Math.max(total * ARROW_HEAD_RATIO, ARROW_HEAD_MIN),
    ARROW_HEAD_MAX,
    total * 0.5, // never let the head eat more than half the connector
  );
  const headHalf = headLen * 0.5;
  // The shaft always stays narrower than the barbs, or the head disappears
  // into it on the short connectors.
  const endHalf = Math.min(ARROW_W_END, headHalf * 0.62) / 2;

  // Where the shaft ends: the point `headLen` back from the tip along the
  // curve, interpolated between samples so short arrows don't snap.
  let ni = STEPS;
  while (ni > 0 && total - run[ni] < headLen) ni -= 1;
  const segLen = run[ni + 1] !== undefined ? run[ni + 1] - run[ni] : 0;
  const overshoot = total - run[ni] - headLen; // ≥ 0
  const f = segLen > 0 ? Math.min(overshoot / segLen, 1) : 0;
  const neck: Pt = {
    x: pts[ni].x + (pts[Math.min(ni + 1, STEPS)].x - pts[ni].x) * f,
    y: pts[ni].y + (pts[Math.min(ni + 1, STEPS)].y - pts[ni].y) * f,
  };

  const shaft = [...pts.slice(0, ni + 1), neck];
  const leftPts: string[] = [];
  const rightPts: string[] = [];
  const midPts: string[] = [];
  for (let i = 0; i < shaft.length; i++) {
    const prev = shaft[Math.max(i - 1, 0)];
    const nextPt = shaft[Math.min(i + 1, shaft.length - 1)];
    const dx = nextPt.x - prev.x;
    const dy = nextPt.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const t = shaft.length > 1 ? i / (shaft.length - 1) : 1;
    const half = ARROW_W_START / 2 + (endHalf - ARROW_W_START / 2) * t;
    leftPts.push(`${(shaft[i].x + nx * half).toFixed(1)} ${(shaft[i].y + ny * half).toFixed(1)}`);
    rightPts.push(`${(shaft[i].x - nx * half).toFixed(1)} ${(shaft[i].y - ny * half).toFixed(1)}`);
    midPts.push(`${shaft[i].x.toFixed(1)} ${shaft[i].y.toFixed(1)}`);
  }

  // Head barbs sit square to how the stroke arrives, not to `d`.
  const hx = p3.x - neck.x;
  const hy = p3.y - neck.y;
  const hlen = Math.hypot(hx, hy) || 1;
  const hpx = -hy / hlen;
  const hpy = hx / hlen;

  const pt = (px: number, py: number) => `${px.toFixed(1)} ${py.toFixed(1)}`;
  const barbL = pt(neck.x + hpx * headHalf, neck.y + hpy * headHalf);
  const barbR = pt(neck.x - hpx * headHalf, neck.y - hpy * headHalf);
  return {
    fill: `M ${leftPts.join(' L ')} L ${barbL} L ${pt(p3.x, p3.y)} L ${barbR} L ${rightPts.reverse().join(' L ')} Z`,
    line: `M ${midPts.join(' L ')} L ${pt(p3.x, p3.y)}`,
    // The curve's t=0.5 point, which MID_GAIN inverts exactly.
    knob: pts[STEPS / 2],
  };
}

// How far a connector may be bent, and how far a card may be moved, from
// where the layout put it. Generous enough to reroute a stroke or rearrange
// the poster, bounded so a wild drag can't fling something out of reach.
const MAX_BEND = 600;
const MAX_MOVE = 1500;

// The center title moves like any other card; it just isn't a branch, so it
// needs an id of its own in the same map.
const ROOT_ID = '__root';

// Everything the user has rearranged by hand, per word-set: `bends` is the
// shape of each connector, `cards` is where each box was dragged to. Kept out
// of the map cache entry — that one is the AI's answer and gets replaced
// wholesale on a redraw, while these are the user's own edits.
const LAYOUT_PREFIX = 'voca-mindmap-layout-v1:';

type PtMap = Record<string, Pt>;
interface MapLayout { bends: PtMap; cards: PtMap }

const EMPTY_LAYOUT: MapLayout = { bends: {}, cards: {} };

function clampTo(limit: number, v: number): number {
  return Math.min(Math.max(v, -limit), limit);
}

/** Coerce one stored `{id: {x, y}}` table, dropping anything malformed. */
function toPtMap(raw: unknown, limit: number): PtMap {
  if (typeof raw !== 'object' || raw === null) return {};
  const out: PtMap = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const p = v as Partial<Pt> | null;
    // A corrupt or hand-edited entry must not put NaN into a transform or
    // into path data — one NaN blanks the whole connector layer.
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      out[id] = { x: clampTo(limit, p.x as number), y: clampTo(limit, p.y as number) };
    }
  }
  return out;
}

function readLayout(key: string): MapLayout {
  try {
    const raw = localStorage.getItem(LAYOUT_PREFIX + key);
    if (!raw) return EMPTY_LAYOUT;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      bends: toPtMap(parsed?.bends, MAX_BEND),
      cards: toPtMap(parsed?.cards, MAX_MOVE),
    };
  } catch {
    return EMPTY_LAYOUT;
  }
}

function writeLayout(key: string, layout: MapLayout): void {
  try {
    const empty = Object.keys(layout.bends).length === 0 && Object.keys(layout.cards).length === 0;
    if (empty) localStorage.removeItem(LAYOUT_PREFIX + key);
    else localStorage.setItem(LAYOUT_PREFIX + key, JSON.stringify(layout));
  } catch { /* storage full — the edits still apply this session */ }
}

type Slot = 'right' | 'left' | 'top' | 'bottom';
const SLOT_ORDER: Slot[] = ['right', 'left', 'top', 'bottom'];

/** One connector's measured endpoints — everything the curve needs but the bend. */
interface Anchor {
  id: string;
  from: Pt;
  to: Pt;
  dir: Pt;
  seed: number;
  color: string;
}

/** The pointer handlers that make a box draggable — see `dragPropsFor`. */
type DragProps = Pick<
  React.DOMAttributes<HTMLDivElement>,
  'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onDoubleClick'
>;

/** A card's drag offset, as the custom properties wordMindMap.css reads. */
function offsetVars(offset?: Pt): CSSProperties {
  return { '--mm-dx': `${offset?.x ?? 0}px`, '--mm-dy': `${offset?.y ?? 0}px` } as CSSProperties;
}

/** Theme card: title + one row per word (doodle/emoji, word, speak button,
 *  and whichever of definition / translation / IPA / example is switched on). */
function ThemeCard({
  branch,
  color,
  fields,
  doodles,
  onWordClick,
  onSpeak,
  speakingWord,
  innerRef,
  offset,
  moving,
  dragProps,
}: {
  branch: MindMapNode;
  color: string;
  fields: MapFields;
  doodles: Record<string, string>;
  onWordClick: (word: string) => void;
  onSpeak: (word: MindMapNode) => void;
  speakingWord: string | null;
  innerRef: (el: HTMLDivElement | null) => void;
  /** Where the user has dragged this card, relative to its laid-out slot. */
  offset?: Pt;
  moving: boolean;
  dragProps: DragProps;
}) {
  return (
    <div
      ref={innerRef}
      className={`mm-node ${moving ? 'mm-moving' : ''}`}
      // Pale wash of the theme color (solid — translucency would let the
      // paper dot-grid show through the card). The drag offset rides as
      // custom properties rather than an inline `transform`, because the
      // stylesheet's own transform carries the card's sketchy rotation and an
      // inline one would replace it.
      style={{
        borderColor: color,
        background: `color-mix(in srgb, ${color} 7%, #ffffff)`,
        ...offsetVars(offset),
      }}
      {...dragProps}
    >
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
              {/* IPA sits inline right after the word, where a dictionary puts
                  it; everything else follows as its own line. */}
              {fields.phonetics && w.phonetic && <span className="mm-ipa">{w.phonetic}</span>}
              {fields.definitions && w.definition && <span className="mm-def">— {w.definition}</span>}
              {fields.translation && w.translation && (
                <span className="mm-translation">{w.translation}</span>
              )}
              {fields.examples && w.example && <span className="mm-example">“{w.example}”</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** The rows of the Show menu, in the order they read on a card. */
const FIELD_ROWS: { id: keyof MapFields; label: string; hint: string; icon: string }[] = [
  { id: 'definitions', label: 'Definitions', hint: 'A one-line meaning in English', icon: 'lucide:text' },
  { id: 'translation', label: 'Mother language', hint: '', icon: 'lucide:languages' },
  { id: 'phonetics', label: 'Phonetics', hint: 'IPA pronunciation', icon: 'lucide:audio-lines' },
  { id: 'examples', label: 'Examples', hint: 'One sentence using the word', icon: 'lucide:quote' },
];

/**
 * "Show" menu: which lines each word gets. Anchored under its button rather
 * than portalled — unlike the buttons in the word list, this one is in a plain
 * header with nothing clipping it.
 */
function FieldsMenu({
  fields,
  motherLang,
  onChange,
}: {
  fields: MapFields;
  motherLang: string;
  onChange: (next: MapFields) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const shown = FIELD_ROWS.filter((r) => fields[r.id]).length;

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        title="Choose what each word shows"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg-card text-text-muted text-xs font-medium hover:text-text-primary hover:border-border-light transition-all"
      >
        <Icon icon="lucide:sliders-horizontal" className="text-sm" />
        Show
        <span className="text-[10px] opacity-70">{shown}/{FIELD_ROWS.length}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-60 rounded-lg border border-border bg-bg-card shadow-lg overflow-hidden animate-fade-in">
          <p className="px-3 py-2 border-b border-border text-[11px] font-semibold text-text-primary">
            Show on each word
          </p>
          {FIELD_ROWS.map((row) => {
            const on = fields[row.id];
            // The mother-tongue row names the actual language, so it's obvious
            // which one you'd be turning on.
            const hint = row.id === 'translation' ? motherLang : row.hint;
            return (
              <label
                key={row.id}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-bg-hover/60 transition-colors border-b border-border last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onChange({ ...fields, [row.id]: !on })}
                  className="accent-accent-cyan w-3.5 h-3.5 shrink-0 cursor-pointer"
                />
                <Icon icon={row.icon} className={`text-sm shrink-0 ${on ? 'text-accent-cyan' : 'text-text-muted'}`} />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-text-primary">{row.label}</span>
                  {hint && <span className="block text-[11px] text-text-muted leading-snug">{hint}</span>}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Poster-style radial map: the root title in the center, theme cards
 * distributed around it on all four sides (cycling right/left/top/bottom),
 * connected by thick sketchy strokes. Layout is a plain flex "ring" (columns
 * left/right, bands above/below the root) so variable-height cards can never
 * overlap; the connector SVG is measured off the real DOM after each render.
 *
 * Measuring and drawing are deliberately separate: the layout effect finds
 * each connector's ANCHORS (where it leaves the root, where it meets the
 * card), and the paths are derived from those plus the user's bends — so
 * dragging an arrow re-runs some cheap curve math instead of re-reading the
 * geometry of every card sixty times a second.
 */
function RadialMap({
  tree,
  fields,
  doodles,
  tick,
  storageKey,
  onWordClick,
  exportRef,
}: {
  tree: MindMapNode;
  fields: MapFields;
  doodles: Record<string, string>;
  tick: number;
  /** Cache key of the word set — scopes the saved arrow shapes. */
  storageKey: string;
  onWordClick: (word: string) => void;
  // Filled in with the export handler so the header button (outside this
  // component) can trigger it — exporting needs the canvas element.
  exportRef: RefObject<(() => void) | null>;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  const [view, setView] = useState({ x: 0, y: 0, s: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);
  // Bumped whenever the cards reflow under us — see the observer below.
  const [remeasure, setRemeasure] = useState(0);
  // The user's own edits: bent connectors and moved boxes.
  const [layout, setLayout] = useState<MapLayout>(() => readLayout(storageKey));
  const { bends, cards } = layout;
  // What's being dragged right now (hover is handled in CSS).
  const [bendingArrow, setBendingArrow] = useState<string | null>(null);
  const [movingCard, setMovingCard] = useState<string | null>(null);
  const bendDragRef = useRef<{ id: string; px: number; py: number; base: Pt } | null>(null);
  const cardDragRef = useRef<{ id: string; px: number; py: number; base: Pt; started: boolean } | null>(null);
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

  /**
   * Everything actually drawn, in canvas-local px. The canvas box alone isn't
   * enough once the map can be rearranged: the flex ring sizes it, but a card
   * dragged outward or an arrow bent wide is only a transform on top and
   * doesn't grow it. Both the fit-to-screen button and the PNG export take
   * their bounds from here so nothing the user made ends up cropped.
   * `x`/`y` can be negative — content above or left of the canvas origin.
   */
  const contentBounds = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const s = viewRef.current.s || 1;
    const c = canvas.getBoundingClientRect();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    // Measured from the ink, not from the canvas box: moving a card leaves its
    // slot standing empty in the flex ring, and unioning with the canvas would
    // keep exporting that dead space.
    for (const el of Array.from(canvas.querySelectorAll('.mm-node, .mm-root-node, .mm-arrow'))) {
      const r = el.getBoundingClientRect();
      minX = Math.min(minX, (r.left - c.left) / s);
      minY = Math.min(minY, (r.top - c.top) / s);
      maxX = Math.max(maxX, (r.right - c.left) / s);
      maxY = Math.max(maxY, (r.bottom - c.top) / s);
    }
    if (!Number.isFinite(minX)) return { x: 0, y: 0, width: c.width / s, height: c.height / s };
    const pad = 40; // breathing room around the outermost ink
    return {
      x: minX - pad,
      y: minY - pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    };
  }, []);

  const centerView = useCallback(() => {
    const viewport = viewportRef.current;
    const box = contentBounds();
    if (!viewport || !box || !box.width || !box.height) return;
    const s = Math.max(
      Math.min(viewport.clientWidth / box.width, viewport.clientHeight / box.height, 1),
      0.3,
    );
    // Offset by the box origin, which sits left of / above the canvas origin
    // whenever something has been dragged out that way.
    setView({
      x: (viewport.clientWidth - box.width * s) / 2 - box.x * s,
      y: (viewport.clientHeight - box.height * s) / 2 - box.y * s,
      s,
    });
  }, [contentBounds]);

  // The connectors are measured off the real DOM, so anything that reflows
  // the cards after that measurement leaves them pointing at where the cards
  // used to be. The handwriting webfonts are the big one — they land after
  // first paint and resize every card — but doodles swapping in for emoji and
  // the container itself resizing do it too. One observer covers them all.
  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    const observer = new ResizeObserver(() => setRemeasure((v) => v + 1));
    observer.observe(ring);
    return () => observer.disconnect();
  }, [tree]);

  // A font swap that doesn't change the ring's overall size still moves the
  // cards inside it, and wouldn't trip the observer.
  useEffect(() => {
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) setRemeasure((v) => v + 1);
    });
    return () => { cancelled = true; };
  }, []);

  // Measure the DOM for the connector anchors; recenter on a new tree.
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

    // Where each card sits within its own slot — used to fan the connectors
    // out along the root's edge instead of stacking them all on one point.
    const order = new Map<number, { pos: number; count: number }>();
    for (const slot of SLOT_ORDER) {
      const group = tree.children.map((_, i) => i).filter((i) => slots[i] === slot);
      group.forEach((i, pos) => order.set(i, { pos, count: group.length }));
    }

    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

    const next: Anchor[] = [];
    tree.children.forEach((b, i) => {
      const el = cardRefs.current.get(b.id);
      if (!el) return;
      const card = rel(el.getBoundingClientRect());
      // Attachment comes from the card's SLOT, not its measured position: a
      // left-column card always connects on its RIGHT edge (the side facing
      // the root), a top-band card on its bottom edge, and so on — even when
      // the card sits well above or below the root's level.
      //
      // The one thing that overrides the slot is the user dragging a box
      // clear across the root, where keeping the slot's side would send the
      // stroke out of the card's far edge and back on itself.
      let slot = slots[i];
      if (slot === 'left' && card.x - card.w / 2 > root.x) slot = 'right';
      else if (slot === 'right' && card.x + card.w / 2 < root.x) slot = 'left';
      else if (slot === 'top' && card.y - card.h / 2 > root.y) slot = 'bottom';
      else if (slot === 'bottom' && card.y + card.h / 2 < root.y) slot = 'top';

      const gap = 6; // keep the arrowhead just off the card border
      const { pos, count } = order.get(i) ?? { pos: 0, count: 1 };
      // Fan the origins along the root's edge so two cards on the same side
      // don't start from the same point.
      const fan = pos - (count - 1) / 2;
      const horizontal = slot === 'left' || slot === 'right';
      const spread = horizontal
        ? Math.min(18, (root.h * 0.55) / Math.max(count - 1, 1))
        : Math.min(70, (root.w * 0.5) / Math.max(count - 1, 1));
      // Enter the card at the point on its facing edge CLOSEST to the root's
      // level, not at its centre: a tall column card sits far above or below
      // the root, and aiming at its middle sent the stroke on a long detour
      // behind the neighbouring cards.
      const inset = (span: number) => Math.min(34, span * 0.35);
      const entryY = clamp(root.y, card.y - card.h / 2 + inset(card.h), card.y + card.h / 2 - inset(card.h));
      const entryX = clamp(root.x, card.x - card.w / 2 + inset(card.w), card.x + card.w / 2 - inset(card.w));
      let from: Pt;
      let to: Pt;
      let dir: Pt;
      switch (slot) {
        case 'left':
          dir = { x: -1, y: 0 };
          from = { x: root.x - root.w * 0.5, y: root.y + fan * spread };
          to = { x: card.x + card.w * 0.5 + gap, y: entryY };
          break;
        case 'right':
          dir = { x: 1, y: 0 };
          from = { x: root.x + root.w * 0.5, y: root.y + fan * spread };
          to = { x: card.x - card.w * 0.5 - gap, y: entryY };
          break;
        case 'top':
          dir = { x: 0, y: -1 };
          from = { x: root.x + fan * spread, y: root.y - root.h * 0.5 };
          to = { x: entryX, y: card.y + card.h * 0.5 + gap };
          break;
        default: // bottom
          dir = { x: 0, y: 1 };
          from = { x: root.x + fan * spread, y: root.y + root.h * 0.5 };
          to = { x: entryX, y: card.y - card.h * 0.5 - gap };
      }
      next.push({ id: b.id, from, to, dir, seed: i * 3.7 + 1, color: PALETTE[i % PALETTE.length] });
    });
    setAnchors(next);

    if (centeredForRef.current !== tree) {
      centeredForRef.current = tree;
      centerView();
    }
    // `cards` is a dependency because a moved box changes what the next
    // measurement reads — the transform is baked into getBoundingClientRect.
    // `fields` too: switching a line on or off changes every card's height.
  }, [tree, fields, tick, remeasure, cards, centerView]);

  // Curves from the measured anchors + the user's bends. Cheap enough to redo
  // on every pointermove of a bend drag; measuring the DOM there would not be.
  const lines = useMemo(
    () => anchors.map((a) => ({ ...sketchArrow(a.from, a.to, a.dir, a.seed, bends[a.id]), a })),
    [anchors, bends],
  );

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

  // ── Export ──
  // The poster is exported at its natural size from the live DOM, so it never
  // depends on the pan/zoom or on what fits the viewport. Handing the handler
  // up through a ref keeps the button in the header, where the rest of the
  // map's actions live.
  useEffect(() => {
    exportRef.current = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      void (async () => {
        const toastId = toast.loading('Rendering your mind map…');
        try {
          const blob = await mindMapToPngBlob(canvas, {
            // The drag handles and speak buttons are things to click, not
            // things to look at — they don't belong in a saved image.
            hide: ['.mm-grab', '.mm-knob', '.mm-speak'],
          });
          downloadBlob(blob, 'mind-map.png');
          toast.success('Saved as mind-map.png', { id: toastId });
        } catch (err) {
          toast.error(`Couldn't export the image: ${(err as Error).message}`, { id: toastId });
        }
      })();
    };
    return () => { exportRef.current = null; };
  }, [exportRef]);

  // ── Bending an arrow ──
  // Displacing both control points by `bend` moves the curve's midpoint by
  // MID_GAIN × bend, so dividing the drag by MID_GAIN makes the handle track
  // the pointer exactly. Coordinates are canvas-local, hence the ÷ scale.
  const localPoint = (e: { clientX: number; clientY: number }): Pt | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    const s = viewRef.current.s || 1;
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  };

  const startBend = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    const p = localPoint(e);
    if (!p) return;
    // Keep the map from panning underneath the drag.
    e.stopPropagation();
    e.preventDefault();
    bendDragRef.current = { id, px: p.x, py: p.y, base: bends[id] ?? { x: 0, y: 0 } };
    setBendingArrow(id);
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
  };

  const moveBend = (e: React.PointerEvent) => {
    const drag = bendDragRef.current;
    if (!drag) return;
    const p = localPoint(e);
    if (!p) return;
    e.stopPropagation();
    setLayout((prev) => ({
      ...prev,
      bends: {
        ...prev.bends,
        [drag.id]: {
          x: clampTo(MAX_BEND, drag.base.x + (p.x - drag.px) / MID_GAIN),
          y: clampTo(MAX_BEND, drag.base.y + (p.y - drag.py) / MID_GAIN),
        },
      },
    }));
  };

  const endBend = () => {
    if (!bendDragRef.current) return;
    bendDragRef.current = null;
    setBendingArrow(null);
  };

  // ── Moving a box ──
  // Cards and the center title are placed by the flex ring; a drag just adds
  // a translation on top, so the ring keeps deciding the arrangement and the
  // user nudges it. The connectors follow because they're measured off the
  // real DOM, and getBoundingClientRect already includes the transform.
  const startCardDrag = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    const p = localPoint(e);
    if (!p) return;
    // A card drag is a move, never a pan — but nothing is committed yet, and
    // no preventDefault: a press that never travels has to stay a click, so
    // the word under it still opens.
    e.stopPropagation();
    cardDragRef.current = { id, px: p.x, py: p.y, base: cards[id] ?? { x: 0, y: 0 }, started: false };
    dragMovedRef.current = false;
  };

  const moveCard = (e: React.PointerEvent) => {
    const drag = cardDragRef.current;
    if (!drag) return;
    const p = localPoint(e);
    if (!p) return;
    e.stopPropagation();
    if (!drag.started) {
      // Below the threshold this is still a click on whatever's under the
      // pointer. Capturing at pointer-down instead would swallow every word.
      if (Math.abs(p.x - drag.px) + Math.abs(p.y - drag.py) < 4) return;
      drag.started = true;
      dragMovedRef.current = true; // the word/speak handlers check this
      setMovingCard(drag.id);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    setLayout((prev) => ({
      ...prev,
      cards: {
        ...prev.cards,
        [drag.id]: {
          x: clampTo(MAX_MOVE, drag.base.x + (p.x - drag.px)),
          y: clampTo(MAX_MOVE, drag.base.y + (p.y - drag.py)),
        },
      },
    }));
  };

  const endCardDrag = () => {
    if (!cardDragRef.current) return;
    cardDragRef.current = null;
    setMovingCard(null);
  };

  /** Double-click puts one arrow or box back where the layout had it. */
  const resetEdit = (kind: 'bends' | 'cards', id: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setLayout((prev) => {
      if (!(id in prev[kind])) return prev;
      const next = { ...prev[kind] };
      delete next[id];
      return { ...prev, [kind]: next };
    });
  };

  const dragPropsFor = (id: string): DragProps => ({
    onPointerDown: (e) => startCardDrag(e, id),
    onPointerMove: moveCard,
    onPointerUp: endCardDrag,
    onPointerCancel: endCardDrag,
    onDoubleClick: (e) => {
      // Double-clicking a word is two attempts to open it, not a request to
      // move its card back.
      if ((e.target as Element).closest?.('.mm-word, .mm-speak')) return;
      resetEdit('cards', id)(e);
    },
  });

  // Persist whenever a drag settles. Writing on every pointermove would hit
  // localStorage sixty times a second for no benefit.
  useEffect(() => {
    if (bendingArrow || movingCard) return;
    writeLayout(storageKey, layout);
  }, [layout, bendingArrow, movingCard, storageKey]);

  // A different word set is a different map — load its own saved edits.
  useEffect(() => {
    setLayout(readLayout(storageKey));
  }, [storageKey]);

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
        fields={fields}
        doodles={doodles}
        onWordClick={(w) => {
          if (dragMovedRef.current) return; // pan release, not a click
          onWordClick(w);
        }}
        onSpeak={speak}
        speakingWord={speakingWord}
        innerRef={cardRef(b.id)}
        offset={cards[b.id]}
        moving={movingCard === b.id}
        dragProps={dragPropsFor(b.id)}
      />
    ));

  return (
    <div
      ref={viewportRef}
      className="word-mindmap relative h-[calc(100vh-11rem)] min-h-[30rem] rounded-2xl border-2 border-border overflow-hidden animate-fade-in cursor-grab select-none touch-none"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        // Words, speak buttons and the arrow handles keep their own behavior —
        // starting a pan (and especially pointer capture) on them would
        // retarget the event to this container and swallow it.
        if ((e.target as Element).closest?.('.mm-word, .mm-speak, .mm-grab, .mm-knob')) {
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
          {lines.map((l) => (
            <path key={l.a.id} className="mm-arrow" d={l.fill} fill={l.a.color} />
          ))}
          {/* Drag layer, above every stroke so a handle is never buried under
              a neighbouring arrow. The wide invisible stroke is the grab
              target — the drawn arrow itself is far too thin to aim at. */}
          {lines.map((l) => (
            // The handle is always mounted and revealed by CSS hover on the
            // group. Mounting it on a hover STATE instead looks the same until
            // a drag ends: releasing the capture fires a leave, the handle
            // unmounts from under the pointer, and the arrow you were just
            // editing goes quiet.
            <g
              key={l.a.id}
              className={`mm-arrow-ctl ${bendingArrow === l.a.id ? 'mm-bending' : ''}`}
              onPointerDown={(e) => startBend(e, l.a.id)}
              onPointerMove={moveBend}
              onPointerUp={endBend}
              onPointerCancel={endBend}
              onDoubleClick={resetEdit('bends', l.a.id)}
            >
              <path className="mm-grab" d={l.line}>
                <title>Drag to bend · double-click to reset</title>
              </path>
              <circle className="mm-knob" cx={l.knob.x} cy={l.knob.y} r={7} fill={l.a.color} />
            </g>
          ))}
        </svg>
        <div ref={ringRef} className="mm-ring">
          <div className="mm-col">{renderCards('left')}</div>
          <div className="mm-center">
            <div className="mm-band">{renderCards('top')}</div>
            <div
              ref={rootRef}
              className={`mm-root-node ${movingCard === ROOT_ID ? 'mm-moving' : ''}`}
              style={offsetVars(cards[ROOT_ID])}
              {...dragPropsFor(ROOT_ID)}
            >
              {tree.emoji ? `${tree.emoji} ` : ''}
              {ROOT_TOPIC}
            </div>
            <div className="mm-band">{renderCards('bottom')}</div>
          </div>
          <div className="mm-col">{renderCards('right')}</div>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="mm-zoom absolute bottom-3 right-3 flex flex-col gap-1.5">
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
  // Which per-word lines the cards show, remembered across sessions.
  const [fields, setFields] = useState<MapFields>(readFields);

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
  // Set by RadialMap while it's mounted — see its export effect.
  const exportRef = useRef<(() => void) | null>(null);

  const motherLang = getMotherLanguage();
  const key = useMemo(
    () => (chosen ? cacheKey(chosen, motherLang) : null),
    [chosen, motherLang],
  );

  const load = useCallback(
    async (force: boolean) => {
      if (!key || !chosen) return;
      // Re-picking the same word set keeps the already-loaded map (and the
      // user's pan/zoom); only a changed set or Redraw reloads.
      if (!force && loadedKeyRef.current === key) return;
      setLoading(true);
      setError(null);

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

        // Not in localStorage — check the server before spending an AI call
        // (covers a cleared browser, a new device, a signed-in switch).
        const saved = await fetchMindmap(chosen, motherLang);
        if (saved) {
          setTree(saved);
          loadedKeyRef.current = key;
          try {
            localStorage.setItem(key, JSON.stringify(saved));
          } catch { /* storage full — the map still renders */ }
          setLoading(false);
          return;
        }
      }

      try {
        // The mother tongue decides which stored translation the server
        // attaches to each word; it never reaches the prompt.
        const text = await callAiAction('mindmap', { words: chosen, motherLang });
        const root = parseMindMap(text);
        setTree(root);
        loadedKeyRef.current = key;
        try {
          localStorage.setItem(key, JSON.stringify(root));
        } catch { /* storage full — the map still renders */ }
        // Best-effort: the map already rendered from the AI response, so a
        // failed background save shouldn't surface an error to the user.
        void saveMindmap(chosen, motherLang, root).catch(() => {});
      } catch (err) {
        setError((err as Error).message || 'Could not build the mind map.');
      } finally {
        setLoading(false);
      }
    },
    [key, chosen, motherLang],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  // Previously generated maps, for the picker to offer reopening one instead
  // of regenerating. Scoped to the current mother tongue — a map's baked-in
  // translations only make sense for the tongue it was built for.
  const [savedMaps, setSavedMaps] = useState<SavedMindmap[]>([]);
  useEffect(() => {
    let alive = true;
    void listMindmaps(motherLang).then((maps) => { if (alive) setSavedMaps(maps); });
    return () => { alive = false; };
  }, [motherLang]);

  /** Reopen a saved map instantly — no AI call, no server round trip. */
  const openSaved = useCallback((saved: SavedMindmap) => {
    const k = cacheKey(saved.words, motherLang);
    try {
      localStorage.setItem(k, JSON.stringify(saved.tree));
    } catch { /* storage full — the map still renders */ }
    loadedKeyRef.current = k;
    setTree(saved.tree);
    setError(null);
    setLoading(false);
    setPicked(new Set(saved.words));
    setChosen(saved.words);
  }, [motherLang]);

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
      const cached = readLocalDoodle(k);
      if (cached) {
        doodlesRef.current[k] = cached;
        continue;
      }
      // Older thumbnail (white or badly-keyed background): re-key it
      // locally instead of paying to regenerate.
      const legacy = readLegacyDoodle(k);
      if (legacy) {
        migrate.push({ k, legacy });
        continue;
      }
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
            writeLocalDoodle(k, thumb);
          } catch { /* undecodable old thumb — it'll regenerate next visit */ }
        }
        if (!cancelled) setDoodleTick((t) => t + 1);
      })();
    }

    if (missing.length === 0) return;

    // Pull server-cached doodles in ONE batched request (a free lookup —
    // a plain lookup never generates). Misses become the sketchable set.
    void (async () => {
      let images: Record<string, string> = {};
      try {
        images = await callDoodles(
          missing.map((w) => ({ word: w.topic, definition: w.definition })),
        );
      } catch (err) {
        // Lookup failed (e.g. offline) — everything stays sketchable.
        console.warn(`[mindmap] doodle lookup failed: ${(err as Error).message}`);
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
          writeLocalDoodle(k, thumb);
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
          const images = await callDoodles(
            sheet.map((w) => ({ word: w.topic, definition: w.definition })),
            { generate: true }, // the Sketch button — the one path that spends money
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
              writeLocalDoodle(k, thumb);
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

  // Remember the chosen lines for next time.
  useEffect(() => {
    try {
      localStorage.setItem(FIELDS_KEY, JSON.stringify(fields));
    } catch { /* storage full — the choice still applies this session */ }
  }, [fields]);

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

        {savedMaps.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
              Your saved mind maps
            </h2>
            <div className="flex flex-wrap gap-2">
              {savedMaps.map((m) => (
                <button
                  key={m.id}
                  onClick={() => openSaved(m)}
                  className="text-left px-3 py-2 rounded-xl border border-border bg-bg-card hover:border-accent-cyan/40 transition-all max-w-[240px]"
                >
                  <div className="text-sm font-display font-bold text-text-primary">
                    {m.words.length} words
                  </div>
                  <div className="text-xs text-text-muted truncate">
                    {m.words.slice(0, 4).join(', ')}{m.words.length > 4 ? '…' : ''}
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">{timeAgo(m.updatedAt)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

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
          drag paper to pan · scroll to zoom · click a word to study it · drag a card or arrow to
          rearrange, double-click it to reset
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
            <FieldsMenu fields={fields} motherLang={motherLang} onChange={setFields} />
          )}
          {tree && !loading && (
            <button
              onClick={() => exportRef.current?.()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-bg-card text-text-muted text-xs font-medium hover:text-text-primary hover:border-border-light transition-all"
              title="Save the whole map as a PNG image"
            >
              <Icon icon="lucide:image-down" className="text-sm" />
              Export PNG
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
          fields={fields}
          doodles={doodlesRef.current}
          tick={doodleTick}
          storageKey={key ?? ''}
          onWordClick={(word) => navigate(`/?word=${encodeURIComponent(word)}`)}
          exportRef={exportRef}
        />
      ) : null}
    </div>
  );
}
