// Hover connections for the Tesla PCIe cards (Kepler K80 and Maxwell M40 share these ids).
// Format: src/annotations/connections.js. Fallback lists let the same entry work on the dual-GPU
// K80 (PCIe through the PLX switch) and the single-GPU M40 (PCIe straight to the GPU).

export const BUSES = {
  pcie: { name: 'PCIe Gen3', color: '#b88cff' },
  gddr5: { name: 'GDDR5', color: '#ffb547' },
  air: { name: 'Airflow', color: '#4aa8ff' },
};

const NEAR_GPU = { to: 'gpu-package', scope: 'any', pick: 'nearest', bus: 'power', label: 'Feeds the nearest GPU', group: 'GPU' };

export const CONNECTIONS = {
  'gpu-package': {
    role: 'The GPU: thousands of CUDA cores that run the compute kernels.',
    links: [
      { to: 'gddr5', scope: 'any', pick: 24, bus: 'gddr5', label: '24 GDDR5 chips · 384-bit', group: 'GDDR5 ×24' },
      { to: ['plx-switch', 'pcie-fingers'], scope: 'any', pick: 'nearest', bus: 'pcie', label: 'PCIe Gen3 x16 to the PLX switch', group: 'PLX switch', alt: { 'pcie-fingers': { label: 'PCIe Gen3 x16 to the host', group: 'Edge connector' } } },
      { to: 'vrm-inductor', scope: 'any', pick: 4, bus: 'power', label: 'Core power from the VRM', group: 'VRM' },
      { to: 'heatsink', scope: 'any', bus: 'air', label: 'Heat into the passive heatsink', group: 'Heatsink' },
    ],
  },
  'gpu-die': {
    role: 'The bare silicon. Toggle Floorplan to see its streaming multiprocessors.',
    links: [{ to: 'gddr5', scope: 'any', pick: 24, bus: 'gddr5', label: 'Six 64-bit memory controllers', group: 'GDDR5' }],
  },
  gddr5: {
    role: 'One 4 Gb GDDR5 chip. Pairs of chips front and back share a channel (clamshell).',
    links: [{ to: 'gpu-package', scope: 'any', pick: 'nearest', bus: 'gddr5', label: '16 bits of the 384-bit bus', group: 'GPU' }],
  },
  'plx-switch': {
    role: 'Splits the slot\'s PCIe lanes between the two GPUs and lets them talk directly.',
    links: [
      { to: 'pcie-fingers', scope: 'any', bus: 'pcie', label: 'x16 upstream to the host', group: 'Slot' },
      { to: 'gpu-package', scope: 'any', bus: 'pcie', label: 'x16 down to each GPU', group: 'Both GPUs' },
    ],
  },
  'pcie-fingers': {
    role: 'Gold edge contacts that plug into the server\'s PCIe x16 slot.',
    links: [{ to: ['plx-switch', 'gpu-package'], scope: 'any', pick: 'nearest', bus: 'pcie', label: 'PCIe Gen3 x16 · 16 GB/s each way', group: 'PCIe' }],
  },
  'eps-conn': {
    role: 'Main power input: 12 V on an EPS-12V (CPU-style) 8-pin, not a PCIe 8-pin.',
    links: [{ to: 'vrm-inductor', scope: 'any', pick: 4, bus: 'power', label: '12 V into the VRMs', group: 'VRMs' }],
  },
  'brake-header': {
    role: 'Lets the server force the card into a low-power state.',
    links: [{ to: 'gpu-package', scope: 'any', pick: 'nearest', bus: 'mgmt', label: 'Power brake signal', group: 'GPU' }],
  },
  'vrm-inductor': {
    role: 'Smooths the switched current of one VRM phase.',
    links: [
      { to: 'drmos', scope: 'any', pick: 'nearest', bus: 'power', label: 'Switched by its power stage', group: 'Power stage' },
      NEAR_GPU,
    ],
  },
  drmos: {
    role: 'MOSFETs that chop 12 V into pulses for one VRM phase.',
    links: [
      { to: 'vrm-ctrl', scope: 'any', pick: 'nearest', bus: 'mgmt', label: 'PWM from the controller', group: 'Controller' },
      { to: 'vrm-inductor', scope: 'any', pick: 'nearest', bus: 'power', label: 'Into the output inductor', group: 'Inductor' },
    ],
  },
  'vrm-ctrl': {
    role: 'Multiphase controller that sets the GPU core voltage.',
    links: [{ to: 'drmos', scope: 'any', pick: 6, bus: 'mgmt', label: 'Drives the power stages', group: 'Power stages' }],
  },
  'polymer-cap': { role: 'Bulk capacitance on the VRM rails.', links: [NEAR_GPU] },
  mlcc: { role: 'Tiny ceramic capacitor that absorbs fast current spikes.', links: [{ ...NEAR_GPU, label: 'Decouples the nearest GPU' }] },
  resistor: { role: 'Pull-ups, current sense and signal termination.', links: [] },
  'bios-rom': {
    role: 'Holds the GPU\'s video BIOS (clocks, power limits, ECC settings).',
    links: [{ to: 'gpu-package', scope: 'any', pick: 'nearest', bus: 'mgmt', label: 'SPI boot ROM', group: 'GPU' }],
  },
  'card-pcb': { role: 'Multi-layer board that carries every link shown on hover.', links: [] },
  bracket: {
    role: 'Holds the card in the chassis. Its vents are the air exit.',
    links: [{ to: 'heatsink', scope: 'any', bus: 'air', label: 'Hot air leaves through the vents', group: 'Heatsink' }],
  },
  heatsink: {
    role: 'Copper base, heat pipes and aluminium fins. It has no fan of its own.',
    links: [
      { to: 'gpu-package', scope: 'any', bus: 'air', label: 'Pulls heat off the GPU(s)', group: 'GPU' },
      { to: 'bracket', scope: 'any', bus: 'air', label: 'Air exits at the bracket', group: 'Bracket' },
    ],
  },
  shroud: {
    role: 'A duct that forces the server\'s airflow through the fins.',
    links: [{ to: 'heatsink', scope: 'any', bus: 'air', label: 'Ducts air through the fins', group: 'Heatsink' }],
  },
};
