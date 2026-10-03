// NVIDIA Ampere: the A100 SXM4 module and the HGX A100 8-GPU baseboard. See docs/2026-10-03-ampere-design.md.
import { buildA100, ga100Looks } from './a100.js';
import { buildHGXA100 } from './hgx.js';
import { AMPERE_CONNECTIONS } from './connections.js';
import { A100_STEPS, HGX_A100_STEPS } from './tours.js';

const MM = 0.1;

export default {
  views: {
    a100: {
      build: () => buildA100(),
      offset: [0, 15, 0],  // float the module 15 mm above the floor so the mezzanine connectors show
      scale: MM * 3,       // the module is 10 x 15 cm: show it three times larger
      cams: {
        hero: { pos: [32, 40, 56], target: [1, 1, 4] },
        top: { pos: [0, 82, 0.01], target: [0, 0, 0] },
        front: { pos: [0, 14, 74], target: [0, 4, 0] },
        close: { pos: [9, 14, 9], target: [0, 5, 0] },
      },
      stage: { shadow: 32, floor: -0.02 },
      toggles: ['lids', 'floorplan'],
      tour: A100_STEPS,
    },
    'hgx-a100': {
      build: (ctx) => buildHGXA100(() => ctx.model('a100')),
      cams: {
        hero: { pos: [-58, 72, -84], target: [0, 2, -2] },
        top: { pos: [0, 120, 0.01], target: [0, 0, 0] },
        front: { pos: [10, 20, 92], target: [0, 4, 15] },
        close: { pos: [-14, 24, 12], target: [-6, 5, -2] },
      },
      toggles: ['lids', 'floorplan', 'cooling'],
      tour: HGX_A100_STEPS,
    },
  },
  connections: AMPERE_CONNECTIONS,
  buses: {
    nvlink: { name: 'NVLink 3', color: '#38d5ff' },
    hbm: { name: 'HBM2e', color: '#ffb547' },
    pcie: { name: 'PCIe Gen4', color: '#b88cff' },
  },
  looks: { 'ampere-ga100': ga100Looks },
};
