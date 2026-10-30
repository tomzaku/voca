// Getting about Huế: a bicycle, and the xích lô — the three-wheeled cyclo the
// city is known for, its passenger up front under a hood, the driver
// pedalling behind. Drawn here pixel by pixel into small canvases (two frames
// each, so the spokes turn), facing right; the scene flips them, and the HUD
// shows them on its ride button.
//
// Dependency-free like the rest of src/game/ (the DOM canvas aside).

export type Ride = 'walk' | 'bike' | 'cyclo';
export const RIDES: Ride[] = ['walk', 'bike', 'cyclo'];

/** How much faster than walking each one goes. */
export const RIDE_SPEED: Record<Ride, number> = { walk: 1, bike: 1.9, cyclo: 1.5 };

/** Where the rider sits, in the vehicle's own pixels from its bottom centre:
 *  the buddy's feet for a bike, the passenger's for a cyclo — and, for a
 *  cyclo, where the driver sits. */
export const SEAT: Record<Exclude<Ride, 'walk'>, { x: number; y: number; driver?: { x: number; y: number } }> = {
  bike: { x: -2, y: -8 },
  cyclo: { x: -9, y: -9, driver: { x: 7, y: -10 } },
};

/** How big each is drawn, against the map's 2× — a xích lô is a big thing to
 *  sit in. */
export const RIDE_SCALE: Record<Exclude<Ride, 'walk'>, number> = { bike: 1, cyclo: 1.4 };

const INK = '#1c120c';
type Px = (x: number, y: number, c: string) => void;

function wheel(px: Px, cx: number, cy: number, r: number, frame: number) {
  for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
    const d = Math.hypot(x, y);
    if (Math.abs(d - r) < 0.6) px(cx + x, cy + y, INK);
  }
  // Spokes: straight on one frame, crossed on the other — the wheel turns.
  for (let i = 1; i < r; i++) {
    if (frame === 0) { px(cx + i, cy, '#8a8a8a'); px(cx - i, cy, '#8a8a8a'); px(cx, cy + i, '#8a8a8a'); px(cx, cy - i, '#8a8a8a'); }
    else { const k = Math.round(i * 0.7); px(cx + k, cy + k, '#8a8a8a'); px(cx - k, cy - k, '#8a8a8a'); px(cx + k, cy - k, '#8a8a8a'); px(cx - k, cy + k, '#8a8a8a'); }
  }
  px(cx, cy, '#d0d0d0');
}

function line(px: Px, x0: number, y0: number, x1: number, y1: number, c: string) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) px(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
}

/** The front of a xích lô's carriage — its side panel and footrest — drawn
 *  over the passenger, so they sit in it rather than in front of it. Same
 *  size and origin as drawRide's. */
export function drawRideFront(ride: Exclude<Ride, 'walk'>): HTMLCanvasElement | null {
  if (ride !== 'cyclo') return null;
  const cv = document.createElement('canvas');
  cv.width = 36; cv.height = 24;
  const ctx = cv.getContext('2d')!;
  const px: Px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
  for (let y = 13; y <= 17; y++) for (let x = 2; x <= 15; x++) px(x, y, y === 13 ? '#3e5280' : '#2a3a5c');
  for (let x = 2; x <= 15; x++) px(x, 14, '#f0c050');
  for (let x = 0; x <= 4; x++) px(x, 17, '#2a3a5c');
  return cv;
}

/** The vehicle as a canvas, frame 0 or 1, facing right. */
export function drawRide(ride: Exclude<Ride, 'walk'>, frame: number): HTMLCanvasElement {
  const w = ride === 'bike' ? 24 : 36, h = ride === 'bike' ? 15 : 24;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d')!;
  const px: Px = (x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < h) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); } };

  if (ride === 'bike') {
    const red = '#c0392b';
    wheel(px, 5, 10, 4, frame);
    wheel(px, 18, 10, 4, frame);
    line(px, 5, 10, 9, 5, red);      // seat stay
    line(px, 9, 5, 11, 10, red);     // seat tube
    line(px, 11, 10, 5, 10, red);    // chain stay
    line(px, 9, 5, 16, 5, red);      // top tube
    line(px, 11, 10, 16, 5, red);    // down tube
    line(px, 16, 3, 18, 10, red);    // fork
    for (let x = 7; x <= 10; x++) px(x, 3, INK);    // saddle
    px(15, 2, INK); px(16, 2, INK); px(17, 2, INK); // handlebar
    px(11, 11, INK); px(12, 12, INK);               // pedal
    return cv;
  }

  // Xích lô: the passenger's carriage up front, hood over it; the driver's
  // bicycle half behind.
  const body = '#2a3a5c', bodyLight = '#3e5280', seat = '#a83226', hood = '#1c1c22', trim = '#f0c050';
  wheel(px, 7, 19, 4, frame);
  wheel(px, 29, 19, 4, frame);
  // Carriage: a deep seat box, a footrest jutting forward.
  for (let y = 11; y <= 17; y++) for (let x = 2; x <= 15; x++) px(x, y, y === 11 ? bodyLight : body);
  for (let y = 9; y <= 12; y++) for (let x = 4; x <= 14; x++) px(x, y, seat);
  for (let x = 0; x <= 4; x++) px(x, 17, body);
  for (let x = 2; x <= 15; x++) px(x, 14, trim);
  // The folding hood, arched over the seat.
  for (let x = 3; x <= 15; x++) {
    const top = 2 + Math.round(Math.pow((x - 10) / 6, 2) * 3);
    for (let y = top; y <= Math.min(9, top + 2); y++) px(x, y, hood);
  }
  for (let y = 4; y <= 9; y++) px(15, y, hood);
  // The frame back to the driver's wheel, the saddle and pedals.
  line(px, 15, 15, 29, 19, '#5a5a62');
  line(px, 15, 12, 25, 10, '#5a5a62');
  line(px, 25, 10, 24, 16, '#5a5a62');
  for (let x = 23; x <= 27; x++) px(x, 9, INK);
  px(24, 17, INK); px(25, 18, INK);
  return cv;
}
