import { ReadAloudTool } from '../ReadAloudTool';
import { defineActivity } from '../activity';

// Hear anything you type.

export default defineActivity({
  id: 'read-aloud', skill: 'speaking', kind: 'tool', key: 'ReadAloud',
  emoji: '📖', place: 'Cồn Hến', order: 60,
  Screen: ReadAloudTool,
});
