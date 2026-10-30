// Neighbourhoods: the city between the landmarks, as an illustrated map shows it: lanes of
// small houses under bright roofs, packed into the open land of each quarter,
// a gap left between every two so the buddy can always walk through.

import { rand } from '../core/canvas.mjs';
import { ROOF } from '../core/palette.mjs';
import { place, solid, used } from '../core/world.mjs';
import { hall } from '../draw/buildings.mjs';
import { T, isWater, nearSlot, onAnyRoad } from '../layout.mjs';

export const SMALL_HOUSE = (roofPal, wall) => hall({ w: 3, h: 3, roofRows: 2, roofPal, wall, windows: true, windowStep: 9, doorW: 5 });
export const LANE_ROOFS = [ROOF.red, ROOF.orange, ROOF.red, ROOF.blue, ROOF.terra, ROOF.orange, ROOF.teal, ROOF.dark];
export const HOUSE_WALLS = [[240, 232, 210], [236, 214, 170], [244, 240, 230], [232, 196, 168], [226, 214, 190]];
export function lotFree(tx, ty, w, h) {
  for (let j = ty; j < ty + h + 1; j++) {           // the row in front of the door too
    for (let i = tx; i < tx + w; i++) {
      if (used[j]?.[i] !== false || solid[j]?.[i] !== false || onAnyRoad(i, j)) return false;
      if (isWater(i * T + 8, j * T + 8) || isWater(i * T, j * T) || isWater(i * T + 15, j * T + 15)) return false;
    }
  }
  return !nearSlot(tx, ty);
}
// Quarters: [x0, y0, x1, y1] in tiles.
export const QUARTERS = [
  [1, 2, 28, 46],     // Kim Long
  [31, 6, 77, 15],    // inside the Citadel, round Tịnh Tâm
  [31, 30, 41, 44],   // the Citadel's south-west
  [69, 18, 77, 44],   // the Citadel's east side
  [83, 1, 104, 35],   // Gia Hội
  [0, 61, 98, 86],    // the south bank
  [98, 46, 120, 86],  // Vỹ Dạ
];

export function buildNeighbourhoods() {
  for (const [x0, y0, x1, y1] of QUARTERS) {
    for (let y = y0; y + 3 <= y1; y += 4) {
      const shift = (Math.floor(y / 4) % 2) * 2;     // stagger the rows, like streets that don't line up
      for (let x = x0 + shift; x + 3 <= x1; x += 4) {
        if (rand() < 0.22 || !lotFree(x, y, 3, 3)) continue;
        const roofPal = LANE_ROOFS[Math.floor(rand() * LANE_ROOFS.length)];
        place(SMALL_HOUSE(roofPal, HOUSE_WALLS[Math.floor(rand() * HOUSE_WALLS.length)]), x, y, 2);
      }
    }
  }
}
