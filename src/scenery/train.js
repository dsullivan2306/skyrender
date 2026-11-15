import * as THREE from 'three';
import { PAL, glow, groundSet } from '../world/setup.js';

// Railway: grows up out of the ground for train mode. Rail tops sit 0.2 above the grass.
// Ties and trackside posts are uniform, so sliding them by a fraction of their spacing
// makes the train look like it is speeding along.
const trackSet = new THREE.Group(); groundSet.add(trackSet);
const TRACK_L = 130, TIE = 0.6, POST = 12;
const ballast = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, TRACK_L * 2), new THREE.MeshStandardMaterial({ color: PAL.ballast, roughness: 1 }));
ballast.position.y = 0.06; ballast.receiveShadow = true; trackSet.add(ballast);
const tieCount = Math.round(TRACK_L * 2 / TIE);
const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(1.25, 0.05, 0.16), new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 1 }), tieCount);
const m4 = new THREE.Matrix4();
for (let i = 0; i < tieCount; i++) ties.setMatrixAt(i, m4.makeTranslation(0, 0.145, -TRACK_L + i * TIE));
ties.receiveShadow = true;
const tieSet = new THREE.Group(); tieSet.add(ties); trackSet.add(tieSet);
const railMat = new THREE.MeshStandardMaterial({ color: 0xa7abb0, roughness: 0.3, metalness: 0.85 });
for (const x of [-0.36, 0.36]) {
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, TRACK_L * 2), railMat);
  rail.position.set(x, 0.175, 0); rail.castShadow = true; rail.receiveShadow = true; trackSet.add(rail);
}
// Old-time telegraph poles with two wires running beside the line
const postSet = new THREE.Group(); trackSet.add(postSet);
const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b5139, roughness: 1 });
const insMat = new THREE.MeshStandardMaterial({ color: 0x7fa6b8, roughness: 0.3 });
for (let z = -TRACK_L; z <= TRACK_L; z += POST) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 8), woodMat); p.position.set(2.4, 1.7, z); p.castShadow = true; postSet.add(p);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.08), woodMat); arm.position.set(2.4, 3.2, z); postSet.add(arm);
  for (const x of [2.05, 2.75]) { const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8), insMat); ins.position.set(x, 3.29, z); postSet.add(ins); }
}
for (const x of [2.05, 2.75]) {
  const w = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, TRACK_L * 2), new THREE.MeshStandardMaterial({ color: 0x2a2a2a }));
  w.position.set(x, 3.34, 0); trackSet.add(w);
}

// ---------- Jasper Junction: the station the train departs from ----------
const stationSet = new THREE.Group(); trackSet.add(stationSet);
{
  const S = (c, r = 0.9) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const brick = S(0x9b5a43), trim = S(0xe8e2d0), roofM = S(0x3d4a52), plat = S(0xb8b2a6), yellow = S(0xd9b43a), green = S(0x2f5d4a);
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; stationSet.add(m); return m; };
  add(new THREE.BoxGeometry(2.7, 0.55, 16), plat, 2.25, 0.475, 0);                           // platform, top level with the cab floor
  add(new THREE.BoxGeometry(0.12, 0.012, 16), yellow, 0.98, 0.756, 0);                          // safety line
  add(new THREE.BoxGeometry(2.6, 2.2, 6), brick, 4.9, 1.85, -1);                                 // station house
  const roof = add(new THREE.CylinderGeometry(0.01, 1.85, 1.1, 4, 1), roofM, 4.9, 3.5, -1); roof.rotation.y = Math.PI / 4; roof.scale.set(1.05, 1, 2.3);
  add(new THREE.BoxGeometry(0.05, 1.1, 0.7), green, 3.58, 1.3, -1);                             // door
  for (const z of [-3, 1]) add(new THREE.BoxGeometry(0.05, 0.6, 0.8), S(0x2a3540, 0.2), 3.58, 1.75, z);   // windows
  for (const z of [-3, 1]) add(new THREE.BoxGeometry(0.07, 0.72, 0.92), trim, 3.57, 1.75, z);
  // canopy over the platform
  add(new THREE.BoxGeometry(2.6, 0.08, 10), roofM, 2.35, 3.05, 0);
  for (const z of [-4.5, -1.5, 1.5, 4.5]) add(new THREE.CylinderGeometry(0.05, 0.05, 2.3, 8), green, 1.45, 1.9, z);
  // name board
  const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 160;
  const g = sc.getContext('2d');
  const drawSign = () => {
    g.fillStyle = '#2f5d4a'; g.fillRect(0, 0, 1024, 160);
    g.strokeStyle = '#e8e2d0'; g.lineWidth = 10; g.strokeRect(10, 10, 1004, 140);
    g.fillStyle = '#e8e2d0'; g.font = '600 92px Karla, "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('JASPER JUNCTION', 512, 86);
  };
  drawSign();
  const signTex = new THREE.CanvasTexture(sc);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawSign(); signTex.needsUpdate = true; });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.66), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.8 }));
  sign.position.set(1.015, 3.42, 0); sign.rotation.y = -Math.PI / 2; stationSet.add(sign);
  const sign2 = sign.clone(); sign2.rotation.y = Math.PI / 2; sign2.position.x = 1.085; stationSet.add(sign2);
  add(new THREE.BoxGeometry(0.06, 0.4, 4.3), green, 1.05, 3.42, 0);
  // bench, lamp posts, clock
  add(new THREE.BoxGeometry(0.4, 0.06, 1.4), S(0x6b5139), 3.2, 1.2, 2.5);
  for (const z of [2, 3]) add(new THREE.BoxGeometry(0.4, 0.45, 0.06), S(0x2a2a2a), 3.2, 0.98, z);
  const lampOn = glow(new THREE.MeshStandardMaterial({ color: 0xf6e7b8, emissive: 0xffd88a, emissiveIntensity: 0.8 }), 0.8);
  for (const z of [-6.5, 6.5]) { add(new THREE.CylinderGeometry(0.04, 0.05, 2.2, 8), green, 1.4, 1.85, z); add(new THREE.SphereGeometry(0.13, 12, 10), lampOn, 1.4, 3.02, z); }
  const clockFace = new THREE.MeshStandardMaterial({ color: 0xf4efe2 });
  add(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 20).rotateZ(Math.PI / 2), clockFace, 1.43, 2.55, -3);
  add(new THREE.BoxGeometry(0.02, 0.18, 0.02), S(0x111111), 1.4, 2.6, -3); add(new THREE.BoxGeometry(0.02, 0.02, 0.14), S(0x111111), 1.4, 2.55, -2.95);
  // water tower for thirsty steam engines
  const tank = add(new THREE.CylinderGeometry(1.0, 1.0, 1.4, 20), S(0x7a5638), -3.0, 4.0, 7);
  add(new THREE.ConeGeometry(1.15, 0.6, 20), roofM, -3.0, 5.0, 7);
  for (const [x, z] of [[-3.6, 6.4], [-2.4, 6.4], [-3.6, 7.6], [-2.4, 7.6]]) add(new THREE.CylinderGeometry(0.07, 0.09, 3.3, 6), S(0x4a3a2c), x, 1.65, z);
  const spout = add(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 8), S(0x2a2a2a), -1.9, 3.7, 7); spout.rotation.z = 1.1;
  tank.castShadow = true;
}

export { POST, TIE, m4, postSet, stationSet, tieSet, trackSet };
