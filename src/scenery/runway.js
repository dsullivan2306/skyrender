import * as THREE from 'three';
import { PAL, glow, groundSet } from '../world/setup.js';
import { m4 } from './train.js';

// ---------- airport: runway, tower, terminal, hangar, windsock ----------
const airportSet = new THREE.Group(); groundSet.add(airportSet);
const RUN_L = 130, DASH = 6;
const runway = new THREE.Mesh(new THREE.BoxGeometry(7, 0.02, RUN_L * 2), new THREE.MeshStandardMaterial({ color: PAL.runway, roughness: 0.95 }));
runway.position.y = 0.01; runway.receiveShadow = true; airportSet.add(runway);
const paint = new THREE.MeshStandardMaterial({ color: 0xf1efe6, roughness: 0.8 });
for (const x of [-3.2, 3.2]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.022, RUN_L * 2), paint); l.position.set(x, 0.012, 0); airportSet.add(l); }
const dashSet = new THREE.Group(); airportSet.add(dashSet);
const nD = Math.round(RUN_L * 2 / DASH);
const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.024, 3), paint, nD);
const edgeLights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 8, 6), glow(new THREE.MeshStandardMaterial({ color: 0xffe6a0, emissive: 0xffc34d, emissiveIntensity: 1.2 }), 1.2), nD * 2);
for (let i = 0; i < nD; i++) {
  const z = -RUN_L + i * DASH;
  dashes.setMatrixAt(i, m4.makeTranslation(0, 0.013, z));
  edgeLights.setMatrixAt(i * 2, m4.makeTranslation(-3.6, 0.1, z)); edgeLights.setMatrixAt(i * 2 + 1, m4.makeTranslation(3.6, 0.1, z));
}
dashSet.add(dashes, edgeLights);
const airportScenery = new THREE.Group(); airportSet.add(airportScenery);
{
  const S = (c, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; airportScenery.add(m); return m; };
  // threshold stripes and runway number at the start of the runway
  for (let k = -3; k <= 3; k++) if (k) add(new THREE.BoxGeometry(0.3, 0.024, 3), paint, k * 0.45, 0.013, -9);
  // apron and taxiway
  add(new THREE.BoxGeometry(14, 0.015, 22), S(0x8f8f8a, 0.95), -12, 0.008, -2);
  add(new THREE.BoxGeometry(5.5, 0.016, 2), S(0x8f8f8a, 0.95), -6.2, 0.009, 8);
  // control tower
  add(new THREE.CylinderGeometry(0.7, 0.9, 7, 12), S(0xd9d4c7), -9, 3.5, 7);
  add(new THREE.CylinderGeometry(1.5, 1.2, 1.3, 12), S(0x2b3a44, 0.2), -9, 7.6, 7);
  add(new THREE.CylinderGeometry(1.7, 1.6, 0.25, 12), S(0xd9d4c7), -9, 8.35, 7);
  add(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), S(0x555555), -9, 9.0, 7);
  add(new THREE.SphereGeometry(0.1, 8, 6), glow(new THREE.MeshStandardMaterial({ color: 0x8a1a1a, emissive: 0xff2a1a, emissiveIntensity: 1 }), 1), -9, 9.65, 7);
  // terminal with a long glass front
  add(new THREE.BoxGeometry(5, 3, 14), S(0xe4dfd2), -17, 1.5, -4);
  add(new THREE.BoxGeometry(0.05, 1.6, 12), S(0x2b3a44, 0.2), -14.48, 1.6, -4);
  add(new THREE.BoxGeometry(5.6, 0.25, 14.6), S(0x7a2430), -17, 3.1, -4);
  // hangar with a curved roof, across the runway
  const hg = add(new THREE.CylinderGeometry(4, 4, 10, 20, 1, false, 0, Math.PI), S(0x9aa1a5, 0.6), 14, 0, -6); hg.rotation.z = Math.PI / 2;
  add(new THREE.BoxGeometry(0.1, 3.4, 5.6), S(0x3a3e42), 9.05, 1.7, -6);
  // windsock
  add(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), S(0x555555), 6, 1.5, 12);
  const sock = add(new THREE.CylinderGeometry(0.28, 0.12, 1.4, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8662a, roughness: 0.8, side: THREE.DoubleSide }), 6, 2.85, 11.3);
  sock.rotation.x = Math.PI / 2 - 0.25;
}

export { DASH, airportScenery, airportSet, dashSet };
