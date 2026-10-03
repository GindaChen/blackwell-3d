# Sources: NVIDIA Hopper family

The models are procedural. NVIDIA publishes no mechanical drawings of SXM5, the HGX H100 baseboard or the
GH200 module, so board, package, interposer and HBM footprints, VRM layouts, connector positions and heatsink
heights are estimates scaled from photos. They are marked as estimates in the code and in
`docs/2026-10-03-hopper-design.md`.

| Topic | URL |
|---|---|
| GH100: 814 mm², 80B transistors, TSMC 4N; full die 8 GPCs / 72 TPCs / 144 SMs, 60 MB L2, 6 HBM stacks; H100 SXM5 132 SMs, 50 MB L2, 80 GB HBM3 on 5 stacks, 700 W; 18 NVLink 4 links, 900 GB/s; PCIe Gen5; block diagram (GPC / L2 / memory controller layout) | https://developer.nvidia.com/blog/nvidia-hopper-architecture-in-depth/ |
| H100 SXM5 module press photos (VRM-dominated board, mezzanine connectors underneath) | https://www.tomshardware.com/news/nvidia-hopper-h100-sxm5-pictured |
| H100 SXM5 photos (alternate) | https://hothardware.com/news/h100-hopper-gpu-gets-pictured |
| H100 SXM5 specs (3.35 TB/s, 5,120-bit, 700 W) | https://www.techpowerup.com/gpu-specs/h100-sxm5.c3900 |
| SXM5 socket: H100/H200, 700 W from the socket, 18 NVLink 4 channels | https://en.wikipedia.org/wiki/SXM_(socket) |
| H200: 141 GB HBM3e at 4.8 TB/s, Hopper | https://www.nvidia.com/en-us/data-center/h200/ |
| HGX H100 8-GPU: 4 third-gen NVSwitches, each GPU connects to all four, 900 GB/s per GPU, 3.6 TB/s bisection, 8x PCIe Gen5 x16 to the host | https://developer.nvidia.com/blog/introducing-nvidia-hgx-h100-an-accelerated-server-platform-for-ai-and-high-performance-computing |
| HGX H100 link split: 4 links to two NVSwitches and 5 to the other two | https://docs.nvidia.com/datacenter/tesla/fabric-manager-user-guide |
| Third-gen NVSwitch: TSMC 4N, 25.1B transistors, 294 mm², 50 x 50 mm package, 64 NVLink 4 ports, SHARP | https://developer.nvidia.com/blog/upgrading-multi-gpu-interconnectivity-with-the-third-generation-nvidia-nvswitch/ |
| HGX H100 layout: four NVLink switches at one end of the board (vs. two in the middle on HGX B200) | https://www.servethehome.com/ingrasys-shows-big-nvidia-nvlink-switch-chips-change-to-the-hgx-b200-b100/ |
| HGX H100 heatsinks grew taller than A100's; Broadcom PCIe switches on the host side | https://www.servethehome.com/nvidia-dgx-versus-nvidia-hgx-what-is-the-difference/ |
| GH200 module photos (OCP 2023): GPU on one half, Grace flanked by LPDDR5X on the other, more LPDDR5X on the back, proprietary connectors underneath | https://www.servethehome.com/nvidia-grace-hopper-gh200-and-grace-superchip-arm-pictured-and-incompatible/ |
| GH200: 480 GB LPDDR5X at up to 512 GB/s, 96 GB HBM3 at 4 TB/s or 144 GB HBM3e at 4.9 TB/s, NVLink-C2C, module TDP up to 1000 W | https://download.gigabyte.com/FileList/EBrochure/NVIDIA-Grace-Solution_v4.pdf |
