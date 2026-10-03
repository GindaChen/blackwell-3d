export default {
  id: 'volta',
  name: 'NVIDIA Volta',
  accent: '#e0a33a',
  order: 50,
  blurb: 'The V100 SXM2 module that introduced Tensor Cores, and eight of them wired into DGX-1\'s hybrid cube-mesh.',
  views: {
    v100: {
      title: 'Tesla V100 SXM2', long: 'V100 SXM2', short: 'V100',
      blurb: 'An 815 mm² GV100 die and four HBM2 stacks on CoWoS, on a 140 × 78 mm mezzanine module.',
      stats: ['16/32 GB HBM2', '900 GB/s', '300 W'],
    },
    dgx1: {
      title: 'DGX-1 (V100) GPU board', long: 'DGX-1 board', short: 'DGX-1',
      blurb: 'Eight V100s wired GPU-to-GPU in a hybrid cube-mesh: no NVSwitch, six NVLink 2 links each.',
      stats: ['8 GPUs', '128 GB HBM2', '24 NVLinks'],
    },
  },
};
