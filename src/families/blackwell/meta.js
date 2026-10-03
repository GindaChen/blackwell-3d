export default {
  id: 'blackwell',
  name: 'NVIDIA Blackwell',
  accent: '#76b900',
  order: 20,
  blurb: 'From one GB200 superchip to the 72-GPU NVL72 rack, plus the air-cooled HGX B200.',
  views: {
    superchip: {
      title: 'GB200 Grace Blackwell Superchip', long: 'Superchip', short: 'Chip',
      blurb: '1 Grace CPU, 2 B200 GPUs, 16 LPDDR5X packages on one board.',
      stats: ['2× B200', '372 GB HBM3e', '900 GB/s C2C'],
    },
    tray: {
      title: 'GB200 NVL72 Compute Tray', long: 'Compute tray', short: 'Tray',
      blurb: 'Two superchips, four ConnectX-7s, two BlueField-3s, cables and a fan wall.',
      stats: ['1U', '4 GPUs', '~5.4 kW'],
    },
    switch: {
      title: 'NVLink Switch Tray', long: 'Switch tray', short: 'Switch',
      blurb: 'Two NVLink 5 switch chips that tie the rack\'s 72 GPUs together.',
      stats: ['144 ports', '14.4 TB/s'],
    },
    rack: {
      title: 'GB200 NVL72 Rack', long: 'NVL72 rack', short: 'Rack',
      blurb: '18 compute trays, 9 switch trays, a copper NVLink spine and 120 kW of liquid cooling.',
      stats: ['72 GPUs', '13.4 TB HBM', '130 TB/s NVLink'],
    },
    hgx: {
      title: 'HGX B200 (8-GPU)', long: 'HGX B200', short: 'HGX',
      blurb: 'The air-cooled 8-GPU baseboard with NVLink switches in the middle.',
      stats: ['8 GPUs', '1.44 TB HBM', 'air-cooled'],
    },
  },
};
