import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createStudio } from './scene/studio.js';
import { buildSuperchip, setLids } from './assemblies/superchip.js';
import { buildComputeTray, setCooling, setColdPlateLift } from './assemblies/tray.js';
import { veraDieMaterials } from './parts/chips.js';
import { easeInOut } from './lib/util.js';

const container = document.getElementById('viewport');
const studio = createStudio(container);
const { renderer, scene, camera, composer } = studio;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 4;
controls.maxDistance = 400;

// mm -> scene units (cm)
const MM = 0.1;

const views = {
  superchip: {
    title: 'Vera Rubin Superchip',
    sub: '1 Vera CPU · 2 Rubin GPUs · 16 HBM4 stacks · 8 SOCAMM LPDDR5X modules',
    cams: {
      hero: { pos: [27, 33, 40], target: [0, 0, 1.5] },
      top: { pos: [0, 62, 0.01], target: [0, 0, 0] },
      front: { pos: [0, 14, 52], target: [0, 0, 2] },
      close: { pos: [9, 9, -2], target: [3, 0, -9] },
    },
    lift: 0,
  },
  tray: {
    title: 'Vera Rubin NVL72 Compute Tray',
    sub: '2 Superchips · 4 Rubin GPUs · 8 ConnectX-9 SuperNICs · BlueField-4 DPU · cable-free, fanless',
    cams: {
      hero: { pos: [62, 58, 88], target: [0, 0, 4] },
      top: { pos: [0, 125, 0.01], target: [0, 0, 0] },
      front: { pos: [-12, 16, 92], target: [0, 2, 20] },
      close: { pos: [18, 20, -12], target: [10, 2, -26] },
    },
    lift: 0,
  },
};

const roots = {};
let current = null;
let explodeT = 0;
const explodables = new Map(); // object -> {base: Vector3, off: Vector3}

function registerExplodables(root) {
  root.traverse((o) => {
    const e = o.userData.explode;
    if (e && !explodables.has(o)) explodables.set(o, { base: o.position.clone(), off: new THREE.Vector3(...e) });
  });
}

function applyExplode() {
  const t = easeInOut(explodeT);
  for (const [o, { base, off }] of explodables) o.position.copy(base).addScaledVector(off, t);
}

function build(name) {
  if (roots[name]) return roots[name];
  const g = new THREE.Group();
  g.scale.setScalar(MM);
  if (name === 'superchip') {
    const sc = buildSuperchip();
    sc.position.y = 4.0; // board underside rests on the plinth
    g.add(sc);
    // low display plinth
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(250, 3, 420),
      new THREE.MeshStandardMaterial({ color: '#0a0b0c', roughness: 0.4, metalness: 0.2, envMapIntensity: 0.5 }),
    );
    plinth.position.y = 0.5 - 1.5 + 0.5;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    g.add(plinth);
    window.__superchip = sc;
  } else {
    g.add(buildComputeTray(buildSuperchip));
  }
  registerExplodables(g);
  scene.add(g);
  roots[name] = g;
  return g;
}

// ---- camera tweening ----
let tween = null;
function flyTo(preset, dur = 1.2) {
  const from = { pos: camera.position.clone(), target: controls.target.clone() };
  const to = { pos: new THREE.Vector3(...preset.pos), target: new THREE.Vector3(...preset.target) };
  tween = { from, to, t0: performance.now(), dur: dur * 1000 };
}
function stepTween(now) {
  if (!tween) return;
  const k = Math.min(1, (now - tween.t0) / tween.dur);
  const e = easeInOut(k);
  camera.position.lerpVectors(tween.from.pos, tween.to.pos, e);
  controls.target.lerpVectors(tween.from.target, tween.to.target, e);
  if (k >= 1) tween = null;
}

function setView(name, { instant = false } = {}) {
  current = name;
  const v = views[name];
  for (const [k, r] of Object.entries(roots)) r.visible = k === name;
  build(name).visible = true;
  document.getElementById('view-title').textContent = v.title;
  document.getElementById('view-sub').textContent = v.sub;
  document.body.classList.toggle('view-tray', name === 'tray');
  document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  applyToggles();
  applyExplode();
  invalidate({ shadows: true });
  // keep the shadow frustum tight around the visible model for crisp shadows
  const s = name === 'tray' ? 60 : 30;
  const sc = studio.key.shadow.camera;
  sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s;
  sc.updateProjectionMatrix();
  if (instant) {
    camera.position.set(...v.cams.hero.pos);
    controls.target.set(...v.cams.hero.target);
  } else flyTo(v.cams.hero);
}

// ---- UI wiring ----
const $ = (id) => document.getElementById(id);
function applyToggles() {
  for (const r of Object.values(roots)) {
    setLids(r, $('lids').checked);
    setCooling(r, $('cooling').checked);
    setColdPlateLift(r, $('lids').checked);
  }
  const vm = veraDieMaterials();
  scene.traverse((o) => { if (o.name === 'vera-die') o.material = $('floorplan').checked ? vm.floorplan : vm.marked; });
  invalidate({ shadows: true });
}
['lids', 'cooling', 'floorplan'].forEach((id) => $(id).addEventListener('change', applyToggles));
$('explode').addEventListener('input', (e) => { explodeT = +e.target.value; applyExplode(); invalidate({ shadows: true }); });
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.view !== current) setView(b.dataset.view);
}));
document.querySelectorAll('[data-cam]').forEach((b) => b.addEventListener('click', () => flyTo(views[current].cams[b.dataset.cam])));

// ---- hover identification (foundation for the annotation layer) ----
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let mouseDirty = false, mouseClient = [0, 0];
renderer.domElement.addEventListener('pointermove', (e) => {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  mouseClient = [e.clientX, e.clientY];
  mouseDirty = true;
});
renderer.domElement.addEventListener('pointerleave', () => { $('tooltip').hidden = true; });
function findPart(o) {
  while (o) {
    if (o.userData.part) return o.userData.part;
    o = o.parent;
  }
  return null;
}
function updateHover() {
  if (!mouseDirty || !current) return;
  mouseDirty = false;
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObject(roots[current], true);
  const hit = hits.find((h) => h.object.visible && findPart(h.object));
  const tt = $('tooltip');
  if (!hit) { tt.hidden = true; return; }
  const p = findPart(hit.object);
  tt.querySelector('.tt-label').textContent = p.label;
  tt.querySelector('.tt-info').textContent = p.info || '';
  tt.style.left = mouseClient[0] + 'px';
  tt.style.top = mouseClient[1] + 'px';
  tt.hidden = false;
}

// ---- boot ----
setTimeout(() => {
  const params = new URLSearchParams(location.search);
  setView(params.get('view') === 'tray' ? 'tray' : 'superchip', { instant: true });
  if (params.get('explode')) { explodeT = +params.get('explode'); $('explode').value = explodeT; applyExplode(); }
  if (params.has('lids')) $('lids').checked = params.get('lids') !== '0';
  if (params.has('cooling')) $('cooling').checked = params.get('cooling') !== '0';
  applyToggles();
  if (params.get('cam')) { const c = views[current].cams[params.get('cam')]; camera.position.set(...c.pos); controls.target.set(...c.target); }
  invalidate({ shadows: true });
  $('loading').classList.add('done');
  setTimeout(() => $('loading').remove(), 800);
  renderer.setAnimationLoop(loop);
}, 0);

// ---- render on demand, with full-quality AO only once the view settles ----
let needsRender = true, lastMotion = 0, settledFrameDone = false;
function invalidate({ shadows = false } = {}) {
  needsRender = true;
  settledFrameDone = false;
  lastMotion = performance.now();
  if (shadows) renderer.shadowMap.needsUpdate = true;
}
controls.addEventListener('change', () => invalidate());
window.addEventListener('resize', () => invalidate());

function loop(now) {
  const moving = !!tween;
  stepTween(now);
  controls.update();
  updateHover();
  if (moving) invalidate();
  const settled = now - lastMotion > 180;
  if (needsRender || (settled && !settledFrameDone)) {
    studio.gtao.enabled = settled;
    composer.render();
    needsRender = false;
    if (settled) settledFrameDone = true;
  }
}

window.__app = { scene, camera, controls, renderer, setView, flyTo, invalidate };
