import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createFishGeometry, createFishMaterial } from '../js/fish.js';
import { createTin } from '../js/tin.js';
import { TINS } from '../js/products.js';

const q = new URLSearchParams(location.search);
const shot = q.get('shot') || 'tin';
const W = 900, H = 640, SCALE = 2;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(SCALE);
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.append(renderer.domElement);

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 60);
camera.position.set(0, 0.6, 10);
camera.lookAt(0, 0, 0);
const key = new THREE.DirectionalLight('#eaf2ff', 2.2);
key.position.set(-4, 6, 6);
const rim = new THREE.DirectionalLight('#7fa6c8', 2.5);
rim.position.set(5, 2, -6);
scene.add(key, rim, new THREE.AmbientLight('#2a3d52', 0.6));

// seeded, so a re-render gives the same picture
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function fishMesh(n, wiggle) {
  const geo = createFishGeometry();
  geo.setAttribute('aWig', new THREE.InstancedBufferAttribute(new Float32Array(n).fill(wiggle), 1));
  const mesh = new THREE.InstancedMesh(geo, createFishMaterial({ uBeat: { value: 2.3 } }), n);
  mesh.frustumCulled = false;
  return mesh;
}


const m4 = new THREE.Matrix4(), X = new THREE.Vector3(1, 0, 0);

if (shot === 'shoal') {
  const N = 150;
  const shoal = fishMesh(N, 1);
  for (let i = 0; i < N; i++) {
    const r = 0.8 + rand() * 2.6, a = rand() * Math.PI * 2, y = (rand() - 0.5) * 2.6;
    const pos = new THREE.Vector3(r * Math.cos(a), y, -1 + r * Math.sin(a));
    const dir = new THREE.Vector3(-Math.sin(a), (rand() - 0.5) * 0.15, Math.cos(a)).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(X, dir);
    shoal.setMatrixAt(i, m4.compose(pos, quat, new THREE.Vector3().setScalar(0.55 + rand() * 0.4)));
  }
  // the seeded draw happens to lean left; centre the whole shoal in frame
  shoal.position.x = 0.55;
  scene.add(shoal);
} else {
  const p = TINS.find((x) => x.id === q.get('p')) || TINS[0];
  const tex = await new THREE.TextureLoader().loadAsync(`../img/lids/${p.id}.webp`);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const tin = createTin(tex);
  tin.paint.color.set(p.paint);
  if (shot === 'open') {
    tin.group.position.set(-0.85, -0.3, 0);
    tin.group.rotation.set(0.98, 2.75, -0.05);
    tin.group.scale.setScalar(0.7);
    tin.lid.rotation.z = 2.15;
    tin.group.updateMatrixWorld(true);
    const fish = fishMesh(tin.slots.length, 0);
    tin.slots.forEach((s, i) => fish.setMatrixAt(i, m4.multiplyMatrices(tin.group.matrixWorld, s)));
    scene.add(fish);
  } else if (shot === 'ajar') {
    tin.group.position.set(-0.2, -0.45, 0);
    tin.group.rotation.set(0.9, 0.55, -0.06);
    tin.group.scale.setScalar(0.85);
    tin.lid.rotation.z = 0.55;
    tin.group.updateMatrixWorld(true);
    const fish = fishMesh(tin.slots.length, 0);
    tin.slots.forEach((s, i) => fish.setMatrixAt(i, m4.multiplyMatrices(tin.group.matrixWorld, s)));
    scene.add(fish);
  } else {
    tin.group.position.set(0, -0.3, 0);
    tin.group.rotation.set(0.85, -0.25, 0.02);
    tin.group.scale.setScalar(0.98);
  }
  scene.add(tin.group);
}

renderer.render(scene, camera);
document.documentElement.dataset.done = '1';
