import { describe, expect, it } from 'vitest';
import { comprehensionClips, comprehensionTopics } from './englishListening';

// Every comprehension clip is playable: a known topic, a script to read
// aloud, and questions that each have one right answer among their options.

describe('comprehension clips', () => {
  it('have unique ids', () => {
    const ids = comprehensionClips.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(comprehensionClips.map((c) => [c.id, c] as const))('%s is well formed', (_, clip) => {
    expect(comprehensionTopics as readonly string[]).toContain(clip.topic);
    expect(clip.script.length).toBeGreaterThan(200);
    expect(clip.questions.length).toBeGreaterThanOrEqual(3);
    for (const q of clip.questions) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
    }
  });

  it('cover every topic', () => {
    for (const t of comprehensionTopics) expect(comprehensionClips.some((c) => c.topic === t)).toBe(true);
  });
});
