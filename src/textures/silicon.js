// Procedural silicon floorplans and package-top textures.
// Floorplans are stylised after NVIDIA's published renders: the Rubin compute die (SM/GPC arrays,
// L2 band, HBM PHY on the long edges), the Vera CPU die (88-core mesh), and small NIC/DPU dies.
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

/** Rubin compute die (one of two reticle-sized dies). mirror=true flips for the sibling die. */
export function rubinDie(mirror = false) {
  return memo(`rubin-${mirror}`, () => {
    const W = 1024, H = 1024;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(mirror ? 21 : 20);
    ctx.fillStyle = '#15191d';
    ctx.fillRect(0, 0, W, H);
    // HBM PHY strips along left & right edges (die faces HBM stacks on both sides)
    for (const x0 of [14, W - 14 - 70]) {
      ctx.fillStyle = '#2b2a26';
      ctx.fillRect(x0, 20, 70, H - 40);
      for (let y = 26; y < H - 30; y += 7) {
        ctx.fillStyle = `rgba(${180 + r() * 40},${160 + r() * 30},${110},0.35)`;
        ctx.fillRect(x0 + 6, y, 58, 3);
      }
      for (let b = 0; b < 4; b++) {
        ctx.strokeStyle = 'rgba(200,190,150,0.4)';
        ctx.strokeRect(x0 + 2, 24 + b * ((H - 48) / 4), 66, (H - 48) / 4 - 6);
      }
    }
    // die-to-die (NV-HBI) interface strip at the edge facing the sibling die
    const d2dY = mirror ? 14 : H - 14 - 46;
    ctx.fillStyle = '#2f2c25';
    ctx.fillRect(96, d2dY, W - 192, 46);
    for (let x = 100; x < W - 100; x += 5) {
      ctx.fillStyle = `rgba(210,190,130,${0.25 + r() * 0.2})`;
      ctx.fillRect(x, d2dY + 6, 2.5, 34);
    }
    // GPC array: 4 columns x 2 rows of GPCs, each a grid of SM tiles
    const ax = 100, ay = mirror ? 80 : 30, aw = W - 200, ah = H - 110;
    const l2h = 120; // L2 / crossbar band through the middle
    const gpcCols = 4, gpcRows = 2;
    const gw = (aw - (gpcCols - 1) * 10) / gpcCols;
    const gh = (ah - l2h - 20) / gpcRows;
    for (let gy = 0; gy < gpcRows; gy++) {
      for (let gx = 0; gx < gpcCols; gx++) {
        const x = ax + gx * (gw + 10);
        const y = ay + gy * (gh + l2h + 20);
        const hue = 150 + (gx / gpcCols) * 140 + (mirror ? 20 : 0); // teal -> violet sweep
        ctx.fillStyle = `hsl(${hue}, 16%, 15%)`;
        ctx.fillRect(x, y, gw, gh);
        const tc = 4, tr = 4;
        const tw = (gw - 12 - (tc - 1) * 4) / tc;
        const th = (gh - 40 - (tr - 1) * 4) / tr;
        for (let i = 0; i < tc; i++) for (let j = 0; j < tr; j++)
          smTile(ctx, x + 6 + i * (tw + 4), y + 6 + j * (th + 4), tw, th, r, hue);
        // raster / polymorph engine strip
        ctx.fillStyle = `hsl(${hue}, 20%, 30%)`;
        ctx.fillRect(x + 6, y + gh - 30, gw - 12, 22);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        for (let k = x + 8; k < x + gw - 8; k += 3) ctx.fillRect(k, y + gh - 28, 1, 18);
      }
    }
    // L2 cache band: dense SRAM macro texture
    const ly = ay + gh + 10;
    ctx.fillStyle = '#3a3d3a';
    ctx.fillRect(ax, ly, aw, l2h);
    for (let i = 0; i < 16; i++) {
      const x = ax + 4 + i * ((aw - 8) / 16);
      ctx.fillStyle = `hsl(${60 + r() * 30}, 10%, ${34 + r() * 8}%)`;
      ctx.fillRect(x, ly + 4, (aw - 8) / 16 - 4, l2h / 2 - 6);
      ctx.fillRect(x, ly + l2h / 2 + 2, (aw - 8) / 16 - 4, l2h / 2 - 6);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    for (let y = ly + 4; y < ly + l2h - 4; y += 2) ctx.fillRect(ax + 4, y, aw - 8, 0.8);
    // crossbar spine
    ctx.fillStyle = 'rgba(200,180,120,0.25)';
    ctx.fillRect(ax + aw / 2 - 18, ly, 36, l2h);
    sealRing(ctx, W, H, 4);
    // overlay noise for grit
    ctx.globalAlpha = 0.06;
    ctx.drawImage(noiseCanvas(W, H, { amp: 50, seed: 9 }), 0, 0);
    ctx.globalAlpha = 1;
    return canvasTexture(c);
  });
}

export function veraDie() {
  return memo('vera', () => {
    const W = 1024, H = 1152;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(33);
    ctx.fillStyle = '#121619';
    ctx.fillRect(0, 0, W, H);
    // 88 cores: 8 columns x 11 rows mesh with SCF fabric lines between
    const cols = 8, rows = 11, x0 = 70, y0 = 60, cw = (W - 140) / cols, chh = (H - 280) / rows;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const x = x0 + i * cw, y = y0 + j * chh;
        const hue = 165 + r() * 25 + (i / cols) * 20;
        ctx.fillStyle = `hsl(${hue}, 25%, 24%)`;
        ctx.fillRect(x + 3, y + 3, cw - 6, chh - 6);
        // core logic + L2 slice
        ctx.fillStyle = `hsl(${hue + 15}, 35%, 40%)`;
        ctx.fillRect(x + 6, y + 6, cw * 0.55, chh - 12);
        ctx.fillStyle = `hsl(${hue - 30}, 20%, 46%)`;
        ctx.fillRect(x + cw * 0.62, y + 6, cw * 0.3, chh - 12);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        for (let k = y + 7; k < y + chh - 7; k += 2) ctx.fillRect(x + cw * 0.62, k, cw * 0.3, 0.7);
      }
    // SCF mesh lines
    ctx.strokeStyle = 'rgba(190,230,140,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= cols; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * cw, y0); ctx.lineTo(x0 + i * cw, y0 + rows * chh); ctx.stroke(); }
    for (let j = 0; j <= rows; j++) { ctx.beginPath(); ctx.moveTo(x0, y0 + j * chh); ctx.lineTo(x0 + cols * cw, y0 + j * chh); ctx.stroke(); }
    // I/O: LPDDR5X PHY on sides, NVLink-C2C + PCIe along bottom
    ctx.fillStyle = '#2d2b26';
    ctx.fillRect(14, 50, 46, H - 260);
    ctx.fillRect(W - 60, 50, 46, H - 260);
    ctx.fillRect(40, H - 200, W - 80, 170);
    for (let x = 50; x < W - 50; x += 6) {
      ctx.fillStyle = `rgba(200,180,130,${0.2 + r() * 0.2})`;
      ctx.fillRect(x, H - 190, 3, 60);
    }
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `hsl(${250 + r() * 30}, 18%, 34%)`;
      ctx.fillRect(60 + i * ((W - 120) / 6), H - 118, (W - 120) / 6 - 10, 80);
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

/** Nickel IHS lid with laser marking (matches the GTC 2025 sample: "NVIDIA  T TW 2538  U9C643.07V e1"). */
export function lidTexture(seed = 1) {
  return memo(`lid-${seed}`, () => {
    const W = 880, H = 1020;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(seed);
    ctx.fillStyle = '#c9c5bd';
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
    ctx.fillText('NVIDIA', -300, -230);
    ctx.font = '56px "Courier New", monospace';
    ctx.fillText('T TW', -300, -110);
    ctx.fillText('2538', 30, -110);
    ctx.fillText('U9C643.07V', -300, 10);
    ctx.beginPath(); ctx.arc(130 + 155, 10, 32, 0, Math.PI * 2); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(95,90,82,0.85)'; ctx.stroke();
    ctx.font = '40px "Courier New", monospace';
    ctx.fillText('e1', 130 + 136, 12);
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

/** HBM4 stack top: polished base-die silicon (beige) with a faint grid. */
export function hbmTexture() {
  return memo('hbm', () => {
    const w = 256, h = 256;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#d8d2c4'); g.addColorStop(1, '#c4bdae');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.12;
    ctx.drawImage(noiseCanvas(w, h, { amp: 60, seed: 77 }), 0, 0);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.strokeRect(3, 3, w - 6, h - 6);
    return canvasTexture(c);
  });
}

/** Laser-marked CPU die (polished black silicon, white marking like the GTC sample). */
export function veraMarkedDie() {
  return memo('vera-mark', () => {
    const W = 1000, H = 1160;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    // faint floorplan ghosting under the polished backside
    ctx.drawImage(veraDie().image, 0, 0, W, H);
    ctx.fillStyle = 'rgba(8,10,12,0.88)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(200,205,210,0.75)';
    ctx.font = 'italic 800 96px Helvetica, Arial, sans-serif';
    ctx.fillText('NVIDIA', 180, 330);
    ctx.font = '58px "Courier New", monospace';
    ctx.fillText('8 ER   2535', 210, 440);
    ctx.fillText('E74309.000', 210, 520);
    ctx.beginPath(); ctx.arc(640, 500, 30, 0, Math.PI * 2); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(200,205,210,0.7)'; ctx.stroke();
    return canvasTexture(c);
  });
}

export function dieNormalFromTexture(tex, strength = 1.2) {
  return canvasTexture(heightToNormal(tex.image, strength), { srgb: false });
}
