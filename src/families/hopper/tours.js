// Guided tours for the Hopper views. Step and selector reference: src/tour/steps.js

// ---------------------------------------------------------------- H100 / H200 SXM5 module
const BASEBOARD = { virtual: [0, -40, 70], label: 'HGX baseboard · NVSwitches and host' };

export const H100_STEPS = [
  {
    title: 'The H100 SXM5 module',
    text: 'This is one Hopper GPU as it ships for servers: the GH100 package in the middle of a small board, with power delivery at both ends. There is no card edge or fan. Eight of these plug into an HGX baseboard.',
    display: { lids: false, floorplan: false, explode: 0 }, dir: [0.5, 0.85, 0.75], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'h100-gpu' }, label: 'GH100 package' },
      { sel: { id: 'vrm-inductor', nth: 0 }, label: 'VRM phases' },
      { sel: { id: 'sxm5-pcb' }, label: 'SXM5 module board' },
    ],
    flows: [],
  },
  {
    title: 'Power delivery',
    text: 'The GPU can draw up to 700 W at less than 1 V, which is hundreds of amps. Power comes in through the connectors underneath. Dozens of regulator phases at both ends of the board step it down, and digital controllers keep the phases in step.',
    display: { lids: false, explode: 0 }, dir: [0.25, 1.0, 0.6], zoom: 1.2,
    flows: [
      { from: { id: 'vrm-ctrl' }, to: { id: 'vrm-inductor' }, pair: 3, bus: 'mgmt', label: 'Phase control' },
      { from: { id: 'vrm-inductor' }, to: { id: 'h100-gpu' }, bus: 'power', label: 'Sub-1 V core rail' },
    ],
  },
  {
    title: 'Two connectors underneath',
    text: 'Explode the module and two mezzanine connectors appear under it. They carry everything: power, PCIe Gen5 x16 to the host and all 18 NVLink 4 links. The heatsink screws clamp the module down onto the baseboard.',
    display: { lids: false, explode: 0.7 }, dir: [0.6, 0.35, 0.9], zoom: 1.0, frame: 'all',
    tags: [{ sel: { id: 'sxm-mezz' }, label: 'Mezzanine connectors' }],
    flows: [
      { from: { id: 'h100-gpu' }, to: { id: 'sxm-mezz' }, bus: 'nvlink', label: '18× NVLink 4 · PCIe Gen5' },
      { from: { id: 'sxm-mezz' }, to: BASEBOARD, bus: 'nvlink' },
    ],
  },
  {
    title: 'CoWoS: die and memory side by side',
    text: 'The GH100 die and its HBM stacks sit on a silicon interposer (TSMC CoWoS-S). Each stack has a 1,024-bit bus, far too many wires for an ordinary package, so they run through the silicon. The package has no lid: the heatsink presses straight onto the silicon.',
    display: { lids: false, floorplan: false, explode: 0 }, dir: [0.35, 1.0, 0.55], zoom: 2.4,
    tags: [{ sel: { id: 'cowos-interposer' }, label: 'CoWoS-S interposer' }],
    flows: [
      { from: { id: 'h100-die' }, to: { id: 'hbm3' }, bus: 'hbm', label: '5× HBM3 · 80 GB · 3.35 TB/s' },
    ],
  },
  {
    title: 'Five stacks, or six: H100 vs H200',
    text: 'The package has six HBM sites, but H100 80 GB uses only five of them, which helps yield. H200 is the same GH100 die on the same module and at the same 700 W, with all six sites filled with HBM3e: 141 GB at 4.8 TB/s.',
    display: { lids: false, floorplan: false, explode: 0 }, dir: [0.2, 1.0, 0.45], zoom: 2.2,
    tags: [
      { sel: { id: 'hbm-off' }, label: 'Unused on H100 · HBM3e on H200' },
      { sel: { id: 'hbm3', nth: 0 }, label: 'HBM3 · 16 GB' },
    ],
    flows: [],
  },
  {
    title: 'Inside the GH100 die',
    text: 'The floorplan shows 8 GPCs, four above and four below the L2 cache, which is split into two halves. The full die has 144 SMs; H100 SXM5 enables 132. Memory controllers and HBM PHYs line both long edges, NVLink and PCIe the short ones.',
    display: { lids: false, floorplan: true, explode: 0 }, dir: [0.1, 1.0, 0.35], zoom: 2.0,
    tags: [{ sel: { id: 'h100-die' }, label: '132 of 144 SMs enabled' }],
    flows: [],
  },
  {
    title: 'Out to the other GPUs',
    text: 'NVLink 4 gives each GPU 900 GB/s over 18 links, seven times PCIe Gen5. On an HGX board those links go through four NVSwitch chips, so all eight GPUs can share their memory at full speed.',
    display: { lids: false, floorplan: false, explode: 0 }, dir: [0.45, 0.8, 0.8], zoom: 1.0, frame: 'all',
    flows: [
      { from: { id: 'h100-gpu' }, to: { id: 'sxm-mezz' }, bus: 'nvlink', label: 'NVLink 4 · 900 GB/s' },
      { from: { id: 'sxm-mezz' }, to: BASEBOARD, bus: 'nvlink' },
    ],
  },
];

// ---------------------------------------------------------------- HGX H100 / H200 8-GPU
const HOST = { virtual: [-90, 60, -340], label: 'Host board · 2× x86 CPUs, PCIe switches, NICs' };
const STORAGE = { virtual: [170, 70, -340], label: 'NVMe / network storage · model weights' };
const POWER = { virtual: [80, 40, -340], label: 'Chassis power supplies' };
const AIR = { virtual: [0, 60, 360], label: 'Front fan wall · cold aisle air' };
const GPU0 = { id: 'h100-gpu', side: -1, nth: 2 }; // front-left GPU

export const HGX_H100_STEPS = [
  {
    title: 'HGX H100',
    text: 'This board holds eight H100 GPUs on SXM5 modules and four NVSwitch chips. It has no CPUs: a separate host board connects over PCIe. DGX H100 is NVIDIA\'s own server built around it, and the same board takes H200 modules.',
    display: { cooling: true, lids: false }, dir: [-0.55, 0.75, 0.85], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'h100-heatsink' }, label: '8× H100 under heatsinks' },
      { sel: { id: 'nvswitch-heatsink' }, label: '4× NVSwitch' },
      { sel: { id: 'hgx3-host' }, label: 'Host connectors' },
    ],
    flows: [],
  },
  {
    title: 'Air cooling',
    text: 'Fans at the front of the chassis push air through the tall GPU heatsinks first, then over the NVSwitches at the back. At 700 W per GPU, air cooling needs a tall server: DGX H100 is 8U.',
    display: { cooling: true }, dir: [0.45, 0.6, 0.9], zoom: 1.0,
    flows: [
      { from: AIR, to: { id: 'h100-heatsink' }, bus: 'cool', label: 'Through the GPU fins' },
      { from: { id: 'h100-heatsink' }, to: { id: 'nvswitch-heatsink' }, bus: 'cool', label: 'Then the switches' },
    ],
  },
  {
    title: 'Power-on',
    text: 'The chassis power supplies feed 54 V into the rear edge of the board. Each SXM5 module has its own regulators. The HGX management controller (HMC) checks firmware, brings up the NVSwitches and reports to the host.',
    display: { cooling: false }, dir: [0.2, 0.95, -0.5], zoom: 0.95,
    flows: [
      { from: POWER, to: { id: 'hgx3-power' }, bus: 'power', label: 'Power in' },
      { from: { id: 'hgx3-power' }, to: { id: 'sxm5-module' }, bus: 'power', label: 'GPU modules' },
      { from: { id: 'hgx3-hmc' }, to: { id: 'nvswitch3' }, bus: 'mgmt', label: 'NVSwitch bring-up' },
    ],
  },
  {
    title: 'Connecting to the host',
    text: 'Each GPU gets its own PCIe Gen5 x16 link to the host board, 64 GB/s each way. There, PCIe switches pair each GPU with a 400 Gb/s network card, so GPUs in different servers can talk without going through a CPU.',
    display: { cooling: false }, dir: [0.25, 0.8, -1.0], zoom: 1.0,
    flows: [
      { from: HOST, to: { id: 'hgx3-host' }, bus: 'pcie', label: '8× PCIe Gen5 x16' },
      { from: { id: 'hgx3-host' }, to: { id: 'h100-gpu' }, bus: 'pcie', label: 'Every GPU' },
    ],
  },
  {
    title: 'Loading the model',
    text: 'The host reads model weights from storage and copies them into GPU memory over PCIe. Eight H100s hold 640 GB; eight H200s hold 1.1 TB, enough for much larger models on one board.',
    display: { cooling: false }, dir: [0.3, 0.9, -0.75], zoom: 1.0,
    flows: [
      { from: STORAGE, to: HOST, bus: 'net', label: 'Model weights' },
      { from: HOST, to: { id: 'hgx3-host' }, bus: 'pcie' },
      { from: { id: 'hgx3-host' }, to: { id: 'h100-gpu' }, bus: 'pcie' },
    ],
  },
  {
    title: 'GPU memory',
    text: 'Each H100 reads its five HBM3 stacks at 3.35 TB/s. H200 fills the sixth site and moves to HBM3e: 141 GB at 4.8 TB/s per GPU, with the same die, module and board.',
    display: { cooling: false, lids: false }, dir: [0.35, 1.0, 0.45], zoom: 2.5,
    flows: [
      { from: { id: 'h100-die', within: GPU0 }, to: { id: 'hbm3', within: GPU0 }, bus: 'hbm', label: '5× HBM3 · 80 GB' },
    ],
  },
  {
    title: 'All-to-all over NVLink 4',
    text: 'Every GPU spreads its 18 NVLink 4 links over all four NVSwitches, four or five links to each. Any GPU can reach any other at 900 GB/s, and the switches can sum all-reduce data themselves (SHARP), so all eight GPUs work as one.',
    display: { cooling: false, lids: false }, dir: [0.15, 1.0, 0.55], zoom: 1.1,
    flows: [
      { from: { id: 'h100-gpu' }, to: { id: 'nvswitch3' }, bus: 'nvlink', label: 'NVLink 4 · 900 GB/s per GPU' },
    ],
  },
  {
    title: 'Returning the answer',
    text: 'Each generated token goes back to the host over PCIe and out through its network cards. Meanwhile the fans keep pushing air through every heatsink.',
    display: { cooling: true }, dir: [-0.4, 0.8, -0.9], zoom: 1.05,
    flows: [
      { from: GPU0, to: { id: 'hgx3-host' }, bus: 'pcie' },
      { from: { id: 'hgx3-host' }, to: HOST, bus: 'net', label: 'Answer to the user' },
    ],
  },
];

// ---------------------------------------------------------------- GH200 Grace Hopper Superchip
const HOST_BOARD = { virtual: [0, -40, 170], label: 'Host board · NICs, drives, NVLink Switch system' };

export const GH200_STEPS = [
  {
    title: 'GH200 Grace Hopper',
    text: 'This module carries a Grace CPU and a Hopper GPU on one board. The GPU is the same GH100 as H100. The CPU and its LPDDR5X memory take the other half of the board.',
    display: { lids: false, floorplan: false, explode: 0 }, dir: [0.5, 0.85, 0.75], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'h100-gpu' }, label: 'Hopper GPU' },
      { sel: { id: 'grace-cpu' }, label: 'Grace CPU' },
      { sel: { id: 'lpddr5x', nth: 0 }, label: 'LPDDR5X' },
    ],
    flows: [],
  },
  {
    title: 'Power and connectors',
    text: 'The whole module is rated for up to 1000 W, CPU, GPU and memory together. Power, PCIe and NVLink all pass through connectors on the underside to a host board.',
    display: { lids: false, explode: 0.7 }, dir: [0.6, 0.35, 0.9], zoom: 1.0, frame: 'all',
    tags: [{ sel: { id: 'gh200-conn' }, label: 'Connectors underneath' }],
    flows: [
      { from: HOST_BOARD, to: { id: 'gh200-conn' }, bus: 'power', label: 'Power in' },
      { from: { id: 'vrm-inductor' }, to: { id: 'h100-gpu' }, bus: 'power', label: 'GPU core rail' },
    ],
  },
  {
    title: 'CPU memory: LPDDR5X',
    text: 'Grace has up to 480 GB of LPDDR5X at up to 512 GB/s. Eight packages sit beside the CPU and eight more are on the back of the board. LPDDR5X uses much less power than server DDR5 but is soldered down.',
    display: { lids: false, explode: 0 }, dir: [0.35, 0.95, 0.6], zoom: 1.4,
    flows: [{ from: { id: 'grace-cpu' }, to: { id: 'lpddr5x' }, bus: 'lpddr', label: '16× LPDDR5X · 480 GB' }],
  },
  {
    title: 'GPU memory: HBM',
    text: 'On GH200 all six HBM sites are active: 96 GB of HBM3 at 4 TB/s, or 144 GB of HBM3e at 4.9 TB/s on the later version.',
    display: { lids: false, floorplan: false, explode: 0 }, dir: [0.3, 1.0, 0.5], zoom: 2.2,
    flows: [{ from: { id: 'h100-die' }, to: { id: 'hbm3' }, bus: 'hbm', label: '6× HBM · 96 or 144 GB' }],
  },
  {
    title: 'NVLink-C2C',
    text: 'NVLink-C2C joins the two chips at 900 GB/s, about seven times PCIe Gen5. It is cache-coherent, so the GPU can read and write CPU memory directly. A model that does not fit in HBM can spill into the LPDDR5X.',
    display: { lids: false, floorplan: false, explode: 0 }, dir: [0.55, 0.8, 0.4], zoom: 1.1,
    flows: [{ from: { id: 'h100-gpu' }, to: { id: 'grace-cpu' }, bus: 'c2c', label: 'NVLink-C2C · 900 GB/s' }],
  },
  {
    title: 'Scaling out',
    text: 'Grace\'s PCIe Gen5 lanes reach the network cards and drives on the host board. The GPU still has its 18 NVLink 4 links, which NVIDIA used to join up to 256 GH200s through NVLink Switch systems.',
    display: { lids: false, floorplan: false, explode: 0 }, dir: [0.45, 0.8, 0.8], zoom: 1.0, frame: 'all',
    flows: [
      { from: { id: 'grace-cpu' }, to: { id: 'gh200-conn' }, pair: 'nearest', bus: 'pcie', label: 'PCIe Gen5' },
      { from: { id: 'h100-gpu' }, to: { id: 'gh200-conn' }, pair: 2, bus: 'nvlink', label: 'NVLink 4 · 900 GB/s' },
      { from: { id: 'gh200-conn' }, to: HOST_BOARD, pair: 'nearest', bus: 'pcie' },
    ],
  },
];
