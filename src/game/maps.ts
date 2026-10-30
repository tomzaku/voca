// World templates. A template is a standard Tiled JSON map (.tmj) plus its
// tileset image — see scripts/generate-world-map.mjs for the map contract
// (layer names, object types) any template must follow.
//
// Phase 2 (DB-backed templates): store the tmj JSON in Supabase
// (world_templates: id, name, tmj jsonb, tileset_url, is_system, version),
// fetch the user's chosen template, and inject it with
//   scene.cache.tilemap.add(key, { format: Phaser.Tilemaps.Formats.TILED_JSON, data: tmj })
// before creating the scene — everything else in WorldScene stays the same.
// The bundled map below remains the default and offline fallback.

export interface WorldMapSource {
  key: string;
  /** URL of the Tiled JSON document. */
  tmjUrl: string;
  /** URL of the tileset image the map references. */
  tilesetUrl: string;
  /** The tileset's `name` inside the map document. */
  tilesetName: string;
  /** Atlas of the loose scenery sprites the map's `props` layer places. */
  propsAtlasUrl?: string;
  propsAtlasJsonUrl?: string;
  /** A painted map: one image under the buddy (the whole ground) and one over
   *  it (roofs and crowns the buddy walks behind), in place of tile layers. */
  groundUrl?: string;
  overUrl?: string;
  /** Lights added over the dimmed map in dark mode only. */
  nightUrl?: string;
  /** The high-detail patches' list (scripts/hue/hd): each a part of the map
   *  drawn again at twice the resolution — `x, y` its top-left in map px —
   *  with its own ground and over images. */
  detailUrl?: string;
}

export interface DetailPatch { key: string; x: number; y: number; ground: string; over: string }

/** Huế, painted by scripts/generate-hue-map.mjs — the default world. */
export function defaultMap(): WorldMapSource {
  const base = import.meta.env.BASE_URL;
  return {
    key: 'hue',
    tmjUrl: `${base}game/maps/hue.tmj`,
    tilesetUrl: `${base}game/maps/hue-tiles.png`,
    tilesetName: 'hue',
    groundUrl: `${base}game/maps/hue-ground.png`,
    overUrl: `${base}game/maps/hue-over.png`,
    nightUrl: `${base}game/maps/hue-night.png`,
    detailUrl: `${base}game/maps/hue-detail.json`,
  };
}

/** The earlier Sunnyside village, kept as a template that still loads. */
export function sunnysideMap(): WorldMapSource {
  const base = import.meta.env.BASE_URL;
  return {
    key: 'world',
    tmjUrl: `${base}game/maps/sunnyside-world.tmj`,
    tilesetUrl: `${base}game/maps/tileset-sunnyside-world.png`,
    tilesetName: 'sunnyside',
    propsAtlasUrl: `${base}game/maps/props.png`,
    propsAtlasJsonUrl: `${base}game/maps/props.json`,
  };
}
