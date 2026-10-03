// Small reusable procedural surface textures (brushed metal, spangle, perforation, etc).
import * as THREE from 'three';
import { makeCanvas, canvasTexture, heightToNormal, rng, noiseCanvas } from '../../../lib/util.js';

const cache = new Map();
const memo = (key, fn) => {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
};

/** Directional brushed-metal roughness variation (tileable along x). */
export function brushedRoughness(base = 0.32, amp = 0.08) {
  return memo(`brushed-${base}-${amp}`, () => {
    const w = 512, h = 512;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const r = rng(11);
    const g = Math.round(base * 255);
    ctx.fillStyle = `rgb(0,${g},255)`;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const y = r() * h;
      const v = Math.round((base + (r() - 0.5) * 2 * amp) * 255);
      ctx.strokeStyle = `rgba(0,${v},255,${0.25 + r() * 0.4})`;
      ctx.lineWidth = 0.5 + r() * 1.2;
      ctx.beginPath();
      const x0 = r() * w;
      ctx.moveTo(x0 - w, y);
      ctx.lineTo(x0 + w * (0.3 + r()), y);
      ctx.stroke();
    }
    const t = canvasTexture(c, { srgb: false, repeat: true });
    return t;
  });
}

/** Galvanized / zinc-coated sheet steel "spangle" pattern (color + roughness). */
export function galvanized() {
  return memo('galv', () => {
    const w = 1024, h = 1024;
    const col = makeCanvas(w, h);
    const ctx = col.getContext('2d');
    const r = rng(42);
    ctx.fillStyle = '#b8bcc0';
    ctx.fillRect(0, 0, w, h);
    // Voronoi-ish crystal patches
    for (let i = 0; i < 380; i++) {
      const x = r() * w, y = r() * h, s = 30 + r() * 90;
      const v = 168 + r() * 40;
      ctx.fillStyle = `rgba(${v},${v + 3},${v + 7},0.35)`;
      ctx.beginPath();
      const n = 5 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + r() * 0.5;
        const rr = s * (0.6 + r() * 0.5);
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    }
    const n = noiseCanvas(w, h, { base: 128, amp: 10, seed: 3 });
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.25;
    ctx.drawImage(n, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const map = canvasTexture(col, { repeat: true });
    const rough = makeCanvas(w, h);
    const rc = rough.getContext('2d');
    rc.drawImage(col, 0, 0);
    // Convert to roughness (G channel) ~0.35-0.55, metal (B) = 1
    const id = rc.getImageData(0, 0, w, h);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = id.data[i] / 255;
      id.data[i] = 0;
      id.data[i + 1] = (0.62 - (v - 0.65) * 0.9) * 255;
      id.data[i + 2] = 255;
    }
    rc.putImageData(id, 0, 0);
    const rm = canvasTexture(rough, { srgb: false, repeat: true });
    return { map, rm };
  });
}

/** Perforated sheet: alpha (holes) + normal for hole rims. Tileable. */
export function perforation(holesPerTile = 12, holeFrac = 0.62) {
  return memo(`perf-${holesPerTile}-${holeFrac}`, () => {
    const s = 512;
    const a = makeCanvas(s, s);
    const ctx = a.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, s, s);
    const pitch = s / holesPerTile;
    const rad = (pitch * holeFrac) / 2;
    const ht = makeCanvas(s, s);
    const hx = ht.getContext('2d');
    hx.fillStyle = '#fff';
    hx.fillRect(0, 0, s, s);
    for (let j = 0; j <= holesPerTile * 2; j++) {
      for (let i = -1; i <= holesPerTile; i++) {
        const x = (i + (j % 2 ? 0.5 : 0)) * pitch + pitch / 2;
        const y = (j * pitch * 0.866) % (s + pitch);
        if (y > s + rad) continue;
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
        const g = hx.createRadialGradient(x, y, rad * 0.9, x, y, rad * 1.35);
        g.addColorStop(0, '#000'); g.addColorStop(1, '#fff');
        hx.fillStyle = g;
        hx.beginPath(); hx.arc(x, y, rad * 1.35, 0, Math.PI * 2); hx.fill();
      }
    }
    return {
      alpha: canvasTexture(a, { srgb: false, repeat: true }),
      normal: canvasTexture(heightToNormal(ht, 3), { srgb: false, repeat: true }),
    };
  });
}

/** FR-4 board edge: laminated layers. */
export function pcbEdge() {
  return memo('pcbedge', () => {
    const w = 64, h = 64;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      const copper = y % 4 === 0;
      ctx.fillStyle = copper ? '#6b5136' : y % 2 ? '#3d3a2c' : '#4a4535';
      ctx.fillRect(0, y, w, 1);
    }
    ctx.fillStyle = '#1e1c1a';
    ctx.fillRect(0, 0, w, 3);
    ctx.fillRect(0, h - 3, w, 3);
    const t = canvasTexture(c, { repeat: true });
    t.magFilter = THREE.NearestFilter;
    return t;
  });
}

/** MLCC capacitor texture: metallic end terminations, ceramic body in the middle. */
export function mlccTexture(body = '#8d7a5e') {
  return memo(`mlcc-${body}`, () => {
    const w = 64, h = 16;
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.fillStyle = body;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c9c9c4';
    ctx.fillRect(0, 0, 13, h);
    ctx.fillRect(w - 13, 0, 13, h);
    const t = canvasTexture(c);
    const m = makeCanvas(w, h);
    const mx = m.getContext('2d');
    mx.fillStyle = 'rgb(0,175,0)';
    mx.fillRect(0, 0, w, h);
    mx.fillStyle = 'rgb(0,90,255)';
    mx.fillRect(0, 0, 13, h);
    mx.fillRect(w - 13, 0, 13, h);
    return { map: t, rm: canvasTexture(m, { srgb: false }) };
  });
}

/** Generic laser-marked chip top (dark mold compound, faint engraved text). */
export function markedTop({ w = 256, h = 256, bg = '#141414', ink = 'rgba(190,190,190,0.55)', lines = [], dot = true, font = 'Helvetica, Arial, sans-serif', size = 22, rotate = 0, logo = false, seed = 1 } = {}) {
  const key = JSON.stringify(arguments[0] || {});
  return memo(`mark-${key}`, () => {
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const n = noiseCanvas(w, h, { base: 128, amp: 18, seed });
    ctx.globalAlpha = 0.08;
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(n, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(rotate);
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const total = lines.length * size * 1.25;
    lines.forEach((ln, i) => {
      ctx.font = `${i === 0 && logo ? '700 ' : ''}${size}px ${font}`;
      ctx.fillText(ln, 0, -total / 2 + size * 0.62 + i * size * 1.25);
    });
    ctx.restore();
    if (dot) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath(); ctx.arc(w * 0.12, h * 0.12, Math.min(w, h) * 0.04, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.stroke();
    }
    return canvasTexture(c);
  });
}

/** Studio backdrop gradient used as scene.background. */
export function backdropTexture() {
  const w = 1024, h = 1024;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.5, w * 0.75);
  g.addColorStop(0, '#141618');
  g.addColorStop(0.5, '#08090a');
  g.addColorStop(1, '#020202');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // dither to avoid banding
  const n = noiseCanvas(w, h, { base: 128, amp: 6, seed: 5 });
  ctx.globalAlpha = 0.05;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(n, 0, 0);
  return canvasTexture(c);
}
