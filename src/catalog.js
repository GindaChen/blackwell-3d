// Every model the site can show, grouped into families. The home page renders this as a gallery;
// the viewer uses it for the title, the view switcher (only the current family's views) and the accent.

export const FAMILIES = [
  {
    id: 'blackwell',
    name: 'NVIDIA Blackwell',
    accent: '#76b900',
    blurb: 'From one GB200 superchip to the 72-GPU NVL72 rack, plus the air-cooled HGX B200.',
  },
  {
    id: 'apple',
    name: 'Apple silicon',
    accent: '#8fb4e8',
    blurb: 'The M5 Ultra package, the Mac Studio built around it, and four of them clustered over Thunderbolt 5.',
  },
];

export const VIEWS = {
  superchip: {
    family: 'blackwell', long: 'Superchip', short: 'Chip',
    title: 'GB200 Grace Blackwell Superchip',
    blurb: '1 Grace CPU, 2 B200 GPUs, 16 LPDDR5X packages on one board.',
    stats: ['2× B200', '372 GB HBM3e', '900 GB/s C2C'],
  },
  tray: {
    family: 'blackwell', long: 'Compute tray', short: 'Tray',
    title: 'GB200 NVL72 Compute Tray',
    blurb: 'Two superchips, four ConnectX-7s, two BlueField-3s, cables and a fan wall.',
    stats: ['1U', '4 GPUs', '~5.4 kW'],
  },
  switch: {
    family: 'blackwell', long: 'Switch tray', short: 'Switch',
    title: 'NVLink Switch Tray',
    blurb: 'Two NVLink 5 switch chips that tie the rack\'s 72 GPUs together.',
    stats: ['144 ports', '14.4 TB/s'],
  },
  rack: {
    family: 'blackwell', long: 'NVL72 rack', short: 'Rack',
    title: 'GB200 NVL72 Rack',
    blurb: '18 compute trays, 9 switch trays, a copper NVLink spine and 120 kW of liquid cooling.',
    stats: ['72 GPUs', '13.4 TB HBM', '130 TB/s NVLink'],
  },
  hgx: {
    family: 'blackwell', long: 'HGX B200', short: 'HGX',
    title: 'HGX B200 (8-GPU)',
    blurb: 'The air-cooled 8-GPU baseboard with NVLink switches in the middle.',
    stats: ['8 GPUs', '1.44 TB HBM', 'air-cooled'],
  },
  ultra: {
    family: 'apple', long: 'M5 Ultra', short: 'Chip',
    title: 'Apple M5 Ultra',
    blurb: 'Two M5 Max joined by UltraFusion: four tiles and eight LPDDR5X packages on one package.',
    stats: ['36-core CPU', '80-core GPU', '1.2 TB/s'],
  },
  studio: {
    family: 'apple', long: 'Mac Studio', short: 'Studio',
    title: 'Mac Studio (M5 Ultra)',
    blurb: 'A 197 mm aluminium box with the M5 Ultra under a copper heatsink, two blowers and a 480 W PSU.',
    stats: ['512 GB max', '6× TB5', '480 W'],
  },
  cluster: {
    family: 'apple', long: '4-node cluster', short: 'Cluster',
    title: 'Mac Studio Cluster (TB5 RDMA)',
    blurb: 'Four Mac Studios in a 10-inch rack, every pair joined by a Thunderbolt 5 cable.',
    stats: ['4 Macs', '2 TB memory', 'full mesh'],
  },
};

export const familyOf = (view) => FAMILIES.find((f) => f.id === VIEWS[view]?.family);
export const viewsOf = (family) => Object.keys(VIEWS).filter((k) => VIEWS[k].family === family);
