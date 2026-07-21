# World map template

`village.tmj` is a standard Tiled map (edit it in https://www.mapeditor.org);
`tileset-village.png` is its tileset and `tileset-world.json` the name → tile
mapping the generator uses. Regenerate from scratch with:

```
node scripts/compose-world-tileset.mjs   # tileset-world.png from the epic rpg pack
node scripts/generate-world-map.mjs      # the map itself
node scripts/merge-world-tileset.mjs     # + tiles-summer.png → tileset-village.png
node scripts/compose-buddy.mjs           # the player sprite strip
```

The map document carries a **single** embedded tileset — WorldScene loads one
tileset image — so every sheet you want to paint with has to be merged into it.
`merge-world-tileset.mjs` appends extra 32px sheets below the composed base,
whole rows at a time, so existing gids (and the map data) never shift. Add more
sheets by listing them in that script's `EXTRAS`.

| Sheet | Rows in `tileset-village.png` | First gid |
| --- | --- | --- |
| `tileset-world.png` (base) | 0–16 | 1 |
| `tiles-summer.png` | 17–28 | 273 |

The composers need the `epic rpg/` folder at the repo root (not committed —
download it from the link below).

The map is 40×100 tiles at **32px**, split into three areas by two rivers, each
crossed by a dry land bridge:

| Area | Region | Holds |
| --- | --- | --- |
| MEADOW | `public` | your collections |
| LAKESIDE | `system` | the level collections |
| HIGHLAND | `feature` | one building per app feature |

The pack ships no water→grass shore tiles (it expects grass autotiles layered
over water), so the map sticks to fully-opaque fills and hides the lake's hard
edge behind bushes instead.

## Art credit

World tiles + player: **EPIC RPG World Pack — basic tileset and assets**
(https://szadiart.itch.io/rpg-worlds-basic-set).

The station monsters (public/game/stations) still come from the **Ninja
Adventure Asset Pack — by Pixel-boy & AAA**
(https://pixel-boy.itch.io/ninja-adventure-asset-pack) — CC0 1.0.
