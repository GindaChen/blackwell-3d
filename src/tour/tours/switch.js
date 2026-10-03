// Guided tour of the NVLink switch tray: how 18 switch chips make 72 GPUs act as one.
// Step and selector reference: ../steps.js

const SPINE = { virtual: [0, 70, -540], label: 'NVLink spine → 18 compute trays · 72 GPUs' };
const MGMT = { virtual: [-120, 60, 520], label: 'Rack management network' };
const BUSBAR = { virtual: [80, 40, -520], label: 'Rack DC busbar' };
const COOLANT = { virtual: [-170, 60, -530], label: 'Rack coolant manifold' };

export const SWITCH_STEPS = [
  {
    title: 'The NVLink switch tray',
    text: 'Nine of these 1U trays sit in the middle of an NVL72 rack. Each holds two NVLink 5 switch chips. Together the 18 chips connect every one of the 72 GPUs to every other at full speed.',
    display: { cooling: true }, dir: [-0.55, 0.75, 0.85], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'switch-coldplate' }, label: '2× NVLink switch chips (under cold plates)' },
      { sel: { id: 'switch-nvlink-conn' }, label: 'Spine connectors' },
      { sel: { id: 'switch-mgmt' }, label: 'Management' },
    ],
    flows: [],
  },
  {
    title: 'The switch chips',
    text: 'Each chip has 72 NVLink 5 ports at 100 GB/s, 7.2 TB/s per chip. Every B200 has 18 NVLink links and sends one to each of the 18 switch chips. That makes the rack one non-blocking, single-hop NVLink domain.',
    display: { cooling: false }, dir: [0.2, 1.0, 0.5], zoom: 1.4,
    tags: [{ sel: { id: 'nvswitch' }, label: '72 ports · 7.2 TB/s' }],
    flows: [],
  },
  {
    title: 'Out to the spine',
    text: 'The switch board routes all 144 ports from the two chips to four rear connectors. These mate with the rack\'s copper cable cartridges, the same cartridges every compute tray plugs into. Copper over this short distance needs no optics or retimers.',
    display: { cooling: false }, dir: [-0.3, 0.9, -0.6], zoom: 1.0,
    flows: [
      { from: { id: 'nvswitch' }, to: { id: 'switch-nvlink-conn' }, bus: 'nvlink', label: '144 NVLink ports' },
      { from: { id: 'switch-nvlink-conn' }, to: SPINE, bus: 'nvlink', label: 'Spine' },
    ],
  },
  {
    title: 'In-network computing',
    text: 'The switch chips can also do math. With SHARP, they sum the partial results of an all-reduce inside the network, so each GPU sends its data once instead of many times. That roughly halves the traffic for this common collective.',
    display: { cooling: false }, dir: [0.25, 1.0, 0.4], zoom: 1.3,
    flows: [
      { from: SPINE, to: { id: 'nvswitch' }, bus: 'nvlink', label: 'Partial sums in' },
      { from: { id: 'nvswitch' }, to: SPINE, bus: 'nvlink', label: 'Reduced result out' },
    ],
  },
  {
    title: 'Management, power and cooling',
    text: 'A small management CPU runs NVOS, and the NVLink fabric manager uses it to program routing across all 18 chips. Power comes from the busbar. The switch chips are liquid-cooled through the same rear quick-disconnects as the compute trays.',
    display: { cooling: true }, dir: [0.4, 0.8, 0.8], zoom: 1.0,
    flows: [
      { from: MGMT, to: { id: 'switch-mgmt' }, bus: 'mgmt', label: 'Fabric manager' },
      { from: { id: 'switch-mgmt' }, to: { id: 'nvswitch' }, bus: 'mgmt' },
      { from: BUSBAR, to: { id: 'busbar' }, bus: 'power', label: 'Power in' },
      { from: COOLANT, to: { id: 'uqd' }, bus: 'cool', label: 'Coolant' },
    ],
  },
];
