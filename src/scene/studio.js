// Product-photography studio: dark backdrop, softbox-style environment reflections,
// a key light with soft shadows, ground-contact AO, filmic tone mapping.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { backdropTexture } from '../textures/surfaces.js';

/** Build an environment scene of emissive softboxes and prefilter it with PMREM. */
function studioEnvironment(renderer) {
  const env = new THREE.Scene();
  // Room shell: vertical gradient so metals always have something to reflect
  // (bright ceiling -> mid-grey walls -> dark floor), like a cyclorama photo studio.
  const roomGeo = new THREE.SphereGeometry(50, 48, 24);
  const cols = [];
  const pos = roomGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 50; // -1..1
    const v = y > 0 ? 0.045 + Math.pow(y, 3) * 0.3 : 0.03 + (y + 1) * 0.02;
    cols.push(v, v * 1.01, v * 1.03);
  }
  roomGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  env.add(new THREE.Mesh(roomGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const panel = (w, h, intensity, pos, look, color = 0xffffff) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(...look);
    env.add(m);
  };
  // big overhead softbox
  panel(40, 26, 3.0, [0, 34, 0], [0, 0, 0]);
  // narrow angled strip boxes: give flat metal and glass crisp highlight bands
  panel(40, 5, 5.0, [0, 22, -26], [0, 0, 0], 0xf4f6ff);
  panel(40, 4, 3.5, [0, 20, 27], [0, 0, 0], 0xfff6ea);
  panel(5, 40, 4.5, [-26, 22, 0], [0, 0, 0], 0xf2f5ff);
  panel(5, 40, 3.5, [26, 20, 0], [0, 0, 0], 0xfff4e6);
  panel(14, 14, 2.5, [-18, 24, 18], [0, 0, 0], 0xffffff);
  panel(14, 14, 2.0, [18, 24, -18], [0, 0, 0], 0xffffff);
  // low front/back scrims so vertical metal faces (front bezel, walls) catch light
  panel(60, 10, 1.6, [0, 4, 34], [0, 8, 0], 0xfff3e2);
  panel(60, 10, 1.0, [0, 4, -34], [0, 8, 0], 0xeef3ff);
  // thin hot strips for crisp specular edges
  panel(2.0, 34, 9.0, [-30, 10, 8], [0, 0, 0], 0xffffff);
  panel(2.0, 34, 7.0, [30, 9, -8], [0, 0, 0], 0xffffff);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.03);
  pmrem.dispose();
  return rt.texture;
}

export function createStudio(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  // Phones/tablets: cap resolution and shadow size to keep frame times and memory reasonable.
  const touch = matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, touch ? 1.5 : 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Geometry only moves on explicit user actions, so shadows are re-rendered on demand.
  renderer.shadowMap.autoUpdate = false;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = backdropTexture();
  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = 1.0;

  // Scene units: 1 unit = 1 cm. Models are authored in mm and scaled by 0.1.
  // The container can be 0x0 at load (background tab, collapsed iframe); never let that produce a
  // NaN aspect ratio, which would poison every camera computation downstream.
  const aspectOf = () => {
    const w = container.clientWidth, h = container.clientHeight;
    return w > 0 && h > 0 ? w / h : 4 / 3;
  };
  const camera = new THREE.PerspectiveCamera(32, aspectOf(), 0.5, 2000);
  camera.position.set(32, 40, 52);

  // Key light (soft shadows) + cool rim
  const key = new THREE.DirectionalLight(0xfff6ea, 2.2);
  key.position.set(-30, 70, 35);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(touch ? 2048 : 4096);
  const sc = key.shadow.camera;
  sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 10; sc.far = 220;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 3;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xcfe0ff, 0.9);
  rim.position.set(40, 25, -60);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(250, 64),
    // Invisible "void" floor: renders only a faint soft shadow so the hardware appears to hover.
    new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.55 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -12; // 12 cm below the model
  floor.receiveShadow = true;
  floor.name = 'floor';
  scene.add(floor);

  // ---- post processing ----
  const size = new THREE.Vector2(container.clientWidth, container.clientHeight);
  const rt = new THREE.WebGLRenderTarget(size.x * renderer.getPixelRatio(), size.y * renderer.getPixelRatio(), {
    type: THREE.HalfFloatType,
    samples: 4,
  });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, size.x, size.y);
  gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.6, thickness: 1.0, scale: 1.0, samples: 16 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
  gtao.blendIntensity = 0.85;
  composer.addPass(gtao);
  composer.addPass(new OutputPass());
  const smaa = new SMAAPass();
  composer.addPass(smaa);

  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!(w > 0 && h > 0)) return; // hidden / zero-size: keep the last valid projection
    camera.aspect = aspectOf();
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  };
  window.addEventListener('resize', resize);

  return { renderer, scene, camera, composer, key, floor, gtao, resize };
}
