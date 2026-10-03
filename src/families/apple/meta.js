export default {
  id: 'apple',
  name: 'Apple silicon',
  accent: '#8fb4e8',
  order: 90,
  blurb: 'The M5 Ultra package, the Mac Studio built around it, and four of them clustered over Thunderbolt 5.',
  views: {
    ultra: {
      title: 'Apple M5 Ultra', long: 'M5 Ultra', short: 'Chip',
      blurb: 'Two M5 Max joined by UltraFusion: four tiles and eight LPDDR5X packages on one package.',
      stats: ['36-core CPU', '80-core GPU', '1.2 TB/s'],
    },
    studio: {
      title: 'Mac Studio (M5 Ultra)', long: 'Mac Studio', short: 'Studio',
      blurb: 'A 197 mm aluminium box with the M5 Ultra under a copper heatsink, two blowers and a 480 W PSU.',
      stats: ['512 GB max', '6× TB5', '480 W'],
    },
    cluster: {
      title: 'Mac Studio Cluster (TB5 RDMA)', long: '4-node cluster', short: 'Cluster',
      blurb: 'Four Mac Studios in a 10-inch rack, every pair joined by a Thunderbolt 5 cable.',
      stats: ['4 Macs', '2 TB memory', 'full mesh'],
    },
  },
};
