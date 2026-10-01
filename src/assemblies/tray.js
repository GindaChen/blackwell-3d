// Vera Rubin NVL72 compute tray (1U, MGX, cable-free / hose-free / fanless).
//
// Layout follows NVIDIA's annotated tray render (reference/images/compute-tray-render-annotated-nvidia.png),
// the Hot Chips 2026 top-down shot and the GTC stage photos. Tray coordinates (mm):
//   x: across the 19" tray (outer 448 mm), z: +430 = front panel .. -430 = rear (rack spine side),
//   y: up, 0 = underside of the chassis pan.
// Distances below are often written as d = mm from the front face; z = 430 - d.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from '../parts/materials.js';
import { box, smallPackage, lpddrPackage } from '../parts/chips.js';
import { edgeConnector, ic, InstancedSet, unitBox } from '../parts/boardParts.js';
import { perforation, markedTop } from '../textures/surfaces.js';
import { BOARD } from './superchip.js';
import { tagPart, explode, shadowAll, rng, makeCanvas, canvasTexture } from '../lib/util.js';
import { optimize } from '../lib/optimize.js';

const W = 448, DEPTH = 860, H = 43.5, WALL = 1.2;
const Z = (d) => DEPTH / 2 - d;

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
  tagPart(g, 'chassis', 'Tray chassis (1U MGX)', 'Galvanized steel 1U sled that slides into the Oberon/Kyber rack. No fans and no internal cables: all power, signals and coolant blind-mate at the rear.');
  return g;
}

// ----------------------------------------------------------------------------------------------
// Front panel
// ----------------------------------------------------------------------------------------------
function frontPanel() {
  const M = materials();
  const g = new THREE.Group();
  const PW = 452, PH = H, T = 4;
  const shape = new THREE.Shape();
  rectPath(shape, 0, PH / 2, PW, PH);
  const holes = [];
  // left/right OSFP/E1.S bays (2 x 2 each side)
  for (const s of [-1, 1])
    for (const [cx, cy] of [[-30, 30], [30, 30], [-30, 17], [30, 17]]) holes.push([s * 145 + cx, cy, 44, 9.5, 1]);
  // centre management I/O: RJ45, 2x USB, mini-DP
  holes.push([-26, 25, 15, 13, 1], [-4, 28, 12, 5.5, 0.6], [-4, 20, 12, 5.5, 0.6], [16, 25, 9, 6, 1.4]);
  // finger-pull handle slots
  for (const s of [-1, 1]) holes.push([s * 108, 7, 150, 7.5, 3.6]);
  for (const [x, y, w, h, r] of holes) {
    const p = new THREE.Path();
    roundRectPath(p, x, y, w, h, r);
    shape.holes.push(p);
  }
  // power button + LEDs
  for (const [x, y, rr] of [[38, 27, 3.2], [48, 30, 1.0], [48, 24, 1.0], [56, 30, 1.0]]) {
    const p = new THREE.Path();
    p.absarc(x, y, rr, 0, Math.PI * 2, true);
    shape.holes.push(p);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2, curveSegments: 16 });
  scaleUV(geo, 0.004);
  const plate = mesh(geo, M.champagne, 0, 0, Z(0) - T);
  g.add(plate);
  // dark port interiors + cages
  for (const [x, y, w, h] of holes.slice(0, -2)) {
    const depth = 30;
    g.add(mesh(box(w + 1, h + 1, depth), M.portDark, x, y - h / 2 - 0.5, Z(0) - T - depth / 2 + 1));
  }
  // RJ45 latch window detail + gold contacts
  g.add(mesh(box(10, 0.4, 2), M.gold, -26, 29.5, Z(0) - 10));
  // USB tongues
  for (const y of [28, 20]) g.add(mesh(box(10, 1.6, 6), M.nylonWhite, -4, y - 1.2, Z(0) - 8));
  // handle slot interiors (deep black recess)
  for (const s of [-1, 1]) g.add(mesh(box(150, 8, 18), M.rubberBlack, s * 108, 3, Z(0) - 12));
  // power button & LEDs
  const btn = mesh(new THREE.CylinderGeometry(2.8, 2.8, 2, 24), M.nickel, 38, 27, Z(0) - 0.5);
  btn.rotation.x = Math.PI / 2;
  g.add(btn);
  [[48, 30, M.ledGreen], [48, 24, M.ledAmber], [56, 30, M.ledGreen]].forEach(([x, y, m]) => {
    const l = mesh(new THREE.CylinderGeometry(0.9, 0.9, 2, 12), m, x, y, Z(0) - 0.6);
    l.rotation.x = Math.PI / 2;
    g.add(l);
  });
  // ejector / latch levers at both ends
  for (const s of [-1, 1]) {
    const lev = new THREE.Shape();
    lev.moveTo(0, 0);
    lev.lineTo(10, 0);
    lev.quadraticCurveTo(14, 16, 6, 30);
    lev.lineTo(1, 30);
    lev.quadraticCurveTo(6, 16, 0, 4);
    lev.lineTo(0, 0);
    const lg = new THREE.ExtrudeGeometry(lev, { depth: H - 8, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 2 });
    scaleUV(lg, 0.01);
    const lm = new THREE.Mesh(lg, M.champagne);
    lm.rotation.x = -Math.PI / 2;
    lm.position.set(s * (PW / 2 - 6) - (s > 0 ? 0 : 0), 4, Z(0) + 2);
    lm.scale.x = s;
    g.add(lm);
  }
  // pull-tab label
  const lbl = mesh(new THREE.PlaneGeometry(46, 9), new THREE.MeshStandardMaterial({ map: labelTexture(['VR NVL72 COMPUTE', 'P/N 920-9B100-00FE-0D0  S/N 1652025xxxxx']), roughness: 0.6 }), 108, 37.5, Z(0) + 0.6);
  g.add(lbl);
  tagPart(g, 'front-panel', 'Front panel & handles', 'Champagne-anodized MGX bezel: management I/O (RJ45 BMC port, USB, display), front storage/OSFP bays, finger-pull handles and rack ejector levers.');
  explode(g, 0, 0, 80);
  return g;
}

// ----------------------------------------------------------------------------------------------
// Front cover plate (perforated) and storage underneath
// ----------------------------------------------------------------------------------------------
function frontCover() {
  const M = materials();
  const g = new THREE.Group();
  const perf = perforation(14, 0.6);
  const mat = new THREE.MeshStandardMaterial({
    color: '#c4c7ca', metalness: 1, roughness: 0.38,
    alphaMap: perf.alpha, alphaTest: 0.5, normalMap: perf.normal, side: THREE.DoubleSide,
    map: M.steel.map, roughnessMap: M.steel.roughnessMap,
  });
  const L = 116;
  const geo = new THREE.PlaneGeometry(W - 8, L);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ((W - 8) / 40), uv.getY(i) * (L / 40));
  const plate = mesh(geo, mat, 0, H - 1.2, Z(4 + L / 2));
  plate.rotation.x = -Math.PI / 2;
  g.add(plate);
  // solid border strip with screws
  g.add(mesh(box(W - 8, 0.9, 8), M.steel, 0, H - 1.6, Z(4 + L - 4)));
  for (const x of [-200, -100, 0, 100, 200]) g.add(at(screwHead(M.screw, 2.2, 1), x, H - 0.8, Z(4 + L - 4)));
  // E1.S drive carriers seen through the perforations
  for (let i = 0; i < 8; i++) {
    const x = -175 + i * 50;
    const dr = mesh(box(38, 9.5, 100), M.blackPowder, x, 6, Z(64));
    g.add(dr);
    g.add(mesh(box(30, 0.3, 60), new THREE.MeshStandardMaterial({ map: labelTexture(['E1.S NVMe', '3.84TB  PCIe Gen5'], { size: 30, bg: '#2a2b2c', ink: '#8d8f90' }), roughness: 0.6 }), x, 15.6, Z(70)));
  }
  tagPart(g, 'front-cover', 'Perforated front cover / E1.S storage', 'Vented cover over the front-serviceable E1.S NVMe boot & local storage drives.');
  explode(g, 0, 70, 30);
  return g;
}

// ----------------------------------------------------------------------------------------------
// I/O modules: ConnectX-9 SuperNIC modules (left/right) and the management module (centre)
// ----------------------------------------------------------------------------------------------
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

function nicModule(side) {
  const M = materials();
  const g = new THREE.Group();
  const w = 138, d = 176;
  // black anodized carrier
  g.add(mesh(box(w, 4, d), M.blackAnodized, 0, WALL, 0));
  const b = moduleBoard(w - 6, d - 8, modPcb());
  b.position.y = WALL + 4;
  g.add(b);
  const top = WALL + 5.6;
  // aluminium thermal spreader over the OSFP/front end
  const plate = mesh(new RoundedBoxGeometry(70, 3, 54, 2, 0.8), M.aluminum, side * -22, top + 1.5 + 6, d / 2 - 36);
  g.add(plate);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(screwHead(M.screw, 1.6, 0.8), side * -22 + sx * 31, top + 9, d / 2 - 36 + sz * 23));
  for (const sx of [-1, 1]) g.add(mesh(box(4, 6, 50), M.blackAnodized, side * -22 + sx * 33, top, d / 2 - 36));
  // 2 x 2 ConnectX-9 SuperNICs
  const nics = new THREE.Group();
  for (const i of [0, 1])
    for (const j of [0, 1]) {
      const p = smallPackage({
        size: 27, die: 13, seed: 40 + i * 2 + j, hue: [175, 230], id: 'cx9', label: 'ConnectX-9 SuperNIC',
        info: '800 Gb/s (200G SerDes) scale-out NIC with programmable RDMA. 8 per tray = one 1.6 Tb/s path per Rubin GPU.',
      });
      p.position.set(side * 18 + (i - 0.5) * 36, top, -20 + (j - 0.5) * 38);
      nics.add(p);
      // nearby caps / regulators
      for (let k = 0; k < 6; k++) nics.add(mesh(box(1.6, 0.8, 0.8), M.mlcc, p.position.x + 15.5, top, p.position.z - 8 + k * 3));
    }
  g.add(nics);
  // VRM bits
  for (let i = 0; i < 6; i++) g.add(mesh(new RoundedBoxGeometry(6, 3.5, 6, 2, 0.4), M.ferrite, side * -40 + (i % 3) * 9 - 9, top + 1.75, -62 + Math.floor(i / 3) * 9));
  // board-to-board connector at the rear edge (towards the midplane)
  const conn = edgeConnector(80);
  conn.position.set(0, top, -d / 2 + 12);
  conn.rotation.y = Math.PI;
  g.add(conn);
  // module label
  g.add(mesh(new THREE.PlaneGeometry(36, 11), new THREE.MeshStandardMaterial({ map: labelTexture(['CX9 SuperNIC x4', '900-9X95-00L1']), roughness: 0.6 }), side * -50, top + 0.02, 30).rotateX(-Math.PI / 2));
  tagPart(g, 'nic-module', 'ConnectX-9 SuperNIC module', 'Four ConnectX-9 SuperNICs on a hot-pluggable carrier. Plugs into the midplane with no cables; ports exit at the front/rear for the Spectrum-X / Quantum-X scale-out fabric.');
  return g;
}

function mgmtModule() {
  const M = materials();
  const g = new THREE.Group();
  const w = 140, d = 176;
  g.add(mesh(box(w, 4, d), M.blackAnodized, 0, WALL, 0));
  const b = moduleBoard(w - 6, d - 8, modPcb());
  b.position.y = WALL + 4;
  g.add(b);
  const top = WALL + 5.6;
  // large aluminium cover (as in the NVIDIA render)
  g.add(mesh(new RoundedBoxGeometry(104, 3, 70, 2, 0.8), M.aluminum, 0, top + 9.5, d / 2 - 44));
  for (const sx of [-1, 1]) g.add(mesh(box(4, 8, 66), M.blackAnodized, sx * 50, top, d / 2 - 44));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(screwHead(M.screw, 1.6, 0.8), sx * 47, top + 11, d / 2 - 44 + sz * 30));
  // BMC + HMC SoCs, DRAM, TPM
  const bmc = ic(19, 1.4, 19, ['AST2700', 'A1', '2531']);
  bmc.position.set(-28, top, -24);
  tagPart(bmc, 'bmc', 'Baseboard management controller (BMC)', 'Out-of-band management: power control, sensors, firmware updates, remote console.');
  g.add(bmc);
  const hmc = ic(15, 1.3, 15, ['HMC', 'FPGA']);
  hmc.position.set(4, top, -24);
  tagPart(hmc, 'hmc', 'HGX/host management controller', 'Coordinates GPU telemetry, RAS and secure-boot attestation for the superchips.');
  g.add(hmc);
  for (const z of [-44, -6]) g.add(at(lpddrPackage(10, 13), 30, top, z));
  g.add(at(ic(6, 1, 6, ['TPM', '2.0']), -50, top, -50));
  const conn = edgeConnector(90);
  conn.position.set(0, top, -d / 2 + 12);
  conn.rotation.y = Math.PI;
  g.add(conn);
  tagPart(g, 'mgmt-module', 'Management module', 'Tray management: BMC, root-of-trust, boot flash and the front-panel management I/O.');
  return g;
}

// ----------------------------------------------------------------------------------------------
// BlueField-4 DPU + power distribution
// ----------------------------------------------------------------------------------------------
function bluefieldZone() {
  const M = materials();
  const g = new THREE.Group();
  const d = 100;
  // BF4 card
  const card = new THREE.Group();
  card.add(mesh(box(132, 4, d - 6), M.blackAnodized, 0, WALL, 0));
  const b = moduleBoard(126, d - 12, modPcb());
  b.position.y = WALL + 4;
  card.add(b);
  const top = WALL + 5.6;
  const bf = smallPackage({
    size: 46, die: 24, dieD: 21, seed: 77, hue: [260, 320], id: 'bf4', label: 'BlueField-4 DPU',
    info: '64-core Grace CPU + ConnectX-9 on one package: 800 Gb/s, line-rate crypto, NVMe-oF storage offload and the zero-trust control plane for the tray.',
  });
  bf.position.set(0, top, 0);
  card.add(bf);
  for (const [x, z] of [[-40, -22], [-40, 2], [40, -22], [40, 2]]) {
    const p = lpddrPackage(12, 14);
    p.position.set(x, top, z);
    tagPart(p, 'bf4-lpddr', 'BlueField-4 LPDDR5', 'Local memory for the DPU\'s Grace cores (~250 GB/s).');
    card.add(p);
  }
  for (let i = 0; i < 18; i++) card.add(mesh(box(1.6, 0.8, 0.8), M.mlcc, -27 + (i % 9) * 6.5, top, 28 + Math.floor(i / 9) * 3));
  card.add(mesh(box(132, 0.5, 6), M.goldPad, 0, top - 0.3, -d / 2 + 6));
  tagPart(card, 'bf4-card', 'BlueField-4 DPU module', 'Infrastructure processor running networking, storage and security services so the CPUs and GPUs don\'t have to.');
  explode(card, 0, 60, 0);
  g.add(card);
  // power distribution boards left and right (54 V busbar -> 12 V / 48 V rails)
  for (const s of [-1, 1]) {
    const pdb = new THREE.Group();
    pdb.add(mesh(box(140, 3, d - 6), M.blackAnodized, 0, WALL, 0));
    const pb = moduleBoard(134, d - 12, modPcb());
    pb.position.y = WALL + 3;
    pdb.add(pb);
    const t2 = WALL + 4.6;
    // bus converters (bricks) under black covers
    for (const x of [-40, 0, 40]) {
      pdb.add(mesh(new RoundedBoxGeometry(34, 11, 56, 2, 1), M.blackAnodized, x, t2 + 5.5, -6));
      pdb.add(mesh(new THREE.PlaneGeometry(26, 9), new THREE.MeshStandardMaterial({ map: labelTexture(['IBC 54V→12V', '1.6 kW']), roughness: 0.6 }), x, t2 + 11.05, -10).rotateX(-Math.PI / 2));
      for (const sz of [-1, 1]) pdb.add(at(screwHead(M.screw, 1.5, 0.8), x + 13, t2 + 11, -6 + sz * 23));
    }
    // copper busbar fingers
    pdb.add(mesh(box(120, 3, 6), M.copper, 0, t2, 33));
    pdb.position.x = s * 145;
    tagPart(pdb, 'pdb', 'Power distribution board', 'Steps the rack\'s DC busbar power down to the rails feeding the superchip VRMs. NVIDIA\'s 800 VDC architecture moves the big conversion out of the tray.');
    explode(pdb, 0, 40, 0);
    g.add(pdb);
  }
  return g;
}

// ----------------------------------------------------------------------------------------------
// Midplanes
// ----------------------------------------------------------------------------------------------
function midplane(width, depth, label, info, id) {
  const M = materials();
  const g = new THREE.Group();
  // flipped PCB (components face down onto the mating connectors) + steel stiffener
  const pcbMat = new THREE.MeshPhysicalMaterial({ color: '#23211f', roughness: 0.5, clearcoat: 0.3 });
  g.add(mesh(box(width, 2.4, depth), [M.pcbEdge, M.pcbEdge, pcbMat, pcbMat, M.pcbEdge, M.pcbEdge], 0, 0, 0));
  g.add(mesh(box(width - 10, 4, 10), M.steelDark, 0, 2.4, 0));
  for (let x = -width / 2 + 12; x < width / 2 - 6; x += 38) g.add(at(screwHead(M.screw, 2, 1.2), x, 6.4, 0));
  // silkscreen-like label
  g.add(mesh(new THREE.PlaneGeometry(60, 12), new THREE.MeshStandardMaterial({ map: labelTexture([label, '44L  M9  PCIe Gen6'], { bg: '#23211f', ink: '#d8d6cc' }), roughness: 0.6 }), -width / 2 + 50, 2.42, depth / 2 - 10).rotateX(-Math.PI / 2));
  tagPart(g, id, label, info);
  explode(g, 0, 110, 0);
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

function coldPlate(w, d, h, { label = '', fittings = [] } = {}) {
  const M = materials();
  const g = new THREE.Group();
  const base = mesh(new RoundedBoxGeometry(w, h, d, 3, 1.4), M.copper, 0, h / 2, 0);
  g.add(base);
  const lid = mesh(new RoundedBoxGeometry(w - 8, 2, d - 8, 2, 0.8), coldPlateTop(), 0, h + 0.6, 0);
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
  // sx = x offset of the superchip centre in tray space; superchip front edge at d=445
  const M = materials();
  const g = new THREE.Group();
  g.name = 'cooling';
  const boardTop = 8;
  const zc = Z(445 + BOARD.L / 2); // board centre
  const bz = (z) => zc + z; // board-local z -> tray z
  const tubeY = boardTop + 22;
  const r = 3.2;

  // GPU cold plates (sit on bare dies; raised by 2.6 mm when lids are fitted)
  const gpuLift = new THREE.Group();
  gpuLift.name = 'gpu-coldplate-lift';
  for (const s of [-1, 1]) {
    const cp = coldPlate(90, 104, 9, { fittings: [[0, -36], [0, 36]] });
    cp.position.set(sx + s * 52, boardTop + 3.6, bz(-102));
    tagPart(cp, 'gpu-coldplate', 'GPU cold plate', 'Direct-to-chip liquid cold plate. Each Rubin GPU dissipates well over a kilowatt; NVIDIA designs for 45 °C inlet water so no chillers are needed.');
    gpuLift.add(cp);
  }
  g.add(gpuLift);
  // CPU cold plate
  const cpu = coldPlate(70, 74, 8, { fittings: [[-20, -26], [20, -26]] });
  cpu.position.set(sx, boardTop + 2.4, bz(37));
  tagPart(cpu, 'cpu-coldplate', 'CPU cold plate', 'Cools the Vera CPU in series with the GPU loop.');
  g.add(cpu);
  // SOCAMM memory cold plates (black anodized, one per bank of 4)
  for (const s of [-1, 1]) {
    const mc = new THREE.Group();
    mc.add(mesh(new RoundedBoxGeometry(64, 6, 92, 2, 1), M.blackAnodized, 0, 3, 0));
    for (let i = 0; i < 9; i++) mc.add(mesh(box(60, 0.6, 1.2), M.blackPowder, 0, 6, -40 + i * 10));
    for (const sz of [-1, 0, 1]) for (const xx of [-24, 24]) mc.add(at(screwHead(M.screwBlack, 1.6, 0.8), xx, 6, sz * 43));
    mc.add(mesh(box(60, 1, 88), M.thermalPadGrey, 0, -0.9, 0));
    mc.position.set(sx + s * 74.85, boardTop + 4.2, bz(37));
    tagPart(mc, 'socamm-coldplate', 'SOCAMM memory cold plate', 'Liquid-cooled plate pressing a thermal pad onto the four LPDDR5X modules beneath it.');
    g.add(mc);
  }
  // copper plumbing: rear supply/return manifold -> GPU plates -> CPU plate
  const pipes = new THREE.Group();
  const yTop = boardTop + 3.6 + 9 + 6;
  const rearZ = Z(DEPTH) + 12;
  for (const s of [-1, 1]) {
    const x = sx + s * 52;
    // supply from rear manifold to the rear fitting of each GPU plate
    pipes.add(pipe([[x, yTop, bz(-138)], [x, tubeY + 4, bz(-150)], [x, tubeY + 4, rearZ + 18], [sx + s * 14, tubeY + 4, rearZ + 18], [sx + s * 14, tubeY + 4, rearZ]], r, M.copper, 8));
    // GPU front fitting -> CPU plate
    pipes.add(pipe([[x, yTop, bz(-66)], [x, tubeY, bz(-56)], [x, tubeY, bz(-20)], [sx + s * 20, tubeY, bz(-10)], [sx + s * 20, boardTop + 2.4 + 8 + 6, bz(11)]], r, M.copper, 10));
  }
  tagPart(pipes, 'coolant-pipes', 'Copper coolant loop', 'Brazed copper tubing from the rear blind-mate quick disconnects through the GPU and CPU cold plates. Fanless: liquid carries 100% of the heat.');
  g.add(pipes);
  explode(g, 0, 230, 0);
  return g;
}

function rearHardware() {
  const M = materials();
  const g = new THREE.Group();
  // blind-mate universal quick disconnects (UQD) for coolant supply/return
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
    const bracket = mesh(box(22, 26, 4), M.steel, 0, -13, 14);
    q.add(bracket);
    q.position.set(x, 26, Z(DEPTH) - 8);
    tagPart(q, 'uqd', x < 0 ? 'Coolant supply quick-disconnect' : 'Coolant return quick-disconnect', 'Drip-free blind-mate coupling to the rack manifold. Trays are hot-swappable without touching a hose.');
    g.add(q);
    // short pipe from UQD into the tray manifold
    g.add(pipe([[x, 26, Z(DEPTH) + 14], [x, 26, Z(DEPTH) + 26], [x * 0.2, 30, Z(DEPTH) + 26]], 4, M.copper, 10));
  }
  // centre busbar clip (DC power blind-mate)
  const bb = new THREE.Group();
  bb.add(mesh(new RoundedBoxGeometry(46, 24, 44, 2, 1.5), M.lcpBlack, 0, 12, 0));
  for (const x of [-12, 12]) bb.add(mesh(box(4, 18, 30), M.copper, x, 4, -18));
  bb.add(mesh(box(40, 3, 20), M.steelDark, 0, 24, 6));
  bb.position.set(0, 14, Z(DEPTH) + 10);
  tagPart(bb, 'busbar', 'DC busbar connector', 'Blind-mates onto the rack\'s vertical power busbar - the only power connection to the tray.');
  g.add(bb);
  // rear manifold header between the two superchips
  g.add(pipe([[-180, 30, Z(DEPTH) + 26], [180, 30, Z(DEPTH) + 26]], 5, M.copper, 10));
  explode(g, 0, 0, -60);
  return g;
}

// ----------------------------------------------------------------------------------------------
// Assembly
// ----------------------------------------------------------------------------------------------
export function buildComputeTray(buildSuperchip) {
  const root = new THREE.Group();
  root.name = 'compute-tray';
  root.add(chassis());
  root.add(frontPanel());
  root.add(frontCover());

  // I/O module bays: d = 122 .. 298
  const bayZ = Z(122 + 88);
  const left = nicModule(-1); left.position.set(-147, 0, bayZ); explode(left, -20, 70, 0); root.add(left);
  const mid = mgmtModule(); mid.position.set(0, 0, bayZ); explode(mid, 0, 85, 0); root.add(mid);
  const right = nicModule(1); right.position.set(147, 0, bayZ); explode(right, 20, 70, 0); root.add(right);

  root.add(midplane(W - 12, 22, 'I/O midplane', 'Bridges the front NIC/management modules to the DPU and superchips. PCIe Gen6 with no cables.', 'io-midplane').translateY(16).translateZ(Z(310)));

  const bf = bluefieldZone();
  bf.position.set(0, 0, Z(322 + 50));
  root.add(bf);

  root.add(midplane(W - 12, 60, 'PCIe Gen6 midplane', 'Cable-free midplane (~420 x 60 mm, 44 layers): the superchips\' front-edge connectors mate straight into it, linking each GPU to its ConnectX-9 SuperNICs and the BlueField-4 DPU.', 'midplane').translateY(16).translateZ(Z(455)));

  // two superchips, front edge at d = 445
  const sc = buildSuperchip();
  const boardTop = 8;
  const zc = Z(445 + BOARD.L / 2);
  const chips = [];
  for (const [i, sx] of [[0, -110.5], [1, 110.5]]) {
    const s = i === 0 ? sc : sc.clone(true);
    s.position.set(sx, boardTop, zc);
    tagPart(s, 'superchip', `Vera Rubin Superchip ${i}`, '1 Vera CPU + 2 Rubin GPUs. Two per tray, 18 trays per NVL72 rack = 72 GPUs.');
    explode(s, 0, 70, 0);
    root.add(s);
    chips.push(s);
    // board standoffs under the superchip
    const M = materials();
    for (const [x, z] of [[-100, -180], [100, -180], [-100, 0], [100, 0], [-100, 170], [100, 170], [0, -40]]) root.add(mesh(new THREE.CylinderGeometry(3, 3, boardTop - BOARD.T - WALL, 12), M.steelDark, sx + x, WALL + (boardTop - BOARD.T - WALL) / 2, zc + z));
    root.add(superchipCooling(sx));
  }

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

// Shared building blocks for other MGX trays (see nvl8.js).
export {
  mesh, at, scaleUV, rectPath, roundRectPath, pipe, screwHead, labelTexture, chassis, modPcb, moduleBoard,
  W as TRAY_W, DEPTH as TRAY_DEPTH, H as TRAY_H, WALL as TRAY_WALL,
};
