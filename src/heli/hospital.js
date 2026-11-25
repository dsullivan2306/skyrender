import * as THREE from 'three';
import { renderer } from '../world/setup.js';
import { makePerson, signTex, walkPose } from '../people/people.js';
import { sfx } from '../audio/audio.js';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Inside Jasper Hospital. His idea: "Whenever helicopter land on the ground of the hospital there will be a button that
// will allow the helicopter to be able to fly in the hospital there will be some stuff in the hospital that is going to
// be used as hospital stuff". Skyrender shrinks to the size of a toy (its wind is then as soft as a fan's, so nobody
// is blown about), so in here one meter is about 7 units and everything looks huge. He flies with the same controls,
// and lands on things to use them. Its own scene. Functions
// only; heli.js builds it the first time Jasper goes in. The front doors are at z = 0 and the hall runs to z = 104.
const HALF = 48, END = 104, CEIL = 26, WEIGHT = 42;
const DOOR = { x: 0, z: 9 }, LIFT = { x: -34, z: 9 };         // where he comes in: the front doors, or the roof elevator
const ROTOR = 4.8;                                            // how much room the blades need on every side

function buildHospital(h, C, say, flyerOf, hideForXray) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xcfd3cd);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xe2dccf, 0.68), key = new THREE.DirectionalLight(0xfff6e6, 0.36);
  key.position.set(5, 22, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 48 }); key.shadow.bias = -0.001;
  const fill = new THREE.DirectionalLight(0xdfe9f2, 0.2); fill.position.set(-8, 9, -10);
  scene.add(hemi, key, key.target, fill);
  const set = new THREE.Group(); scene.add(set);              // the whole building slides by under Skyrender, like the valley does
  const M = (c, r = 0.85, m = 0, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...o });
  const B = (w, hh, d) => new THREE.BoxGeometry(w, hh, d);
  const add = (geo, mat, x, y, z, parent = set) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  // things that never move are collected by paint and joined at the end, so they draw at once
  const bins = new Map();
  const st = (geo, mat, x, y, z, ry = 0, rx = 0, rz = 0) => { const g = geo.clone(); g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz))); g.translate(x, y, z); if (!bins.has(mat)) bins.set(mat, []); bins.get(mat).push(g); };
  const white = M(0xf2f0ea), wall = M(0xe9e4d8, 0.95), wall2 = M(0xd9dfd8, 0.95), floorM = M(0xaeb5ab, 0.8), maroon = M(0x7a2430, 0.7), steel = M(0xa8aeb3, 0.35, 0.55), dark = M(0x2c3135, 0.7), black = M(0x1b1d1f, 0.7), wood = M(0xb89468, 0.8), sheet = M(0xbcd2e2, 0.95), sage = M(0x8fa58c, 0.85), cream = M(0xf4e9c9, 0.9), ceilM = M(0xeceae4, 1);
  const panelM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff8ea, emissiveIntensity: 0.75 });
  const glassM = new THREE.MeshStandardMaterial({ color: 0xcfe6ee, transparent: true, opacity: 0.22, roughness: 0.1, depthWrite: false });

  // ---------- the building: floor, walls you can see in through from behind, ceiling lights ----------
  const plane = (w, d, mat, x, y, z, ry = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; set.add(m); return m; };
  plane(HALF * 2 + 40, END + 90, floorM, 0, 0, END / 2 + 5, 0, -Math.PI / 2);
  const ceil = plane(HALF * 2, END, ceilM, 0, CEIL, END / 2, 0, Math.PI / 2); ceil.receiveShadow = false;
  for (const s of [-1, 1]) { plane(END, CEIL, wall, s * HALF, CEIL / 2, END / 2, -s * Math.PI / 2); plane(END, 1.2, maroon, s * (HALF - 0.06), 6.4, END / 2, -s * Math.PI / 2); }
  plane(HALF * 2, CEIL, wall, 0, CEIL / 2, 0, 0);                                   // the front wall, seen from inside
  plane(HALF * 2, 1.2, maroon, 0, 6.4, 0.06, 0);
  for (const s of [-1, 1]) plane(32, CEIL, wall, s * 32, CEIL / 2, END - 2, Math.PI);   // the far ends of the rooms
  for (let z = 8; z < END; z += 16) for (const x of [-32, 0, 32]) st(B(7, 0.3, 4), panelM, x, CEIL - 0.1, z);
  for (let z = 0; z <= END; z += 8) st(B(HALF * 2, 0.02, 0.06), sage, 0, 0.012, z);
  for (const s of [-1, 1]) for (const z of [30, 66, END - 2]) st(B(2, CEIL, 2), wall2, s * 17, CEIL / 2, z);
  // walls between rooms. When one is between the camera and Skyrender, it fades so you can still see.
  const parts = [];
  for (const [x0, x1, z] of [[18, 48, 30], [-48, -18, 30], [18, 48, 66], [-48, -18, 66]]) {
    const mat = M(0xe9e4d8, 0.95, 0, { transparent: true }), rail = M(0x7a2430, 0.7, 0, { transparent: true }), g = new THREE.Group(); set.add(g);
    add(B(x1 - x0, CEIL, 0.8), mat, (x0 + x1) / 2, CEIL / 2, z, g); add(B(x1 - x0, 1.2, 0.9), rail, (x0 + x1) / 2, 6.4, z, g);
    parts.push({ x0, x1, z, mat, rail, k: 1 });
  }
  // colored lines on the floor to follow, as real hospitals have
  const line = (c, ...pts) => { const m = M(c, 0.8); for (let i = 1; i < pts.length; i++) { const [ax, az] = pts[i - 1], [bx, bz] = pts[i]; st(B(Math.abs(bx - ax) + 0.7, 0.03, Math.abs(bz - az) + 0.7), m, (ax + bx) / 2, 0.03, (az + bz) / 2); } };
  line(0x7a2430, [-3, 4], [-3, 48], [-27, 48]); line(0x4f86a6, [-1, 4], [-1, 82], [-32, 82]); line(0x7d9a4f, [1, 4], [1, 52], [24, 52]); line(0xd9a53a, [3, 4], [3, 84], [22, 84]);
  const sign = (t, c, x, y, z, w = 15, ry = Math.PI) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 3), new THREE.MeshStandardMaterial({ map: signTex(t, c, '#f6f3ec', 640, 128, 72), roughness: 0.8 })); m.position.set(x, y, z); m.rotation.y = ry; set.add(m); st(B(0.2, 3, 0.2), steel, x - 5, y + 3, z + 0.1); st(B(0.2, 3, 0.2), steel, x + 5, y + 3, z + 0.1); return m; };
  sign('X-RAY', '#7a2430', -27, 20.5, 31.4); sign('LAB', '#3f6d88', -27, 20.5, 67.4); sign('GRANDPA’S ROOM', '#64803c', 28, 20.5, 31.4, 17); sign('BABIES', '#b5832a', 27, 20.5, 67.4); sign('MRI  STAY BACK', '#2c3135', 0, 21.5, END - 0.8, 18);
  sign('WELCOME', '#7a2430', 34, 18, 29.4, 15);

  // ---------- what you can land on, and what keeps you back ----------
  const tops = [], solids = [];
  const top = (id, x, z, w, d, y, line, o = {}) => { const s = { id, x, z, w, d, y, line, ...o }; tops.push(s); return s; };
  const keep = (x, z, r, w = 0, d = 0) => { const s = { x, z, r, w, d }; solids.push(s); return s; };
  for (const p of parts) keep((p.x0 + p.x1) / 2, p.z, 0.4, (p.x1 - p.x0) / 2, 0);
  for (const s of [-1, 1]) keep(s * 17, END - 2, 1);
  const person = (o, x, z, ry) => { const p = makePerson(o); p.scale.setScalar(10); p.position.set(x, 0, z); p.rotation.y = ry; set.add(p); return p; };
  const scrubs = c => ({ shirt: c, pants: c });

  // the front doors and the roof elevator
  const doorM = new THREE.MeshStandardMaterial({ color: 0xa9cddd, roughness: 0.15, transparent: true, opacity: 0.8 }), outM = new THREE.MeshBasicMaterial({ color: 0xbfe0c0 });
  plane(17, 15, outM, 0, 7.5, 0.05); const frontDoors = [-1, 1].map(s => { const m = plane(8.4, 15, doorM, s * 4.2, 7.5, 0.12); m.userData.s = s; return m; });
  plane(18.4, 0.9, maroon, 0, 15.4, 0.3); for (const s of [-1, 1]) plane(0.9, 15.6, maroon, s * 8.9, 7.8, 0.3);
  plane(15, 15, M(0x8d938f), LIFT.x, 7.5, 0.05); const liftDoors = [-1, 1].map(s => { const m = plane(7.4, 15, steel, LIFT.x + s * 3.7, 7.5, 0.12); m.userData.s = s; return m; });
  plane(16.4, 0.9, dark, LIFT.x, 15.4, 0.3); for (const s of [-1, 1]) plane(0.9, 15.6, dark, LIFT.x + s * 7.9, 7.8, 0.3);
  const es = new THREE.Mesh(new THREE.PlaneGeometry(13, 2.4), new THREE.MeshStandardMaterial({ map: signTex('ROOF ELEVATOR', '#2c3135', '#f6f3ec', 640, 118, 66) })); es.position.set(LIFT.x, 18.2, 0.4); set.add(es);
  for (const p of [DOOR, LIFT]) st(B(10, 0.05, 9), sage, p.x, 0.03, p.z - 2);

  // the front desk
  top('desk', 34, 16, 20, 7, 8, 'Landed on the front desk! Everybody who comes in stops here first'); st(B(20, 8, 7), wood, 34, 4, 16); st(B(20.6, 0.5, 7.6), white, 34, 7.85, 16); st(B(20.2, 1, 0.3), maroon, 34, 5, 12.4);
  st(B(4, 2.6, 0.4), black, 41, 9.8, 18.4, 0.2); st(B(0.6, 1, 0.6), black, 41, 8.4, 18.6); st(new THREE.CylinderGeometry(0.7, 0.7, 2, 12), white, 26, 9, 14); st(B(0.4, 0.5, 1.2), maroon, 26, 10.2, 13.7);
  const clerk = person({ ...scrubs(0x6c7f96), skin: 0x8c5a3c, hair: 0x2d2a26 }, 34, 26, Math.PI); keep(34, 26, 2);
  top('chairs', 33, 4.6, 22, 5, 3.4, 'Landed on the waiting room chairs'); for (let k = 0; k < 4; k++) { st(B(4.6, 0.8, 4.6), maroon, 25 + k * 5.4, 3, 4.6); st(B(4.6, 5, 0.6), maroon, 25 + k * 5.4, 5.6, 2.4); for (const s of [-1, 1]) st(B(0.3, 3, 3.6), steel, 25 + k * 5.4 + s * 1.9, 1.5, 4.6); }

  // the scale: a big flat floor scale, the kind a wheelchair can roll onto
  top('scale', -36, 20, 11, 10, 0.7, 'On the scale! Slide Lift up slowly and watch the number'); st(B(11, 0.7, 10), steel, -36, 0.35, 20); st(B(10, 0.1, 9), dark, -36, 0.7, 20); st(B(0.8, 4, 0.8), steel, -36, 2, 27.4);
  const canvas = (w, hh) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; return { c, g: c.getContext('2d'), t }; };
  const screen = (w, hh, cv, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ map: cv.t })); m.position.set(x, y, z); m.rotation.y = ry; set.add(m); return m; };
  const dial = canvas(256, 128); st(B(9.6, 5.4, 0.6), dark, -36, 6.4, 27.5); screen(9, 4.6, dial, -36, 6.4, 27.15, Math.PI);

  // a rolling bed, and the porter who pushes it
  const bedLoop = [[-14, 16], [0, 30], [0, 88], [0, 30], [-14, 16]], gurney = new THREE.Group(); set.add(gurney);
  add(B(7, 0.7, 15), white, 0, 5.3, 0, gurney); add(B(6.6, 0.4, 14.4), sheet, 0, 5.8, 0, gurney); add(B(5.6, 0.5, 3), cream, 0, 6.0, -5.4, gurney); add(B(6, 0.5, 12), steel, 0, 2.2, 0, gurney);
  for (const s of [-1, 1]) { add(B(0.25, 1.4, 12), steel, s * 3.6, 5.4, 0, gurney); for (const z of [-6, 6]) { add(B(0.4, 4.6, 0.4), steel, s * 2.8, 2.8, z, gurney); add(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 14).rotateZ(Math.PI / 2), black, s * 2.8, 0.8, z, gurney); } }
  const bedTop = top('bed', -14, 16, 8, 14, 6, 'Landed on a rolling bed. Tap Ride the bed!');
  const porter = person({ ...scrubs(0x3f8a86), skin: 0xd9a47a, hair: 0x6b4a2a }, -14, 5.5, 0), porterKeep = keep(-14, 5.5, 2);

  // X-ray room: a table, and a C-shaped arm that swings around it
  top('xray', -32, 46, 9, 15, 6, 'Landed on the X-ray table. Tap Take an X-ray!'); st(B(7.4, 0.8, 16), white, -32, 5.55, 46); st(B(6.4, 0.1, 15), dark, -32, 5.97, 46); st(B(3, 5.2, 4), steel, -32, 2.6, 46);
  st(B(1, 0.08, 22), steel, -38, 0.05, 50); st(B(1, 0.08, 22), steel, -26, 0.05, 50);
  const arm = new THREE.Group(); arm.position.set(-32, 9.6, 58); set.add(arm); const cArm = new THREE.Group(); arm.add(cArm);
  add(new THREE.TorusGeometry(10, 0.8, 10, 40, Math.PI * 1.06).rotateZ(Math.PI / 2 - 0.1), white, 0, 0, 0, cArm); add(new THREE.CylinderGeometry(2, 2.6, 2.4, 20), dark, 0, 9, 0, cArm); add(B(6.4, 1.4, 6.4), steel, 0, -9, 0, cArm);
  add(B(2.2, 9, 3), white, -11.4, -5, 0, arm); add(B(5, 1, 6), dark, -11.4, -9.2, 0, arm);
  keep(-43.5, 58, 3); st(B(0.5, 14, 9), white, -40.6, 7, 60); st(B(0.6, 4, 5), glassM, -40.55, 11.6, 60);     // the thick lead wall the helper stands behind
  const tech = person({ ...scrubs(0x7a3b34), skin: 0x6b4630, hair: 0x1d1b19 }, -44, 60, Math.PI * 0.62);
  const film = canvas(640, 448); st(B(0.6, 13.4, 18.4), dark, -47.6, 12.4, 46); screen(17.2, 12, film, -47.25, 12.4, 46, Math.PI / 2);
  // a lead apron on a hook, and a poster of bones
  st(B(0.5, 6, 4), M(0x4f86a6, 0.9), -47.3, 9, 35); st(B(0.6, 0.5, 4.4), steel, -47.3, 12.3, 35);

  // Grandpa's room: a bed that sits him up, a heart monitor, a drip, and a table to land on
  const rx = 38, rz = 41;
  st(B(17, 0.8, 8), white, rx, 4.6, rz); st(B(13, 2, 6), steel, rx, 2.4, rz); for (const s of [-1, 1]) for (const q of [-1, 1]) st(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 14).rotateX(Math.PI / 2), black, rx + s * 7, 0.8, rz + q * 3);
  st(B(10, 0.9, 7.4), sheet, rx - 3.4, 5.4, rz); st(B(0.7, 5, 8.2), wood, rx + 8.6, 6, rz); st(B(0.7, 2.6, 8.2), wood, rx - 8.6, 5, rz);
  const back = new THREE.Group(); back.position.set(rx + 1.8, 5.3, rz); set.add(back); add(B(7.4, 0.9, 7.4), sheet, 3.7, 0, 0, back); add(B(3, 1.2, 5.4), white, 5.4, 0.9, 0, back);
  const gpHip = new THREE.Group(); gpHip.position.set(rx + 1.4, 6.9, rz); gpHip.rotation.y = -Math.PI / 2; set.add(gpHip); const gpTilt = new THREE.Group(); gpHip.add(gpTilt);
  const gramps = makePerson({ shirt: 0xa9c2c9, pants: 0xa9c2c9, skin: 0xe2b48c, hair: 0xe9e6e0 }); gramps.scale.setScalar(10); gramps.position.y = -5; gpTilt.add(gramps); for (const l of gramps.userData.legs) l.children[1].visible = false;      // no shoes in bed
  st(B(7.6, 1.6, 7), sage, rx - 2.6, 6.6, rz);                                       // the blanket over his legs
  top('gramps', rx, rz, 19, 10, 9.5, '', { hold: 'Not on the bed, Grandpa is resting there. Land on the round table' });
  top('table', 29, 54, 10, 10, 7.4, 'Landed on Grandpa\'s table. He is so happy to have a visitor!'); st(new THREE.CylinderGeometry(5, 5, 0.7, 32), wood, 29, 7.05, 54); st(new THREE.CylinderGeometry(0.6, 0.6, 6.8, 12), steel, 29, 3.4, 54); st(new THREE.CylinderGeometry(3, 3.2, 0.4, 24), steel, 29, 0.2, 54);
  const ecg = canvas(256, 160); st(B(0.8, 6.2, 8.6), dark, 46.6, 15, 50); screen(7.8, 5.2, ecg, 46.15, 15, 50, -Math.PI / 2); st(B(0.5, 12, 0.5), steel, 46.8, 6, 50);
  st(new THREE.CylinderGeometry(0.15, 0.15, 16, 8), steel, 45.6, 8, 35); st(B(1, 2.6, 1.8), glassM, 45.6, 14.6, 35.6); st(new THREE.CylinderGeometry(1.8, 1.8, 0.3, 14), steel, 45.6, 0.2, 35);
  const skyM = new THREE.MeshBasicMaterial({ color: 0x9cc6e2 }), hillM = new THREE.MeshBasicMaterial({ color: 0x8aa96a });
  for (const z of [60, 88, 96]) { plane(9, 10, skyM, HALF - 0.05, 14.5, z, -Math.PI / 2); plane(9, 3.2, hillM, HALF - 0.1, 11, z, -Math.PI / 2); for (const q of [-1, 0, 1]) st(B(0.3, 10.4, 0.4), white, HALF - 0.2, 14.5, z + q * 4.6); for (const y of [9.4, 19.6]) st(B(0.3, 0.5, 9.6), white, HALF - 0.2, y, z); }
  const curtain = []; for (const [x, z] of [[24, 35], [24, 37.4], [24, 39.8], [24, 42.2]]) { const g = new THREE.Group(); g.position.set(x, 20, z); set.add(g); add(new THREE.CylinderGeometry(1.25, 1.25, 15, 10, 1, true), M(0xc7d6c4, 0.95, 0, { side: THREE.DoubleSide }), 0, -7.5, 0, g); curtain.push(g); } st(B(0.3, 0.3, 12), steel, 24, 20.2, 38.6);
  keep(24, 38.6, 1, 0, 4);
  const inbox = new THREE.Group(); inbox.position.set(45.4, 9, 61); set.add(inbox);

  // the lab, and the mail tubes that run across the ceiling
  top('tube', -36, 82, 11, 10, 7, 'Landed at the mail tubes. Tap Send medicine!'); st(B(11, 0.8, 10), white, -36, 6.6, 82); st(B(9, 6.2, 8), wall2, -36, 3.1, 82); st(B(3.4, 11, 5), steel, -45, 5.5, 82); st(B(3.5, 4, 3.4), dark, -44.95, 8, 82);
  top('bench', -31, 97.4, 24, 6, 7, 'Landed on the lab bench, next to the microscope'); st(B(24, 0.7, 6), white, -31, 6.65, 97.4); st(B(23, 6.3, 5), wall2, -31, 3.15, 97.6);
  st(B(2, 0.6, 3), black, -40, 7.3, 98); st(B(0.8, 4, 0.8), black, -40, 9, 99, 0, -0.1); st(new THREE.CylinderGeometry(0.5, 0.4, 3, 12), steel, -40, 10, 97.6, 0, 0.35); for (let k = 0; k < 5; k++) { st(new THREE.CylinderGeometry(0.35, 0.35, 2, 10), [maroon, cream, sage, sheet, maroon][k], -22.4 + k * 1, 8, 99); } st(B(5.6, 0.8, 1.2), wood, -20.4, 7.4, 99);
  const labber = person({ shirt: 0xf2f0ea, pants: 0x4a5560, skin: 0xf0c8a0, hair: 0xa9805a }, -45, 92, Math.PI * 0.6); keep(-45, 92, 2);
  const corner = (a, b, c) => { const p = a.clone().sub(b).setLength(2.2).add(b), q = c.clone().sub(b).setLength(2.2).add(b); return [p, p.clone().lerp(b, 0.5).lerp(q, 0.14), q.clone().lerp(b, 0.5).lerp(p, 0.14), q]; };
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z), raw = [V3(-45, 10, 82), V3(-45, 24, 82), V3(-8, 24, 82), V3(-8, 24, 61), V3(45.4, 24, 61), V3(45.4, 11, 61)];
  const pts = [raw[0]]; for (let i = 1; i < raw.length - 1; i++) { const prev = raw[i - 1], n = Math.floor(prev.distanceTo(raw[i]) / 12); for (let q = 1; q < n; q++) pts.push(prev.clone().lerp(raw[i], q / n)); pts.push(...corner(raw[i - 1], raw[i], raw[i + 1])); } pts.push(raw[raw.length - 1]);
  const mailPath = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const pipe = new THREE.Mesh(new THREE.TubeGeometry(mailPath, 160, 0.95, 12), new THREE.MeshStandardMaterial({ color: 0xbfe0ea, transparent: true, opacity: 0.34, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide })); set.add(pipe);
  const capsule = new THREE.Group(); set.add(capsule); add(new THREE.CylinderGeometry(0.6, 0.6, 2.2, 16), maroon, 0, 0, 0, capsule); for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.6, 14, 8), white, 0, s * 1.1, 0, capsule); capsule.visible = false;
  add(B(4, 2, 4), wood, 0, -2.4, 0, inbox); add(B(4.2, 0.4, 4.2), maroon, 0, -1.3, 0, inbox); st(B(0.6, 6.6, 0.6), steel, 45.4, 3.3, 61);

  // the babies
  const cribs = [[42, 72], [42, 80], [42, 88], [42, 96]].map(([x, z], i) => {
    st(B(8, 0.5, 5.4), glassM, x, 5.8, z); for (const s of [-1, 1]) { st(B(8, 2.4, 0.2), glassM, x, 7, z + s * 2.7); st(B(0.2, 2.4, 5.4), glassM, x + s * 4, 7, z); st(B(0.4, 5.6, 0.4), steel, x + s * 3.4, 2.8, z); } st(B(8, 3, 5), white, x, 3.6, z); st(B(7.4, 0.6, 5), cream, x, 6, z);
    const g = new THREE.Group(); g.position.set(x, 6.6, z); set.add(g); const skin = M([0xf0c8a0, 0x8c5a3c, 0xd9a47a, 0x6b4630][i]);
    add(new THREE.SphereGeometry(1.15, 16, 12), skin, 1.9, 1.5, 0, g); add(new THREE.SphereGeometry(1.2, 14, 8, 0, Math.PI * 2, 0, 1.1), M([0x7a2430, 0x4f86a6, 0xd9a53a, 0x7d9a4f][i]), 2.05, 1.65, 0, g).rotation.z = -0.5;
    const body = add(new THREE.SphereGeometry(1.5, 16, 10).scale(1.6, 0.5, 1), M([0xe8c9c4, 0xc4d7e4, 0xf0e0b4, 0xcfdcc0][i], 1), -0.6, 0.3, 0, g);
    const eyes = [-1, 1].map(s => add(B(0.1, 0.34, 0.24), black, 0.8, 1.72, s * 0.42, g));
    top('crib' + i, x, z, 10, 7.4, 11, '', { hold: 'Just look, the babies need their beds. Land on the soft mat' });
    return { g, body, eyes, open: 0 };
  });
  top('mat', 28, 84, 11, 10, 6.6, 'Landed in the baby room. Shh!'); st(B(11, 6, 10), wood, 28, 3, 84); st(B(10.6, 0.7, 9.6), sheet, 28, 6.25, 84);
  const mobile = new THREE.Group(); mobile.position.set(41, 16, 84); set.add(mobile); add(new THREE.TorusGeometry(4, 0.16, 8, 28).rotateX(Math.PI / 2), wood, 0, 0, 0, mobile); st(B(0.12, 10, 0.12), steel, 41, 21, 84);
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, x = Math.cos(a) * 4, z = Math.sin(a) * 4; add(B(0.06, 2.6, 0.06), steel, x, -1.3, z, mobile); add(k % 2 ? new THREE.SphereGeometry(0.8, 12, 8) : new THREE.OctahedronGeometry(1), [maroon, cream, sheet][k % 3], x, -3, z, mobile); }
  const nurse = person({ ...scrubs(0xb9859a), skin: 0xd9a47a, hair: 0x2d2a26 }, 24, 97, -Math.PI * 0.75); keep(24, 97, 2);

  // the MRI, behind its window: a giant magnet that is never switched off
  for (const s of [-1, 1]) st(B(5, CEIL, 0.8), wall2, s * 14, CEIL / 2, END); st(B(23, 4, 0.8), wall2, 0, 2, END); st(B(23, 7, 0.8), wall2, 0, CEIL - 3.5, END);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(23, 15), glassM); win.position.set(0, 11.5, END); win.rotation.y = Math.PI; set.add(win);
  plane(46, CEIL, wall2, 0, CEIL / 2, END + 34, Math.PI); for (const s of [-1, 1]) plane(34, CEIL, wall2, s * 23, CEIL / 2, END + 17, -s * Math.PI / 2);
  st(new THREE.TorusGeometry(6, 3.2, 18, 44), white, 0, 10, END + 18); st(new THREE.CylinderGeometry(9, 9, 9, 40, 1, true).rotateX(Math.PI / 2), white, 0, 10, END + 22); st(B(5, 0.8, 16), sheet, 0, 6.4, END + 13); st(B(4, 6, 12), white, 0, 3, END + 12);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.25, 8, 40), new THREE.MeshStandardMaterial({ color: 0xbfe6f2, emissive: 0x6fc7e0, emissiveIntensity: 0.8 })); halo.position.set(0, 10, END + 15.4); set.add(halo);
  const yellow = M(0xe0b23a); for (let k = -15; k < 16; k += 3) st(B(2, 0.04, 1.4), yellow, k, 0.03, 93);
  const magTech = person({ ...scrubs(0x56647a), skin: 0xe2b48c, hair: 0x6b4a2a }, 9, END + 6, Math.PI);

  for (const [mat, list] of bins) {
    const m = new THREE.Mesh(BufferGeometryUtils.mergeBufferGeometries(list.map(g => g.index ? g.toNonIndexed() : g)), mat);
    m.castShadow = mat !== glassM && mat !== panelM; m.receiveShadow = mat !== panelM; if (mat === glassM) m.renderOrder = 2; set.add(m);
  }

  // ---------- flying in here ----------
  function ground(x, z) {
    let best = { y: 0, kind: 'floor', place: null, line: '' };
    for (const s of tops) if (Math.abs(x - s.x) < s.w / 2 && Math.abs(z - s.z) < s.d / 2 && s.y > best.y) best = { y: s.y, kind: s.hold ? 'hold' : 'pad', place: s.id, line: s.line, hold: s.hold };
    return best;
  }
  // walls and people: the blades need room, so a cushion of air keeps Skyrender back
  function bound(dt) {
    const push = (nx, nz, d) => { h.x += nx * d; h.z += nz * d; const v = h.vx * nx + h.vz * nz; if (v < 0) { h.vx -= v * nx; h.vz -= v * nz; } };
    const lim = HALF - ROTOR, x0 = h.x, z0 = h.z;
    if (h.x > lim) push(-1, 0, h.x - lim); if (h.x < -lim) push(1, 0, -lim - h.x);
    if (h.z < ROTOR) push(0, 1, ROTOR - h.z);
    const far = Math.abs(h.x) < 17 ? 91 : END - 2 - ROTOR; if (h.z > far) push(0, -1, h.z - far);
    for (const s of solids) {
      const px = Math.max(s.x - s.w, Math.min(s.x + s.w, h.x)), pz = Math.max(s.z - s.d, Math.min(s.z + s.d, h.z)), dx = h.x - px, dz = h.z - pz, d = Math.hypot(dx, dz), need = ROTOR + s.r;
      if (d < need) { if (d > 1e-4) push(dx / d, dz / d, need - d); else push(0, 1, need); }
    }
    bump = Math.hypot(h.x - x0, h.z - z0) > 1e-4 && Math.hypot(h.vx, h.vz) + Math.abs(C.sx) + Math.abs(C.sy) > 0.2 ? 1 : Math.max(0, bump - dt * 1.5);
    if (h.y > 15) { h.vy = Math.min(h.vy, (16 - h.y) * 2); }
  }
  let bump = 0;
  const H = { scene, ground, bound, left: false, ride: null, shots: 0, mail: -1, bedK: 0, bedUp: false, lull: 0, xr: null, hello: 0, t: 0, exitTo: null };
  H.enter = roof => { const p = roof ? LIFT : DOOR; H.left = false; H.ride = null; H.xr = null; H.exitTo = null; H.doorT = 3; H.roof = roof; Object.assign(h, { x: p.x, z: p.z, y: 0, vx: 0, vz: 0, vy: 0, yaw: 0, vyaw: 0, pitch: 0, roll: 0, landed: true }); gurney.position.set(bedLoop[0][0], 0, bedLoop[0][1]); Object.assign(bedTop, { x: bedLoop[0][0], z: bedLoop[0][1] }); };

  // ---------- using things ----------
  const HELLO = ['Welcome to Jasper Hospital! Follow the colored lines on the floor', 'Red line: X-ray. Blue: lab. Green: Grandpa\'s room. Yellow: babies', 'First thing in any hospital: clean your hands. It keeps everybody well'];
  H.label = () => {
    if (!h.landed || H.ride || H.xr) return null;
    return { desk: 'Say hello', bed: 'Ride the bed', xray: H.shots % 3 === 2 ? 'X-ray a hand' : H.shots % 3 === 1 ? 'X-ray from the side' : 'Take an X-ray', table: H.bedUp ? 'Bed down' : 'Bed up', tube: H.mail < 0 ? 'Send medicine' : null, mat: 'Play lullaby' }[h.floor.place] || null;
  };
  const still = why => { if (h.rpm < 0.06) return true; C.throttle = C.lever = 0; say(why, 3); return false; };
  H.use = () => {
    const id = h.floor.place; if (!H.label()) return;
    if (id === 'desk') { H.waveClerk = 2; say(HELLO[H.hello++ % HELLO.length], 4); sfx.ding(); }
    if (id === 'bed') { H.ride = { u: 0, wait: h.rpm >= 0.06 }; if (still('Blades off first, so the porter can come close')) say('Hold on! The porter pushes you down the hall', 3); }
    if (id === 'xray') { H.xr = { t: 0, kind: H.shots % 3, wait: h.rpm >= 0.06, fired: false }; if (still('Blades off and hold still, or the picture comes out blurry')) say(H.xr.kind === 2 ? 'The helper puts a hand on the table' : 'Hold very still! The helper stands behind the thick wall', 3); }
    if (id === 'table') { H.bedUp = !H.bedUp; sfx.hydraulic(); say(H.bedUp ? 'The bed sits Grandpa up. Sitting up makes it easier to breathe, and to see you!' : 'The bed goes flat again, so Grandpa can nap', 4); }
    if (id === 'tube') { H.mail = 0; sfx.whoosh(); say('Whoosh! Air blows the medicine through the tube to Grandpa\'s room', 3.6); }
    if (id === 'mat') { H.lull = 9; sfx.lullaby(); say('A soft song plays. Soft sounds help babies sleep', 3.4); }
  };
  H.caption = () => {
    if (H.ride) return H.ride.wait ? 'Waiting for the blades to stop' : H.ride.u < 0.45 ? 'Rolling down the hall! Hospital halls are wide so beds can pass each other' : H.ride.u < 0.55 ? 'All the way to the yellow line, and turn around' : 'And back again';
    if (H.xr) return H.xr.wait ? 'Waiting for the blades to stop' : H.xr.t < 2.2 ? 'The big C arm slides over' : 'Look at the picture! Soft things are dark, hard things are bright';
    const id = h.floor.place;
    if (h.landed && id === 'scale') { const n = scaleNow(); return n > WEIGHT - 1 ? `Skyrender weighs ${WEIGHT} pounds when it\'s toy size. Now slide Lift up slowly` : n > 0 ? `Only ${n} pounds! The blades pull up, so it presses down less` : 'Zero pounds! The blades are holding up all of it'; }
    if (h.floor.kind === 'hold' && h.agl < 3) return h.floor.hold;
    if (Math.abs(h.x) < 17 && h.z > 82) return H.t % 12 < 6 ? 'Stay behind the yellow line! The MRI is a giant magnet, and it pulls metal' : 'An MRI takes pictures of soft insides, like brains. X-rays are best at bones';
    if (bump > 0.4) return 'That\'s close enough. Blades need room all around';
    if (h.landed) {
      if (id === 'mat') return cribs[0].open > 0.5 ? 'The babies are awake! Blades off, then try the lullaby' : 'All the babies are asleep';
      if (id === 'table') return 'Each bump on the green line is one beat of Grandpa\'s heart';
      if (id === 'tube') return H.mail >= 0 ? 'There it goes, up over the hall!' : 'Real hospitals blow medicine through tubes like these';
      if (id === 'xray') return H.shots ? 'See the parts folded up inside? Tap to take another' : 'X-rays go right through soft things, but hard things stop them';
      if (id === 'bed') return 'Beds here have wheels. Tap Ride the bed';
      if (id === 'desk') return 'The front desk knows where everybody is';
      if (id === 'bench') return 'Microscopes show tiny things, too small to see';
      if (id === 'chairs') return 'Families wait here together';
      return h.rpm < 0.7 ? 'Tiny Skyrender, inside the hospital! Blades up, then Lift' : 'Slide Lift past the middle to fly';
    }
    if (h.x > 19 && h.z > 68 && h.rpm > 0.3) return 'Shh, baby room! Land on the soft mat';
    if (h.x < -19 && h.z > 32 && h.z < 64) return 'The X-ray room. Land on the table';
    if (h.x < -19 && h.z > 68) return 'The lab. Look up: the mail tubes cross the whole hospital';
    if (h.x > 19 && h.z > 32 && h.z < 64) return 'Grandpa\'s room. Land on the round table';
    if (h.z < 30 && h.x < -24) return 'See the scale? Land on it and find out what Skyrender weighs';
    if (h.z < 30 && h.x > 20) return 'The front desk. You can land right on it';
    return 'Flying in the hospital! Follow a colored line, and land on things to use them';
  };
  const lift = () => h.rpm * h.rpm * C.lever * 2 * 1.2, scaleNow = () => h.landed && h.floor.place === 'scale' ? Math.max(0, Math.round(WEIGHT * (1 - lift()))) : 0;

  // ---------- pictures ----------
  let dialShown = -1, ecgX = 0, beatT = 0, tick = 0;
  function drawDial() { const n = scaleNow(); if (n === dialShown) return; dialShown = n; const g = dial.g; g.fillStyle = '#14181b'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#e9f2d8'; g.textAlign = 'center'; g.font = '700 74px Karla, Arial, sans-serif'; g.fillText(String(n), 128, 76); g.font = '700 28px Karla, Arial, sans-serif'; g.fillStyle = '#9fb08c'; g.fillText('pounds', 128, 112); dial.t.needsUpdate = true; }
  // a heartbeat on the monitor: a small bump, a tall spike, a round bump
  const beatShape = u => u < 0.1 ? 0.12 * Math.sin(u / 0.1 * Math.PI) : u < 0.16 ? 0 : u < 0.2 ? -0.12 : u < 0.25 ? 1 - Math.abs(u - 0.225) / 0.025 * 0.3 : u < 0.29 ? -0.2 : u > 0.4 && u < 0.6 ? 0.22 * Math.sin((u - 0.4) / 0.2 * Math.PI) : 0;
  const blankEcg = () => { ecg.g.fillStyle = '#0d1512'; ecg.g.fillRect(0, 0, 256, 160); }; blankEcg();
  let lastY = 104;
  function runEcg(dt, rate) {
    const g = ecg.g, before = beatT; beatT += dt * rate / 60;
    const n = Math.max(1, Math.round(dt * 90));
    for (let i = 0; i < n; i++) { const u = (before + (beatT - before) * (i + 1) / n) % 1, y = 104 - beatShape(u) * 58; g.fillStyle = '#0d1512'; g.fillRect(ecgX, 34, 9, 126); g.strokeStyle = '#5fd68a'; g.lineWidth = 3; g.beginPath(); g.moveTo(Math.max(0, ecgX - 1), lastY); g.lineTo(ecgX + 1, y); g.stroke(); lastY = y; ecgX = (ecgX + 1) % 256; }
    g.fillStyle = '#0d1512'; g.fillRect(0, 0, 256, 34); g.fillStyle = '#5fd68a'; g.font = '700 25px Karla, Arial, sans-serif'; g.textAlign = 'left'; g.fillText('HEART  ' + Math.round(rate), 10, 27); ecg.t.needsUpdate = true;
    return Math.floor(beatT + 0.775) > Math.floor(before + 0.775);
  }
  function blankFilm() { const g = film.g; g.fillStyle = '#0c1014'; g.fillRect(0, 0, 640, 448); g.fillStyle = '#3c4a56'; g.textAlign = 'center'; g.font = '700 40px Karla, Arial, sans-serif'; g.fillText('X-RAY PICTURES SHOW HERE', 320, 236); film.t.needsUpdate = true; }
  blankFilm();
  // a hand has 27 bones: 8 in the wrist, 5 in the palm, 14 in the fingers and thumb
  H.bones = 0;
  function drawHand() {
    const g = film.g; g.fillStyle = '#07090c'; g.fillRect(0, 0, 640, 448); H.bones = 0;
    const flesh = (x0, y0, x1, y1, w) => { g.strokeStyle = '#151e27'; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    const bone = (x0, y0, x1, y1, w) => { H.bones++; const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0); g.save(); g.translate(x0, y0); g.rotate(a); const gr = g.createLinearGradient(0, -w, 0, w); gr.addColorStop(0, '#f2f6f8'); gr.addColorStop(0.5, '#a9bac6'); gr.addColorStop(1, '#f2f6f8'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, -w * 0.62); g.quadraticCurveTo(L / 2, -w * 0.2, L, -w * 0.52); g.quadraticCurveTo(L + w * 0.34, 0, L, w * 0.52); g.quadraticCurveTo(L / 2, w * 0.2, 0, w * 0.62); g.quadraticCurveTo(-w * 0.36, 0, 0, -w * 0.62); g.fill(); g.restore(); };
    const F = [[262, 250, -0.2, [74, 46, 32, 24]], [308, 238, -0.04, [80, 52, 38, 26]], [352, 246, 0.1, [74, 48, 34, 25]], [392, 262, 0.26, [66, 38, 26, 22]]], T = [236, 322, -0.86, [56, 46, 34]];
    g.fillStyle = '#151e27'; g.beginPath(); g.ellipse(318, 316, 96, 92, 0, 0, 7); g.fill(); flesh(318, 360, 318, 470, 120);
    const ray = ([x, y, a, ls], go) => { for (const L of ls) { const nx = x + Math.sin(a) * L, ny = y - Math.cos(a) * L; go(x, y, nx, ny); x = nx + Math.sin(a) * 6; y = ny - Math.cos(a) * 6; } };
    const base = F.map(([x, y, a, ls]) => [x + (x - 326) * -0.18, y + 78, a, ls]);
    for (const f of [...base, T]) ray(f, (x0, y0, x1, y1) => flesh(x0, y0, x1, y1, 38));
    base.forEach(f => { const s = [f[0], f[1], f[2], f[3]]; ray(s, (x0, y0, x1, y1) => bone(x0, y0, x1, y1, 13)); }); ray(T, (x0, y0, x1, y1) => bone(x0, y0, x1, y1, 14));
    for (const [x, y, r] of [[272, 352, 14], [298, 350, 13], [324, 350, 15], [352, 350, 13], [270, 380, 14], [298, 380, 16], [328, 382, 15], [354, 376, 11]]) { H.bones++; g.fillStyle = '#c3d0d9'; g.beginPath(); g.ellipse(x, y, r, r * 0.9, 0.3, 0, 7); g.fill(); g.strokeStyle = '#eef3f6'; g.lineWidth = 2.5; g.stroke(); }
    for (const x of [290, 338]) { g.strokeStyle = '#b9c8d2'; g.lineWidth = 30; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, 412); g.lineTo(x, 470); g.stroke(); }
    film.t.needsUpdate = true;
  }
  // the X-ray of Skyrender is real: every part is drawn see-through, and each part it passes through stops a little more, more at a
  // slant than straight on, as with real X-rays. Then dark and bright are swapped, the way doctors look at them
  let rt = null, xcam = null, xs = null, fig = null, figT = 0, want = null;
  const RW = 1280, RH = 896, curve = Array.from({ length: 256 }, (_, v) => Math.round(243 * Math.pow(v / 255, 0.72)));
  function shootSkyrender(side) {
    const flyer = flyerOf(), parent = flyer.parent;
    if (!rt) { rt = new THREE.WebGLRenderTarget(RW, RH); xcam = new THREE.OrthographicCamera(-5.4, 5.4, 3.78, -3.78, 0.1, 60); xs = new THREE.Scene(); xs.background = new THREE.Color(0xffffff); xs.overrideMaterial = new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vN; void main(){ float k = abs(normalize(vN).z); gl_FragColor = vec4(0.0, 0.0, 0.0, clamp(0.045 / max(0.14, k), 0.0, 0.5)); }' }); }
    const mid = flyer.localToWorld(new THREE.Vector3(0, 1.5, 0.2)), q = flyer.getWorldQuaternion(new THREE.Quaternion()), out = new THREE.Vector3(...(side ? [1, 0, 0] : [0, 1, 0])).applyQuaternion(q);
    xcam.up.set(...(side ? [0, 1, 0] : [1, 0, 0])).applyQuaternion(q); xcam.position.copy(mid).addScaledVector(out, 25); xcam.lookAt(mid); xcam.updateMatrixWorld();
    const info = renderer.info.autoReset, sh = renderer.shadowMap.autoUpdate, undo = hideForXray();
    renderer.info.autoReset = false; renderer.shadowMap.autoUpdate = false; xs.add(flyer);
    renderer.setRenderTarget(rt); renderer.render(xs, xcam); const px = new Uint8Array(RW * RH * 4); renderer.readRenderTargetPixels(rt, 0, 0, RW, RH, px); renderer.setRenderTarget(null);
    parent.add(flyer); undo(); renderer.shadowMap.autoUpdate = sh; renderer.info.autoReset = info;
    const full = document.createElement('canvas'); full.width = RW; full.height = RH; const g = full.getContext('2d'), img = g.createImageData(RW, RH), row = RW * 4;
    for (let y = 0; y < RH; y++) img.data.set(px.subarray((RH - 1 - y) * row, (RH - y) * row), y * row);
      for (let k = 0; k < img.data.length; k += 4) { const v = curve[255 - img.data[k]]; img.data[k] = v * 0.86 + 5; img.data[k + 1] = v * 0.95 + 7; img.data[k + 2] = v + 9; img.data[k + 3] = 255; }
    g.putImageData(img, 0, 0); film.g.imageSmoothingQuality = 'high'; film.g.drawImage(full, 0, 0, 640, 448); film.t.needsUpdate = true;
    const seen = new Set(); for (let k = 0; k < px.length; k += 4000) seen.add(px[k]); H.shades = seen.size;
  }
  // called right after the frame is drawn
  H.draw = () => {
    if (want === null) return; const kind = want; want = null;
    if (kind === 2) drawHand(); else shootSkyrender(kind === 1);
    if (!fig) { fig = document.createElement('figure'); fig.id = 'xray'; fig.append(document.createElement('canvas'), document.createElement('figcaption')); fig.firstChild.width = 640; fig.firstChild.height = 448; document.body.append(fig); }
    fig.firstChild.getContext('2d').drawImage(film.c, 0, 0); fig.lastChild.textContent = ['Skyrender from above', 'Skyrender from the side', 'A hand has 27 bones'][kind]; fig.hidden = false; figT = 9;
  };
  // for the main camera: where to look from while something is happening, and staying inside the walls
  H.view = () => H.xr ? (H.xr.kind === 1 ? 0.75 : Math.PI / 2 - 0.12) : H.ride && !H.ride.wait ? gurney.rotation.y + 0.75 : undefined;
  H.keep = p => { const lx = p.x - set.position.x, lz = p.z - set.position.z; p.x = set.position.x + Math.max(3 - HALF, Math.min(HALF - 3, lx)); p.z = set.position.z + Math.max(-14, Math.min(END - 4, lz)); p.y = Math.max(1.2, Math.min(CEIL - 2, p.y)); };
  let lookK = 0; const _lk = new THREE.Vector3();
  H.look = t => lookK < 0.002 ? t : _lk.copy(capsule.position).add(set.position).sub(t).multiplyScalar(lookK * 0.8).add(t);     // watch the medicine fly overhead
  H.close = () => { if (fig) fig.hidden = true; figT = 0; };

  // ---------- every frame ----------
  const camL = new THREE.Vector3(), wrapA = a => ((a % 6.283) + 9.425) % 6.283 - 3.1416;
  H.run = (dt, o) => {
    H.t += dt; set.position.set(-h.x, 0, -h.z + 0.75);
    const n = o.night; hemi.intensity = 0.68 - 0.3 * n; key.intensity = 0.36 - 0.16 * n; fill.intensity = 0.2 - 0.08 * n; panelM.emissiveIntensity = 0.75 - 0.5 * n;
    skyM.color.setHex(0x9cc6e2).lerp(tmpC.setHex(0x16203a), n); hillM.color.setHex(0x8aa96a).lerp(tmpC.setHex(0x1d2a2c), n); outM.color.setHex(0xbfe0c0).lerp(tmpC.setHex(0x1d2a3a), n);
    if (Math.hypot(h.x - DOOR.x, h.z - DOOR.z) > 10 && Math.hypot(h.x - LIFT.x, h.z - LIFT.z) > 10) H.left = true;
    // the doors slide open when Skyrender comes near, and shut behind it
    H.doorT = Math.max(0, (H.doorT || 0) - dt);
    for (const [list, p, w, mine] of [[frontDoors, DOOR, 4.2, !H.roof], [liftDoors, LIFT, 3.7, H.roof]]) { const open = (mine && H.doorT > 0) || (H.left && Math.hypot(h.x - p.x, h.z - p.z) < 14) ? 1 : 0; list.k = (list.k || 0) + (open - (list.k || 0)) * Math.min(1, dt * 3); for (const m of list) m.position.x = p.x + m.userData.s * (w + w * 1.8 * list.k); for (const m of list) m.visible = list.k < 0.99; }
    if (H.left && !H.ride && Math.abs(h.x - DOOR.x) < 6 && h.z < 7.2) H.exitTo = 'door';
    if (H.left && !H.ride && h.landed && Math.abs(h.x - LIFT.x) < 6 && h.z < 12) H.exitTo = 'roof';
    // walls fade when they're between the camera and Skyrender
    camL.copy(o.camera.position).sub(set.position);
    for (const p of parts) { const a = camL.z - p.z, b = h.z - p.z; let hide = false; if (a * b < 0) { const u = a / (a - b), x = camL.x + (h.x - camL.x) * u; hide = x > p.x0 - 2 && x < p.x1 + 2; } p.k += ((hide ? 0.12 : 1) - p.k) * Math.min(1, dt * 7); p.mat.opacity = p.rail.opacity = p.k; p.mat.depthWrite = p.rail.depthWrite = p.k > 0.9; }
    // waving and looking
    const wave = (p, yes, ph) => { const w = yes ? -2.7 + Math.sin(H.t * 7 + ph) * 0.3 : 0; p.userData.arms[1].rotation.x += (w - p.userData.arms[1].rotation.x) * Math.min(1, dt * 8); };
    const close = (x, z, d) => Math.hypot(h.x - x, h.z - z) < d;
    H.waveClerk = Math.max(0, (H.waveClerk || 0) - dt); wave(clerk, H.waveClerk > 0 || (close(34, 26, 24) && H.t % 5 < 1.6), 0); wave(labber, close(-45, 92, 17), 1); wave(nurse, close(24, 97, 18) && H.lull <= 0, 2);
    const stop = Math.abs(h.x) < 17 && h.z > 78; magTech.userData.arms[0].rotation.x += ((stop ? -1.55 : 0) - magTech.userData.arms[0].rotation.x) * Math.min(1, dt * 6);     // hand up: stop!
    wave(tech, close(-40, 56, 20) && !H.xr, 1); halo.material.emissiveIntensity = 0.6 + 0.3 * Math.sin(H.t * 2);
    // Grandpa
    H.bedK += ((H.bedUp ? 1 : 0) - H.bedK) * Math.min(1, dt * 1.3); const lean = 1.25 - 0.85 * H.bedK; back.rotation.z = Math.PI / 2 - lean; gpTilt.rotation.x = -lean; for (const l of gramps.userData.legs) l.rotation.x = -Math.PI / 2 + lean;
    wave(gramps, close(rx, rz, 25) && (H.bedK > 0.5 || H.gotMail > 0) && H.t % 6 < 2.6, 0); H.gotMail = Math.max(0, (H.gotMail || 0) - dt);
    H.heart = (H.heart || 70) + ((close(rx, rz, 26) ? 86 : 68) - (H.heart || 70)) * Math.min(1, dt * 0.5);       // he's excited to have a visitor
    if (h.x > 14 && h.z > 26 && h.z < 70) { if (runEcg(dt, H.heart) && close(rx, rz, 26)) sfx.monitor(); }
    const gust = h.rpm * h.rpm; curtain.forEach((g, i) => { const d = Math.hypot(h.x - g.position.x, h.z - g.position.z), k = d < 22 ? gust * (1 - d / 22) : 0; g.rotation.x = Math.sin(H.t * 5 + i) * 0.12 * k; g.rotation.z = Math.sin(H.t * 4 + i * 1.7) * 0.12 * k; });
    // babies wake when the blades are close and fast, and drift off when it's quiet
    H.lull = Math.max(0, H.lull - dt); const loud = close(38, 84, 30) && h.rpm > 0.3 && h.x > 14;
    cribs.forEach((b, i) => { b.open += ((loud ? 1 : 0) - b.open) * Math.min(1, dt * (loud ? 1.4 : H.lull > 0 ? 0.9 : 0.3)); const blink = (H.t + i * 1.3) % 3.4 < 0.14 ? 0.1 : 1; for (const e of b.eyes) e.scale.y = Math.max(0.12, b.open * blink); const br = 1 + Math.sin(H.t * (1.6 + 0.5 * b.open) + i) * 0.035; b.body.scale.set(1, br, br); b.g.rotation.x = Math.sin(H.t * 1.8 + i * 2) * 0.1 * b.open; });
    mobile.rotation.y += dt * (0.12 + (H.lull > 0 ? 0.9 : 0) + (close(40, 84, 18) ? gust * 0.8 : 0));
    // the mail tube
    if (H.mail >= 0) { H.mail += dt / 4.6; const u = Math.min(1, H.mail); capsule.visible = true; mailPath.getPointAt(u, capsule.position); mailPath.getTangentAt(u, tmpV); capsule.quaternion.setFromUnitVectors(UP, tmpV); if (H.mail >= 1) { H.mail = -1;  H.gotMail = 6; capsule.position.set(45.4, 8.8, 61); sfx.latch(); say('Thump! It landed in Grandpa\'s room, all the way across the hospital', 3.6); } }
    lookK += ((H.mail >= 0 ? 1 : 0) - lookK) * Math.min(1, dt * 2.4); if (H.mail < 0 && H.gotMail <= 0) capsule.visible = false;
    // the rolling bed
    if (H.ride) {
      const r = H.ride; if (r.wait) { if (h.rpm < 0.06) { r.wait = false; say('Hold on! The porter pushes you down the hall', 3); } }
      else {
        if (!r.len) { r.len = bedLoop.slice(1).map((p, i) => Math.hypot(p[0] - bedLoop[i][0], p[1] - bedLoop[i][1])); r.total = r.len.reduce((a, b) => a + b); r.s = 0; r.dx = h.x - bedTop.x; r.dz = h.z - bedTop.z; r.yaw = 0; r.yaw0 = h.yaw; r.d = 0; }
        r.s += (Math.min(13, 2 + r.d * 1.1, 2 + (r.total - r.d) * 1.1)) * dt; r.d = Math.min(r.total, r.s); r.u = r.d / r.total;
        let d = r.d, k = 0; while (k < r.len.length - 1 && d > r.len[k]) d -= r.len[k++]; const f = Math.min(1, d / r.len[k]), a = bedLoop[k], b = bedLoop[k + 1];
        const gx = a[0] + (b[0] - a[0]) * f, gz = a[1] + (b[1] - a[1]) * f, back2 = k >= 2, want2 = back2 ? Math.atan2(a[0] - b[0], a[1] - b[1]) : Math.atan2(b[0] - a[0], b[1] - a[1]); r.yaw += wrapA(want2 - r.yaw) * Math.min(1, dt * 2.5); if (r.u >= 1) r.yaw = 0;     // it's pulled back, not turned around
        gurney.position.set(gx, 0, gz); gurney.rotation.y = r.yaw; bedTop.x = gx; bedTop.z = gz; bedTop.w = 8 + 5 * Math.abs(Math.sin(r.yaw));
        const c = Math.cos(r.yaw), s = Math.sin(r.yaw); h.x = gx + r.dx * c + r.dz * s; h.z = gz - r.dx * s + r.dz * c; h.yaw = r.yaw0 + r.yaw;
        porter.position.set(gx - s * 10.5, 0, gz - c * 10.5); porter.rotation.y = r.yaw; walkPose(porter, r.d * 0.42, 1); for (const q of porter.userData.arms) q.rotation.x = -1.2; porterKeep.x = porter.position.x; porterKeep.z = porter.position.z;
        if (r.u >= 1) { H.ride = null; walkPose(porter, 0, 0); gurney.rotation.y = 0; bedTop.w = 8; say('Thanks for riding! Beds roll so nobody has to be carried', 3.4); h.yaw = r.yaw0; }
      }
    }
    // the X-ray arm
    const xr = H.xr; let az = 58, ar = 0;
    if (xr) {
      if (xr.wait) { if (h.rpm < 0.06) xr.wait = false; } else xr.t += dt;
      az = xr.wait || xr.t > 4 ? 58 : 46; ar = xr.kind === 1 && az === 46 ? -Math.PI / 2 : 0;
      if (xr.t > 2.2 && !xr.fired) { xr.fired = true; want = xr.kind; H.shots++; sfx.xray(); say(['Beep! Look, everything Skyrender can be is folded up inside', 'Beep! The brightest square is the big rig\'s walls, folded like an accordion', 'Beep! A hand has 27 bones. Can you count them?'][xr.kind], 4.4); }
      if (xr.t > 5.4) H.xr = null;
    }
    arm.position.z += (az - arm.position.z) * Math.min(1, dt * 2.4); cArm.rotation.z += (ar - cArm.rotation.z) * Math.min(1, dt * 2.4);
    if (figT > 0) { figT -= dt; if (figT <= 0 && fig) fig.hidden = true; }
    if (++tick % 3 === 0) drawDial();
    set.updateMatrixWorld();
  };
  const tmpC = new THREE.Color(), tmpV = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  H.state = () => ({ heart: H.heart, bedK: H.bedK, open: cribs[0].open, mail: H.mail, capsule: capsule.visible, shots: H.shots, shades: H.shades || 0, bones: H.bones, ride: H.ride ? H.ride.u : null, gurney: [gurney.position.x, gurney.position.z], weight: scaleNow(), door: frontDoors.k || 0, lift: liftDoors.k || 0, walls: parts.map(p => p.k), bump });
  return H;
}
export { buildHospital };
