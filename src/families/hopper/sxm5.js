// NVIDIA H100 / H200 SXM5 module, seen from the top.
//
// GH100 (814 mm², 80B transistors, TSMC 4N) on a CoWoS-S silicon interposer with six HBM sites,
// three down each long edge of the die. H100 SXM5 80 GB: five active HBM3 stacks (5,120-bit,
// 3.35 TB/s); H200: the same GH100 with all six sites holding HBM3e (141 GB, 4.8 TB/s). The package
// is bare-die: heatsinks press straight onto the silicon. The package sits on the SXM5 module PCB
// with its power delivery on both sides, and two mezzanine connectors underneath plug the module
// into the HGX baseboard (power, PCIe Gen5 and the 18 NVLink 4 links all pass through them).
//
// Sources: family SOURCES.md. NVIDIA publishes no mechanical drawings of SXM5, so the module,
// package, interposer and HBM footprints, VRM layout and connector positions are ESTIMATES scaled
// from press photos (see docs/2026-10-03-hopper-design.md). Die area and memory facts are sourced.
//
// Module coordinates (mm):
//   x: along the module's long edge (-MOD.L/2 .. +MOD.L/2); VRM banks at both x ends
//   z: across the module (-MOD.W/2 rear .. +MOD.W/2 front)
//   y: up; y = 0 is the underside of the mezzanine connectors (the baseboard surface in HGX).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from '../../parts/materials.js';
import { box, frame, topMesh, dieMaterial } from '../../parts/chips.js';
import { InstancedSet, unitBox, unitRounded, inductor, ic } from '../../parts/boardParts.js';
import { buildPcbTextures } from '../../textures/pcb.js';
import { substrateTexture, hbmTexture } from '../../textures/silicon.js';
import { markedTop } from '../../textures/surfaces.js';
import { Placer } from '../../assemblies/superchip.js';
import { rng, tagPart, explode, shadowAll } from '../../lib/util.js';
import { optimize } from '../../lib/optimize.js';
import { gh100Die, gh100Marked, hopperLidTexture } from './textures.js';

// ---- dimensions (mm). All estimates except where noted. ----
export const MOD = {
  L: 150, W: 104, T: 1.6,  // module PCB (estimate)
  MEZ_H: 5,                // mezzanine connector stack height (estimate)
};
export const MOD_TOP = MOD.MEZ_H + MOD.T; // module PCB top surface, above the baseboard
export const PKG = {
  SW: 70, SD: 60, ST: 1.6,  // package substrate (estimate)
  DIE_W: 26, DIE_D: 31.3,   // 814 mm² (sourced area; aspect estimated within the 26 x 33 mm reticle)
  IP_W: 54, IP_D: 37,       // CoWoS-S interposer (estimate)
  HBM_W: 11, HBM_D: 10,     // HBM stack footprint (estimate)
};
// die top above the package substrate base
export const PKG_H = PKG.ST + 0.7 + 0.78;
const HBM_X = PKG.DIE_W / 2 + 1.2 + PKG.HBM_W / 2;
const HBM_Z = [-10.9, 0, 10.9];

let shared = null;
function mats() {
  if (shared) return shared;
  const M = materials();
  shared = {
    sub: new THREE.MeshPhysicalMaterial({ map: substrateTexture({ w: 700, h: 600, color: '#1a1c1b', capColor: '#c4b07e', ring: 0.11, seed: 30 }), roughness: 0.45, metalness: 0.1, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    hbm: new THREE.MeshPhysicalMaterial({ map: hbmTexture(), roughness: 0.3, metalness: 0.15, clearcoat: 0.3, clearcoatRoughness: 0.2 }),
    hbmOff: new THREE.MeshPhysicalMaterial({ map: hbmTexture(), color: '#8e8a80', roughness: 0.45, metalness: 0.1 }),
    lidTop: new THREE.MeshPhysicalMaterial({ map: hopperLidTexture('H100 SXM5'), metalness: 1, roughness: 0.32, roughnessMap: M.nickel.roughnessMap }),
    mezzTop: new THREE.MeshStandardMaterial({ map: markedTop({ w: 128, h: 512, bg: '#101011', lines: [], dot: false }), roughness: 0.5 }),
  };
  return shared;
}

let dieLooks = null;
/** Two looks for the GH100 die: polished/marked backside or floorplan (key 'hopper-gh100'). */
export function gh100Looks() {
  if (!dieLooks) dieLooks = {
    marked: dieMaterial(gh100Marked(), { iridescence: 0.08, rough: 0.1 }),
    floorplan: dieMaterial(gh100Die(), { iridescence: 0.45 }),
  };
  return dieLooks;
}

/**
 * GH100 package: substrate, stiffener ring, CoWoS-S interposer, the GH100 die and six HBM sites.
 * variant 'h100': five active HBM3 stacks + one unused site; 'h200': six HBM3e stacks.
 */
export function gh100Package({ variant = 'h100', index = 0 } = {}) {
  // variant: 'h100' (5 of 6 HBM3 active) | 'h200' (6 HBM3e) | 'gh200' (6 HBM3 or HBM3e)
  const M = materials();
  const R = mats();
  const { SW, SD, ST, DIE_W, DIE_D, IP_W, IP_D, HBM_W, HBM_D } = PKG;
  const g = new THREE.Group();
  g.name = `gh100-pkg-${index}`;
  // substrate + stiffener ring are untagged: hovering them selects the whole GPU
  g.add(topMesh(SW, ST, SD, R.sub, M.pcbEdge));
  g.add(frame(SW - 0.6, SD - 0.6, 4.5, 1.6, M.stiffenerGold, ST));

  const ip = new THREE.Mesh(box(IP_W, 0.7, IP_D), M.interposer);
  ip.position.y = ST;
  tagPart(ip, 'cowos-interposer', 'CoWoS-S silicon interposer', 'A slab of passive silicon (TSMC CoWoS-S) that carries the thousands of short wires between the GH100 die and its six HBM sites. Each HBM stack has a 1,024-bit interface, far too wide to route through an organic substrate.');
  g.add(ip);
  const uf = new THREE.Mesh(box(IP_W + 1.6, 0.35, IP_D + 1.6), M.underfill);
  uf.position.y = ST - 0.05;
  g.add(uf);

  const top = ST + 0.7;
  const dieH = 0.78;
  const die = new THREE.Mesh(box(DIE_W, dieH, DIE_D), gh100Looks().marked);
  die.position.y = top;
  die.userData.looks = 'hopper-gh100';
  tagPart(die, 'h100-die', 'GH100 die', '814 mm² on TSMC 4N, 80 billion transistors. The full die has 8 GPCs and 144 SMs with 60 MB of L2; H100 SXM5 enables 132 SMs and 50 MB of L2. Fourth-generation tensor cores add FP8 and the Transformer Engine. Turn on the floorplan toggle to see the layout.');
  explode(die, 0, 8, 0);
  g.add(die);

  const hbms = new THREE.Group();
  let k = 0;
  for (const sx of [-1, 1])
    for (const z of HBM_Z) {
      const off = variant === 'h100' && sx > 0 && z > 0; // which site is unused is an estimate
      const h = new THREE.Mesh(box(HBM_W, dieH, HBM_D), off ? R.hbmOff : R.hbm);
      h.position.set(sx * HBM_X, top, z);
      if (off) tagPart(h, 'hbm-off', 'Unused HBM site', 'H100 SXM5 80 GB enables only five of the six HBM sites (a 5,120-bit bus) to improve yield. This sixth site is not used for memory. H200 fills all six sites with HBM3e. Which site is unused here is an estimate.');
      else if (variant === 'h200') tagPart(h, 'hbm3', `HBM3e stack ${k}`, 'HBM3e stack, one of six on H200: 141 GB in total at 4.8 TB/s.');
      else if (variant === 'gh200') tagPart(h, 'hbm3', `HBM stack ${k}`, 'One of six HBM stacks, all active on GH200: 96 GB HBM3 at 4 TB/s, or 144 GB HBM3e at 4.9 TB/s on the later version.');
      else tagPart(h, 'hbm3', `HBM3 stack ${k}`, '16 GB HBM3 stack. Five active stacks give H100 SXM5 80 GB at 3.35 TB/s over a 5,120-bit bus.');
      k++;
      hbms.add(h);
    }
  explode(hbms, 0, 12, 0);
  g.add(hbms);

  // Illustrative lid. H100/H200 SXM5 ship bare-die; this is for the lids toggle only.
  const lid = new THREE.Group();
  lid.name = 'gpu-lid';
  const lm = new THREE.Mesh(new RoundedBoxGeometry(SW - 4, 2.4, SD - 4, 3, 1.1), M.nickel);
  lm.position.y = ST + 1.6 + 1.2;
  lid.add(lm);
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(SW - 7, SD - 7), R.lidTop);
  mark.rotation.x = -Math.PI / 2;
  mark.position.y = ST + 1.6 + 2.41;
  lid.add(mark);
  tagPart(lid, 'gpu-lid', 'Heat spreader (illustration)', 'Shown for illustration only. H100 and H200 SXM5 ship without a lid: the heatsink or cold plate presses straight onto the bare die and HBM stacks. Turn the lids toggle off to see the silicon.');
  explode(lid, 0, 30, 0);
  g.add(lid);
  return g;
}

/** Underside mezzanine connector (two per module). */
function mezzConnector(i) {
  const M = materials();
  const R = mats();
  const g = new THREE.Group();
  const w = 12, d = 66, h = MOD.MEZ_H;
  g.add(new THREE.Mesh(box(w, h, d), [M.lcpBlack, M.lcpBlack, R.mezzTop, M.lcpBlack, M.lcpBlack, M.lcpBlack]));
  // metal guide posts at both ends
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, h + 1.5, 12), M.nickel);
    p.position.set(0, (h + 1.5) / 2 - 1.5, s * (d / 2 + 2.2));
    g.add(p);
  }
  // receptacle half on the baseboard side (gold contact lines visible from the side)
  g.add(new THREE.Mesh(box(w - 2, 0.6, d - 4), M.gold).translateY(0.3));
  tagPart(g, 'sxm-mezz', `Mezzanine connector ${i}`, 'High-density board-to-board connector on the underside of the module. Two of them carry everything: up to 700 W of power, PCIe Gen5 x16 to the host and the 18 NVLink 4 links to the NVSwitches. NVIDIA has not published the SXM5 pinout; on older SXM generations one connector carried power and PCIe and the other NVLink.');
  return g;
}

/**
 * The SXM5 module. variant: 'h100' | 'h200'. Returns a group with its own optimize() applied when
 * standalone (the HGX view clones it via ctx.model).
 */
export function buildSXM5({ variant = 'h100' } = {}) {
  const M = materials();
  const r = rng(530);
  const root = new THREE.Group();
  root.name = 'sxm5-module';
  const { L, W, T } = MOD;
  const P = new Placer(L, W);
  const pads = [], silk = [], holes = [], bundles = [], pours = [], viaKeep = [];
  const keep = (x, z, w, d) => { P.mark(x, z, w, d); viaKeep.push({ x, z, w, d }); };

  // everything that sits on the module PCB lifts off the mezzanine connectors together
  const board = new THREE.Group();
  board.position.y = MOD.MEZ_H;
  explode(board, 0, 16, 0);
  root.add(board);

  // ---- package ----
  keep(0, 0, PKG.SW + 2, PKG.SD + 2);
  const pkg = gh100Package({ variant });
  pkg.position.y = T + 0.25;
  tagPart(pkg, 'h100-gpu', variant === 'h200' ? 'H200 GPU' : 'H100 GPU',
    variant === 'h200'
      ? 'GH100 with six HBM3e stacks: 141 GB at 4.8 TB/s, 900 GB/s NVLink 4, up to 700 W.'
      : 'GH100 with five active HBM3 stacks: 80 GB at 3.35 TB/s, 900 GB/s NVLink 4 (18 links), PCIe Gen5 x16, up to 700 W.');
  explode(pkg, 0, 28, 0);
  board.add(pkg);
  silk.push({ type: 'corners', x: 0, z: 0, w: PKG.SW + 3, d: PKG.SD + 3, k: 5, lw: 0.3 });
  silk.push({ type: 'tri', x: -PKG.SW / 2 - 2, z: -PKG.SD / 2 - 2, s: 1.3 });

  // heatsink mounting holes (4 around the package, estimate) + 4 module corner holes
  const HOLES = [[-40, -45], [40, -45], [-40, 45], [40, 45], [-71, -48], [71, -48], [-71, 48], [71, 48]];
  for (const [x, z] of HOLES) { keep(x, z, 7, 7); holes.push({ x, z, r: 1.7, ring: 3.2 }); }
  P.mark(0, 47, 60, 8); // marking block (front edge)

  // ---- underside mezzanine connectors (estimate: under the two VRM banks) ----
  [-1, 1].forEach((s, i) => {
    const c = mezzConnector(i);
    c.position.set(s * (L / 2 - 20), 0, 0);
    root.add(c);
  });

  // ---- VRM banks at both x ends: inductors in two columns, power stages next to the package ----
  const sets = {
    pstage: new InstancedSet(unitRounded(0.1), M.powerStage, { id: 'power-stage', label: 'Smart power stages', info: 'Integrated MOSFET + driver stages, one per VRM phase. Together they deliver several hundred amps at under 1 V to the GPU core rail.' }),
    mlcc: new InstancedSet(unitBox(), M.mlcc, { id: 'mlcc', label: 'MLCC decoupling capacitors', info: 'Multilayer ceramic capacitors that keep the supply rails stable during nanosecond load steps.' }),
    mlccG: new InstancedSet(unitBox(), M.mlccGrey, { id: 'mlcc', label: 'MLCC decoupling capacitors', info: 'Multilayer ceramic capacitors that keep the supply rails stable during nanosecond load steps.' }),
    tant: new InstancedSet(unitRounded(0.08), M.tantalum, { id: 'polymer-cap', label: 'Polymer capacitors', info: 'Bulk capacitance on the VRM output rails.' }),
  };
  const inductors = new THREE.Group();
  let li = 0;
  for (const s of [-1, 1]) {
    for (const cx of [62, 52])
      for (let j = 0; j < 9; j++) {
        const z = -38 + j * 9.5;
        const x = s * cx;
        if (!P.tryPlace(x, z, 8.6, 8.6, 0.2)) continue;
        const l = inductor(8.4, 5.5, 8.4, `R${15 + (li % 3) * 5}`);
        l.position.set(x, T, z);
        tagPart(l, 'vrm-inductor', 'VRM output inductor', 'Each inductor belongs to one phase of the multiphase regulator that turns the 54 V board input (through intermediate rails) into the sub-1 V GPU core supply. The SXM5 module is dominated by power delivery for its 700 W GPU. The phase count here is an estimate.');
        inductors.add(l);
        pads.push({ x: x - 3.6, z, w: 1.6, d: 6.5 }, { x: x + 3.6, z, w: 1.6, d: 6.5 });
        li++;
      }
    for (let j = 0; j < 12; j++) {
      const z = -35 + j * 6.4, x = s * 44;
      if (P.tryPlace(x, z, 4.6, 5.8, 0.2)) { sets.pstage.add(x, T, z, 4.6, 2.0, 5.8, 0); pads.push({ x, z, w: 5.4, d: 6.2 }); }
    }
  }
  explode(inductors, 0, 10, 0);
  board.add(inductors);

  // tantalum row along the front and rear edges of each VRM bank
  for (const s of [-1, 1]) for (const z of [-46.5, 46.5]) for (let x = 46; x <= 66; x += 5) {
    if (P.tryPlace(s * x, z, 4.2, 3.2, 0.2)) sets.tant.add(s * x, T, z, 4.2, 1.8, 3.2, 0);
  }

  // VRM controllers, FRU EEPROM, sensor
  const parts = new THREE.Group();
  const addIC = (obj, x, z, w, d, id, label, info) => {
    if (!P.tryPlace(x, z, w, d, 0.6)) return;
    obj.position.set(x, T, z);
    tagPart(obj, id, label, info);
    parts.add(obj);
    pads.push({ x, z, w: w + 0.8, d: d + 0.8 });
    silk.push({ type: 'rect', x, z, w: w + 1.6, d: d + 1.6, lw: 0.15 });
  };
  addIC(ic(6, 1, 6, ['MP2', '891']), -30, -41, 6, 6, 'vrm-ctrl', 'Multiphase VRM controller', 'Digital controller that runs the power-stage phases for the GPU core rail and reports current and temperature.');
  addIC(ic(6, 1, 6, ['MP2', '891']), 30, -41, 6, 6, 'vrm-ctrl', 'Multiphase VRM controller', 'Digital controller that runs the power-stage phases for the GPU core rail and reports current and temperature.');
  addIC(ic(5, 1, 4, ['24C', '02']), -22, 41, 5, 4, 'sxm-fru', 'FRU EEPROM', 'Small memory with the module\'s identity: part number, serial number and board revision, read by the baseboard management controller.');
  addIC(ic(3, 0.9, 3, ['TMP']), 22, 41, 3, 3, 'sxm-temp', 'Board temperature sensor', 'Module temperature telemetry for the baseboard management controller.');
  board.add(parts);

  // ---- decoupling: MLCC rings around the package and fills between the parts ----
  const addMLCC = (x, z, size, rot, grey = false) => {
    const [l, w, h] = [[1.0, 0.5, 0.5], [1.6, 0.8, 0.8]][size];
    const fw = rot ? w : l, fd = rot ? l : w;
    if (!P.tryPlace(x, z, fw, fd, 0.18)) return;
    (grey ? sets.mlccG : sets.mlcc).add(x, T + 0.03, z, l, h, w, rot ? Math.PI / 2 : 0);
    pads.push({ x, z, w: fw + 0.2, d: fd + 0.2 });
  };
  const ring = (cx, cz, w, d, step, off) => {
    for (let x = cx - w / 2; x <= cx + w / 2; x += step) { addMLCC(x, cz - d / 2 - off, 0, 0); addMLCC(x, cz + d / 2 + off, 0, 0); }
    for (let z = cz - d / 2; z <= cz + d / 2; z += step) { addMLCC(cx - w / 2 - off, z, 0, 1); addMLCC(cx + w / 2 + off, z, 0, 1); }
  };
  ring(0, 0, PKG.SW, PKG.SD, 1.5, 1.4);
  ring(0, 0, PKG.SW + 4, PKG.SD + 4, 1.6, 1.4);
  for (let i = 0; i < 700; i++) {
    const x = r.range(-74, 74), z = r.range(-51, 51), rot = r.chance(0.5) ? 1 : 0;
    const k = r.int(1, 5);
    for (let j = 0; j < k; j++) addMLCC(rot ? x + j * 1.1 : x, rot ? z : z + j * 1.1, r.chance(0.7) ? 0 : 1, rot, r.chance(0.3));
  }

  // ---- PCB texture ----
  // NVLink and PCIe leave the package towards the mezzanine connectors (estimate)
  for (const s of [-1, 1]) {
    bundles.push({ pts: [[s * 30, -30], [s * 40, -48], [s * 56, -50], [s * 56, -52]], n: 14, pitch: 0.4, width: 0.13 });
    bundles.push({ pts: [[s * 30, 30], [s * 40, 49], [s * 56, 50], [s * 58, 50]], n: 14, pitch: 0.4, width: 0.13 });
    pours.push({ x: s * 56, z: 0, w: 34, d: 96 });
  }
  silk.push({ type: 'text', x: 0, z: 46, text: 'NVIDIA', size: 3.2, weight: 800 });
  silk.push({ type: 'text', x: 0, z: 50, text: variant === 'h200' ? 'H200 SXM5 141GB' : 'H100 SXM5 80GB', size: 1.4, weight: 600 });
  silk.push({ type: 'text', x: -L / 2 + 22, z: -W / 2 + 4, text: 'J1', size: 1.4 });
  silk.push({ type: 'text', x: L / 2 - 22, z: -W / 2 + 4, text: 'J2', size: 1.4 });
  for (let i = 0; i < 80; i++) {
    const x = r.range(-72, 72), z = r.range(-50, 50);
    if (!P.free(x, z, 3.2, 1.2)) continue;
    P.mark(x, z, 3.2, 1.2);
    silk.push({ type: 'text', x, z, text: `${r.pick(['C', 'C', 'R', 'L', 'TP', 'U'])}${r.int(1, 1999)}`, size: 0.8, weight: 500 });
  }
  const tex = buildPcbTextures({ W: L, L: W, ppm: 9, seed: 53, pads, silk, holes, bundles, pours, viaKeepouts: viaKeep, viaCount: 3500 });
  const topMat = new THREE.MeshPhysicalMaterial({ map: tex.map, normalMap: tex.normal, normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: tex.rm, metalnessMap: tex.rm, roughness: 1, metalness: 1, clearcoat: 0.12, clearcoatRoughness: 0.5 });
  const bottom = new THREE.MeshStandardMaterial({ color: '#24221f', roughness: 0.6 });
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(L, T, W), [M.pcbEdge, M.pcbEdge, topMat, bottom, M.pcbEdge, M.pcbEdge]);
  pcb.position.y = T / 2;
  tagPart(pcb, 'sxm5-pcb', 'SXM5 module PCB', 'The GPU\'s own circuit board: the package in the middle, power delivery at both ends, and two mezzanine connectors underneath instead of a card edge. Eight of these plug into an HGX baseboard.');
  board.add(pcb);
  // back-side bolster plate under the package (the heatsink screws pull against it; estimate)
  const bolster = new THREE.Mesh(box(88, 1.2, 98), M.steelDark);
  bolster.position.y = -1.2;
  board.add(bolster);

  for (const s of Object.values(sets)) if (s.items.length) board.add(s.build());
  shadowAll(root);
  root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  return optimize(root);
}
