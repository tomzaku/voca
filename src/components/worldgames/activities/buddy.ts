import { AnHienHome } from '../AnHienHome';
import { defineActivity } from '../activity';

// Your buddy's home.

export default defineActivity({
  id: 'buddy', skill: 'you', kind: 'tool', key: 'Buddy',
  emoji: '🐾', place: 'Nhà vườn An Hiên', order: 10,
  Screen: AnHienHome,
});
