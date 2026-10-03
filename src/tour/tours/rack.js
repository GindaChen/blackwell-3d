// Guided tour of the GB200 NVL72 rack: 72 GPUs that behave as one, and what it takes to feed them.
// Step and selector reference: ../steps.js. Virtual points are in rack millimetres with the rack
// centred on the origin (y = 0 is half-way up; front is +z).

const FACILITY = { virtual: [520, 620, 200], label: 'Facility AC power' };
const CDU = { virtual: [0, -960, -820], label: 'Coolant distribution unit (CDU)' };
const OTHER_RACKS = { virtual: [-560, 180, 380], label: 'Other NVL72 racks · InfiniBand / Spectrum-X' };

const GPU0 = { id: 'b200-gpu', nth: 0 };

export const RACK_STEPS = [
  {
    title: 'GB200 NVL72',
    text: 'One rack, 72 B200 GPUs and 36 Grace CPUs, wired so that every GPU can reach every other at full NVLink speed. NVIDIA rates it at about 1.4 exaflops of FP4 inference with 13.4 TB of HBM3e. This tour walks through how it is powered, cooled and connected.',
    display: { cooling: true, lids: false, explode: 0 }, dir: [0.55, 0.3, 0.9], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'compute-tray' }, label: '18× compute trays' },
      { sel: { id: 'switch-tray' }, label: '9× NVLink switch trays' },
      { sel: { id: 'power-shelf' }, label: '8× power shelves' },
    ],
    flows: [],
  },
  {
    title: 'Power: about 120 kW',
    text: 'Eight 1U power shelves, each with six 5.5 kW supplies, convert facility AC to 48-54 V DC with N+N redundancy. A vertical copper busbar at the rear carries it to every tray, and each tray clips on as it slides in. That is roughly ten times a typical air-cooled server rack.',
    display: { explode: 0 }, dir: [0.65, 0.35, -0.7], zoom: 0.95,
    flows: [
      { from: FACILITY, to: { id: 'power-shelf' }, bus: 'power', label: 'AC in' },
      { from: { id: 'power-shelf' }, to: { id: 'rack-busbar' }, bus: 'power', label: 'DC busbar' },
      { from: { id: 'rack-busbar' }, to: { id: 'switch-tray' }, bus: 'power' },
    ],
  },
  {
    title: 'Liquid cooling',
    text: 'Air cannot remove 120 kW from one rack. A coolant distribution unit pumps warm water up the blue supply manifold and through a quick-disconnect into every tray\'s cold plates. The water comes back hotter down the red return manifold.',
    display: { explode: 0 }, dir: [-0.6, 0.25, -0.8], zoom: 0.9,
    flows: [
      { from: CDU, to: { id: 'rack-manifold' }, bus: 'cool', label: 'Supply & return' },
      { from: { id: 'rack-manifold' }, to: { id: 'compute-tray' }, bus: 'cool', label: 'Every tray' },
    ],
  },
  {
    title: 'The NVLink spine',
    text: 'Four cable cartridges at the rear hold about 5,000 copper twinax cables, around two miles of copper. They connect all 18 compute trays to all 9 switch trays. Copper needs no optical transceivers, which saves about 20 kW of power and a lot of cost.',
    display: { explode: 0 }, dir: [0.4, 0.2, -0.95], zoom: 0.8,
    flows: [
      { from: { id: 'compute-tray' }, to: { id: 'nvlink-spine' }, pair: 'nearest', bus: 'nvlink' },
      { from: { id: 'nvlink-spine' }, to: { id: 'switch-tray' }, bus: 'nvlink', label: '9 switch trays' },
    ],
  },
  {
    title: 'Inside a compute tray',
    text: 'Pull out one tray and you find two GB200 superchips: 2 Grace CPUs and 4 B200 GPUs, each with its own ConnectX-7 network card. The 18 trays together make up the 72 GPUs.',
    display: { explode: 1, cooling: false }, dir: [0.45, 0.85, 0.75], zoom: 1.0,
    tags: [
      { sel: { id: 'b200-gpu' }, label: '4× B200' },
      { sel: { id: 'grace-cpu' }, label: '2× Grace' },
      { sel: { id: 'cx7' }, label: '4× ConnectX-7' },
    ],
    flows: [],
  },
  {
    title: 'One GPU, every switch',
    text: 'Each B200 sends its 18 NVLink 5 links through the rear connector and the spine, one link to each of the 18 switch chips (two per switch tray). Any GPU therefore reaches any other in a single switch hop at 1.8 TB/s, 130 TB/s across the rack.',
    display: { explode: 1, cooling: false }, dir: [0.75, 0.35, 0.6], zoom: 1.0,
    flows: [
      { from: GPU0, to: { id: 'nvswitch' }, via: [{ id: 'nvlink-conn' }, { id: 'nvlink-spine' }], bus: 'nvlink', label: 'NVLink switch chips' },
    ],
  },
  {
    title: 'Beyond one rack',
    text: 'NVLink stops at the rack. To scale further, each GPU\'s ConnectX-7 links it at 400 Gb/s to an InfiniBand or Spectrum-X fabric that joins many NVL72 racks into one cluster. BlueField-3 DPUs handle storage and user traffic.',
    display: { explode: 1, cooling: true }, dir: [-0.5, 0.45, 0.8], zoom: 1.0,
    flows: [
      { from: { id: 'cx7' }, to: OTHER_RACKS, bus: 'net', label: 'Scale-out' },
    ],
  },
  {
    title: 'The whole machine',
    text: 'For a large model, NVL72 behaves like one giant GPU: 72 B200s, 13.4 TB of HBM3e at 576 TB/s, 17 TB of Grace LPDDR5X, and 130 TB/s of NVLink, all in a single liquid-cooled rack weighing about 1.4 tonnes.',
    display: { explode: 0, cooling: true }, dir: [-0.5, 0.35, 0.9], zoom: 0.95, frame: 'all',
    flows: [],
  },
];
