// Procedural PCB top-layer texture set: solder mask, buried trace relief, vias, ENIG pads,
// silkscreen. Driven by the same placement data used to build the 3D components, so every
// capacitor sits on its own pads and every package has its own courtyard outline.
import { makeCanvas, canvasTexture, heightToNormal, rng } from '../lib/util.js';

/**
 * @param {object} o
 * @param {number} o.W board width (mm, along x)
 * @param {number} o.L board length (mm, along z)
 * @param {number} o.ppm pixels per mm
 * @param {Array} o.pads   {x,z,w,d,rot}  exposed ENIG copper
 * @param {Array} o.silk   {type:'rect'|'text'|'line'|'dot', ...}
 * @param {Array} o.holes  {x,z,r,ring}   plated mounting holes
 * @param {Array} o.bundles {pts:[[x,z]...], n, pitch, width} parallel trace bundles
 * @param {Array} o.pours  {x,z,w,d}      copper pours (lighter, raised)
 * @param {Array} o.viaKeepouts {x,z,w,d}
 */
export function buildPcbTextures(o) {
  const { W, L, ppm, seed = 1 } = o;
  const cw = Math.round(W * ppm), ch = Math.round(L * ppm);
  const X = (x) => (x + W / 2) * ppm;
  const Z = (z) => (z + L / 2) * ppm;
  const r = rng(seed);

  const col = makeCanvas(cw, ch); const c = col.getContext('2d');
  const hgt = makeCanvas(cw, ch); const h = hgt.getContext('2d');
  const rmC = makeCanvas(cw, ch); const m = rmC.getContext('2d');

  const MASK = '#2b2926';
  const MASK_COPPER = '#353129';
  const MASK_R = 0.5; // roughness of the solder mask (satin)

  c.fillStyle = MASK; c.fillRect(0, 0, cw, ch);
  h.fillStyle = 'rgb(90,90,90)'; h.fillRect(0, 0, cw, ch);
  m.fillStyle = `rgb(0,${MASK_R * 255},0)`; m.fillRect(0, 0, cw, ch);

  // subtle mottling in the mask
  for (let i = 0; i < 1400; i++) {
    const x = r() * cw, y = r() * ch, s = 20 + r() * 160;
    const g = c.createRadialGradient(x, y, 0, x, y, s);
    g.addColorStop(0, r() < 0.5 ? 'rgba(255,240,220,0.018)' : 'rgba(0,0,0,0.03)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(x - s, y - s, s * 2, s * 2);
  }

  const rect = (ctx, x, z, w, d, rot = 0) => {
    ctx.save();
    ctx.translate(X(x), Z(z));
    ctx.rotate(rot);
    ctx.fillRect((-w / 2) * ppm, (-d / 2) * ppm, w * ppm, d * ppm);
    ctx.restore();
  };

  // ---- copper pours (under mask: slightly lighter, slightly raised)
  for (const p of o.pours || []) {
    c.fillStyle = MASK_COPPER; rect(c, p.x, p.z, p.w, p.d);
    h.fillStyle = 'rgb(104,104,104)'; rect(h, p.x, p.z, p.w, p.d);
  }

  // ---- trace bundles under the mask
  const strokeBundle = (ctx, b, style, extraW = 0) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = (b.width + extraW) * ppm;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const n = b.n;
    for (let k = 0; k < n; k++) {
      const off = (k - (n - 1) / 2) * b.pitch;
      ctx.beginPath();
      b.pts.forEach(([x, z], i) => {
        // offset perpendicular to the dominant segment direction
        const [nx, nz] = i < b.pts.length - 1 ? b.pts[i + 1] : b.pts[i - 1];
        const dx = Math.abs(nx - x), dz = Math.abs(nz - z);
        const ox = dz >= dx ? off : 0, oz = dx > dz ? off : 0;
        const px = X(x + ox), py = Z(z + oz);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      });
      ctx.stroke();
    }
  };
  for (const b of o.bundles || []) {
    strokeBundle(c, b, 'rgba(70,62,48,0.55)');
    strokeBundle(h, b, 'rgb(112,112,112)');
  }

  // ---- vias: dense fields of tiny tented vias
  const keep = o.viaKeepouts || [];
  const inKeep = (x, z) => keep.some((k) => Math.abs(x - k.x) < k.w / 2 && Math.abs(z - k.z) < k.d / 2);
  const viaR = 0.22 * ppm;
  for (let i = 0; i < (o.viaCount ?? 9000); i++) {
    const x = (r() - 0.5) * W * 0.98, z = (r() - 0.5) * L * 0.98;
    if (inKeep(x, z)) continue;
    // cluster vias in short rows (stitching) for realism
    const row = r() < 0.35 ? 1 + Math.floor(r() * 6) : 1;
    const horiz = r() < 0.5;
    for (let k = 0; k < row; k++) {
      const vx = X(x + (horiz ? k * 0.8 : 0)), vz = Z(z + (horiz ? 0 : k * 0.8));
      c.fillStyle = 'rgba(60,55,48,0.9)';
      c.beginPath(); c.arc(vx, vz, viaR * 1.6, 0, 7); c.fill();
      c.fillStyle = 'rgba(18,17,16,0.95)';
      c.beginPath(); c.arc(vx, vz, viaR * 0.7, 0, 7); c.fill();
      h.fillStyle = 'rgb(118,118,118)';
      h.beginPath(); h.arc(vx, vz, viaR * 1.6, 0, 7); h.fill();
      h.fillStyle = 'rgb(70,70,70)';
      h.beginPath(); h.arc(vx, vz, viaR * 0.7, 0, 7); h.fill();
    }
  }

  // ---- exposed pads (ENIG gold, metallic, smooth)
  for (const p of o.pads || []) {
    const color = p.color || '#c9a465';
    c.fillStyle = color; rect(c, p.x, p.z, p.w, p.d, p.rot || 0);
    h.fillStyle = 'rgb(84,84,84)'; rect(h, p.x, p.z, p.w, p.d, p.rot || 0);
    m.fillStyle = `rgb(0,${0.28 * 255},255)`; rect(m, p.x, p.z, p.w, p.d, p.rot || 0);
  }

  // ---- plated mounting holes
  for (const ho of o.holes || []) {
    const cx = X(ho.x), cz = Z(ho.z);
    const ring = (ho.ring ?? ho.r * 1.8) * ppm;
    c.fillStyle = '#c59e5c'; c.beginPath(); c.arc(cx, cz, ring, 0, 7); c.fill();
    m.fillStyle = `rgb(0,${0.3 * 255},255)`; m.beginPath(); m.arc(cx, cz, ring, 0, 7); m.fill();
    c.fillStyle = '#0a0a0a'; c.beginPath(); c.arc(cx, cz, ho.r * ppm, 0, 7); c.fill();
    m.fillStyle = 'rgb(0,230,0)'; m.beginPath(); m.arc(cx, cz, ho.r * ppm, 0, 7); m.fill();
    h.fillStyle = 'rgb(20,20,20)'; h.beginPath(); h.arc(cx, cz, ho.r * ppm, 0, 7); h.fill();
    // ring of small stitching vias
    for (let a = 0; a < 8; a++) {
      const vx = cx + Math.cos((a / 8) * Math.PI * 2) * ring * 1.35;
      const vz = cz + Math.sin((a / 8) * Math.PI * 2) * ring * 1.35;
      c.fillStyle = '#b39060'; c.beginPath(); c.arc(vx, vz, viaR * 1.2, 0, 7); c.fill();
    }
  }

  // ---- silkscreen (white epoxy ink, slightly raised, matte)
  const SILK = 'rgba(222,220,210,0.92)';
  const silkStroke = (ctx, s, style, lw) => {
    ctx.save();
    ctx.translate(X(s.x), Z(s.z));
    ctx.rotate(s.rot || 0);
    ctx.strokeStyle = style; ctx.fillStyle = style;
    ctx.lineWidth = lw;
    if (s.type === 'rect') {
      ctx.strokeRect((-s.w / 2) * ppm, (-s.d / 2) * ppm, s.w * ppm, s.d * ppm);
      if (s.pin1) { ctx.beginPath(); ctx.arc((-s.w / 2 - 0.8) * ppm, (-s.d / 2 - 0.8) * ppm, 0.35 * ppm, 0, 7); ctx.fill(); }
    } else if (s.type === 'corners') {
      const w = s.w * ppm / 2, d = s.d * ppm / 2, k = (s.k || 3) * ppm;
      ctx.beginPath();
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        ctx.moveTo(sx * w, sz * d - sz * k * -1 * -1 + 0); // start on edge
        ctx.moveTo(sx * w, sz * (d - k)); ctx.lineTo(sx * w, sz * d); ctx.lineTo(sx * (w - k), sz * d);
      }
      ctx.stroke();
    } else if (s.type === 'text') {
      ctx.font = `${s.weight || 600} ${s.size * ppm}px ${s.font || 'Helvetica, Arial, sans-serif'}`;
      ctx.textAlign = s.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.text, 0, 0);
    } else if (s.type === 'line') {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s.dx * ppm, s.dz * ppm); ctx.stroke();
    } else if (s.type === 'dot') {
      ctx.beginPath(); ctx.arc(0, 0, s.r * ppm, 0, 7); ctx.fill();
    } else if (s.type === 'tri') {
      ctx.beginPath(); ctx.moveTo(0, -s.s * ppm); ctx.lineTo(s.s * ppm * 0.8, s.s * ppm * 0.6); ctx.lineTo(-s.s * ppm * 0.8, s.s * ppm * 0.6); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };
  for (const s of o.silk || []) {
    const lw = (s.lw || 0.15) * ppm;
    silkStroke(c, s, SILK, lw);
    silkStroke(h, s, 'rgb(104,104,104)', lw);
    silkStroke(m, s, `rgb(0,${0.75 * 255},0)`, lw);
  }

  const map = canvasTexture(col, { flipY: false, aniso: 16 });
  const rm = canvasTexture(rmC, { srgb: false, flipY: false, aniso: 16 });
  // blur the height a touch so relief reads as soft bumps under the mask
  const hb = makeCanvas(cw, ch);
  const hbx = hb.getContext('2d');
  hbx.filter = 'blur(0.8px)';
  hbx.drawImage(hgt, 0, 0);
  const normal = canvasTexture(heightToNormal(hb, 2.2, { flipY: false }), { srgb: false, flipY: false, aniso: 16 });
  return { map, rm, normal };
}
