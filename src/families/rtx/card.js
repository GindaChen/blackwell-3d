// GeForce RTX 5090 Founders Edition and RTX PRO 6000 Blackwell Workstation Edition.
//
// Both cards share NVIDIA's 2025 "double flow-through" industrial design: 304 × 137 mm, two slots
// (~40 mm). A small main board in the centre carries the GPU, memory and VRM; the PCIe edge
// connector and the display outputs sit on two separate boards joined to it by flex cables, which
// frees both ends of the card for fin stacks that air can blow straight through.
//
// Sources in SOURCES.md. Sourced: card size, the 3-board split, double flow-through with a 3D vapor
// chamber and liquid-metal TIM, angled/recessed 12V-2x6, 16 GDDR7 chips (5090) / 32 in clamshell
// (PRO 6000), the 19 GPU + 8 memory phase count TechPowerUp counted on the 5090 FE (NVIDIA quotes
// 30), the display outputs. ESTIMATED (no CAD or measured drawings): the main board outline
// (~112 × 118 mm), memory and phase positions (the "5 left / 5 right / 4 top / 2 bottom" ring seen on
// GB202 reference-board photos), fan diameter (~96 mm), fin stack extents, heat-pipe count, y heights.
//
// Card coordinates (mm), card lying fans-up:
//   x: along the card, -152 = I/O bracket end .. +152 = far end
//   z: -68.5 = PCIe finger edge (the bottom edge in a PC) .. +68.5 = top edge (power connector)
//   y: up, 0 = back face of the backplate, 40 = fan-side face of the shroud
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from '../../parts/materials.js';
import { box } from '../../parts/chips.js';
import { InstancedSet, unitBox, unitRounded, ic } from '../../parts/boardParts.js';
import { Placer } from '../../assemblies/superchip.js';
import { buildPcbTextures } from '../../textures/pcb.js';
import { markedTop } from '../../textures/surfaces.js';
import { tagPart, explode, shadowAll, rng, makeCanvas, canvasTexture } from '../../lib/util.js';
import { optimize } from '../../lib/optimize.js';
import { gb202Package, GB202 } from './gb202.js';

export const CARD = { L: 304, H: 137, T: 40 };
const X0 = -152, X1 = 152, ZB = -60, ZT = 68.5;         // shroud extents (fingers stick out below ZB)
const PCB = { x0: -56, x1: 56, z0: -56, z1: 62, y: 7, t: 1.6 };
const TOP = PCB.y + PCB.t;                                // main board top surface (8.6)
const FAN = { r: 46, hole: 48, z: 4, xs: [-100, 100] };
const FIN = { y0: 2, y1: 24, z0: -48, z1: 64, L: [-138, -59], R: [59, 148] };
const VC_Y = TOP + GB202.PT + GB202.DIE_T;                // vapor chamber underside = die top (10.7)

// memory chip centres (board x, z) and footprint (w along x, d along z): GDDR7 is 12 × 14 mm
const MEM = [
  ...[-36, -20, -4, 12, 28].map((z) => [-37, z, 12, 14]),
  ...[-36, -20, -4, 12, 28].map((z) => [37, z, 12, 14]),
  ...[-22.5, -7.5, 7.5, 22.5].map((x) => [x, 44, 14, 12]),
  ...[-10, 10].map((x) => [x, -41, 14, 12]),
];
// phases: [x, z, rot] for each power stage; the choke sits outboard of it
const GPU_PH = [
  ...Array.from({ length: 11 }, (_, i) => ['top', -49 + i * 7]),
  ...[8, 15, 22, 29].flatMap((z) => [['left', z], ['right', z]]),
];
const MEM_PH = [...[22, 29, 36].flatMap((x) => [['bot', -x], ['bot', x]]), ['left', -8], ['right', -8]];
const PWR = { x: 42, z: 54, rot: -0.6 };                 // 12V-2x6, angled ~35° towards the far end

let shared = null;
function mats() {
  if (shared) return shared;
  const M = materials();
  shared = {
    fin5090: new THREE.MeshStandardMaterial({ color: '#2b2d30', metalness: 0.7, roughness: 0.45 }),
    finPro: new THREE.MeshStandardMaterial({ color: '#1d1e20', metalness: 0.6, roughness: 0.5 }),
    shell5090: new THREE.MeshPhysicalMaterial({ color: '#7b7f84', metalness: 0.85, roughness: 0.34, roughnessMap: M.aluminum.roughnessMap, clearcoat: 0.15 }),
    shellPro: new THREE.MeshPhysicalMaterial({ color: '#16171a', metalness: 0.55, roughness: 0.42, roughnessMap: M.aluminum.roughnessMap, clearcoat: 0.2 }),
    trimPro: new THREE.MeshPhysicalMaterial({ color: '#8c8f93', metalness: 0.9, roughness: 0.3 }),
    vc: new THREE.MeshPhysicalMaterial({ color: '#c98a5e', metalness: 1, roughness: 0.3, roughnessMap: M.aluminum.roughnessMap }),
    nickelVC: new THREE.MeshPhysicalMaterial({ color: '#cfccc6', metalness: 1, roughness: 0.28 }),
    lm: new THREE.MeshPhysicalMaterial({ color: '#e4e6ea', metalness: 1, roughness: 0.08 }),
    pad: new THREE.MeshStandardMaterial({ color: '#8a8f96', roughness: 0.85, transparent: true, opacity: 0.9 }),
    fanBlade: new THREE.MeshStandardMaterial({ color: '#0d0e0f', roughness: 0.6, side: THREE.DoubleSide }),
    fanHub: new THREE.MeshPhysicalMaterial({ color: '#101112', roughness: 0.4, clearcoat: 0.5 }),
    flex: new THREE.MeshStandardMaterial({ color: '#c9822e', roughness: 0.45, metalness: 0.2 }),
    gold: new THREE.MeshStandardMaterial({ map: fingersTexture(), metalness: 1, roughness: 0.25 }),
    pcbPlain: new THREE.MeshPhysicalMaterial({ color: '#1f1e1c', roughness: 0.55, clearcoat: 0.2 }),
    pcbBottom: new THREE.MeshStandardMaterial({ color: '#232120', roughness: 0.6 }),
    bracket: new THREE.MeshStandardMaterial({ color: '#2a2b2d', metalness: 0.8, roughness: 0.4 }),
    port: new THREE.MeshStandardMaterial({ color: '#c3c5c8', metalness: 1, roughness: 0.3 }),
    portHole: M.portDark,
    mem5090: new THREE.MeshStandardMaterial({ map: markedTop({ w: 256, h: 300, lines: ['SEC 449', 'K4VAF325ZC', 'SC28'], size: 30, ink: 'rgba(185,185,185,0.55)' }), roughness: 0.6 }),
    memPro: new THREE.MeshStandardMaterial({ map: markedTop({ w: 256, h: 300, lines: ['GDDR7', '24Gb  3GB', '28Gbps'], size: 30, ink: 'rgba(185,185,185,0.55)' }), roughness: 0.6 }),
    conn: new THREE.MeshStandardMaterial({ map: connFaceTexture(), roughness: 0.6 }),
  };
  return shared;
}

function fingersTexture() {
  const c = makeCanvas(1024, 64);
  const x = c.getContext('2d');
  x.fillStyle = '#1e1d1b'; x.fillRect(0, 0, 1024, 64);
  for (let i = 0; i < 82; i++) {
    if (i === 10) continue; // key notch region
    x.fillStyle = '#e6b964';
    x.fillRect(6 + i * 12.3, 4, 8.5, 56);
  }
  return canvasTexture(c);
}
function connFaceTexture() {
  const c = makeCanvas(256, 128);
  const x = c.getContext('2d');
  x.fillStyle = '#111'; x.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { x.fillStyle = '#050505'; x.fillRect(14 + i * 39, 18 + j * 48, 30, 36); x.fillStyle = '#c9a060'; x.fillRect(24 + i * 39, 30 + j * 48, 10, 12); }
  for (let i = 0; i < 4; i++) { x.fillStyle = '#060606'; x.fillRect(40 + i * 46, 116, 26, 8); }
  return canvasTexture(c);
}
function textTexture(text, { w = 1024, h = 96, color = '#e9e9e9', bg = 'rgba(0,0,0,0)', size = 64, weight = 700 } = {}) {
  const c = makeCanvas(w, h);
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.fillStyle = color;
  x.font = `${weight} ${size}px Helvetica, Arial, sans-serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, w / 2, h / 2 + 2);
  return canvasTexture(c);
}

const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
/** Box from min/max corners. */
const slab = (mat, x0, x1, y0, y1, z0, z1) => mesh(box(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, y0, (z0 + z1) / 2);

/** Flat plate in the xz plane from a Shape drawn in (x, -z), extruded upwards by t from y0. */
function plate(shape, t, y0, mat) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 48 });
  geo.rotateX(-Math.PI / 2);
  // shape y = -z; after rotateX(-90°) shape (x, y, 0) -> (x, 0, -y) = (x, 0, z) and depth -> +y
  return mesh(geo, mat, 0, y0, 0);
}
function rectShape(x0, x1, z0, z1, r = 0) {
  const s = new THREE.Shape();
  const a = x0, b = x1, c = -z1, d = -z0; // y = -z
  if (!r) { s.moveTo(a, c); s.lineTo(b, c); s.lineTo(b, d); s.lineTo(a, d); s.lineTo(a, c); return s; }
  s.moveTo(a + r, c); s.lineTo(b - r, c); s.quadraticCurveTo(b, c, b, c + r); s.lineTo(b, d - r); s.quadraticCurveTo(b, d, b - r, d);
  s.lineTo(a + r, d); s.quadraticCurveTo(a, d, a, d - r); s.lineTo(a, c + r); s.quadraticCurveTo(a, c, a + r, c);
  return s;
}
function rectPath(x0, x1, z0, z1, r) { const s = rectShape(x0, x1, z0, z1, r); const p = new THREE.Path(); p.curves = s.curves; return p; }

// ----------------------------------------------------------------------------------------------
// Shroud (two 'shell' groups: the fan-side frame and the backplate)
// ----------------------------------------------------------------------------------------------
function shroud(pro) {
  const L = mats();
  const sm = pro ? L.shellPro : L.shell5090;
  const front = new THREE.Group();
  front.name = 'shell';
  const face = rectShape(X0 + 1, X1, ZB, ZT, 6);
  for (const x of FAN.xs) { const h = new THREE.Path(); h.absarc(x, -FAN.z, FAN.hole, 0, Math.PI * 2, true); face.holes.push(h); }
  front.add(plate(face, 1.5, CARD.T - 1.5, sm));
  // fan surround rings, slightly raised
  for (const x of FAN.xs) {
    const ring = mesh(new THREE.CylinderGeometry(FAN.hole + 2.2, FAN.hole + 2.2, 1.2, 64, 1, true), pro ? L.trimPro : sm, x, CARD.T - 1.2, FAN.z);
    front.add(ring);
    const lip = mesh(new THREE.TorusGeometry(FAN.hole + 1, 1.0, 8, 64), pro ? L.trimPro : sm, x, CARD.T - 0.4, FAN.z);
    lip.rotation.x = Math.PI / 2;
    front.add(lip);
  }
  // edge walls: top (with the power-connector window), bottom (with the PCIe board slot), far end
  const wallT = 2;
  front.add(slab(sm, X0 + 1, 24, 1.5, CARD.T - 1.5, ZT - wallT, ZT));
  front.add(slab(sm, 56, X1, 1.5, CARD.T - 1.5, ZT - wallT, ZT));
  front.add(slab(sm, 24, 56, 1.5, 5, ZT - wallT, ZT));
  front.add(slab(sm, 24, 56, 22, CARD.T - 1.5, ZT - wallT, ZT));
  front.add(slab(sm, X0 + 1, -116, 1.5, CARD.T - 1.5, ZB, ZB + wallT));
  front.add(slab(sm, -6, X1, 1.5, CARD.T - 1.5, ZB, ZB + wallT));
  front.add(slab(sm, -116, -6, 1.5, 5.5, ZB, ZB + wallT));
  front.add(slab(sm, -116, -6, 10.5, CARD.T - 1.5, ZB, ZB + wallT));
  front.add(slab(sm, X1 - wallT, X1, 1.5, CARD.T - 1.5, ZB, ZT));
  // name on the top edge (lit white on the real cards)
  const label = mesh(new THREE.PlaneGeometry(78, 6.5), new THREE.MeshStandardMaterial({ map: textTexture(pro ? 'RTX PRO 6000' : 'GEFORCE RTX'), transparent: true, emissive: '#ffffff', emissiveMap: textTexture(pro ? 'RTX PRO 6000' : 'GEFORCE RTX'), emissiveIntensity: 0.6 }), -70, CARD.T / 2, ZT + 0.05);
  front.add(label);
  if (pro) front.add(slab(L.trimPro, X0 + 6, X1 - 6, CARD.T, CARD.T + 0.25, ZT - 3, ZT - 1.8)); // thin trim line
  tagPart(front, 'rtx-shroud', pro ? 'Shroud (black)' : 'Shroud', pro
    ? 'Black die-cast frame, same 304 × 137 mm two-slot shape as the RTX 5090 FE. Turn the shell toggle off to see inside.'
    : 'Die-cast aluminium frame, 304 × 137 mm and two slots thick (the 4090 FE was three). Turn the shell toggle off to see inside.');
  explode(front, 0, 95, 0);

  const back = new THREE.Group();
  back.name = 'shell';
  const bs = rectShape(X0 + 1, X1, ZB, ZT, 6);
  bs.holes.push(rectPath(-136, -60, -46, 60, 8), rectPath(60, 146, -46, 60, 8));
  back.add(plate(bs, 1.5, 0, sm));
  // exhaust slats across the openings (air leaves through the back)
  for (const [a, b] of [[-136, -60], [60, 146]]) for (let z = -40; z <= 56; z += 8) back.add(slab(sm, a, b, 0.2, 1.3, z - 0.6, z + 0.6));
  tagPart(back, 'rtx-backplate', 'Backplate', pro
    ? 'Back cover. On the PRO 6000 it also has to cool the 16 memory chips on the back of the board, through thermal pads. The two grilles let the air from both fans leave through the back.'
    : 'Back cover with two grilles: air from both fans passes straight through the fin stacks and out of the back of the card.');
  const g = new THREE.Group();
  g.add(front, back);
  return g;
}

// ----------------------------------------------------------------------------------------------
// Cooler: vapor chamber, heat pipes, two fin stacks, two fans (group named 'cooling')
// ----------------------------------------------------------------------------------------------
function fanAssembly(pro, i) {
  const L = mats();
  const g = new THREE.Group();
  const y0 = FIN.y1 + 0.6, h = 12;
  g.add(mesh(new THREE.CylinderGeometry(15, 15, h, 40), L.fanHub, 0, y0, 0));
  g.add(mesh(new THREE.CylinderGeometry(13, 13, 0.3, 40), pro ? mats().trimPro : L.fanHub, 0, y0 + h, 0));
  const nb = 11;
  for (let k = 0; k < nb; k++) {
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(FAN.r - 15, 19, 4, 1), L.fanBlade);
    const pos = blade.geometry.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const px = pos.getX(v), py = pos.getY(v);
      pos.setY(v, py + 0.12 * px); // sweep the blade back towards the tip
    }
    blade.geometry.computeVertexNormals();
    const pivot = new THREE.Group();
    blade.position.x = 15 + (FAN.r - 15) / 2;
    blade.rotation.x = -Math.PI / 2 + 0.7; // blade pitch
    pivot.add(blade);
    pivot.rotation.y = (k / nb) * Math.PI * 2;
    pivot.position.y = y0 + h / 2;
    g.add(pivot);
  }
  // outer ring joining the blade tips (as on the FE fans)
  const ring = mesh(new THREE.CylinderGeometry(FAN.r + 0.6, FAN.r + 0.6, 6, 64, 1, true), L.fanBlade, 0, y0 + 3, 0);
  g.add(ring);
  // three support struts on the back side
  for (let k = 0; k < 3; k++) {
    const s = mesh(box(FAN.r + 2, 1.2, 2.4).translate((FAN.r + 2) / 2, 0, 0), L.fanHub, 0, y0 - 0.4, 0);
    s.rotation.y = (k / 3) * Math.PI * 2 + 0.3;
    g.add(s);
  }
  g.position.set(FAN.xs[i], 0, FAN.z);
  tagPart(g, 'rtx-fan', `Fan ${i + 1}`, 'One of two ~96 mm fans (diameter estimated). Both blow straight through a fin stack and out the back of the card: nothing on the board is in the way.');
  explode(g, 0, 22, 0);
  return g;
}

function finStack(pro, [x0, x1], side) {
  const L = mats();
  const m = pro ? L.finPro : L.fin5090;
  const g = new THREE.Group();
  const pitch = 1.6, t = 0.3;
  for (let x = x0; x <= x1; x += pitch) {
    // fins are straight in the middle and curve near the edges on the real card; drawn straight here
    g.add(slab(m, x, x + t, FIN.y0, FIN.y1, FIN.z0, FIN.z1));
  }
  // top and bottom fold-over rails
  g.add(slab(m, x0, x1 + t, FIN.y1 - 0.4, FIN.y1, FIN.z0, FIN.z0 + 1.5));
  g.add(slab(m, x0, x1 + t, FIN.y1 - 0.4, FIN.y1, FIN.z1 - 1.5, FIN.z1));
  tagPart(g, 'rtx-fins', side < 0 ? 'Fin stack (bracket end)' : 'Fin stack (far end)', 'Thin fins threaded on the heat pipes. Air goes straight through, front to back; the board does not block it, which is the point of the "flow-through" design.');
  return g;
}

function cooler(pro) {
  const L = mats();
  const g = new THREE.Group();
  g.name = 'cooling';
  // vapor chamber: a pedestal on the GPU + memory, then a wide plate over the board
  const vc = new THREE.Group();
  vc.add(slab(L.nickelVC, -44, 44, VC_Y, 14, -44, 38));
  vc.add(slab(L.nickelVC, -31, 31, VC_Y, 14, 38, 50));
  vc.add(slab(L.vc, PCB.x0, PCB.x1, 14, 17.5, PCB.z0, 40));
  vc.add(slab(L.vc, PCB.x0, 28, 14, 17.5, 40, PCB.z1));
  vc.add(slab(L.vc, -30, 30, 17.5, 18.5, -36, 36)); // the 3D chamber's raised centre
  tagPart(vc, 'rtx-vapor', 'Vapor chamber (3D)', 'Sealed copper chamber over the GPU, memory and VRM. Water inside boils on the hot spot and condenses further out; in the "3D" design the vapor flows straight on into the heat pipes.');
  g.add(vc);
  const lm = slab(L.lm, -GB202.DIE_W / 2 + 0.5, GB202.DIE_W / 2 - 0.5, VC_Y - 0.08, VC_Y, -GB202.DIE_D / 2 + 0.5, GB202.DIE_D / 2 - 0.5);
  tagPart(lm, 'rtx-lm', 'Liquid-metal TIM', 'Liquid metal between the die and the vapor chamber instead of paste, with a seal around it to keep it in place. It conducts heat several times better than paste.');
  g.add(lm);
  // thermal pads on the memory chips and the VRM
  const pads = new THREE.Group();
  for (const [x, z, w, d] of MEM) pads.add(slab(L.pad, x - w / 2, x + w / 2, TOP + 1.1, VC_Y, z - d / 2, z + d / 2));
  g.add(pads);
  // heat pipes from the chamber into both fin stacks
  const pipes = new THREE.Group();
  for (const z of [-36, -18, 0, 18, 36, 52]) for (const s of [-1, 1]) {
    if (s > 0 && z > 40) continue; // the power connector sits there
    const xa = 40, len = (s < 0 ? -FIN.L[0] : FIN.R[1]) - xa;
    const p = mesh(new THREE.CylinderGeometry(3, 3, len, 16), L.vc, s * (xa + len / 2), 17, z);
    p.rotation.z = Math.PI / 2;
    pipes.add(p);
  }
  tagPart(pipes, 'rtx-heatpipe', 'Heat pipes', 'Copper heat pipes carry heat from the vapor chamber out to the fin stacks at both ends of the card (count estimated).');
  g.add(pipes);
  g.add(finStack(pro, FIN.L, -1), finStack(pro, FIN.R, 1));
  g.add(fanAssembly(pro, 0), fanAssembly(pro, 1));
  explode(g, 0, 45, 0);
  return g;
}

// ----------------------------------------------------------------------------------------------
// Boards
// ----------------------------------------------------------------------------------------------
function connector12V(L) {
  const g = new THREE.Group();
  const M = materials();
  // right-angle 12V-2x6: 12 power pins (2 × 6, 3 mm pitch) + 4 sense pins, mating face towards +z
  g.add(mesh(new RoundedBoxGeometry(21, 10, 12, 2, 0.8), M.lcpBlack, 0, 5, 0));
  const face = mesh(new THREE.PlaneGeometry(20, 9.5), L.conn, 0, 5, 6.05);
  g.add(face);
  g.add(mesh(box(6, 2.5, 4), M.lcpBlack, 0, 10, 5)); // latch
  g.position.set(PWR.x, TOP, PWR.z);
  g.rotation.y = PWR.rot;
  return g;
}

function mainBoard(pro, sets) {
  const M = materials();
  const L = mats();
  const r = rng(pro ? 6000 : 5090);
  const g = new THREE.Group();
  const W = PCB.x1 - PCB.x0, D = PCB.z1 - PCB.z0;
  const cx = (PCB.x0 + PCB.x1) / 2, cz = (PCB.z0 + PCB.z1) / 2;
  const P = new Placer(W, D);
  const lx = (x) => x - cx, lz = (z) => z - cz; // card -> board-local
  const pads = [], silk = [], bundles = [], pours = [], holes = [], keep = [];
  const K = (x, z, w, d) => { P.mark(lx(x), lz(z), w, d); keep.push({ x: lx(x), z: lz(z), w, d }); };

  // GPU
  const pkg = gb202Package(pro ? 'pro' : '5090');
  pkg.position.set(0, TOP, 0);
  tagPart(pkg, 'gb202', pro ? 'GB202 GPU (188 SMs)' : 'GB202 GPU (170 SMs)', pro
    ? 'Full-size GB202: 24,064 CUDA cores, 752 tensor cores, 128 MB L2, 512-bit GDDR7 with ECC. Up to 600 W.'
    : 'GB202 with 21,760 CUDA cores, 680 tensor cores, 96 MB L2 and a 512-bit GDDR7 bus. 575 W total board power.');
  explode(pkg, 0, 14, 0);
  g.add(pkg);
  K(0, 0, GB202.PW + 1, GB202.PD + 1);
  silk.push({ type: 'corners', x: 0, z: 0, w: GB202.PW + 3, d: GB202.PD + 3, k: 5, lw: 0.35 });
  silk.push({ type: 'text', x: -GB202.PW / 2 - 4, z: GB202.PD / 2 + 2, text: 'U1', size: 1.8 });
  // bundles: GPU -> every memory chip (GDDR7 channels)
  for (const [x, z] of MEM) bundles.push({ pts: [[lx(x * 0.55), lz(z * 0.55)], [lx(x * 0.85), lz(z * 0.85)]], n: 10, pitch: 0.42, width: 0.14 });

  // memory (front)
  MEM.forEach(([x, z, w, d], i) => {
    const m = mesh(box(w, 1.1, d), pro ? L.memPro : L.mem5090, x, TOP, z);
    tagPart(m, 'gddr7', `GDDR7 chip ${i + 1}${pro ? ' (front)' : ''}`, pro
      ? '3 GB (24 Gb) GDDR7 at 28 Gb/s. It shares its 32-bit channel with the chip directly behind it on the back of the board (clamshell), so capacity doubles but bandwidth does not.'
      : '2 GB (16 Gb) Samsung GDDR7 at 28 Gb/s on its own 32-bit channel. Sixteen give 32 GB and 1.79 TB/s.');
    explode(m, 0, 10, 0);
    g.add(m);
    K(x, z, w + 0.8, d + 0.8);
    pads.push({ x: lx(x), z: lz(z), w: w + 0.4, d: d + 0.4, color: '#2a2722' });
    silk.push({ type: 'corners', x: lx(x), z: lz(z), w: w + 1.2, d: d + 1.2, k: 1.5, lw: 0.2 });
  });

  // VRM: power stage + choke per phase. Tagged groups (not instanced) so tours can point at them.
  const vrmGpu = new THREE.Group(), vrmMem = new THREE.Group();
  const phase = (grp, [side, v], ctrlId) => {
    let sx, sz, lx2, lz2, rot = 0;
    if (side === 'top') { sx = v; sz = 53; lx2 = v; lz2 = 59; }
    else if (side === 'bot') { sx = v; sz = -46.5; lx2 = v; lz2 = -52.5; }
    else { const s = side === 'left' ? -1 : 1; sx = s * 47; sz = v; lx2 = s * 52.8; lz2 = v; rot = 1; }
    grp.add(mesh(unitRounded(0.1).scale(rot ? 4 : 5, 0.9, rot ? 5 : 4), M.moldBlack, sx, TOP, sz));
    const ch = mesh(new RoundedBoxGeometry(5.6, 4.6, 5.6, 2, 0.5).translate(0, 2.3, 0), M.ferrite, lx2, TOP, lz2);
    grp.add(ch);
    K(sx, sz, rot ? 4.4 : 5.4, rot ? 5.4 : 4.4); K(lx2, lz2, 6, 6);
    pads.push({ x: lx(lx2) - 2.4, z: lz(lz2), w: 1.6, d: 4.4 }, { x: lx(lx2) + 2.4, z: lz(lz2), w: 1.6, d: 4.4 });
  };
  GPU_PH.forEach((p) => phase(vrmGpu, p));
  MEM_PH.forEach((p) => phase(vrmMem, p));
  tagPart(vrmGpu, 'rtx-vrm-gpu', 'GPU core VRM (19 phases)', 'Nineteen phases, each a smart power stage and a ferrite choke, turn 12 V into the GPU\'s ~1 V core rail at several hundred amps. Phase count from TechPowerUp\'s teardown; positions estimated.');
  tagPart(vrmMem, 'rtx-vrm-mem', 'Memory VRM (8 phases)', 'Eight phases for the GDDR7 supply. NVIDIA quotes 30 phases in total; the rest feed smaller rails.');
  g.add(vrmGpu, vrmMem);
  pours.push({ x: lx(-14), z: lz(56), w: 84, d: 12 }, { x: lx(-50), z: lz(10), w: 10, d: 50 }, { x: lx(50), z: lz(10), w: 10, d: 50 });

  // power connector
  const pc = connector12V(L);
  tagPart(pc, 'rtx-power-conn', '12V-2x6 power connector', pro
    ? 'One 16-pin 12V-2x6 input for up to 600 W. Angled and recessed into the top edge, like the 5090 FE.'
    : 'One 16-pin 12V-2x6 input (up to 600 W; the card is rated 575 W). It is angled towards the far end and recessed into the shroud so the cable bends less.');
  explode(pc, 0, 12, 10);
  g.add(pc);
  K(PWR.x, PWR.z, 22, 20);
  silk.push({ type: 'text', x: lx(PWR.x - 14), z: lz(PWR.z - 8), text: '12V', size: 1.4 });

  // controller, BIOS flash, FPC connectors
  const ctrl = ic(5, 0.9, 5, ['uP95', '12Q']);
  ctrl.position.set(6, TOP, -52.5);
  tagPart(ctrl, 'rtx-vrm-ctrl', 'Multiphase PWM controller', 'Digital controller that sequences the GPU and memory power stages (part number not confirmed).');
  g.add(ctrl); K(6, -52.5, 5.6, 5.6);
  const bios = ic(4, 1.0, 5, ['25Q', '80']);
  bios.position.set(14.5, TOP, -52.5);
  tagPart(bios, 'rtx-bios', 'BIOS flash', 'SPI flash holding the card\'s VBIOS and firmware.');
  g.add(bios); K(14.5, -52.5, 4.6, 5.6);
  for (const [x, z, w, d, id, label] of [[-12, -53, 8, 4, 'rtx-fpc-pcie', 'PCIe flex connector'], [-49, -51, 6, 7, 'rtx-fpc-io', 'Display flex connector']]) {
    const c = new THREE.Group();
    c.add(mesh(box(w, 1.4, d), M.lcpBlack, 0, 0, 0));
    c.add(mesh(box(w - 1, 0.4, d * 0.5), M.nickel, 0, 1.4, 0));
    c.position.set(x, TOP, z);
    tagPart(c, id, label, id === 'rtx-fpc-pcie'
      ? 'Board-to-board connector for the flex cable that carries all 16 PCIe Gen5 lanes from the edge-connector board.'
      : 'Connector for the flex cable to the display-output board at the bracket.');
    g.add(c); K(x, z, w + 0.6, d + 0.6);
  }
  // board marking
  // board marking (illustrative text, not a verified board number)
  silk.push({ type: 'text', x: lx(24), z: lz(-39), text: pro ? 'PRO 6000' : 'RTX 5090', size: 1.2, weight: 700 });
  for (const [x, z] of [[-53, -53], [53, -53], [-53, 47], [53, 47]]) { holes.push({ x: lx(x), z: lz(z), r: 1.3, ring: 2.6 }); K(x, z, 6, 6); }

  // MLCC decoupling around the package and memory
  const addMLCC = (x, z, rot) => {
    const l = 1.0, w = 0.5;
    if (!P.tryPlace(lx(x), lz(z), rot ? w : l, rot ? l : w, 0.15)) return;
    sets.mlcc.add(x, TOP, z, l, 0.5, w, rot ? Math.PI / 2 : 0);
    pads.push({ x: lx(x), z: lz(z), w: rot ? w * 1.2 : l * 1.15, d: rot ? l * 1.15 : w * 1.2 });
  };
  for (let x = -29; x <= 29; x += 1.4) { addMLCC(x, 33, 0); addMLCC(x, -33, 0); }
  for (let z = -31; z <= 31; z += 1.4) { addMLCC(-29.6, z, 1); addMLCC(29.6, z, 1); }
  for (let i = 0; i < 1400; i++) addMLCC(r.range(PCB.x0 + 1, PCB.x1 - 1), r.range(PCB.z0 + 1, PCB.z1 - 1), r.chance(0.5));
  for (let i = 0; i < 80; i++) {
    const x = r.range(-52, 52), z = r.range(-54, 60);
    if (!P.free(lx(x), lz(z), 3.4, 1.3)) continue;
    P.mark(lx(x), lz(z), 3.4, 1.3);
    silk.push({ type: 'text', x: lx(x), z: lz(z), text: `${r.pick(['C', 'C', 'R', 'L', 'Q'])}${r.int(1, 999)}`, size: 0.8, weight: 500 });
  }

  const tex = buildPcbTextures({ W, L: D, ppm: 8, seed: pro ? 61 : 59, pads, silk, holes, bundles, pours, viaKeepouts: keep, viaCount: 2600 });
  const top = new THREE.MeshPhysicalMaterial({ map: tex.map, normalMap: tex.normal, normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: tex.rm, metalnessMap: tex.rm, roughness: 1, metalness: 1, clearcoat: 0.12, clearcoatRoughness: 0.5 });
  const pcb = mesh(new THREE.BoxGeometry(W, PCB.t, D), [M.pcbEdge, M.pcbEdge, top, L.pcbBottom, M.pcbEdge, M.pcbEdge], cx, PCB.y + PCB.t / 2, cz);
  tagPart(pcb, 'rtx-pcb', 'Main board', `Compact 14-layer board, about ${W} × ${D} mm (estimate), with only the GPU, memory and power delivery on it. Everything else moved to the two satellite boards.`);
  g.add(pcb);

  // back side: polymer caps behind the VRM, MLCC field behind the GPU, (PRO) 16 more memory chips
  const backY = PCB.y;
  const under = (set, x, z, w, h, d) => set.add(x, backY - h, z, w, h, d, 0);
  for (let x = -49; x <= 21; x += 7) under(sets.tant, x, 56, 5.5, 1.6, 4);
  for (const s of [-1, 1]) for (let z = -6; z <= 30; z += 6) under(sets.tant, s * 50, z, 4, 1.6, 5.5);
  for (let i = 0; i < 12; i++) for (let j = 0; j < 14; j++) under(sets.mlccB, -8.8 + i * 1.6, -10.4 + j * 1.6, 1.0, 0.5, 0.5);
  if (pro) {
    MEM.forEach(([x, z, w, d], i) => {
      const m = mesh(box(w, 1.1, d), L.memPro, x, backY - 1.1, z);
      tagPart(m, 'gddr7-back', `GDDR7 chip ${i + 17} (back)`, 'Back-side half of a clamshell pair: it sits on the same 32-bit channel as the chip directly opposite, 16 bits each. Cooled through the backplate.');
      explode(m, 0, -6, 0);
      g.add(m);
    });
  }
  return g;
}

function pcieBoard() {
  const M = materials();
  const L = mats();
  const g = new THREE.Group();
  const x0 = -114, x1 = -6, z0 = -68.5, z1 = -57.5;
  g.add(mesh(box(x1 - x0, PCB.t, z1 - z0), [M.pcbEdge, M.pcbEdge, L.pcbPlain, L.pcbBottom, M.pcbEdge, M.pcbEdge], (x0 + x1) / 2, PCB.y, (z0 + z1) / 2));
  // gold fingers both sides: PCIe x16, ~89 mm, starting ~41 mm from the bracket (standard card)
  const fx0 = -111, fx1 = -22;
  for (const [y, rx] of [[TOP + 0.01, -Math.PI / 2], [PCB.y - 0.01, Math.PI / 2]]) {
    const f = mesh(new THREE.PlaneGeometry(fx1 - fx0, 7.5), L.gold, (fx0 + fx1) / 2, y, -64.6);
    f.rotation.x = rx;
    g.add(f);
  }
  // the board's own flex connector and a few passives
  g.add(slab(M.lcpBlack, -16, -8, TOP, TOP + 1.4, -59.5, -58));
  for (let k = 0; k < 18; k++) g.add(slab(M.mlccGrey, -100 + k * 4.6, -99 + k * 4.6, TOP, TOP + 0.5, -59.2, -58.7));
  tagPart(g, 'rtx-pcie-board', 'PCIe edge-connector board', 'A separate small board that carries only the PCIe Gen5 x16 gold fingers. A flex cable links it to the main board. It is what lets the main board sit in the middle of the card.');
  explode(g, 0, 0, -24);
  return g;
}

function ioBoard(pro) {
  const M = materials();
  const L = mats();
  const g = new THREE.Group();
  const bx = -146;
  g.add(mesh(box(1.6, 30, 82), [L.pcbPlain, L.pcbPlain, M.pcbEdge, M.pcbEdge, M.pcbEdge, M.pcbEdge], bx, 4, -14));
  // ports on the bracket side of the board: 5090 = 3 DP + 1 HDMI; PRO 6000 = 4 DP
  const kinds = pro ? ['dp', 'dp', 'dp', 'dp'] : ['dp', 'dp', 'dp', 'hdmi'];
  const ports = new THREE.Group();
  kinds.forEach((k, i) => {
    const w = k === 'hdmi' ? 15.5 : 16.5, h = k === 'hdmi' ? 6 : 5.5;
    const z = -46 + i * 20;
    ports.add(mesh(box(5.4, h + 1, w + 1), L.port, -150, 12 - (h + 1) / 2, z));
    const hole = mesh(new THREE.PlaneGeometry(w, h), L.portHole, -152.75, 12, z);
    hole.rotation.y = -Math.PI / 2;
    ports.add(hole);
  });
  tagPart(ports, 'rtx-port', pro ? '4× DisplayPort 2.1b' : '3× DisplayPort 2.1b + HDMI 2.1b', pro
    ? 'Four DisplayPort 2.1 outputs (no HDMI on the workstation card), up to 8K at 240 Hz or 16K at 60 Hz.'
    : 'Three DisplayPort 2.1b and one HDMI 2.1b output.');
  g.add(ports);
  tagPart(g, 'rtx-io-board', 'Display I/O board', 'A third board, standing behind the bracket, that holds only the display connectors. The display signals reach it over a flex cable from the main board.');
  explode(g, -26, 0, 0);
  return g;
}

/** Flat flex cables: display board -> main board along the bottom edge; PCIe board -> main board. */
function flexCables() {
  const L = mats();
  const g = new THREE.Group();
  const ribbon = (pts, w) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.1);
    const n = 64, pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = curve.getPoint(t), tan = curve.getTangent(t);
      const side = new THREE.Vector3(0, 1, 0).cross(tan).normalize();
      if (side.lengthSq() < 0.5) side.set(0, 0, 1);
      pos.push(p.x + side.x * w / 2, p.y + side.y * w / 2, p.z + side.z * w / 2, p.x - side.x * w / 2, p.y - side.y * w / 2, p.z - side.z * w / 2);
      if (i) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, L.flex);
    m.material.side = THREE.DoubleSide;
    return m;
  };
  g.add(ribbon([[-145, 6, -52.5], [-120, 6, -52.5], [-62, 6, -52.5], [-58, 10.2, -52], [-53, 10.2, -51.5], [-49, TOP + 1.5, -51]], 6));
  g.add(ribbon([[-12, TOP + 1.5, -58.8], [-12, TOP + 3.2, -56.2], [-12, TOP + 1.5, -53]], 7));
  tagPart(g, 'rtx-flex', 'Flex cables', 'Flexible printed cables join the three boards. Reviewers and repair shops note they are delicate, but they let the main board shrink to the size of the vapor chamber.');
  return g;
}

function bracket(pro) {
  const L = mats();
  const g = new THREE.Group();
  const bxs = X0 - 0.5;
  // 2-slot bracket: ~120 mm from tongue to tab, offset so the tab sits ~111 mm above the finger edge
  const s = new THREE.Shape();
  s.moveTo(-80, 0); s.lineTo(42, 0); s.lineTo(42, CARD.T); s.lineTo(-74, CARD.T); s.lineTo(-80, CARD.T - 8); s.lineTo(-80, 0);
  for (let i = 0; i < 4; i++) { const h = new THREE.Path(); const z = -46 + i * 20; h.moveTo(z - 9, 8.5); h.lineTo(z + 9, 8.5); h.lineTo(z + 9, 15.5); h.lineTo(z - 9, 15.5); h.lineTo(z - 9, 8.5); s.holes.push(h); }
  for (let i = 0; i < 6; i++) { const h = new THREE.Path(); const z = -50 + i * 15; h.moveTo(z - 5, 22); h.lineTo(z + 5, 22); h.lineTo(z + 5, 34); h.lineTo(z - 5, 34); h.lineTo(z - 5, 22); s.holes.push(h); }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  // shape (u = z, v = y) in the YZ plane at x = bxs
  geo.rotateY(-Math.PI / 2);
  const m = mesh(geo, L.bracket, bxs + 0.5, 0, 0);
  g.add(m);
  // screw tab
  g.add(slab(L.bracket, bxs - 11, bxs, 0, CARD.T, 40, 42));
  tagPart(g, 'rtx-bracket', 'I/O bracket', 'Two-slot steel bracket with the display outputs and a vent. Most of the hot air leaves through the back of the card instead.');
  return g;
}

export function buildCard({ pro = false } = {}) {
  const M = materials();
  const root = new THREE.Group();
  root.name = pro ? 'rtx-pro-6000' : 'rtx-5090-fe';
  const sets = {
    mlcc: new InstancedSet(unitBox(), M.mlcc, { id: 'mlcc', label: 'MLCC capacitors', info: 'Small ceramic decoupling capacitors that steady the supply rails.' }),
    mlccB: new InstancedSet(unitBox(), M.mlccGrey, { id: 'mlcc', label: 'MLCC capacitors (back)', info: 'A dense field of ceramic capacitors right behind the GPU, the shortest path to its power balls.' }),
    tant: new InstancedSet(unitRounded(0.08), M.tantalum, { id: 'rtx-tant', label: 'Polymer tantalum capacitors', info: 'The VRM\'s bulk filter capacitors sit on the back of the board (TechPowerUp), keeping the front free for the vapor chamber.' }),
  };
  const boards = new THREE.Group();
  boards.add(mainBoard(pro, sets), pcieBoard(), ioBoard(pro), flexCables());
  for (const s of Object.values(sets)) if (s.items.length) boards.add(s.build());
  explode(boards, 0, 18, 0);
  root.add(boards);
  root.add(cooler(pro));
  root.add(shroud(pro));
  root.add(bracket(pro));
  shadowAll(root);
  root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  return optimize(root);
}
