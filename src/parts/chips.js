// Chip packages. All dimensions in millimetres; packages sit on y=0 (board surface), centred on x/z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from './materials.js';
import { blackwellDie, graceMarkedDie, graceDie, smallDie, lidTexture, substrateTexture, hbmTexture } from '../textures/silicon.js';
import { tagPart, explode } from '../lib/util.js';

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

let b200Shared = null;
function b200Mats() {
  if (b200Shared) return b200Shared;
  const M = materials();
  b200Shared = {
    dieA: dieMaterial(blackwellDie(false)),
    dieB: dieMaterial(blackwellDie(true)),
    sub: new THREE.MeshPhysicalMaterial({ map: substrateTexture({ w: 780, h: 840, seed: 4 }), roughness: 0.45, metalness: 0.1, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    hbm: new THREE.MeshPhysicalMaterial({ map: hbmTexture(), roughness: 0.3, metalness: 0.15, clearcoat: 0.3, clearcoatRoughness: 0.2 }),
    lidTop: new THREE.MeshPhysicalMaterial({ map: lidTexture(1), metalness: 1, roughness: 0.32, roughnessMap: M.nickel.roughnessMap }),
  };
  return b200Shared;
}

// B200 package geometry (mm). Two ~26 x 33 mm dies sit side by side along x, meeting on their long
// edge (the NV-HBI die-to-die link). Each die has two HBM3e stacks along each short edge, so the
// package reads as a row of four stacks above and four below the die pair.
export const B200 = { SW: 78, SD: 84, ST: 1.8, DIE_W: 26, DIE_D: 33, HBM: 11 };

/**
 * NVIDIA B200 GPU package: two reticle-limited Blackwell dies + 8 HBM3e stacks on a CoWoS-L
 * interposer, gold stiffener ring, optional nickel heat-spreader lid. Footprint ~78 x 84 mm.
 */
export function b200GPU({ index = 0 } = {}) {
  const M = materials();
  const R = b200Mats();
  // Substrate and stiffener are untagged on purpose: hovering them selects the whole GPU.
  const g = new THREE.Group();
  g.name = `b200-gpu-${index}`;
  const { SW, SD, ST, DIE_W, DIE_D, HBM } = B200;

  g.add(topMesh(SW, ST, SD, R.sub, M.pcbEdge));
  g.add(frame(SW - 1, SD - 1, 5.5, 1.5, M.stiffenerGold, ST));

  // Interposer (CoWoS-L) and underfill
  const ip = new THREE.Mesh(box(58, 0.7, 62), M.interposer);
  ip.position.y = ST;
  tagPart(ip, 'gpu-interposer', 'CoWoS-L interposer', 'Silicon-bridge interposer that joins the two compute dies and wires them to all 8 HBM3e stacks.');
  g.add(ip);
  const uf = new THREE.Mesh(box(59.5, 0.35, 63.5), M.underfill);
  uf.position.y = ST - 0.05;
  g.add(uf);

  const top = ST + 0.7;
  const dieH = 0.78;
  const dies = new THREE.Group();
  [-1, 1].forEach((s, i) => {
    const d = new THREE.Mesh(box(DIE_W, dieH, DIE_D), i ? R.dieB : R.dieA);
    d.position.set(s * (DIE_W / 2 + 0.5), top, 0);
    tagPart(d, 'b200-die', 'Blackwell compute die', 'One of two reticle-limited dies (TSMC 4NP, 104B transistors each). The pair behaves as one GPU with 208B transistors.');
    dies.add(d);
  });
  g.add(dies);

  const hbms = new THREE.Group();
  for (const sz of [-1, 1])
    for (const x of [-19.75, -6.75, 6.75, 19.75]) {
      const h = new THREE.Mesh(box(HBM, dieH, HBM + 1), R.hbm);
      h.position.set(x, top, sz * (DIE_D / 2 + 1.5 + (HBM + 1) / 2));
      tagPart(h, 'hbm3e', 'HBM3e memory stack', '8-high HBM3e stack (24 GB). Eight per GPU: up to 192 GB at 8 TB/s (186 GB per GPU in GB200 NVL72).');
      hbms.add(h);
    }
  g.add(hbms);

  // Lid (heat spreader) - toggleable
  const lid = new THREE.Group();
  lid.name = 'gpu-lid';
  const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(SW - 4, 2.6, SD - 4, 3, 1.2), M.nickel);
  lidMesh.position.y = ST + 1.5 + 1.3;
  lid.add(lidMesh);
  const lidMark = new THREE.Mesh(new THREE.PlaneGeometry(SW - 7, SD - 7), R.lidTop);
  lidMark.rotation.x = -Math.PI / 2;
  lidMark.position.y = ST + 1.5 + 2.61;
  lid.add(lidMark);
  tagPart(lid, 'gpu-lid', 'Heat spreader (lid)', 'Optional nickel-plated lid, shown for illustration. Production liquid-cooled B200s put the cold plate straight onto the bare dies. Turn the lids toggle off to see the dies and HBM3e underneath.');
  explode(lid, 0, 36, 0);
  g.add(lid);
  explode(dies, 0, 9, 0);
  explode(hbms, 0, 15, 0);
  return g;
}

let graceMats = null;
/** Two looks for the Grace die: polished/laser-marked backside or floorplan. */
export function graceDieMaterials() {
  if (!graceMats) graceMats = {
    marked: dieMaterial(graceMarkedDie(), { iridescence: 0.08, rough: 0.1 }),
    floorplan: dieMaterial(graceDie(), { iridescence: 0.45 }),
  };
  return graceMats;
}

/** Grace CPU: 72 Arm Neoverse V2 cores, dark substrate, polished bare die, nickel stiffener frame. */
export function graceCPU() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'grace-cpu';
  const subMat = new THREE.MeshPhysicalMaterial({
    map: substrateTexture({ w: 640, h: 680, color: '#1a1d1b', capColor: '#d6c38a', ring: 0.1, seed: 8 }),
    roughness: 0.4, metalness: 0.05, clearcoat: 0.45, clearcoatRoughness: 0.25,
  });
  g.add(topMesh(52, 1.4, 56, subMat, M.pcbEdge));
  g.add(frame(60, 64, 6, 2.4, M.nickel, 0));
  const uf = new THREE.Mesh(box(30, 0.5, 33), M.moldBlack);
  uf.position.y = 1.4;
  g.add(uf);
  const die = new THREE.Mesh(box(28, 0.8, 31), graceDieMaterials().marked);
  die.name = 'grace-die';
  die.userData.looks = 'grace';
  die.position.y = 1.5;
  tagPart(die, 'grace-die', 'Grace CPU die', '72 Arm Neoverse V2 cores on NVIDIA\'s Scalable Coherency Fabric, 114 MB L3. 900 GB/s NVLink-C2C to the two B200 GPUs.');
  g.add(die);
  explode(die, 0, 12, 0);
  return g;
}

/** Generic smaller package (ConnectX-7, BlueField-3, NVLink switch) with stiffener and exposed die. */
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

/** LPDDR5X / LPDDR5 memory package. */
export function lpddrPackage(w = 12, d = 17) {
  const M = materials();
  return new THREE.Mesh(box(w, 1.1, d), M.moldBlack);
}

export { box, frame, topMesh, dieMaterial };
