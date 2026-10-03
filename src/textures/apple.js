// Procedural Apple silicon floorplans and package-top textures (M5 generation).
//
// M5 Pro/Max/Ultra split the SoC into a CPU tile and a GPU tile, hybrid-bonded (TSMC SoIC-X) onto a
// silicon interposer. Block placement is stylised from TechInsights / TechBoards die analysis and
// earlier High Yield annotations (estimates; see docs/2026-10-03-apple-design.md).
//
// Canvas orientation matches a box top face: canvas top = -z (towards the package's outer end for the
// tiles of the first M5 Max), canvas left = -x. The second M5 Max reuses the textures rotated 180°.
import { makeCanvas, canvasTexture, rng, noiseCanvas } from '../lib/util.js';

const cache = new Map();
const memo = (k, f) => (cache.has(k) ? cache.get(k) : (cache.set(k, f()), cache.get(k)));

function sealRing(ctx, w, h, inset = 5) {
  ctx.strokeStyle = 'rgba(215,215,225,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
}

/** Fine vertical stripes: a PHY / bond-interface strip. */
function phy(ctx, r, x, y, w, h, { vertical = false, tint = [200, 185, 140] } = {}) {
  ctx.fillStyle = '#2a2a2c';
  ctx.fillRect(x, y, w, h);
  const [R, G, B] = tint;
  if (vertical) for (let k = y + 4; k < y + h - 4; k += 5) { ctx.fillStyle = `rgba(${R},${G},${B},${0.2 + r() * 0.25})`; ctx.fillRect(x + 4, k, w - 8, 2.5); }
  else for (let k = x + 4; k < x + w - 4; k += 5) { ctx.fillStyle = `rgba(${R},${G},${B},${0.2 + r() * 0.25})`; ctx.fillRect(k, y + 4, 2.5, h - 8); }
}

/** A CPU core: execution block, big L1 SRAM and a brighter vector unit. */
function core(ctx, r, x, y, w, h, hue) {
  ctx.fillStyle = `hsl(${hue}, 16%, ${22 + r() * 5}%)`;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = `hsl(${hue + 10}, 22%, ${36 + r() * 8}%)`;
  ctx.fillRect(x + 3, y + 3, w * 0.55, h * 0.45);
  ctx.fillStyle = `hsl(${hue - 15}, 12%, ${44 + r() * 6}%)`;
  ctx.fillRect(x + 3, y + h * 0.55, w - 6, h * 0.4);
  ctx.fillStyle = 'rgba(255,255,255,0.09)';
  for (let k = y + h * 0.55; k < y + h * 0.95; k += 2) ctx.fillRect(x + 3, k, w - 6, 0.8);
  ctx.fillStyle = `hsla(${hue + 30}, 35%, 62%, 0.35)`;
  ctx.fillRect(x + w * 0.62, y + 4, w * 0.3, h * 0.38);
}

/** SRAM block (L2 / SLC): dense horizontal lines in sub-arrays. */
function sram(ctx, r, x, y, w, h, cols = 4) {
  ctx.fillStyle = '#3c3e44';
  ctx.fillRect(x, y, w, h);
  const cw = w / cols;
  for (let i = 0; i < cols; i++) {
    ctx.fillStyle = `hsl(225, 8%, ${36 + r() * 8}%)`;
    ctx.fillRect(x + i * cw + 2, y + 2, cw - 4, h - 4);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let k = y + 3; k < y + h - 3; k += 2) ctx.fillRect(x + i * cw + 3, k, cw - 6, 0.7);
  }
}

/** Random logic split into blocks of a given hue range. */
function logic(ctx, r, x, y, w, h, hueA, hueB, depth = 3) {
  if (depth === 0 || w < 24 || h < 24) {
    ctx.fillStyle = `hsl(${hueA + r() * (hueB - hueA)}, ${14 + r() * 14}%, ${20 + r() * 16}%)`;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    return;
  }
  if (w > h) { const s = w * (0.35 + r() * 0.3); logic(ctx, r, x, y, s, h, hueA, hueB, depth - 1); logic(ctx, r, x + s, y, w - s, h, hueA, hueB, depth - 1); }
  else { const s = h * (0.35 + r() * 0.3); logic(ctx, r, x, y, w, s, hueA, hueB, depth - 1); logic(ctx, r, x, y + s, w, h - s, hueA, hueB, depth - 1); }
}

/**
 * M5 Max CPU tile (~18.0 x 9.3 mm): 6 super cores, 12 performance cores in two clusters, a 16-core
 * Neural Engine, and the Thunderbolt 5 / display / SSD controllers along the outer edge. The bottom
 * edge is the SoIC hybrid-bond interface to the GPU tile.
 */
export function appleCpuTile() {
  return memo('apple-cpu', () => {
    const W = 1024, H = 528;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(51);
    ctx.fillStyle = '#16181c';
    ctx.fillRect(0, 0, W, H);
    // outer edge: 3x Thunderbolt 5 PHYs, display and PCIe/SSD PHYs
    for (let i = 0; i < 3; i++) phy(ctx, r, 20 + i * 118, 14, 108, 54, { tint: [150, 190, 230] });
    phy(ctx, r, 384, 14, 150, 54);
    phy(ctx, r, 544, 14, 200, 54, { tint: [200, 160, 210] });
    logic(ctx, r, 754, 14, W - 774, 54, 190, 260, 2);
    // super-core cluster (6 cores, 3 x 2) with its shared L2
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) core(ctx, r, 22 + i * 82, 84 + j * 124, 78, 118, 28);
    sram(ctx, r, 22, 336, 242, 92, 3);
    // two performance clusters of 6 (3 x 2) with their L2s
    for (let cl = 0; cl < 2; cl++) {
      const x0 = 282 + cl * 230;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) core(ctx, r, x0 + i * 72, 84 + j * 104, 68, 100, 205);
      sram(ctx, r, x0, 296, 212, 72, 3);
      logic(ctx, r, x0, 374, 212, 54, 200, 240, 2);
    }
    // 16-core Neural Engine (4 x 4) + its SRAM
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = 750 + i * 64, y = 84 + j * 64;
      ctx.fillStyle = `hsl(${280 + r() * 20}, 18%, ${26 + r() * 6}%)`;
      ctx.fillRect(x, y, 60, 60);
      ctx.fillStyle = `hsla(300, 30%, 60%, 0.3)`;
      ctx.fillRect(x + 8, y + 8, 22, 22);
    }
    sram(ctx, r, 750, 344, 252, 84, 4);
    // SoIC hybrid-bond interface to the GPU tile
    phy(ctx, r, 20, H - 82, W - 40, 62, { tint: [220, 200, 150] });
    sealRing(ctx, W, H);
    return canvasTexture(c);
  });
}

/**
 * M5 Max GPU tile (~19.6 x 16.4 mm): 40 GPU cores (each with a Neural Accelerator), the system level
 * cache, the 512-bit LPDDR5X memory controllers with PHYs on both side edges, and the media engines.
 * Top edge: SoIC bond to the CPU tile. Bottom edge: UltraFusion to the other M5 Max.
 */
export function appleGpuTile() {
  return memo('apple-gpu', () => {
    const W = 1024, H = 856;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(61);
    ctx.fillStyle = '#15171b';
    ctx.fillRect(0, 0, W, H);
    // SoIC interface (top) and UltraFusion (bottom)
    phy(ctx, r, 20, 14, W - 40, 56, { tint: [220, 200, 150] });
    phy(ctx, r, 90, H - 70, W - 180, 56, { tint: [160, 220, 200] });
    // LPDDR5X PHYs + memory controllers down both side edges (16 channels a side)
    for (const x of [14, W - 70]) phy(ctx, r, x, 84, 56, H - 172, { vertical: true });
    for (const x of [76, W - 132]) for (let k = 0; k < 8; k++) logic(ctx, r, x, 88 + k * 85, 56, 80, 30, 60, 1);
    // SLC bands above and below the GPU array
    sram(ctx, r, 140, 84, W - 280, 92, 8);
    sram(ctx, r, 140, H - 176, W - 280, 92, 8);
    // 40 GPU cores: 4 rows x 10
    const gx = 140, gy = 188, gw = (W - 280) / 10, gh = (H - 376 - 24) / 4;
    for (let i = 0; i < 10; i++) for (let j = 0; j < 4; j++) {
      const x = gx + i * gw, y = gy + j * (gh + 8);
      ctx.fillStyle = `hsl(150, 14%, ${21 + r() * 5}%)`;
      ctx.fillRect(x + 2, y, gw - 4, gh);
      // ALU quads + the per-core Neural Accelerator (brighter block)
      for (let q = 0; q < 4; q++) {
        ctx.fillStyle = `hsl(160, 20%, ${32 + r() * 9}%)`;
        ctx.fillRect(x + 6 + (q % 2) * (gw / 2 - 4), y + 6 + Math.floor(q / 2) * (gh * 0.3), gw / 2 - 10, gh * 0.27);
      }
      ctx.fillStyle = `hsla(85, 35%, 55%, 0.45)`;
      ctx.fillRect(x + 6, y + gh * 0.64, gw - 12, gh * 0.14);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let k = y + gh * 0.82; k < y + gh - 3; k += 2) ctx.fillRect(x + 5, k, gw - 10, 0.7);
    }
    sealRing(ctx, W, H);
    return canvasTexture(c);
  });
}

/** Polished silicon backside, as the tiles look before the floorplan overlay. */
export function appleMarkedTile(w = 1024, h = 528, seed = 3) {
  return memo(`apple-marked-${w}-${h}-${seed}`, () => {
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#2b2f36'); g.addColorStop(0.5, '#3b404a'); g.addColorStop(1, '#262a30');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.12;
    ctx.drawImage(noiseCanvas(w, h, { amp: 30, seed }), 0, 0);
    ctx.globalAlpha = 1;
    sealRing(ctx, w, h, 4);
    return canvasTexture(c);
  });
}

/** Brushed lid with the part name. */
export function appleLidTexture(name = 'M5 ULTRA') {
  return memo(`apple-lid-${name}`, () => {
    const W = 860, H = 1000;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#b8bbbf';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.16;
    ctx.drawImage(noiseCanvas(W, H, { amp: 40, seed: 9 }), 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(70,72,78,0.8)';
    ctx.textAlign = 'center';
    ctx.font = '600 78px Helvetica, Arial, sans-serif';
    ctx.fillText(name, W / 2, H / 2 - 20);
    ctx.font = '44px "Courier New", monospace';
    ctx.fillText('TAIWAN  2633', W / 2, H / 2 + 50);
    ctx.fillStyle = 'rgba(70,72,78,0.6)';
    ctx.beginPath(); ctx.moveTo(30, 30); ctx.lineTo(70, 30); ctx.lineTo(30, 70); ctx.fill();
    return canvasTexture(c);
  });
}

/** Hole grid for the Mac Studio's rear exhaust: alpha map, white = hole (drawn as dark dots). */
export function grilleHoles(cols = 64, rows = 22) {
  return memo(`grille-${cols}-${rows}`, () => {
    const W = 1024, H = Math.round((1024 * rows) / cols);
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    const p = W / cols;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      ctx.beginPath(); ctx.arc((i + 0.5) * p, (j + 0.5) * p, p * 0.32, 0, 7); ctx.fill();
    }
    return canvasTexture(c, { srgb: false });
  });
}

/** Top of a centrifugal blower: impeller blades seen through the intake ring. */
export function blowerTop() {
  return memo('blower-top', () => {
    const S = 512;
    const c = makeCanvas(S, S);
    const x = c.getContext('2d');
    x.fillStyle = '#121314'; x.fillRect(0, 0, S, S);
    x.fillStyle = '#060606'; x.beginPath(); x.arc(S / 2, S / 2, S * 0.36, 0, 7); x.fill();
    x.strokeStyle = '#2a2b2e'; x.lineWidth = 5;
    for (let i = 0; i < 41; i++) {
      const a = (i / 41) * Math.PI * 2;
      x.beginPath();
      x.moveTo(S / 2 + Math.cos(a) * S * 0.16, S / 2 + Math.sin(a) * S * 0.16);
      x.quadraticCurveTo(S / 2 + Math.cos(a + 0.25) * S * 0.28, S / 2 + Math.sin(a + 0.25) * S * 0.28, S / 2 + Math.cos(a + 0.42) * S * 0.35, S / 2 + Math.sin(a + 0.42) * S * 0.35);
      x.stroke();
    }
    x.fillStyle = '#26272a'; x.beginPath(); x.arc(S / 2, S / 2, S * 0.15, 0, 7); x.fill();
    x.strokeStyle = '#3a3b3e'; x.lineWidth = 3;
    x.beginPath(); x.arc(S / 2, S / 2, S * 0.37, 0, 7); x.stroke();
    return canvasTexture(c);
  });
}
