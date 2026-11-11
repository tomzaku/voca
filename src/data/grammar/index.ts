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
import type { Drill, GrammarLesson, GrammarLevel, Text } from './types';

export type { Drill, GrammarLesson, GrammarLevel, Text };

export const GRAMMAR_LEVELS: { level: GrammarLevel; title: Text }[] = [
  { level: 'A1', title: { en: 'Beginner', vi: 'Sơ cấp' } },
  { level: 'A2', title: { en: 'Elementary', vi: 'Cơ bản' } },
  { level: 'B1', title: { en: 'Intermediate', vi: 'Trung cấp' } },
  { level: 'B2', title: { en: 'Upper intermediate', vi: 'Trung cao cấp' } },
];

export const GRAMMAR_LESSONS: GrammarLesson[] = [...A1_LESSONS, ...A2_LESSONS, ...B1_LESSONS, ...B2_LESSONS];

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
