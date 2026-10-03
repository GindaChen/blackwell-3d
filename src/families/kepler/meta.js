export default {
  id: 'kepler',
  name: 'NVIDIA Kepler',
  accent: '#7f8cff',
  order: 60,
  blurb: 'The 2014 Tesla K80: two GK210 GPUs, a PCIe switch and 48 GDDR5 chips on one passively cooled card.',
  views: {
    k80: {
      title: 'Tesla K80', long: 'Tesla K80', short: 'K80',
      blurb: 'A dual-GPU PCIe card: two GK210s behind a PLX switch, GDDR5 on both sides, cooled only by the server\'s fans.',
      stats: ['2× GK210', '24 GB GDDR5', '300 W'],
    },
  },
};
