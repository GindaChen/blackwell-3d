// Hover connections for the RTX (Blackwell desktop) cards. Looked up before the global table while
// this family is on screen. Format: src/annotations/connections.js.

export const RTX_BUSES = {
  gddr7: { name: 'GDDR7', color: '#ffb547' },
  pcie: { name: 'PCIe Gen5', color: '#b88cff' },
  display: { name: 'DisplayPort / HDMI', color: '#ff7ad9' },
  cool: { name: 'Heat / airflow', color: '#4aa8ff' },
};

const COOLER = { to: ['rtx-vapor'], scope: 'any', bus: 'cool', label: 'Heat into the vapor chamber', group: 'Vapor chamber' };

export const RTX_CONNECTIONS = {
  gb202: {
    role: 'The GPU: shaders, RT cores and 5th-gen tensor cores (FP4/FP6/FP8) on one 750 mm² die.',
    links: [
      { to: 'gddr7', scope: 'any', bus: 'gddr7', label: '16 × 32-bit GDDR7 channels · 1.79 TB/s', group: 'GDDR7' },
      { to: 'gddr7-back', scope: 'any', bus: 'gddr7', label: 'Clamshell partners on the back', group: 'GDDR7 (back)' },
      { to: 'rtx-pcie-board', scope: 'any', via: ['rtx-fpc-pcie', 'rtx-flex'], bus: 'pcie', label: 'PCIe Gen5 x16 to the host · 64 GB/s each way', group: 'PCIe board' },
      { to: 'rtx-io-board', scope: 'any', via: ['rtx-fpc-io', 'rtx-flex'], bus: 'display', label: 'Display outputs', group: 'Display board' },
      { to: 'rtx-vrm-gpu', scope: 'any', bus: 'power', label: 'Core power · 19 phases', group: 'GPU VRM' },
      COOLER,
    ],
  },
  'gb202-die': {
    role: 'The silicon itself. Each edge carries the GDDR7 PHYs for the chips that face it.',
    links: [
      { to: 'gddr7', scope: 'any', bus: 'gddr7', label: '512-bit GDDR7', group: 'GDDR7' },
      { to: 'gddr7-back', scope: 'any', bus: 'gddr7', label: 'Back-side chips (clamshell)', group: 'GDDR7 (back)' },
      { to: 'rtx-lm', scope: 'any', bus: 'cool', label: 'Liquid metal on top', group: 'TIM' },
    ],
  },
  gddr7: {
    role: 'Graphics DRAM soldered next to the GPU. GDDR7 signals with three voltage levels (PAM3) at 28 Gb/s per pin.',
    links: [
      { to: 'gb202-die', scope: 'any', pick: 'nearest', bus: 'gddr7', label: '32-bit channel · 112 GB/s', group: 'GB202' },
      { to: 'gddr7-back', scope: 'any', pick: 'nearest', bus: 'gddr7', label: 'Shares the channel with the chip behind it', group: 'Clamshell partner' },
      { to: 'rtx-vrm-mem', scope: 'any', bus: 'power', label: 'Memory VRM', group: 'Memory VRM' },
    ],
  },
  'gddr7-back': {
    role: 'Back-side memory of the clamshell pair: doubles capacity to 96 GB on the same 512-bit bus.',
    links: [
      { to: 'gb202-die', scope: 'any', bus: 'gddr7', label: '16 bits of a shared 32-bit channel', group: 'GB202' },
      { to: 'gddr7', scope: 'any', pick: 'nearest', bus: 'gddr7', label: 'Front-side partner', group: 'Partner chip' },
      { to: 'rtx-backplate', scope: 'any', bus: 'cool', label: 'Cooled through the backplate', group: 'Backplate' },
    ],
  },
  'rtx-vrm-gpu': {
    role: 'Turns 12 V into the GPU core rail (~1 V, hundreds of amps).',
    links: [
      { to: 'rtx-power-conn', scope: 'any', bus: 'power', label: '12 V in', group: '12V-2x6' },
      { to: 'gb202', scope: 'any', bus: 'power', label: 'Core rail', group: 'GPU' },
      { to: 'rtx-vrm-ctrl', scope: 'any', bus: 'mgmt', label: 'PWM control', group: 'Controller' },
    ],
  },
  'rtx-vrm-mem': {
    role: 'Powers the GDDR7 chips.',
    links: [
      { to: 'rtx-power-conn', scope: 'any', bus: 'power', label: '12 V in', group: '12V-2x6' },
      { to: 'gddr7', scope: 'any', pick: 6, bus: 'power', label: 'Memory supply', group: 'GDDR7' },
    ],
  },
  'rtx-power-conn': {
    role: 'All of the card\'s power except the 75 W the PCIe slot can supply.',
    links: [
      { to: 'rtx-vrm-gpu', scope: 'any', bus: 'power', label: 'GPU VRM', group: 'GPU VRM' },
      { to: 'rtx-vrm-mem', scope: 'any', bus: 'power', label: 'Memory VRM', group: 'Memory VRM' },
    ],
  },
  'rtx-vrm-ctrl': {
    role: 'Sequences the power stages and reports current and temperature.',
    links: [
      { to: 'rtx-vrm-gpu', scope: 'any', bus: 'mgmt', label: 'GPU phases', group: 'GPU VRM' },
      { to: 'rtx-vrm-mem', scope: 'any', bus: 'mgmt', label: 'Memory phases', group: 'Memory VRM' },
    ],
  },
  'rtx-bios': { role: 'Stores the VBIOS.', links: [{ to: 'gb202', scope: 'any', bus: 'mgmt', label: 'SPI boot', group: 'GPU' }] },
  'rtx-pcb': {
    role: 'The compact centre board: GPU, memory and power only.',
    links: [
      { to: 'rtx-pcie-board', scope: 'any', via: ['rtx-flex'], bus: 'pcie', label: 'Flex to the PCIe board', group: 'PCIe board' },
      { to: 'rtx-io-board', scope: 'any', via: ['rtx-flex'], bus: 'display', label: 'Flex to the display board', group: 'Display board' },
    ],
  },
  'rtx-pcie-board': {
    role: 'Just the gold fingers for the PCIe slot, on their own board.',
    links: [
      { to: 'gb202', scope: 'any', via: ['rtx-flex', 'rtx-fpc-pcie'], bus: 'pcie', label: 'PCIe Gen5 x16 to the GPU', group: 'GPU' },
    ],
  },
  'rtx-fpc-pcie': { alias: 'rtx-pcie-board' },
  'rtx-io-board': {
    role: 'Holds only the display connectors, right behind the bracket.',
    links: [
      { to: 'rtx-port', scope: 'any', bus: 'display', label: 'Outputs', group: 'Ports' },
      { to: 'gb202', scope: 'any', via: ['rtx-flex', 'rtx-fpc-io'], bus: 'display', label: 'Display engines in the GPU', group: 'GPU' },
    ],
  },
  'rtx-fpc-io': { alias: 'rtx-io-board' },
  'rtx-port': { role: 'Monitor outputs.', links: [{ to: 'rtx-io-board', scope: 'any', bus: 'display', label: 'Display board', group: 'Board' }] },
  'rtx-flex': {
    role: 'Flexible printed cables between the three boards.',
    links: [
      { to: 'rtx-pcb', scope: 'any', bus: 'pcie', label: 'Main board', group: 'Main board' },
      { to: 'rtx-pcie-board', scope: 'any', bus: 'pcie', label: 'PCIe board', group: 'PCIe board' },
      { to: 'rtx-io-board', scope: 'any', bus: 'display', label: 'Display board', group: 'Display board' },
    ],
  },
  'rtx-bracket': { role: 'Holds the card in the case.', links: [{ to: 'rtx-port', scope: 'any', bus: 'display', label: 'Display outputs', group: 'Ports' }] },
  'rtx-lm': {
    role: 'Liquid-metal thermal interface between die and cooler.',
    links: [
      { to: 'gb202-die', scope: 'any', bus: 'cool', label: 'From the die', group: 'Die' },
      { to: 'rtx-vapor', scope: 'any', bus: 'cool', label: 'Into the vapor chamber', group: 'Vapor chamber' },
    ],
  },
  'rtx-vapor': {
    role: 'Spreads heat from the GPU, memory and VRM to the heat pipes.',
    links: [
      { to: 'gb202', scope: 'any', bus: 'cool', label: 'From the GPU', group: 'GPU' },
      { to: 'rtx-heatpipe', scope: 'any', bus: 'cool', label: 'Into the heat pipes', group: 'Heat pipes' },
    ],
  },
  'rtx-heatpipe': {
    role: 'Moves heat to both ends of the card.',
    links: [{ to: 'rtx-fins', scope: 'any', bus: 'cool', label: 'Both fin stacks', group: 'Fin stacks' }],
  },
  'rtx-fins': {
    role: 'Hands the heat to the air.',
    links: [
      { to: 'rtx-fan', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Air from this fan', group: 'Fan' },
      { to: 'rtx-heatpipe', scope: 'any', bus: 'cool', label: 'Heat from the pipes', group: 'Heat pipes' },
    ],
  },
  'rtx-fan': {
    role: 'Pushes air straight through a fin stack and out of the back.',
    links: [{ to: 'rtx-fins', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Through the fins', group: 'Fin stack' }],
  },
  'rtx-shroud': {
    role: 'Outer frame of the card.',
    links: [{ to: 'rtx-fan', scope: 'any', bus: 'cool', label: 'Two flow-through fans', group: 'Fans' }],
  },
  'rtx-backplate': {
    role: 'Back cover; the air leaves through its two grilles.',
    links: [
      { to: ['gddr7-back', 'rtx-fins'], scope: 'any', bus: 'cool', label: 'Cools the back-side memory', group: 'Back GDDR7', alt: { 'rtx-fins': { label: 'Exhaust from both fin stacks', group: 'Fin stacks' } } },
    ],
  },
  'rtx-tant': {
    role: 'Bulk filter capacitors for the VRM, on the back of the board.',
    links: [{ to: 'rtx-vrm-gpu', scope: 'any', bus: 'power', label: 'GPU VRM', group: 'VRM' }],
  },
  mlcc: {
    role: 'Decoupling capacitors: tiny local charge stores for fast load changes.',
    links: [{ to: 'gb202', scope: 'any', bus: 'power', label: 'GPU supply', group: 'GPU' }],
  },
};
