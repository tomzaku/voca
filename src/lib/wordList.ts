/**
 * Word lists are mostly pasted from a chatbot, and its "copy" button brings
 * Markdown along: a trailing `\` hard line break on every line, bullets,
 * numbering, **bold**, `code`, curly apostrophes, and sometimes a gloss after
 * a dash or colon. Strip all of that so one line becomes one bare word.
 */
export function cleanWordLine(raw: string): string {
  return raw
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[‐-‒]/g, '-')
    .replace(/\s+(?:[-–—]|:)\s.*$/, '') // "word - meaning", "word: meaning"
    .replace(/[:–—].*$/, '')
    .replace(/^\s*(?:[-*+•>]|\d+[.)]|[a-z][.)](?=\s))\s*/i, '') // bullet / "1." / "a)"
    .replace(/[\\*_`~"#[\]]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,!?'-]+|[\s.,!?'-]+$/g, '')
    .trim()
    .toLowerCase();
}

/** Split a pasted list on newlines, commas or semicolons and clean each piece. */
export function splitWordList(input: string): string[] {
  return input.split(/[\n,;]+/).map(cleanWordLine).filter(Boolean);
}
