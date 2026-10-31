import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useVocabularyStore } from '../../../hooks/useVocabulary';
import { dueWords } from '../../../lib/spacedRepetition';
import { vocabularyAdvice } from '../../../lib/keeperAdvice';
import { defineKeeper } from '../keeper';
import { useWorld } from '../world';

// Chú Tư the archivist, at Tàng Thư Lâu.

function useDue() {
  const progress = useVocabularyStore((s) => s.progress);
  return useMemo(() => dueWords(progress).length, [progress]);
}

export default defineKeeper({
  skill: 'vocabulary',
  nameId: 'world.keeperVocabulary',
  useAdvice(recap) {
    const { chosen, activeCollection } = useWorld();
    return vocabularyAdvice({ chosen, due: useDue(), recap, collection: activeCollection ?? undefined });
  },
  useBadges() {
    const intl = useIntl();
    const due = useDue();
    const { activeCollection } = useWorld();
    return {
      review: due > 0 ? intl.formatMessage({ id: 'world.badgeDue' }, { count: due }) : undefined,
      learn: activeCollection ? `${activeCollection.name} · ${activeCollection.pct}%` : undefined,
    };
  },
});
