# Ampere sources

All millimetre dimensions except the GA100 die area are estimates scaled from photos (see
docs/2026-10-03-ampere-design.md). Facts in hover cards and tours come from:

| Topic | URL |
|---|---|
| GA100: 826 mm², 54.2B transistors, TSMC N7, 8 GPCs / 128 SMs, 6 HBM2 stacks and 12 controllers; A100: 108 SMs, 5 stacks, 5120-bit, 1,555 GB/s, 40 MB L2, 12 NVLink 3 links / 600 GB/s, MIG up to 7, 2:4 sparsity, 312/624 TFLOPS FP16, 400 W, PCIe Gen4 | https://developer.nvidia.com/blog/nvidia-ampere-architecture-in-depth/ |
| Ampere whitepaper (split L2, NVLink 3, MIG, block diagram used for the floorplan) | https://images.nvidia.com/aem-dam/en-zz/Solutions/data-center/nvidia-ampere-architecture-whitepaper.pdf |
| A100 80GB HBM2e, 2,039 GB/s, SXM4 400 W | https://www.nvidia.com/content/dam/en-zz/Solutions/Data-Center/a100/pdf/nvidia-a100-datasheet-us-nvidia-1758950-r4-web.pdf |
| HGX A100 8-GPU: 8 GPUs + 6 NVSwitches, 12 NVLink ports per GPU, 600 GB/s any-to-any, two boards back-to-back for 16 GPUs | https://developer.nvidia.com/blog/introducing-hgx-a100-most-powerful-accelerated-server-platform-for-ai-hpc |
| HGX A100 physical layout: NVSwitch array on the other side of the GPUs, PCIe and power connectors at one end, larger NVSwitch heat-pipe coolers, clear airflow guides | https://servethehome.com/inspur-nf5488a5-8x-nvidia-a100-hgx-platform-review-amd-epyc/2 |
| HGX A100 "Delta" baseboard, NVIDIA pre-integrates the cooling | https://www.servethehome.com/nvidia-dgx-versus-nvidia-hgx-what-is-the-difference/ |
| NVSwitch / NVLink topology (6 switches, 2 links per GPU per switch) | https://docs.nvidia.com/datacenter/tesla/fabric-manager-user-guide |
| DGX A100: 8 A100, 6 NVSwitch, 2× AMD EPYC 7742, ConnectX-6 (8 compute + storage), PCIe Gen4 switches | https://docs.nvidia.com/dgx/dgxa100-user-guide/introduction-to-dgxa100.html |
| A100 SXM4 module part number 699-2G506-0210 (used for the silkscreen) | https://networkoutlet.com/products/nvidia-tesla-a100-80-gb-sxm4-gpu-699-2g506-0210-300-used-tested |
