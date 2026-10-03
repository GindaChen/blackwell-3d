// Guided tour for the Tesla M40. Step and selector reference: src/tour/steps.js.
// Virtual points are card millimetres (../kepler/card.js): x = -133.5 bracket .. +133.5 power end,
// y up from the bottom of the edge fingers, +z = component side.

const AIR_IN = { virtual: [190, 60, 20], label: 'Server fans push air in' };
const AIR_OUT = { virtual: [-190, 60, 20], label: 'Hot air out the bracket' };
const PSU = { virtual: [190, 90, 8], label: 'Server PSU, 12 V' };

export const M40_STEPS = [
  {
    title: 'Tesla M40',
    text: 'NVIDIA\'s 2015 server card and the first it sold for training neural networks. It has one large Maxwell GPU and 12 GB of GDDR5 (24 GB from 2016) on a passive dual-slot PCIe card, 250 W.',
    display: { shell: true, cooling: true, floorplan: false, explode: 0 }, dir: [-0.45, 0.35, 0.85], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'shroud' }, label: 'Shroud (duct only)' },
      { sel: { id: 'eps-conn' }, label: '8-pin power' },
    ],
    flows: [],
  },
  {
    title: 'Cooled by the server',
    text: 'Like the K80, the M40 has no fan. Heat pipes spread the GPU\'s heat into fins along the whole card, and the server\'s fans push air through them and out of the bracket.',
    display: { shell: false, cooling: true, explode: 0.25 }, dir: [-0.35, 0.55, 0.8], zoom: 1.0, frame: 'all',
    tags: [{ sel: { id: 'heatsink' }, label: 'Fins + heat pipes' }],
    flows: [
      { from: AIR_IN, to: { id: 'heatsink' }, bus: 'air' },
      { from: { id: 'heatsink' }, to: AIR_OUT, bus: 'air', label: 'Front to back' },
    ],
  },
  {
    title: 'One big GPU',
    text: 'Instead of two GPUs and a PCIe switch, the M40 has one GM200: 601 mm² of silicon, 8 billion transistors and 3072 CUDA cores. Its 16 PCIe Gen3 lanes go straight from the slot to the GPU.',
    display: { shell: false, cooling: false, explode: 0 }, dir: [-0.15, 0.3, 1.0], zoom: 1.0, frame: 'all',
    tags: [{ sel: { id: 'gpu-package' }, label: 'GM200' }],
    flows: [{ from: { id: 'pcie-fingers' }, to: { id: 'gpu-package' }, bus: 'pcie', label: 'x16 · ~16 GB/s' }],
  },
  {
    title: 'Memory on both sides',
    text: '24 GDDR5 chips, 12 on the front and 12 directly behind them, share a 384-bit bus at 6 Gb/s, giving 288 GB/s. Moving from 4 Gb to 8 Gb chips doubled the card to 24 GB without changing the layout.',
    display: { shell: false, cooling: false, explode: 0.45 }, dir: [-0.45, 0.3, -0.85], zoom: 1.0, frame: 'all',
    tags: [{ sel: { id: 'gddr5' }, label: '24 × GDDR5' }],
    flows: [{ from: { id: 'gddr5' }, to: { id: 'gpu-package' }, bus: 'gddr5' }],
  },
  {
    title: 'Power',
    text: '12 V comes in on an EPS 8-pin at the far end, as on the K80. A multiphase regulator steps it down to about 1 V. A two-pin "power brake" header lets the server force the card to minimum clocks.',
    display: { shell: false, cooling: false, explode: 0 }, dir: [0.4, 0.35, 0.85], zoom: 1.0,
    tags: [{ sel: { id: 'brake-header' }, label: 'Power brake' }],
    flows: [
      { from: PSU, to: { id: 'eps-conn' }, bus: 'power' },
      { from: { id: 'eps-conn' }, to: { id: 'vrm-inductor' }, pair: 3, bus: 'power', label: '12 V' },
      { from: { id: 'vrm-inductor' }, to: { id: 'gpu-package' }, bus: 'power', label: '~1 V core' },
    ],
  },
  {
    title: 'Inside GM200',
    text: 'GM200 has 6 GPCs of 4 SMMs. Each Maxwell SMM splits its 128 cores into four blocks of 32, each with its own scheduler, which kept more of them busy than Kepler\'s 192-core SMX. Almost all FP64 hardware was dropped, so FP64 runs at 1/32 rate. That made it a deep-learning card rather than an HPC card.',
    display: { shell: false, cooling: false, floorplan: true, explode: 0 }, dir: [-0.15, 0.25, 1.0], zoom: 2.2,
    tags: [{ sel: { id: 'gpu-die' }, label: '24 SMM · 3072 cores' }],
    flows: [],
  },
];
