// NVIDIA Blackwell: GB200 superchip, NVL72 compute + switch trays, the NVL72 rack, HGX B200.
// The parts live in the shared src/assemblies + src/parts folders (this family was the first port).
import { buildSuperchip } from '../../assemblies/superchip.js';
import { buildComputeTray } from '../../assemblies/tray.js';
import { buildSwitchTray } from '../../assemblies/switchTray.js';
import { buildHGXB200 } from '../../assemblies/hgx.js';
import { buildRack, RACK_H } from '../../assemblies/rack.js';
import { graceDieMaterials } from '../../parts/chips.js';
import { SUPERCHIP_STEPS } from '../../tour/tours/superchip.js';
import { TRAY_STEPS } from '../../tour/tours/tray.js';
import { SWITCH_STEPS } from '../../tour/tours/switch.js';
import { RACK_STEPS } from '../../tour/tours/rack.js';
import { HGX_STEPS } from '../../tour/tours/hgx.js';

const MM = 0.1;

export default {
  views: {
    superchip: {
      build: () => buildSuperchip(),
      offset: [0, 4, 0],
      cams: {
        hero: { pos: [27, 33, 40], target: [0, 0, 1.5] },
        top: { pos: [0, 62, 0.01], target: [0, 0, 0] },
        front: { pos: [0, 14, 52], target: [0, 0, 2] },
        close: { pos: [9, 9, -2], target: [3, 0, -9] },
      },
      stage: { shadow: 30 },
      toggles: ['lids', 'floorplan'],
      tour: SUPERCHIP_STEPS,
    },
    tray: {
      build: () => buildComputeTray(buildSuperchip),
      cams: {
        hero: { pos: [62, 58, 88], target: [0, 0, 4] },
        top: { pos: [0, 125, 0.01], target: [0, 0, 0] },
        front: { pos: [-12, 16, 92], target: [0, 2, 20] },
        close: { pos: [18, 20, -12], target: [10, 2, -26] },
      },
      toggles: ['lids', 'floorplan', 'cooling'],
      tour: TRAY_STEPS,
    },
    switch: {
      build: () => buildSwitchTray(),
      cams: {
        hero: { pos: [-62, 58, 88], target: [0, 0, 0] },
        top: { pos: [0, 125, 0.01], target: [0, 0, 0] },
        front: { pos: [12, 16, 92], target: [0, 2, 20] },
        close: { pos: [-20, 22, 2], target: [-10, 1, -7] },
      },
      toggles: ['cooling'],
      tour: SWITCH_STEPS,
    },
    rack: {
      build: (ctx) => buildRack({ computeTray: ctx.model('tray'), switchTray: ctx.model('switch') }),
      offset: [0, -RACK_H / 2, 0],
      cams: {
        hero: { pos: [260, 110, 420], target: [0, 0, 20] },
        top: { pos: [0, 420, 0.01], target: [0, 0, 0] },
        front: { pos: [0, 10, 400], target: [0, 0, 0] },
        close: { pos: [-150, 40, -190], target: [0, 0, -40] },
      },
      // the 2.2 m rack needs the key light, shadow camera and floor pushed out
      stage: { shadow: 135, far: 900, key: 3.4, floor: -(RACK_H / 2) * MM - 0.5 },
      toggles: ['lids', 'floorplan', 'cooling'],
      tour: RACK_STEPS,
    },
    hgx: {
      build: () => buildHGXB200(),
      cams: {
        hero: { pos: [-62, 70, 92], target: [0, 3, 2] },
        top: { pos: [0, 130, 0.01], target: [0, 0, 0] },
        front: { pos: [10, 20, 95], target: [0, 4, 20] },
        close: { pos: [-14, 26, 14], target: [-6, 6, 0] },
      },
      toggles: ['lids', 'cooling'],
      tour: HGX_STEPS,
    },
  },
  // connections: the global table in src/annotations/connections.js
  looks: { grace: graceDieMaterials },
};
