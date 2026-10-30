import { VanMieuStele } from '../VanMieuStele';
import { defineActivity } from '../activity';

// Carve a sentence with a word you're learning.

export default defineActivity({
  id: 'writing', skill: 'writing', kind: 'practice', key: 'Stele',
  emoji: '🪨', place: 'Văn Miếu', order: 10,
  Screen: VanMieuStele,
});
