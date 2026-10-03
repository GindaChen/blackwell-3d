// Guided tours for the Ampere views. Step and selector reference: src/tour/steps.js

const BASEBOARD = { virtual: [0, -45, 0], label: 'HGX baseboard · NVSwitches and host PCIe' };
const BOARD_POWER = { virtual: [0, -45, -60], label: 'Baseboard power' };

export const A100_STEPS = [
  {
    title: 'A100 SXM4',
    text: 'This is one A100 module. The GA100 GPU and its memory sit on one package in the middle, with power delivery around it. There is no card edge: the module plugs into a baseboard through two connectors underneath.',
    display: { lids: false, floorplan: false }, dir: [0.55, 0.8, 0.9], zoom: 1.0, frame: 'all',
    tags: [
      { sel: { id: 'a100-gpu' }, label: 'A100 package' },
      { sel: { id: 'vrm-inductor' }, label: 'Voltage regulators' },
      { sel: { id: 'sxm4-mezz' }, label: 'Mezzanine connectors' },
    ],
    flows: [],
  },
  {
    title: 'The GA100 die',
    text: 'The die is 826 mm² with 54.2 billion transistors, built on TSMC N7. It has 8 GPCs of 16 SMs, 128 SMs in all. A100 enables 108 of them, which helps yield on such a large die. The L2 cache is split into two halves across the middle, 40 MB enabled.',
    display: { lids: false, floorplan: true }, dir: [0.2, 1.0, 0.45], zoom: 0.8,
    tags: [{ sel: { id: 'ga100-die' }, label: '8 GPCs · split L2' }],
    flows: [],
  },
  {
    title: 'HBM: five of six',
    text: 'Six HBM sites flank the die, three on each side. A100 uses five: 40 GB of HBM2 at 1.55 TB/s, or 80 GB of HBM2e at just over 2 TB/s. The sixth site is not enabled.',
    display: { lids: false, floorplan: true }, dir: [0.35, 1.0, 0.6], zoom: 0.85,
    tags: [{ sel: { id: 'a100-hbm-off' }, label: 'Not enabled' }],
    flows: [{ from: { id: 'ga100-die' }, to: { id: 'a100-hbm' }, bus: 'hbm', label: '5 stacks · 5120-bit' }],
  },
  {
    title: 'CoWoS-S',
    text: 'The die and the stacks sit side by side on one passive silicon interposer (TSMC CoWoS-S). Its fine wiring makes the thousands of short memory connections that a normal substrate cannot. A gold stiffener ring keeps the large package flat.',
    display: { lids: false, floorplan: false, explode: 0.5 }, dir: [0.7, 0.55, 0.8], zoom: 0.7,
    tags: [{ sel: { id: 'a100-interposer' }, label: 'Silicon interposer' }],
    flows: [],
  },
  {
    title: 'Power',
    text: 'Power comes up through the mezzanine connectors. The regulators on both sides and both ends step it down to under 1 V for the GPU core, plus the HBM and I/O rails. An A100 SXM4 can draw 400 W.',
    display: { lids: true, floorplan: false }, dir: [-0.5, 0.8, 0.8], zoom: 0.95,
    flows: [
      { from: BOARD_POWER, to: { id: 'sxm4-mezz' }, bus: 'power', label: 'Power in' },
      { from: { id: 'vrm-inductor' }, to: { id: 'a100-gpu' }, bus: 'power', label: 'Core rail' },
    ],
  },
  {
    title: 'MIG and sparsity',
    text: 'Multi-Instance GPU splits one A100 into up to seven isolated GPUs, each with its own SMs, L2 slice and memory. That lets several jobs share a GPU safely. Third-gen tensor cores also skip zeros in 2:4 sparse weights, doubling peak math to 624 TFLOPS FP16.',
    display: { lids: false, floorplan: true }, dir: [0.15, 1.0, 0.35], zoom: 0.85,
    tags: [{ sel: { id: 'ga100-die' }, label: 'Up to 7 MIG instances' }],
    flows: [],
  },
  {
    title: 'NVLink 3 and PCIe Gen4',
    text: 'All 12 NVLink 3 links leave through the mezzanine connectors, 50 GB/s each and 600 GB/s in total. On HGX A100 they run to six NVSwitches. A PCIe Gen4 x16 link goes to the host.',
    display: { lids: true, floorplan: false }, dir: [0.6, 0.35, 1.0], zoom: 1.0, frame: 'all',
    flows: [
      { from: { id: 'a100-gpu' }, to: { id: 'sxm4-mezz' }, bus: 'nvlink', label: '12 × NVLink 3' },
      { from: { id: 'sxm4-mezz' }, to: BASEBOARD, bus: 'pcie', label: 'PCIe Gen4 x16' },
    ],
  },
];

const HOST = { virtual: [-100, 40, -420], label: 'DGX A100 host · 2× AMD EPYC 7742, PCIe Gen4 switches' };
const NET = { virtual: [140, 40, -420], label: 'ConnectX-6 · 200 Gb/s InfiniBand per GPU' };
const AIR = { virtual: [0, 60, 420], label: 'Cold aisle air' };
const POWER = { virtual: [0, 30, -420], label: 'Chassis power supplies' };
const GPU0 = { id: 'a100-gpu', side: -1, nth: 2 };

export const HGX_A100_STEPS = [
  {
    title: 'HGX A100 8-GPU',
    text: 'This board carries eight A100 modules and six NVSwitch chips. It has no CPU of its own. In DGX A100, NVIDIA\'s own system, it sits above a host board with two AMD EPYC CPUs.',
    display: { cooling: true, lids: false }, dir: [-0.55, 0.75, 0.85], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'a100-heatsink' }, label: '8× A100 under heatsinks' },
      { sel: { id: 'a100-switch-heatsink' }, label: '6× NVSwitch' },
      { sel: { id: 'a100-host-conn' }, label: 'Host connectors' },
    ],
    flows: [],
  },
  {
    title: 'Air cooling',
    text: 'Fans at the front push air through the GPU fin stacks first, then through the NVSwitch heatsinks behind them. Each GPU can dissipate 400 W, so the eight together shed over 3 kW.',
    display: { cooling: true }, dir: [0.45, 0.6, 0.9], zoom: 1.0,
    flows: [
      { from: AIR, to: { id: 'fans' }, bus: 'cool', label: 'Intake' },
      { from: { id: 'fans' }, to: { id: 'a100-heatsink' }, bus: 'cool', label: 'GPU heatsinks' },
      { from: { id: 'a100-heatsink' }, to: { id: 'a100-switch-heatsink' }, bus: 'cool', pair: 'nearest', label: 'Then the switches' },
    ],
  },
  {
    title: 'Six NVSwitches',
    text: 'With the heatsinks off you can see the layout: GPUs in two rows of four, and one row of six NVSwitches behind them. Each A100 sends 2 of its 12 NVLink 3 links to every switch.',
    display: { cooling: false, lids: false }, dir: [0.15, 1.0, 0.5], zoom: 1.05,
    tags: [{ sel: { id: 'a100-nvswitch' }, label: 'NVSwitch gen 2' }],
    flows: [{ from: GPU0, to: { id: 'a100-nvswitch' }, bus: 'nvlink', label: '2 links to each switch' }],
  },
  {
    title: 'All-to-all at 600 GB/s',
    text: 'Because every GPU reaches every switch, any pair of GPUs talks at the full 600 GB/s, ten times PCIe Gen4. The eight GPUs can work as one large accelerator. Two boards can be joined back-to-back through the switches for 16 GPUs.',
    display: { cooling: false, lids: false }, dir: [0.1, 1.0, 0.35], zoom: 1.1,
    flows: [{ from: { id: 'a100-gpu' }, to: { id: 'a100-nvswitch' }, bus: 'nvlink', label: 'NVLink 3' }],
  },
  {
    title: 'Power-on',
    text: 'Power enters at the rear connectors and spreads through the baseboard to every module, where each A100 regulates its own rails. A management FPGA sequences power and brings up the NVSwitches.',
    display: { cooling: false }, dir: [0.25, 0.9, -0.6], zoom: 1.0,
    flows: [
      { from: POWER, to: { id: 'a100-pwr-conn' }, bus: 'power', label: 'Power in' },
      { from: { id: 'a100-pwr-conn' }, to: { id: 'a100-gpu' }, bus: 'power', label: 'Every module' },
      { from: { id: 'hgx-a100-fpga' }, to: { id: 'a100-nvswitch' }, bus: 'mgmt', label: 'Bring-up' },
    ],
  },
  {
    title: 'The DGX A100 host',
    text: 'The rear connectors carry PCIe Gen4 to the host. In DGX A100, four PCIe switches each serve two GPUs and their ConnectX-6 cards. Eight 200 Gb/s ports link GPUs to other servers, and a ninth card handles storage.',
    display: { cooling: false }, dir: [0.3, 0.8, -1.0], zoom: 1.0,
    flows: [
      { from: HOST, to: { id: 'a100-host-conn' }, bus: 'pcie', label: 'PCIe Gen4' },
      { from: { id: 'a100-host-conn' }, to: { id: 'a100-gpu' }, bus: 'pcie', label: 'Every GPU' },
      { from: NET, to: HOST, bus: 'net', label: 'Scale-out' },
    ],
  },
  {
    title: 'Memory on every GPU',
    text: 'Each A100 has five active HBM stacks beside its die: up to 80 GB at 2 TB/s. Across the board that is 640 GB of GPU memory. With MIG, the board can also run up to 56 isolated GPU instances.',
    display: { cooling: false, lids: false }, dir: [0.35, 1.0, 0.45], zoom: 2.6,
    flows: [{ from: { id: 'ga100-die', within: GPU0 }, to: { id: 'a100-hbm', within: GPU0 }, bus: 'hbm', label: '5 × HBM2e' }],
  },
];
