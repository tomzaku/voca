import { IpaChart } from '../IpaChart';
import { defineActivity } from '../activity';

// Every sound of English, charted, in the royal theatre — learn them here,
// then train the ear on the minimal pairs (./ipa).

export default defineActivity({
  id: 'ipa-learn', skill: 'speaking', kind: 'learn', key: 'IpaLearn',
  emoji: '🔤', place: 'Duyệt Thị Đường', order: 5,
  Screen: IpaChart,
});
