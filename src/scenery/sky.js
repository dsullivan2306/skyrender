import * as THREE from 'three';
import { PAL, scene } from '../world/setup.js';
import { rnd } from './nature.js';

// ---------- birds: small flocks flapping in lazy circles ----------
const birdSet = new THREE.Group(); scene.add(birdSet);
const birdMat = new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.9, side: THREE.DoubleSide });
const wingGeoB = new THREE.BufferGeometry();
wingGeoB.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, 0, 0, -0.08, 0.55, 0, -0.12], 3)); wingGeoB.computeVertexNormals();
const flocks = [];
for (let f = 0; f < 4; f++) {
  const flock = { cx: (rnd() - 0.5) * 50, cy: 7 + rnd() * 8, cz: (rnd() - 0.5) * 50, r: 8 + rnd() * 10, w: (0.15 + rnd() * 0.12) * (f % 2 ? 1 : -1), a: rnd() * 6, birds: [] };
  const n = 4 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group();
    b.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6).scale(1, 0.8, 2.2), birdMat));
    const L = new THREE.Mesh(wingGeoB, birdMat), Rw = new THREE.Mesh(wingGeoB, birdMat); Rw.scale.x = -1;
    b.add(L, Rw); b.userData = { L, R: Rw, off: [(i % 3 - 1) * 0.9 + rnd() * 0.3, rnd() * 0.6, -Math.floor(i / 1.5) * 0.8], ph: rnd() * 6 };
    birdSet.add(b); flock.birds.push(b);
  }
  flocks.push(flock);
}

// Clouds: drift past when flying, hang high overhead when it's standing.
const cloudSet = new THREE.Group();
scene.add(cloudSet);
const cloudMat = new THREE.MeshStandardMaterial({ color: PAL.cloud, roughness: 1, emissive: PAL.cloud, emissiveIntensity: 0.25, transparent: true, opacity: 1 });
const puff = new THREE.SphereGeometry(1, 14, 10);
const clouds = [];
for (let i = 0; i < 28; i++) {
  let x, y;
  do { x = (rnd() - 0.5) * 110; y = -18 + rnd() * 40; } while (Math.abs(x) < 10 && Math.abs(y) < 8);
  const c = new THREE.Group();
  const n = 4 + Math.floor(rnd() * 4), w = 3 + rnd() * 4;
  for (let k = 0; k < n; k++) {
    const p = new THREE.Mesh(puff, cloudMat);
    const r = 1.2 + rnd() * 1.6;
    p.scale.set(r * 1.3, r * 0.8, r);
    p.position.set((rnd() - 0.5) * w * 1.6, rnd() * 0.8, (rnd() - 0.5) * w);
    c.add(p);
  }
  c.position.set(x, y, (rnd() - 0.5) * 140);
  cloudSet.add(c); clouds.push(c);
}

export { birdSet, cloudMat, cloudSet, clouds, flocks, puff };
