export default {
  id: 'rtx',
  name: 'NVIDIA RTX (Blackwell desktop)',
  accent: '#e8a33d',
  order: 70,
  blurb: 'The same GB202 chip in a gaming card and a workstation card: GDDR7 on a PCIe board, not HBM on a superchip.',
  views: {
    rtx5090: {
      title: 'GeForce RTX 5090 Founders Edition', long: 'RTX 5090 FE', short: '5090',
      blurb: 'A 575 W GB202 on a three-piece board, cooled by two fans that blow straight through.',
      stats: ['32 GB GDDR7', '1.79 TB/s', '575 W'],
    },
    rtxpro6000: {
      title: 'RTX PRO 6000 Blackwell Workstation Edition', long: 'RTX PRO 6000', short: 'PRO',
      blurb: 'Nearly the full GB202 with 96 GB of ECC GDDR7, memory on both sides of the board.',
      stats: ['96 GB GDDR7 ECC', '188 SMs', '600 W'],
    },
  },
};
