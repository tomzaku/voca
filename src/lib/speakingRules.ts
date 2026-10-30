// The rules of the Speak page's scripted practice, with no UI: how long a
// candidate's IELTS turn runs, how a Part 2 cue card reads, and which lines
// make good shadowing. The Speak page and the world's Cồn Hến both use them.

import type { Dialogue } from '../data/englishDialogues';
import type { IeltsConversation } from '../data/englishIelts';

/** Seconds a candidate's turn runs in each IELTS part. */
export const IELTS_TURN_SECONDS: Record<IeltsConversation['part'], number> = {
  'Part 1': 30,
  'Part 2': 120,
  'Part 3': 60,
};

/** Splits a Part 2 prompt into the task and its "You should say" points. */
export function parseCueCard(text: string): { task: string; points: string[]; prep: boolean } | null {
  const m = text.match(/^(.*?)\s*You should say:\s*(.*?)\s*(You have one minute to prepare\.?)?\s*$/s);
  if (!m) return null;
  const points = m[2]
    .replace(/\.$/, '')
    .split(/,\s*(?:and\s+)?/)
    .map((p) => p.trim())
    .filter(Boolean);
  return { task: m[1], points, prep: !!m[3] };
}

/** Lines worth shadowing: real sentences, short enough to hold in your head
 *  (4–14 words), from either side of every dialogue. */
export function shadowLines(dialogues: Dialogue[]): string[] {
  const out: string[] = [];
  for (const d of dialogues) {
    for (const l of d.lines) {
      const words = l.text.trim().split(/\s+/).length;
      if (words >= 4 && words <= 14) out.push(l.text.trim());
    }
  }
  return out;
}
