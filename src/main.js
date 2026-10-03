import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createStudio } from './scene/studio.js';
import { setLids } from './assemblies/superchip.js';
import { setCooling, setColdPlateLift } from './assemblies/tray.js';
import { setShell } from './assemblies/macStudio.js';
import { VIEW_DEFS, FAMILY_DEFS, LOOKS } from './registry.js';
import { setConnectionScope } from './annotations/connections.js';
import { easeInOut } from './lib/util.js';
import { createAnnotator, partOf, isShown, isDescendant } from './annotations/annotator.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { createTour } from './tour/tour.js';
import { createCheck } from './dev/check.js';
import { VIEWS, familyOf, viewsOf } from './catalog.js';

const container = document.getElementById('viewport');
const studio = createStudio(container);
const { renderer, scene, camera, composer } = studio;
const annotator = createAnnotator({ renderer, camera });

// The post-processed frame is kept in a render target so the animated connection overlay can be
// redrawn every frame without re-rendering the (expensive) scene.
composer.renderToScreen = false;
const blit = new FullScreenQuad(new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){ gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb, 1.0); }`,
  depthTest: false, depthWrite: false,
}));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI; // free orbit: the hardware floats, so viewing from below is allowed
controls.minDistance = 4;
controls.maxDistance = 800;

// mm -> scene units (cm)
const MM = 0.1;

// Every view comes from a family module (src/families/<id>/index.js, contract in src/families/README.md).
const views = VIEW_DEFS;
const STAGE_DEFAULT = { shadow: 60, far: 220, key: 1, floor: -12 };

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

// Raw models, cached per view: a view's model can be cloned into another view (ctx.model), e.g. the
// rack's open drawers are clones of the tray views.
const models = {};
const ctx = { model: (name) => pristineClone(model(name)) };
function model(name) {
  if (!models[name]) models[name] = views[name].build(ctx);
  return models[name];
}
/** Clone a model as it is with the explode slider at 0. */
function pristineClone(m) {
  const moved = [];
  for (const [o, { base }] of explodables) if (isDescendant(o, m)) { moved.push([o, o.position.clone()]); o.position.copy(base); }
  const c = m.clone(true);
  for (const [o, p] of moved) o.position.copy(p);
  return c;
}

function build(name) {
  if (roots[name]) return roots[name];
  const v = views[name];
  const g = new THREE.Group();
  g.scale.setScalar(v.scale ?? MM);
  // offset a wrapper, never the shared model (other views may clone it)
  const w = new THREE.Group();
  w.position.set(...(v.offset || [0, 0, 0]));
  w.add(model(name));
  g.add(w);
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
  document.getElementById('view-title').textContent = VIEWS[name].title;
  document.title = `${VIEWS[name].title} · Chips 3D`;
  buildNav(name);
  history.replaceState(null, '', `?view=${name}`);
  document.querySelectorAll('[data-toggle]').forEach((r) => { r.hidden = !(v.toggles || []).includes(r.dataset.toggle); });
  setConnectionScope(FAMILY_DEFS[v.family]);
  document.body.dataset.view = name;
  document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  applyToggles();
  applyExplode();
  invalidate({ shadows: true });
  // keep the shadow frustum tight around the visible model for crisp shadows; big models (racks)
  // push the key light, shadow camera and floor out
  const st = { ...STAGE_DEFAULT, ...v.stage };
  const sc = studio.key.shadow.camera;
  sc.left = -st.shadow; sc.right = st.shadow; sc.top = st.shadow; sc.bottom = -st.shadow;
  sc.far = st.far;
  sc.updateProjectionMatrix();
  studio.key.position.set(-30, 70, 35).multiplyScalar(st.key);
  studio.floor.position.y = st.floor;
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
const display = { lids: false, cooling: true, floorplan: false, shell: true };
for (const k of Object.keys(display)) $(k).addEventListener('change', (e) => { display[k] = e.target.checked; applyToggles(); });
function applyToggles() {
  for (const r of Object.values(roots)) {
    setLids(r, display.lids);
    setCooling(r, display.cooling);
    setColdPlateLift(r, display.lids);
    setShell(r, display.shell);
  }
  scene.traverse((o) => {
    const look = o.userData.looks && LOOKS[o.userData.looks];
    if (look) o.material = look()[display.floorplan ? 'floorplan' : 'marked'];
  });
  annotator.refresh();
  invalidate({ shadows: true });
}
$('explode').addEventListener('input', (e) => { explodeT = +e.target.value; applyExplode(); annotator.refresh(); tour.refresh(); invalidate({ shadows: true }); });
// The view switcher only lists the current family's models (the home page lists every family).
let navFamily = null;
function buildNav(name) {
  const fam = familyOf(name);
  document.documentElement.style.setProperty('--accent', fam.accent);
  if (navFamily === fam.id) return;
  navFamily = fam.id;
  const nav = document.querySelector('.hud-views');
  nav.replaceChildren(...viewsOf(fam.id).map((k) => {
    const b = document.createElement('button');
    b.dataset.view = k;
    b.innerHTML = `<span class="long">${VIEWS[k].long}</span><span class="short">${VIEWS[k].short}</span>`;
    b.addEventListener('click', () => { if (k !== current) setView(k); });
    return b;
  }));
  nav.hidden = nav.children.length < 2;
}

// ---- guided tour (see src/tour) ----
const tour = createTour({
  camera,
  overlay: annotator.overlay,
  getRoot: () => roots[current],
  getView: () => current,
  setView: (name) => { if (name !== current) setView(name, { instant: true }); },
  getDisplay: () => ({ ...display, explode: explodeT }),
  setDisplay: ({ explode: ex, ...d }) => {
    Object.assign(display, d);
    for (const k of Object.keys(display)) $(k).checked = display[k];
    if (ex != null) { explodeT = ex; $('explode').value = ex; applyExplode(); }
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
  if (!Number.isFinite(camera.position.x + camera.position.y + camera.position.z + controls.target.x + controls.target.y + controls.target.z)) {
    tween = null;
    const h = preset(views[current].cams.hero);
    camera.position.set(...h.pos);
    controls.target.set(...h.target);
    invalidate();
  }
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
  if (composed || overlayDirty) {
    blit.material.uniforms.tDiffuse.value = composer.readBuffer.texture;
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

/**
 * Render one full-quality frame (AO on, no UI overlay) at an exact size and return it as a canvas.
 * Used to produce share images, e.g. `__app.capture(1200, 630)` for the Open Graph card.
 */
function capture(width, height, supersample = 2) {
  controls.update(); // aim the camera even if no frame has run since the last setView (hidden tab)
  const prevSize = renderer.getSize(new THREE.Vector2());
  const prevPR = renderer.getPixelRatio();
  const prevAspect = camera.aspect;
  const prevView = camera.view ? { ...camera.view } : null;
  camera.clearViewOffset();
  renderer.setPixelRatio(supersample);
  renderer.setSize(width, height, false);
  composer.setPixelRatio(supersample);
  composer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.shadowMap.needsUpdate = true;
  studio.gtao.enabled = true;
  composer.render();
  blit.material.uniforms.tDiffuse.value = composer.readBuffer.texture;
  renderer.setRenderTarget(null);
  blit.render(renderer);
  // downsample the supersampled frame into the requested size
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(renderer.domElement, 0, 0, width, height);
  // restore the live view
  renderer.setPixelRatio(prevPR);
  composer.setPixelRatio(prevPR);
  renderer.setSize(prevSize.x, prevSize.y);
  composer.setSize(prevSize.x, prevSize.y);
  camera.aspect = prevAspect;
  if (prevView?.enabled) camera.setViewOffset(prevView.fullWidth, prevView.fullHeight, prevView.offsetX, prevView.offsetY, prevView.width, prevView.height);
  camera.updateProjectionMatrix();
  invalidate({ shadows: true });
  return out;
}

/** Dev only: render the current view as the home page card image (public/thumbs/<view>.jpg). */
async function saveThumb(name = current, w = 960, h = 600) {
  const blob = await new Promise((r) => capture(w, h).toBlob(r, 'image/jpeg', 0.86));
  return (await fetch(`/__thumb/${name}`, { method: 'POST', body: blob })).text();
}

window.__app = { scene, camera, controls, renderer, setView, flyTo, invalidate, annotator, tour, roots: () => roots[current], capture, saveThumb, views };
window.__app.check = createCheck(window.__app);
