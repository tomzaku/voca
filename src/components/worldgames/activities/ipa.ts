import { DuyetThiDuong } from '../DuyetThiDuong';
import { defineActivity } from '../activity';

// The sounds of English, in the royal theatre.

export default defineActivity({
  id: 'ipa', skill: 'speaking', kind: 'learn', key: 'Ipa',
  emoji: '🎶', place: 'Duyệt Thị Đường', order: 10,
  Screen: DuyetThiDuong,
});
