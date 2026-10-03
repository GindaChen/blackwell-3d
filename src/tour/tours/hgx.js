// Guided tour of the HGX B200: eight air-cooled GPUs on one baseboard, fed by a separate x86 host.
// Step and selector reference: ../steps.js

const HOST = { virtual: [-90, 60, -560], label: 'Host tray · 2× x86 CPUs, ConnectX-7, BlueField-3' };
const STORAGE = { virtual: [170, 70, -560], label: 'NVMe / network storage · model weights' };
const POWER = { virtual: [80, 40, -560], label: 'Chassis power supplies' };
const AIR = { virtual: [0, 60, 560], label: 'Cold aisle air' };

// front-left GPU
const GPU0 = { id: 'b200-gpu', side: -1, nth: 2 };

export const HGX_STEPS = [
  {
    title: 'HGX B200',
    text: 'This tray holds eight B200 GPUs on SXM modules, linked by two NVLink switch chips on the baseboard. It has no CPUs: a separate x86 host tray connects to it with PCIe cables. DGX B200 is NVIDIA\'s own system built around this board.',
    display: { cooling: true, lids: false }, dir: [-0.55, 0.75, 0.85], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'gpu-heatsink' }, label: '8× B200 under heatsinks' },
      { sel: { id: 'switch-heatsink' }, label: '2× NVLink switches' },
      { sel: { id: 'host-conn' }, label: 'Host connectors' },
    ],
    flows: [],
  },
  {
    title: 'Air cooling',
    text: 'This version is air-cooled. A fan wall pushes front-to-back air through tall fin stacks with vapor-chamber bases, about 1 kW per GPU and roughly 14 kW for a full DGX B200. Liquid-cooled HGX boards replace the heatsinks with cold plates.',
    display: { cooling: true }, dir: [0.45, 0.6, 0.9], zoom: 1.0,
    flows: [
      { from: AIR, to: { id: 'fans' }, bus: 'cool', label: 'Intake' },
      { from: { id: 'fans' }, to: { id: 'gpu-heatsink' }, bus: 'cool', label: 'Through the fin stacks' },
    ],
  },
  {
    title: 'Power-on',
    text: 'The chassis power supplies feed 54 V into the rear of the baseboard. Each SXM module has its own voltage regulators. The HGX management controller (HMC) checks GPU firmware, brings up the NVLink switches and reports to the host.',
    display: { cooling: false }, dir: [0.2, 0.95, -0.5], zoom: 0.95,
    flows: [
      { from: POWER, to: { id: 'pdb' }, bus: 'power', label: 'Power in' },
      { from: { id: 'pdb' }, to: { id: 'b200-gpu' }, bus: 'power', label: 'GPU modules' },
      { from: { id: 'hgx-hmc' }, to: { id: 'hgx-nvswitch' }, bus: 'mgmt', label: 'NVLink bring-up' },
    ],
  },
  {
    title: 'Connecting to the host',
    text: 'The CPUs live in a separate host tray. Eight cables, one per GPU, carry PCIe Gen5 x16 to the host\'s PCIe switches, which also connect the ConnectX-7 NICs, so each GPU has its own 400 Gb/s path to other servers.',
    display: { cooling: false }, dir: [0.25, 0.8, -1.0], zoom: 1.0,
    flows: [
      { from: HOST, to: { id: 'host-conn' }, bus: 'pcie', label: 'PCIe Gen5 cables' },
      { from: { id: 'host-conn' }, to: { id: 'b200-gpu' }, bus: 'pcie', label: 'Every GPU' },
    ],
  },
  {
    title: 'Loading the model',
    text: 'The host reads model weights from storage and copies them into GPU memory over PCIe. With GPUDirect Storage, NVMe drives and network storage write straight into GPU memory without passing through the CPU.',
    display: { cooling: false }, dir: [0.3, 0.9, -0.75], zoom: 1.0,
    flows: [
      { from: STORAGE, to: HOST, bus: 'net', label: 'Model weights' },
      { from: HOST, to: { id: 'host-conn' }, bus: 'pcie' },
      { from: { id: 'host-conn' }, to: { id: 'b200-gpu' }, bus: 'pcie' },
    ],
  },
  {
    title: 'GPU memory: HBM3e',
    text: 'Each B200 has eight HBM3e stacks around its two dies, 180 GB at 8 TB/s on HGX B200. Across the tray that is 1.44 TB of GPU memory, enough to serve very large models on one node.',
    display: { cooling: false, lids: false }, dir: [0.35, 1.0, 0.45], zoom: 2.5,
    flows: [
      { from: { id: 'b200-die', within: GPU0 }, to: { id: 'hbm3e', within: GPU0 }, pair: 4, bus: 'hbm', label: '8× HBM3e · 180 GB' },
      { from: { id: 'b200-die', within: GPU0, nth: 0 }, to: { id: 'b200-die', within: GPU0, nth: 1 }, bus: 'd2d', label: 'NV-HBI' },
    ],
  },
  {
    title: 'All-to-all over NVLink 5',
    text: 'Every GPU sends nine NVLink 5 links to each of the two switch chips, which sit between the GPU rows to keep the links short. That is 1.8 TB/s per GPU, 14.4 TB/s for the tray. After each layer the GPUs exchange results through the switches, so all eight work as one accelerator. An NVL72 rack stretches the same NVLink domain to 72 GPUs.',
    display: { cooling: false, lids: false }, dir: [0.15, 1.0, 0.55], zoom: 1.15,
    flows: [
      { from: { id: 'b200-gpu' }, to: { id: 'hgx-nvswitch' }, bus: 'nvlink', label: 'NVLink 5 switches' },
    ],
  },
  {
    title: 'Returning the answer',
    text: 'Each generated token returns to the host over PCIe and leaves through its network cards. Meanwhile the fans keep pulling air through every heatsink.',
    display: { cooling: true }, dir: [-0.4, 0.8, -0.9], zoom: 1.05,
    flows: [
      { from: GPU0, to: { id: 'host-conn' }, bus: 'pcie' },
      { from: { id: 'host-conn' }, to: HOST, bus: 'net', label: 'Answer to the user' },
    ],
  },
];
