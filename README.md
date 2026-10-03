# Blackwell 3D

An interactive, physically based 3D model of NVIDIA **Blackwell** hardware, from a single B200 package up to a full
**GB200 NVL72** rack. Everything is built procedurally in three.js.

This is a fork of [bddicken/nvidia](https://github.com/bddicken/nvidia) (the Vera Rubin 3D model). It keeps that
project's rendering, hover-tracing and guided-tour engine, and replaces all of the hardware with Blackwell parts.

**Hover any component to trace its connections.** Colour-coded pathways arc to every part it talks to: NVLink 5,
NVLink-C2C, HBM3e, NV-HBI, LPDDR5X, PCIe Gen5, network, power, coolant and management. Click to pin a selection,
and press Esc or click empty space to release it.

**Guided mode** (top-left toggle) runs a short tour for the model on screen. Use ← / → to step through it, and
`?tour=3` to open a tour at a given step.

## Views

| View | `?view=` | What's in it |
|---|---|---|
| **GB200 superchip** | `superchip` | The "Bianca" board: 1 Grace CPU (72 Neoverse V2 cores) with 16 soldered LPDDR5X packages, 2 B200 GPUs (two dies side by side + 8 HBM3e each), NVLink 5 backplane connectors at the rear, PCIe Gen5 cable connectors at the front, and all VRMs and passives. |
| **Compute tray** | `tray` | 1U NVL72 compute tray: 2 superchips, 4 ConnectX-7 cards (one per GPU), 2 BlueField-3 DPUs, 4 E1.S drives, a fan wall for the air-cooled front I/O, **internal twinax cables** (GB200 has no midplane), PDBs, cold plates and hoses. |
| **Switch tray** | `switch` | 1U NVLink switch tray: 2 NVLink 5 switch chips (72 ports, 7.2 TB/s each), management CPU and BMC, spine connectors, liquid cooling. |
| **NVL72 rack** | `rack` | 18 compute trays, 9 switch trays, 8 power shelves, the copper NVLink spine (4 cable cartridges), the DC busbar and the coolant manifolds. The explode slider pulls out one compute tray and one switch tray at full detail. Hover a B200 in the open tray to trace its NVLink path through the spine to the switch chips. |
| **HGX B200** | `hgx` | Air-cooled 8-GPU baseboard: 8 SXM modules with tall vapor-chamber heatsinks, 2 NVLink switch chips in the centre, 8 PCIe Gen5 host connectors and a fan wall. |

Display options: explode, heat-spreader lids, Grace die floorplan, and coolers (cold plates and heatsinks).
URL parameters link to a state, for example `?view=rack&explode=1&cooling=0&cam=hero`.

### What's different from the Vera Rubin model

| | Vera Rubin (upstream) | Blackwell (this fork) |
|---|---|---|
| GPU package | 2 dies, HBM4 columns | 2 dies side by side (NV-HBI 10 TB/s), 4 HBM3e above and 4 below |
| CPU + memory | Vera + SOCAMM2 modules | Grace + soldered LPDDR5X |
| Tray I/O | cable-free midplane, fanless | internal cables, fan wall |
| NVLink | gen 6, 3.6 TB/s/GPU | gen 5, 1.8 TB/s/GPU, 130 TB/s per rack |
| HGX | NVL8, liquid | HGX B200, air-cooled heatsinks |
| Extra | | NVLink switch tray and the full NVL72 rack |

## Running

```bash
npm install
npm run dev
```

## How it's built

As upstream, everything is generated in code, with no downloaded meshes or image textures. Dimensions are
estimates scaled from public photos and specs (see [reference/SOURCES.md](reference/SOURCES.md)). The design
notes are in [docs/2026-10-03-blackwell-design.md](docs/2026-10-03-blackwell-design.md).

| Area | File |
|---|---|
| GB200 superchip (Bianca) layout | `src/assemblies/superchip.js` |
| GB200 NVL72 compute tray | `src/assemblies/tray.js` |
| NVLink switch tray | `src/assemblies/switchTray.js` |
| NVL72 rack (LOD shells + full-detail drawers, spine, busbar, manifolds) | `src/assemblies/rack.js` |
| HGX B200 | `src/assemblies/hgx.js` |
| Chip packages (B200, Grace, small packages) | `src/parts/chips.js` |
| Connectors, LPDDR5X, inductors, instancing helper | `src/parts/boardParts.js` |
| PCB texture set: mask, traces, vias, ENIG pads, silkscreen, normal map | `src/textures/pcb.js` |
| Die floorplans (Blackwell, Grace), lid marking, substrates | `src/textures/silicon.js` |
| Connection graph (what each part talks to) | `src/annotations/connections.js` |
| Guided tours | `src/tour/tours/*.js` |

The rack stays interactive because 25 of its 27 trays are closed shells that share geometry. The two open drawers
are clones of the tray-view models, with their inner explode offsets stripped so the slider moves only the drawers.

`src/textures/pcb.js` also fixes a mirror in upstream's PCB mapping: silkscreen and pads used to land at the
opposite end of the board from the parts that own them.

## Deploying

This is a static Vite build. `npm run deploy` publishes it to Cloudflare Pages as project `blackwell3d` (after a
one-time `npx wrangler login`). `.github/workflows/deploy.yml` deploys every push to `main` once the
`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` secrets are set. Until then it builds and skips the deploy step.

## Credits

Engine, art direction and the original Vera Rubin model by [@bddicken](https://github.com/bddicken). Upstream has
no license file, so ask the author before redistributing.
