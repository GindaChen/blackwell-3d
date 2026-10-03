// NVIDIA HGX B200: eight B200 GPUs on SXM modules over one baseboard, all-to-all through two
// on-board NVLink 5 switch chips (1.8 TB/s per GPU, 14.4 TB/s total), connected to a separate x86
// host over PCIe. This is the air-cooled version: tall finned heatsinks, front-to-back airflow from
// the chassis fan wall (as in DGX B200).
//
// Layout follows public photos of the bare HGX B200 board (Computex 2024): 4 GPUs across x 2 deep,
// with the two NVLink switch chips moved to the centre, between the GPU rows, to shorten the longest
// GPU-switch links. Host and power connectors at the rear. Dimensions are estimates.
// Coordinates as tray.js (mm; z = +430 front .. -430 rear; d = mm from front), but the sled is
// taller (open top, ~100 mm) to clear the heatsinks.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from '../parts/materials.js';
import { b200GPU, smallPackage, box } from '../parts/chips.js';
import { InstancedSet, unitBox, unitRounded, ic } from '../parts/boardParts.js';
import { buildPcbTextures } from '../textures/pcb.js';
import { perforation } from '../textures/surfaces.js';
import {
  mesh, at, scaleUV, screwHead, labelTexture, modPcb, moduleBoard, fan, finnedHeatsink,
  TRAY_W as W, TRAY_DEPTH as DEPTH, TRAY_WALL as WALL,
} from './tray.js';
import { tagPart, explode, shadowAll } from '../lib/util.js';
import { optimize } from '../lib/optimize.js';

const Z = (d) => DEPTH / 2 - d;
const SLED_H = 100;
const COL_X = [-161, -54, 54, 161];      // GPU column centres
const ROW_D = [205, 465];                // GPU row centres (d)
const MOD_W = 100, MOD_D = 160;          // SXM module footprint
const BB_D0 = 110, BB_D1 = 790;          // baseboard extent (d)
const BB_Y = 6, BB_T = 2.4, BB_TOP = BB_Y + BB_T;
const MOD_TOP = 15;                      // SXM module board top surface
const PKG_TOP = MOD_TOP + 0.25 + 1.8 + 0.7 + 0.78; // bare-die top
const SW_X = [-90, 90], SW_D = 335;      // the two NVLink switch chips, between the GPU rows

function sled() {
  const M = materials();
  const g = new THREE.Group();
  g.add(mesh(scaleUV(box(W - 2, WALL, DEPTH), 0.004), M.steel, 0, 0, 0));
  for (const s of [-1, 1]) {
    g.add(mesh(box(WALL, SLED_H, DEPTH), M.steel, s * (W / 2 - 1.6), 0, 0));
    g.add(mesh(box(9, WALL, DEPTH), M.steel, s * (W / 2 - 6), SLED_H - WALL, 0));
    for (const d of [90, 330, 600, 820]) {
      const pin = mesh(new THREE.CylinderGeometry(3, 3, 3, 16), M.nickel, s * (W / 2 + 0.2), 20, Z(d));
      pin.rotation.z = Math.PI / 2;
      g.add(pin);
    }
  }
  g.add(mesh(box(W - 4, 12, WALL), M.steel, 0, 0, Z(DEPTH) + 0.6));
  for (const x of [-180, -60, 60, 180]) g.add(mesh(box(5, 0.8, 300), M.steel, x, WALL, Z(600)));
  tagPart(g, 'chassis', 'GPU tray sled', 'Steel sled that slides into the front of a DGX/HGX B200 chassis (about 10U for the whole system). The CPUs, NICs and storage sit in a separate host tray.');
  return g;
}

function frontEnd() {
  const M = materials();
  const g = new THREE.Group();
  // perforated front grille: intake air for the heatsinks
  const perf = perforation(12, 0.62);
  const mat = new THREE.MeshStandardMaterial({ color: '#d2bd94', metalness: 0.75, roughness: 0.38, alphaMap: perf.alpha, alphaTest: 0.5, normalMap: perf.normal, side: THREE.DoubleSide });
  const geo = new THREE.PlaneGeometry(W - 4, SLED_H - 16);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ((W - 4) / 36), uv.getY(i) * ((SLED_H - 16) / 36));
  g.add(mesh(geo, mat, 0, (SLED_H - 16) / 2 + 12, Z(0) - 1));
  g.add(mesh(box(W, 12, 4), M.champagne, 0, 0, Z(0) - 3));
  g.add(mesh(box(W, 4, 4), M.champagne, 0, SLED_H - 4, Z(0) - 3));
  // two pull handles
  for (const s of [-1, 1]) {
    const h = new THREE.Group();
    h.add(mesh(box(8, 8, 26), M.champagneDark, -36, 0, 13));
    h.add(mesh(box(8, 8, 26), M.champagneDark, 36, 0, 13));
    h.add(mesh(new RoundedBoxGeometry(80, 9, 8, 2, 2), M.champagne, 0, 0, 28));
    h.position.set(s * 150, 40, Z(0));
    g.add(h);
  }
  g.add(mesh(new THREE.PlaneGeometry(60, 10), new THREE.MeshStandardMaterial({ map: labelTexture(['HGX B200 8-GPU', 'P/N 935-24287-0001-000']), roughness: 0.6 }), 0, 6, Z(0) + 0.6));
  tagPart(g, 'front-panel', 'Front grille & handles', 'Perforated intake grille. Air from the chassis fan wall flows front to back through all eight GPU heatsinks.');
  explode(g, 0, 0, 90);
  // fan wall just behind the grille (in DGX B200 these are chassis fans)
  const fans = new THREE.Group();
  for (const x of [-180, -108, -36, 36, 108, 180]) {
    const f = fan(66, 66, 38);
    f.position.set(x, 14, Z(40));
    fans.add(f);
  }
  fans.add(mesh(box(W - 8, 4, 40), M.steelDark, 0, WALL, Z(40)));
  tagPart(fans, 'fans', 'Fan wall', 'High-static-pressure fans. An air-cooled HGX B200 dissipates about 8 kW across the eight GPUs, roughly 1 kW each, so airflow is the design constraint.');
  explode(fans, 0, 0, 50);
  const out = new THREE.Group();
  out.add(g, fans);
  return out;
}

function baseboard() {
  const M = materials();
  const g = new THREE.Group();
  const BW = W - 18, BL = BB_D1 - BB_D0;
  const zc = Z((BB_D0 + BB_D1) / 2);
  const lz = (d) => (BB_D0 + BB_D1) / 2 - d; // tray d -> board-local z (+ = towards the front)
  const silk = [], holes = [], pours = [], bundles = [];
  for (const d of ROW_D) for (const x of COL_X) {
    silk.push({ type: 'rect', x, z: lz(d), w: MOD_W + 2, d: MOD_D + 2, lw: 0.3 });
    // NVLink fan-out from every GPU back to both switch chips
    const k = d < SW_D ? -1 : 1; // which GPU edge faces the switch row
    for (const sx of SW_X) bundles.push({ pts: [[x, lz(d) + k * MOD_D / 2], [x, lz(d) + k * (MOD_D / 2 + 6)], [sx + (x - sx) * 0.3, lz(SW_D) - k * 36], [sx, lz(SW_D) - k * 30]], n: 9, pitch: 0.45, width: 0.15 });
  }
  for (const x of [-200, -108, 0, 108, 200]) for (const dz of [-300, -110, 70, 250]) holes.push({ x, z: dz, r: 1.6, ring: 3.2 });
  pours.push({ x: 0, z: lz(760), w: BW - 20, d: 40 });
  silk.push({ type: 'text', x: 0, z: lz(120) - 6, text: 'NVIDIA HGX B200   699-2G520-0200-A00', size: 3, weight: 700 });
  const tex = buildPcbTextures({ W: BW, L: BL, ppm: 3.5, seed: 11, silk, holes, pours, bundles, viaCount: 9000 });
  const top = new THREE.MeshPhysicalMaterial({ map: tex.map, normalMap: tex.normal, normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: tex.rm, metalnessMap: tex.rm, roughness: 1, metalness: 1, clearcoat: 0.12, clearcoatRoughness: 0.5 });
  const pcb = mesh(new THREE.BoxGeometry(BW, BB_T, BL), [M.pcbEdge, M.pcbEdge, top, M.pcbEdge, M.pcbEdge, M.pcbEdge], 0, BB_Y + BB_T / 2, zc);
  tagPart(pcb, 'hgx-baseboard', 'HGX baseboard', 'Large multi-layer board that wires all eight GPUs to the two NVLink switch chips and to the host connectors.');
  g.add(pcb);
  for (const x of [-200, 0, 200]) for (const dz of [-300, 0, 300]) g.add(mesh(new THREE.CylinderGeometry(3, 3, BB_Y - WALL, 12), M.steelDark, x, WALL + (BB_Y - WALL) / 2, zc + dz));
  return g;
}

function gpuModule(i, sets, gx, gz) {
  const M = materials();
  const g = new THREE.Group();
  for (const sz of [-1, 1]) g.add(mesh(box(70, MOD_TOP - 1.6 - BB_TOP, 10), M.lcpBlack, gx, BB_TOP, gz + sz * (MOD_D / 2 - 12)));
  const board = moduleBoard(MOD_W - 2, MOD_D - 2, modPcb());
  board.position.set(gx, MOD_TOP - 1.6, gz);
  g.add(board);
  tagPart(g, 'gpu-module', `SXM6 module ${i}`, 'B200 SXM module: the GPU package and its power delivery on a carrier that plugs into the baseboard.');

  const gpu = b200GPU({ index: i });
  gpu.rotation.y = Math.PI / 2; // dies side by side front-to-back, HBM3e rows towards the sides
  gpu.position.set(gx, MOD_TOP + 0.25, gz);
  tagPart(gpu, 'b200-gpu', `B200 GPU ${i}`, 'Two Blackwell dies + 8 HBM3e stacks (180 GB on HGX B200). Up to 1,000 W air-cooled, 8 TB/s memory bandwidth, 1.8 TB/s NVLink 5.');
  explode(gpu, 0, 45, 0);
  g.add(gpu);

  // VRM banks at both ends of the package
  for (const sz of [-1, 1])
    for (let r = 0; r < 2; r++) {
      const z = gz + sz * (48 + r * 6.4);
      for (let x = -42; x <= 42.1; x += 6.9) sets.pstage.add(gx + x, MOD_TOP, z, 5.8, 2.2, 4.6, 0);
    }
  for (const sx of [-1, 1]) for (let k = 0; k < 28; k++) sets.mlcc.add(gx + sx * 45, MOD_TOP, gz - 42 + k * 3, 1.6, 0.8, 0.8, Math.PI / 2);
  const ctrl = ic(7, 1, 7, ['MP2', '898']);
  ctrl.position.set(gx + 38, MOD_TOP, gz + 70);
  tagPart(ctrl, 'vrm-ctrl', 'Multiphase VRM controller', 'Digital controller for this GPU\'s power stages.');
  g.add(ctrl);
  explode(g, 0, 60, 0);
  return g;
}

/** All heatsinks live in one 'cooling' group (follows the cooling toggle) and lift with lids. */
function heatsinks() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'cooling';
  const lift = new THREE.Group();
  lift.name = 'gpu-coldplate-lift';
  g.add(lift);
  const HS_H = 78;
  ROW_D.forEach((d, r) => COL_X.forEach((x, c) => {
    const hs = new THREE.Group();
    hs.add(mesh(box(MOD_W - 4, 5, MOD_D - 10), M.copper, x, PKG_TOP, Z(d)));
    const fins = finnedHeatsink(MOD_W - 6, MOD_D - 14, HS_H, { pitch: 2.3, fin: 0.45, base: 2 });
    fins.position.set(x, PKG_TOP + 5, Z(d));
    hs.add(fins);
    // heat pipes looping over the top of the fin stack
    for (let k = 0; k < 4; k++) {
      const p = mesh(new THREE.CylinderGeometry(3, 3, MOD_W - 10, 14), M.copper, x, PKG_TOP + 5 + HS_H + 1.5, Z(d) - 45 + k * 30);
      p.rotation.z = Math.PI / 2;
      hs.add(p);
    }
    hs.add(mesh(new THREE.PlaneGeometry(40, 10), new THREE.MeshStandardMaterial({ map: labelTexture(['NVIDIA', 'B200 SXM6'], { bg: '#c9ccd0', size: 34 }), roughness: 0.5 }), x, PKG_TOP + 5 + HS_H + 0.02, Z(d) + MOD_D / 2 - 14).rotateX(-Math.PI / 2));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) hs.add(at(screwHead(M.screw, 2.4, 3), x + sx * (MOD_W / 2 - 6), PKG_TOP + 5, Z(d) + sz * (MOD_D / 2 - 8)));
    tagPart(hs, 'gpu-heatsink', `GPU heatsink ${r * 4 + c}`, 'Copper vapor-chamber base with heat pipes and a tall aluminium fin stack, sized for about 1 kW per GPU. Liquid-cooled HGX B200 systems swap these for cold plates.');
    lift.add(hs);
  }));
  const sw = new THREE.Group();
  for (const x of SW_X) sw.add(finnedHeatsink(64, 64, 52, { pitch: 2.4 }).translateX(x).translateY(BB_TOP + 1.95).translateZ(Z(SW_D)));
  tagPart(sw, 'switch-heatsink', 'NVLink switch heatsinks', 'Finned heatsinks on the two NVLink switch chips.');
  g.add(sw);
  explode(g, 0, 170, 0);
  return g;
}

function switchesAndHost(sets) {
  const M = materials();
  const g = new THREE.Group();
  SW_X.forEach((x, i) => {
    const sw = smallPackage({
      size: 56, die: 26, dieD: 30, seed: 90 + i, hue: [90, 170], id: 'hgx-nvswitch', label: `NVLink 5 switch ${i}`,
      info: 'On-board NVLink switch chip. With two of them, every GPU reaches every other at 1.8 TB/s; the NVLink domain is 8 GPUs (vs 72 in NVL72).',
    });
    sw.position.set(x, BB_TOP, Z(SW_D));
    explode(sw, 0, 40, 0);
    g.add(sw);
    for (const s of [-1, 1]) for (let k = 0; k < 8; k++) sets.pstage.add(x + s * 38, BB_TOP, Z(SW_D) - 24 + k * 7, 5.6, 2.2, 4.4, Math.PI / 2);
  });
  // host connectors: one PCIe Gen5 x16 cable connector per GPU along the rear
  const host = new THREE.Group();
  for (let k = 0; k < 8; k++) {
    const x = -189 + k * 54;
    host.add(mesh(box(26, 12, 18), M.lcpBlack, x, BB_TOP, Z(700)));
    host.add(mesh(box(22, 0.3, 4), M.gold, x, BB_TOP + 12, Z(700) + 3));
    host.add(mesh(box(22, 0.3, 4), M.gold, x, BB_TOP + 12, Z(700) - 3));
    host.add(mesh(box(27, 2, 3), M.steelDark, x, BB_TOP + 12, Z(700) - 9));
    for (let j = 0; j < 12; j++) sets.mlcc.add(x - 12 + j * 2.2, BB_TOP, Z(700) + 14, 1.0, 0.5, 0.5, 0);
  }
  tagPart(host, 'host-conn', 'Host connectors (PCIe Gen5)', 'Eight PCIe Gen5 x16 cable connectors, one per GPU, to the host tray\'s CPUs, PCIe switches and ConnectX-7 / BlueField-3 NICs.');
  explode(host, 0, 30, 0);
  g.add(host);
  const hmc = ic(21, 1.6, 21, ['HMC', 'FPGA', '2440']);
  hmc.position.set(0, BB_TOP, Z(640));
  tagPart(hmc, 'hgx-hmc', 'HGX management controller (HMC)', 'Baseboard management: GPU telemetry, firmware updates, NVLink fabric bring-up.');
  explode(hmc, 0, 30, 0);
  g.add(hmc);
  return g;
}

function rearEnd() {
  const M = materials();
  const g = new THREE.Group();
  const pwr = new THREE.Group();
  for (const x of [-150, -50, 50, 150]) {
    pwr.add(mesh(new RoundedBoxGeometry(60, 22, 26, 2, 1.5), M.lcpBlack, x, BB_TOP, Z(770)));
    for (const dx of [-16, -5, 5, 16]) pwr.add(mesh(box(4, 16, 20), M.copper, x + dx, BB_TOP + 2, Z(770) - 14));
  }
  pwr.add(mesh(box(400, 3, 10), M.copper, 0, WALL, Z(800)));
  tagPart(pwr, 'pdb', 'Baseboard power connectors', 'High-current 54 V inputs from the system power distribution, fed by the chassis power supplies.');
  explode(pwr, 0, 30, -30);
  g.add(pwr);
  g.add(mesh(box(W - 30, 14, 12), M.steelDark, 0, WALL, Z(840)));
  explode(g, 0, 0, -40);
  return g;
}

export function buildHGXB200() {
  const M = materials();
  const root = new THREE.Group();
  root.name = 'hgx-b200';
  root.add(sled());
  root.add(frontEnd());
  root.add(baseboard());
  const sets = {
    pstage: new InstancedSet(unitRounded(0.1), M.powerStage, { id: 'power-stage', label: 'Power stages', info: 'Smart power stages delivering ~1 kW per GPU at sub-1 V.' }),
    mlcc: new InstancedSet(unitBox(), M.mlcc, { id: 'mlcc', label: 'MLCC decoupling capacitors', info: '' }),
  };
  ROW_D.forEach((d, r) => COL_X.forEach((x, c) => root.add(gpuModule(r * 4 + c, sets, x, Z(d)))));
  root.add(switchesAndHost(sets));
  root.add(heatsinks());
  root.add(rearEnd());
  for (const s of Object.values(sets)) root.add(s.build());
  shadowAll(root);
  root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  return optimize(root);
}
