// Four Mac Studios in a 10-inch mini rack, wired as a Thunderbolt 5 full mesh.
//
// There is no Thunderbolt 5 switch, so every Mac cables straight to every other one: 4 nodes need 6
// cables and 3 ports each. With RDMA over Thunderbolt (macOS 26.2+), MLX / Exo can split one model
// across all four, like Jeff Geerling's 1.5 TB cluster of four 512 GB / 256 GB Mac Studios.
// A 10 GbE switch carries ordinary network traffic, and a power strip feeds the four internal PSUs.
//
// As in the NVL72 rack, only one unit is a working full-detail model (the top one, which slides out
// with the explode slider). The other three are clones with their inner parts merged into one hover target.
//
// Coordinates (mm): x across, z: +front, y: up from the floor of the rack.
import * as THREE from 'three';
import { materials } from '../parts/materials.js';
import { box } from '../parts/chips.js';
import { mesh, cable, labelTexture } from './tray.js';
import { STUDIO } from './macStudio.js';
import { tagPart, explode, shadowAll } from '../lib/util.js';
import { optimize } from '../lib/optimize.js';

const LEVELS = [44, 180, 316, 452];            // shelf top heights
const SWITCH_Y = 590, TOP = 660;
export const CLUSTER_H = TOP + 8;
const PX = 121, PZ = 116;                      // post centres
const TB5_X = [-66, -53, -40, -27];            // rear Thunderbolt 5 ports (x)
const PORT_Y = 18.1;                           // rear port height above the Mac's base
const ETH_X = -8, INLET_X = 82, REAR = -STUDIO.W / 2 - 0.1;

function frame() {
  const M = materials();
  const g = new THREE.Group();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(box(18, TOP, 18), M.blackAnodized, sx * PX, 0, sz * PZ));
  for (const y of [0, TOP - 8]) g.add(mesh(box(PX * 2 + 18, 8, PZ * 2 + 18), M.blackAnodized, 0, y, 0));
  for (const y of LEVELS) g.add(mesh(box(PX * 2 - 4, 3, PZ * 2 - 6), M.steelDark, 0, y - 3, 0));
  tagPart(g, 'mini-rack', '10-inch mini rack', 'Open aluminium frame with one shelf per Mac Studio. The whole cluster fits on a desk and draws a few hundred watts.');
  return g;
}

function ethSwitch() {
  const M = materials();
  const g = new THREE.Group();
  g.add(mesh(box(222, 42, 180), M.blackPowder));
  const face = mesh(new THREE.PlaneGeometry(200, 34), new THREE.MeshStandardMaterial({ map: labelTexture(['10GbE SWITCH', '8 × 10GBASE-T'], { bg: '#18191b', ink: '#cfd2d6', size: 30 }), roughness: 0.7 }), 0, 21, 90.05);
  g.add(face);
  for (let i = 0; i < 8; i++) g.add(mesh(box(14, 11, 2), M.portDark, -77 + i * 22, 5, -90.5));
  g.position.set(0, SWITCH_Y, 0);
  tagPart(g, 'eth-switch', '10 GbE switch', 'Ordinary Ethernet for logins, storage and model downloads. The heavy tensor traffic goes over the Thunderbolt 5 mesh instead.');
  return g;
}

function powerStrip() {
  const M = materials();
  const g = new THREE.Group();
  g.add(mesh(box(200, 30, 36), M.blackPowder));
  for (let i = 0; i < 4; i++) g.add(mesh(box(22, 18, 1), M.portDark, -66 + i * 44, 6, 18.2));
  g.position.set(0, 8, -PZ - 30);
  g.rotation.y = Math.PI;
  tagPart(g, 'power-strip', 'Power strip', 'Mains power for the four Macs. Each Mac Studio has its own internal 480 W supply.');
  return g;
}

/** Strip a clone's inner tags/offsets so it hovers and explodes as one closed unit. */
function closedUnit(src, i) {
  const u = src.clone(true);
  u.traverse((o) => { delete o.userData.part; delete o.userData.explode; });
  tagPart(u, 'mac-studio', `Mac Studio ${i + 1}`, 'M5 Ultra Mac Studio, cluster node. 80-core GPU and up to 512 GB of unified memory; three of its Thunderbolt 5 ports link it to the other three Macs.');
  return u;
}

export function buildMacCluster(studio) {
  const root = new THREE.Group();
  root.name = 'mac-cluster';
  root.add(frame());
  root.add(ethSwitch());
  root.add(powerStrip());

  LEVELS.forEach((y, i) => {
    if (i === LEVELS.length - 1) {
      // full-detail unit: inner explode offsets stay, so the shell lifts once it is out of the rack
      const drawer = new THREE.Group();
      drawer.name = 'drawer';
      drawer.add(studio.clone(true));
      drawer.position.y = y;
      tagPart(drawer, 'mac-studio', `Mac Studio ${i + 1} (open)`, 'Full-detail Mac Studio. Drag the explode slider to slide it out and lift the shell, then hover the M5 Ultra or a Thunderbolt 5 port.');
      explode(drawer, 0, 0, 300);
      root.add(drawer);
    } else {
      const u = closedUnit(studio, i);
      u.position.y = y;
      root.add(u);
    }
  });

  // Thunderbolt 5 full mesh: each pair gets one cable; each node uses its ports in neighbour order
  const pairs = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
  const used = [0, 0, 0, 0];
  pairs.forEach(([a, b], k) => {
    const xa = TB5_X[used[a]++], xb = TB5_X[used[b]++];
    const ya = LEVELS[a] + PORT_Y, yb = LEVELS[b] + PORT_Y;
    const zl = REAR - 16 - k * 7;
    const c = cable([[xa, ya, REAR - 2], [xa, ya, zl], [xa - 4, ya + 30, zl - 8], [xb - 4, yb - 30, zl - 8], [xb, yb, zl], [xb, yb, REAR - 2]], 2.3, '#1c1c1e');
    tagPart(c, 'tb5-cable', `Thunderbolt 5 cable ${a + 1}↔${b + 1}`, 'Direct Mac-to-Mac link at 80 Gb/s with RDMA: one GPU can read another Mac\'s memory in well under 50 µs, versus ~300 µs over TCP.');
    root.add(c);
  });
  // 10 GbE up to the switch, AC down to the strip
  LEVELS.forEach((y, i) => {
    const c = cable([[ETH_X, y + PORT_Y, REAR - 2], [ETH_X, y + PORT_Y, REAR - 70], [ETH_X + 10 + i * 8, SWITCH_Y + 10, REAR - 70], [ETH_X + 10 + i * 8, SWITCH_Y + 10, -92]], 1.8, '#3b6fb6');
    tagPart(c, 'eth-cable', `Ethernet cable ${i + 1}`, 'Cat 6A to the 10 GbE switch.');
    root.add(c);
    const p = cable([[INLET_X, y + 16, REAR - 2], [INLET_X, y + 16, REAR - 40], [INLET_X - 10 - i * 6, 30, REAR - 40], [-66 + (3 - i) * 44, 30, -PZ - 46]], 2.4, '#2a2a2b');
    tagPart(p, 'ac-cord', `Power cord ${i + 1}`, 'Mains power to that Mac\'s internal PSU.');
    root.add(p);
  });

  shadowAll(root);
  root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  return optimize(root);
}
