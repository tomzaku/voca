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
}

export function defaultMap(): WorldMapSource {
  const base = import.meta.env.BASE_URL;
  return {
    key: 'world',
    tmjUrl: `${base}game/maps/village.tmj`,
    tilesetUrl: `${base}game/maps/tileset-world.png`,
    tilesetName: 'world',
  };
}
