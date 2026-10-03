// NVIDIA GB200 Grace Blackwell Superchip board ("Bianca": 1 Grace CPU + 2 B200 GPUs).
//
// Layout scaled from public press photos of the GB200 board and NVL72 compute tray (no CAD
// sources; dimensions are estimates, see docs/2026-10-03-blackwell-design.md). Board coordinates:
//   x: across the board (-109.5 .. 109.5 mm)
//   z: -195 = rear edge (NVLink 5 connectors) .. +195 = front edge (cable connectors)
//   y: up; board top surface at y = 0.
import * as THREE from 'three';
import { materials } from '../parts/materials.js';
import { b200GPU, graceCPU, box, B200 } from '../parts/chips.js';
import {
  InstancedSet, unitBox, unitRounded, nvlinkConnector, cableConnector, powerConnector, lpddr5x,
  inductor, standoff, ic, whiteConnector,
} from '../parts/boardParts.js';
import { buildPcbTextures } from '../textures/pcb.js';
import { rng, tagPart, explode, shadowAll } from '../lib/util.js';
import { optimize } from '../lib/optimize.js';

export const BOARD = { W: 219, L: 390, T: 3.0 };

// ---- primary component positions (mm) ----
const GPU_X = 53, GPU_Z = -105, GPU_W = B200.SW, GPU_D = B200.SD;
const CPU_Z = 45, CPU_W = 60, CPU_D = 64;
const LP_X = [42, 57], LP_Z = [-28.5, -9.5, 9.5, 28.5].map((z) => CPU_Z + z);
const NVL_X = 53, NVL_Z = -195;
const CABLE_X = [-75, -25, 25, 75], CABLE_Z = 186;
const PWR = [[-92, 116], [92, 116]];
const BIG_L = [[-70, 118], [-53, 118], [53, 118], [70, 118]];
const HOLES = [
  [-104, -186], [104, -186], [-104, -55], [104, -55], [0, -55],
  [-100, 92], [100, 92], [-100, 140], [100, 140], [-104, 168], [104, 168],
];

/** Occupancy grid to keep procedurally placed parts from colliding. */
export class Placer {
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
  keep(0, CPU_Z, CPU_W + 2, CPU_D + 2);
  for (const s of [-1, 1]) for (const x of LP_X) for (const z of LP_Z) keep(s * x, z, 13, 16);
  for (const s of [-1, 1]) keep(s * NVL_X, NVL_Z + 6, 66, 16);
  for (const x of CABLE_X) keep(x, CABLE_Z, 40, 18);
  for (const [x, z] of PWR) keep(x, z, 16, 22);
  for (const [x, z] of BIG_L) keep(x, z, 16.5, 16.5);
  for (const [x, z] of HOLES) keep(x, z, 7.5, 7.5);
  // reserved silkscreen block for board marking
  P.mark(0, 158, 66, 14);
  P.mark(-58, 162, 30, 10);

  // ---------------- main components ----------------
  [-1, 1].forEach((s, i) => {
    const g = b200GPU({ index: i });
    g.position.set(s * GPU_X, 0.25, GPU_Z);
    tagPart(g, 'b200-gpu', `B200 GPU ${i}`, 'Two Blackwell dies + 8 HBM3e stacks (186 GB in NVL72). Up to 20 PFLOPS FP4 (sparse), 8 TB/s memory bandwidth, 1.8 TB/s NVLink 5, ~1.2 kW.');
    explode(g, 0, 55, 0);
    root.add(g);
    silk.push({ type: 'corners', x: s * GPU_X, z: GPU_Z, w: GPU_W + 3, d: GPU_D + 3, k: 6, lw: 0.35 });
    silk.push({ type: 'text', x: s * GPU_X + (s < 0 ? -36 : 36), z: GPU_Z - 46, text: `U${i + 1}`, size: 1.8 });
    silk.push({ type: 'tri', x: s * GPU_X - GPU_W / 2 - 1.5, z: GPU_Z - GPU_D / 2 - 1.5, s: 1.4 });
  });

  const cpu = graceCPU();
  cpu.position.set(0, 0, CPU_Z);
  tagPart(cpu, 'grace-cpu', 'Grace CPU', '72 Arm Neoverse V2 cores with up to 480 GB LPDDR5X. Coherent with both GPUs over 900 GB/s NVLink-C2C.');
  explode(cpu, 0, 45, 0);
  root.add(cpu);
  silk.push({ type: 'corners', x: 0, z: CPU_Z, w: CPU_W + 3, d: CPU_D + 3, k: 5, lw: 0.35 });
  silk.push({ type: 'text', x: 0, z: CPU_Z - CPU_D / 2 - 3.5, text: 'U3', size: 1.8 });

  let li = 0;
  for (const s of [-1, 1])
    for (const x of LP_X)
      for (const z of LP_Z) {
        const m = lpddr5x(li);
        m.position.set(s * x, 0.05, z);
        root.add(m);
        pads.push({ x: s * x, z, w: 12.6, d: 15.6, color: '#2a2722' });
        silk.push({ type: 'corners', x: s * x, z, w: 13.4, d: 16.4, k: 1.6, lw: 0.2 });
        silk.push({ type: 'text', x: s * x + s * 8.2, z, text: `U${10 + li}`, size: 1.0, rot: -Math.PI / 2 });
        li++;
      }

  for (const s of [-1, 1]) {
    const c = nvlinkConnector();
    c.position.set(s * NVL_X, 0, NVL_Z);
    root.add(c);
    silk.push({ type: 'text', x: s * NVL_X, z: NVL_Z + 15.5, text: s < 0 ? 'J10  NVL0' : 'J11  NVL1', size: 1.6 });
  }

  CABLE_X.forEach((x, i) => {
    const c = cableConnector(34);
    c.position.set(x, 0, CABLE_Z);
    root.add(c);
    silk.push({ type: 'tri', x: x - 15, z: CABLE_Z - 9.5, s: 1.0 });
    silk.push({ type: 'text', x, z: CABLE_Z - 10.2, text: `J${20 + i}  PCIE${i}`, size: 1.4 });
  });

  PWR.forEach(([x, z], i) => {
    const c = powerConnector();
    c.position.set(x, 0, z);
    root.add(c);
    pads.push({ x, z, w: 15, d: 21 });
    silk.push({ type: 'text', x, z: z + 13, text: `P${i + 1}  12V`, size: 1.3 });
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
    pstage: new InstancedSet(unitRounded(0.1), M.powerStage, { id: 'power-stage', label: 'Power stages / polymer capacitors', info: 'Dense power-delivery components ringing the GPUs. Each B200 draws up to ~1.2 kW, so the board is dominated by power delivery.' }),
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

  // --- rows of light grey power blocks (the dominant texture around Blackwell packages) ---
  const rowOfBlocks = (z, x0, x1, pitch, w, d, h, rot = 0, set = sets.pstage) => {
    for (let x = x0; x <= x1 + 1e-6; x += pitch) addBlock(set, x, z, w, d, h, rot);
  };
  // above the GPUs, below the NVLink connectors
  for (const z of [-177, -169.5, -162, -154.5]) rowOfBlocks(z, -104, 104, 6.9, 5.8, 4.6, 2.2);
  // flanking the NVLink connectors
  for (const z of [-191, -184]) {
    rowOfBlocks(z, -104, -89, 6.9, 5.8, 4.6, 2.2);
    rowOfBlocks(z, 89, 104, 6.9, 5.8, 4.6, 2.2);
    rowOfBlocks(z, -14, 14, 6.9, 5.8, 4.6, 2.2);
  }
  // column between the two GPUs and down the outer sides
  for (let z = -142; z <= -68; z += 6.4) addBlock(sets.pstage, 0, z, 5.4, 4.4, 2.2, 0);
  for (let z = -144; z <= -66; z += 6.4) {
    addBlock(sets.pstage, -101.5, z, 5.2, 4.4, 2.2, 1);
    addBlock(sets.pstage, 101.5, z, 5.2, 4.4, 2.2, 1);
  }
  // two rows beneath the GPUs
  for (const z of [-48, -40.5]) rowOfBlocks(z, -104, 104, 6.9, 5.8, 4.6, 2.2);
  rowOfBlocks(-33, -103, 103, 5.2, 4.2, 3.0, 1.6, 0, sets.tant);
  // Grace VRM row and bulk caps above the CPU
  rowOfBlocks(1.5, -28, 28, 6.9, 5.8, 4.6, 2.2);
  rowOfBlocks(-20, -40, 40, 6.9, 5.4, 4.2, 2.0, 0, sets.tant);
  // row under the CPU
  rowOfBlocks(86, -38, 38, 6.9, 5.8, 4.6, 2.2);
  for (const s of [-1, 1]) for (let z = 10; z <= 80; z += 6.4) addBlock(sets.pstage, s * 101.5, z, 5.2, 4.4, 2.2, 1);

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
  ring(0, CPU_Z, CPU_W, CPU_D, 1.7, 1.3, 0);
  for (const s of [-1, 1]) ring(s * 49.5, CPU_Z, 30, 76, 1.8, 1.4, 0);
  for (const x of CABLE_X) for (let xx = x - 16; xx < x + 16; xx += 1.6) addMLCC(xx, CABLE_Z - 12.5, 0, 1);

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
  silk.push({ type: 'text', x: 0, z: 159.5, text: 'GB200 BIANCA  699-2G548-0200-A00', size: 1.5, weight: 600 });
  silk.push({ type: 'text', x: 0, z: 162.6, text: 'REV A01   MADE IN TAIWAN   94V-0   E123456', size: 1.15, weight: 500 });
  silk.push({ type: 'rect', x: -58, z: 162, w: 26, d: 8, lw: 0.25 });
  silk.push({ type: 'text', x: -58, z: 162, text: 'S/N  ______________', size: 1.1 });

  // ---------------- trace bundles (visible relief under the solder mask) ----------------
  // NVLink-C2C: CPU <-> both GPUs
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const x0 = s * (6 + k * 7);
      bundles.push({ pts: [[x0, 12], [x0, -8], [s * (24 + k * 9), -28], [s * (24 + k * 9), -62]], n: 14, pitch: 0.42, width: 0.14 });
    }
    // CPU/GPU -> front cable connectors (PCIe Gen5)
    bundles.push({ pts: [[s * 10, 78], [s * 10, 95], [s * 30, 165], [s * 50, 176]], n: 18, pitch: 0.42, width: 0.14 });
    bundles.push({ pts: [[s * 2, 78], [s * 2, 176]], n: 10, pitch: 0.42, width: 0.14 });
    bundles.push({ pts: [[s * 90, -64], [s * 90, 60], [s * 80, 176]], n: 12, pitch: 0.42, width: 0.14 });
    // GPU -> NVLink connectors
    bundles.push({ pts: [[s * 33, -147], [s * 33, -170], [s * 36, -183]], n: 26, pitch: 0.4, width: 0.13 });
    bundles.push({ pts: [[s * 73, -147], [s * 73, -168], [s * 68, -183]], n: 26, pitch: 0.4, width: 0.13 });
    // side power distribution
    pours.push({ x: s * 75, z: 125, w: 50, d: 40 });
    pours.push({ x: s * 52, z: -168, w: 100, d: 30 });
  }
  pours.push({ x: 0, z: -40, w: 214, d: 22 });
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
  tagPart(pcb, 'pcb', 'Superchip PCB', 'High-layer-count board carrying 1 Grace CPU, 2 B200 GPUs, 16 LPDDR5X packages and all power delivery. NVLink leaves at the rear edge, PCIe Gen5 through front cable connectors.');
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
