import { Shadowing } from '../Shadowing';
import { defineActivity } from '../activity';

// Hear a line, say it straight back.

export default defineActivity({
  id: 'shadow', skill: 'speaking', kind: 'learn', key: 'Shadow',
  emoji: '🔁', place: 'Chợ Đông Ba', order: 20,
  Screen: Shadowing,
});
