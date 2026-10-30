import layout from '../../game/wardrobe-layers.json';
import { lookLayers, type Look } from '../../game/wardrobe';

// A look drawn in the page rather than the game — the tailor's tiles: the
// wardrobe atlas's layers stacked as backgrounds, standing still on the first
// idle frame. Rows come from wardrobe-layers.json, which the atlas script
// writes beside the sheet.

const SHEET = `${import.meta.env.BASE_URL}game/characters/wardrobe.png`;

export function LookSprite({ look, scale = 3 }: { look: Look; scale?: number }) {
  const size = layout.frame * scale;
  return (
    <span aria-hidden className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {lookLayers(look).map((name) => {
        const row = layout.layers.indexOf(name);
        if (row < 0) return null;
        return (
          <span
            key={name}
            className="px-sprite absolute inset-0"
            style={{
              backgroundImage: `url(${SHEET})`,
              backgroundPosition: `0 ${-row * layout.stride * scale}px`,
              backgroundSize: `${layout.width * scale}px auto`,
            }}
          />
        );
      })}
    </span>
  );
}
