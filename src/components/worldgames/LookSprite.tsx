import layout from '../../game/wardrobe-layers.json';
import { lookLayers, type Look } from '../../game/wardrobe';

// A look drawn in the page rather than the game — the tailor's tiles, the
// status bar's portrait, the loading card: the wardrobe atlas's layers stacked
// as backgrounds, on one frame (the first idle frame unless told otherwise;
// 0–8 are the idle clip, 9–16 the walk). Rows come from wardrobe-layers.json,
// which the atlas script writes beside the sheet.

const SHEET = `${import.meta.env.BASE_URL}game/characters/wardrobe.png`;

export function LookSprite({ look, scale = 3, frame = 0, extra = [] }: {
  look: Look;
  scale?: number;
  frame?: number;
  /** Layers over the look — a keeper's prop. */
  extra?: string[];
}) {
  const size = layout.frame * scale;
  return (
    <span aria-hidden className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {[...lookLayers(look), ...extra].map((name) => {
        const row = layout.layers.indexOf(name);
        if (row < 0) return null;
        return (
          <span
            key={name}
            className="px-sprite absolute inset-0"
            style={{
              backgroundImage: `url(${SHEET})`,
              backgroundPosition: `${-frame * layout.stride * scale}px ${-row * layout.stride * scale}px`,
              backgroundSize: `${layout.width * scale}px auto`,
            }}
          />
        );
      })}
    </span>
  );
}
