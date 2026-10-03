# 2026-10-03 · Hopper family: design note

**In a few words:** one GH100 package, reused three times: on its SXM5 module, eight times on HGX, and next to Grace on GH200.

## Finish line
Three views load with no console errors, and `__app.check(['h100','hgx-h100','gh200'])` returns `ok: true`. Each view has hover tracing, explode, a guided tour and a home page thumbnail.

| View key | Title | Built from |
|---|---|---|
| `h100` | H100 / H200 SXM5 | `families/hopper/sxm5.js`: GH100 package + SXM5 module PCB, VRMs, 2 mezzanine connectors |
| `hgx-h100` | HGX H100 / H200 (8-GPU) | `families/hopper/hgx.js`: 8 × `ctx.model('h100')`, 4 NVSwitch, host and power connectors, air heatsinks |
| `gh200` | GH200 Grace Hopper Superchip | `families/hopper/gh200.js`: `gh100Package({variant:'gh200'})` + shared `graceCPU()` + 16 LPDDR5X |

Files live only in `src/families/hopper/`: `meta.js`, `index.js`, `sxm5.js`, `hgx.js`, `gh200.js`, `textures.js`, `tours.js`, `connections.js` and `SOURCES.md`.

## H100 vs H200: how it shows
The H100 and H200 use the same die, module, board and 700 W. Only the memory differs, so one model covers both:
- The H100 package has **6 HBM sites, with 5 active**. The unused site is drawn darker and tagged `hbm-off`. Which of the six sites is unused is an estimate.
- The hover text, tours and connections give the H200 numbers: all 6 sites hold HBM3e, 141 GB at 4.8 TB/s.
- GH200 uses the same package with all 6 sites active, at 96 GB HBM3 or 144 GB HBM3e.
- `gh100Package({ variant: 'h200' })` exists, but no view uses it.

## The lid is honest
H100/H200 SXM5 ship bare-die. The `lids` toggle shows a nickel heat spreader that is labelled "illustration only", following upstream's B200 lid. It is off by default.

## Floorplan (key `hopper-gh100`)
The layout follows NVIDIA's block diagram:
- 8 GPCs: 4 above and 4 below the L2.
- Each GPC is 9 TPCs × 2 SMs, drawn as 2 × 9 SM tiles.
- The L2 is split into two halves joined by a crossbar strip.
- HBM PHYs and memory controllers run down both long edges, three segments per side to match the stacks.
- PCIe Gen5 and the GigaThread engine sit on one short edge. The 18 NVLink 4 ports sit on the other.

Block proportions are stylised.

## HGX layout
- **GPUs:** 2 rows × 4 at the front (the air intake side), with module long axes running front to back.
- **NVSwitches:** the 4 chips sit in a row at the rear end of the board (STH: "at one end"; HGX B200 later moved two larger switches to the middle). The HMC is between them.
- **Rear edge:** 8 host connectors (one PCIe Gen5 x16 per GPU) and 4 × 54 V power connectors.
- **Heatsinks:** each GPU heatsink has a copper pedestal on the die, a vapour-chamber plate above the module's inductors, and an 84 mm fin stack, all inside the `gpu-coldplate-lift` group. The switch heatsinks are shorter and sit downstream of the GPUs.
- **Explode:** modules lift by 60 mm and the heatsinks by 170 mm. Inner explodes inherited from the module (board off the connectors, package, die and HBM) stay active.

## Facts (sourced, see `src/families/hopper/SOURCES.md`)
- **GH100:** 814 mm², 80B transistors, TSMC 4N. The full die has 144 SMs and 60 MB L2. H100 SXM5 has 132 SMs and 50 MB L2.
- **H100 SXM5:** 80 GB HBM3 on 5 stacks, 3.35 TB/s, 700 W. 18 NVLink 4 links at 900 GB/s. PCIe Gen5 x16.
- **H200:** 141 GB HBM3e at 4.8 TB/s, 700 W.
- **HGX H100:** 4 third-gen NVSwitches. Each GPU sends 4 or 5 links to each switch (4+5+4+5). 3.6 TB/s bisection. 8 × PCIe Gen5 x16 to the host.
- **NVSwitch (3rd gen):** 25.1B transistors, 294 mm², 50 × 50 mm package, 64 NVLink 4 ports, SHARP.
- **GH200:** 72-core Grace with up to 480 GB LPDDR5X at 512 GB/s. 96 GB HBM3 at 4 TB/s, or 144 GB HBM3e at 4.9 TB/s. NVLink-C2C at 900 GB/s. Up to 1000 W per module.
- **GH200 layout:** the GPU takes one half and Grace the other, flanked by LPDDR5X, with more LPDDR5X on the back (STH, OCP 2023).

## Estimates (no public drawings)
| Item | Value used |
|---|---|
| SXM5 module PCB | 150 × 104 mm, mezzanine stack 5 mm |
| GH100 die aspect | 26 × 31.3 mm (area sourced) |
| Package, interposer, HBM footprint | 70 × 60, 54 × 37, 11 × 10 mm |
| VRM phase count and layout, mezzanine connector positions and sizes | stylised |
| HGX tray and board | 448 × 540 tray, 430 × 510 baseboard |
| GPU heatsink fin height | 84 mm |
| Host connector type and count | 8 × "PCIe" blocks |
| HMC marking (AST2600) | assumed |
| GH200 board | 132 × 224 mm |
| GH200 connectors | 3 underneath |
| GH200 LPDDR5X arrangement | 8 top + 8 underside |

## Known weaknesses
- The module VRM pattern is generic. It is not traced from a photo.
- The HGX host connectors are modelled as eight generic blocks.
- The modules in the HGX view carry the H100 silkscreen and the H100 HBM configuration. The H200 appears only in the text.
