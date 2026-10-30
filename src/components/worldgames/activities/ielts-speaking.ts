import { createElement } from 'react';
import { RolePlay } from '../RolePlay';
import { defineActivity } from '../activity';

// IELTS Speaking, with the part's real turn time.

function Screen() {
  return createElement(RolePlay, { source: 'ielts' });
}

export default defineActivity({
  id: 'ielts-speaking', skill: 'speaking', kind: 'practice', key: 'IeltsSpeaking',
  emoji: '🎓', place: 'Quốc Học', order: 50,
  Screen,
});
