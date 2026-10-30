import { useWorld } from '../world';
import { defineActivity } from '../activity';

// The collections list, without leaving Vocabulary for its keeper.

function Screen() {
  return useWorld().collectionsHall(null);
}

export default defineActivity({
  id: 'collections', skill: 'vocabulary', kind: 'tool', key: 'Collections',
  emoji: '🗂️', place: 'Điện Thái Hòa', order: 70,
  Screen,
});
