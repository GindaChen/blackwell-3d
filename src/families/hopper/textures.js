// Hopper canvas textures: the GH100 die floorplan, its polished/marked backside, the third-generation
// NVSwitch die, and the (illustrative) lid marking.
//
// GH100 floorplan follows NVIDIA's published block diagram (Hopper architecture in-depth blog):
// 8 GPCs (4 above and 4 below the L2), each 9 TPCs = 18 SMs; the 60 MB L2 split into two halves
// across the middle; HBM3 memory controllers + PHYs down both long edges (6 x 1024-bit, three per
// side); PCIe Gen5 / GigaThread engine on one short edge and the 18 NVLink 4 ports on the other.
// Block proportions are stylised (estimates), not traced from a die shot.
import { makeCanvas, canvasTexture, rng, noiseCanvas } from '../../lib/util.js';

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

function phyStrip(ctx, x, y, w, h, r, vertical) {
  ctx.fillStyle = '#2b2a26';
  ctx.fillRect(x, y, w, h);
  if (vertical) {
    for (let k = y + 5; k < y + h - 5; k += 6) {
      ctx.fillStyle = `rgba(${180 + r() * 40},${160 + r() * 30},110,0.35)`;
      ctx.fillRect(x + 5, k, w - 10, 3);
    }
  } else {
    for (let k = x + 5; k < x + w - 5; k += 6) {
      ctx.fillStyle = `rgba(${180 + r() * 40},${160 + r() * 30},110,0.35)`;
      ctx.fillRect(k, y + 5, 3, h - 10);
    }
  }
  ctx.strokeStyle = 'rgba(200,190,150,0.4)';
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
}

function sm(ctx, x, y, w, h, r, hue) {
  // one SM: four tensor-core/register-file quadrants over a shared L1 / texture strip
  ctx.fillStyle = `hsl(${hue}, 18%, ${19 + r() * 6}%)`;
  ctx.fillRect(x, y, w, h);
  const qw = (w - 3) / 4;
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = `hsl(${hue + 8}, 24%, ${32 + r() * 10}%)`;
    ctx.fillRect(x + 1 + i * (qw + 0.3), y + 1, qw - 0.6, h * 0.62);
  }
  ctx.fillStyle = `hsl(${hue - 12}, 14%, ${40 + r() * 8}%)`;
  ctx.fillRect(x + 1, y + h * 0.7, w - 2, h * 0.24);
}

/**
 * GH100 floorplan. Canvas is portrait (W:H = 26:31.3, the die's short:long edge). HBM PHYs on the
 * left/right (long) edges; NVLink 4 along the bottom short edge, PCIe Gen5 along the top.
 */
export function gh100Die() {
  return memo('gh100', () => {
    const W = 850, H = 1024;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(100);
    ctx.fillStyle = '#13171b';
    ctx.fillRect(0, 0, W, H);
    // HBM3 PHYs + memory controllers: three per long edge (one per stack site)
    const phyW = 58, top = 92, bot = H - 92, segH = (bot - top) / 3;
    for (const x0 of [12, W - 12 - phyW])
      for (let i = 0; i < 3; i++) phyStrip(ctx, x0, top + i * segH + 4, phyW, segH - 8, r, true);
    // memory controller column just inside each PHY column
    for (const x0 of [12 + phyW + 4, W - 12 - phyW - 4 - 26]) {
      ctx.fillStyle = '#2a302c';
      ctx.fillRect(x0, top, 26, bot - top);
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      for (let y = top + 3; y < bot - 3; y += 3) ctx.fillRect(x0 + 2, y, 22, 0.8);
    }
    // PCIe Gen5 + GigaThread engine on the top short edge, NVLink 4 ports on the bottom edge
    phyStrip(ctx, 110, 14, W - 220, 62, r, false);
    ctx.fillStyle = '#353a33';
    ctx.fillRect(W / 2 - 90, 20, 180, 50);
    phyStrip(ctx, 100, H - 14 - 62, W - 200, 62, r, false);
    for (let k = 0; k < 18; k++) { // 18 NVLink 4 ports
      ctx.fillStyle = 'rgba(120,220,255,0.10)';
      ctx.fillRect(104 + k * ((W - 208) / 18), H - 72, (W - 208) / 18 - 3, 54);
    }
    // GPC array: 4 GPCs above, 4 below, L2 halves across the middle
    const ax = 12 + phyW + 34, aw = W - 2 * ax, ay = top, ah = bot - top;
    const l2h = 128, gap = 8;
    const gw = (aw - gap * 3) / 4, gh = (ah - l2h - gap * 2) / 2;
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 4; col++) {
        const x = ax + col * (gw + gap);
        const y = ay + row * (gh + l2h + gap * 2);
        const hue = 150 + col * 10 + row * 18; // teal sweep
        ctx.fillStyle = `hsl(${hue}, 16%, 14%)`;
        ctx.fillRect(x, y, gw, gh);
        // 9 TPCs x 2 SMs = 2 columns x 9 rows of SMs, with a raster/PolyMorph strip
        const pad = 4, rows = 9, cols = 2;
        const sw = (gw - pad * 2 - 3) / cols, sh = (gh - pad * 2 - 22 - (rows - 1) * 2) / rows;
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++)
          sm(ctx, x + pad + i * (sw + 3), y + pad + (row ? 22 : 0) + j * (sh + 2), sw, sh, r, hue);
        ctx.fillStyle = `hsl(${hue}, 18%, 30%)`;
        ctx.fillRect(x + pad, row ? y + 4 : y + gh - 20, gw - pad * 2, 16);
      }
    // L2: two halves side by side, joined by the crossbar between them
    const ly = ay + gh + gap;
    for (let s = 0; s < 2; s++) {
      const lx = ax + s * (aw / 2 + 6), lw = aw / 2 - 6;
      ctx.fillStyle = '#3a3d3a';
      ctx.fillRect(lx, ly, lw, l2h);
      for (let i = 0; i < 8; i++) {
        const x = lx + 3 + i * ((lw - 6) / 8);
        ctx.fillStyle = `hsl(${60 + r() * 30}, 10%, ${33 + r() * 8}%)`;
        ctx.fillRect(x, ly + 4, (lw - 6) / 8 - 3, l2h / 2 - 6);
        ctx.fillRect(x, ly + l2h / 2 + 2, (lw - 6) / 8 - 3, l2h / 2 - 6);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      for (let y = ly + 4; y < ly + l2h - 4; y += 2) ctx.fillRect(lx + 3, y, lw - 6, 0.8);
    }
    ctx.fillStyle = 'rgba(200,180,120,0.35)';
    ctx.fillRect(ax + aw / 2 - 5, ly, 10, l2h);
    sealRing(ctx, W, H, 4);
    ctx.globalAlpha = 0.06;
    ctx.drawImage(noiseCanvas(W, H, { amp: 50, seed: 19 }), 0, 0);
    ctx.globalAlpha = 1;
    return canvasTexture(c);
  });
}

/** Polished bare-die backside with a faint laser marking (H100 SXM5 ships without a lid). */
export function gh100Marked() {
  return memo('gh100-mark', () => {
    const W = 850, H = 1024;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.drawImage(gh100Die().image, 0, 0, W, H);
    ctx.fillStyle = 'rgba(10,12,14,0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(190,196,200,0.55)';
    ctx.textAlign = 'center';
    ctx.font = 'italic 800 84px Helvetica, Arial, sans-serif';
    ctx.fillText('NVIDIA', 0, -60);
    ctx.font = '54px "Courier New", monospace';
    ctx.fillText('GH100', 0, 30);
    ctx.fillText('TAIWAN', 0, 100);
    ctx.restore();
    return canvasTexture(c);
  });
}

/** Third-generation NVSwitch die: NVLink 4 SerDes ring (64 ports) around the crossbar and SHARP engines. */
export function nvswitch3Die() {
  return memo('nvs3', () => {
    const W = 512, H = 512;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(303);
    ctx.fillStyle = '#14181b';
    ctx.fillRect(0, 0, W, H);
    phyStrip(ctx, 10, 10, W - 20, 56, r, false);
    phyStrip(ctx, 10, H - 66, W - 20, 56, r, false);
    phyStrip(ctx, 10, 72, 56, H - 144, r, true);
    phyStrip(ctx, W - 66, 72, 56, H - 144, r, true);
    // crossbar in the centre, port logic blocks around it
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      ctx.fillStyle = `hsl(${165 + r() * 30}, 18%, ${22 + r() * 14}%)`;
      ctx.fillRect(76 + i * 91, 76 + j * 91, 85, 85);
    }
    ctx.fillStyle = '#3b3f3a';
    ctx.fillRect(170, 170, 172, 172);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let y = 172; y < 340; y += 2) ctx.fillRect(172, y, 168, 0.7);
    sealRing(ctx, W, H, 3);
    return canvasTexture(c);
  });
}

/** Lid marking for the illustrative heat spreader. */
export function hopperLidTexture(name = 'H100 SXM5') {
  return memo(`lid-${name}`, () => {
    const W = 800, H = 720;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(7);
    ctx.fillStyle = '#bab6ae';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 200; i++) {
      const x = r() * W, y = r() * H, s = 20 + r() * 110;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s);
      g.addColorStop(0, r() < 0.5 ? 'rgba(255,250,240,0.10)' : 'rgba(120,115,105,0.07)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 0.18;
    ctx.drawImage(noiseCanvas(W, H, { amp: 40, seed: 11 }), 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(95,90,82,0.85)';
    ctx.textBaseline = 'middle';
    ctx.font = '700 64px Helvetica, Arial, sans-serif';
    ctx.fillText('NVIDIA', 90, 220);
    ctx.font = '50px "Courier New", monospace';
    ctx.fillText(name, 90, 330);
    ctx.fillText('GH100', 90, 420);
    ctx.fillStyle = 'rgba(80,75,70,0.6)';
    ctx.beginPath(); ctx.moveTo(W - 50, 20); ctx.lineTo(W - 20, 20); ctx.lineTo(W - 20, 50); ctx.fill();
    return canvasTexture(c);
  });
}
