// NVIDIA HGX H100 / H200 8-GPU baseboard (air-cooled), as used in DGX H100 and most 8-GPU Hopper servers.
//
// Eight SXM5 modules (H100 or H200) and four third-generation NVSwitch chips (TSMC 4N, 25.1B
// transistors, 50 x 50 mm package). Every GPU spreads its 18 NVLink 4 links over all four switches
// (5 + 4 + 4 + 5), so each GPU gets 900 GB/s to every other GPU, 3.6 TB/s bisection. The host (x86
// CPUs, NICs) is a separate board, reached over 8 x PCIe Gen5 x16.
//
// Layout follows public photos and NVIDIA renders of the HGX H100 board: GPUs in two rows of four,
// the four NVSwitch chips in a row at one end of the board (unlike HGX B200, which moved its two
// switch chips to the middle), host and power connectors on the same end edge. Tall air heatsinks
// on the GPUs, shorter ones on the switches. All dimensions are ESTIMATES (no mechanical drawings
// are public); see docs/2026-10-03-hopper-design.md and SOURCES.md.
//
// Coordinates (mm): x across the board, z = +front (air intake side) .. -rear (switches, host and
// power connectors), y up; y = 0 is the underside of the tray pan.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materials } from '../../parts/materials.js';
import { box, smallPackage, topMesh, dieMaterial } from '../../parts/chips.js';
import { InstancedSet, unitBox, unitRounded, ic } from '../../parts/boardParts.js';
import { buildPcbTextures } from '../../textures/pcb.js';
import { substrateTexture } from '../../textures/silicon.js';
import { mesh, at, screwHead, labelTexture, finnedHeatsink } from '../../assemblies/tray.js';
import { tagPart, explode, shadowAll } from '../../lib/util.js';
import { optimize } from '../../lib/optimize.js';
import { MOD, MOD_TOP, PKG_H } from './sxm5.js';
import { nvswitch3Die } from './textures.js';

export const HGX = {
  W: 448, D: 540,              // tray pan (estimate)
  BW: 430, BL: 510,            // baseboard (estimate)
  BB_Y: 7, BB_T: 2.4,          // baseboard height above the pan, thickness
};
const BB_TOP = HGX.BB_Y + HGX.BB_T;
const COL_X = [-159, -53, 53, 159];
const ROW_Z = [163, 3];        // module centres (modules run long axis front-to-back)
const SW_X = [-156, -52, 52, 156], SW_Z = -128;
const HOST_Z = -200, PWR_Z = -236;
const PKG_TOP = BB_TOP + MOD_TOP + 0.25 + PKG_H; // bare-die top surface
const HS_BASE = PKG_TOP + 7.5;  // vapour-chamber plate clears the module's inductors
const HS_H = 84;                // fin stack height (estimate)

function trayPan() {
  const M = materials();
  const g = new THREE.Group();
  const { W, D } = HGX;
  g.add(mesh(box(W, 1.2, D), M.steel));
  for (const s of [-1, 1]) g.add(mesh(box(1.2, 40, D), M.steel, s * (W / 2 - 0.6), 0, 0));
  g.add(mesh(box(W, 14, 1.2), M.steel, 0, 0, -D / 2 + 0.6));
  for (const x of [-190, -95, 0, 95, 190]) for (const z of [-220, -60, 100, 230])
    g.add(mesh(new THREE.CylinderGeometry(3, 3, HGX.BB_Y - 1.2, 12), M.steelDark, x, 1.2 + (HGX.BB_Y - 1.2) / 2, z));
  tagPart(g, 'hgx3-tray', 'GPU tray', 'Sheet-metal tray that carries the baseboard. In DGX H100 it slides into the 8U chassis behind the front fan wall; CPUs, memory and NICs live in a separate motherboard tray.');
  return g;
}

function baseboard() {
  const M = materials();
  const { BW, BL, BB_Y, BB_T } = HGX;
  const silk = [], holes = [], pours = [], bundles = [], pads = [];
  // module outlines and NVLink fan-out from each module's rear end to all four switches
  for (const z of ROW_Z) for (const x of COL_X) {
    silk.push({ type: 'rect', x, z, w: MOD.W + 2, d: MOD.L + 2, lw: 0.3 });
    for (const sx of SW_X) bundles.push({ pts: [[x, z - MOD.L / 2 + 20], [x + (sx - x) * 0.15, z - MOD.L / 2 - 4], [sx + (x - sx) * 0.25, SW_Z + 40], [sx, SW_Z + 26]], n: 5, pitch: 0.5, width: 0.16 });
  }
  for (const sx of SW_X) silk.push({ type: 'rect', x: sx, z: SW_Z, w: 52, d: 52, lw: 0.3 });
  for (let k = 0; k < 8; k++) bundles.push({ pts: [[-175 + k * 50, HOST_Z + 10], [-175 + k * 50, HOST_Z + 40]], n: 10, pitch: 0.45, width: 0.15 });
  for (const x of [-200, -106, 0, 106, 200]) for (const z of [-170, 83, 240]) holes.push({ x, z, r: 1.6, ring: 3.2 });
  pours.push({ x: 0, z: PWR_Z, w: BW - 20, d: 30 });
  silk.push({ type: 'text', x: 0, z: 248, text: 'NVIDIA HGX H100 8-GPU', size: 3, weight: 700 });
  const tex = buildPcbTextures({ W: BW, L: BL, ppm: 3.5, seed: 31, silk, holes, pours, bundles, pads, viaCount: 8000 });
  const top = new THREE.MeshPhysicalMaterial({ map: tex.map, normalMap: tex.normal, normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: tex.rm, metalnessMap: tex.rm, roughness: 1, metalness: 1, clearcoat: 0.12, clearcoatRoughness: 0.5 });
  const pcb = mesh(new THREE.BoxGeometry(BW, BB_T, BL), [M.pcbEdge, M.pcbEdge, top, M.pcbEdge, M.pcbEdge, M.pcbEdge], 0, BB_Y + BB_T / 2, 0);
  tagPart(pcb, 'hgx3-baseboard', 'HGX H100 baseboard', 'Large multi-layer board that wires the eight GPUs to the four NVSwitch chips (144 NVLink 4 links in total) and to the host connectors. The same board takes H100 or H200 modules.');
  return pcb;
}

let nvsMat = null;
function nvSwitch(i) {
  const M = materials();
  if (!nvsMat) nvsMat = {
    die: dieMaterial(nvswitch3Die()),
    sub: new THREE.MeshPhysicalMaterial({ map: substrateTexture({ w: 512, h: 512, color: '#1b1d1c', ring: 0.12, seed: 33 }), roughness: 0.45, metalness: 0.1, clearcoat: 0.3 }),
  };
  const g = new THREE.Group();
  g.add(topMesh(50, 1.4, 50, nvsMat.sub, M.pcbEdge));
  const lidless = new THREE.Mesh(box(17.1, 0.75, 17.1), nvsMat.die); // 294 mm² die
  lidless.position.y = 1.4;
  g.add(lidless);
  g.add(mesh(box(36, 0.9, 1.6), M.stiffenerGold, 0, 1.4, -18), mesh(box(36, 0.9, 1.6), M.stiffenerGold, 0, 1.4, 18));
  tagPart(g, 'nvswitch3', `NVSwitch ${i} (3rd gen)`, 'Third-generation NVSwitch: TSMC 4N, 25.1 billion transistors, 64 NVLink 4 ports. Each GPU connects to all four switches, with 4 or 5 links to each. The switches can also do reductions in the network (SHARP), so all-reduce traffic is summed inside the switch.');
  return g;
}

/** Heatsinks: GPU ones lift with the lids toggle; everything follows the cooling toggle. */
function heatsinks() {
  const M = materials();
  const g = new THREE.Group();
  g.name = 'cooling';
  const lift = new THREE.Group();
  lift.name = 'gpu-coldplate-lift';
  g.add(lift);
  const label = new THREE.MeshStandardMaterial({ map: labelTexture(['NVIDIA', 'H100 SXM5'], { bg: '#c9ccd0', size: 34 }), roughness: 0.5 });
  ROW_Z.forEach((z, r) => COL_X.forEach((x, c) => {
    const hs = new THREE.Group();
    // copper pedestal onto the die + HBM, then the vapour-chamber plate over the whole module
    hs.add(mesh(box(56, HS_BASE - PKG_TOP, 64), M.copper, x, PKG_TOP, z));
    hs.add(mesh(box(MOD.W - 4, 4, MOD.L - 6), M.copper, x, HS_BASE, z));
    const fins = finnedHeatsink(MOD.W - 6, MOD.L - 10, HS_H, { pitch: 2.2, fin: 0.4, base: 2 });
    fins.position.set(x, HS_BASE + 4, z);
    hs.add(fins);
    for (let k = 0; k < 4; k++) {
      const p = mesh(new THREE.CylinderGeometry(3, 3, MOD.W - 10, 14), M.copper, x, HS_BASE + 4 + HS_H + 1.5, z - 48 + k * 32);
      p.rotation.z = Math.PI / 2;
      hs.add(p);
    }
    hs.add(mesh(new THREE.PlaneGeometry(40, 10), label, x, HS_BASE + 4 + HS_H + 0.02, z + MOD.L / 2 - 14).rotateX(-Math.PI / 2));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) hs.add(at(screwHead(M.screw, 2.4, 3), x + sx * (MOD.W / 2 - 7), HS_BASE + 4, z + sz * (MOD.L / 2 - 6)));
    tagPart(hs, 'h100-heatsink', `GPU heatsink ${r * 4 + c}`, 'Copper pedestal and vapour chamber under a tall aluminium fin stack, sized for 700 W per GPU. Liquid-cooled HGX H100/H200 boards replace these with cold plates. Height is an estimate.');
    lift.add(hs);
  }));
  const sw = new THREE.Group();
  for (const x of SW_X) {
    const f = finnedHeatsink(64, 58, 44, { pitch: 2.4 });
    f.position.set(x, BB_TOP + 2.2, SW_Z);
    sw.add(f);
  }
  tagPart(sw, 'nvswitch-heatsink', 'NVSwitch heatsinks', 'Finned heatsinks on the four NVSwitch chips, downstream of the GPUs in the airflow.');
  g.add(sw);
  explode(g, 0, 170, 0);
  return g;
}

function hostAndPower(sets) {
  const M = materials();
  const g = new THREE.Group();
  const host = new THREE.Group();
  for (let k = 0; k < 8; k++) {
    const x = -175 + k * 50;
    host.add(mesh(box(30, 12, 16), M.lcpBlack, x, BB_TOP, HOST_Z));
    host.add(mesh(box(26, 0.3, 3), M.gold, x, BB_TOP + 12, HOST_Z + 3));
    host.add(mesh(box(26, 0.3, 3), M.gold, x, BB_TOP + 12, HOST_Z - 3));
    for (let j = 0; j < 12; j++) sets.mlcc.add(x - 13 + j * 2.3, BB_TOP, HOST_Z + 13, 1.0, 0.5, 0.5, 0);
  }
  tagPart(host, 'hgx3-host', 'Host connectors (PCIe Gen5)', 'High-speed connectors that carry eight PCIe Gen5 x16 links, one per GPU, to the host board\'s PCIe switches, CPUs and network cards. Connector type and count are estimates.');
  explode(host, 0, 30, 0);
  g.add(host);

  const pwr = new THREE.Group();
  for (const x of [-170, -60, 60, 170]) {
    pwr.add(mesh(new RoundedBoxGeometry(56, 20, 22, 2, 1.5), M.lcpBlack, x, BB_TOP, PWR_Z));
    for (const dx of [-15, -5, 5, 15]) pwr.add(mesh(box(4, 14, 16), M.copper, x + dx, BB_TOP + 2, PWR_Z - 10));
  }
  tagPart(pwr, 'hgx3-power', 'Baseboard power connectors', 'High-current 54 V inputs from the chassis power supplies. Eight GPUs at 700 W plus the switches add up to roughly 6 kW for the board.');
  explode(pwr, 0, 30, -30);
  g.add(pwr);

  const hmc = ic(16, 1.6, 16, ['HMC', 'AST', '2600']);
  hmc.position.set(0, BB_TOP, SW_Z);
  tagPart(hmc, 'hgx3-hmc', 'HGX management controller (HMC)', 'Baseboard management controller on the GPU board: GPU and NVSwitch telemetry, firmware updates and power control, reported to the host BMC.');
  explode(hmc, 0, 30, 0);
  g.add(hmc);

  // NVSwitch VRMs
  for (const x of SW_X) for (const s of [-1, 1]) for (let k = 0; k < 6; k++)
    sets.pstage.add(x + s * 29, BB_TOP, SW_Z - 18 + k * 7.2, 4.4, 2.0, 5.4, 0);
  return g;
}

/** HGX H100 8-GPU. `module` is a clone of the SXM5 view model (ctx.model('h100')). */
export function buildHGXH100({ module }) {
  const M = materials();
  const root = new THREE.Group();
  root.name = 'hgx-h100';
  root.add(trayPan());
  root.add(baseboard());
  const sets = {
    pstage: new InstancedSet(unitRounded(0.1), M.powerStage, { id: 'nvs-power-stage', label: 'NVSwitch power stages', info: 'Power stages for the NVSwitch core rails, on both sides of each switch.' }),
    mlcc: new InstancedSet(unitBox(), M.mlcc, { id: 'host-mlcc', label: 'MLCC decoupling capacitors', info: 'Ceramic capacitors (PCIe AC-coupling and decoupling) next to the host connectors.' }),
  };
  ROW_Z.forEach((z, r) => COL_X.forEach((x, c) => {
    const m = r === 0 && c === 0 ? module : module.clone();
    m.rotation.y = Math.PI / 2; // long axis front-to-back, HBM rows towards the neighbouring columns
    const w = new THREE.Group();
    w.position.set(x, BB_TOP, z);
    w.add(m);
    tagPart(w, 'sxm5-module', `SXM5 module ${r * 4 + c}`, 'One H100 (or H200) on its SXM5 module, plugged into the baseboard through two mezzanine connectors.');
    explode(w, 0, 60, 0);
    root.add(w);
  }));
  const sw = new THREE.Group();
  SW_X.forEach((x, i) => {
    const s = nvSwitch(i);
    s.position.set(x, BB_TOP, SW_Z);
    explode(s, 0, 40, 0);
    sw.add(s);
  });
  root.add(sw);
  root.add(hostAndPower(sets));
  root.add(heatsinks());
  for (const s of Object.values(sets)) root.add(s.build());
  shadowAll(root);
  root.traverse((o) => { if (o.isInstancedMesh) o.castShadow = false; });
  return optimize(root);
}
