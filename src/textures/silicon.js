// Procedural silicon floorplans and package-top textures.
// Floorplans are stylised after NVIDIA's published die shots and renders: the Blackwell compute
// die (GPC arrays, L2 band, HBM3e PHYs on the short edges, NV-HBI on the long edge), the Grace
// CPU die (core mesh), and small NIC/DPU/switch dies.
import { makeCanvas, canvasTexture, rng, noiseCanvas, heightToNormal } from '../lib/util.js';

const cache = new Map();
const memo = (k, f) => (cache.has(k) ? cache.get(k) : (cache.set(k, f()), cache.get(k)));

function sealRing(ctx, w, h, inset = 6) {
  ctx.strokeStyle = 'rgba(220,210,180,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.strokeStyle = 'rgba(90,90,90,0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(inset + 4, inset + 4, w - inset * 2 - 8, h - inset * 2 - 8);
}

function smTile(ctx, x, y, w, h, r, hue) {
  // One streaming multiprocessor: tensor-core quads + register files + L1.
  ctx.fillStyle = `hsl(${hue}, 18%, ${20 + r() * 6}%)`;
  ctx.fillRect(x, y, w, h);
  const qw = (w - 3) / 2, qh = (h * 0.62 - 3) / 2;
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = `hsl(${hue + 8}, 22%, ${33 + r() * 10}%)`;
      ctx.fillRect(x + 1 + i * (qw + 1), y + 1 + j * (qh + 1), qw, qh);
      ctx.fillStyle = `hsla(${hue + 20}, 30%, 60%, 0.35)`;
      ctx.fillRect(x + 2 + i * (qw + 1), y + 2 + j * (qh + 1), qw * 0.4, qh * 0.5);
    }
  ctx.fillStyle = `hsl(${hue - 10}, 14%, ${40 + r() * 8}%)`;
  ctx.fillRect(x + 1, y + h * 0.66, w - 2, h * 0.3);
  // fine SRAM lines
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let k = 0; k < h * 0.3; k += 2) ctx.fillRect(x + 1, y + h * 0.66 + k, w - 2, 0.7);
}

/**
 * Blackwell compute die (one of two reticle-limited dies, ~26 x 33 mm, TSMC 4NP).
 * Canvas is portrait (long edge vertical). HBM3e PHYs sit on the two short edges (top/bottom),
 * the 10 TB/s NV-HBI die-to-die interface runs down the long edge facing the sibling die
 * (right edge, or left when mirror=true).
 */
export function blackwellDie(mirror = false) {
  return memo(`blackwell-${mirror}`, () => {
    const W = 816, H = 1024;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(mirror ? 23 : 22);
    ctx.fillStyle = '#14181c';
    ctx.fillRect(0, 0, W, H);
    // HBM3e PHY strips along the top and bottom (short) edges: two PHYs each, one per stack
    for (const y0 of [14, H - 14 - 64]) {
      for (let b = 0; b < 2; b++) {
        const bx = 20 + b * ((W - 40) / 2), bw = (W - 40) / 2 - 8;
        ctx.fillStyle = '#2b2a26';
        ctx.fillRect(bx, y0, bw, 64);
        for (let x = bx + 6; x < bx + bw - 6; x += 6) {
          ctx.fillStyle = `rgba(${180 + r() * 40},${160 + r() * 30},110,0.35)`;
          ctx.fillRect(x, y0 + 6, 3, 52);
        }
        ctx.strokeStyle = 'rgba(200,190,150,0.4)';
        ctx.strokeRect(bx + 2, y0 + 2, bw - 4, 60);
      }
    }
    // NV-HBI die-to-die strip on the long edge that faces the sibling die
    const d2dX = mirror ? 14 : W - 14 - 52;
    ctx.fillStyle = '#2f2c25';
    ctx.fillRect(d2dX, 92, 52, H - 184);
    for (let y = 96; y < H - 96; y += 5) {
      ctx.fillStyle = `rgba(210,190,130,${0.25 + r() * 0.2})`;
      ctx.fillRect(d2dX + 6, y, 40, 2.5);
    }
    // PCIe / NVLink 5 SerDes on the outer long edge
    const ioX = mirror ? W - 14 - 40 : 14;
    ctx.fillStyle = '#29271f';
    ctx.fillRect(ioX, 92, 40, H - 184);
    for (let y = 96; y < H - 96; y += 9) {
      ctx.fillStyle = `rgba(190,170,120,${0.18 + r() * 0.2})`;
      ctx.fillRect(ioX + 5, y, 30, 4);
    }
    // GPC array: 2 columns x 4 rows of GPCs, L2 band across the middle
    const ax = mirror ? 80 : 68, ay = 92, aw = W - 148, ah = H - 184;
    const l2h = 110;
    const gpcCols = 2, gpcRows = 4;
    const gw = (aw - (gpcCols - 1) * 10) / gpcCols;
    const gh = (ah - l2h - 40) / gpcRows;
    for (let gy = 0; gy < gpcRows; gy++) {
      for (let gx = 0; gx < gpcCols; gx++) {
        const x = ax + gx * (gw + 10);
        const y = ay + gy * (gh + 10) + (gy >= gpcRows / 2 ? l2h + 10 : 0);
        const hue = 95 + (gy / gpcRows) * 60 + gx * 14 + (mirror ? 12 : 0); // NVIDIA-green -> teal sweep
        ctx.fillStyle = `hsl(${hue}, 16%, 15%)`;
        ctx.fillRect(x, y, gw, gh);
        const tc = 4, tr = 2;
        const tw = (gw - 12 - (tc - 1) * 4) / tc;
        const th = (gh - 34 - (tr - 1) * 4) / tr;
        for (let i = 0; i < tc; i++) for (let j = 0; j < tr; j++)
          smTile(ctx, x + 6 + i * (tw + 4), y + 6 + j * (th + 4), tw, th, r, hue);
        ctx.fillStyle = `hsl(${hue}, 20%, 30%)`;
        ctx.fillRect(x + 6, y + gh - 24, gw - 12, 18);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        for (let k = x + 8; k < x + gw - 8; k += 3) ctx.fillRect(k, y + gh - 22, 1, 14);
      }
    }
    // L2 cache band
    const ly = ay + (gpcRows / 2) * (gh + 10);
    ctx.fillStyle = '#3a3d3a';
    ctx.fillRect(ax, ly, aw, l2h);
    for (let i = 0; i < 12; i++) {
      const x = ax + 4 + i * ((aw - 8) / 12);
      ctx.fillStyle = `hsl(${60 + r() * 30}, 10%, ${34 + r() * 8}%)`;
      ctx.fillRect(x, ly + 4, (aw - 8) / 12 - 4, l2h / 2 - 6);
      ctx.fillRect(x, ly + l2h / 2 + 2, (aw - 8) / 12 - 4, l2h / 2 - 6);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    for (let y = ly + 4; y < ly + l2h - 4; y += 2) ctx.fillRect(ax + 4, y, aw - 8, 0.8);
    ctx.fillStyle = 'rgba(200,180,120,0.25)';
    ctx.fillRect(ax, ly + l2h / 2 - 14, aw, 28);
    sealRing(ctx, W, H, 4);
    ctx.globalAlpha = 0.06;
    ctx.drawImage(noiseCanvas(W, H, { amp: 50, seed: 9 }), 0, 0);
    ctx.globalAlpha = 1;
    return canvasTexture(c);
  });
}

/** Grace CPU die: 76 Neoverse V2 cores on the Scalable Coherency Fabric mesh (72 enabled). */
export function graceDie() {
  return memo('grace', () => {
    const W = 1024, H = 1088;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(34);
    ctx.fillStyle = '#121619';
    ctx.fillRect(0, 0, W, H);
    // 8 columns x 10 rows mesh; four tiles are I/O / cache-coherent gateways instead of cores
    const cols = 8, rows = 10, x0 = 74, y0 = 70, cw = (W - 148) / cols, chh = (H - 300) / rows;
    const gateways = new Set(['0,4', '7,4', '0,5', '7,5']);
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const x = x0 + i * cw, y = y0 + j * chh;
        if (gateways.has(`${i},${j}`)) {
          ctx.fillStyle = 'hsl(40, 18%, 30%)';
          ctx.fillRect(x + 3, y + 3, cw - 6, chh - 6);
          continue;
        }
        const hue = 95 + r() * 25 + (j / rows) * 30;
        ctx.fillStyle = `hsl(${hue}, 22%, 22%)`;
        ctx.fillRect(x + 3, y + 3, cw - 6, chh - 6);
        ctx.fillStyle = `hsl(${hue + 10}, 32%, 38%)`;
        ctx.fillRect(x + 6, y + 6, cw * 0.5, chh - 12);
        ctx.fillStyle = `hsl(${hue - 40}, 18%, 46%)`;
        ctx.fillRect(x + cw * 0.58, y + 6, cw * 0.34, chh - 12);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        for (let k = y + 7; k < y + chh - 7; k += 2) ctx.fillRect(x + cw * 0.58, k, cw * 0.34, 0.7);
      }
    ctx.strokeStyle = 'rgba(190,230,140,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= cols; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * cw, y0); ctx.lineTo(x0 + i * cw, y0 + rows * chh); ctx.stroke(); }
    for (let j = 0; j <= rows; j++) { ctx.beginPath(); ctx.moveTo(x0, y0 + j * chh); ctx.lineTo(x0 + cols * cw, y0 + j * chh); ctx.stroke(); }
    // LPDDR5X PHYs on both sides, NVLink-C2C + PCIe Gen5 along the bottom
    ctx.fillStyle = '#2d2b26';
    ctx.fillRect(14, 60, 50, H - 300);
    ctx.fillRect(W - 64, 60, 50, H - 300);
    ctx.fillRect(40, H - 220, W - 80, 190);
    for (let x = 50; x < W - 50; x += 6) {
      ctx.fillStyle = `rgba(200,180,130,${0.2 + r() * 0.2})`;
      ctx.fillRect(x, H - 210, 3, 70);
    }
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = `hsl(${120 + r() * 40}, 16%, 32%)`;
      ctx.fillRect(60 + i * ((W - 120) / 4), H - 128, (W - 120) / 4 - 10, 84);
    }
    sealRing(ctx, W, H, 4);
    return canvasTexture(c);
  });
}

/** Generic small die (NIC / DPU / switch): blocks + a SerDes ring. */
export function smallDie(seed = 5, hueA = 200, hueB = 280) {
  return memo(`small-${seed}-${hueA}-${hueB}`, () => {
    const W = 512, H = 512;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(seed);
    ctx.fillStyle = '#14181b';
    ctx.fillRect(0, 0, W, H);
    // SerDes ring
    ctx.fillStyle = '#2e2b25';
    ctx.fillRect(10, 10, W - 20, 50); ctx.fillRect(10, H - 60, W - 20, 50);
    ctx.fillRect(10, 10, 50, H - 20); ctx.fillRect(W - 60, 10, 50, H - 20);
    for (let k = 14; k < W - 14; k += 6) {
      ctx.fillStyle = `rgba(210,190,130,${0.2 + r() * 0.25})`;
      ctx.fillRect(k, 16, 3, 38); ctx.fillRect(k, H - 54, 3, 38);
      ctx.fillRect(16, k, 38, 3); ctx.fillRect(W - 54, k, 38, 3);
    }
    // core blocks via recursive split
    const split = (x, y, w, h, d) => {
      if (d === 0 || w < 50 || h < 50) {
        const hue = hueA + r() * (hueB - hueA);
        ctx.fillStyle = `hsl(${hue}, ${15 + r() * 15}%, ${22 + r() * 18}%)`;
        ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
        if (r() < 0.5) {
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          for (let k = y + 4; k < y + h - 4; k += 2) ctx.fillRect(x + 4, k, w - 8, 0.7);
        }
        return;
      }
      if (w > h) { const s = w * (0.35 + r() * 0.3); split(x, y, s, h, d - 1); split(x + s, y, w - s, h, d - 1); }
      else { const s = h * (0.35 + r() * 0.3); split(x, y, w, s, d - 1); split(x, y + s, w, h - s, d - 1); }
    };
    split(66, 66, W - 132, H - 132, 5);
    sealRing(ctx, W, H, 3);
    return canvasTexture(c);
  });
}

/** Nickel heat-spreader lid with a generic laser marking. */
export function lidTexture(seed = 1) {
  return memo(`lid-${seed}`, () => {
    const W = 1000, H = 1000;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(seed);
    ctx.fillStyle = '#b9b5ad';
    ctx.fillRect(0, 0, W, H);
    // mottled plating
    for (let i = 0; i < 260; i++) {
      const x = r() * W, y = r() * H, s = 20 + r() * 120;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s);
      const v = r() < 0.5 ? 'rgba(255,250,240,0.10)' : 'rgba(120,115,105,0.07)';
      g.addColorStop(0, v); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 0.18;
    ctx.drawImage(noiseCanvas(W, H, { amp: 40, seed: seed + 3 }), 0, 0);
    ctx.globalAlpha = 1;
    // marking, rotated 90deg as on the board
    ctx.save();
    ctx.translate(W * 0.5, H * 0.5);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(95,90,82,0.85)';
    ctx.textBaseline = 'middle';
    ctx.font = '700 60px Helvetica, Arial, sans-serif';
    ctx.fillText('NVIDIA', -300, -200);
    ctx.font = '56px "Courier New", monospace';
    ctx.fillText('B200', -300, -80);
    ctx.fillText('TW  2442', 0, -80);
    ctx.fillText('G100-A01', -300, 40);
    ctx.beginPath(); ctx.arc(200, 40, 32, 0, Math.PI * 2); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(95,90,82,0.85)'; ctx.stroke();
    ctx.font = '40px "Courier New", monospace';
    ctx.fillText('e1', 181, 42);
    ctx.restore();
    // pin-1 notch mark
    ctx.fillStyle = 'rgba(80,75,70,0.6)';
    ctx.beginPath(); ctx.moveTo(W - 50, 20); ctx.lineTo(W - 20, 20); ctx.lineTo(W - 20, 50); ctx.fill();
    return canvasTexture(c);
  });
}

/** Package substrate top around the silicon: dark laminate with land-side capacitor arrays. */
export function substrateTexture({ w = 920, h = 1060, color = '#1b1d1c', capColor = '#b9a77a', ring = 0.13, seed = 4 } = {}) {
  return memo(`sub-${w}-${h}-${color}-${seed}`, () => {
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const r = rng(seed);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.1;
    ctx.drawImage(noiseCanvas(w, h, { amp: 40, seed }), 0, 0);
    ctx.globalAlpha = 1;
    // rows of tiny capacitor pads near the outer edge
    const mx = w * ring, my = h * ring;
    ctx.fillStyle = capColor;
    for (let x = mx; x < w - mx; x += 9) {
      if (r() < 0.85) { ctx.fillRect(x, my * 0.55, 5, 3); ctx.fillRect(x, h - my * 0.55, 5, 3); }
    }
    for (let y = my; y < h - my; y += 9) {
      if (r() < 0.85) { ctx.fillRect(mx * 0.55, y, 3, 5); ctx.fillRect(w - mx * 0.55, y, 3, 5); }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '14px Helvetica';
    ctx.fillText('◤', 10, 22);
    return canvasTexture(c);
  });
}

/** HBM3e stack top: polished base-die silicon (beige) with a faint grid. */
export function hbmTexture() {
  return memo('hbm', () => {
    const w = 256, h = 256;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#d2cbbb'); g.addColorStop(1, '#bdb5a4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // molded edge around the top base die
    ctx.strokeStyle = 'rgba(60,55,48,0.55)';
    ctx.lineWidth = 7;
    ctx.strokeRect(3.5, 3.5, w - 7, h - 7);
    ctx.globalAlpha = 0.12;
    ctx.drawImage(noiseCanvas(w, h, { amp: 60, seed: 77 }), 0, 0);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.strokeRect(3, 3, w - 6, h - 6);
    return canvasTexture(c);
  });
}

/** Laser-marked Grace die (polished black silicon backside, white marking). */
export function graceMarkedDie() {
  return memo('grace-mark', () => {
    const W = 1000, H = 1060;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.drawImage(graceDie().image, 0, 0, W, H);
    ctx.fillStyle = 'rgba(8,10,12,0.88)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(200,205,210,0.75)';
    ctx.font = 'italic 800 96px Helvetica, Arial, sans-serif';
    ctx.fillText('NVIDIA', 180, 330);
    ctx.font = '58px "Courier New", monospace';
    ctx.fillText('GRACE  2440', 190, 440);
    ctx.fillText('TH500-A1', 190, 520);
    ctx.beginPath(); ctx.arc(640, 500, 30, 0, Math.PI * 2); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(200,205,210,0.7)'; ctx.stroke();
    return canvasTexture(c);
  });
}

export function dieNormalFromTexture(tex, strength = 1.2) {
  return canvasTexture(heightToNormal(tex.image, strength), { srgb: false });
}
