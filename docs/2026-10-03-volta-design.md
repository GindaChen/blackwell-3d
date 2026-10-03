# 2026-10-03 · Volta family: design note

**In a few words:** one shared SXM module builder; V100 module view; DGX-1 board view that makes the hybrid cube-mesh the star.

## Finish line
Two views, no console errors, `__app.check(['v100','dgx1'])` ok, thumbnails written.

| View key | Title | Built from |
|---|---|---|
| `v100` | Tesla V100 SXM2 | `families/volta/sxm.js` + `v100.js` (spec) |
| `dgx1` | DGX-1 (V100) GPU board | `families/volta/dgx1.js`, 8 clones of `ctx.model('v100')` |

## Decisions
- **No lid toggle.** SXM2 GPUs have bare dies. A thin frame sets the heatsink height; the info text says so.
  Toggles: `floorplan` (module), `cooling` + `floorplan` (board).
- **Module is generic** (`buildSxmModule(spec)`), so Pascal reuses it with a different spec (`../pascal/p100.js`).
  The module root is named `superchip`, so `scope: 'superchip'` links stay inside one module when eight are on the board.
- **Cube-mesh is data** (`topology.js`): 16 GPU pairs, 24 links, link counts per pair, three rings, PCIe tree.
  The baseboard traces, the per-GPU hover entries (`dgx-gpu-0..7`, each lists its exact peers and NV1/NV2) and the
  tour flows are all generated from it.
- **Board arrangement** follows the whitepaper's figure 4 (GPU3 0 4 7 over GPU2 1 5 6), 4 across × 2 deep, so the
  two quads sit left and right and the bridging links are visible. Physical positions are estimates.
- **PCIe**: one Gen3 switch per GPU pair (0-1, 2-3 → CPU0; 4-5, 6-7 → CPU1), each with one EDR IB NIC, placed behind
  its GPU column. CPUs and NICs are virtual points in the tour (they live in the system board).
- Bus overrides: `nvlink` → "NVLink 2", `hbm` → "HBM2", `pcie` → "PCIe Gen3", `net` → "InfiniBand".

## Facts (sourced, see `src/families/volta/SOURCES.md`)
GV100 815 mm², 21.1B transistors, 12FFN, 84 SMs / 80 enabled, 640 Tensor Cores; 16/32 GB HBM2 at 900 GB/s; 6× NVLink 2
(50 GB/s bidirectional each); 300 W; SXM2 ≈ 140 × 78 mm with two mezzanine connectors. DGX-1: 3U, 3.5 kW, 2× Xeon
E5-2698 v4, 512 GB, 4× EDR IB, 128 GB HBM2, 7.2 TB/s.

## Estimates (labelled in code comments)
Die aspect (32 × 25.5 mm), interposer 35 × 45, substrate 55 × 62, package position and VRM layout, connector size and
position (and which connector carries NVLink vs power/PCIe, "as commonly described"), all tray/baseboard dimensions,
switch/fan/connector positions, heatsink size (62 mm fins), fan count. Floorplans are stylised; the fused-off SM
positions are illustrative.

## Known weaknesses
- V100 and P100 modules look alike (by design: same form factor); differences are die size, HBM, silk and NVLink count.
- The DGX-1 tray is modelled alone; the CPU board, PSUs and drives are virtual tour points.
