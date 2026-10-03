export default {
  id: 'rubin',
  name: 'NVIDIA Vera Rubin',
  accent: '#e0b44c',
  order: 10,
  blurb: 'The original Vera Rubin model from bddicken/nvidia: the superchip, the NVL72 compute tray and the HGX NVL8 tray.',
  views: {
    'vr-superchip': {
      title: 'Vera Rubin Superchip', long: 'Superchip', short: 'Chip',
      blurb: 'One Vera CPU, two Rubin GPUs, SOCAMM memory and power delivery on one board.',
      stats: ['2× Rubin', '576 GB HBM4', '1.8 TB/s C2C'],
    },
    'vr-tray': {
      title: 'Vera Rubin NVL72 Compute Tray', long: 'Compute tray', short: 'Tray',
      blurb: 'Two superchips in a cable-free, hose-free, fanless 1U tray.',
      stats: ['1U', '4 GPUs', 'fanless'],
    },
    'vr-nvl8': {
      title: 'HGX Rubin NVL8 GPU Tray', long: '8-GPU tray', short: 'NVL8',
      blurb: 'Eight Rubin GPUs on one baseboard, all-to-all over NVLink 6 switches.',
      stats: ['8 GPUs', '2.3 TB HBM4', 'NVLink 6'],
    },
  },
};
