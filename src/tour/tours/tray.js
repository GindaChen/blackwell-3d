// Guided tour of the GB200 NVL72 compute tray: follows an AI model from storage to an answer.
// Step and selector reference: ../steps.js

const NET = { virtual: [-60, 60, 520], label: 'Scale-out fabric · Quantum InfiniBand / Spectrum-X' };
const STORAGE = { virtual: [150, 70, 515], label: 'Front-end network · storage, model weights' };
const SPINE = { virtual: [0, 70, -520], label: 'NVLink spine → 18 switch chips · 72 GPUs' };
const BUSBAR = { virtual: [80, 40, -500], label: 'Rack DC busbar · 54 V' };
const COOLANT = { virtual: [-170, 60, -510], label: 'Rack coolant manifold' };

const GPU0 = { id: 'b200-gpu', side: -1, nth: 0 };
const CPU0 = { id: 'grace-cpu', side: -1 };
const CABLES = [{ id: 'cables' }];

export const TRAY_STEPS = [
  {
    title: 'The compute tray',
    text: 'An NVL72 rack holds 18 of these 1U trays. Each one contains two GB200 superchips, for a total of 2 Grace CPUs and 4 B200 GPUs, plus the network chips that connect them to the rest of the data center. This tour follows an AI model from storage to a finished answer.',
    display: { cooling: true, lids: false }, dir: [0.55, 0.75, 0.85], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'superchip' }, label: '2× GB200 superchips' },
      { sel: { id: 'cx7-card' }, label: '4× ConnectX-7' },
      { sel: { id: 'bf3-card' }, label: '2× BlueField-3' },
    ],
    flows: [],
  },
  {
    title: 'Connecting to the rack',
    text: 'The tray slides into the rack from the front. At the rear it clips onto the DC power busbar, two quick-disconnects join the rack\'s coolant loop, and each superchip\'s NVLink connectors mate with the copper spine that links all 72 GPUs.',
    display: { cooling: true }, dir: [-0.45, 0.8, -0.75], zoom: 1.0,
    flows: [
      { from: BUSBAR, to: { id: 'busbar' }, bus: 'power', label: 'Power in' },
      { from: COOLANT, to: { id: 'uqd' }, bus: 'cool', label: 'Coolant supply and return' },
      { from: { id: 'nvlink-conn' }, to: SPINE, bus: 'nvlink', label: 'NVLink spine' },
    ],
  },
  {
    title: 'Power-on and boot',
    text: 'The baseboard management controller (BMC) starts first, on standby power. It verifies the firmware and switches on the power boards, which convert 54 V from the busbar to 12 V. On each superchip, a CPLD turns on the voltage regulators in order, and Grace loads its firmware.',
    display: { cooling: true }, dir: [0.35, 0.85, 0.6], zoom: 0.95,
    flows: [
      { from: { id: 'busbar' }, to: { id: 'power-bus' }, bus: 'power' },
      { from: { id: 'pdb' }, to: { id: 'power-conn' }, pair: 2, bus: 'power', label: '12 V to the boards' },
      { from: { id: 'bmc' }, to: { id: 'cpld' }, via: CABLES, bus: 'mgmt', label: 'Power sequencing' },
      { from: { id: 'flash' }, to: { id: 'grace-cpu' }, pair: 'nearest', bus: 'mgmt', label: 'Boot firmware' },
    ],
  },
  {
    title: 'Two networks',
    text: 'Four ConnectX-7 cards, one per GPU, connect to the scale-out fabric (InfiniBand or Spectrum-X Ethernet) at 400 Gb/s each. Two BlueField-3 DPUs handle the front-end network: storage, users and management. Each superchip gets one DPU.',
    display: { cooling: true }, dir: [0.25, 0.7, 1.0], zoom: 1.0,
    flows: [
      { from: NET, to: { id: 'cx7-card' }, bus: 'net', label: 'ConnectX-7 ×4' },
      { from: STORAGE, to: { id: 'bf3-card' }, bus: 'net', label: 'BlueField-3 ×2' },
    ],
  },
  {
    title: 'Cables, not a midplane',
    text: 'In GB200, twinax cables run from the front of each superchip to its NICs, DPU and drives. Fans pull air over these front parts, which are not liquid-cooled. Vera Rubin later removed both the cables and the fans by using a cable-free PCIe midplane.',
    display: { cooling: true }, dir: [0.4, 0.95, 0.5], zoom: 0.9,
    flows: [
      { from: { id: 'cx7-card' }, to: { id: 'b200-gpu' }, pair: 'nearest', via: [{ id: 'cables' }, { id: 'cable-conn' }], bus: 'net', label: 'One NIC per GPU' },
      { from: { id: 'bf3-card' }, to: { id: 'grace-cpu' }, pair: 'nearest', via: [{ id: 'cables' }], bus: 'pcie', label: 'One DPU per Grace' },
    ],
    tags: [{ sel: { id: 'fans' }, label: 'Fan wall' }],
  },
  {
    title: 'Loading the model into CPU memory',
    text: 'Model weights can total hundreds of gigabytes. They arrive from network storage through BlueField-3, or from the local E1.S drives. Each Grace stores them in its LPDDR5X memory, up to 480 GB per CPU.',
    display: { cooling: false }, dir: [0.3, 0.9, 0.55], zoom: 0.9,
    flows: [
      { from: STORAGE, to: { id: 'bf3-card' }, bus: 'net' },
      { from: { id: 'e1s' }, to: { id: 'grace-cpu' }, via: CABLES, bus: 'pcie', label: 'Local E1.S drives' },
      { from: { id: 'bf3-card' }, to: { id: 'grace-cpu' }, pair: 'nearest', via: CABLES, bus: 'pcie', label: 'Grace CPUs' },
      { from: { id: 'grace-cpu' }, to: { id: 'lpddr5x' }, pair: 4, bus: 'lpddr', label: 'LPDDR5X memory' },
    ],
  },
  {
    title: 'Copying weights to the GPUs',
    text: 'Each Grace sends the weights to its two B200 GPUs over NVLink-C2C at 900 GB/s. The link is cache-coherent, so a GPU can also read CPU memory directly when a model or its KV cache is larger than GPU memory.',
    display: { cooling: false }, dir: [0.5, 0.95, 0.35], zoom: 1.6,
    flows: [
      { from: { id: 'lpddr5x', side: -1 }, to: CPU0, pair: 'all', bus: 'lpddr' },
      { from: CPU0, to: { id: 'b200-gpu', side: -1 }, bus: 'c2c', label: 'B200 GPUs' },
    ],
  },
  {
    title: 'GPU memory: HBM3e',
    text: 'Each B200 package has eight HBM3e stacks next to its two compute dies, holding 186 GB at 8 TB/s. Across the rack that adds up to 13.4 TB of HBM. Models larger than one GPU are split across several.',
    display: { cooling: false, lids: false }, dir: [0.35, 1.0, 0.45], zoom: 1.5,
    flows: [
      { from: { id: 'b200-die', within: GPU0 }, to: { id: 'hbm3e', within: GPU0 }, pair: 4, bus: 'hbm', label: '8× HBM3e · 186 GB' },
    ],
  },
  {
    title: 'A request arrives',
    text: 'A user\'s prompt arrives from the network. The GPU\'s ConnectX-7 writes it directly into GPU memory with GPUDirect RDMA. The CPU schedules the work but does not copy the data.',
    display: { cooling: false, lids: false }, dir: [0.2, 0.85, 0.9], zoom: 1.0,
    flows: [
      { from: NET, to: { id: 'cx7-card' }, pair: 'nearest', bus: 'net' },
      { from: { id: 'cx7-card', side: -1, nth: 0 }, to: GPU0, via: [{ id: 'cables' }, { id: 'cable-conn' }], bus: 'net', label: 'Prompt into GPU memory' },
    ],
  },
  {
    title: 'Running the model',
    text: 'For each layer, the GPU reads weights and the KV cache from HBM3e. The second-generation Transformer Engine runs the math in FP4 or FP8. The two dies share the work over the 10 TB/s NV-HBI link and operate as one GPU. Each pass through the model produces one token.',
    display: { cooling: false, lids: false }, dir: [0.3, 1.0, 0.5], zoom: 1.5,
    flows: [
      { from: { id: 'hbm3e', within: GPU0 }, to: { id: 'b200-die', within: GPU0 }, pair: 'nearest', bus: 'hbm', label: 'Weights + KV cache' },
      { from: { id: 'b200-die', within: GPU0, nth: 0 }, to: { id: 'b200-die', within: GPU0, nth: 1 }, bus: 'd2d', label: 'NV-HBI' },
    ],
  },
  {
    title: 'Sharing work over NVLink 5',
    text: 'Large models are split across many GPUs with tensor, expert and pipeline parallelism. After each layer, the GPUs exchange results over NVLink 5 at 1.8 TB/s per GPU. The traffic passes through the copper spine and 18 switch chips, so all 72 GPUs can work on one model.',
    display: { cooling: false }, dir: [-0.35, 0.85, -0.6], zoom: 1.0,
    flows: [
      { from: { id: 'b200-gpu' }, to: { id: 'nvlink-conn' }, pair: 'nearest', bus: 'nvlink' },
      { from: { id: 'nvlink-conn' }, to: SPINE, bus: 'nvlink', label: 'Other GPUs in the rack' },
    ],
  },
  {
    title: 'Returning the answer',
    text: 'The GPU sends each generated token back through its ConnectX-7 to the user. Throughout the process, liquid coolant removes heat from every GPU and CPU, fans cool the front I/O, and the busbar supplies power.',
    display: { cooling: true }, dir: [0.45, 0.75, 0.9], zoom: 1.05,
    flows: [
      { from: GPU0, to: { id: 'cx7-card', side: -1, nth: 0 }, via: [{ id: 'cable-conn' }, { id: 'cables' }], bus: 'net' },
      { from: { id: 'cx7-card', side: -1, nth: 0 }, to: NET, bus: 'net', label: 'Answer to the user' },
      { from: { id: 'uqd' }, to: { id: 'gpu-coldplate' }, pair: 2, bus: 'cool', label: 'Cold plates' },
    ],
  },
];
