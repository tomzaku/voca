// The real places of Huế the map paints, so the world can introduce them —
// a plaque on each you can tap, a card when your buddy walks by, and a guide
// in the travel drawer. What each one is lives in the `places` catalog
// (places.<id>, …En, …About, …Fact); this is only where they stand.
//
// Positions are in map tiles, matching where scripts/generate-hue-map.mjs
// paints each building (its roofline, where the plaque sits). Places the map
// already names with a label (`label`) use that label as their plaque.
//
// Kept dependency-free like the rest of src/game/'s data.

export interface Landmark {
  id: string;
  /** Tile coordinates of its plaque. */
  x: number;
  y: number;
  /** The map label that names it already, if any. */
  label?: string;
}

/** North to south, west to east — the order the drawer's guide lists them. */
export const LANDMARKS: Landmark[] = [
  { id: 'anHien', x: 13, y: 7 },
  { id: 'kimLong', x: 4, y: 4.5, label: 'Kim Long' },
  { id: 'tinhTam', x: 55, y: 7.5 },
  { id: 'giaHoi', x: 86, y: 5, label: 'Gia Hội' },
  { id: 'duyetThiDuong', x: 73, y: 13.2 },
  { id: 'tangThuLau', x: 36, y: 21 },
  { id: 'thaiHoa', x: 55, y: 25.5 },
  { id: 'ngoMon', x: 55, y: 34.5 },
  { id: 'thienMu', x: 6, y: 39.5 },
  { id: 'vanMieu', x: 20, y: 39 },
  { id: 'dongBa', x: 91, y: 42 },
  { id: 'conHen', x: 110.5, y: 38.5 },
  { id: 'kyDai', x: 55, y: 44 },
  { id: 'dragonBoat', x: 55.5, y: 52.5 },
  { id: 'truongTien', x: 69.4, y: 51.2, label: 'Cầu Trường Tiền' },
  { id: 'songHuong', x: 4, y: 54.3, label: 'Sông Hương' },
  { id: 'vyDa', x: 108, y: 54, label: 'Vỹ Dạ' },
  { id: 'gaHue', x: 27.5, y: 61.5 },
  { id: 'quocHoc', x: 41, y: 60.5 },
  { id: 'walkingStreet', x: 77, y: 64.5 },
  { id: 'anDinh', x: 92, y: 66.5 },
  { id: 'khaiDinh', x: 8, y: 70.5 },
  { id: 'nguBinh', x: 52, y: 84.6, label: 'Ngự Bình' },
];
