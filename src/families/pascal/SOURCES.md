# Sources: NVIDIA Pascal (Tesla P100 SXM)

| Topic | URL |
|---|---|
| Hot Chips 28 Pascal talk: GP100 610 mm2, 15.3B transistors, 16FF+, CoWoS + HBM2, NVLink | https://old.hotchips.org/wp-content/uploads/hc_archives/hc28/HC28.22-Monday-Epub/HC28.22.10-GPU-HPC-Epub/HC28.22.121-Pascal-GPU-DanskinFoley-NVIDIA-v06-6_7.pdf |
| P100 launch (GTC 2016): 16 GB HBM2 at 732 GB/s, 4 NVLink x 40 GB/s = 160 GB/s, 300 W, 56 of 60 SMs | https://www.hpcwire.com/2016/04/05/nvidia-monster-pascal-gpu-card-gtc16/ |
| Inside Pascal (NVIDIA blog): 6 GPCs, 60 SMs, 3,584 CUDA cores, FP16 2x rate, 5.3/10.6/21.2 TFLOPS | https://developer.nvidia.com/blog/?p=6535 |
| SXM form factor: P100 introduced SXM, same mezzanine footprint kept by V100 SXM2 (about 8 x 14 cm) | https://en.wikipedia.org/wiki/SXM_(socket) |
| P100 SXM2 module product listing (16 GB, 300 W) | https://www.itcreations.com/nvidia-gpu/nvidia-tesla-p100-sxm2-gpu |
| Original DGX-1 (8x P100, hybrid cube-mesh NVLink 1) | https://images.nvidia.com/content/pdf/dgx1-system-architecture-whitepaper1.pdf |

The module geometry is the shared builder in `../volta/sxm.js`; its estimates are listed in
`../volta/SOURCES.md`. P100-specific estimates: die aspect ratio (25 x 24.4 mm), interposer 27.5 x 44 mm,
substrate 50 x 58 mm.
