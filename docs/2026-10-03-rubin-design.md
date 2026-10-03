# NVIDIA Vera Rubin family: design note (2026-10-03)

**In a few words:** restore upstream's original Vera Rubin model (bddicken/nvidia, commit `99f9dd1`) as a
self-contained family. Copy, don't share; don't redesign.

## Finish line

- Views `vr-superchip`, `vr-tray`, `vr-nvl8` render as upstream did (same titles, cameras, tours, hover graph).
- `__app.check(['vr-superchip','vr-tray','vr-nvl8'])` returns `ok: true`. Result: ok, with 22 / 43 / 23 tagged parts.
- Thumbnails are in `public/thumbs/vr-*.jpg`.

## What was ported

| Upstream file (99f9dd1) | Family copy |
|---|---|
| `src/assemblies/{superchip,tray,nvl8}.js` | `src/families/rubin/assemblies/` |
| `src/parts/{chips,boardParts,materials}.js` | `src/families/rubin/parts/` |
| `src/textures/{silicon,surfaces}.js` | `src/families/rubin/textures/` |
| `src/annotations/connections.js` (`CONNECTIONS`, `BUSES`) | `src/families/rubin/connections.js`, exported as the family's `connections` and `buses` |
| `src/tour/tours/{superchip,tray,nvl8}.js` | `src/families/rubin/tours/` |
| `src/main.js` view titles, cameras, superchip y-lift (4 mm) and shadow sizes (30 / 60) | `meta.js`, `index.js` |

The copies keep their own module-level caches (materials, die textures, `veraMats`), so nothing is shared with
the Blackwell-modified files in `src/parts` and `src/textures`. Only stateless shared code is imported:
`src/lib/util.js` (identical to upstream), `src/lib/optimize.js` and `src/textures/pcb.js`.

Nav order follows upstream: superchip, compute tray, 8-GPU tray. Toggles follow upstream's panel: lids and
floorplan on every view that has them, and cold plates only on the trays. NVL8 has no Vera die, so it has
no floorplan toggle.

## Deviations from upstream

| Change | Why |
|---|---|
| View ids get a `vr-` prefix | `superchip` and `tray` are already Blackwell's global URL keys. |
| Uses our `src/textures/pcb.js`, not upstream's | The signature (`buildPcbTextures({W, L, ppm, seed, ...})`) is the same. Ours fixes upstream's z-mirror, so traces and pads now sit under their parts, and counter-flips silkscreen text so it still reads upright. |
| The Vera die gets `userData.looks = 'rubin-vera'`, registered as `looks['rubin-vera'] = veraDieMaterials` | Replaces upstream's swap-by-name in `main.js`. The mesh is still named `vera-die`, which is in `PROTECTED_NAMES`. |
| Lids and cooling: upstream's `setLids`, `setCooling` and `setColdPlateLift` stay in the copies but are unused | The viewer already handles the `gpu-lid`, `cooling` and `gpu-coldplate-lift` names with the same 2.6 mm lift. |
| NVL8 bezel retagged from `front-panel` to `nvl8-bezel`, which has its own entry with `links: []` | Upstream's `front-panel` links point only to `mgmt-module`, a part the NVL8 view lacks, so hovering showed no links there and the check failed. The hover text is unchanged. |
| `vrm-ctrl` gains a link to the nearest `gpu-module` | In NVL8 its upstream targets (`drmos`, `cpld`) don't exist, which left a dead link. The superchip and tray have no `gpu-module`, so nothing changes there. |
| Card text (`blurb`, `stats`) is new | The home page needs it. Every number in it comes from upstream's hover text and tours: 288 GB HBM4 per GPU, 1.8 TB/s C2C. |

Accent `#e0b44c` (warm gold, close to the champagne MGX bezel). Upstream's green is Blackwell's.

## Estimates

All dimensions are upstream's, scaled from photos, and remain estimates (see upstream's accuracy notes,
repeated in `src/families/rubin/SOURCES.md`).
