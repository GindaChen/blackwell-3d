// NVIDIA HGX A100 8-GPU ("Delta") baseboard: eight A100 SXM4 modules and six second-generation NVSwitch chips.
// Every GPU runs 2 of its 12 NVLink 3 links to each NVSwitch, so any GPU reaches any other at 600 GB/s.
//
// Layout follows ServeTheHome's photos of the HGX A100 assembly (Inspur NF5488A5 review): the GPUs sit in two
// rows of four, the NVSwitch array with its large heat-pipe heatsinks sits on the other side of the GPUs, and
// high-density PCIe and power connectors sit at one end. We put the GPUs at the front (the cold-air side),
// the six switches in one row behind them and the connectors on the rear edge. All dimensions are estimates.
// Coordinates (mm): x across the sled (-225..225), z = +300 front (fans) .. -270 rear, y up, 0 = sled floor.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from '../../parts/materials.js';
import { box, smallPackage } from '../../parts/chips.js';
import { InstancedSet, unitBox, unitRounded, ic } from '../../parts/boardParts.js';
import { buildPcbTextures } from '../../textures/pcb.js';
import { mesh, at, scaleUV, screwHead, labelTexture, fan, finnedHeatsink, TRAY_WALL as WALL } from '../../assemblies/tray.js';
import { tagPart, explode, shadowAll } from '../../lib/util.js';
import { optimize } from '../../lib/optimize.js';
import { A100, A100_DIE_TOP, A100_UNDER } from './a100.js';

const SLED_W = 450, SLED_H = 112;
const Z_FRONT = 300, Z_REAR = -270;
const BB_W = 430, BB_Z0 = -258, BB_Z1 = 246;  // baseboard extent (z)
const BB_Y = 6, BB_T = 2.4, BB_TOP = BB_Y + BB_T;
const COL_X = [-159, -53, 53, 159];           // GPU column centres (module 100 wide)
const ROW_Z = [160, -2];                      // GPU row centres (module 150 long)
const MOD_TOP = BB_TOP + A100_UNDER;          // module board top surface
const DIE_TOP = MOD_TOP + A100_DIE_TOP;
const SW_X = [-175, -105, -35, 35, 105, 175]; // six NVSwitches, one row behind the GPUs
const SW_Z = -140;
const FIN_Y = MOD_TOP + 8;                    // fin-stack base, above the module's tallest parts
const HS_H = 84;                              // fin height (estimate)

function sled() {
  const M = materials();
  const g = new THREE.Group();
  const D = Z_FRONT - Z_REAR, zc = (Z_FRONT + Z_REAR) / 2;
  g.add(mesh(scaleUV(box(SLED_W - 2, WALL, D), 0.004), M.steel, 0, 0, zc));
  for (const s of [-1, 1]) {
    g.add(mesh(box(WALL, SLED_H, D), M.steel, s * (SLED_W / 2 - 1.6), 0, zc));
    g.add(mesh(box(9, WALL, D), M.steel, s * (SLED_W / 2 - 6), SLED_H - WALL, zc));
  }
  g.add(mesh(box(SLED_W - 4, 12, WALL), M.steel, 0, 0, Z_REAR + 0.6));
  tagPart(g, 'chassis', 'GPU tray sled', 'Steel sled that carries the HGX A100 assembly. In DGX A100 it slides into the top of the 6U chassis; the host motherboard tray sits below it.');
  return g;
}

function fans() {
  const g = new THREE.Group();
  for (const x of [-172, -86, 0, 86, 172]) g.add(at(fan(80, 80, 38), x, WALL + 4, 272));
  g.add(mesh(box(SLED_W - 8, 4, 40), materials().steelDark, 0, WALL, 272));
  tagPart(g, 'fans', 'Fan wall', 'Front fans push cold-aisle air back through the eight GPU heatsinks and then the NVSwitch heatsinks. Each A100 SXM4 is rated at 400 W, so the GPU tray alone sheds over 3 kW.');
  explode(g, 0, 0, 60);
  return g;
}

function baseboard() {
  const M = materials();
  const g = new THREE.Group();
  const BL = BB_Z1 - BB_Z0, zc = (BB_Z0 + BB_Z1) / 2;
  const lz = (z) => z - zc; // tray z -> board-local z
  const silk = [], holes = [], pours = [], bundles = [];
  ROW_Z.forEach((z) => COL_X.forEach((x) => {
    silk.push({ type: 'rect', x, z: lz(z), w: A100.BOARD_W + 2, d: A100.BOARD_L + 2, lw: 0.3 });
    // NVLink fan-out: every GPU to all six switches (drawn as one bundle per switch pair)
    for (const sx of [SW_X[0], SW_X[2], SW_X[4]]) bundles.push({ pts: [[x, lz(z - 52)], [x + (sx - x) * 0.2, lz(z - 82)], [sx + 35, lz(SW_Z + 34)]], n: 6, pitch: 0.45, width: 0.15 });
  }));
  SW_X.forEach((x, i) => {
    silk.push({ type: 'corners', x, z: lz(SW_Z), w: 50, d: 50, k: 4, lw: 0.3 });
    silk.push({ type: 'text', x, z: lz(SW_Z) - 30, text: `NVSW${i}`, size: 2.2 });
  });
  for (const x of [-205, -106, 0, 106, 205]) for (const z of [-240, -190, 80, 236]) holes.push({ x, z: lz(z), r: 1.6, ring: 3.2 });
  pours.push({ x: 0, z: lz(-228), w: BB_W - 20, d: 36 });
  silk.push({ type: 'text', x: 0, z: lz(240.5), text: 'NVIDIA HGX A100 8-GPU   935-23587-0000', size: 3, weight: 700 });
  const tex = buildPcbTextures({ W: BB_W, L: BL, ppm: 3.6, seed: 31, silk, holes, pours, bundles, viaCount: 8000 });
  const top = new THREE.MeshPhysicalMaterial({ map: tex.map, normalMap: tex.normal, normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: tex.rm, metalnessMap: tex.rm, roughness: 1, metalness: 1, clearcoat: 0.12, clearcoatRoughness: 0.5 });
  const pcb = mesh(new THREE.BoxGeometry(BB_W, BB_T, BL), [M.pcbEdge, M.pcbEdge, top, M.pcbEdge, M.pcbEdge, M.pcbEdge], 0, BB_Y + BB_T / 2, zc);
  tagPart(pcb, 'hgx-a100-baseboard', 'HGX A100 baseboard', 'Large multi-layer board that wires the 8 GPUs to the 6 NVSwitches (96 NVLink 3 links) and carries PCIe Gen4 and power from the rear connectors.');
  g.add(pcb);
  for (const x of [-190, 0, 190]) for (const z of [-200, 0, 200]) g.add(mesh(new THREE.CylinderGeometry(3, 3, BB_Y - WALL, 12), M.steelDark, x, WALL + (BB_Y - WALL) / 2, z));
  return g;
}

function switches(sets) {
  const g = new THREE.Group();
  SW_X.forEach((x, i) => {
    const sw = smallPackage({
      size: 46, die: 20, dieD: 22, seed: 140 + i, hue: [70, 140], id: 'a100-nvswitch', label: `NVSwitch ${i} (gen 2)`,
      info: 'Second-generation NVSwitch: 36 NVLink 3 ports at 50 GB/s. Here 16 ports take 2 links from each of the 8 GPUs; the rest can join a second baseboard back-to-back for 16 GPUs.',
    });
    sw.position.set(x, BB_TOP, SW_Z);
    explode(sw, 0, 40, 0);
    g.add(sw);
    for (const s of [-1, 1]) for (let k = 0; k < 6; k++) sets.pstage.add(x + s * 29, BB_TOP, SW_Z - 18 + k * 7, 5.4, 2.0, 4.4, Math.PI / 2);
  });
  return g;
}

function rear(sets) {
  const M = materials();
  const g = new THREE.Group();
  const host = new THREE.Group();
  for (const x of [-150, -50, 50, 150]) {
    host.add(mesh(box(70, 13, 16), M.lcpBlack, x, BB_TOP, -232));
    for (const dz of [-3.5, 3.5]) host.add(mesh(box(62, 0.3, 3), M.gold, x, BB_TOP + 13, -232 + dz));
    host.add(mesh(box(72, 2, 2), M.steelDark, x, BB_TOP + 13, -241));
    for (let j = 0; j < 16; j++) sets.mlcc.add(x - 30 + j * 4, BB_TOP, -219, 1.6, 0.8, 0.8, 0);
  }
  tagPart(host, 'a100-host-conn', 'Host connectors (PCIe Gen4)', 'High-density connectors to the host board. Each carries PCIe Gen4 x16 links for two GPUs to a PCIe switch on the host side (four switches in DGX A100), which also feeds that pair\'s ConnectX-6 NICs.');
  explode(host, 0, 26, -20);
  g.add(host);
  const pwr = new THREE.Group();
  for (const x of [-205, 205]) {
    pwr.add(mesh(new RoundedBoxGeometry(18, 18, 26, 2, 1.5), M.lcpBlack, x, BB_TOP, -238));
    for (const dx of [-4, 4]) pwr.add(mesh(box(3, 14, 20), M.copper, x + dx, BB_TOP + 2, -252));
  }
  tagPart(pwr, 'a100-pwr-conn', 'Baseboard power connectors', 'High-current inputs from the chassis power supplies. Each SXM4 module then regulates its own rails.');
  explode(pwr, 0, 26, -30);
  g.add(pwr);
  const fpga = ic(17, 1.6, 17, ['HGX', 'FPGA']);
  fpga.position.set(0, BB_TOP, -200);
  tagPart(fpga, 'hgx-a100-fpga', 'Baseboard management FPGA', 'Board housekeeping: power sequencing, resets and telemetry for the GPUs and NVSwitches, reported to the host BMC.');
  explode(fpga, 0, 24, 0);
  g.add(fpga);
  return g;
}

/** All heatsinks in one 'cooling' group; GPU heatsinks lift with lids. */
function heatsinks() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'cooling';
  const lift = new THREE.Group();
  lift.name = 'gpu-coldplate-lift';
  g.add(lift);
  const W = A100.BOARD_W - 4, D = A100.BOARD_L - 14;
  ROW_Z.forEach((z, r) => COL_X.forEach((x, c) => {
    const hs = new THREE.Group();
    // copper contact block on the package, then the fin stack clear of the VRM inductors
    hs.add(mesh(box(A100.SW - 4, FIN_Y - DIE_TOP, A100.SD - 4), M.copper, x, DIE_TOP, z));
    hs.add(mesh(box(W, 3, D), M.copper, x, FIN_Y, z));
    const fins = finnedHeatsink(W - 2, D - 4, HS_H, { pitch: 2.2, fin: 0.42, base: 2 });
    fins.position.set(x, FIN_Y + 3, z);
    hs.add(fins);
    const top = FIN_Y + 3 + HS_H;
    for (let k = 0; k < 4; k++) {
      const p = mesh(new THREE.CylinderGeometry(3, 3, W - 8, 14), M.copper, x, top + 1.2, z - 48 + k * 32);
      p.rotation.z = Math.PI / 2;
      hs.add(p);
    }
    hs.add(mesh(new THREE.PlaneGeometry(40, 12), new THREE.MeshStandardMaterial({ map: labelTexture(['NVIDIA', 'A100 SXM4 80GB'], { bg: '#c9ccd0', size: 34 }), roughness: 0.5 }), x, top + 0.05, z + D / 2 - 14).rotateX(-Math.PI / 2));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) hs.add(at(screwHead(M.screw, 2.4, 3), x + sx * (W / 2 - 4), FIN_Y + 3, z + sz * (D / 2 - 6)));
    tagPart(hs, 'a100-heatsink', `GPU heatsink ${r * 4 + c}`, 'Copper base and heat pipes under a tall aluminium fin stack, sized for a 400 W A100. A clear plastic duct (left out here) keeps the air inside the fins.');
    lift.add(hs);
  }));
  const sw = new THREE.Group();
  SW_X.forEach((x) => {
    const top = BB_TOP + 1.95;
    sw.add(mesh(box(46, 4, 46), M.copper, x, top, SW_Z));
    sw.add(finnedHeatsink(56, 92, 78, { pitch: 2.4 }).translateX(x).translateY(top + 4).translateZ(SW_Z));
    sw.add(mesh(box(56, 2, 92), M.aluminum, x, top + 4 + 78, SW_Z));
    // heat-pipe ends poking through the top plate
    for (const dx of [-14, 0, 14]) for (const dz of [-30, 30]) sw.add(mesh(new THREE.CylinderGeometry(2.8, 2.8, 7, 14), M.copper, x + dx, top + 4 + 78 + 4, SW_Z + dz));
  });
  tagPart(sw, 'a100-switch-heatsink', 'NVSwitch heatsinks', 'Heat-pipe heatsinks on the six NVSwitches, much larger than on the V100-era HGX-2. They sit downstream of the GPUs, in already warm air.');
  g.add(sw);
  explode(g, 0, 160, 0);
  return g;
}

export function buildHGXA100(moduleOf) {
  const M = materials();
  const root = new THREE.Group();
  root.name = 'hgx-a100';
  root.add(sled());
  root.add(fans());
  root.add(baseboard());
  const sets = {
    pstage: new InstancedSet(unitRounded(0.1), M.powerStage, { id: 'power-stage', label: 'Power stages', info: 'Power stages for the NVSwitch core rails.' }),
    mlcc: new InstancedSet(unitBox(), M.mlcc, { id: 'mlcc', label: 'MLCC decoupling capacitors', info: 'Decoupling on the baseboard rails.' }),
  };
  ROW_Z.forEach((z, r) => COL_X.forEach((x, c) => {
    const i = r * 4 + c;
    const m = moduleOf(i);
    m.position.set(x, MOD_TOP, z);
    explode(m, 0, 60, 0);
    root.add(m);
  }));
  root.add(switches(sets));
  root.add(rear(sets));
  root.add(heatsinks());
  for (const s of Object.values(sets)) root.add(s.build());
  shadowAll(root);
  root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  return optimize(root);
}
