import type { WorldStation } from '../../game/types';
import type { PixelIconName } from './pixel';

// How the world tells collections apart — yours, joined, levels — in the
// collections' list and the travel drawer.

/** Per kind: its label on a row, its tab, its icon and colour. */
export const KIND_META: Record<WorldStation['kind'], { labelId: string; groupId: string; icon: PixelIconName; color: string }> = {
  mine:   { labelId: 'world.kindMine',   groupId: 'world.groupMine',   icon: 'person', color: '#4f8fe0' },
  joined: { labelId: 'world.kindJoined', groupId: 'world.groupJoined', icon: 'people', color: '#a77bf0' },
  level:  { labelId: 'world.kindLevel',  groupId: 'world.groupLevel',  icon: 'cap',    color: '#5fd068' },
};
