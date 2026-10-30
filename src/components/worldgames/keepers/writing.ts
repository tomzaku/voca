import { useVocabularyStore } from '../../../hooks/useVocabulary';
import { writingAdvice } from '../../../lib/keeperAdvice';
import { defineKeeper } from '../keeper';

// Thầy Đồ the scholar, among Văn Miếu's stelae.

export default defineKeeper({
  skill: 'writing',
  nameId: 'world.keeperWriting',
  useAdvice(recap) {
    const hasWords = useVocabularyStore((s) => Object.keys(s.progress).length > 0);
    return writingAdvice({ hasWords, recap });
  },
});
