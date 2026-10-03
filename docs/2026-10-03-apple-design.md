# Apple silicon + home page: design note (2026-10-03)

**In a few words:** the home page is a gallery of families. Apple gets three views, M5 Ultra package →
Mac Studio → 4-node Thunderbolt 5 cluster, mirroring superchip → tray → NVL72.

## Finish line

- `/` lists the NVIDIA and Apple families as cards with rendered thumbnails. Clicking a card opens
  `viewer.html?view=<id>`.
- The viewer only shows the current family's views and has a "← All chips" link. Old `/?view=x` links redirect.
- Apple views: `ultra`, `studio` and `cluster`. Each has hover connections that resolve and a guided tour
  whose flows resolve.
- `npm run build` emits both pages.

## Site structure

| Piece | File |
|---|---|
| Catalog (families, views, card text) shared by both pages | `src/catalog.js` |
| Home page | `index.html`, `src/home/*` |
| Viewer | `viewer.html`, `src/main.js` (nav, title and accent come from the catalog) |
| Card images | `public/thumbs/<view>.jpg`, written in dev by `__app.saveThumb()` through a Vite middleware |

## Apple scope

Today's flagship is the **M5 Ultra**, which Apple announced on 2026-08-25 and shipped in the Mac Studio on 2026-09-22.
It is two M5 Max chips joined by UltraFusion. Each M5 Max is a **CPU tile plus a GPU tile**, hybrid-bonded
(SoIC-X) onto a silicon interposer, so the package holds **four tiles**. There is no M4 Ultra.

| View | Contents | NVIDIA analogue |
|---|---|---|
| `ultra` | Package with 2 CPU tiles (6 super + 12 P cores, 16-core Neural Engine, TB5/display/SSD controllers), 2 GPU tiles (40 GPU cores each, SLC, memory controllers), the UltraFusion bridge, 8 LPDDR5X packages (1024-bit, 1.2 TB/s, up to 512 GB) and a lid | superchip |
| `studio` | Mac Studio, 197 × 197 × 95 mm: unibody shell, logic board, SoC under a copper heatsink, two blowers, PSU, 2 SSD NAND modules, 6× TB5, 10 GbE, HDMI, USB-A, SDXC | compute tray |
| `cluster` | 4 Mac Studios in a 10" mini rack, wired as a TB5 full mesh (6 cables, RDMA in macOS 26.2+), plus 10 GbE to a switch. One unit is full detail and slides out; the other three are closed shells | NVL72 rack |

## Layout decisions (all estimates; Apple publishes no dimensions)

- **Tile sizes:**
  - M5 Pro tiles are measured: CPU 9.3 × 18.0 mm, GPU 8.2 × 19.6 mm.
  - The M5 Max GPU tile is about twice the M5 Pro's, so 16.4 × 19.6 mm.
- **Tile arrangement (along z):** CPU A, GPU A, UltraFusion, GPU B, CPU B.
  - UltraFusion joins the GPU tiles because the memory controllers and SLC live there, so the coherent fabric is on that side.
  - DRAM sits in a column of four on each side of the GPU tiles, as on the M1 Ultra.
- **Package:** 62 × 72 mm (the M1 Ultra was 65 × 72).
- **Mac Studio stack, bottom to top:**
  - Foot and intake ring.
  - Logic board, low, so the ports line up with the real port row at the bottom of the back panel.
  - The PSU under the front half; the blowers above it.
  - The copper heatsink over the SoC at the rear, exhausting through the rear grille.
- **Trademarks:** no Apple logos. Lids and labels carry part names only.

## Sources

See `reference/SOURCES.md` → Apple. Key ones:
- Apple newsroom: M5 Pro/Max (2026-03) and Mac Studio M5 (2026-08).
- TechInsights: M5 Pro package (SoIC-X) and M1 Ultra (65 × 72, UltraFusion).
- ExoticSpice die measurements.
- EE Times Japan Mac Studio 2025 teardown.
- Jeff Geerling's 4× Mac Studio RDMA cluster.
- WWDC26 session 233 (JACCL mesh/ring).
