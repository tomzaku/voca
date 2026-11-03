// The rules of a Short Conversation, with no UI: which question to ask next,
// and which of its useful phrases an answer actually used. The Speak page's
// question bank and the world's Đông Ba chè stall both ask from the same bank and
// mark practice in the same store (useSpeakingProgress).

import type { SpeakingQuestion } from '../data/englishSpeaking';
import type { QuestionProgress } from '../hooks/useSpeakingProgress';
import { normalizeSpoken } from './speechMatch';

/**
 * The next question to ask: one never practiced, at random — or, once every
 * question has been, the one practiced longest ago. `skip` keeps the questions
 * just asked from coming straight back.
 */
export function pickQuestion(
  questions: SpeakingQuestion[],
  progress: Record<string, QuestionProgress>,
  skip: Set<string> = new Set(),
  rand: () => number = Math.random,
): SpeakingQuestion | null {
  const pool = questions.filter((q) => !skip.has(q.id));
  if (pool.length === 0) return null;
  const fresh = pool.filter((q) => !progress[q.id]?.practicedAt);
  if (fresh.length > 0) return fresh[Math.floor(rand() * fresh.length)];
  return pool.reduce((a, b) => ((progress[a.id]?.practicedAt ?? 0) <= (progress[b.id]?.practicedAt ?? 0) ? a : b));
}

/**
 * The useful phrases an answer used. A phrase's "..." are the learner's own
 * words, so "I'd describe myself as..." counts when "i'd describe myself as"
 * was said, and "not that... but that..." when both halves were, in order.
 */
export function phrasesUsed(transcript: string, phrases: string[]): string[] {
  const said = ` ${normalizeSpoken(transcript)} `;
  return phrases.filter((phrase) => {
    const parts = phrase.split(/\.{2,}|…/).map((p) => normalizeSpoken(p)).filter(Boolean);
    if (parts.length === 0) return false;
    let from = 0;
    for (const part of parts) {
      const at = said.indexOf(` ${part} `, from);
      if (at === -1) return false;
      from = at + part.length + 1;
    }
    return true;
  });
}

export interface Highlight { text: string; phrase?: string }

/**
 * `text` cut into runs, the ones that are a useful phrase tagged with it — so
 * an answer can show which words earned a phrase, and a sample answer where
 * each phrase sits in a real reply. Only the fixed words of a phrase are
 * marked; a "..." gap is the speaker's own. Matching ignores case and treats
 * ’ and ' alike; the first place a phrase fits wins.
 */
export function highlightPhrases(text: string, phrases: string[]): Highlight[] {
  const marks: { start: number; end: number; phrase: string }[] = [];
  const free = (s: number, e: number) => marks.every((m) => e <= m.start || s >= m.end);
  // Longer phrases first, so a short one can't claim part of a longer match.
  for (const phrase of [...phrases].sort((a, b) => b.length - a.length)) {
    // Each half of a phrase as its words; whatever punctuation sits between
    // them is optional, as it is in speech ("a bit of everything honestly").
    const parts = phrase.split(/\.{2,}|…/)
      .map((p) => p.match(/[\p{L}\d]+(?:['’][\p{L}]+)*/gu) ?? [])
      .filter((words) => words.length > 0);
    const found: { start: number; end: number }[] = [];
    let from = 0;
    for (const words of parts) {
      const src = words.map((w) => w.replace(/['’]/g, "['’]")).join("[^\\p{L}\\d'’]+");
      const re = new RegExp(`(?<![\\p{L}'’])${src}(?![\\p{L}'’])`, 'giu');
      re.lastIndex = from;
      const m = re.exec(text);
      if (!m) { found.length = 0; break; }
      found.push({ start: m.index, end: m.index + m[0].length });
      from = m.index + m[0].length;
    }
    if (found.length && found.every((f) => free(f.start, f.end))) {
      for (const f of found) marks.push({ ...f, phrase });
    }
  }
  marks.sort((a, b) => a.start - b.start);
  const out: Highlight[] = [];
  let at = 0;
  for (const m of marks) {
    if (m.start > at) out.push({ text: text.slice(at, m.start) });
    out.push({ text: text.slice(m.start, m.end), phrase: m.phrase });
    at = m.end;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}
