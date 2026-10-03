// Guided tour for the Tesla K80. Step and selector reference: src/tour/steps.js.
// Virtual points are card millimetres (card.js): x = -133.5 bracket .. +133.5 power end, y up from
// the bottom of the edge fingers, +z = component side.

const AIR_IN = { virtual: [190, 60, 20], label: 'Server fans push air in' };
const AIR_OUT = { virtual: [-190, 60, 20], label: 'Hot air out the bracket' };
const PSU = { virtual: [190, 90, 8], label: 'Server PSU, 12 V' };
const GPU0 = { id: 'gpu-package', nth: 0 };
const GPU1 = { id: 'gpu-package', nth: 1 };

export const K80_STEPS = [
  {
    title: 'Tesla K80',
    text: 'NVIDIA\'s 2014 server card: two GPUs and 24 GB of GDDR5 on one dual-slot PCIe board, 300 W. For years it was the GPU you rented in the cloud. This tour takes it apart.',
    display: { shell: true, cooling: true, floorplan: false, explode: 0 }, dir: [0.45, 0.35, 0.85], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'shroud' }, label: 'Full-length shroud' },
      { sel: { id: 'eps-conn' }, label: '8-pin power' },
      { sel: { id: 'bracket' }, label: 'Vented bracket' },
    ],
    flows: [],
  },
  {
    title: 'No fan',
    text: 'The K80 is passive. The shroud is only a duct: the server\'s own fans push air in at the far end, through the fins along the whole card, and out through the bracket vents. In a desktop it overheats within minutes.',
    display: { shell: false, cooling: true, explode: 0.25 }, dir: [0.35, 0.55, 0.8], zoom: 1.0, frame: 'all',
    tags: [{ sel: { id: 'heatsink' }, label: 'Fins + heat pipes' }],
    flows: [
      { from: AIR_IN, to: { id: 'heatsink' }, bus: 'air' },
      { from: { id: 'heatsink' }, to: AIR_OUT, bus: 'air', label: 'Front to back' },
    ],
  },
  {
    title: 'Two GPUs on one card',
    text: 'Under the heatsink sit two GK210 GPUs, each with 2496 CUDA cores and its own 12 GB. The operating system sees two separate GPUs. Each one is capped at 150 W.',
    display: { shell: false, cooling: false, explode: 0 }, dir: [0.2, 0.3, 1.0], zoom: 0.9, frame: 'all',
    tags: [
      { sel: GPU0, label: 'GPU 0 · GK210' },
      { sel: GPU1, label: 'GPU 1 · GK210' },
    ],
    flows: [],
  },
  {
    title: 'One slot, shared',
    text: 'A PLX PCIe switch between the GPUs splits the slot\'s 16 PCIe Gen3 lanes: x16 up to the host and x16 to each GPU. Copies between the two GPUs go through the switch and never touch the host.',
    display: { shell: false, cooling: false, explode: 0 }, dir: [0.1, 0.2, 1.0], zoom: 1.3,
    tags: [{ sel: { id: 'plx-switch' }, label: 'PLX switch' }],
    flows: [
      { from: { id: 'pcie-fingers' }, to: { id: 'plx-switch' }, bus: 'pcie', label: 'x16 · ~16 GB/s' },
      { from: { id: 'plx-switch' }, to: { id: 'gpu-package' }, bus: 'pcie', label: 'x16 each' },
    ],
  },
  {
    title: 'Memory on both sides',
    text: 'Each GPU has a 384-bit bus to 24 GDDR5 chips: 12 around it on the front and 12 directly behind on the back. Two chips share each channel ("clamshell"), which doubles capacity rather than speed. That gives 240 GB/s per GPU.',
    display: { shell: false, cooling: false, explode: 0.45 }, dir: [0.45, 0.3, -0.85], zoom: 1.0, frame: 'all',
    tags: [{ sel: { id: 'gddr5' }, label: '48 × GDDR5' }],
    flows: [{ from: { id: 'gddr5' }, to: { id: 'gpu-package' }, pair: 'nearest', bus: 'gddr5' }],
  },
  {
    title: 'Power',
    text: '12 V arrives on an EPS 8-pin, the CPU-style connector, rather than PCIe plugs. Each GPU has its own multiphase regulator that steps 12 V down to about 1 V. GPU Boost raises the clock from 560 to 875 MHz while the card stays under 300 W.',
    display: { shell: false, cooling: false, explode: 0 }, dir: [0.5, 0.35, 0.8], zoom: 1.0,
    flows: [
      { from: PSU, to: { id: 'eps-conn' }, bus: 'power' },
      { from: { id: 'eps-conn' }, to: { id: 'vrm-inductor' }, pair: 3, bus: 'power', label: '12 V' },
      { from: { id: 'vrm-inductor' }, to: { id: 'gpu-package' }, pair: 'nearest', bus: 'power', label: '~1 V core' },
    ],
  },
  {
    title: 'Inside GK210',
    text: 'GK210 is a GK110 with twice the register file and shared memory per SMX. It has 15 SMX of 192 cores, and the K80 enables 13 of them. Which two are fused off varies from chip to chip. Each SMX has 64 FP64 units, so the card reaches 2.9 TFLOPS of FP64.',
    display: { shell: false, cooling: false, floorplan: true, explode: 0 }, dir: [0.15, 0.25, 1.0], zoom: 2.2,
    tags: [{ sel: { id: 'gpu-die', nth: 0 }, label: '15 SMX · 13 enabled' }],
    flows: [],
  },
];
