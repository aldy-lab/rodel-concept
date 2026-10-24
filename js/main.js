// ─────────────────────────────────────────────────────────────────────────
// GO-LIVE CONFIG — fill in to switch a link on; leave "" and the element is
// removed from the page (and its empty container with it).
const CONFIG = {
  shopUrl: 'https://www.rodel.fr/eshop', // B2B store
  email: 'info@rodel.fr',                // live site shows george@ but links to info@ — confirm
  instagram: '',
};
// ─────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createFishGeometry, createFishMaterial } from './fish.js';
import { createTin } from './tin.js';
import { PRODUCTS, drawLabel } from './label.js';

applyConfig();

function applyConfig() {
  document.querySelectorAll('[data-config]').forEach((el) => {
    const key = el.dataset.config;
    const val = CONFIG[key];
    if (!val) { el.remove(); return; }
    if (key === 'email') { el.href = `mailto:${val}`; if (el.dataset.fill !== undefined) el.textContent = val; }
    else el.href = val;
  });
  document.querySelectorAll('[data-config-group]').forEach((g) => {
    if (!g.querySelector('a')) g.remove();
  });
}

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// phones and tablets: lighter shading, capped resolution, tighter scroll follow
const touch = matchMedia('(pointer: coarse)').matches;
const canvas = document.getElementById('scene');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  document.documentElement.classList.add('no-webgl');
}

const collection = initCollection();

if (renderer) start();

function start() {
  let dpr = Math.min(devicePixelRatio, touch ? 1.75 : 2);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#070d14', 9, 22);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 0.6, 10);

  const key = new THREE.DirectionalLight('#eaf2ff', 2.2);
  key.position.set(-4, 6, 6);
  const rim = new THREE.DirectionalLight('#7fa6c8', 2.5);
  rim.position.set(5, 2, -6);
  scene.add(key, rim, new THREE.AmbientLight('#2a3d52', 0.6));

  // ── label + tin ──
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 2048; labelCanvas.height = 1544;
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const tin = createTin(labelTex);
  scene.add(tin.group);
  const paintTarget = new THREE.Color();

  function setProduct(p) {
    drawLabel(labelCanvas, p);
    labelTex.needsUpdate = true;
    paintTarget.set(p.paint);
  }
  setProduct(PRODUCTS[0]);
  tin.paint.color.copy(paintTarget);
  document.fonts.ready.then(() => setProduct(collection.current()));
  collection.onChange = (p) => { setProduct(p); spinTarget += Math.PI * 2; };

  // ── shoal ──
  const uniforms = { uTime: { value: 0 } };
  const N = innerWidth < 700 ? 110 : 220;
  const fishGeo = createFishGeometry(touch);
  const wig = new THREE.InstancedBufferAttribute(new Float32Array(N).fill(1), 1);
  wig.setUsage(THREE.DynamicDrawUsage);
  fishGeo.setAttribute('aWig', wig);
  const shoal = new THREE.InstancedMesh(fishGeo, createFishMaterial(uniforms, touch), N);
  shoal.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  shoal.frustumCulled = false;
  scene.add(shoal);

  const fish = Array.from({ length: N }, (_, i) => ({
    r: 0.9 + Math.random() * 2.3,
    y: (Math.random() - 0.5) * 2.8,
    speed: 0.16 + Math.random() * 0.1,
    a0: Math.random() * Math.PI * 2,
    s: 0.55 + Math.random() * 0.4,
    bob: Math.random() * 6.28,
    out: Math.random() < 0.5 ? -1 : 1,
  }));
  // the five that end up in the tin swim at the front of the shoal
  for (let i = 0; i < 5; i++) Object.assign(fish[i], { r: 1.6 + i * 0.3, y: (i - 2) * 0.35, s: 0.85 });

  // dust in the water column
  const dustN = touch ? 220 : 500;
  const dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 22;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    dustPos[i * 3 + 2] = -8 + Math.random() * 14;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: '#9fb6c8', size: 0.028, transparent: true, opacity: 0.45, depthWrite: false,
  }));
  scene.add(dust);

  // ── scroll states, one per section. tx/ty are fractions of the visible half-width/height ──
  // z: extra zoom, so a phone can show an open tin (lid and all) smaller than a closed one
  const S = (tx, ty, tz, rx, ry, rz, lid, pack, cx, cy, z = 1) => ({ tx, ty, tz, rx, ry, rz, lid, pack, cx, cy, z });
  const STATES = {
    // ry ≈ π puts the hinge on the right, so an open lid swings away from the copy
    wide: [
      S(0.52, -3.6, 0, 0.9, 2.6, 0, 2.15, 0, 0.42, 0.04),
      S(0.27, -0.1, 0, 0.98, 2.75, -0.05, 2.15, 1, 0.42, 0.04),
      S(0.44, -0.02, 0, 0.72, 0.45, -0.08, 0, 1, 0.42, 0.04),
      S(0.44, -0.05, 0, 0.85, -0.15, 0, 0, 1, 0.42, 0.04),
      S(0.62, 0.08, -3.5, 1.1, 0.75, 0.2, 0.5, 1, 0.42, 0.04),
      S(0.3, -0.08, 0, 0.98, 2.7, -0.04, 2.15, 1, 0.42, 0.04),
    ],
    // phones: the scene is framed in a window above the copy, so everything is centred in it
    tall: [
      S(-0.16, -3.6, 0, 0.9, 2.6, 0, 2.15, 0, 0, -0.06, 0.56),
      S(-0.16, -0.14, 0, 0.98, 2.75, -0.05, 2.15, 1, 0, -0.06, 0.56),
      S(0, -0.1, 0, 0.72, 0.45, -0.08, 0, 1, 0, -0.06, 0.92),
      S(0, -0.12, 0, 0.85, -0.15, 0, 0, 1, 0, -0.06, 0.92),
      S(0.02, -0.16, -1, 1.1, 0.75, 0.2, 0.5, 1, 0, -0.06, 0.66),
      S(-0.16, -0.14, 0, 0.98, 2.7, -0.04, 2.15, 1, 0, -0.06, 0.56),
    ],
  };
  const KEYS = Object.keys(STATES.wide[0]);
  const cur = { ...STATES.wide[0] };

  const sections = [...document.querySelectorAll('[data-scene]')];
  let centers = [];
  let halfW = 5, halfH = 3, tall = false;

  // iOS changes innerHeight while the address bar collapses mid-scroll. Size the
  // canvas to the large viewport and ignore those steps, or every swipe
  // reallocates the drawing buffer dozens of times.
  const probe = Object.assign(document.createElement('div'), { ariaHidden: 'true' });
  probe.style.cssText = 'position:fixed;top:0;height:100vh;height:100lvh;width:0;visibility:hidden;pointer-events:none';
  document.body.append(probe);
  let lastW = 0, lastH = 0;
  const viewport = document.querySelector('.viewport');
  const mobileLayout = matchMedia('(max-width: 900px), (max-aspect-ratio: 9/10)');
  let stageTop = 0; // on phones the copy is read below the window, so progress is measured there

  function resize() {
    centers = sections.map((s) => s.offsetTop + s.offsetHeight / 2);
    tall = mobileLayout.matches;
    const w = innerWidth;
    // the phone window is sized in svh, so the address bar never resizes it
    const h = tall ? viewport.clientHeight : touch ? Math.max(innerHeight, probe.offsetHeight) : innerHeight;
    stageTop = tall ? h : 0;
    if (w === lastW && (h === lastH || (touch && !tall && Math.abs(h - lastH) < 160))) return;
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    halfW = halfH * camera.aspect;
  }
  resize();
  addEventListener('resize', resize);
  new ResizeObserver(resize).observe(document.body);

  function progress() {
    const y = scrollY + stageTop + (innerHeight - stageTop) / 2;
    if (y <= centers[0]) return 0;
    for (let i = 0; i < centers.length - 1; i++) {
      if (y < centers[i + 1]) return i + (y - centers[i]) / (centers[i + 1] - centers[i]);
    }
    return centers.length - 1;
  }

  // ── pointer: parallax everywhere, drag-to-turn on the collection stage ──
  const mouse = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return; // a finger scrolling must not swing the camera
    mouse.x = e.clientX / innerWidth - 0.5;
    mouse.y = e.clientY / innerHeight - 0.5;
  });
  let drag = 0, dragV = 0, spin = 0, spinTarget = 0;
  // desktop: the collection's stage; phones: the whole framed window
  for (const el of [document.querySelector('.stage'), viewport]) {
    if (!el) continue;
    let lastX = null;
    el.addEventListener('pointerdown', (e) => { lastX = e.clientX; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => {
      if (lastX === null) return;
      dragV = (e.clientX - lastX) * 0.01;
      drag += dragV;
      lastX = e.clientX;
    });
    const end = () => { lastX = null; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  // easter egg: type 1824 and the shoal winds into a column for a few seconds
  let typed = '', vortexUntil = 0;
  addEventListener('keydown', (e) => {
    typed = (typed + e.key).slice(-4);
    if (typed === '1824') { vortexUntil = performance.now() + 7000; typed = ''; }
  });
  // no keyboard on a phone: three quick taps on the 1824 beside the wordmark
  const year = document.querySelector('.mark .mono');
  let taps = [];
  year?.addEventListener('click', (e) => {
    const now = performance.now();
    taps = [...taps.filter((t0) => now - t0 < 1200), now];
    if (taps.length >= 3) { e.preventDefault(); vortexUntil = now + 7000; taps = []; }
  });
  let vortex = 0;

  // ── frame ──
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qs = new THREE.Quaternion();
  const p = new THREE.Vector3(), ps = new THREE.Vector3(), sc = new THREE.Vector3(), ss = new THREE.Vector3();
  const tan = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0);
  const slotWorld = tin.slots.map(() => new THREE.Matrix4());
  const ease = (t) => t * t * (3 - 2 * t);
  const clock = new THREE.Clock();
  let t = 0;
  const motion = reduced ? 0.25 : 1;
  const followRate = touch ? 9 : 5;
  // caption under the phone window: figure number, what is shown, and a progress rule
  const figEl = document.querySelector('[data-fig]');
  const countEl = document.querySelector('[data-count]');
  const barEl = document.querySelector('.fig .bar');
  const FIGS = ['The shoal', 'Hand-packed', 'Millésime', null, 'Since 1824', 'The open tin'];
  let figKey = '', barLast = -1;
  function caption(f, n) {
    const i = Math.round(f);
    const name = FIGS[i] ?? collection.current().name;
    const key = i + name;
    if (key !== figKey) {
      figKey = key;
      figEl.textContent = `Fig. 0${i} — ${name}`;
      countEl.textContent = `0${i} / 0${n - 1}`;
    }
    const pr = f / (n - 1);
    if (Math.abs(pr - barLast) > 0.002) { barLast = pr; barEl.style.transform = `scaleX(${pr.toFixed(4)})`; }
  } // a slow follow under a finger reads as lag
  let odd = false;
  // quality governor (touch only): if the device can't hold ~40 fps, step the
  // resolution down, then drop the dust. Never steps back up, so it can't oscillate.
  const gov = { start: performance.now() + 2500, sum: 0, n: 0 };
  function govern(dtMs) {
    if (!touch || performance.now() < gov.start) return;
    gov.sum += dtMs; gov.n++;
    if (gov.n < 90) return;
    const avg = gov.sum / gov.n;
    gov.sum = 0; gov.n = 0;
    if (avg < 25) return;
    if (dpr > 1) {
      dpr = Math.max(1, dpr - 0.25);
      renderer.setPixelRatio(dpr);
      renderer.setSize(lastW, lastH, false);
    } else dust.visible = false;
    gov.start = performance.now() + 1500;
  }

  function frame() {
    const raw = clock.getDelta();
    govern(raw * 1000);
    const dt = Math.min(raw, 0.05);
    t += dt * motion;
    uniforms.uTime.value = t;

    // target state from scroll
    const f = progress();
    const list = tall ? STATES.tall : STATES.wide;
    if (tall) caption(f, list.length);
    const i0 = Math.min(Math.floor(f), list.length - 1), i1 = Math.min(i0 + 1, list.length - 1);
    const k = ease(THREE.MathUtils.smoothstep(f - i0, 0.12, 0.88));
    const damp = 1 - Math.exp(-dt * followRate);
    let moving = 0;
    for (const key of KEYS) {
      const d = list[i0][key] + (list[i1][key] - list[i0][key]) * k - cur[key];
      cur[key] += d * damp;
      moving += Math.abs(d);
    }

    // tin
    const fit = tall ? (halfW * 1.3) / 4.4 : Math.min(0.88, (halfW * 0.8) / 4.4);
    const inCollection = Math.max(0, 1 - Math.abs(f - 3));
    dragV *= 0.92;
    drag *= 1 - dt * 0.6 * (1 - inCollection);
    spin += (spinTarget - spin) * (1 - Math.exp(-dt * 3.5));
    tin.group.position.set(cur.tx * halfW + mouse.x * 0.25, cur.ty * halfH - mouse.y * 0.15, cur.tz);
    tin.group.rotation.set(
      cur.rx + mouse.y * 0.08,
      cur.ry + drag + spin + (reduced ? 0 : Math.sin(t * 0.4) * 0.12 * inCollection),
      cur.rz,
    );
    tin.group.scale.setScalar(fit * cur.z);
    tin.lid.rotation.z = cur.lid;
    tin.paint.color.lerp(paintTarget, damp);
    tin.group.updateMatrixWorld(true);
    tin.slots.forEach((s, i) => slotWorld[i].multiplyMatrices(tin.group.matrixWorld, s));

    // shoal
    const vt = performance.now() < vortexUntil ? 1 : 0;
    vortex += (vt - vortex) * (1 - Math.exp(-dt * 1.5));
    const cx = cur.cx * halfW, cy = cur.cy * halfH;
    const shoalScale = tall ? 1.05 : 1;
    for (let i = 0; i < N; i++) {
      const d = fish[i];
      const tinFish = i < 5;
      const away = tinFish ? 0 : cur.pack;
      const r = THREE.MathUtils.lerp(d.r, 0.5 + (i % 30) * 0.04, vortex) * shoalScale + away * 12;
      const spd = d.speed * (1 + vortex * 1.6);
      const a = d.a0 + t * spd;
      const y = THREE.MathUtils.lerp(d.y, (i / N - 0.5) * 5, vortex) * shoalScale
        + Math.sin(t * 0.7 + d.bob) * 0.22 + away * d.out * 4;
      ps.set(cx + r * Math.cos(a), cy + y, -1 + r * Math.sin(a));
      tan.set(-Math.sin(a), Math.cos(t * 0.7 + d.bob) * 0.08, Math.cos(a)).normalize();
      qs.setFromUnitVectors(X, tan);
      ss.setScalar(d.s * shoalScale * (cur.pack > 0.985 && !tinFish ? 0 : 1));

      let w = 1;
      if (tinFish) {
        const pk = ease(THREE.MathUtils.clamp(cur.pack * 1.35 - i * 0.07, 0, 1));
        slotWorld[i].decompose(p, q, sc);
        ps.lerp(p, pk);
        // arc over the rim instead of passing through the wall
        ps.y += Math.sin(pk * Math.PI) * 1.2;
        qs.slerp(q, pk);
        ss.lerp(sc, pk);
        w = 1 - pk;
      }
      m4.compose(ps, qs, ss);
      shoal.setMatrixAt(i, m4);
      wig.array[i] = w;
    }
    shoal.instanceMatrix.needsUpdate = true;
    wig.needsUpdate = true;

    // dust drifts upward and wraps
    const dp = dustGeo.attributes.position;
    for (let i = 0; i < dustN; i++) {
      let y = dp.getY(i) + dt * 0.08;
      if (y > 7) y = -7;
      dp.setY(i, y);
    }
    dp.needsUpdate = true;

    // Once everything has settled and the shoal is packed away, a phone only
    // needs the slow drift and wobble: draw every other frame and save the GPU.
    moving += Math.abs(spinTarget - spin) + Math.abs(dragV) + vortex + (1 - cur.pack);
    odd = !odd;
    if (touch && moving < 0.002 && odd) { requestAnimationFrame(frame); return; }

    camera.position.x += (mouse.x * 0.4 - camera.position.x) * damp;
    camera.position.y += (0.6 - mouse.y * 0.25 - camera.position.y) * damp;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  document.fonts.ready.finally(() => {
    resize();
    document.documentElement.classList.add('scene-ready');
    requestAnimationFrame(frame);
  });
}

// ── collection tabs (works without WebGL too) ──
function initCollection() {
  const api = { onChange: null, current: () => PRODUCTS[idx] };
  let idx = 0;
  const tabs = document.querySelector('.tabs');
  const name = document.querySelector('[data-p="name"]');
  const sub = document.querySelector('[data-p="sub"]');
  const desc = document.querySelector('[data-p="desc"]');
  const specs = document.querySelector('[data-p="specs"]');
  if (!tabs) return api;

  PRODUCTS.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<span class="mono">${p.no}</span>${p.name}`;
    b.setAttribute('aria-pressed', i === 0);
    b.addEventListener('click', () => select(i));
    tabs.append(b);
  });

  function select(i) {
    if (i === idx) return;
    idx = i;
    const p = PRODUCTS[i];
    tabs.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', j === i));
    const panel = name.closest('.product');
    panel.classList.remove('swap');
    void panel.offsetWidth;
    panel.classList.add('swap');
    render(p);
    api.onChange?.(p);
  }

  function render(p) {
    name.textContent = p.name;
    sub.textContent = p.sub;
    desc.textContent = p.desc;
    specs.innerHTML = p.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }
  render(PRODUCTS[0]);
  return api;
}

// ── section index on the right edge ──
const index = document.querySelectorAll('.index a');
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    index.forEach((a) => a.classList.toggle('on', a.hash === `#${e.target.id}`));
  });
}, { rootMargin: '-45% 0px -45% 0px' });
document.querySelectorAll('[data-scene]').forEach((s) => io.observe(s));
