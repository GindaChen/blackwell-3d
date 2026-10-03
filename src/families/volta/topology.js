// DGX-1 (Volta) hybrid cube-mesh: 8 GPUs, 6 NVLink 2 links each, 24 links on 16 GPU pairs.
// Two fully connected quads {0,1,2,3} and {4,5,6,7} (a cube face pair with diagonals) plus 4 links that
// bridge them (0-4, 1-5, 2-6, 3-7). Eight pairs are doubled (NV2 in `nvidia-smi topo -m`).
// Link counts per pair follow the published DGX-1V `nvidia-smi topo -m` matrix; they satisfy the
// whitepaper's description (12 cube edges + 2 face diagonals x 2 faces, 6 links per GPU, 3 rings).
// No .js imports here: the tour file and the board both read it.

export const LINKS = [
  [0, 1, 1], [0, 2, 1], [0, 3, 2], [0, 4, 2],
  [1, 2, 2], [1, 3, 1], [1, 5, 2],
  [2, 3, 2], [2, 6, 1],
  [3, 7, 1],
  [4, 5, 1], [4, 6, 1], [4, 7, 2],
  [5, 6, 2], [5, 7, 1],
  [6, 7, 2],
];

/** The three rings of single NVLink connections that use all 24 links once (NCCL-style rings). */
export const RINGS = [
  [0, 1, 2, 3, 7, 5, 6, 4],
  [0, 2, 6, 7, 4, 5, 1, 3],
  [0, 3, 2, 1, 5, 6, 7, 4],
];

/** PCIe tree: one PCIe Gen3 switch per GPU pair, two switches per CPU, one InfiniBand NIC per switch. */
export const PCIE = [
  { gpus: [0, 1], cpu: 0 },
  { gpus: [2, 3], cpu: 0 },
  { gpus: [4, 5], cpu: 1 },
  { gpus: [6, 7], cpu: 1 },
];

export const neighbours = (g) => LINKS.filter(([a, b]) => a === g || b === g).map(([a, b, n]) => [a === g ? b : a, n]);
