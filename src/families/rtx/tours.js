// Guided tours for the RTX (Blackwell desktop) cards. Step and selector reference: src/tour/steps.js.
// Virtual points are in card millimetres (x: bracket -152 .. +152, z: PCIe edge -68.5 .. top edge
// +68.5, y: 0 = back face, 40 = fan face).

const HOST = { virtual: [-66, 8, -150], label: 'PCIe slot · CPU and system memory' };
const MONITOR = { virtual: [-240, 12, -10], label: 'Monitors' };
const PSU = { virtual: [120, 20, 150], label: 'Power supply · 12V-2x6 cable' };
const AIR_IN = { virtual: [0, 120, 20], label: 'Cool air in' };
const AIR_OUT = { virtual: [0, -40, -150], label: 'Warm air out the back' };

export const RTX5090_STEPS = [
  {
    title: 'GeForce RTX 5090 Founders Edition',
    text: 'NVIDIA\'s 2025 flagship gaming card: 304 × 137 mm and only two slots thick, for a 575 W GPU. The 4090 Founders Edition needed three slots for 450 W. The trick is inside: the board is split into three pieces.',
    display: { shell: true, cooling: true, floorplan: false, explode: 0 }, dir: [0.45, 0.9, 0.8], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'rtx-fan' }, label: '2 flow-through fans' },
      { sel: { id: 'rtx-power-conn' }, label: '12V-2x6, angled' },
      { sel: { id: 'rtx-port' }, label: '3× DP 2.1b + HDMI 2.1b' },
    ],
    flows: [],
  },
  {
    title: 'Double flow-through',
    text: 'Both fans push air straight through a fin stack and out of the back of the card. On earlier cards the board sat under one fan and blocked it. Here the board is small enough to fit between the fans, so neither is blocked.',
    display: { shell: true, cooling: true, explode: 0 }, dir: [0.3, 0.55, 1.0], zoom: 1.0, frame: 'all',
    flows: [
      { from: AIR_IN, to: { id: 'rtx-fan' }, bus: 'cool', label: 'Intake' },
      { from: { id: 'rtx-fan' }, to: { id: 'rtx-fins' }, pair: 'nearest', bus: 'cool', label: 'Through the fins' },
      { from: { id: 'rtx-fins' }, to: AIR_OUT, bus: 'cool' },
    ],
  },
  {
    title: 'Three boards',
    text: 'The main board in the centre holds only the GPU, memory and power delivery. The PCIe gold fingers have their own small board along the bottom, and the display outputs have a third one behind the bracket. Flex cables join them.',
    display: { shell: false, cooling: false, floorplan: false, explode: 0.7 }, dir: [-0.35, 0.85, 0.75], zoom: 1.0, frame: 'all',
    tags: [
      { sel: { id: 'rtx-pcb' }, label: 'Main board' },
      { sel: { id: 'rtx-pcie-board' }, label: 'PCIe board' },
      { sel: { id: 'rtx-io-board' }, label: 'Display board' },
      { sel: { id: 'rtx-flex' }, label: 'Flex cables' },
    ],
    flows: [
      { from: HOST, to: { id: 'rtx-pcie-board' }, bus: 'pcie', label: 'PCIe Gen5 x16' },
      { from: { id: 'rtx-pcie-board' }, to: { id: 'gb202' }, via: [{ id: 'rtx-fpc-pcie' }], bus: 'pcie' },
      { from: { id: 'gb202' }, to: { id: 'rtx-io-board' }, via: [{ id: 'rtx-fpc-io' }], bus: 'display', label: 'Display signals' },
      { from: { id: 'rtx-io-board' }, to: MONITOR, bus: 'display' },
    ],
  },
  {
    title: 'The GB202 GPU',
    text: 'GB202 is a single 750 mm² die with 92.2 billion transistors: 12 clusters (GPCs) of 16 SMs, 192 in all, around 128 MB of L2 cache. The 5090 switches on 170 SMs (21,760 CUDA cores) and 96 MB of L2. The dimmed tiles are the parts left off.',
    display: { shell: false, cooling: false, floorplan: true, explode: 0 }, dir: [0.15, 1.0, 0.45], zoom: 2.4,
    tags: [{ sel: { id: 'gb202-die' }, label: '170 of 192 SMs · 96 of 128 MB L2' }],
    flows: [],
  },
  {
    title: 'GDDR7 memory',
    text: 'Sixteen 2 GB GDDR7 chips ring the GPU, each on its own 32-bit channel: 512 bits in total. At 28 Gb/s per pin that is 1.79 TB/s. The chips sit as close as possible because these signals only travel a few centimetres.',
    display: { shell: false, cooling: false, floorplan: true, explode: 0 }, dir: [0.25, 1.0, 0.55], zoom: 1.6,
    flows: [{ from: { id: 'gb202-die' }, to: { id: 'gddr7' }, bus: 'gddr7', label: '16 × 32-bit · 1.79 TB/s' }],
  },
  {
    title: 'Power',
    text: 'One 12V-2x6 cable brings up to 600 W at 12 V. The connector is angled towards the end of the card and recessed so the cable bends less. Nineteen phases feed the GPU core and eight feed the memory. The bulk capacitors are on the back of the board.',
    display: { shell: false, cooling: false, floorplan: false, explode: 0 }, dir: [0.35, 0.95, 0.75], zoom: 1.5,
    flows: [
      { from: PSU, to: { id: 'rtx-power-conn' }, bus: 'power', label: '12 V · up to 600 W' },
      { from: { id: 'rtx-power-conn' }, to: { id: 'rtx-vrm-gpu' }, bus: 'power', label: 'GPU VRM' },
      { from: { id: 'rtx-power-conn' }, to: { id: 'rtx-vrm-mem' }, bus: 'power', label: 'Memory VRM' },
      { from: { id: 'rtx-vrm-gpu' }, to: { id: 'gb202' }, bus: 'power' },
    ],
  },
  {
    title: 'Getting 575 W out',
    text: 'Liquid metal replaces paste between the die and the cooler. A 3D vapor chamber spreads the heat over the GPU, memory and VRM, and heat pipes carry it to the fin stacks at both ends of the card.',
    display: { shell: false, cooling: true, floorplan: false, explode: 0.55 }, dir: [0.5, 0.75, 0.85], zoom: 1.0, frame: 'all',
    flows: [
      { from: { id: 'rtx-lm' }, to: { id: 'rtx-vapor' }, bus: 'cool', label: 'Liquid metal' },
      { from: { id: 'rtx-vapor' }, to: { id: 'rtx-heatpipe' }, bus: 'cool', label: 'Heat pipes' },
      { from: { id: 'rtx-heatpipe' }, to: { id: 'rtx-fins' }, bus: 'cool', label: 'Both fin stacks' },
    ],
  },
  {
    title: 'Not a B200',
    text: 'A B200 has two dies, 192 GB of HBM3e at 8 TB/s and 1.8 TB/s of NVLink, and draws about 1 kW on a liquid-cooled board. The 5090 has 32 GB of GDDR7 at 1.79 TB/s and no NVLink, so two of them can only talk over PCIe. It runs on one cable and two fans in a desktop.',
    display: { shell: true, cooling: true, floorplan: false, explode: 0 }, dir: [-0.45, 0.85, 0.8], zoom: 0.95, frame: 'all',
    flows: [{ from: HOST, to: { id: 'rtx-pcie-board' }, bus: 'pcie', label: 'PCIe only · 64 GB/s each way' }],
  },
];

export const PRO6000_STEPS = [
  {
    title: 'RTX PRO 6000 Blackwell',
    text: 'The workstation card built from the same GB202 chip. It keeps the 5090 Founders Edition\'s size and double flow-through cooler, in black. Inside it has three times the memory and a little more of the chip switched on.',
    display: { shell: true, cooling: true, floorplan: false, explode: 0 }, dir: [0.45, 0.9, 0.8], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'rtx-fan' }, label: '2 flow-through fans' },
      { sel: { id: 'rtx-port' }, label: '4× DisplayPort 2.1' },
      { sel: { id: 'rtx-power-conn' }, label: '12V-2x6 · 600 W' },
    ],
    flows: [],
  },
  {
    title: 'Nearly the full GB202',
    text: 'The PRO 6000 enables 188 of the 192 SMs (24,064 CUDA cores) and all 128 MB of L2 cache. The 5090 has 170 SMs and 96 MB. Only four SMs are left off, drawn dimmed here.',
    display: { shell: false, cooling: false, floorplan: true, explode: 0 }, dir: [0.15, 1.0, 0.45], zoom: 2.4,
    tags: [{ sel: { id: 'gb202-die' }, label: '188 of 192 SMs · 128 MB L2' }],
    flows: [],
  },
  {
    title: '96 GB in clamshell',
    text: 'The PRO 6000 uses 3 GB GDDR7 chips, and twice as many of them: 16 on the front and 16 on the back. Each pair splits one 32-bit channel. Capacity triples to 96 GB with ECC, but the bus is still 512 bits, so bandwidth stays at 1.79 TB/s.',
    display: { shell: false, cooling: false, floorplan: true, explode: 1 }, dir: [0.35, 0.3, 1.0], zoom: 1.25,
    flows: [
      { from: { id: 'gb202-die' }, to: { id: 'gddr7' }, bus: 'gddr7', label: '16 front' },
      { from: { id: 'gb202-die' }, to: { id: 'gddr7-back' }, bus: 'gddr7', label: '16 back' },
    ],
  },
  {
    title: 'Cooling the back side',
    text: 'The 5090 has nothing hot on the back of its board. The PRO 6000 has 16 memory chips there, so the backplate presses on them through thermal pads. The front is cooled the same way as on the 5090: vapor chamber, heat pipes and two fin stacks.',
    display: { shell: true, cooling: true, floorplan: false, explode: 1 }, dir: [0.4, 0.35, 1.0], zoom: 1.1, frame: 'all',
    flows: [
      { from: { id: 'gddr7-back' }, to: { id: 'rtx-backplate' }, bus: 'cool', label: 'Thermal pads' },
      { from: { id: 'rtx-vapor' }, to: { id: 'rtx-fins' }, via: [{ id: 'rtx-heatpipe' }], bus: 'cool', label: 'Front side' },
    ],
  },
  {
    title: '600 W',
    text: 'The PRO 6000 is rated at 600 W, 25 W more than the 5090, all through one 12V-2x6 connector. That is the most a single 12V-2x6 cable is allowed to carry.',
    display: { shell: false, cooling: false, floorplan: false, explode: 0 }, dir: [0.35, 0.95, 0.75], zoom: 1.5,
    flows: [
      { from: PSU, to: { id: 'rtx-power-conn' }, bus: 'power', label: '12 V · 600 W' },
      { from: { id: 'rtx-power-conn' }, to: { id: 'rtx-vrm-gpu' }, bus: 'power' },
      { from: { id: 'rtx-vrm-gpu' }, to: { id: 'gb202' }, bus: 'power' },
    ],
  },
  {
    title: 'Workstation features',
    text: 'Four DisplayPort 2.1 outputs and no HDMI. Four video encoders and four decoders (the 5090 has three and two). ECC memory, certified drivers, and MIG, which splits the GPU into up to four isolated instances. It still connects only over PCIe Gen5 x16.',
    display: { shell: false, cooling: false, floorplan: false, explode: 0.7 }, dir: [-0.5, 0.8, 0.7], zoom: 1.0, frame: 'all',
    flows: [
      { from: HOST, to: { id: 'rtx-pcie-board' }, bus: 'pcie', label: 'PCIe Gen5 x16' },
      { from: { id: 'rtx-pcie-board' }, to: { id: 'gb202' }, via: [{ id: 'rtx-fpc-pcie' }], bus: 'pcie' },
      { from: { id: 'gb202' }, to: { id: 'rtx-io-board' }, via: [{ id: 'rtx-fpc-io' }], bus: 'display' },
      { from: { id: 'rtx-io-board' }, to: MONITOR, bus: 'display', label: '4× DisplayPort 2.1' },
    ],
  },
  {
    title: 'Max-Q and Server editions',
    text: 'There are two more versions of this card. The Max-Q Workstation Edition has the same chip and 96 GB but is capped at 300 W, with a blower that exhausts out of the bracket, so four can sit side by side. The Server Edition is passive and relies on the server\'s fans.',
    display: { shell: true, cooling: true, floorplan: false, explode: 0 }, dir: [-0.3, 0.6, 1.0], zoom: 1.0, frame: 'all',
    flows: [],
  },
  {
    title: 'Still not a B200',
    text: 'With 96 GB, one PRO 6000 can hold a large model, but a B200 has twice the memory and 4.5 times the bandwidth (8 TB/s of HBM3e). B200s also link to each other over NVLink at 1.8 TB/s, while PRO 6000s only have PCIe at 64 GB/s each way. It is a workstation card with a desktop power budget.',
    display: { shell: true, cooling: true, floorplan: false, explode: 0 }, dir: [0.45, 0.9, 0.8], zoom: 0.95, frame: 'all',
    flows: [{ from: HOST, to: { id: 'rtx-pcie-board' }, bus: 'pcie', label: 'PCIe only' }],
  },
];
