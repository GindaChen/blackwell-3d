# Sources: NVIDIA Volta (V100 SXM2, DGX-1 V100)

| Topic | URL |
|---|---|
| DGX-1 V100 architecture: hybrid cube-mesh (cube edges + 2 face diagonals, 3 rings), 6 NVLink 2 links x 50 GB/s per GPU, PCIe switches to CPUs and NICs (fig. 4), 4x EDR IB, 2x E5-2698 v4, 512 GB, 3U, 3.5 kW TDP, 4x 1,600 W PSUs, V100 80 SMs / 900 GB/s / 16 GB | https://images.nvidia.com/content/pdf/dgx1-v100-system-architecture-whitepaper.pdf |
| Original DGX-1 (P100) architecture, same cube-mesh concept | https://images.nvidia.com/content/pdf/dgx1-system-architecture-whitepaper1.pdf |
| Volta architecture: GV100 815 mm2, 21.1B transistors, TSMC 12FFN, 6 GPCs / 84 SMs, V100 80 SMs, 640 Tensor Cores, NVLink 2, HBM2 900 GB/s, 300 W SXM2 | https://www.ece.lsu.edu/gp/refs/volta-architecture-whitepaper.pdf |
| SXM form factor: SXM2 module about 8 x 14 cm, mezzanine connectors, P100 = first SXM, V100 = SXM2 | https://en.wikipedia.org/wiki/SXM_(socket) |
| DGX-1 V100 infographic (component list) | https://www.nvidia.com/content/dam/en-zz/Solutions/Data-Center/dgx-1/dgx-1-infographic-volta-437971-v07-lr.pdf |
| HGX-1 / Big Basin: 8 SXM2 GPUs, four PCIe switches, NVLink mesh | https://top500.org/news/microsoft-facebook-build-dualing-open-standard-gpu-servers-for-cloud/ |
| SXM2-era baseboards: NVLink between GPUs, PCIe switches on the baseboard | https://www.servethehome.com/ingrasys-shows-big-nvidia-nvlink-switch-chips-change-to-the-hgx-b200-b100/ |
| HBM2 KGSD footprint (7.75 x 11.87 mm), JEDEC JESD235 family | https://en.wikipedia.org/wiki/High_Bandwidth_Memory |

Per-pair link counts (NV1/NV2) follow the widely published DGX-1V `nvidia-smi topo -m` matrix; they are
consistent with the whitepaper's description (6 links per GPU, 12 cube edges + 4 face diagonals, three
link-disjoint rings over all 24 links), checked in `topology.js`.

Estimates (no CAD or mechanical drawing found): die aspect ratios, interposer/substrate sizes, the
package position and VRM layout on the module, mezzanine connector size and position, all DGX-1 tray and
baseboard dimensions, switch/connector/fan positions, heatsink size.
