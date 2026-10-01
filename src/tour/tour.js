// Guided tour controller: steps through STEPS, switching views/toggles, framing the camera on the
// parts involved, and drawing simple directional flow lines with labels.
import * as THREE from 'three';
import { BUSES } from '../annotations/connections.js';
import { targetBox, anchorOf, arcPoints, makeLine, isShown, isDescendant, labelWidth } from '../annotations/annotator.js';
import { STEPS } from './steps.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const _v = new THREE.Vector3();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createTour({ camera, overlay, getRoot, setView, getDisplay, setDisplay, flyTo, invalidate, onModeChange = () => {} }) {
  const group = new THREE.Group();
  overlay.add(group);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('hud-svg', 'tour-svg');
  document.body.appendChild(svg);

  const panel = document.createElement('section');
  panel.className = 'tour-panel';
  panel.hidden = true;
  panel.setAttribute('aria-live', 'polite');
  panel.innerHTML = `
    <div class="tp-head"><span class="tp-step"></span></div>
    <h2 class="tp-title"></h2>
    <p class="tp-text"></p>
    <div class="tp-legend"></div>
    <div class="tp-nav">
      <button class="tp-prev" type="button" aria-label="Previous step">← Back</button>
      <div class="tp-dots"></div>
      <button class="tp-next" type="button" aria-label="Next step">Next →</button>
    </div>`;
  document.body.appendChild(panel);
  const $ = (c) => panel.querySelector(c);
  const dots = $('.tp-dots');
  STEPS.forEach((_, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'tp-dot';
    d.setAttribute('aria-label', `Go to step ${i + 1}`);
    d.addEventListener('click', () => go(i));
    dots.appendChild(d);
  });

  let active = false;
  let index = 0;
  let saved = null;
  let flows = [];   // [{ pts: Vector3[], color, label?, end: Vector3 }]
  let labels = [];  // [{ points: Vector3[], text, color, virtual }]

  // ------------------------------------------------------------------------------------------
  // selection
  // ------------------------------------------------------------------------------------------
  function allParts(root, id) {
    const out = [];
    root.traverse((o) => {
      if (o.userData.part?.id === id && !o.isInstancedMesh && isShown(o)) out.push({ obj: o });
    });
    return out;
  }
  function anchor(t) {
    return t.pos ? t.pos.clone() : anchorOf(targetBox(t), new THREE.Vector3());
  }
  function select(root, sel) {
    if (sel.virtual) {
      const pos = new THREE.Vector3(...sel.virtual);
      root.localToWorld(pos);
      return [{ pos, label: sel.label, virtual: true }];
    }
    let list = allParts(root, sel.id);
    if (sel.within) {
      const w = select(root, sel.within)[0];
      list = w ? list.filter((t) => isDescendant(t.obj, w.obj) && t.obj !== w.obj) : [];
    }
    const withA = list.map((t) => ({ t, a: anchor(t) }));
    if (sel.side) {
      const cx = new THREE.Vector3();
      root.getWorldPosition(cx);
      for (let i = withA.length - 1; i >= 0; i--) if (Math.sign(withA[i].a.x - cx.x) !== sel.side) withA.splice(i, 1);
    }
    withA.sort((p, q) => (Math.abs(p.a.z - q.a.z) > 0.5 ? p.a.z - q.a.z : p.a.x - q.a.x));
    const res = withA.map((p) => p.t);
    return sel.nth != null ? res.slice(sel.nth, sel.nth + 1) : res;
  }
  function nearestOf(list, from, n) {
    return list
      .map((t) => ({ t, d: anchor(t).distanceToSquared(from) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, n)
      .map((x) => x.t);
  }

  // ------------------------------------------------------------------------------------------
  // building a step
  // ------------------------------------------------------------------------------------------
  function clear() {
    for (const c of [...group.children]) {
      group.remove(c);
      c.geometry.dispose();
      c.material.dispose();
    }
    flows = [];
    labels = [];
    svg.innerHTML = '';
  }

  function build(step, { reframe = true } = {}) {
    clear();
    const root = getRoot();
    root.updateMatrixWorld(true);
    const framePts = [];
    const byLabel = new Map();
    const addLabel = (text, p, color, virtual = false) => {
      const key = text + color;
      if (!byLabel.has(key)) byLabel.set(key, { text, color, virtual, points: [] });
      byLabel.get(key).points.push(p);
    };

    for (const f of step.flows || []) {
      const color = BUSES[f.bus]?.color || '#ffffff';
      const froms = select(root, f.from);
      const tosAll = select(root, f.to);
      if (!froms.length || !tosAll.length) continue;
      for (const s of froms) {
        const a = anchor(s);
        let tos = tosAll.filter((t) => t.obj ? t.obj !== s.obj : true);
        const pair = f.pair ?? 'all';
        if (pair === 'nearest') tos = nearestOf(tos, a, 1);
        else if (typeof pair === 'number') tos = nearestOf(tos, a, pair);
        // via hops: nearest of each hop from the previous point
        const chain0 = [a];
        let cur = a;
        for (const vsel of f.via || []) {
          const vc = select(root, vsel);
          if (!vc.length) continue;
          cur = anchor(nearestOf(vc, cur, 1)[0]);
          chain0.push(cur);
        }
        for (const t of tos) {
          const end = anchor(t);
          const chain = [...chain0, end];
          const pts = [];
          for (let i = 0; i < chain.length - 1; i++) arcPoints(chain[i], chain[i + 1], pts);
          const line = makeLine(pts, new THREE.Color(color));
          line.material.linewidth = 1.8;
          group.add(line);
          flows.push({ pts, color });
          framePts.push(...chain);
          if (f.label) addLabel(f.label, end, color);
          if (t.virtual) addLabel(t.label, end, '#ffffff', true);
        }
        if (s.virtual) addLabel(s.label, a, '#ffffff', true);
      }
    }
    for (const tg of step.tags || []) {
      const ts = select(root, tg.sel);
      for (const t of ts) {
        const p = anchor(t);
        framePts.push(p);
        addLabel(tg.label, p, '#e9ebe6');
      }
    }
    labels = [...byLabel.values()];
    // frame the camera on everything involved (or the whole model for overview steps)
    if (!framePts.length || step.frame === 'all') {
      framePts.length = 0;
      const b = new THREE.Box3().setFromObject(root);
      framePts.push(b.min, b.max);
    }
    if (reframe) frameCamera(framePts, step);
  }

  /**
   * Screen strips (px) covered by UI: the step panel (bottom, or right side on short landscape
   * screens) and the title header (top).
   */
  function reserves() {
    const none = { top: 0, bottom: 0, right: 0 };
    if (panel.hidden) return none;
    const pr = panel.getBoundingClientRect();
    if (pr.height > innerHeight * 0.6 && pr.width < innerWidth * 0.6) return { ...none, right: innerWidth - pr.left + 12 };
    const header = document.querySelector('.hud-title');
    return { top: header ? header.getBoundingClientRect().bottom + 8 : 0, bottom: innerHeight - pr.top + 12, right: 0 };
  }
  /** Shift the projection so the visual centre sits in the free area left by the UI. */
  function applyViewOffset() {
    const r = active ? reserves() : { top: 0, bottom: 0, right: 0 };
    if (r.top || r.bottom || r.right) camera.setViewOffset(innerWidth, innerHeight, r.right / 2, (r.bottom - r.top) / 2, innerWidth, innerHeight);
    else camera.clearViewOffset();
  }

  function frameCamera(points, step) {
    const box = new THREE.Box3().setFromPoints(points);
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 2.5);
    const r = reserves();
    const usableH = Math.max(0.3, (innerHeight - r.top - r.bottom) / innerHeight); // fractions left for the model
    const usableW = Math.max(0.3, (innerWidth - r.right) / innerWidth);
    const vfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * usableH);
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect * usableW);
    const fov = Math.min(vfov, hfov);
    const dist = (radius / Math.sin(fov / 2)) * (step.zoom ?? 1) * 0.92;
    const dir = new THREE.Vector3(...(step.dir || [0.5, 0.8, 0.8])).normalize();
    flyTo({ pos: center.clone().addScaledVector(dir, dist).toArray(), target: center.toArray() }, 1.3);
  }

  // ------------------------------------------------------------------------------------------
  // HUD: arrowheads + labels, re-projected every displayed frame
  // ------------------------------------------------------------------------------------------
  function project(p) {
    _v.copy(p).project(camera);
    return [(_v.x * 0.5 + 0.5) * innerWidth, (-_v.y * 0.5 + 0.5) * innerHeight, _v.z];
  }
  function frame() {
    if (!active) return;
    let out = '';
    for (const f of flows) {
      const n = f.pts.length;
      const i = Math.min(n - 2, Math.floor(n * 0.55));
      const [x0, y0] = project(f.pts[i]);
      const [x1, y1] = project(f.pts[i + 1]);
      const ang = Math.atan2(y1 - y0, x1 - x0);
      const s = 6;
      const p1 = [x1 + Math.cos(ang) * s, y1 + Math.sin(ang) * s];
      const p2 = [x1 + Math.cos(ang + 2.5) * s, y1 + Math.sin(ang + 2.5) * s];
      const p3 = [x1 + Math.cos(ang - 2.5) * s, y1 + Math.sin(ang - 2.5) * s];
      out += `<polygon points="${p1} ${p2} ${p3}" fill="${f.color}"/>`;
    }
    const placed = [];
    const hits = (r) => placed.some((q) => r.x0 < q.x1 + 4 && q.x0 < r.x1 + 4 && r.y0 < q.y1 + 3 && q.y0 < r.y1 + 3);
    for (const L of labels) {
      let sx = 0, sy = 0, k = 0, minY = Infinity;
      for (const p of L.points) {
        const [x, y, z] = project(p);
        if (z > 1) continue;
        sx += x; sy += y; k++;
        minY = Math.min(minY, y);
      }
      if (!k) continue;
      const cx = sx / k;
      const y = (L.points.length > 1 ? minY : sy / k) - 16;
      const tw = labelWidth(L.text, 'hud-svg tour-svg') + 18;
      const tx = Math.min(Math.max(cx - tw / 2, 8), innerWidth - tw - 8);
      let ty = Math.min(Math.max(y - 10, 8), innerHeight - 24);
      // nudge labels apart so they never stack on top of each other
      for (let tries = 0; tries < 8 && hits({ x0: tx, y0: ty, x1: tx + tw, y1: ty + 18 }); tries++) ty -= 22;
      placed.push({ x0: tx, y0: ty, x1: tx + tw, y1: ty + 18 });
      out += `<g class="tag"><rect x="${tx}" y="${ty}" rx="5" width="${tw}" height="19" fill="rgba(14,16,16,0.9)"/><text x="${tx + 9}" y="${ty + 13.5}" fill="${L.color}">${esc(L.text)}</text></g>`;
      if (L.virtual) {
        const [vx, vy] = project(L.points[0]);
        out += `<circle cx="${vx}" cy="${vy}" r="3.5" fill="#fff"/>`;
      }
    }
    svg.innerHTML = out;
  }

  // ------------------------------------------------------------------------------------------
  // panel + navigation
  // ------------------------------------------------------------------------------------------
  function fillPanel(step) {
    $('.tp-step').textContent = `Step ${index + 1} of ${STEPS.length}`;
    $('.tp-title').textContent = step.title;
    $('.tp-text').textContent = step.text;
    const buses = [...new Set((step.flows || []).map((f) => f.bus))];
    $('.tp-legend').innerHTML = buses
      .map((b) => `<span><i style="background:${BUSES[b]?.color}"></i>${esc(BUSES[b]?.name || b)}</span>`)
      .join('');
    $('.tp-prev').disabled = index === 0;
    $('.tp-next').textContent = index === STEPS.length - 1 ? 'Finish' : 'Next →';
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === index));
  }

  function go(i) {
    if (!active) return;
    index = Math.max(0, Math.min(STEPS.length - 1, i));
    const step = STEPS[index];
    setView(step.view || 'tray');
    setDisplay({ ...saved, ...(step.display || {}) });
    fillPanel(step);
    applyViewOffset();
    build(step);
    invalidate();
  }

  function start(at = 0) {
    if (active) return go(at);
    active = true;
    saved = { ...getDisplay() };
    document.body.classList.add('touring');
    panel.hidden = false;
    go(at);
    onModeChange(true);
  }
  function stop() {
    if (!active) return;
    active = false;
    clear();
    panel.hidden = true;
    applyViewOffset();
    document.body.classList.remove('touring');
    if (saved) setDisplay(saved);
    invalidate();
    onModeChange(false);
  }

  $('.tp-prev').addEventListener('click', () => go(index - 1));
  $('.tp-next').addEventListener('click', () => (index === STEPS.length - 1 ? stop() : go(index + 1)));
  window.addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.key === 'ArrowRight') go(index + 1);
    else if (e.key === 'ArrowLeft') go(index - 1);
    else if (e.key === 'Escape') stop();
  });

  return {
    start, stop, frame,
    get active() { return active; },
    /** Re-resolve flows (e.g. after a resize or an explode/toggle change). */
    refresh() { if (active) build(STEPS[index], { reframe: false }); },
    resize() {
      applyViewOffset();
      for (const c of group.children) c.material.resolution?.set(innerWidth, innerHeight);
    },
  };
}
