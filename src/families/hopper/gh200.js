// NVIDIA GH200 Grace Hopper Superchip module: one Grace CPU and one Hopper GPU on one board, joined
// by 900 GB/s NVLink-C2C so the GPU can read and write CPU memory coherently.
//
// Sourced: Grace (72 Neoverse V2 cores) with up to 480 GB LPDDR5X at up to 512 GB/s; the GPU with
// 96 GB HBM3 at 4 TB/s (later 144 GB HBM3e at 4.9 TB/s); module TDP up to 1000 W (CPU + GPU +
// memory). Layout from ServeTheHome's OCP 2023 photos: the GPU on one half of the module, Grace on
// the other half flanked by LPDDR5X packages, more LPDDR5X on the back, proprietary connectors
// underneath. Board size, package placement, VRM and connector layout are ESTIMATES.
//
// Module coordinates (mm): x across (-W/2..W/2), z = -L/2 (GPU end) .. +L/2 (Grace end), y up;
// y = 0 is the underside of the connectors.
import * as THREE from 'three';
import { materials } from '../../parts/materials.js';
import { box, graceCPU } from '../../parts/chips.js';
import { InstancedSet, unitBox, unitRounded, inductor, ic, lpddr5x } from '../../parts/boardParts.js';
import { buildPcbTextures } from '../../textures/pcb.js';
import { markedTop } from '../../textures/surfaces.js';
import { Placer } from '../../assemblies/superchip.js';
import { rng, tagPart, explode, shadowAll } from '../../lib/util.js';
import { optimize } from '../../lib/optimize.js';
import { gh100Package, PKG } from './sxm5.js';

export const GH = { W: 132, L: 224, T: 1.8, MEZ_H: 5 }; // estimates
const GPU_Z = -56, CPU_Z = 58;
const LP_X = 43, LP_Z = [32, 49, 66, 83].map((z) => z - 57 + CPU_Z);

function connector(w, d, i) {
  const M = materials();
  const top = new THREE.MeshStandardMaterial({ map: markedTop({ w: 256, h: 256, bg: '#101011', lines: [], dot: false }), roughness: 0.5 });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(box(w, GH.MEZ_H, d), [M.lcpBlack, M.lcpBlack, top, M.lcpBlack, M.lcpBlack, M.lcpBlack]));
  g.add(new THREE.Mesh(box(w - 2, 0.6, d - 2), M.gold).translateY(0.3));
  tagPart(g, 'gh200-conn', `Module connector ${i}`, 'Board-to-board connector on the underside. It carries power, Grace\'s PCIe Gen5 lanes and the GPU\'s NVLink to the host board. GH200 uses different connectors from the Grace CPU Superchip, so the two modules are not interchangeable. Position and size are estimates.');
  return g;
}

export function buildGH200() {
  const M = materials();
  const r = rng(200);
  const root = new THREE.Group();
  root.name = 'superchip'; // lets shared 'superchip'-scoped links stay inside this board
  const { W, L, T } = GH;
  const P = new Placer(W, L);
  const pads = [], silk = [], holes = [], bundles = [], pours = [], viaKeep = [];
  const keep = (x, z, w, d) => { P.mark(x, z, w, d); viaKeep.push({ x, z, w, d }); };

  const board = new THREE.Group();
  board.position.y = GH.MEZ_H;
  explode(board, 0, 18, 0);
  root.add(board);

  // ---- Hopper GPU ----
  keep(0, GPU_Z, PKG.SW + 2, PKG.SD + 2);
  const gpu = gh100Package({ variant: 'gh200' });
  gpu.position.set(0, T + 0.25, GPU_Z);
  tagPart(gpu, 'h100-gpu', 'Hopper GPU (H100)', 'The same GH100 as H100, here with all six HBM stacks active: 96 GB HBM3 at 4 TB/s, or 144 GB HBM3e at 4.9 TB/s. NVLink-C2C lets it use Grace\'s LPDDR5X as a second, larger memory pool.');
  explode(gpu, 0, 30, 0);
  board.add(gpu);
  silk.push({ type: 'corners', x: 0, z: GPU_Z, w: PKG.SW + 3, d: PKG.SD + 3, k: 5, lw: 0.3 });

  // ---- Grace CPU + LPDDR5X ----
  keep(0, CPU_Z, 62, 66);
  const cpu = graceCPU();
  cpu.position.set(0, T, CPU_Z);
  cpu.traverse((o) => {
    if (o.userData.part?.id === 'grace-die') o.userData.part.info = '72 Arm Neoverse V2 cores on NVIDIA\'s Scalable Coherency Fabric, 114 MB L3. 900 GB/s NVLink-C2C to the Hopper GPU, coherent with its memory.';
  });
  tagPart(cpu, 'grace-cpu', 'Grace CPU', '72 Arm Neoverse V2 cores with up to 480 GB LPDDR5X at up to 512 GB/s. Coherent with the Hopper GPU over 900 GB/s NVLink-C2C.');
  explode(cpu, 0, 30, 0);
  board.add(cpu);
  silk.push({ type: 'corners', x: 0, z: CPU_Z, w: 64, d: 68, k: 5, lw: 0.3 });
  const lps = new THREE.Group();
  let li = 0;
  for (const s of [-1, 1]) for (const z of LP_Z) {
    keep(s * LP_X, z, 13, 16);
    const m = lpddr5x(li++);
    m.position.set(s * LP_X, T, z);
    lps.add(m);
    pads.push({ x: s * LP_X, z, w: 12.6, d: 15.6, color: '#2a2722' });
  }
  // the other eight packages are on the back of the board, under the front ones
  for (const s of [-1, 1]) for (const z of LP_Z) {
    const m = lpddr5x(li++);
    m.position.set(s * LP_X, -1.1, z);
    m.userData.explode = null;
    lps.add(m);
  }
  board.add(lps);

  // ---- VRMs: inductor columns flanking the GPU, a row at each end of the board ----
  const sets = {
    pstage: new InstancedSet(unitRounded(0.1), M.powerStage, { id: 'power-stage', label: 'Smart power stages', info: 'Power stages for the GPU and CPU core rails.' }),
    mlcc: new InstancedSet(unitBox(), M.mlcc, { id: 'mlcc', label: 'MLCC decoupling capacitors', info: 'Multilayer ceramic capacitors that keep the supply rails stable during nanosecond load steps.' }),
    tant: new InstancedSet(unitRounded(0.08), M.tantalum, { id: 'polymer-cap', label: 'Polymer capacitors', info: 'Bulk capacitance on the VRM output rails.' }),
  };
  const inds = new THREE.Group();
  const addInd = (x, z) => {
    if (!P.tryPlace(x, z, 8.6, 8.6, 0.2)) return;
    const l = inductor(8.4, 5.5, 8.4, 'R22');
    l.position.set(x, T, z);
    tagPart(l, 'vrm-inductor', 'VRM output inductor', 'One phase of the regulators that feed the GPU and CPU. The module is rated for up to 1000 W in total. The phase count here is an estimate.');
    inds.add(l);
  };
  for (const s of [-1, 1]) {
    for (const cx of [57, 47]) for (let j = 0; j < 7; j++) addInd(s * cx, GPU_Z - 29 + j * 9.6);
    for (let j = 0; j < 9; j++) { const z = GPU_Z - 26 + j * 6.4; if (P.tryPlace(s * 38.5, z, 4.4, 5.6, 0.2)) sets.pstage.add(s * 38.5, T, z, 4.4, 2.0, 5.6, 0); }
  }
  for (let i = 0; i < 6; i++) addInd(-25 + i * 10, L / 2 - 7.5);
  for (let i = 0; i < 9; i++) { const x = -32 + i * 8; if (P.tryPlace(x, L / 2 - 16.5, 5.6, 4.4, 0.2)) sets.pstage.add(x, T, L / 2 - 16.5, 5.6, 2.0, 4.4, 0); }
  for (let i = 0; i < 10; i++) { const x = -36 + i * 8; if (P.tryPlace(x, -L / 2 + 8, 5.6, 4.4, 0.2)) sets.pstage.add(x, T, -L / 2 + 8, 5.6, 2.0, 4.4, 0); }
  for (let i = 0; i < 8; i++) { const x = -28 + i * 8; if (P.tryPlace(x, 0, 4.2, 3.2, 0.2)) sets.tant.add(x, T, 0, 4.2, 1.8, 3.2, 0); }
  explode(inds, 0, 10, 0);
  board.add(inds);

  const parts = new THREE.Group();
  const addIC = (obj, x, z, w, d, id, label, info) => {
    if (!P.tryPlace(x, z, w, d, 0.6)) return;
    obj.position.set(x, T, z);
    tagPart(obj, id, label, info);
    parts.add(obj);
    pads.push({ x, z, w: w + 0.8, d: d + 0.8 });
  };
  addIC(ic(6, 1, 6, ['MP2', '891']), -50, 6, 6, 6, 'vrm-ctrl', 'Multiphase VRM controller', 'Digital controller that runs the power-stage phases and reports current and temperature.');
  addIC(ic(6, 1, 6, ['MP2', '891']), 50, 6, 6, 6, 'vrm-ctrl', 'Multiphase VRM controller', 'Digital controller that runs the power-stage phases and reports current and temperature.');
  addIC(ic(9, 1.4, 9, ['XC7A', '15T']), 51, 102, 9, 9, 'cpld', 'Module management CPLD', 'Power sequencing, resets and telemetry for the module.');
  board.add(parts);

  // MLCC rings and fill
  const addMLCC = (x, z, rot, size = 0) => {
    const [l, w, h] = [[1.0, 0.5, 0.5], [1.6, 0.8, 0.8]][size];
    const fw = rot ? w : l, fd = rot ? l : w;
    if (!P.tryPlace(x, z, fw, fd, 0.18)) return;
    sets.mlcc.add(x, T + 0.03, z, l, h, w, rot ? Math.PI / 2 : 0);
    pads.push({ x, z, w: fw + 0.2, d: fd + 0.2 });
  };
  const ring = (cx, cz, w, d) => {
    for (let x = cx - w / 2; x <= cx + w / 2; x += 1.5) { addMLCC(x, cz - d / 2 - 1.4, 0); addMLCC(x, cz + d / 2 + 1.4, 0); }
    for (let z = cz - d / 2; z <= cz + d / 2; z += 1.5) { addMLCC(cx - w / 2 - 1.4, z, 1); addMLCC(cx + w / 2 + 1.4, z, 1); }
  };
  ring(0, GPU_Z, PKG.SW, PKG.SD);
  ring(0, CPU_Z, 62, 66);
  for (let i = 0; i < 900; i++) {
    const x = r.range(-W / 2 + 2, W / 2 - 2), z = r.range(-L / 2 + 2, L / 2 - 2), rot = r.chance(0.5) ? 1 : 0;
    for (let j = 0, k = r.int(1, 5); j < k; j++) addMLCC(rot ? x + j * 1.1 : x, rot ? z : z + j * 1.1, rot, r.chance(0.7) ? 0 : 1);
  }

  // ---- connectors underneath (estimate) ----
  [[-46, GPU_Z, 12, 62], [46, GPU_Z, 12, 62], [0, L / 2 - 12, 80, 10]].forEach(([x, z, w, d], i) => {
    const c = connector(w, d, i);
    c.position.set(x, 0, z);
    root.add(c);
  });

  // ---- PCB ----
  // NVLink-C2C between the two packages
  for (const s of [-1, 0, 1]) bundles.push({ pts: [[s * 12, GPU_Z + 31], [s * 12, CPU_Z - 33]], n: 16, pitch: 0.4, width: 0.13 });
  for (const s of [-1, 1]) bundles.push({ pts: [[s * 36, CPU_Z], [s * 36, CPU_Z + 20]], n: 12, pitch: 0.4, width: 0.13 });
  for (const s of [-1, 1]) pours.push({ x: s * 52, z: GPU_Z, w: 26, d: 74 });
  for (const [x, z] of [[-60, -106], [60, -106], [-60, 106], [60, 106], [-58, 10], [58, 10]]) { keep(x, z, 7, 7); holes.push({ x, z, r: 1.7, ring: 3.2 }); }
  silk.push({ type: 'text', x: 0, z: 6, text: 'NVIDIA GH200', size: 2.6, weight: 800 });
  silk.push({ type: 'text', x: 0, z: 10, text: 'NVLINK-C2C 900GB/s', size: 1.2, weight: 600 });
  const tex = buildPcbTextures({ W, L, ppm: 8, seed: 201, pads, silk, holes, bundles, pours, viaKeepouts: viaKeep, viaCount: 4000 });
  const topMat = new THREE.MeshPhysicalMaterial({ map: tex.map, normalMap: tex.normal, normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: tex.rm, metalnessMap: tex.rm, roughness: 1, metalness: 1, clearcoat: 0.12, clearcoatRoughness: 0.5 });
  const bottom = new THREE.MeshStandardMaterial({ color: '#24221f', roughness: 0.6 });
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(W, T, L), [M.pcbEdge, M.pcbEdge, topMat, bottom, M.pcbEdge, M.pcbEdge]);
  pcb.position.y = T / 2;
  tagPart(pcb, 'gh200-pcb', 'GH200 module PCB', 'One board for a CPU, a GPU and both memory pools. The Hopper GPU sits on one half, Grace and its LPDDR5X on the other, with NVLink-C2C running between them.');
  board.add(pcb);

  for (const s of Object.values(sets)) if (s.items.length) board.add(s.build());
  shadowAll(root);
  root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  return optimize(root);
}
