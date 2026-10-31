import { describe, expect, it } from 'vitest';
import { comprehensionClips, comprehensionTopics, ieltsListeningSections, ieltsListeningTopics } from './englishListening';

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

// IELTS sections: each part keeps its real-test shape — Sections 1 and 3 are
// conversations, 2 and 4 a single speaker — and every question is answerable.

describe('IELTS listening sections', () => {
  it('have unique ids', () => {
    const ids = ieltsListeningSections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(ieltsListeningSections.map((s) => [s.id, s] as const))('%s is well formed', (_, s) => {
    expect(ieltsListeningTopics as readonly string[]).toContain(s.topic);
    expect(s.title.startsWith(s.section)).toBe(true);
    const speakers = new Set(s.transcript.map((l) => l.speaker));
    if (s.section === 'Section 1' || s.section === 'Section 3') expect(speakers.size).toBeGreaterThanOrEqual(2);
    else expect(speakers.size).toBe(1);
    expect(s.questions.length).toBeGreaterThanOrEqual(4);
    for (const q of s.questions) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
    }
  });
});
