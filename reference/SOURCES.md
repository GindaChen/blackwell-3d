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
