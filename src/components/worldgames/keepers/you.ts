import { useIntl } from 'react-intl';
import { useCompanion, useWordsKnown } from '../../../hooks/useCompanion';
import { DEFAULT_LOOK } from '../../../game/wardrobe';
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
  // What you're wearing, and who your buddy is — the profile at a glance.
  useBadges() {
    const intl = useIntl();
    const name = useCompanion((s) => s.name);
    const look = useCompanion((s) => s.dress) ?? DEFAULT_LOOK;
    const known = useWordsKnown();
    return {
      wardrobe: `${intl.formatMessage({ id: `world.garment.${look.outfit}` })} · ${intl.formatMessage({ id: `world.color.${look.outfitColor}` })}`,
      buddy: intl.formatMessage({ id: 'world.badgeBuddy' }, { name: name || '…', known }),
    };
  },
});
