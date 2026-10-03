// Canvas textures for the Kepler / Maxwell Tesla cards: die floorplans, laser-marked die tops and the
// GDDR5 package marking. The floorplans are stylised block diagrams arranged after NVIDIA's published
// architecture diagrams (GK110/GK210: 15 SMX in 5 GPCs, 6 x 64-bit memory controllers), not die-shot
// traces. Which SMX are fused off varies from chip to chip; the two greyed tiles are illustrative.
import * as THREE from 'three';
import { makeCanvas, canvasTexture, rng, noiseCanvas } from '../../lib/util.js';
import { dieMaterial } from '../../parts/chips.js';

const cache = new Map();
export const memo = (k, f) => (cache.has(k) ? cache.get(k) : (cache.set(k, f()), cache.get(k)));

export function sealRing(ctx, w, h, inset = 6) {
  ctx.strokeStyle = 'rgba(220,210,180,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.strokeStyle = 'rgba(90,90,90,0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(inset + 4, inset + 4, w - inset * 2 - 8, h - inset * 2 - 8);
}

/** A memory/IO PHY block: dark strip with gold bump columns. */
export function phy(ctx, x, y, w, h, r, vertical) {
  ctx.fillStyle = '#2b2a26';
  ctx.fillRect(x, y, w, h);
  if (vertical) {
    for (let k = y + 6; k < y + h - 6; k += 6) {
      ctx.fillStyle = `rgba(${180 + r() * 40},${160 + r() * 30},110,0.35)`;
      ctx.fillRect(x + 6, k, w - 12, 3);
    }
  } else {
    for (let k = x + 6; k < x + w - 6; k += 6) {
      ctx.fillStyle = `rgba(${180 + r() * 40},${160 + r() * 30},110,0.35)`;
      ctx.fillRect(k, y + 6, 3, h - 12);
    }
  }
  ctx.strokeStyle = 'rgba(200,190,150,0.4)';
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
}

/** Fine SRAM texture inside a block. */
export function sram(ctx, x, y, w, h, alpha = 0.09) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  for (let k = y + 2; k < y + h - 2; k += 2) ctx.fillRect(x + 2, k, w - 4, 0.7);
}

export function disabledOverlay(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,12,14,0.62)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let k = -h; k < w; k += 14) { ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h, y); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = 'rgba(230,230,230,0.55)';
  ctx.font = '600 20px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('fused off', x + w / 2, y + h / 2);
  ctx.textAlign = 'left';
}

/** One Kepler SMX: 192 CUDA cores in 6 lanes, 64 FP64 units, a big register file, L1/shared, texture. */
function smx(ctx, x, y, w, h, r, hue) {
  ctx.fillStyle = `hsl(${hue}, 16%, ${17 + r() * 4}%)`;
  ctx.fillRect(x, y, w, h);
  // register file (doubled to 512 KB per SMX on GK210) across the top
  ctx.fillStyle = `hsl(${hue - 30}, 12%, 40%)`;
  ctx.fillRect(x + 4, y + 4, w - 8, h * 0.2);
  sram(ctx, x + 4, y + 4, w - 8, h * 0.2, 0.12);
  // 6 core lanes (32 cores each) + FP64 / SFU columns
  const lanes = 6, lw = (w - 8 - (lanes - 1) * 3) / lanes;
  for (let i = 0; i < lanes; i++) {
    const lx = x + 4 + i * (lw + 3);
    ctx.fillStyle = `hsl(${hue + 6}, 24%, ${30 + r() * 10}%)`;
    ctx.fillRect(lx, y + h * 0.26, lw, h * 0.42);
    ctx.fillStyle = `hsla(${hue + 25}, 30%, 62%, 0.3)`;
    for (let k = 0; k < 8; k++) ctx.fillRect(lx + 1, y + h * 0.27 + k * (h * 0.42 / 8), lw - 2, h * 0.42 / 8 - 2);
  }
  // L1 / shared memory (doubled to 128 KB on GK210) and texture units along the bottom
  ctx.fillStyle = `hsl(${hue - 20}, 14%, 44%)`;
  ctx.fillRect(x + 4, y + h * 0.72, w * 0.62, h * 0.24);
  sram(ctx, x + 4, y + h * 0.72, w * 0.62, h * 0.24);
  ctx.fillStyle = `hsl(${hue + 40}, 16%, 30%)`;
  ctx.fillRect(x + w * 0.66 + 2, y + h * 0.72, w * 0.34 - 6, h * 0.24);
}

/**
 * GK210 floorplan (stylised). Square canvas. 5 GPCs as columns of 3 SMX, L2 cache band and
 * crossbar below them, memory PHYs on the left, right and top edges (6 x 64-bit = 384-bit),
 * PCIe Gen3 and host interface on the bottom edge.
 */
export function gk210Floorplan() {
  return memo('gk210', () => {
    const W = 1000, H = 1000;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(210);
    ctx.fillStyle = '#13171a';
    ctx.fillRect(0, 0, W, H);
    phy(ctx, 14, 140, 52, 330, r, true); phy(ctx, 14, 510, 52, 330, r, true);
    phy(ctx, W - 66, 140, 52, 330, r, true); phy(ctx, W - 66, 510, 52, 330, r, true);
    phy(ctx, 140, 14, 330, 52, r, false); phy(ctx, 530, 14, 330, 52, r, false);
    // PCIe Gen3 x16 + host interface
    ctx.fillStyle = '#29271f'; ctx.fillRect(220, H - 64, 560, 50);
    for (let k = 226; k < 774; k += 9) { ctx.fillStyle = `rgba(190,170,120,${0.18 + r() * 0.2})`; ctx.fillRect(k, H - 58, 4, 38); }
    // SMX grid: 5 GPC columns x 3 SMX
    const x0 = 84, y0 = 84, gw = (W - 168 - 4 * 10) / 5, sh = 172;
    const off = new Set(['1,2', '3,0']);
    for (let g = 0; g < 5; g++) {
      const hue = 95 + g * 14;
      const gx = x0 + g * (gw + 10);
      ctx.fillStyle = `hsl(${hue}, 14%, 12%)`;
      ctx.fillRect(gx, y0, gw, 3 * (sh + 6) + 30);
      for (let s = 0; s < 3; s++) {
        const sy = y0 + 4 + s * (sh + 6);
        smx(ctx, gx + 4, sy, gw - 8, sh, r, hue);
        if (off.has(`${g},${s}`)) disabledOverlay(ctx, gx + 4, sy, gw - 8, sh);
      }
      // raster engine strip at the foot of each GPC
      ctx.fillStyle = `hsl(${hue}, 20%, 30%)`;
      ctx.fillRect(gx + 4, y0 + 3 * (sh + 6) + 6, gw - 8, 20);
    }
    // L2 cache (1.5 MB) band
    const ly = y0 + 3 * (sh + 6) + 44;
    ctx.fillStyle = '#3a3d3a'; ctx.fillRect(x0, ly, W - 168, 110);
    for (let i = 0; i < 12; i++) {
      const bx = x0 + 4 + i * ((W - 176) / 12);
      ctx.fillStyle = `hsl(${60 + r() * 30}, 10%, ${34 + r() * 8}%)`;
      ctx.fillRect(bx, ly + 4, (W - 176) / 12 - 4, 48);
      ctx.fillRect(bx, ly + 58, (W - 176) / 12 - 4, 48);
    }
    sram(ctx, x0 + 4, ly + 4, W - 176, 102, 0.06);
    // crossbar, GigaThread engine, ROP partitions
    const cy = ly + 120;
    ctx.fillStyle = 'rgba(200,180,120,0.22)'; ctx.fillRect(x0, cy, W - 168, 24);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `hsl(${30 + r() * 30}, 14%, ${26 + r() * 8}%)`;
      ctx.fillRect(x0 + i * ((W - 168) / 6) + 3, cy + 30, (W - 168) / 6 - 6, H - 72 - cy - 36);
    }
    sealRing(ctx, W, H, 4);
    ctx.globalAlpha = 0.06; ctx.drawImage(noiseCanvas(W, H, { amp: 50, seed: 21 }), 0, 0); ctx.globalAlpha = 1;
    return canvasTexture(c);
  });
}

/** Polished die backside with a laser marking (marking text illustrative). */
export function markedDie(key, base, lines) {
  return memo(`mark-${key}`, () => {
    const W = 1000, H = 1000;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.drawImage(base().image, 0, 0, W, H);
    ctx.fillStyle = 'rgba(30,36,44,0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.08; ctx.drawImage(noiseCanvas(W, H, { amp: 60, seed: 5 }), 0, 0); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(205,210,215,0.7)';
    ctx.font = 'italic 800 92px Helvetica, Arial, sans-serif';
    ctx.fillText('NVIDIA', 200, 340);
    ctx.font = '60px "Courier New", monospace';
    lines.forEach((l, i) => ctx.fillText(l, 210, 460 + i * 84));
    return canvasTexture(c);
  });
}

const looksCache = new Map();
/** { marked, floorplan } die materials for a floorplan-toggle key. */
export function dieLooks(key, floorplanFn, lines) {
  if (!looksCache.has(key)) looksCache.set(key, {
    marked: dieMaterial(markedDie(key, floorplanFn, lines), { iridescence: 0.1, rough: 0.12 }),
    floorplan: dieMaterial(floorplanFn(), { iridescence: 0.45 }),
  });
  return looksCache.get(key);
}

export const gk210Looks = () => dieLooks('kepler-gk210', gk210Floorplan, ['GK210-885-A1', 'TAIWAN  1439']);

/** Shroud front label: model name in large type plus a thin rule. */
export function shroudLabel(lines, { w = 1024, h = 256, ink = 'rgba(30,30,30,0.85)', accent = '#76b900' } = {}) {
  return memo(`shroud-${lines.join('|')}-${ink}`, () => {
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = ink;
    ctx.textBaseline = 'middle';
    ctx.font = '700 104px Helvetica, Arial, sans-serif';
    ctx.fillText(lines[0], 24, h * 0.42);
    if (lines[1]) { ctx.font = '500 40px Helvetica, Arial, sans-serif'; ctx.fillText(lines[1], 28, h * 0.8); }
    ctx.fillStyle = accent;
    ctx.fillRect(w - 180, h * 0.42 - 6, 150, 12);
    const t = canvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}
gk210Looks.key = 'kepler-gk210';
