// NVIDIA RTX (Blackwell desktop): GeForce RTX 5090 Founders Edition and RTX PRO 6000 Blackwell
// Workstation Edition. Both are built by card.js; the PRO variant swaps the memory (clamshell),
// finish, outputs and die look.
import { buildCard } from './card.js';
import { gb202Looks } from './gb202.js';
import { RTX5090_STEPS, PRO6000_STEPS } from './tours.js';
import { RTX_CONNECTIONS, RTX_BUSES } from './connections.js';

const MM = 0.1;
const cams = {
  hero: { pos: [25, 29, 33], target: [0, 1.2, 0.5] },
  top: { pos: [0, 40, 0.01], target: [0, 0, 0] },
  front: { pos: [0, 6, 36], target: [0, 1.5, 0] },
  close: { pos: [9, 12, 10], target: [0, 1, 0] },
};
const stage = { shadow: 26, floor: -0.02 };

export default {
  views: {
    rtx5090: {
      build: () => buildCard({ pro: false }),
      scale: MM,
      cams,
      stage,
      toggles: ['cooling', 'shell', 'floorplan'],
      tour: RTX5090_STEPS,
    },
    rtxpro6000: {
      build: () => buildCard({ pro: true }),
      scale: MM,
      cams,
      stage,
      toggles: ['cooling', 'shell', 'floorplan'],
      tour: PRO6000_STEPS,
    },
  },
  connections: RTX_CONNECTIONS,
  buses: RTX_BUSES,
  looks: { 'rtx-gb202-5090': () => gb202Looks('5090'), 'rtx-gb202-pro': () => gb202Looks('pro') },
};
