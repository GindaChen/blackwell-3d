// Ampere canvas textures: the GA100 floorplan, its laser-marked backside, the illustrative lid marking and
// the SXM4 module silkscreen labels.
//
// The floorplan is stylised after NVIDIA's GA100 block diagram (Ampere architecture whitepaper): 8 GPCs
// (8 TPCs / 16 SMs each), the L2 split in two partitions across the middle with the crossbar between
// them, HBM2 PHYs facing the three stacks on each long edge, NVLink 3 and PCIe Gen4 SerDes on the
// short edges. Canvas x = die x (25.6 mm), canvas y = die z (32.3 mm); both are estimates of the
// sourced 826 mm² area.
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

/** One SM: four tensor-core partitions over a register file / L1 strip. */
function sm(ctx, x, y, w, h, r, hue) {
  ctx.fillStyle = `hsl(${hue}, 16%, ${19 + r() * 6}%)`;
  ctx.fillRect(x, y, w, h);
  const qw = (w - 3) / 2, qh = (h * 0.6 - 3) / 2;
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = `hsl(${hue + 6}, 22%, ${31 + r() * 10}%)`;
      ctx.fillRect(x + 1 + i * (qw + 1), y + 1 + j * (qh + 1), qw, qh);
    }
  ctx.fillStyle = `hsl(${hue - 12}, 12%, ${40 + r() * 8}%)`;
  ctx.fillRect(x + 1, y + h * 0.64, w - 2, h * 0.32);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let k = 0; k < h * 0.32; k += 2) ctx.fillRect(x + 1, y + h * 0.64 + k, w - 2, 0.7);
}

function phyStrip(ctx, x, y, w, h, r, vertical) {
  ctx.fillStyle = '#2c2a25';
  ctx.fillRect(x, y, w, h);
  if (vertical) for (let k = y + 5; k < y + h - 5; k += 6) { ctx.fillStyle = `rgba(${185 + r() * 40},${160 + r() * 30},110,0.35)`; ctx.fillRect(x + 5, k, w - 10, 3); }
  else for (let k = x + 5; k < x + w - 5; k += 6) { ctx.fillStyle = `rgba(${185 + r() * 40},${160 + r() * 30},110,0.35)`; ctx.fillRect(k, y + 5, 3, h - 10); }
  ctx.strokeStyle = 'rgba(200,190,150,0.4)';
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
}

function drawGA100(ctx, W, H, r) {
  ctx.fillStyle = '#13171a';
  ctx.fillRect(0, 0, W, H);
  const edge = 56; // PHY band width
  // HBM2 PHYs: three per long edge (left / right), one per stack
  const hy0 = 90, hh = (H - 180 - 2 * 14) / 3;
  for (const x of [12, W - 12 - edge]) for (let i = 0; i < 3; i++) phyStrip(ctx, x, hy0 + i * (hh + 14), edge, hh, r, true);
  // NVLink 3 (12 links) on the top edge, PCIe Gen4 + NVLink on the bottom edge
  phyStrip(ctx, 90, 12, W - 180, 50, r, false);
  phyStrip(ctx, 90, H - 62, (W - 180) * 0.62, 50, r, false);
  phyStrip(ctx, 90 + (W - 180) * 0.64, H - 62, (W - 180) * 0.36, 50, r, false);
  // core area
  const ax = edge + 26, aw = W - 2 * ax, ay = 80, ah = H - 160;
  const l2h = 150, gap = 10;
  const gh = (ah - l2h - gap * 4) / 4, gw = (aw - gap) / 2;
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 2; col++) {
      const x = ax + col * (gw + gap);
      const y = ay + row * (gh + gap) + (row >= 2 ? l2h + gap * 2 : 0);
      const hue = 78 + row * 14 + col * 9; // green-yellow sweep, distinct from Blackwell's teal
      ctx.fillStyle = `hsl(${hue}, 14%, 14%)`;
      ctx.fillRect(x, y, gw, gh);
      // 8 TPCs x 2 SMs = 16 SMs: 8 columns x 2 rows
      const c = 8, rr = 2, sw = (gw - 10 - (c - 1) * 3) / c, sh = (gh - 30 - (rr - 1) * 3) / rr;
      for (let i = 0; i < c; i++) for (let j = 0; j < rr; j++) sm(ctx, x + 5 + i * (sw + 3), y + 5 + j * (sh + 3), sw, sh, r, hue);
      ctx.fillStyle = `hsl(${hue}, 18%, 30%)`; // raster / PolyMorph strip
      ctx.fillRect(x + 5, y + gh - 21, gw - 10, 16);
    }
  // split L2: two partitions with the crossbar between them
  const ly = ay + 2 * (gh + gap) + gap * 0.5;
  const pw = (aw - 60) / 2;
  for (const x of [ax, ax + pw + 60]) {
    ctx.fillStyle = '#383b37';
    ctx.fillRect(x, ly, pw, l2h);
    for (let i = 0; i < 10; i++) {
      const bx = x + 4 + i * ((pw - 8) / 10);
      ctx.fillStyle = `hsl(${55 + r() * 25}, 10%, ${33 + r() * 8}%)`;
      ctx.fillRect(bx, ly + 4, (pw - 8) / 10 - 3, l2h / 2 - 6);
      ctx.fillRect(bx, ly + l2h / 2 + 2, (pw - 8) / 10 - 3, l2h / 2 - 6);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    for (let y = ly + 4; y < ly + l2h - 4; y += 2) ctx.fillRect(x + 4, y, pw - 8, 0.8);
  }
  ctx.fillStyle = '#4a4333'; // crossbar
  ctx.fillRect(ax + pw + 8, ly, 44, l2h);
  ctx.fillStyle = 'rgba(220,200,140,0.3)';
  for (let y = ly + 4; y < ly + l2h - 4; y += 5) ctx.fillRect(ax + pw + 12, y, 36, 2);
  sealRing(ctx, W, H, 4);
  ctx.globalAlpha = 0.06;
  ctx.drawImage(noiseCanvas(W, H, { amp: 50, seed: 41 }), 0, 0);
  ctx.globalAlpha = 1;
}

/** GA100 floorplan (stylised). */
export function ga100Floorplan() {
  return memo('ga100', () => {
    const W = 800, H = 1010;
    const c = makeCanvas(W, H);
    drawGA100(c.getContext('2d'), W, H, rng(100));
    return canvasTexture(c);
  });
}

/** GA100 as it looks on a bare SXM4 package: polished dark silicon with a laser marking. */
export function ga100Marked() {
  return memo('ga100-mark', () => {
    const W = 800, H = 1010;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.drawImage(ga100Floorplan().image, 0, 0);
    ctx.fillStyle = 'rgba(10,12,14,0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(200,205,210,0.72)';
    ctx.textAlign = 'center';
    ctx.font = 'italic 800 84px Helvetica, Arial, sans-serif';
    ctx.fillText('NVIDIA', 0, -90);
    ctx.font = '54px "Courier New", monospace';
    ctx.fillText('GA100-883AA-A1', 0, 10);
    ctx.fillText('TAIWAN  2021', 0, 80);
    ctx.restore();
    return canvasTexture(c);
  });
}

/** Marking for the illustrative lid. */
export function a100LidTexture() {
  return memo('a100-lid', () => {
    const W = 1000, H = 900;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(12);
    ctx.fillStyle = '#bab6ae';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 220; i++) {
      const x = r() * W, y = r() * H, s = 20 + r() * 110;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s);
      g.addColorStop(0, r() < 0.5 ? 'rgba(255,250,240,0.1)' : 'rgba(120,115,105,0.07)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
    ctx.fillStyle = 'rgba(95,90,82,0.85)';
    ctx.font = '700 64px Helvetica, Arial, sans-serif';
    ctx.fillText('NVIDIA', 90, 220);
    ctx.font = '54px "Courier New", monospace';
    ctx.fillText('A100  SXM4', 90, 340);
    ctx.fillText('GA100-883AA-A1', 90, 440);
    ctx.fillText('TW  2021', 90, 540);
    return canvasTexture(c);
  });
}
