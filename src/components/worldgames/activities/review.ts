import { createElement } from 'react';
import { ThienMuReview } from '../ThienMuReview';
import { useWorld } from '../world';
import { defineActivity } from '../activity';

// Due words at Thiên Mụ; with nothing due, it points you to new words.

function Screen() {
  const world = useWorld();
  return createElement(ThienMuReview, { onLearnMore: () => world.openActivity('learn') });
}

export default defineActivity({
  id: 'review', skill: 'vocabulary', kind: 'learn', key: 'Review',
  emoji: '🪷', place: 'Chùa Thiên Mụ', order: 20,
  Screen,
});
