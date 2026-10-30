import { createElement } from 'react';
import { DragonBoat } from '../DragonBoat';
import { defineActivity } from '../activity';

// Hear a clip, answer its questions.

function Screen() {
  return createElement(DragonBoat, { initialMode: 'comprehension' });
}

export default defineActivity({
  id: 'comprehension', skill: 'listening', kind: 'practice', key: 'Comprehension',
  emoji: '🐉', place: 'Thuyền rồng', order: 30,
  Screen,
});
