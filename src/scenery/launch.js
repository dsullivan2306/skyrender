import * as THREE from 'three';
import { glow, groundSet } from '../world/setup.js';

// ---------- Jasper Spaceport: launch platform, service tower with swing arm, blockhouse ----------
const launchSet = new THREE.Group(); groundSet.add(launchSet);
let swingArm;
{
  const S = (c, r = 0.8, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const add = (geo, mat, x, y, z, parent = launchSet) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const concrete = S(0xb3b1aa, 0.95), red = S(0xb33a2c, 0.6, 0.2), white = S(0xeceae4, 0.6), steelM = S(0x7d8287, 0.4, 0.7);
  add(new THREE.BoxGeometry(16, 0.04, 16), concrete, 0, 0.02, 0);
  add(new THREE.BoxGeometry(2.6, 0.045, 9), S(0x2a2c2e, 1), 0, 0.025, -4.5);                        // flame trench
  for (let k = -3; k <= 3; k++) add(new THREE.BoxGeometry(0.5, 0.05, 0.25), S(k % 2 ? 0xd9b43a : 0x222222), k * 0.55, 0.03, 2.3);   // hazard stripe
  // service tower: red lattice with white bands
  const TX = 3.4, TH = 15;
  for (const dx of [-0.7, 0.7]) for (const dz of [-0.7, 0.7]) add(new THREE.BoxGeometry(0.14, TH, 0.14), red, TX + dx, TH / 2, dz);
  for (let y = 1.5; y < TH; y += 1.5) {
    for (const dz of [-0.7, 0.7]) add(new THREE.BoxGeometry(1.4, 0.08, 0.08), y % 3 ? red : white, TX, y, dz);
    for (const dx of [-0.7, 0.7]) add(new THREE.BoxGeometry(0.08, 0.08, 1.4), y % 3 ? red : white, TX + dx, y, 0);
    for (const dz of [-0.7, 0.7]) { const b = add(new THREE.BoxGeometry(0.05, 2.05, 0.05), red, TX, y - 0.75, dz); b.rotation.z = 0.75; }
  }
  add(new THREE.BoxGeometry(1.8, 0.15, 1.8), white, TX, TH, 0);
  add(new THREE.BoxGeometry(0.1, 4, 0.1), steelM, TX, TH + 2, 0);                                   // lightning mast
  const crane = add(new THREE.BoxGeometry(3.2, 0.2, 0.25), red, TX - 0.8, TH + 0.6, 0);
  add(new THREE.BoxGeometry(0.03, 2, 0.03), S(0x222222), TX - 2.2, TH - 0.4, 0);
  // crew access swing arm, pivoting at the tower; it reaches the rocket's side door
  swingArm = new THREE.Group(); swingArm.position.set(TX - 0.7, 5.67, 0); launchSet.add(swingArm);
  add(new THREE.BoxGeometry(1.9, 0.12, 0.5), steelM, -0.95, -0.35, 0, swingArm);
  for (const dz of [-0.24, 0.24]) add(new THREE.BoxGeometry(1.9, 0.05, 0.04), white, -0.95, 0.15, dz, swingArm);
  add(new THREE.BoxGeometry(0.6, 0.8, 0.7), white, -1.95, 0, 0, swingArm);                          // white room at the hatch
  add(new THREE.BoxGeometry(0.05, 0.3, 0.4), S(0x2b3a44, 0.2), -1.64, 0.1, 0, swingArm);
  // blockhouse with the spaceport sign
  add(new THREE.BoxGeometry(5, 2.4, 3.5), white, -9, 1.2, -7);
  add(new THREE.BoxGeometry(5.4, 0.25, 3.9), S(0x2c4a6b), -9, 2.5, -7);
  const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 160;
  const g = sc.getContext('2d');
  const drawSign = () => {
    g.fillStyle = '#2c4a6b'; g.fillRect(0, 0, 1024, 160);
    g.fillStyle = '#efe9da'; g.font = '600 86px Karla, "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('JASPER SPACEPORT', 512, 86);
  };
  drawSign();
  const signTex = new THREE.CanvasTexture(sc);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawSign(); signTex.needsUpdate = true; });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.72), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.8 }));
  sign.position.set(-9, 3.1, -5.04); launchSet.add(sign);
  add(new THREE.BoxGeometry(4.8, 0.82, 0.06), S(0x2c4a6b), -9, 3.1, -5.1);
  // fuel spheres on legs and floodlight poles
  for (const [x, z] of [[-10, 6], [-6.5, 9]]) {
    add(new THREE.SphereGeometry(1.3, 20, 14), white, x, 2.4, z);
    for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), steelM, x + Math.cos(k * 1.57) * 0.8, 0.7, z + Math.sin(k * 1.57) * 0.8);
  }
  const flood = glow(new THREE.MeshStandardMaterial({ color: 0xf6e7b8, emissive: 0xffe2a0, emissiveIntensity: 0.9 }), 0.9);
  for (const [x, z] of [[-7, 7], [7, -7], [-7, -2], [7, 6]]) { add(new THREE.CylinderGeometry(0.06, 0.08, 6, 6), steelM, x, 3, z); add(new THREE.BoxGeometry(0.6, 0.35, 0.2), flood, x, 6.1, z); }
}

export { launchSet, swingArm };
