// Jasper's idea (November 16, 2026): "Jasper wants rovers on the planets"
//
// A rover already lives on Mars, like the real ones: it landed there years ago, all by itself. When Skyrender
// lands, its camera head turns to watch. Tap Rover and it gets to work, the way real Mars rovers do:
// - six wheels on rocker and bogie beams, so each wheel climbs over rocks on its own and the body stays steady
// - the four corner wheels steer, so it can turn on the spot
// - it drives slowly and leaves tread tracks in the dust (no rain on Mars to wash them away)
// - its laser is invisible: you only see tiny sparks on the rock, and their color tells what the rock is made of
// - its arm drills a rock, and it leaves the sample in a tube on the ground for a spaceship to bring home one day
// - the finned box on its back turns heat into electricity, so it works day and night
// An older, smaller rover sits asleep nearby: it ran on sunshine, and red dust covered its solar panels.
// Only functions here; planets.js builds the rover into the Mars scene, after everything else on Mars.
import * as THREE from 'three';
import { c01, sm } from '../game/state.js';
import { sfx } from '../audio/audio.js';

const WR = 0.26, WX = 0.62, WZ = [0.72, 0.04, -0.68];        // wheel radius, track half-width, front/middle/rear (before scaling)
const RS = 1.5;                                               // as big as a car next to the astronauts, like the real ones
// where it works: zap a rock, drill a rock, look at the old rover; then round again
const STOPS = [{ at: [-8.5, 7.5], face: 0.5, task: 'zap' }, { at: [-11, 0.5], face: 2.6, task: 'drill' }, { at: [-7.5, -8.2], face: -2.6, task: 'look' }];
const OLD_AT = [-9.6, -13.4];
const fwd = (h, d, s = 0) => [Math.sin(h) * d + Math.cos(h) * s, Math.cos(h) * d - Math.sin(h) * s];
const wrapA = a => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
const Z = new THREE.Vector3(0, 0, 1);

function makeRover(scene, glowTex) {
  const white = new THREE.MeshStandardMaterial({ color: 0xe0dbd0, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a3c3f, roughness: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xbdbcb6, roughness: 0.5 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.5, metalness: 0.3 });
  const lens = new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.2 });
  const rockM = new THREE.MeshStandardMaterial({ color: 0x5a3324, roughness: 1, flatShading: true });
  const box = (w, h, d, m, x, y, z, p) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; p.add(b); return b; };

  // it starts parked behind Skyrender's nose
  const R = { group: new THREE.Group(), heading: 1.35, pos: new THREE.Vector3(-10.5, 0, 4), stop: 0, mode: 'park', t: 0, odo: 0,
    steer: 0, turnK: 0, spinS: { '-1': 0, '1': 0 }, armK: 0, pan: 0, tilt: 0, wakeT: 9, zaps: 0, tubes: 0, laid: 0, driveT: 0, was: false,
    ahead: new THREE.Vector3(), oldAt: new THREE.Vector3(OLD_AT[0], 0.7, OLD_AT[1]) };
  R.group.scale.setScalar(RS); scene.add(R.group);

  // the body, a box with instruments on the deck
  const body = R.body = new THREE.Group(); R.group.add(body);
  box(1.0, 0.36, 1.5, white, 0, 0, 0, body);
  box(1.04, 0.07, 1.54, dark, 0, -0.16, 0, body);
  box(0.42, 0.12, 0.36, gold, 0.18, 0.24, -0.28, body);
  box(0.3, 0.1, 0.3, white, -0.2, 0.23, 0.15, body);
  // the power box on the back: it turns heat into electricity, with fins to let the extra heat out
  const rtg = new THREE.Group(); rtg.position.set(0, 0.14, -0.86); rtg.rotation.x = -0.75; body.add(rtg);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.5, 10), dark); core.castShadow = true; rtg.add(core);
  for (let i = 0; i < 6; i++) { const f = box(0.02, 0.48, 0.13, dark, Math.sin(i * Math.PI / 3) * 0.17, 0, Math.cos(i * Math.PI / 3) * 0.17, rtg); f.rotation.y = i * Math.PI / 3; }
  // the dish antenna that talks to Earth, and a thin stick antenna
  box(0.05, 0.16, 0.05, metal, 0.36, 0.26, -0.45, body);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 6), white); dish.position.set(0.36, 0.36, -0.45); dish.rotation.set(0.6, 0, 0.3); dish.castShadow = true; body.add(dish);
  box(0.02, 0.32, 0.02, metal, -0.4, 0.34, -0.5, body);
  // the mast and its camera head, with two eyes (cameras) and a bigger round window (the laser)
  box(0.08, 0.95, 0.08, white, -0.32, 0.65, 0.55, body);
  const pan = R.panJ = new THREE.Group(); pan.position.set(-0.32, 1.14, 0.55); body.add(pan);
  const tilt = R.tiltJ = new THREE.Group(); pan.add(tilt);
  box(0.36, 0.17, 0.18, white, 0, 0, 0, tilt);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), lens); e.rotation.x = Math.PI / 2; e.position.set(sx * 0.1, -0.02, 0.095); tilt.add(e); }
  const big = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 14), lens); big.rotation.x = Math.PI / 2; big.position.set(0, 0.11, 0.06); tilt.add(big);
  box(0.16, 0.1, 0.16, white, 0, 0.1, -0.02, tilt);
  // the arm, folded across the front; it unfolds to drill
  const sh = R.shJ = new THREE.Group(); sh.position.set(0.32, 0.02, 0.78); body.add(sh);
  const up = R.upJ = new THREE.Group(); sh.add(up);
  box(0.07, 0.07, 0.56, white, 0, 0, 0.28, up);
  const el = R.elJ = new THREE.Group(); el.position.z = 0.56; up.add(el);
  box(0.06, 0.06, 0.44, white, 0, 0, 0.22, el);
  const wr = R.wrJ = new THREE.Group(); wr.position.z = 0.44; el.add(wr);
  box(0.2, 0.2, 0.16, dark, 0, 0, 0.06, wr);
  const bit = R.bit = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.01, 0.16, 6), metal); bit.rotation.x = Math.PI / 2; bit.position.z = 0.2; wr.add(bit);

  // six wheels: the corner ones can steer
  R.wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(WR, WR, 0.2, 18); wheelGeo.rotateZ(Math.PI / 2);
  const treadGeo = new THREE.BoxGeometry(0.21, 0.03, 0.07);
  for (const sx of [-1, 1]) for (const [k, z] of WZ.entries()) {
    const steer = new THREE.Group(); R.group.add(steer);
    const spin = new THREE.Group(); steer.add(spin);
    const w = new THREE.Mesh(wheelGeo, metal); w.castShadow = true; spin.add(w);
    for (let i = 0; i < 8; i++) { const t = new THREE.Mesh(treadGeo, dark); const a = i / 8 * Math.PI * 2; t.position.set(0, Math.cos(a) * WR, Math.sin(a) * WR); t.rotation.x = -a; spin.add(t); }
    R.wheels.push({ sx, k, z, steer, spin, y: WR });
  }
  // rocker and bogie beams: they tip so each wheel can ride up a rock on its own
  const strutGeo = new THREE.BoxGeometry(0.06, 0.06, 1);
  R.struts = Array.from({ length: 8 }, () => { const s = new THREE.Mesh(strutGeo, white); s.castShadow = true; R.group.add(s); return s; });

  // rocks on the way, under one side's wheels
  R.bumps = [];
  const legs = [[0, 1, [[0.45, 1]]], [1, 2, [[0.5, -1]]], [2, 0, [[0.3, 1], [0.7, -1]]]];
  for (const [a, b, list] of legs) {
    const A = STOPS[a].at, B = STOPS[b].at, h = Math.atan2(B[0] - A[0], B[1] - A[1]);
    for (const [f, sx] of list) { const [ox, oz] = fwd(h, 0, sx * WX * RS); R.bumps.push({ x: A[0] + (B[0] - A[0]) * f + ox, z: A[1] + (B[1] - A[1]) * f + oz, r: 0.6, h: 0.3 }); }
  }
  // the rocks it studies: one to zap, one to drill
  const zs = STOPS[0], [zx, zz] = fwd(zs.face, 3.6, 0.4); R.zapAt = new THREE.Vector3(zs.at[0] + zx, 0.4, zs.at[1] + zz);
  const ds = STOPS[1], [dx, dz] = fwd(ds.face, 1.66 * RS, 0.32 * RS); R.drillAt = new THREE.Vector3(ds.at[0] + dx, 0.17 * RS, ds.at[1] + dz);
  const rock = (x, y, z, s) => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), rockM); m.position.set(x, 0, z); m.scale.set(s, y, s * 0.85); m.rotation.y = x * 3; m.castShadow = m.receiveShadow = true; scene.add(m); };
  for (const b of R.bumps) rock(b.x, b.h, b.z, b.r * 0.75);
  rock(R.zapAt.x, 0.46, R.zapAt.z, 0.6); rock(R.drillAt.x, R.drillAt.y + 0.02, R.drillAt.z, 0.36);
  // the laser's sparks, the drill's dust, and the sample tubes left on the ground
  R.spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xf2ecff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  R.spark.position.copy(R.zapAt); R.spark.position.y = 0.46; R.spark.scale.setScalar(0.8); scene.add(R.spark);
  R.puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc98a62, roughness: 1, transparent: true, opacity: 0, depthWrite: false }));
  R.puff.position.copy(R.drillAt); scene.add(R.puff);
  const tubeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.34, 10); tubeGeo.rotateZ(Math.PI / 2);
  R.tubeList = Array.from({ length: 6 }, () => { const t = new THREE.Mesh(tubeGeo, metal); t.visible = false; t.castShadow = true; scene.add(t); return { m: t, fall: 1, y0: 0 }; });
  // tread tracks in the dust
  const trackGeo = new THREE.PlaneGeometry(0.18 * RS, 0.05 * RS); trackGeo.rotateX(-Math.PI / 2);
  R.tracks = new THREE.InstancedMesh(trackGeo, new THREE.MeshStandardMaterial({ color: 0x8a4227, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 640);
  R.tracks.count = 0; R.tracks.receiveShadow = true; scene.add(R.tracks);

  // the old rover, asleep: little, with dusty solar panels, its head bowed
  const old = new THREE.Group(); old.position.set(OLD_AT[0], 0, OLD_AT[1]); old.rotation.y = 0.9; old.scale.setScalar(1.25); scene.add(old);
  const dusty = new THREE.MeshStandardMaterial({ color: 0x6e4a3e, roughness: 0.9 });
  box(0.5, 0.2, 0.62, white, 0, 0.36, 0, old);
  for (const [w, x, z] of [[0.46, -0.48, 0.05], [0.46, 0.48, 0.05], [0.5, 0, -0.5]]) box(w, 0.02, 0.5, dusty, x, 0.47, z, old);
  box(0.04, 0.42, 0.04, white, 0.12, 0.66, 0.24, old);
  const oh = box(0.18, 0.09, 0.1, white, 0.12, 0.85, 0.27, old); oh.rotation.x = 0.7;
  const owGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12); owGeo.rotateZ(Math.PI / 2);
  for (const sx of [-1, 1]) for (const z of [-0.26, 0.02, 0.28]) { const w = new THREE.Mesh(owGeo, metal); w.position.set(sx * 0.32, 0.12, z); w.castShadow = true; old.add(w); }
  R.old = old;
  place(R, 0);
  return R;
}

const hAt = (R, x, z) => { let h = 0; for (const b of R.bumps) { const d = Math.hypot(x - b.x, z - b.z); if (d < b.r) h = Math.max(h, b.h * sm(1 - d / b.r)); } return h; };
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _m = new THREE.Vector3(), _f = new THREE.Vector3(), _t = new THREE.Vector3();
function strut(s, a, b) { _t.copy(b).sub(a); const len = _t.length(); s.position.copy(a).add(b).multiplyScalar(0.5); s.quaternion.setFromUnitVectors(Z, _t.divideScalar(len || 1)); s.scale.set(1, 1, len); }

// set the wheels on the ground (and on rocks), then the body on the beams
function place(R) {
  const g = R.group; g.position.copy(R.pos); g.rotation.y = R.heading;
  const hs = { '-1': [], '1': [] };
  for (const w of R.wheels) {
    const [ox, oz] = fwd(R.heading, w.z * RS, w.sx * WX * RS);
    w.y = WR + hAt(R, R.pos.x + ox, R.pos.z + oz) / RS; hs[w.sx][w.k] = w.y;
    w.steer.position.set(w.sx * WX, w.y, w.z);
    const ts = sm(R.turnK) * 0.85;             // to turn on the spot, the corner wheels point around the middle
    w.steer.rotation.y = w.k === 1 ? 0 : w.k === 0 ? R.steer - w.sx * ts : -R.steer + w.sx * ts;
    w.spin.rotation.x = R.spinS[w.sx] / WR;
  }
  const mean = a => (a[0] + a[1] + a[2]) / 3;
  const L = mean(hs['-1']), Rt = mean(hs['1']), front = (hs['-1'][0] + hs['1'][0]) / 2, rear = (hs['-1'][2] + hs['1'][2]) / 2;
  const b = R.body; b.position.set(0, (L + Rt) / 2 + 0.42, 0);
  b.rotation.set(Math.atan2(rear - front, 1.4) * 0.5, 0, Math.atan2(Rt - L, WX * 2) * 0.5);   // the beams soak up half the tilt
  b.updateMatrix();
  for (const [i, sx] of [-1, 1].entries()) {
    const y = hs[sx], s = R.struts.slice(i * 4, i * 4 + 4), x = sx * 0.5;
    _a.set(sx * 0.52, -0.14, -0.02).applyMatrix4(b.matrix);                  // the rocker's pivot on the body
    _b.set(x, y[2], WZ[2]); _m.set(x, y[1], WZ[1]); _f.set(x, y[0], WZ[0]);
    _c.set(x, (y[0] + y[1]) / 2 + 0.2, (WZ[0] + WZ[1]) / 2);                 // the bogie's pivot
    _a.x = x; strut(s[0], _a, _b); strut(s[1], _a, _c); strut(s[2], _c, _m); strut(s[3], _c, _f);
  }
}

// the arm: k 0 folded across the front, 1 reaching down to the rock
function pose(R, k) {
  const e = sm(k);
  R.shJ.rotation.y = -Math.PI / 2 * (1 - e);
  R.upJ.rotation.x = -0.1 * e;
  R.elJ.rotation.x = (Math.PI * 0.94) * (1 - e) + 0.85 * e;
  R.elJ.position.x = 0.07 * (1 - e);
  R.wrJ.rotation.x = 0.82 * e;
}

const _w = new THREE.Vector3(), _l = new THREE.Vector3();
function aim(R, target, dt, rate = 2) {               // turn the camera head toward a point in the world
  let p = 0, t = -0.15;
  if (target) {
    R.group.updateMatrixWorld(); _l.copy(target); R.body.worldToLocal(_l); _l.sub(R.panJ.position);
    p = Math.atan2(_l.x, _l.z); t = Math.atan2(-_l.y, Math.hypot(_l.x, _l.z));
  }
  const k = Math.min(1, dt * rate);
  R.pan += wrapA(p - R.pan) * k; R.tilt += (Math.max(-0.6, Math.min(1.1, t)) - R.tilt) * k;
  R.panJ.rotation.y = R.pan; R.tiltJ.rotation.x = R.tilt;
}

function stamp(R) {                                 // two tread marks, one under each side
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), R.heading), s = new THREE.Vector3(1, 1, 1);
  for (const sx of [-1, 1]) {
    const [ox, oz] = fwd(R.heading, (WZ[2] - 0.1) * RS, sx * WX * RS);
    const x = R.pos.x + ox, z = R.pos.z + oz; if (hAt(R, x, z) > 0.01) continue;
    _w.set(x, 0.012, z); R.tracks.setMatrixAt(R.laid % 640, m4.compose(_w, q, s)); R.laid++;
  }
  R.tracks.count = Math.min(640, R.laid); R.tracks.instanceMatrix.needsUpdate = true;
}

// Every frame on Mars. want: Rover is on and Skyrender is on the ground. watch: what the head looks at when idle.
function runRover(R, dt, want, watch) {
  if (want && !R.was) { R.wakeT = 0; sfx.roverGo(); if (R.mode === 'park') { R.mode = 'turn'; R.t = 0; } }
  R.was = want; R.wakeT += dt;
  let look = watch, armWant = 0, turning = false, steerWant = 0;
  if (!want) {
    if (R.mode !== 'park') { R.mode = 'park'; R.t = 0; }
  } else if (R.mode === 'drive' || R.mode === 'turn') {
    const st = STOPS[R.stop], dx = st.at[0] - R.pos.x, dz = st.at[1] - R.pos.z, d = Math.hypot(dx, dz);
    const goal = d > 0.06 ? Math.atan2(dx, dz) : st.face, err = wrapA(goal - R.heading);
    if (Math.abs(err) > 0.06 && (R.mode === 'turn' || Math.abs(err) > 0.3 || d <= 0.06)) {
      // turn on the spot: stop, point the corner wheels around the middle, then roll all six
      R.mode = 'turn'; turning = true;
      if (R.turnK > 0.97) { const w = Math.sign(err) * Math.min(Math.abs(err) * 2, 0.55); R.heading += w * dt; for (const sx of [-1, 1]) R.spinS[sx] -= sx * w * dt * 0.95; }
    } else if (d > 0.06) {
      if (R.turnK > 0.03) turning = false;             // straighten the wheels first
      else {
        R.mode = 'drive'; R.driveT += dt;
        const v = Math.min(0.6, d * 0.8 + 0.1) * dt;
        R.heading += err * Math.min(1, dt * 3); steerWant = Math.max(-0.35, Math.min(0.35, err * 2));
        R.pos.x += Math.sin(R.heading) * v; R.pos.z += Math.cos(R.heading) * v;
        R.spinS['-1'] += v / RS; R.spinS['1'] += v / RS; R.odo += v;
        if (R.odo - (R.lastStamp || 0) > 0.14) { R.lastStamp = R.odo; stamp(R); }
        look = R.ahead.set(R.pos.x + Math.sin(R.heading) * 4, 0, R.pos.z + Math.cos(R.heading) * 4);
      }
    } else { R.mode = STOPS[R.stop].task; R.t = 0; }
  } else {
    R.t += dt; const t = R.t;
    if (R.mode === 'zap') {
      look = R.zapAt;
      const on = t > 1.4 && t < 4.6, k = on ? (t - 1.4) % 0.32 : 1;
      R.spark.material.opacity = k < 0.14 ? 1 - k / 0.14 : 0; R.spark.scale.setScalar(0.7 + (on ? (Math.floor(t / 0.32) % 3) * 0.12 : 0));
      if (on && k < dt) R.zaps++;
      if (t >= 1.4 && t - dt < 1.4) sfx.zap(); if (t >= 3.0 && t - dt < 3.0) sfx.zap();
      if (t > 5.6) next(R);
    } else if (R.mode === 'drill') {
      look = R.drillAt;
      armWant = t < 4.6 ? 1 : 0;
      const drilling = t > 1.9 && t < 4.5;
      if (drilling) { R.bit.rotation.y += dt * 30; const u = ((t - 1.9) % 0.9) / 0.9; R.puff.scale.setScalar(0.08 + u * 0.3); R.puff.position.y = 0.2 + u * 0.25; R.puff.material.opacity = 0.55 * (1 - u); }
      else R.puff.material.opacity = 0;
      if (t >= 1.9 && t - dt < 1.9) sfx.drill();
      if (t >= 6.2 && t - dt < 6.2) {               // drop a sample tube from the belly
        const tb = R.tubeList[R.tubes % R.tubeList.length]; R.tubes++;
        const [ox, oz] = fwd(R.heading, -0.15, 0); tb.m.position.set(R.pos.x + ox, 0.7, R.pos.z + oz); tb.m.rotation.y = R.heading + 0.4; tb.m.visible = true; tb.fall = 0;
        sfx.lock();
      }
      if (t > 8) next(R);
    } else if (R.mode === 'look') {
      look = R.oldAt;
      if (t > 6.5) next(R);
    }
  }
  if (R.mode !== 'zap') R.spark.material.opacity = 0;
  if (R.mode !== 'drill') R.puff.material.opacity = 0;
  for (const tb of R.tubeList) if (tb.fall < 1) { tb.fall = Math.min(1, tb.fall + dt * 2.2); tb.m.position.y = 0.05 + (0.7 - 0.05) * (1 - tb.fall * tb.fall); }
  R.armK += (armWant - R.armK) * Math.min(1, dt * 1.4);
  if (Math.abs(armWant - R.armK) < 0.002) R.armK = armWant;
  R.turnK += ((turning ? 1 : 0) - R.turnK) * Math.min(1, dt * 3);
  R.steer += (steerWant - R.steer) * Math.min(1, dt * 3);
  pose(R, R.armK);
  place(R);
  aim(R, look, dt);
}
function next(R) { R.stop = (R.stop + 1) % STOPS.length; R.mode = 'turn'; R.t = 0; R.driveT = 0; }

// What the rover is doing, for the caption
const DRIVE_LINES = ['Six wheels go up and over rocks one at a time, so the rover stays steady',
  'Look at the tracks! There is no rain on Mars to wash them away',
  'Real rovers drive slower than a tortoise walks, so they never bump into rocks',
  'People on Earth tell the rover where to go. Messages take up to 20 minutes to get here, so it drives itself in between',
  'The box with fins on the back turns heat into electricity, so the rover works day and night'];
let lineI = 0, lastMode = '';
function roverCaption(R) {
  if (R.mode !== lastMode) { if (lastMode === 'drive' || lastMode === 'turn') lineI++; lastMode = R.mode; }
  if (R.wakeT < 3.2) return 'The rover wakes up! It lives on Mars and drives all by itself';
  if (R.mode === 'turn') return 'The corner wheels turn so the rover can spin around on the spot';
  if (R.mode === 'drive') return DRIVE_LINES[(lineI + Math.floor(R.driveT / 7)) % DRIVE_LINES.length];
  if (R.mode === 'zap') return R.t < 1.4 ? 'The rover looks at a rock with its camera head' : 'Zap zap! The laser is invisible, but it makes tiny sparks. Their color tells what the rock is made of';
  if (R.mode === 'drill') return R.t < 6 ? 'The arm reaches out and drills into the rock' : 'It keeps the rock dust in a tube and leaves it on the ground, so a spaceship can bring it home one day';
  if (R.mode === 'look') return 'That little old rover ran on sunshine. Red dust covered its solar panels, so it went to sleep';
  return '';
}

export { makeRover, roverCaption, runRover };
