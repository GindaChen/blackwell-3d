# Sources: NVIDIA Vera Rubin family

This family is a restored copy of the original Vera Rubin model from
**[bddicken/nvidia](https://github.com/bddicken/nvidia)** (upstream "Vera Rubin 3D", by Ben Dicken),
taken from upstream commit `99f9dd1` in this repo's history. The geometry, textures, hover text, tours and
connection graph are upstream's work; this folder only rewires imports and makes the small fixes listed in
`docs/2026-10-03-rubin-design.md`.

Upstream's own credits: the model is procedural, built from the public photographs and renders below
(upstream `reference/sources.json`). The images are copyrighted by their owners and are not shipped.
Upstream's accuracy note applies unchanged: board and package dimensions are estimates scaled from photos
(NVIDIA has published no mechanical drawings), and passive placement, silkscreen text, front-panel ports,
management/power modules, cold-plate plumbing and the NVL8 switch/host-connector/VRM layout are plausible
stand-ins.

| Topic | URL |
|---|---|
| Upstream project (code, model, tours, connection graph) | https://github.com/bddicken/nvidia |
| Superchip, top-down, GTC DC 2025 (lidded GPUs). Primary layout reference. | https://www.techpowerup.com/342380/nvidias-vera-rubin-superchip-system-pictured-for-the-first-time |
| Superchip, top-down, high-res. | https://hothardware.com/news/nvidia-vera-rubin-ai-super-chip-on-stage-gtc |
| Superchip, alternate exposure. | https://www.tomshardware.com/pc-components/gpus/nvidias-vera-rubin-platform-in-depth-inside-nvidias-most-complex-ai-and-hpc-platform-to-date |
| Close-up: Vera CPU die marking, teal substrate, SOCAMM screw rings, VRM inductors. | https://www.tomshardware.com/pc-components/gpus/nvidias-vera-rubin-platform-in-depth-inside-nvidias-most-complex-ai-and-hpc-platform-to-date |
| NVIDIA render, angled, uncapped GPUs, labelled NVLink 6 / SOCAMM / PCIe Gen6 midplane connectors. | https://developer.nvidia.com/blog/inside-the-nvidia-rubin-platform-six-new-chips-one-ai-supercomputer/ |
| Keynote slide render of the superchip. | https://hothardware.com/news/nvidia-vera-rubin-ai-super-chip-on-stage-gtc |
| NVIDIA render of the NVL72 compute tray with callouts. Primary tray layout reference. | https://developer.nvidia.com/blog/inside-the-nvidia-rubin-platform-six-new-chips-one-ai-supercomputer/ |
| Hot Chips 2026 slide: GB200 vs Vera Rubin tray top-down (no cables, no fans). | https://www.servethehome.com/nvidia-vera-rubin-nvl72-rack-at-hot-chips-2026/ |
| GTC stage: compute tray with cold plates, superchip, CPX tray. | https://hothardware.com/news/nvidia-vera-rubin-ai-super-chip-on-stage-gtc |
| Top-down renders of the VR NVL144 and CPX compute trays. | https://www.tomshardware.com/pc-components/gpus/nvidias-vera-rubin-platform-in-depth-inside-nvidias-most-complex-ai-and-hpc-platform-to-date |
| CPX tray angled render (front panel styling). | https://hothardware.com/news/nvidia-vera-rubin-ai-super-chip-on-stage-gtc |
| Rubin GPU package: 2 compute dies, 8 HBM4, stiffener. | https://developer.nvidia.com/blog/inside-the-nvidia-rubin-platform-six-new-chips-one-ai-supercomputer/ |
| Photo of a lidded Rubin-family package. | https://www.tomshardware.com/pc-components/gpus/nvidias-vera-rubin-platform-in-depth-inside-nvidias-most-complex-ai-and-hpc-platform-to-date |
| Vera CPU package render (88-core die floorplan). | https://developer.nvidia.com/blog/inside-the-nvidia-rubin-platform-six-new-chips-one-ai-supercomputer/ |
| BlueField-4 DPU package render. | https://developer.nvidia.com/blog/inside-the-nvidia-rubin-platform-six-new-chips-one-ai-supercomputer/ |
| ConnectX-9 package render. | https://developer.nvidia.com/blog/inside-the-nvidia-rubin-platform-six-new-chips-one-ai-supercomputer/ |
| NVLink 6 switch package render. | https://developer.nvidia.com/blog/inside-the-nvidia-rubin-platform-six-new-chips-one-ai-supercomputer/ |
| NVLink switch tray render (for a future rack view). | https://developer.nvidia.com/blog/inside-the-nvidia-rubin-platform-six-new-chips-one-ai-supercomputer/ |
| NVL72 rack render (for a future rack view). | https://developer.nvidia.com/blog/inside-the-nvidia-rubin-platform-six-new-chips-one-ai-supercomputer/ |
| The six Rubin-platform chips side by side. | https://developer.nvidia.com/blog/inside-the-nvidia-rubin-platform-six-new-chips-one-ai-supercomputer/ |
| GTC 2026: HGX NVL8 Rubin GPU tray (8 cold plates, centre manifold) beside the Vera CPU tray. Primary NVL8 layout reference. | https://www.storagereview.com/news/nvidia-dgx-rubin-nvl8-supports-intel-xeon-6-as-host-cpu-option-for-x86-based-ai-inference |
| NVIDIA render of the HGX Rubin NVL8 GPU tray, angled. | https://www.nvidia.com/en-us/data-center/hgx/ |
| DGX Rubin NVL8 closed chassis. | https://wccftech.com/intel-finally-finds-a-spot-in-nvidia-rubin-systems/ |
| OEM HGX Rubin NVL8 2U server rear (coolant couplings, busbar clip). | https://aivres.com/product/kr2288/ |
