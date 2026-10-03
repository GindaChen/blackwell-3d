// Tesla P100 SXM: GP100 on CoWoS with 4 HBM2 stacks, the first SXM module and the first NVLink GPU.
// Same mezzanine form factor as V100 SXM2, built with the shared module builder in ../volta/sxm.js.
// Sources: SOURCES.md.
//   Sourced: GP100 610 mm2, 15.3B transistors, TSMC 16FF+, 60 SMs in 6 GPCs (56 enabled on P100),
//            3,584 CUDA cores, 16 GB HBM2 (4 stacks of 4-high 4 GB) at 732 GB/s, 4 NVLink 1 links
//            (40 GB/s bidirectional each, 160 GB/s total), 300 W, PCIe Gen3 x16.
//   Estimate: die aspect ratio (25 x 24.4 mm = 610 mm2), interposer 27.5 x 44 mm, substrate 50 x 58 mm.
import { buildSxmModule, dieLooks } from '../volta/sxm.js';
import { gp100Marked, gp100Floorplan } from '../volta/textures.js';

export const gp100Looks = () => dieLooks('gp100', gp100Marked, gp100Floorplan);

export const P100_SPEC = {
  id: 'p100',
  seed: 60,
  pkg: { subW: 50, subD: 58, ipW: 27.5, ipD: 44, dieW: 25, dieD: 24.4 },
  looksKey: 'pascal-gp100',
  dieLooks: gp100Looks,
  dieLabel: 'GP100 die',
  dieInfo: '610 mm² on TSMC 16FF+ with 15.3 billion transistors, the largest FinFET chip of 2016. Six GPCs hold 60 SMs; P100 enables 56 (3,584 CUDA cores). Half-precision runs at twice the FP32 rate: 21.2 TFLOPS FP16, 10.6 FP32, 5.3 FP64. Turn on the floorplan toggle to see the layout (stylised).',
  hbmLine: '4-HI 4GB',
  hbmInfo: 'One 4-high HBM2 stack, 4 GB. P100 was the first GPU with HBM2: four stacks give 16 GB at 732 GB/s over a 4,096-bit bus.',
  interposerInfo: 'TSMC CoWoS passive silicon interposer, the first in an NVIDIA product. It carries the 4,096 data wires between the GPU and the four HBM2 stacks.',
  gpuId: 'p100-gpu',
  gpuLabel: 'Tesla P100 GPU package',
  gpuInfo: 'GP100 die and 4 HBM2 stacks on a CoWoS interposer. 16 GB at 732 GB/s, four NVLink 1 links (160 GB/s), PCIe Gen3 x16, 300 W.',
  powerInfo: 'Power stages of the multiphase regulator that feeds the GPU core, up to 300 W at about 1 V.',
  moduleLabel: 'Tesla P100 SXM module',
  moduleInfo: 'The first SXM module (2016), about 140 × 78 mm, the same mezzanine form factor V100 SXM2 kept. No PCIe edge connector: two mezzanine connectors underneath plug into a baseboard such as the original DGX-1 or IBM\'s POWER8 "Minsky" server.',
  nvlinkInfo: 'Carries the GPU\'s four NVLink 1 links (20 GB/s each way per link) into the baseboard. The NVLink / power split between the two connectors is as commonly described, not from an NVIDIA drawing.',
  pcieInfo: 'Brings in 12 V power (up to 300 W) and the PCIe Gen3 x16 link to the host. Connector size and position are estimates.',
  silk: ['NVIDIA', 'TESLA P100-SXM2-16GB', 'GP100  SXM  300W'],
};

export const buildP100 = () => buildSxmModule(P100_SPEC);
