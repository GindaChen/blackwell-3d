// Mac Studio (2026, M5 Ultra): 197 x 197 x 95 mm aluminium unibody.
//
// Interior stack (estimates; Apple's exploded view lists the parts but not their positions, see
// docs/2026-10-03-apple-design.md), bottom to top:
//   foot + bottom intake ring
//   logic board (low, so its connectors line up with the port row along the bottom of the back panel)
//   PSU under the front half; two centrifugal blowers above it
//   copper heatsink over the SoC at the rear, exhausting through the rear grille
//
// Coordinates (mm): x across, z: +98.5 front .. -98.5 rear, y: up from the desk.
import * as THREE from 'three';
import { materials } from '../parts/materials.js';
import { box } from '../parts/chips.js';
import { m5UltraPackage } from '../parts/apple.js';
import { InstancedSet, unitBox, unitRounded, inductor, ic } from '../parts/boardParts.js';
import { mesh, roundRectPath, finnedHeatsink, cable, labelTexture } from './tray.js';
import { Placer } from './superchip.js';
import { buildPcbTextures } from '../textures/pcb.js';
import { grilleHoles, blowerTop } from '../textures/apple.js';
import { tagPart, explode, shadowAll, rng } from '../lib/util.js';
import { optimize } from '../lib/optimize.js';

export const STUDIO = { W: 197, H: 95, R: 30, WALL: 2.5, FOOT: 4 };
const B = { W: 186, L: 118, T: 1.4, Y: 8, Z: -36.5 }; // logic board: size, underside height, centre z
const SOC_Z = 1;                                       // SoC centre, board-local z
const PORT_Y = 7;                                     // rear port centre height above the board top
const REAR = -98.6, FRONT = 98.6;                     // outer faces (ports sit flush, a hair proud)

// rear I/O, board-local x (viewed from behind, left to right is +x to -x)
const REAR_PORTS = [
  { x: -66, kind: 'tb5' }, { x: -53, kind: 'tb5' }, { x: -40, kind: 'tb5' }, { x: -27, kind: 'tb5' },
  { x: -8, kind: 'eth' }, { x: 12, kind: 'usba' }, { x: 28, kind: 'usba' }, { x: 46, kind: 'hdmi' }, { x: 62, kind: 'jack' },
];

let local = null;
function mats() {
  if (local) return local;
  const M = materials();
  local = {
    shell: new THREE.MeshPhysicalMaterial({ color: '#d9dcdf', metalness: 0.85, roughness: 0.3, roughnessMap: M.aluminum.roughnessMap, clearcoat: 0.1 }),
    shellInner: new THREE.MeshStandardMaterial({ color: '#9da1a6', metalness: 0.7, roughness: 0.5 }),
    holes: new THREE.MeshStandardMaterial({ color: '#050505', roughness: 0.9, alphaMap: grilleHoles(), alphaTest: 0.5 }),
    foot: new THREE.MeshStandardMaterial({ color: '#2b2c2f', metalness: 0.4, roughness: 0.55 }),
    psu: new THREE.MeshStandardMaterial({ color: '#8c9095', metalness: 0.8, roughness: 0.42, roughnessMap: M.aluminum.roughnessMap }),
    psuLabel: new THREE.MeshStandardMaterial({ map: labelTexture(['POWER SUPPLY  480W', '100-240V~  50-60Hz  6A   DC 12V'], { w: 512, h: 160 }), roughness: 0.7 }),
    blowerTop: new THREE.MeshStandardMaterial({ map: blowerTop(), roughness: 0.6 }),
    nand: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.6 }),
    ssdPcb: new THREE.MeshPhysicalMaterial({ color: '#1d2a22', roughness: 0.5, clearcoat: 0.3 }),
    portShell: new THREE.MeshStandardMaterial({ color: '#c8cacc', metalness: 1, roughness: 0.3 }),
    led: new THREE.MeshStandardMaterial({ color: '#222', emissive: '#ffffff', emissiveIntensity: 1.6 }),
    busbar: M.copper,
  };
  return local;
}

function roundedSquare(size, r) {
  return roundRectPath(new THREE.Shape(), 0, 0, size, size, r);
}

// ----------------------------------------------------------------------------------------------
// Enclosure
// ----------------------------------------------------------------------------------------------
function shell() {
  const L = mats();
  const { W, H, R, WALL, FOOT } = STUDIO;
  const g = new THREE.Group();
  g.name = 'shell';
  // walls: rounded square ring extruded upwards (shape y -> -z after the rotation)
  const ring = roundedSquare(W, R);
  ring.holes.push(roundRectPath(new THREE.Path(), 0, 0, W - WALL * 2, W - WALL * 2, R - WALL));
  const walls = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, { depth: H - FOOT - 3, bevelEnabled: false, curveSegments: 16 }), [L.shell, L.shellInner]);
  walls.rotation.x = -Math.PI / 2;
  walls.position.y = FOOT;
  g.add(walls);
  // top: slightly bevelled plate
  const top = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedSquare(W - 3, R - 1.5), {
    depth: 1.5, bevelEnabled: true, bevelThickness: 1.5, bevelSize: 1.5, bevelSegments: 4, curveSegments: 16,
  }), L.shell);
  top.rotation.x = -Math.PI / 2;
  top.position.y = H - 3;
  g.add(top);
  // rear exhaust grille: a field of dark holes across the upper back
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(132, 45), L.holes);
  grille.position.set(0, 64, REAR + 0.05);
  grille.rotation.y = Math.PI;
  g.add(grille);
  tagPart(g, 'mac-shell', 'Aluminium enclosure', 'One-piece aluminium shell, 197 × 197 × 95 mm. Air comes in through the ring of holes around the foot and leaves through the perforated grille on the back. Turn the enclosure toggle off, or drag the explode slider, to look inside.');
  explode(g, 0, 150, 0);
  return g;
}

function foot() {
  const L = mats();
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(88, 88, STUDIO.FOOT, 64), L.foot, 0, STUDIO.FOOT / 2, 0));
  // intake ring: a dark band of holes just inside the rim
  const band = new THREE.Mesh(new THREE.CylinderGeometry(88.2, 88.2, 2.2, 64, 1, true), L.holes);
  band.position.y = STUDIO.FOOT / 2;
  g.add(band);
  const plate = mesh(new THREE.CylinderGeometry(92, 92, 1.2, 64), L.shellInner, 0, STUDIO.FOOT + 0.6, 0);
  g.add(plate);
  tagPart(g, 'mac-foot', 'Foot and air intake', 'Raised circular base. The fans pull cool air in through the holes around its edge, under the machine.');
  return g;
}

// ----------------------------------------------------------------------------------------------
// Ports
// ----------------------------------------------------------------------------------------------
const PORT_SIZE = { tb5: [9, 3.4], usba: [12.5, 5.2], eth: [15.5, 12.5], hdmi: [14.5, 5], jack: [5.5, 5.5], sd: [26, 2.6] };
const PORT_INFO = {
  tb5: ['Thunderbolt 5 port', 'tb5-port', '80 Gb/s each way (120 Gb/s with Bandwidth Boost), driven straight from the M5 Ultra. With RDMA over Thunderbolt (macOS 26.2+), these ports join Mac Studios into a cluster.'],
  usba: ['USB-A port', 'usb-port', 'USB 3 at 5 Gb/s.'],
  eth: ['10 Gb Ethernet', 'eth-port', '10GBASE-T, Nbase-T capable. Used for the cluster\'s ordinary network and storage traffic.'],
  hdmi: ['HDMI 2.1', 'hdmi-port', 'Up to 8K at 60 Hz or 4K at 240 Hz.'],
  jack: ['3.5 mm headphone jack', 'audio-port', 'With support for high-impedance headphones.'],
  sd: ['SDXC card slot', 'sd-slot', 'UHS-II SD card reader.'],
};

/** A port: metal shell body running back from the face, dark opening at the face. face = +1 (front) or -1 (rear). */
function port(kind, face) {
  const L = mats();
  const M = materials();
  const [w, h] = PORT_SIZE[kind];
  const g = new THREE.Group();
  const depth = kind === 'jack' ? 8 : kind === 'sd' ? 22 : 14;
  if (kind === 'jack') {
    const b = mesh(new THREE.CylinderGeometry(w / 2 + 1, w / 2 + 1, depth, 20), M.lcpBlack, 0, 0, -face * depth / 2);
    b.rotation.x = Math.PI / 2;
    g.add(b);
    const o = mesh(new THREE.CircleGeometry(w / 2 - 0.6, 20), M.portDark, 0, 0, face * 0.02);
    if (face < 0) o.rotation.y = Math.PI;
    g.add(o);
  } else {
    g.add(mesh(box(w + 1, h + 1, depth), kind === 'eth' ? M.lcpBlack : L.portShell, 0, -(h + 1) / 2, -face * depth / 2));
    const o = mesh(new THREE.PlaneGeometry(w - 0.6, h - 0.6), M.portDark, 0, 0, face * 0.02);
    if (face < 0) o.rotation.y = Math.PI;
    g.add(o);
    if (kind === 'tb5' || kind === 'usba') g.add(mesh(box(w * 0.6, 0.6, 2), M.lcpBlack, 0, -0.3, -face * 1.2)); // tongue
  }
  const [label, id, info] = PORT_INFO[kind];
  tagPart(g, id, label, info);
  return g;
}

// ----------------------------------------------------------------------------------------------
// Logic board
// ----------------------------------------------------------------------------------------------
function logicBoard() {
  const M = materials();
  const L = mats();
  const r = rng(519);
  const root = new THREE.Group();
  root.name = 'logic-board';
  const P = new Placer(B.W, B.L);
  const pads = [], silk = [], holes = [], bundles = [], pours = [], viaKeep = [];
  const keep = (x, z, w, d) => { P.mark(x, z, w, d); viaKeep.push({ x, z, w, d }); };

  // SoC
  keep(0, SOC_Z, 62, 74);
  const soc = m5UltraPackage();
  soc.position.set(0, 0.05, SOC_Z);
  tagPart(soc, 'm5-ultra', 'Apple M5 Ultra', 'Two M5 Max chips joined by UltraFusion: 36-core CPU (12 super + 24 performance cores), 80-core GPU, 32-core Neural Engine, 1.2 TB/s to up to 512 GB of unified memory.');
  explode(soc, 0, 28, 0);
  root.add(soc);
  silk.push({ type: 'corners', x: 0, z: SOC_Z, w: 64, d: 76, k: 5, lw: 0.35 });

  // rear ports along the board's rear edge
  const zRear = REAR - B.Z;
  for (const p of REAR_PORTS) {
    const o = port(p.kind, -1);
    o.position.set(p.x, PORT_Y + PORT_SIZE[p.kind][1] / 2, zRear);
    root.add(o);
    keep(p.x, -B.L / 2 + 5, PORT_SIZE[p.kind][0] + 3, 12);
  }

  // power delivery: inductors flanking the SoC and along its front edge
  let li = 0;
  const addL = (x, z) => {
    const l = inductor(7.5, 5, 7.5, 'R22');
    l.position.set(x, 0.05, z);
    tagPart(l, 'soc-vrm', 'SoC voltage regulator', 'Multiphase regulators that turn the PSU\'s 12 V into the sub-1 V rails of the CPU, GPU and memory. The M5 Ultra can draw a few hundred watts at full load.');
    root.add(l);
    keep(x, z, 8.5, 8.5);
    li++;
  };
  for (const s of [-1, 1]) for (let z = SOC_Z - 32; z <= SOC_Z + 32; z += 9.2) addL(s * 37.5, z);
  for (let x = -27; x <= 27; x += 9) addL(x, SOC_Z + 42);

  // two SSD NAND modules (the flash controller is inside the SoC)
  for (const [i, s] of [[0, -1], [1, 1]]) {
    const g = new THREE.Group();
    g.add(mesh(box(20, 0.8, 58), L.ssdPcb));
    for (const z of [-15, 12]) g.add(mesh(box(14, 1.2, 18), L.nand, 0, 0.8, z));
    g.add(mesh(box(20, 2.4, 4), M.lcpBlack, 0, -0.4, -30)); // edge connector
    g.position.set(s * 76, 1.6, SOC_Z + 6);
    tagPart(g, 'ssd-module', `SSD module ${i}`, 'Removable module carrying only NAND flash. The SSD controller is built into the M5 Ultra, which is why these are not standard M.2 drives. Two slots, up to 16 TB.');
    explode(g, 0, 14, 0);
    root.add(g);
    keep(s * 76, SOC_Z + 6, 22, 64);
    silk.push({ type: 'text', x: s * 76, z: SOC_Z - 30, text: `SSD${i}`, size: 1.8 });
  }

  // small chips: TB5 retimers by the ports, 10GbE PHY, N1 wireless, PMICs
  const misc = (obj, x, z, w, d, id, label, info) => {
    if (!P.tryPlace(x, z, w, d, 0.6)) return;
    obj.position.set(x, 0.05, z);
    tagPart(obj, id, label, info);
    root.add(obj);
    pads.push({ x, z, w: w + 0.8, d: d + 0.8 });
    silk.push({ type: 'rect', x, z, w: w + 1.6, d: d + 1.6, pin1: true, lw: 0.15 });
  };
  for (const p of REAR_PORTS.filter((q) => q.kind === 'tb5'))
    misc(ic(6.5, 1.0, 6.5, ['APL', 'RT5']), p.x, -B.L / 2 + 17, 6.5, 6.5, 'tb5-retimer', 'Thunderbolt 5 retimer', 'Cleans up the 80 Gb/s signal between the SoC and the port, so it survives the long board trace and the cable.');
  misc(ic(9, 1.2, 9, ['10GBASE-T', 'PHY']), -8, -B.L / 2 + 17, 9, 9, 'eth-10g', '10 Gb Ethernet controller', 'Drives the 10GBASE-T port.');
  misc(ic(8, 1.0, 6, ['N1']), 66, 20, 8, 6, 'n1-chip', 'Apple N1 wireless chip', 'Wi-Fi 7, Bluetooth 6 and Thread.');
  for (const [x, z] of [[-62, 30], [62, -10], [-62, -24], [48, 44]])
    misc(ic(7, 1.0, 7, ['PMU']), x, z, 7, 7, 'pmic', 'Power management IC', 'Sequences and supervises the board\'s power rails.');

  // passives
  const sets = {
    mlcc: new InstancedSet(unitBox(), M.mlcc, { id: 'mlcc', label: 'MLCC decoupling capacitors', info: 'Ceramic capacitors that keep the supply rails steady.' }),
    pstage: new InstancedSet(unitRounded(0.1), M.powerStage, { id: 'power-stage', label: 'Power stages', info: 'Switching stages of the SoC voltage regulators.' }),
  };
  for (const s of [-1, 1]) for (let z = SOC_Z - 32; z <= SOC_Z + 32; z += 4.6)
    if (P.tryPlace(s * 46, z, 4.2, 3.6, 0.2)) { sets.pstage.add(s * 46, 0.05, z, 4.2, 1.6, 3.6); pads.push({ x: s * 46, z, w: 4.8, d: 4 }); }
  for (let i = 0; i < 2600; i++) {
    const x = r.range(-90, 90), z = r.range(-56, 56), rot = r.chance(0.5);
    const [l, w, h] = r.chance(0.7) ? [1.0, 0.5, 0.5] : [1.6, 0.8, 0.8];
    const fw = rot ? w : l, fd = rot ? l : w;
    if (!P.tryPlace(x, z, fw, fd, 0.15)) continue;
    sets.mlcc.add(x, 0.04, z, l, h, w, rot ? Math.PI / 2 : 0);
    pads.push({ x, z, w: fw * 1.1, d: fd * 1.1 });
  }
  for (const s of Object.values(sets)) root.add(s.build());

  for (const [x, z] of [[-88, -54], [88, -54], [-88, 54], [88, 54], [-50, 40], [50, 40]]) holes.push({ x, z, r: 1.4, ring: 3 });
  for (const s of [-1, 1]) {
    bundles.push({ pts: [[s * 20, SOC_Z - 37], [s * 30, -44], [s * 50, -50]], n: 24, pitch: 0.4, width: 0.13 });
    bundles.push({ pts: [[s * 31, SOC_Z + 10], [s * 60, SOC_Z + 10], [s * 66, SOC_Z - 18]], n: 16, pitch: 0.4, width: 0.13 });
  }
  pours.push({ x: 0, z: 52, w: 120, d: 10 });
  silk.push({ type: 'text', x: -40, z: 50, text: '820-03621  REV 1.0', size: 1.6, weight: 600 });

  const tex = buildPcbTextures({ W: B.W, L: B.L, ppm: 8, seed: 31, pads, silk, holes, bundles, pours, viaKeepouts: viaKeep, viaCount: 3500 });
  const top = new THREE.MeshPhysicalMaterial({
    map: tex.map, normalMap: tex.normal, normalScale: new THREE.Vector2(0.3, 0.3),
    roughnessMap: tex.rm, metalnessMap: tex.rm, roughness: 1, metalness: 1, clearcoat: 0.12, clearcoatRoughness: 0.5,
  });
  const bottom = new THREE.MeshStandardMaterial({ color: '#1f1e1c', roughness: 0.6 });
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(B.W, B.T, B.L), [M.pcbEdge, M.pcbEdge, top, bottom, M.pcbEdge, M.pcbEdge]);
  pcb.position.y = -B.T / 2;
  tagPart(pcb, 'mac-board', 'Logic board', 'The main board: M5 Ultra, its voltage regulators, the SSD module slots and every rear port.');
  root.add(pcb);
  root.position.set(0, B.Y + B.T, B.Z);
  return root;
}

// ----------------------------------------------------------------------------------------------
// Power, front I/O, cooling
// ----------------------------------------------------------------------------------------------
function powerSupply() {
  const L = mats();
  const M = materials();
  const g = new THREE.Group();
  const psu = new THREE.Group();
  psu.add(mesh(box(176, 21, 60), L.psu));
  const lab = mesh(new THREE.PlaneGeometry(70, 22), L.psuLabel, 30, 21.02, 0);
  lab.rotation.x = -Math.PI / 2;
  psu.add(lab);
  psu.position.set(0, 6, 56);
  tagPart(psu, 'psu', 'Power supply', 'Internal 480 W supply: mains AC in, 12 V DC out to the logic board over a copper bus bar. No external power brick.');
  g.add(psu);
  // AC inlet on the back panel, wired to the PSU
  const inlet = new THREE.Group();
  const ib = mesh(new THREE.CylinderGeometry(7.5, 7.5, 12, 28), M.lcpBlack, 0, 0, 0);
  ib.rotation.x = Math.PI / 2;
  inlet.add(ib);
  const face = mesh(new THREE.CircleGeometry(6, 28), M.portDark, 0, 0, -6.02);
  face.rotation.y = Math.PI;
  inlet.add(face);
  inlet.position.set(82, 16, REAR + 6);
  tagPart(inlet, 'ac-inlet', 'AC power inlet', 'Mains power in. The figure-8 style cord plugs straight into the back.');
  g.add(inlet);
  g.add(cable([[82, 16, -86], [84, 14, -40], [84, 14, 20], [80, 16, 27]], 2.2, '#1a1a1b'));
  // DC bus bar from the PSU's rear face up onto the board's front edge
  const bar = new THREE.Group();
  bar.add(mesh(box(14, 1.6, 10), L.busbar, 0, 27, 0));
  bar.add(mesh(box(14, 18, 1.6), L.busbar, 0, 10, 4.2));
  bar.position.set(-62, 0, 22);
  tagPart(bar, 'mac-busbar', 'DC bus bar', 'Copper bar (with an insulator) that carries 12 V from the PSU to the logic board: up to 40 A at full load.');
  g.add(bar);
  return g;
}

function frontIO() {
  const L = mats();
  const g = new THREE.Group();
  g.add(mesh(box(66, 22, 1.4), L.ssdPcb, 60, 8, 90));
  const ports = [[46, 'tb5'], [59, 'tb5'], [79, 'sd']];
  for (const [x, kind] of ports) {
    const o = port(kind, 1);
    o.position.set(x, 18, FRONT);
    g.add(o);
  }
  g.add(cable([[34, 14, 88], [30, 12, 40], [30, 12, 26], [30, 11, 20]], 1.2, '#2f2f30'));
  const led = mesh(new THREE.CircleGeometry(0.9, 16), L.led, -82, 16, FRONT + 0.02);
  g.add(led);
  tagPart(g, 'front-io', 'Front I/O board', 'Two Thunderbolt 5 ports (on M5 Ultra models) and the SDXC slot, linked to the logic board by a flex cable.');
  explode(g, 0, 0, 30);
  return g;
}

function blower(i) {
  const M = materials();
  const L = mats();
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(42, 42, 30, 48), M.lcpBlack, 0, 15, 0));
  const top = mesh(new THREE.CircleGeometry(41.5, 48), L.blowerTop, 0, 30.02, 0);
  top.rotation.x = -Math.PI / 2;
  g.add(top);
  // scroll outlet ducted back into the heatsink
  g.add(mesh(box(64, 26, 30), M.lcpBlack, 0, 2, -40));
  tagPart(g, 'blower', `Blower fan ${i}`, 'One of two large centrifugal fans. They pull air up through the foot and push it back through the copper heatsink and out of the rear grille. Max about 3,600 rpm; nearly silent at idle.');
  explode(g, 0, 72, 0);
  return g;
}

function cooling() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'cooling';
  for (const [i, s] of [[0, -1], [1, 1]]) {
    const b = blower(i);
    b.position.set(s * 44, 32, 50);
    g.add(b);
  }
  const hs = new THREE.Group();
  const socTop = B.Y + B.T + 4.9;
  hs.add(mesh(box(76, 4, 80), M.copper, 0, socTop, B.Z + SOC_Z));
  const fins = finnedHeatsink(140, 88, 50, { pitch: 2.1, fin: 0.35, base: 2, mat: M.copper });
  fins.position.set(0, socTop + 4, -51);
  hs.add(fins);
  tagPart(hs, 'mac-heatsink', 'Copper heatsink', 'Copper base and fin stack over the SoC (M5 Max models use aluminium). The blowers force air through the fins and out of the back.');
  explode(hs, 0, 52, 0);
  g.add(hs);
  return g;
}

// ----------------------------------------------------------------------------------------------
export function buildMacStudio() {
  const root = new THREE.Group();
  root.name = 'mac-studio';
  root.add(foot());
  root.add(logicBoard());
  root.add(powerSupply());
  root.add(frontIO());
  root.add(cooling());
  root.add(shell());
  shadowAll(root);
  root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  return optimize(root);
}

export function setShell(root, on) {
  root.traverse((o) => { if (o.name === 'shell') o.visible = on; });
}
