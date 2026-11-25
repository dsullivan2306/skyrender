import * as THREE from 'three';
import { glow, groundSet } from '../world/setup.js';
import { hillMat, pineMat, scrollers } from '../scenery/nature.js';
import { season } from '../scenery/seasons.js';
import { makePerson, signTex } from '../people/people.js';

// Jasper's Valley: where the helicopter flies. The home landing pad is in the middle. Around it: a hospital with a
// landing pad on the roof, Lookout Mountain with a pad on top, and Mirror Lake. Functions only; heli.js builds it the
// first time Jasper picks the helicopter. Places are in valley coordinates: the home pad is (0, 0).
const HOSP = { x: 4, z: 64, w: 20, d: 15, h: 12 };
const MTN = { x: 64, z: 44, r: 24, top: 6.2, h: 22 };
const LAKE = { x: 60, z: -62, r: 22 };
const YARD = { x: 4, z: 45, r: 5.4 };   // the landing pad on the ground, by the hospital's front doors
const EDGE = 128;                     // how far out the valley goes

function buildValley() {
  const set = new THREE.Group(); groundSet.add(set); set.visible = false;
  let sd = 4242; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const M = (c, r = 0.9, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const add = (geo, mat, x, y, z, parent = set) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const flatDisc = (r, mat, x, y, z, parent = set) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48).rotateX(-Math.PI / 2), mat); m.position.set(x, y, z); m.receiveShadow = true; parent.add(m); return m; };
  // a big painted H, so pilots know it's for helicopters
  const bigH = (mat, x, y, z, k = 1, parent = set) => { for (const sx of [-1, 1]) add(B(0.55 * k, 0.012, 3.4 * k), mat, x + sx * 1.15 * k, y, z, parent); add(B(1.8 * k, 0.012, 0.55 * k), mat, x, y, z, parent); };
  const white = M(0xf1efe6), maroon = M(0x7a2430), red = M(0xb3312b);

  // the H on the home pad, only in helicopter mode
  const homeH = new THREE.Group(); set.add(homeH);
  bigH(maroon, 0, 0.035, 0.75, 1.3, homeH);

  // ---------- fields, a road and a little stream of trees, so the ground has something to slide past ----------
  const fieldM = [M(0xa9a552, 1), M(0x7d9a4f, 1), M(0xc0a860, 1), M(0x8fae5c, 1)];
  for (const [x, z, w, d, k] of [[-34, 46, 20, 16, 0], [-34, 64, 20, 14, 1], [-58, 46, 22, 16, 2], [-66, -56, 26, 18, 1], [-38, -64, 22, 22, 3], [36, 8, 18, 26, 0], [92, -10, 26, 30, 2], [96, 24, 24, 22, 3], [8, -74, 26, 18, 2]]) {
    const f = add(B(w, 0.03, d), fieldM[k], x, 0.02, z); f.castShadow = false;
    for (let r = 1; r < d / 2; r++) { const row = add(B(w, 0.012, 0.16), k === 1 ? fieldM[3] : fieldM[1], x, 0.042, z - d / 2 + r * 2); row.castShadow = false; }
  }
  const roadM = M(0x6a6b6d, 0.95);
  const lane = (x, z, w, d) => { add(B(w, 0.02, d), roadM, x, 0.022, z).castShadow = false; };
  lane(16, 40, 4, 40); lane(16, 2, 4, 40); lane(-12, 59.5, 56, 4); lane(16, -34, 4, 36); lane(34, -51, 40, 4);
  for (let z = -48; z < 58; z += 4) add(B(0.18, 0.012, 1.8), white, 16, 0.036, z).castShadow = false;

  // ---------- Jasper Hospital, with a landing pad on the roof ----------
  const hosp = new THREE.Group(); hosp.position.set(HOSP.x, 0, HOSP.z); set.add(hosp);
  add(B(HOSP.w, HOSP.h, HOSP.d), M(0xe4dfd2), 0, HOSP.h / 2, 0, hosp);
  add(B(HOSP.w + 0.5, 0.5, HOSP.d + 0.5), maroon, 0, HOSP.h - 0.6, 0, hosp);
  const win = glow(new THREE.MeshStandardMaterial({ color: 0x3d5568, emissive: 0xffc870, emissiveIntensity: 0.12, roughness: 0.2 }), 0.12);
  for (let f = 0; f < 3; f++) for (let k = -3; k <= 3; k++) { for (const s of [-1, 1]) add(B(1.6, 1.5, 0.1), win, k * 2.6, 2.4 + f * 3.1, s * (HOSP.d / 2 + 0.02), hosp).castShadow = false; if (Math.abs(k) < 3) for (const s of [-1, 1]) add(B(0.1, 1.5, 1.5), win, s * (HOSP.w / 2 + 0.02), 2.4 + f * 3.1, k * 2.4, hosp).castShadow = false; }
  const hs = new THREE.Mesh(new THREE.PlaneGeometry(13, 1.5), new THREE.MeshStandardMaterial({ map: signTex('JASPER HOSPITAL', '#7a2430', '#f3efe6', 1024, 118, 84), roughness: 0.8 })); hs.position.set(0, HOSP.h - 2.1, -HOSP.d / 2 - 0.1); hs.rotation.y = Math.PI; hosp.add(hs);
  add(B(4, 2.6, 0.3), win, 0, 1.3, -HOSP.d / 2 - 0.1, hosp);
  add(B(6, 0.3, 2.4), maroon, 0, 2.9, -HOSP.d / 2 - 1.2, hosp);
  // the real marking on a hospital pad in America: a white cross with a red H in the middle
  flatDisc(6.4, M(0x55585a, 0.95), 0, HOSP.h + 0.02, 0, hosp);
  for (const [w, d] of [[3.6, 11], [11, 3.6]]) add(B(w, 0.014, d), white, 0, HOSP.h + 0.03, 0, hosp);
  bigH(red, 0, HOSP.h + 0.045, 0, 0.8, hosp);
  const lampM = glow(new THREE.MeshStandardMaterial({ color: 0x8fd6a0, emissive: 0x3fe06a, emissiveIntensity: 0.6 }), 0.6);   // green edge lights, like real pads
  for (let k = 0; k < 12; k++) add(new THREE.SphereGeometry(0.1, 8, 6), lampM, Math.cos(k * 0.5236) * 6.2, HOSP.h + 0.1, Math.sin(k * 0.5236) * 6.2, hosp).castShadow = false;
  add(B(2.2, 2.2, 2.6), M(0xd6d0c2), -8.6, HOSP.h + 1.1, 4.6, hosp); add(B(0.08, 1.7, 1.2), M(0x5b7d98, 0.3), -7.46, HOSP.h + 0.9, 4.6, hosp);   // the elevator house
  // a landing pad on the ground too, out in front of the doors
  flatDisc(YARD.r, M(0x55585a, 0.95), 0, 0.03, YARD.z - HOSP.z, hosp); for (const [w, d] of [[2.6, 9], [9, 2.6]]) add(B(w, 0.014, d), white, 0, 0.04, YARD.z - HOSP.z, hosp); bigH(red, 0, 0.055, YARD.z - HOSP.z, 0.62, hosp);
  add(B(3.4, 0.016, 7), M(0xb9b4a6, 0.95), 0, 0.026, -HOSP.d / 2 - 3.4, hosp);
  // nurses wait by the elevator with a rolling bed, well back from the blades
  const nurses = [[0x3f8a86, 0xd9a47a, 0x2d2a26, -6.6, 3.6], [0x3f8a86, 0x6b4630, 0x1d1b19, -6.9, 5.9]].map(([shirt, skin, hair, x, z]) => { const p = makePerson({ shirt, pants: shirt, skin, hair }); p.position.set(x, HOSP.h, z); p.rotation.y = 2.0; hosp.add(p); return p; });
  const bed = new THREE.Group(); bed.position.set(-7.2, HOSP.h, 2.2); hosp.add(bed);
  add(B(0.7, 0.12, 1.7), white, 0, 0.62, 0, bed); add(B(0.7, 0.1, 0.4), M(0xbcd4ea), 0, 0.72, -0.6, bed);
  for (const x of [-0.28, 0.28]) for (const z of [-0.7, 0.7]) { add(B(0.05, 0.55, 0.05), M(0x9aa0a6, 0.4, 0.5), x, 0.3, z, bed); add(new THREE.SphereGeometry(0.07, 8, 6), M(0x1d1d1d), x, 0.07, z, bed); }

  // ---------- Lookout Mountain ----------
  const mtn = new THREE.Group(); mtn.position.set(MTN.x, 0, MTN.z); set.add(mtn);
  const rockM = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 1, flatShading: true });
  // rings of rock, rough on the sides, flat on top
  const seg = 26, rings = 7, pos = [], idx = [];
  for (let i = 0; i <= rings; i++) { const u = i / rings, r = MTN.r + (MTN.top - MTN.r) * Math.pow(u, 0.75), y = MTN.h * u; for (let k = 0; k < seg; k++) { const a = k / seg * Math.PI * 2, j = i === 0 || i === rings ? 1 : 0.94 + rnd() * 0.1; pos.push(Math.cos(a) * r * j, i === rings || i === 0 ? y : y + (rnd() - 0.5) * 0.9, Math.sin(a) * r * j); } }
  for (let i = 0; i < rings; i++) for (let k = 0; k < seg; k++) { const a = i * seg + k, b = i * seg + (k + 1) % seg, c = a + seg, d = b + seg; idx.push(a, c, b, b, c, d); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); mg.setIndex(idx); mg.computeVertexNormals();
  const rock = new THREE.Mesh(mg, rockM); rock.castShadow = rock.receiveShadow = true; mtn.add(rock);
  flatDisc(MTN.top + 0.1, rockM, 0, MTN.h + 0.005, 0, mtn);
  flatDisc(4.6, M(0x4c4f51, 0.95), 0, MTN.h + 0.03, 0, mtn); bigH(white, 0, MTN.h + 0.045, 0, 1, mtn);
  const snowM = new THREE.MeshStandardMaterial({ color: 0xf6f8fa, roughness: 1, flatShading: true });
  const snow = new THREE.Mesh(new THREE.CylinderGeometry(MTN.top + 0.35, MTN.top + 4.2, 4.2, 26, 1, true), snowM); snow.position.y = MTN.h - 2.05; mtn.add(snow);
  // a windsock: it shows pilots which way the wind blows
  add(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), M(0x555555), -5.2, MTN.h + 1.3, 1.6, mtn);
  const sock = add(new THREE.CylinderGeometry(0.26, 0.12, 1.3, 10, 1, true).rotateX(Math.PI / 2).translate(0, 0, -0.65), new THREE.MeshStandardMaterial({ color: 0xe8662a, roughness: 0.8, side: THREE.DoubleSide }), -5.2, MTN.h + 2.45, 1.6, mtn);
  const ranger = makePerson({ shirt: 0x6b7a45, pants: 0x4a4636, skin: 0x8c5a3c, hair: 0x2d2a26 }); ranger.position.set(-5.0, MTN.h, -1.2); ranger.rotation.y = 1.3; mtn.add(ranger);
  const brim = add(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 16), M(0xa98a5a), 0, 1.17, 0, ranger); add(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 14), M(0xa98a5a), 0, 1.23, 0, ranger); brim.castShadow = false;

  // ---------- Mirror Lake ----------
  const lake = new THREE.Group(); lake.position.set(LAKE.x, 0, LAKE.z); set.add(lake);
  flatDisc(LAKE.r + 1.4, M(0xc9b98a, 1), 0, 0.03, 0, lake);
  const waterM = new THREE.MeshStandardMaterial({ color: 0x4f86a6, roughness: 0.12, metalness: 0.25 });
  flatDisc(LAKE.r, waterM, 0, 0.05, 0, lake);
  const rings2 = [];
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe6f2f6, transparent: true, opacity: 0, depthWrite: false })); m.position.y = 0.07; m.visible = false; lake.add(m); rings2.push(m); }
  const ducks = [];
  for (let i = 0; i < 6; i++) {
    const d = new THREE.Group(), bodyM = M(i === 0 ? 0x8a6a45 : 0xe2c46a);
    add(new THREE.SphereGeometry(0.3, 12, 8).scale(0.8, 0.6, 1.2), bodyM, 0, 0.16, 0, d); add(new THREE.SphereGeometry(0.16, 10, 8), i === 0 ? M(0x2f5d4a) : bodyM, 0, 0.42, 0.26, d); add(B(0.1, 0.04, 0.14), M(0xe08a3a), 0, 0.4, 0.44, d);
    d.scale.setScalar(i === 0 ? 1.5 : 0.95); d.position.set(-6 + (i ? -1.1 * i : 0), 0.04, 5 + (i % 2) * 0.4); lake.add(d); ducks.push({ d, vx: 0, vz: 0 });
  }
  for (let i = 0; i < 26; i++) { const a = rnd() * 6.28; add(new THREE.CylinderGeometry(0.03, 0.05, 1.1 + rnd() * 0.5, 5), M(0x6b8f3a), Math.cos(a) * (LAKE.r + 0.2), 0.5, Math.sin(a) * (LAKE.r + 0.2), lake); }
  // a little dock with a rowboat
  add(B(1.6, 0.14, 7), M(0x8a6a45), -LAKE.r + 2.6, 0.35, 0, lake).rotation.y = Math.PI / 2; 
  const boat = new THREE.Group(); boat.position.set(-LAKE.r + 6.6, 0.16, 2); boat.rotation.y = 0.5; lake.add(boat);
  add(B(0.9, 0.3, 2.2), maroon, 0, 0, 0, boat); add(B(0.7, 0.1, 1.9), M(0xb08a5a), 0, 0.15, 0, boat);

  // ---------- more forest, all the way out ----------
  const trees = [], tri = [];
  const clear = (x, z) => Math.hypot(x - MTN.x, z - MTN.z) < MTN.r + 1 || Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 3 || (Math.abs(x - HOSP.x) < HOSP.w / 2 + 5 && Math.abs(z - HOSP.z) < HOSP.d / 2 + 7) || (Math.abs(x) < 10 && Math.abs(z) < 56) || (Math.abs(x - 16) < 4 && Math.abs(z) < 62) || (Math.abs(z - 59.5) < 4 && x < 18 && x > -42) || (Math.abs(z + 51) < 4 && x > 12 && x < 56);
  const fieldsAt = [[-34, 46, 20, 16], [-34, 64, 20, 14], [-58, 46, 22, 16], [-66, -56, 26, 18], [-38, -64, 22, 22], [36, 8, 18, 26], [92, -10, 26, 30], [96, 24, 24, 22], [8, -74, 26, 18]];
  for (let i = 0; i < 900 && trees.length < 190; i++) {
    const a = rnd() * 6.283, d = 57 + rnd() * 78, x = Math.cos(a) * d, z = Math.sin(a) * d, s = 0.8 + rnd() * 1.1;
    if (clear(x, z) || fieldsAt.some(([fx, fz, w, dd]) => Math.abs(x - fx) < w / 2 + 1 && Math.abs(z - fz) < dd / 2 + 1)) continue;
    trees.push({ x, z, s });
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), trunkM = M(0x5a4636, 1);
  for (const [geo, mat, y] of [[new THREE.CylinderGeometry(0.12, 0.16, 0.8, 6), trunkM, 0.4], [new THREE.ConeGeometry(0.9, 2.2, 7), pineMat, 1.8], [new THREE.ConeGeometry(0.7, 1.6, 7), pineMat, 2.6]]) {
    const im = new THREE.InstancedMesh(geo, mat, trees.length); im.frustumCulled = false;
    trees.forEach((t, i) => im.setMatrixAt(i, m4.compose(new THREE.Vector3(t.x, y * t.s + hillAt(t.x, t.z), t.z), q, new THREE.Vector3(t.s, t.s, t.s))));
    set.add(im); tri.push(im);
  }
  trees.forEach(t => { t.y = hillAt(t.x, t.z); });

  return { set, homeH, hosp, nurses, mtn, snow, sock, ranger, lake, rings: rings2, ducks, trees, clock: 0, ring: 0 };
}

// How high the rolling hills are at a spot (they're stretched half spheres)
function hillAt(x, z) {
  let y = 0;
  for (const s of scrollers) {
    if (s.obj.material !== hillMat) continue;
    const o = s.obj, u = ((x - o.position.x) / o.scale.x) ** 2 + ((z - o.position.z) / o.scale.z) ** 2;
    if (u < 1) y = Math.max(y, o.scale.y * Math.sqrt(1 - u));
  }
  return y;
}
// What's straight down: how high it is, and what kind of place it is
function groundAt(V, x, z) {
  let y = hillAt(x, z), kind = y > 0.4 ? 'hill' : 'grass', place = null;
  if (Math.hypot(x, z) < 8) { kind = 'pad'; place = 'home'; }
  const mr = Math.hypot(x - MTN.x, z - MTN.z);
  if (mr < MTN.r) {
    if (mr < MTN.top) { y = MTN.h; kind = 'pad'; place = 'mountain'; }
    else { const u = Math.pow(Math.max(0, (mr - MTN.r) / (MTN.top - MTN.r)), 1 / 0.75); y = Math.max(y, MTN.h * u); kind = 'hill'; }
  }
  if (Math.abs(x - HOSP.x) < HOSP.w / 2 && Math.abs(z - HOSP.z) < HOSP.d / 2) { y = HOSP.h; kind = 'pad'; place = 'hospital'; }
  if (Math.hypot(x - YARD.x, z - YARD.z) < YARD.r) { y = 0.05; kind = 'pad'; place = 'yard'; }
  if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 0.5) { y = 0.05; kind = 'water'; place = 'lake'; }
  if (kind === 'grass' || kind === 'hill') {
    for (const t of V.trees) if (Math.abs(t.x - x) < 2.6 && Math.abs(t.z - z) < 2.6) { y = Math.max(y, t.y + 3.7 * t.s); kind = 'trees'; }
    for (const s of scrollers) { const o = s.obj; if (o.type === 'Group' && o.children.length >= 3 && Math.abs(o.position.x - x) < 2.6 && Math.abs(o.position.z - z) < 2.6) { y = Math.max(y, 3.7 * o.scale.y); kind = 'trees'; } }
  }
  return { y, kind, place };
}

// Every frame: the windsock, waving people, ducks paddling away from the wind, rings on the water, swaying trees
function runValley(V, dt, o) {
  V.clock += dt;
  V.snow.visible = season === 'Winter' || season === 'Spring';
  V.sock.rotation.y = 0.6 + Math.sin(V.clock * 0.7) * 0.25 + (o.wind > 0.05 && o.place === 'mountain' ? 0.4 * Math.sin(V.clock * 9) : 0); V.sock.rotation.x = 0.15 + Math.sin(V.clock * 2.1) * 0.08;
  const wave = (p, near, ph) => { p.userData.arms[1].rotation.x = near ? -2.7 + Math.sin(V.clock * 7 + ph) * 0.3 : 0; };
  wave(V.nurses[0], o.place === 'hospital' || Math.hypot(o.x - HOSP.x, o.z - HOSP.z) < 26, 0); wave(V.nurses[1], o.place === 'hospital', 1.5);
  wave(V.ranger, Math.hypot(o.x - MTN.x, o.z - MTN.z) < 24, 0);
  // rotor wind makes rings on the lake, and the ducks paddle away from it
  const low = o.place === 'lake' ? o.wind : 0, lx = o.x - LAKE.x, lz = o.z - LAKE.z;
  V.ring -= dt; if (low > 0.1 && V.ring <= 0) { V.ring = 0.34; const r = V.rings.find(m => !m.visible); if (r) { r.visible = true; r.userData.t = 0; r.userData.k = low; r.position.x = lx; r.position.z = lz; } }
  for (const r of V.rings) if (r.visible) { r.userData.t += dt; const t = r.userData.t, s = 1.2 + t * 4.2; r.scale.set(s, 1, s); r.material.opacity = 0.55 * r.userData.k * (1 - t / 1.9); if (t > 1.9 || Math.hypot(r.position.x, r.position.z) + s > LAKE.r + 4) r.visible = false; }
  V.ducks.forEach((k, i) => {
    const d = k.d, dx = d.position.x - lx, dz = d.position.z - lz, dist = Math.hypot(dx, dz) || 1, push = dist < 13 ? low * (1 - dist / 13) * 5 : 0;
    const lead = i ? V.ducks[i - 1].d.position : { x: -6 + Math.sin(V.clock * 0.12) * 7, z: 4 + Math.cos(V.clock * 0.1) * 7 };
    const gx = lead.x - d.position.x, gz = lead.z - d.position.z, g = Math.hypot(gx, gz) || 1, want = Math.min(0.8, Math.max(0, g - (i ? 1.1 : 0)) * 0.8);
    k.vx += (gx / g * want + dx / dist * push - k.vx) * Math.min(1, dt * 2); k.vz += (gz / g * want + dz / dist * push - k.vz) * Math.min(1, dt * 2);
    d.position.x += k.vx * dt; d.position.z += k.vz * dt;
    const rr = Math.hypot(d.position.x, d.position.z); if (rr > LAKE.r - 1.2) { d.position.x *= (LAKE.r - 1.2) / rr; d.position.z *= (LAKE.r - 1.2) / rr; }
    if (Math.hypot(k.vx, k.vz) > 0.05) { const want2 = Math.atan2(k.vx, k.vz), da = ((want2 - d.rotation.y) % 6.283 + 9.425) % 6.283 - 3.1416; d.rotation.y += da * Math.min(1, dt * 3); }
    d.position.y = 0.04 + Math.sin(V.clock * 2 + i) * 0.02;
  });
  // trees close by shiver in the rotor's wind
  for (const s of scrollers) {
    const t = s.obj; if (t.type !== 'Group') continue;
    const d = Math.hypot(t.position.x - o.x, t.position.z - o.z), k = d < 15 ? o.wind * (1 - d / 15) : 0;
    t.rotation.z = k > 0.01 ? Math.sin(V.clock * 11 + t.position.x) * 0.05 * k : 0;
  }
}
function stillTrees() { for (const s of scrollers) if (s.obj.type === 'Group') s.obj.rotation.z = 0; }

export { EDGE, HOSP, LAKE, MTN, YARD, buildValley, groundAt, runValley, stillTrees };
