import { ConHenStall } from '../ConHenStall';
import { defineActivity } from '../activity';

// A conversation at Cô Ba's chè stall in Đông Ba market.

export default defineActivity({
  id: 'speak', skill: 'speaking', kind: 'practice', key: 'Conversation',
  emoji: '🍵', place: 'Chợ Đông Ba', order: 30,
  Screen: ConHenStall,
});
