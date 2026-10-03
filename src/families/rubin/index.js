// NVIDIA Vera Rubin: the original upstream model from bddicken/nvidia (commit 99f9dd1), restored as a
// family. The files in this folder are copies of upstream's assemblies/parts/textures/tours/connections,
// with only their imports rewired; they share no state or caches with the modified shared files.
// The PCB textures come from the shared (z-mirror-fixed) src/textures/pcb.js.
// See docs/2026-10-03-rubin-design.md.
import { buildSuperchip } from './assemblies/superchip.js';
import { buildComputeTray } from './assemblies/tray.js';
import { buildNVL8Tray } from './assemblies/nvl8.js';
import { veraDieMaterials } from './parts/chips.js';
import { SUPERCHIP_STEPS } from './tours/superchip.js';
import { TRAY_STEPS } from './tours/tray.js';
import { NVL8_STEPS } from './tours/nvl8.js';
import { CONNECTIONS, BUSES } from './connections.js';

// Cameras, offsets and shadow sizes are upstream's src/main.js values, unchanged.
export default {
  views: {
    'vr-superchip': {
      build: () => buildSuperchip(),
      offset: [0, 4, 0], // upstream: sc.position.y = 4.0
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
    'vr-tray': {
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
    'vr-nvl8': {
      build: () => buildNVL8Tray(),
      cams: {
        hero: { pos: [-60, 60, 88], target: [0, 0, 2] },
        top: { pos: [0, 125, 0.01], target: [0, 0, 0] },
        front: { pos: [10, 16, 92], target: [0, 2, 20] },
        close: { pos: [-12, 22, 12], target: [-6, 2, 0] },
      },
      toggles: ['lids', 'cooling'],
      tour: NVL8_STEPS,
    },
  },
  connections: CONNECTIONS,
  buses: BUSES,
  looks: { 'rubin-vera': veraDieMaterials },
};
