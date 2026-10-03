# 2026-10-03 · Blackwell port: design note

**In a few words:** keep the Vera Rubin engine, swap the hardware. Five views, from the B200 package to the NVL72 rack.

## Finish line
`npm run dev` shows five views with no console errors. Each view supports hover connection tracing, explode and a guided tour:

| View key | Title | Built from |
|---|---|---|
| `superchip` | GB200 Grace Blackwell Superchip | `assemblies/superchip.js` (Bianca board: 1 Grace + 2 B200) |
| `tray` | GB200 NVL72 Compute Tray | `assemblies/tray.js` (2 superchips, CX-7, BF-3, fans, internal cables) |
| `switch` | NVLink Switch Tray | `assemblies/switchTray.js` (2 NVLink 5 switch chips) |
| `rack` | GB200 NVL72 Rack | `assemblies/rack.js` (18 compute + 9 switch trays, spine, busbar, manifolds, power shelves) |
| `hgx` | HGX B200 | `assemblies/hgx.js` (8 B200 SXM, 2 NVLink switches, air-cooled heatsinks) |

## What we copy from upstream unchanged
studio, optimize, util, pcb/surfaces textures, the annotator (hover graph), the tour engine, the Placer/InstancedSet approach and the explode/toggle conventions:
- Units are mm, the scene is scaled ×0.1.
- In trays, z is +front, -rear.
- Names `gpu-lid`, `cooling` and `gpu-coldplate-lift` are toggle hooks.

## What changes (Blackwell vs Rubin), and how it shows in the model
| | Rubin (upstream) | Blackwell (ours) |
|---|---|---|
| GPU package | 2 dies stacked, HBM4 columns on the sides | 2 reticle dies side by side (NV-HBI 10 TB/s), 4 HBM3e above and 4 below |
| CPU memory | SOCAMM2 modules | 16 soldered LPDDR5X packages around Grace (480 GB) |
| CPU | Vera, 88 cores | Grace, 72 Neoverse V2 cores, C2C 900 GB/s |
| Tray I/O | cable-free midplane | **internal cables** (front I/O ↔ board), 4× ConnectX-7 + 2× BlueField-3 |
| Tray cooling | 100% liquid, fanless | liquid on CPU/GPU + **fan wall** for the front I/O |
| NVLink | gen 6, 3.6 TB/s | gen 5, 1.8 TB/s per GPU, 130 TB/s per rack, 18 switch chips in 9 trays |
| HGX | NVL8, liquid | HGX B200, 2 NVLink switches, **tall air heatsinks** |

## Rack approach (the riskiest part: draw calls)
- 26 trays are cheap LOD shells: cloned groups that share geometry and materials.
- One full-detail compute tray and one switch tray are clones of the view models. The explode slider slides them out like drawers, and their inner explode offsets are stripped.
- Hover on the full-detail GPU traces NVLink → spine → switch chips across the rack.

## Facts used (public; approximations are labelled in the info text)
- B200: 208B transistors, 2 dies, 8× HBM3e. HGX has 180–192 GB at 8 TB/s; NVL72 has 186 GB per GPU (13.4 TB per rack).
- NVL72: 36 Grace + 72 B200, about 120 kW, about 5,000 copper NVLink cables, 1.4 EF FP4.
- Board dimensions are estimates scaled from press photos. There are no CAD sources.
