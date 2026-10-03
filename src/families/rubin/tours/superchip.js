// Guided tour of a single Vera Rubin superchip: from the board's edge connectors into the CPU,
// its memory and the two GPUs, and back out to the rack.
// Step and selector reference: ../steps.js

const MIDPLANE = { virtual: [60, 30, 250], label: 'Tray midplane · BlueField-4, drives' };
const NICS = { virtual: [-80, 30, 250], label: 'Tray midplane · 2× ConnectX-9 per GPU' };
const SPINE = { virtual: [0, 40, -265], label: 'NVLink spine → 36 switch chips · 72 GPUs' };

const GPU0 = { id: 'rubin-gpu', side: -1 };
const MID_CONN = { id: 'midplane-conn', nth: 1 };

export const SUPERCHIP_STEPS = [
  {
    title: 'The Vera Rubin superchip',
    text: 'One board carries a Vera CPU, two Rubin GPUs, and their memory and power delivery. Two of these superchips sit in each NVL72 compute tray. This tour follows data from the board\'s connectors into the chips and back out.',
    display: { lids: true }, dir: [0.5, 0.85, 0.75], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'rubin-gpu' }, label: '2× Rubin GPUs' },
      { sel: { id: 'vera-cpu' }, label: 'Vera CPU' },
      { sel: { id: 'midplane-conn' }, label: 'Midplane connectors' },
    ],
    flows: [],
  },
  {
    title: 'Power-on and boot',
    text: 'Each GPU draws well over 1 kW at less than 1 V, so power delivery fills much of the board. A small controller (CPLD) switches on the voltage regulators in a fixed order. The Vera CPU then loads its firmware from SPI flash and initializes both GPUs.',
    display: { lids: true }, dir: [0.2, 1.0, 0.6], zoom: 1.6,
    flows: [
      { from: { id: 'cpld' }, to: { id: 'vrm-ctrl' }, bus: 'mgmt', label: 'Power sequencing' },
      { from: { id: 'vrm-ctrl' }, to: { id: 'vrm-inductor' }, pair: 2, bus: 'power', label: 'Voltage regulators' },
      { from: { id: 'flash' }, to: { id: 'vera-cpu' }, bus: 'mgmt', label: 'Boot firmware' },
    ],
  },
  {
    title: 'No cables',
    text: 'Every signal leaves through edge connectors. At the front, three connectors plug into the tray\'s PCIe Gen6 midplane, which leads to the network chips, the BlueField-4 DPU and local drives. At the rear, two connectors plug into the rack\'s copper NVLink spine.',
    display: { lids: true }, dir: [0.55, 0.8, 0.55], zoom: 0.8,
    flows: [
      { from: { id: 'midplane-conn' }, to: MIDPLANE, bus: 'pcie', label: 'PCIe Gen6' },
      { from: { id: 'nvlink-conn' }, to: SPINE, bus: 'nvlink', label: 'NVLink 6' },
    ],
  },
  {
    title: 'Loading the model into CPU memory',
    text: 'Model weights arrive from the tray over PCIe Gen6. The Vera CPU stores them in eight SOCAMM modules: LPDDR5X memory that holds up to 1.5 TB at 1.2 TB/s. Each module can be replaced on its own.',
    display: { lids: true }, dir: [0.35, 0.95, 0.6], zoom: 1.1,
    flows: [
      { from: MIDPLANE, to: MID_CONN, bus: 'pcie' },
      { from: MID_CONN, to: { id: 'vera-cpu' }, bus: 'pcie', label: 'Vera CPU' },
      { from: { id: 'vera-cpu' }, to: { id: 'socamm' }, bus: 'lpddr', label: '8× SOCAMM · LPDDR5X' },
    ],
  },
  {
    title: 'The Vera CPU',
    text: 'Vera has 88 custom Arm Olympus cores that run 176 threads. It runs the operating system, prepares data, and schedules work for the GPUs. The floorplan overlay shows how the cores are arranged on the die.',
    display: { lids: true, floorplan: true }, dir: [0.15, 1.0, 0.45], zoom: 2.6,
    tags: [{ sel: { id: 'vera-die' }, label: '88 Olympus cores · 176 threads' }],
    flows: [],
  },
  {
    title: 'Copying weights to the GPUs',
    text: 'The CPU sends the weights to both Rubin GPUs over NVLink-C2C at 1.8 TB/s. The link is cache-coherent, so a GPU can also read CPU memory directly when a model is larger than GPU memory.',
    display: { lids: true }, dir: [0.4, 1.0, 0.5], zoom: 1.35,
    flows: [
      { from: { id: 'socamm' }, to: { id: 'vera-cpu' }, bus: 'lpddr' },
      { from: { id: 'vera-cpu' }, to: { id: 'rubin-gpu' }, bus: 'c2c', label: 'NVLink-C2C · 1.8 TB/s' },
    ],
  },
  {
    title: 'Inside a Rubin GPU',
    text: 'Under the lid, each GPU has two compute dies and eight HBM4 memory stacks holding 288 GB at about 22 TB/s. The dies share work over a die-to-die link and operate as one GPU. Tensor cores perform the math in 4-bit NVFP4 precision.',
    display: { lids: false }, dir: [0.3, 1.0, 0.5], zoom: 2.5,
    flows: [
      { from: { id: 'hbm4', within: GPU0 }, to: { id: 'rubin-die', within: GPU0 }, pair: 'nearest', bus: 'hbm', label: '8× HBM4 · 288 GB' },
      { from: { id: 'rubin-die', within: GPU0, nth: 0 }, to: { id: 'rubin-die', within: GPU0, nth: 1 }, bus: 'd2d', label: 'Die-to-die' },
    ],
  },
  {
    title: 'Sharing work over NVLink 6',
    text: 'Large models are split across many GPUs. Each GPU sends results to the others over NVLink 6 at 3.6 TB/s. The rear connectors carry this traffic to the rack\'s copper spine and 36 switch chips, which link all 72 GPUs in the rack.',
    display: { lids: false }, dir: [-0.35, 0.85, -0.65], zoom: 1.0,
    flows: [
      { from: { id: 'rubin-gpu' }, to: { id: 'nvlink-conn' }, pair: 'nearest', bus: 'nvlink' },
      { from: { id: 'nvlink-conn' }, to: SPINE, bus: 'nvlink', label: 'Other GPUs in the rack' },
    ],
  },
  {
    title: 'Returning the answer',
    text: 'Each GPU also has a path through the front connectors to two ConnectX-9 network chips in the tray, for 1.6 Tb/s to other racks. Prompts arrive directly in GPU memory this way, and each generated token leaves the same way.',
    display: { lids: true }, dir: [0.4, 0.85, 0.85], zoom: 1.0,
    flows: [
      { from: { id: 'rubin-gpu' }, to: { id: 'midplane-conn' }, pair: 'nearest', bus: 'net' },
      { from: { id: 'midplane-conn', side: -1 }, to: NICS, bus: 'net', label: 'Answer to the user' },
      { from: { id: 'midplane-conn', side: 1 }, to: NICS, bus: 'net' },
    ],
  },
];
