# Sources

The model is procedural. No meshes or photos ship with it. Dimensions are estimates scaled from
public material, and the facts quoted in hover cards and tours come from these sources:

| Topic | Source |
|---|---|
| GB200 NVL72 rack specs (72 GPU / 36 CPU, 13.4 TB HBM3e at 576 TB/s, 130 TB/s NVLink, 1,440 PF FP4) | [NVIDIA GB200 NVL72](https://www.nvidia.com/en-us/data-center/gb200-nvl72/) |
| Compute tray / Bianca board architecture (18 × 1U trays, 2 Bianca boards each, CX-7, BF-3, cold plates, fans, cables) | [SemiAnalysis: GB200 hardware architecture](https://newsletter.semianalysis.com/p/gb200-hardware-architecture-and-component) |
| HGX B200 baseboard: two NVLink switch chips moved to the centre | [ServeTheHome: NVLink Switch chips change to the HGX B200](https://www.servethehome.com/?p=78639), [New shots of the HGX B200](https://servethehome.com/new-shots-of-the-nvidia-hgx-b200-astera-labs) |
| HGX B200 NVLink topology (2 switches, 9 links per GPU per switch) | [NVIDIA Fabric Manager user guide](https://docs.nvidia.com/datacenter/tesla/fabric-manager-user-guide) |

Approximations are labelled as such in the info text, for example the power-shelf count, the U layout of the
rack and the board dimensions.


## Apple silicon (2026-10-03)

All Apple dimensions are estimates. Apple publishes no package or board drawings, and TechInsights' measurements are behind a paywall.

| Topic | Source |
|---|---|
| M5 Ultra / Mac Studio 2026 specs (36-core CPU, 80-core GPU, 1.2 TB/s, 512 GB, up to 6× TB5, 4-node cluster with RDMA) | https://www.apple.com/newsroom/2026/08/apple-introduces-new-mac-studio-with-m5-max-and-m5-ultra/ |
| M5 Pro / M5 Max (Fusion Architecture, super cores) | https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/ |
| M5 Pro package: SoIC-X hybrid bonding onto a silicon interposer | https://www.techinsights.com/blog/apple-m5-pro-package-analysis-TSMC-hybrid-bonding |
| M5 Pro GPU tile: memory controllers and SLC on the GPU die | https://www.techinsights.com/blog/what-die-level-analysis-reveals-about-apples-m5-pro-gpu-design |
| M5 Pro tile sizes (CPU 9.28 × 17.98 mm, GPU 8.20 × 19.57 mm) | https://x.com/ExoticSpice101/status/2061945306812711226 |
| M5 Max GPU tile about 2× the Pro's | https://creativestrategies.com/research/m5-max-chiplets-thermals-and-performance-per-watt/ |
| M1 Ultra package 65 × 72 mm, UltraFusion silicon bridge | https://www.techinsights.com/blog/apple-joins-3d-fabric-portfolio-m1-ultra |
| No M4 Ultra | https://appleinsider.com/articles/25/03/05/apple-says-not-every-apple-silicon-generation-will-get-an-ultra |
| Mac Studio parts / exploded view (bus bar, fan, PSU, logic board) | https://support.apple.com/en-ae/122125 |
| Mac Studio SSD modules (2 slots, NAND only) | https://support.apple.com/en-gu/121989 |
| Mac Studio 2025 teardown (copper vs aluminium heatsink, TB5 retimers) | https://eetimes.itmedia.co.jp/ee/articles/2505/27/news026.html |
| Mac Studio dimensions, 480 W PSU | https://www.apple.com/mac-studio/specs/ |
| 4× Mac Studio RDMA cluster: full mesh, latency, Qwen3-235B 19.5 → 31.9 tok/s | https://jeffgeerling.com/blog/2025/15-tb-vram-on-mac-studio-rdma-over-thunderbolt-5 |
| JACCL mesh / ring collectives over Thunderbolt | https://developer.apple.com/videos/play/wwdc2026/233/ |
