# Blackwell 3D (Chips 3D)

Interactive, physically based 3D models of AI hardware, built procedurally in three.js. There are 10 families and 23 views:

| Family | `?view=` ids |
|---|---|
| NVIDIA Vera Rubin (the original upstream model) | `vr-superchip`, `vr-tray`, `vr-nvl8` |
| NVIDIA Blackwell | `superchip`, `tray`, `switch`, `rack`, `hgx` |
| NVIDIA Hopper (H100 / H200) | `h100`, `hgx-h100`, `gh200` |
| NVIDIA Ampere | `a100`, `hgx-a100` |
| NVIDIA Volta | `v100`, `dgx1` (hybrid cube-mesh) |
| NVIDIA Pascal | `p100` |
| NVIDIA Maxwell | `m40` |
| NVIDIA Kepler | `k80` |
| NVIDIA RTX (Blackwell desktop) | `rtx5090`, `rtxpro6000` |
| Apple silicon | `ultra` (M5 Ultra), `studio` (Mac Studio), `cluster` (4× Mac Studio over TB5) |

Each family is a self-contained plugin folder, `src/families/<id>/`. [src/families/README.md](src/families/README.md)
describes how to add one. Run `await __app.check()` in the viewer console to verify every tour and every hover link.

The site opens on a home page (`/`) with one card per model. A card opens the viewer at `viewer.html?view=<id>`.

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

### Apple silicon

| View | `?view=` | What's in it |
|---|---|---|
| **M5 Ultra** | `ultra` | The package: two M5 Max chips joined by the UltraFusion bridge. Each M5 Max is a CPU tile (6 super + 12 performance cores, Neural Engine, TB5/display/SSD controllers) and a GPU tile (40 cores, SLC, memory controllers), hybrid-bonded onto a silicon interposer. 8 LPDDR5X packages (1024-bit, 1.2 TB/s, up to 512 GB) and a lid. |
| **Mac Studio** | `studio` | The 197 mm unibody (lift it with the explode slider or the enclosure toggle), logic board, SoC voltage regulators, 2 NAND-only SSD modules, copper heatsink, two blowers, the 480 W PSU and bus bar, 6× Thunderbolt 5, 10 GbE, HDMI, USB-A and SDXC. |
| **4-node cluster** | `cluster` | Four Mac Studios in a 10" mini rack, wired as a Thunderbolt 5 full mesh (6 cables, RDMA over Thunderbolt in macOS 26.2+), plus a 10 GbE switch and a power strip. The top Mac slides out at full detail. |

Display options: explode, heat-spreader lids, die floorplans (Grace and Apple tiles), coolers (cold plates,
heatsinks, fans) and the Mac Studio enclosure. Each view shows only the options that apply to it.
URL parameters link to a state, for example `viewer.html?view=rack&explode=1&cooling=0&cam=hero`.
Old links such as `/?view=rack` redirect to the viewer.

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
notes are in [docs/2026-10-03-blackwell-design.md](docs/2026-10-03-blackwell-design.md) and
[docs/2026-10-03-apple-design.md](docs/2026-10-03-apple-design.md).

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
| Apple M5 Ultra package / tile floorplans | `src/parts/apple.js`, `src/textures/apple.js` |
| Mac Studio, Mac Studio cluster | `src/assemblies/macStudio.js`, `src/assemblies/macCluster.js` |
| Home page and the catalog of families and views | `index.html`, `src/home/`, `src/catalog.js` |
| Connection graph (what each part talks to) | `src/annotations/connections.js` |
| Guided tours | `src/tour/tours/*.js` |

The rack stays interactive because 25 of its 27 trays are closed shells that share geometry. The two open drawers
are clones of the tray-view models, with their inner explode offsets stripped so the slider moves only the drawers.

`src/textures/pcb.js` also fixes a mirror in upstream's PCB mapping: silkscreen and pads used to land at the
opposite end of the board from the parts that own them.

### Home page card images

`public/thumbs/<view>.jpg` are renders of each view. To refresh one, run the dev server, open the view, set it up
the way you want and run `__app.saveThumb()` in the console. A dev-only Vite middleware writes the file.

## Deploying

### Modal

```bash
npm run deploy:modal
```

This builds `dist/` and deploys `deploy/modal_app.py`, a small FastAPI static-file app, as the Modal app `chips-3d`.
The URL is `https://<workspace>--chips-3d.modal.run`. It scales to zero when idle, so the first visit after a quiet
spell takes a few seconds to cold-start.

### Cloudflare Pages

This is a static Vite build. `npm run deploy` publishes it to Cloudflare Pages as project `blackwell3d` (after a
one-time `npx wrangler login`). `.github/workflows/deploy.yml` deploys every push to `main` once the
`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` secrets are set. Until then it builds and skips the deploy step.

## Credits

Engine, art direction and the original Vera Rubin model by [@bddicken](https://github.com/bddicken). Upstream has
no license file, so ask the author before redistributing.
