import * as THREE from 'three';
import { PAL, groundSet } from '../world/setup.js';

// seeded scatter so the scene looks the same every visit; nothing grows on the tracks or the pad
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const scrollers = [];              // { obj, z0, k: parallax factor, L: wrap half-length }
const hillMat = new THREE.MeshStandardMaterial({ color: PAL.hill, roughness: 1, flatShading: true });
for (let i = 0; i < 14; i++) {
  const a = rnd() * Math.PI * 2, d = 80 + rnd() * 60;
  const h = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hillMat);
  h.scale.set(18 + rnd() * 22, 6 + rnd() * 12, 14 + rnd() * 16);
  h.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); groundSet.add(h);
  scrollers.push({ obj: h, z0: h.position.z, k: 0, L: 150 });
}
const pineMat = new THREE.MeshStandardMaterial({ color: PAL.pine, roughness: 1, flatShading: true });
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 1 });
for (let i = 0; i < 44; i++) {
  let x, z, s = 0.7 + rnd() * 0.9;
  do { const a = rnd() * Math.PI * 2, d = 12 + rnd() * 44; x = Math.cos(a) * d; z = Math.sin(a) * d; } while (Math.abs(x) < 20 && Math.abs(z) < 14 || (x > -9 && x < 12));
  const tree = new THREE.Group();
  tree.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 6), trunkMat).translateY(0.4));
  tree.add(new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 7), pineMat).translateY(1.8));
  tree.add(new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 7), pineMat).translateY(2.6));
  tree.scale.setScalar(s); tree.position.set(x, 0, z);
  tree.traverse(o => { if (o.isMesh) o.castShadow = true; });
  groundSet.add(tree); scrollers.push({ obj: tree, z0: z, k: 1, L: 60 });
}
// Leafy trees change with the seasons; pines get snow caps in winter
const leafMats = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: 0x5d8a43, roughness: 1, flatShading: true }));
const snowMat = new THREE.MeshStandardMaterial({ color: 0xf6f8fa, roughness: 1, flatShading: true });
const canopies = [], branches = [], snowCaps = [];
scrollers.forEach(sc => {                         // snow caps on the pines already placed
  if (sc.obj.type !== 'Group' || sc.obj.children.length !== 3) return;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.75, 7), snowMat); cap.position.y = 3.05; cap.visible = false;
  sc.obj.add(cap); snowCaps.push(cap);
});
for (let i = 0; i < 22; i++) {
  let x, z;
  do { const a = rnd() * Math.PI * 2, d = 12 + rnd() * 44; x = Math.cos(a) * d; z = Math.sin(a) * d; } while (Math.abs(x) < 20 && Math.abs(z) < 14 || (x > -9 && x < 12));
  const tree = new THREE.Group(), s = 0.8 + rnd() * 0.7;
  tree.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.6, 6), trunkMat).translateY(0.8));
  const can = new THREE.Group();
  for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75 + rnd() * 0.3, 0), leafMats[i % 3]); b.position.set((rnd() - 0.5) * 0.8, 2.0 + rnd() * 0.6, (rnd() - 0.5) * 0.8); can.add(b); }
  tree.add(can); canopies.push(can);
  const br = new THREE.Group();
  for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 1.2, 5), trunkMat); b.position.set(0, 1.9, 0); b.rotation.set(Math.cos(k * 1.6) * 0.7, k * 1.6, Math.sin(k * 1.6) * 0.7); br.add(b); }
  br.visible = false; tree.add(br); branches.push(br);
  tree.scale.setScalar(s); tree.position.set(x, 0, z);
  tree.traverse(o => { if (o.isMesh) o.castShadow = true; });
  groundSet.add(tree); scrollers.push({ obj: tree, z0: z, k: 1, L: 60 });
}
const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8781, roughness: 1, flatShading: true });
for (let i = 0; i < 22; i++) {
  let x, z;
  do { const a = rnd() * Math.PI * 2, d = 9 + rnd() * 40; x = Math.cos(a) * d; z = Math.sin(a) * d; } while (Math.abs(x) < 20 && Math.abs(z) < 14 || (x > -9 && x < 12));
  const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + rnd() * 0.6, 0), rockMat);
  r.position.set(x, 0.1, z); r.rotation.set(rnd() * 3, rnd() * 3, 0);
  r.castShadow = true; r.receiveShadow = true; groundSet.add(r);
  scrollers.push({ obj: r, z0: z, k: 1, L: 60 });
}

export { branches, canopies, hillMat, leafMats, pineMat, rnd, scrollers, snowCaps };
