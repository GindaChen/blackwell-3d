// GB200 NVL72 compute tray (1U MGX): two Grace Blackwell superchips, 4x ConnectX-7, 2x
// BlueField-3, E1.S storage, liquid cold plates on the CPUs/GPUs and a small fan wall for the
// air-cooled front I/O. Unlike Vera Rubin's cable-free midplane, GB200 links the superchips to the
// front I/O with internal twinax cables.
//
// Layout scaled from public photos of GB200 NVL72 compute trays (no CAD; estimates). Tray
// coordinates (mm):
//   x: across the 19" tray (outer 448 mm), z: +430 = front panel .. -430 = rear (rack spine side),
//   y: up, 0 = underside of the chassis pan.
// Distances below are often written as d = mm from the front face; z = 430 - d.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from '../parts/materials.js';
import { box, smallPackage, lpddrPackage } from '../parts/chips.js';
import { ic } from '../parts/boardParts.js';
import { perforation } from '../textures/surfaces.js';
import { BOARD } from './superchip.js';
import { tagPart, explode, shadowAll, rng, makeCanvas, canvasTexture } from '../lib/util.js';
import { optimize } from '../lib/optimize.js';

const W = 448, DEPTH = 860, H = 43.5, WALL = 1.2;
const Z = (d) => DEPTH / 2 - d;
const SC_D = 440;          // superchip front edge (d)
const SC_X = [-110.5, 110.5];
const BOARD_TOP = 8;

// ----------------------------------------------------------------------------------------------
// helpers
// ----------------------------------------------------------------------------------------------
function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}
function at(obj, x, y, z) {
  obj.position.set(x, y, z);
  return obj;
}
function scaleUV(geo, s) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * s, uv.getY(i) * s);
  return geo;
}
function rectPath(path, x, y, w, h) {
  path.moveTo(x - w / 2, y - h / 2);
  path.lineTo(x + w / 2, y - h / 2);
  path.lineTo(x + w / 2, y + h / 2);
  path.lineTo(x - w / 2, y + h / 2);
  path.lineTo(x - w / 2, y - h / 2);
  return path;
}
function roundRectPath(path, x, y, w, h, r) {
  const x0 = x - w / 2, y0 = y - h / 2;
  path.moveTo(x0 + r, y0);
  path.lineTo(x0 + w - r, y0);
  path.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  path.lineTo(x0 + w, y0 + h - r);
  path.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  path.lineTo(x0 + r, y0 + h);
  path.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  path.lineTo(x0, y0 + r);
  path.quadraticCurveTo(x0, y0, x0 + r, y0);
  return path;
}
/** Tube along a polyline with rounded bends. */
function pipe(points, radius, mat, bend = 10) {
  const path = new THREE.CurvePath();
  const P = points.map((p) => new THREE.Vector3(...p));
  let prev = P[0].clone();
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i - 1], b = P[i], c = P[i + 1];
    const r = Math.min(bend, a.distanceTo(b) / 2, b.distanceTo(c) / 2);
    const p1 = b.clone().add(a.clone().sub(b).normalize().multiplyScalar(r));
    const p2 = b.clone().add(c.clone().sub(b).normalize().multiplyScalar(r));
    path.add(new THREE.LineCurve3(prev, p1));
    path.add(new THREE.QuadraticBezierCurve3(p1, b, p2));
    prev = p2;
  }
  path.add(new THREE.LineCurve3(prev, P[P.length - 1]));
  const segs = Math.max(24, Math.round(path.getLength() / 3));
  return new THREE.Mesh(new THREE.TubeGeometry(path, segs, radius, 14, false), mat);
}
function screwHead(mat, r = 2.2, h = 1.2) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(r, r * 1.05, h, 20), mat, 0, h / 2, 0));
  const slot = mesh(box(r * 1.1, 0.3, r * 0.35), materials().screwBlack, 0, h - 0.15, 0);
  slot.rotation.y = 0.6;
  g.add(slot);
  const slot2 = slot.clone();
  slot2.rotation.y = 0.6 + Math.PI / 2;
  g.add(slot2);
  return g;
}
function labelTexture(lines, { w = 512, h = 160, bg = '#e9e7e1', ink = '#1b1b1b', size = 36 } = {}) {
  const c = makeCanvas(w, h);
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.fillStyle = ink;
  x.textBaseline = 'top';
  lines.forEach((l, i) => {
    x.font = `${i === 0 ? 700 : 500} ${i === 0 ? size : size * 0.62}px Helvetica, Arial, sans-serif`;
    x.fillText(l, 18, 14 + i * size * 0.95);
  });
  // fake barcode
  for (let i = 0; i < 70; i++) {
    const bw = 1 + ((i * 7919) % 4);
    x.fillRect(w - 200 + i * 2.6, h - 50, bw, 36);
  }
  return canvasTexture(c);
}

// ----------------------------------------------------------------------------------------------
// Chassis
// ----------------------------------------------------------------------------------------------
function chassis() {
  const M = materials();
  const g = new THREE.Group();
  g.add(mesh(scaleUV(box(W - 2, WALL, DEPTH), 0.004), M.steel, 0, 0, 0));
  for (const s of [-1, 1]) {
    const wall = mesh(box(WALL, H - 2, DEPTH), M.steel, s * (W / 2 - 1.6), 0, 0);
    g.add(wall);
    // top return flange
    g.add(mesh(box(9, WALL, DEPTH), M.steel, s * (W / 2 - 6), H - 2 - WALL, 0));
    // rail slide pins & slots along the outside
    for (const d of [90, 330, 600, 820]) {
      const pin = mesh(new THREE.CylinderGeometry(3, 3, 3, 16), M.nickel, s * (W / 2 + 0.2), 14, Z(d));
      pin.rotation.z = Math.PI / 2;
      g.add(pin);
    }
    for (let d = 40; d < DEPTH - 30; d += 70) g.add(mesh(box(0.4, 4, 26), M.portDark, s * (W / 2 - 0.9), 26, Z(d)));
  }
  // rear lip
  g.add(mesh(box(W - 4, 7, WALL), M.steel, 0, 0, Z(DEPTH) + 0.6));
  // embossed stiffening ribs in the floor pan
  for (const x of [-180, -110, -40, 40, 110, 180]) g.add(mesh(box(5, 0.8, 300), M.steel, x, WALL, Z(600)));
  tagPart(g, 'chassis', 'Tray chassis (1U MGX)', 'Galvanized steel 1U sled that slides into the NVL72 (MGX) rack. Power, NVLink and coolant all blind-mate at the rear.');
  return g;
}


function moduleBoard(w, d, mat) {
  const M = materials();
  return mesh(box(w, 1.6, d), [M.pcbEdge, M.pcbEdge, mat, mat, M.pcbEdge, M.pcbEdge]);
}
let modPcbMat = null;
function modPcb() {
  if (!modPcbMat) {
    const c = makeCanvas(512, 512);
    const x = c.getContext('2d');
    x.fillStyle = '#272523'; x.fillRect(0, 0, 512, 512);
    const r = rng(9);
    for (let i = 0; i < 3000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(80,72,60,0.6)' : 'rgba(10,10,10,0.6)'; x.beginPath(); x.arc(r() * 512, r() * 512, 1.2, 0, 7); x.fill(); }
    for (let i = 0; i < 60; i++) { x.strokeStyle = 'rgba(70,62,50,0.5)'; x.lineWidth = 1.2; x.beginPath(); const y = r() * 512; x.moveTo(r() * 100, y); x.lineTo(300 + r() * 200, y); x.stroke(); }
    const t = canvasTexture(c, { repeat: true });
    modPcbMat = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.5, clearcoat: 0.3 });
  }
  return modPcbMat;
}

// ----------------------------------------------------------------------------------------------
// Shared small parts: fans, finned heatsinks, cages, hoses
// ----------------------------------------------------------------------------------------------
let fanMat = null;
function fanFaceMat() {
  if (fanMat) return fanMat;
  const c = makeCanvas(256, 256);
  const x = c.getContext('2d');
  x.fillStyle = '#0d0d0e'; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#030303';
  x.beginPath(); x.arc(128, 128, 118, 0, 7); x.fill();
  // blades
  x.fillStyle = '#1d1e20';
  for (let i = 0; i < 7; i++) {
    x.save(); x.translate(128, 128); x.rotate((i / 7) * Math.PI * 2);
    x.beginPath(); x.moveTo(20, -8); x.quadraticCurveTo(80, -40, 112, -6); x.quadraticCurveTo(80, 10, 20, 10); x.closePath(); x.fill();
    x.restore();
  }
  x.fillStyle = '#26272a'; x.beginPath(); x.arc(128, 128, 30, 0, 7); x.fill();
  x.fillStyle = '#e9e7e1'; x.font = '700 14px Helvetica'; x.textAlign = 'center'; x.fillText('NVIDIA', 128, 133);
  // finger guard ring
  x.strokeStyle = '#2b2c2e'; x.lineWidth = 4;
  for (const r of [60, 95]) { x.beginPath(); x.arc(128, 128, r, 0, 7); x.stroke(); }
  fanMat = new THREE.MeshStandardMaterial({ map: canvasTexture(c), roughness: 0.6 });
  return fanMat;
}

/** Axial fan module facing ±z (w x h face, depth d), black frame with a blade/grille face. */
function fan(w = 36, h = 36, d = 28) {
  const M = materials();
  const g = new THREE.Group();
  g.add(mesh(box(w, h, d), M.lcpBlack));
  for (const s of [-1, 1]) {
    const f = mesh(new THREE.PlaneGeometry(w - 1, h - 1), fanFaceMat(), 0, h / 2, s * (d / 2 + 0.05));
    if (s < 0) f.rotation.y = Math.PI;
    g.add(f);
  }
  return g;
}

/** Aluminium heatsink: base plate plus fins running along z (front-to-back airflow). */
function finnedHeatsink(w, d, h, { pitch = 2.2, fin = 0.5, base = 3, mat = null } = {}) {
  const M = materials();
  const m = mat || M.aluminum;
  const g = new THREE.Group();
  g.add(mesh(box(w, base, d), m));
  const n = Math.max(2, Math.floor((w - fin) / pitch) + 1);
  const step = (w - fin) / (n - 1);
  for (let i = 0; i < n; i++) g.add(mesh(box(fin, h - base, d), m, -w / 2 + fin / 2 + i * step, base, 0));
  return g;
}

/** OSFP / QSFP cage: steel shell open at the front (+z). */
function cage(w, h, d) {
  const M = materials();
  const g = new THREE.Group();
  g.add(mesh(box(w, h, d), M.steel, 0, 0, 0));
  g.add(mesh(box(w - 2, h - 2, 1), M.portDark, 0, 1, d / 2 + 0.01));
  // heat-sink clip ridges on top
  for (let k = 0; k < 4; k++) g.add(mesh(box(w - 3, 0.8, 1.2), M.steelDark, 0, h, -d / 2 + 8 + k * 8));
  return g;
}

let hoseMat = null;
/** Black EPDM coolant hose. */
function hose(points, radius = 3.4, bend = 9) {
  if (!hoseMat) hoseMat = new THREE.MeshPhysicalMaterial({ color: '#101112', roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.4 });
  return pipe(points, radius, hoseMat, bend);
}

let cableMat = null;
/** Grey twinax cable bundle. */
function cable(points, radius = 1.6, color = '#3b3d40') {
  if (!cableMat) cableMat = new Map();
  if (!cableMat.has(color)) cableMat.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1 }));
  return pipe(points, radius, cableMat.get(color), 6);
}

// ----------------------------------------------------------------------------------------------
// Front panel
// ----------------------------------------------------------------------------------------------
// Port layout (x, y centre, w, h, r). Per side from the outside in: two ConnectX-7 OSFP cages,
// then the BlueField-3's two QSFP112 ports. Centre: four E1.S bays and management I/O.
const CX7_X = [-196, -144, 144, 196];
const BF3_X = [-90, 90];
const E1S_X = [-46, -34, -22, -10];
const PORTS = [
  ...CX7_X.map((x) => [x, 16.5, 23, 14, 1, 'osfp']),
  ...BF3_X.flatMap((x) => [[x - 11, 19, 19, 9.5, 1, 'qsfp'], [x + 11, 19, 19, 9.5, 1, 'qsfp']]),
  ...E1S_X.map((x) => [x, 21.5, 10, 35, 1, 'e1s']),
  [14, 25, 15, 13, 1, 'rj45'], [32, 28, 12, 5.5, 0.6, 'usb'], [32, 20, 12, 5.5, 0.6, 'usb'], [48, 25, 9, 6, 1.4, 'dp'],
];

export function frontPanel({ label = ['GB200 NVL72 COMPUTE', 'P/N 920-9B200-00FE-0D0  S/N 1652024xxxxx'], ports = PORTS, detail = true } = {}) {
  const M = materials();
  const g = new THREE.Group();
  const PW = 452, PH = H, T = 4;
  const shape = new THREE.Shape();
  rectPath(shape, 0, PH / 2, PW, PH);
  const holes = ports.map(([x, y, w, h, r]) => [x, y, w, h, r]);
  // finger-pull handle slots, outboard below the OSFP cages
  for (const s of [-1, 1]) holes.push([s * 170, 5.2, 90, 5, 2.4]);
  for (const [x, y, w, h, r] of holes) {
    const p = new THREE.Path();
    roundRectPath(p, x, y, w, h, r);
    shape.holes.push(p);
  }
  for (const [x, y, rr] of [[62, 30, 3.2], [62, 20, 1.0], [68, 20, 1.0], [74, 20, 1.0]]) {
    const p = new THREE.Path();
    p.absarc(x, y, rr, 0, Math.PI * 2, true);
    shape.holes.push(p);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2, curveSegments: 12 });
  scaleUV(geo, 0.004);
  g.add(mesh(geo, M.champagne, 0, 0, Z(0) - T));
  // dark port interiors
  for (const [x, y, w, h, , kind] of ports) {
    if (kind === 'e1s') continue; // drive faces fill these bays
    const depth = kind === 'osfp' || kind === 'qsfp' ? 6 : 24;
    g.add(mesh(box(w + 1, h + 1, depth), M.portDark, x, y - h / 2 - 0.5, Z(0) - T - depth / 2 + 1));
  }
  for (const s of [-1, 1]) g.add(mesh(box(90, 6, 14), M.rubberBlack, s * 170, 2.2, Z(0) - 10));
  const btn = mesh(new THREE.CylinderGeometry(2.8, 2.8, 2, 24), M.nickel, 62, 30, Z(0) - 0.5);
  btn.rotation.x = Math.PI / 2;
  g.add(btn);
  [[62, 20, M.ledGreen], [68, 20, M.ledAmber], [74, 20, M.ledGreen]].forEach(([x, y, m]) => {
    const l = mesh(new THREE.CylinderGeometry(0.9, 0.9, 2, 12), m, x, y, Z(0) - 0.6);
    l.rotation.x = Math.PI / 2;
    g.add(l);
  });
  if (detail) {
    g.add(mesh(box(10, 0.4, 2), M.gold, 14, 29.5, Z(0) - 10));
    for (const y of [28, 20]) g.add(mesh(box(10, 1.6, 6), M.nylonWhite, 32, y - 1.2, Z(0) - 8));
  }
  // ejector levers at both ends
  for (const s of [-1, 1]) {
    const lev = new THREE.Shape();
    lev.moveTo(0, 0); lev.lineTo(8, 0); lev.quadraticCurveTo(11, 14, 5, 26); lev.lineTo(1, 26); lev.quadraticCurveTo(5, 14, 0, 4); lev.lineTo(0, 0);
    const lg = new THREE.ExtrudeGeometry(lev, { depth: H - 10, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 2 });
    scaleUV(lg, 0.01);
    const lm = new THREE.Mesh(lg, M.champagne);
    lm.rotation.x = -Math.PI / 2;
    lm.position.set(s * (PW / 2 - 4), 5, Z(0) + 2);
    lm.scale.x = s;
    g.add(lm);
  }
  g.add(mesh(new THREE.PlaneGeometry(42, 8), new THREE.MeshStandardMaterial({ map: labelTexture(label), roughness: 0.6 }), 110, 37.5, Z(0) + 0.6));
  tagPart(g, 'front-panel', 'Front panel & handles', 'Champagne MGX bezel: 4 ConnectX-7 OSFP ports (InfiniBand/Ethernet), 2 BlueField-3 QSFP112 ports, 4 E1.S drive bays, the BMC management port, USB and display.');
  explode(g, 0, 0, 80);
  return g;
}

// ----------------------------------------------------------------------------------------------
// Front I/O: E1.S drives, ConnectX-7 cards, BlueField-3 DPUs, management module
// ----------------------------------------------------------------------------------------------
function storage() {
  const M = materials();
  const g = new THREE.Group();
  const perf = perforation(14, 0.6);
  const mat = new THREE.MeshStandardMaterial({
    color: '#c4c7ca', metalness: 1, roughness: 0.38,
    alphaMap: perf.alpha, alphaTest: 0.5, normalMap: perf.normal, side: THREE.DoubleSide,
    map: M.steel.map, roughnessMap: M.steel.roughnessMap,
  });
  const L = 120, CW = 120;
  const geo = new THREE.PlaneGeometry(CW, L);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (CW / 40), uv.getY(i) * (L / 40));
  const plate = mesh(geo, mat, -6, H - 1.2, Z(4 + L / 2));
  plate.rotation.x = -Math.PI / 2;
  g.add(plate);
  const driveLabel = new THREE.MeshStandardMaterial({ map: labelTexture(['E1.S NVMe', '3.84TB  PCIe Gen5'], { size: 30, bg: '#2a2b2c', ink: '#8d8f90' }), roughness: 0.6 });
  for (const x of E1S_X) {
    // vertical E1.S carriers: 9.5 mm thick, ~34 mm tall
    g.add(mesh(box(9.4, 34, 118), M.blackPowder, x, 4.5, Z(4 + 59)));
    g.add(mesh(box(8, 33, 1.2), M.blackAnodized, x, 5, Z(3.4)));
    g.add(mesh(new THREE.PlaneGeometry(60, 20), driveLabel, x + 4.75, 21.5, Z(70)).rotateY(Math.PI / 2));
  }
  g.add(mesh(box(56, 2, 118), M.steelDark, -28, WALL, Z(63)));
  tagPart(g, 'e1s', 'E1.S NVMe drives', 'Four front-serviceable E1.S NVMe drives for boot and local scratch. They hang off the superchips over PCIe Gen5 cables.');
  explode(g, 0, 60, 40);
  return g;
}

function cx7Card(x, i) {
  const M = materials();
  const g = new THREE.Group();
  const w = 48, d = 110, y0 = 6;
  const zc = Z(6 + d / 2);
  for (const sz of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(2.4, 2.4, y0 - WALL, 10), M.steelDark, x, WALL, zc + sz * 45));
  const b = moduleBoard(w, d, modPcb());
  b.position.set(x, y0, zc);
  g.add(b);
  const top = y0 + 1.6;
  const oc = cage(23, 14, 52);
  oc.position.set(x, top - 1.2, Z(4 + 26));
  g.add(oc);
  const chip = smallPackage({ size: 22, die: 11, seed: 50 + i, hue: [175, 230], id: 'cx7', label: 'ConnectX-7 NIC', info: '400 Gb/s InfiniBand / Ethernet NIC with GPUDirect RDMA. One per B200 GPU for the scale-out (east-west) fabric.' });
  chip.position.set(x, top, Z(78));
  g.add(chip);
  const hs = finnedHeatsink(36, 34, 22, { pitch: 2.4 });
  hs.position.set(x, top + 2.2, Z(78));
  g.add(hs);
  g.add(mesh(box(32, 4, 8), materials().lcpBlack, x, top, Z(6 + d - 6)));
  tagPart(g, 'cx7-card', `ConnectX-7 card ${i}`, 'OCP-style NIC card: one ConnectX-7 (400 Gb/s) with an air-cooled heatsink and an OSFP cage on the front panel.');
  explode(g, 0, 50, 30);
  return g;
}

function bf3Card(side) {
  const M = materials();
  const g = new THREE.Group();
  const x = side * 90, w = 50, d = 150, y0 = 6;
  const zc = Z(6 + d / 2);
  for (const sz of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(2.4, 2.4, y0 - WALL, 10), M.steelDark, x, WALL, zc + sz * 65));
  const b = moduleBoard(w, d, modPcb());
  b.position.set(x, y0, zc);
  g.add(b);
  const top = y0 + 1.6;
  for (const dx of [-11, 11]) {
    const qc = cage(19, 9.5, 46);
    qc.position.set(x + dx, top - 0.5, Z(4 + 23));
    g.add(qc);
  }
  const chip = smallPackage({ size: 32, die: 16, dieD: 14, seed: 70 + (side > 0 ? 1 : 0), hue: [255, 320], id: 'bf3', label: 'BlueField-3 DPU', info: '16 Arm A78 cores + 400 Gb/s ConnectX-7 networking on one chip. Runs the north-south network, storage (NVMe-oF) and security offloads for its superchip.' });
  chip.position.set(x, top, Z(92));
  g.add(chip);
  const hs = finnedHeatsink(44, 44, 26, { pitch: 2.4 });
  hs.position.set(x, top + 2.2, Z(92));
  g.add(hs);
  for (const dz of [126, 140]) for (const dx of [-12, 12]) {
    const p = lpddrPackage(10, 12);
    p.position.set(x + dx, top, Z(dz));
    tagPart(p, 'bf3-ddr', 'BlueField-3 DDR5', 'Local memory (16-32 GB) for the DPU\'s Arm cores.');
    g.add(p);
  }
  g.add(mesh(box(36, 4, 8), M.lcpBlack, x, top, Z(6 + d - 5)));
  tagPart(g, 'bf3-card', `BlueField-3 DPU card ${side < 0 ? 0 : 1}`, 'Infrastructure processor for one superchip: front-end networking, storage access and isolation, so the Grace cores stay free for the workload.');
  explode(g, 0, 60, 30);
  return g;
}

function mgmtModule() {
  const M = materials();
  const g = new THREE.Group();
  const w = 104, d = 124, x = 0, y0 = 6;
  const zc = Z(132 + d / 2);
  g.add(mesh(box(w, 4, d), M.blackAnodized, x, WALL, zc));
  const b = moduleBoard(w - 6, d - 8, modPcb());
  b.position.set(x, y0, zc);
  g.add(b);
  const top = y0 + 1.6;
  const bmc = ic(17, 1.4, 17, ['AST2600', 'A3', '2421']);
  bmc.position.set(-22, top, zc + 10);
  tagPart(bmc, 'bmc', 'Baseboard management controller (BMC)', 'Out-of-band management (DC-SCM): power control, sensors, firmware updates, remote console.');
  g.add(bmc);
  const hmc = ic(14, 1.3, 14, ['HMC', 'FPGA']);
  hmc.position.set(10, top, zc + 10);
  tagPart(hmc, 'hmc', 'GPU management controller (HMC)', 'Collects GPU telemetry and RAS events and runs secure-boot attestation for the four B200s.');
  g.add(hmc);
  for (const z of [-26, -40]) g.add(at(lpddrPackage(10, 12), 32, top, zc + z));
  g.add(at(ic(6, 1, 6, ['TPM', '2.0']), -40, top, zc - 40));
  g.add(at(ic(8, 1, 6, ['ROT', 'CEC']), -24, top, zc - 40));
  tagPart(g, 'mgmt-module', 'Management module (DC-SCM)', 'Tray management: BMC, root of trust, boot flash and the front-panel management port.');
  explode(g, 0, 75, 0);
  return g;
}

function fanWall() {
  const g = new THREE.Group();
  const d = 300, FW = 36, FH = 36, FD = 28;
  for (const x of [-165, -114, -60.5, 0, 60.5, 114, 165]) {
    const f = fan(FW, FH, FD);
    f.position.set(x, WALL, Z(d));
    g.add(f);
  }
  g.add(mesh(box(W - 6, 2, 8), materials().steelDark, 0, WALL, Z(d + FD / 2 + 4)));
  tagPart(g, 'fans', 'Fan wall', 'Seven 40 mm fans pull front-to-back air across the NICs, DPUs, drives and LPDDR5X. In GB200 the liquid loop removes most of the heat, and these fans handle the rest.');
  explode(g, 0, 70, 0);
  return g;
}

// ----------------------------------------------------------------------------------------------
// Power: distribution boards + internal bus bars
// ----------------------------------------------------------------------------------------------
function power() {
  const M = materials();
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const pdb = new THREE.Group();
    const x = s * 150, d0 = 336, d = 92;
    pdb.add(mesh(box(130, 3, d), M.blackAnodized, x, WALL, Z(d0 + d / 2)));
    const pb = moduleBoard(124, d - 8, modPcb());
    pb.position.set(x, WALL + 3, Z(d0 + d / 2));
    pdb.add(pb);
    const t2 = WALL + 4.6;
    for (const dx of [-32, 32]) {
      pdb.add(mesh(new RoundedBoxGeometry(50, 10, 60, 2, 1), M.blackAnodized, x + dx, t2 + 5, Z(d0 + 44)));
      pdb.add(mesh(new THREE.PlaneGeometry(36, 9), new THREE.MeshStandardMaterial({ map: labelTexture(['IBC 54V→12V', '1.6 kW']), roughness: 0.6 }), x + dx, t2 + 10.05, Z(d0 + 40)).rotateX(-Math.PI / 2));
      for (const sz of [-1, 1]) pdb.add(at(screwHead(M.screw, 1.5, 0.8), x + dx + 20, t2 + 10, Z(d0 + 44) + sz * 25));
    }
    tagPart(pdb, 'pdb', 'Power distribution board', 'Steps the rack\'s 48-54 V DC busbar power down to 12 V for the superchip VRMs, NICs, DPUs and fans.');
    explode(pdb, 0, 40, 0);
    g.add(pdb);
  }
  // flat copper bus bars under the superchips, from the rear busbar clip to the PDBs
  const bus = new THREE.Group();
  for (const s of [-1, 1]) {
    bus.add(mesh(box(14, 2, 420), M.copper, s * 150, WALL, Z(430 + 210)));
    bus.add(mesh(box(14, 2, 14), M.copper, s * 150, WALL, Z(428)));
  }
  bus.add(mesh(box(314, 2, 16), M.copper, 0, WALL, Z(846)));
  tagPart(bus, 'power-bus', 'Internal bus bars', 'Flat copper bars under the superchips carry DC power from the rear busbar clip to the two power distribution boards.');
  explode(bus, 0, -20, 0);
  g.add(bus);
  return g;
}

// ----------------------------------------------------------------------------------------------
// Internal cables: superchip front connectors -> CX-7 / BF-3 / drives, PDB -> board power
// ----------------------------------------------------------------------------------------------
function cables() {
  const g = new THREE.Group();
  const yRun = 27;
  const connY = BOARD_TOP + 5;
  const connZ = Z(SC_D + 195 - 186) + 7; // the mating face of the board's front cable connectors
  for (const [k, sx] of SC_X.entries()) {
    const s = sx < 0 ? -1 : 1;
    // board-local connector x = -75, -25, 25, 75 (in tray x for this superchip)
    const conn = [-75, -25, 25, 75].map((x) => sx + x);
    // outer pair -> the two CX-7s on this side (one per GPU), inner -> BF-3, innermost -> drives/mgmt
    const outer = s < 0 ? conn[0] : conn[3], outer2 = s < 0 ? conn[1] : conn[2];
    const inner = s < 0 ? conn[2] : conn[1], inner2 = s < 0 ? conn[3] : conn[0];
    const routes = [
      [outer, s * 196, 116], [outer2, s * 144, 116], [inner, s * 90, 156], [inner2, s * 30, 256],
    ];
    for (const [x0, x1, dEnd] of routes) {
      for (const o of [-2.2, 0, 2.2]) {
        g.add(cable([
          [x0 + o, connY, connZ], [x0 + o, yRun, connZ + 16], [x0 + o, yRun, Z(328)],
          [x1 + o, yRun, Z(290)], [x1 + o, yRun, Z(dEnd + 30)], [x1 + o, 12, Z(dEnd + 4)],
        ], 1.5));
      }
    }
    // PDB -> board power connectors (board-local (±92, 116))
    for (const px of [sx - 92, sx + 92]) {
      for (const [o, col] of [[-2.4, '#8e1d17'], [2.4, '#151515']]) {
        g.add(cable([[s * 150 + o + (px - s * 150) * 0.2, 16, Z(428)], [s * 150 + o + (px - s * 150) * 0.2, 22, Z(450)], [px + o, 22, Z(SC_D + 195 - 116) + 18], [px + o, BOARD_TOP + 11, Z(SC_D + 195 - 116) + 4]], 2.3, col));
      }
    }
    void k;
  }
  tagPart(g, 'cables', 'Internal PCIe cables', 'Twinax cable harness carrying PCIe Gen5 from each superchip to its two ConnectX-7 cards, its BlueField-3 and the drives, plus 12 V power cables from the PDBs. Vera Rubin replaces all of these with a cable-free midplane.');
  explode(g, 0, 120, 0);
  return g;
}

// ----------------------------------------------------------------------------------------------
// Liquid cooling
// ----------------------------------------------------------------------------------------------
let copperTopMat = null;
function coldPlateTop() {
  if (copperTopMat) return copperTopMat;
  const M = materials();
  // machined fly-cut swirl in the roughness
  const c = makeCanvas(512, 512);
  const x = c.getContext('2d');
  x.fillStyle = 'rgb(0,70,255)'; x.fillRect(0, 0, 512, 512);
  for (let r = 4; r < 720; r += 3) {
    x.strokeStyle = `rgba(0,${50 + ((r * 37) % 60)},255,0.5)`;
    x.beginPath(); x.arc(-120, 256, r, -1.2, 1.2); x.stroke();
  }
  copperTopMat = new THREE.MeshPhysicalMaterial({ color: M.copper.color, metalness: 1, roughness: 1, roughnessMap: canvasTexture(c, { srgb: false }), clearcoat: 0.1 });
  return copperTopMat;
}

function coldPlate(w, d, h, { fittings = [], base: baseMat = null, top: topMat = null } = {}) {
  const M = materials();
  const g = new THREE.Group();
  const base = mesh(new RoundedBoxGeometry(w, h, d, 3, 1.4), baseMat || M.copper, 0, h / 2, 0);
  g.add(base);
  const lid = mesh(new RoundedBoxGeometry(w - 8, 2, d - 8, 2, 0.8), topMat || coldPlateTop(), 0, h + 0.6, 0);
  g.add(lid);
  // perimeter screws (spring-loaded captive)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(at(screwHead(M.nickel, 2.4, 3.2), sx * (w / 2 - 4), h - 1, sz * (d / 2 - 4)));
    const spring = mesh(new THREE.TorusGeometry(2.6, 0.4, 6, 16), M.steelDark, sx * (w / 2 - 4), h + 0.4, sz * (d / 2 - 4));
    spring.rotation.x = Math.PI / 2;
    g.add(spring);
  }
  for (const [fx, fz] of fittings) {
    const f = mesh(new THREE.CylinderGeometry(3.6, 3.6, 6, 18), M.nickel, fx, h + 3, fz);
    g.add(f);
    g.add(mesh(new THREE.CylinderGeometry(4.2, 4.2, 1.2, 6), M.nickel, fx, h + 0.6, fz));
  }
  return g;
}


function superchipCooling(sx) {
  // sx = x offset of the superchip centre in tray space; superchip front edge at d = SC_D
  const M = materials();
  const g = new THREE.Group();
  g.name = 'cooling';
  const zc = Z(SC_D + BOARD.L / 2);
  const bz = (z) => zc + z; // board-local z -> tray z
  const L = coolMats();

  // GPU cold plates (sit on bare dies; raised by 2.6 mm when lids are fitted)
  const gpuLift = new THREE.Group();
  gpuLift.name = 'gpu-coldplate-lift';
  for (const s of [-1, 1]) {
    const cp = coldPlate(76, 82, 9, { fittings: [[0, -28], [0, 28]], base: L.plate, top: L.plateTop });
    cp.position.set(sx + s * 53, BOARD_TOP + 3.6, bz(-105));
    tagPart(cp, 'gpu-coldplate', 'GPU cold plate', 'Direct-to-chip liquid cold plate on one B200 (~1.2 kW). The NVL72 rack is liquid-cooled at about 120 kW in total.');
    gpuLift.add(cp);
  }
  g.add(gpuLift);
  const cpu = coldPlate(56, 60, 8, { fittings: [[-16, -22], [16, -22]], base: L.plate, top: L.plateTop });
  cpu.position.set(sx, BOARD_TOP + 2.4, bz(45));
  tagPart(cpu, 'cpu-coldplate', 'CPU cold plate', 'Cools Grace in series with the two GPU cold plates on the same superchip.');
  g.add(cpu);

  // EPDM hoses with chrome quick-disconnects: rear manifold -> GPU plates -> CPU plate -> return
  const hoses = new THREE.Group();
  const rearZ = Z(DEPTH) + 24;
  const yTop = BOARD_TOP + 3.6 + 9 + 6;
  const yRun = BOARD_TOP + 30;
  for (const s of [-1, 1]) {
    const x = sx + s * 53;
    hoses.add(hose([[x, yTop, bz(-133)], [x, yRun, bz(-150)], [x, yRun, rearZ + 20], [sx + s * 16, yRun, rearZ + 20], [sx + s * 16, yRun, rearZ]]));
    hoses.add(hose([[x, yTop, bz(-77)], [x, yRun - 4, bz(-66)], [x, yRun - 4, bz(-10)], [sx + s * 16, yRun - 4, bz(4)], [sx + s * 16, BOARD_TOP + 2.4 + 8 + 6, bz(23)]]));
  }
  for (const s of [-1, 1]) hoses.add(coupling(sx + s * 53, yRun, bz(-160), L));
  tagPart(hoses, 'coolant-pipes', 'Coolant hoses', 'Flexible EPDM hoses with drip-free quick-disconnects, running from the rear blind-mate couplings through the GPU and CPU cold plates.');
  g.add(hoses);
  explode(g, 0, 230, 0);
  return g;
}

let coolLocal = null;
function coolMats() {
  if (coolLocal) return coolLocal;
  const M = materials();
  const c = makeCanvas(512, 512);
  const x = c.getContext('2d');
  x.fillStyle = '#191a1c'; x.fillRect(0, 0, 512, 512);
  x.fillStyle = 'rgba(255,255,255,0.08)';
  x.font = 'italic 800 40px Helvetica, Arial, sans-serif';
  x.fillText('NVIDIA', 300, 470);
  coolLocal = {
    plate: M.nickel,
    plateTop: new THREE.MeshPhysicalMaterial({ map: canvasTexture(c), metalness: 0.5, roughness: 0.42, clearcoat: 0.15 }),
    chrome: new THREE.MeshPhysicalMaterial({ color: '#e6e8ea', metalness: 1, roughness: 0.12 }),
    blue: new THREE.MeshStandardMaterial({ color: '#2f6fd0', roughness: 0.4 }),
  };
  return coolLocal;
}

/** Chrome quick-disconnect sleeve on a hose running along z. */
function coupling(x, y, z, L) {
  const g = new THREE.Group();
  const b = mesh(new THREE.CylinderGeometry(4.6, 4.6, 14, 20), L.chrome, x, y, z);
  b.rotation.x = Math.PI / 2;
  g.add(b);
  const r = mesh(new THREE.CylinderGeometry(4.9, 4.9, 2.4, 20), L.blue, x, y, z + 3);
  r.rotation.x = Math.PI / 2;
  g.add(r);
  return g;
}

function rearHardware() {
  const M = materials();
  const g = new THREE.Group();
  for (const [x, ring] of [[-206, '#2c6fd6'], [206, '#d63b2c']]) {
    const q = new THREE.Group();
    const body = mesh(new THREE.CylinderGeometry(7, 7, 46, 28), M.nickel);
    body.rotation.x = Math.PI / 2;
    q.add(body);
    const nose = mesh(new THREE.CylinderGeometry(5, 6, 8, 28), M.steelDark, 0, 0, -26);
    nose.rotation.x = Math.PI / 2;
    q.add(nose);
    const collar = mesh(new THREE.CylinderGeometry(7.6, 7.6, 5, 28), new THREE.MeshStandardMaterial({ color: ring, roughness: 0.45 }), 0, 0, 6);
    collar.rotation.x = Math.PI / 2;
    q.add(collar);
    q.add(mesh(box(22, 26, 4), M.steel, 0, -13, 14));
    q.position.set(x, 26, Z(DEPTH) - 8);
    tagPart(q, 'uqd', x < 0 ? 'Coolant supply quick-disconnect' : 'Coolant return quick-disconnect', 'Drip-free blind-mate coupling (UQD) to the rack manifold, so a tray can be pulled without touching a hose.');
    g.add(q);
    g.add(hose([[x, 26, Z(DEPTH) + 14], [x, 26, Z(DEPTH) + 24], [x * 0.2, 38, Z(DEPTH) + 24]], 4.2));
  }
  const bb = new THREE.Group();
  bb.add(mesh(new RoundedBoxGeometry(46, 24, 44, 2, 1.5), M.lcpBlack, 0, 12, 0));
  for (const x of [-12, 12]) bb.add(mesh(box(4, 18, 30), M.copper, x, 4, -18));
  bb.add(mesh(box(40, 3, 20), M.steelDark, 0, 24, 6));
  bb.position.set(0, 14, Z(DEPTH) + 10);
  tagPart(bb, 'busbar', 'DC busbar connector', 'Blind-mates onto the rack\'s vertical 48-54 V power busbar. This is the tray\'s only power connection.');
  g.add(bb);
  // rear coolant manifold block between the superchips
  g.add(mesh(new RoundedBoxGeometry(380, 10, 14, 2, 2), M.blackAnodized, 0, 33, Z(DEPTH) + 24));
  explode(g, 0, 0, -60);
  return g;
}

// ----------------------------------------------------------------------------------------------
// Assembly
// ----------------------------------------------------------------------------------------------
export function buildComputeTray(buildSuperchip) {
  const M = materials();
  const root = new THREE.Group();
  root.name = 'compute-tray';
  root.add(chassis());
  root.add(frontPanel());
  root.add(storage());
  CX7_X.forEach((x, i) => root.add(cx7Card(x, i)));
  for (const s of [-1, 1]) root.add(bf3Card(s));
  root.add(mgmtModule());
  root.add(fanWall());
  root.add(power());
  root.add(cables());

  const sc = buildSuperchip();
  const zc = Z(SC_D + BOARD.L / 2);
  SC_X.forEach((sx, i) => {
    const s = i === 0 ? sc : sc.clone(true);
    s.position.set(sx, BOARD_TOP, zc);
    tagPart(s, 'superchip', `GB200 Superchip ${i}`, '1 Grace CPU + 2 B200 GPUs. Two per tray, 18 trays per NVL72 rack = 36 Grace + 72 B200.');
    explode(s, 0, 70, 0);
    root.add(s);
    for (const [x, z] of [[-100, -180], [100, -180], [-100, 0], [100, 0], [-100, 170], [100, 170], [0, -40]]) root.add(mesh(new THREE.CylinderGeometry(3, 3, BOARD_TOP - BOARD.T - WALL, 12), M.steelDark, sx + x, WALL + (BOARD_TOP - BOARD.T - WALL) / 2, zc + z));
    root.add(superchipCooling(sx));
  });

  root.add(rearHardware());
  shadowAll(root);
  root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  return optimize(root);
}

export function setCooling(root, on) {
  root.traverse((o) => { if (o.name === 'cooling') o.visible = on; });
}

/** When GPU lids are fitted the cold plates must sit 2.6 mm higher. */
export function setColdPlateLift(root, lids) {
  root.traverse((o) => { if (o.name === 'gpu-coldplate-lift') o.position.y = lids ? 2.6 : 0; });
}

// Shared building blocks for the other trays (switch tray, HGX, rack).
export {
  mesh, at, scaleUV, rectPath, roundRectPath, pipe, screwHead, labelTexture, chassis, modPcb, moduleBoard,
  fan, finnedHeatsink, cage, hose, cable, coldPlate, coupling, coolMats,
  W as TRAY_W, DEPTH as TRAY_DEPTH, H as TRAY_H, WALL as TRAY_WALL,
};
