// GB200 NVL72 rack: 18 compute trays (36 Grace + 72 B200) and 9 NVLink switch trays (18 switch
// chips) joined by the copper NVLink spine at the rear, with power shelves feeding a vertical DC
// busbar and a liquid manifold running to every tray.
//
// To keep the rack interactive, 25 trays are cheap closed "shells" that share geometry. One compute
// tray and one switch tray are full-detail clones of the tray views: the explode slider pulls them
// out like drawers so you can trace a GPU's NVLink path across the spine to the switch chips.
//
// Rack coordinates (mm): x across (rack 600 wide), z: +534 front .. -534 rear, y: up from the
// floor. Slot heights and the U layout are representative, not taken from a drawing.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from '../parts/materials.js';
import { box } from '../parts/chips.js';
import { frontPanel, mesh, labelTexture, pipe, TRAY_W, TRAY_DEPTH, TRAY_H } from './tray.js';
import { SPINE_X } from './switchTray.js';
import { tagPart, explode, shadowAll, makeCanvas, canvasTexture, rng } from '../lib/util.js';
import { optimize } from '../lib/optimize.js';

const U = 44.45;
const RW = 600, RD = 1068;
const BASE = 110;                     // casters + bottom frame
const TRAY_Z = RD / 2 - 40 - TRAY_DEPTH / 2; // tray centre z (front panel ~40 mm behind the frame front)
const REAR = TRAY_Z - TRAY_DEPTH / 2; // rear face of the trays

// Slot plan, bottom to top (1U each). C = compute tray, S = switch tray, P = power shelf.
const PLAN = [
  'blank', 'blank',
  'P', 'P', 'P', 'P',
  ...Array(8).fill('C'),
  ...Array(9).fill('S'),
  ...Array(10).fill('C'),
  'P', 'P', 'P', 'P',
  'mgmt', 'mgmt', 'blank', 'blank',
];
export const RACK_U = PLAN.length;
export const RACK_H = BASE + RACK_U * U + 70;
const slotY = (u) => BASE + u * U + (U - TRAY_H) / 2;
const DETAIL_C = PLAN.lastIndexOf('C') - 5; // a compute tray at chest height in the upper group
const DETAIL_S = PLAN.indexOf('S') + 4;     // the middle switch tray

// ---------------------------------------------------------------------------------------------
// materials
// ---------------------------------------------------------------------------------------------
let local = null;
function mats() {
  if (local) return local;
  const M = materials();
  // twinax cable loom: many thin copper/black jackets
  const c = makeCanvas(256, 64);
  const x = c.getContext('2d');
  const r = rng(5);
  for (let i = 0; i < 256; i += 2) { x.fillStyle = r() < 0.25 ? '#6b4a2c' : `hsl(30, 4%, ${8 + r() * 10}%)`; x.fillRect(i, 0, 2, 64); }
  const loom = canvasTexture(c, { repeat: true });
  // PSU face: fan grille + handle
  const p = makeCanvas(256, 160);
  const px = p.getContext('2d');
  px.fillStyle = '#1a1b1d'; px.fillRect(0, 0, 256, 160);
  px.fillStyle = '#060606'; px.beginPath(); px.arc(90, 80, 62, 0, 7); px.fill();
  px.strokeStyle = '#2c2d30'; px.lineWidth = 3;
  for (const rr of [20, 38, 56]) { px.beginPath(); px.arc(90, 80, rr, 0, 7); px.stroke(); }
  for (let a = 0; a < 6; a++) { px.beginPath(); px.moveTo(90, 80); px.lineTo(90 + Math.cos(a) * 60, 80 + Math.sin(a) * 60); px.stroke(); }
  px.fillStyle = '#76b900'; px.fillRect(190, 30, 14, 8);
  px.fillStyle = '#9a9da0'; px.font = '600 16px Helvetica'; px.fillText('5.5 kW', 172, 70);
  px.fillStyle = '#3a3b3e'; px.fillRect(176, 100, 60, 26);
  const psu = canvasTexture(p);
  // management switch face: rows of RJ45 ports
  const s = makeCanvas(512, 64);
  const sx = s.getContext('2d');
  sx.fillStyle = '#141516'; sx.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 24; i++) for (let j = 0; j < 2; j++) { sx.fillStyle = '#030303'; sx.fillRect(40 + i * 17, 10 + j * 24, 13, 18); sx.fillStyle = j ? '#76b900' : '#2a2a2a'; sx.fillRect(41 + i * 17, 10 + j * 24, 3, 2); }
  for (let i = 0; i < 4; i++) { sx.fillStyle = '#7a7d80'; sx.fillRect(470, 8 + i * 13, 30, 10); }
  const sw = canvasTexture(s);
  local = {
    loom: new THREE.MeshStandardMaterial({ map: loom, roughness: 0.55, metalness: 0.2 }),
    cable: new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.5, metalness: 0.15 }),
    psu: new THREE.MeshStandardMaterial({ map: psu, roughness: 0.6 }),
    sw: new THREE.MeshStandardMaterial({ map: sw, roughness: 0.6 }),
    blue: new THREE.MeshPhysicalMaterial({ color: '#2f6fd0', roughness: 0.35, clearcoat: 0.4 }),
    red: new THREE.MeshPhysicalMaterial({ color: '#c8302a', roughness: 0.35, clearcoat: 0.4 }),
    frame: new THREE.MeshPhysicalMaterial({ color: '#141516', metalness: 0.4, roughness: 0.5, clearcoat: 0.15 }),
    shell: new THREE.MeshStandardMaterial({ color: '#b9bdc1', metalness: 0.7, roughness: 0.4, map: M.steel.map, roughnessMap: M.steel.roughnessMap }),
  };
  return local;
}

// ---------------------------------------------------------------------------------------------
// Tray shells (LOD) - built once, cloned per slot
// ---------------------------------------------------------------------------------------------
function shell(kind) {
  const M = materials();
  const L = mats();
  const g = new THREE.Group();
  // closed 1U box (top cover on), front panel, and the rear blind-mate hardware
  g.add(mesh(box(TRAY_W - 2, TRAY_H - 1, TRAY_DEPTH - 6), L.shell, 0, 0.5, -3));
  if (kind === 'C') g.add(frontPanel({ detail: false }));
  else g.add(frontPanel({
    label: ['NVLINK SWITCH TRAY', 'P/N 920-9K36F-00RE-7C0'],
    ports: [[-40, 25, 15, 13, 1, 'rj45'], [-20, 25, 15, 13, 1, 'rj45'], [0, 28, 12, 5.5, 0.6, 'usb'], [0, 20, 12, 5.5, 0.6, 'usb'], [16, 25, 9, 6, 1.4, 'dp']],
    detail: false,
  }));
  for (const x of [-206, 206]) {
    const q = mesh(new THREE.CylinderGeometry(7, 7, 40, 16), M.nickel, x, 26, -TRAY_DEPTH / 2 - 14);
    q.rotation.x = Math.PI / 2;
    g.add(q);
  }
  g.add(mesh(new RoundedBoxGeometry(46, 24, 30, 2, 1.5), M.lcpBlack, 0, 14, -TRAY_DEPTH / 2 - 12));
  // strip front-panel tags so hover selects the whole tray
  g.traverse((o) => { delete o.userData.part; delete o.userData.explode; });
  if (kind === 'C') tagPart(g, 'compute-tray', 'Compute tray', '1U tray with 2 GB200 superchips: 2 Grace CPUs + 4 B200 GPUs, 4 ConnectX-7, 2 BlueField-3. 18 per rack.');
  else tagPart(g, 'switch-tray', 'NVLink switch tray', '1U tray with 2 NVLink 5 switch chips. Nine per rack, 18 chips, 130 TB/s of all-to-all GPU bandwidth.');
  shadowAll(g);
  return optimize(g);
}

function powerShelf() {
  const M = materials();
  const L = mats();
  const g = new THREE.Group();
  g.add(mesh(box(TRAY_W - 2, TRAY_H - 1, 700), L.frame, 0, 0.5, TRAY_DEPTH / 2 - 350));
  for (let i = 0; i < 6; i++) {
    const face = mesh(new THREE.PlaneGeometry(70, TRAY_H - 6), L.psu, -184 + i * 73.6, TRAY_H / 2, TRAY_DEPTH / 2 + 0.6);
    g.add(face);
  }
  g.add(mesh(box(TRAY_W + 4, TRAY_H, 3), M.blackAnodized, 0, 0, TRAY_DEPTH / 2 - 1.5));
  for (let i = 0; i < 6; i++) g.add(mesh(box(68, TRAY_H - 8, 2), M.blackPowder, -184 + i * 73.6, 4, TRAY_DEPTH / 2 + 0.2).translateY(0));
  g.traverse((o) => { o.userData = {}; });
  tagPart(g, 'power-shelf', 'Power shelf', '1U shelf of six hot-swap 5.5 kW power supplies (33 kW). Eight shelves, N+N redundant, convert facility AC to the 48-54 V DC busbar.');
  shadowAll(g);
  return optimize(g);
}

function mgmtSwitch() {
  const M = materials();
  const L = mats();
  const g = new THREE.Group();
  g.add(mesh(box(TRAY_W - 2, TRAY_H - 1, 420), L.frame, 0, 0.5, TRAY_DEPTH / 2 - 210));
  g.add(mesh(new THREE.PlaneGeometry(TRAY_W - 10, TRAY_H - 8), L.sw, 0, TRAY_H / 2, TRAY_DEPTH / 2 + 0.6));
  g.add(mesh(box(TRAY_W + 4, TRAY_H, 3), M.blackAnodized, 0, 0, TRAY_DEPTH / 2 - 1.5));
  tagPart(g, 'mgmt-switch', 'Management switch', 'Out-of-band Ethernet for every tray\'s BMC, and the network that the NVLink fabric manager uses to configure the switch trays.');
  shadowAll(g);
  return optimize(g);
}

function blank() {
  const L = mats();
  const g = new THREE.Group();
  g.add(mesh(box(TRAY_W + 4, U - 1, 2), L.frame, 0, 0, TRAY_DEPTH / 2 - 1));
  return g;
}

// ---------------------------------------------------------------------------------------------
// Rack frame, spine, busbar, manifolds
// ---------------------------------------------------------------------------------------------
function frame() {
  const M = materials();
  const L = mats();
  const g = new THREE.Group();
  const H = RACK_H;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(box(40, H - BASE + 20, 40), L.frame, sx * (RW / 2 - 20), BASE - 20, sz * (RD / 2 - 20)));
  for (const y of [BASE - 30, H - 40]) {
    for (const sz of [-1, 1]) g.add(mesh(box(RW, 40, 40), L.frame, 0, y, sz * (RD / 2 - 20)));
    for (const sx of [-1, 1]) g.add(mesh(box(40, 40, RD), L.frame, sx * (RW / 2 - 20), y, 0));
  }
  g.add(mesh(box(RW, 6, RD), L.frame, 0, H - 6, 0));
  // vertical mounting rails (front and rear) and tray guide rails
  for (const sx of [-1, 1]) {
    g.add(mesh(box(14, H - BASE - 40, 30), M.steelDark, sx * (TRAY_W / 2 + 12), BASE, RD / 2 - 55));
    g.add(mesh(box(14, H - BASE - 40, 30), M.steelDark, sx * (TRAY_W / 2 + 12), BASE, REAR + 10));
  }
  // casters + levelling feet
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const w = mesh(new THREE.CylinderGeometry(32, 32, 26, 20), M.rubberBlack, sx * (RW / 2 - 60), 32, sz * (RD / 2 - 70));
    w.rotation.z = Math.PI / 2;
    g.add(w);
    g.add(mesh(box(40, 30, 60), M.steelDark, sx * (RW / 2 - 60), 60, sz * (RD / 2 - 70)));
    g.add(mesh(new THREE.CylinderGeometry(18, 22, 10, 16), M.steel, sx * (RW / 2 - 30), 0, sz * (RD / 2 - 30)));
  }
  g.add(mesh(new THREE.PlaneGeometry(160, 22), new THREE.MeshStandardMaterial({ map: labelTexture(['NVIDIA GB200 NVL72', '72 B200 · 36 Grace · 18 NVLink switch chips'], { bg: '#141516', ink: '#c9f27d', size: 30 }), roughness: 0.6 }), 0, H - 40, RD / 2 + 0.5));
  tagPart(g, 'rack-frame', 'Rack (MGX)', 'Steel rack frame, about 600 × 1068 × 2236 mm and roughly 1.4 t when fully loaded. Trays slide in from the front and blind-mate at the rear.');
  return g;
}

/** The NVLink spine: four copper cable cartridges at the rear (~5,000 twinax cables in total). */
function spine() {
  const M = materials();
  const L = mats();
  const g = new THREE.Group();
  const cIdx = PLAN.map((k, u) => (k === 'C' ? u : -1)).filter((u) => u >= 0);
  const sIdx = PLAN.map((k, u) => (k === 'S' ? u : -1)).filter((u) => u >= 0);
  const y0 = slotY(cIdx[0]) - 10, y1 = slotY(cIdx[cIdx.length - 1]) + TRAY_H + 10;
  const zf = REAR - 22, depth = 74;
  SPINE_X.forEach((x, i) => {
    const cart = new THREE.Group();
    const bodyGeo = box(62, y1 - y0, depth);
    // stretch the loom texture along the length
    const uv = bodyGeo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 2, uv.getY(k) * ((y1 - y0) / 200));
    cart.add(mesh(bodyGeo, L.loom, x, y0, zf - depth / 2));
    // steel side frames
    for (const sx of [-1, 1]) cart.add(mesh(box(2, y1 - y0, depth + 4), M.steelDark, x + sx * 32, y0, zf - depth / 2));
    // a mating receptacle at every compute- and switch-tray slot
    for (const u of [...cIdx, ...sIdx]) cart.add(mesh(box(56, 26, 14), M.lcpBlack, x, slotY(u) + 6, zf + 6));
    // cable loops bulging out the back between compute and switch slots
    for (const u of cIdx) {
      const su = sIdx[(u + i) % sIdx.length];
      const a = new THREE.Vector3(x, slotY(u) + 18, zf - depth);
      const b = new THREE.Vector3(x, slotY(su) + 18, zf - depth);
      const bulge = 30 + Math.abs(u - su) * 2.2;
      const m = a.clone().lerp(b, 0.5).add(new THREE.Vector3((i % 2 ? 1 : -1) * 6, 0, -bulge));
      const curve = new THREE.CatmullRomCurve3([a, a.clone().add(new THREE.Vector3(0, 0, -12)), m, b.clone().add(new THREE.Vector3(0, 0, -12)), b]);
      cart.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 3.2, 8, false), L.cable));
    }
    cart.add(mesh(new THREE.PlaneGeometry(40, 14), new THREE.MeshStandardMaterial({ map: labelTexture([`NVLINK CARTRIDGE ${i + 1}`, 'DO NOT BEND <R30'], { bg: '#1b1c1e', ink: '#c9f27d', size: 30 }), roughness: 0.6 }), x, y1 - 30, zf - depth - 0.5).rotateY(Math.PI));
    g.add(cart);
  });
  tagPart(g, 'nvlink-spine', 'NVLink spine (cable cartridges)', 'Four copper cable cartridges, about 5,000 twinax cables and 2 miles of copper, connect every GPU to all 18 NVLink switch chips. 130 TB/s all-to-all, and no optics or retimers, which saves around 20 kW.');
  return g;
}

function busbar() {
  const M = materials();
  const g = new THREE.Group();
  const y0 = slotY(2) - 10, y1 = slotY(PLAN.lastIndexOf('P')) + TRAY_H + 10;
  const z = REAR - 18;
  for (const x of [-9, 9]) g.add(mesh(box(8, y1 - y0, 22), M.copper, x, y0, z));
  g.add(mesh(box(40, y1 - y0, 6), M.lcpBlack, 0, y0, z - 14));
  g.add(mesh(new THREE.PlaneGeometry(30, 40), new THREE.MeshStandardMaterial({ map: labelTexture(['⚡ 54 VDC', 'BUSBAR'], { bg: '#d9b400', ink: '#111', size: 34 }), roughness: 0.6 }), 0, (y0 + y1) / 2, z - 17.2).rotateY(Math.PI));
  tagPart(g, 'rack-busbar', 'DC busbar', 'Vertical copper busbar carrying 48-54 V DC from the power shelves to every tray. Trays clip on when they slide in. The rack draws about 120 kW.');
  return g;
}

function manifolds() {
  const L = mats();
  const M = materials();
  const g = new THREE.Group();
  const y0 = slotY(PLAN.indexOf('C')) - 40, y1 = slotY(PLAN.lastIndexOf('C')) + TRAY_H + 60;
  const z = REAR - 62;
  const taps = PLAN.map((k, u) => (k === 'C' || k === 'S' ? u : -1)).filter((u) => u >= 0);
  for (const [x, mat, name] of [[-206, L.blue, 'supply'], [206, L.red, 'return']]) {
    const m = new THREE.Group();
    m.add(mesh(new THREE.CylinderGeometry(20, 20, y1 - y0, 24), mat, x, y0 + (y1 - y0) / 2, z));
    for (const yEnd of [y0, y1]) m.add(mesh(new THREE.CylinderGeometry(22, 22, 8, 24), M.steelDark, x, yEnd, z));
    for (const u of taps) {
      const t = mesh(new THREE.CylinderGeometry(7.5, 7.5, 26, 14), M.nickel, x, slotY(u) + 26, z + 24);
      t.rotation.x = Math.PI / 2;
      m.add(t);
    }
    // feed lines down to the floor (to the coolant distribution unit)
    m.add(pipe([[x, y0, z], [x, 120, z], [x, 60, z - 60], [x, 60, -RD / 2 - 40]], 18, mat, 50));
    m.name = name;
    g.add(m);
  }
  tagPart(g, 'rack-manifold', 'Coolant manifolds', 'Vertical supply (blue) and return (red) manifolds with a drip-free quick-disconnect at every tray. Fed from a coolant distribution unit (CDU) with warm facility water.');
  return g;
}

// ---------------------------------------------------------------------------------------------
export function buildRack({ computeTray, switchTray }) {
  const root = new THREE.Group();
  root.name = 'nvl72-rack';
  root.add(frame());
  const shells = { C: shell('C'), S: shell('S'), P: powerShelf(), mgmt: mgmtSwitch(), blank: blank() };
  let cN = 0, sN = 0, pN = 0;
  PLAN.forEach((kind, u) => {
    const y = slotY(u);
    if (kind === 'C') cN++;
    if (kind === 'S') sN++;
    if (kind === 'P') pN++;
    if ((kind === 'C' && u === DETAIL_C) || (kind === 'S' && u === DETAIL_S)) {
      // full-detail drawer: a clone of the tray view's model, inner explode offsets removed
      const src = kind === 'C' ? computeTray : switchTray;
      const t = src.clone(true);
      t.traverse((o) => { delete o.userData.explode; });
      const drawer = new THREE.Group();
      drawer.name = 'drawer';
      drawer.add(t);
      drawer.position.set(0, y, TRAY_Z);
      if (kind === 'C') tagPart(drawer, 'compute-tray', `Compute tray ${cN} (open)`, 'Full-detail compute tray. Drag the explode slider to pull it out, then hover a B200 to trace its NVLink path through the spine to the switch trays.');
      else tagPart(drawer, 'switch-tray', `NVLink switch tray ${sN} (open)`, 'Full-detail NVLink switch tray. Drag the explode slider to pull it out.');
      explode(drawer, 0, 0, kind === 'C' ? 640 : 560);
      root.add(drawer);
      return;
    }
    const s = shells[kind].clone(true);
    s.position.set(0, kind === 'blank' ? y + TRAY_H / 2 - U / 2 + 1 : y, TRAY_Z);
    if (kind === 'C') s.userData.part = { ...s.userData.part, label: `Compute tray ${cN}` };
    if (kind === 'S') s.userData.part = { ...s.userData.part, label: `NVLink switch tray ${sN}` };
    if (kind === 'P') s.userData.part = { ...s.userData.part, label: `Power shelf ${pN}` };
    root.add(s);
  });
  root.add(spine());
  root.add(busbar());
  root.add(manifolds());
  shadowAll(root);
  root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  return optimize(root);
}
