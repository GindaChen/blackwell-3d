// NVIDIA Maxwell: the Tesla M40 PCIe card. Shares the card builder, connections and texture helpers
// with ../kepler/. See docs/2026-10-03-kepler-design.md (covers both families).
import { buildM40 } from './m40.js';
import { gm200Looks } from './silicon.js';
import { CONNECTIONS, BUSES } from '../kepler/connections.js';
import { CARD } from '../kepler/card.js';
import { M40_STEPS } from './tours.js';

const MM = 0.1;

export default {
  views: {
    m40: {
      build: () => buildM40(),
      offset: [0, -CARD.H / 2, 0],
      scale: MM,
      cams: {
        hero: { pos: [-23, 11, 35], target: [0, 0.2, 0.5] },
        top: { pos: [0, 34, 6], target: [0, 0, 0] },
        front: { pos: [0, 1, 34], target: [0, 0, 0] },
        close: { pos: [-14, 4, -16], target: [-4, 0, 0] },
      },
      stage: { shadow: 24, floor: -(CARD.H / 2) * MM - 0.05 },
      toggles: ['cooling', 'shell', 'floorplan'],
      tour: M40_STEPS,
    },
  },
  connections: CONNECTIONS,
  buses: BUSES,
  looks: { 'maxwell-gm200': gm200Looks },
};
