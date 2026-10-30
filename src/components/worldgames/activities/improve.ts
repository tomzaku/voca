import { ImproveWriting } from '../ImproveWriting';
import { defineActivity } from '../activity';

// Any text, polished with a template.

export default defineActivity({
  id: 'improve', skill: 'writing', kind: 'tool', key: 'Improve',
  emoji: '✒️', place: 'Văn Miếu', order: 30,
  Screen: ImproveWriting,
});
