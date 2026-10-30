import { IeltsWriting } from '../IeltsWriting';
import { defineActivity } from '../activity';

// An IELTS Writing task against the clock, banded.

export default defineActivity({
  id: 'ielts-writing', skill: 'writing', kind: 'practice', key: 'IeltsWriting',
  emoji: '🎓', place: 'Quốc Học', order: 20,
  Screen: IeltsWriting,
});
