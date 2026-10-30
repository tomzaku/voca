import { createElement } from 'react';
import { NguBinhClimb } from '../NguBinhClimb';
import { useWorld } from '../world';
import { defineActivity } from '../activity';

// The level test, climbed up Ngự Bình.

function Screen() {
  const world = useWorld();
  return createElement(NguBinhClimb, { onStudy: () => world.openActivity('learn') });
}

export default defineActivity({
  id: 'level-test', skill: 'vocabulary', kind: 'practice', key: 'LevelTest',
  emoji: '⛰️', place: 'Núi Ngự Bình', order: 40,
  Screen,
});
