// Connection entries for SXM-era modules (shared with the pascal family) and the DGX-1 V100 board.
// Format: src/annotations/connections.js. Module parts use scope 'superchip', which resolves to the
// module root (sxm.js names it 'superchip'), so the same entries work on one module or eight.
import { LINKS, PCIE, neighbours } from './topology.js';

const DGX_GPUS = Array.from({ length: 8 }, (_, i) => `dgx-gpu-${i}`);

/**
 * @param {string} id      module prefix ('v100' | 'p100')
 * @param {object} t       { gpu, mem, nvlink, links } short texts for labels
 */
export function sxmConnections(id, t) {
  const GPU = [`${id}-gpu`, ...DGX_GPUS]; // first id present inside the module wins
  return {
    [`${id}-gpu`]: {
      role: t.gpuRole,
      links: [
        { to: 'hbm2', scope: 'self', bus: 'hbm', label: `4 HBM2 stacks · ${t.mem}`, group: 'HBM2 ×4' },
        { to: `${id}-mezz-nvl`, scope: 'superchip', bus: 'nvlink', label: `${t.links} · ${t.nvlink} to peers`, group: 'NVLink connector' },
        { to: `${id}-mezz-pwr`, scope: 'superchip', bus: 'pcie', label: 'PCIe Gen3 x16 to the host', group: 'Power + PCIe connector' },
        { to: 'power-stage', scope: 'superchip', pick: 6, bus: 'power', label: 'Core power from the VRM', group: 'VRM' },
      ],
    },
    [`${id}-die`]: {
      role: t.dieRole,
      links: [
        { to: 'hbm2', scope: 'superchip', bus: 'hbm', label: `4 HBM2 stacks through the interposer · ${t.mem}`, group: 'HBM2' },
        { to: `${id}-mezz-nvl`, scope: 'superchip', bus: 'nvlink', label: `${t.links} off the die edge`, group: 'NVLink' },
      ],
    },
    hbm2: {
      role: 'Stacked DRAM next to the die: the GPU\'s memory.',
      links: [{ to: `${id}-die`, scope: 'superchip', bus: 'hbm', label: '1,024-bit interface through the interposer', group: 'GPU die' }],
    },
    [`${id}-interposer`]: {
      role: 'Silicon wiring layer under the die and the HBM2 stacks.',
      links: [
        { to: `${id}-die`, scope: 'superchip', bus: 'hbm', label: 'GPU die', group: 'Die' },
        { to: 'hbm2', scope: 'superchip', bus: 'hbm', label: '4 × 1,024 data wires', group: 'HBM2 ×4' },
      ],
    },
    [`${id}-frame`]: {
      role: 'Metal frame around the bare package; it sets the heatsink height. There is no lid.',
      links: [
        { to: `${id}-die`, scope: 'superchip', bus: 'cool', label: 'Heatsink sits right on the bare die', group: 'Bare die' },
        { to: 'gpu-heatsink', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Heatsink above', group: 'Heatsink' },
      ],
    },
    [`${id}-mezz-nvl`]: {
      role: 'Mezzanine connector that carries the NVLink links into the baseboard.',
      links: [
        { to: GPU, scope: 'superchip', bus: 'nvlink', label: `${t.links} from the GPU`, group: 'GPU' },
        { to: 'dgx-baseboard', scope: 'any', bus: 'nvlink', label: 'Into the baseboard\'s NVLink wiring', group: 'Baseboard' },
      ],
    },
    [`${id}-mezz-pwr`]: {
      role: 'Mezzanine connector for 12 V power and the PCIe link.',
      links: [
        { to: 'vrm-inductor', scope: 'superchip', pick: 4, bus: 'power', label: '12 V into the core regulator', group: 'VRM' },
        { to: GPU, scope: 'superchip', bus: 'pcie', label: 'PCIe Gen3 x16 to the GPU', group: 'GPU' },
      ],
    },
    'sxm-module': {
      role: 'GPU module with no edge connector: it plugs flat onto a baseboard.',
      links: [
        { to: GPU, scope: 'self', bus: 'pcie', label: t.gpu, group: 'GPU' },
        { to: [`${id}-mezz-nvl`], scope: 'self', bus: 'nvlink', label: 'NVLink connector', group: 'NVLink' },
        { to: [`${id}-mezz-pwr`], scope: 'self', bus: 'power', label: 'Power + PCIe connector', group: 'Power + PCIe' },
      ],
    },
    'power-stage': {
      role: 'Switches the 12 V input into high current at about 1 V.',
      links: [
        { to: GPU, scope: 'superchip', bus: 'power', label: 'Feeds the GPU core rail', group: 'GPU' },
        { to: 'vrm-inductor', scope: 'superchip', pick: 2, bus: 'power', label: 'Into the output chokes', group: 'Chokes' },
      ],
    },
    'vrm-inductor': {
      role: 'Smooths the switched current of the core regulator.',
      links: [
        { to: 'power-stage', scope: 'superchip', pick: 3, bus: 'power', label: 'Fed by the power stages', group: 'Power stages' },
        { to: GPU, scope: 'superchip', bus: 'power', label: 'Supplies the GPU', group: 'GPU' },
      ],
    },
    'polymer-cap': { role: 'Bulk capacitance for sudden load steps.', links: [{ to: GPU, scope: 'superchip', bus: 'power', label: 'Steadies the GPU rail', group: 'GPU' }] },
    mlcc: { role: 'Tiny ceramic capacitor that absorbs fast current spikes.', links: [{ to: GPU, scope: 'superchip', bus: 'power', label: 'Decouples the GPU', group: 'GPU' }] },
    resistor: { role: 'Pull-ups, current sense and termination.', links: [] },
    'vrm-ctrl': {
      role: 'Runs the multiphase regulator.',
      links: [{ to: 'power-stage', scope: 'superchip', pick: 4, bus: 'mgmt', label: 'PWM to the power stages', group: 'Power stages' }],
    },
    'fru-eeprom': { role: 'Board identity, power limits and error logs.', links: [{ to: GPU, scope: 'superchip', bus: 'mgmt', label: 'Read by the GPU and the host', group: 'GPU' }] },
    flash: { role: 'VBIOS firmware.', links: [{ to: GPU, scope: 'superchip', bus: 'mgmt', label: 'Boot firmware for the GPU', group: 'GPU' }] },
  };
}

const NV = (n) => (n === 2 ? '2 links · 100 GB/s' : '1 link · 50 GB/s');

/** DGX-1 board-level entries: one per GPU (its exact cube-mesh peers), switches, cooling, power. */
export function dgxConnections() {
  const out = {};
  for (let i = 0; i < 8; i++) {
    const sw = PCIE.findIndex((p) => p.gpus.includes(i));
    out[`dgx-gpu-${i}`] = {
      role: `GPU${i} of 8. Six NVLink 2 links go straight to four peers; the other three GPUs are two hops away.`,
      links: [
        ...neighbours(i).map(([j, n]) => ({ to: `dgx-gpu-${j}`, scope: 'any', bus: 'nvlink', label: `GPU${j} · ${NV(n)}`, group: `GPU${j}` })),
        { to: 'hbm2', scope: 'self', bus: 'hbm', label: '4 HBM2 stacks · 900 GB/s', group: 'HBM2' },
        { to: `dgx-plx-${sw}`, scope: 'any', bus: 'pcie', label: `PCIe switch ${sw} → CPU${PCIE[sw].cpu}, InfiniBand`, group: 'PCIe switch' },
        { to: 'gpu-heatsink', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Heat out to its heatsink', group: 'Heatsink' },
      ],
    };
  }
  PCIE.forEach((p, k) => {
    out[`dgx-plx-${k}`] = {
      role: 'PCIe Gen3 switch: joins two GPUs, one CPU uplink and one InfiniBand card.',
      links: [
        ...p.gpus.map((g) => ({ to: `dgx-gpu-${g}`, scope: 'any', bus: 'pcie', label: `GPU${g} · PCIe Gen3 x16`, group: `GPU${g}` })),
        { to: 'host-conn', scope: 'any', bus: 'pcie', label: `Uplink to CPU${p.cpu} and its EDR InfiniBand NIC`, group: 'Host' },
      ],
    };
  });
  Object.assign(out, {
    'host-conn': {
      role: 'PCIe links from the baseboard to the CPUs and network cards.',
      links: PCIE.map((p, k) => ({ to: `dgx-plx-${k}`, scope: 'any', bus: 'pcie', label: `Switch ${k} ↔ CPU${p.cpu} + InfiniBand NIC ${k}`, group: `Switch ${k}` })),
    },
    'dgx-baseboard': {
      role: `Wires 8 GPUs directly to each other: ${LINKS.reduce((s, l) => s + l[2], 0)} NVLink 2 links, no switch chip.`,
      links: [{ to: DGX_GPUS, scope: 'any', bus: 'nvlink', label: 'Eight SXM2 sockets', group: 'GPUs' }],
    },
    'gpu-heatsink': {
      role: 'Air heatsink for one 300 W GPU.',
      links: [{ to: 'sxm-module', scope: 'any', pick: 'nearest', bus: 'cool', label: 'Pulls heat off the bare die', group: 'GPU module' }],
    },
    fans: { role: 'Push front-to-back air through the heatsinks.', links: [{ to: 'gpu-heatsink', scope: 'any', bus: 'cool', label: 'Air through all 8 heatsinks', group: 'Heatsinks' }] },
    'front-panel': { role: 'Air intake.', links: [{ to: 'fans', scope: 'any', bus: 'cool', label: 'Into the fans', group: 'Fans' }] },
    'bb-power': {
      role: '12 V input to the baseboard.',
      links: [{ to: 'sxm-module', scope: 'any', bus: 'power', label: 'Up to 300 W per GPU module', group: 'GPU modules' }],
    },
    'bb-mgmt': { role: 'Sequences power and resets for the GPU sockets.', links: [{ to: DGX_GPUS, scope: 'any', bus: 'mgmt', label: 'Power-on and telemetry', group: 'GPUs' }] },
    'bb-power-stage': { role: 'Local regulators on the baseboard.', links: [{ to: 'dgx-baseboard', scope: 'any', bus: 'power', label: 'Baseboard rails for the PCIe switches', group: 'Baseboard' }] },
    'bb-mlcc': { role: 'Decoupling capacitors.', links: [{ to: 'dgx-baseboard', scope: 'any', bus: 'power', label: 'Decouples the switch supply rails', group: 'Baseboard' }] },
    chassis: { role: 'Steel tray that holds the GPU baseboard.', links: [] },
  });
  return out;
}
