# Vera Rubin 3D

An interactive, physically-based 3D model of NVIDIA's **Vera Rubin** hardware, built procedurally in
three.js from public photographs and renders. It's meant to grow into a learning tool.

**Hover any component to trace its connections.** Animated, colour-coded pathways arc to every part it
talks to: NVLink, NVLink-C2C, HBM4, LPDDR5X, PCIe, network, power, coolant and management. Each
connected part is bracketed and labelled. A callout card sits off to the side with a leader line, so it
never covers the part. Click to pin a selection while you orbit or explode. Press Esc or click empty space to release it.

## Views

- **Superchip**: one Vera CPU, two Rubin GPUs (2 compute dies + 8 HBM4 each), 8 SOCAMM2 LPDDR5X
  modules, NVLink 6 spine connectors, PCIe Gen6 midplane connectors and the power delivery around them.
- **Compute tray**: the 1U MGX NVL72 tray. It holds two superchips, four ConnectX-9 SuperNICs per side, a BlueField-4 DPU,
  a management module, power distribution, the midplanes, liquid cold plates, copper plumbing and the rear
  blind-mate coolant/power connectors.

Controls include an exploded view, GPU heat-spreader lids on or off, the CPU die look (laser-marked
backside or floorplan), cold plates on or off, and camera presets. URL parameters let you link to a state:
`?view=tray&explode=0.6&lids=1&cooling=0&cam=close`.

## Running

```bash
npm install
npm run dev
```

## How it's built

Everything is generated in code. There are no downloaded meshes and no image textures:

| Area | File |
| --- | --- |
| Superchip layout (measured from the GTC photos at ~0.48 mm/px) | `src/assemblies/superchip.js` |
| Compute tray layout | `src/assemblies/tray.js` |
| Chip packages (Rubin GPU, Vera CPU, small packages) | `src/parts/chips.js` |
| Connectors, SOCAMM, inductors, instancing helper | `src/parts/boardParts.js` |
| PCB texture set: mask, traces, vias, ENIG pads, silkscreen, normal map | `src/textures/pcb.js` |
| Die floorplans, lid marking, substrates | `src/textures/silicon.js` |
| Studio lighting, shadows, GTAO, tone mapping | `src/scene/studio.js` |
| Draw-call optimizer (merges static meshes per part) | `src/lib/optimize.js` |
| Connection graph (roles, links, buses, bandwidths) | `src/annotations/connections.js` |
| Hover/pin pathways, brackets, callout placement | `src/annotations/annotator.js` |

The PCB texture is built from the same placement list as the 3D parts. Every capacitor sits on its own
pads and every package has its own silkscreen outline.

Scene units are centimetres. Models are authored in millimetres and scaled by 0.1.

## Reference imagery

`reference/sources.json` lists the photos and renders the model is based on, with their source pages.
They're copyrighted by their owners, so they're git-ignored. Run `npm run fetch-refs` to download them
into `reference/images/` for local study.

## Accuracy notes

- The board and package dimensions are estimates scaled from photos. NVIDIA hasn't published mechanical drawings.
- Some details are plausible stand-ins rather than confirmed hardware, including passive placement, silkscreen text,
  front-panel port layout, the management and power-distribution modules and the cold-plate plumbing.
- The GPU dies show a stylised floorplan, as in NVIDIA's own renders. Real dies are covered by a lid or a
  cold plate, and real bare silicon backsides look like dark mirrors.
