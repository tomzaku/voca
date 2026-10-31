import { createElement } from 'react';
import { DragonBoat } from '../DragonBoat';
import { defineActivity } from '../activity';

// Type the sentence Ông Sáu says.

function Screen() {
  return createElement(DragonBoat, { initialMode: 'dictation' });
}

export default defineActivity({
  id: 'dictation', skill: 'listening', kind: 'learn', key: 'Dictation',
  emoji: '✍️', place: 'Duyệt Thị Đường', order: 20,
  Screen,
});
