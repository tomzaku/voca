# World map template

`village.tmj` is a standard Tiled map (edit it in https://www.mapeditor.org).
Its tileset is the whole **Sunnyside World 16px sheet**, copied here as
`tileset-sunnyside.png` — so any tile is addressable as `gid = row*64 + col + 1`
and there is no compose/merge step. Regenerate the map with:

```
node scripts/generate-sunnyside-world.mjs      # village.tmj + tileset-sunnyside.png
node scripts/_preview-tmj.mjs public/game/maps/village.tmj out.png 3   # optional QA render
node scripts/compose-buddy.mjs                 # the player sprite strip (unchanged)
```

The generator reads the source sheet from the extracted asset pack at
`tiled/extracted/Sunnyside_World_ASSET_PACK_V2.1/…/Tileset/spr_tileset_sunnysideworld_16px.png`
(the `tiled/` folder isn't committed — unzip the pack there first).

## The map

One organic island in the ocean, 64×150 tiles at **16px** (WorldScene draws it
at 2× so on-screen tiles are 32px and the movement/reach constants are unchanged
from the old 32px map). The island is pinched into three district "rooms" by two
straits, each spanned by a land bridge — the door crossings the game routes
through:

| District | Region | Holds |
| --- | --- | --- |
| MEADOW | `public` | your collections |
| LAKESIDE | `system` | the level collections |
| HIGHLAND | `feature` | one building per app feature |

Layers (bottom → top): `sea` (seamless deep water) · `ground` (sand beach +
shallow ring) · `land` (autotiled grass + dirt roads) · `decor` (flowers, crops,
bushes) · `build` (cottages, trees, rocks) · `walls` (collision only — hidden,
mirrors every solid + all water). The `meta` object layer carries the
spawn/door/label/station points WorldScene binds to (unchanged contract).

Terrain is autotiled: grass is a plateau brush whose four outer corners are one
tile flipped four ways (Tiled/Phaser flip flags), ringed by a one-tile sand
beach then a shallow-water band, all over deep ocean. Buildings are the pack's
self-contained "tower" cottages in five roof colours (blue/green/orange/red/
purple), one per station slot.

## Art credit

World tiles, buildings, props and player: **Sunnyside World Asset Pack V2.1 —
by Daniel Diggle (Sunnyside)** (https://danieldiggle.itch.io/sunnyside). 16px.

The station monsters (public/game/stations) come from the **Ninja Adventure
Asset Pack — by Pixel-boy & AAA**
(https://pixel-boy.itch.io/ninja-adventure-asset-pack) — CC0 1.0.

The previous EPIC RPG + Summer Plains 32px pipeline
(`compose-world-tileset.mjs`, `merge-world-tileset.mjs`,
`generate-world-map.mjs`, `tileset-village.png`, `tileset-world.*`, the
`*-summer.png` sheets) is superseded and can be removed once you're happy with
the new map.
