# Sources: NVIDIA Kepler (Tesla K80)

Positions on the board are estimates from press and teardown photos (no CAD). Anything not in this table is an
estimate and is labelled as such in code comments and in docs/2026-10-03-kepler-design.md.

| Topic | URL |
|---|---|
| K80 board spec: 267 x 111.15 mm full-height dual-slot; 2x GK210B; 2496 cores per GPU; 560 MHz base, 562-875 MHz boost; 45 x 45 mm 2397-pin FCBGA package; 48 x 256M x 16 GDDR5; 2.5 GHz memory clock; 384-bit; 240 GB/s per GPU; 300 W, 150 W cap per GPU; one EPS-12V 8-pin on the "east" edge (2x PCIe 8-pin adapter); on-board PLX switch; passive heatsink; vented bracket; 2 Mbit BIOS ROM; SKU 699-22080-0200 | https://nvidia.com/content/dam/en-zz/Solutions/Data-Center/tesla-product-literature/Tesla-K80-BoardSpec-07317-001-v05.pdf |
| GK210 = GK110B with 2x register file (512 KB/SMX) and 2x shared memory/L1; 13 SMX enabled on K80; launch Nov 2014 | https://www.anandtech.com/show/8729/nvidia-launches-tesla-k80-gk210-gpu |
| K80 launch coverage (GK210, 28 nm) | https://www.tomshardware.com/news/nvidia-gk210-tesla-k80,28086.html |
| K80 retail part number 900-22080-0000-000; up to 2.91 TFLOPS FP64 | https://www.neweggbusiness.com/nvidia-tesla-k80-900-22080-0000-000-2-x-kepler-gk210-24gb-graphics-card/p/9B-14-132-041 |
| PLX PCIe bridge in the middle of dual-GPU Kepler boards (PEX8747 on GTX Titan Z, same arrangement) | https://www.guru3d.com/review/nvidia-geforce-gtx-titan-z-review/page-4/ |
| GK210 die size 561 mm² and 7.1 B transistors (database figure, same as GK110; NVIDIA did not publish it; page returned 403 to our fetcher, so treat as unverified) | https://www.techpowerup.com/gpu-specs/tesla-k80.c2616 |
