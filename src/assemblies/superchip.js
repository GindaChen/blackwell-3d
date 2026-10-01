// NVIDIA Vera Rubin Superchip board.
//
// Layout measured from the GTC DC 2025 photographs (reference/images/superchip-front-held-*.jpg)
// at ~0.48 mm/px, cross-checked against NVIDIA's annotated render. Board coordinates:
//   x: across the board (-109.5 .. 109.5 mm)
//   z: -195 = rear edge (NVLink 6 connectors) .. +195 = front edge (midplane connectors)
//   y: up; board top surface at y = 0.
import * as THREE from 'three';
import { materials } from '../parts/materials.js';
import { rubinGPU, veraCPU, box } from '../parts/chips.js';
import {
  InstancedSet, unitBox, unitRounded, nvlinkConnector, edgeConnector, socammModule,
  inductor, standoff, ic, whiteConnector,
} from '../parts/boardParts.js';
import { buildPcbTextures } from '../textures/pcb.js';
import { rng, tagPart, explode, shadowAll } from '../lib/util.js';
import { optimize } from '../lib/optimize.js';

export const BOARD = { W: 219, L: 390, T: 3.0 };

// ---- primary component positions (mm) ----
const GPU_X = 52, GPU_Z = -102, GPU_W = 92, GPU_D = 106;
const CPU_Z = 37;
const SOCAMM_X = [51.1, 66.9, 82.8, 98.6];
const SOCAMM_Z = 37;
const NVL_X = 40, NVL_Z = -195;
const EDGE = [[-66, 60], [0, 60], [66, 60]];
const EDGE_Z = 183;
const BIG_L = [[-70, 118], [-53, 118], [53, 118], [70, 118]];
const HOLES = [
  [-104, -186], [104, -186], [-104, -40], [104, -40], [-2, -40],
  [-98, 92], [98, 92], [-98, 111], [98, 111], [-98, 140], [98, 140], [-104, 166], [104, 166],
];

/** Occupancy grid to keep procedurally placed parts from colliding. */
class Placer {
  constructor(W, L, cell = 0.25) {
    this.W = W; this.L = L; this.cell = cell;
    this.nx = Math.ceil(W / cell); this.nz = Math.ceil(L / cell);
    this.grid = new Uint8Array(this.nx * this.nz);
  }
  _range(x, z, w, d) {
    const c = this.cell;
    return [
      Math.max(0, Math.floor((x - w / 2 + this.W / 2) / c)),
      Math.min(this.nx - 1, Math.ceil((x + w / 2 + this.W / 2) / c)),
      Math.max(0, Math.floor((z - d / 2 + this.L / 2) / c)),
      Math.min(this.nz - 1, Math.ceil((z + d / 2 + this.L / 2) / c)),
    ];
  }
  free(x, z, w, d) {
    if (Math.abs(x) + w / 2 > this.W / 2 - 1 || Math.abs(z) + d / 2 > this.L / 2 - 1) return false;
    const [x0, x1, z0, z1] = this._range(x, z, w, d);
    for (let j = z0; j <= z1; j++) for (let i = x0; i <= x1; i++) if (this.grid[j * this.nx + i]) return false;
    return true;
  }
  mark(x, z, w, d) {
    const [x0, x1, z0, z1] = this._range(x, z, w, d);
    for (let j = z0; j <= z1; j++) for (let i = x0; i <= x1; i++) this.grid[j * this.nx + i] = 1;
  }
  tryPlace(x, z, w, d, margin = 0.3) {
    if (!this.free(x, z, w + margin * 2, d + margin * 2)) return false;
    this.mark(x, z, w + margin, d + margin);
    return true;
  }
}

export function buildSuperchip() {
  const M = materials();
  const r = rng(2026);
  const root = new THREE.Group();
  root.name = 'superchip';
  const P = new Placer(BOARD.W, BOARD.L);

  // texture feature lists
  const pads = [], silk = [], holes = [], bundles = [], pours = [], viaKeep = [];

  // ---------------- keep-outs for large parts ----------------
  const keep = (x, z, w, d) => { P.mark(x, z, w, d); viaKeep.push({ x, z, w, d }); };
  for (const s of [-1, 1]) keep(s * GPU_X, GPU_Z, GPU_W + 1.5, GPU_D + 1.5);
  keep(0, CPU_Z, 82, 84);
  for (const s of [-1, 1]) for (const x of SOCAMM_X) keep(s * x, SOCAMM_Z, 14.6, 91);
  for (const s of [-1, 1]) keep(s * NVL_X, NVL_Z + 6, 66, 16);
  for (const [x, w] of EDGE) keep(x, EDGE_Z, w + 7, 24);
  for (const [x, z] of BIG_L) keep(x, z, 16.5, 16.5);
  for (const [x, z] of HOLES) keep(x, z, 7.5, 7.5);
  // reserved silkscreen block for board marking
  P.mark(0, 158, 66, 14);
  P.mark(-58, 162, 30, 10);

  // ---------------- main components ----------------
  const gpus = [-1, 1].map((s, i) => {
    const g = rubinGPU({ index: i });
    g.position.set(s * GPU_X, 0.25, GPU_Z);
    tagPart(g, 'rubin-gpu', `Rubin GPU ${i}`, 'Two reticle-sized compute dies + 8 HBM4 stacks (288 GB). 50 PFLOPS NVFP4 inference, 22 TB/s memory bandwidth, 3.6 TB/s NVLink 6.');
    explode(g, 0, 55, 0);
    root.add(g);
    silk.push({ type: 'corners', x: s * GPU_X, z: GPU_Z, w: GPU_W + 3, d: GPU_D + 3, k: 6, lw: 0.35 });
    silk.push({ type: 'text', x: s * GPU_X + (s < 0 ? -44 : 44) + (s < 0 ? 3 : -3), z: GPU_Z - 55.5, text: `U${i + 1}`, size: 1.8 });
    silk.push({ type: 'tri', x: s * GPU_X - GPU_W / 2 - 1.5, z: GPU_Z - GPU_D / 2 - 1.5, s: 1.4 });
    return g;
  });

  const cpu = veraCPU();
  cpu.position.set(0, 0, CPU_Z);
  tagPart(cpu, 'vera-cpu', 'Vera CPU', '88 custom Arm Olympus cores (176 threads with Spatial Multi-Threading), coherent with both GPUs over 1.8 TB/s NVLink-C2C.');
  explode(cpu, 0, 45, 0);
  root.add(cpu);
  silk.push({ type: 'corners', x: 0, z: CPU_Z, w: 84, d: 86, k: 5, lw: 0.35 });
  silk.push({ type: 'text', x: 0, z: CPU_Z - 44.5, text: 'U3', size: 1.8 });

  let si = 0;
  for (const s of [-1, 1])
    for (const x of SOCAMM_X) {
      const m = socammModule(si);
      m.position.set(s * x, 0, SOCAMM_Z);
      root.add(m);
      silk.push({ type: 'rect', x: s * x, z: SOCAMM_Z, w: 14.8, d: 91.5, lw: 0.25 });
      silk.push({ type: 'text', x: s * x, z: SOCAMM_Z - 47.3, text: `J${30 + si}`, size: 1.5 });
      for (const hz of [-43, 0, 43]) holes.push({ x: s * x, z: SOCAMM_Z + hz, r: 0.9, ring: 2.3 });
      si++;
    }

  for (const s of [-1, 1]) {
    const c = nvlinkConnector();
    c.position.set(s * NVL_X, 0, NVL_Z);
    root.add(c);
    silk.push({ type: 'text', x: s * NVL_X, z: NVL_Z + 15.5, text: s < 0 ? 'J10  NVL0' : 'J11  NVL1', size: 1.6 });
  }
  // board tab under the NVLink connectors (the PCB outline extends here in the photos)
  // (handled as part of the main board rectangle — connectors overhang ~13 mm like the sample)

  EDGE.forEach(([x, w], i) => {
    const c = edgeConnector(w);
    c.position.set(x, 0, EDGE_Z);
    root.add(c);
    silk.push({ type: 'tri', x: x - w / 2 + 2, z: EDGE_Z - 13.2, s: 1.0 });
    silk.push({ type: 'text', x, z: EDGE_Z - 13.8, text: `J${20 + i}`, size: 1.5 });
  });

  BIG_L.forEach(([x, z], i) => {
    const l = inductor(15, 8.5, 15, `R${10 + i * 5}`);
    l.position.set(x, 0, z);
    tagPart(l, 'vrm-inductor', 'VRM output inductor', 'Part of the multiphase voltage regulators that step the 48-54 V tray bus down to the sub-1 V core rails.');
    explode(l, 0, 18, 0);
    root.add(l);
    pads.push({ x: x - 6.5, z, w: 3, d: 11 }, { x: x + 6.5, z, w: 3, d: 11 });
    silk.push({ type: 'text', x, z: z + 9.4, text: `L${i + 1}`, size: 1.3 });
  });

  for (const [x, z] of HOLES) {
    const s = standoff();
    s.position.set(x, 0, z);
    root.add(s);
    holes.push({ x, z, r: 1.6, ring: 3.4 });
  }

  // ---------------- instanced populations ----------------
  const sets = {
    mlcc: new InstancedSet(unitBox(), M.mlcc, { id: 'mlcc', label: 'MLCC decoupling capacitors', info: 'Multilayer ceramic capacitors that keep supply rails stable during nanosecond load transients.' }),
    mlccG: new InstancedSet(unitBox(), M.mlccGrey, { id: 'mlcc', label: 'MLCC decoupling capacitors', info: 'Multilayer ceramic capacitors that keep supply rails stable during nanosecond load transients.' }),
    res: new InstancedSet(unitBox(), M.moldBlack, { id: 'resistor', label: 'Thick-film resistors', info: 'Pull-ups, current-sense and termination resistors.' }),
    pstage: new InstancedSet(unitRounded(0.1), M.powerStage, { id: 'power-stage', label: 'Power stages / polymer capacitors', info: 'Dense power-delivery components ringing the GPUs. Each Rubin GPU draws well over 1 kW, so the board is dominated by power delivery.' }),
    tant: new InstancedSet(unitRounded(0.08), M.tantalum, { id: 'polymer-cap', label: 'Polymer tantalum capacitors', info: 'Bulk capacitance for the VRM output rails.' }),
    qfn: new InstancedSet(unitBox(), M.moldBlack, { id: 'drmos', label: 'Smart power stages (DrMOS)', info: 'Integrated MOSFET + driver power stages of the multiphase VRMs.' }),
    smallL: new InstancedSet(unitRounded(0.12), M.ferrite, { id: 'inductor-s', label: 'Small inductors', info: 'Inductors for auxiliary rails.' }),
  };

  const addMLCC = (x, z, size, rot, grey = false) => {
    // size: 0 = 0402, 1 = 0603, 2 = 0805
    const dims = [[1.0, 0.5, 0.5], [1.6, 0.8, 0.8], [2.0, 1.25, 1.1]][size];
    const [l, w, h] = dims;
    const fw = rot ? w : l, fd = rot ? l : w;
    if (!P.tryPlace(x, z, fw, fd, 0.18)) return false;
    (grey ? sets.mlccG : sets.mlcc).add(x, 0.04, z, l, h, w, rot ? Math.PI / 2 : 0);
    const pl = l * 0.28;
    if (rot) { pads.push({ x, z: z - l / 2 + pl / 2, w: w * 1.15, d: pl * 1.3 }, { x, z: z + l / 2 - pl / 2, w: w * 1.15, d: pl * 1.3 }); }
    else { pads.push({ x: x - l / 2 + pl / 2, z, w: pl * 1.3, d: w * 1.15 }, { x: x + l / 2 - pl / 2, z, w: pl * 1.3, d: w * 1.15 }); }
    return true;
  };
  const addBlock = (set, x, z, w, d, h, rot = 0, padOut = 0.6) => {
    const fw = rot ? d : w, fd = rot ? w : d;
    if (!P.tryPlace(x, z, fw, fd, 0.25)) return false;
    set.add(x, 0.05, z, w, h, d, rot ? Math.PI / 2 : 0);
    if (rot) pads.push({ x, z, w: fw + 0.4, d: fd + padOut * 2 });
    else pads.push({ x, z, w: fw + padOut * 2, d: fd + 0.4 });
    return true;
  };

  // --- rows of light grey power blocks (the dominant texture in the photos) ---
  const rowOfBlocks = (z, x0, x1, pitch, w, d, h, rot = 0, set = sets.pstage) => {
    for (let x = x0; x <= x1 + 1e-6; x += pitch) addBlock(set, x, z, w, d, h, rot);
  };
  // above the GPUs, below the NVLink connectors
  for (const z of [-178.5, -171, -163.5]) rowOfBlocks(z, -104, 104, 6.9, 5.8, 4.6, 2.2);
  // flanking the NVLink connectors
  for (const z of [-191, -184]) {
    rowOfBlocks(z, -104, -76, 6.9, 5.8, 4.6, 2.2);
    rowOfBlocks(z, 76, 104, 6.9, 5.8, 4.6, 2.2);
    rowOfBlocks(z, -4, 4, 6.9, 5.8, 4.6, 2.2);
  }
  // column between the two GPUs and down the outer sides
  for (let z = -150; z <= -55; z += 6.4) {
    addBlock(sets.pstage, 0, z, 5.4, 4.4, 2.2, 0);
  }
  for (let z = -152; z <= -52; z += 6.4) {
    addBlock(sets.pstage, -105.3, z, 5.2, 4.4, 2.2, 1);
    addBlock(sets.pstage, 105.3, z, 5.2, 4.4, 2.2, 1);
  }
  // two rows beneath the GPUs
  for (const z of [-44.5, -37]) rowOfBlocks(z, -104, 104, 6.9, 5.8, 4.6, 2.2);
  // dark tantalums + grey MLCC row
  rowOfBlocks(-30, -103, 103, 5.2, 4.2, 3.0, 1.6, 0, sets.tant);
  // row under the CPU (photo: ~10 grey blocks between the SOCAMM banks)
  rowOfBlocks(85.5, -38, 38, 6.9, 5.8, 4.6, 2.2);
  rowOfBlocks(-12.5, -40, 40, 6.9, 5.4, 4.2, 2.0, 0, sets.tant);

  // --- VRM region below the CPU ---
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 2; j++) {
        const x = s * (24 + i * 7.2), z = 101 + j * 7;
        addBlock(sets.qfn, x, z, 5, 6, 0.9, 0, 0.35);
      }
    }
    for (let i = 0; i < 3; i++) addBlock(sets.smallL, s * (28 + i * 9), 136, 7, 7, 4, 0, 0.5);
    for (let i = 0; i < 4; i++) addBlock(sets.tant, s * (30 + i * 6.5), 146, 4.2, 3.2, 1.8, 0, 0.5);
    for (let i = 0; i < 4; i++) addBlock(sets.qfn, s * (56 + i * 7), 132, 5, 6, 0.9, 0, 0.35);
    for (let i = 0; i < 4; i++) addBlock(sets.pstage, s * (56 + i * 7), 146, 5.8, 4.6, 2.2, 0);
  }
  // controller ICs, flash, oscillator, white aux connector
  const misc = [];
  const addIC = (obj, x, z, w, d, label, info, id = 'ic') => {
    if (!P.tryPlace(x, z, w, d, 0.6)) return;
    obj.position.set(x, 0.05, z);
    tagPart(obj, id, label, info);
    root.add(obj);
    misc.push(obj);
    pads.push({ x, z, w: w + 0.8, d: d + 0.8 });
    silk.push({ type: 'rect', x, z, w: w + 1.6, d: d + 1.6, pin1: true, lw: 0.15 });
  };
  addIC(ic(12, 1.6, 12, ['XC7A', '35T-2', 'FGG']), 0, 112, 12, 12, 'Board management FPGA/CPLD', 'Power sequencing, resets and telemetry for the superchip.', 'cpld');
  addIC(ic(6, 1.0, 6, ['MP2', '891']), -14, 126, 6, 6, 'Multiphase VRM controller', 'Digital PWM controller orchestrating the GPU/CPU core-rail power stages.', 'vrm-ctrl');
  addIC(ic(6, 1.0, 6, ['MP2', '891']), 14, 126, 6, 6, 'Multiphase VRM controller', 'Digital PWM controller orchestrating the GPU/CPU core-rail power stages.', 'vrm-ctrl');
  addIC(ic(5, 1.2, 4, ['25U', '512']), -6, 138, 5, 4, 'SPI flash', 'Firmware storage for the CPU/GPU boot ROMs.', 'flash');
  addIC(ic(5, 1.2, 4, ['25U', '512']), 6, 138, 5, 4, 'SPI flash', 'Firmware storage for the CPU/GPU boot ROMs.', 'flash');
  addIC(ic(3, 0.9, 3, ['PCA']), -22, 140, 3, 3, 'I²C mux', 'Sideband management bus fan-out.', 'i2c');
  addIC(ic(3, 0.9, 3, ['TMP']), 22, 140, 3, 3, 'Temperature sensor', 'Board thermal telemetry.', 'temp');
  {
    const osc = new THREE.Mesh(box(3.2, 1.0, 2.5), M.nickelMatte);
    addIC(osc, 0, 128, 3.2, 2.5, 'Crystal oscillator', 'Reference clock for the board logic.', 'osc');
  }
  {
    const wc = whiteConnector();
    if (P.tryPlace(-91, 82, 6, 4.5, 0.4)) {
      wc.position.set(-91, 0, 82);
      tagPart(wc, 'aux-conn', 'Auxiliary/debug header', 'Factory debug and programming header.');
      root.add(wc);
    }
  }
  // LEDs
  for (const [x, z, g] of [[10, 150, true], [13, 150, false], [16, 150, true]]) {
    const led = new THREE.Mesh(box(1.6, 0.6, 0.8), g ? M.ledGreen : M.ledAmber);
    if (P.tryPlace(x, z, 1.6, 0.8, 0.3)) { led.position.set(x, 0.05, z); root.add(led); pads.push({ x, z, w: 2.2, d: 1.1 }); }
  }

  // --- MLCC rows hugging the big parts (decoupling) ---
  const ring = (cx, cz, w, d, step, off, size = 0) => {
    for (let x = cx - w / 2; x <= cx + w / 2; x += step) {
      addMLCC(x, cz - d / 2 - off, size, 0);
      addMLCC(x, cz + d / 2 + off, size, 0);
    }
    for (let z = cz - d / 2; z <= cz + d / 2; z += step) {
      addMLCC(cx - w / 2 - off, z, size, 1);
      addMLCC(cx + w / 2 + off, z, size, 1);
    }
  };
  for (const s of [-1, 1]) ring(s * GPU_X, GPU_Z, GPU_W, GPU_D, 1.6, 1.6, 0);
  ring(0, CPU_Z, 82, 84, 1.7, 1.3, 0);
  for (const [x, w] of EDGE) for (let xx = x - w / 2; xx < x + w / 2; xx += 1.6) addMLCC(xx, EDGE_Z - 14.5, 0, 1);

  // --- random sprinkle of 0402/0603/0805 + resistors into the remaining space ---
  const sprinkle = (x0, x1, z0, z1, n, mix = [0.55, 0.3, 0.15]) => {
    for (let i = 0; i < n; i++) {
      // small clusters of parallel parts look like real decoupling banks
      const x = r.range(x0, x1), z = r.range(z0, z1);
      const k = r.int(1, 6), rot = r.chance(0.5) ? 1 : 0;
      const u = r();
      const size = u < mix[0] ? 0 : u < mix[0] + mix[1] ? 1 : 2;
      const isRes = r.chance(0.18);
      for (let j = 0; j < k; j++) {
        const step = [1.0, 1.4, 1.9][size];
        const xx = rot ? x + j * step : x, zz = rot ? z : z + j * step;
        if (isRes && size < 2) {
          const [l, w] = size ? [1.6, 0.8] : [1.0, 0.5];
          const fw = rot ? w : l, fd = rot ? l : w;
          if (P.tryPlace(xx, zz, fw, fd, 0.18)) {
            sets.res.add(xx, 0.04, zz, l, 0.35, w, rot ? Math.PI / 2 : 0);
            const pl = l * 0.25;
            if (rot) pads.push({ x: xx, z: zz - l / 2 + pl / 2, w: w * 1.1, d: pl * 1.3 }, { x: xx, z: zz + l / 2 - pl / 2, w: w * 1.1, d: pl * 1.3 });
            else pads.push({ x: xx - l / 2 + pl / 2, z: zz, w: pl * 1.3, d: w * 1.1 }, { x: xx + l / 2 - pl / 2, z: zz, w: pl * 1.3, d: w * 1.1 });
          }
        } else addMLCC(xx, zz, size, rot, r.chance(0.3));
      }
    }
  };
  sprinkle(-108, 108, -194, -150, 500);
  sprinkle(-108, 108, -50, -8, 500);
  sprinkle(-108, 108, 82, 170, 1600);
  sprinkle(-108, 108, -190, 190, 900);

  // a scattering of silkscreen reference designators near passives
  for (let i = 0; i < 160; i++) {
    const x = r.range(-104, 104), z = r.range(-190, 170);
    if (!P.free(x, z, 3.6, 1.3)) continue;
    P.mark(x, z, 3.6, 1.3);
    const pre = r.pick(['C', 'C', 'C', 'R', 'R', 'L', 'TP', 'Q', 'D']);
    silk.push({ type: 'text', x, z, text: `${pre}${r.int(1, 2999)}`, size: 0.85, weight: 500, rot: r.chance(0.3) ? -Math.PI / 2 : 0 });
  }
  // test points
  for (let i = 0; i < 70; i++) {
    const x = r.range(-104, 104), z = r.range(-190, 170);
    if (!P.free(x, z, 1.4, 1.4)) continue;
    P.mark(x, z, 1.4, 1.4);
    holes.push({ x, z, r: 0.01, ring: 0.55 });
  }

  // board marking block
  silk.push({ type: 'text', x: 0, z: 154, text: 'NVIDIA', size: 4.2, weight: 800 });
  silk.push({ type: 'text', x: 0, z: 159.5, text: 'VR200 SUPERCHIP  699-2G600-0200-A01', size: 1.5, weight: 600 });
  silk.push({ type: 'text', x: 0, z: 162.6, text: 'REV A01   MADE IN TAIWAN   94V-0   E123456', size: 1.15, weight: 500 });
  silk.push({ type: 'rect', x: -58, z: 162, w: 26, d: 8, lw: 0.25 });
  silk.push({ type: 'text', x: -58, z: 162, text: 'S/N  ______________', size: 1.1 });

  // ---------------- trace bundles (visible relief under the solder mask) ----------------
  // NVLink-C2C: CPU <-> both GPUs
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const x0 = s * (8 + k * 9);
      bundles.push({ pts: [[x0, -4], [x0, -20], [s * (20 + k * 9), -32], [s * (20 + k * 9), -48]], n: 14, pitch: 0.42, width: 0.14 });
    }
    // CPU -> midplane connectors (PCIe Gen6)
    bundles.push({ pts: [[s * 10, 79], [s * 10, 95], [s * 36, 160], [s * 60, 170]], n: 18, pitch: 0.42, width: 0.14 });
    bundles.push({ pts: [[s * 2, 79], [s * 2, 170]], n: 10, pitch: 0.42, width: 0.14 });
    // GPU -> NVLink connectors
    bundles.push({ pts: [[s * 28, -156], [s * 28, -170], [s * 32, -183]], n: 26, pitch: 0.4, width: 0.13 });
    bundles.push({ pts: [[s * 60, -156], [s * 60, -168], [s * 50, -183]], n: 26, pitch: 0.4, width: 0.13 });
    // side power distribution
    pours.push({ x: s * 75, z: 125, w: 50, d: 40 });
    pours.push({ x: s * 52, z: -170, w: 100, d: 26 });
  }
  pours.push({ x: 0, z: -35, w: 214, d: 22 });
  // random short meander bundles in the lower region
  for (let i = 0; i < 40; i++) {
    const x = r.range(-95, 95), z = r.range(92, 168), len = r.range(6, 22), dir = r.chance(0.5);
    bundles.push({ pts: dir ? [[x, z], [x + len, z], [x + len + 3, z + 3]] : [[x, z], [x, z + len], [x + 3, z + len + 3]], n: r.int(2, 8), pitch: 0.4, width: 0.13 });
  }

  // ---------------- the PCB itself ----------------
  const tex = buildPcbTextures({
    W: BOARD.W, L: BOARD.L, ppm: 9.35, seed: 7,
    pads, silk, holes, bundles, pours, viaKeepouts: viaKeep, viaCount: 7000,
  });
  const top = new THREE.MeshPhysicalMaterial({
    map: tex.map,
    normalMap: tex.normal,
    normalScale: new THREE.Vector2(0.32, 0.32),
    roughnessMap: tex.rm,
    metalnessMap: tex.rm,
    roughness: 1,
    metalness: 1,
    clearcoat: 0.12,
    clearcoatRoughness: 0.5,
  });
  const bottom = new THREE.MeshStandardMaterial({ color: '#24221f', roughness: 0.6 });
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(BOARD.W, BOARD.T, BOARD.L), [M.pcbEdge, M.pcbEdge, top, bottom, M.pcbEdge, M.pcbEdge]);
  pcb.position.y = -BOARD.T / 2;
  pcb.name = 'superchip-pcb';
  tagPart(pcb, 'pcb', 'Superchip PCB', 'High-layer-count board carrying 1 Vera CPU, 2 Rubin GPUs, 8 SOCAMM slots and all power delivery. No cables: every signal leaves through edge connectors.');
  root.add(pcb);

  for (const s of Object.values(sets)) if (s.items.length) root.add(s.build());

  shadowAll(root);
  // instanced passives are tiny; letting them cast shadow is costly and invisible at range
  root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  optimize(root);
  root.userData.stats = Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, v.items.length]));
  return root;
}

/** Toggle helpers that work on any clone of the superchip. */
export function setLids(root, on) {
  root.traverse((o) => { if (o.name === 'gpu-lid') o.visible = on; });
}
