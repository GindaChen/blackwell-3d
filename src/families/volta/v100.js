// Tesla V100 SXM2: GV100 on CoWoS with 4 HBM2 stacks, on the SXM2 mezzanine module (see sxm.js for the
// module geometry and coordinates). Sources: SOURCES.md.
//   Sourced: GV100 815 mm2, 21.1B transistors, TSMC 12FFN, 84 SMs in 6 GPCs (80 enabled on V100),
//            5,120 CUDA cores, 640 Tensor Cores, 16 or 32 GB HBM2 at 900 GB/s, 6 NVLink 2 links
//            (50 GB/s bidirectional each, 300 GB/s total), 300 W, PCIe Gen3 x16.
//   Estimate: die aspect ratio (32 x 25.5 mm = 816 mm2), interposer 35 x 45 mm, substrate 55 x 62 mm.
import { buildSxmModule, dieLooks } from './sxm.js';
import { gv100Marked, gv100Floorplan } from './textures.js';

export const gv100Looks = () => dieLooks('gv100', gv100Marked, gv100Floorplan);

export const V100_SPEC = {
  id: 'v100',
  seed: 100,
  pkg: { subW: 55, subD: 62, ipW: 35, ipD: 45, dieW: 32, dieD: 25.5 },
  looksKey: 'volta-gv100',
  dieLooks: gv100Looks,
  dieLabel: 'GV100 die',
  dieInfo: '815 mm² on TSMC 12FFN with 21.1 billion transistors, close to the largest die a lithography reticle can print. Six GPCs hold 84 SMs; V100 enables 80 of them (5,120 CUDA cores). Volta added Tensor Cores: 8 per SM, 640 in total, for 125 TFLOPS of FP16 matrix math. Turn on the floorplan toggle to see the layout (stylised).',
  hbmLine: '4-HI 4GB',
  hbmInfo: 'One HBM2 stack: DRAM dies stacked on a base die, 1,024 data wires wide. Four stacks give 16 GB (4-high) or 32 GB (8-high) at 900 GB/s.',
  interposerInfo: 'TSMC CoWoS passive silicon interposer. It carries the 4,096 data wires between the GPU and the four HBM2 stacks, far more than an organic substrate could route.',
  gpuId: 'v100-gpu',
  gpuLabel: 'Tesla V100 GPU package',
  gpuInfo: 'GV100 die and 4 HBM2 stacks on a CoWoS interposer, on an organic substrate. 16 or 32 GB at 900 GB/s, six NVLink 2 links (300 GB/s), PCIe Gen3 x16, 300 W. 7.8 TFLOPS FP64, 15.7 FP32, 125 FP16 Tensor.',
  powerInfo: 'Power stages of the multiphase regulator that feeds the GPU core, up to 300 W at about 1 V.',
  moduleLabel: 'Tesla V100 SXM2 module',
  moduleInfo: 'The SXM2 mezzanine module, about 140 × 78 mm. It has no PCIe edge connector: two mezzanine connectors underneath plug straight into the server\'s GPU baseboard, which carries power, PCIe and all NVLink wiring.',
  nvlinkInfo: 'Carries the GPU\'s six NVLink 2 links (25 GB/s each way per link) down into the baseboard. The NVLink / power split between the two connectors is as commonly described, not from an NVIDIA drawing.',
  pcieInfo: 'Brings in 12 V power (up to 300 W) and the PCIe Gen3 x16 link to the host. Connector size and position are estimates.',
  silk: ['NVIDIA', 'TESLA V100-SXM2-16GB', 'GV100  SXM2  300W'],
};

export const buildV100 = () => buildSxmModule(V100_SPEC);
