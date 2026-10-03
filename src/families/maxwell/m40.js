// NVIDIA Tesla M40: one GM200 GPU and 24 GDDR5 chips on a passively cooled, dual-slot, full-height
// PCIe card, built with the Tesla card builder shared from ../kepler/card.js (card coordinates there).
// Sourced: GM200-895-A1, 3072 CUDA cores, 948 MHz base / 1114 MHz boost, 384-bit GDDR5 at 288 GB/s,
// 24 memory chips, 250 W, one CPU (EPS-12V) 8-pin plus a 2-pin power-brake header, passive cooling,
// 12 GB (launch, 2015) or 24 GB (2016); GM200 is 601 mm², 8 B transistors, TSMC 28 nm.
// Estimates: board positions (assumed to follow the K80's Tesla form factor: 267 x 111.15 mm,
// EPS connector on the far end), the GM200 package size (45 mm, same as GK110/GK210), die aspect,
// VRM phase count, heatsink and shroud geometry and colours.
import { buildTeslaCard } from '../kepler/card.js';
import { gm200Looks } from './silicon.js';

const TEXT = {
  gddr5: 'One of 24 GDDR5 chips at 6 Gb/s, 12 on each side of the board. Each pair (front and back) shares a 32-bit channel of the 384-bit bus: 288 GB/s. The first M40 used 4 Gb chips (12 GB); the 2016 version used 8 Gb chips (24 GB).',
  gddr5Back: 'Back-side GDDR5. The memory runs in clamshell mode: each 32-bit channel is split between a chip on the front and the one directly behind it on the back.',
  eps: 'One EPS-12V 8-pin (CPU-style) connector on the far end, the same arrangement as the K80. The card is rated for 250 W.',
  brake: 'Two-pin power-brake input. The server can pull it to force the card down to minimum clocks, for example when a power supply fails.',
  inductor: 'Output inductor of one VRM phase (phase count estimated).',
  drmos: 'MOSFET power stages: switch the 12 V input into each phase\'s inductor.',
  tant: 'Polymer tantalum capacitors: bulk energy storage on the GPU core rail.',
  ctrl: 'Multiphase PWM controller for the GPU core. The M40 boosts from 948 to 1114 MHz within its 250 W limit.',
  rom: 'Serial ROM holding the GPU\'s video BIOS.',
  mlcc: 'Multilayer ceramic capacitors that keep the supply rails steady during fast load steps.',
  mlccBack: 'A dense field of capacitors directly behind the GPU package, the shortest path to the core power balls.',
  pcb: 'Full-height, 267 mm Tesla board with a single GPU. Layout positions are estimates.',
  fingers: 'PCIe Gen3 x16: 16 lanes at 8 GT/s, about 16 GB/s each way, wired straight to the GPU.',
  bracket: 'Vented full-height, dual-slot bracket. In a server the bracket faces the hot aisle, so heated air exits here.',
  heatsink: 'Passive heatsink: a copper base on the GPU, heat pipes and aluminium fins that run the length of the card. It has no fan; the server pushes air through it towards the bracket.',
  shroud: 'Full-length shroud. It is a duct: it keeps the server\'s air inside the fins.',
};

export function buildM40() {
  const gx = -46, gy = 57;
  const inductors = [
    ...[40, 57, 74].flatMap((y) => [[14, y, 10], [40, y, 10]]),
    ...[-80, -69, -58, -47, -36, -25].map((x) => [x, 105, 8]),
  ];
  const drmos = [
    ...[40, 57, 74].flatMap((y) => [[2.5, y], [28.5, y]]),
    ...[-80, -69, -58, -47, -36, -25].map((x) => [x, 97.6]),
  ];
  const tants = [
    ...[30, 38, 46, 54, 62, 70, 78, 86].map((y) => [53, y, 1]),
    ...[64, 72, 80].flatMap((y) => [[104, y, 0], [113, y, 0]]),
  ];
  return buildTeslaCard({
    name: 'm40', seed: 40,
    gpus: [{
      x: gx, y: gy, look: gm200Looks, dieW: 24.6, dieD: 24.4,
      label: { pkg: 'GM200 GPU', die: 'GM200 die' },
      info: {
        pkg: 'GM200 (Maxwell, TSMC 28 nm, 8 B transistors, 601 mm²). 3072 CUDA cores in 24 SMM, 948-1114 MHz, about 7 TFLOPS FP32. FP64 runs at only 1/32 rate.',
        die: 'GM200: 6 GPCs of 4 SMM, each SMM with 128 cores in four 32-core blocks. All 24 SMM are enabled on the M40. 3 MB L2 cache.',
      },
    }],
    plx: null,
    eps: { x: 127, y: 90 },
    brake: { x: 127, y: 30 },
    inductors, drmos, tants,
    ctrls: [[68, 62]],
    roms: [[68, 44]],
    fins: [[-131, 112]],
    holes: [[-92, 86], [0, 86], [-92, 28], [0, 28], [60, 98], [60, 20], [116, 50]],
    markAt: [90, 26],
    pcbText: ['TESLA M40', 'PG600  699-2G600-0202', 'REV A00   94V-0'],
    sticker: Object.assign(['TESLA M40', 'P/N 900-2G600-0000-000', 'S/N 0323216xxxxxx   12GB'], { x: 88, y: 58 }),
    shroud: { color: '#2a2c30', band: '#55585d', ink: 'rgba(225,228,232,0.9)', metal: 0.55, text: ['TESLA M40', 'GPU ACCELERATOR'] },
    text: TEXT,
  });
}
