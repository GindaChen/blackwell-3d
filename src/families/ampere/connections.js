// Ampere connection table (consulted before the global one while this family is on screen).
// Format: src/annotations/connections.js. Scope 'superchip' falls back to the whole view here.

const NEAREST_LOAD = ['a100-gpu', 'a100-nvswitch'];

export const AMPERE_CONNECTIONS = {
  // ------------------------------------------------------------------ A100 SXM4 module
  'a100-gpu': {
    role: 'Does the math: 3rd-gen tensor cores with TF32, FP16/BF16, INT8 and FP64, plus 2:4 sparsity.',
    links: [
      { to: 'a100-hbm', scope: 'self', bus: 'hbm', label: '5 active stacks · up to 2 TB/s', group: 'HBM ×5' },
      { to: 'a100-nvswitch', scope: 'any', bus: 'nvlink', label: '2 links to each of 6 NVSwitches · 600 GB/s', group: 'NVSwitches' },
      { to: 'sxm4-mezz', scope: 'superchip', pick: 2, bus: 'nvlink', label: '12 NVLink 3 links + PCIe Gen4 out through the mezzanine', group: 'Mezzanine' },
      { to: 'a100-host-conn', scope: 'any', pick: 'nearest', bus: 'pcie', label: 'PCIe Gen4 x16 to the host', group: 'Host link' },
      { to: 'power-stage', scope: 'superchip', pick: 6, bus: 'power', label: 'Power from the VRM stages', group: 'VRM' },
      { to: 'a100-heatsink', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Heat out to its heatsink', group: 'Heatsink' },
    ],
  },
  'ga100-die': {
    role: 'The GPU itself: 8 GPCs around a split 40 MB L2, HBM PHYs on two edges, NVLink and PCIe on the others.',
    links: [
      { to: 'a100-hbm', scope: { ancestor: 'a100-gpu' }, bus: 'hbm', label: '10 memory controllers · 5120-bit', group: 'HBM ×5' },
      { to: 'a100-hbm-off', scope: { ancestor: 'a100-gpu' }, bus: 'hbm', label: 'Sixth site, controllers fused off', group: 'Unused site' },
    ],
  },
  'a100-hbm': {
    role: 'Stacked DRAM beside the die: the GPU\'s working memory.',
    links: [{ to: 'ga100-die', scope: { ancestor: 'a100-gpu' }, bus: 'hbm', label: '1024-bit link through the interposer', group: 'GA100' }],
  },
  'a100-hbm-off': {
    role: 'An HBM position that A100 does not use.',
    links: [{ to: 'ga100-die', scope: { ancestor: 'a100-gpu' }, bus: 'hbm', label: 'Its two memory controllers are disabled', group: 'GA100' }],
  },
  'a100-interposer': {
    role: 'Passive silicon that wires the die to the HBM.',
    links: [
      { to: 'ga100-die', scope: { ancestor: 'a100-gpu' }, bus: 'hbm', label: 'GA100', group: 'Die' },
      { to: 'a100-hbm', scope: { ancestor: 'a100-gpu' }, bus: 'hbm', label: '5 active stacks', group: 'HBM' },
    ],
  },
  'a100-lid': {
    role: 'Illustrative heat spreader (production parts are bare-die).',
    links: [{ to: 'ga100-die', scope: { ancestor: 'a100-gpu' }, bus: 'cool', label: 'Would pull heat off the die', group: 'Die' }],
  },
  'sxm4-mezz': {
    role: 'Plugs the module into the baseboard: power in, NVLink and PCIe out.',
    links: [
      { to: 'a100-gpu', scope: 'superchip', pick: 'nearest', bus: 'nvlink', label: 'All 12 NVLink 3 links + PCIe Gen4', group: 'A100' },
      { to: 'power-stage', scope: 'superchip', pick: 4, bus: 'power', label: 'Board power to the VRMs', group: 'VRM' },
    ],
  },
  'sxm4-pcb': {
    role: 'SXM4 carrier: GPU, power delivery and two mezzanine connectors.',
    links: [{ to: 'a100-gpu', scope: 'superchip', pick: 'nearest', bus: 'power', label: 'Carries the GPU', group: 'A100' }],
  },
  'power-stage': {
    role: 'Delivers high current at under 1 V right next to the chip.',
    links: [{ to: NEAREST_LOAD, scope: 'superchip', pick: 'nearest', bus: 'power', label: 'Feeds the nearest chip', group: 'Load' }],
  },
  mlcc: {
    role: 'Tiny ceramic capacitor that absorbs fast current spikes.',
    links: [{ to: NEAREST_LOAD, scope: 'superchip', pick: 'nearest', bus: 'power', label: 'Decouples the nearest chip', group: 'Load' }],
  },
  'polymer-cap': {
    role: 'Bulk capacitance on the regulator outputs.',
    links: [{ to: 'vrm-inductor', scope: 'superchip', pick: 'nearest', bus: 'power', label: 'Smooths the inductor output', group: 'Inductors' }],
  },
  'vrm-inductor': {
    role: 'Stores energy between switching cycles of the regulators.',
    links: [{ to: 'a100-gpu', scope: 'superchip', pick: 'nearest', bus: 'power', label: 'Core and HBM rails', group: 'A100' }],
  },
  resistor: { role: 'Current sense, pull-ups and termination.', links: [] },
  'vrm-ctrl': {
    role: 'Digital controller that runs many VRM phases.',
    links: [{ to: 'power-stage', scope: 'superchip', pick: 8, bus: 'mgmt', label: 'PWM to the power stages', group: 'Power stages' }],
  },
  'module-eeprom': {
    role: 'Module identity for the management controller.',
    links: [{ to: ['hgx-a100-fpga', 'sxm4-mezz'], scope: 'any', pick: 'nearest', bus: 'mgmt', label: 'Read over I²C', group: 'Management' }],
  },
  'module-temp': {
    role: 'Board temperature telemetry.',
    links: [{ to: ['hgx-a100-fpga', 'sxm4-mezz'], scope: 'any', pick: 'nearest', bus: 'mgmt', label: 'I²C telemetry', group: 'Management' }],
  },

  // ------------------------------------------------------------------ HGX A100 8-GPU
  'a100-nvswitch': {
    role: 'Switches NVLink traffic so every GPU reaches every other at full speed.',
    links: [
      { to: 'a100-gpu', scope: 'any', bus: 'nvlink', label: 'All 8 GPUs · 2 links from each', group: 'A100 GPUs' },
      { to: 'hgx-a100-fpga', scope: 'any', bus: 'mgmt', label: 'Bring-up and telemetry', group: 'FPGA' },
    ],
  },
  'a100-heatsink': {
    role: 'Air cooler for one 400 W GPU.',
    links: [
      { to: 'a100-gpu', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Pulls heat off the GPU', group: 'A100' },
      { to: 'fans', scope: 'any', bus: 'cool', label: 'Air from the fan wall', group: 'Fans' },
    ],
  },
  'a100-switch-heatsink': {
    role: 'Heat-pipe coolers on the six NVSwitches.',
    links: [{ to: 'a100-nvswitch', scope: 'any', bus: 'cool', label: 'All 6 NVSwitches', group: 'NVSwitches' }],
  },
  'hgx-a100-baseboard': {
    role: 'Wires 8 GPUs to 6 switches, plus host PCIe and power.',
    links: [
      { to: 'a100-nvswitch', scope: 'any', bus: 'nvlink', label: '96 NVLink 3 links in the board', group: 'NVSwitches' },
      { to: 'a100-host-conn', scope: 'any', bus: 'pcie', label: 'PCIe Gen4 to the host', group: 'Host' },
    ],
  },
  'a100-host-conn': {
    role: 'PCIe Gen4 to the host CPUs, NICs and storage.',
    links: [{ to: 'a100-gpu', scope: 'any', pick: 2, bus: 'pcie', label: 'Two GPUs per connector (via a host PCIe switch)', group: 'GPU pair' }],
  },
  'a100-pwr-conn': {
    role: 'Power in from the chassis supplies.',
    links: [{ to: 'sxm4-mezz', scope: 'any', pick: 4, bus: 'power', label: 'Through the board to every module', group: 'Modules' }],
  },
  'hgx-a100-fpga': {
    role: 'Baseboard housekeeping and telemetry.',
    links: [
      { to: 'a100-nvswitch', scope: 'any', bus: 'mgmt', label: 'NVSwitch bring-up', group: 'NVSwitches' },
      { to: 'a100-gpu', scope: 'any', bus: 'mgmt', label: 'GPU telemetry', group: 'GPUs' },
    ],
  },
  fans: {
    role: 'Moves the cold-aisle air through every heatsink.',
    links: [
      { to: 'a100-heatsink', scope: 'any', bus: 'cool', label: 'Through the GPU fin stacks', group: 'GPU heatsinks' },
      { to: 'a100-switch-heatsink', scope: 'any', bus: 'cool', label: 'Then the NVSwitch coolers', group: 'NVSwitch heatsinks' },
    ],
  },
  chassis: { role: 'Steel sled for the GPU assembly.', links: [] },
};
