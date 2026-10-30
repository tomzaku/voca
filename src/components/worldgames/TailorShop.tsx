import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { FIGURES, HAIR_COLORS, HAIR_STYLES, HATS, OUTFITS, STARTER, type Look } from '../../game/wardrobe';
import { playSelect } from '../../lib/sfx';
import { HudSide, PixelButton, PixelChip, PixelIcon } from './pixel';

// The tailor's (tiệm may): where you're dressed before you first step into
// Huế, and whenever you like after (You › Wardrobe). Your buddy stands in the
// room wearing whatever you pick, as you pick it; nothing is kept until you
// step out. The clothes are Huế's own — áo dài in the city's purple or the
// schoolgirls' white, áo the and khăn đóng, nón lá — alongside everyday wear.

/** Swatches for the outfit and hair-colour chips — the atlas's own colours. */
const OUTFIT_SWATCH: Record<Look['outfit'], string> = {
  everyday: '#e93245', aoDaiPurple: '#804898', aoDaiWhite: '#f6f6fa', aoDaiRed: '#cc343a',
  aoDaiBlue: '#487ac4', aoDaiYellow: '#f0c440', aoThe: '#343444',
};
const HAIR_SWATCH: Record<Look['hairColor'], string> = { dark: '#5d3b4a', brown: '#925e38', grey: '#bcb8c0' };

function Swatch({ color }: { color: string }) {
  return <span className="inline-block w-3 h-3 shadow-[inset_0_0_0_1px_var(--px-ink)]" style={{ background: color }} />;
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
  const [buddyName, setBuddyName] = useState(name);
  const wear = (part: Partial<Look>) => {
    playSelect();
    const next = { ...look, ...part };
    setLook(next);
    onChange(next);
  };
  // Boy or girl. On a first visit it also dresses you in a starting look —
  // after that it only changes the figure, keeping what you've picked.
  const choose = (figure: Look['figure']) => (firstVisit ? wear(STARTER[figure]) : wear({ figure }));
  const surprise = () => {
    const any = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
    wear({ hair: any(HAIR_STYLES), hairColor: any(HAIR_COLORS), outfit: any(OUTFITS.slice(1)), hat: any(HATS) });
  };
  const done = () => {
    if (buddyName.trim() !== name) onRename(buddyName.trim());
    onDone(look);
  };

  const section = (titleId: string, children: React.ReactNode) => (
    <section>
      <p className="px-title !text-[12px] text-[var(--px-accent)] mb-1.5"><FormattedMessage id={titleId} /></p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </section>
  );

  return (
    <HudSide
      title={<FormattedMessage id="world.tailorTitle" />}
      footer={
        <PixelButton tone="gold" block onClick={done}>
          ▶ <FormattedMessage id={firstVisit ? 'world.tailorStepOut' : 'world.tailorDone'} />
        </PixelButton>
      }
    >
      <p className="text-[14px] leading-snug">
        <span className="px-title !text-[12px] text-[var(--px-gold)] block mb-0.5"><FormattedMessage id="world.tailorKeeper" /></span>
        <FormattedMessage id={firstVisit ? 'world.tailorWelcome' : 'world.tailorAgain'} />
      </p>

      <section>
        <p className="px-title !text-[12px] text-[var(--px-accent)] mb-1.5"><FormattedMessage id="world.tailorName" /></p>
        <input
          value={buddyName}
          onChange={(e) => setBuddyName(e.target.value.slice(0, 24))}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder={intl.formatMessage({ id: 'world.tailorNamePlaceholder' })}
          className="px-inset px-notch w-full px-3 py-2 text-[16px] font-bold text-[var(--px-text)] placeholder:text-[var(--px-muted)] focus:outline-none"
        />
      </section>

      {section('world.tailorFigure', FIGURES.map((f) => (
        <PixelChip key={f} on={look.figure === f} onClick={() => choose(f)}><FormattedMessage id={`world.figure.${f}`} /></PixelChip>
      )))}
      {section('world.tailorOutfit', OUTFITS.map((o) => (
        <PixelChip key={o} on={look.outfit === o} onClick={() => wear({ outfit: o })}>
          <span className="inline-flex items-center gap-1.5"><Swatch color={OUTFIT_SWATCH[o]} /><FormattedMessage id={`world.outfit.${o}`} /></span>
        </PixelChip>
      )))}
      {section('world.tailorHat', HATS.map((h) => (
        <PixelChip key={h} on={look.hat === h} onClick={() => wear({ hat: h })}><FormattedMessage id={`world.hat.${h}`} /></PixelChip>
      )))}
      {section('world.tailorHair', HAIR_STYLES.map((h) => (
        <PixelChip key={h} on={look.hair === h} onClick={() => wear({ hair: h })}><FormattedMessage id={`world.hair.${h}`} /></PixelChip>
      )))}
      {look.hair !== 'none' && section('world.tailorHairColor', HAIR_COLORS.map((c) => (
        <PixelChip key={c} on={look.hairColor === c} onClick={() => wear({ hairColor: c })}>
          <span className="inline-flex items-center gap-1.5"><Swatch color={HAIR_SWATCH[c]} /><FormattedMessage id={`world.hairColor.${c}`} /></span>
        </PixelChip>
      )))}

      <PixelButton tone="paper" className="!py-1.5 !px-3" onClick={surprise}>
        <PixelIcon name="retry" size={2} /> <FormattedMessage id="world.tailorSurprise" />
      </PixelButton>
    </HudSide>
  );
}
