// NVIDIA HGX Rubin NVL8 GPU tray: eight Rubin GPUs on one baseboard, all-to-all over on-board
// NVLink 6 switches, paired with a separate host CPU tray (Vera or x86) over PCIe Gen6.
//
// Layout follows the GTC 2026 photo of the NVL8 Rubin GPU tray
// (reference/images/nvl8-gpu-tray-and-cpu-tray-gtc2026-storagereview.jpg) and NVIDIA's HGX render:
// 2 columns x 4 rows of large black cold plates, a central coolant manifold spine (T-shaped at the
// rear) with chrome quick-disconnect couplings, braided hoses along each row, rear blind-mate UQDs.
// Same coordinate conventions as tray.js (mm; z = +430 front .. -430 rear; d = mm from front).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from '../parts/materials.js';
import { rubinGPU, smallPackage, box } from '../parts/chips.js';
import { InstancedSet, unitBox, unitRounded, ic } from '../parts/boardParts.js';
import { buildPcbTextures } from '../../../textures/pcb.js';
import {
  mesh, at, scaleUV, roundRectPath, pipe, screwHead, labelTexture, chassis, modPcb, moduleBoard,
  TRAY_W as W, TRAY_DEPTH as DEPTH, TRAY_H as H, TRAY_WALL as WALL,
} from './tray.js';
import { tagPart, explode, shadowAll, makeCanvas, canvasTexture } from '../../../lib/util.js';
import { optimize } from '../../../lib/optimize.js';

const Z = (d) => DEPTH / 2 - d;

const COL_X = 117.5;                       // GPU column centres (±x)
const ROW_D = [192.5, 317.5, 442.5, 567.5]; // GPU row centres (d)
const MOD_W = 184, MOD_D = 112;            // GPU module / cold plate footprint
const BB_D0 = 100, BB_D1 = 672;            // baseboard extent (d)
const BB_Y = 6, BB_T = 2.4, BB_TOP = BB_Y + BB_T;
const MOD_TOP = 12;                        // GPU module board top surface
const PLATE_Y = MOD_TOP + 0.25 + 1.8 + 1.5 + 0.05; // top of a lidless GPU stiffener
const PLATE_H = 12;
const SPINE_Y = 29.5, SPINE_H = 10, SPINE_W = 44;
const HOSE_Y = 34; // couplings + hoses run at cold-plate-top level, as in the photo

// ---------------------------------------------------------------------------------------------
// materials local to this tray
// ---------------------------------------------------------------------------------------------
let local = null;
function mats() {
  if (local) return local;
  const M = materials();
  // corrugated stainless hose: ridged normal map repeated along the tube length
  const c = makeCanvas(64, 64);
  const x = c.getContext('2d');
  for (let i = 0; i < 64; i++) {
    const v = 128 + Math.sin((i / 64) * Math.PI * 2 * 4) * 110;
    x.fillStyle = `rgb(${v},128,255)`;
    x.fillRect(i, 0, 1, 64);
  }
  const ridges = canvasTexture(c, { srgb: false, repeat: true });
  // cold-plate top decal (embossed NVIDIA wordmark)
  const d = makeCanvas(512, 320);
  const dx = d.getContext('2d');
  dx.fillStyle = '#17181a'; dx.fillRect(0, 0, 512, 320);
  dx.fillStyle = 'rgba(255,255,255,0.07)';
  dx.font = 'italic 800 34px Helvetica, Arial, sans-serif';
  dx.fillText('NVIDIA', 372, 290);
  local = {
    hose: new THREE.MeshPhysicalMaterial({ color: '#8c9093', metalness: 1, roughness: 0.35, normalMap: ridges, normalScale: new THREE.Vector2(1.2, 1.2) }),
    plateTop: new THREE.MeshPhysicalMaterial({ map: canvasTexture(d), metalness: 0.6, roughness: 0.45, roughnessMap: M.blackAnodized.roughnessMap, clearcoat: 0.1 }),
    chrome: new THREE.MeshPhysicalMaterial({ color: '#e6e8ea', metalness: 1, roughness: 0.12 }),
    red: new THREE.MeshStandardMaterial({ color: '#c8302a', roughness: 0.4 }),
    blue: new THREE.MeshStandardMaterial({ color: '#2f6fd0', roughness: 0.4 }),
  };
  return local;
}

function hose(points, radius = 3) {
  const m = pipe(points, radius, mats().hose, 8);
  const len = m.geometry.parameters.path.getLength();
  const uv = m.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (len / 2.2));
  return m;
}

/** Chrome quick-disconnect coupling lying along x, with a coloured identification band. */
function coupling(x0, x1, y, z, band) {
  const L = mats();
  const g = new THREE.Group();
  const len = Math.abs(x1 - x0);
  const cx = (x0 + x1) / 2;
  const body = mesh(new THREE.CylinderGeometry(3.6, 3.6, len, 20), L.chrome, cx, y, z);
  body.rotation.z = Math.PI / 2;
  g.add(body);
  for (const t of [0.22, 0.78]) {
    const nut = mesh(new THREE.CylinderGeometry(4.6, 4.6, 3, 6), L.chrome, x0 + (x1 - x0) * t, y, z);
    nut.rotation.z = Math.PI / 2;
    g.add(nut);
  }
  const ring = mesh(new THREE.CylinderGeometry(4.0, 4.0, 2.2, 20), band, cx, y, z);
  ring.rotation.z = Math.PI / 2;
  g.add(ring);
  return g;
}

// ---------------------------------------------------------------------------------------------
// GPU module (under each cold plate)
// ---------------------------------------------------------------------------------------------
function gpuModule(i, sets, gx, gz) {
  const M = materials();
  const g = new THREE.Group();
  // mezzanine connectors to the baseboard
  for (const sx of [-1, 1]) g.add(mesh(box(70, MOD_TOP - 1.6 - BB_TOP, 10), M.lcpBlack, gx + sx * 45, BB_TOP, gz));
  const board = moduleBoard(MOD_W - 2, MOD_D - 2, modPcb());
  board.position.set(gx, MOD_TOP - 1.6, gz);
  g.add(board);
  tagPart(g, 'gpu-module', `GPU module ${i}`, 'Carrier board for one Rubin GPU and its power delivery.');

  const gpu = rubinGPU({ index: i });
  gpu.rotation.y = Math.PI / 2; // package is portrait; cold plates are landscape
  gpu.position.set(gx, MOD_TOP + 0.25, gz);
  tagPart(gpu, 'rubin-gpu', `Rubin GPU ${i}`, 'Two compute dies + 8 HBM4 stacks.');
  explode(gpu, 0, 45, 0);
  g.add(gpu);

  // VRM: three columns of power stages each side of the package, MLCC banks between them
  for (const s of [-1, 1])
    for (let c = 0; c < 3; c++) {
      const x = gx + s * (60 + c * 6.6);
      for (let z = -50; z <= 50.1; z += 6.25) sets.pstage.add(x, MOD_TOP, gz + z, 5.6, 2.2, 4.4, Math.PI / 2);
    }
  for (const s of [-1, 1])
    for (let k = 0; k < 26; k++) {
      sets.mlcc.add(gx + s * 82.5, MOD_TOP, gz - 50 + k * 4, 1.6, 0.8, 0.8, Math.PI / 2);
      sets.mlcc.add(gx + s * 86, MOD_TOP, gz - 50 + k * 4 + 2, 1.0, 0.5, 0.5, Math.PI / 2);
    }
  const ctrl = ic(7, 1, 7, ['MP2', '898']);
  ctrl.position.set(gx + 78, MOD_TOP, gz + 50);
  tagPart(ctrl, 'vrm-ctrl', 'Multiphase VRM controller', 'Digital controller for this GPU\'s power stages.');
  g.add(ctrl);
  explode(g, 0, 70, 0);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Liquid cooling: 8 cold plates, couplings, hoses, manifold spine
// ---------------------------------------------------------------------------------------------
function cooling() {
  const M = materials();
  const L = mats();
  const g = new THREE.Group();
  g.name = 'cooling';
  const lift = new THREE.Group();
  lift.name = 'gpu-coldplate-lift';
  g.add(lift);

  ROW_D.forEach((d, r) => {
    for (const s of [-1, 1]) {
      const gx = s * COL_X, gz = Z(d);
      const plate = new THREE.Group();
      // main body (outer 150 mm) and the lower fitting step at the inner end, as in the photo
      const bodyW = MOD_W - 32;
      const body = mesh(new RoundedBoxGeometry(bodyW, PLATE_H, MOD_D, 3, 2), M.blackAnodized, gx + s * 16, PLATE_Y + PLATE_H / 2, gz);
      plate.add(body);
      const top = mesh(new THREE.PlaneGeometry(bodyW - 6, MOD_D - 6), L.plateTop, gx + s * 16, PLATE_Y + PLATE_H + 0.02, gz);
      top.rotation.x = -Math.PI / 2;
      plate.add(top);
      const step = mesh(new RoundedBoxGeometry(32, PLATE_H - 4, MOD_D - 10, 2, 2), M.blackAnodized, gx - s * (MOD_W / 2 - 16), PLATE_Y + (PLATE_H - 4) / 2, gz);
      plate.add(step);
      // fly-cut groove lines across the top
      for (let k = 0; k < 3; k++) plate.add(mesh(box(bodyW - 10, 0.4, 0.8), M.blackPowder, gx + s * 16, PLATE_Y + PLATE_H, gz - 30 + k * 30));
      // captive screws
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) plate.add(at(screwHead(M.screwBlack, 2.2, 1.6), gx + s * 16 + sx * (bodyW / 2 - 6), PLATE_Y + PLATE_H - 0.4, gz + sz * (MOD_D / 2 - 6)));
      // thermal interface
      plate.add(mesh(box(100, 0.3, 90), M.thermalPadGrey, gx, PLATE_Y - 0.3, gz));
      tagPart(plate, 'gpu-coldplate', `GPU cold plate ${r * 2 + (s > 0 ? 1 : 0)}`, 'Direct-to-chip liquid cold plate.');
      lift.add(plate);
    }
  });

  // couplings between each plate's inner step and the spine (supply = red, return = blue)
  const fittings = new THREE.Group();
  const hoses = new THREE.Group();
  ROW_D.forEach((d) => {
    const gz = Z(d);
    for (const s of [-1, 1]) {
      const xInner = s * (COL_X - MOD_W / 2 + 26); // couplings lie on top of the fitting step
      const xSpine = s * (SPINE_W / 2);
      fittings.add(coupling(xSpine, xInner, HOSE_Y, gz - 38, L.red));
      fittings.add(coupling(xSpine, xInner, HOSE_Y, gz + 38, L.blue));
      // supply hose: from the spine-side coupling, along the gap between rows, into the plate's outer end
      const zg = gz - MOD_D / 2 - 4;
      const xo = s * (COL_X + MOD_W / 2 - 14);
      hoses.add(hose([[xInner + s * 2, HOSE_Y, gz - 38], [xInner + s * 12, HOSE_Y, zg], [xo, HOSE_Y, zg], [xo + s * 6, HOSE_Y - 2, gz - 44]], 2.8));
    }
  });
  tagPart(fittings, 'qd-coupling', 'Quick-disconnect couplings', 'Drip-free couplings let a single GPU module and cold plate be swapped without draining the loop.');
  tagPart(hoses, 'coolant-pipes', 'Corrugated coolant hoses', 'Flexible stainless hoses carry supply coolant from the manifold to the far end of each cold plate.');
  g.add(fittings);
  g.add(hoses);

  // manifold spine + rear T header
  const spine = new THREE.Group();
  const sLen = Z(ROW_D[0] - 66) - Z(650);
  spine.add(mesh(new RoundedBoxGeometry(SPINE_W, SPINE_H, sLen, 2, 1.5), M.blackAnodized, 0, SPINE_Y + SPINE_H / 2, (Z(ROW_D[0] - 66) + Z(650)) / 2));
  spine.add(mesh(new RoundedBoxGeometry(W - 30, SPINE_H, 22, 2, 1.5), M.blackAnodized, 0, SPINE_Y + SPINE_H / 2, Z(660)));
  spine.add(mesh(new THREE.PlaneGeometry(30, 9), new THREE.MeshStandardMaterial({ map: labelTexture(['SUPPLY ▲  RETURN ▼', 'HGX NVL8 MANIFOLD'], { bg: '#18191b', ink: '#9a9da0', size: 30 }), roughness: 0.6 }), 0, SPINE_Y + SPINE_H + 0.02, Z(640)).rotateX(-Math.PI / 2));
  tagPart(spine, 'gpu-manifold', 'Coolant manifold spine', 'Splits rack coolant into eight parallel loops, one per GPU cold plate, and collects the return.');
  explode(spine, 0, 60, 0);
  g.add(spine);

  // T-header ends -> rear UQDs
  for (const s of [-1, 1]) g.add(hose([[s * (W / 2 - 22), SPINE_Y + 4, Z(660)], [s * (W / 2 - 22), 24, Z(700)], [s * (W / 2 - 22), 24, Z(DEPTH) + 30]], 4.5));
  explode(g, 0, 170, 0);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Baseboard, NVLink switches, host connectors, power, front/rear hardware
// ---------------------------------------------------------------------------------------------
function baseboard() {
  const M = materials();
  const g = new THREE.Group();
  const BW = W - 18, BL = BB_D1 - BB_D0;
  const zc = Z((BB_D0 + BB_D1) / 2);
  const silk = [], holes = [], pours = [], bundles = [];
  ROW_D.forEach((d) => {
    for (const s of [-1, 1]) silk.push({ type: 'rect', x: s * COL_X, z: (BB_D0 + BB_D1) / 2 - d, w: MOD_W + 2, d: MOD_D + 2, lw: 0.3 });
    // NVLink fan-out from each GPU row towards the centre switches
    bundles.push({ pts: [[-COL_X + 92, (BB_D0 + BB_D1) / 2 - d], [-22, (BB_D0 + BB_D1) / 2 - d]], n: 30, pitch: 0.45, width: 0.15 });
    bundles.push({ pts: [[22, (BB_D0 + BB_D1) / 2 - d], [COL_X - 92, (BB_D0 + BB_D1) / 2 - d]], n: 30, pitch: 0.45, width: 0.15 });
  });
  for (const x of [-200, -100, 0, 100, 200]) for (const dz of [-270, -130, 0, 130, 270]) holes.push({ x, z: dz, r: 1.6, ring: 3.2 });
  pours.push({ x: 0, z: BL / 2 - 30, w: BW - 20, d: 40 });
  silk.push({ type: 'text', x: 0, z: BL / 2 - 14, text: 'NVIDIA HGX RUBIN NVL8   699-2G700-0000-A00', size: 3, weight: 700 });
  const tex = buildPcbTextures({ W: BW, L: BL, ppm: 4, seed: 11, silk, holes, pours, bundles, viaCount: 9000 });
  const top = new THREE.MeshPhysicalMaterial({ map: tex.map, normalMap: tex.normal, normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: tex.rm, metalnessMap: tex.rm, roughness: 1, metalness: 1, clearcoat: 0.12, clearcoatRoughness: 0.5 });
  const pcb = mesh(new THREE.BoxGeometry(BW, BB_T, BL), [M.pcbEdge, M.pcbEdge, top, M.pcbEdge, M.pcbEdge, M.pcbEdge], 0, BB_Y + BB_T / 2, zc);
  tagPart(pcb, 'hgx-baseboard', 'HGX baseboard', 'Large multi-layer board wiring every GPU to the NVLink switches and to the host connectors.');
  g.add(pcb);
  for (const x of [-200, 0, 200]) for (const dz of [-270, 0, 270]) g.add(mesh(new THREE.CylinderGeometry(3, 3, BB_Y - WALL, 12), M.steelDark, x, WALL + (BB_Y - WALL) / 2, zc + dz));
  return g;
}

function nvlinkSwitches() {
  const M = materials();
  const g = new THREE.Group();
  const blocks = new THREE.Group();
  blocks.name = 'cooling'; // follows the cold-plate toggle
  tagPart(blocks, 'switch-coldplate', 'NVLink switch cold blocks', 'Small liquid cold plates on each NVLink 6 switch.');
  explode(blocks, 0, 120, 0);
  g.add(blocks);
  ROW_D.forEach((d, i) => {
    const sw = smallPackage({
      size: 40, die: 21, dieD: 24, seed: 90 + i, hue: [200, 300], id: 'nvswitch', label: `NVLink 6 switch ${i}`,
      info: 'All-to-all NVLink switch on the baseboard.',
    });
    sw.position.set(0, BB_TOP, Z(d));
    explode(sw, 0, 40, 0);
    g.add(sw);
    // small cold block on each switch (fed from the spine above)
    blocks.add(mesh(new RoundedBoxGeometry(36, 8, 36, 2, 1), M.copper, 0, BB_TOP + 1.2 + 0.8 + 4, Z(d)));
  });
  return g;
}

function hostConnectors(sets) {
  const M = materials();
  const g = new THREE.Group();
  const d = 114;
  for (const s of [-1, 1]) {
    const grp = new THREE.Group();
    for (let k = 0; k < 5; k++) {
      const x = s * (70 + k * 26);
      grp.add(mesh(box(18, 11, 16), M.lcpBlack, x, BB_TOP, Z(d)));
      grp.add(mesh(box(14, 0.3, 4), M.gold, x, BB_TOP + 11, Z(d) + 3));
      grp.add(mesh(box(14, 0.3, 4), M.gold, x, BB_TOP + 11, Z(d) - 3));
      grp.add(mesh(box(19, 2, 3), M.steelDark, x, BB_TOP + 11, Z(d) + 8));
    }
    tagPart(grp, 'host-conn', s < 0 ? 'Host connectors (left)' : 'Host connectors (right)', 'High-speed cable connectors carrying PCIe Gen6 to the separate CPU tray.');
    explode(grp, 0, 30, 0);
    g.add(grp);
    for (let k = 0; k < 40; k++) sets.mlcc.add(s * (60 + k * 3.3), BB_TOP, Z(d + 14), 1.0, 0.5, 0.5, 0);
  }
  const hmc = ic(21, 1.6, 21, ['HMC', 'FPGA', '2610']);
  hmc.position.set(0, BB_TOP, Z(114));
  tagPart(hmc, 'hgx-hmc', 'HGX management controller (HMC)', 'Baseboard management: GPU telemetry, firmware, NVLink fabric bring-up.');
  explode(hmc, 0, 30, 0);
  g.add(hmc);
  return g;
}

function frontEnd() {
  const M = materials();
  const g = new THREE.Group();
  // champagne bezel with finger-pull handles (as on the GTC tray)
  const PW = 452, T = 4;
  const shape = new THREE.Shape();
  roundRectPath(shape, 0, H / 2, PW, H, 1.5);
  for (const s of [-1, 1]) { const p = new THREE.Path(); roundRectPath(p, s * 108, 8, 150, 7.5, 3.6); shape.holes.push(p); }
  for (const [x, y, rr] of [[150, 30, 3.2], [165, 30, 1.0], [174, 30, 1.0]]) { const p = new THREE.Path(); p.absarc(x, y, rr, 0, Math.PI * 2, true); shape.holes.push(p); }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2 });
  scaleUV(geo, 0.004);
  g.add(mesh(geo, M.champagne, 0, 0, Z(0) - T));
  for (const s of [-1, 1]) g.add(mesh(box(150, 8, 18), M.rubberBlack, s * 108, 4, Z(0) - 12));
  const btn = mesh(new THREE.CylinderGeometry(2.8, 2.8, 2, 24), M.nickel, 150, 30, Z(0) - 0.5);
  btn.rotation.x = Math.PI / 2;
  g.add(btn);
  for (const [x, m] of [[165, M.ledGreen], [174, M.ledGreen]]) { const l = mesh(new THREE.CylinderGeometry(0.9, 0.9, 2, 12), m, x, 30, Z(0) - 0.6); l.rotation.x = Math.PI / 2; g.add(l); }
  g.add(mesh(new THREE.PlaneGeometry(56, 10), new THREE.MeshStandardMaterial({ map: labelTexture(['HGX RUBIN NVL8 GPU', 'P/N 935-24287-0000-000']), roughness: 0.6 }), -140, 32, Z(0) + 0.6));
  // solid front cover with a recessed panel (grey plate in the photo)
  const cover = new THREE.Group();
  cover.add(mesh(box(W - 8, 1.2, 92), M.steel, 0, H - 2.4, Z(6 + 46)));
  cover.add(mesh(box(W - 40, 0.6, 70), M.steelDark, 0, H - 1.2, Z(6 + 46)));
  for (const x of [-200, -100, 0, 100, 200]) cover.add(at(screwHead(M.screw, 2, 1), x, H - 1.2, Z(94)));
  g.add(cover);
  tagPart(g, 'nvl8-bezel', 'Front bezel & handles', 'Champagne MGX bezel with finger-pull handles; the tray slides out from the front of the rack.');
  explode(g, 0, 0, 80);
  return g;
}

function rearEnd() {
  const M = materials();
  const L = mats();
  const g = new THREE.Group();
  // rear crossbar / connector carrier
  g.add(mesh(box(W - 30, 10, 16), M.steelDark, 0, BB_TOP, Z(700)));
  // blind-mate UQD posts at the rear corners (protrude well past the rear, as in the photo)
  for (const [s, band] of [[-1, L.blue], [1, L.red]]) {
    const q = new THREE.Group();
    const body = mesh(new THREE.CylinderGeometry(7, 7, 70, 28), M.nickel);
    body.rotation.x = Math.PI / 2;
    q.add(body);
    const nose = mesh(new THREE.CylinderGeometry(5, 6, 10, 28), M.steelDark, 0, 0, -38);
    nose.rotation.x = Math.PI / 2;
    q.add(nose);
    const collar = mesh(new THREE.CylinderGeometry(7.8, 7.8, 5, 28), band, 0, 0, 18);
    collar.rotation.x = Math.PI / 2;
    q.add(collar);
    q.add(mesh(box(26, 30, 5), M.steel, 0, -15, 30));
    q.position.set(s * (W / 2 - 22), 24, Z(DEPTH) - 10);
    tagPart(q, 'uqd', s < 0 ? 'Coolant supply quick-disconnect' : 'Coolant return quick-disconnect', 'Drip-free blind-mate coupling to the rack manifold.');
    g.add(q);
  }
  // DC busbar clip
  const bb = new THREE.Group();
  bb.add(mesh(new RoundedBoxGeometry(46, 24, 44, 2, 1.5), M.lcpBlack, 0, 12, 0));
  for (const x of [-12, 12]) bb.add(mesh(box(4, 18, 30), M.copper, x, 4, -18));
  bb.position.set(0, 12, Z(DEPTH) + 10);
  tagPart(bb, 'busbar', 'DC busbar connector', 'Clips onto the rack\'s vertical power busbar.');
  g.add(bb);
  // power distribution under black covers
  const pdb = new THREE.Group();
  for (const x of [-140, -70, 70, 140]) {
    pdb.add(mesh(new RoundedBoxGeometry(56, 14, 90, 2, 1), M.blackAnodized, x, WALL + 7, Z(780)));
    pdb.add(mesh(new THREE.PlaneGeometry(30, 9), new THREE.MeshStandardMaterial({ map: labelTexture(['IBC 54V→12V', '2.4 kW']), roughness: 0.6 }), x, WALL + 14.05, Z(770)).rotateX(-Math.PI / 2));
  }
  pdb.add(mesh(box(330, 3, 8), M.copper, 0, WALL, Z(728)));
  tagPart(pdb, 'pdb', 'Power distribution', 'Bus converters stepping busbar power down for the GPU modules\' VRMs.');
  explode(pdb, 0, 40, 0);
  g.add(pdb);
  explode(g, 0, 0, -60);
  return g;
}

// ---------------------------------------------------------------------------------------------
export function buildNVL8Tray() {
  const M = materials();
  const root = new THREE.Group();
  root.name = 'nvl8-tray';
  root.add(chassis());
  root.add(frontEnd());
  root.add(baseboard());

  const sets = {
    pstage: new InstancedSet(unitRounded(0.1), M.powerStage, { id: 'power-stage', label: 'Power stages', info: 'Smart power stages delivering >1 kW per GPU at sub-1 V.' }),
    mlcc: new InstancedSet(unitBox(), M.mlcc, { id: 'mlcc', label: 'MLCC decoupling capacitors', info: '' }),
  };
  ROW_D.forEach((d, r) => {
    for (const s of [-1, 1]) root.add(gpuModule(r * 2 + (s > 0 ? 1 : 0), sets, s * COL_X, Z(d)));
  });
  root.add(nvlinkSwitches());
  root.add(hostConnectors(sets));
  root.add(cooling());
  root.add(rearEnd());
  for (const s of Object.values(sets)) root.add(s.build());

  shadowAll(root);
  root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  return optimize(root);
}
