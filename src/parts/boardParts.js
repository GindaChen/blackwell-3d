// Board-level components: connectors, SOCAMM modules, inductors, standoffs, and an instancing
// helper used for the thousands of passives that populate the superchip.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from './materials.js';
import { box, lpddrPackage } from './chips.js';
import { makeCanvas, canvasTexture, tagPart, explode } from '../lib/util.js';
import { markedTop } from '../textures/surfaces.js';

// ----------------------------------------------------------------------------------------------
// Instancing
// ----------------------------------------------------------------------------------------------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export class InstancedSet {
  /** geometry must be a unit-sized shape with its base on y=0. */
  constructor(geometry, material, { id, label, info } = {}) {
    this.geometry = geometry;
    this.material = material;
    this.items = [];
    this.meta = { id, label, info };
  }
  add(x, y, z, w, h, d, rot = 0) {
    this.items.push([x, y, z, w, h, d, rot]);
  }
  build() {
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.items.length);
    this.items.forEach(([x, y, z, w, h, d, rot], i) => {
      _q.setFromAxisAngle(_up, rot);
      _m.compose(_p.set(x, y, z), _q, _s.set(w, h, d));
      mesh.setMatrixAt(i, _m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.computeBoundingBox();
    if (this.meta.id) tagPart(mesh, this.meta.id, this.meta.label, this.meta.info);
    return mesh;
  }
}

export const unitBox = () => box(1, 1, 1);
export const unitRounded = (r = 0.12) => {
  const g = new RoundedBoxGeometry(1, 1, 1, 2, r);
  g.translate(0, 0.5, 0);
  return g;
};

// ----------------------------------------------------------------------------------------------
// Connector textures
// ----------------------------------------------------------------------------------------------
function contactRowsTexture(rows = 4, pins = 90) {
  const w = 1024, h = 256;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#121212';
  ctx.fillRect(0, 0, w, h);
  const rowH = h / rows;
  for (let r = 0; r < rows; r++) {
    ctx.fillStyle = '#050505';
    ctx.fillRect(8, r * rowH + rowH * 0.18, w - 16, rowH * 0.64);
    for (let p = 0; p < pins; p++) {
      const x = 12 + p * ((w - 24) / pins);
      ctx.fillStyle = '#e8c070';
      ctx.fillRect(x, r * rowH + rowH * 0.25, (w - 24) / pins * 0.45, rowH * 0.5);
    }
  }
  return canvasTexture(c);
}
function contactRowsRM(rows = 4, pins = 90) {
  const w = 1024, h = 256;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgb(0,140,0)';
  ctx.fillRect(0, 0, w, h);
  const rowH = h / rows;
  for (let r = 0; r < rows; r++)
    for (let p = 0; p < pins; p++) {
      const x = 12 + p * ((w - 24) / pins);
      ctx.fillStyle = 'rgb(0,60,255)';
      ctx.fillRect(x, r * rowH + rowH * 0.25, (w - 24) / pins * 0.45, rowH * 0.5);
    }
  return canvasTexture(c, { srgb: false });
}

let connMats = null;
function connectorMats() {
  if (connMats) return connMats;
  const M = materials();
  connMats = {
    edgeTop: new THREE.MeshStandardMaterial({ map: contactRowsTexture(3, 80), roughnessMap: contactRowsRM(3, 80), metalnessMap: contactRowsRM(3, 80), metalness: 1, roughness: 1 }),
    nvlTop: new THREE.MeshStandardMaterial({ map: contactRowsTexture(6, 40), roughnessMap: contactRowsRM(6, 40), metalnessMap: contactRowsRM(6, 40), metalness: 1, roughness: 1 }),
    arrow: new THREE.MeshStandardMaterial({ map: arrowTexture(), roughness: 0.6, transparent: true }),
    body: M.lcpBlack,
  };
  return connMats;
}
function arrowTexture() {
  const c = makeCanvas(64, 128);
  const x = c.getContext('2d');
  x.fillStyle = '#e8e6df';
  x.beginPath(); x.moveTo(32, 6); x.lineTo(54, 40); x.lineTo(40, 40); x.lineTo(40, 122); x.lineTo(24, 122); x.lineTo(24, 40); x.lineTo(10, 40); x.closePath(); x.fill();
  return canvasTexture(c);
}

/**
 * NVLink 6 spine connector on the superchip's rear edge. Black LCP housing with two
 * recessed high-density contact fields and a white mating arrow (as seen in the GTC photos).
 */
export function nvlinkConnector() {
  const M = materials();
  const C = connectorMats();
  const g = new THREE.Group();
  const W = 64, D = 26, H = 12.5;
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 2, 1.2), C.body);
  body.position.y = H / 2;
  g.add(body);
  // two contact cavities
  for (const sx of [-1, 1]) {
    const cav = new THREE.Mesh(box(24, 0.4, 18), C.nvlTop);
    cav.position.set(sx * 15.5, H - 0.6, 0);
    g.add(cav);
    // cavity walls (raised lip)
    const lip = new THREE.Group();
    for (const [w, d, x, z] of [[26, 1.2, 0, -9.6], [26, 1.2, 0, 9.6], [1.2, 18, -12.6, 0], [1.2, 18, 12.6, 0]]) {
      const l = new THREE.Mesh(box(w, 1.4, d), C.body);
      l.position.set(sx * 15.5 + x, H - 0.8, z);
      lip.add(l);
    }
    g.add(lip);
  }
  // centre rib with arrow
  const arrow = new THREE.Mesh(new THREE.PlaneGeometry(3, 7), C.arrow);
  arrow.rotation.x = -Math.PI / 2;
  arrow.position.set(0, H + 0.02, 0);
  g.add(arrow);
  // metal latch/guide posts at the ends
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, H + 2, 16), M.nickel);
    post.position.set(sx * (W / 2 - 3), (H + 2) / 2, -D / 2 + 3);
    g.add(post);
    const clip = new THREE.Mesh(box(4, H - 2, 0.6), M.steelDark);
    clip.position.set(sx * (W / 2 - 3), 1, D / 2 + 0.3);
    g.add(clip);
  }
  tagPart(g, 'nvlink-conn', 'NVLink 6 spine connector', 'Blind-mates into the rack\'s copper NVLink spine. Each Rubin GPU gets 3.6 TB/s of NVLink 6 bandwidth to the 36 NVLink switch chips.');
  explode(g, 0, 25, -30);
  return g;
}

/** Low-profile high-density board-to-board connector on the superchip's front edge (to the PCIe Gen6 midplane). */
export function edgeConnector(width = 60) {
  const C = connectorMats();
  const M = materials();
  const g = new THREE.Group();
  const D = 22, H = 5.5;
  const sides = C.body;
  const body = new THREE.Mesh(box(width, H, D), [sides, sides, C.edgeTop, sides, sides, sides]);
  g.add(body);
  // alignment blocks at both ends
  for (const sx of [-1, 1]) {
    const b = new THREE.Mesh(box(3.2, H + 1.6, 8), C.body);
    b.position.set(sx * (width / 2 + 1.4), 0, -D / 2 + 5);
    g.add(b);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3, 12), M.nickel);
    pin.position.set(sx * (width / 2 + 1.4), H + 2.6, -D / 2 + 5);
    g.add(pin);
  }
  tagPart(g, 'midplane-conn', 'Midplane connector (PCIe Gen6)', 'Cable-free board-to-board connector: the superchip plugs straight into the tray midplane, which links it to the ConnectX-9 SuperNICs, BlueField-4 DPU and storage.');
  explode(g, 0, 18, 20);
  return g;
}

// ----------------------------------------------------------------------------------------------
// SOCAMM2 LPDDR5X module
// ----------------------------------------------------------------------------------------------
let lpddrMat = null;
export function socammModule(index = 0) {
  const M = materials();
  if (!lpddrMat)
    lpddrMat = new THREE.MeshStandardMaterial({
      map: markedTop({ w: 256, h: 360, lines: ['LPDDR5X', 'D8GZQ', 'PZ9QTZ', '2532'], size: 26, rotate: Math.PI / 2, ink: 'rgba(170,170,170,0.5)' }),
      roughness: 0.62,
    });
  const g = new THREE.Group();
  const L = 90, W = 14;
  // compression connector / interposer under the module
  const cc = new THREE.Mesh(box(11.5, 1.1, 78), M.lcpBlack);
  g.add(cc);
  const pcb = new THREE.Mesh(box(W, 0.9, L), [M.pcbEdge, M.pcbEdge, M.socammPcb, M.socammPcb, M.pcbEdge, M.pcbEdge]);
  pcb.position.y = 1.1;
  g.add(pcb);
  const top = 2.0;
  for (const z of [-31.5, -10.5, 10.5, 31.5]) {
    const p = lpddrPackage(12, 17);
    p.material = lpddrMat;
    p.position.set(0, top, z);
    g.add(p);
  }
  // module PMIC + a few caps
  const pm = new THREE.Mesh(box(3, 0.8, 3), M.moldBlack);
  pm.position.set(-3.5, top, 41.5);
  g.add(pm);
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(box(1, 0.5, 0.5), M.mlcc);
    c.position.set(1 + (i % 3) * 1.6, top, 40.5 + Math.floor(i / 3) * 1.4);
    g.add(c);
  }
  // 3 captive screws: top, middle, bottom (the gold-ringed holes in the photos)
  for (const z of [-43, 0, 43]) {
    const washer = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.3, 24), M.goldPad);
    washer.position.set(0, top + 0.15, z);
    g.add(washer);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.7, 1.4, 24), M.screw);
    head.position.set(0, top + 1.0, z);
    g.add(head);
    const slot = new THREE.Mesh(box(2.2, 0.3, 0.45), M.screwBlack);
    slot.position.set(0, top + 1.6, z);
    slot.rotation.y = Math.PI / 4;
    g.add(slot);
  }
  tagPart(g, 'socamm', `SOCAMM2 LPDDR5X module ${index}`, 'Replaceable compression-attached LPDDR5X memory module. 8 per Vera CPU, up to 1.5 TB total at 1.2 TB/s.');
  explode(g, 0, 30, 0);
  return g;
}

// ----------------------------------------------------------------------------------------------
// Inductors, standoffs, small ICs
// ----------------------------------------------------------------------------------------------
const inductorTopCache = new Map();
export function inductor(w = 15, h = 8, d = 15, label = 'R15') {
  const M = materials();
  if (!inductorTopCache.has(label))
    inductorTopCache.set(label, new THREE.MeshStandardMaterial({
      map: markedTop({ w: 256, h: 256, bg: '#56585a', lines: [label, '2531'], size: 44, ink: 'rgba(30,30,30,0.6)', dot: false }),
      roughness: 0.75, metalness: 0.1,
    }));
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.7), M.ferrite);
  body.position.y = h / 2 + 0.15;
  g.add(body);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(w - 1.4, d - 1.4), inductorTopCache.get(label));
  top.rotation.x = -Math.PI / 2;
  top.position.y = h + 0.16;
  g.add(top);
  // copper terminations visible at the base
  for (const sx of [-1, 1]) {
    const t = new THREE.Mesh(box(1.2, 2, d * 0.7), M.copperDark);
    t.position.set(sx * (w / 2 + 0.2), 0, 0);
    g.add(t);
  }
  return g;
}

export function standoff() {
  const M = materials();
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.6, 28), M.screwBlack);
  base.position.y = 0.3;
  g.add(base);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 2.4, 28), M.screwBlack);
  head.position.y = 1.8;
  g.add(head);
  const rec = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.2, 6), M.rubberBlack);
  rec.position.y = 3.05;
  g.add(rec);
  return g;
}

const icMatCache = new Map();
export function ic(w, h, d, lines = [], { bga = false } = {}) {
  const M = materials();
  const key = lines.join('|') + w + 'x' + d;
  if (!icMatCache.has(key))
    icMatCache.set(key, new THREE.MeshStandardMaterial({
      map: markedTop({ w: 256, h: Math.round(256 * (d / w)), lines, size: 30, seed: lines.length + w }),
      roughness: 0.6,
    }));
  const s = M.moldBlack;
  const m = new THREE.Mesh(box(w, h, d), [s, s, icMatCache.get(key), s, s, s]);
  if (bga) m.position.y = 0.4;
  return m;
}

export function whiteConnector() {
  const M = materials();
  const g = new THREE.Group();
  const b = new THREE.Mesh(box(6, 5.5, 4.5), M.nylonWhite);
  g.add(b);
  const hole = new THREE.Mesh(box(4.4, 0.3, 2.6), M.portDark);
  hole.position.y = 5.4;
  g.add(hole);
  return g;
}
