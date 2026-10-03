// DGX-1 with Tesla V100 (and the matching HGX-1 / OCP "Big Basin" class baseboard): the 8-GPU tray.
// Eight V100 SXM2 modules on one baseboard, wired GPU-to-GPU in the hybrid cube-mesh NVLink 2 topology
// (no NVSwitch: every GPU spends its 6 links on direct peers), plus four PCIe Gen3 switches that tie GPU
// pairs to the two host CPUs and four InfiniBand NICs. Air-cooled: tall heatsinks, front fans.
//
// Sources: SOURCES.md. Sourced: 8x V100 SXM2, hybrid cube-mesh with 6 links per GPU (topology.js),
// PCIe switches between GPU pairs and the CPUs/NICs (DGX-1 whitepaper figure 4), 4x EDR InfiniBand,
// 3U chassis, 3.5 kW TDP, front-to-back air. Estimates (no CAD found): every dimension below, the exact
// board placement (GPUs follow the whitepaper's figure 4 arrangement, 4 across x 2 deep), switch,
// connector and fan positions, heatsink size.
//
// Tray coordinates (mm): x across the chassis (-220 .. 220), z: +front .. -rear, y up, 0 = sled floor.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from '../../parts/materials.js';
import { box, smallPackage } from '../../parts/chips.js';
import { InstancedSet, unitBox, unitRounded, ic } from '../../parts/boardParts.js';
import { buildPcbTextures } from '../../textures/pcb.js';
import { perforation } from '../../textures/surfaces.js';
import { mesh, at, scaleUV, screwHead, labelTexture, fan, finnedHeatsink } from '../../assemblies/tray.js';
import { tagPart, explode, shadowAll } from '../../lib/util.js';
import { optimize } from '../../lib/optimize.js';
import { MOD, MOD_BOTTOM, PKG_Z } from './sxm.js';
import { LINKS, PCIE } from './topology.js';

export const TRAY = { W: 440, Z0: 235, Z1: -290, H: 100, SIDE: 45, WALL: 1.2 };
const BB = { W: 420, Z0: 178, Z1: -268, Y: 6, T: 2.4 };
const BB_TOP = BB.Y + BB.T;
const MOD_Y = BB_TOP - MOD_BOTTOM;               // module PCB top surface
export const COLS = [-150, -50, 50, 150];
export const ROWS = { rear: -88, front: 88 };
/** GPU index -> [x, z] of the module centre (whitepaper figure 4: GPU3 0 4 7 over GPU2 1 5 6). */
export const GPU_POS = {
  3: [COLS[0], ROWS.rear], 0: [COLS[1], ROWS.rear], 4: [COLS[2], ROWS.rear], 7: [COLS[3], ROWS.rear],
  2: [COLS[0], ROWS.front], 1: [COLS[1], ROWS.front], 5: [COLS[2], ROWS.front], 6: [COLS[3], ROWS.front],
};
const SW_Z = -205, HOST_Z = -242;
const SW_X = (k) => GPU_POS[PCIE[k].gpus[0]][0]; // each switch sits behind its GPU pair's column
const HS_H = 62;                                  // heatsink fin height (estimate)

function sled() {
  const M = materials();
  const g = new THREE.Group();
  const D = TRAY.Z0 - TRAY.Z1, zc = (TRAY.Z0 + TRAY.Z1) / 2;
  g.add(mesh(scaleUV(box(TRAY.W - 2, TRAY.WALL, D), 0.004), M.steel, 0, 0, zc));
  for (const s of [-1, 1]) {
    g.add(mesh(box(TRAY.WALL, TRAY.SIDE, D), M.steel, s * (TRAY.W / 2 - 0.6), 0, zc));
    g.add(mesh(box(8, TRAY.WALL, D), M.steel, s * (TRAY.W / 2 - 4.6), TRAY.SIDE - TRAY.WALL, zc));
  }
  g.add(mesh(box(TRAY.W - 4, 14, TRAY.WALL), M.steel, 0, 0, TRAY.Z1 + 0.6));
  // standoffs under the baseboard
  for (const x of [-200, -100, 0, 100, 200]) for (const z of [150, 0, -150, -250])
    g.add(mesh(new THREE.CylinderGeometry(3, 3, BB.Y - TRAY.WALL, 12), M.steelDark, x, TRAY.WALL + (BB.Y - TRAY.WALL) / 2, z));
  tagPart(g, 'chassis', 'GPU tray', 'Steel sled for the GPU baseboard. DGX-1 is a 3U, 3.5 kW air-cooled server: this tray holds the eight GPUs, and the two Xeon CPUs, memory, NICs and drives sit in the system board below and behind it.');
  return g;
}

function frontEnd() {
  const M = materials();
  const out = new THREE.Group();
  // metal-foam-look perforated bezel (DGX-1's front is a gold-coloured metal foam; drawn as a grille)
  const g = new THREE.Group();
  const perf = perforation(14, 0.55);
  const mat = new THREE.MeshStandardMaterial({ color: '#c9a560', metalness: 0.8, roughness: 0.45, alphaMap: perf.alpha, alphaTest: 0.5, normalMap: perf.normal, side: THREE.DoubleSide });
  const geo = new THREE.PlaneGeometry(TRAY.W - 4, TRAY.H - 14);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ((TRAY.W - 4) / 30), uv.getY(i) * ((TRAY.H - 14) / 30));
  g.add(mesh(geo, mat, 0, (TRAY.H - 14) / 2 + 10, TRAY.Z0 + 1));
  g.add(mesh(box(TRAY.W, 10, 4), M.champagne, 0, 0, TRAY.Z0 + 2));
  g.add(mesh(box(TRAY.W, 4, 4), M.champagne, 0, TRAY.H - 4, TRAY.Z0 + 2));
  for (const s of [-1, 1]) g.add(mesh(box(4, TRAY.H, 4), M.champagne, s * (TRAY.W / 2 - 2), 0, TRAY.Z0 + 2));
  g.add(mesh(new THREE.PlaneGeometry(56, 9), new THREE.MeshStandardMaterial({ map: labelTexture(['DGX-1  8x V100 SXM2', 'GPU TRAY']), roughness: 0.6 }), 0, 5, TRAY.Z0 + 4.1));
  tagPart(g, 'front-panel', 'Front bezel', 'Air intake. DGX-1 is cooled front to back: cold-aisle air enters here, crosses the fans and both rows of GPU heatsinks, and leaves at the rear.');
  explode(g, 0, 0, 70);
  out.add(g);
  const fans = new THREE.Group();
  for (const x of [-162, -54, 54, 162]) fans.add(at(fan(84, 84, 38), x, TRAY.WALL + 2, 205));
  fans.add(mesh(box(TRAY.W - 8, 3, 40), M.steelDark, 0, TRAY.WALL, 205));
  tagPart(fans, 'fans', 'GPU fans', 'Four large fans (count and size are estimates) push air through the eight GPU heatsinks. At 300 W per GPU the GPUs alone make 2.4 kW of heat.');
  explode(fans, 0, 0, 40);
  out.add(fans);
  return out;
}

function baseboard() {
  const M = materials();
  const g = new THREE.Group();
  const L = BB.Z0 - BB.Z1, zc = (BB.Z0 + BB.Z1) / 2;
  const lz = (z) => z - zc; // tray z -> board-local z
  const silk = [], holes = [], pours = [], bundles = [], pads = [];
  // module outlines and mezzanine footprints
  for (const [i, [x, z]] of Object.entries(GPU_POS)) {
    silk.push({ type: 'rect', x, z: lz(z), w: MOD.W + 2, d: MOD.L + 2, lw: 0.4 });
    silk.push({ type: 'text', x: x - MOD.W / 2 + 7, z: lz(z) + MOD.L / 2 - 5, text: `GPU${i}`, size: 3.4, weight: 800 });
    for (const s of [-1, 1]) pads.push({ x, z: lz(z + s * MOD.CONN_Z), w: MOD.CONN_W - 2, d: MOD.CONN_D - 2, color: '#b9965a' });
  }
  // NVLink 2 traces: one bundle per link, between the NVLink mezzanine footprints (rear end of each module)
  const nvl = (i) => { const [x, z] = GPU_POS[i]; return [x, lz(z - MOD.CONN_Z)]; };
  LINKS.forEach(([a, b, n], k) => {
    const [ax, az] = nvl(a), [bx, bz] = nvl(b);
    const off = (k % 5 - 2) * 5;
    const mid = Math.abs(az - bz) < 1 ? az - 40 - Math.abs(ax - bx) * 0.12 + off : (az + bz) / 2 + off;
    for (let j = 0; j < n; j++)
      bundles.push({ pts: [[ax + j * 4, az], [ax + j * 4, mid], [bx + j * 4, mid], [bx + j * 4, bz]], n: 8, pitch: 0.5, width: 0.18 });
  });
  // PCIe traces: GPU power/PCIe mezzanine -> its switch
  PCIE.forEach((p, k) => p.gpus.forEach((gi) => {
    const [x, z] = GPU_POS[gi];
    bundles.push({ pts: [[x + 22, lz(z + MOD.CONN_Z)], [x + 32, lz(z + MOD.CONN_Z)], [x + 32, lz(SW_Z)], [SW_X(k) + 18, lz(SW_Z)]], n: 16, pitch: 0.45, width: 0.15 });
  }));
  for (const x of [-200, -100, 0, 100, 200]) for (const z of [150, 0, -150, -250]) holes.push({ x, z: lz(z), r: 1.6, ring: 3.2 });
  pours.push({ x: 0, z: lz(-258), w: BB.W - 20, d: 16 });
  silk.push({ type: 'text', x: 0, z: lz(BB.Z0 - 6), text: 'NVIDIA  DGX-1  GPU BASEBOARD  8x SXM2  HYBRID CUBE-MESH', size: 3.2, weight: 700 });
  const tex = buildPcbTextures({ W: BB.W, L, ppm: 3.4, seed: 51, silk, holes, pours, bundles, pads, viaCount: 7000 });
  const top = new THREE.MeshPhysicalMaterial({ map: tex.map, normalMap: tex.normal, normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: tex.rm, metalnessMap: tex.rm, roughness: 1, metalness: 1, clearcoat: 0.12, clearcoatRoughness: 0.5 });
  const pcb = mesh(new THREE.BoxGeometry(BB.W, BB.T, L), [M.pcbEdge, M.pcbEdge, top, M.pcbEdge, M.pcbEdge, M.pcbEdge], 0, BB.Y + BB.T / 2, zc);
  tagPart(pcb, 'dgx-baseboard', 'GPU baseboard', 'Multi-layer board with eight SXM2 sockets. Its copper carries all 24 NVLink 2 links of the hybrid cube-mesh directly between GPU sockets (no switch chip), plus PCIe and 12 V power.');
  g.add(pcb);
  // mezzanine sockets on the baseboard (receptacles the module connectors plug into)
  for (const [x, z] of Object.values(GPU_POS)) for (const s of [-1, 1])
    g.add(mesh(new RoundedBoxGeometry(MOD.CONN_W + 2, 1.4, MOD.CONN_D + 2, 1, 0.4), M.lcpBlack, x, BB_TOP + 0.7, z + s * MOD.CONN_Z));
  return g;
}

function pcieAndPower(sets) {
  const M = materials();
  const g = new THREE.Group();
  PCIE.forEach((p, k) => {
    const sw = smallPackage({
      size: 30, die: 13, seed: 60 + k, hue: [200, 250], id: `dgx-plx-${k}`, label: `PCIe switch ${k} (GPU${p.gpus[0]}, GPU${p.gpus[1]})`,
      info: `PCIe Gen3 switch for GPU${p.gpus[0]} and GPU${p.gpus[1]}. It fans one CPU${p.cpu} uplink out to the two GPUs and one 100 Gb/s EDR InfiniBand card, so those GPUs can RDMA straight to the network without touching CPU memory. Package size is an estimate.`,
    });
    sw.position.set(SW_X(k), BB_TOP, SW_Z);
    explode(sw, 0, 30, 0);
    // small finned heatsink on each switch (part of the cooling toggle)
    const hs = finnedHeatsink(28, 28, 18, { pitch: 2.2 });
    hs.position.y = 2.0;
    hs.name = 'cooling';
    sw.add(hs);
    g.add(sw);
    for (let j = 0; j < 10; j++) sets.mlcc.add(SW_X(k) - 16 + j * 3.4, BB_TOP, SW_Z + 19, 1.6, 0.8, 0.8, 0);
    for (let j = 0; j < 4; j++) sets.pstage.add(SW_X(k) + 22, BB_TOP, SW_Z - 9 + j * 6, 5, 1.0, 4.4, 0);
  });
  // host connectors at the rear edge: one per switch (uplink to its CPU and lanes to its NIC)
  const host = new THREE.Group();
  PCIE.forEach((p, k) => {
    const x = SW_X(k);
    host.add(mesh(box(44, 11, 14), M.lcpBlack, x, BB_TOP, HOST_Z));
    host.add(mesh(box(40, 0.3, 3.5), M.gold, x, BB_TOP + 11, HOST_Z + 3));
    host.add(mesh(box(40, 0.3, 3.5), M.gold, x, BB_TOP + 11, HOST_Z - 3));
    host.add(mesh(box(45, 2, 2), M.steelDark, x, BB_TOP + 11, HOST_Z - 7.5));
  });
  tagPart(host, 'host-conn', 'Host connectors (PCIe Gen3)', 'High-density connectors to the system board: each PCIe switch gets an x16 uplink to its CPU (switches 0-1 to CPU0, 2-3 to CPU1) and the lanes to its InfiniBand card. Connector type and position are estimates.');
  explode(host, 0, 25, -20);
  g.add(host);
  const pwr = new THREE.Group();
  for (const x of [-195, 195]) {
    pwr.add(mesh(new RoundedBoxGeometry(24, 16, 22, 2, 1.5), M.lcpBlack, x, BB_TOP, -250));
    for (const dx of [-6, 0, 6]) pwr.add(mesh(box(3, 12, 16), M.copper, x + dx, BB_TOP + 2, -262));
  }
  tagPart(pwr, 'bb-power', 'Baseboard power inputs (12 V)', 'High-current 12 V inputs from the system power distribution. DGX-1 has four 1,600 W power supplies (3,200 W load + redundancy) for a 3.5 kW system.');
  explode(pwr, 0, 25, -20);
  g.add(pwr);
  const bmc = ic(14, 1.4, 14, ['FPGA', 'BB-MGMT']);
  bmc.position.set(0, BB_TOP, SW_Z);
  tagPart(bmc, 'bb-mgmt', 'Baseboard management FPGA', 'Power sequencing, resets and telemetry for the eight GPU sockets (an estimate of a typical baseboard; the part is not identified in public sources).');
  explode(bmc, 0, 25, 0);
  g.add(bmc);
  return g;
}

/** Heatsink per GPU: copper base and heat pipes, aluminium fins along the front-to-back airflow. */
function gpuHeatsink(dieTopY) {
  const M = materials();
  const hs = new THREE.Group();
  const W = MOD.W - 2, D = MOD.L - 12;
  hs.add(mesh(box(W - 6, 4, D - 20), M.copper, 0, dieTopY, PKG_Z));
  const fins = finnedHeatsink(W, D, HS_H, { pitch: 2.1, fin: 0.4, base: 2.5 });
  fins.position.set(0, dieTopY + 4, PKG_Z);
  hs.add(fins);
  for (let k = 0; k < 4; k++) {
    const p = mesh(new THREE.CylinderGeometry(3, 3, D - 6, 14), M.copper, -24 + k * 16, dieTopY + 4 + HS_H + 1.2, PKG_Z);
    p.rotation.x = Math.PI / 2;
    hs.add(p);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) hs.add(at(screwHead(M.screw, 2.2, 3), sx * (W / 2 - 5), dieTopY + 4, PKG_Z + sz * (D / 2 - 6)));
  return hs;
}

/** model: a clone of the 'v100' view (ctx.model('v100')). */
export function buildDGX1(module) {
  const M = materials();
  const root = new THREE.Group();
  root.name = 'dgx1-v100';
  root.add(sled());
  root.add(frontEnd());
  root.add(baseboard());
  const sets = {
    pstage: new InstancedSet(unitRounded(0.1), M.powerStage, { id: 'bb-power-stage', label: 'Power stages', info: 'Regulators for the PCIe switches and baseboard logic.' }),
    mlcc: new InstancedSet(unitBox(), M.mlcc, { id: 'bb-mlcc', label: 'MLCC decoupling capacitors', info: 'Decoupling for the PCIe switches.' }),
  };
  const dieTop = module.userData.dieTop ?? 3.1;
  const cooling = new THREE.Group();
  cooling.name = 'cooling';
  for (const [i, [x, z]] of Object.entries(GPU_POS)) {
    const m = module.clone(true);
    m.traverse((o) => { delete o.userData.explode; });
    m.traverse((o) => {
      const p = o.userData.part;
      if (!p) return;
      if (p.id === 'v100-gpu') tagPart(o, `dgx-gpu-${i}`, `GPU${i} · Tesla V100`, `${p.info} In the hybrid cube-mesh it links directly to four other GPUs.`);
      else if (p.id === 'sxm-module') tagPart(o, 'sxm-module', `SXM2 module (GPU${i})`, p.info);
    });
    m.position.set(x, MOD_Y, z);
    explode(m, 0, 40, 0);
    root.add(m);
    const hs = gpuHeatsink(dieTop);
    hs.position.set(x, MOD_Y, z);
    tagPart(hs, 'gpu-heatsink', `GPU${i} heatsink`, 'Copper base and heat pipes under a tall aluminium fin stack, fins running front to back with the airflow. Sized for 300 W (dimensions are estimates).');
    cooling.add(hs);
  }
  explode(cooling, 0, 150, 0);
  root.add(cooling);
  root.add(pcieAndPower(sets));
  for (const s of Object.values(sets)) root.add(s.build());
  shadowAll(root);
  root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  return optimize(root);
}
