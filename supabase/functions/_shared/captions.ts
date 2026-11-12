// Turning a YouTube caption track into lines worth shadowing — no network, so
// it's testable on its own. captions/index.ts does the fetching.
//
// YouTube serves a track in a few XML dialects depending on how it was asked
// for (srv1 `<text start dur>` in seconds, srv3 `<p t d>` in milliseconds) or as
// json3. All three come out as the same `CaptionLine[]`.

export interface CaptionLine {
  /** Seconds from the start of the video. */
  start: number;
  end: number;
  text: string;
}

export interface CaptionTrack {
  lang: string;
  name: string;
  /** Speech recognition's, not a person's — no punctuation, rougher lines. */
  auto: boolean;
}

/** Past this a "line" is a paragraph; nobody shadows that in one breath. */
const MAX_LINE_CHARS = 300;
/** A two-hour film is ~2000 lines; anything past it is not a video to shadow. */
export const MAX_LINES = 2500;

/** A YouTube video id, from a bare id or any of the URL shapes people paste. */
export function videoIdOf(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.searchParams.get('v')
      ?? url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/)?.[1]
      ?? null;
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/**
 * One caption's text as something to say: sound cues ("[Music]", "(laughs)"),
 * note marks and the ">>" speaker-change marker go; what's left is one line.
 */
export function cleanCaption(raw: string): string {
  // Entities twice: srv1 escapes the text and then escapes the `&` again.
  return decodeEntities(decodeEntities(raw))
    .replace(/<[^>]+>/g, '')
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .replace(/[♪♫]/g, ' ')
    .replace(/^\s*(>>|-)\s*/g, '')
    .replace(/\s*>>\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:(?:Transcriber|Translator|Reviewer|Subtitles by)\s*:.*)$/i, '')
    .replace(/^[^a-z]*[A-Z][^a-z]*$/, sentenceCase)
    .slice(0, MAX_LINE_CHARS);
}

/** "IT'S BEEN A LONG DAY" → "It's been a long day": lyric captions shout. */
export function sentenceCase(s: string): string {
  return s.toLowerCase()
    .replace(/(^|[.!?]\s+)(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase())
    .replace(/\bi\b(?=['’]|\s|$|[,.!?])/g, 'I');
}

/** Parses any of the track formats; [] when it's none of them. */
export function parseTrack(body: string): CaptionLine[] {
  const trimmed = body.trimStart();
  let raw: CaptionLine[] = [];
  if (trimmed.startsWith('{')) raw = parseJson3(trimmed);
  else if (/<text\b/.test(body)) raw = parseSrv1(body);
  else if (/<p\b/.test(body)) raw = parseSrv3(body);
  return tidy(raw);
}

function parseSrv1(xml: string): CaptionLine[] {
  const out: CaptionLine[] = [];
  for (const m of xml.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const start = Number(attr(m[1], 'start'));
    const dur = Number(attr(m[1], 'dur') ?? 0);
    if (Number.isFinite(start)) out.push({ start, end: start + (Number.isFinite(dur) ? dur : 0), text: m[2] });
  }
  return out;
}

function parseSrv3(xml: string): CaptionLine[] {
  const out: CaptionLine[] = [];
  for (const m of xml.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)) {
    const t = Number(attr(m[1], 't'));
    const d = Number(attr(m[1], 'd') ?? 0);
    if (Number.isFinite(t)) out.push({ start: t / 1000, end: (t + (Number.isFinite(d) ? d : 0)) / 1000, text: m[2] });
  }
  return out;
}

function parseJson3(json: string): CaptionLine[] {
  let data: { events?: { tStartMs?: number; dDurationMs?: number; aAppend?: number; segs?: { utf8?: string }[] }[] };
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  const out: CaptionLine[] = [];
  for (const e of data.events ?? []) {
    // An append event only repeats the line above it as speech recognition
    // types it out; the line itself is already there.
    if (!e.segs || e.aAppend || typeof e.tStartMs !== 'number') continue;
    const text = e.segs.map((s) => s.utf8 ?? '').join('');
    out.push({ start: e.tStartMs / 1000, end: (e.tStartMs + (e.dDurationMs ?? 0)) / 1000, text });
  }
  return out;
}

function attr(attrs: string, name: string): string | undefined {
  return attrs.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

/**
 * Clean every line, drop the ones that were only sound cues, and stop each at
 * the next one's start — speech recognition's lines overlap, and a line that
 * plays into the next isn't one line to repeat.
 */
function tidy(raw: CaptionLine[]): CaptionLine[] {
  const lines = raw
    .map((l) => ({ ...l, text: cleanCaption(l.text) }))
    .filter((l) => l.text && /[\p{L}\p{N}]/u.test(l.text))
    .sort((a, b) => a.start - b.start);
  for (let i = 0; i < lines.length; i++) {
    const next = lines[i + 1];
    if (next && lines[i].end > next.start) lines[i].end = next.start;
    // A zero-length line can't be played; give it a moment.
    if (lines[i].end <= lines[i].start) lines[i].end = next ? Math.max(next.start, lines[i].start + 0.5) : lines[i].start + 2;
  }
  return mergeFragments(lines).slice(0, MAX_LINES).map((l) => ({
    start: round(l.start), end: round(l.end), text: l.text,
  }));
}

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;
const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Speech recognition cuts a sentence wherever the screen ran out — "so what I"
 * / "wanted to say". A fragment of a few words is folded into the next line when
 * the two run together, up to a length still easy to hold in your head.
 */
function mergeFragments(lines: CaptionLine[]): CaptionLine[] {
  const out: CaptionLine[] = [];
  for (const l of lines) {
    const prev = out[out.length - 1];
    if (
      prev
      && wordCount(prev.text) < 4
      && !/[.!?…]["”’]?$/.test(prev.text)
      && l.start - prev.end < 0.6
      && wordCount(prev.text) + wordCount(l.text) <= 16
    ) {
      prev.text = `${prev.text} ${l.text}`;
      prev.end = l.end;
    } else out.push({ ...l });
  }
  return out;
}

/** The track to use: a person's captions over speech recognition's, in `lang`. */
export function pickTrack<T extends CaptionTrack>(tracks: T[], lang: string): T | null {
  const inLang = tracks.filter((t) => t.lang === lang || t.lang.startsWith(`${lang}-`));
  return inLang.find((t) => !t.auto) ?? inLang[0] ?? null;
}
