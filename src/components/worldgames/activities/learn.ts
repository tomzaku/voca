import { createElement } from 'react';
import { useIntl } from 'react-intl';
import { DongBaStall } from '../DongBaStall';
import { useWorld } from '../world';
import { defineActivity } from '../activity';

// New words at the archivist's desk in Tàng Thư Lâu. They come from the collection you study,
// so a learner who hasn't picked one picks it first; studying it opens the stall.

function Screen() {
  const world = useWorld();
  const intl = useIntl();
  return world.chosen
    ? createElement(DongBaStall)
    : world.collectionsHall(null, intl.formatMessage({ id: 'world.collectionsPickFirst' }));
}

export default defineActivity({
  id: 'learn', skill: 'vocabulary', kind: 'learn', key: 'Learn',
  emoji: '📚', place: 'Tàng Thư Lâu', order: 10,
  Screen,
});
