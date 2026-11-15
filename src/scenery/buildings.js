import * as THREE from 'three';
import { glow } from '../world/setup.js';
import { interSet, roadSet } from './road.js';
import { signTex } from '../people/people.js';

// ---------- roadside buildings ----------
// Each building is stacked from separate blocks so it can topple over and break apart in a crash.
// b (outer) sits at the road-facing wall; b.userData.pivot tips over sideways; blocks live under body.

const BLD = {
  barn:      { w: 4.2, d: 6.0, floors: [[2.4, 0xa63a2e]], roof: 'gambrel', roofC: 0x5a5f63, trim: 0xf2efe6 },
  farmhouse: { w: 3.8, d: 5.0, floors: [[1.6, 0xf2efe6], [1.5, 0xf2efe6]], roof: 'gable', roofC: 0x4d5257, trim: 0x2f5d4a },
  store:     { w: 3.8, d: 6.0, floors: [[2.4, 0xc9a26b]], roof: 'flat', roofC: 0x6b4f35, sign: ['GENERAL STORE', '#2f5d4a', '#f2efe6'], trim: 0x6b4f35 },
  tower:     { w: 4.4, d: 5.5, floors: [[1.6, 0x8fa6b8], [1.5, 0x8fa6b8], [1.5, 0x8fa6b8], [1.5, 0x8fa6b8], [1.5, 0x8fa6b8]], roof: 'flat', roofC: 0x55606a, glassy: true },
  toys:      { w: 4.0, d: 6.5, floors: [[2.2, 0xb0533c], [1.8, 0xb0533c]], roof: 'flat', roofC: 0x5c3a2c, sign: ['SKYRENDER TOYS', '#7a2430', '#f3efe6'], awning: 0x7a2430 },
  diner:     { w: 3.6, d: 6.0, floors: [[2.2, 0xd8dde0]], roof: 'flat', roofC: 0x9aa3a8, sign: ["JASPER'S DINER", '#c8202e', '#ffffff'], awning: 0x1f6b8a },
  warehouse: { w: 4.6, d: 7.0, floors: [[3.0, 0x9a8f80]], roof: 'flat', roofC: 0x6d655c, sign: ['JASPER JUNCTION FREIGHT', '#3a3f45', '#e8b93a'] }
};
const makeBuilding = kind => {
  const B = BLD[kind], S = (c, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const b = new THREE.Group(), pivot = new THREE.Group(), body = new THREE.Group(); b.add(pivot); pivot.add(body); body.position.x = -B.w / 2;
  const glass = S(0x24384a, 0.2), lit = glow(new THREE.MeshStandardMaterial({ color: 0x2a3a48, emissive: 0xffc870, emissiveIntensity: 0.15, roughness: 0.3 }), 0.15);
  const blocks = []; let y = 0;
  B.floors.forEach(([h, c], fi) => {
    const blk = new THREE.Group(); blk.position.y = y; body.add(blk); blocks.push(blk);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(B.w, h, B.d), S(c)); wall.position.y = h / 2; wall.castShadow = wall.receiveShadow = true; blk.add(wall);
    const nWin = Math.max(2, Math.floor(B.d / 1.3));
    for (let i = 0; i < nWin; i++) {
      const z = -B.d / 2 + (i + 0.5) * B.d / nWin;
      if (fi === 0 && i === Math.floor(nWin / 2)) {               // the door, facing the road
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.25, 0.8), S(kind === 'barn' ? B.trim : 0x3a2b20)); door.position.set(B.w / 2 + 0.01, 0.62, z); blk.add(door);
        continue;
      }
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, B.glassy ? h * 0.7 : 0.6, B.glassy ? B.d / nWin * 0.85 : 0.55), Math.random() < 0.35 ? lit : glass);
      win.position.set(B.w / 2 + 0.01, h * (B.glassy ? 0.5 : 0.58), z); blk.add(win);
    }
    if (B.trim && kind !== 'barn') { const t = new THREE.Mesh(new THREE.BoxGeometry(B.w + 0.08, 0.1, B.d + 0.08), S(B.trim)); t.position.y = h; blk.add(t); }
    if (kind === 'barn') for (const z of [-1.6, 1.6]) { const x1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 1.7), S(B.trim)); x1.position.set(B.w / 2 + 0.03, 0.9, z); x1.rotation.x = 0.7; blk.add(x1); const x2 = x1.clone(); x2.rotation.x = -0.7; blk.add(x2); }
    y += h;
  });
  const top = new THREE.Group(); top.position.y = y; body.add(top); blocks.push(top);
  if (B.roof === 'flat') { const r = new THREE.Mesh(new THREE.BoxGeometry(B.w + 0.2, 0.18, B.d + 0.2), S(B.roofC)); r.position.y = 0.09; r.castShadow = true; top.add(r);
    if (kind === 'tower') { const ac = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), S(0x9aa3a8)); ac.position.set(-0.6, 0.48, 0.8); top.add(ac); } }
  else {
    const rise = B.roof === 'gambrel' ? 1.8 : 1.3;
    const shape = new THREE.Shape();
    if (B.roof === 'gambrel') { shape.moveTo(-B.w / 2 - 0.15, 0); shape.lineTo(-B.w / 2 + 0.4, rise * 0.65); shape.lineTo(0, rise); shape.lineTo(B.w / 2 - 0.4, rise * 0.65); shape.lineTo(B.w / 2 + 0.15, 0); }
    else { shape.moveTo(-B.w / 2 - 0.2, 0); shape.lineTo(0, rise); shape.lineTo(B.w / 2 + 0.2, 0); }
    shape.closePath();
    const rg = new THREE.ExtrudeGeometry(shape, { depth: B.d + 0.3, bevelEnabled: false }); rg.translate(0, 0, -(B.d + 0.3) / 2);
    const r = new THREE.Mesh(rg, S(B.roofC)); r.castShadow = true; top.add(r);
  }
  if (B.sign) { const sg = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(B.d - 0.4, 4.2), 0.7), new THREE.MeshStandardMaterial({ map: signTex(...B.sign, 768, 128, 70), roughness: 0.7 }));
    sg.position.set(B.w / 2 + 0.03, B.floors[0][0] - 0.45, 0); sg.rotation.y = Math.PI / 2; blocks[0].add(sg); }
  if (B.awning) { const aw = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, B.d * 0.9), S(B.awning)); aw.position.set(B.w / 2 + 0.45, 1.6, 0); aw.rotation.z = -0.25; blocks[0].add(aw); }
  b.userData = { kind, pivot, body, blocks, w: B.w, d: B.d, h: y, lit };
  return b;
};
// Buildings on the right-hand side of each road. Groups slide past with the road and repeat every 120.
const BLD_PERIOD = 120;
const cBld = new THREE.Group(); roadSet.add(cBld);
const iBld = new THREE.Group(); interSet.add(iBld);
const iBldFar = new THREE.Group(); interSet.add(iBldFar);
const buildings = [];
[['barn', -40], ['store', 0], ['farmhouse', 40]].forEach(([k, z]) => { const b = makeBuilding(k); b.position.set(-4.4, 0, z); cBld.add(b); buildings.push({ b, set: roadSet, grp: cBld, z, walkX: -3.4 }); });
[['toys', -40], ['tower', 0], ['diner', 40]].forEach(([k, z]) => { const b = makeBuilding(k); b.position.set(-5.6, 0, z); iBld.add(b); buildings.push({ b, set: interSet, grp: iBld, z, walkX: -4.5 }); });
[['warehouse', -20], ['tower', 20], ['toys', 60]].forEach(([k, z]) => { const b = makeBuilding(k); b.position.set(13.2, 0, z); b.rotation.y = Math.PI; iBldFar.add(b); });
// interstate sidewalk in front of the shops
{ const sw = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 260), new THREE.MeshStandardMaterial({ color: 0xc4c0b6, roughness: 0.9 })); sw.position.set(-4.6, 0.03, 0); sw.receiveShadow = true; interSet.add(sw); }

export { BLD, BLD_PERIOD, buildings, cBld, iBld, iBldFar, makeBuilding };
