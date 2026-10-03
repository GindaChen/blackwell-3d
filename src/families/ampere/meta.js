export default {
  id: 'ampere',
  name: 'NVIDIA Ampere',
  accent: '#e8734a',
  order: 40,
  blurb: 'The A100 SXM4 module and the HGX A100 board that ties eight of them together through six NVSwitches.',
  views: {
    a100: {
      title: 'A100 SXM4', long: 'A100 SXM4', short: 'A100',
      blurb: 'One GA100 die and six HBM sites (five active) on CoWoS-S, on an SXM4 module.',
      stats: ['80 GB HBM2e', '2.0 TB/s', '400 W'],
    },
    'hgx-a100': {
      title: 'HGX A100 (8-GPU)', long: 'HGX A100', short: 'HGX',
      blurb: 'Eight air-cooled A100s and six NVSwitches: 600 GB/s between any two GPUs.',
      stats: ['8 GPUs', '640 GB HBM', '6 NVSwitches'],
    },
  },
};
