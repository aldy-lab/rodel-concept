import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// A sardine built from primitives: lathe body, flat forked tail, dorsal fin,
// two eyes. Head points to +x, back to +y, flanks face ±z. Length ≈ 1.08.

const BACK = new THREE.Color('#0f3346');
const FLANK = new THREE.Color('#a9bac6');
const BELLY = new THREE.Color('#eef2f5');
const HEAD = new THREE.Color('#8b9caa');
const FIN = new THREE.Color('#5d7484');
const PUPIL = new THREE.Color('#05090d');

const X0 = -0.42, X1 = 0.5, R = 0.11, SQUASH = 0.55;

function radiusAt(t) {
  return R * Math.pow(Math.sin(Math.PI * Math.pow(t, 1.35)), 0.72) + 0.022 * (1 - t);
}

function paint(geo, fn) {
  const p = geo.attributes.position;
  const c = new Float32Array(p.count * 3);
  const col = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    fn(p.getX(i), p.getY(i), p.getZ(i), col);
    c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

export function createFishGeometry(lite = false) {
  const pts = [new THREE.Vector2(0, X0 - 0.001)];
  const N = lite ? 40 : 64;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push(new THREE.Vector2(radiusAt(t), X0 + t * (X1 - X0)));
  }
  const body = new THREE.LatheGeometry(pts, lite ? 24 : 40);
  body.rotateZ(-Math.PI / 2);
  body.scale(1, 1, SQUASH);
  // a slightly fuller belly than back
  const bp = body.attributes.position;
  for (let i = 0; i < bp.count; i++) if (bp.getY(i) < 0) bp.setY(i, bp.getY(i) * 1.08);
  body.computeVertexNormals();

  paint(body, (x, y, z, col) => {
    const r = Math.hypot(y, z / SQUASH) || 1e-4;
    const k = y / r; // -1 belly … +1 back
    if (k > 0.08) col.copy(FLANK).lerp(BACK, THREE.MathUtils.smoothstep(k, 0.05, 0.6));
    else col.copy(FLANK).lerp(BELLY, THREE.MathUtils.smoothstep(-k, -0.05, 0.6));
    if (x > 0.36) col.lerp(HEAD, 0.35);
    if (Math.abs(x - 0.355) < 0.009 && k < 0.7) col.multiplyScalar(0.72); // gill line
  });

  const tailShape = new THREE.Shape();
  tailShape.moveTo(-0.39, 0.016);
  tailShape.quadraticCurveTo(-0.47, 0.03, -0.585, 0.115);
  tailShape.quadraticCurveTo(-0.54, 0.03, -0.52, 0);
  tailShape.quadraticCurveTo(-0.54, -0.03, -0.585, -0.115);
  tailShape.quadraticCurveTo(-0.47, -0.03, -0.39, -0.016);
  tailShape.closePath();
  const tail = paint(new THREE.ShapeGeometry(tailShape, 10), (x, y, z, col) =>
    col.copy(FIN).lerp(BACK, THREE.MathUtils.smoothstep(-x, 0.45, 0.6) * 0.6));

  const dorsalShape = new THREE.Shape();
  dorsalShape.moveTo(-0.05, 0.1);
  dorsalShape.quadraticCurveTo(0.0, 0.13, 0.025, 0.168);
  dorsalShape.quadraticCurveTo(0.05, 0.13, 0.08, 0.1);
  dorsalShape.closePath();
  const dorsal = paint(new THREE.ShapeGeometry(dorsalShape, 6), (x, y, z, col) => col.copy(BACK));

  const eyes = [1, -1].map((side) => {
    const e = new THREE.SphereGeometry(0.017, 14, 10);
    e.scale(1, 1, 0.45);
    e.translate(0.415, 0.014, side * 0.03);
    return paint(e, (x, y, z, col) => {
      const d = Math.hypot(x - 0.415, y - 0.014);
      col.copy(d < 0.01 ? PUPIL : FLANK);
    });
  });

  const geo = mergeGeometries([body, tail, dorsal, ...eyes]);
  geo.computeBoundingSphere();
  return geo;
}

// Physical, iridescent skin. Per-instance `aWig` (0…1) drives the tail beat so
// fish already packed in the tin lie still while the shoal swims.
export function createFishMaterial(uniforms, lite = false) {
  const m = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    metalness: 0.9,
    roughness: 0.22,
    iridescence: 0.22,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [260, 420],
    clearcoat: lite ? 0 : 0.4, // a second specular lobe per pixel; phones skip it
    clearcoatRoughness: 0.2,
    side: THREE.DoubleSide,
    envMapIntensity: 1.3,
  });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBeat = uniforms.uBeat;
    sh.vertexShader = 'uniform float uBeat;\nattribute float aWig;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      // a travelling body wave: small at the head, growing to the tail; each
      // fish has its own tempo (uBeat runs faster as the school speeds up), and the head yaws gently against the tail
      float id = float(gl_InstanceID);
      float h = fract(sin(id * 12.9898) * 43758.5453);
      float tempo = 6.5 + h * 3.5;
      float ph = id * 1.37;
      float along = clamp((0.5 - position.x) / 1.1, 0.0, 1.0);
      float amp = (0.012 + 0.085 * along * along) * aWig;
      transformed.z += sin(position.x * 6.0 - uBeat * tempo + ph) * amp;
      transformed.z -= sin(-uBeat * tempo + ph + 3.0) * 0.012 * smoothstep(0.1, 0.5, position.x) * aWig;`
    );
  };
  return m;
}
