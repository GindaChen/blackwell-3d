// Guided tours for the Volta views. Step and selector reference: src/tour/steps.js
import { LINKS, RINGS, PCIE } from './topology.js';

// ---------------------------------------------------------------------------------------------- v100
const PEERS = { virtual: [0, 6, -150], label: 'Peer GPUs on the baseboard · 6 NVLink 2 links' };
const HOST = { virtual: [0, 6, 150], label: 'Host CPU · PCIe Gen3 x16' };
const PSU = { virtual: [70, 0, 110], label: '12 V from the server' };

export const V100_STEPS = [
  {
    title: 'Tesla V100 SXM2',
    text: 'This is the module NVIDIA built Volta around. It has no slot connector: two mezzanine connectors underneath plug it flat onto a server baseboard. It is about 14 × 8 cm and draws up to 300 W.',
    display: { explode: 0 }, dir: [0.55, 0.75, 0.8], zoom: 1.0, frame: 'all',
    tags: [
      { sel: { id: 'v100-gpu' }, label: 'GV100 + 4× HBM2' },
      { sel: { id: 'vrm-inductor' }, label: 'Core regulator' },
      { sel: { id: 'v100-frame' }, label: 'Frame (no lid)' },
    ],
    flows: [],
  },
  {
    title: 'GV100: 21 billion transistors',
    text: 'The die is 815 mm², about as large as a chip can be printed. Six GPCs hold 84 SMs. V100 enables 80 of them, so dies with a few flaws can still ship. Each SM adds 8 Tensor Cores, new in Volta, for 125 TFLOPS of FP16 matrix math.',
    display: { floorplan: true, explode: 0 }, dir: [0.15, 1, 0.35], zoom: 0.9,
    tags: [{ sel: { id: 'v100-die' }, label: '6 GPCs · 80 of 84 SMs · 640 Tensor Cores' }],
    flows: [],
  },
  {
    title: 'HBM2 on a silicon interposer',
    text: 'Four HBM2 stacks sit next to the die on a CoWoS silicon interposer. Each stack has a 1,024-bit interface. Together they give 16 GB, or 32 GB on later models, at 900 GB/s.',
    display: { floorplan: false, explode: 0.35 }, dir: [0.4, 0.9, 0.6], zoom: 0.9,
    flows: [{ from: { id: 'v100-die' }, to: { id: 'hbm2' }, bus: 'hbm', label: '4× HBM2 · 900 GB/s' }],
  },
  {
    title: 'No lid',
    text: 'There is no heat spreader. The die and HBM2 stacks are bare, and the heatsink presses straight onto them through thermal paste. A thin metal frame around the package sets the heatsink height.',
    display: { explode: 0.6 }, dir: [0.6, 0.6, 0.7], zoom: 1.0, frame: 'all',
    tags: [
      { sel: { id: 'v100-frame' }, label: 'Frame' },
      { sel: { id: 'v100-die' }, label: 'Bare die' },
    ],
    flows: [],
  },
  {
    title: 'Power in',
    text: 'One mezzanine connector brings 12 V in. The chokes and power stages around the package step it down to about 1 V at up to 300 W.',
    display: { explode: 0 }, dir: [0.5, 0.8, 0.6], zoom: 1.0,
    flows: [
      { from: PSU, to: { id: 'v100-mezz-pwr' }, bus: 'power', label: '12 V' },
      { from: { id: 'v100-mezz-pwr' }, to: { id: 'vrm-inductor' }, bus: 'power' },
      { from: { id: 'vrm-inductor' }, to: { id: 'v100-gpu' }, bus: 'power', label: '~1 V core' },
    ],
  },
  {
    title: 'NVLink 2',
    text: 'The other connector carries six NVLink 2 links, each 25 GB/s in each direction: 300 GB/s in total, nearly ten times PCIe Gen3 x16. The baseboard routes them straight to other GPUs.',
    display: { explode: 0.25 }, dir: [0.5, 0.45, -0.9], zoom: 1.1,
    flows: [
      { from: { id: 'v100-gpu' }, to: { id: 'v100-mezz-nvl' }, bus: 'nvlink', label: '6 links' },
      { from: { id: 'v100-mezz-nvl' }, to: PEERS, bus: 'nvlink' },
    ],
  },
  {
    title: 'PCIe to the host',
    text: 'The same connector as the power carries PCIe Gen3 x16 to the host. The CPU sends work and data this way, about 16 GB/s each way. GPU-to-GPU traffic uses NVLink instead.',
    display: { explode: 0.25 }, dir: [0.5, 0.45, 0.9], zoom: 1.1,
    flows: [
      { from: HOST, to: { id: 'v100-mezz-pwr' }, bus: 'pcie', label: 'PCIe Gen3 x16' },
      { from: { id: 'v100-mezz-pwr' }, to: { id: 'v100-gpu' }, bus: 'pcie' },
    ],
  },
];

// ---------------------------------------------------------------------------------------------- dgx1
const G = (i) => ({ id: `dgx-gpu-${i}` });
const CPU = [
  { virtual: [-120, 40, -420], label: 'CPU0 · Xeon E5-2698 v4' },
  { virtual: [120, 40, -420], label: 'CPU1 · Xeon E5-2698 v4' },
];
const IB = { virtual: [0, 60, -470], label: '4× EDR InfiniBand · 100 Gb/s each' };
const AIR = { virtual: [0, 50, 420], label: 'Cold aisle air' };
const inQuad = (a, b) => (a < 4) === (b < 4);
const flow = ([a, b, n]) => ({ from: G(a), to: G(b), bus: 'nvlink' });

export const DGX1_STEPS = [
  {
    title: 'DGX-1 with V100',
    text: 'This tray holds eight V100 SXM2 modules on one baseboard. DGX-1 is a 3U, 3.5 kW server. Two Xeon CPUs, 512 GB of memory and four InfiniBand cards sit in the system board behind this tray.',
    display: { cooling: true }, dir: [-0.55, 0.75, 0.85], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'gpu-heatsink' }, label: '8× V100 under heatsinks' },
      { sel: { id: 'dgx-plx-0' }, label: '4× PCIe switches' },
      { sel: { id: 'fans' }, label: 'Fans' },
    ],
    flows: [],
  },
  {
    title: 'Air cooled',
    text: 'Air enters through the front, crosses the fans, then passes through both rows of heatsinks. Each GPU makes up to 300 W of heat, 2.4 kW for all eight.',
    display: { cooling: true }, dir: [0.45, 0.6, 0.9], zoom: 1.0,
    flows: [
      { from: AIR, to: { id: 'fans' }, bus: 'cool', label: 'Intake' },
      { from: { id: 'fans' }, to: { id: 'gpu-heatsink' }, bus: 'cool', label: 'Through the fin stacks' },
    ],
  },
  {
    title: 'No NVLink switch',
    text: 'Each V100 has six NVLink 2 links and nothing to switch them, so the board wires GPUs straight to each other. GPUs 0 to 3 form one fully connected quad, and GPUs 4 to 7 form another.',
    display: { cooling: false }, dir: [0.1, 1, 0.45], zoom: 0.75, frame: 'all',
    flows: LINKS.filter(([a, b]) => inQuad(a, b)).map(flow),
  },
  {
    title: 'The hybrid cube-mesh',
    text: 'Four more links join the two quads: 0 to 4, 1 to 5, 2 to 6 and 3 to 7. Picture a cube with a GPU at each corner, every edge wired, and diagonals across two faces. Each GPU reaches four peers directly and the other three in two hops.',
    display: { cooling: false }, dir: [0.1, 1, 0.45], zoom: 0.75, frame: 'all',
    flows: LINKS.filter(([a, b]) => !inQuad(a, b)).map(flow),
  },
  {
    title: 'Double links',
    text: 'Six links over four peers means some peers get two. Each GPU has two doubled links (100 GB/s) and two single links (50 GB/s). That is 24 links in total, spread over 16 GPU pairs.',
    display: { cooling: false }, dir: [0.1, 1, 0.45], zoom: 0.75, frame: 'all',
    flows: LINKS.filter(([, , n]) => n === 2).map((l) => ({ ...flow(l), label: 'NV2' })),
  },
  {
    title: 'Rings for all-reduce',
    text: 'In training, all eight GPUs add up their gradients every step. NCCL sends data around rings. The 24 links form three rings that each pass through all eight GPUs, so all three can run at once. This is the first ring.',
    display: { cooling: false }, dir: [0.1, 1, 0.45], zoom: 0.75, frame: 'all',
    flows: RINGS[0].map((a, k) => ({ from: G(a), to: G(RINGS[0][(k + 1) % 8]), bus: 'nvlink', label: k ? undefined : 'Ring 1 of 3' })),
  },
  {
    title: 'PCIe to the CPUs',
    text: 'NVLink only joins GPUs. Each pair of GPUs shares a PCIe Gen3 switch, and two switches hang off each CPU. Each switch also has one InfiniBand card, so GPUs can send data to other servers without going through CPU memory.',
    display: { cooling: false }, dir: [0.25, 0.85, -1.0], zoom: 1.05,
    flows: [
      ...PCIE.map((p, k) => ({ from: CPU[p.cpu], to: { id: `dgx-plx-${k}` }, bus: 'pcie', label: k % 2 ? undefined : `CPU${p.cpu}` })),
      ...PCIE.flatMap((p, k) => p.gpus.map((g) => ({ from: { id: `dgx-plx-${k}` }, to: G(g), bus: 'pcie' }))),
      { from: { id: 'host-conn' }, to: IB, bus: 'net', label: 'InfiniBand, 1 card per GPU pair' },
    ],
  },
  {
    title: 'GPU memory',
    text: 'Each V100 has four HBM2 stacks. Across the tray that is 128 GB of GPU memory and 7.2 TB/s of combined bandwidth. Training a model that needs more than 16 GB means splitting it over GPUs, and the cube-mesh carries that traffic.',
    display: { cooling: false }, dir: [0.35, 1.0, 0.45], zoom: 2.4,
    flows: [{ from: G(1), to: { id: 'hbm2', within: G(1) }, bus: 'hbm', label: '4× HBM2 · 900 GB/s' }],
  },
];
