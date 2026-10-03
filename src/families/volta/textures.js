// Canvas textures for the SXM-era GPU dies (GV100 Volta, GP100 Pascal), shared by the volta and pascal
// families. Floorplans are stylised after NVIDIA's published block diagrams: 6 GPCs, each a row of TPCs
// with 2 SMs per TPC, the L2 cache and crossbar through the middle, HBM2 PHYs on the two edges that face
// the HBM2 stacks, NVLink and PCIe on the other two edges. Exact block positions are not sourced
// (stylised); the SM counts are (GV100: 84 SMs, 80 enabled on V100; GP100: 60 SMs, 56 enabled on P100).
//
// UV orientation: on the top face of a BoxGeometry, canvas x runs along +x and the canvas top edge sits
// at -z. The packages put their HBM2 stacks at +-z, so the HBM2 PHYs are drawn on the top/bottom edges.
import { makeCanvas, canvasTexture, rng, noiseCanvas } from '../../lib/util.js';

const cache = new Map();
const memo = (k, f) => (cache.has(k) ? cache.get(k) : (cache.set(k, f()), cache.get(k)));

function sealRing(ctx, w, h, inset = 5) {
  ctx.strokeStyle = 'rgba(220,210,180,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.strokeStyle = 'rgba(90,90,90,0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(inset + 4, inset + 4, w - inset * 2 - 8, h - inset * 2 - 8);
}

/** One SM: four processing blocks (tensor cores on Volta) over a register file and L1 strip. */
function sm(ctx, x, y, w, h, r, hue, { off = false, tensor = false } = {}) {
  ctx.fillStyle = `hsl(${hue}, 18%, ${19 + r() * 5}%)`;
  ctx.fillRect(x, y, w, h);
  const qw = (w - 3) / 2, qh = (h * 0.6 - 3) / 2;
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = `hsl(${hue + 8}, 22%, ${32 + r() * 10}%)`;
      ctx.fillRect(x + 1 + i * (qw + 1), y + 1 + j * (qh + 1), qw, qh);
      if (tensor) { // the Volta tensor-core block inside each processing block
        ctx.fillStyle = 'hsla(48, 55%, 62%, 0.45)';
        ctx.fillRect(x + 2 + i * (qw + 1), y + 2 + j * (qh + 1), qw * 0.42, qh * 0.55);
      }
    }
  ctx.fillStyle = `hsl(${hue - 10}, 14%, ${40 + r() * 8}%)`;
  ctx.fillRect(x + 1, y + h * 0.64, w - 2, h * 0.32);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let k = 0; k < h * 0.3; k += 2) ctx.fillRect(x + 1, y + h * 0.64 + k, w - 2, 0.7);
  if (off) { // fused-off SM (yield harvesting)
    ctx.fillStyle = 'rgba(8,8,10,0.72)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,120,90,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + w - 3, y + h - 3); ctx.moveTo(x + w - 3, y + 3); ctx.lineTo(x + 3, y + h - 3); ctx.stroke();
  }
}

/**
 * Generic big-GPU floorplan.
 * @param {object} o
 * @param {number} o.W, o.H     canvas size (aspect = die x : die z)
 * @param {number} o.tpc        TPCs per GPC (2 SMs each)
 * @param {Array}  o.off        [gpc, smIndex] pairs drawn as fused off
 * @param {boolean} o.tensor    draw tensor-core blocks
 * @param {number} o.hue        base hue
 * @param {number} o.links      NVLink bricks on the left edge
 */
function gpuFloorplan({ W, H, tpc, off = [], tensor = false, hue = 95, links = 6, seed = 1 }) {
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const r = rng(seed);
  ctx.fillStyle = '#13171a';
  ctx.fillRect(0, 0, W, H);
  const phyH = Math.round(H * 0.075);
  // HBM2 PHYs: two per edge (one per stack), top and bottom
  for (const y0 of [12, H - 12 - phyH]) {
    for (let b = 0; b < 2; b++) {
      const bx = 70 + b * ((W - 140) / 2), bw = (W - 140) / 2 - 10;
      ctx.fillStyle = '#2b2a26';
      ctx.fillRect(bx, y0, bw, phyH);
      for (let x = bx + 6; x < bx + bw - 6; x += 6) {
        ctx.fillStyle = `rgba(${180 + r() * 40},${160 + r() * 30},110,0.35)`;
        ctx.fillRect(x, y0 + 5, 3, phyH - 10);
      }
      ctx.strokeStyle = 'rgba(200,190,150,0.4)';
      ctx.strokeRect(bx + 2, y0 + 2, bw - 4, phyH - 4);
    }
  }
  // NVLink bricks down the left edge, PCIe + hub (copy engines, NVENC-free compute front end) on the right
  const sideW = 44, y0 = 24 + phyH, sideH = H - 2 * (24 + phyH);
  for (let k = 0; k < links; k++) {
    const bh = sideH / links;
    ctx.fillStyle = '#2f2c25';
    ctx.fillRect(12, y0 + k * bh + 2, sideW, bh - 4);
    for (let y = y0 + k * bh + 6; y < y0 + (k + 1) * bh - 6; y += 5) {
      ctx.fillStyle = `rgba(210,190,130,${0.22 + r() * 0.2})`;
      ctx.fillRect(18, y, sideW - 12, 2.5);
    }
  }
  ctx.fillStyle = '#29271f';
  ctx.fillRect(W - 12 - sideW, y0, sideW, sideH * 0.45);
  for (let y = y0 + 4; y < y0 + sideH * 0.45 - 4; y += 8) {
    ctx.fillStyle = `rgba(190,170,120,${0.18 + r() * 0.2})`;
    ctx.fillRect(W - 8 - sideW, y, sideW - 8, 4);
  }
  ctx.fillStyle = 'hsl(200, 10%, 26%)';
  ctx.fillRect(W - 12 - sideW, y0 + sideH * 0.48, sideW, sideH * 0.52);
  // GPC array: 3 columns x 2 rows, L2 + crossbar band across the middle
  const ax = 12 + sideW + 12, aw = W - 2 * (12 + sideW + 12);
  const l2h = Math.round(H * 0.14);
  const gh = (sideH - l2h - 20) / 2, gw = (aw - 20) / 3;
  for (let g = 0; g < 6; g++) {
    const gx = g % 3, gy = Math.floor(g / 3);
    const x = ax + gx * (gw + 10);
    const y = y0 + gy * (gh + l2h + 20);
    const hu = hue + gx * 12 + gy * 20;
    ctx.fillStyle = `hsl(${hu}, 16%, 14%)`;
    ctx.fillRect(x, y, gw, gh);
    // raster engine strip
    ctx.fillStyle = `hsl(${hu}, 20%, 30%)`;
    ctx.fillRect(x + 4, gy ? y + gh - 16 : y + 4, gw - 8, 12);
    // SMs: tpc columns x 2 rows
    const cols = tpc, sw = (gw - 8 - (cols - 1) * 3) / cols, sh = (gh - 28 - 3) / 2;
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < 2; j++) {
        const idx = i * 2 + j;
        const isOff = off.some(([og, os]) => og === g && os === idx);
        sm(ctx, x + 4 + i * (sw + 3), (gy ? y + 4 : y + 20) + j * (sh + 3), sw, sh, r, hu, { off: isOff, tensor });
      }
  }
  // L2 cache slices + crossbar
  const ly = y0 + gh + 10;
  ctx.fillStyle = '#3a3d3a';
  ctx.fillRect(ax, ly, aw, l2h);
  const nSlices = 16;
  for (let i = 0; i < nSlices; i++) {
    const x = ax + 4 + i * ((aw - 8) / nSlices);
    ctx.fillStyle = `hsl(${55 + r() * 30}, 10%, ${34 + r() * 8}%)`;
    ctx.fillRect(x, ly + 4, (aw - 8) / nSlices - 4, l2h * 0.36);
    ctx.fillRect(x, ly + l2h * 0.64 - 4, (aw - 8) / nSlices - 4, l2h * 0.36);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  for (let y = ly + 4; y < ly + l2h - 4; y += 2) ctx.fillRect(ax + 4, y, aw - 8, 0.8);
  ctx.fillStyle = 'rgba(200,180,120,0.28)';
  ctx.fillRect(ax, ly + l2h / 2 - 9, aw, 18);
  sealRing(ctx, W, H, 4);
  ctx.globalAlpha = 0.06;
  ctx.drawImage(noiseCanvas(W, H, { amp: 50, seed: seed + 9 }), 0, 0);
  ctx.globalAlpha = 1;
  return c;
}

/** Polished silicon backside with a laser marking (what a bare SXM die actually looks like). */
function markedDie(floor, lines, seed) {
  const W = floor.width, H = floor.height;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.drawImage(floor, 0, 0);
  ctx.fillStyle = 'rgba(10,12,16,0.9)';
  ctx.fillRect(0, 0, W, H);
  // faint polishing marks
  const r = rng(seed);
  ctx.strokeStyle = 'rgba(160,170,190,0.05)';
  for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.arc(W / 2, H * 1.6, H * (0.9 + r() * 1.4), 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = 'rgba(205,210,215,0.72)';
  ctx.textBaseline = 'middle';
  ctx.font = `italic 800 ${Math.round(H * 0.1)}px Helvetica, Arial, sans-serif`;
  ctx.fillText('NVIDIA', W * 0.2, H * 0.36);
  ctx.font = `${Math.round(H * 0.065)}px "Courier New", monospace`;
  lines.forEach((l, i) => ctx.fillText(l, W * 0.2, H * (0.5 + i * 0.1)));
  ctx.beginPath(); ctx.arc(W * 0.78, H * 0.6, H * 0.035, 0, Math.PI * 2);
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(205,210,215,0.6)'; ctx.stroke();
  return c;
}

// GV100: 6 GPCs x 7 TPCs x 2 SMs = 84 SMs; V100 enables 80 (4 drawn fused off, positions illustrative).
const GV100_OFF = [[0, 13], [2, 6], [3, 1], [5, 10]];
const gv100Canvas = () => memo('gv100-c', () => gpuFloorplan({ W: 1024, H: 816, tpc: 7, off: GV100_OFF, tensor: true, hue: 92, links: 6, seed: 70 }));
export const gv100Floorplan = () => memo('gv100-f', () => canvasTexture(gv100Canvas()));
export const gv100Marked = () => memo('gv100-m', () => canvasTexture(markedDie(gv100Canvas(), ['GV100-A1', 'TAIWAN  1735'], 71)));

// GP100: 6 GPCs x 5 TPCs x 2 SMs = 60 SMs; P100 enables 56. Four NVLink 1 bricks.
const GP100_OFF = [[1, 3], [2, 8], [4, 0], [5, 7]];
const gp100Canvas = () => memo('gp100-c', () => gpuFloorplan({ W: 1024, H: 1000, tpc: 5, off: GP100_OFF, tensor: false, hue: 118, links: 4, seed: 80 }));
export const gp100Floorplan = () => memo('gp100-f', () => canvasTexture(gp100Canvas()));
export const gp100Marked = () => memo('gp100-m', () => canvasTexture(markedDie(gp100Canvas(), ['GP100-A1', 'TAIWAN  1622'], 81)));
