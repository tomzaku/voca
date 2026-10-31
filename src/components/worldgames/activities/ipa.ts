import { DuyetThiDuong } from '../DuyetThiDuong';
import { IpaChart } from '../IpaChart';
import { defineActivity } from '../activity';

// The sounds of English, in the royal theatre — as the IPA page has them:
// learn every sound on the chart, then practise telling apart pairs that
// sound alike.

export default defineActivity({
  id: 'ipa', skill: 'speaking', kind: 'learn', key: 'Ipa',
  emoji: '🎶', place: 'Duyệt Thị Đường', order: 10,
  modes: [
    { id: 'ipa-learn', nameId: 'world.modeLearn', icon: 'eye', Screen: IpaChart },
    { id: 'ipa-practice', nameId: 'world.modePractice', icon: 'sword', Screen: DuyetThiDuong },
  ],
});
