// NVIDIA Tesla K80: two GK210 GPUs, a PLX PCIe switch and 48 GDDR5 chips on one passively cooled,
// dual-slot, full-height PCIe card. Card coordinates and sources: see card.js.
// Sourced (board spec BD-07317-001_v05): 267 x 111.15 mm, 45 x 45 mm packages, 2 x 2496 cores,
// 560-875 MHz, 48 x 256M x 16 GDDR5 at 2.5 GHz (5 Gb/s), 2 x 240 GB/s, 300 W, 150 W cap per GPU,
// EPS-12V 8-pin on the east edge, on-board PLX switch, vented bracket.
// Estimates: every position on the board, the VRM phase count, the GK210 die size (561 mm², the
// figure TechPowerUp lists, same as GK110), heatsink and shroud geometry and colours.
import { buildTeslaCard } from './card.js';
import { gk210Looks } from './silicon.js';

export const K80_GPUS = [{ x: -90, y: 57 }, { x: 14, y: 57 }];

const TEXT = {
  gddr5: 'One of 48 GDDR5 chips (4 Gb, 256M x 16, 5 Gb/s). Each GPU owns 24 of them, 12 on each side of the board, for 12 GB on a 384-bit bus at 240 GB/s. ECC uses about 6% of it.',
  gddr5Back: 'Back-side GDDR5. The memory runs in clamshell mode: each 32-bit channel is split between a chip on the front and the one directly behind it on the back.',
  plx: 'PLX PCIe Gen3 switch, most likely the 48-lane PEX8747 (NVIDIA only says "PLX switch"): x16 up to the slot, x16 to each GPU. The host sees two separate GPUs; peer-to-peer copies between them stay on the card.',
  eps: 'One EPS-12V 8-pin (the CPU-style connector), on the end away from the bracket. NVIDIA chose it over PCIe 8-pins and shipped an adapter from two PCIe 8-pins. The card may draw 300 W.',
  inductor: 'Output inductor of one VRM phase. Each GPU has its own regulator, capped at 150 W per GPU (phase count estimated).',
  drmos: 'MOSFET power stages: switch the 12 V input at a few hundred kHz into each phase\'s inductor.',
  tant: 'Polymer tantalum capacitors: bulk energy storage on the 12 V input and GPU core rails.',
  ctrl: 'Multiphase PWM controller, one per GPU. GPU Boost raises clocks from 560 to 875 MHz while the card stays under its power and thermal limits.',
  rom: 'Each GPU boots from its own 2 Mbit serial BIOS ROM.',
  mlcc: 'Multilayer ceramic capacitors that keep the supply rails steady during fast load steps.',
  mlccBack: 'A dense field of capacitors directly behind the GPU package, the shortest possible path to the core power balls.',
  pcb: 'Full-height (111.15 mm), 267 mm long board. Two GPU subsystems side by side, sharing one slot through the PLX switch.',
  fingers: 'PCIe Gen3 x16: 16 lanes at 8 GT/s, about 16 GB/s each way, shared by both GPUs through the PLX switch.',
  bracket: 'Vented full-height, dual-slot bracket. In a server the bracket faces the hot aisle, so heated air exits here.',
  heatsink: 'Passive heatsink: copper bases on the GPUs, heat pipes and aluminium fins that run the length of the card. It has no fan. The server\'s fans push air through it from the far end towards the bracket.',
  shroud: 'Full-length shroud. It is a duct: it keeps the server\'s air inside the fins, from the far end out through the bracket vents.',
};

const GPU_INFO = (i) => ({
  label: { pkg: `GK210 GPU ${i}`, die: `GK210 die (GPU ${i})` },
  info: {
    pkg: 'GK210 (Kepler, TSMC 28 nm, 7.1 B transistors) on a 45 x 45 mm flip-chip BGA. 2496 CUDA cores (13 of 15 SMX enabled), 560-875 MHz, 12 GB GDDR5 at 240 GB/s.',
    die: 'GK210: a GK110 with twice the register file (512 KB per SMX) and twice the shared memory/L1 (128 KB). 15 SMX of 192 cores; 13 are enabled on K80.',
  },
});

export function buildK80() {
  const [g0, g1] = K80_GPUS;
  // VRM: GPU 1's core phases in a column towards the power connector; GPU 0's (and the memory rails)
  // along the top edge, where the board has room above the memory.
  const inductors = [
    ...[-124, -113, -102, -91, -80, -69, -58].map((x) => [x, 105, 8]),
    ...[-14, -3, 8, 19, 30, 41].map((x) => [x, 105, 8]),
    ...[30, 42, 54, 66, 78].map((y) => [67, y, 10]),
  ];
  const drmos = [
    ...[-124, -113, -102, -91, -80, -69, -58, -14, -3, 8, 19, 30, 41].map((x) => [x, 97.6]),
    ...[30, 42, 54, 66, 78].map((y) => [56.5, y]),
  ];
  const tants = [
    ...[28, 36, 44, 52, 60, 68, 76, 84].map((y) => [80, y, 1]),
    ...[64, 72, 80].flatMap((y) => [[104, y, 0], [113, y, 0]]),
    ...[22, 30, 38].map((y) => [-38, y + 30, 0]),
  ];
  return buildTeslaCard({
    name: 'k80', seed: 80,
    gpus: [g0, g1].map((g, i) => ({ ...g, look: gk210Looks, dieW: 23.5, dieD: 23.9, ...GPU_INFO(i) })),
    plx: { x: -38, y: 26 },
    eps: { x: 127, y: 90 },
    brake: null,
    inductors, drmos, tants,
    ctrls: [[-44, 82], [-32, 82]],
    roms: [[-46, 92], [-30, 92]],
    fins: [[-131, -40], [-36, 112]],
    holes: [[-58, 86], [-20, 86], [-58, 30], [48, 86], [48, 30], [-118, 30], [92, 98]],
    markAt: [101, 24],
    pcbText: ['TESLA K80', 'P2080  699-22080-0200', 'REV A02   94V-0'],
    shroud: { color: '#b9bcbf', band: '#1a1b1d', ink: 'rgba(25,25,28,0.9)', metal: 0.75, text: ['TESLA K80', 'GPU ACCELERATOR'] },
    sticker: Object.assign(['TESLA K80', 'P/N 900-22080-0000-000', 'S/N 0322815xxxxxx   24GB'], { x: 96, y: 46 }),
    text: TEXT,
  });
}
