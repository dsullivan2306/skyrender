import * as THREE from 'three';
import { groundSet } from '../world/setup.js';
import { signTex } from '../people/people.js';
import { makeBuilding } from './buildings.js';

// ---------- the farm: a dirt lane, a plowed field, hay, a pasture with cows, a horse and pigs ----------
const farmSet = new THREE.Group(); groundSet.add(farmSet); farmSet.visible = false;
const FARM_P = 120;
const farmMove = new THREE.Group(); farmSet.add(farmMove);          // slides past as the tractor drives
const animals = [];
{
  const S = (c, r = 0.9) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const strip = (w, x, mat, y = 0.012, h = 0.024) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 260), mat); m.position.set(x, y, 0); m.receiveShadow = true; farmSet.add(m); return m; };
  strip(2.8, 0, S(0xa8875e));                                          // dirt farm lane
  strip(13, 8.2, S(0x6e4b2f));                                         // plowed field on the left
  const rows = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.1, 6), S(0x523620), 22 * 22);
  const m4b = new THREE.Matrix4(); let n = 0;
  for (let r = 0; r < 22; r++) for (let k = 0; k < 22; k++) rows.setMatrixAt(n++, m4b.makeTranslation(2.2 + r * 0.55, 0.05, -60 + k * 6 + (r % 2) * 0.5));
  rows.receiveShadow = true; farmMove.add(rows);
  // hay: round bales and square bales out in the field, a big stack by the barn
  const hayM = S(0xd9b45a), hayDark = S(0xb8913c), twine = S(0x8a6a3a);
  const roundBale = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0.55, z); g.rotation.y = ry; farmMove.add(g);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 20).rotateZ(Math.PI / 2), hayM); c.castShadow = true; g.add(c);
    for (const r of [0.2, 0.36, 0.5]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.02, 6, 24).rotateY(Math.PI / 2), hayDark); ring.position.x = 0.452; g.add(ring); const r2 = ring.clone(); r2.position.x = -0.452; g.add(r2); } };
  const squareBale = (x, y, z, ry) => { const g = new THREE.Group(); g.position.set(x, y + 0.22, z); g.rotation.y = ry; farmMove.add(g);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.44, 0.95), hayM); b.castShadow = true; g.add(b);
    for (const zz of [-0.25, 0.25]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.46, 0.03), twine); t.position.z = zz; g.add(t); } };
  [[4.5, -50, 0.3], [7, -42, 1.2], [10, -30, 0.1], [5, -12, 0.8], [8.5, 4, 1.6], [4.2, 18, 0.2], [11, 26, 0.9], [6.5, 44, 1.4], [9.5, 56, 0.5]].forEach(a => roundBale(...a));
  [[3.2, 0, -24, 0.1], [3.8, 0, -23, 1.5], [3.5, 0.44, -23.5, 0.8], [3.4, 0, 34, 0.2], [3.9, 0, 35, 1.6]].forEach(a => squareBale(...a));
  for (let i = 0; i < 9; i++) squareBale(-8.6 + (i % 3) * 0.55, Math.floor(i / 3) * 0.44, 12 - (i % 2) * 0.2, 0);
  // pasture fence on the right
  const wood = S(0x8a6a4a, 1);
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), wood, 40);
  for (let i = 0; i < 40; i++) posts.setMatrixAt(i, m4b.makeTranslation(-2.4, 0.5, -60 + i * 3));
  posts.castShadow = true; farmMove.add(posts);
  for (const y of [0.45, 0.85]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 120), wood); rail.position.set(-2.38, y, 0); farmMove.add(rail); }
  // barn, silo and the farmhouse
  const barn = makeBuilding('barn'); barn.position.set(-6.0, 0, 18); barn.scale.setScalar(1.25); farmMove.add(barn);
  const silo = new THREE.Group(); silo.position.set(-7.8, 0, 9.5); farmMove.add(silo);
  const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 5.2, 20), S(0xc9c4b8, 0.6)); sc.position.y = 2.6; sc.castShadow = true; silo.add(sc);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.92, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), S(0x8a9096, 0.4)); dome.position.y = 5.2; silo.add(dome);
  for (const y of [1, 2, 3, 4]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.91, 0.03, 6, 24).rotateX(Math.PI / 2), S(0x7d8286)); b.position.y = y; silo.add(b); }
  const house = makeBuilding('farmhouse'); house.position.set(-5.5, 0, -40); farmMove.add(house);
  // mud pen for the pigs
  const mud = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24), S(0x5a4026, 0.6)); mud.rotation.x = -Math.PI / 2; mud.position.set(-5.2, 0.03, -14); farmMove.add(mud);
  // sign at the gate
  const signG = new THREE.Group(); signG.position.set(-1.9, 0, 40); farmMove.add(signG);
  for (const z of [-0.8, 0.8]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.0, 0.1), wood); p.position.set(0, 1.0, z); signG.add(p); }
  const sb = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.55), new THREE.MeshStandardMaterial({ map: signTex("JASPER'S FARM", '#7a2430', '#f3efe6', 640, 190, 84), side: THREE.DoubleSide, roughness: 0.8 }));
  sb.position.set(0.06, 1.7, 0); sb.rotation.y = Math.PI / 2; signG.add(sb);
}
// ----- animals: simple blocky critters that graze, trot and wiggle -----
const critter = (kind) => {
  const S = (c, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const g = new THREE.Group(), legs = [];
  const D = { cow: { L: 1.5, W: 0.62, H: 0.62, leg: 0.6, c: 0xf2f0ea, head: 0xf2f0ea }, horse: { L: 1.5, W: 0.5, H: 0.6, leg: 0.85, c: 0x7a4a2a, head: 0x7a4a2a }, pig: { L: 0.85, W: 0.5, H: 0.45, leg: 0.2, c: 0xf0a8b0, head: 0xf0a8b0 } }[kind];
  const body = new THREE.Mesh(new THREE.BoxGeometry(D.W, D.H, D.L), S(D.c)); body.position.y = D.leg + D.H / 2; body.castShadow = true; g.add(body);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const lp = new THREE.Group(); lp.position.set(x * (D.W / 2 - 0.08), D.leg, z * (D.L / 2 - 0.12)); g.add(lp); legs.push(lp);
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, D.leg, 0.12), S(kind === 'pig' ? 0xe0909a : D.c)); l.position.y = -D.leg / 2; lp.add(l);
    const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.13), S(kind === 'pig' ? 0xb06a72 : 0x2a2420)); hoof.position.y = -D.leg + 0.04; lp.add(hoof);
  }
  const neck = new THREE.Group(); neck.position.set(0, D.leg + D.H * 0.7, D.L / 2); g.add(neck);
  const head = new THREE.Group(); neck.add(head);
  if (kind === 'cow') {
    for (const [x, y, z, w, h, d] of [[0.18, 0.12, 0.3, 0.3, 0.3, 0.4], [-0.2, -0.05, -0.2, 0.25, 0.35, 0.5], [0.1, 0.2, -0.55, 0.4, 0.2, 0.3]]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), S(0x1d1d1d)); sp.position.set(x > 0 ? D.W / 2 - w / 2 + 0.01 : -D.W / 2 + w / 2 - 0.01, D.leg + D.H / 2 + y, z); g.add(sp); }
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.5), S(D.head)); hd.position.set(0, 0, 0.22); head.add(hd);
    const muz = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.12), S(0xe8a0a0)); muz.position.set(0, -0.08, 0.5); head.add(muz);
    for (const x of [-0.17, 0.17]) { const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 8), S(0xe8e0c8)); horn.position.set(x, 0.27, 0.12); head.add(horn); const ear = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.1), S(0x1d1d1d)); ear.position.set(x * 1.4, 0.12, 0.1); head.add(ear); }
    const udder = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), S(0xe8a0a0)); udder.position.set(0, D.leg - 0.02, -0.3); g.add(udder);
  } else if (kind === 'horse') {
    neck.rotation.x = -0.7;
    const nk = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.75, 0.3), S(D.c)); nk.position.set(0, 0.32, 0.05); head.add(nk);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.55), S(D.c)); hd.position.set(0, 0.62, 0.32); hd.rotation.x = 0.7; head.add(hd);
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.12), S(0x2a1a10)); mane.position.set(0, 0.36, -0.12); head.add(mane);
    for (const x of [-0.08, 0.08]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6), S(D.c)); ear.position.set(x, 0.8, 0.12); head.add(ear); }
  } else {
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.3), S(D.head)); hd.position.set(0, -0.05, 0.08); head.add(hd);
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12).rotateX(Math.PI / 2), S(0xe07f8a)); snout.position.set(0, -0.08, 0.26); head.add(snout);
    for (const x of [-0.03, 0.03]) { const n = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.02), S(0x6a3038)); n.position.set(x, -0.08, 0.305); head.add(n); }
    for (const x of [-0.12, 0.12]) { const ear = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.04), S(0xe07f8a)); ear.position.set(x, 0.15, 0.05); ear.rotation.x = 0.5; head.add(ear); }
  }
  for (const x of [-1, 1]) { const eye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.03), S(0x111111)); eye.position.set(x * (kind === 'pig' ? 0.1 : 0.14), kind === 'horse' ? 0.7 : 0.08, kind === 'horse' ? 0.42 : kind === 'pig' ? 0.21 : 0.48); head.add(eye); }
  const tail = new THREE.Group(); tail.position.set(0, D.leg + D.H * 0.8, -D.L / 2); g.add(tail);
  if (kind === 'pig') { const ct = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 12, Math.PI * 1.6), S(0xe07f8a)); ct.position.z = -0.03; tail.add(ct); }
  else { const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, kind === 'horse' ? 0.7 : 0.55, 0.06), S(kind === 'horse' ? 0x2a1a10 : D.c)); tl.position.y = -0.3; tail.add(tl); }
  g.userData = { kind, legs, neck, tail, hop: 0 };
  return g;
};
[['cow', -4.5, 2, 0.4], ['cow', -6.5, -4, 2.2], ['cow', -4.2, 26, -1], ['horse', -5.5, -26, 1.2], ['horse', -7, 32, 2.8], ['pig', -5.0, -13, 0], ['pig', -5.8, -14.8, 2], ['pig', -4.6, -15.2, 4]].forEach(([k, x, z, a], i) => {
  const c = critter(k); c.position.set(x, 0, z); c.rotation.y = a; farmMove.add(c);
  animals.push({ c, x0: x, z0: z, a0: a, ph: i * 1.7 });
});

export { FARM_P, animals, farmMove, farmSet };
