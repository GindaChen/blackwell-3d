// GM200 floorplan (stylised block diagram, after NVIDIA's Maxwell architecture diagrams, not a die-shot
// trace): 6 GPCs of 4 SMM (3072 CUDA cores), 3 MB L2 across the middle, 6 x 64-bit GDDR5 controllers
// on the left, right and top edges, PCIe Gen3 on the bottom edge.
import { makeCanvas, canvasTexture, rng, noiseCanvas } from '../../lib/util.js';
import { memo, phy, sram, sealRing, dieLooks } from '../kepler/silicon.js';

/** One Maxwell SMM: four 32-core processing blocks around a shared-memory spine, L1/texture pairs. */
function smm(ctx, x, y, w, h, r, hue) {
  ctx.fillStyle = `hsl(${hue}, 16%, ${17 + r() * 4}%)`;
  ctx.fillRect(x, y, w, h);
  const pw = (w - 14) / 2, ph = (h * 0.7 - 14) / 2;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const px = x + 4 + i * (pw + 6), py = y + 4 + j * (ph + 6);
    ctx.fillStyle = `hsl(${hue - 25}, 12%, 40%)`;           // register file per block (64 KB)
    ctx.fillRect(px, py, pw, ph * 0.3);
    sram(ctx, px, py, pw, ph * 0.3, 0.12);
    ctx.fillStyle = `hsl(${hue + 8}, 24%, ${30 + r() * 10}%)`; // 32 cores
    ctx.fillRect(px, py + ph * 0.34, pw, ph * 0.66);
    ctx.fillStyle = `hsla(${hue + 25}, 30%, 62%, 0.3)`;
    for (let k = 0; k < 4; k++) ctx.fillRect(px + 2 + k * (pw / 4), py + ph * 0.36, pw / 4 - 4, ph * 0.6);
  }
  // 96 KB shared memory and two L1/texture units along the bottom
  ctx.fillStyle = `hsl(${hue - 15}, 14%, 44%)`;
  ctx.fillRect(x + 4, y + h * 0.72, w * 0.5, h * 0.24);
  sram(ctx, x + 4, y + h * 0.72, w * 0.5, h * 0.24);
  ctx.fillStyle = `hsl(${hue + 40}, 16%, 30%)`;
  ctx.fillRect(x + w * 0.54 + 2, y + h * 0.72, w * 0.46 - 6, h * 0.24);
}

export function gm200Floorplan() {
  return memo('gm200', () => {
    const W = 1000, H = 1000;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(200);
    ctx.fillStyle = '#12161a';
    ctx.fillRect(0, 0, W, H);
    phy(ctx, 14, 130, 52, 340, r, true); phy(ctx, 14, 530, 52, 340, r, true);
    phy(ctx, W - 66, 130, 52, 340, r, true); phy(ctx, W - 66, 530, 52, 340, r, true);
    phy(ctx, 150, 14, 320, 52, r, false); phy(ctx, 530, 14, 320, 52, r, false);
    ctx.fillStyle = '#29271f'; ctx.fillRect(240, H - 60, 520, 46);
    for (let k = 246; k < 754; k += 9) { ctx.fillStyle = `rgba(190,170,120,${0.18 + r() * 0.2})`; ctx.fillRect(k, H - 54, 4, 34); }
    // 3 x 2 GPCs, L2 band between the rows
    const x0 = 84, y0 = 84, gw = (W - 168 - 2 * 12) / 3, gh = 330, l2 = 110;
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
      const hue = 100 + (row * 3 + col) * 11;
      const gx = x0 + col * (gw + 12), gy = y0 + row * (gh + l2 + 24);
      ctx.fillStyle = `hsl(${hue}, 14%, 12%)`;
      ctx.fillRect(gx, gy, gw, gh);
      const sw = (gw - 14) / 2, sh = (gh - 40) / 2;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) smm(ctx, gx + 4 + i * (sw + 6), gy + 4 + j * (sh + 6) + (row ? 26 : 0), sw, sh, r, hue);
      // raster engine strip, on the side facing the L2
      ctx.fillStyle = `hsl(${hue}, 20%, 30%)`;
      ctx.fillRect(gx + 4, row ? gy + 4 : gy + gh - 24, gw - 8, 20);
    }
    const ly = y0 + gh + 12;
    ctx.fillStyle = '#3a3d3a'; ctx.fillRect(x0, ly, W - 168, l2);
    for (let i = 0; i < 12; i++) {
      const bx = x0 + 4 + i * ((W - 176) / 12);
      ctx.fillStyle = `hsl(${60 + r() * 30}, 10%, ${34 + r() * 8}%)`;
      ctx.fillRect(bx, ly + 4, (W - 176) / 12 - 4, 48);
      ctx.fillRect(bx, ly + 58, (W - 176) / 12 - 4, 48);
    }
    sram(ctx, x0 + 4, ly + 4, W - 176, 102, 0.06);
    ctx.fillStyle = 'rgba(200,180,120,0.22)'; ctx.fillRect(x0, ly + l2 / 2 - 10, W - 168, 20);
    sealRing(ctx, W, H, 4);
    ctx.globalAlpha = 0.06; ctx.drawImage(noiseCanvas(W, H, { amp: 50, seed: 22 }), 0, 0); ctx.globalAlpha = 1;
    return canvasTexture(c);
  });
}

export const gm200Looks = () => dieLooks('maxwell-gm200', gm200Floorplan, ['GM200-895-A1', 'TAIWAN  1543']);
gm200Looks.key = 'maxwell-gm200';
