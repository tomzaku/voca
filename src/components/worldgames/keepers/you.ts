import { useIntl } from 'react-intl';
import { useCompanion } from '../../../hooks/useCompanion';
import { useAuth } from '../../../hooks/useAuth';
import { accountName } from '../../../lib/accountName';
import { DEFAULT_LOOK } from '../../../game/wardrobe';
import { youAdvice } from '../../../lib/keeperAdvice';
import { defineKeeper } from '../keeper';

// Mệ Hai, who keeps the garden house at An Hiên — your home.

export default defineKeeper({
  skill: 'you',
  nameId: 'world.keeperYou',
  useAdvice() {
    const name = useCompanion((s) => s.name);
    const { user } = useAuth();
    return youAdvice({ name: name || accountName(user) || '…' });
  },
  // What you're wearing — the profile at a glance.
  useBadges() {
    const intl = useIntl();
    const look = useCompanion((s) => s.dress) ?? DEFAULT_LOOK;
    return {
      wardrobe: `${intl.formatMessage({ id: `world.garment.${look.outfit}` })} · ${intl.formatMessage({ id: `world.color.${look.outfitColor}` })}`,
    };
  },
});
