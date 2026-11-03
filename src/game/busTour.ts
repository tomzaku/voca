// The Huế sightseeing bus: one loop past every stop on the map, in an order
// that goes round the city rather than zig-zagging across it — the citadel,
// north to the lake, west along the river to the pagoda, back through the
// station and the schools to the walking street, south to the hill and the
// tombs, and home by Vỹ Dạ. You board at any stop; the loop starts from
// there, visits every other stop once and brings you back.

/** The loop, by place id. A stop missing from it is visited at the end. */
export const TOUR_LOOP = [
  'dongBa', 'kyDai', 'tinhTam', 'vanMieu', 'thienMu', 'gaHue', 'quocHoc',
  'walkingStreet', 'nguBinh', 'tuDuc', 'khaiDinh', 'minhMang', 'vyDa',
] as const;

/** How long the bus waits at each stop of a tour, ms. */
export const TOUR_STOP_MS = 4000;

/**
 * The tour from the stop at index `from` (of `stops`, the map's place ids in
 * its own order): the indexes of every other stop in loop order, ending back
 * at `from`.
 */
export function tourOrder(stops: string[], from: number): number[] {
  const rank = (p: string) => {
    const i = (TOUR_LOOP as readonly string[]).indexOf(p);
    return i < 0 ? TOUR_LOOP.length : i;
  };
  const loop = stops.map((_, i) => i).sort((a, b) => rank(stops[a]) - rank(stops[b]) || a - b);
  const at = Math.max(0, loop.indexOf(from));
  return [...loop.slice(at + 1), ...loop.slice(0, at), loop[at]];
}
