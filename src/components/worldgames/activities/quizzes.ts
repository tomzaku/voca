import { createElement } from 'react';
import { QuizArena } from '../QuizArena';
import { useWorld } from '../world';
import { defineActivity } from '../activity';

// The quiz arena, on the words you're studying.

function Screen() {
  return createElement(QuizArena, { words: useWorld().wordPool });
}

export default defineActivity({
  id: 'quizzes', skill: 'vocabulary', kind: 'practice', key: 'Quiz',
  emoji: '⚔️', place: 'Quốc Học', order: 30,
  Screen,
});
