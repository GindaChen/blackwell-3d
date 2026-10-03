// Guided tours for the Apple silicon views: the M5 Ultra package, the Mac Studio and a 4-node cluster.
// Step and selector reference: ../steps.js. Virtual points are in each model's millimetres
// (package: centred on the origin; Mac Studio and cluster: y = 0 is half-way up; front is +z).

const GPU_A = { id: 'gpu-tile', nth: 0 };
const GPU_B = { id: 'gpu-tile', nth: 1 };

export const ULTRA_STEPS = [
  {
    title: 'Apple M5 Ultra',
    text: 'The chip at the heart of the 2026 Mac Studio: a 36-core CPU, an 80-core GPU, a 32-core Neural Engine and up to 512 GB of memory, all on one package about 6 by 7 cm. This tour opens it up.',
    display: { lids: true, floorplan: false, explode: 0 }, dir: [0.45, 0.85, 0.8], zoom: 0.95, frame: 'all',
    tags: [{ sel: { id: 'apple-lid' }, label: 'Metal lid' }],
    flows: [],
  },
  {
    title: 'Under the lid',
    text: 'Four silicon tiles run down the middle: a CPU tile and a GPU tile, then another GPU tile and CPU tile. Eight LPDDR5X memory packages sit beside them, four on each side. The floorplan overlay shows what each tile contains.',
    display: { lids: false, floorplan: true, explode: 0 }, dir: [0.3, 1.0, 0.55], zoom: 1.0, frame: 'all',
    tags: [
      { sel: { id: 'cpu-tile' }, label: 'CPU tiles' },
      { sel: { id: 'gpu-tile' }, label: 'GPU tiles' },
      { sel: { id: 'apple-lpddr' }, label: '8× LPDDR5X' },
    ],
    flows: [],
  },
  {
    title: 'Two chips, one package',
    text: 'An M5 Ultra is two M5 Max chips. The UltraFusion bridge underneath the seam joins them at more than 4.4 TB/s, enough that macOS sees one CPU, one GPU and one memory pool rather than two computers.',
    display: { lids: false, floorplan: true, explode: 0.6 }, dir: [0.55, 0.7, 0.45], zoom: 1.2,
    tags: [{ sel: { id: 'ultrafusion' }, label: 'UltraFusion bridge' }],
    flows: [{ from: GPU_A, to: GPU_B, via: [{ id: 'ultrafusion' }], bus: 'ufusion', label: '> 4.4 TB/s' }],
  },
  {
    title: 'Chiplets, bonded face to face',
    text: 'New in the M5 generation: each M5 Max is itself split into a CPU tile and a GPU tile. TSMC bonds both face-down onto a silicon interposer (SoIC), copper to copper, so tile-to-tile wires are very short and dense. Apple can then pair one CPU tile with a small GPU tile (M5 Pro) or a large one (M5 Max).',
    display: { lids: false, floorplan: true, explode: 0 }, dir: [0.25, 1.0, 0.5], zoom: 1.3,
    flows: [{ from: { id: 'cpu-tile' }, to: { id: 'gpu-tile' }, pair: 'nearest', bus: 'soic', label: 'Hybrid bond' }],
  },
  {
    title: 'One pool of memory',
    text: 'The memory controllers live on the GPU tiles, and each tile drives four LPDDR5X packages on its 512-bit bus. Together that is 1024 bits, 1.2 TB/s and up to 512 GB, shared by the CPU, GPU and Neural Engine without copying. That capacity is why people run 600-billion-parameter models on one Mac.',
    display: { lids: false, floorplan: true, explode: 0 }, dir: [0.4, 1.0, 0.35], zoom: 1.1,
    flows: [{ from: { id: 'apple-lpddr' }, to: { id: 'gpu-tile' }, pair: 'nearest', bus: 'umem', label: '1.2 TB/s · up to 512 GB' }],
  },
  {
    title: 'The CPU tile',
    text: 'Each CPU tile has 6 "super" cores for single-threaded speed and 12 performance cores for throughput. There are no efficiency cores on M5 Pro, Max or Ultra. The 16-core Neural Engine and the Thunderbolt 5, display and SSD controllers share the tile.',
    display: { lids: false, floorplan: true, explode: 0 }, dir: [0.2, 1.0, 0.35], zoom: 2.2,
    tags: [{ sel: { id: 'cpu-tile', nth: 0 }, label: '6 super + 12 performance cores · Neural Engine' }],
    flows: [],
  },
  {
    title: 'Capacity versus bandwidth',
    text: 'Compare a B200: 192 GB of HBM3e at 8 TB/s. The M5 Ultra has under a sixth of the bandwidth but more than twice the memory, at a fraction of the power. It suits large models served to a few users; NVIDIA\'s design suits huge batches.',
    display: { lids: false, floorplan: true, explode: 0 }, dir: [0.45, 0.85, 0.8], zoom: 0.95, frame: 'all',
    flows: [],
  },
];

const INTAKE = { virtual: [0, -60, 30], label: 'Cool air in through the foot' };
const EXHAUST = { virtual: [0, 30, -150], label: 'Hot air out the rear grille' };
const WALL = { virtual: [140, -30, -150], label: 'Mains power' };

export const STUDIO_STEPS = [
  {
    title: 'Mac Studio',
    text: 'A 197 mm aluminium box with no external power brick, 6 Thunderbolt 5 ports, 10 Gb Ethernet and HDMI. Inside is the M5 Ultra. This tour lifts off the shell and follows power, air and data.',
    display: { shell: true, cooling: true, lids: true, explode: 0 }, dir: [0.5, 0.45, 0.8], zoom: 1.0, frame: 'all',
    tags: [
      { sel: { id: 'tb5-port' }, label: 'Thunderbolt 5' },
      { sel: { id: 'sd-slot' }, label: 'SDXC' },
    ],
    flows: [],
  },
  {
    title: 'Inside',
    text: 'The logic board sits low so its connectors line up with the ports on the back. Two big blowers sit over the power supply at the front, and a copper heatsink covers the chip at the rear. Positions are estimates from Apple\'s exploded parts diagram and teardowns.',
    display: { shell: false, cooling: true, lids: true, explode: 0 }, dir: [0.5, 0.75, 0.75], zoom: 1.0, frame: 'all',
    tags: [
      { sel: { id: 'blower' }, label: 'Blowers' },
      { sel: { id: 'mac-heatsink' }, label: 'Copper heatsink' },
      { sel: { id: 'psu' }, label: '480 W PSU' },
    ],
    flows: [],
  },
  {
    title: 'Power',
    text: 'Mains AC goes straight into the internal 480 W supply. A copper bus bar carries 12 V to the logic board, where regulators around the chip step it down to the sub-1 V rails of the CPU and GPU.',
    display: { shell: false, cooling: false, lids: true, explode: 0 }, dir: [0.6, 0.85, 0.3], zoom: 1.0,
    flows: [
      { from: WALL, to: { id: 'ac-inlet' }, bus: 'power' },
      { from: { id: 'ac-inlet' }, to: { id: 'psu' }, bus: 'power', label: 'AC → 12 V' },
      { from: { id: 'psu' }, to: { id: 'mac-busbar' }, bus: 'power', label: 'Bus bar' },
      { from: { id: 'mac-busbar' }, to: { id: 'soc-vrm' }, pair: 4, bus: 'power', label: 'Voltage regulators' },
    ],
  },
  {
    title: 'Air',
    text: 'The blowers pull air in under the foot and push it back through the copper fins and out of the grille. Ultra models get copper because it carries heat better; Max models use aluminium. At idle the fans are almost silent.',
    display: { shell: false, cooling: true, lids: true, explode: 0.35 }, dir: [-0.7, 0.55, 0.6], zoom: 1.0,
    flows: [
      { from: INTAKE, to: { id: 'blower' }, bus: 'cool' },
      { from: { id: 'blower' }, to: { id: 'mac-heatsink' }, bus: 'cool', label: 'Through the fins' },
      { from: { id: 'mac-heatsink' }, to: EXHAUST, bus: 'cool' },
    ],
  },
  {
    title: 'Storage without an SSD controller',
    text: 'The two storage modules carry only NAND flash. The SSD controller is part of the M5 Ultra, so the modules are not standard M.2 drives and are paired to the machine. One module holds up to 8 TB.',
    display: { shell: false, cooling: false, lids: true, explode: 0.5 }, dir: [0.25, 1.0, 0.4], zoom: 1.0,
    flows: [{ from: { id: 'm5-ultra' }, to: { id: 'ssd-module' }, bus: 'nand', label: 'NAND modules' }],
  },
  {
    title: 'Ports',
    text: 'Each CPU tile drives three Thunderbolt 5 ports, six in all, with a retimer beside each rear port to keep the 80 Gb/s signal clean. A separate controller provides 10 Gb Ethernet. These ports are how Mac Studios join into a cluster.',
    display: { shell: false, cooling: false, lids: true, explode: 0 }, dir: [-0.3, 0.75, -0.75], zoom: 1.0,
    flows: [
      { from: { id: 'm5-ultra' }, to: { id: 'tb5-port' }, via: [{ id: 'tb5-retimer' }], bus: 'tb5', label: 'Thunderbolt 5' },
      { from: { id: 'm5-ultra' }, to: { id: 'eth-port' }, via: [{ id: 'eth-10g' }], bus: 'io', label: '10 GbE' },
    ],
  },
  {
    title: 'The chip itself',
    text: 'Lift the cooler and the lid and you reach the four tiles and eight memory packages of the M5 Ultra. Open the M5 Ultra view for the package tour.',
    display: { shell: false, cooling: false, lids: false, floorplan: true, explode: 0.6 }, dir: [0.35, 1.0, 0.45], zoom: 2.0,
    tags: [{ sel: { id: 'm5-ultra' }, label: 'M5 Ultra' }],
    flows: [],
  },
];

export const CLUSTER_STEPS = [
  {
    title: 'Four Mac Studios, one model',
    text: 'Four M5 Ultra Mac Studios in a 10-inch rack: 144 CPU cores, 320 GPU cores and up to 2 TB of unified memory, drawing a few hundred watts. With RDMA over Thunderbolt (macOS 26.2+), MLX and Exo can split one large model across all four.',
    display: { shell: true, cooling: true, explode: 0 }, dir: [0.5, 0.25, 0.85], zoom: 0.95, frame: 'all',
    tags: [
      { sel: { id: 'mac-studio' }, label: 'M5 Ultra Mac Studio' },
      { sel: { id: 'eth-switch' }, label: '10 GbE switch' },
    ],
    flows: [],
  },
  {
    title: 'A full mesh of cables',
    text: 'There is no Thunderbolt 5 switch, so every Mac cables directly to every other one. Four nodes need six cables and three ports each. This mesh gives the lowest latency, which tensor parallelism needs. Apple\'s JACCL library can also run a ring.',
    display: { explode: 0 }, dir: [0.55, 0.2, -0.85], zoom: 0.95,
    flows: [{ from: { id: 'mac-studio' }, to: { id: 'mac-studio' }, pair: 3, bus: 'tb5', label: 'Thunderbolt 5 · 80 Gb/s' }],
    tags: [{ sel: { id: 'tb5-cable' }, label: '6 cables' }],
  },
  {
    title: 'RDMA over Thunderbolt',
    text: 'With RDMA, one Mac writes straight into another\'s memory without the operating system copying anything. Latency drops from about 300 µs over TCP to under 50 µs. That is still far from NVLink, so speedups are real but modest: Jeff Geerling measured Qwen3-235B going from 19.5 to 31.9 tokens/s on one to four Macs.',
    display: { explode: 0 }, dir: [0.7, 0.15, -0.7], zoom: 0.8,
    flows: [{ from: { id: 'tb5-cable' }, to: { id: 'mac-studio' }, pair: 2, bus: 'tb5' }],
  },
  {
    title: 'The other two networks',
    text: 'The Thunderbolt mesh carries only model traffic. Ordinary networking (logins, storage, downloading weights) goes over 10 GbE to a small switch, and each Mac has its own power cord because the PSU is inside.',
    display: { explode: 0 }, dir: [-0.6, 0.3, -0.75], zoom: 0.95,
    flows: [
      { from: { id: 'mac-studio' }, to: { id: 'eth-switch' }, bus: 'net', label: '10 GbE' },
      { from: { id: 'power-strip' }, to: { id: 'mac-studio' }, bus: 'power', label: 'Mains' },
    ],
  },
  {
    title: 'Inside one node',
    text: 'Slide out the top Mac and lift its shell: the same Mac Studio as in its own view. Hover a Thunderbolt 5 port or the M5 Ultra to trace it.',
    display: { explode: 1, shell: true, cooling: true }, dir: [0.6, 0.45, 0.7], zoom: 1.0,
    tags: [
      { sel: { id: 'm5-ultra' }, label: 'M5 Ultra' },
      { sel: { id: 'blower' }, label: 'Blowers' },
    ],
    flows: [],
  },
  {
    title: 'NVL72 versus this cluster',
    text: 'An NVL72 rack links 72 GPUs at 1.8 TB/s each, about 130 TB/s, using about 120 kW. This cluster links four chips at about 10 GB/s per cable and fits on a desk. It has the memory to hold trillion-parameter models, though nowhere near the throughput.',
    display: { explode: 0, shell: true }, dir: [0.5, 0.25, 0.85], zoom: 0.95, frame: 'all',
    flows: [],
  },
];
