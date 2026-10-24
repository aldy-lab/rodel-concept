import * as THREE from 'three';

// A quarter-club sardine tin: tinplate walls, painted sleeve, printed lid on a
// hinge at the −x end, and five slots for fish laid head-to-tail.

function roundRect(w, d, r, PathType = THREE.Shape) {
  const s = new PathType();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + d - r);
  s.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + d);
  s.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}

function ring(outer, inner, depth) {
  const s = roundRect(...outer);
  s.holes.push(roundRect(...inner, THREE.Path));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 14 });
  g.rotateX(-Math.PI / 2);
  return g;
}

function slab(dims, depth) {
  const g = new THREE.ExtrudeGeometry(roundRect(...dims), { depth, bevelEnabled: false, curveSegments: 14 });
  g.rotateX(-Math.PI / 2);
  return g;
}

export const TIN = { W: 4.2, D: 2.9, H: 0.8, R: 0.42, T: 0.06 };

export function createTin(labelTexture) {
  const { W, D, H, R, T } = TIN;
  const group = new THREE.Group();

  const tinplate = new THREE.MeshStandardMaterial({ color: '#c9d1d8', metalness: 1, roughness: 0.28 });
  const paint = new THREE.MeshStandardMaterial({ color: '#13263a', metalness: 0.5, roughness: 0.5, envMapIntensity: 0.45 });

  const inner = [W - 2 * T, D - 2 * T, R - T];
  group.add(new THREE.Mesh(ring([W, D, R], inner, H), tinplate));
  group.add(new THREE.Mesh(slab([W, D, R], 0.05), tinplate));

  const rim = new THREE.Mesh(ring([W + 0.08, D + 0.08, R + 0.04], inner, 0.05), tinplate);
  rim.position.y = H - 0.05;
  group.add(rim);

  const sleeve = new THREE.Mesh(ring([W + 0.012, D + 0.012, R + 0.006], [W, D, R], H * 0.72), paint);
  sleeve.position.y = 0.08;
  group.add(sleeve);

  const oilGeo = new THREE.ShapeGeometry(roundRect(...inner), 14);
  oilGeo.rotateX(-Math.PI / 2);
  const oil = new THREE.Mesh(oilGeo, new THREE.MeshPhysicalMaterial({
    color: '#dfe4d6', transparent: true, opacity: 0.12, roughness: 0.02, metalness: 0, clearcoat: 1, depthWrite: false,
  }));
  oil.position.y = H * 0.68;
  oil.renderOrder = 2;
  group.add(oil);

  // Lid hinges at the −x edge; rotation.z > 0 lifts the free end.
  const lid = new THREE.Group();
  lid.position.set(-W / 2, H, 0);
  const lidGeo = slab([W + 0.04, D + 0.04, R + 0.02], 0.035);
  lidGeo.translate(W / 2, 0, 0);
  lid.add(new THREE.Mesh(lidGeo, tinplate));

  // the print stops short of the free end, leaving bare tinplate for the pull ring
  const lw = W - 0.8, ld = D - 0.3;
  const labelGeo = new THREE.ShapeGeometry(roundRect(lw, ld, R - 0.12), 14);
  const uv = labelGeo.attributes.uv, lp = labelGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (lp.getX(i) + lw / 2) / lw, (lp.getY(i) + ld / 2) / ld);
  labelGeo.rotateX(-Math.PI / 2);
  labelGeo.translate(0.15 + lw / 2, 0.037, 0);
  const label = new THREE.Mesh(labelGeo, new THREE.MeshStandardMaterial({ map: labelTexture, metalness: 0.3, roughness: 0.42 }));
  lid.add(label);

  // pull ring on the free end
  const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 20), tinplate);
  rivet.position.set(W - 0.12, 0.05, 0);
  const pull = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.026, 10, 36), tinplate);
  pull.rotation.x = Math.PI / 2;
  pull.position.set(W - 0.33, 0.06, 0);
  lid.add(rivet, pull);
  group.add(lid);

  // Five fish lying on their side, alternating head-to-tail, slightly staggered in height.
  const FISH_SCALE = 3.0;
  const fishH = 0.24 * FISH_SCALE; // body depth incl. the fuller belly
  const slots = [];
  const dIn = D - 2 * T;
  const qSide = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const qFlip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  for (let k = 0; k < 5; k++) {
    const flip = k % 2 === 1;
    const q = flip ? qFlip.clone().multiply(qSide) : qSide.clone();
    const pos = new THREE.Vector3(flip ? -0.14 : 0.14, 0.25 + (k % 2) * 0.06, -(dIn - fishH) / 2 + k * ((dIn - fishH) / 4));
    slots.push(new THREE.Matrix4().compose(pos, q, new THREE.Vector3().setScalar(FISH_SCALE)));
  }

  return { group, lid, paint, slots };
}
