// Build the wardrobe atlas — your buddy, in layers you can dress — from the
// villager atlas (scripts/compose-villagers.mjs):
//
//   node scripts/compose-wardrobe.mjs
//
// The villager sheet is one bald body plus a hairstyle per look, each a 20×20
// frame (9 idle, 8 walk). Here that becomes three layers drawn in order:
//
//   body.<garment>.<colour>  the body, its clothes recoloured — everyday
//                        clothes (the shirt's colour), an áo dài or an áo the,
//                        each in its own range of colours
//   hair.<style>.<color> the hairstyle alone (the look minus the bald body),
//                        in dark, brown or grey; `….hat` is the same hair
//                        trimmed to the crown, to wear under a hat
//   hat.<id>             drawn onto the head — nón lá, khăn đóng
//   prop.<id>            what a keeper carries, drawn per frame at the hand
//                        (a book, a cup of tea, a brush, a scroll) or on the
//                        head (headphones)
//
// The body is a chibi: a big head, then four or five rows of clothes. Its
// shirt and trousers are told apart by colour; everyday clothes recolour the
// shirt, an áo dài or áo the is the shirt and the first rows below it as the
// tunic, white trousers under. Hats are drawn per
// frame from where the head is, so they bob with it.
//
// The pack only draws the side view (facing right; the game mirrors it for
// left). Facing the camera and facing away are made from it: the front is the
// face's half of the head and body mirrored about their centres — both eyes,
// the bangs, both arms — and the back is the other half mirrored, the back of
// the head. Every layer goes through the same mirror, so any outfit, hair and
// hat face all four ways. Walking towards or away, the legs take turns
// lifting and the body bobs.
//
// Frames are named `<layer>-<clip>-<i>`, 1px apart like the villager sheet;
// clips `idle` and `walk` are the side view, then `idleFront`, `walkFront`,
// `idleBack`, `walkBack` after them on each row, so a row's first 17 frames
// are where they always were. src/game/wardrobe-layers.json lists the layers'
// rows for the DOM.
// Keep the option lists in step with src/game/wardrobe.ts.

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const DIR = new URL('../public/game/characters/', import.meta.url);
const path = (name) => fileURLToPath(new URL(name, DIR));

const F = 20, PAD = 1, STRIDE = F + PAD;
const CLIPS = [{ name: 'idle', frames: 9 }, { name: 'walk', frames: 8 }];
const VIEWS = [{ view: 'side', suffix: '' }, { view: 'front', suffix: 'Front' }, { view: 'back', suffix: 'Back' }];
const FRAMES = VIEWS.flatMap(({ view, suffix }) => CLIPS.flatMap((c) =>
  Array.from({ length: c.frames }, (_, i) => ({ clip: c.name, i, view, name: `${c.name}${suffix}` }))));

const STYLES = ['bowlhair', 'curlyhair', 'longhair', 'mophair', 'shorthair', 'spikeyhair'];
/** Each colour as [dark, light] for the hair's two shades. */
const HAIR_COLORS = {
  dark: [[62, 39, 49], [93, 59, 74]],      // the pack's own
  brown: [[102, 62, 38], [146, 94, 56]],
  grey: [[136, 132, 140], [188, 184, 192]],
};
/** Each colour as [dark, light]. */
const COLOURS = {
  red: [[165, 31, 51], [233, 50, 69]],          // the pack's own shirt
  purple: [[92, 46, 112], [128, 72, 152]],      // tím Huế
  white: [[206, 204, 214], [246, 246, 250]],
  blue: [[40, 82, 150], [72, 122, 196]],
  yellow: [[196, 146, 30], [240, 196, 64]],     // the royal colour
  pink: [[196, 92, 132], [236, 140, 172]],
  green: [[46, 110, 76], [78, 156, 106]],
  black: [[28, 28, 38], [52, 52, 68]],
  navy: [[30, 40, 78], [50, 64, 116]],
  brown: [[96, 60, 40], [136, 90, 60]],
};
/** What each garment comes in — keep in step with GARMENTS in wardrobe.ts. */
const GARMENTS = {
  everyday: ['red', 'blue', 'green', 'yellow', 'black'],
  aoDai: ['purple', 'white', 'red', 'blue', 'yellow', 'pink', 'green'],
  aoThe: ['black', 'navy', 'brown'],
  aoBaBa: ['black', 'brown', 'white', 'navy'],
  uniform: ['white'],
  jeans: ['red', 'blue', 'green', 'yellow', 'black', 'white', 'pink'],
  longBao: ['yellow', 'red'],
};
const TROUSERS = [[196, 190, 180], [238, 234, 226]];
const DENIM = [[44, 70, 120], [70, 104, 160]];
const GOLD = [[196, 146, 30], [246, 206, 90]];
const HATS = ['nonLa', 'khanDong', 'cap', 'mandarin', 'crown'];
const PROPS = ['book', 'teacup', 'brush', 'scroll', 'headphones'];

// The body's clothes, by colour: [ref, kind, shade].
const CLOTH = [
  [[165, 31, 51], 'shirt', 0], [[166, 31, 52], 'shirt', 0],
  [[233, 50, 69], 'shirt', 1], [[232, 49, 69], 'shirt', 1],
  [[36, 43, 66], 'pants', 0], [[37, 44, 67], 'pants', 0],
  [[55, 68, 100], 'pants', 1], [[56, 69, 101], 'pants', 1],
];
const near = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 12;
const cloth = (p) => CLOTH.find(([c]) => near(p, c));

const atlas = JSON.parse(readFileSync(path('villagers.json'), 'utf8'));
const { data: src, info } = await sharp(path('villagers.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

/** One villager frame as 20×20 RGBA. */
function frame(look, clip, i) {
  const f = atlas.frames[`${look}-${clip}-${i}`].frame;
  const out = new Uint8ClampedArray(F * F * 4);
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    const s = ((f.y + y) * info.width + f.x + x) * 4, d = (y * F + x) * 4;
    for (let k = 0; k < 4; k++) out[d + k] = src[s + k];
  }
  return out;
}
const px = (buf, x, y) => { const i = (y * F + x) * 4; return [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]]; };
const put = (buf, x, y, c) => {
  if (x < 0 || y < 0 || x >= F || y >= F) return;
  const i = (y * F + x) * 4; buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
};
const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];

function body(garment, colour, base) {
  const out = new Uint8ClampedArray(base);
  const tunic = COLOURS[colour];
  // Shirt and trousers recoloured on their own: everyday clothes (the pack's
  // trousers), jeans (denim), the áo bà ba (one colour, top to toe), the
  // school uniform (white shirt, navy trousers).
  const split = {
    everyday: [tunic, null], jeans: [tunic, DENIM], aoBaBa: [tunic, tunic], uniform: [COLOURS.white, COLOURS.navy],
  }[garment];
  if (split) {
    const [shirt, pants] = split;
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
      const p = px(base, x, y);
      const c = p[3] && cloth(p);
      if (!c) continue;
      if (c[1] === 'shirt') put(out, x, y, shirt[c[2]]);
      else if (pants) put(out, x, y, pants[c[2]]);
    }
    return out;
  }
  if (garment === 'longBao') {
    // The emperor's robe: one colour from the collar to the feet, its collar
    // and hem trimmed in gold.
    let top = F, bottom = -1;
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) if (px(base, x, y)[3] && cloth(px(base, x, y))) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
      const p = px(base, x, y);
      const c = p[3] && cloth(p);
      if (!c) continue;
      put(out, x, y, (y === top || y === bottom ? GOLD : tunic)[c[2]]);
    }
    return out;
  }
  // Rows that hold clothes, top to bottom: the tunic covers the shirt and the
  // row below it; anything lower is trousers.
  const rows = [];
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) if (px(base, x, y)[3] && cloth(px(base, x, y))) { rows.push(y); break; }
  const tunicTo = rows[0] + 2;
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    const p = px(base, x, y);
    const c = p[3] && cloth(p);
    if (!c) continue;
    put(out, x, y, (y <= tunicTo ? tunic : TROUSERS)[c[2]]);
  }
  return out;
}

function hair(style, color, base, look, underHat = false) {
  const out = new Uint8ClampedArray(F * F * 4);
  // Under a hat, nothing grows above the crown — it would poke through.
  const crown = underHat ? head(base).top : -1;
  const [dark, light] = HAIR_COLORS[color];
  // The hair's own colours, darkest first, so they map onto dark → light.
  const tones = new Set();
  const diff = [];
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    const a = px(look, x, y), b = px(base, x, y);
    if (!a[3] || (b[3] && a[0] === b[0] && a[1] === b[1] && a[2] === b[2])) continue;
    diff.push([x, y, a]);
    if (lum(a) > 40) tones.add(lum(a));
  }
  const sorted = [...tones].sort((p, q) => p - q);
  for (const [x, y, a] of diff) {
    if (y < crown) continue;
    if (lum(a) <= 40) { put(out, x, y, a); continue; }   // outline stays
    const t = sorted.length > 1 ? sorted.indexOf(lum(a)) / (sorted.length - 1) : 0;
    put(out, x, y, dark.map((v, k) => Math.round(v + (light[k] - v) * t)));
  }
  return out;
}

/** Where the head is in this frame: its top row and centre column. */
function head(base) {
  let top = F;
  for (let y = 0; y < F && top === F; y++) for (let x = 0; x < F; x++) if (px(base, x, y)[3]) { top = y; break; }
  let l = F, r = -1;
  for (let x = 0; x < F; x++) if (px(base, x, top + 3)[3]) { l = Math.min(l, x); r = Math.max(r, x); }
  return { top, l, r, cx: (l + r) / 2 };
}

const STRAW = { line: [96, 72, 40], dark: [170, 140, 86], mid: [206, 180, 122], light: [232, 212, 158] };
function hat(id, base) {
  const out = new Uint8ClampedArray(F * F * 4);
  const h = head(base);
  if (id === 'nonLa') {
    // A cone over the crown: apex four rows above the head, brim a row into it.
    const halves = [0, 1, 3, 4, 6, 8];
    const apex = h.top - 4;
    halves.forEach((half, r) => {
      const y = apex + r;
      for (let dx = -half; dx <= half; dx++) {
        const x = Math.round(h.cx + dx);
        const edge = Math.abs(dx) === half;
        const shade = r === halves.length - 1 ? STRAW.dark : dx < 0 ? STRAW.light : STRAW.mid;
        put(out, x, y, edge ? STRAW.line : (r === 3 && Math.abs(dx) < half ? STRAW.dark : shade));
      }
    });
    put(out, Math.round(h.cx), apex - 1, STRAW.line);
  } else if (id === 'khanDong') {
    // A wrapped turban on the crown: three rows, the folds running diagonally.
    const navy = [34, 38, 64], fold = [62, 68, 108], line = [18, 16, 28];
    for (let r = 0; r < 4; r++) {
      const y = h.top - 1 + r;
      const inset = r === 0 ? 2 : 0;
      for (let x = h.l + inset; x <= h.r - inset; x++) {
        const edge = x === h.l + inset || x === h.r - inset || r === 0 || r === 3;
        put(out, x, y, edge ? line : (x + r) % 3 === 0 ? fold : navy);
      }
    }
  } else if (id === 'cap') {
    // A red cap: the crown over the head, its bill out in front (to the right,
    // the way the side view faces).
    const red = [214, 52, 52], light = [240, 96, 90], line = [70, 18, 22];
    for (let r = 0; r < 3; r++) {
      const y = h.top - 1 + r;
      for (let x = h.l + (r === 0 ? 1 : 0); x <= h.r - (r === 0 ? 1 : 0); x++) {
        const edge = r === 0 || x === h.l || x === h.r;
        put(out, x, y, edge ? line : x < h.cx ? light : red);
      }
    }
    for (let x = h.r; x <= h.r + 3; x++) put(out, x, h.top + 1, x === h.r + 3 ? line : red);
  } else if (id === 'mandarin') {
    // The mandarin's hat (mũ cánh chuồn): a black crown on the head, a wing
    // standing out on either side.
    const black = [30, 28, 36], sheen = [70, 68, 84], gold = [232, 186, 70];
    for (let r = 0; r < 4; r++) {
      const y = h.top - 2 + r;
      for (let x = h.l + 1; x <= h.r - 1; x++) put(out, x, y, r === 0 ? black : (x + r) % 4 === 0 ? sheen : black);
    }
    put(out, Math.round(h.cx), h.top - 1, gold);
    for (const [x0, dir] of [[h.l, -1], [h.r, 1]]) {
      for (let k = 0; k < 4; k++) put(out, x0 + dir * k, h.top - 1, black);
      put(out, x0 + dir * 3, h.top - 2, black);
      put(out, x0 + dir * 3, h.top, black);
    }
  } else if (id === 'crown') {
    // A gold crown, three points over a band set with a red stone.
    const gold = [240, 194, 64], dark = [168, 120, 24], ruby = [214, 40, 56];
    for (let x = h.l + 1; x <= h.r - 1; x++) { put(out, x, h.top, dark); put(out, x, h.top - 1, gold); }
    for (const x of [h.l + 1, Math.round(h.cx), h.r - 1]) { put(out, x, h.top - 2, gold); put(out, x, h.top - 3, dark); }
    put(out, Math.round(h.cx), h.top - 1, ruby);
  }
  return out;
}

/** The visible hand: the skin pixel at the body's side. Some walk frames hide
 *  it behind the body; those reuse the last hand seen. */
let lastHand = { x: 14, y: 17 };
function hand(base) {
  for (let y = 12; y < F; y++) for (let x = F - 1; x >= 0; x--) {
    const p = px(base, x, y);
    if (p[3] && near(p, [187, 109, 83])) { lastHand = { x, y }; return lastHand; }
  }
  return lastHand;
}

const INK = [28, 18, 12];
function prop(id, base) {
  const out = new Uint8ClampedArray(F * F * 4);
  const { x: hx, y: hy } = hand(base);
  const dot = (x, y, c) => put(out, x, y, c);
  // Props are big for the frame on purpose: at 20px anything smaller than a
  // handful of pixels can't be told apart at game zoom.
  if (id === 'book') {
    // A red book held up beside the body: gold bands, pages showing on the right.
    for (let y = hy - 6; y <= hy; y++) for (let x = hx - 2; x <= hx + 3; x++) {
      const edge = x === hx - 2 || x === hx + 3 || y === hy - 6 || y === hy;
      const band = y === hy - 4 || y === hy - 2;
      dot(x, y, edge ? INK : x === hx + 2 ? [246, 236, 214] : band ? [240, 192, 80] : [192, 57, 43]);
    }
  } else if (id === 'teacup') {
    // A cup on its saucer, a curl of steam over it.
    for (let x = hx - 2; x <= hx + 2; x++) { dot(x, hy - 3, INK); dot(x, hy - 2, [246, 236, 214]); dot(x, hy - 1, [90, 160, 200]); }
    for (const x of [hx - 3, hx + 3]) { dot(x, hy - 2, INK); dot(x, hy - 1, INK); }
    for (let x = hx - 3; x <= hx + 3; x++) dot(x, hy, INK);
    dot(hx + 4, hy - 2, INK);                                  // handle
    for (const [dx, dy] of [[-1, -5], [0, -6], [1, -7], [0, -8]]) dot(hx + dx, hy + dy, [230, 230, 230]);
  } else if (id === 'brush') {
    // A long brush held tilted up, gold ferrule, a heavy inked tip — leaning
    // in from the hand so the tip stays inside the frame.
    const bx = hx - 2;
    for (let i = 0; i < 5; i++) { dot(bx - 1 + i, hy + 1 - i, [160, 112, 60]); dot(bx + i, hy + 1 - i, [120, 80, 40]); }
    dot(bx + 4, hy - 4, [240, 192, 80]); dot(bx + 5, hy - 4, [240, 192, 80]);
    for (const [dx, dy] of [[5, -5], [6, -5], [5, -6], [6, -6], [5, -7]]) dot(bx + dx, hy + dy, INK);
  } else if (id === 'scroll') {
    // A long scroll held across the body, chunky gold rolls at both ends.
    const sx = hx - 3;
    for (let x = sx - 3; x <= sx + 3; x++) { dot(x, hy - 2, INK); dot(x, hy - 1, [246, 236, 214]); dot(x, hy, [214, 200, 170]); dot(x, hy + 1, INK); }
    for (const x of [sx - 5, sx - 4, sx + 4, sx + 5]) for (let y = hy - 2; y <= hy + 1; y++) dot(x, y, y === hy - 2 || y === hy + 1 ? INK : [240, 192, 80]);
  } else if (id === 'headphones') {
    // A thick band over the crown, big red cups over the ears.
    const h = head(base);
    for (let x = h.l + 2; x <= h.r - 2; x++) dot(x, h.top - 2, INK);
    for (let x = h.l + 1; x <= h.r - 1; x++) dot(x, h.top - 1, [240, 192, 80]);
    dot(h.l, h.top - 1, INK); dot(h.r, h.top - 1, INK);
    for (let y = h.top; y < h.top + 4; y++) { dot(h.l - 1, y, INK); dot(h.l, y, [240, 192, 80]); dot(h.r, y, [240, 192, 80]); dot(h.r + 1, y, INK); }
    for (const x0 of [h.l - 2, h.r]) for (let y = h.top + 4; y <= h.top + 9; y++) for (let x = x0; x <= x0 + 2; x++) {
      const edge = y === h.top + 4 || y === h.top + 9 || x === x0 || x === x0 + 2;
      dot(x, y, edge ? INK : [214, 60, 46]);
    }
  }
  return out;
}

// ── Facing the camera, and facing away ──

/** Where to mirror this frame: the head's centre for the rows above the
 *  collar, the clothes' centre below it. */
function axes(base) {
  const h = head(base);
  let collar = F, l = F, r = -1;
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    const p = px(base, x, y);
    if (!p[3] || !cloth(p)) continue;
    collar = Math.min(collar, y); l = Math.min(l, x); r = Math.max(r, x);
  }
  return { collar, head: h.cx, body: (l + r) / 2 };
}

/** The frame turned to face the camera (`front`) or away (`back`): each row
 *  keeps the half on that side of its axis, mirrored onto the other. */
function turn(img, base, view) {
  const a = axes(base);
  const out = new Uint8ClampedArray(F * F * 4);
  for (let y = 0; y < F; y++) {
    const axis = y < a.collar ? a.head : a.body;
    for (let x = 0; x < F; x++) {
      const keep = view === 'front' ? x >= axis : x <= axis;
      const sx = keep ? x : Math.round(2 * axis - x);
      if (sx < 0 || sx >= F) continue;
      const s = (y * F + sx) * 4, d = (y * F + x) * 4;
      for (let k = 0; k < 4; k++) out[d + k] = img[s + k];
    }
  }
  return out;
}

/** Walking towards or away: the standing frame, a leg lifted in turn (the
 *  body layer's own), and the whole figure a pixel higher as the legs pass. */
const STEP = ['left', 'left', null, null, 'right', 'right', null, null];
function stride(img, base, i, isBody) {
  const a = axes(base);
  let feet = -1;
  for (let y = F - 1; y >= 0 && feet < 0; y--) for (let x = 0; x < F; x++) if (px(base, x, y)[3]) { feet = y; break; }
  const out = new Uint8ClampedArray(img);
  const lift = STEP[i];
  if (isBody && lift) {
    for (const y of [feet - 1, feet]) {
      for (let x = 0; x < F; x++) {
        if ((lift === 'left') !== (x < a.body)) continue;
        const s = (y * F + x) * 4, d = ((y - 1) * F + x) * 4;
        for (let k = 0; k < 4; k++) { out[d + k] = img[s + k]; if (y === feet) out[s + k] = 0; }
      }
    }
  }
  if (lift) return out;
  // Bob: up a pixel.
  const up = new Uint8ClampedArray(F * F * 4);
  up.set(out.subarray(F * 4), 0);
  return up;
}

/** From behind, the hair covers the head: every bit of the head the hair
 *  doesn't (the face's skin, mirrored round) takes the hair's colour, all but
 *  the nape. Under a hat that's what shows below its brim. */
function backOfHead(hairImg, base, color) {
  const [dark, light] = HAIR_COLORS[color];
  const { collar } = axes(base);
  for (let y = 0; y < collar - 1; y++) {
    for (let x = 0; x < F; x++) {
      const b = px(base, x, y), h = px(hairImg, x, y);
      if (!b[3] || h[3] || lum(b) <= 40) continue;    // outside the head, under hair already, or its outline
      put(hairImg, x, y, (x + y) % 3 === 0 ? light : dark);
    }
  }
}

/** One layer's frame in any view. Props are held, not mirrored — two books
 *  would be one too many — and are hidden behind the body from the back
 *  (headphones excepted, which turn with the head). */
function viewFrame(layer, view, clip, i) {
  if (view === 'side') return layer.draw(frame('base', clip, i), clip, i);
  // Walking front or back starts from the side view's first standing frame.
  const [sClip, sI] = clip === 'walk' ? ['idle', 0] : [clip, i];
  const base = frame('base', sClip, sI);
  const img = layer.draw(base, sClip, sI);
  const held = layer.name.startsWith('prop.') && layer.name !== 'prop.headphones';
  const turned = held ? (view === 'back' ? new Uint8ClampedArray(F * F * 4) : img) : turn(img, base, view);
  if (view === 'back' && layer.name.startsWith('hair.')) backOfHead(turned, turn(base, base, 'back'), layer.name.split('.')[2]);
  return clip === 'walk' ? stride(turned, turn(base, base, view), i, layer.name.startsWith('body.')) : turned;
}

// ── Lay out the atlas: one row per layer, its frames across ──
const layers = [
  ...Object.entries(GARMENTS).flatMap(([g, colours]) => colours.map((c) => ({
    name: `body.${g}.${c}`, draw: (b) => body(g, c, b),
  }))),
  ...STYLES.flatMap((s) => Object.keys(HAIR_COLORS).flatMap((c) => [false, true].map((underHat) => ({
    name: `hair.${s}.${c}${underHat ? '.hat' : ''}`, draw: (b, clip, i) => hair(s, c, b, frame(s, clip, i), underHat),
  })))),
  ...HATS.map((id) => ({ name: `hat.${id}`, draw: (b) => hat(id, b) })),
  ...PROPS.map((id) => ({ name: `prop.${id}`, draw: (b) => prop(id, b) })),
];
const W = FRAMES.length * STRIDE - PAD, H = layers.length * STRIDE - PAD;
const sheet = Buffer.alloc(W * H * 4);
const frames = {};
layers.forEach((layer, row) => {
  FRAMES.forEach(({ clip, i, view, name }, col) => {
    const img = viewFrame(layer, view, clip, i);
    const ox = col * STRIDE, oy = row * STRIDE;
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
      const s = (y * F + x) * 4, d = ((oy + y) * W + ox + x) * 4;
      for (let k = 0; k < 4; k++) sheet[d + k] = img[s + k];
    }
    frames[`${layer.name}-${name}-${i}`] = {
      frame: { x: ox, y: oy, w: F, h: F }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: F, h: F }, sourceSize: { w: F, h: F },
    };
  });
});
await sharp(sheet, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path('wardrobe.png'));
// The layers' rows, for drawing a look outside Phaser (the tailor's tiles).
writeFileSync(
  fileURLToPath(new URL('../src/game/wardrobe-layers.json', import.meta.url)),
  `${JSON.stringify({ stride: STRIDE, frame: F, width: W, height: H, layers: layers.map((l) => l.name) })}\n`,
);
writeFileSync(path('wardrobe.json'), JSON.stringify({ frames, meta: { image: 'wardrobe.png', size: { w: W, h: H }, scale: '1' } }));
console.log(`wardrobe.png ${W}×${H} — ${layers.length} layers`);
