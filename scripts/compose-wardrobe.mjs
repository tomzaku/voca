// Build the wardrobe atlas — your buddy, in layers you can dress — from the
// villager atlas (scripts/compose-villagers.mjs):
//
//   node scripts/compose-wardrobe.mjs
//
// The villager sheet is one bald body plus a hairstyle per look, each a 20×20
// frame (9 idle, 8 walk). Here that becomes three layers drawn in order:
//
//   body.<outfit>        the body, its clothes recoloured — everyday clothes,
//                        áo dài in Huế purple / white / red / blue / royal
//                        yellow, áo the
//   hair.<style>.<color> the hairstyle alone (the look minus the bald body),
//                        in dark, brown or grey; `….hat` is the same hair
//                        trimmed to the crown, to wear under a hat
//   hat.<id>             drawn onto the head — nón lá, khăn đóng
//
// The body is a chibi: a big head, then four or five rows of clothes. Its
// shirt and trousers are told apart by colour; an áo dài is the shirt and the
// first rows below it as the tunic, white trousers under. Hats are drawn per
// frame from where the head is, so they bob with it.
//
// Frames are named `<layer>-<clip>-<i>`, 1px apart like the villager sheet.
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
const FRAMES = CLIPS.flatMap((c) => Array.from({ length: c.frames }, (_, i) => ({ clip: c.name, i })));

const STYLES = ['bowlhair', 'curlyhair', 'longhair', 'mophair', 'shorthair', 'spikeyhair'];
/** Each colour as [dark, light] for the hair's two shades. */
const HAIR_COLORS = {
  dark: [[62, 39, 49], [93, 59, 74]],      // the pack's own
  brown: [[102, 62, 38], [146, 94, 56]],
  grey: [[136, 132, 140], [188, 184, 192]],
};
/** Tunic [dark, light]; trousers white unless the outfit says otherwise. */
const TROUSERS = [[196, 190, 180], [238, 234, 226]];
const OUTFITS = {
  everyday: null,
  aoDaiPurple: [[92, 46, 112], [128, 72, 152]],   // tím Huế
  aoDaiWhite: [[206, 204, 214], [246, 246, 250]],
  aoDaiRed: [[150, 30, 40], [204, 52, 58]],
  aoDaiBlue: [[40, 82, 150], [72, 122, 196]],
  aoDaiYellow: [[196, 146, 30], [240, 196, 64]],  // the royal colour
  aoThe: [[28, 28, 38], [52, 52, 68]],
};
const HATS = ['nonLa', 'khanDong'];

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

function body(outfit, base) {
  const out = new Uint8ClampedArray(base);
  const tunic = OUTFITS[outfit];
  if (!tunic) return out;
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
  }
  return out;
}

// ── Lay out the atlas: one row per layer, its 17 frames across ──
const layers = [
  ...Object.keys(OUTFITS).map((o) => ({ name: `body.${o}`, draw: (b) => body(o, b) })),
  ...STYLES.flatMap((s) => Object.keys(HAIR_COLORS).flatMap((c) => [false, true].map((underHat) => ({
    name: `hair.${s}.${c}${underHat ? '.hat' : ''}`, draw: (b, clip, i) => hair(s, c, b, frame(s, clip, i), underHat),
  })))),
  ...HATS.map((id) => ({ name: `hat.${id}`, draw: (b) => hat(id, b) })),
];
const W = FRAMES.length * STRIDE - PAD, H = layers.length * STRIDE - PAD;
const sheet = Buffer.alloc(W * H * 4);
const frames = {};
layers.forEach((layer, row) => {
  FRAMES.forEach(({ clip, i }, col) => {
    const img = layer.draw(frame('base', clip, i), clip, i);
    const ox = col * STRIDE, oy = row * STRIDE;
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
      const s = (y * F + x) * 4, d = ((oy + y) * W + ox + x) * 4;
      for (let k = 0; k < 4; k++) sheet[d + k] = img[s + k];
    }
    frames[`${layer.name}-${clip}-${i}`] = {
      frame: { x: ox, y: oy, w: F, h: F }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: F, h: F }, sourceSize: { w: F, h: F },
    };
  });
});
await sharp(sheet, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path('wardrobe.png'));
writeFileSync(path('wardrobe.json'), JSON.stringify({ frames, meta: { image: 'wardrobe.png', size: { w: W, h: H }, scale: '1' } }));
console.log(`wardrobe.png ${W}×${H} — ${layers.length} layers`);
