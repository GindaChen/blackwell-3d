// NVIDIA Kepler: the Tesla K80 dual-GPU PCIe card. See docs/2026-10-03-kepler-design.md.
// card.js (the PCIe card builder), silicon.js and connections.js are shared with ../maxwell/.
import { buildK80 } from './k80.js';
import { gk210Looks } from './silicon.js';
import { CONNECTIONS, BUSES } from './connections.js';
import { K80_STEPS } from './tours.js';
import { CARD } from './card.js';

const MM = 0.1;

export default {
  views: {
    k80: {
      build: () => buildK80(),
      offset: [0, -CARD.H / 2, 0],
      scale: MM,
      cams: {
        hero: { pos: [23, 11, 35], target: [0, 0.2, 0.5] },
        top: { pos: [0, 34, 6], target: [0, 0, 0] },
        front: { pos: [0, 1, 34], target: [0, 0, 0] },
        close: { pos: [-14, 4, -16], target: [-4, 0, 0] },
      },
      stage: { shadow: 24, floor: -(CARD.H / 2) * MM - 0.05 },
      toggles: ['cooling', 'shell', 'floorplan'],
      tour: K80_STEPS,
    },
  },
  connections: CONNECTIONS,
  buses: BUSES,
  looks: { 'kepler-gk210': gk210Looks },
};
