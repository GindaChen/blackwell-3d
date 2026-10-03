// SXM2-style "mezzanine" GPU module, shared by Tesla V100 SXM2 (volta) and Tesla P100 SXM (pascal).
//
// Sources: see SOURCES.md. Sourced: module footprint about 140 x 78 mm (Wikipedia SXM article,
// "8 x 14 cm"), two mezzanine connectors underneath, 300 W, bare die + 4 HBM2 stacks on a CoWoS
// interposer, die areas (815 / 610 mm2), HBM2 KGSD footprint 7.75 x 11.87 mm. Estimates (no CAD or
// datasheet drawing found): die aspect ratios, interposer and substrate sizes, the position of the
// package on the board, VRM layout, connector size and position, board thickness.
//
// There is no lid: SXM2-era GPUs ship with the silicon exposed. A thin metal frame around the package
// sets the heatsink height and protects the die edges; the heatsink presses straight onto the dies.
//
// Module coordinates (mm):
//   x: across the module (-39 .. 39), z: along the module (-70 .. 70), +z = "front" end,
//   y: up, 0 = top surface of the module PCB. The mezzanine connectors hang below, bottom at y = -8.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from '../../parts/materials.js';
import { box, frame, topMesh, dieMaterial } from '../../parts/chips.js';
import { InstancedSet, unitBox, unitRounded, ic, standoff } from '../../parts/boardParts.js';
import { substrateTexture, hbmTexture } from '../../textures/silicon.js';
import { buildPcbTextures } from '../../textures/pcb.js';
import { makeCanvas, canvasTexture, rng, tagPart, explode, shadowAll } from '../../lib/util.js';
import { optimize } from '../../lib/optimize.js';
import { Placer } from '../../assemblies/superchip.js';

export const MOD = { W: 78, L: 140, T: 2.0, CONN_H: 6, CONN_W: 50, CONN_D: 10, CONN_Z: 34 };
export const MOD_BOTTOM = -(MOD.T + MOD.CONN_H); // -8: bottom of the mezzanine connectors
export const PKG_Z = -6; // package centre along the module (estimate)
const HBM_W = 11.87, HBM_D = 7.75; // JEDEC HBM2 KGSD footprint, long side along x here

// ------------------------------------------------------------------------------------------------
// Die looks (floorplan toggle)
// ------------------------------------------------------------------------------------------------
const lookCache = new Map();
/** { marked, floorplan } materials for a die, built from two texture factories. */
export function dieLooks(key, marked, floorplan) {
  if (!lookCache.has(key)) lookCache.set(key, {
    marked: dieMaterial(marked(), { iridescence: 0.1, rough: 0.12 }),
    floorplan: dieMaterial(floorplan(), { iridescence: 0.45 }),
  });
  return lookCache.get(key);
}

function hbmMat(capacityLine) {
  const key = `hbm-${capacityLine}`;
  if (!lookCache.has(key)) {
    const c = makeCanvas(256, 168);
    const x = c.getContext('2d');
    x.drawImage(hbmTexture().image, 0, 0, 256, 168);
    x.fillStyle = 'rgba(70,64,54,0.55)';
    x.font = '600 20px "Courier New", monospace';
    x.fillText('HBM2', 20, 60);
    x.fillText(capacityLine, 20, 92);
    lookCache.set(key, new THREE.MeshPhysicalMaterial({ map: canvasTexture(c), roughness: 0.3, metalness: 0.15, clearcoat: 0.3, clearcoatRoughness: 0.2 }));
  }
  return lookCache.get(key);
}

/**
 * GPU package: organic substrate, CoWoS silicon interposer, one big die, 4 HBM2 stacks (two at each
 * end along z). Sits on y = 0 (top of the module PCB). Returns { group, dieTop }.
 */
export function sxmPackage(spec) {
  const M = materials();
  const P = spec.pkg;
  const g = new THREE.Group();
  const sub = new THREE.MeshPhysicalMaterial({ map: substrateTexture({ w: 640, h: 700, color: '#1c1e1d', capColor: '#bfae80', ring: 0.11, seed: spec.seed }), roughness: 0.45, metalness: 0.1, clearcoat: 0.35, clearcoatRoughness: 0.3 });
  const ST = 1.3, BGA = 0.3;
  const s = topMesh(P.subW, ST, P.subD, sub, M.pcbEdge);
  s.position.y = BGA;
  g.add(s);
  // land-side capacitors on the substrate around the interposer
  const capY = BGA + ST;
  for (let i = 0; i < 14; i++) for (const sz of [-1, 1]) {
    const c = new THREE.Mesh(box(1.0, 0.45, 0.5), M.mlcc);
    c.position.set(-P.subW / 2 + 5 + i * ((P.subW - 10) / 13), capY, sz * (P.subD / 2 - 3));
    g.add(c);
  }
  const uf = new THREE.Mesh(box(P.ipW + 1.2, 0.3, P.ipD + 1.2), M.underfill);
  uf.position.y = capY;
  g.add(uf);
  const ip = new THREE.Mesh(box(P.ipW, 0.7, P.ipD), M.interposer);
  ip.position.y = capY + 0.05;
  tagPart(ip, `${spec.id}-interposer`, 'CoWoS silicon interposer', spec.interposerInfo);
  g.add(ip);
  const top = capY + 0.75;
  const dieH = 0.75;
  const looks = spec.dieLooks();
  const die = new THREE.Mesh(box(P.dieW, dieH, P.dieD), looks.marked);
  die.userData.looks = spec.looksKey;
  die.position.y = top;
  tagPart(die, `${spec.id}-die`, spec.dieLabel, spec.dieInfo);
  explode(die, 0, 10, 0);
  g.add(die);
  const hbms = new THREE.Group();
  const hm = hbmMat(spec.hbmLine);
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
    const h = new THREE.Mesh(box(HBM_W, dieH, HBM_D), hm);
    h.position.set(sx * (HBM_W / 2 + 0.6), top, sz * (P.dieD / 2 + 1.0 + HBM_D / 2));
    tagPart(h, 'hbm2', 'HBM2 memory stack', spec.hbmInfo);
    hbms.add(h);
  }
  explode(hbms, 0, 18, 0);
  g.add(hbms);
  return { group: g, dieTop: top + dieH };
}

/**
 * The module: PCB with VRMs, package, frame, two mezzanine connectors underneath.
 * spec: { id, seed, pkg:{subW,subD,ipW,ipD,dieW,dieD}, looksKey, dieLooks, dieLabel, dieInfo, hbmLine, hbmInfo,
 *         interposerInfo, gpuId, gpuLabel, gpuInfo, moduleLabel, moduleInfo, silk:[lines], nvlinkInfo, pcieInfo }
 */
export function buildSxmModule(spec) {
  const M = materials();
  const r = rng(spec.seed);
  const root = new THREE.Group();
  root.name = 'superchip'; // scopes 'superchip' connection links to this module (see annotator.js)
  const { W, L, T } = MOD;
  const Pl = new Placer(W, L);
  const pads = [], silk = [], holes = [], bundles = [], pours = [], viaKeep = [];
  const keep = (x, z, w, d) => { Pl.mark(x, z, w, d); viaKeep.push({ x, z, w, d }); };

  // ---- the board group (PCB + everything soldered to it) explodes as one layer ----
  const boardG = new THREE.Group();
  const P = spec.pkg;
  const FR_W = P.subW + 10, FR_D = P.subD + 10; // frame outer size
  keep(0, PKG_Z, FR_W + 1, FR_D + 1);
  const HOLES = [[-34, -65], [34, -65], [-34, 65], [34, 65]];
  for (const [x, z] of HOLES) { keep(x, z, 8, 8); holes.push({ x, z, r: 1.6, ring: 3.2 }); }
  silk.push({ type: 'corners', x: 0, z: PKG_Z, w: FR_W + 2.5, d: FR_D + 2.5, k: 5, lw: 0.3 });

  const sets = {
    pstage: new InstancedSet(unitRounded(0.1), M.powerStage, { id: 'power-stage', label: 'Power stages', info: spec.powerInfo }),
    tant: new InstancedSet(unitRounded(0.08), M.tantalum, { id: 'polymer-cap', label: 'Polymer capacitors', info: 'Bulk capacitance on the regulator outputs, for sudden load steps.' }),
    mlcc: new InstancedSet(unitBox(), M.mlcc, { id: 'mlcc', label: 'MLCC decoupling capacitors', info: 'Ceramic capacitors that absorb fast current spikes next to the GPU.' }),
    res: new InstancedSet(unitBox(), M.moldBlack, { id: 'resistor', label: 'Thick-film resistors', info: 'Pull-ups, current sense and termination.' }),
  };
  // Chokes are plain meshes in one tagged group per bank (hover selects the bank; tours can point at it).
  const chokeGeo = unitRounded(0.14);
  const bank = (label) => {
    const g = new THREE.Group();
    tagPart(g, 'vrm-inductor', label, 'Output chokes of the multiphase regulator that turns the 12 V input into the GPU\'s ~1 V rails.');
    boardG.add(g);
    return { add: (x, y, z, w, h, d, rot) => { const m = new THREE.Mesh(chokeGeo, M.ferrite); m.position.set(x, y, z); m.scale.set(w, h, d); m.rotation.y = rot; g.add(m); } };
  };
  sets.ind = bank('Core VRM chokes');
  const indRear = bank('Memory / I/O VRM chokes');
  const block = (set, x, z, w, d, h, rot = 0, padOut = 0.5) => {
    const fw = rot ? d : w, fd = rot ? w : d;
    if (!Pl.tryPlace(x, z, fw, fd, 0.25)) return false;
    set.add(x, 0.05, z, w, h, d, rot ? Math.PI / 2 : 0);
    pads.push({ x, z, w: fw + (rot ? 0.4 : padOut * 2), d: fd + (rot ? padOut * 2 : 0.4) });
    return true;
  };
  // Core VRM (estimate): a bank of chokes + power stages at the +z end, a smaller bank at the -z end.
  const zFront = PKG_Z + FR_D / 2; // ~ +28
  for (let i = 0; i < 8; i++) block(sets.ind, -31.5 + i * 9, zFront + 9, 7.6, 7.6, 4.8);
  for (let i = 0; i < 10; i++) block(sets.pstage, -32.4 + i * 7.2, zFront + 18.5, 5, 6, 1.0, 0, 0.3);
  for (let i = 0; i < 12; i++) block(sets.tant, -33 + i * 6, zFront + 25, 4.4, 3.4, 1.8);
  for (let i = 0; i < 6; i++) block(sets.ind, -22.5 + i * 9, zFront + 33, 7.6, 7.6, 4.8);
  const zRear = PKG_Z - FR_D / 2; // ~ -40
  for (let i = 0; i < 6; i++) block(indRear, -22.5 + i * 9, zRear - 6.5, 7.6, 7.6, 4.8);
  for (let i = 0; i < 8; i++) block(sets.pstage, -25.2 + i * 7.2, zRear - 14.5, 5, 6, 1.0, 0, 0.3);
  for (let i = 0; i < 8; i++) block(sets.tant, -21 + i * 6, zRear - 20.5, 4.4, 3.4, 1.8);
  // side columns of power stages along the frame (HBM / IO rails)
  for (const s of [-1, 1]) for (let z = PKG_Z - 26; z <= PKG_Z + 26; z += 6.6) block(sets.pstage, s * 36.2, z, 4.4, 5.2, 1.0, 1, 0.3);

  // controllers and small ICs
  const icAt = (obj, x, z, w, d, id, label, info) => {
    if (!Pl.tryPlace(x, z, w, d, 0.5)) return;
    obj.position.set(x, 0.05, z);
    tagPart(obj, id, label, info);
    boardG.add(obj);
    pads.push({ x, z, w: w + 0.8, d: d + 0.8 });
    silk.push({ type: 'rect', x, z, w: w + 1.4, d: d + 1.4, pin1: true, lw: 0.14 });
  };
  icAt(ic(5, 0.9, 5, ['uP9', '511']), 26, zFront + 41, 5, 5, 'vrm-ctrl', 'Multiphase VRM controller', 'Digital PWM controller for the core-rail power stages.');
  icAt(ic(4, 0.9, 4, ['uP1', '666']), -28, zRear - 24.5, 4, 4, 'vrm-ctrl', 'Multiphase VRM controller', 'Controller for the memory and I/O rails.');
  icAt(ic(3, 0.8, 2.5, ['24C']), 0, zFront + 41, 3, 2.5, 'fru-eeprom', 'FRU / InfoROM EEPROM', 'Holds the board serial number, power limits and ECC error counts (the InfoROM).');
  icAt(ic(5, 1.0, 4, ['25Q', '40']), -12, zFront + 41, 5, 4, 'flash', 'SPI flash (VBIOS)', 'Firmware the GPU runs at power-on.');

  // MLCC rings around the frame and sprinkle
  const addMLCC = (x, z, rot) => {
    const [l, w, h] = [1.0, 0.5, 0.5];
    const fw = rot ? w : l, fd = rot ? l : w;
    if (!Pl.tryPlace(x, z, fw, fd, 0.15)) return;
    sets.mlcc.add(x, 0.04, z, l, h, w, rot ? Math.PI / 2 : 0);
    pads.push({ x, z, w: fw * 1.1, d: fd * 1.1 });
  };
  for (let x = -FR_W / 2; x <= FR_W / 2; x += 1.4) { addMLCC(x, PKG_Z - FR_D / 2 - 1.4, 0); addMLCC(x, PKG_Z + FR_D / 2 + 1.4, 0); }
  for (let z = PKG_Z - FR_D / 2; z <= PKG_Z + FR_D / 2; z += 1.4) { addMLCC(-FR_W / 2 - 1.2, z, 1); addMLCC(FR_W / 2 + 1.2, z, 1); }
  for (let i = 0; i < 700; i++) {
    const x = r.range(-38, 38), z = r.range(-69, 69), rot = r.chance(0.5);
    if (r.chance(0.2)) {
      const fw = rot ? 0.5 : 1.0, fd = rot ? 1.0 : 0.5;
      if (Pl.tryPlace(x, z, fw, fd, 0.15)) { sets.res.add(x, 0.04, z, 1.0, 0.35, 0.5, rot ? Math.PI / 2 : 0); pads.push({ x, z, w: fw * 1.1, d: fd * 1.1 }); }
    } else addMLCC(x, z, rot);
  }
  for (const [x, z] of HOLES) { const so = standoff(); so.position.set(x, 0, z); so.scale.set(0.8, 0.6, 0.8); boardG.add(so); }

  // silkscreen
  spec.silk.forEach((t, i) => silk.push({ type: 'text', x: 0, z: -58 + i * 3.2, text: t, size: i ? 1.4 : 2.4, weight: i ? 600 : 800 }));
  for (let i = 0; i < 60; i++) {
    const x = r.range(-36, 36), z = r.range(-66, 66);
    if (!Pl.free(x, z, 3.2, 1.2)) continue;
    Pl.mark(x, z, 3.2, 1.2);
    silk.push({ type: 'text', x, z, text: `${r.pick(['C', 'C', 'R', 'L', 'TP', 'Q'])}${r.int(1, 999)}`, size: 0.8, weight: 500 });
  }
  pours.push({ x: 0, z: zFront + 20, w: 74, d: 34 }, { x: 0, z: zRear - 14, w: 60, d: 26 });
  for (const s of [-1, 1]) bundles.push({ pts: [[s * 20, PKG_Z], [s * 30, PKG_Z + 10], [s * 30, MOD.CONN_Z]], n: 12, pitch: 0.4, width: 0.13 });
  bundles.push({ pts: [[-18, PKG_Z - 20], [-18, -MOD.CONN_Z]], n: 16, pitch: 0.4, width: 0.13 });
  bundles.push({ pts: [[18, PKG_Z - 20], [18, -MOD.CONN_Z]], n: 16, pitch: 0.4, width: 0.13 });

  const tex = buildPcbTextures({ W, L, ppm: 9, seed: spec.seed + 3, pads, silk, holes, bundles, pours, viaKeepouts: viaKeep, viaCount: 2200 });
  const topMat = new THREE.MeshPhysicalMaterial({ map: tex.map, normalMap: tex.normal, normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: tex.rm, metalnessMap: tex.rm, roughness: 1, metalness: 1, clearcoat: 0.12, clearcoatRoughness: 0.5 });
  const bottom = new THREE.MeshStandardMaterial({ color: '#24221f', roughness: 0.6 });
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(W, T, L), [M.pcbEdge, M.pcbEdge, topMat, bottom, M.pcbEdge, M.pcbEdge]);
  pcb.position.y = -T / 2;
  boardG.add(pcb);
  for (const s of Object.values(sets)) if (s.items?.length) boardG.add(s.build());
  explode(boardG, 0, 10, 0);
  root.add(boardG);

  // ---- mezzanine connectors underneath (do not move: the rest explodes up off them) ----
  const conns = [
    [MOD.CONN_Z, `${spec.id}-mezz-pwr`, 'Mezzanine connector (power + PCIe)', spec.pcieInfo],
    [-MOD.CONN_Z, `${spec.id}-mezz-nvl`, 'Mezzanine connector (NVLink)', spec.nvlinkInfo],
  ];
  for (const [z, id, label, info] of conns) {
    const c = new THREE.Group();
    c.add(new THREE.Mesh(new RoundedBoxGeometry(MOD.CONN_W, MOD.CONN_H, MOD.CONN_D, 2, 0.6), M.lcpBlack).translateY(MOD_BOTTOM + MOD.CONN_H / 2));
    // metal guide posts
    for (const s of [-1, 1]) c.add(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, MOD.CONN_H + 1.5, 12), M.nickel).translateX(s * (MOD.CONN_W / 2 + 2)).translateY(MOD_BOTTOM + MOD.CONN_H / 2 - 0.5));
    // contact field on the mating face (bottom)
    const field = new THREE.Mesh(new THREE.PlaneGeometry(MOD.CONN_W - 4, MOD.CONN_D - 3), M.goldPad);
    field.rotation.x = Math.PI / 2;
    field.position.y = MOD_BOTTOM - 0.01;
    c.add(field);
    c.position.z = z;
    tagPart(c, id, label, info);
    root.add(c);
  }

  // ---- frame (stiffener / heatsink stop) ----
  const fr = new THREE.Group();
  fr.add(frame(FR_W, FR_D, 3.0, 1.8, M.steelDark, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    fr.add(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.0, 16), M.nickel).translateX(sx * (FR_W / 2 - 1.5)).translateY(1.5).translateZ(sz * (FR_D / 2 - 1.5)));
  }
  fr.position.z = PKG_Z;
  tagPart(fr, `${spec.id}-frame`, 'Package frame (no lid)', 'A thin metal frame around the package. It sets the heatsink height and keeps the heatsink from tilting onto the die edges. There is no lid: the heatsink presses straight onto the bare die and HBM2 stacks through thermal paste.');
  explode(fr, 0, 20, 0);
  root.add(fr);

  // ---- GPU package ----
  const { group: pkg, dieTop } = sxmPackage(spec);
  pkg.position.z = PKG_Z;
  tagPart(pkg, spec.gpuId, spec.gpuLabel, spec.gpuInfo);
  explode(pkg, 0, 36, 0);
  root.add(pkg);
  root.userData.dieTop = dieTop;

  tagPart(root, 'sxm-module', spec.moduleLabel, spec.moduleInfo);
  shadowAll(root);
  root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  return optimize(root);
}
