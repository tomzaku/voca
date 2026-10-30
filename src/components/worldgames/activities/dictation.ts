import { createElement } from 'react';
import { DragonBoat } from '../DragonBoat';
import { defineActivity } from '../activity';

// Type the sentence the boatman says.

function Screen() {
  return createElement(DragonBoat, { initialMode: 'dictation' });
}

export default defineActivity({
  id: 'dictation', skill: 'listening', kind: 'learn', key: 'Dictation',
  emoji: '✍️', place: 'Thuyền rồng', order: 20,
  Screen,
});
