import { createElement } from 'react';
import { KhaiDinhTomb } from '../KhaiDinhTomb';
import { useWorld } from '../world';
import { defineActivity } from '../activity';

// Every word you've met, kept at Khải Định's tomb.

function Screen() {
  return createElement(KhaiDinhTomb, { onLearn: useWorld().learnWord });
}

export default defineActivity({
  id: 'history', skill: 'vocabulary', kind: 'tool', key: 'Words',
  emoji: '📜', place: 'Lăng Khải Định', order: 60,
  Screen,
});
