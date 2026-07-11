# Avatar layers

The main character for the world map — an LPC paper doll. One transparent
576×256 sheet per layer (64px frames; rows = down/up/left/right; col 0 =
idle, cols 1–8 = walk cycle), stacked at runtime in this order:
body → head → shoes → pants → top → hair → hat. See src/lib/avatar.ts.

Regenerate with `node scripts/fetch-lpc-avatar.mjs` (downloads from the
Universal LPC Spritesheet Character Generator repo, cached in .lpc-cache/).

## Art credit (required by license)

**Liberated Pixel Cup (LPC) character assets** — by the authors listed in
`CREDITS.csv` (this folder), licensed **CC-BY-SA 3.0 / GPL 3.0 / OGA-BY 3.0**.
Assembled via the [Universal LPC Spritesheet Character Generator]
(https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator).
Keep CREDITS.csv shipping with the app; if voca gains a credits screen, list
these authors there too.
