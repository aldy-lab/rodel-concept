import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createFishGeometry, createFishMaterial } from './fish.js';
import { createTin } from './tin.js';
import { TINS, aspectOf } from './products.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// phones and tablets: lighter shading, capped resolution, tighter scroll follow
const touch = matchMedia('(pointer: coarse)').matches;

// Desktop only: phones get the still-image layout and never load this module.
export function startScene(collection) {
  const canvas = document.getElementById('scene');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    return;
  }

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
  // each lid is the real tin, photographed from above (tools/import_assets.py)
  const loader = new THREE.TextureLoader();
  const base = document.documentElement.dataset.base || ''; // /fr/ pages sit one folder down
  const lids = new Map();
  function lidTexture(p) {
    if (!lids.has(p.id)) {
      const tex = loader.load(`${base}img/lids/${p.id}.webp`);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      lids.set(p.id, tex);
    }
    return lids.get(p.id);
  }
  const tin = createTin(lidTexture(TINS[0]));
  scene.add(tin.group);
  const paintTarget = new THREE.Color();
  let depthTarget = 1, depth = 1; // the 69 g tin is narrower than the 1/6 tins

  function setProduct(p) {
    tin.label.material.map = lidTexture(p);
    tin.label.material.needsUpdate = true;
    paintTarget.set(p.paint);
    depthTarget = aspectOf(TINS[0]) / aspectOf(p);
  }
  setProduct(collection.current());
  tin.paint.color.copy(paintTarget);
  // warm the cache so a tab change never waits on the network
  addEventListener('load', () => TINS.forEach(lidTexture));
  collection.onChange = (p) => { setProduct(p); spinTarget += Math.PI * 2; };

  // ── shoal ──
  // Two meshes: the fish that end up in the tin (full detail, seen close), and
  // the school itself (lighter geometry, its own material so it can fade out).
  const uniforms = { uBeat: { value: 0 } };
  const N = touch ? 260 : 520;
  function makeShoal(n, lite) {
    const geo = createFishGeometry(lite);
    const wig = new THREE.InstancedBufferAttribute(new Float32Array(n).fill(1), 1);
    wig.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aWig', wig);
    const mesh = new THREE.InstancedMesh(geo, createFishMaterial(uniforms, lite), n);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { mesh, wig };
  }
  const PACKED = tin.slots.length;
  const five = makeShoal(PACKED, touch);
  // a soft contact shadow on the floor of the tin under each place, which
  // darkens in as its fish settles: they lie in the oil, not over it
  const sc0 = document.createElement('canvas'); sc0.width = 256; sc0.height = 64;
  const g0 = sc0.getContext('2d');
  g0.translate(128, 32); g0.scale(1, 0.25);
  const rg = g0.createRadialGradient(0, 0, 0, 0, 0, 120);
  rg.addColorStop(0, 'rgba(6,12,20,1)'); rg.addColorStop(0.5, 'rgba(6,12,20,0.6)'); rg.addColorStop(1, 'rgba(8,16,24,0)');
  g0.fillStyle = rg; g0.beginPath(); g0.arc(0, 0, 120, 0, Math.PI * 2); g0.fill();
  const shadowTex = new THREE.CanvasTexture(sc0);
  const beds = tin.slots.map((m) => {
    const pos = new THREE.Vector3().setFromMatrixPosition(m);
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.15),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(pos.x - 0.1 * Math.sign(pos.x), 0.056, pos.z + 0.2);
    tin.group.add(bed);
    return bed;
  });
  const school = makeShoal(N, true);
  school.mesh.material.transparent = true;

  // A real sardine school is a long, dense, polarised ribbon: every fish keeps
  // a place in the ribbon's cross-section and follows the path the leaders
  // swam a moment earlier, so a turn travels back through the school as a
  // bend, and the flanks flash in a wave as each part of it banks.
  // u: place along the ribbon (0 = the head), v/w: place in its cross-section.
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const member = (u) => {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
    return {
      u, v: Math.cos(a) * r, w: Math.sin(a) * r,
      ph: Math.random() * 6.28, jit: 0.6 + Math.random() * 0.8,
      s: 0.5 + Math.random() * 0.28 + gauss() * 0.04,
      a0: Math.random() * Math.PI * 2, speed: 0.16 + Math.random() * 0.1,
    };
  };
  // denser toward the head, thinning to a tail of stragglers
  const fish = Array.from({ length: N }, () => member(Math.pow(Math.random(), 1.25)));
  // the ones that end up in the tin swim near the head
  const tinFish = Array.from({ length: PACKED }, (_, i) => Object.assign(member(0.06 + i * 0.045), { v: (i % 2 ? 0.35 : -0.3), w: 0.8, s: 0.85 }));

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

  // shafts of light from the surface, swaying slowly: additive, very faint
  const rays = new THREE.Group();
  if (!touch) {
    const rc = document.createElement('canvas'); rc.width = 64; rc.height = 256;
    const g = rc.getContext('2d');
    const lin = g.createLinearGradient(0, 0, 64, 0);
    lin.addColorStop(0, 'rgba(255,255,255,0)'); lin.addColorStop(0.5, 'rgba(255,255,255,1)'); lin.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lin; g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = 'destination-in';
    const fade = g.createLinearGradient(0, 0, 0, 256);
    fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fade; g.fillRect(0, 0, 64, 256);
    const rayTex = new THREE.CanvasTexture(rc);
    for (let k = 0; k < 6; k++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9 + Math.random() * 1.4, 16),
        new THREE.MeshBasicMaterial({ map: rayTex, color: '#9fc4e6', transparent: true, opacity: 0.035 + Math.random() * 0.04, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      m.position.set(-2 + k * 1.7 + Math.random(), 3, -5 - Math.random() * 3);
      m.rotation.z = -0.32 + Math.random() * 0.12;
      m.userData = { ph: Math.random() * 6.28, base: m.rotation.z, o: m.material.opacity };
      rays.add(m);
    }
    scene.add(rays);
  }

  // ── scroll states, one per section. tx/ty are fractions of the visible half-width/height ──
  // k scales the tin for one moment without moving it into the fog
  const S = (tx, ty, tz, rx, ry, rz, lid, pack, cx, cy, k = 1) => ({ tx, ty, tz, rx, ry, rz, lid, pack, cx, cy, k });
  // ry ≈ π puts the hinge on the right, so an open lid swings away from the copy
  const STATES = [
      S(0.52, -3.6, 0, 0.9, 2.6, 0, 2.15, 0, 0.64, 0.04),
      S(0.37, -0.1, 0, 0.98, 2.75, -0.05, 2.15, 1, 0.42, 0.04, 0.84),
      S(0.44, -0.02, 0, 0.72, 0.45, -0.08, 0, 1, 0.42, 0.04),
      S(0.44, -0.05, 0, 0.85, -0.15, 0, 0, 1, 0.42, 0.04),
      // history: a portrait of the closed tin, lid to the viewer, out of the fog
      S(0.6, -0.06, 0, 1.26, 0.36, -0.1, 0, 1, 0.42, 0.04, 0.74),
      S(0.38, -0.08, 0, 0.98, 2.7, -0.04, 2.15, 1, 0.42, 0.04, 0.84),
  ];
  const KEYS = Object.keys(STATES[0]);
  const cur = { ...STATES[0] };

  const sections = [...document.querySelectorAll('[data-scene]')];
  let centers = [];
  // Solid bands (the collection grid, the history reel) and the footer are not
  // part of the 3D story. Their height is cut out of the story's scroll, so the
  // tin holds still while they pass; and the scene travels with the page at
  // their edges — pushed up by a band arriving from below, let back in by one
  // leaving at the top — so a band never slices through the tin.
  const viewport = document.querySelector('.viewport');
  const solids = [...document.querySelectorAll('.band-solid, .site-foot')];
  let spans = [];
  const collapse = (y) => spans.reduce((out, [t, b]) => out - Math.max(0, Math.min(y, b) - t), y);
  function shift() {
    const h = innerHeight;
    for (const [t, b] of spans) {
      const top = t - scrollY, bot = b - scrollY;
      if (top >= h || bot <= 0) continue; // not on screen
      if (top <= 0 && bot >= h) return null; // covers the screen: nothing to draw
      return top > 0 ? top - h : bot; // arriving from below : leaving at the top
    }
    return 0;
  }
  let lastShift = 0;
  let halfW = 5, halfH = 3;

  // iOS changes innerHeight while the address bar collapses mid-scroll. Size the
  // canvas to the large viewport and ignore those steps, or every swipe
  // reallocates the drawing buffer dozens of times.
  const probe = Object.assign(document.createElement('div'), { ariaHidden: 'true' });
  probe.style.cssText = 'position:fixed;top:0;height:100vh;height:100lvh;width:0;visibility:hidden;pointer-events:none';
  document.body.append(probe);
  let lastW = 0, lastH = 0;
  // a window narrowed after load switches to the phone layout; stop drawing then
  const phoneLayout = matchMedia('(max-width: 900px), (max-aspect-ratio: 9/10)');

  function resize() {
    spans = solids.map((s) => [s.offsetTop, s.offsetTop + s.offsetHeight]);
    centers = sections.map((s) => collapse(s.offsetTop + s.offsetHeight / 2));
    const w = innerWidth;
    const h = touch ? Math.max(innerHeight, probe.offsetHeight) : innerHeight;
    if (w === lastW && (h === lastH || (touch && Math.abs(h - lastH) < 160))) return;
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
    const y = collapse(scrollY + innerHeight / 2);
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
  const stage = document.querySelector('.stage');
  for (const el of stage ? [stage] : []) {
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
  let vortex = 0;
  let packT = 0, packGoal = 0;
  const tinUp = new THREE.Vector3(), hover = new THREE.Vector3();
  let lead = 0, flashT = -99, nextFlash = 6, flashSign = 1;

  // ── frame ──
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qs = new THREE.Quaternion();
  const p = new THREE.Vector3(), ps = new THREE.Vector3(), sc = new THREE.Vector3(), ss = new THREE.Vector3();
  const tan = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0);
  const qRoll = new THREE.Quaternion();
  const nrm = new THREE.Vector3(), bin = new THREE.Vector3();
  // the route the school's head swims: a wide oval through the depth, so it
  // crosses the hero close to the viewer and comes back small and far, with
  // no hairpin turns. out = position, tg = direction of travel
  function path(s, out, tg) {
    const ax = halfW * 0.66, ay = halfH * 0.3, az = 2.2, zc = -3;
    const cx = halfW * 0.3, cy = halfH * 0.02;
    out.set(cx + ax * (Math.sin(s) + 0.15 * Math.sin(2 * s + 0.7)),
            cy + ay * (0.7 * Math.sin(2 * s + 1) + 0.3 * Math.sin(0.5 * s)),
            zc + az * Math.cos(s));
    tg.set(ax * (Math.cos(s) + 0.3 * Math.cos(2 * s + 0.7)),
           ay * (1.4 * Math.cos(2 * s + 1) + 0.15 * Math.cos(0.5 * s)),
           -az * Math.sin(s));
  }
  const slotWorld = tin.slots.map(() => new THREE.Matrix4());
  const ease = (t) => t * t * (3 - 2 * t);
  const clock = new THREE.Clock();
  let t = 0;
  const motion = reduced ? 0.25 : 1;
  const followRate = touch ? 9 : 5; // a slow follow under a finger reads as lag
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

    // target state from scroll
    const f = progress();
    const list = STATES;
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
    const fit = Math.min(0.88, (halfW * 0.8) / 4.4);
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
    depth += (depthTarget - depth) * damp;
    tin.group.scale.set(fit * cur.k, fit * cur.k, fit * cur.k * depth);
    tin.lid.rotation.z = cur.lid;
    tin.paint.color.lerp(paintTarget, damp);
    tin.group.updateMatrixWorld(true);
    tin.slots.forEach((s, i) => slotWorld[i].multiplyMatrices(tin.group.matrixWorld, s));

    rays.children.forEach((m) => {
      const u = m.userData;
      m.rotation.z = u.base + Math.sin(t * 0.12 + u.ph) * 0.05;
      m.material.opacity = u.o * (0.6 + 0.4 * Math.sin(t * 0.3 + u.ph)) * (1 - cur.pack * 0.7);
    });

    // shoal
    const vt = performance.now() < vortexUntil ? 1 : 0;
    vortex += (vt - vortex) * (1 - Math.exp(-dt * 1.5));
    // the school rises out of the deep as the page opens, and sinks back into
    // it and fades as the page moves on
    const arrive = THREE.MathUtils.smoothstep(t, 0.8, 4.5);
    const fade = (1 - THREE.MathUtils.smoothstep(cur.pack, 0.02, 0.5)) * arrive;
    school.mesh.visible = fade > 0.003;
    school.mesh.material.opacity = fade;
    // now and then the school startles: a turn and a flash of silver flanks
    // run from head to tail, and it surges for a moment
    if (t > nextFlash) { flashT = t; nextFlash = t + 8 + Math.random() * 6; flashSign = -flashSign; }
    const since = t - flashT;
    const surge = since < 2.6 ? Math.sin(Math.PI * since / 2.6) : 0;
    const pace = 1 + 0.2 * Math.sin(t * 0.13) + 0.1 * Math.sin(t * 0.31 + 2) + 0.45 * surge;
    lead += dt * motion * 0.16 * pace;
    uniforms.uBeat.value += dt * motion * (0.6 + 0.4 * pace);
    const cx = halfW * 0.3, cy = halfH * 0.02;
    const span = 2.1; // how much of the path the school covers, head to tail
    const kHead = 1 - Math.exp(-dt * 5);
    const place = (d, i, sink) => {
      const u = d.u + Math.sin(t * 0.21 * d.jit + d.ph) * 0.02;
      const at = lead - u * span;
      path(at, ps, tan);
      tan.normalize();
      path(at + 0.12, p, sc);
      sc.normalize();
      // the cross-section: full in the body, tapering at head and tail, and a
      // slow squeeze travelling down the school
      const girth = (0.16 + Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.1 + 0.07)), 0.7)) * (1 + Math.sin(t * 0.5 - u * 7) * 0.1);
      nrm.set(0, 1, 0).addScaledVector(tan, -tan.y).normalize();
      bin.crossVectors(tan, nrm);
      // each fish wanders slowly inside its part of the school
      const v = d.v + Math.sin(t * 0.23 * d.jit + d.ph) * 0.12, w = d.w + Math.cos(t * 0.19 * d.jit + d.ph * 1.7) * 0.12;
      const wave = since - u * 1.6;
      const flash = wave > 0 && wave < 0.9 ? Math.sin(Math.PI * wave / 0.9) ** 2 : 0;
      ps.addScaledVector(nrm, v * girth * 0.95).addScaledVector(bin, w * girth * 1.35 + flash * 0.22 * flashSign);
      ps.z -= sink * 5; ps.y -= sink * 0.8;
      if (vortex > 0.001) {
        // 1824: the shoal winds into a column
        const a = d.a0 + t * d.speed * 2.6, r = 0.5 + (i % 30) * 0.04;
        ps.lerp(p.set(cx + r * Math.cos(a), cy + (i / N - 0.5) * 5, -1 + r * Math.sin(a)), vortex);
      }
      // a fish faces where it is actually going, turning smoothly
      if (!d.h) { d.h = tan.clone(); d.prev = ps.clone(); }
      else if (dt > 0) {
        p.subVectors(ps, d.prev);
        const len = p.length();
        if (len > 1e-5) d.h.lerp(p.divideScalar(len), kHead).normalize();
        d.prev.copy(ps);
      }
      // bank into the turn (how fast the path yaws just ahead), and in the flash
      const yaw = tan.z * sc.x - tan.x * sc.z;
      const roll = (THREE.MathUtils.clamp(yaw * 9, -1, 1) + Math.sin(t * 0.6 * d.jit + d.ph * 2) * 0.15) * (1 - vortex) + flash * 1.3 * flashSign;
      qs.setFromUnitVectors(X, d.h);
      qs.multiply(qRoll.setFromAxisAngle(X, roll));
      ss.setScalar(d.s);
    };
    if (school.mesh.visible) {
      for (let i = 0; i < N; i++) {
        place(fish[i], i, 1 - fade);
        m4.compose(ps, qs, ss);
        school.mesh.setMatrixAt(i, m4);
      }
      school.mesh.instanceMatrix.needsUpdate = true;
    } else fish.forEach((d) => { d.h = null; });
    // Packing plays through on its own once the page reaches the tin (and
    // back when it leaves), so a fish never hangs half-way over the rim.
    if (cur.pack > 0.5) packGoal = 1; else if (cur.pack < 0.25) packGoal = 0;
    packT = THREE.MathUtils.clamp(packT + Math.sign(packGoal - packT) * dt / 2.6, 0, 1);
    tinUp.set(0, 1, 0).applyQuaternion(tin.group.quaternion);
    const lift = 2.4 * tin.group.scale.x; // well clear of the rim
    for (let i = 0; i < PACKED; i++) {
      const pk = THREE.MathUtils.clamp(packT * 1.75 - i * 0.25, 0, 1);
      place(tinFish[i], i, 1 - arrive);
      slotWorld[i].decompose(p, q, sc);
      // 1: glide to a point straight above its place, turning to lie as it will
      const a = ease(THREE.MathUtils.clamp(pk / 0.62, 0, 1));
      hover.copy(p).addScaledVector(tinUp, lift);
      ps.lerp(hover, a);
      ps.addScaledVector(tinUp, Math.sin(a * Math.PI) * 0.6);
      qs.slerp(q, a);
      ss.lerp(sc, a);
      // 2: settle straight down into it, slowing to rest
      const b = THREE.MathUtils.clamp((pk - 0.62) / 0.38, 0, 1);
      if (b > 0) ps.copy(hover).lerp(p, 1 - (1 - b) ** 3);
      beds[i].material.opacity = b * b;
      m4.compose(ps, qs, ss);
      five.mesh.setMatrixAt(i, m4);
      five.wig.array[i] = 1 - Math.min(1, pk / 0.8);
    }
    five.mesh.instanceMatrix.needsUpdate = true;
    five.wig.needsUpdate = true;

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
    moving += Math.abs(spinTarget - spin) + Math.abs(dragV) + vortex + (1 - cur.pack) + Math.abs(packGoal - packT);
    odd = !odd;
    const sh = shift();
    if (sh !== lastShift) {
      lastShift = sh;
      viewport.style.visibility = sh === null ? 'hidden' : '';
      viewport.style.transform = sh ? `translate3d(0, ${sh.toFixed(1)}px, 0)` : '';
    }
    if ((touch && moving < 0.002 && odd) || phoneLayout.matches || sh === null) { requestAnimationFrame(frame); return; }

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
