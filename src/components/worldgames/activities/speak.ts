import { ConHenStall } from '../ConHenStall';
import { defineActivity } from '../activity';

// A conversation at the tea stall on Cồn Hến.

export default defineActivity({
  id: 'speak', skill: 'speaking', kind: 'practice', key: 'Conversation',
  emoji: '🍵', place: 'Cồn Hến', order: 30,
  Screen: ConHenStall,
});
