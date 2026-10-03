// NVIDIA Hopper: the H100 / H200 SXM5 module and the HGX H100 / H200 8-GPU baseboard.
// See docs/2026-10-03-hopper-design.md and SOURCES.md.
import { buildSXM5, gh100Looks } from './sxm5.js';
import { buildHGXH100 } from './hgx.js';
import { buildGH200 } from './gh200.js';
import { H100_STEPS, HGX_H100_STEPS, GH200_STEPS } from './tours.js';
import { CONNECTIONS, BUSES } from './connections.js';

export default {
  views: {
    h100: {
      build: () => buildSXM5({ variant: 'h100' }),
      scale: 0.2, // the module is 15 cm long: show it twice the default scale
      cams: {
        hero: { pos: [25, 29, 36], target: [0, 0, 0.5] },
        top: { pos: [0, 44, 0.01], target: [0, 0, 0] },
        front: { pos: [0, 10, 36], target: [0, 0, 1] },
        close: { pos: [6, 8, 7], target: [0, 1, 0] },
      },
      stage: { shadow: 24, floor: -0.1 },
      toggles: ['lids', 'floorplan'],
      tour: H100_STEPS,
    },
    'hgx-h100': {
      build: (ctx) => buildHGXH100({ module: ctx.model('h100') }),
      cams: {
        hero: { pos: [-56, 60, 78], target: [0, 2, 2] },
        top: { pos: [0, 95, 0.01], target: [0, 0, 0] },
        front: { pos: [8, 16, 70], target: [0, 4, 10] },
        close: { pos: [-12, 22, 12], target: [-6, 4, 2] },
      },
      stage: { shadow: 40, floor: -0.05 },
      toggles: ['lids', 'cooling', 'floorplan'],
      tour: HGX_H100_STEPS,
    },
    gh200: {
      build: () => buildGH200(),
      scale: 0.15,
      cams: {
        hero: { pos: [30, 35, 44], target: [0, 0, 1] },
        top: { pos: [0, 50, 0.01], target: [0, 0, 0] },
        front: { pos: [0, 10, 40], target: [0, 0, 1] },
        close: { pos: [7, 9, 0], target: [0, 1, -8] },
      },
      stage: { shadow: 28, floor: -0.1 },
      toggles: ['lids', 'floorplan'],
      tour: GH200_STEPS,
    },
  },
  connections: CONNECTIONS,
  buses: BUSES,
  looks: { 'hopper-gh100': gh100Looks },
};
