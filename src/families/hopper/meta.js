export default {
  id: 'hopper',
  name: 'NVIDIA Hopper',
  accent: '#4fb3a9',
  order: 30,
  blurb: 'The H100 / H200 SXM5 module, the 8-GPU HGX baseboard, and the GH200 Grace Hopper superchip.',
  views: {
    h100: {
      title: 'H100 / H200 SXM5', long: 'H100 SXM5', short: 'SXM',
      blurb: 'GH100 and six HBM sites on CoWoS-S, on a module with power delivery at both ends.',
      stats: ['80 GB HBM3', '3.35 TB/s', '700 W'],
    },
    'hgx-h100': {
      title: 'HGX H100 / H200 (8-GPU)', long: 'HGX H100', short: 'HGX',
      blurb: 'Eight SXM5 GPUs under tall air heatsinks, four NVSwitch chips at the rear.',
      stats: ['8 GPUs', '640 GB HBM3', '900 GB/s NVLink'],
    },
    gh200: {
      title: 'GH200 Grace Hopper Superchip', long: 'GH200', short: 'GH200',
      blurb: 'A Grace CPU and a Hopper GPU on one module, sharing memory over NVLink-C2C.',
      stats: ['72 Arm cores', '96 GB HBM3 + 480 GB', '900 GB/s C2C'],
    },
  },
};
