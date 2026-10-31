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
