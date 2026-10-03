// Guided tour of a single GB200 Grace Blackwell superchip: from the board's connectors into the
// Grace CPU, its memory and the two B200 GPUs, and back out to the rack.
// Step and selector reference: ../steps.js

const FRONT_IO = { virtual: [60, 30, 250], label: 'Tray front I/O · BlueField-3, drives' };
const NICS = { virtual: [-80, 30, 250], label: 'Tray front I/O · one ConnectX-7 per GPU' };
const SPINE = { virtual: [0, 40, -265], label: 'NVLink spine → 18 switch chips · 72 GPUs' };

const GPU0 = { id: 'b200-gpu', side: -1 };
const CABLE_CONN = { id: 'cable-conn', nth: 2 };

export const SUPERCHIP_STEPS = [
  {
    title: 'The GB200 superchip',
    text: 'One board carries a Grace CPU, two B200 GPUs, and their memory and power delivery. Two of these superchips sit in each NVL72 compute tray. This tour follows data from the board\'s connectors into the chips and back out.',
    display: { lids: false }, dir: [0.5, 0.85, 0.75], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'b200-gpu' }, label: '2× B200 GPUs' },
      { sel: { id: 'grace-cpu' }, label: 'Grace CPU' },
      { sel: { id: 'cable-conn' }, label: 'PCIe cable connectors' },
    ],
    flows: [],
  },
  {
    title: 'Power-on and boot',
    text: 'Each B200 can draw about 1.2 kW at less than 1 V, so power delivery takes up much of the board. A small controller (CPLD) switches on the voltage regulators in a fixed order. Grace then loads its firmware from SPI flash and initializes both GPUs.',
    display: { lids: false }, dir: [0.2, 1.0, 0.6], zoom: 1.6,
    flows: [
      { from: { id: 'cpld' }, to: { id: 'vrm-ctrl' }, bus: 'mgmt', label: 'Power sequencing' },
      { from: { id: 'vrm-ctrl' }, to: { id: 'vrm-inductor' }, pair: 2, bus: 'power', label: 'Voltage regulators' },
      { from: { id: 'flash' }, to: { id: 'grace-cpu' }, bus: 'mgmt', label: 'Boot firmware' },
    ],
  },
  {
    title: 'Cables at the front, NVLink at the rear',
    text: 'At the front edge, four connectors take internal cables that carry PCIe Gen5 to the network cards, the BlueField-3 DPU and the drives. At the rear, two connectors plug into the rack\'s copper NVLink spine. Vera Rubin later replaced the front cables with a cable-free midplane.',
    display: { lids: false }, dir: [0.55, 0.8, 0.55], zoom: 0.8,
    flows: [
      { from: { id: 'cable-conn' }, to: FRONT_IO, bus: 'pcie', label: 'PCIe Gen5 cables' },
      { from: { id: 'nvlink-conn' }, to: SPINE, bus: 'nvlink', label: 'NVLink 5' },
    ],
  },
  {
    title: 'Loading the model into CPU memory',
    text: 'Model weights arrive over PCIe Gen5. Grace stores them in 16 soldered LPDDR5X packages that hold up to 480 GB at up to 512 GB/s. LPDDR5X uses much less power than server DDR5, but it cannot be upgraded.',
    display: { lids: false }, dir: [0.35, 0.95, 0.6], zoom: 1.1,
    flows: [
      { from: FRONT_IO, to: CABLE_CONN, bus: 'pcie' },
      { from: CABLE_CONN, to: { id: 'grace-cpu' }, bus: 'pcie', label: 'Grace CPU' },
      { from: { id: 'grace-cpu' }, to: { id: 'lpddr5x' }, bus: 'lpddr', label: '16× LPDDR5X · 480 GB' },
    ],
  },
  {
    title: 'The Grace CPU',
    text: 'Grace has 72 Arm Neoverse V2 cores on a mesh fabric with 114 MB of L3 cache. It runs the operating system, prepares data and schedules work for the GPUs. The floorplan overlay shows the core mesh.',
    display: { lids: false, floorplan: true }, dir: [0.15, 1.0, 0.45], zoom: 2.6,
    tags: [{ sel: { id: 'grace-die' }, label: '72 Neoverse V2 cores' }],
    flows: [],
  },
  {
    title: 'Copying weights to the GPUs',
    text: 'Grace sends the weights to both B200 GPUs over NVLink-C2C at 900 GB/s. The link is cache-coherent, so a GPU can read CPU memory directly, which is useful for KV caches that spill out of HBM.',
    display: { lids: false }, dir: [0.4, 1.0, 0.5], zoom: 1.35,
    flows: [
      { from: { id: 'lpddr5x' }, to: { id: 'grace-cpu' }, bus: 'lpddr' },
      { from: { id: 'grace-cpu' }, to: { id: 'b200-gpu' }, bus: 'c2c', label: 'NVLink-C2C · 900 GB/s' },
    ],
  },
  {
    title: 'Inside a B200',
    text: 'Each B200 has two reticle-limited dies side by side, joined by a 10 TB/s NV-HBI link so they behave as one GPU. Four HBM3e stacks sit above the pair and four below, giving 186 GB at 8 TB/s. Fifth-generation tensor cores run FP4 for inference.',
    display: { lids: false }, dir: [0.3, 1.0, 0.5], zoom: 2.5,
    flows: [
      { from: { id: 'hbm3e', within: GPU0 }, to: { id: 'b200-die', within: GPU0 }, pair: 'nearest', bus: 'hbm', label: '8× HBM3e · 186 GB' },
      { from: { id: 'b200-die', within: GPU0, nth: 0 }, to: { id: 'b200-die', within: GPU0, nth: 1 }, bus: 'd2d', label: 'NV-HBI · 10 TB/s' },
    ],
  },
  {
    title: 'Sharing work over NVLink 5',
    text: 'Large models are split across many GPUs. Each GPU sends results to the others over 18 NVLink 5 links, 1.8 TB/s in total. The rear connectors carry this traffic into the rack\'s copper spine and on to 18 switch chips, which link all 72 GPUs.',
    display: { lids: false }, dir: [-0.35, 0.85, -0.65], zoom: 1.0,
    flows: [
      { from: { id: 'b200-gpu' }, to: { id: 'nvlink-conn' }, pair: 'nearest', bus: 'nvlink' },
      { from: { id: 'nvlink-conn' }, to: SPINE, bus: 'nvlink', label: 'Other GPUs in the rack' },
    ],
  },
  {
    title: 'Returning the answer',
    text: 'Each GPU also has a cable path through the front connectors to its own ConnectX-7 network card (400 Gb/s) for traffic between racks. Prompts arrive straight into GPU memory this way (GPUDirect RDMA), and generated tokens leave the same way.',
    display: { lids: false }, dir: [0.4, 0.85, 0.85], zoom: 1.0,
    flows: [
      { from: { id: 'b200-gpu' }, to: { id: 'cable-conn' }, pair: 'nearest', bus: 'net' },
      { from: { id: 'cable-conn', side: -1 }, to: NICS, bus: 'net', label: 'Answer to the user' },
      { from: { id: 'cable-conn', side: 1 }, to: NICS, bus: 'net' },
    ],
  },
];
