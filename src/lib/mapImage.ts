// Rasterize the mind-map poster to a PNG the user can save.
//
// The map is live DOM — HTML theme cards plus an SVG connector layer — sitting
// under a pan/zoom transform inside a scrolling viewport, so there is nothing
// to "screenshot" directly: whatever is off-screen or off-zoom simply isn't
// painted. Instead the whole canvas subtree is cloned at its natural size into
// an <svg><foreignObject>, handed a copy of the map's own stylesheet and its
// webfonts inlined as base64, then drawn into a 2D canvas and read back as a
// PNG blob.
//
// Two things make this work without a rendering library:
//
//   - Everything inside `.mm-canvas` is styled by wordMindMap.css and nothing
//     else (no Tailwind utilities reach in), so the exact rules can be copied
//     across instead of computed styles being inlined element by element.
//   - Doodles are already data URIs. An SVG loaded into an <img> can't fetch
//     anything external, and any attempt would also taint the canvas and make
//     toBlob throw — so a subtree with no external references is a hard
//     requirement, not a nicety.

// Webfonts the poster is drawn in — the same families index.html loads, so
// the bytes are usually already in the HTTP/service-worker cache.
//
// `display=swap` matters here even though the fonts end up inlined: without
// it a face defaults to the `block` period, where text that is waiting on its
// font paints as NOTHING. In a one-shot rasterization that reads as randomly
// missing words. With swap, the worst case is a fallback typeface.
const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Caveat:wght@600;700&display=swap';

// Google splits each family into per-script subsets — a dozen font files per
// family, most of which a given poster never touches. Only the ones whose
// characters actually appear get embedded (see `subsetsFor`): the payload
// stays small without guessing at the script, which matters now that a card
// can carry a translation in the learner's mother tongue.
type CodeRange = [number, number];

/** Parse a `unicode-range` value (`U+0-FF, U+131, U+1EA0-1EF9`) into ranges. */
function parseUnicodeRange(value: string): CodeRange[] {
  const out: CodeRange[] = [];
  for (const part of value.split(',')) {
    const m = /U\+([0-9A-Fa-f?]+)(?:-([0-9A-Fa-f]+))?/.exec(part.trim());
    if (!m) continue;
    if (m[1].includes('?')) {
      // Wildcard form: U+04?? means U+0400-04FF.
      out.push([parseInt(m[1].replace(/\?/g, '0'), 16), parseInt(m[1].replace(/\?/g, 'F'), 16)]);
    } else {
      const from = parseInt(m[1], 16);
      out.push([from, m[2] ? parseInt(m[2], 16) : from]);
    }
  }
  return out;
}

/** Keep only the @font-face blocks this text needs. */
function subsetsFor(css: string, text: string): string {
  const used = new Set<number>();
  for (const ch of text) used.add(ch.codePointAt(0) as number);
  const blocks = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
  return blocks
    .filter((block) => {
      const m = /unicode-range:\s*([^;}]+)/.exec(block);
      if (!m) return true; // no range declared — it covers everything
      const ranges = parseUnicodeRange(m[1]);
      for (const cp of used) {
        if (ranges.some(([lo, hi]) => cp >= lo && cp <= hi)) return true;
      }
      return false;
    })
    .join('\n');
}

/** Exported PNGs are drawn at this multiple of CSS pixels. */
const PIXEL_RATIO = 2;

/** Guard against a pathologically large poster: canvases have size ceilings. */
const MAX_PIXELS = 32_000_000;

let fontCssPromise: Promise<string> | null = null;

/** Escape text destined for an XML text node (the inline <style>). */
function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

/** Escape text destined for a double-quoted XML attribute. The quote matters:
 *  a computed `font-family` arrives as `"Patrick Hand", cursive`. */
function escapeAttr(text: string): string {
  return escapeXml(text).replace(/"/g, '&quot;');
}

async function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read font.'));
    reader.readAsDataURL(blob);
  });
}

/** Font files already downloaded and base64'd, keyed by their remote URL. */
const fontDataUris = new Map<string, string>();

async function fontAsDataUri(url: string): Promise<string> {
  const hit = fontDataUris.get(url);
  if (hit) return hit;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`font ${res.status}`);
  const dataUri = await blobToDataUri(await res.blob());
  fontDataUris.set(url, dataUri);
  return dataUri;
}

/**
 * The @font-face rules for the handwriting fonts, narrowed to the subsets
 * `text` actually uses and with the font files themselves inlined as data
 * URIs.
 *
 * Google serves both the CSS and the font files with permissive CORS, but this
 * is still a network call: offline it resolves to an empty string and the
 * poster exports in a fallback cursive rather than failing. The CSS and each
 * downloaded file are memoized, so only a genuinely new script costs a fetch.
 */
async function embeddedFontCss(text: string): Promise<string> {
  try {
    fontCssPromise ??= (async () => {
      const res = await fetch(FONT_CSS_URL);
      if (!res.ok) throw new Error(`font css ${res.status}`);
      // Google's CSS varies by User-Agent; a modern browser gets woff2 URLs.
      return await res.text();
    })();
    let css = subsetsFor(await fontCssPromise, text);
    const urls = [...new Set([...css.matchAll(/url\((https:\/\/[^)]+)\)/g)].map((m) => m[1]))];
    const inlined = await Promise.all(
      urls.map(async (url) => [url, await fontAsDataUri(url)] as const),
    );
    for (const [url, dataUri] of inlined) css = css.split(url).join(dataUri);
    return css;
  } catch (err) {
    // Don't memoize a failure — a later export may be back online.
    fontCssPromise = null;
    console.warn(`[mindmap] font embedding failed, exporting with fallback fonts: ${(err as Error).message}`);
    return '';
  }
}

// The SVG is its own document: none of the app's global CSS reaches it, only
// the rules copied across below. `box-sizing` is the one that actually shows —
// Tailwind's preflight makes it border-box app-wide, and the theme cards are
// sized by `max-width: 23em`. Under the CSS default of content-box that cap
// stops counting the padding and borders, so every card renders ~32px wider
// than it does on screen and the right-hand column runs off the image.
const RESET_CSS = '*,*::before,*::after{box-sizing:border-box}';

// Inherited properties the map's own stylesheet doesn't set, so they'd
// otherwise fall back to the SVG document's defaults. `font-weight` matters as
// much as the rest: the app inherits 600 from `body`, and Patrick Hand ships
// only one weight, so on screen the browser synthesizes the bold — text that
// renders at 400 in the export is measurably narrower and wraps differently.
const INHERITED = [
  'color',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'letter-spacing',
  'line-height',
  'text-transform',
  'word-spacing',
] as const;

/** The typography the poster is sitting in, lifted off the live element. */
function inheritedCss(el: HTMLElement): string {
  const cs = getComputedStyle(el);
  return INHERITED.map((prop) => `${prop}:${cs.getPropertyValue(prop)}`).join(';');
}

/**
 * The map's own CSS rules, read back out of the live stylesheet. Cross-origin
 * sheets throw on `.cssRules` and are skipped; so is anything print-scoped.
 */
function mapCss(): string {
  const out: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin (the Google Fonts sheet) — handled separately
    }
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule && rule.media.mediaText.includes('print')) continue;
      const text = rule.cssText;
      if (text.includes('.word-mindmap') || text.includes('.mm-')) out.push(text);
    }
  }
  return out.join('\n');
}

/** Load an <img> from a URL, resolving once it has actually decoded. */
async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/**
 * Make sure the poster's typefaces are in the font cache before anything is
 * rasterized. An SVG image is its own document: it starts loading the faces
 * its stylesheet declares when it decodes, and whatever hasn't arrived by the
 * time that single frame is painted falls back — so the fonts have to be warm
 * first. `document.fonts.load` on the parent page fills the same cache the
 * SVG document reads from.
 */
async function warmFonts(css: string): Promise<void> {
  if (!css || !document.fonts) return;
  const families = [...new Set([...css.matchAll(/font-family:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]))];
  await Promise.all(
    // The weights the map actually uses: cards at 400/700, the root at 700.
    families.flatMap((f) => [`400 40px "${f}"`, `700 40px "${f}"`].map((spec) => document.fonts.load(spec))),
  ).catch(() => { /* a font that won't load isn't worth failing the export over */ });
}

/** A region of the canvas, in canvas-local px. `x`/`y` may be negative. */
export interface ExportBounds { x: number; y: number; width: number; height: number }

/** Breathing room left around the outermost ink, in CSS px. */
const EXPORT_PAD = 40;

/**
 * Lay the clone out in an isolated document — same markup, same stylesheet,
 * no app CSS — and measure what it actually covers there.
 *
 * Measuring the LIVE map instead would be measuring a different environment.
 * The page brings global CSS the export can't (a `box-sizing` reset, typography
 * inherited from `body`) and the export brings fonts the page resolves its own
 * way, so the two lay out slightly differently — and a poster measured in one
 * and rendered in the other comes out with the right-hand column clipped off.
 * An iframe is the same kind of standalone document the SVG becomes, so what
 * it reports is what gets drawn.
 */
async function measureInFrame(
  node: HTMLElement,
  css: string,
  wrapperStyle: string,
): Promise<ExportBounds | null> {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText =
    'position:fixed;left:-20000px;top:0;width:8000px;height:8000px;border:0;visibility:hidden';
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument;
    if (!doc) return null;
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"/></head><body></body></html>');
    doc.close();
    const style = doc.createElement('style');
    style.textContent = css;
    doc.head.appendChild(style);

    const wrapper = doc.createElement('div');
    wrapper.className = 'word-mindmap';
    wrapper.setAttribute('style', wrapperStyle);
    const measured = doc.importNode(node, true) as HTMLElement;
    measured.style.position = 'absolute';
    measured.style.left = '0px';
    measured.style.top = '0px';
    wrapper.appendChild(measured);
    doc.body.style.margin = '0';
    doc.body.appendChild(wrapper);

    // Text metrics decide how the cards wrap, so nothing is measurable until
    // the embedded faces have landed in this document too.
    await doc.fonts?.ready;

    const origin = measured.getBoundingClientRect();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const el of Array.from(measured.querySelectorAll('.mm-node, .mm-root-node, .mm-arrow'))) {
      const r = el.getBoundingClientRect();
      minX = Math.min(minX, r.left - origin.left);
      minY = Math.min(minY, r.top - origin.top);
      maxX = Math.max(maxX, r.right - origin.left);
      maxY = Math.max(maxY, r.bottom - origin.top);
    }
    if (!Number.isFinite(minX)) return null;
    return {
      x: minX - EXPORT_PAD,
      y: minY - EXPORT_PAD,
      width: maxX - minX + EXPORT_PAD * 2,
      height: maxY - minY + EXPORT_PAD * 2,
    };
  } finally {
    frame.remove();
  }
}

/**
 * Render the poster inside `canvasEl` (the `.mm-canvas` node) to a PNG blob at
 * its full natural size, regardless of the current pan/zoom.
 *
 * `hide` selectors are made invisible in the clone — on-screen affordances
 * like the drag handles and speak buttons that have no meaning in a saved
 * image. They are hidden rather than removed on purpose: removing an inline
 * button reflows the card it sits in, and the poster should come out looking
 * like the one on screen.
 *
 * The captured region is measured, not assumed. The canvas's own box is the
 * wrong answer twice over: a rearranged map has cards and arrows moved outside
 * it by transforms (which don't grow the layout), and a card whose slot was
 * vacated leaves reserved space inside it that shouldn't be in the picture.
 */
export async function mindMapToPngBlob(
  canvasEl: HTMLElement,
  { hide = [] }: { hide?: string[] } = {},
): Promise<Blob> {
  const clone = canvasEl.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  for (const selector of hide) {
    for (const el of Array.from(clone.querySelectorAll(selector))) {
      (el as HTMLElement | SVGElement).style.visibility = 'hidden';
    }
  }

  // Subset the fonts against the poster's own text, so a translation in a
  // non-Latin mother tongue still gets the right glyphs embedded.
  const fontCss = await embeddedFontCss(clone.textContent ?? '');
  await warmFonts(fontCss);
  const css = `${RESET_CSS}\n${fontCss}\n${mapCss()}`;
  const inherited = inheritedCss(canvasEl);

  const box: ExportBounds = (await measureInFrame(clone, css, `position:relative;${inherited}`)) ?? {
    x: 0,
    y: 0,
    width: canvasEl.offsetWidth,
    height: canvasEl.offsetHeight,
  };
  const width = Math.ceil(box.width);
  const height = Math.ceil(box.height);
  if (!width || !height) throw new Error('The map has nothing to export yet.');

  // Shrink rather than fail if the poster is enormous.
  const ratio = Math.min(PIXEL_RATIO, Math.sqrt(MAX_PIXELS / (width * height)));

  clone.style.position = 'absolute';
  // Shift the canvas so the measured region lands at the image's origin.
  clone.style.left = `${-box.x}px`;
  clone.style.top = `${-box.y}px`;

  const body = new XMLSerializer().serializeToString(clone);
  const wrapperStyle =
    `position:relative;width:${width}px;height:${height}px;overflow:hidden;${inherited}`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<foreignObject x="0" y="0" width="${width}" height="${height}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" class="word-mindmap" style="${escapeAttr(wrapperStyle)}">` +
    `<style>${escapeXml(css)}</style>${body}</div>` +
    `</foreignObject></svg>`;

  // A data: URI, NOT a blob: URL. Chrome treats an <img> loaded from a blob
  // URL as not origin-clean once it contains a foreignObject, and the canvas
  // it's drawn into then refuses toBlob ("Tainted canvases may not be
  // exported"). The identical markup as a data: URI stays clean.
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  // Decoded twice on purpose. The first pass is what actually pulls the
  // inlined faces into the font cache from inside an SVG document; the second
  // paints with them already there. Without it the first export of a session
  // can come back with its headings in a fallback face.
  await loadImage(src);
  const img = await loadImage(src);

  const out = document.createElement('canvas');
  out.width = Math.round(width * ratio);
  out.height = Math.round(height * ratio);
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('This browser cannot render the image.');
  // The paper is white in both app themes; without this the PNG would carry
  // transparent gaps wherever the map's own background shows through.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(img, 0, 0, out.width, out.height);
  return await new Promise<Blob>((resolve, reject) => {
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image.'))),
      'image/png',
    );
  });
}

/** Hand a blob to the browser as a download. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
