// NVIDIA Volta: the Tesla V100 SXM2 module and the DGX-1 (V100) 8-GPU board. See
// docs/2026-10-03-volta-design.md. The SXM module builder (sxm.js) is shared with the pascal family.
import { buildV100, gv100Looks } from './v100.js';
import { buildDGX1 } from './dgx1.js';
import { sxmConnections, dgxConnections } from './connections.js';
import { V100_STEPS, DGX1_STEPS } from './tours.js';

const MM = 0.1;

export const VOLTA_BUSES = {
  nvlink: { name: 'NVLink 2', color: '#38d5ff' },
  hbm: { name: 'HBM2', color: '#ffb547' },
  pcie: { name: 'PCIe Gen3', color: '#b88cff' },
  net: { name: 'InfiniBand', color: '#ff7ad9' },
};

export default {
  views: {
    v100: {
      build: () => buildV100(),
      offset: [0, 8, 0], // mezzanine connectors (bottom at y = -8) rest on the floor
      scale: MM * 2,     // the 14 cm module, shown twice as large
      cams: {
        hero: { pos: [25, 29, 39], target: [0, 0.5, 1] },
        top: { pos: [0, 38, 0.01], target: [0, 0, 0] },
        front: { pos: [0, 7, 32], target: [0, 1, 0] },
        close: { pos: [5, 7, 5], target: [0, 1.5, -1.2] },
      },
      stage: { shadow: 22, floor: -0.02 },
      toggles: ['floorplan'],
      tour: V100_STEPS,
    },
    dgx1: {
      build: (ctx) => buildDGX1(ctx.model('v100')),
      cams: {
        hero: { pos: [-50, 68, 66], target: [0, 1, -3] },
        top: { pos: [0, 92, 0.01], target: [0, 0, -2] },
        front: { pos: [8, 16, 72], target: [0, 4, 6] },
        close: { pos: [-12, 20, 8], target: [-5, 2, -8] },
      },
      stage: { shadow: 40, floor: -0.02 },
      toggles: ['cooling', 'floorplan'],
      tour: DGX1_STEPS,
    },
  },
  connections: { ...sxmConnections('v100', {
    gpu: 'Tesla V100 (GV100)',
    mem: '900 GB/s',
    nvlink: '300 GB/s',
    links: '6× NVLink 2',
    gpuRole: 'Volta GPU: the first with Tensor Cores, built for deep-learning training and HPC.',
    dieRole: 'GV100 compute die: 6 GPCs, 80 of 84 SMs enabled, 640 Tensor Cores.',
  }), ...dgxConnections() },
  buses: VOLTA_BUSES,
  looks: { 'volta-gv100': gv100Looks },
};
