# Kepler + Maxwell Tesla cards: design note (2026-10-03)

**In a few words:** one parametric "passive Tesla PCIe card" builder (`src/families/kepler/card.js`), two specs:
the dual-GPU **K80** (`?view=k80`, family `kepler`) and the single-GPU **M40** (`?view=m40`, family `maxwell`,
importing the builder, connections and texture helpers from `../kepler/`).

## Finish line

- `k80` and `m40` load in the viewer, `__app.check(['k80','m40'])` is ok, and the home page cards have thumbnails.
- The Coolers toggle hides the heatsink (group `cooling`), Enclosure hides the shroud (group `shell`), and Die floorplan
  swaps the die tops (`kepler-gk210`, `maxwell-gm200`).
- Each view has a 6-7 step tour covering airflow, GPUs, PCIe, memory, power and the floorplan.

## Coordinates

The card stands in its slot, as in a server. Units are mm.

| Axis | Meaning |
|---|---|
| x | -133.5 = bracket end .. +133.5 = far ("east") end with the power connector |
| y | 0 = bottom of the PCIe fingers. PCB body spans 8 .. 111.15 |
| z | +z = component side. PCB front surface at 0, back at -1.6 |

The board is built flat (parts on y = 0, like `superchip.js`, with `Placer` and `buildPcbTextures`) and then rotated
upright, so the shared texture and passive helpers work unchanged. The back side gets its own PCB texture
(pads under the back GDDR5, capacitor field behind each GPU) and a part-number sticker.

## What is sourced and what is estimated

| Item | K80 | M40 | Status |
|---|---|---|---|
| Card 267 x 111.15 mm, dual slot, full height | yes | assumed the same | K80 sourced (board spec). M40 assumed (same Tesla form factor) |
| GPU package 45 x 45 mm | GK210 | GM200 | K80 sourced. M40 estimate |
| Die | GK210 23.5 x 23.9 mm (561 mm², database figure) | GM200 24.6 x 24.4 mm (601 mm²) | Areas sourced. Aspect ratios estimated |
| SM count | 15 SMX, 13 enabled, 192 cores each | 24 SMM, 128 cores each | Sourced |
| GDDR5 | 48 chips, 24 per GPU, 12 front + 12 back (clamshell), 5 Gb/s, 240 GB/s per GPU | 24 chips, 12 + 12, 6 Gb/s, 288 GB/s | Counts and bandwidth sourced. Front/back split inferred from the chip count and the 384-bit bus |
| Memory placement | 3 left, 3 right, 3 above, 3 below each GPU | same | Estimate |
| PCIe switch | PLX, x16 up + x16 to each GPU | none | "PLX switch" sourced. PEX8747 is our inference (the 48-lane Gen3 part) |
| Power | one EPS-12V 8-pin on the east edge, 300 W, 150 W cap per GPU | one CPU 8-pin + 2-pin power-brake header, 250 W | Sourced. Positions on the edge estimated |
| VRM phases | 7 + 6 along the top edge, 5 in a column by the power end | 6 core + 6 along the top | Estimate |
| Heatsink | copper bases, 4 heat pipes, 2 fin stacks along x | 1 fin stack | Estimate (only "passive heat sink" is sourced) |
| Shroud colour | silver-grey with a dark band | dark grey | Estimate |
| PCIe finger offset from the bracket | 41 mm | same | Estimate |

Floorplans are stylised block diagrams arranged like NVIDIA's architecture diagrams, not die-shot traces. The two
fused-off SMX on GK210 are illustrative; which SMX are disabled varies from chip to chip.

## Airflow

In a server the bracket faces the hot aisle. Air therefore enters at the east end, flows along the fins (which run
along x) and leaves through the vented bracket. The tours show this as `air` flows from a virtual point past the
east end to one past the bracket.

## Buses

The family overrides `pcie` → "PCIe Gen3" and adds `gddr5` ("GDDR5") and `air` ("Airflow"). Power and management
use the base buses.

## Sources

`src/families/kepler/SOURCES.md` and `src/families/maxwell/SOURCES.md`. The key source is NVIDIA's Tesla K80 board
specification BD-07317-001_v05.
