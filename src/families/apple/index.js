// Apple silicon: M5 Ultra package, Mac Studio, 4-node Thunderbolt 5 cluster.
import { buildMacStudio, STUDIO } from '../../assemblies/macStudio.js';
import { buildMacCluster, CLUSTER_H } from '../../assemblies/macCluster.js';
import { m5UltraPackage, tileLooks } from '../../parts/apple.js';
import { ULTRA_STEPS, STUDIO_STEPS, CLUSTER_STEPS } from '../../tour/tours/apple.js';

const MM = 0.1;

export default {
  views: {
    ultra: {
      build: () => m5UltraPackage(),
      scale: MM * 3, // the package is ~6 cm across: show it three times larger
      cams: {
        hero: { pos: [15, 19, 23], target: [0, 0, 0.5] },
        top: { pos: [0, 38, 0.01], target: [0, 0, 0] },
        front: { pos: [0, 8, 31], target: [0, 0, 1] },
        close: { pos: [7, 7, -1], target: [0, 0, -6] },
      },
      stage: { shadow: 26, floor: -6 },
      toggles: ['lids', 'floorplan'],
      tour: ULTRA_STEPS,
    },
    studio: {
      build: () => buildMacStudio(),
      offset: [0, -STUDIO.H / 2, 0],
      cams: {
        hero: { pos: [26, 20, 32], target: [0, 0.5, 0] },
        top: { pos: [0, 48, 0.01], target: [0, 0, 0] },
        front: { pos: [0, 3, 40], target: [0, 0, 0] },
        close: { pos: [-15, 9, -24], target: [-2, -2, -8] },
      },
      stage: { shadow: 34, floor: -(STUDIO.H / 2) * MM - 0.05 },
      toggles: ['lids', 'floorplan', 'cooling', 'shell'],
      tour: STUDIO_STEPS,
    },
    cluster: {
      build: (ctx) => buildMacCluster(ctx.model('studio')),
      offset: [0, -CLUSTER_H / 2, 0],
      cams: {
        hero: { pos: [55, 18, 92], target: [0, 0, 4] },
        top: { pos: [0, 130, 0.01], target: [0, 0, 0] },
        front: { pos: [0, 0, 110], target: [0, 0, 0] },
        close: { pos: [-42, 12, -58], target: [0, 2, -10] },
      },
      stage: { shadow: 48, far: 320, key: 1.6, floor: -(CLUSTER_H / 2) * MM - 0.05 },
      toggles: ['lids', 'floorplan', 'cooling', 'shell'],
      tour: CLUSTER_STEPS,
    },
  },
  looks: { 'apple-cpu': () => tileLooks('cpu'), 'apple-gpu': () => tileLooks('gpu') },
};
