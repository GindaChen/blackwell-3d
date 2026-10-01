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

export const BUSES = {
  nvlink: { name: 'NVLink 6', color: '#38d5ff' },
  c2c: { name: 'NVLink-C2C', color: '#9be22d' },
  hbm: { name: 'HBM4', color: '#ffb547' },
  d2d: { name: 'Die-to-die', color: '#ffe08a' },
  lpddr: { name: 'LPDDR5X', color: '#ffd166' },
  lp5: { name: 'LPDDR5', color: '#ffd166' },
  pcie: { name: 'PCIe Gen6', color: '#b88cff' },
  net: { name: 'Network', color: '#ff7ad9' },
  power: { name: 'Power', color: '#ff5a5a' },
  cool: { name: 'Coolant', color: '#4aa8ff' },
  mgmt: { name: 'Management', color: '#d6d6d6' },
};

const GPU_POWER = { to: ['power-stage'], scope: 'superchip', pick: 6, bus: 'power', label: 'Power from the VRM stages around it', group: 'VRM power stages' };

export const CONNECTIONS = {
  // ------------------------------------------------------------------ superchip
  'rubin-gpu': {
    role: 'Does the AI math: tensor cores for training and inference.',
    links: [
      { to: 'hbm4', scope: 'self', bus: 'hbm', label: '8 HBM4 stacks · 22 TB/s', group: 'HBM4 ×8' },
      { to: 'vera-cpu', scope: 'superchip', bus: 'c2c', label: 'Vera CPU · coherent shared memory', group: 'Vera CPU' },
      { to: 'nvswitch', scope: 'any', bus: 'nvlink', label: 'All 4 NVLink 6 switches · 3.6 TB/s', group: 'NVLink switches' },
      { to: 'host-conn', scope: 'any', pick: 'nearest', bus: 'pcie', label: 'PCIe Gen6 to the host CPU tray', group: 'Host link' },
      { to: 'nvlink-conn', scope: 'superchip', pick: 'nearest', bus: 'nvlink', label: 'Spine → 72 GPUs · 3.6 TB/s', group: 'NVLink spine' },
      { to: ['cx9', 'midplane-conn'], scope: 'any', pick: 2, via: ['midplane-conn', 'midplane'], bus: 'net', label: '2× ConnectX-9 · 1.6 Tb/s scale-out', group: 'SuperNICs', alt: { 'midplane-conn': { label: 'Out via midplane to 2× ConnectX-9 (1.6 Tb/s)', group: 'To SuperNICs' } } },
      GPU_POWER,
      { to: 'gpu-coldplate', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Heat out to the liquid loop', group: 'Cold plate' },
    ],
  },
  'rubin-die': {
    role: 'One of two compute dies; the pair behaves as a single GPU.',
    links: [
      { to: 'rubin-die', scope: { ancestor: 'rubin-gpu' }, bus: 'd2d', label: 'Sibling die · NV-HBI die-to-die link', group: 'Sibling die' },
      { to: 'hbm4', scope: { ancestor: 'rubin-gpu' }, pick: 4, bus: 'hbm', label: '4 nearest HBM4 stacks', group: 'HBM4' },
    ],
  },
  hbm4: {
    role: 'Stacked DRAM beside the die (36 GB): the GPU\'s working memory.',
    links: [{ to: 'rubin-die', scope: { ancestor: 'rubin-gpu' }, pick: 'nearest', bus: 'hbm', label: 'Compute die · ~2.75 TB/s via interposer', group: 'Compute die' }],
  },
  'gpu-interposer': {
    role: 'Silicon bridge that wires the dies and HBM together.',
    links: [
      { to: 'rubin-die', scope: { ancestor: 'rubin-gpu' }, bus: 'd2d', label: 'Both compute dies', group: 'Dies' },
      { to: 'hbm4', scope: { ancestor: 'rubin-gpu' }, bus: 'hbm', label: 'All 8 HBM4 stacks', group: 'HBM4 ×8' },
    ],
  },
  'gpu-substrate': {
    role: 'Fans thousands of die bumps out to the board.',
    links: [{ to: 'rubin-die', scope: { ancestor: 'rubin-gpu' }, bus: 'pcie', label: 'Carries all GPU I/O + power', group: 'Dies' }],
  },
  'gpu-stiffener': { role: 'Keeps the huge package flat under clamping load.', links: [] },
  'gpu-lid': {
    role: 'Heat spreader between the dies and the cold plate.',
    links: [{ to: 'rubin-die', scope: { ancestor: 'rubin-gpu' }, bus: 'cool', label: 'Pulls heat off both dies', group: 'Dies' }],
  },
  'vera-cpu': {
    role: 'Runs the OS, data prep and orchestration; feeds both GPUs.',
    links: [
      { to: 'rubin-gpu', scope: 'superchip', bus: 'c2c', label: 'Both GPUs · 1.8 TB/s coherent', group: 'Rubin GPUs' },
      { to: 'socamm', scope: 'superchip', bus: 'lpddr', label: '8 SOCAMMs · 1.2 TB/s, up to 1.5 TB', group: 'SOCAMM ×8' },
      { to: ['bf4', 'midplane-conn'], scope: 'any', pick: 'nearest', via: ['midplane-conn', 'midplane'], bus: 'pcie', label: 'BlueField-4 DPU · storage, NICs', group: 'BlueField-4', alt: { 'midplane-conn': { label: 'Out via midplane to BlueField-4, storage, NICs', group: 'PCIe Gen6' } } },
      { to: 'cpu-coldplate', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Heat out to the liquid loop', group: 'Cold plate' },
    ],
  },
  'vera-die': { alias: 'vera-cpu' },
  'cpu-substrate': { alias: 'vera-cpu' },
  'cpu-frame': { role: 'Spreads cold-plate clamping force around the bare die.', links: [] },
  socamm: {
    role: 'Swappable LPDDR5X memory module for the CPU.',
    links: [
      { to: 'vera-cpu', scope: 'superchip', bus: 'lpddr', label: 'LPDDR5X channels to Vera', group: 'Vera CPU' },
      { to: 'socamm-coldplate', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Cooled by memory cold plate', group: 'Cold plate' },
    ],
  },
  'nvlink-conn': {
    role: 'Blind-mates into the rack\'s copper NVLink spine.',
    links: [{ to: 'rubin-gpu', scope: 'superchip', pick: 'nearest', bus: 'nvlink', label: 'Carries this GPU\'s NVLink 6 lanes', group: 'Rubin GPU' }],
  },
  'midplane-conn': {
    role: 'Cable-free plug from the superchip into the tray midplane.',
    links: [
      { to: 'vera-cpu', scope: 'superchip', bus: 'pcie', label: 'CPU PCIe Gen6', group: 'Vera CPU' },
      { to: 'rubin-gpu', scope: 'superchip', bus: 'net', label: 'GPU → SuperNIC lanes', group: 'Rubin GPUs' },
      { to: 'midplane', scope: 'any', pick: 'nearest', bus: 'pcie', label: 'Into the PCIe Gen6 midplane', group: 'Midplane' },
    ],
  },
  'vrm-inductor': {
    role: 'Smooths the switched current of the multiphase regulators.',
    links: [
      { to: 'drmos', scope: 'superchip', pick: 4, bus: 'power', label: 'Fed by smart power stages', group: 'Power stages' },
      { to: ['vera-cpu'], scope: 'superchip', pick: 'nearest', bus: 'power', label: 'Supplies CPU / SOC rails', group: 'Load' },
    ],
  },
  'power-stage': {
    role: 'Delivers high current at <1 V right next to the chip.',
    links: [{ to: ['rubin-gpu', 'vera-cpu'], scope: 'superchip', pick: 'nearest', bus: 'power', label: 'Feeds the nearest processor', group: 'Load' }],
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
    links: [{ to: ['rubin-gpu', 'vera-cpu'], scope: 'superchip', pick: 'nearest', bus: 'power', label: 'Steadies the nearest supply rail', group: 'Load' }],
  },
  mlcc: {
    role: 'Tiny ceramic capacitor that absorbs nanosecond current spikes.',
    links: [{ to: ['rubin-gpu', 'vera-cpu'], scope: 'superchip', pick: 'nearest', bus: 'power', label: 'Decouples the nearest chip', group: 'Load' }],
  },
  resistor: { role: 'Pull-ups, current sense and signal termination.', links: [] },
  'inductor-s': {
    role: 'Inductor for auxiliary (I/O, standby) rails.',
    links: [{ to: 'vrm-ctrl', scope: 'superchip', pick: 'nearest', bus: 'power', label: 'Aux rail regulation', group: 'Controller' }],
  },
  'vrm-ctrl': {
    role: 'Digital controller that orchestrates many VRM phases.',
    links: [
      { to: 'drmos', scope: 'superchip', pick: 8, bus: 'mgmt', label: 'Drives the power stages', group: 'Power stages' },
      { to: 'cpld', scope: 'superchip', bus: 'mgmt', label: 'Enable / telemetry (PMBus)', group: 'CPLD' },
    ],
  },
  cpld: {
    role: 'Board housekeeper: power sequencing, resets, telemetry.',
    links: [
      { to: 'vrm-ctrl', scope: 'superchip', bus: 'mgmt', label: 'Sequences VRM rails', group: 'VRM ctrl' },
      { to: 'vera-cpu', scope: 'superchip', bus: 'mgmt', label: 'Reset / boot strap', group: 'Vera CPU' },
      { to: ['bmc', 'midplane-conn'], scope: 'any', pick: 'nearest', via: ['midplane-conn'], bus: 'mgmt', label: 'Sideband to the tray BMC', group: 'BMC', alt: { 'midplane-conn': { label: 'Sideband out to the tray BMC', group: 'To BMC' } } },
    ],
  },
  flash: {
    role: 'Holds firmware the CPU boots from.',
    links: [{ to: 'vera-cpu', scope: 'superchip', bus: 'mgmt', label: 'SPI boot', group: 'Vera CPU' }],
  },
  i2c: { role: 'Fans out the slow management bus.', links: [{ to: 'cpld', scope: 'superchip', bus: 'mgmt', label: 'I²C to the CPLD', group: 'CPLD' }] },
  temp: { role: 'Reports board temperature.', links: [{ to: 'cpld', scope: 'superchip', bus: 'mgmt', label: 'I²C telemetry', group: 'CPLD' }] },
  osc: { role: 'Reference clock for board logic.', links: [{ to: 'cpld', scope: 'superchip', bus: 'mgmt', label: 'Clock', group: 'CPLD' }] },
  'aux-conn': { role: 'Factory debug / programming header.', links: [{ to: 'cpld', scope: 'superchip', bus: 'mgmt', label: 'JTAG / debug', group: 'CPLD' }] },
  pcb: { role: 'Dozens of copper layers carrying every link shown on hover.', links: [] },

  // ------------------------------------------------------------------ tray
  superchip: {
    role: '1 CPU + 2 GPUs. Two per tray, 18 trays = 72 GPUs per rack.',
    links: [
      { to: 'midplane', scope: 'any', pick: 'nearest', bus: 'pcie', label: 'PCIe Gen6 midplane', group: 'Midplane' },
      { to: 'pdb', scope: 'any', bus: 'power', label: 'Power distribution boards', group: 'PDB' },
      { to: 'gpu-coldplate', scope: 'any', pick: 2, bus: 'cool', label: 'GPU cold plates', group: 'Cold plates' },
    ],
  },
  cx9: {
    role: '800 Gb/s SuperNIC linking a GPU to other racks.',
    links: [
      { to: 'rubin-gpu', scope: 'any', pick: 'nearest', via: ['io-midplane', 'midplane'], bus: 'net', label: 'Dedicated to one GPU · PCIe Gen6', group: 'Rubin GPU' },
      { to: 'front-panel', scope: 'any', pick: 'nearest', bus: 'net', label: 'Out to the Spectrum-X / Quantum fabric', group: 'Ports' },
    ],
  },
  'nic-module': {
    role: 'Hot-swap carrier holding 4 ConnectX-9 SuperNICs.',
    links: [
      { to: 'cx9', scope: 'self', bus: 'net', label: '4× ConnectX-9', group: 'CX9 ×4' },
      { to: 'io-midplane', scope: 'any', pick: 'nearest', bus: 'pcie', label: 'Plugs into the I/O midplane', group: 'I/O midplane' },
    ],
  },
  bf4: { alias: 'bf4-card' },
  'bf4-card': {
    role: 'DPU: runs networking, storage and security off the CPU.',
    links: [
      { to: 'vera-cpu', scope: 'any', via: ['midplane'], bus: 'pcie', label: 'Both Vera CPUs · PCIe Gen6', group: 'Vera CPUs' },
      { to: 'bf4-lpddr', scope: 'any', bus: 'lp5', label: 'Own LPDDR5 memory', group: 'LPDDR5' },
      { to: 'front-cover', scope: 'any', pick: 'nearest', bus: 'pcie', label: 'NVMe storage (E1.S)', group: 'Storage' },
      { to: 'mgmt-module', scope: 'any', pick: 'nearest', bus: 'mgmt', label: 'Management / secure boot', group: 'Mgmt' },
    ],
  },
  'bf4-lpddr': { role: 'Memory for BlueField\'s Grace cores.', links: [{ to: 'bf4', scope: 'any', pick: 'nearest', bus: 'lp5', label: 'BlueField-4', group: 'BlueField-4' }] },
  'mgmt-module': {
    role: 'Tray management: BMC, root of trust, front-panel I/O.',
    links: [
      { to: 'bmc', scope: 'self', bus: 'mgmt', label: 'BMC', group: 'BMC' },
      { to: 'io-midplane', scope: 'any', pick: 'nearest', bus: 'pcie', label: 'I/O midplane', group: 'I/O midplane' },
    ],
  },
  bmc: {
    role: 'Out-of-band manager: power, sensors, firmware, remote console.',
    links: [
      { to: 'cpld', scope: 'any', via: ['io-midplane', 'midplane'], bus: 'mgmt', label: 'Each superchip\'s CPLD (sideband)', group: 'CPLDs' },
      { to: 'pdb', scope: 'any', bus: 'mgmt', label: 'Power control (PMBus)', group: 'PDB' },
      { to: 'front-panel', scope: 'any', bus: 'mgmt', label: 'RJ45 management port', group: 'Mgmt port' },
    ],
  },
  hmc: {
    role: 'Collects GPU telemetry and attests firmware.',
    links: [{ to: 'rubin-gpu', scope: 'any', via: ['io-midplane', 'midplane'], bus: 'mgmt', label: 'All 4 GPUs · telemetry / RAS', group: 'GPUs' }],
  },
  pdb: {
    role: 'Converts busbar power to rails for the boards.',
    links: [
      { to: 'busbar', scope: 'any', bus: 'power', label: 'DC in from the rack busbar', group: 'Busbar' },
      { to: ['superchip', 'gpu-module'], scope: 'any', bus: 'power', label: 'Out to both superchips', group: 'Superchips', alt: { 'gpu-module': { label: 'Out to all 8 GPU modules', group: 'GPU modules' } } },
    ],
  },
  busbar: {
    role: 'The tray\'s only power input: clips onto the rack busbar.',
    links: [{ to: 'pdb', scope: 'any', bus: 'power', label: 'Feeds the PDBs', group: 'PDB' }],
  },
  'io-midplane': {
    role: 'Links front modules to the DPU and main midplane.',
    links: [
      { to: 'nic-module', scope: 'any', bus: 'pcie', label: 'SuperNIC modules', group: 'NIC modules' },
      { to: 'mgmt-module', scope: 'any', bus: 'pcie', label: 'Management module', group: 'Mgmt' },
      { to: 'midplane', scope: 'any', bus: 'pcie', label: 'Main midplane', group: 'Midplane' },
    ],
  },
  midplane: {
    role: 'Cable-free PCIe Gen6 backbone of the tray.',
    links: [
      { to: 'midplane-conn', scope: 'any', bus: 'pcie', label: 'Both superchips', group: 'Superchip conns' },
      { to: 'bf4-card', scope: 'any', bus: 'pcie', label: 'BlueField-4', group: 'BlueField-4' },
      { to: 'io-midplane', scope: 'any', bus: 'pcie', label: 'Front I/O midplane', group: 'I/O midplane' },
    ],
  },
  'gpu-coldplate': {
    role: 'Liquid flows through it, pulling heat off a GPU.',
    links: [
      { to: 'rubin-gpu', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Cools this GPU', group: 'Rubin GPU' },
      { to: ['gpu-manifold', 'uqd'], scope: 'any', bus: 'cool', label: 'Supply / return to the rack', group: 'Quick disconnects', alt: { 'gpu-manifold': { label: 'Supply / return via the manifold', group: 'Manifold' } } },
    ],
  },
  'cpu-coldplate': {
    role: 'Cools the Vera CPU, in series with the GPU loop.',
    links: [
      { to: 'vera-cpu', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Cools Vera', group: 'Vera CPU' },
      { to: 'gpu-coldplate', scope: 'any', pick: 2, bus: 'cool', label: 'Shares the GPU loop', group: 'GPU plates' },
    ],
  },
  'socamm-coldplate': {
    role: 'Presses a thermal pad onto four SOCAMM modules.',
    links: [{ to: 'socamm', scope: 'any', pick: 4, bus: 'cool', label: 'Cools 4 memory modules', group: 'SOCAMM ×4' }],
  },
  'coolant-pipes': {
    role: 'Brazed copper loop: rack manifold → cold plates → back.',
    links: [
      { to: 'uqd', scope: 'any', bus: 'cool', label: 'Rack supply / return', group: 'UQDs' },
      { to: 'gpu-coldplate', scope: 'any', pick: 2, bus: 'cool', label: 'GPU cold plates', group: 'GPU plates' },
      { to: 'cpu-coldplate', scope: 'any', pick: 'nearest', bus: 'cool', label: 'CPU cold plate', group: 'CPU plate' },
    ],
  },
  uqd: {
    role: 'Drip-free blind-mate coupling to the rack coolant manifold.',
    links: [{ to: ['gpu-manifold', 'gpu-coldplate'], scope: 'any', bus: 'cool', label: 'Feeds the GPU cold plates', group: 'GPU plates', alt: { 'gpu-manifold': { label: 'Into the manifold spine', group: 'Manifold' } } }],
  },
  // ------------------------------------------------------------------ HGX NVL8 GPU tray
  nvswitch: {
    role: 'Lets every GPU talk to every other at full NVLink speed.',
    links: [
      { to: 'rubin-gpu', scope: 'any', bus: 'nvlink', label: 'All 8 GPUs · 3.6 TB/s each', group: 'Rubin GPUs' },
      { to: 'hgx-hmc', scope: 'any', bus: 'mgmt', label: 'Fabric bring-up & telemetry', group: 'HMC' },
    ],
  },
  'host-conn': {
    role: 'Cables to the separate CPU tray (Vera or x86 host).',
    links: [
      { to: 'rubin-gpu', scope: 'any', pick: 4, bus: 'pcie', label: 'PCIe Gen6 from the nearest 4 GPUs', group: 'Rubin GPUs' },
      { to: 'hgx-hmc', scope: 'any', bus: 'mgmt', label: 'Management sideband', group: 'HMC' },
    ],
  },
  'hgx-hmc': {
    role: 'Baseboard manager: GPU telemetry, firmware, fabric bring-up.',
    links: [
      { to: 'rubin-gpu', scope: 'any', bus: 'mgmt', label: 'All 8 GPUs', group: 'Rubin GPUs' },
      { to: 'nvswitch', scope: 'any', bus: 'mgmt', label: 'All 4 NVLink switches', group: 'NVLink switches' },
      { to: 'host-conn', scope: 'any', bus: 'mgmt', label: 'To the host\'s BMC', group: 'Host link' },
    ],
  },
  'hgx-baseboard': {
    role: 'Wires 8 GPUs to 4 NVLink switches and the host links.',
    links: [
      { to: 'nvswitch', scope: 'any', bus: 'nvlink', label: 'NVLink 6 switches', group: 'NVLink switches' },
      { to: 'host-conn', scope: 'any', bus: 'pcie', label: 'Host connectors', group: 'Host link' },
    ],
  },
  'gpu-module': { alias: 'rubin-gpu' },
  'switch-coldplate': {
    role: 'Cools the four NVLink 6 switch chips.',
    links: [{ to: 'nvswitch', scope: 'any', bus: 'cool', label: 'All 4 NVLink switches', group: 'NVLink switches' }],
  },
  'gpu-manifold': {
    role: 'Splits coolant into 8 parallel loops, one per GPU.',
    links: [
      { to: 'gpu-coldplate', scope: 'any', bus: 'cool', label: 'All 8 GPU cold plates', group: 'Cold plates' },
      { to: 'uqd', scope: 'any', bus: 'cool', label: 'Rack supply / return', group: 'UQDs' },
    ],
  },
  'qd-coupling': {
    role: 'Drip-free couplings so a GPU can be swapped without draining.',
    links: [
      { to: 'gpu-manifold', scope: 'any', bus: 'cool', label: 'Manifold spine', group: 'Manifold' },
      { to: 'gpu-coldplate', scope: 'any', bus: 'cool', label: 'Each cold plate', group: 'Cold plates' },
    ],
  },
  'front-panel': {
    role: 'Management I/O, storage bays, handles and ejectors.',
    links: [{ to: 'mgmt-module', scope: 'any', pick: 'nearest', bus: 'mgmt', label: 'BMC port, USB, display', group: 'Mgmt module' }],
  },
  'front-cover': {
    role: 'Vented cover over the E1.S NVMe drives.',
    links: [{ to: 'bf4', scope: 'any', pick: 'nearest', bus: 'pcie', label: 'NVMe via BlueField-4', group: 'BlueField-4' }],
  },
  chassis: { role: '1U steel sled; everything blind-mates at the rear.', links: [] },
};

export function lookup(id) {
  let e = CONNECTIONS[id];
  let guard = 0;
  while (e && e.alias && guard++ < 4) e = CONNECTIONS[e.alias];
  return e || null;
}
