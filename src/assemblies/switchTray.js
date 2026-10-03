// NVLink switch tray for GB200 NVL72 (1U MGX): two NVLink 5 switch chips, liquid cooled. Nine of
// these trays sit in the middle of the rack; each chip connects to every one of the 72 B200 GPUs
// over the copper cable cartridges at the rear (the "NVLink spine").
//
// Layout is an estimate from public photos and NVIDIA's NVL72 renders (no CAD).
// Same coordinate conventions as tray.js (mm; z = +430 front .. -430 rear; d = mm from front).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from '../parts/materials.js';
import { smallPackage, lpddrPackage, box } from '../parts/chips.js';
import { InstancedSet, unitBox, unitRounded, nvlinkConnector, ic } from '../parts/boardParts.js';
import { buildPcbTextures } from '../textures/pcb.js';
import {
  mesh, at, screwHead, labelTexture, chassis, modPcb, moduleBoard, frontPanel, hose, coldPlate, coupling, coolMats, fan,
  TRAY_W as W, TRAY_DEPTH as DEPTH, TRAY_WALL as WALL,
} from './tray.js';
import { tagPart, explode, shadowAll, rng } from '../lib/util.js';
import { optimize } from '../lib/optimize.js';

const Z = (d) => DEPTH / 2 - d;
const BB_D0 = 230, BB_D1 = 828;            // switch board extent (d)
const BB_Y = 6, BB_T = 2.4, BB_TOP = BB_Y + BB_T;
const SW_X = [-105, 105], SW_D = 500;      // the two switch chips
// rear connectors line up with the rack's four NVLink cable cartridges
export const SPINE_X = [-163.5, -57.5, 57.5, 163.5];

function board() {
  const M = materials();
  const g = new THREE.Group();
  const BW = W - 18, BL = BB_D1 - BB_D0;
  const zc = Z((BB_D0 + BB_D1) / 2);
  const lz = (d) => (BB_D0 + BB_D1) / 2 - d; // tray d -> board-local z (+ = towards the front)
  const silk = [], holes = [], pours = [], bundles = [];
  for (const x of SW_X) {
    silk.push({ type: 'corners', x, z: lz(SW_D), w: 72, d: 72, k: 6, lw: 0.4 });
    // 72 NVLink ports fan out from each chip to the rear connectors: dense differential bundles
    for (const cx of SPINE_X) bundles.push({ pts: [[x + (cx - x) * 0.15, lz(SW_D) - 36], [cx, lz(SW_D) - 120], [cx, lz(BB_D1) + 20]], n: 30, pitch: 0.5, width: 0.16 });
  }
  for (const x of [-200, -100, 0, 100, 200]) for (const dz of [-260, -100, 60, 220]) holes.push({ x, z: dz, r: 1.6, ring: 3.2 });
  pours.push({ x: 0, z: -BL / 2 + 40, w: BW - 20, d: 40 });
  silk.push({ type: 'text', x: 0, z: BL / 2 - 16, text: 'NVIDIA NVLINK SWITCH TRAY   699-2G580-0000-A00', size: 3, weight: 700 });
  const tex = buildPcbTextures({ W: BW, L: BL, ppm: 3.5, seed: 13, silk, holes, pours, bundles, viaCount: 7000 });
  const top = new THREE.MeshPhysicalMaterial({ map: tex.map, normalMap: tex.normal, normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: tex.rm, metalnessMap: tex.rm, roughness: 1, metalness: 1, clearcoat: 0.12, clearcoatRoughness: 0.5 });
  const pcb = mesh(new THREE.BoxGeometry(BW, BB_T, BL), [M.pcbEdge, M.pcbEdge, top, M.pcbEdge, M.pcbEdge, M.pcbEdge], 0, BB_Y + BB_T / 2, zc);
  tagPart(pcb, 'switch-board', 'Switch baseboard', 'Thick, low-loss board that routes 144 NVLink 5 ports (2 chips × 72) from the switch chips to the rear connectors.');
  g.add(pcb);
  for (const x of [-200, 0, 200]) for (const dz of [-260, 0, 260]) g.add(mesh(new THREE.CylinderGeometry(3, 3, BB_Y - WALL, 12), M.steelDark, x, WALL + (BB_Y - WALL) / 2, zc + dz));
  return g;
}

function switches(sets) {
  const g = new THREE.Group();
  SW_X.forEach((x, i) => {
    const sw = smallPackage({
      size: 66, die: 30, dieD: 34, seed: 120 + i, hue: [90, 170], id: 'nvswitch', label: `NVLink 5 switch chip ${i}`,
      info: 'NVLink Switch chip: 72 NVLink 5 ports at 100 GB/s each (7.2 TB/s). 18 of them, two per tray, connect all 72 GPUs into one NVLink domain. They also run SHARP in-network reductions for all-reduce.',
    });
    sw.position.set(x, BB_TOP, Z(SW_D));
    explode(sw, 0, 40, 0);
    g.add(sw);
    // VRM around each switch chip
    for (const s of [-1, 1]) for (let k = 0; k < 9; k++) sets.pstage.add(x + s * 44, BB_TOP, Z(SW_D) - 28 + k * 7, 5.6, 2.2, 4.4, Math.PI / 2);
    for (let k = 0; k < 30; k++) sets.mlcc.add(x - 33 + k * 2.2, BB_TOP, Z(SW_D) + 38, 1.6, 0.8, 0.8, 0);
  });
  return g;
}

function rearConnectors() {
  const g = new THREE.Group();
  for (const x of SPINE_X) {
    const c = nvlinkConnector();
    c.position.set(x, BB_TOP, Z(BB_D1) + 6);
    tagPart(c, 'switch-nvlink-conn', 'NVLink 5 backplane connector', 'Blind-mates into one of the rack\'s copper cable cartridges. Together the four connectors carry 144 NVLink 5 ports to all 18 compute trays.');
    g.add(c);
  }
  return g;
}

function mgmt() {
  const M = materials();
  const g = new THREE.Group();
  const w = 150, d = 140, y0 = 6;
  const zc = Z(40 + d / 2);
  g.add(mesh(box(w, 4, d), M.blackAnodized, 0, WALL, zc));
  const b = moduleBoard(w - 6, d - 8, modPcb());
  b.position.set(0, y0, zc);
  g.add(b);
  const top = y0 + 1.6;
  const cpu = smallPackage({ size: 30, die: 14, seed: 140, hue: [190, 240], id: 'switch-cpu', label: 'Switch management CPU', info: 'Small host processor running NVOS and the NVLink fabric manager agent for this tray.' });
  cpu.position.set(-30, top, zc + 10);
  g.add(cpu);
  for (const dz of [-20, 0, 20, 40]) g.add(at(lpddrPackage(10, 12), 4, top, zc - 10 + dz * 0.5 - 10));
  const bmc = ic(15, 1.4, 15, ['AST2600', 'A3']);
  bmc.position.set(40, top, zc + 20);
  tagPart(bmc, 'bmc', 'Baseboard management controller (BMC)', 'Out-of-band management for the switch tray: power, sensors, firmware.');
  g.add(bmc);
  g.add(at(ic(6, 1, 6, ['TPM', '2.0']), 40, top, zc - 20));
  tagPart(g, 'switch-mgmt', 'Switch management module', 'Management CPU, BMC and boot flash. The fabric manager (running here or on a compute node) configures routing across all 18 switch chips.');
  explode(g, 0, 60, 0);
  // two small fans behind it for the air-cooled management electronics
  const fans = new THREE.Group();
  for (const x of [-30, 30]) { const f = fan(36, 36, 28); f.position.set(x, WALL, Z(200)); fans.add(f); }
  tagPart(fans, 'fans', 'Fans', 'Small fans cool the management module and optics cages; the switch chips themselves are liquid-cooled.');
  explode(fans, 0, 60, 0);
  const out = new THREE.Group();
  out.add(g, fans);
  return out;
}

function powerAndRear() {
  const M = materials();
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const pdb = new THREE.Group();
    pdb.add(mesh(box(110, 3, 150), M.blackAnodized, s * 160, WALL, Z(120)));
    pdb.add(mesh(new RoundedBoxGeometry(60, 12, 90, 2, 1), M.blackAnodized, s * 160, WALL + 3, Z(120)));
    pdb.add(mesh(new THREE.PlaneGeometry(40, 9), new THREE.MeshStandardMaterial({ map: labelTexture(['IBC 54V→12V', '1.2 kW']), roughness: 0.6 }), s * 160, WALL + 15.05, Z(115)).rotateX(-Math.PI / 2));
    tagPart(pdb, 'pdb', 'Power distribution board', 'Converts busbar power for the switch chips\' VRMs and the management module.');
    explode(pdb, 0, 40, 0);
    g.add(pdb);
  }
  // rear UQDs + busbar clip (same blind-mate hardware as the compute trays)
  for (const [x, ring] of [[-206, '#2c6fd6'], [206, '#d63b2c']]) {
    const q = new THREE.Group();
    const body = mesh(new THREE.CylinderGeometry(7, 7, 46, 28), M.nickel);
    body.rotation.x = Math.PI / 2;
    q.add(body);
    const collar = mesh(new THREE.CylinderGeometry(7.6, 7.6, 5, 28), new THREE.MeshStandardMaterial({ color: ring, roughness: 0.45 }), 0, 0, 6);
    collar.rotation.x = Math.PI / 2;
    q.add(collar);
    q.position.set(x, 26, Z(DEPTH) - 8);
    tagPart(q, 'uqd', x < 0 ? 'Coolant supply quick-disconnect' : 'Coolant return quick-disconnect', 'Drip-free blind-mate coupling to the rack manifold.');
    g.add(q);
  }
  const bb = new THREE.Group();
  bb.add(mesh(new RoundedBoxGeometry(46, 24, 44, 2, 1.5), M.lcpBlack, 0, 12, 0));
  for (const x of [-12, 12]) bb.add(mesh(box(4, 18, 30), M.copper, x, 4, -18));
  bb.position.set(0, 14, Z(DEPTH) + 10);
  tagPart(bb, 'busbar', 'DC busbar connector', 'Clips onto the rack\'s vertical power busbar.');
  g.add(bb);
  explode(g, 0, 0, -40);
  return g;
}

function cooling() {
  const g = new THREE.Group();
  g.name = 'cooling';
  const L = coolMats();
  const plates = new THREE.Group();
  SW_X.forEach((x) => {
    const cp = coldPlate(62, 62, 9, { fittings: [[-18, -22], [18, -22]], base: L.plate, top: L.plateTop });
    cp.position.set(x, BB_TOP + 1.2 + 0.75, Z(SW_D));
    tagPart(cp, 'switch-coldplate', 'Switch cold plate', 'Liquid cold plate on an NVLink switch chip.');
    plates.add(cp);
  });
  g.add(plates);
  const hoses = new THREE.Group();
  const y = BB_TOP + 22, yTop = BB_TOP + 1.95 + 9 + 6;
  for (const x of SW_X) {
    const s = Math.sign(x);
    for (const [dx, side] of [[-18, -1], [18, 1]]) {
      const ux = side * 206;
      hoses.add(hose([[x + dx, yTop, Z(SW_D) - 22], [x + dx, y, Z(SW_D) - 40], [x + dx, y, Z(DEPTH) + 60], [ux * 0.9 + s * 0, y, Z(DEPTH) + 40], [ux, 26, Z(DEPTH) + 16]], 3.2));
    }
    hoses.add(coupling(x - 18, y, Z(SW_D) - 60, L));
  }
  tagPart(hoses, 'coolant-pipes', 'Coolant hoses', 'Hoses from the rear quick-disconnects to the two switch cold plates.');
  g.add(hoses);
  explode(g, 0, 150, 0);
  return g;
}

export function buildSwitchTray() {
  const M = materials();
  const root = new THREE.Group();
  root.name = 'switch-tray';
  root.add(chassis());
  root.add(frontPanel({
    label: ['NVLINK SWITCH TRAY', 'P/N 920-9K36F-00RE-7C0  S/N 1652024xxxxx'],
    ports: [[-40, 25, 15, 13, 1, 'rj45'], [-20, 25, 15, 13, 1, 'rj45'], [0, 28, 12, 5.5, 0.6, 'usb'], [0, 20, 12, 5.5, 0.6, 'usb'], [16, 25, 9, 6, 1.4, 'dp']],
    detail: false,
  }));
  root.add(board());
  const sets = {
    pstage: new InstancedSet(unitRounded(0.1), M.powerStage, { id: 'power-stage', label: 'Power stages', info: 'Smart power stages feeding a switch chip\'s core rail.' }),
    mlcc: new InstancedSet(unitBox(), M.mlcc, { id: 'mlcc', label: 'MLCC decoupling capacitors', info: '' }),
  };
  root.add(switches(sets));
  // decoupling clusters scattered over the board, kept clear of the chips and connectors
  const r = rng(77);
  for (let i = 0; i < 260; i++) {
    const x = r.range(-200, 200), d = r.range(BB_D0 + 10, BB_D1 - 40);
    if (SW_X.some((sx) => Math.abs(x - sx) < 52 && Math.abs(d - SW_D) < 52)) continue;
    const n = r.int(2, 7), rot = r.chance(0.5);
    for (let k = 0; k < n; k++) sets.mlcc.add(x + (rot ? k * 1.4 : 0), BB_TOP, Z(d) + (rot ? 0 : k * 1.4), 1.6, 0.8, 0.8, rot ? Math.PI / 2 : 0);
  }
  root.add(rearConnectors());
  root.add(mgmt());
  root.add(powerAndRear());
  root.add(cooling());
  for (const s of Object.values(sets)) root.add(s.build());
  shadowAll(root);
  root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  return optimize(root);
}

export { at, screwHead };
