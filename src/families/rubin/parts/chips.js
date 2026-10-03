// Chip packages. All dimensions in millimetres; packages sit on y=0 (board surface), centred on x/z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from './materials.js';
import { rubinDie, veraMarkedDie, veraDie, smallDie, lidTexture, substrateTexture, hbmTexture } from '../textures/silicon.js';
import { tagPart, explode } from '../../../lib/util.js';

const box = (w, h, d) => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  return g;
};

/** A rectangular frame (ring) of given outer/inner size made of 4 bars. */
function frame(outerW, outerD, bar, height, mat, y = 0) {
  const g = new THREE.Group();
  const add = (w, d, x, z) => {
    const m = new THREE.Mesh(box(w, height, d), mat);
    m.position.set(x, y, z);
    g.add(m);
  };
  add(outerW, bar, 0, -outerD / 2 + bar / 2);
  add(outerW, bar, 0, outerD / 2 - bar / 2);
  add(bar, outerD - bar * 2, -outerW / 2 + bar / 2, 0);
  add(bar, outerD - bar * 2, outerW / 2 - bar / 2, 0);
  return g;
}

function dieMaterial(tex, { iridescence = 0.55, rough = 0.16 } = {}) {
  return new THREE.MeshPhysicalMaterial({
    map: tex,
    color: '#ffffff',
    metalness: 0.35,
    roughness: rough,
    iridescence,
    iridescenceIOR: 1.7,
    iridescenceThicknessRange: [180, 520],
    clearcoat: 0.6,
    clearcoatRoughness: 0.08,
    specularIntensity: 1,
  });
}

/** Box where only the top face gets `topMat`, sides get `sideMat`. */
function topMesh(w, h, d, topMat, sideMat) {
  const mats = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
  return new THREE.Mesh(box(w, h, d), mats);
}

let rubinShared = null;
function rubinMats() {
  if (rubinShared) return rubinShared;
  const M = materials();
  rubinShared = {
    dieA: dieMaterial(rubinDie(false)),
    dieB: dieMaterial(rubinDie(true)),
    sub: new THREE.MeshPhysicalMaterial({ map: substrateTexture({ seed: 4 }), roughness: 0.45, metalness: 0.1, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    hbm: new THREE.MeshPhysicalMaterial({ map: hbmTexture(), roughness: 0.3, metalness: 0.15, clearcoat: 0.3, clearcoatRoughness: 0.2 }),
    lidTop: new THREE.MeshPhysicalMaterial({ map: lidTexture(1), metalness: 1, roughness: 0.32, roughnessMap: M.nickel.roughnessMap }),
  };
  return rubinShared;
}

/**
 * Rubin GPU package: two reticle-sized compute dies + 8 HBM4 stacks on a CoWoS-L interposer,
 * champagne stiffener ring, optional nickel IHS lid.
 * Footprint 92 x 106 mm (portrait as mounted on the superchip).
 */
export function rubinGPU({ index = 0 } = {}) {
  const M = materials();
  const R = rubinMats();
  // Substrate and stiffener are untagged on purpose: hovering them selects the whole GPU.
  const g = new THREE.Group();
  g.name = `rubin-gpu-${index}`;
  const SW = 92, SD = 106, ST = 1.8;

  const sub = topMesh(SW, ST, SD, R.sub, M.pcbEdge);
  g.add(sub);

  const stiff = frame(SW - 1, SD - 1, 6.5, 1.5, M.stiffenerGold, ST);
  g.add(stiff);

  // Interposer (CoWoS-L) and underfill
  const ip = new THREE.Mesh(box(72, 0.7, 82), M.interposer);
  ip.position.y = ST;
  tagPart(ip, 'gpu-interposer', 'CoWoS-L interposer', 'Silicon bridge interposer wiring the two compute dies to each other and to 8 HBM4 stacks.');
  g.add(ip);
  const uf = new THREE.Mesh(box(73.5, 0.35, 83.5), M.underfill);
  uf.position.y = ST - 0.05;
  g.add(uf);

  const top = ST + 0.7;
  const dieH = 0.78;
  const dies = new THREE.Group();
  [-1, 1].forEach((s, i) => {
    const d = new THREE.Mesh(box(36.2, dieH, 36.6), i ? R.dieB : R.dieA);
    d.position.set(0, top, s * 18.5);
    tagPart(d, 'rubin-die', 'Rubin compute die', 'One of two reticle-sized GPU dies (TSMC 3 nm-class). Together: 336B transistors, 50 PFLOPS NVFP4 inference.');
    dies.add(d);
  });
  g.add(dies);

  const hbms = new THREE.Group();
  for (const sx of [-1, 1])
    for (const z of [-21.9, -7.3, 7.3, 21.9]) {
      const h = new THREE.Mesh(box(12.4, dieH, 14), R.hbm);
      h.position.set(sx * 25.6, top, z);
      tagPart(h, 'hbm4', 'HBM4 memory stack', '12-high HBM4 stack. 8 per GPU = 288 GB at ~22 TB/s aggregate.');
      hbms.add(h);
    }
  g.add(hbms);

  // Lid (IHS) - toggleable
  const lid = new THREE.Group();
  lid.name = 'gpu-lid';
  // RoundedBoxGeometry has no material groups, so the laser marking is a decal plane on top.
  const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(88, 2.6, 102, 3, 1.2), M.nickel);
  lidMesh.position.y = ST + 1.5 + 1.3;
  lid.add(lidMesh);
  const lidMark = new THREE.Mesh(new THREE.PlaneGeometry(85, 99), R.lidTop);
  lidMark.rotation.x = -Math.PI / 2;
  lidMark.position.y = ST + 1.5 + 2.61;
  lid.add(lidMark);
  tagPart(lid, 'gpu-lid', 'Integrated heat spreader (lid)', 'Nickel-plated lid as fitted to the GTC 2025 sample (marking "T TW 2538", likely a Taiwan / 2025 week-38 date code). Toggle it off to see the dies and HBM4 beneath.');
  explode(lid, 0, 40, 0);
  g.add(lid);
  explode(dies, 0, 10, 0);
  explode(hbms, 0, 16, 0);
  return g;
}

let veraMats = null;
/** Two looks for the Vera die: polished/laser-marked backside (as photographed) or floorplan (as rendered). */
export function veraDieMaterials() {
  if (!veraMats) veraMats = {
    marked: dieMaterial(veraMarkedDie(), { iridescence: 0.08, rough: 0.1 }),
    floorplan: dieMaterial(veraDie(), { iridescence: 0.45 }),
  };
  return veraMats;
}

/** Vera CPU: 88 Olympus cores, teal substrate, polished bare die, silver stiffener frame. */
export function veraCPU() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'vera-cpu';
  const subMat = new THREE.MeshPhysicalMaterial({
    map: substrateTexture({ w: 720, h: 740, color: '#0e6662', capColor: '#d6c38a', ring: 0.08, seed: 8 }),
    roughness: 0.35, metalness: 0.05, clearcoat: 0.5, clearcoatRoughness: 0.2,
  });
  const sub = topMesh(70, 1.4, 72, subMat, M.pcbEdge);
  g.add(sub);

  const stiff = frame(80, 82, 7.5, 2.4, M.nickel, 0);
  g.add(stiff);

  const uf = new THREE.Mesh(box(48, 0.5, 58), M.moldBlack);
  uf.position.y = 1.4;
  g.add(uf);
  const die = new THREE.Mesh(box(46, 0.8, 56), veraDieMaterials().marked);
  die.name = 'vera-die';
  die.userData.looks = 'rubin-vera'; // floorplan toggle (families looks mechanism); upstream swapped by name in main.js
  die.position.y = 1.5;
  tagPart(die, 'vera-die', 'Vera CPU die', '88 custom Arm "Olympus" cores / 176 threads, 1.8 TB/s NVLink-C2C to the two Rubin GPUs, up to 1.5 TB LPDDR5X.');
  g.add(die);
  explode(die, 0, 14, 0);
  return g;
}

/** Generic smaller package (ConnectX-9, BlueField-4) with stiffener and exposed die. */
export function smallPackage({ size = 40, die = 18, dieD = null, stiffener = true, seed = 5, hue = [190, 280], subColor = '#1b1d1c', id = 'pkg', label = 'Package', info = '' } = {}) {
  const M = materials();
  const g = new THREE.Group();
  const subMat = new THREE.MeshPhysicalMaterial({
    map: substrateTexture({ w: 512, h: 512, color: subColor, ring: 0.12, seed }),
    roughness: 0.45, metalness: 0.1, clearcoat: 0.3,
  });
  const sub = topMesh(size, 1.2, size, subMat, M.pcbEdge);
  g.add(sub);
  if (stiffener) {
    const s = frame(size - 0.6, size - 0.6, size * 0.09, 1.0, M.stiffenerGold, 1.2);
    g.add(s);
  }
  const d = new THREE.Mesh(box(die, 0.75, dieD ?? die), dieMaterial(smallDie(seed, hue[0], hue[1])));
  d.position.y = 1.2;
  g.add(d);
  tagPart(g, id, label, info);
  return g;
}

/** LPDDR5X package for SOCAMM modules. */
export function lpddrPackage(w = 12, d = 17) {
  const M = materials();
  return new THREE.Mesh(box(w, 1.1, d), M.moldBlack);
}

export { box, frame, topMesh, dieMaterial };
