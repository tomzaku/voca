import { createElement } from 'react';
import { RolePlay } from '../RolePlay';
import { defineActivity } from '../activity';

// Everyday dialogues, played or role-played.

function Screen() {
  return createElement(RolePlay, { source: 'dialogue' });
}

export default defineActivity({
  id: 'dialogue', skill: 'speaking', kind: 'practice', key: 'Dialogue',
  emoji: '🛍️', place: 'Phố đi bộ', order: 40,
  Screen,
});
