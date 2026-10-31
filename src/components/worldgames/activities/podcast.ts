import { Podcast } from '../Podcast';
import { defineActivity } from '../activity';

// Episodes, a sentence at a time.

export default defineActivity({
  id: 'podcast', skill: 'listening', kind: 'learn', key: 'Podcast',
  emoji: '📻', place: 'Duyệt Thị Đường', order: 10,
  Screen: Podcast,
});
