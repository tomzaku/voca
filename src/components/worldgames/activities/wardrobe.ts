import { createElement } from 'react';
import { TailorShop } from '../TailorShop';
import { useWorld } from '../world';
import { defineActivity } from '../activity';

// The tailor's — where the world begins, and where you change clothes. Its
// room and the fitting itself are WorldGame's (it dresses the buddy in the
// room as you try things on).

function Screen() {
  const { tailor } = useWorld();
  return createElement(TailorShop, {
    initial: tailor.initial,
    firstVisit: tailor.firstVisit,
    name: tailor.name,
    onRename: tailor.rename,
    onChange: tailor.tryOn,
    onDone: tailor.done,
  });
}

export default defineActivity({
  id: 'wardrobe', skill: 'you', kind: 'tool', key: 'Wardrobe',
  emoji: '🧵', place: 'Tiệm may', order: 20,
  Screen,
});
