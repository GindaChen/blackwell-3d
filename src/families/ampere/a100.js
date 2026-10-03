// NVIDIA A100 SXM4 module: one GA100 GPU on a CoWoS-S interposer with six HBM2/HBM2e sites (five active),
// on a bare-die package with a stiffener ring, soldered to the SXM4 carrier board. Two mezzanine connectors
// underneath carry power, PCIe Gen4 and the 12 NVLink 3 links into the HGX baseboard.
//
// Sourced: die area 826 mm², 54.2B transistors, TSMC N7, 6 HBM stacks with 5 enabled (5120-bit), 400 W
// (NVIDIA Ampere whitepaper / A100 datasheet, see SOURCES.md). Everything in millimetres below is an estimate
// scaled from public photos of the module (no drawings are published):
//   die 25.6 x 32.3, HBM2 KGSD ~7.75 x 11.87 (JEDEC outline), interposer ~53 x 35, substrate 66 x 58,
//   SXM4 board 100 x 150 x 1.6, mezzanine connectors 72 x 11 x 5.
// Module coordinates: x across the board (-50..50), z along it (-75 rear .. +75 front), y up with the board
// top surface at y = 0. The mezzanine connectors hang below, down to y = -6.6.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from '../../parts/materials.js';
import { box, frame, topMesh, dieMaterial } from '../../parts/chips.js';
import { InstancedSet, unitBox, unitRounded, ic, inductor, standoff } from '../../parts/boardParts.js';
import { substrateTexture, hbmTexture } from '../../textures/silicon.js';
import { buildPcbTextures } from '../../textures/pcb.js';
import { tagPart, explode, shadowAll } from '../../lib/util.js';
import { optimize } from '../../lib/optimize.js';
import { ga100Floorplan, ga100Marked, a100LidTexture } from './textures.js';

export const A100 = {
  DIE_W: 25.6, DIE_D: 32.3,            // 826 mm² (aspect estimated)
  HBM_W: 11.87, HBM_D: 7.75,           // HBM2/HBM2e KGSD footprint
  SW: 66, SD: 58, ST: 1.6,             // package substrate (estimate)
  BOARD_W: 100, BOARD_L: 150, BOARD_T: 1.6,
  MEZZ_H: 5,
};
// height of the bare-die top above the board surface (package seat 0.25 + substrate + interposer + die)
export const A100_DIE_TOP = 0.25 + A100.ST + 0.7 + 0.78;
// overall depth below the board top (board + mezzanine connectors)
export const A100_UNDER = A100.BOARD_T + A100.MEZZ_H;

let looks = null;
/** Two looks for the GA100: laser-marked backside or floorplan. */
export function ga100Looks() {
  if (!looks) looks = {
    marked: dieMaterial(ga100Marked(), { iridescence: 0.08, rough: 0.1 }),
    floorplan: dieMaterial(ga100Floorplan(), { iridescence: 0.5 }),
  };
  return looks;
}

let pkgMats = null;
function mats() {
  if (pkgMats) return pkgMats;
  pkgMats = {
    sub: new THREE.MeshPhysicalMaterial({ map: substrateTexture({ w: 700, h: 620, color: '#1c1e1d', seed: 40 }), roughness: 0.45, metalness: 0.1, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    hbm: new THREE.MeshPhysicalMaterial({ map: hbmTexture(), roughness: 0.3, metalness: 0.15, clearcoat: 0.3, clearcoatRoughness: 0.2 }),
    hbmOff: new THREE.MeshPhysicalMaterial({ map: hbmTexture(), color: '#b8b2a6', roughness: 0.38, metalness: 0.12, clearcoat: 0.2 }),
    lidTop: new THREE.MeshPhysicalMaterial({ map: a100LidTexture(), metalness: 1, roughness: 0.32, roughnessMap: materials().nickel.roughnessMap }),
  };
  return pkgMats;
}

/** GA100 package: substrate, stiffener, CoWoS-S interposer, die, 6 HBM sites, optional lid. Sits on y=0. */
export function a100Package({ index = 0 } = {}) {
  const M = materials();
  const R = mats();
  const { SW, SD, ST, DIE_W, DIE_D, HBM_W, HBM_D } = A100;
  const g = new THREE.Group();
  g.name = `a100-gpu-${index}`;
  g.add(topMesh(SW, ST, SD, R.sub, M.pcbEdge));
  g.add(frame(SW - 1, SD - 1, 5, 1.4, M.stiffenerGold, ST));

  const ipW = DIE_W + 2 * (0.8 + HBM_W) + 2.4, ipD = DIE_D + 2.4;
  const ip = new THREE.Mesh(box(ipW, 0.7, ipD), M.interposer);
  ip.position.y = ST;
  tagPart(ip, 'a100-interposer', 'CoWoS-S interposer', 'TSMC CoWoS-S: one passive silicon interposer (about 53 × 35 mm, an estimate) that wires the GA100 to its six HBM sites with thousands of short traces.');
  g.add(ip);
  const uf = new THREE.Mesh(box(ipW + 1.4, 0.35, ipD + 1.4), M.underfill);
  uf.position.y = ST - 0.05;
  g.add(uf);

  const top = ST + 0.7, dieH = 0.78;
  const die = new THREE.Mesh(box(DIE_W, dieH, DIE_D), ga100Looks().marked);
  die.name = 'ga100-die';
  die.userData.looks = 'ampere-ga100';
  die.position.y = top;
  tagPart(die, 'ga100-die', 'GA100 die', '826 mm², 54.2B transistors, TSMC N7. The full die has 8 GPCs and 128 SMs; A100 enables 108 SMs and 40 MB of the 48 MB L2.');
  explode(die, 0, 10, 0);
  g.add(die);

  const hbms = new THREE.Group();
  const hx = DIE_W / 2 + 0.8 + HBM_W / 2;
  let k = 0;
  for (const sx of [-1, 1])
    for (const z of [-(HBM_D + 1), 0, HBM_D + 1]) {
      const off = sx > 0 && z > 0; // one of the six sites is not enabled on A100
      const h = new THREE.Mesh(box(HBM_W, dieH, HBM_D), off ? R.hbmOff : R.hbm);
      h.position.set(sx * hx, top, z);
      if (off) tagPart(h, 'a100-hbm-off', 'Sixth HBM site (not enabled)', 'GA100 has six HBM2 sites and 12 memory controllers, but A100 enables five stacks (10 controllers, 5120-bit). The sixth position keeps the package balanced and helps yield.');
      else tagPart(h, 'a100-hbm', `HBM2e stack ${k++}`, 'One active stack: 8 GB (A100 40GB, HBM2) or 16 GB (A100 80GB, HBM2e). Five together give 1.55 or 2.04 TB/s.');
      hbms.add(h);
    }
  explode(hbms, 0, 16, 0);
  g.add(hbms);

  // Lid: illustration only (production SXM4 parts are bare-die). Top sits 2.6 mm above the die.
  const lid = new THREE.Group();
  lid.name = 'gpu-lid';
  const dieTop = top + dieH;
  const lidH = dieTop + 2.6 - (ST + 1.4);
  const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(SW - 4, lidH, SD - 4, 3, 1.1), M.nickel);
  lidMesh.position.y = ST + 1.4 + lidH / 2;
  lid.add(lidMesh);
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(SW - 8, SD - 8), R.lidTop);
  mark.rotation.x = -Math.PI / 2;
  mark.position.y = dieTop + 2.61;
  lid.add(mark);
  tagPart(lid, 'a100-lid', 'Heat spreader (illustration)', 'Shown for illustration only. The A100 SXM4 package is bare-die: the heatsink presses straight onto the GA100 and HBM through a thermal pad. Turn lids off to see the silicon.');
  explode(lid, 0, 34, 0);
  g.add(lid);
  return g;
}

/** SXM4 mezzanine connector (black LCP body, two dense contact fields), hanging under the board. */
function mezzanine(label) {
  const M = materials();
  const g = new THREE.Group();
  const { MEZZ_H: H, BOARD_T: T } = A100;
  g.add(new THREE.Mesh(box(72, H, 11), M.lcpBlack).translateY(-T - H));
  for (const sx of [-1, 1]) g.add(new THREE.Mesh(box(30, 0.3, 6), M.gold).translateX(sx * 17).translateY(-T - H - 0.05));
  for (const sx of [-1, 1]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, H + 1, 12), M.nickel).translateX(sx * 38.5).translateY(-T - (H + 1) / 2));
  tagPart(g, 'sxm4-mezz', label, 'High-density mezzanine connector under the module. The two connectors carry 48 V/12 V power in, plus PCIe Gen4 x16 and all 12 NVLink 3 links out to the baseboard.');
  explode(g, 0, -8, 0);
  return g;
}

export function buildA100() {
  const M = materials();
  const root = new THREE.Group();
  root.name = 'a100-module';
  const { BOARD_W: BW, BOARD_L: BL, BOARD_T: BT, SW, SD } = A100;
  const pads = [], silk = [], holes = [], bundles = [], pours = [], viaKeep = [];

  const pkg = a100Package();
  pkg.position.set(0, 0.25, 0);
  tagPart(pkg, 'a100-gpu', 'A100 GPU', 'GA100 with 5 active HBM stacks: 40 GB HBM2 (1.55 TB/s) or 80 GB HBM2e (2.04 TB/s). 312 TFLOPS FP16 tensor (624 with sparsity), 12 NVLink 3 links (600 GB/s), PCIe Gen4, 400 W.');
  explode(pkg, 0, 40, 0);
  root.add(pkg);
  viaKeep.push({ x: 0, z: 0, w: SW + 2, d: SD + 2 });
  silk.push({ type: 'corners', x: 0, z: 0, w: SW + 3, d: SD + 3, k: 5, lw: 0.35 });
  silk.push({ type: 'text', x: -SW / 2 + 3, z: -SD / 2 - 3, text: 'U1', size: 1.8 });

  const sets = {
    pstage: new InstancedSet(unitRounded(0.1), M.powerStage, { id: 'power-stage', label: 'Power stages', info: 'Smart power stages of the GPU core-rail VRM. Together they deliver up to 400 W at under 1 V.' }),
    mlcc: new InstancedSet(unitBox(), M.mlcc, { id: 'mlcc', label: 'MLCC decoupling capacitors', info: 'Ceramic capacitors that keep the GPU rails steady during fast load changes.' }),
    tant: new InstancedSet(unitRounded(0.08), M.tantalum, { id: 'polymer-cap', label: 'Polymer capacitors', info: 'Bulk capacitance on the VRM output rails.' }),
    res: new InstancedSet(unitBox(), M.moldBlack, { id: 'resistor', label: 'Resistors', info: 'Current-sense, pull-up and termination resistors.' }),
  };
  const ps = (x, z, rot) => { sets.pstage.add(x, 0.05, z, 5.4, 2.0, 4.4, rot ? Math.PI / 2 : 0); pads.push({ x, z, w: rot ? 4.8 : 6.4, d: rot ? 6.4 : 4.8 }); };

  // VRM columns either side of the package (x = +-38) and banks at both ends of the board
  for (const sx of [-1, 1]) for (let z = -24; z <= 24.1; z += 6) ps(sx * 38.5, z, 1);
  for (const z of [-36, -42.5, 36, 42.5]) for (let x = -38.5; x <= 38.6; x += 7) ps(x, z, 0);
  const inds = [];
  for (const z of [-53, 53]) for (let x = -40; x <= 40.1; x += 10) inds.push([x, z]);
  for (const sx of [-1, 1]) for (const z of [-20, -10, 0, 10, 20]) inds.push([sx * 45.5, z]);
  const indGroup = new THREE.Group();
  inds.forEach(([x, z], i) => {
    const big = Math.abs(z) > 40;
    const l = inductor(big ? 8.5 : 6, big ? 5.5 : 4.2, big ? 8.5 : 8, big ? 'R22' : 'R15');
    l.position.set(x, 0, z);
    indGroup.add(l);
    pads.push({ x: x - (big ? 3.5 : 2.5), z, w: 1.6, d: big ? 6 : 5.5 }, { x: x + (big ? 3.5 : 2.5), z, w: 1.6, d: big ? 6 : 5.5 });
    if (i % 3 === 0 && big) silk.push({ type: 'text', x, z: z + (z > 0 ? 6.2 : -6.2), text: `L${i + 1}`, size: 1.0 });
  });
  tagPart(indGroup, 'vrm-inductor', 'VRM output inductors', 'Output inductors of the multiphase regulators that turn the board input into the GPU core, HBM and I/O rails.');
  explode(indGroup, 0, 14, 0);
  root.add(indGroup);
  for (const z of [-61.5, 61.5]) for (let x = -39; x <= 39.1; x += 6.5) { sets.tant.add(x, 0.05, z, 4.2, 1.8, 3.2, 0); pads.push({ x, z, w: 5, d: 3.6 }); }

  // MLCC ring hugging the package (0402) and denser banks under the HBM sides
  for (let x = -SW / 2; x <= SW / 2; x += 1.6) for (const s of [-1, 1]) { const z = s * (SD / 2 + 1.8); sets.mlcc.add(x, 0.04, z, 1.0, 0.5, 0.5, 0); pads.push({ x, z, w: 1.2, d: 0.6 }); }
  for (let z = -SD / 2 + 1; z <= SD / 2 - 1; z += 1.5) for (const s of [-1, 1]) { const x = s * (SW / 2 + 1.6); sets.mlcc.add(x, 0.04, z, 1.0, 0.5, 0.5, Math.PI / 2); pads.push({ x, z, w: 0.6, d: 1.2 }); }
  for (let x = -44; x <= 44; x += 2.2) for (const z of [-31.5, 31.5]) if (Math.abs(x) > 34) { sets.mlcc.add(x, 0.04, z, 1.6, 0.8, 0.8, 0); pads.push({ x, z, w: 1.8, d: 0.9 }); }
  for (let x = -40; x <= 40; x += 2.4) for (const z of [-68, 68]) { sets.mlcc.add(x, 0.04, z, 1.6, 0.8, 0.8, 0); pads.push({ x, z, w: 1.8, d: 0.9 }); }
  for (let x = -38; x <= 38; x += 3.1) for (const z of [-47.5, 47.5]) { sets.res.add(x, 0.04, z, 1.0, 0.35, 0.5, 0); pads.push({ x, z, w: 1.2, d: 0.6 }); }

  // controller ICs, EEPROM, temperature sensor
  const misc = [
    [ic(6, 1, 6, ['MP2', '888A']), -44, 63, 'vrm-ctrl', 'Multiphase VRM controller', 'Digital controller that runs the GPU core-rail power stages and reports telemetry over PMBus.'],
    [ic(6, 1, 6, ['MP2', '888A']), 44, -63, 'vrm-ctrl', 'Multiphase VRM controller', 'Digital controller for the HBM and I/O rails.'],
    [ic(4, 0.9, 3, ['24C', '02']), 44, 63.5, 'module-eeprom', 'Module EEPROM', 'Holds the module\'s identity (board ID, serial, power limits) for the baseboard management controller.'],
    [ic(3, 0.9, 3, ['TMP']), -44, -63.5, 'module-temp', 'Board temperature sensor', 'Board thermal telemetry alongside the GPU\'s own on-die sensors.'],
  ];
  for (const [o, x, z, id, label, info] of misc) {
    o.position.set(x, 0.05, z);
    tagPart(o, id, label, info);
    root.add(o);
    silk.push({ type: 'rect', x, z, w: 7, d: 7, pin1: true, lw: 0.15 });
  }

  // corner mounting holes (heatsink screws pass through into the baseboard)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const s = standoff();
    s.position.set(sx * 45, 0, sz * 70.5);
    s.scale.set(0.7, 0.6, 0.7);
    root.add(s);
    holes.push({ x: sx * 45, z: sz * 70.5, r: 1.4, ring: 2.6 });
  }

  // mezzanine connectors underneath
  [-1, 1].forEach((sz, i) => {
    const m = mezzanine(`SXM4 mezzanine connector ${i}`);
    m.position.z = sz * 52;
    root.add(m);
  });

  silk.push({ type: 'text', x: 0, z: 58.5, text: 'NVIDIA  A100-SXM4   699-2G506-0210', size: 1.5, weight: 700 });
  silk.push({ type: 'text', x: 0, z: -58.5, text: 'PG506  REV A   94V-0', size: 1.2, weight: 600 });
  for (const sx of [-1, 1]) {
    bundles.push({ pts: [[sx * 20, -29], [sx * 20, -50], [sx * 26, -72]], n: 14, pitch: 0.42, width: 0.14 });
    bundles.push({ pts: [[sx * 20, 29], [sx * 20, 50], [sx * 26, 72]], n: 14, pitch: 0.42, width: 0.14 });
    pours.push({ x: sx * 38, z: 0, w: 16, d: 60 });
  }
  pours.push({ x: 0, z: -40, w: 92, d: 16 }, { x: 0, z: 40, w: 92, d: 16 });

  const tex = buildPcbTextures({ W: BW, L: BL, ppm: 10, seed: 21, pads, silk, holes, bundles, pours, viaKeepouts: viaKeep, viaCount: 1800 });
  const topMat = new THREE.MeshPhysicalMaterial({ map: tex.map, normalMap: tex.normal, normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: tex.rm, metalnessMap: tex.rm, roughness: 1, metalness: 1, clearcoat: 0.12, clearcoatRoughness: 0.5 });
  const bottom = new THREE.MeshStandardMaterial({ color: '#24221f', roughness: 0.6 });
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(BW, BT, BL), [M.pcbEdge, M.pcbEdge, topMat, bottom, M.pcbEdge, M.pcbEdge]);
  pcb.position.y = -BT / 2;
  tagPart(pcb, 'sxm4-pcb', 'SXM4 module board', 'The carrier that turns the GPU into a socketless module: power delivery on top, two mezzanine connectors below, no PCIe card edge and no cables.');
  root.add(pcb);

  for (const s of Object.values(sets)) if (s.items.length) root.add(s.build());
  shadowAll(root);
  root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  return optimize(root);
}
