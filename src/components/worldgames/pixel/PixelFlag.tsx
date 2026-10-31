// A language's flag in the world's square pixels — the pixel icons are one
// colour, and a flag needs its own. English flies the Union Jack, worked out
// pixel by pixel (its crosses and diagonals don't survive being typed out at
// this size); Vietnamese, the red flag and its yellow star, drawn as a grid.

const W = 15;
const H = 9;

const BLUE = '#1f3c8a';
const RED = '#c8202f';
const WHITE = '#f4f1e8';
const YELLOW = '#ffd23a';

function unionJack(x: number, y: number): string {
  const cx = (W - 1) / 2, cy = (H - 1) / 2;
  if (x === cx || y === cy) return RED;
  if (Math.abs(x - cx) <= 1 || Math.abs(y - cy) <= 1) return WHITE;
  // The saltire: both diagonals, corner to corner.
  const t = x / (W - 1);
  if (Math.abs(y - t * (H - 1)) < 0.75 || Math.abs(y - (1 - t) * (H - 1)) < 0.75) return WHITE;
  return BLUE;
}

const STAR = [
  '..#..',
  '..#..',
  '#####',
  '.###.',
  '.#.#.',
];

function vietnam(x: number, y: number): string {
  const sx = x - 5, sy = y - 2;
  return STAR[sy]?.[sx] === '#' ? YELLOW : RED;
}

const PAINT: Record<string, (x: number, y: number) => string> = { en: unionJack, vi: vietnam };

export function PixelFlag({ locale, scale = 1.4, className = '' }: { locale: string; scale?: number; className?: string }) {
  const paint = PAINT[locale];
  if (!paint) return null;
  const px = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) px.push(<rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={paint(x, y)} />);
  return (
    <svg width={W * scale} height={H * scale} viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" aria-hidden className={`shrink-0 ${className}`}>
      {px}
    </svg>
  );
}
