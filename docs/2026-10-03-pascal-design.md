# 2026-10-03 · Pascal family: design note

**In a few words:** the P100 SXM module, built with Volta's shared SXM builder and a Pascal spec.

## Finish line
One view, `p100`, no console errors, `__app.check(['p100'])` ok, thumbnail written.

| View key | Title | Built from |
|---|---|---|
| `p100` | Tesla P100 SXM | `families/volta/sxm.js` + `families/pascal/p100.js` (spec) |

## Decisions
- Reuse `../volta/sxm.js` (module), `../volta/textures.js` (GP100 floorplan / marked die) and
  `../volta/connections.js` (`sxmConnections('p100', …)`). Nothing is copied.
- Same toggles as V100: `floorplan` only. No lid (bare die, frame only).
- Bus overrides: `nvlink` → "NVLink 1", `hbm` → "HBM2", `pcie` → "PCIe Gen3".
- Naming: NVIDIA's sources call P100 the first SXM; `nvidia-smi` reports it as "Tesla P100-SXM2-16GB". The view title
  says "SXM"; the silkscreen uses the nvidia-smi name.

## Facts (sourced, see `src/families/pascal/SOURCES.md`)
GP100 610 mm², 15.3B transistors, TSMC 16FF+, 60 SMs / 56 enabled (3,584 CUDA cores), first HBM2 GPU: 16 GB (4 × 4-high)
at 732 GB/s on CoWoS; 4× NVLink 1 (40 GB/s bidirectional each, 160 GB/s); 300 W; 21.2 / 10.6 / 5.3 TFLOPS FP16/32/64.

## Estimates
Die aspect (25 × 24.4 mm), interposer 27.5 × 44, substrate 50 × 58, and all module estimates listed in the Volta note.
