# NVIDIA RTX (Blackwell desktop): design note (2026-10-03)

**In a few words:** one parametric card builder, two views. The RTX 5090 FE and the RTX PRO 6000
Workstation share the shape, the 3-board split and the double flow-through cooler. The PRO adds
clamshell memory, a black finish and different outputs.

## Finish line

- Views `rtx5090` and `rtxpro6000` load from `src/families/rtx/`. `__app.check` is ok: every tour flow
  and tag resolves, and every part id has a connection.
- The `shell`, `cooling` and `floorplan` toggles work. The explode slider separates the shroud,
  cooler, fans and boards (PCIe board drops, display board slides out).
- Thumbnails are in `public/thumbs/rtx5090.jpg` and `rtxpro6000.jpg`.

## Files

| File | Contents |
|---|---|
| `card.js` | `buildCard({ pro })`: shroud and backplate (`shell`), vapor chamber, heat pipes, fin stacks and fans (`cooling`), main board, PCIe board, display board, flex cables, bracket |
| `gb202.js` | GB202 package and two die looks (`rtx-gb202-5090` and `rtx-gb202-pro`), each with a marked and a floorplan version |
| `connections.js` | Family connection table and buses (`gddr7` "GDDR7", `pcie` "PCIe Gen5", `display`, `cool` renamed to "Heat / airflow") |
| `tours.js` | 8 steps per view |

## Coordinates

The card lies fans-up, in mm:

- x runs along the card: -152 is the bracket end, +152 the far end.
- z runs across it: -68.5 is the PCIe finger edge, +68.5 the top edge with the power connector, which faces the camera.
- y is up: 0 is the back face and 40 the fan face.

## Sourced vs estimated

| Item | Status |
|---|---|
| 304 × 137 mm, 2 slots (40 mm) | Sourced (HotHardware, NVIDIA) |
| Separate main, PCIe and display boards joined by flex | Sourced (HotHardware, TweakTown, Tom's) |
| 3D vapor chamber, liquid-metal TIM, two flow-through fin stacks | Sourced |
| 12V-2x6 angled and recessed in the top edge | Sourced. The exact angle (~35°) is an estimate |
| GB202 750 mm², 92.2B transistors, 192 SMs / 12 GPCs, 128 MB L2, 16 × 32-bit controllers | Sourced |
| 5090: 170 SMs, 96 MB L2, 32 GB / 16 × 2 GB, 1.79 TB/s, 575 W | Sourced |
| PRO 6000: 188 SMs, 128 MB L2, 96 GB / 32 × 3 GB clamshell, ECC, 600 W, 4× DP 2.1 | Sourced |
| 19 GPU + 8 memory phases (NVIDIA says 30 in total) | Sourced (TechPowerUp counts) |
| Die 24 × 31 mm, package 56 × 63 mm | Reported from early board photos. Estimate |
| Memory ring: 5 left, 5 right, 4 top, 2 bottom | From GB202 reference-board photos. Assumed the same on the FE |
| Main board ~112 × 118 mm and phase positions | Estimate |
| Fan diameter ~96 mm, fin stack extents, 6 heat pipes per side, heights in y | Estimate |
| Straight fins | Simplification: the real card mixes straight and curved fins |
| PRO 6000 internals the same as the FE (3 boards, same cooler) | Estimate: NVIDIA shows the same industrial design. No teardown found |
| Controller and BIOS part markings, silkscreen | Illustrative |

## PRO 6000 differences shown

- Black shroud and fins, with a thin silver trim.
- 16 more memory chips on the back of the main board, cooled through the backplate.
- 4× DP and no HDMI.
- A die look with only 4 SMs dimmed (the 5090 look dims a whole GPC plus 6 SMs, and 4 of the 16 L2 slices).
- Tour-only topics: 4 NVENC and 4 NVDEC, MIG with up to 4 instances, the 300 W Max-Q blower card, and the passive Server Edition.

## Why it is a different class from B200 (tour, last step)

- No HBM: GDDR7 at 1.79 TB/s, against 8 TB/s on a B200.
- No NVLink: GPUs reach each other only over PCIe Gen5 x16, at 64 GB/s each way.
- Desktop power budget: one 12V-2x6 cable, 575 or 600 W, and air cooling.

## Shared change needed

None. The family uses only the existing runtime names `shell` and `cooling`.

## Known weaknesses

- The FE's real fin shapes, side outlets and shroud curvature are simplified to boxes and plates.
- The flex cables are approximate ribbons. The I/O flex crosses the main board edge.
- Phase and memory positions are not measured from a photo of the FE board itself.
