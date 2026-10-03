// Passively cooled Tesla PCIe card (K80, M40 and kin), built from a per-card layout spec.
//
// Sources: NVIDIA Tesla K80 board specification BD-07317-001_v05 (267 x 111.15 mm full-height,
// dual-slot; 45 x 45 mm GPU packages; 48 x GDDR5 256M x 16; one EPS-12V 8-pin on the "east" edge,
// i.e. the end away from the bracket; passive heatsink; vented bracket). Component positions on the
// board are estimates from press and teardown photos (no CAD). See docs/2026-10-03-kepler-design.md.
//
// Card coordinates (mm), the card stands in its slot as in a server:
//   x: along the card, -133.5 = bracket end .. +133.5 = rear ("east") end with the power connector
//   y: up, 0 = bottom of the PCIe edge fingers; the PCB body spans y = 8 .. 111.15 (estimate for 8)
//   z: +z = component (front) side, the PCB front surface is z = 0, its back surface z = -1.6
// Internally the board is built flat (like superchip.js: parts on y = 0, board "height" along z) and
// rotated upright at the end: flat (x, y, z) -> card (x, YC - z, y).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from '../../parts/materials.js';
import { box, frame, topMesh } from '../../parts/chips.js';
import { InstancedSet, unitBox, unitRounded, inductor, ic } from '../../parts/boardParts.js';
import { buildPcbTextures } from '../../textures/pcb.js';
import { substrateTexture } from '../../textures/silicon.js';
import { markedTop, perforation } from '../../textures/surfaces.js';
import { Placer } from '../../assemblies/superchip.js';
import { rng, tagPart, explode, shadowAll, makeCanvas, canvasTexture } from '../../lib/util.js';
import { optimize } from '../../lib/optimize.js';
import { shroudLabel } from './silicon.js';

export const CARD = { L: 267, H: 111.15, BODY_Y0: 8, T: 1.6, SLOT: 40.6 };
export const YC = (CARD.BODY_Y0 + CARD.H) / 2;       // card y of the board centre line
const BL = CARD.H - CARD.BODY_Y0;                     // PCB body height (along flat z)
export const lz = (y) => YC - y;                      // card y -> flat z
// PCIe x16 edge fingers: 89 mm long, short 11.65 mm power section nearest the bracket (estimate of
// the offset from the bracket).
const FINGER_X0 = -92.5, FINGER_LEN = 89, FINGER_KEY = 11.65, FINGER_GAP = 1.9;
// GDDR5 FBGA-170 package: 12 x 14 mm (JEDEC). Around each GPU: 3 left, 3 right, 3 above, 3 below.
const MEM = [
  ...[-15, 0, 15].flatMap((dy) => [[-30, dy, 12, 14], [30, dy, 12, 14]]),
  ...[-16, 0, 16].flatMap((dx) => [[dx, 30.5, 14, 12], [dx, -30.5, 14, 12]]),
];
const SHROUD_TOP = 36.2;   // outer face of the shroud, flat y (card z): 1.6 + 36.2 ~ dual-slot

const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };

let gddrMat = null;
function gddr5Mat() {
  if (!gddrMat) gddrMat = new THREE.MeshStandardMaterial({
    map: markedTop({ w: 256, h: 300, lines: ['GDDR5', '256Mx16', 'BC03  1438'], size: 30, ink: 'rgba(175,175,175,0.5)' }),
    roughness: 0.62,
  });
  return gddrMat;
}

let fingerMat = null;
function fingerMaterial() {
  if (fingerMat) return fingerMat;
  const c = makeCanvas(1024, 64);
  const x = c.getContext('2d');
  x.fillStyle = '#2b2926'; x.fillRect(0, 0, 1024, 64);
  for (let i = 0; i < 41; i++) { x.fillStyle = '#e2b866'; x.fillRect(4 + i * 24.8, 6, 15, 58); }
  const t = canvasTexture(c);
  fingerMat = new THREE.MeshStandardMaterial({ map: t, metalness: 0.9, roughness: 0.3 });
  return fingerMat;
}

/** GPU package: 45 x 45 mm flip-chip BGA with a bare die inside a metal shim frame. */
export function gpuPackage({ look, dieW, dieD, size = 45, label, info, seed = 3 }) {
  const M = materials();
  const g = new THREE.Group();
  const sub = new THREE.MeshPhysicalMaterial({
    map: substrateTexture({ w: 512, h: 512, color: '#1e231d', capColor: '#c8b27c', ring: 0.08, seed }),
    roughness: 0.42, metalness: 0.08, clearcoat: 0.35, clearcoatRoughness: 0.3,
  });
  g.add(topMesh(size, 1.3, size, sub, M.pcbEdge));
  // shim frame that keeps a tilted heatsink off the die corners
  g.add(frame(size - 1.5, size - 1.5, (size - dieW) / 2 - 4.5, 0.8, M.steelDark, 1.3));
  const uf = mesh(box(dieW + 1.4, 0.35, dieD + 1.4), M.underfill, 0, 1.28, 0);
  g.add(uf);
  // die-side capacitors between die and shim
  for (const s of [-1, 1]) for (let k = -4; k <= 4; k++) {
    g.add(mesh(box(1.0, 0.5, 0.5), M.mlccGrey, k * 2.2, 1.3, s * (dieD / 2 + 2)));
    g.add(mesh(box(0.5, 0.5, 1.0), M.mlccGrey, s * (dieW / 2 + 2), 1.3, k * 2.2));
  }
  const die = mesh(box(dieW, 0.75, dieD), look().marked, 0, 1.3, 0);
  die.userData.looks = look.key;
  tagPart(die, 'gpu-die', label.die, info.die);
  explode(die, 0, 10, 0);
  g.add(die);
  tagPart(g, 'gpu-package', label.pkg, info.pkg);
  return g;
}

function epsConnector() {
  const M = materials();
  const g = new THREE.Group();
  const W = 13, H = 12.5, D = 19.5;
  g.add(mesh(new RoundedBoxGeometry(W, H, D, 2, 0.6), M.lcpBlack, 0, H / 2, 0));
  // 2 x 4 square pin cavities on the mating face (+x, off the end of the card)
  for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++)
    g.add(mesh(box(0.4, 3.9, 3.9), M.portDark, W / 2 + 0.05, 1.8 + r * 4.8, -6.3 + k * 4.2));
  // latch ramp on the outer face
  g.add(mesh(box(4, 1.4, 4.5), M.lcpBlack, W / 2 - 3, H, 0));
  // through-hole tails at the inner side
  for (let k = 0; k < 4; k++) g.add(mesh(box(1.2, 0.6, 1.2), M.screw, -W / 2 - 1.5, 0, -6.3 + k * 4.2));
  return g;
}

/**
 * Build a Tesla card.
 * spec: {
 *   name, seed, pcbText: [lines], shroud: { color, ink, text: [title, sub] },
 *   gpus: [{ x, y, look, dieW, dieD, label: { pkg, die }, info: { pkg, die } }],
 *   plx: { x, y } | null, eps: { x, y }, brake: { x, y } | null,
 *   inductors: [[x, y, size]], drmos: [[x, y]], tants: [[x, y, rot]], ctrls: [[x, y]], roms: [[x, y]],
 *   fins: [[x0, x1]], text: { ... hover texts }
 * }
 * All positions are card x / card y (mm).
 */
export function buildTeslaCard(spec) {
  const M = materials();
  const r = rng(spec.seed ?? 80);
  const T = CARD.T;
  const root = new THREE.Group();
  root.name = spec.name;
  const card = new THREE.Group();
  const P = new Placer(CARD.L, BL);
  const pads = [], silk = [], holes = [], bundles = [], pours = [], viaKeep = [];
  const backPads = [], backSilk = [];
  const keep = (x, y, w, h) => { P.mark(x, lz(y), w, h); viaKeep.push({ x, z: lz(y), w, d: h }); };
  const TX = spec.text;

  // shroud side walls run along the top and bottom edges: keep 3 mm strips clear
  P.mark(0, -BL / 2 + 1.5, CARD.L, 3);
  P.mark(0, BL / 2 - 1.5, CARD.L, 3);

  for (const [x, y] of spec.holes) keep(x, y, 6.5, 6.5);
  P.mark(spec.markAt[0], lz(spec.markAt[1] - 3.2), 34, 11);

  // ---------------- GPUs and their GDDR5 ----------------
  const backMem = new THREE.Group();
  spec.gpus.forEach((gs, i) => {
    keep(gs.x, gs.y, 47, 47);
    const pkg = gpuPackage({ ...gs, seed: 3 + i });
    pkg.position.set(gs.x, 0, lz(gs.y));
    explode(pkg, 0, 30, 0);
    card.add(pkg);
    silk.push({ type: 'corners', x: gs.x, z: lz(gs.y), w: 49, d: 49, k: 5, lw: 0.35 });
    silk.push({ type: 'text', x: gs.x, z: lz(gs.y + 27.2), text: spec.gpus.length > 1 ? `U${i + 1}  GPU${i}` : 'U1', size: 1.6 });
    MEM.forEach(([dx, dy, w, h], k) => {
      const x = gs.x + dx, y = gs.y + dy;
      keep(x, y, w + 1, h + 1);
      const front = mesh(box(w, 1.1, h), gddr5Mat(), x, 0.05, lz(y));
      tagPart(front, 'gddr5', `GDDR5 chip (GPU${i}, front)`, TX.gddr5);
      explode(front, 0, 14, 0);
      card.add(front);
      const back = mesh(box(w, 1.1, h), gddr5Mat(), x, -T - 1.15, lz(y));
      back.rotation.x = Math.PI; back.position.y = -T - 0.05;
      tagPart(back, 'gddr5', `GDDR5 chip (GPU${i}, back)`, TX.gddr5Back);
      explode(back, 0, -14, 0);
      backMem.add(back);
      pads.push({ x, z: lz(y), w: w - 0.6, d: h - 0.6, color: '#2a2722' });
      backPads.push({ x, z: lz(y), w: w - 0.6, d: h - 0.6, color: '#2a2722' });
      backSilk.push({ type: 'corners', x, z: lz(y), w: w + 0.8, d: h + 0.8, k: 1.4, lw: 0.2 });
      silk.push({ type: 'corners', x, z: lz(y), w: w + 0.8, d: h + 0.8, k: 1.4, lw: 0.2 });
      // 64-bit channel bundle from each chip towards the package edge (pairs share a channel in clamshell)
      const ex = gs.x + Math.sign(dx) * Math.min(Math.abs(dx), 21), ey = gs.y + Math.sign(dy) * Math.min(Math.abs(dy), 21);
      bundles.push({ pts: [[x, lz(y)], [ex, lz(ey)]], n: 8, pitch: 0.4, width: 0.13 });
      if (k === 0) silk.push({ type: 'text', x: x - 8, z: lz(y), text: 'M1', size: 1.0, rot: -Math.PI / 2 });
    });
  });
  card.add(backMem);

  // ---------------- PLX PCIe switch (dual-GPU boards) ----------------
  if (spec.plx) {
    const { x, y } = spec.plx;
    keep(x, y, 28, 28);
    const plx = ic(27, 2.3, 27, ['PLX', 'PEX8747', 'CA80BC G', '1436'], {});
    plx.position.set(x, 0.05, lz(y));
    tagPart(plx, 'plx-switch', 'PLX PCIe switch', TX.plx);
    explode(plx, 0, 20, 0);
    card.add(plx);
    silk.push({ type: 'rect', x, z: lz(y), w: 29, d: 29, pin1: true, lw: 0.25 });
    silk.push({ type: 'text', x, z: lz(y - 16.5), text: 'U5  PCIE SW', size: 1.3 });
    // x16 up to the fingers, x16 out to each GPU
    bundles.push({ pts: [[x, lz(y - 13.5)], [x, lz(14)], [FINGER_X0 + 45, lz(9)]], n: 32, pitch: 0.42, width: 0.14 });
    for (const gs of spec.gpus) {
      const s = Math.sign(gs.x - x);
      bundles.push({ pts: [[x + s * 13.5, lz(y)], [gs.x - s * 25, lz(y)], [gs.x - s * 25, lz(gs.y - 14)]], n: 32, pitch: 0.42, width: 0.14 });
    }
  } else {
    const gs = spec.gpus[0];
    bundles.push({ pts: [[gs.x + 10, lz(gs.y - 23)], [gs.x + 10, lz(16)], [FINGER_X0 + 45, lz(9)]], n: 32, pitch: 0.42, width: 0.14 });
  }

  // ---------------- power entry ----------------
  {
    const { x, y } = spec.eps;
    keep(x, y, 16, 21);
    const c = epsConnector();
    c.position.set(x, 0, lz(y));
    tagPart(c, 'eps-conn', 'EPS-12V 8-pin power connector', TX.eps);
    explode(c, 28, 0, 0);
    card.add(c);
    silk.push({ type: 'text', x: x - 12, z: lz(y), text: 'J2  12V', size: 1.3, rot: -Math.PI / 2 });
    pours.push({ x: (x + 60) / 2, z: lz(y - 25), w: x - 60, d: 70 });
  }
  if (spec.brake) {
    const { x, y } = spec.brake;
    keep(x, y, 6, 4);
    const g = new THREE.Group();
    g.add(mesh(box(5.4, 5.6, 2.8), M.nylonWhite));
    for (const s of [-1, 1]) g.add(mesh(box(0.64, 2.6, 0.64), M.gold, s * 1.25, 5.6, 0));
    g.position.set(x, 0, lz(y));
    tagPart(g, 'brake-header', 'Power-brake header', TX.brake);
    card.add(g);
    silk.push({ type: 'text', x, z: lz(y - 4.5), text: 'J3 PWR BRK', size: 1.0 });
  }

  // ---------------- VRM ----------------
  const sets = {
    mlcc: new InstancedSet(unitBox(), M.mlcc, { id: 'mlcc', label: 'MLCC decoupling capacitors', info: TX.mlcc }),
    mlccG: new InstancedSet(unitBox(), M.mlccGrey, { id: 'mlcc', label: 'MLCC decoupling capacitors', info: TX.mlcc }),
    mlccB: new InstancedSet(unitBox(), M.mlcc, { id: 'mlcc', label: 'MLCC array behind the GPU', info: TX.mlccBack }),
    res: new InstancedSet(unitBox(), M.moldBlack, { id: 'resistor', label: 'Thick-film resistors', info: 'Pull-ups, current-sense and termination resistors.' }),
    drmos: new InstancedSet(unitBox(), M.moldBlack, { id: 'drmos', label: 'VRM power stage (MOSFETs)', info: TX.drmos }),
    tant: new InstancedSet(unitRounded(0.08), M.tantalum, { id: 'polymer-cap', label: 'Polymer tantalum capacitors', info: TX.tant }),
  };
  spec.inductors.forEach(([x, y, s], i) => {
    keep(x, y, s + 0.8, s + 0.8);
    const l = inductor(s, s * 0.62, s, `R${s > 9 ? 22 : 47}`);
    l.position.set(x, 0, lz(y));
    tagPart(l, 'vrm-inductor', 'VRM output inductor', TX.inductor);
    explode(l, 0, 12, 0);
    card.add(l);
    pads.push({ x: x - s / 2 + 1, z: lz(y), w: 2.2, d: s * 0.7 }, { x: x + s / 2 - 1, z: lz(y), w: 2.2, d: s * 0.7 });
    if (i % 2 === 0) silk.push({ type: 'text', x, z: lz(y + s / 2 + 1.4), text: `L${i + 1}`, size: 1.0 });
  });
  for (const [x, y] of spec.drmos) if (P.tryPlace(x, lz(y), 5, 6, 0.2)) {
    sets.drmos.add(x, 0.05, lz(y), 5, 0.9, 6, 0);
    pads.push({ x, z: lz(y), w: 5.4, d: 6.4, color: '#3b372f' });
  }
  for (const [x, y, rot] of spec.tants) {
    const fw = rot ? 4.3 : 7.3, fd = rot ? 7.3 : 4.3;
    if (P.tryPlace(x, lz(y), fw, fd, 0.25)) {
      sets.tant.add(x, 0.05, lz(y), 7.3, 1.9, 4.3, rot ? Math.PI / 2 : 0);
      // two end terminations only
      if (rot) pads.push({ x, z: lz(y) - 3.4, w: 3.2, d: 1.4 }, { x, z: lz(y) + 3.4, w: 3.2, d: 1.4 });
      else pads.push({ x: x - 3.4, z: lz(y), w: 1.4, d: 3.2 }, { x: x + 3.4, z: lz(y), w: 1.4, d: 3.2 });
    }
  }
  const addIC = (obj, x, y, w, d, id, label, info) => {
    if (!P.tryPlace(x, lz(y), w, d, 0.5)) return;
    obj.position.set(x, 0.05, lz(y));
    tagPart(obj, id, label, info);
    card.add(obj);
    pads.push({ x, z: lz(y), w: w + 0.8, d: d + 0.8 });
    silk.push({ type: 'rect', x, z: lz(y), w: w + 1.6, d: d + 1.6, pin1: true, lw: 0.15 });
  };
  spec.ctrls.forEach(([x, y]) => addIC(ic(5, 0.9, 5, ['PWM', 'CTRL']), x, y, 5, 5, 'vrm-ctrl', 'Multiphase VRM controller', TX.ctrl));
  spec.roms.forEach(([x, y], i) => addIC(ic(5, 1.2, 4, ['25X20', '2Mb']), x, y, 5, 4, 'bios-rom', `BIOS ROM${spec.roms.length > 1 ? ` (GPU${i})` : ''}`, TX.rom));

  // ---------------- passives ----------------
  const addMLCC = (x, z, size, rot, set = null) => {
    const [l, w, h] = [[1.0, 0.5, 0.5], [1.6, 0.8, 0.8], [2.0, 1.25, 1.1]][size];
    const fw = rot ? w : l, fd = rot ? l : w;
    if (!P.tryPlace(x, z, fw, fd, 0.18)) return false;
    (set || (r.chance(0.3) ? sets.mlccG : sets.mlcc)).add(x, 0.04, z, l, h, w, rot ? Math.PI / 2 : 0);
    const pl = l * 0.28;
    if (rot) pads.push({ x, z: z - l / 2 + pl / 2, w: w * 1.15, d: pl * 1.3 }, { x, z: z + l / 2 - pl / 2, w: w * 1.15, d: pl * 1.3 });
    else pads.push({ x: x - l / 2 + pl / 2, z, w: pl * 1.3, d: w * 1.15 }, { x: x + l / 2 - pl / 2, z, w: pl * 1.3, d: w * 1.15 });
    return true;
  };
  for (const gs of spec.gpus) {
    const cz = lz(gs.y);
    for (let x = gs.x - 22; x <= gs.x + 22; x += 1.5) { addMLCC(x, cz - 24.4, 0, 0); addMLCC(x, cz + 24.4, 0, 0); }
    for (let z = cz - 22; z <= cz + 22; z += 1.5) { addMLCC(gs.x - 24.4, z, 0, 1); addMLCC(gs.x + 24.4, z, 0, 1); }
    // backside capacitor field under the die
    backSilk.push({ type: 'corners', x: gs.x, z: cz, w: 49, d: 49, k: 5, lw: 0.35 });
    for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
      if (Math.abs(i) < 2 && Math.abs(j) < 2) continue;
      sets.mlccB.add(gs.x + i * 2.4, -T - 0.5, cz + j * 2.4, 1.0, 0.5, 0.5, (i + j) % 2 ? Math.PI / 2 : 0);
      backPads.push({ x: gs.x + i * 2.4, z: cz + j * 2.4, w: 1.2, d: 1.2 });
    }
  }
  const sprinkle = (x0, x1, y0, y1, n) => {
    for (let i = 0; i < n; i++) {
      const x = r.range(x0, x1), z = lz(r.range(y0, y1));
      const k = r.int(1, 5), rot = r.chance(0.5) ? 1 : 0;
      const u = r(), size = u < 0.55 ? 0 : u < 0.85 ? 1 : 2;
      const isRes = r.chance(0.2);
      for (let j = 0; j < k; j++) {
        const step = [1.0, 1.4, 1.9][size];
        const xx = rot ? x + j * step : x, zz = rot ? z : z + j * step;
        if (isRes && size < 2) {
          const [l, w] = size ? [1.6, 0.8] : [1.0, 0.5];
          const fw = rot ? w : l, fd = rot ? l : w;
          if (P.tryPlace(xx, zz, fw, fd, 0.18)) sets.res.add(xx, 0.04, zz, l, 0.35, w, rot ? Math.PI / 2 : 0);
        } else addMLCC(xx, zz, size, rot);
      }
    }
  };
  sprinkle(-131, 131, 9, 110, 900);

  // ---------------- silkscreen / board marking ----------------
  for (let i = 0; i < 90; i++) {
    const x = r.range(-128, 128), z = lz(r.range(10, 108));
    if (!P.free(x, z, 3.6, 1.3)) continue;
    P.mark(x, z, 3.6, 1.3);
    silk.push({ type: 'text', x, z, text: `${r.pick(['C', 'C', 'R', 'R', 'L', 'Q', 'TP'])}${r.int(1, 999)}`, size: 0.85, weight: 500, rot: r.chance(0.3) ? -Math.PI / 2 : 0 });
  }
  const [mx, my] = spec.markAt;
  spec.pcbText.forEach((t, i) => silk.push({ type: 'text', x: mx, z: lz(my - i * 3.2), text: t, size: i ? 1.3 : 2.2, weight: i ? 500 : 800 }));
  for (const [x, y] of spec.holes) holes.push({ x, z: lz(y), r: 1.4, ring: 2.8 });
  pours.push({ x: 0, z: lz(10.5), w: 250, d: 3 });

  // ---------------- PCB ----------------
  const tex = buildPcbTextures({ W: CARD.L, L: BL, ppm: 9, seed: spec.seed ?? 80, pads, silk, holes, bundles, pours, viaKeepouts: viaKeep, viaCount: 3800 });
  const top = new THREE.MeshPhysicalMaterial({
    map: tex.map, normalMap: tex.normal, normalScale: new THREE.Vector2(0.3, 0.3),
    roughnessMap: tex.rm, metalnessMap: tex.rm, roughness: 1, metalness: 1, clearcoat: 0.12, clearcoatRoughness: 0.5,
  });
  // back side: same texture generator, z negated because the bottom face's v axis runs the other way
  const flipZ = (a) => a.map((p) => ({ ...p, z: -p.z }));
  const btex = buildPcbTextures({
    W: CARD.L, L: BL, ppm: 6, seed: (spec.seed ?? 80) + 1,
    pads: flipZ(backPads), silk: flipZ(backSilk), holes: flipZ(holes),
    bundles: bundles.map((b) => ({ ...b, pts: b.pts.map(([x, z]) => [x, -z]) })).filter((_, i) => i % 3 === 0),
    pours: flipZ(pours), viaKeepouts: flipZ(viaKeep), viaCount: 3000,
  });
  const bottom = new THREE.MeshPhysicalMaterial({
    map: btex.map, normalMap: btex.normal, normalScale: new THREE.Vector2(0.3, 0.3),
    roughnessMap: btex.rm, metalnessMap: btex.rm, roughness: 1, metalness: 1, clearcoat: 0.12, clearcoatRoughness: 0.5,
  });
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(CARD.L, T, BL), [M.pcbEdge, M.pcbEdge, top, bottom, M.pcbEdge, M.pcbEdge]);
  pcb.position.y = -T / 2;
  tagPart(pcb, 'card-pcb', 'Printed circuit board', TX.pcb);
  card.add(pcb);
  if (spec.sticker) {
    const c = makeCanvas(512, 200), x = c.getContext('2d');
    x.fillStyle = '#ecebe6'; x.fillRect(0, 0, 512, 200);
    x.fillStyle = '#1b1b1b';
    x.font = '700 40px Helvetica, Arial, sans-serif'; x.fillText(spec.sticker[0], 20, 50);
    x.font = '500 26px Helvetica, Arial, sans-serif';
    spec.sticker.slice(1).forEach((l, i) => x.fillText(l, 20, 88 + i * 30));
    for (let i = 0; i < 90; i++) x.fillRect(20 + i * 5.2, 150, 1 + ((i * 7919) % 4), 38);
    const st = new THREE.Mesh(new THREE.PlaneGeometry(44, 17), new THREE.MeshStandardMaterial({ map: canvasTexture(c), roughness: 0.7 }));
    st.rotation.x = Math.PI / 2;
    st.rotation.z = Math.PI;
    st.position.set(spec.sticker.x ?? 95, -T - 0.03, lz(spec.sticker.y ?? 40));
    card.add(st);
  }
  // PCIe x16 edge fingers (two sections either side of the key)
  const fingers = new THREE.Group();
  const fm = fingerMaterial();
  for (const [x0, len] of [[FINGER_X0, FINGER_KEY], [FINGER_X0 + FINGER_KEY + FINGER_GAP, FINGER_LEN - FINGER_KEY - FINGER_GAP]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, T, CARD.BODY_Y0), [M.pcbEdge, M.pcbEdge, fm, fm, M.pcbEdge, M.pcbEdge]);
    m.position.set(x0 + len / 2, -T / 2, BL / 2 + CARD.BODY_Y0 / 2);
    fingers.add(m);
  }
  tagPart(fingers, 'pcie-fingers', 'PCIe Gen3 x16 edge connector', TX.fingers);
  card.add(fingers);

  for (const s of Object.values(sets)) if (s.items.length) card.add(s.build());

  // ---------------- bracket ----------------
  const br = buildBracket();
  tagPart(br, 'bracket', 'Vented PCIe bracket', TX.bracket);
  card.add(br);

  // ---------------- heatsink ('cooling') ----------------
  const cooling = new THREE.Group();
  cooling.name = 'cooling';
  const fin = M.aluminum;
  for (const gs of spec.gpus) cooling.add(mesh(box(56, 5.0, 56), M.copper, gs.x, 2.15, lz(gs.y)));
  const finY0 = 9.2, finY1 = 34.4, fz0 = lz(109.5), fz1 = lz(11);
  for (const [x0, x1] of spec.fins) {
    const len = x1 - x0, cx = (x0 + x1) / 2;
    cooling.add(mesh(box(len, 2.0, fz1 - fz0), fin, cx, 7.2, (fz0 + fz1) / 2));
    for (let z = fz0 + 0.3; z <= fz1 - 0.3; z += 2.0) cooling.add(mesh(box(len, finY1 - finY0, 0.4), fin, cx, finY0, z));
  }
  // copper heat pipes along the base, between the GPU blocks and the far ends of the fin stacks
  const pipeMat = M.copperDark;
  for (const dz of [-30, -10, 10, 30]) {
    const x0 = spec.fins[0][0] + 4, x1 = spec.fins[spec.fins.length - 1][1] - 4;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, x1 - x0, 14), pipeMat);
    p.rotation.z = Math.PI / 2;
    p.position.set((x0 + x1) / 2, 10.2, lz(60) + dz);
    cooling.add(p);
  }
  tagPart(cooling, 'heatsink', 'Passive heatsink', TX.heatsink);
  explode(cooling, 0, 70, 0);
  card.add(cooling);

  // ---------------- shroud ('shell') ----------------
  const shell = new THREE.Group();
  shell.name = 'shell';
  const sm = new THREE.MeshPhysicalMaterial({ color: spec.shroud.color, metalness: spec.shroud.metal ?? 0.7, roughness: 0.4, clearcoat: 0.2, roughnessMap: M.aluminum.roughnessMap });
  const sx0 = -133.8, sx1 = 131.5, slen = sx1 - sx0, scx = (sx0 + sx1) / 2;
  shell.add(mesh(box(slen, 1.2, BL + 1.2), sm, scx, SHROUD_TOP - 1.2, 0));
  for (const s of [-1, 1]) shell.add(mesh(box(slen, SHROUD_TOP - 2.6, 1.2), sm, scx, 1.4, s * (BL / 2 - 0.1)));
  // darker accent band and the label on the face
  const band = new THREE.MeshStandardMaterial({ color: spec.shroud.band, metalness: 0.4, roughness: 0.5 });
  shell.add(mesh(box(slen - 6, 0.3, 22), band, scx, SHROUD_TOP, lz(26)));
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(120, 30), new THREE.MeshStandardMaterial({ map: shroudLabel(spec.shroud.text, { ink: spec.shroud.ink }), transparent: true, roughness: 0.5 }));
  lbl.rotation.x = -Math.PI / 2;
  lbl.position.set(-50, SHROUD_TOP + 0.05, lz(78));
  shell.add(lbl);
  // screws holding the shroud to the heatsink
  for (const [x, y] of [[-125, 104], [125, 104], [-125, 16], [125, 16]]) {
    const sc = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.8, 16), M.screwBlack);
    sc.position.set(x, SHROUD_TOP + 0.3, lz(y));
    shell.add(sc);
  }
  tagPart(shell, 'shroud', 'Shroud', TX.shroud);
  explode(shell, 0, 120, 0);
  card.add(shell);

  // stand the card up: flat (x, y, z) -> card (x, YC - z, y)
  card.rotation.x = Math.PI / 2;
  card.position.y = YC;
  root.add(card);

  shadowAll(root);
  root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  optimize(root);
  return root;
}

/** Vented full-height bracket at the -x end (flat coordinates). */
function buildBracket() {
  const M = materials();
  const g = new THREE.Group();
  const perf = perforation(10, 0.6);
  const mat = new THREE.MeshStandardMaterial({ color: '#c9ccce', metalness: 0.85, roughness: 0.35, alphaMap: perf.alpha, alphaTest: 0.5, normalMap: perf.normal, side: THREE.DoubleSide });
  const X = -134.6;
  const y0 = -4, y1 = 36.6, w = y1 - y0, yc = (y0 + y1) / 2;
  // card y extents of the bracket: -2 (slot tab) .. 118 (flange)
  const ventY0 = 14, ventY1 = 104;
  const geo = new THREE.PlaneGeometry(ventY1 - ventY0, w);   // u along card y, v along flat y
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ((ventY1 - ventY0) / 24), uv.getY(i) * (w / 24));
  const plate = new THREE.Mesh(geo, mat);
  plate.rotation.y = Math.PI / 2;                 // plane now spans flat z (local x) and flat y
  plate.position.set(X, yc, lz((ventY0 + ventY1) / 2));
  g.add(plate);
  const solid = M.nickelMatte;
  const band = (ya, yb) => g.add(mesh(box(0.9, w, yb - ya), solid, X, y0, lz((ya + yb) / 2)));
  band(104, 118);
  band(4, 14);
  // slot tab below the card (narrower, card side of the slot)
  g.add(mesh(box(0.9, 10, 10), solid, X, y0, lz(5.2)));
  // flange folded outwards at the top, with the screw slot
  g.add(mesh(box(11, w, 0.9), solid, X - 5.5, y0, lz(118) - 0.45));
  const scr = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 2.4, 16), M.screw);
  scr.rotation.x = Math.PI / 2;
  scr.position.set(X - 6, yc - 8, lz(118) - 1.2);
  g.add(scr);
  return g;
}
