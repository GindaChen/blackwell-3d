// Guided tour of the HGX Rubin NVL8 GPU tray: eight GPUs on one baseboard, fed by a separate host
// CPU tray, from rack power-on to an answer.
// Step and selector reference: ../steps.js

const HOST = { virtual: [-90, 60, 540], label: 'Host CPU tray · Vera or x86, ConnectX-9 NICs' };
const STORAGE = { virtual: [170, 70, 540], label: 'NVMe / network storage · model weights' };
const BUSBAR = { virtual: [80, 40, -530], label: 'Rack DC busbar' };
const COOLANT = { virtual: [-200, 60, -530], label: 'Rack coolant manifold' };

// front-left GPU, the one nearest the host connectors
const GPU0 = { id: 'rubin-gpu', side: -1, nth: 3 };
const HOST_L = { id: 'host-conn', side: -1 };
const HOST_R = { id: 'host-conn', side: 1 };

export const NVL8_STEPS = [
  {
    title: 'The HGX Rubin NVL8 tray',
    text: 'This tray holds eight Rubin GPUs on one baseboard, linked by NVLink 6 switch chips. Unlike the NVL72 compute tray, it has no CPUs: a separate host tray connects to it with cables. This tour follows an AI model from the host to a finished answer.',
    display: { cooling: true, lids: false }, dir: [-0.55, 0.75, 0.85], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'gpu-coldplate' }, label: '8× Rubin GPUs under cold plates' },
      { sel: { id: 'gpu-manifold' }, label: 'Coolant manifold' },
      { sel: { id: 'host-conn' }, label: 'Host connectors' },
    ],
    flows: [],
  },
  {
    title: 'Connecting to the rack',
    text: 'The tray slides into the rack from the front. At the rear, it clips onto the DC power busbar and two quick-disconnect couplings join the rack\'s coolant loop. Power converters step the busbar voltage down for the GPU modules.',
    display: { cooling: true }, dir: [0.45, 0.8, -0.75], zoom: 1.0,
    flows: [
      { from: BUSBAR, to: { id: 'busbar' }, bus: 'power', label: 'Power in' },
      { from: { id: 'busbar' }, to: { id: 'pdb' }, bus: 'power', label: 'Power converters' },
      { from: COOLANT, to: { id: 'uqd' }, bus: 'cool', label: 'Coolant supply and return' },
      { from: { id: 'uqd' }, to: { id: 'gpu-manifold' }, bus: 'cool', label: 'Manifold' },
    ],
  },
  {
    title: 'Power-on',
    text: 'Power flows to the eight GPU modules, each with its own voltage regulators. The HGX management controller (HMC) on the baseboard checks the GPU firmware, brings up the NVLink switches, and reports health to the host tray.',
    display: { cooling: false }, dir: [0.2, 0.95, 0.5], zoom: 0.95,
    flows: [
      { from: { id: 'pdb' }, to: { id: 'rubin-gpu' }, bus: 'power', label: 'GPU modules' },
      { from: { id: 'hgx-hmc' }, to: { id: 'nvswitch' }, bus: 'mgmt', label: 'NVLink bring-up' },
      { from: { id: 'hgx-hmc' }, to: HOST, bus: 'mgmt', label: 'Health and telemetry' },
    ],
  },
  {
    title: 'Connecting to the host',
    text: 'The CPUs live in a separate host tray. Cables plug into connectors at the front of the baseboard and carry PCIe Gen6 to every GPU. Network cards in the host tray connect the system to storage and to other servers.',
    display: { cooling: false }, dir: [0.25, 0.8, 1.0], zoom: 1.0,
    flows: [
      { from: HOST, to: { id: 'host-conn' }, bus: 'pcie', label: 'PCIe Gen6 cables' },
      { from: HOST_L, to: { id: 'rubin-gpu', side: -1 }, bus: 'pcie', label: 'Every GPU' },
      { from: HOST_R, to: { id: 'rubin-gpu', side: 1 }, bus: 'pcie', label: 'Every GPU' },
    ],
  },
  {
    title: 'Loading the model',
    text: 'Model weights can total hundreds of gigabytes. The host reads them from storage and copies them into GPU memory over PCIe. With GPUDirect Storage, drives and network storage can write straight into GPU memory without passing through the CPU.',
    display: { cooling: false }, dir: [0.3, 0.9, 0.75], zoom: 1.0,
    flows: [
      { from: STORAGE, to: HOST, bus: 'net', label: 'Model weights' },
      { from: HOST, to: { id: 'host-conn' }, bus: 'pcie' },
      { from: HOST_L, to: { id: 'rubin-gpu', side: -1 }, bus: 'pcie' },
      { from: HOST_R, to: { id: 'rubin-gpu', side: 1 }, bus: 'pcie' },
    ],
  },
  {
    title: 'GPU memory: HBM4',
    text: 'Each GPU package has eight HBM4 memory stacks next to its two compute dies, holding 288 GB at about 22 TB/s. Across eight GPUs, the tray has 2.3 TB of GPU memory, so a large model can be split between them.',
    display: { cooling: false, lids: false }, dir: [0.35, 1.0, 0.45], zoom: 2.5,
    flows: [
      { from: { id: 'rubin-die', within: GPU0 }, to: { id: 'hbm4', within: GPU0 }, pair: 4, bus: 'hbm', label: '8× HBM4 · 288 GB' },
      { from: { id: 'rubin-die', within: GPU0, nth: 0 }, to: { id: 'rubin-die', within: GPU0, nth: 1 }, bus: 'd2d', label: 'Die-to-die' },
    ],
  },
  {
    title: 'All-to-all over NVLink 6',
    text: 'Every GPU connects to all four NVLink 6 switch chips on the baseboard at 3.6 TB/s. After each layer of the model, the GPUs exchange results through the switches, so all eight work as one large accelerator. In an NVL72 rack, the same links reach 72 GPUs through a copper spine.',
    display: { cooling: false, lids: false }, dir: [0.15, 1.0, 0.55], zoom: 1.15,
    flows: [
      { from: { id: 'rubin-gpu' }, to: { id: 'nvswitch' }, bus: 'nvlink', label: 'NVLink 6 switches' },
    ],
  },
  {
    title: 'Returning the answer',
    text: 'Each generated token returns to the host over PCIe and goes out through its network cards to the user. Throughout the process, liquid coolant flows through cold plates on every GPU and switch chip.',
    display: { cooling: true }, dir: [-0.4, 0.8, 0.9], zoom: 1.05,
    flows: [
      { from: GPU0, to: HOST_L, bus: 'pcie' },
      { from: HOST_L, to: HOST, bus: 'net', label: 'Answer to the user' },
      { from: { id: 'gpu-manifold' }, to: { id: 'gpu-coldplate' }, bus: 'cool', label: 'Cold plates' },
    ],
  },
];
