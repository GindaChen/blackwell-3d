// Build-time draw-call reduction.
//
// Every "boundary" object (anything tagged as a part, given an explode offset, or named for a
// runtime toggle) keeps its identity so hovering, exploding and toggles still work. Inside each
// boundary, plain single-material meshes are baked into one merged mesh per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PROTECTED_NAMES = new Set(['grace-die', 'gpu-lid', 'cooling', 'gpu-coldplate-lift', 'floor', 'drawer', 'shell']);

const isBoundary = (o) => !!(o.userData.part || o.userData.explode || PROTECTED_NAMES.has(o.name));

function normalizeGeometry(geo, matrix) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
  g.clearGroups();
  g.applyMatrix4(matrix);
  return g;
}

export function optimize(root) {
  root.updateMatrixWorld(true);
  const visit = (boundary) => {
    if (boundary.userData.optimized) return;
    const inv = new THREE.Matrix4().copy(boundary.matrixWorld).invert();
    const buckets = new Map(); // material -> [mesh]
    const nested = [];
    const walk = (o) => {
      for (const c of o.children) {
        if (c !== boundary && isBoundary(c)) { nested.push(c); continue; }
        if (c.isMesh && !c.isInstancedMesh && !Array.isArray(c.material) && c.visible) {
          if (!buckets.has(c.material)) buckets.set(c.material, []);
          buckets.get(c.material).push(c);
        }
        walk(c);
      }
    };
    walk(boundary);
    for (const [mat, meshes] of buckets) {
      if (meshes.length < 2) continue;
      const geos = meshes.map((m) => normalizeGeometry(m.geometry, new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)));
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mm = new THREE.Mesh(merged, mat);
      mm.castShadow = meshes.some((m) => m.castShadow);
      mm.receiveShadow = true;
      mm.name = 'merged';
      for (const m of meshes) m.parent.remove(m);
      boundary.add(mm);
    }
    // drop now-empty plain groups
    const prune = (o) => {
      for (const c of [...o.children]) {
        if (isBoundary(c)) continue;
        prune(c);
        if (!c.isMesh && c.children.length === 0 && c.type === 'Group') o.remove(c);
      }
    };
    prune(boundary);
    boundary.userData.optimized = true;
    nested.forEach(visit);
  };
  visit(root);
  return root;
}
