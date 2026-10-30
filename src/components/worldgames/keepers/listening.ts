import { listeningAdvice } from '../../../lib/keeperAdvice';
import { defineKeeper } from '../keeper';

// Ông Sáu the boatman, on the dragon boat's deck.

export default defineKeeper({
  skill: 'listening',
  nameId: 'world.keeperListening',
  useAdvice: (recap) => listeningAdvice(recap),
});
