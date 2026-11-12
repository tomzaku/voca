// Video shadowing's captions, with no UI: which YouTube video a pasted link
// means, and subtitles the learner pastes in themselves (.srt or .vtt) when
// YouTube won't hand them over — parsed here, on the device.
//
// The server's own parser (supabase/functions/_shared/captions.ts) reads
// YouTube's formats; this one reads the files people download.

export interface CaptionLine {
  /** Seconds from the start of the video. */
  start: number;
  end: number;
  text: string;
}

/** A YouTube video id, from a bare id or any of the URL shapes people paste. */
export function youtubeId(input: string): string | null {
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

/** `00:01:02,500`, `01:02.500` or `1:02.5` → seconds. */
function seconds(stamp: string): number | null {
  const m = stamp.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/);
  if (!m) return null;
  const [, h = '0', min, sec, frac = '0'] = m;
  return Number(h) * 3600 + Number(min) * 60 + Number(sec) + Number(frac.padEnd(3, '0')) / 1000;
}

/**
 * Subtitles as lines: SRT, WebVTT, or a transcript copied from YouTube. Cue numbers, VTT
 * headers and styling tags go; sound cues ("[Music]") and note marks too, so
 * what's left is what someone says. Unreadable blocks are skipped, not fatal.
 */
export function parseSubtitles(text: string): CaptionLine[] {
  if (!text.includes('-->')) return parseTranscript(text);
  const out: CaptionLine[] = [];
  for (const block of text.replace(/\r/g, '').split(/\n\s*\n/)) {
    const rows = block.split('\n').map((r) => r.trim()).filter(Boolean);
    const at = rows.findIndex((r) => r.includes('-->'));
    if (at < 0) continue;
    const [a, b] = rows[at].split('-->');
    const start = seconds(a);
    // VTT puts cue settings after the end time ("00:05.000 align:start").
    const end = seconds(b.trim().split(/\s+/)[0]);
    if (start === null || end === null) continue;
    const said = cleanLine(rows.slice(at + 1).join(' '));
    if (!said) continue;
    // Auto-captioned VTT repeats the previous line as it scrolls up.
    if (out.length && out[out.length - 1].text === said) { out[out.length - 1].end = end; continue; }
    out.push({ start, end: Math.max(end, start + 0.3), text: said });
  }
  return out.sort((x, y) => x.start - y.start);
}

/**
 * What's left of a caption to say: no markup, sound cues ("[Music]"), note
 * marks, speaker dashes or translator credits, and lyrics that shout put in
 * sentence case. '' when nothing sayable is left.
 */
function cleanLine(raw: string): string {
  const said = raw
    .replace(/<[^>]+>/g, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .replace(/[♪♫]/g, ' ')
    .replace(/^\s*(>>|-)\s*/, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:(?:Transcriber|Translator|Reviewer|Subtitles by)\s*:.*)$/i, '')
    .replace(/^[^a-z]*[A-Z][^a-z]*$/, (x) => x.toLowerCase()
      .replace(/(^|[.!?]\s+)(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase())
      .replace(/\bi\b(?=['’]|\s|$|[,.!?])/g, 'I'));
  return /[\p{L}\p{N}]/u.test(said) ? said : '';
}

const STAMP = /^(\d{1,2}(?::\d{2}){1,2})(?:\s+(.*))?$/;

/**
 * A transcript copied from YouTube's own "Show transcript" panel: a time on
 * its own line (or at the start of one) and what's said after it, until the
 * next time. A line runs until the next one starts.
 */
function parseTranscript(text: string): CaptionLine[] {
  const cues: { start: number; parts: string[] }[] = [];
  for (const row of text.replace(/\r/g, '').split('\n').map((r) => r.trim()).filter(Boolean)) {
    const m = row.match(STAMP);
    const start = m ? seconds(m[1]) : null;
    if (m && start !== null) cues.push({ start, parts: m[2] ? [m[2]] : [] });
    // The panel's screen-reader text ("2 minutes, 5 seconds") follows each time.
    else if (cues.length && !/^\d+ (?:hours?|minutes?|seconds?)(?:,? \d+ (?:minutes?|seconds?))*$/.test(row)) {
      cues[cues.length - 1].parts.push(row);
    }
  }
  const out: CaptionLine[] = [];
  cues.forEach((c, i) => {
    const said = cleanLine(c.parts.join(' '));
    const next = cues[i + 1]?.start;
    if (said) out.push({ start: c.start, end: next !== undefined && next > c.start ? next : c.start + 4, text: said });
  });
  return out.sort((x, y) => x.start - y.start);
}

/** Which line is playing at `t` seconds: the last one started, or -1 before the first. */
export function lineAt(lines: CaptionLine[], t: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].start <= t + 0.05) { found = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return found;
}
