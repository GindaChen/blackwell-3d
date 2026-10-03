// Apple M5 Ultra package. All dimensions in millimetres; the package sits on y=0, centred on x/z.
//
// M5 Ultra = two M5 Max joined by UltraFusion. Each M5 Max is a CPU tile + a GPU tile hybrid-bonded
// onto its own silicon interposer, so the package carries four tiles in a column along z:
//   CPU A | GPU A | UltraFusion | GPU B | CPU B
// with four LPDDR5X packages on each side of the GPU tiles (1024-bit, 1.2 TB/s, up to 512 GB).
// Apple publishes no package drawings; sizes are estimates (docs/2026-10-03-apple-design.md).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from './materials.js';
import { box, topMesh, frame, dieMaterial } from './chips.js';
import { substrateTexture } from '../textures/silicon.js';
import { markedTop } from '../textures/surfaces.js';
import { appleCpuTile, appleGpuTile, appleMarkedTile, appleLidTexture } from '../textures/apple.js';
import { tagPart, explode } from '../lib/util.js';

export const ULTRA = {
  W: 60, D: 72, T: 1.6,
  CPU: [18.0, 9.3], GPU: [19.6, 16.4],
  GAP: 0.6,          // half the gap between the two M5 Max blocks (the UltraFusion seam)
  DRAM: [13, 12.6], DRAM_X: 18.4, DRAM_Z: [-19.8, -6.6, 6.6, 19.8],
};

let shared = null;
function mats() {
  if (shared) return shared;
  shared = {
    cpu: { floorplan: dieMaterial(appleCpuTile()), marked: dieMaterial(appleMarkedTile(1024, 528, 3), { iridescence: 0.1, rough: 0.12 }) },
    gpu: { floorplan: dieMaterial(appleGpuTile()), marked: dieMaterial(appleMarkedTile(1024, 856, 4), { iridescence: 0.1, rough: 0.12 }) },
    sub: new THREE.MeshPhysicalMaterial({
      map: substrateTexture({ w: 600, h: 720, color: '#17191b', capColor: '#c9b98e', ring: 0.08, seed: 12 }),
      roughness: 0.42, metalness: 0.08, clearcoat: 0.4, clearcoatRoughness: 0.25,
    }),
    dram: new THREE.MeshStandardMaterial({
      map: markedTop({ w: 260, h: 252, lines: ['LPDDR5X', '64GB', '9600'], size: 30, ink: 'rgba(170,170,170,0.5)' }),
      roughness: 0.62,
    }),
    bridge: new THREE.MeshPhysicalMaterial({ color: '#6fb7a8', metalness: 0.5, roughness: 0.22, iridescence: 0.6, iridescenceIOR: 1.6 }),
    lidTop: new THREE.MeshPhysicalMaterial({ map: appleLidTexture('M5 ULTRA'), metalness: 1, roughness: 0.34, roughnessMap: materials().nickel.roughnessMap }),
  };
  return shared;
}

/**
 * The die tiles carry a key to both looks; main.js swaps them with the floorplan toggle. (A key, not
 * the materials themselves: userData is JSON-copied when a model is cloned.)
 */
export const tileLooks = (key) => mats()[key];
function tile(w, d, key, id, label, info) {
  const m = new THREE.Mesh(box(w, 0.75, d), mats()[key].marked);
  m.userData.looks = key;
  tagPart(m, id, label, info);
  return m;
}

/** One M5 Max: interposer + CPU tile + GPU tile. side = -1 (rear, first die) or +1 (front, rotated 180°). */
function m5Max(side, index) {
  const M = materials();
  const { CPU, GPU, GAP } = ULTRA;
  const g = new THREE.Group();
  g.name = `m5-max-${index}`;
  const span = GPU[1] + 0.2 + CPU[1];
  const ip = new THREE.Mesh(box(21, 0.5, span + 0.6), M.interposer);
  ip.position.set(0, 0, side * (GAP + span / 2));
  tagPart(ip, 'apple-interposer', 'Silicon interposer', 'Passive silicon base that the CPU and GPU tiles are hybrid-bonded onto (TSMC SoIC-X, face to face). It carries the wide, short tile-to-tile wiring.');
  g.add(ip);

  const tiles = new THREE.Group();
  const gpu = tile(GPU[0], GPU[1], 'gpu', 'gpu-tile', `GPU tile ${index}`,
    '40 GPU cores, each with its own Neural Accelerator for matrix math, plus the system level cache, the media engines and the 512-bit LPDDR5X memory controllers.');
  gpu.position.set(0, 0.5, side * (GAP + GPU[1] / 2));
  const cpu = tile(CPU[0], CPU[1], 'cpu', 'cpu-tile', `CPU tile ${index}`,
    '18 cores: 6 super cores and 12 performance cores (no efficiency cores on M5 Pro/Max/Ultra). Also the 16-core Neural Engine, Thunderbolt 5, display and SSD controllers.');
  cpu.position.set(0, 0.5, side * (GAP + GPU[1] + 0.2 + CPU[1] / 2));
  if (side > 0) { gpu.rotation.y = Math.PI; cpu.rotation.y = Math.PI; }
  tiles.add(gpu, cpu);
  explode(tiles, 0, 10, side * 4);
  g.add(tiles);
  return g;
}

/** Apple M5 Ultra package, ~60 x 72 mm. */
export function m5UltraPackage() {
  const M = materials();
  const R = mats();
  const { W, D, T, GAP, DRAM, DRAM_X, DRAM_Z } = ULTRA;
  const g = new THREE.Group();
  g.name = 'm5-ultra';
  // substrate (untagged: hovering it selects the whole package)
  g.add(topMesh(W, T, D, R.sub, M.pcbEdge));

  const maxes = new THREE.Group();
  maxes.position.y = T;
  maxes.add(m5Max(-1, 0), m5Max(1, 1));
  g.add(maxes);

  // UltraFusion: the bridge under the seam between the two GPU tiles
  const bridge = new THREE.Mesh(box(17, 0.45, 4.2), R.bridge);
  bridge.position.set(0, T, 0);
  tagPart(bridge, 'ultrafusion', 'UltraFusion bridge', 'Silicon bridge that joins the two M5 Max chips into one SoC. Apple quotes more than 4.4 TB/s and six times the connection density of the M3 Ultra\'s UltraFusion, so software sees one GPU and one memory pool.');
  g.add(bridge);

  // underfill fillet around each interposer
  for (const s of [-1, 1]) {
    const uf = new THREE.Mesh(box(22, 0.3, 27.6), M.underfill);
    uf.position.set(0, T - 0.05, s * (GAP + 13.2));
    g.add(uf);
  }

  // 8 LPDDR5X packages, 4 per side of the GPU tiles
  const dram = new THREE.Group();
  let i = 0;
  for (const sx of [-1, 1])
    for (const z of DRAM_Z) {
      const p = new THREE.Mesh(box(DRAM[0], 1.0, DRAM[1]), [M.moldBlack, M.moldBlack, R.dram, M.moldBlack, M.moldBlack, M.moldBlack]);
      p.position.set(sx * DRAM_X, T, z);
      tagPart(p, 'apple-lpddr', `LPDDR5X package ${i++}`, 'On-package LPDDR5X-9600, 128 bits wide. Eight of them give 1024 bits, 1.2 TB/s and up to 512 GB of unified memory shared by the CPU, GPU and Neural Engine.');
      dram.add(p);
    }
  explode(dram, 0, 16, 0);
  g.add(dram);

  // stiffener ring and lid
  g.add(frame(W - 0.6, D - 0.6, 2.2, 0.9, M.steelDark, T));
  const lid = new THREE.Group();
  lid.name = 'gpu-lid';
  const lm = new THREE.Mesh(new RoundedBoxGeometry(W - 3, 2.4, D - 3, 3, 1.0), M.aluminum);
  lm.position.y = T + 2.0;
  lid.add(lm);
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(W - 6, D - 6), R.lidTop);
  mark.rotation.x = -Math.PI / 2;
  mark.position.y = T + 3.21;
  lid.add(mark);
  tagPart(lid, 'apple-lid', 'Package lid', 'Metal lid that spreads heat from the four tiles into the heatsink. Turn the lids toggle off to see the tiles and memory underneath.');
  explode(lid, 0, 34, 0);
  g.add(lid);
  return g;
}
