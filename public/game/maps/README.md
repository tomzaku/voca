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

Three organic islands in the ocean, 64×150 tiles at **16px** (WorldScene draws
it at 2× so on-screen tiles are 32px and the movement/reach constants are
unchanged from the old 32px map). The districts are separated by open water and
joined by **wooden bridges** — the door crossings the game routes through (the
bridge deck is walkable; the surrounding water is collision):

| District | Region | Holds |
| --- | --- | --- |
| MEADOW | `public` | your collections |
| LAKESIDE | `system` | the level collections |
| HIGHLAND | `feature` | one building per app feature |

Layers (bottom → top): `sea` (seamless deep water) · `seafx` (animated sparkle
glints twinkling on the open sea — a Tiled tile animation Phaser plays natively)
· `ground` (sand beach + shallow ring) · `land` (autotiled grass + dirt roads) ·
`decor` (flowers, crops, bushes) · `build` (cottages, trees, rocks) · `walls`
(collision only — hidden, mirrors every solid + all water). The `meta` object
layer carries the spawn/door/label/station points WorldScene binds to (unchanged
contract).

Terrain is autotiled: grass is a plateau brush whose four outer corners are one
tile flipped four ways (Tiled/Phaser flip flags), ringed by a one-tile sand
beach then a shallow-water band, all over deep ocean. Buildings are **wide gable
cottages** (5×6) assembled from the modular building tileset in five roof colours
(blue/green/orange/red/purple), one per station slot — see `houseTemplate` in
the generator. Trees are whole single pines/shrubs clumped into woods; rocks are
self-contained boulders.

A **waterfall** spills from the lake's south lip over a short brown cliff into a
splash pool — its falling water is the pack's animated shallow-water tiles
(30,6/7/8), whose 4-frame loops are re-declared on the tileset so it shimmers.

Animated bits, all drawn by WorldScene from object points / its own sprites (not
baked into the tilemap): water twinkles via dense `seafx` sparkle tile-animations;
**windmills** turn (one per district, `windmill` points →
`public/game/props/windmill.png`); **animals** graze and wander their patch
(`animal` points carrying a `kind` → `public/game/props/{chicken,cow,sheep,pig,
duck}.png`); and **pixel clouds** drift east with soft ground shadows
(`public/game/props/cloud-*.png`, composed from the pack's cloud tiles — the left
half is mirrored to the right so both sides match).

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
