// Guided tour: follow an AI model from storage to an answer through a Vera Rubin NVL72 compute tray.
//
// Step fields
//   title, text        : what the panel says (keep it short)
//   view               : which model to show ('tray' | 'superchip' | 'nvl8')
//   display            : { lids, cooling, floorplan } overrides for this step
//   dir                : camera direction (from the subject towards the camera), auto-framed
//   zoom               : >1 pulls the camera back, <1 pushes in
//   frame              : 'all' frames the whole model instead of just the parts involved
//   tags               : [{ sel, label }] neutral labels on parts worth naming
//   flows              : [{ from, to, via?, pair?, bus, label? }] directional data/power/coolant flows
//
// Selectors (sel / from / to / via entries)
//   { id }                     every visible part with that id
//   { id, side: -1|1 }         only parts on the left (-1) or right (+1) superchip half of the tray
//   { id, nth }                the nth match (sorted rear-to-front, then left-to-right)
//   { id, within: sel }        only parts inside the part matched by `within`
//   { virtual: [x,y,z], label } a point outside the tray (tray millimetres; +z = front, -z = rear)
//
// pair: how many `to` targets each `from` connects to: 'all' (default) | 'nearest' | n

const NET = { virtual: [-60, 60, 520], label: 'Data-centre network · Spectrum-X / Quantum-X' };
const STORAGE = { virtual: [150, 70, 515], label: 'Network storage · model weights' };
const SPINE = { virtual: [0, 70, -520], label: 'NVLink spine → 36 switch chips · 72 GPUs' };
const BUSBAR = { virtual: [80, 40, -500], label: 'Rack DC busbar' };
const COOLANT = { virtual: [-170, 60, -510], label: 'Rack coolant manifold · 45 °C water' };

const GPU0 = { id: 'rubin-gpu', side: -1, nth: 0 };
const CPU0 = { id: 'vera-cpu', side: -1 };
const MIDPLANES = [{ id: 'io-midplane' }, { id: 'midplane' }];

export const STEPS = [
  {
    title: 'Meet the compute tray',
    text: 'One of 18 trays in an NVL72 rack. It holds two Vera Rubin superchips (2 CPUs + 4 GPUs) plus the networking that connects them to the rest of the data centre. We\'ll follow an AI model from storage all the way to an answer.',
    view: 'tray', display: { cooling: true, lids: false }, dir: [0.55, 0.75, 0.85], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'superchip' }, label: '2× Vera Rubin superchips' },
      { sel: { id: 'cx9' }, label: '8× ConnectX-9 SuperNICs' },
      { sel: { id: 'bf4-card' }, label: 'BlueField-4 DPU' },
    ],
    flows: [],
  },
  {
    title: 'Plugging into the rack',
    text: 'Everything blind-mates at the back when the tray slides in: DC power from the busbar, coolant from the rack manifold, and the NVLink connectors that join the copper spine. Inside the tray there are no cables at all.',
    view: 'tray', display: { cooling: true }, dir: [-0.45, 0.8, -0.75], zoom: 1.0,
    flows: [
      { from: BUSBAR, to: { id: 'busbar' }, bus: 'power', label: 'Power in' },
      { from: COOLANT, to: { id: 'uqd' }, bus: 'cool', label: 'Coolant in / out' },
      { from: { id: 'nvlink-conn' }, to: SPINE, bus: 'nvlink', label: 'NVLink spine' },
    ],
  },
  {
    title: 'Power-on and boot',
    text: 'The BMC wakes first on standby power, checks firmware signatures, then sequences the power boards. Each superchip\'s CPLD brings its voltage regulators up in order, and the Vera CPU boots from SPI flash before bringing up its two GPUs.',
    view: 'tray', display: { cooling: true }, dir: [0.35, 0.85, 0.6], zoom: 0.95,
    flows: [
      { from: { id: 'busbar' }, to: { id: 'pdb' }, bus: 'power', label: 'Power boards' },
      { from: { id: 'pdb' }, to: { id: 'superchip' }, pair: 'nearest', bus: 'power' },
      { from: { id: 'bmc' }, to: { id: 'cpld' }, via: MIDPLANES, bus: 'mgmt', label: 'Power sequencing' },
      { from: { id: 'flash' }, to: { id: 'vera-cpu' }, pair: 'nearest', bus: 'mgmt', label: 'Boot firmware' },
    ],
  },
  {
    title: 'Connecting to the outside world',
    text: 'Eight ConnectX-9 SuperNICs (800 Gb/s each) link the GPUs to other racks for scale-out traffic. The BlueField-4 DPU handles storage, security and control-plane traffic, so the CPUs and GPUs don\'t have to.',
    view: 'tray', display: { cooling: true }, dir: [0.25, 0.7, 1.0], zoom: 1.0,
    flows: [
      { from: NET, to: { id: 'cx9' }, bus: 'net', label: 'SuperNICs' },
      { from: STORAGE, to: { id: 'bf4' }, bus: 'net', label: 'BlueField-4' },
    ],
  },
  {
    title: 'Across the midplane, without cables',
    text: 'Front modules and superchips meet at PCIe Gen6 midplanes. Each GPU gets its own pair of SuperNICs (1.6 Tb/s), and the DPU reaches both Vera CPUs.',
    view: 'tray', display: { cooling: true }, dir: [0.4, 0.95, 0.5], zoom: 0.9,
    flows: [
      { from: { id: 'cx9' }, to: { id: 'rubin-gpu' }, pair: 'nearest', via: MIDPLANES, bus: 'net', label: 'To each GPU' },
      { from: { id: 'bf4' }, to: { id: 'vera-cpu' }, via: [{ id: 'midplane' }], bus: 'pcie', label: 'To each CPU' },
    ],
  },
  {
    title: 'Loading the model into CPU memory',
    text: 'Model weights, often hundreds of gigabytes, stream in from network storage through BlueField-4 (or from the local E1.S drives) into each Vera CPU\'s LPDDR5X SOCAMM memory, up to 1.5 TB per CPU.',
    view: 'tray', display: { cooling: false }, dir: [0.3, 0.9, 0.55], zoom: 0.9,
    flows: [
      { from: STORAGE, to: { id: 'bf4' }, bus: 'net' },
      { from: { id: 'front-cover' }, to: { id: 'bf4' }, bus: 'pcie', label: 'Local E1.S drives' },
      { from: { id: 'bf4' }, to: { id: 'vera-cpu' }, via: [{ id: 'midplane' }], bus: 'pcie', label: 'Vera CPUs' },
      { from: { id: 'vera-cpu' }, to: { id: 'socamm' }, bus: 'lpddr', label: 'LPDDR5X SOCAMM' },
    ],
  },
  {
    title: 'Into the GPUs over NVLink-C2C',
    text: 'Each Vera CPU copies weights to its two Rubin GPUs over NVLink-C2C at 1.8 TB/s. The link is cache-coherent, so GPUs can also read CPU memory directly when a model doesn\'t fit in HBM.',
    view: 'tray', display: { cooling: false }, dir: [0.5, 0.95, 0.35], zoom: 1.6,
    flows: [
      { from: { id: 'socamm', side: -1 }, to: CPU0, bus: 'lpddr' },
      { from: CPU0, to: { id: 'rubin-gpu', side: -1 }, bus: 'c2c', label: 'Rubin GPUs' },
    ],
  },
  {
    title: 'Weights live in HBM4',
    text: 'Inside each GPU package, 8 HBM4 stacks sit right beside the two compute dies: 288 GB at about 22 TB/s. Models bigger than that are split across many GPUs.',
    view: 'tray', display: { cooling: false, lids: false }, dir: [0.35, 1.0, 0.45], zoom: 1.5,
    flows: [
      { from: { id: 'rubin-die', within: GPU0 }, to: { id: 'hbm4', within: GPU0 }, pair: 4, bus: 'hbm', label: '8× HBM4 · 288 GB' },
    ],
  },
  {
    title: 'A request arrives',
    text: 'A prompt comes in from the network. With GPUDirect RDMA, the SuperNIC writes it straight into GPU memory, so the CPU only schedules the work.',
    view: 'tray', display: { cooling: false, lids: false }, dir: [0.2, 0.85, 0.9], zoom: 1.0,
    flows: [
      { from: NET, to: { id: 'cx9' }, pair: 'nearest', bus: 'net' },
      { from: { id: 'cx9', side: -1, nth: 0 }, to: GPU0, via: MIDPLANES, bus: 'net', label: 'Prompt → GPU memory' },
    ],
  },
  {
    title: 'Running the model',
    text: 'For each layer, weights and the KV cache stream from HBM into the GPU\'s tensor cores, which compute in low-precision NVFP4. The two dies split the work over a die-to-die link and behave as one GPU. Each pass produces the next token.',
    view: 'tray', display: { cooling: false, lids: false }, dir: [0.3, 1.0, 0.5], zoom: 1.5,
    flows: [
      { from: { id: 'hbm4', within: GPU0 }, to: { id: 'rubin-die', within: GPU0 }, pair: 'nearest', bus: 'hbm', label: 'Weights + KV cache' },
      { from: { id: 'rubin-die', within: GPU0, nth: 0 }, to: { id: 'rubin-die', within: GPU0, nth: 1 }, bus: 'd2d', label: 'Die-to-die' },
    ],
  },
  {
    title: 'Teamwork over NVLink 6',
    text: 'Large models are split across GPUs. After each layer, GPUs exchange results at 3.6 TB/s each through the copper spine and 36 NVLink switch chips, so all 72 GPUs in the rack act like one giant GPU.',
    view: 'tray', display: { cooling: false }, dir: [-0.35, 0.85, -0.6], zoom: 1.0,
    flows: [
      { from: { id: 'rubin-gpu' }, to: { id: 'nvlink-conn' }, pair: 'nearest', bus: 'nvlink' },
      { from: { id: 'nvlink-conn' }, to: SPINE, bus: 'nvlink', label: 'To the other 68 GPUs' },
    ],
  },
  {
    title: 'The answer goes back out',
    text: 'Generated tokens stream back out through the SuperNICs to the user. Meanwhile 45 °C liquid carries away kilowatts of heat per GPU, and power keeps flowing in from the busbar.',
    view: 'tray', display: { cooling: true }, dir: [0.45, 0.75, 0.9], zoom: 1.05,
    flows: [
      { from: GPU0, to: { id: 'cx9', side: -1, nth: 0 }, via: [{ id: 'midplane' }, { id: 'io-midplane' }], bus: 'net' },
      { from: { id: 'cx9', side: -1, nth: 0 }, to: NET, bus: 'net', label: 'Answer → user' },
      { from: { id: 'uqd' }, to: { id: 'gpu-coldplate' }, pair: 2, bus: 'cool', label: 'Cold plates' },
    ],
  },
];
