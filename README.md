# Vera Rubin 3D

An interactive, physically-based 3D model of NVIDIA's **Vera Rubin** hardware, built procedurally in
three.js from public photographs and renders. It's meant to grow into a learning tool.

**Hover any component to trace its connections.** Animated, colour-coded pathways arc to every part it
talks to: NVLink, NVLink-C2C, HBM4, LPDDR5X, PCIe, network, power, coolant and management. Each
connected part is bracketed and labelled. A callout card sits off to the side with a leader line, so it
never covers the part. Click to pin a selection while you orbit or explode. Press Esc or click empty space to release it.

**Take the guided tour.** Twelve short steps follow an AI model through the NVL72 compute tray:
1. Plugging into the rack.
2. Power-on and boot.
3. External networking.
4. The cable-free midplane.
5. Loading weights into CPU memory.
6. NVLink-C2C into the GPUs.
7. Weights in HBM4.
8. A request arriving over GPUDirect RDMA.
9. Execution on the tensor cores.
10. NVLink 6 scale-up across the rack.
11. Results going back out.

Each step frames the camera on the parts involved and draws directional, colour-coded flows. You can still
orbit, and ← / → or the arrows step through the tour. Esc or "Exit tour" returns to free exploration, and
`?tour=5` opens the tour at a given step.

## Views

- **Superchip**: one Vera CPU, two Rubin GPUs (2 compute dies + 8 HBM4 each), 8 SOCAMM2 LPDDR5X
  modules, NVLink 6 spine connectors, PCIe Gen6 midplane connectors and the power delivery around them.
- **Compute tray**: the 1U MGX NVL72 tray. It holds two superchips, four ConnectX-9 SuperNICs per side, a BlueField-4 DPU,
  a management module, power distribution, the midplanes, liquid cold plates, copper plumbing and the rear
  blind-mate coolant/power connectors.
- **8-GPU tray (HGX Rubin NVL8)**: eight Rubin GPUs on GPU modules over an HGX baseboard with four on-board NVLink 6
  switches (all-to-all, 3.6 TB/s per GPU), host connectors to a separate CPU tray (Vera or x86), eight black cold
  plates on a central coolant manifold with quick-disconnect couplings and braided hoses, and rear UQDs, busbar and power.

Controls include an exploded view, GPU heat-spreader lids on or off, the CPU die look (laser-marked
backside or floorplan), cold plates on or off (both trays), and camera presets. URL parameters let you link to a state:
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
| HGX Rubin NVL8 GPU tray layout | `src/assemblies/nvl8.js` |
| Chip packages (Rubin GPU, Vera CPU, small packages) | `src/parts/chips.js` |
| Connectors, SOCAMM, inductors, instancing helper | `src/parts/boardParts.js` |
| PCB texture set: mask, traces, vias, ENIG pads, silkscreen, normal map | `src/textures/pcb.js` |
| Die floorplans, lid marking, substrates | `src/textures/silicon.js` |
| Studio lighting, shadows, GTAO, tone mapping | `src/scene/studio.js` |
| Draw-call optimizer (merges static meshes per part) | `src/lib/optimize.js` |
| Connection graph (roles, links, buses, bandwidths) | `src/annotations/connections.js` |
| Hover/pin pathways, brackets, callout placement | `src/annotations/annotator.js` |
| Guided tour steps (text, flows, camera) | `src/tour/steps.js` |
| Guided tour controller (framing, flow arrows, panel) | `src/tour/tour.js` |

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
- In the NVL8 tray, the four NVLink switches' location under the manifold spine, the host-connector strip and the
  GPU-module VRM layout are informed guesses; the cold plates, manifold, couplings, hoses and bezel follow the GTC photo.
- The GPU dies show a stylised floorplan, as in NVIDIA's own renders. Real dies are covered by a lid or a
  cold plate, and real bare silicon backsides look like dark mirrors.
