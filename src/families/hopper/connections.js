// Hopper connection graph and bus names. Format: src/annotations/connections.js.
// Looked up before the global table while a Hopper view is on screen.

export const BUSES = {
  nvlink: { name: 'NVLink 4', color: '#38d5ff' },
  hbm: { name: 'HBM3', color: '#ffb547' },
  pcie: { name: 'PCIe Gen5', color: '#b88cff' },
};

const NEAREST_GPU = { to: 'h100-gpu', scope: 'any', pick: 'nearest', bus: 'power', label: 'Feeds the GPU core rail', group: 'GPU' };

export const CONNECTIONS = {
  // ------------------------------------------------------------------ SXM5 module
  'h100-gpu': {
    role: 'Does the math: 132 SMs with fourth-generation tensor cores (FP8, Transformer Engine) next to their HBM.',
    links: [
      { to: 'hbm3', scope: 'self', bus: 'hbm', label: 'HBM stacks · 3.35 TB/s (H100), 4.8 TB/s (H200)', group: 'HBM' },
      { to: 'nvswitch3', scope: 'any', bus: 'nvlink', label: 'All four NVSwitches · 18 links, 900 GB/s', group: 'NVSwitch ×4' },
      { to: 'hgx3-host', scope: 'any', bus: 'pcie', label: 'PCIe Gen5 x16 to the host', group: 'Host link' },
      { to: 'sxm-mezz', scope: { ancestor: 'sxm5-module' }, bus: 'pcie', label: 'Out through the mezzanine connectors', group: 'Mezzanine' },
      { to: 'h100-heatsink', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Heat out to the heatsink', group: 'Heatsink' },
      { to: 'vrm-inductor', scope: 'any', pick: 6, bus: 'power', label: 'Power from the VRM phases at both ends', group: 'VRM' },
      { to: 'grace-cpu', scope: 'any', bus: 'c2c', label: 'Grace CPU · 900 GB/s coherent', group: 'Grace CPU' },
    ],
  },
  'sxm5-module': { alias: 'h100-gpu' },
  'h100-die': {
    role: 'The GH100 die itself: 814 mm², 80 billion transistors.',
    links: [
      { to: 'hbm3', scope: { ancestor: 'h100-gpu' }, bus: 'hbm', label: 'Active HBM stacks via the interposer', group: 'HBM' },
      { to: 'cowos-interposer', scope: { ancestor: 'h100-gpu' }, bus: 'hbm', label: 'Sits on the CoWoS-S interposer', group: 'Interposer' },
    ],
  },
  hbm3: {
    role: 'Stacked DRAM beside the die: the GPU\'s working memory (16 GB HBM3 on H100, HBM3e on H200).',
    links: [{ to: 'h100-die', scope: { ancestor: 'h100-gpu' }, bus: 'hbm', label: '1,024-bit link through the interposer', group: 'GH100 die' }],
  },
  'hbm-off': {
    role: 'An HBM site that H100 80 GB leaves unused. H200 uses all six.',
    links: [{ to: 'hbm3', scope: { ancestor: 'h100-gpu' }, bus: 'hbm', label: 'The five active stacks', group: 'Active HBM3' }],
  },
  'cowos-interposer': {
    role: 'Silicon base that wires the die to the HBM stacks.',
    links: [
      { to: 'h100-die', scope: { ancestor: 'h100-gpu' }, bus: 'hbm', label: 'GH100 die', group: 'Die' },
      { to: 'hbm3', scope: { ancestor: 'h100-gpu' }, bus: 'hbm', label: 'HBM stacks', group: 'HBM' },
    ],
  },
  'gpu-lid': {
    role: 'Illustration only: H100 and H200 SXM5 are bare-die.',
    links: [{ to: 'h100-die', scope: { ancestor: 'h100-gpu' }, bus: 'cool', label: 'Would cover the die', group: 'Die' }],
  },
  'sxm5-pcb': {
    role: 'The module board: GPU package, power delivery, mezzanine connectors underneath.',
    links: [
      { to: 'h100-gpu', scope: 'any', pick: 'nearest', bus: 'power', label: 'Carries the GPU', group: 'GPU' },
      { to: 'sxm-mezz', scope: 'any', pick: 2, bus: 'pcie', label: 'Two connectors on the underside', group: 'Mezzanine' },
    ],
  },
  'sxm-mezz': {
    role: 'Board-to-board connector: power, PCIe Gen5 and NVLink 4 in and out of the module.',
    links: [
      { to: 'h100-gpu', scope: 'any', pick: 'nearest', bus: 'nvlink', label: 'GPU signals and power', group: 'GPU' },
      { to: ['hgx3-baseboard', 'sxm5-pcb'], scope: 'any', pick: 'nearest', bus: 'power', label: 'Plugs into the HGX baseboard', group: 'Baseboard', alt: { 'sxm5-pcb': { label: 'Soldered to the module PCB', group: 'Module PCB' } } },
    ],
  },
  'vrm-inductor': {
    role: 'Output inductor of one VRM phase.',
    links: [
      NEAREST_GPU,
      { to: 'vrm-ctrl', scope: 'any', pick: 'nearest', bus: 'mgmt', label: 'Phase timing from the controller', group: 'Controller' },
    ],
  },
  'power-stage': {
    role: 'Switches one VRM phase: high current at under 1 V right next to the GPU.',
    links: [NEAREST_GPU, { to: 'vrm-inductor', scope: 'any', pick: 2, bus: 'power', label: 'Into the output inductors', group: 'Inductors' }],
  },
  'polymer-cap': {
    role: 'Bulk energy reservoir for sudden load steps.',
    links: [{ ...NEAREST_GPU, label: 'Steadies the GPU supply rail' }],
  },
  mlcc: {
    role: 'Tiny ceramic capacitor that absorbs nanosecond current spikes.',
    links: [{ ...NEAREST_GPU, label: 'Decouples the GPU rails' }],
  },
  'vrm-ctrl': {
    role: 'Digital controller that runs many VRM phases.',
    links: [
      { to: 'vrm-inductor', scope: 'any', pick: 4, bus: 'mgmt', label: 'Drives the phases', group: 'VRM phases' },
      { to: ['hgx3-hmc', 'sxm-fru'], scope: 'any', pick: 'nearest', bus: 'mgmt', label: 'Telemetry to the management controller', group: 'Management', alt: { 'sxm-fru': { label: 'Shares the module management bus', group: 'Module I²C' } } },
    ],
  },
  'sxm-fru': {
    role: 'Stores the module\'s identity (part and serial number).',
    links: [{ to: ['hgx3-hmc', 'sxm-mezz'], scope: 'any', pick: 'nearest', bus: 'mgmt', label: 'Read by the HGX management controller', group: 'Management', alt: { 'sxm-mezz': { label: 'Out through the connector to the baseboard', group: 'Connector' } } }],
  },
  'sxm-temp': {
    role: 'Reports module temperature.',
    links: [{ to: ['hgx3-hmc', 'sxm-mezz'], scope: 'any', pick: 'nearest', bus: 'mgmt', label: 'Telemetry to the HGX management controller', group: 'Management', alt: { 'sxm-mezz': { label: 'Out through the connector to the baseboard', group: 'Connector' } } }],
  },

  // ------------------------------------------------------------------ HGX H100 baseboard
  'hgx3-tray': { role: 'Sheet-metal GPU tray; the host CPUs and NICs are in a separate tray.', links: [] },
  'hgx3-baseboard': {
    role: 'Wires 8 GPUs to 4 NVSwitches and to the host.',
    links: [
      { to: 'nvswitch3', scope: 'any', bus: 'nvlink', label: '144 NVLink 4 links to the switches', group: 'NVSwitch ×4' },
      { to: 'hgx3-host', scope: 'any', bus: 'pcie', label: '8× PCIe Gen5 x16 to the host', group: 'Host' },
    ],
  },
  nvswitch3: {
    role: 'Third-generation NVSwitch: 64 NVLink 4 ports, in-network reductions (SHARP).',
    links: [
      { to: 'h100-gpu', scope: 'any', bus: 'nvlink', label: 'All 8 GPUs · 4 or 5 links each', group: 'H100 ×8' },
      { to: 'hgx3-hmc', scope: 'any', bus: 'mgmt', label: 'Fabric bring-up and telemetry', group: 'HMC' },
      { to: 'nvswitch-heatsink', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Heat out', group: 'Heatsink' },
    ],
  },
  'nvs-power-stage': {
    role: 'Power stages for an NVSwitch core rail.',
    links: [{ to: 'nvswitch3', scope: 'any', pick: 'nearest', bus: 'power', label: 'Feeds the nearest switch', group: 'NVSwitch' }],
  },
  'h100-heatsink': {
    role: 'Air heatsink for one 700 W GPU.',
    links: [{ to: 'h100-gpu', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Pulls heat off the die and HBM', group: 'GPU' }],
  },
  'nvswitch-heatsink': {
    role: 'Heatsinks for the four switch chips.',
    links: [{ to: 'nvswitch3', scope: 'any', bus: 'cool', label: 'One per switch', group: 'NVSwitch ×4' }],
  },
  'hgx3-host': {
    role: 'Eight PCIe Gen5 x16 links, one per GPU, to the host board.',
    links: [{ to: 'h100-gpu', scope: 'any', bus: 'pcie', label: 'Every GPU · 64 GB/s each way', group: 'H100 ×8' }],
  },
  'host-mlcc': {
    role: 'Capacitors on the high-speed host links.',
    links: [{ to: 'hgx3-host', scope: 'any', pick: 'nearest', bus: 'pcie', label: 'Nearest host connector', group: 'Connector' }],
  },
  'hgx3-power': {
    role: '54 V power in from the chassis supplies.',
    links: [
      { to: 'sxm5-module', scope: 'any', bus: 'power', label: 'All 8 GPU modules', group: 'SXM5 ×8' },
      { to: 'nvswitch3', scope: 'any', bus: 'power', label: 'The switch VRMs', group: 'NVSwitch ×4' },
    ],
  },
  'hgx3-hmc': {
    role: 'Manages the GPU board: telemetry, firmware, power, NVLink bring-up.',
    links: [
      { to: 'nvswitch3', scope: 'any', bus: 'mgmt', label: 'NVSwitch management', group: 'NVSwitch ×4' },
      { to: 'h100-gpu', scope: 'any', bus: 'mgmt', label: 'GPU telemetry and firmware', group: 'H100 ×8' },
    ],
  },

  // ------------------------------------------------------------------ GH200 Grace Hopper
  'grace-cpu': {
    role: 'Runs the OS and data pipeline, and shares its memory with the GPU.',
    links: [
      { to: 'h100-gpu', scope: 'any', bus: 'c2c', label: 'Hopper GPU · 900 GB/s NVLink-C2C, coherent', group: 'Hopper GPU' },
      { to: 'lpddr5x', scope: 'any', bus: 'lpddr', label: '16× LPDDR5X · up to 480 GB, 512 GB/s', group: 'LPDDR5X' },
      { to: 'gh200-conn', scope: 'any', bus: 'pcie', label: 'PCIe Gen5 to the host board', group: 'Connectors' },
    ],
  },
  'gh200-conn': {
    role: 'Board-to-board connector: power, PCIe Gen5 and NVLink to the host board.',
    links: [
      { to: 'grace-cpu', scope: 'any', bus: 'pcie', label: 'Grace PCIe Gen5', group: 'Grace CPU' },
      { to: 'h100-gpu', scope: 'any', bus: 'nvlink', label: 'GPU NVLink 4 (for NVL32 / NVLink Switch systems)', group: 'Hopper GPU' },
    ],
  },
  'gh200-pcb': {
    role: 'One board for the CPU, the GPU and both memory pools.',
    links: [
      { to: 'grace-cpu', scope: 'any', bus: 'c2c', label: 'Grace CPU', group: 'CPU' },
      { to: 'h100-gpu', scope: 'any', bus: 'c2c', label: 'Hopper GPU', group: 'GPU' },
    ],
  },
};
