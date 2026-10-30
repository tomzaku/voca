import { IeltsListening } from '../IeltsListening';
import { defineActivity } from '../activity';

// An IELTS Listening section, sat and handed in.

export default defineActivity({
  id: 'ielts-listening', skill: 'listening', kind: 'practice', key: 'IeltsListening',
  emoji: '🎓', place: 'Quốc Học', order: 40,
  Screen: IeltsListening,
});
