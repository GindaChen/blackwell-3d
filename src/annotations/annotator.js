// Hover / pin annotations: highlights a component, resolves what it connects to (see
// connections.js), draws animated 3D pathways to those parts, brackets them on screen, and shows
// a callout card off to the side with a leader line back to the component.
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { BUSES, lookup } from './connections.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const _box = new THREE.Box3();
const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();

// ---------------------------------------------------------------------------------------------
// scene-graph helpers
// ---------------------------------------------------------------------------------------------
export function partOf(o) {
  while (o) {
    if (o.userData.part) return o;
    o = o.parent;
  }
  return null;
}
export function isShown(o) {
  while (o) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return true;
}
function superchipOf(o) {
  while (o) {
    if (o.name === 'superchip') return o;
    o = o.parent;
  }
  return null;
}
function ancestorWithId(o, id) {
  o = o.parent;
  while (o) {
    if (o.userData.part?.id === id) return o;
    o = o.parent;
  }
  return null;
}
function isDescendant(o, root) {
  while (o) {
    if (o === root) return true;
    o = o.parent;
  }
  return false;
}

/** A target is a tagged object, or one instance of a tagged InstancedMesh. */
function targetBox(t, out = new THREE.Box3()) {
  if (t.instanceId != null) {
    const mesh = t.obj;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    mesh.getMatrixAt(t.instanceId, _m);
    out.copy(mesh.geometry.boundingBox).applyMatrix4(_m).applyMatrix4(mesh.matrixWorld);
    return out;
  }
  return out.setFromObject(t.obj);
}
function anchorOf(box, out = new THREE.Vector3()) {
  return out.set((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
}
const sameTarget = (a, b) => a && b && a.obj === b.obj && (a.instanceId ?? -1) === (b.instanceId ?? -1);

// ---------------------------------------------------------------------------------------------
export function createAnnotator({ renderer, camera }) {
  const overlay = new THREE.Scene();
  const pathGroup = new THREE.Group();
  overlay.add(pathGroup);

  // HUD layers
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.classList.add('hud-svg');
  document.body.appendChild(svg);
  const card = document.createElement('div');
  card.className = 'callout';
  card.hidden = true;
  document.body.appendChild(card);

  let index = null; // { byId: Map<id, Target[]> }
  let indexedRoot = null;
  let current = null; // { source: Target, entry, links: [{link, targets:[Target], paths:[Line2...]}] }
  let pinned = false;
  let cardSide = null;

  function buildIndex(root) {
    const byId = new Map();
    root.traverse((o) => {
      const p = o.userData.part;
      if (!p) return;
      if (!byId.has(p.id)) byId.set(p.id, []);
      if (o.isInstancedMesh) {
        for (let i = 0; i < o.count; i++) byId.get(p.id).push({ obj: o, instanceId: i });
      } else byId.get(p.id).push({ obj: o });
    });
    index = { byId };
    indexedRoot = root;
  }

  function candidates(id, scope, source, root) {
    const list = index.byId.get(id) || [];
    let within = null;
    if (scope === 'superchip') within = superchipOf(source.obj) || root;
    else if (scope === 'self') within = source.obj;
    else if (scope && scope.ancestor) within = ancestorWithId(source.obj, scope.ancestor);
    else within = root;
    if (!within) return [];
    return list.filter((t) => !sameTarget(t, source) && isDescendant(t.obj, within) && isShown(t.obj));
  }

  function nearest(list, from, n) {
    const scored = list.map((t) => ({ t, d: anchorOf(targetBox(t, _box), _v).distanceToSquared(from) }));
    scored.sort((a, b) => a.d - b.d);
    return scored.slice(0, n).map((s) => s.t);
  }

  function resolve(source, root) {
    const entry = lookup(source.obj.userData.part.id);
    const srcBox = targetBox(source);
    const srcAnchor = anchorOf(srcBox);
    const links = [];
    if (entry) {
      for (const link of entry.links) {
        const ids = Array.isArray(link.to) ? link.to : [link.to];
        let targets = [];
        let usedId = null;
        for (const id of ids) {
          targets = candidates(id, link.scope, source, root);
          if (targets.length) { usedId = id; break; }
        }
        if (!targets.length) continue;
        const pick = link.pick ?? 'all';
        if (pick === 'nearest') targets = nearest(targets, srcAnchor, 1);
        else if (typeof pick === 'number') targets = nearest(targets, srcAnchor, pick);
        // via chain (only for hops that exist in this view and aren't the target itself)
        const via = [];
        let from = srcAnchor.clone();
        for (const vid of link.via || []) {
          if (vid === usedId) continue;
          const vc = candidates(vid, 'any', source, root);
          if (!vc.length) continue;
          const v = nearest(vc, from, 1)[0];
          via.push(v);
          from = anchorOf(targetBox(v, _box), new THREE.Vector3());
        }
        const alt = link.alt?.[usedId];
        links.push({ link: alt ? { ...link, ...alt } : link, targets, via });
      }
    }
    return { source, entry, links };
  }

  // ---------------------------------------------------------------------------------------------
  // 3D pathways
  // ---------------------------------------------------------------------------------------------
  function clearPaths() {
    for (const c of [...pathGroup.children]) {
      pathGroup.remove(c);
      c.geometry.dispose();
      c.material.dispose();
    }
  }

  function arcPoints(a, b, out) {
    const d = a.distanceTo(b);
    const h = THREE.MathUtils.clamp(d * 0.16, 0.2, 6); // low, gentle arc
    const p1 = a.clone().add(new THREE.Vector3(0, h, 0));
    const p2 = b.clone().add(new THREE.Vector3(0, h, 0));
    const curve = new THREE.CubicBezierCurve3(a, p1, p2, b);
    const n = Math.max(16, Math.round(d * 4));
    const pts = curve.getPoints(n);
    if (out.length) pts.shift();
    out.push(...pts);
    return out;
  }

  function makeLine(points, color) {
    const geo = new LineGeometry();
    geo.setPositions(points.flatMap((p) => [p.x, p.y, p.z]));
    const mat = new LineMaterial({
      color, linewidth: 1.5, transparent: true, opacity: 0.9,
      depthTest: false, depthWrite: false, toneMapped: false, worldUnits: false,
    });
    mat.resolution.set(innerWidth, innerHeight);
    const line = new Line2(geo, mat);
    line.frustumCulled = false;
    line.renderOrder = 10;
    return line;
  }

  function buildPaths() {
    clearPaths();
    if (!current) return;
    const srcAnchor = anchorOf(targetBox(current.source));
    for (const L of current.links) {
      const color = new THREE.Color(BUSES[L.link.bus]?.color || '#ffffff');
      const viaAnchors = L.via.map((v) => anchorOf(targetBox(v, _box), new THREE.Vector3()));
      for (const t of L.targets) {
        const end = anchorOf(targetBox(t, _box), new THREE.Vector3());
        const chain = [srcAnchor.clone(), ...viaAnchors.map((v) => v.clone()), end];
        const pts = [];
        for (let i = 0; i < chain.length - 1; i++) arcPoints(chain[i], chain[i + 1], pts);
        pathGroup.add(makeLine(pts, color));
      }
    }
  }

  // ---------------------------------------------------------------------------------------------
  // HUD: brackets, labels, callout card with leader line
  // ---------------------------------------------------------------------------------------------
  function screenRect(box) {
    const pts = [
      [box.min.x, box.min.y, box.min.z], [box.max.x, box.min.y, box.min.z], [box.min.x, box.max.y, box.min.z], [box.max.x, box.max.y, box.min.z],
      [box.min.x, box.min.y, box.max.z], [box.max.x, box.min.y, box.max.z], [box.min.x, box.max.y, box.max.z], [box.max.x, box.max.y, box.max.z],
    ];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, behind = false;
    for (const p of pts) {
      _v.set(...p).project(camera);
      if (_v.z > 1) behind = true;
      const sx = (_v.x * 0.5 + 0.5) * innerWidth, sy = (-_v.y * 0.5 + 0.5) * innerHeight;
      x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
    }
    return { x0, y0, x1, y1, behind };
  }
  function project(p) {
    _v.copy(p).project(camera);
    return [(_v.x * 0.5 + 0.5) * innerWidth, (-_v.y * 0.5 + 0.5) * innerHeight];
  }
  function bracket(r, color, k = 10, w = 1.6, pad = 4) {
    const x0 = r.x0 - pad, y0 = r.y0 - pad, x1 = r.x1 + pad, y1 = r.y1 + pad;
    const kx = Math.min(k, (x1 - x0) / 2.5), ky = Math.min(k, (y1 - y0) / 2.5);
    const d = `M${x0},${y0 + ky}V${y0}H${x0 + kx} M${x1 - kx},${y0}H${x1}V${y0 + ky} M${x1},${y1 - ky}V${y1}H${x1 - kx} M${x0 + kx},${y1}H${x0}V${y1 - ky}`;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
  }
  /** Greedily merge screen rects closer than `gap` px so adjacent targets share one bracket. */
  function clusterRects(rects, gap) {
    const out = rects.map((r) => ({ ...r }));
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i < out.length && !merged; i++)
        for (let j = i + 1; j < out.length; j++) {
          const a = out[i], b = out[j];
          if (a.x0 - gap <= b.x1 && b.x0 - gap <= a.x1 && a.y0 - gap <= b.y1 && b.y0 - gap <= a.y1) {
            out[i] = { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
            out.splice(j, 1);
            merged = true;
            break;
          }
        }
    }
    return out.sort((a, b) => (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0));
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function fillCard() {
    const p = current.source.obj.userData.part;
    const role = current.entry?.role || p.info || '';
    const rows = current.links.map((L) => {
      const bus = BUSES[L.link.bus] || { name: '', color: '#fff' };
      return `<li><span class="sw" style="background:${bus.color};box-shadow:0 0 8px ${bus.color}"></span><span class="lk">${esc(L.link.label)}</span><span class="bus">${esc(bus.name)}</span></li>`;
    }).join('');
    card.innerHTML = `
      <div class="c-title">${esc(p.label)}</div>
      <div class="c-role">${esc(role)}</div>
      ${rows ? `<div class="c-sub">Connects to</div><ul class="c-links">${rows}</ul>` : ''}
      <div class="c-hint">${pinned ? 'Pinned · click empty space or Esc to release' : 'Click to pin'}</div>`;
  }

  function obstacles() {
    return [...document.querySelectorAll('.hud-controls, .hud-views, .hud-title')].map((el) => {
      const r = el.getBoundingClientRect();
      return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom };
    });
  }
  const overlapArea = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

  function placeCard(R, anchor, soft = []) {
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const W = innerWidth, H = innerHeight, m = 14, gap = 64;
    const clampY = (y) => Math.min(Math.max(y, m), H - ch - m);
    const clampX = (x) => Math.min(Math.max(x, m), W - cw - m);
    const opts = {
      right: { x: R.x1 + gap, y: clampY(anchor[1] - ch / 2) },
      left: { x: R.x0 - gap - cw, y: clampY(anchor[1] - ch / 2) },
      below: { x: clampX(anchor[0] - cw / 2), y: R.y1 + gap },
      above: { x: clampX(anchor[0] - cw / 2), y: R.y0 - gap - ch },
      rightTop: { x: R.x1 + gap, y: m + 90 },
      rightBottom: { x: R.x1 + gap, y: H - ch - m },
      leftTop: { x: R.x0 - gap - cw, y: m + 110 },
      leftBottom: { x: R.x0 - gap - cw, y: H - ch - m },
    };
    const obs = obstacles();
    const Rp = { x0: R.x0 - 10, y0: R.y0 - 10, x1: R.x1 + 10, y1: R.y1 + 10 };
    const score = (o) => {
      const r = { x0: o.x, y0: o.y, x1: o.x + cw, y1: o.y + ch };
      const off = Math.max(0, m - r.x0) + Math.max(0, r.x1 - (W - m)) + Math.max(0, m - r.y0) + Math.max(0, r.y1 - (H - m));
      return overlapArea(r, Rp) * 3 + obs.reduce((s, b) => s + overlapArea(r, b), 0) + soft.reduce((s, b) => s + overlapArea(r, b) * 0.6, 0) + off * ch * 4;
    };
    const order = anchor[0] < W / 2
      ? ['right', 'left', 'below', 'above', 'rightTop', 'rightBottom', 'leftTop', 'leftBottom']
      : ['left', 'right', 'below', 'above', 'leftTop', 'leftBottom', 'rightTop', 'rightBottom'];
    if (cardSide) order.unshift(cardSide);
    let best = null;
    for (const k of order) {
      const s = score(opts[k]);
      if (!best || s < best.s - 1) best = { k, s };
      if (s === 0) break;
    }
    // part covers most of the screen: fall back to a free corner
    const corners0 = { tl: 1, tr: 1, bl: 1, br: 1 };
    if (best.s > 0) {
      const corners = {
        tl: { x: m, y: 120 }, tr: { x: W - cw - m, y: 70 }, bl: { x: m, y: H - ch - 40 }, br: { x: W - cw - m, y: H - ch - 260 },
      };
      for (const [k, o] of Object.entries(corners)) {
        const s = score(o) - Math.hypot(o.x + cw / 2 - anchor[0], o.y + ch / 2 - anchor[1]) * 0.01;
        if (s < best.s) { best = { k, s }; opts[k] = o; }
      }
    }
    cardSide = best.k in corners0 ? null : best.k;
    const o = opts[best.k];
    const x = clampX(o.x), y = Math.min(Math.max(o.y, m), H - ch - m);
    card.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    return { x0: x, y0: y, x1: x + cw, y1: y + ch };
  }

  function updateHud() {
    if (!current) { svg.innerHTML = ''; card.hidden = true; return; }
    const srcBox = targetBox(current.source);
    const R = screenRect(srcBox);
    const anchor = project(anchorOf(srcBox));
    let out = '';
    const soft = [];
    // targets
    for (const L of current.links) {
      const color = BUSES[L.link.bus]?.color || '#fff';
      // targets get no frame, just one tag per link placed on its largest cluster
      const rects = [];
      for (const t of L.targets) {
        const r = screenRect(targetBox(t, _box));
        if (!r.behind) rects.push(r);
      }
      const clusters = clusterRects(rects, 26);
      if (!clusters.length) continue;
      clusters.forEach((u, i) => {
        soft.push({ x0: u.x0 - 8, y0: u.y0 - 24, x1: u.x1 + 8, y1: u.y1 + 8 });
        if (i || !L.link.group) return;
        const label = L.targets.length > 1 && !/×/.test(L.link.group) ? `${L.link.group} ×${L.targets.length}` : L.link.group;
        const tw = label.length * 6.4 + 14;
        const tx = Math.min(Math.max(u.x0 - 4, 6), innerWidth - tw - 6);
        const ty = Math.min(Math.max(u.y0 - 22, 6), innerHeight - 22);
        out += `<g class="tag"><rect x="${tx}" y="${ty}" rx="4" width="${tw}" height="16" fill="rgba(8,10,10,0.82)" stroke="${color}" stroke-opacity="0.45"/><text x="${tx + 7}" y="${ty + 11.5}" fill="${color}">${esc(label)}</text></g>`;
      });
    }
    // source bracket
    out += bracket(R, '#ffffff', 14, 2, 6);
    // callout + leader
    card.hidden = false;
    const C = placeCard(R, anchor, soft);
    const cx = Math.min(Math.max(anchor[0], C.x0), C.x1), cy = Math.min(Math.max(anchor[1], C.y0), C.y1);
    // attach to the nearest card edge midpoint-ish, with an elbow
    let ex, ey;
    if (C.x0 >= anchor[0]) { ex = C.x0; ey = Math.min(Math.max(anchor[1], C.y0 + 18), C.y1 - 18); }
    else if (C.x1 <= anchor[0]) { ex = C.x1; ey = Math.min(Math.max(anchor[1], C.y0 + 18), C.y1 - 18); }
    else if (C.y0 >= anchor[1]) { ex = cx; ey = C.y0; }
    else { ex = cx; ey = C.y1; }
    const horizontal = ex === C.x0 || ex === C.x1;
    const elbow = horizontal ? [ex + (ex === C.x0 ? -22 : 22), ey] : [ex, ey + (ey === C.y0 ? -22 : 22)];
    out += `<polyline points="${anchor[0]},${anchor[1]} ${elbow[0]},${elbow[1]} ${ex},${ey}" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="1.3"/>`;
    out += `<circle cx="${anchor[0]}" cy="${anchor[1]}" r="4.5" fill="#76b900" stroke="#fff" stroke-width="1.5"/>`;
    out += `<circle cx="${ex}" cy="${ey}" r="2.5" fill="#fff"/>`;
    svg.innerHTML = out;
  }

  // ---------------------------------------------------------------------------------------------
  // public API
  // ---------------------------------------------------------------------------------------------
  function show(source, root) {
    if (current && sameTarget(current.source, source)) return false;
    if (indexedRoot !== root) buildIndex(root);
    current = resolve(source, root);
    cardSide = null;
    fillCard();
    buildPaths();
    return true;
  }
  function clear() {
    if (!current) return false;
    current = null;
    pinned = false;
    clearPaths();
    updateHud();
    return true;
  }

  return {
    overlay,
    get active() { return !!current; },
    get pinned() { return pinned; },
    /** Hover from a raycast hit (or null). Ignored while pinned. Returns true if the view changed. */
    hover(hit, root) {
      if (pinned) return false;
      if (!hit) return clear();
      return show(hit, root);
    },
    pin(hit, root) {
      if (!hit) { pinned = false; return clear(); }
      pinned = false;
      show(hit, root);
      pinned = true;
      fillCard();
      return true;
    },
    unpin() { pinned = false; return clear(); },
    /** Rebuild geometry (after explode/toggles/view changes move things). */
    refresh() { if (current) { if (!isShown(current.source.obj)) return clear(); const s = current.source; const root = indexedRoot; current = null; show(s, root); if (pinned) fillCard(); } },
    reindex() { indexedRoot = null; },
    /** Per displayed frame: reposition the HUD to follow the camera. */
    frame() {
      if (!current) return;
      updateHud();
    },
    resize() { for (const c of pathGroup.children) if (c.material?.isLineMaterial) c.material.resolution.set(innerWidth, innerHeight); },
  };
}
