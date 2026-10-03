// Connection graph: what each component does and what it talks to.
//
// Each entry: { role, links: [Link] }   (or { alias: 'other-id' })
// Link fields:
//   to     : part id, or an array of ids tried in order (first one present in the view wins)
//   scope  : 'superchip' (same superchip), 'any' (whole view), 'self' (inside the hovered part),
//            or { ancestor: 'id' } (inside the hovered part's nearest ancestor with that id)
//   pick   : 'nearest' | number (N nearest) | 'all'   (default 'all')
//   via    : part ids routed through, nearest-first (e.g. a connector, then a midplane)
//   bus    : bus/kind key (colour + legend), see BUSES
//   label  : short text for the callout
//   group  : optional label for the bracket shown on the target(s)
//   alt    : { [fallbackId]: { label, group } } overrides when a fallback id from `to` was used

const BASE_BUSES = {
  nvlink: { name: 'NVLink 5', color: '#38d5ff' },
  c2c: { name: 'NVLink-C2C', color: '#9be22d' },
  hbm: { name: 'HBM3e', color: '#ffb547' },
  d2d: { name: 'NV-HBI', color: '#ffe08a' },
  lpddr: { name: 'LPDDR5X', color: '#ffd166' },
  lp5: { name: 'DDR5', color: '#ffd166' },
  pcie: { name: 'PCIe Gen5', color: '#b88cff' },
  net: { name: 'Network', color: '#ff7ad9' },
  power: { name: 'Power', color: '#ff5a5a' },
  cool: { name: 'Coolant', color: '#4aa8ff' },
  mgmt: { name: 'Management', color: '#d6d6d6' },
  // Apple
  umem: { name: 'Unified memory', color: '#ffd166' },
  ufusion: { name: 'UltraFusion', color: '#7fe0c8' },
  soic: { name: 'Tile bond (SoIC)', color: '#ffe08a' },
  tb5: { name: 'Thunderbolt 5', color: '#38d5ff' },
  nand: { name: 'SSD', color: '#b88cff' },
  io: { name: 'I/O', color: '#ff7ad9' },
};

const GPU_POWER = { to: ['power-stage'], scope: 'superchip', pick: 6, bus: 'power', label: 'Power from the VRM stages around it', group: 'VRM power stages' };
const TO_GPU = ['b200-gpu'];

export const CONNECTIONS = {
  // ------------------------------------------------------------------ superchip
  'b200-gpu': {
    role: 'Does the AI math: 5th-gen tensor cores with FP4/FP6/FP8 for training and inference.',
    links: [
      { to: 'hbm3e', scope: 'self', bus: 'hbm', label: '8 HBM3e stacks · 8 TB/s', group: 'HBM3e ×8' },
      { to: 'grace-cpu', scope: 'superchip', bus: 'c2c', label: 'Grace CPU · coherent shared memory', group: 'Grace CPU' },
      { to: 'hgx-nvswitch', scope: 'any', bus: 'nvlink', label: 'Both NVLink switches · 9 links each, 1.8 TB/s', group: 'NVLink switches' },
      { to: 'host-conn', scope: 'any', pick: 'nearest', bus: 'pcie', label: 'PCIe Gen5 to the host tray', group: 'Host link' },
      { to: 'nvlink-conn', scope: 'superchip', pick: 'nearest', bus: 'nvlink', label: 'Spine → all 72 GPUs · 1.8 TB/s', group: 'NVLink connector' },
      { to: 'nvswitch', scope: 'any', via: ['nvlink-conn', 'nvlink-spine'], bus: 'nvlink', label: 'Through the spine to the switch trays', group: 'NVLink switch chips' },
      { to: ['cx7', 'cable-conn'], scope: 'any', pick: 'nearest', via: ['cable-conn', 'cables'], bus: 'net', label: 'Own ConnectX-7 · 400 Gb/s scale-out', group: 'ConnectX-7', alt: { 'cable-conn': { label: 'Out by cable to its ConnectX-7 (400 Gb/s)', group: 'To NIC' } } },
      GPU_POWER,
      { to: ['gpu-coldplate', 'gpu-heatsink'], scope: 'any', pick: 'nearest', bus: 'cool', label: 'Heat out to the cooler', group: 'Cooler' },
    ],
  },
  'b200-die': {
    role: 'One of two compute dies. The pair behaves as a single GPU.',
    links: [
      { to: 'b200-die', scope: { ancestor: 'b200-gpu' }, bus: 'd2d', label: 'Sibling die · NV-HBI 10 TB/s', group: 'Sibling die' },
      { to: 'hbm3e', scope: { ancestor: 'b200-gpu' }, pick: 4, bus: 'hbm', label: '4 nearest HBM3e stacks', group: 'HBM3e' },
    ],
  },
  hbm3e: {
    role: 'Stacked DRAM beside the die (24 GB): the GPU\'s working memory.',
    links: [{ to: 'b200-die', scope: { ancestor: 'b200-gpu' }, pick: 'nearest', bus: 'hbm', label: 'Compute die · ~1 TB/s via interposer', group: 'Compute die' }],
  },
  'gpu-interposer': {
    role: 'Silicon bridge that wires the dies and HBM together.',
    links: [
      { to: 'b200-die', scope: { ancestor: 'b200-gpu' }, bus: 'd2d', label: 'Both compute dies', group: 'Dies' },
      { to: 'hbm3e', scope: { ancestor: 'b200-gpu' }, bus: 'hbm', label: 'All 8 HBM3e stacks', group: 'HBM3e ×8' },
    ],
  },
  'gpu-lid': {
    role: 'Heat spreader between the dies and the cooler.',
    links: [{ to: 'b200-die', scope: { ancestor: 'b200-gpu' }, bus: 'cool', label: 'Pulls heat off both dies', group: 'Dies' }],
  },
  'grace-cpu': {
    role: 'Runs the OS, data loading and orchestration, and feeds both GPUs.',
    links: [
      { to: 'b200-gpu', scope: 'superchip', bus: 'c2c', label: 'Both GPUs · 900 GB/s coherent', group: 'B200 GPUs' },
      { to: 'lpddr5x', scope: 'superchip', bus: 'lpddr', label: '16× LPDDR5X · up to 480 GB', group: 'LPDDR5X ×16' },
      { to: ['bf3', 'cable-conn'], scope: 'any', pick: 'nearest', via: ['cable-conn', 'cables'], bus: 'pcie', label: 'BlueField-3 DPU · network, storage', group: 'BlueField-3', alt: { 'cable-conn': { label: 'Out by cable to BlueField-3, drives', group: 'PCIe Gen5' } } },
      { to: 'cpu-coldplate', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Heat out to the liquid loop', group: 'Cold plate' },
    ],
  },
  'grace-die': { alias: 'grace-cpu' },
  lpddr5x: {
    role: 'Soldered LPDDR5X memory for Grace: low power, high bandwidth.',
    links: [{ to: 'grace-cpu', scope: 'superchip', bus: 'lpddr', label: 'LPDDR5X channels to Grace', group: 'Grace CPU' }],
  },
  'nvlink-conn': {
    role: 'Blind-mates into the rack\'s copper NVLink spine.',
    links: [
      { to: 'b200-gpu', scope: 'superchip', pick: 'nearest', bus: 'nvlink', label: 'Carries this GPU\'s 18 NVLink 5 links', group: 'B200 GPU' },
      { to: 'nvlink-spine', scope: 'any', bus: 'nvlink', label: 'Into the cable cartridges', group: 'Spine' },
    ],
  },
  'cable-conn': {
    role: 'Plug for the internal PCIe Gen5 cables to the front I/O.',
    links: [
      { to: 'grace-cpu', scope: 'superchip', bus: 'pcie', label: 'Grace PCIe Gen5', group: 'Grace CPU' },
      { to: 'b200-gpu', scope: 'superchip', pick: 'nearest', bus: 'net', label: 'GPU → NIC lanes', group: 'B200 GPU' },
      { to: 'cables', scope: 'any', bus: 'pcie', label: 'Into the cable harness', group: 'Cables' },
    ],
  },
  'power-conn': {
    role: 'Brings 12 V from the tray power board onto the superchip.',
    links: [
      { to: 'vrm-inductor', scope: 'superchip', pick: 2, bus: 'power', label: 'Into the VRMs', group: 'VRMs' },
      { to: 'pdb', scope: 'any', pick: 'nearest', bus: 'power', label: 'From the power distribution board', group: 'PDB' },
    ],
  },
  'vrm-inductor': {
    role: 'Smooths the switched current of the multiphase regulators.',
    links: [
      { to: 'drmos', scope: 'superchip', pick: 4, bus: 'power', label: 'Fed by smart power stages', group: 'Power stages' },
      { to: ['grace-cpu'], scope: 'superchip', pick: 'nearest', bus: 'power', label: 'Supplies CPU / SOC rails', group: 'Load' },
    ],
  },
  'power-stage': {
    role: 'Delivers high current at <1 V right next to the chip.',
    links: [{ to: ['b200-gpu', 'grace-cpu', 'nvswitch', 'hgx-nvswitch', 'm5-ultra'], scope: 'superchip', pick: 'nearest', bus: 'power', label: 'Feeds the nearest processor', group: 'Load' }],
  },
  drmos: {
    role: 'MOSFET + driver switching stage of a VRM phase.',
    links: [
      { to: 'vrm-ctrl', scope: 'superchip', pick: 'nearest', bus: 'mgmt', label: 'PWM from the VRM controller', group: 'Controller' },
      { to: 'vrm-inductor', scope: 'superchip', pick: 'nearest', bus: 'power', label: 'Switches into the output inductor', group: 'Inductor' },
    ],
  },
  'polymer-cap': {
    role: 'Bulk energy reservoir for sudden load steps.',
    links: [{ to: ['b200-gpu', 'grace-cpu'], scope: 'superchip', pick: 'nearest', bus: 'power', label: 'Steadies the nearest supply rail', group: 'Load' }],
  },
  mlcc: {
    role: 'Tiny ceramic capacitor that absorbs nanosecond current spikes.',
    links: [{ to: ['b200-gpu', 'grace-cpu', 'nvswitch', 'hgx-nvswitch', 'm5-ultra'], scope: 'superchip', pick: 'nearest', bus: 'power', label: 'Decouples the nearest chip', group: 'Load' }],
  },
  resistor: { role: 'Pull-ups, current sense and signal termination.', links: [] },
  'inductor-s': {
    role: 'Inductor for auxiliary (I/O, standby) rails.',
    links: [{ to: 'vrm-ctrl', scope: 'superchip', pick: 'nearest', bus: 'power', label: 'Aux rail regulation', group: 'Controller' }],
  },
  'vrm-ctrl': {
    role: 'Digital controller that orchestrates many VRM phases.',
    links: [
      { to: ['drmos', 'power-stage'], scope: 'superchip', pick: 8, bus: 'mgmt', label: 'Drives the power stages', group: 'Power stages' },
      { to: ['cpld', 'hgx-hmc'], scope: 'superchip', pick: 'nearest', bus: 'mgmt', label: 'Enable / telemetry (PMBus)', group: 'Controller' },
    ],
  },
  cpld: {
    role: 'Board housekeeper: power sequencing, resets, telemetry.',
    links: [
      { to: 'vrm-ctrl', scope: 'superchip', bus: 'mgmt', label: 'Sequences VRM rails', group: 'VRM ctrl' },
      { to: 'grace-cpu', scope: 'superchip', bus: 'mgmt', label: 'Reset / boot strap', group: 'Grace CPU' },
      { to: ['bmc', 'cable-conn'], scope: 'any', pick: 'nearest', via: ['cable-conn', 'cables'], bus: 'mgmt', label: 'Sideband to the tray BMC', group: 'BMC', alt: { 'cable-conn': { label: 'Sideband out to the tray BMC', group: 'To BMC' } } },
    ],
  },
  flash: {
    role: 'Holds firmware the CPU boots from.',
    links: [{ to: 'grace-cpu', scope: 'superchip', bus: 'mgmt', label: 'SPI boot', group: 'Grace CPU' }],
  },
  i2c: { role: 'Fans out the slow management bus.', links: [{ to: 'cpld', scope: 'superchip', bus: 'mgmt', label: 'I²C to the CPLD', group: 'CPLD' }] },
  temp: { role: 'Reports board temperature.', links: [{ to: 'cpld', scope: 'superchip', bus: 'mgmt', label: 'I²C telemetry', group: 'CPLD' }] },
  osc: { role: 'Reference clock for board logic.', links: [{ to: 'cpld', scope: 'superchip', bus: 'mgmt', label: 'Clock', group: 'CPLD' }] },
  'aux-conn': { role: 'Factory debug / programming header.', links: [{ to: 'cpld', scope: 'superchip', bus: 'mgmt', label: 'JTAG / debug', group: 'CPLD' }] },
  pcb: { role: 'Dozens of copper layers carrying every link shown on hover.', links: [] },

  // ------------------------------------------------------------------ compute tray
  superchip: {
    role: '1 Grace + 2 B200. Two per tray, 18 trays = 72 GPUs per rack.',
    links: [
      { to: 'cables', scope: 'any', bus: 'pcie', label: 'PCIe Gen5 cable harness', group: 'Cables' },
      { to: 'pdb', scope: 'any', bus: 'power', label: 'Power distribution boards', group: 'PDB' },
      { to: 'gpu-coldplate', scope: 'any', pick: 2, bus: 'cool', label: 'GPU cold plates', group: 'Cold plates' },
    ],
  },
  cx7: { alias: 'cx7-card' },
  'cx7-card': {
    role: '400 Gb/s NIC dedicated to one GPU, for the scale-out fabric.',
    links: [
      { to: TO_GPU, scope: 'any', pick: 'nearest', via: ['cables', 'cable-conn'], bus: 'net', label: 'Its own B200 · PCIe Gen5 + GPUDirect RDMA', group: 'B200 GPU' },
      { to: 'front-panel', scope: 'any', pick: 'nearest', bus: 'net', label: 'OSFP port to the InfiniBand / Ethernet fabric', group: 'Port' },
    ],
  },
  bf3: { alias: 'bf3-card' },
  'bf3-card': {
    role: 'DPU: runs networking, storage and security off the CPU.',
    links: [
      { to: 'grace-cpu', scope: 'any', pick: 'nearest', via: ['cables', 'cable-conn'], bus: 'pcie', label: 'Its superchip\'s Grace · PCIe Gen5', group: 'Grace CPU' },
      { to: 'bf3-ddr', scope: 'self', bus: 'lp5', label: 'Own DDR5 memory', group: 'DDR5' },
      { to: 'front-panel', scope: 'any', pick: 'nearest', bus: 'net', label: 'QSFP112 ports · 400 Gb/s front-end network', group: 'Ports' },
    ],
  },
  'bf3-ddr': { role: 'Memory for BlueField\'s Arm cores.', links: [{ to: 'bf3', scope: 'any', pick: 'nearest', bus: 'lp5', label: 'BlueField-3', group: 'BlueField-3' }] },
  e1s: {
    role: 'Local NVMe storage: boot drive and scratch space.',
    links: [{ to: 'grace-cpu', scope: 'any', via: ['cables', 'cable-conn'], bus: 'pcie', label: 'Both Grace CPUs · PCIe Gen5', group: 'Grace CPUs' }],
  },
  'mgmt-module': {
    role: 'Tray management: BMC, root of trust, front-panel management port.',
    links: [
      { to: 'bmc', scope: 'self', bus: 'mgmt', label: 'BMC', group: 'BMC' },
      { to: 'cables', scope: 'any', bus: 'mgmt', label: 'Sideband cables to the superchips', group: 'Cables' },
      { to: 'mgmt-switch', scope: 'any', pick: 'nearest', bus: 'mgmt', label: 'Rack management network', group: 'Mgmt switch' },
    ],
  },
  bmc: {
    role: 'Out-of-band manager: power, sensors, firmware, remote console.',
    links: [
      { to: 'cpld', scope: 'any', via: ['cables'], bus: 'mgmt', label: 'Each superchip\'s CPLD (sideband)', group: 'CPLDs' },
      { to: 'pdb', scope: 'any', bus: 'mgmt', label: 'Power control (PMBus)', group: 'PDB' },
      { to: 'fans', scope: 'any', bus: 'mgmt', label: 'Fan speed control', group: 'Fans' },
      { to: 'front-panel', scope: 'any', bus: 'mgmt', label: 'RJ45 management port', group: 'Mgmt port' },
    ],
  },
  hmc: {
    role: 'Collects GPU telemetry and attests firmware.',
    links: [{ to: 'b200-gpu', scope: 'any', via: ['cables'], bus: 'mgmt', label: 'All 4 GPUs · telemetry / RAS', group: 'GPUs' }],
  },
  fans: {
    role: 'Moves air over the parts the liquid loop doesn\'t touch.',
    links: [{ to: ['cx7-card', 'switch-mgmt', 'gpu-heatsink'], scope: 'any', bus: 'cool', label: 'Airflow over the air-cooled parts', group: 'Air-cooled parts' }],
  },
  cables: {
    role: 'Internal twinax harness: GB200\'s alternative to a midplane.',
    links: [
      { to: 'cable-conn', scope: 'any', bus: 'pcie', label: 'Superchip front connectors', group: 'Superchip conns' },
      { to: 'cx7-card', scope: 'any', bus: 'net', label: '4× ConnectX-7', group: 'CX-7' },
      { to: 'bf3-card', scope: 'any', bus: 'pcie', label: '2× BlueField-3', group: 'BF-3' },
      { to: 'e1s', scope: 'any', bus: 'pcie', label: 'E1.S drives', group: 'Drives' },
    ],
  },
  pdb: {
    role: 'Converts busbar power to the rails the boards need.',
    links: [
      { to: ['power-bus', 'busbar'], scope: 'any', pick: 'nearest', bus: 'power', label: 'DC in from the rack busbar', group: 'Busbar', alt: { busbar: { label: 'DC in from the rack busbar', group: 'Busbar' } } },
      { to: ['power-conn', 'nvswitch', 'gpu-module'], scope: 'any', pick: 2, bus: 'power', label: 'Out to the boards', group: 'Loads', alt: { 'gpu-module': { label: 'Out to the GPU modules', group: 'GPU modules' } } },
    ],
  },
  'power-bus': {
    role: 'Copper bars under the boards: busbar clip → PDBs.',
    links: [
      { to: 'busbar', scope: 'any', bus: 'power', label: 'Rear busbar clip', group: 'Busbar clip' },
      { to: 'pdb', scope: 'any', bus: 'power', label: 'Both PDBs', group: 'PDB' },
    ],
  },
  busbar: {
    role: 'The tray\'s only power input: clips onto the rack busbar.',
    links: [
      { to: ['power-bus', 'pdb'], scope: 'any', bus: 'power', label: 'Feeds the tray power path', group: 'Power path' },
      { to: 'rack-busbar', scope: 'any', bus: 'power', label: 'Rack busbar', group: 'Rack busbar' },
    ],
  },
  'gpu-coldplate': {
    role: 'Liquid flows through it, pulling heat off a GPU.',
    links: [
      { to: 'b200-gpu', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Cools this GPU', group: 'B200 GPU' },
      { to: 'uqd', scope: 'any', pick: 2, bus: 'cool', label: 'Supply / return to the rack', group: 'Quick disconnects' },
    ],
  },
  'cpu-coldplate': {
    role: 'Cools Grace, in series with the GPU loop.',
    links: [
      { to: 'grace-cpu', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Cools Grace', group: 'Grace CPU' },
      { to: 'gpu-coldplate', scope: 'any', pick: 2, bus: 'cool', label: 'Shares the GPU loop', group: 'GPU plates' },
    ],
  },
  'coolant-pipes': {
    role: 'Hoses: rack manifold → cold plates → back.',
    links: [
      { to: 'uqd', scope: 'any', pick: 2, bus: 'cool', label: 'Rack supply / return', group: 'UQDs' },
      { to: ['gpu-coldplate', 'switch-coldplate'], scope: 'any', pick: 2, bus: 'cool', label: 'Cold plates', group: 'Cold plates' },
      { to: 'cpu-coldplate', scope: 'any', pick: 'nearest', bus: 'cool', label: 'CPU cold plate', group: 'CPU plate' },
    ],
  },
  uqd: {
    role: 'Drip-free blind-mate coupling to the rack coolant manifold.',
    links: [
      { to: ['gpu-coldplate', 'switch-coldplate'], scope: 'any', pick: 4, bus: 'cool', label: 'Feeds the cold plates', group: 'Cold plates' },
      { to: 'rack-manifold', scope: 'any', bus: 'cool', label: 'Rack manifold', group: 'Manifold' },
    ],
  },
  'front-panel': {
    role: 'Network ports, drive bays, management I/O and handles.',
    links: [
      { to: ['cx7-card', 'switch-mgmt'], scope: 'any', bus: 'net', label: 'OSFP ports → ConnectX-7', group: 'CX-7', alt: { 'switch-mgmt': { label: 'Management ports', group: 'Mgmt' } } },
      { to: 'mgmt-module', scope: 'any', pick: 'nearest', bus: 'mgmt', label: 'BMC port, USB, display', group: 'Mgmt module' },
      { to: 'fans', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Intake air for the fans', group: 'Fans' },
    ],
  },
  chassis: { role: 'Steel sled; everything blind-mates at the rear.', links: [] },

  // ------------------------------------------------------------------ NVLink switch tray
  nvswitch: {
    role: 'One of 18 switch chips that make 72 GPUs one NVLink domain.',
    links: [
      { to: 'switch-nvlink-conn', scope: 'any', pick: 4, bus: 'nvlink', label: '72 ports · out to the spine', group: 'Backplane conns' },
      { to: TO_GPU, scope: 'any', via: ['switch-nvlink-conn', 'nvlink-spine', 'nvlink-conn'], bus: 'nvlink', label: 'Every GPU in the rack (4 shown)', group: 'B200 GPUs' },
      { to: 'switch-mgmt', scope: 'any', pick: 'nearest', bus: 'mgmt', label: 'Fabric manager / NVOS', group: 'Mgmt' },
      { to: 'switch-coldplate', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Liquid cooled', group: 'Cold plate' },
    ],
  },
  'switch-nvlink-conn': {
    role: 'Mates the switch tray into a cable cartridge.',
    links: [
      { to: 'nvswitch', scope: 'any', bus: 'nvlink', label: 'Both switch chips', group: 'Switch chips' },
      { to: 'nvlink-spine', scope: 'any', bus: 'nvlink', label: 'Cable cartridges', group: 'Spine' },
    ],
  },
  'switch-board': {
    role: 'Routes 144 NVLink ports from the chips to the rear.',
    links: [{ to: 'nvswitch', scope: 'any', bus: 'nvlink', label: 'NVLink switch chips', group: 'Switch chips' }],
  },
  'switch-mgmt': {
    role: 'Management CPU + BMC that configure the switch chips.',
    links: [
      { to: 'nvswitch', scope: 'any', bus: 'mgmt', label: 'Configures routing on both chips', group: 'Switch chips' },
      { to: 'mgmt-switch', scope: 'any', pick: 'nearest', bus: 'mgmt', label: 'Rack management network', group: 'Mgmt switch' },
    ],
  },
  'switch-cpu': { alias: 'switch-mgmt' },
  'switch-coldplate': {
    role: 'Cools an NVLink switch chip.',
    links: [
      { to: ['nvswitch', 'hgx-nvswitch'], scope: 'any', pick: 'nearest', bus: 'cool', label: 'Switch chip', group: 'Switch chip' },
      { to: 'uqd', scope: 'any', pick: 2, bus: 'cool', label: 'Rack supply / return', group: 'UQDs' },
    ],
  },

  // ------------------------------------------------------------------ HGX B200
  'hgx-nvswitch': {
    role: 'Lets every GPU talk to every other at full NVLink speed.',
    links: [
      { to: 'b200-gpu', scope: 'any', bus: 'nvlink', label: 'All 8 GPUs · 9 NVLinks from each', group: 'B200 GPUs' },
      { to: 'hgx-hmc', scope: 'any', bus: 'mgmt', label: 'Fabric bring-up & telemetry', group: 'HMC' },
    ],
  },
  'host-conn': {
    role: 'Cables to the separate x86 host tray.',
    links: [
      { to: 'b200-gpu', scope: 'any', bus: 'pcie', label: 'PCIe Gen5 x16 to each of the 8 GPUs', group: 'B200 GPUs' },
      { to: 'hgx-hmc', scope: 'any', bus: 'mgmt', label: 'Management sideband', group: 'HMC' },
    ],
  },
  'hgx-hmc': {
    role: 'Baseboard manager: GPU telemetry, firmware, fabric bring-up.',
    links: [
      { to: 'b200-gpu', scope: 'any', bus: 'mgmt', label: 'All 8 GPUs', group: 'B200 GPUs' },
      { to: 'hgx-nvswitch', scope: 'any', bus: 'mgmt', label: 'Both NVLink switches', group: 'NVLink switches' },
      { to: 'host-conn', scope: 'any', bus: 'mgmt', label: 'To the host\'s BMC', group: 'Host link' },
    ],
  },
  'hgx-baseboard': {
    role: 'Wires 8 GPUs to 2 NVLink switches and the host links.',
    links: [
      { to: 'hgx-nvswitch', scope: 'any', bus: 'nvlink', label: 'NVLink 5 switches', group: 'NVLink switches' },
      { to: 'host-conn', scope: 'any', bus: 'pcie', label: 'Host connectors', group: 'Host link' },
    ],
  },
  'gpu-module': { alias: 'b200-gpu' },
  'gpu-heatsink': {
    role: 'Air cooler: vapor chamber, heat pipes and a tall fin stack.',
    links: [
      { to: 'b200-gpu', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Cools this GPU (~1 kW)', group: 'B200 GPU' },
      { to: 'fans', scope: 'any', bus: 'cool', label: 'Air from the fan wall', group: 'Fans' },
    ],
  },
  'switch-heatsink': {
    role: 'Air coolers for the two NVLink switch chips.',
    links: [{ to: 'hgx-nvswitch', scope: 'any', bus: 'cool', label: 'Both switch chips', group: 'Switch chips' }],
  },

  // ------------------------------------------------------------------ NVL72 rack
  'compute-tray': {
    role: '2 superchips = 2 Grace + 4 B200. 18 per rack.',
    links: [
      { to: 'nvlink-spine', scope: 'any', bus: 'nvlink', label: 'NVLink 5 into all 4 cable cartridges', group: 'Spine' },
      { to: 'rack-busbar', scope: 'any', bus: 'power', label: 'DC power from the busbar', group: 'Busbar' },
      { to: 'rack-manifold', scope: 'any', bus: 'cool', label: 'Coolant supply / return', group: 'Manifolds' },
      { to: 'mgmt-switch', scope: 'any', pick: 'nearest', bus: 'mgmt', label: 'BMC on the management network', group: 'Mgmt switch' },
    ],
  },
  'switch-tray': {
    role: '2 NVLink switch chips. 9 per rack.',
    links: [
      { to: 'nvlink-spine', scope: 'any', bus: 'nvlink', label: 'Every compute tray via the spine', group: 'Spine' },
      { to: 'compute-tray', scope: 'any', via: ['nvlink-spine'], bus: 'nvlink', label: 'All 18 compute trays', group: 'Compute trays' },
      { to: 'rack-busbar', scope: 'any', bus: 'power', label: 'DC power', group: 'Busbar' },
    ],
  },
  'nvlink-spine': {
    role: '~5,000 copper cables: every GPU to every switch chip.',
    links: [
      { to: 'compute-tray', scope: 'any', bus: 'nvlink', label: '18 compute trays · 72 GPUs', group: 'Compute trays' },
      { to: 'switch-tray', scope: 'any', bus: 'nvlink', label: '9 switch trays · 18 chips', group: 'Switch trays' },
    ],
  },
  'power-shelf': {
    role: 'Six 5.5 kW supplies: facility AC → 54 V DC.',
    links: [{ to: 'rack-busbar', scope: 'any', bus: 'power', label: 'Into the DC busbar', group: 'Busbar' }],
  },
  'rack-busbar': {
    role: 'Vertical copper bus: power shelves → every tray.',
    links: [
      { to: 'power-shelf', scope: 'any', bus: 'power', label: '8 power shelves', group: 'Power shelves' },
      { to: ['compute-tray', 'switch-tray'], scope: 'any', bus: 'power', label: 'Every tray (~120 kW)', group: 'Trays' },
    ],
  },
  'rack-manifold': {
    role: 'Supply / return water to every tray.',
    links: [
      { to: 'compute-tray', scope: 'any', bus: 'cool', label: 'All compute trays', group: 'Compute trays' },
      { to: 'switch-tray', scope: 'any', bus: 'cool', label: 'All switch trays', group: 'Switch trays' },
    ],
  },
  'mgmt-switch': {
    role: 'Out-of-band Ethernet for every BMC and the fabric manager.',
    links: [{ to: ['compute-tray', 'switch-tray'], scope: 'any', bus: 'mgmt', label: 'Every tray\'s BMC', group: 'Trays' }],
  },
  'rack-frame': { role: 'MGX rack: trays slide in from the front, mate at the rear.', links: [] },

  // ------------------------------------------------------------------ Apple M5 Ultra package
  'm5-ultra': {
    role: 'The whole computer on one package: CPU, GPU, Neural Engine, memory and I/O share one pool of memory.',
    links: [
      { to: 'apple-lpddr', scope: 'any', bus: 'umem', label: '8 LPDDR5X packages · 1.2 TB/s, up to 512 GB', group: 'Unified memory' },
      { to: 'ultrafusion', scope: 'self', bus: 'ufusion', label: 'Joins the two M5 Max halves', group: 'UltraFusion' },
      { to: 'ssd-module', scope: 'any', bus: 'nand', label: 'Built-in SSD controller → NAND modules', group: 'SSD modules' },
      { to: 'tb5-port', scope: 'any', via: ['tb5-retimer'], bus: 'tb5', label: '6 Thunderbolt 5 ports · 80 Gb/s each', group: 'Thunderbolt 5' },
      { to: 'eth-10g', scope: 'any', bus: 'io', label: '10 GbE controller', group: '10 GbE' },
      { to: 'soc-vrm', scope: 'any', pick: 6, bus: 'power', label: 'Power from the regulators around it', group: 'Voltage regulators' },
      { to: 'mac-heatsink', scope: 'any', bus: 'cool', label: 'Heat out to the copper heatsink', group: 'Heatsink' },
    ],
  },
  'gpu-tile': {
    role: 'Graphics and AI math, the system level cache and the memory controllers.',
    links: [
      { to: 'cpu-tile', scope: 'any', pick: 'nearest', bus: 'soic', label: 'Its CPU tile · hybrid bond, very short wires', group: 'CPU tile' },
      { to: 'gpu-tile', scope: 'any', pick: 'nearest', bus: 'ufusion', label: 'The other GPU tile · UltraFusion > 4.4 TB/s', group: 'Other half' },
      { to: 'apple-lpddr', scope: 'any', pick: 4, bus: 'umem', label: '4 nearest LPDDR5X packages · 512-bit', group: 'LPDDR5X' },
    ],
  },
  'cpu-tile': {
    role: '6 super cores and 12 performance cores, the Neural Engine and the I/O controllers.',
    links: [
      { to: 'gpu-tile', scope: 'any', pick: 'nearest', bus: 'soic', label: 'Its GPU tile · memory and cache live there', group: 'GPU tile' },
      { to: 'tb5-port', scope: 'any', pick: 3, via: ['tb5-retimer'], bus: 'tb5', label: '3 Thunderbolt 5 ports per tile', group: 'Thunderbolt 5' },
      { to: 'ssd-module', scope: 'any', pick: 'nearest', bus: 'nand', label: 'SSD controller → NAND module', group: 'SSD' },
    ],
  },
  ultrafusion: {
    role: 'Silicon bridge that makes two chips act as one.',
    links: [{ to: 'gpu-tile', scope: 'any', bus: 'ufusion', label: 'Both GPU tiles · >4.4 TB/s', group: 'GPU tiles' }],
  },
  'apple-interposer': {
    role: 'Silicon base under one M5 Max that both of its tiles bond onto.',
    links: [{ to: ['gpu-tile', 'cpu-tile'], scope: 'any', pick: 2, bus: 'soic', label: 'Carries the tile-to-tile wiring', group: 'Tiles' }],
  },
  'apple-lpddr': {
    role: 'Memory that the CPU, GPU and Neural Engine all share, with no copies between them.',
    links: [{ to: 'gpu-tile', scope: 'any', pick: 'nearest', bus: 'umem', label: 'Memory controllers on the GPU tile', group: 'GPU tile' }],
  },
  'apple-lid': {
    role: 'Spreads the heat of the four tiles.',
    links: [{ to: ['mac-heatsink', 'gpu-tile'], scope: 'any', bus: 'cool', label: 'Into the heatsink', group: 'Heatsink', alt: { 'gpu-tile': { label: 'Draws heat from the tiles below', group: 'Tiles' } } }],
  },

  // ------------------------------------------------------------------ Mac Studio
  'mac-board': { alias: 'm5-ultra' },
  'soc-vrm': {
    role: 'Steps 12 V down to the SoC\'s sub-1 V rails.',
    links: [
      { to: 'm5-ultra', scope: 'any', bus: 'power', label: 'Core rails into the M5 Ultra', group: 'M5 Ultra' },
      { to: 'mac-busbar', scope: 'any', bus: 'power', label: '12 V in from the bus bar', group: 'Bus bar' },
    ],
  },
  'ssd-module': {
    role: 'Raw NAND flash; the controller is in the SoC.',
    links: [{ to: 'm5-ultra', scope: 'any', bus: 'nand', label: 'PCIe to the SoC\'s storage controller', group: 'M5 Ultra' }],
  },
  'tb5-port': {
    role: 'Thunderbolt 5: displays, storage, or another Mac in a cluster.',
    links: [
      { to: 'm5-ultra', scope: 'any', via: ['tb5-retimer'], bus: 'tb5', label: 'Straight to the SoC\'s TB5 controller', group: 'M5 Ultra' },
      { to: 'tb5-cable', scope: 'any', pick: 'nearest', bus: 'tb5', label: 'Cable to another Mac', group: 'TB5 cable' },
    ],
  },
  'tb5-retimer': {
    role: 'Re-drives the 80 Gb/s Thunderbolt signal.',
    links: [
      { to: 'tb5-port', scope: 'any', pick: 'nearest', bus: 'tb5', label: 'Its port', group: 'Port' },
      { to: 'm5-ultra', scope: 'any', bus: 'tb5', label: 'SoC', group: 'M5 Ultra' },
    ],
  },
  'eth-10g': {
    role: 'Turns the SoC\'s PCIe lane into 10 Gb Ethernet.',
    links: [
      { to: 'eth-port', scope: 'any', pick: 'nearest', bus: 'io', label: 'RJ45 port', group: 'Port' },
      { to: 'm5-ultra', scope: 'any', bus: 'io', label: 'PCIe to the SoC', group: 'M5 Ultra' },
    ],
  },
  'eth-port': {
    role: '10 Gb Ethernet.',
    links: [
      { to: 'eth-10g', scope: 'any', pick: 'nearest', bus: 'io', label: 'Ethernet controller', group: 'Controller' },
      { to: 'eth-switch', scope: 'any', via: ['eth-cable'], bus: 'net', label: 'To the 10 GbE switch', group: 'Switch' },
    ],
  },
  'usb-port': { role: 'USB-A, 5 Gb/s.', links: [{ to: 'm5-ultra', scope: 'any', bus: 'io', label: 'SoC USB controller', group: 'M5 Ultra' }] },
  'hdmi-port': { role: 'Display output.', links: [{ to: 'm5-ultra', scope: 'any', bus: 'io', label: 'Display engine in the SoC', group: 'M5 Ultra' }] },
  'audio-port': { role: 'Headphones.', links: [] },
  'sd-slot': { role: 'SD card reader.', links: [{ to: 'm5-ultra', scope: 'any', via: ['front-io'], bus: 'io', label: 'Through the front I/O board', group: 'M5 Ultra' }] },
  'front-io': {
    role: 'Front ports, cabled to the logic board.',
    links: [{ to: 'm5-ultra', scope: 'any', bus: 'tb5', label: 'Flex cable to the logic board', group: 'M5 Ultra' }],
  },
  'n1-chip': { role: 'Apple\'s own wireless chip.', links: [{ to: 'm5-ultra', scope: 'any', bus: 'io', label: 'PCIe to the SoC', group: 'M5 Ultra' }] },
  pmic: { role: 'Power sequencing and supervision.', links: [{ to: 'soc-vrm', scope: 'any', pick: 4, bus: 'mgmt', label: 'Controls the regulators', group: 'Regulators' }] },
  psu: {
    role: 'Mains AC → 12 V DC, 480 W, built in.',
    links: [
      { to: 'ac-inlet', scope: 'any', pick: 'nearest', bus: 'power', label: 'AC in', group: 'AC inlet' },
      { to: 'mac-busbar', scope: 'any', pick: 'nearest', bus: 'power', label: '12 V out over the bus bar', group: 'Bus bar' },
      { to: 'blower', scope: 'any', pick: 2, bus: 'cool', label: 'Cooled by the same airflow', group: 'Fans' },
    ],
  },
  'ac-inlet': { role: 'Mains power in.', links: [{ to: 'psu', scope: 'any', pick: 'nearest', bus: 'power', label: 'To the PSU', group: 'PSU' }] },
  'mac-busbar': {
    role: 'Copper bar carrying 12 V to the board.',
    links: [
      { to: 'psu', scope: 'any', pick: 'nearest', bus: 'power', label: 'From the PSU', group: 'PSU' },
      { to: 'soc-vrm', scope: 'any', pick: 4, bus: 'power', label: 'To the SoC regulators', group: 'Regulators' },
    ],
  },
  blower: {
    role: 'Moves air from the foot, through the heatsink, out the back.',
    links: [
      { to: 'mac-foot', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Air in through the foot', group: 'Intake' },
      { to: 'mac-heatsink', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Air out through the fins', group: 'Heatsink' },
    ],
  },
  'mac-heatsink': {
    role: 'Copper base + fins over the SoC.',
    links: [
      { to: 'm5-ultra', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Heat from the M5 Ultra', group: 'M5 Ultra' },
      { to: 'blower', scope: 'any', pick: 2, bus: 'cool', label: 'Air from both blowers', group: 'Blowers' },
    ],
  },
  'mac-foot': { role: 'Cool air enters around the base.', links: [{ to: 'blower', scope: 'any', pick: 2, bus: 'cool', label: 'Up into the blowers', group: 'Blowers' }] },
  'mac-shell': { role: 'Aluminium unibody; exhaust grille on the back.', links: [{ to: 'mac-heatsink', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Hot air leaves through the rear grille', group: 'Heatsink' }] },

  // ------------------------------------------------------------------ Mac Studio cluster
  'mac-studio': {
    role: 'One cluster node: M5 Ultra, up to 512 GB of unified memory.',
    links: [
      { to: 'mac-studio', scope: 'any', via: ['tb5-cable'], bus: 'tb5', label: 'The other 3 Macs · TB5 + RDMA, full mesh', group: 'Peers' },
      { to: 'eth-switch', scope: 'any', via: ['eth-cable'], bus: 'net', label: '10 GbE switch', group: 'Switch' },
      { to: 'power-strip', scope: 'any', via: ['ac-cord'], bus: 'power', label: 'Mains power', group: 'Power strip' },
    ],
  },
  'tb5-cable': {
    role: 'A direct Mac-to-Mac link: there is no Thunderbolt switch.',
    links: [{ to: 'mac-studio', scope: 'any', pick: 2, bus: 'tb5', label: 'The two Macs it joins', group: 'Ends' }],
  },
  'eth-switch': { role: 'Ordinary Ethernet for logins and storage.', links: [{ to: 'mac-studio', scope: 'any', via: ['eth-cable'], bus: 'net', label: 'All 4 Macs', group: 'Macs' }] },
  'eth-cable': { role: 'Cat 6A, 10 Gb/s.', links: [{ to: 'eth-switch', scope: 'any', bus: 'net', label: 'Switch', group: 'Switch' }] },
  'ac-cord': { role: 'Mains power cord.', links: [{ to: 'power-strip', scope: 'any', bus: 'power', label: 'Power strip', group: 'Strip' }] },
  'power-strip': { role: 'Mains power for the four Macs.', links: [{ to: 'mac-studio', scope: 'any', via: ['ac-cord'], bus: 'power', label: 'All 4 Macs', group: 'Macs' }] },
  'mini-rack': { role: '10-inch open frame, one shelf per Mac.', links: [] },
};

/** The live bus legend: the base set plus the overrides of the family on screen. */
export const BUSES = { ...BASE_BUSES };

// While a family is on screen, its own connection table is consulted before the global one.
let scoped = null;
export function setConnectionScope({ connections = null, buses = null } = {}) {
  scoped = connections;
  for (const k of Object.keys(BUSES)) delete BUSES[k];
  Object.assign(BUSES, BASE_BUSES, buses || {});
}

const entry = (id) => scoped?.[id] ?? CONNECTIONS[id];
export function lookup(id) {
  let e = entry(id);
  let guard = 0;
  while (e && e.alias && guard++ < 4) e = entry(e.alias);
  return e || null;
}
