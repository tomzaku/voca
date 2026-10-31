import { listeningAdvice } from '../../../lib/keeperAdvice';
import { defineKeeper } from '../keeper';

// Ông Sáu the court musician, at Duyệt Thị Đường.

export default defineKeeper({
  skill: 'listening',
  nameId: 'world.keeperListening',
  useAdvice: (recap) => listeningAdvice(recap),
});
