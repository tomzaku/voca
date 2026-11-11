// The Grammar course: lessons in the order they're meant to be learned, each
// a short rule, a few examples, a note on why Vietnamese speakers tend to get
// it wrong, and a round of drills. Static content, the same for everyone, so
// it lives here rather than being generated — progress is the only per-user
// part (useGrammarProgress / the `grammar` resource).
//
// One file per CEFR level, each in teaching order. Lesson ids are stored
// server-side as slugs: renaming one orphans everyone's progress on it. Add
// new lessons anywhere; never reuse an id.
//
// Prose is `{ en, vi }` — content keyed by lesson, not UI strings, so it sits
// beside the data like ipaVi.ts rather than in the message catalogs. English
// example sentences and drills stay English in both: they're what's learned.
// `**word**` in an example marks the part the lesson is about.

import { A1_LESSONS } from './a1';
import { A2_LESSONS } from './a2';
import { B1_LESSONS } from './b1';
import { B2_LESSONS } from './b2';
import { C1_LESSONS } from './c1';
import { C2_LESSONS } from './c2';
import type { Drill, GrammarLesson, GrammarLevel, GrammarTopic, Text } from './types';

export type { Drill, GrammarLesson, GrammarLevel, GrammarTopic, Text };

export const GRAMMAR_LEVELS: { level: GrammarLevel; title: Text }[] = [
  { level: 'A1', title: { en: 'Beginner', vi: 'Sơ cấp' } },
  { level: 'A2', title: { en: 'Elementary', vi: 'Cơ bản' } },
  { level: 'B1', title: { en: 'Intermediate', vi: 'Trung cấp' } },
  { level: 'B2', title: { en: 'Upper intermediate', vi: 'Trung cao cấp' } },
  { level: 'C1', title: { en: 'Advanced', vi: 'Cao cấp' } },
  { level: 'C2', title: { en: 'Proficiency', vi: 'Thành thạo' } },
];

export const GRAMMAR_LESSONS: GrammarLesson[] = [
  ...A1_LESSONS, ...A2_LESSONS, ...B1_LESSONS, ...B2_LESSONS, ...C1_LESSONS, ...C2_LESSONS,
];

/** The topics, in the order the course page lists them. A topic's lessons
 *  keep course order inside it, so it still runs easy → hard. */
export const GRAMMAR_TOPICS: { topic: GrammarTopic; icon: string; title: Text }[] = [
  { topic: 'tenses', icon: 'lucide:clock', title: { en: 'Tenses', vi: 'Các thì' } },
  { topic: 'conditionals', icon: 'lucide:git-fork', title: { en: 'Conditionals & wishes', vi: 'Câu điều kiện & câu ước' } },
  { topic: 'modals', icon: 'lucide:key-round', title: { en: 'Modal verbs', vi: 'Động từ khuyết thiếu' } },
  { topic: 'nouns', icon: 'lucide:box', title: { en: 'Nouns, articles & quantity', vi: 'Danh từ, mạo từ & số lượng' } },
  { topic: 'pronouns', icon: 'lucide:users', title: { en: 'Pronouns & possessives', vi: 'Đại từ & sở hữu' } },
  { topic: 'prepositions', icon: 'lucide:map-pin', title: { en: 'Prepositions', vi: 'Giới từ' } },
  { topic: 'adjectives', icon: 'lucide:scale', title: { en: 'Adjectives & adverbs', vi: 'Tính từ & trạng từ' } },
  { topic: 'sentences', icon: 'lucide:message-circle-question', title: { en: 'Questions & verb patterns', vi: 'Câu hỏi & cấu trúc động từ' } },
  { topic: 'passive', icon: 'lucide:repeat-2', title: { en: 'Passive & reported speech', vi: 'Bị động & câu tường thuật' } },
  { topic: 'clauses', icon: 'lucide:link', title: { en: 'Clauses & linking words', vi: 'Mệnh đề & từ nối' } },
  { topic: 'emphasis', icon: 'lucide:megaphone', title: { en: 'Emphasis & style', vi: 'Nhấn mạnh & văn phong' } },
];

/** Lower-case, no accents, đ → d: so "thi hien tai" finds "Thì hiện tại". */
export function foldText(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase();
}

/** Everything a search can match a lesson on, folded once. */
const SEARCH_TEXT = new Map(GRAMMAR_LESSONS.map((l) => {
  const topic = GRAMMAR_TOPICS.find((t) => t.topic === l.topic)!.title;
  return [l.id, foldText([
    l.level, l.title.en, l.title.vi, l.summary.en, l.summary.vi, topic.en, topic.vi,
    ...l.pattern, ...l.examples.map((e) => e.replace(/\*\*/g, '')),
  ].join(' \n '))];
}));

/** Does the lesson match every word of `query`? An empty query matches all. */
export function lessonMatches(lesson: GrammarLesson, query: string): boolean {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  const text = SEARCH_TEXT.get(lesson.id)!;
  return words.every((w) => text.includes(w));
}

/** Strip punctuation so "today." matches a `wrong` of "today". */
export const bareWord = (token: string) => token.replace(/^[^\p{L}\p{N}’']+|[^\p{L}\p{N}’']+$/gu, '');

/** The finished sentence a drill is about — shown once it's answered. */
export function drillAnswer(drill: Drill): string {
  switch (drill.kind) {
    case 'choice': {
      const word = drill.options[drill.answer];
      // "—" is the "no word here" option: close the gap instead of printing it.
      return word === '—'
        ? drill.prompt.replace(/\s*___\s*/, ' ').replace(/^\s+/, '').replace(/^./, (c) => c.toUpperCase())
        : drill.prompt.replace('___', word);
    }
    case 'error':
      return drill.correct;
    case 'order':
      return drill.chunks.join(' ');
  }
}

export const lessonById = (id: string) => GRAMMAR_LESSONS.find((l) => l.id === id);
