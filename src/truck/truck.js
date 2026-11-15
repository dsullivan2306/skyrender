import * as THREE from 'three';
import { FENCE, I_DASH, I_LANES, I_POST, I_SIGN, LANE_DASH, fenceSet, iDash, iPosts, iProps, interSet, laneSet, makeCar, roadProps, roadSet } from '../scenery/road.js';
import { makePerson, walkPose } from '../people/people.js';
import { BLD, BLD_PERIOD, buildings, cBld, iBld, iBldFar } from '../scenery/buildings.js';
import { sfx } from '../audio/audio.js';
import { S, c01, lerp, rig, say, sm, wrap } from '../game/state.js';
import { emitPuff } from '../game/puffs.js';

// ---------- traffic ----------
// The big rig stays put and the world slides past, so each car moves at (its speed - our speed).
const CAR_COLORS = [0x2f5d8a, 0xd9d4c7, 0x3f6e4a, 0xc9a227, 0x6b6f75, 0x8a2f2f, 0x1f2a33, 0x5b8fb0];
const cars = [];
const addCar = (set, kind, x, dir, v, z, color) => {
  const g = makeCar(kind, color); g.position.set(x, 0, z); g.rotation.y = dir > 0 ? 0 : Math.PI; set.add(g);
  cars.push({ g, set, x, dir, v, z, kind });
};
// country road: oncoming cars in the left lane, one slow car way ahead in ours
[['sedan', 30], ['pickup', -5], ['suv', -38], ['van', 58]].forEach(([k, z], i) => addCar(roadSet, k, 2.1, -1, 7 + i, z, CAR_COLORS[i * 2 % 8]));
addCar(roadSet, 'sedan', 0, 1, 10, 34, CAR_COLORS[5]);
// interstate: faster cars passing us on the left, a car cruising ahead, busy lanes the other way
[['sedan', -20, 3.5], ['suv', 14, 2.5], ['van', 45, 2]].forEach(([k, z, dv], i) => addCar(interSet, k, I_LANES.ours[1], 1, 16 + dv, z, CAR_COLORS[(i * 3 + 1) % 8]));
addCar(interSet, 'bus', I_LANES.ours[0], 1, 16, 30, 0xf2b81c);
[['sedan', 0], ['pickup', 25], ['suv', -30], ['sedan', 50]].forEach(([k, z], i) => addCar(interSet, k, I_LANES.theirs[i % 2], -1, 15 + i * 1.5, z, CAR_COLORS[(i * 3 + 2) % 8]));
let flow = 1;                       // the crash itself is S.crash (game/state.js)
let passCool = 0;                                 // at most one passing-car sound every 3 seconds
function moveTraffic(dt) {
  passCool -= dt;
  flow += ((S.on.wreck ? 0 : 1) - flow) * Math.min(1, dt * 2);               // everybody stops for a wreck
  for (const c of cars) {
    if (S.crash && S.crash.car === c) continue;
    let rel = c.dir * c.v * flow - S.truckSpeed;
    if (c.dir > 0 && c.x === 0) rel = 0;                                    // the car ahead in our lane keeps its distance
    const z0 = c.z;
    c.z += rel * dt;
    if (S.plan.to === 4 && c.x !== 0 && Math.sign(z0) !== Math.sign(c.z) && Math.abs(rel) > 3 && passCool <= 0) { sfx.passBy(Math.sign(c.x)); passCool = 3; }   // neee-owww
    if (c.z < -75) c.z += 150; if (c.z > 75) c.z -= 150;
    c.g.position.set(c.x, 0, c.z); c.g.rotation.set(0, c.dir > 0 ? 0 : Math.PI, 0);
    c.g.userData.inner.rotation.set(0, 0, 0); c.g.userData.inner.position.y = c.g.userData.H / 2;
  }
}
// ---------- crashes ----------
// Crash! takes turns: first the nearest vehicle swerves into the rig, next time the rig veers into a
// building that topples over onto it. Then the police come. Everything is a function of crash.t, so
// pressing Crash! again simply plays it all backward, like rewinding a tape.
const RIG = { x: 1.05, zMin: -11.5, zMax: 4.3 };
const veer = { x: 0, yaw: 0 };
let crashCount = 0;
const _w = new THREE.Vector3();
function activeSet() { return (S.blend.inter || 0) > 0.5 ? interSet : roadSet; }
function startCrash() {
  const wantBld = crashCount % 2 === 1; crashCount++;
  if (wantBld && startBuildingCrash()) return;
  startCarCrash();
}
function startCarCrash() {
  const set = activeSet();
  let best = null, bd = 1e9;
  for (const c of cars) {
    if (c.set !== set) continue;
    const dx = Math.max(0, Math.abs(c.x) - RIG.x), dz = Math.max(0, c.z - RIG.zMax, RIG.zMin - c.z), d = Math.hypot(dx, dz);
    if (d < bd) { bd = d; best = c; }
  }
  if (!best) return false;
  const R = Math.random, P0 = new THREE.Vector3(best.x, 0, best.z);
  const half = best.g.userData.L / 2, hw = best.g.userData.W / 2;
  const bad = Math.abs(P0.x) > RIG.x && R() < 0.5;                        // sometimes it's a bad guy, and he aims for the driver
  const iz = bad ? 1.1 : THREE.MathUtils.clamp(P0.z, RIG.zMin + 1, RIG.zMax - 0.5);
  let impact;
  if (Math.abs(P0.x) > RIG.x) impact = new THREE.Vector3(Math.sign(P0.x) * (RIG.x + hw), 0, iz);
  else impact = new THREE.Vector3(P0.x, 0, P0.z > 0 ? RIG.zMax + half : RIG.zMin - half);
  const away = new THREE.Vector3(impact.x - THREE.MathUtils.clamp(impact.x, -0.5, 0.5), 0, impact.z - iz).normalize();
  if (away.lengthSq() < 0.01) away.set(Math.sign(P0.x) || 1, 0, 0);
  away.applyAxisAngle(new THREE.Vector3(0, 1, 0), (R() - 0.5) * 1.2);
  const roll = bad ? 0 : R() < 0.5 ? Math.PI : Math.PI / 2 * (R() < 0.5 ? 1 : -1);
  S.crash = { type: 'car', car: best, set, t: 0, hit: false, back: false, P0, yaw0: best.g.rotation.y, impact, bad,
    end: impact.clone().addScaledVector(away, bad ? 2.5 : 4 + R() * 5), spin: (R() < 0.5 ? -1 : 1) * (bad ? 0.8 : 2 + R() * 4), roll, pitch: bad ? 0 : (R() - 0.5) * 1.2,
    dir: Math.atan2(-away.x, -away.z), dist: P0.distanceTo(impact) };
  S.crash.approach = THREE.MathUtils.clamp(S.crash.dist / 14, 0.5, 1.4);
  S.crash.hitT = S.crash.approach;
  say(bad ? 'Uh oh! A bad guy is driving straight at the cab!' : 'Look out! That ' + (best.kind === 'bus' ? 'bus' : best.kind === 'van' ? 'van' : best.kind === 'pickup' ? 'pickup' : 'car') + ' is swerving!', 1.6);
  sfx.skid();
  return true;
}
function startBuildingCrash() {
  const set = activeSet();
  let best = null, bz = 1e9;
  for (const B of buildings) {
    if (B.set !== set) continue;
    B.b.getWorldPosition(_w);
    const z = _w.z;                                                          // first building coming up ahead
    if (z > -1 && z < bz) { bz = z; best = B; }
  }
  if (!best) return false;
  S.crash = { type: 'bld', B: best, set, t: 0, wait: true, hit: false, back: false, hitT: 1.15, dir: Math.PI / 2,
    breakup: best.b.userData.blocks.map(() => [(Math.random() - 0.5) * 1.2, Math.random() * 0.6, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.9]) };
  say('Whoa! The truck is heading for the ' + (BLD[best.b.userData.kind] && best.b.userData.kind === 'store' ? 'general store' : best.b.userData.kind) + '!', 2);
  sfx.skid();
  return true;
}
function hitNow() {
  const c = S.crash;
  say(S.jrPhase ? 'CRASH! Good thing Jr. was flying!' : c && c.type === 'bld' ? 'CRASH! The building falls right on the truck! Everybody is safe' : c && c.bad ? 'CRASH! The airbag pops and the driver is safe!' : 'CRASH! Airbag pops! Everybody is safe, but what a mess!', 2.8);
  sfx.crash(); for (let i = 0; i < 10; i++) setTimeout(() => emitPuff(true, null, 0x9a9690), i * 60);
}

// ----- police: two cruisers race in with lights and siren, officers check on everyone -----
const police = [0, 1].map(i => {
  const car = makeCar('sedan', 0xf2f2ee);
  const inner = car.userData.inner, H2 = car.userData.H / 2;
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.37, 0.08, 1.2), new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.5 })); hood.position.set(0, 0.92 - H2, 1.1); inner.add(hood);
  const red = new THREE.MeshStandardMaterial({ color: 0x7a1010, emissive: 0xff2020, emissiveIntensity: 0 }), blue = new THREE.MeshStandardMaterial({ color: 0x10207a, emissive: 0x2050ff, emissiveIntensity: 0 });
  const bar = new THREE.Group(); bar.position.set(0, 1.47 - H2, -0.15); inner.add(bar);
  const r = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.2), red); r.position.x = -0.24; bar.add(r);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.2), blue); b.position.x = 0.24; bar.add(b);
  for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 1.6), new THREE.MeshStandardMaterial({ color: 0x1d4f9a })); st.position.set(sx * 0.69, 0.68 - H2, 0); inner.add(st); }
  const officer = makePerson({ shirt: 0x1b2a4a, pants: 0x1b2a4a, hat: true, skin: [0xd9a47a, 0x8c5a3c][i], hair: 0x2d2a26 });
  car.visible = officer.visible = false;
  return { car, officer, red, blue };
});
const badGuy = makePerson({ shirt: 0x1a1a1a, pants: 0x1a1a1a, stripes: true, mask: true, skin: 0xc99a74 }); badGuy.visible = false;

function placeFig(f, x, z, yaw, moving, phase) { f.position.set(x, 0, z); f.rotation.set(0, yaw, 0); walkPose(f, phase, moving); }
function runPolice(c) {
  const show = c && c.hit, set = c ? c.set : null;
  for (const P of police) { P.car.visible = P.officer.visible = false; P.red.emissiveIntensity = P.blue.emissiveIntensity = 0; }
  badGuy.visible = false;
  if (!show) return;
  const tp = c.t - c.hitT - 0.8;                                             // seconds since the police were called
  if (tp < 0) return;
  const inter = set === interSet, laneX = inter ? 2.25 : 2.1;
  const bx = c.type === 'bld' ? -0.6 : 0;
  const spots = [[inter ? 3.55 : 3.6, 7.5], [inter ? 3.55 : 3.6, 17]];
  const officerSpots = [[1.9 + bx, 2.4], [1.9 + bx, -1.2]];
  police.forEach((P, i) => {
    if (P.car.parent !== set) set.add(P.car, P.officer);
    const k = sm(c01(tp / 3)), startZ = i === 0 ? -55 : 70;                   // one from behind, one from up ahead
    P.car.visible = true; P.car.position.set(spots[i][0], 0, lerp(startZ, spots[i][1], k)); P.car.rotation.set(0, i === 0 ? 0 : Math.PI, 0);
    const flash = Math.sin(S.clockT * 14 + i) > 0; P.red.emissiveIntensity = flash ? 3 : 0.2; P.blue.emissiveIntensity = flash ? 0.2 : 3;
    if (tp > 3.2) {                                                           // officers hop out and walk over
      P.officer.visible = true;
      const door = [spots[i][0] - 0.9, spots[i][1] + (i === 0 ? 0.3 : -0.3)];
      let tx = officerSpots[i][0], tz = officerSpots[i][1];
      if (c.bad && i === 1) { tx = badSpot.x + 0.5; tz = badSpot.z - 0.5; }       // the second officer goes after the bad guy
      const w = c01((tp - 3.2) / 2.2);
      const x = lerp(door[0], tx, sm(w)), z = lerp(door[1], tz, sm(w));
      const yaw = w < 1 ? Math.atan2(tx - door[0], tz - door[1]) : (c.bad && i === 1 ? -Math.PI / 2 : -Math.PI / 2);
      placeFig(P.officer, x, z, yaw, w > 0 && w < 1 ? 1 : 0, S.clockT * 9);
      if (w >= 1 && !(c.bad && i === 1)) { P.officer.userData.arms[1].rotation.x = -1.2 - Math.sin(S.clockT * 6) * 0.3; }   // waving everyone safe
    }
  });
  if (c.bad) {                                                                // bad guy climbs out, runs, gets caught
    const tb = c.t - c.hitT - TUMBLE + 0.2;
    if (tb > 0) {
      if (badGuy.parent !== set) set.add(badGuy);
      badGuy.visible = true;
      const runK = sm(c01(tb / 3.5)), caught = tp > 5.4;
      const x = lerp(c.end.x + 0.9, badSpot.x, runK), z = lerp(c.end.z, badSpot.z, runK);
      placeFig(badGuy, x, z, caught ? Math.PI / 2 : Math.atan2(badSpot.x - c.end.x, badSpot.z - c.end.z), runK < 1 ? 1.4 : 0, S.clockT * 13);
      if (caught) { badGuy.userData.arms[0].rotation.x = badGuy.userData.arms[1].rotation.x = -2.6; }     // hands up!
    }
  }
}
const badSpot = new THREE.Vector3(3.4, 0, 12);

// ----- walkers: people stroll along the sidewalk, go into the shops and come back out -----
const walkers = [];
buildings.forEach((B, bi) => {
  const n = B.set === interSet ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const p = makePerson({ shirt: [0x3f6e9a, 0xd9a93a, 0x6b8f5a, 0xa64a6a, 0x5a5f9a][(bi + i) % 5], pants: [0x2d3440, 0x5b4636, 0x3a3f47][i % 3], skin: [0xd9a47a, 0x8c5a3c, 0xf0c8a0, 0x6b4630][(bi * 2 + i) % 4], hair: [0x2d2a26, 0x8a5a2a, 0x1d1b19, 0xc9a24a][(bi + i * 3) % 4] });
    B.grp.add(p); walkers.push({ p, B, off: i * 4.3 + bi, speed: 0.9 + i * 0.15 });
  }
});
const WALK_T = 16;
function runWalkers(dt) {
  for (const w of walkers) {
    const B = w.B, bz = B.z, faceX = B.b.position.x, sx = B.walkX;
    if (!B.set.visible) continue;
    // loop: sidewalk ahead of the door -> door -> inside -> out -> past the door -> back again
    const t = ((S.clockT * w.speed + w.off) % WALK_T + WALK_T) % WALK_T;
    let x, z, yaw, mv = 1, vis = true;
    const zA = bz + 5, zB = bz - 5, door = bz + (B.b.userData.d && 0);
    if (t < 4) { x = sx; z = lerp(zA, door, t / 4); yaw = Math.PI; }
    else if (t < 5.2) { const k = (t - 4) / 1.2; x = lerp(sx, faceX + 0.2, k); z = door; yaw = -Math.PI / 2; }
    else if (t < 7.5) { vis = false; x = faceX; z = door; yaw = 0; mv = 0; }
    else if (t < 8.7) { const k = (t - 7.5) / 1.2; x = lerp(faceX + 0.2, sx, k); z = door; yaw = Math.PI / 2; }
    else if (t < 12) { x = sx; z = lerp(door, zB, (t - 8.7) / 3.3); yaw = Math.PI; }
    else { x = sx; z = lerp(zB, zA, (t - 12) / 4); yaw = 0; }
    // the building about to fall: everybody runs to safety first
    if (S.crash && S.crash.type === 'bld' && S.crash.B === B) {
      const k = sm(c01((S.crash.wait ? 0 : S.crash.t + 0.6) / 1.2)), safeZ = bz + (z >= bz ? 9 : -9);
      vis = true; x = lerp(x, sx + 0.3, k); z = lerp(z, safeZ, k); yaw = k > 0 && k < 1 ? (safeZ > bz ? 0 : Math.PI) : -Math.PI / 2 + Math.PI; mv = k < 1 ? 1.5 : 0;
    }
    w.p.visible = vis; placeFig(w.p, x, z, yaw, mv, S.clockT * 9 * w.speed + w.off);
  }
}

const TUMBLE = 1.6;
function runCrash(dt) {
  veer.x = 0; veer.yaw = 0;
  rig.airbag.visible = false;
  if (!S.crash) { runPolice(null); return; }
  const c = S.crash;
  if (!S.on.wreck) c.back = true;
  if (c.wait) {                                                              // rolling up beside the building
    if (c.back) { S.crash = null; runPolice(null); return; }
    let hitB = null;                                                         // whichever building rolls up beside the trailer first
    for (const B of buildings) { if (B.set !== c.set) continue; B.b.getWorldPosition(_w); if (_w.z <= -3.5 && _w.z > -9) { hitB = B; break; } }
    if (!hitB) { runPolice(null); return; }
    c.B = hitB; c.wait = false; c.t = 0;
    const ud = hitB.b.userData;
    c.vx = THREE.MathUtils.clamp(hitB.b.position.x + ud.h * 0.6, hitB.b.position.x + 1.15, -1.0);   // how far the rig swerves toward it
    c.breakup = ud.blocks.map(() => [(Math.random() - 0.5) * 1.2, Math.random() * 0.6, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.9]);
  }
  c.t += (c.back ? -Math.max(2.5, c.t / 1.2) : 1) * dt;              // rewinds in about a second
  if (!c.hit && c.t >= c.hitT) { c.hit = true; scatter(c.dir); hitNow(); }
  if (c.hit && c.t < c.hitT && c.back) c.hit = false;
  // airbag: pops in a blink at the moment of impact
  const ab = c01((c.t - c.hitT) / 0.15);
  if (ab > 0) { rig.airbag.visible = true; rig.airbag.scale.set(ab, ab, ab * 0.7); }
  else rig.airbag.scale.setScalar(0.001);
  if (c.type === 'car') {
    const g = c.car.g, ud = g.userData;
    if (c.back && c.t <= 0) { g.position.copy(c.P0); S.crash = null; runPolice(null); return; }
    if (c.t < c.approach) {                                                  // swerving in
      const u = Math.max(0, c.t) / c.approach, e = u * u;
      g.position.lerpVectors(c.P0, c.impact, e);
      const head = Math.atan2(c.impact.x - c.P0.x, c.impact.z - c.P0.z);
      let diff = ((head - c.yaw0) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      diff = THREE.MathUtils.clamp(diff, -1.1, 1.1);
      g.rotation.set(0, c.yaw0 + diff * Math.min(1, u * 2.5), 0);
      ud.inner.rotation.set(0, 0, 0); ud.inner.position.y = ud.H / 2;
    } else {                                                                 // bounce off, spin and roll over
      const u = Math.min(1, (c.t - c.approach) / TUMBLE), k = 1 - Math.pow(1 - u, 2);
      g.position.lerpVectors(c.impact, c.end, k);
      g.rotation.set(0, c.yaw0 + c.spin * k, 0);
      ud.inner.rotation.set(c.pitch * Math.sin(Math.PI * k), 0, c.roll * k);
      const lie = Math.abs(c.roll) > 2 ? ud.H / 2 : Math.abs(c.roll) > 1 ? ud.W / 2 : ud.H / 2;
      ud.inner.position.y = ud.H / 2 + (lie - ud.H / 2) * k + (c.bad ? 0.6 : 2.2) * Math.sin(Math.PI * u);
    }
  } else {                                                                   // the building topples over onto the rig
    const ud = c.B.b.userData;
    if (c.back && c.t <= 0) { ud.pivot.rotation.set(0, 0, 0); ud.blocks.forEach(b => { b.rotation.set(0, 0, 0); b.position.x = 0; b.position.z = 0; }); restoreBlocks(ud); S.crash = null; runPolice(null); return; }
    const v = sm(c01(c.t / 0.7));
    veer.x = c.vx * v; veer.yaw = -0.14 * Math.sin(Math.PI * c01(c.t / 1.4)) - 0.04 * v;
    const f = c01((c.t - 0.35) / 1.25), fall = f * f;                        // slow tip, then faster and faster
    ud.pivot.rotation.z = -fall * Math.PI / 2 * 0.97;
    const br = sm(c01((c.t - 1.6) / 0.8));                                    // it breaks apart as it lands
    if (!ud.base) ud.base = ud.blocks.map(b => b.position.y);
    ud.blocks.forEach((b, i) => {
      const r = c.breakup[i];
      b.position.set(r[0] * br, ud.base[i] + r[1] * br, r[2] * br); b.rotation.set(r[3] * br * 0.4, 0, r[3] * br);
    });
    if (c.t > 1.5 && c.t < 1.6 && !c.back && !c.dust) { c.dust = true; for (let i = 0; i < 10; i++) setTimeout(() => emitPuff(true, null, 0xb8b2a6), i * 50); }
  }
  runPolice(c);
  if (c.hit && !c.back && c.t > c.hitT + 0.8 && !c.sirenOn) { c.sirenOn = true; sfx.siren(); }
  if (c.t > c.hitT + 5 && !c.back && !c.saidPolice) { c.saidPolice = true; say(c.bad ? 'The police caught the bad guy! Everybody is safe.' : 'The police are here. Everybody is safe!', 3); }
}
function restoreBlocks(ud) { if (ud.base) ud.blocks.forEach((b, i) => b.position.y = ud.base[i]); }

// Crash: every big piece hanging off the body flies off on its own arc, tumbles and lands nearby.
// Pressing it again plays the same arcs backward, so everything snaps back where it belongs.
const fly = [], _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _c = new THREE.Vector3();
for (const j of rig.joints) if (j.parent === rig.joints[0] && !(j.userData.ord === 10)) fly.push({ j });   // the passengers' seats stay put
// A fresh roll of the dice for every crash: which way it skids, how hard, and what flies where
function scatter(dir) {
  const R = Math.random, bias = dir ?? R() * 6.283, bw = dir == null ? R() * 0.7 : 0.45 + R() * 0.3, power = 0.6 + R() * 0.9;
  for (const f of fly) {
    const stay = R() < 0.2;                                               // some pieces just jolt loose and stay close
    f.a = R() * 6.283; f.mix = R(); f.bias = bias; f.bw = bw;
    f.d = stay ? R() * 0.5 : (1.2 + R() * 7) * power;
    f.h = stay ? 0.2 + R() * 0.3 : (0.8 + R() * 4.5) * power;
    const sp = stay ? 0.4 : 1 + R() * 3.5;
    f.spin = [(R() - 0.5) * 2 * sp, (R() - 0.5) * 2 * sp, (R() - 0.5) * 2 * sp];
  }
}
scatter();
function wreckPose(w) {
  if (w < 0.001) return;
  const t = Math.min(1, w * 1.15), k = 1 - Math.pow(1 - t, 2);             // fast out, slows as it lands
  rig.bot.updateMatrixWorld(true);
  _c.set(0, 0, -3.5).applyMatrix4(rig.joints[0].matrixWorld);             // middle of the whole rig
  const moves = fly.map(f => {
    if (f.j === rig.jr.j && S.jrPhase) return null;                          // Jr. is up in the sky, safe
    f.j.getWorldPosition(_v);
    let ang = Math.atan2(_v.x - _c.x, _v.z - _c.z);
    ang += (f.a - Math.PI) * 0.5 * f.mix;
    ang = ang * (1 - f.bw) + f.bias * f.bw;
    const d = new THREE.Vector3(Math.sin(ang) * f.d * k, f.h * Math.sin(Math.PI * t) - Math.max(0, _v.y - 0.35) * k, Math.cos(ang) * f.d * k);
    f.j.parent.getWorldQuaternion(_q); d.applyQuaternion(_q.invert());
    return d;
  });
  fly.forEach((f, i) => { if (!moves[i]) return; f.j.position.add(moves[i]); f.j.rotation.x += f.spin[0] * k; f.j.rotation.y += f.spin[1] * k; f.j.rotation.z += f.spin[2] * k; });
}

// The big rig drives, every frame: buckle up, then cruise; the road, fences, signs and buildings slide by.
// Called from the main loop through linked.runTruck.
function runTruck(dt, sdt, live) {
  // Truck: buckle up, then cruise down the road
  if (S.plan.to === 4 && live) S.truckT += sdt;
  let wantTruck = S.plan.to === 4 && live && S.truckT > 1.5 && !S.on.wreck && !S.on.stop ? 10 + 6 * (S.blend.inter || 0) : 0;
  if (S.crash && S.crash.wait) wantTruck = Math.max(12, wantTruck);           // keep rolling toward the building
  if (S.crash && S.crash.type === 'bld' && !S.crash.wait) S.truckSpeed = 0;
  S.truckSpeed += (wantTruck - S.truckSpeed) * Math.min(1, dt * (wantTruck > S.truckSpeed ? 0.5 : 1.8));
  if (S.truckSpeed < 0.01) S.truckSpeed = 0;
  S.roadTravel += S.truckSpeed * sdt;
  laneSet.position.z = -(S.roadTravel % LANE_DASH);
  fenceSet.position.z = -(S.roadTravel % FENCE);
  roadProps.position.z = wrap(-S.roadTravel, 60);
  cBld.position.z = iBld.position.z = iBldFar.position.z = wrap(-S.roadTravel, BLD_PERIOD / 2);
  iDash.position.z = -(S.roadTravel % I_DASH); iPosts.position.z = -(S.roadTravel % I_POST); iProps.position.z = wrap(-S.roadTravel, I_SIGN / 2);
}

export { hitNow, runTruck, moveTraffic, runCrash, runWalkers, scatter, startCrash, veer, wreckPose };
