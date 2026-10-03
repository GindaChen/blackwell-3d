// GB202 (Blackwell desktop) GPU package and its two die looks.
//
// Facts (see SOURCES.md): 750 mm², 92.2B transistors, TSMC 4N; 12 GPCs × 8 TPCs × 2 SMs = 192 SMs
// (24,576 CUDA cores); 128 MB L2; 16 × 32-bit GDDR7 controllers (512-bit). RTX 5090 enables 170 SMs
// (11 GPCs) and 96 MB of L2; RTX PRO 6000 enables 188 SMs and the full 128 MB.
// Die ~24 × 31 mm in a ~56 × 63 mm package (reported from early board photos; treat as estimates).
//
// The floorplan is stylised, not a die shot: GPCs in 3 columns × 4 rows, the L2 + crossbar band
// across the middle, GDDR7 PHYs placed on the edge facing the memory chips they drive (5 left,
// 5 right, 4 towards the power-connector edge, 2 towards the PCIe edge), and PCIe Gen5 / display /
// media engines on the PCIe-facing edge. Disabled SMs and L2 slices are drawn dimmed.
import * as THREE from 'three';
import { materials } from '../../parts/materials.js';
import { box, frame, topMesh, dieMaterial } from '../../parts/chips.js';
import { substrateTexture } from '../../textures/silicon.js';
import { makeCanvas, canvasTexture, rng, noiseCanvas, tagPart, explode } from '../../lib/util.js';

export const GB202 = { PW: 56, PD: 63, PT: 1.4, DIE_W: 24, DIE_D: 31, DIE_T: 0.7 };

const cache = new Map();
const memo = (k, f) => (cache.has(k) ? cache.get(k) : (cache.set(k, f()), cache.get(k)));

/**
 * Canvas floorplan, portrait (24 wide × 31 tall). Canvas top = the die edge facing the PCIe edge of
 * the card (-z), canvas bottom = the edge facing the power-connector edge (+z).
 * disabledSMs: how many SMs to dim; a whole GPC goes first when `gpcOff` is set.
 */
function gb202Floorplan({ disabledSMs = 0, gpcOff = false, l2Off = 0, seed = 202 } = {}) {
  return memo(`gb202-${disabledSMs}-${gpcOff}-${l2Off}`, () => {
    const W = 768, H = 992;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(seed);
    ctx.fillStyle = '#13171a';
    ctx.fillRect(0, 0, W, H);

    // ---- GDDR7 PHYs: 5 left, 5 right, 4 bottom (towards +z), 2 top (towards the PCIe edge)
    const phy = (x, y, w, h, vertical) => {
      ctx.fillStyle = '#2c2a25';
      ctx.fillRect(x, y, w, h);
      for (let k = 0; vertical ? k < h - 8 : k < w - 8; k += 6) {
        ctx.fillStyle = `rgba(${190 + r() * 40},${165 + r() * 30},110,0.35)`;
        if (vertical) ctx.fillRect(x + 5, y + 4 + k, w - 10, 3);
        else ctx.fillRect(x + 4 + k, y + 5, 3, h - 10);
      }
      ctx.strokeStyle = 'rgba(205,190,150,0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    };
    const edge = 12, phyT = 44;
    const sideY0 = 120, sideY1 = H - 80, sideN = 5, sideStep = (sideY1 - sideY0) / sideN;
    for (let i = 0; i < sideN; i++) {
      phy(edge, sideY0 + i * sideStep + 4, phyT, sideStep - 8, true);
      phy(W - edge - phyT, sideY0 + i * sideStep + 4, phyT, sideStep - 8, true);
    }
    const botX0 = 70, botStep = (W - 140) / 4;
    for (let i = 0; i < 4; i++) phy(botX0 + i * botStep + 4, H - edge - phyT, botStep - 8, phyT, false);
    // top edge: 2 PHYs in the middle, PCIe Gen5 x16 on one side, display / media on the other
    phy(W / 2 - 150, edge, 140, phyT, false);
    phy(W / 2 + 10, edge, 140, phyT, false);
    ctx.fillStyle = '#2a2721';
    ctx.fillRect(70, edge, W / 2 - 230, phyT);
    for (let x = 76; x < W / 2 - 166; x += 9) { ctx.fillStyle = `rgba(170,190,220,${0.18 + r() * 0.2})`; ctx.fillRect(x, edge + 6, 4, phyT - 12); }
    ctx.fillStyle = '#2b2a2f';
    ctx.fillRect(W / 2 + 160, edge, W / 2 - 230, phyT);
    for (let x = W / 2 + 166; x < W - 76; x += 12) { ctx.fillStyle = `rgba(200,150,210,${0.15 + r() * 0.2})`; ctx.fillRect(x, edge + 8, 6, phyT - 16); }

    // ---- media / display engines just inside the top edge
    const mx0 = 70, my0 = edge + phyT + 8, mh = 48;
    const blocks = 8, bw = (W - 140) / blocks;
    for (let i = 0; i < blocks; i++) {
      ctx.fillStyle = `hsl(${280 + r() * 60}, 14%, ${22 + r() * 10}%)`;
      ctx.fillRect(mx0 + i * bw + 2, my0, bw - 4, mh);
    }

    // ---- GPC array: 3 columns × 4 rows, L2 band between rows 2 and 3
    const ax = edge + phyT + 12, aw = W - 2 * ax;
    const ay = my0 + mh + 10, ah = H - edge - phyT - 12 - ay;
    const l2h = 128, gap = 8, cols = 3, rows = 4;
    const gw = (aw - (cols - 1) * gap) / cols;
    const gh = (ah - l2h - gap * 2 - (rows - 2) * gap) / rows;
    // decide which SMs are fused off (deterministic)
    const smOff = new Set();
    let left = disabledSMs;
    if (gpcOff && left >= 16) { for (let s = 0; s < 16; s++) smOff.add(`11-${s}`); left -= 16; }
    const rr = rng(seed + 7);
    while (left > 0) {
      const k = `${Math.floor(rr() * (gpcOff ? 11 : 12))}-${Math.floor(rr() * 16)}`;
      if (!smOff.has(k)) { smOff.add(k); left--; }
    }
    for (let gy = 0; gy < rows; gy++)
      for (let gx = 0; gx < cols; gx++) {
        const gi = gy * cols + gx;
        const x = ax + gx * (gw + gap);
        const y = ay + gy * (gh + gap) + (gy >= 2 ? l2h + gap : 0);
        const hue = 95 + gy * 16 + gx * 10;
        ctx.fillStyle = `hsl(${hue}, 16%, 14%)`;
        ctx.fillRect(x, y, gw, gh);
        // raster / geometry strip along the GPC's inner edge
        const rs = 18;
        ctx.fillStyle = `hsl(${hue + 20}, 16%, 28%)`;
        const nearL2 = gy === 1 || gy === 2;
        ctx.fillRect(x + 4, nearL2 ? (gy === 1 ? y + gh - rs - 3 : y + 3) : y + 3, gw - 8, rs);
        // 16 SMs: 4 × 4 (8 TPCs of 2)
        const tx0 = x + 5, ty0 = nearL2 ? (gy === 1 ? y + 4 : y + rs + 7) : y + rs + 7;
        const tw = (gw - 10 - 3 * 3) / 4, th = (gh - rs - 12 - 3 * 3) / 4;
        for (let i = 0; i < 4; i++)
          for (let j = 0; j < 4; j++) {
            const sx = tx0 + i * (tw + 3), sy = ty0 + j * (th + 3);
            const off = smOff.has(`${gi}-${j * 4 + i}`);
            ctx.fillStyle = off ? 'hsl(0,0%,9%)' : `hsl(${hue}, 18%, ${21 + r() * 6}%)`;
            ctx.fillRect(sx, sy, tw, th);
            if (off) { ctx.strokeStyle = 'rgba(255,90,90,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + tw, sy + th); ctx.stroke(); continue; }
            // tensor core + RT core + register file blocks
            ctx.fillStyle = `hsl(${hue + 8}, 24%, ${34 + r() * 10}%)`;
            ctx.fillRect(sx + 2, sy + 2, tw * 0.55, th * 0.5);
            ctx.fillStyle = `hsl(${hue - 30}, 20%, ${36 + r() * 8}%)`;
            ctx.fillRect(sx + tw * 0.62, sy + 2, tw * 0.33, th * 0.5);
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            for (let k = sy + th * 0.58; k < sy + th - 2; k += 2) ctx.fillRect(sx + 2, k, tw - 4, 0.7);
          }
      }
    // ---- L2 band: 16 slices (one per 32-bit memory controller), crossbar in the middle
    const ly = ay + 2 * (gh + gap);
    ctx.fillStyle = '#383b38';
    ctx.fillRect(ax, ly, aw, l2h);
    const sw = (aw - 8) / 8;
    let n = 0;
    for (let row = 0; row < 2; row++)
      for (let i = 0; i < 8; i++, n++) {
        const off = l2Off && n % Math.round(16 / l2Off) === 1;
        ctx.fillStyle = off ? 'hsl(0,0%,13%)' : `hsl(${55 + r() * 30}, 10%, ${33 + r() * 8}%)`;
        const x = ax + 4 + i * sw, y = ly + 4 + row * (l2h / 2);
        ctx.fillRect(x, y, sw - 4, l2h / 2 - 22);
        if (!off) { ctx.fillStyle = 'rgba(255,255,255,0.07)'; for (let k = y + 2; k < y + l2h / 2 - 24; k += 2) ctx.fillRect(x + 2, k, sw - 8, 0.7); }
      }
    ctx.fillStyle = 'rgba(205,185,125,0.28)';
    ctx.fillRect(ax, ly + l2h / 2 - 16, aw, 14);
    // seal ring + grain
    ctx.strokeStyle = 'rgba(220,210,180,0.55)'; ctx.lineWidth = 2; ctx.strokeRect(4, 4, W - 8, H - 8);
    ctx.globalAlpha = 0.06;
    ctx.drawImage(noiseCanvas(W, H, { amp: 50, seed: 11 }), 0, 0);
    ctx.globalAlpha = 1;
    return canvasTexture(c);
  });
}

/** Polished silicon backside with a faint laser mark (what you see with the cooler off). */
function gb202Marked(mark) {
  return memo(`gb202-mark-${mark}`, () => {
    const W = 768, H = 992;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.drawImage(gb202Floorplan().image, 0, 0, W, H);
    ctx.fillStyle = 'rgba(10,12,14,0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(190,195,200,0.55)';
    ctx.font = '600 64px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(mark, 0, -20);
    ctx.font = '44px "Courier New", monospace';
    ctx.fillText('TAIWAN  2449', 0, 50);
    ctx.restore();
    return canvasTexture(c);
  });
}

const looksCache = {};
/** looks[key]() for the floorplan toggle. */
export function gb202Looks(variant) {
  if (!looksCache[variant]) {
    const pro = variant === 'pro';
    looksCache[variant] = {
      marked: dieMaterial(gb202Marked(pro ? 'GB202-A1' : 'GB202-300-A1'), { iridescence: 0.08, rough: 0.1 }),
      floorplan: dieMaterial(pro ? gb202Floorplan({ disabledSMs: 4 }) : gb202Floorplan({ disabledSMs: 22, gpcOff: true, l2Off: 4 }), { iridescence: 0.45 }),
    };
  }
  return looksCache[variant];
}

/**
 * GB202 package, sitting on y = 0, centred. Bare die (no lid: desktop GeForce/RTX cards put the
 * vapor chamber straight on the silicon), thin metal stiffener ring, capacitors around the die.
 */
export function gb202Package(variant = '5090') {
  const M = materials();
  const { PW, PD, PT, DIE_W, DIE_D, DIE_T } = GB202;
  const g = new THREE.Group();
  const sub = new THREE.MeshPhysicalMaterial({
    map: substrateTexture({ w: 560, h: 630, color: '#1c1f1d', capColor: '#c4b07e', ring: 0.08, seed: 21 }),
    roughness: 0.42, metalness: 0.08, clearcoat: 0.35, clearcoatRoughness: 0.3,
  });
  g.add(topMesh(PW, PT, PD, sub, M.pcbEdge));
  // stiffener ring (estimate: GB202 boards show a thin metal frame around the die)
  g.add(frame(PW - 1.5, PD - 1.5, 4.5, 0.6, M.steelDark, PT));
  // die-side capacitors between the die and the frame
  const capMat = M.mlccGrey;
  for (const sx of [-1, 1]) for (let k = 0; k < 9; k++) {
    const m = new THREE.Mesh(box(1.0, 0.45, 0.5), capMat);
    m.position.set(sx * (DIE_W / 2 + 4), PT, -12 + k * 3);
    g.add(m);
  }
  const uf = new THREE.Mesh(box(DIE_W + 1.2, 0.25, DIE_D + 1.2), M.underfill);
  uf.position.y = PT;
  g.add(uf);
  const look = `rtx-gb202-${variant === 'pro' ? 'pro' : '5090'}`;
  const die = new THREE.Mesh(box(DIE_W, DIE_T, DIE_D), gb202Looks(variant === 'pro' ? 'pro' : '5090').marked);
  die.userData.looks = look;
  die.position.y = PT;
  const pro = variant === 'pro';
  tagPart(die, 'gb202-die', 'GB202 die', pro
    ? '750 mm², 92.2 billion transistors on TSMC 4N. The PRO 6000 enables 188 of 192 SMs (24,064 CUDA cores) and the full 128 MB L2. Turn on the floorplan toggle to see the layout.'
    : '750 mm², 92.2 billion transistors on TSMC 4N. The RTX 5090 enables 170 of 192 SMs (21,760 CUDA cores) and 96 of 128 MB L2. Turn on the floorplan toggle to see the layout.');
  explode(die, 0, 8, 0);
  g.add(die);
  return g;
}
