import { createElement } from 'react';
import { LibrarySearch } from '../LibrarySearch';
import { useWorld } from '../world';
import { defineActivity } from '../activity';

// Look up a word in the royal library — the header's search opens it too.

function Screen() {
  return createElement(LibrarySearch, { onLearn: useWorld().learnWord });
}

export default defineActivity({
  id: 'search', skill: 'vocabulary', kind: 'tool', key: 'Search',
  emoji: '🔎', place: 'Tàng Thư Lâu', order: 50,
  Screen,
});
