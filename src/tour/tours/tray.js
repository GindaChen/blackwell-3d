// Guided tour of the Vera Rubin NVL72 compute tray: follows an AI model from storage to an answer.
// Step and selector reference: ../steps.js

const NET = { virtual: [-60, 60, 520], label: 'Data center network · Spectrum-X / Quantum-X' };
const STORAGE = { virtual: [150, 70, 515], label: 'Network storage · model weights' };
const SPINE = { virtual: [0, 70, -520], label: 'NVLink spine → 36 switch chips · 72 GPUs' };
const BUSBAR = { virtual: [80, 40, -500], label: 'Rack DC busbar' };
const COOLANT = { virtual: [-170, 60, -510], label: 'Rack coolant manifold · 45 °C water' };

const GPU0 = { id: 'rubin-gpu', side: -1, nth: 0 };
const CPU0 = { id: 'vera-cpu', side: -1 };
const MIDPLANES = [{ id: 'io-midplane' }, { id: 'midplane' }];

export const TRAY_STEPS = [
  {
    title: 'The compute tray',
    text: 'An NVL72 rack holds 18 of these trays. Each tray contains two Vera Rubin superchips, for a total of 2 Vera CPUs and 4 Rubin GPUs, plus the chips that connect them to the network. This tour follows an AI model from storage to a finished answer.',
    display: { cooling: true, lids: false }, dir: [0.55, 0.75, 0.85], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'superchip' }, label: '2× Vera Rubin superchips' },
      { sel: { id: 'cx9' }, label: '8× ConnectX-9 network chips' },
      { sel: { id: 'bf4-card' }, label: 'BlueField-4 DPU' },
    ],
    flows: [],
  },
  {
    title: 'Connecting to the rack',
    text: 'The tray slides into the rack from the front. At the rear, it connects to the DC power busbar, the coolant manifold, and the NVLink spine that links all 72 GPUs. Inside the tray, every connection runs through circuit boards and connectors, with no cables.',
    display: { cooling: true }, dir: [-0.45, 0.8, -0.75], zoom: 1.0,
    flows: [
      { from: BUSBAR, to: { id: 'busbar' }, bus: 'power', label: 'Power in' },
      { from: COOLANT, to: { id: 'uqd' }, bus: 'cool', label: 'Coolant supply and return' },
      { from: { id: 'nvlink-conn' }, to: SPINE, bus: 'nvlink', label: 'NVLink spine' },
    ],
  },
  {
    title: 'Power-on and boot',
    text: 'The baseboard management controller (BMC) starts first, on standby power. It verifies the firmware and switches on the power boards. On each superchip, a small controller (CPLD) turns on the voltage regulators in a fixed order. The Vera CPU then loads its firmware from flash memory and initializes both GPUs.',
    display: { cooling: true }, dir: [0.35, 0.85, 0.6], zoom: 0.95,
    flows: [
      { from: { id: 'busbar' }, to: { id: 'pdb' }, bus: 'power', label: 'Power boards' },
      { from: { id: 'pdb' }, to: { id: 'superchip' }, pair: 'nearest', bus: 'power' },
      { from: { id: 'bmc' }, to: { id: 'cpld' }, via: MIDPLANES, bus: 'mgmt', label: 'Power sequencing' },
      { from: { id: 'flash' }, to: { id: 'vera-cpu' }, pair: 'nearest', bus: 'mgmt', label: 'Boot firmware' },
    ],
  },
  {
    title: 'Network connections',
    text: 'Eight ConnectX-9 network chips connect the GPUs to other racks at 800 Gb/s each. The BlueField-4 DPU handles storage access, security, and management traffic, which keeps that work off the CPUs and GPUs.',
    display: { cooling: true }, dir: [0.25, 0.7, 1.0], zoom: 1.0,
    flows: [
      { from: NET, to: { id: 'cx9' }, bus: 'net', label: 'ConnectX-9 ×8' },
      { from: STORAGE, to: { id: 'bf4' }, bus: 'net', label: 'BlueField-4' },
    ],
  },
  {
    title: 'The midplane',
    text: 'Inside the tray, PCIe Gen6 circuit boards called midplanes connect the front modules to the superchips. Each GPU has two dedicated ConnectX-9 chips, for 1.6 Tb/s of network bandwidth. The BlueField-4 DPU connects to both Vera CPUs.',
    display: { cooling: true }, dir: [0.4, 0.95, 0.5], zoom: 0.9,
    flows: [
      { from: { id: 'cx9' }, to: { id: 'rubin-gpu' }, pair: 'nearest', via: MIDPLANES, bus: 'net', label: 'Two per GPU' },
      { from: { id: 'bf4' }, to: { id: 'vera-cpu' }, via: [{ id: 'midplane' }], bus: 'pcie', label: 'Both CPUs' },
    ],
  },
  {
    title: 'Loading the model into CPU memory',
    text: 'Model weights can total hundreds of gigabytes. The BlueField-4 DPU reads them from network storage or from the local E1.S drives. Each Vera CPU stores them in its LPDDR5X memory modules (SOCAMM), which hold up to 1.5 TB.',
    display: { cooling: false }, dir: [0.3, 0.9, 0.55], zoom: 0.9,
    flows: [
      { from: STORAGE, to: { id: 'bf4' }, bus: 'net' },
      { from: { id: 'front-cover' }, to: { id: 'bf4' }, bus: 'pcie', label: 'Local E1.S drives' },
      { from: { id: 'bf4' }, to: { id: 'vera-cpu' }, via: [{ id: 'midplane' }], bus: 'pcie', label: 'Vera CPUs' },
      { from: { id: 'vera-cpu' }, to: { id: 'socamm' }, bus: 'lpddr', label: 'LPDDR5X memory' },
    ],
  },
  {
    title: 'Copying weights to the GPUs',
    text: 'Each Vera CPU sends the weights to its two Rubin GPUs over NVLink-C2C at 1.8 TB/s. The link is cache-coherent, so a GPU can also read CPU memory directly when a model is larger than GPU memory.',
    display: { cooling: false }, dir: [0.5, 0.95, 0.35], zoom: 1.6,
    flows: [
      { from: { id: 'socamm', side: -1 }, to: CPU0, bus: 'lpddr' },
      { from: CPU0, to: { id: 'rubin-gpu', side: -1 }, bus: 'c2c', label: 'Rubin GPUs' },
    ],
  },
  {
    title: 'GPU memory: HBM4',
    text: 'Each GPU package has eight HBM4 memory stacks next to its two compute dies. Together they hold 288 GB and deliver about 22 TB/s. Models larger than 288 GB are divided across several GPUs.',
    display: { cooling: false, lids: false }, dir: [0.35, 1.0, 0.45], zoom: 1.5,
    flows: [
      { from: { id: 'rubin-die', within: GPU0 }, to: { id: 'hbm4', within: GPU0 }, pair: 4, bus: 'hbm', label: '8× HBM4 · 288 GB' },
    ],
  },
  {
    title: 'A request arrives',
    text: 'A user\'s prompt arrives from the network. The ConnectX-9 chip writes it directly into GPU memory using GPUDirect RDMA. The CPU schedules the work but does not copy the data.',
    display: { cooling: false, lids: false }, dir: [0.2, 0.85, 0.9], zoom: 1.0,
    flows: [
      { from: NET, to: { id: 'cx9' }, pair: 'nearest', bus: 'net' },
      { from: { id: 'cx9', side: -1, nth: 0 }, to: GPU0, via: MIDPLANES, bus: 'net', label: 'Prompt into GPU memory' },
    ],
  },
  {
    title: 'Running the model',
    text: 'For each layer of the model, the GPU reads weights and stored context (the KV cache) from HBM4. Tensor cores perform the math in 4-bit NVFP4 precision. The two compute dies share the work over a die-to-die link and operate as one GPU. Each pass through the model produces one token.',
    display: { cooling: false, lids: false }, dir: [0.3, 1.0, 0.5], zoom: 1.5,
    flows: [
      { from: { id: 'hbm4', within: GPU0 }, to: { id: 'rubin-die', within: GPU0 }, pair: 'nearest', bus: 'hbm', label: 'Weights + KV cache' },
      { from: { id: 'rubin-die', within: GPU0, nth: 0 }, to: { id: 'rubin-die', within: GPU0, nth: 1 }, bus: 'd2d', label: 'Die-to-die' },
    ],
  },
  {
    title: 'Sharing work over NVLink 6',
    text: 'Large models are split across many GPUs. After each layer, the GPUs exchange results over NVLink 6 at 3.6 TB/s per GPU. The traffic passes through the rack\'s copper spine and 36 NVLink switch chips, so all 72 GPUs can work on one model.',
    display: { cooling: false }, dir: [-0.35, 0.85, -0.6], zoom: 1.0,
    flows: [
      { from: { id: 'rubin-gpu' }, to: { id: 'nvlink-conn' }, pair: 'nearest', bus: 'nvlink' },
      { from: { id: 'nvlink-conn' }, to: SPINE, bus: 'nvlink', label: 'Other GPUs in the rack' },
    ],
  },
  {
    title: 'Returning the answer',
    text: 'The GPU sends each generated token back through its ConnectX-9 chip to the user. Throughout the process, 45 °C liquid coolant removes heat from every chip, and the busbar supplies power.',
    display: { cooling: true }, dir: [0.45, 0.75, 0.9], zoom: 1.05,
    flows: [
      { from: GPU0, to: { id: 'cx9', side: -1, nth: 0 }, via: [{ id: 'midplane' }, { id: 'io-midplane' }], bus: 'net' },
      { from: { id: 'cx9', side: -1, nth: 0 }, to: NET, bus: 'net', label: 'Answer to the user' },
      { from: { id: 'uqd' }, to: { id: 'gpu-coldplate' }, pair: 2, bus: 'cool', label: 'Cold plates' },
    ],
  },
];
