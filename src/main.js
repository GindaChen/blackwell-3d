import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createStudio } from './scene/studio.js';
import { buildSuperchip, setLids } from './assemblies/superchip.js';
import { buildComputeTray, setCooling, setColdPlateLift } from './assemblies/tray.js';
import { buildNVL8Tray } from './assemblies/nvl8.js';
import { veraDieMaterials } from './parts/chips.js';
import { easeInOut } from './lib/util.js';
import { createAnnotator, partOf, isShown } from './annotations/annotator.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { createTour } from './tour/tour.js';

const container = document.getElementById('viewport');
const studio = createStudio(container);
const { renderer, scene, camera, composer } = studio;
const annotator = createAnnotator({ renderer, camera });

// The post-processed frame is kept in a render target so the animated connection overlay can be
// redrawn every frame without re-rendering the (expensive) scene.
composer.renderToScreen = false;
const blit = new FullScreenQuad(new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null }, dim: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float dim; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); gl_FragColor = vec4(c.rgb * (1.0 - dim), 1.0); }`,
  depthTest: false, depthWrite: false,
}));
let dim = 0;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI; // free orbit: the hardware floats, so viewing from below is allowed
controls.minDistance = 4;
controls.maxDistance = 400;

// mm -> scene units (cm)
const MM = 0.1;

const views = {
  superchip: {
    title: 'Vera Rubin Superchip',
    cams: {
      hero: { pos: [27, 33, 40], target: [0, 0, 1.5] },
      top: { pos: [0, 62, 0.01], target: [0, 0, 0] },
      front: { pos: [0, 14, 52], target: [0, 0, 2] },
      close: { pos: [9, 9, -2], target: [3, 0, -9] },
    },
    lift: 0,
  },
  nvl8: {
    title: 'HGX Rubin NVL8 GPU Tray',
    cams: {
      hero: { pos: [-60, 60, 88], target: [0, 0, 2] },
      top: { pos: [0, 125, 0.01], target: [0, 0, 0] },
      front: { pos: [10, 16, 92], target: [0, 2, 20] },
      close: { pos: [-12, 22, 12], target: [-6, 2, 0] },
    },
    lift: 0,
  },
  tray: {
    title: 'Vera Rubin NVL72 Compute Tray',
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
    sc.position.y = 4.0;
    g.add(sc);
    window.__superchip = sc;
  } else if (name === 'nvl8') {
    g.add(buildNVL8Tray());
  } else {
    g.add(buildComputeTray(buildSuperchip));
  }
  registerExplodables(g);
  scene.add(g);
  roots[name] = g;
  return g;
}

// Presets are authored for a ~4:3 landscape screen. On narrower (portrait) screens, pull the camera
// back along the same direction so the model still fits horizontally.
function preset(p) {
  const k = Math.max(1, (1.33 / camera.aspect) * 0.8);
  const target = new THREE.Vector3(...p.target);
  const pos = new THREE.Vector3(...p.pos).sub(target).multiplyScalar(k).add(target);
  return { pos: pos.toArray(), target: p.target };
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
  annotator.unpin();
  annotator.reindex();
  current = name;
  const v = views[name];
  for (const [k, r] of Object.entries(roots)) r.visible = k === name;
  build(name).visible = true;
  document.getElementById('view-title').textContent = v.title;
  document.body.classList.toggle('view-tray', name !== 'superchip');
  document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  applyToggles();
  applyExplode();
  invalidate({ shadows: true });
  // keep the shadow frustum tight around the visible model for crisp shadows
  const s = name === 'superchip' ? 30 : 60;
  const sc = studio.key.shadow.camera;
  sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s;
  sc.updateProjectionMatrix();
  if (instant) {
    const h = preset(v.cams.hero);
    camera.position.set(...h.pos);
    controls.target.set(...h.target);
  } else flyTo(preset(v.cams.hero));
}

// ---- UI wiring ----
const $ = (id) => document.getElementById(id);
const smallScreen = matchMedia('(max-width: 720px), (max-height: 500px)');
$('controls').open = !smallScreen.matches;
// Display toggles (checkboxes in the controls panel; URL params like ?lids=1 can preset them).
const display = { lids: false, cooling: true, floorplan: false };
for (const k of Object.keys(display)) $(k).addEventListener('change', (e) => { display[k] = e.target.checked; applyToggles(); });
function applyToggles() {
  for (const r of Object.values(roots)) {
    setLids(r, display.lids);
    setCooling(r, display.cooling);
    setColdPlateLift(r, display.lids);
  }
  const vm = veraDieMaterials();
  scene.traverse((o) => { if (o.name === 'vera-die') o.material = display.floorplan ? vm.floorplan : vm.marked; });
  annotator.refresh();
  invalidate({ shadows: true });
}
$('explode').addEventListener('input', (e) => { explodeT = +e.target.value; applyExplode(); annotator.refresh(); tour.refresh(); invalidate({ shadows: true }); });
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.view !== current) setView(b.dataset.view);
}));
document.querySelectorAll('[data-cam]').forEach((b) => b.addEventListener('click', () => flyTo(preset(views[current].cams[b.dataset.cam]))));

// ---- guided tour (see src/tour) ----
const tour = createTour({
  camera,
  overlay: annotator.overlay,
  getRoot: () => roots[current],
  setView: (name) => { if (name !== current) setView(name, { instant: true }); },
  getDisplay: () => ({ ...display }),
  setDisplay: (d) => {
    Object.assign(display, d);
    for (const k of Object.keys(display)) $(k).checked = display[k];
    applyToggles();
  },
  flyTo,
  invalidate: () => { overlayDirty = true; invalidate({ shadows: true }); },
  onModeChange: (guided) => {
    document.querySelectorAll('[data-mode]').forEach((b) => {
      const on = (b.dataset.mode === 'guided') === guided;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  },
});
document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.mode === 'guided') { annotator.unpin(); tour.start(); }
  else tour.stop();
}));

// ---- hover / pin: connection pathways + callout (see src/annotations) ----
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let mouseDirty = false, buttons = 0, downAt = null;
let overlayDirty = false;
const el = renderer.domElement;
el.addEventListener('pointermove', (e) => {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  buttons = e.buttons;
  mouseDirty = true;
});
el.addEventListener('pointerleave', () => { if (annotator.hover(null)) overlayDirty = true; });
el.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
el.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  annotator.pin(pick(), roots[current]);
  overlayDirty = true;
});
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && annotator.unpin()) overlayDirty = true; });

function pick() {
  ray.setFromCamera(mouse, camera);
  for (const h of ray.intersectObject(roots[current], true)) {
    if (!isShown(h.object)) continue;
    const p = partOf(h.object);
    if (!p) continue;
    return p.isInstancedMesh && h.instanceId != null ? { obj: p, instanceId: h.instanceId } : { obj: p };
  }
  return null;
}
function updateHover() {
  annotator.enabled = !tour.active;
  if (!mouseDirty || !current || buttons) return;
  mouseDirty = false;
  if (annotator.hover(pick(), roots[current])) overlayDirty = true;
}

document.fonts?.ready.then(() => { overlayDirty = true; });

// ---- boot ----
setTimeout(() => {
  const params = new URLSearchParams(location.search);
  setView(views[params.get('view')] ? params.get('view') : 'superchip', { instant: true });
  if (params.get('explode')) { explodeT = +params.get('explode'); $('explode').value = explodeT; applyExplode(); }
  for (const k of Object.keys(display)) if (params.has(k)) display[k] = params.get(k) !== '0';
  for (const k of Object.keys(display)) $(k).checked = display[k];
  applyToggles();
  if (params.get('cam')) { const c = preset(views[current].cams[params.get('cam')]); camera.position.set(...c.pos); controls.target.set(...c.target); }
  if (params.has('tour')) tour.start(Math.max(0, (+params.get('tour') || 1) - 1));
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
window.addEventListener('resize', () => { annotator.resize(); tour.resize(); invalidate(); });

function loop(now) {
  const moving = !!tween;
  stepTween(now);
  controls.update();
  updateHover();
  if (moving) invalidate();
  const settled = now - lastMotion > 180;
  let composed = false;
  if (needsRender || (settled && !settledFrameDone)) {
    studio.gtao.enabled = settled;
    composer.render();
    needsRender = false;
    if (settled) settledFrameDone = true;
    composed = true;
  }
  // ease the background dim in/out while a component is highlighted
  const targetDim = annotator.active ? 0.38 : 0;
  const dimChanging = Math.abs(dim - targetDim) > 0.002;
  if (dimChanging) dim += (targetDim - dim) * 0.18;
  else dim = targetDim;
  if (composed || overlayDirty || dimChanging) {
    blit.material.uniforms.tDiffuse.value = composer.readBuffer.texture;
    blit.material.uniforms.dim.value = dim;
    renderer.setRenderTarget(null);
    blit.render(renderer);
    annotator.frame();
    tour.frame();
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(annotator.overlay, camera);
    renderer.autoClear = true;
    overlayDirty = false;
  }
}

window.__app = { scene, camera, controls, renderer, setView, flyTo, invalidate, annotator, roots: () => roots[current] };
