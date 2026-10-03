// NVIDIA Pascal: the Tesla P100 SXM module. See docs/2026-10-03-pascal-design.md.
// The module builder, textures and connection factory are shared with ../volta/.
import { buildP100, gp100Looks } from './p100.js';
import { sxmConnections } from '../volta/connections.js';
import { P100_STEPS } from './tours.js';

const MM = 0.1;

export default {
  views: {
    p100: {
      build: () => buildP100(),
      offset: [0, 8, 0], // mezzanine connectors (bottom at y = -8) rest on the floor
      scale: MM * 2,
      cams: {
        hero: { pos: [25, 29, 39], target: [0, 0.5, 1] },
        top: { pos: [0, 38, 0.01], target: [0, 0, 0] },
        front: { pos: [0, 7, 32], target: [0, 1, 0] },
        close: { pos: [5, 7, 5], target: [0, 1.5, -1.2] },
      },
      stage: { shadow: 22, floor: -0.02 },
      toggles: ['floorplan'],
      tour: P100_STEPS,
    },
  },
  connections: sxmConnections('p100', {
    gpu: 'Tesla P100 (GP100)',
    mem: '732 GB/s',
    nvlink: '160 GB/s',
    links: '4× NVLink 1',
    gpuRole: 'Pascal GPU for HPC and deep learning: the first with NVLink and HBM2.',
    dieRole: 'GP100 compute die: 6 GPCs, 56 of 60 SMs enabled.',
  }),
  buses: {
    nvlink: { name: 'NVLink 1', color: '#38d5ff' },
    hbm: { name: 'HBM2', color: '#ffb547' },
    pcie: { name: 'PCIe Gen3', color: '#b88cff' },
  },
  looks: { 'pascal-gp100': gp100Looks },
};
