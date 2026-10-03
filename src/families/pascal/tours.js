// Guided tour of the Tesla P100 SXM module. Step and selector reference: src/tour/steps.js

const PEERS = { virtual: [0, 6, -150], label: 'Peer GPUs or a POWER8 CPU · 4 NVLink 1 links' };
const HOST = { virtual: [0, 6, 150], label: 'Host CPU · PCIe Gen3 x16' };
const PSU = { virtual: [70, 0, 110], label: '12 V from the server' };

export const P100_STEPS = [
  {
    title: 'Tesla P100: the first SXM',
    text: 'In 2016 NVIDIA moved its top GPU off the PCIe card. This module plugs flat onto a baseboard through two mezzanine connectors, which lets it carry NVLink and draw 300 W. V100 kept the same form factor.',
    display: { explode: 0 }, dir: [0.55, 0.75, 0.8], zoom: 1.0, frame: 'all',
    tags: [
      { sel: { id: 'p100-gpu' }, label: 'GP100 + 4× HBM2' },
      { sel: { id: 'vrm-inductor' }, label: 'Core regulator' },
      { sel: { id: 'p100-frame' }, label: 'Frame (no lid)' },
    ],
    flows: [],
  },
  {
    title: 'GP100',
    text: 'The die is 610 mm² with 15.3 billion transistors, on TSMC\'s 16 nm FinFET process. Six GPCs hold 60 SMs and P100 enables 56. It has no Tensor Cores yet, but FP16 runs at twice the FP32 rate.',
    display: { floorplan: true, explode: 0 }, dir: [0.15, 1, 0.35], zoom: 0.9,
    tags: [{ sel: { id: 'p100-die' }, label: '6 GPCs · 56 of 60 SMs' }],
    flows: [],
  },
  {
    title: 'The first HBM2 GPU',
    text: 'Four HBM2 stacks sit next to the die on a CoWoS silicon interposer: 16 GB at 732 GB/s, about two and a half times the GDDR5 cards of the time.',
    display: { floorplan: false, explode: 0.35 }, dir: [0.4, 0.9, 0.6], zoom: 0.9,
    flows: [{ from: { id: 'p100-die' }, to: { id: 'hbm2' }, bus: 'hbm', label: '4× HBM2 · 732 GB/s' }],
  },
  {
    title: 'No lid',
    text: 'The die and HBM2 stacks are bare. The heatsink presses straight onto them, and a thin metal frame around the package sets its height.',
    display: { explode: 0.6 }, dir: [0.6, 0.6, 0.7], zoom: 1.0, frame: 'all',
    tags: [
      { sel: { id: 'p100-frame' }, label: 'Frame' },
      { sel: { id: 'p100-die' }, label: 'Bare die' },
    ],
    flows: [],
  },
  {
    title: 'Power in',
    text: 'One mezzanine connector brings 12 V in. The chokes and power stages step it down to about 1 V for the GPU, up to 300 W.',
    display: { explode: 0 }, dir: [0.5, 0.8, 0.6], zoom: 1.0,
    flows: [
      { from: PSU, to: { id: 'p100-mezz-pwr' }, bus: 'power', label: '12 V' },
      { from: { id: 'p100-mezz-pwr' }, to: { id: 'vrm-inductor' }, bus: 'power' },
      { from: { id: 'vrm-inductor' }, to: { id: 'p100-gpu' }, bus: 'power', label: '~1 V core' },
    ],
  },
  {
    title: 'NVLink 1',
    text: 'The other connector carries four NVLink 1 links, each 20 GB/s in each direction, 160 GB/s in total. The original DGX-1 wired eight P100s in a hybrid cube-mesh. IBM\'s POWER8 servers used NVLink to connect the CPU itself.',
    display: { explode: 0.25 }, dir: [0.5, 0.45, -0.9], zoom: 1.1,
    flows: [
      { from: { id: 'p100-gpu' }, to: { id: 'p100-mezz-nvl' }, bus: 'nvlink', label: '4 links' },
      { from: { id: 'p100-mezz-nvl' }, to: PEERS, bus: 'nvlink' },
    ],
  },
  {
    title: 'PCIe to the host',
    text: 'On x86 servers the CPU still talks to the GPU over PCIe Gen3 x16, about 16 GB/s each way. NVLink carries the GPU-to-GPU traffic.',
    display: { explode: 0.25 }, dir: [0.5, 0.45, 0.9], zoom: 1.1,
    flows: [
      { from: HOST, to: { id: 'p100-mezz-pwr' }, bus: 'pcie', label: 'PCIe Gen3 x16' },
      { from: { id: 'p100-mezz-pwr' }, to: { id: 'p100-gpu' }, bus: 'pcie' },
    ],
  },
];
