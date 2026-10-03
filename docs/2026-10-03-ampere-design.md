# 2026-10-03 · NVIDIA Ampere family: design note

**In a few words:** one A100 SXM4 module, then eight of them on the HGX A100 baseboard with six NVSwitches in a row behind them.

## Finish line
Two views load with no console errors, `__app.check(['a100','hgx-a100'])` returns `ok: true`, and both thumbnails show the
model framed and readable.

| View key | Title | Built from |
|---|---|---|
| `a100` | A100 SXM4 | `src/families/ampere/a100.js` (GA100 package on CoWoS-S, 6 HBM sites, SXM4 board, VRMs, 2 mezzanine connectors) |
| `hgx-a100` | HGX A100 8-GPU | `src/families/ampere/hgx.js` (8 × `ctx.model('a100')`, 6 NVSwitch gen 2, air heatsinks, sled, fans) |

## Model choices
| Part | Choice | Status |
|---|---|---|
| GA100 die | 826 mm², drawn as 25.6 × 32.3 mm (the split is an estimate; the area is sourced) | area sourced, aspect estimated |
| HBM | 6 sites, 3 each side of the die along its long edges; one is marked "disabled" (A100 enables 5 stacks, 5120-bit) | layout from package photos, stack size from the JEDEC HBM2 KGSD outline (~7.75 × 11.87 mm) |
| Interposer | CoWoS-S passive silicon, ~53 × 35 mm | estimate |
| Package substrate | 62 × 56 mm with a gold stiffener ring, bare die | estimate |
| Lid | not used on production SXM4. The `lids` toggle shows an illustrative nickel lid, labelled as such (same convention as the B200) | illustrative |
| SXM4 board | 100 × 150 mm, VRM banks either side of the package, two mezzanine connectors underneath | estimate |
| Floorplan look | 8 GPCs (2×2 above and 2×2 below a split L2 band), 3 HBM PHYs per long edge, NVLink 3 + PCIe Gen4 SerDes on the short edges | from the whitepaper block diagram; stylised |
| HGX layout | front: 2 rows × 4 GPUs. Behind them: one row of 6 NVSwitch heatsinks. Rear edge: PCIe/power connectors and NVLink bridge connectors for the 16-GPU back-to-back option | layout from ServeTheHome photos ("on the other side of the GPUs we have the NVSwitch array", connectors at one end); dimensions estimated |
| Baseboard | 430 × 520 mm | estimate |

## Topology facts used
- A100: 108 SMs of 128, 40 MB L2, 5 stacks: 40 GB HBM2 at 1,555 GB/s or 80 GB HBM2e at 2,039 GB/s, 400 W.
- 12 NVLink 3 links, 50 GB/s each, 600 GB/s per GPU. In HGX, each GPU runs 2 links to each of the 6 NVSwitches.
- 312 TFLOPS FP16 tensor (624 with 2:4 sparsity), TF32 156/312. MIG: up to 7 instances.
- DGX A100 (tour text only): 8 A100, 6 NVSwitch, 2× AMD EPYC 7742, 9 ConnectX-6 (8 compute + 1 storage), PCIe Gen4 switches.

## Buses
`nvlink` is renamed "NVLink 3", `hbm` "HBM2e", `pcie` "PCIe Gen4" in `index.js`.

## Known approximations
All mm dimensions except the die area are estimates scaled from photos. The exact HGX connector types are simplified to
black blocks.
