# World map template

`village.tmj` is a standard Tiled map (edit it in https://www.mapeditor.org);
`tileset-village.png` is its tileset and `tileset-village.json` the name → tile
mapping the generator uses. Regenerate from scratch with:

```
node scripts/compose-village-tileset.mjs   # tileset from the Ninja Adventure pack
node scripts/generate-world-map.mjs        # the map itself
```

The composer needs the "Ninja Adventure - Asset Pack" folder at the repo root
(not committed — download it from the link below).

## Art credit

Tileset art: **Ninja Adventure Asset Pack — by Pixel-boy & AAA**
(https://pixel-boy.itch.io/ninja-adventure-asset-pack) — CC0 1.0, free for
commercial and non-commercial use. Attribution not required but appreciated.
The station monsters (public/game/stations) come from the same pack.
