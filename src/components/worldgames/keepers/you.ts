import { useCompanion, useWordsKnown } from '../../../hooks/useCompanion';
import { youAdvice } from '../../../lib/keeperAdvice';
import { defineKeeper } from '../keeper';

// Mệ Hai, who keeps the garden house at An Hiên — your home.

export default defineKeeper({
  skill: 'you',
  nameId: 'world.keeperYou',
  useAdvice() {
    const name = useCompanion((s) => s.name);
    return youAdvice({ name: name || '…', known: useWordsKnown() });
  },
});
