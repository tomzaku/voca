import { useState, type ReactNode } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  COLOR_SWATCH, GARMENTS, GARMENT_IDS, HAIR_COLORS, HAIR_STYLES, HATS,
  wearGarment, type Look,
} from '../../game/wardrobe';
import { playSelect } from '../../lib/sfx';
import { LookSprite } from './LookSprite';
import { HudSide, PixelButton, PixelChip, PixelIcon } from './pixel';

// The tailor's (tiệm may): where you're dressed before you first step into
// Huế, and whenever you like after (You › Wardrobe). Laid out like an avatar
// editor: a tab per part (hair, outfit, hat), a grid of tiles showing your
// buddy wearing each option, and the colours of the one you've picked
// underneath — áo dài first, then which áo dài. Your buddy stands in the room
// wearing it all as you pick; nothing is kept until you step out.

type Tab = 'outfit' | 'hair' | 'hat';
const TABS: Tab[] = ['outfit', 'hair', 'hat'];

function Tile({ on, onClick, look, label }: { on: boolean; onClick: () => void; look: Look; label: ReactNode }) {
  return (
    <button onClick={onClick} data-on={on} className="px-pick px-notch flex flex-col items-center gap-1 pt-2 pb-1.5 px-1">
      <LookSprite look={look} scale={3} />
      <span className="text-[12px] font-bold leading-tight text-center">{label}</span>
    </button>
  );
}

function Swatches({ colours, value, onPick }: { colours: readonly string[]; value: string; onPick: (c: string) => void }) {
  const intl = useIntl();
  return (
    <div className="flex flex-wrap gap-2">
      {colours.map((c) => (
        <button
          key={c}
          onClick={() => onPick(c)}
          title={intl.formatMessage({ id: `world.color.${c}` })}
          aria-label={intl.formatMessage({ id: `world.color.${c}` })}
          aria-pressed={value === c}
          className="w-8 h-8 px-notch"
          style={{
            background: COLOR_SWATCH[c],
            // Inside the swatch: the notched corners clip anything outside it.
            boxShadow: value === c
              ? 'inset 0 0 0 3px var(--px-gold), inset 0 0 0 5px var(--px-ink)'
              : 'inset 0 0 0 2px var(--px-ink)',
          }}
        />
      ))}
    </div>
  );
}

export function TailorShop({ initial, firstVisit, name, onRename, onChange, onDone }: {
  initial: Look;
  /** The learner's first time in the world: the shop is how it starts. */
  firstVisit: boolean;
  name: string;
  onRename: (name: string) => void;
  /** Every pick, so the room can dress your buddy in it. */
  onChange: (look: Look) => void;
  onDone: (look: Look) => void;
}) {
  const intl = useIntl();
  const [look, setLook] = useState(initial);
  const [tab, setTab] = useState<Tab>('outfit');
  const [buddyName, setBuddyName] = useState(name);
  const wear = (next: Look) => {
    playSelect();
    setLook(next);
    onChange(next);
  };
  const surprise = () => {
    const any = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
    const outfit = any(GARMENT_IDS);
    wear({ hair: any(HAIR_STYLES), hairColor: any(HAIR_COLORS), outfit, outfitColor: any(GARMENTS[outfit]), hat: any(HATS) });
  };
  const done = () => {
    if (buddyName.trim() !== name) onRename(buddyName.trim());
    onDone(look);
  };

  const colourTitle = (
    <p className="px-title !text-[12px] text-[var(--px-accent)] mt-1 mb-2"><FormattedMessage id="world.tailorColour" /></p>
  );

  return (
    <HudSide
      title={<FormattedMessage id="world.tailorTitle" />}
      footer={
        <div className="flex gap-2">
          <PixelButton tone="paper" onClick={surprise} title={intl.formatMessage({ id: 'world.tailorSurprise' })} aria-label={intl.formatMessage({ id: 'world.tailorSurprise' })} className="!px-3">
            <PixelIcon name="retry" size={2} />
          </PixelButton>
          <PixelButton tone="gold" className="flex-1" onClick={done}>
            ▶ <FormattedMessage id={firstVisit ? 'world.tailorStepOut' : 'world.tailorDone'} />
          </PixelButton>
        </div>
      }
    >
      <p className="text-[13px] text-[var(--px-muted)] leading-snug">
        <FormattedMessage id={firstVisit ? 'world.tailorWelcome' : 'world.tailorAgain'} />
      </p>

      <input
        value={buddyName}
        onChange={(e) => setBuddyName(e.target.value.slice(0, 24))}
        onKeyDown={(e) => e.stopPropagation()}
        aria-label={intl.formatMessage({ id: 'world.tailorName' })}
        placeholder={intl.formatMessage({ id: 'world.tailorNamePlaceholder' })}
        className="px-inset px-notch w-full px-3 py-2 text-[16px] font-bold text-[var(--px-text)] placeholder:text-[var(--px-muted)] focus:outline-none"
      />

      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <PixelChip key={t} on={tab === t} onClick={() => { playSelect(); setTab(t); }}>
            <FormattedMessage id={`world.tailorTab.${t}`} />
          </PixelChip>
        ))}
      </div>

      {tab === 'outfit' && (
        <div>
          <div className="grid grid-cols-3 gap-2">
            {GARMENT_IDS.map((g) => (
              <Tile key={g} on={look.outfit === g} look={wearGarment(look, g)} onClick={() => wear(wearGarment(look, g))}
                label={<FormattedMessage id={`world.garment.${g}`} />} />
            ))}
          </div>
          {colourTitle}
          <Swatches colours={GARMENTS[look.outfit]} value={look.outfitColor} onPick={(c) => wear({ ...look, outfitColor: c })} />
        </div>
      )}

      {tab === 'hair' && (
        <div>
          <div className="grid grid-cols-3 gap-2">
            {HAIR_STYLES.map((h) => (
              <Tile key={h} on={look.hair === h} look={{ ...look, hair: h, hat: 'none' }} onClick={() => wear({ ...look, hair: h })}
                label={<FormattedMessage id={`world.hair.${h}`} />} />
            ))}
          </div>
          {look.hair !== 'none' && (
            <>
              {colourTitle}
              <Swatches colours={HAIR_COLORS} value={look.hairColor} onPick={(c) => wear({ ...look, hairColor: c as Look['hairColor'] })} />
            </>
          )}
        </div>
      )}

      {tab === 'hat' && (
        <div className="grid grid-cols-3 gap-2">
          {HATS.map((h) => (
            <Tile key={h} on={look.hat === h} look={{ ...look, hat: h }} onClick={() => wear({ ...look, hat: h })}
              label={<FormattedMessage id={`world.hat.${h}`} />} />
          ))}
        </div>
      )}
    </HudSide>
  );
}
