import * as THREE from 'three';
import { FARM_P, animals, farmMove, farmSet } from '../scenery/farm.js';
import { S, rig, settled, wrap } from './state.js';
import { emitPuff, stackTop } from './puffs.js';

// Skyfly the tractor, every frame: drives down the farm lane, puffs from the exhaust, sprays, plows,
// and the farm animals graze, wander and hop. Its buttons and captions are in game/core.js.
function runTractor(dt, sdt, live) {
  // Tractor: putters slowly down the farm lane; the plow kicks up dirt
  if (S.plan.to === 5 && live) S.tractorT += sdt;
  const wantTractor = S.plan.to === 5 && live && S.tractorT > 1.5 && !S.on.stop ? (S.on.plow ? 2.2 : 3.6) : 0;
  S.tractorSpeed += (wantTractor - S.tractorSpeed) * Math.min(1, dt * 0.8);
  if (S.tractorSpeed < 0.01) S.tractorSpeed = 0;
  S.farmTravel += S.tractorSpeed * sdt;
  farmMove.position.z = wrap(-S.farmTravel, FARM_P / 2);
  if (S.plan.to === 5 && settled()) {                                    // little puffs from the exhaust stack
    S.tractorPuff += sdt;
    if (S.tractorPuff > (S.tractorSpeed > 0.3 ? 0.35 : 0.8)) { S.tractorPuff = 0; rig.stack.getWorldPosition(stackTop); stackTop.y += 0.45; stackTop.x = 0; emitPuff(0.45, stackTop.clone(), 0x4a4a4a); }
  }
  if (S.plan.to === 5 && settled() && S.on.spray) {                       // fine mist along both sprayer booms
    S.sprayClock += sdt;
    if (S.sprayClock > 0.05) { S.sprayClock = 0;
      const w = rig.named.wings[Math.random() < 0.5 ? 0 : 1]; const sp = 0.6 + Math.random() * 3.0;
      stackTop.set(w.s * sp, -0.1, -1.0 - sp * 0.2).applyMatrix4(w.j.matrixWorld); emitPuff(0.22, stackTop.clone(), 0xd8ecf7); }
  }
  if (S.plan.to === 5 && S.on.plow && S.tractorSpeed > 0.3) { S.plowDust += sdt; if (S.plowDust > 0.18) { S.plowDust = 0; for (const f of rig.named.feet) emitPuff(0.5, f, 0x7a5a3a); } }
  for (const a of animals) {                                          // grazing, wandering, wiggling
    const c = a.c, ud = c.userData, t = S.clockT + a.ph;
    ud.hop = Math.max(0, ud.hop - dt * 1.5);
    if (ud.kind === 'horse') { const ang = t * 0.25; c.position.set(a.x0 + Math.cos(ang) * 1.6, 0, a.z0 + Math.sin(ang) * 3); c.rotation.y = -ang; }
    else if (ud.kind === 'pig') { const ang = t * 0.6; c.position.set(a.x0 + Math.cos(ang) * 0.6, 0, a.z0 + Math.sin(ang) * 0.8); c.rotation.y = -ang; }
    else c.rotation.y = a.a0 + Math.sin(t * 0.15) * 0.4;
    const moving = ud.kind !== 'cow';
    ud.legs.forEach((l, i) => l.rotation.x = moving ? Math.sin(t * (ud.kind === 'pig' ? 12 : 7) + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.5 : 0)) * 0.45 : 0);
    ud.neck.rotation.x = (ud.kind === 'horse' ? -0.7 : 0) + (ud.kind === 'cow' ? 0.35 + Math.sin(t * 0.8) * 0.35 : Math.sin(t * 3) * 0.08);
    ud.tail.rotation.z = Math.sin(t * 4) * 0.4;
    c.position.y = Math.abs(Math.sin(ud.hop * Math.PI * 2)) * 0.35 * ud.hop;
  }
}

// Behind the plow: the turned dirt is darker because it was damp underneath, so the plow leaves dark rows.
// Birds know this too. Gulls and crows follow a plow to snap up the worms it turns over: they land in the
// fresh rows, peck, and hop to catch up when the tractor pulls ahead. Lift the plow and they fly off.
const SEGS = 80, BIRDS = 5;
let furrows = null, segN = 0, lastSeg = -1, birdK = 0, birdHere = 0;
const fv = new THREE.Vector3(), fm = new THREE.Matrix4(), fq = new THREE.Quaternion(), fs = new THREE.Vector3(), flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
function buildPlowLife() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 16; const g = c.getContext('2d');
  g.fillStyle = '#5a3d26'; g.fillRect(0, 0, 64, 16);
  for (const x of [6, 26, 46]) { g.fillStyle = '#47301d'; g.fillRect(x, 0, 8, 16); g.fillStyle = '#6e4b2f'; g.fillRect(x + 10, 0, 5, 16); }
  const segs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.7, 1.06), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }), SEGS);
  segs.receiveShadow = true; segs.count = 0; farmSet.add(segs);
  const white = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.8 }), grey = new THREE.MeshStandardMaterial({ color: 0x8e959c, roughness: 0.8, side: THREE.DoubleSide });
  const beakM = new THREE.MeshStandardMaterial({ color: 0xd9a63a, roughness: 0.6 });
  const birds = [];
  for (let i = 0; i < BIRDS; i++) {
    const b = new THREE.Group(); b.visible = false; b.scale.setScalar(1.8); farmSet.add(b);   // a gull is about as long as one of Skyfly's big tires is wide
    const body = new THREE.Group(); body.position.y = 0.16; b.add(body);
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), white); torso.scale.set(1, 0.9, 1.9); torso.castShadow = true; body.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), white); head.position.set(0, 0.07, 0.19); body.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 6).rotateX(Math.PI / 2), beakM); beak.position.set(0, 0.06, 0.28); body.add(beak);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.12), grey); tail.position.set(0, 0.02, -0.22); body.add(tail);
    const wings = [-1, 1].map(s => { const w = new THREE.Group(); w.position.set(s * 0.07, 0.05, 0); body.add(w);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.16), grey); m.position.x = s * 0.17; w.add(m); return w; });
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 4), beakM); leg.position.set(s * 0.04, 0.04, 0); b.add(leg); }
    birds.push({ b, body, wings, dz: 2.6 + i * 0.9, x: [-0.45, 0.4, -0.1, 0.55, -0.6][i], hop: 0, from: 0, to: 0, ph: i * 1.3 });
  }
  furrows = { segs, birds };
}
function runPlowLife(dt, sdt) {
  if (!furrows) return;
  const N = rig.named, on = S.plan.to === 5 && settled() && S.on.plow && (S.blend.plow || 0) > 0.8 && farmSet.visible;
  N.feet[0].getWorldPosition(fv); farmSet.worldToLocal(fv);
  const plowZ = fv.z - 0.3;
  // a new piece of plowed row every bit of ground the plow passes over
  const seg = Math.floor(S.farmTravel / 1.0);
  if (on && S.tractorSpeed > 0.2 && seg !== lastSeg) {
    const i = segN++ % SEGS; furrows.segs.userData[i] = { z: plowZ, t: S.farmTravel };
    furrows.segs.count = Math.min(SEGS, segN);
  }
  lastSeg = seg;
  for (let i = 0; i < furrows.segs.count; i++) {
    const d = furrows.segs.userData[i];
    fs.set(1, 1, 1); fv.set(0, 0.034, d.z - (S.farmTravel - d.t));
    fm.compose(fv, flat, fs); furrows.segs.setMatrixAt(i, fm);
  }
  furrows.segs.instanceMatrix.needsUpdate = true;
  if (!farmSet.visible) { segN = 0; furrows.segs.count = 0; }
  // the birds: they come once the plow has been working a little while
  birdK = on && S.tractorSpeed > 0.2 ? Math.min(1, birdK + sdt * 0.35) : Math.max(0, birdK - sdt * 0.5);
  birdHere = birdK >= 1 ? birdHere + sdt : 0;
  const leaving = !on;
  for (const [i, bd] of furrows.birds.entries()) {
    const { b, body, wings } = bd;
    b.visible = birdK > 0.001;
    if (!b.visible) continue;
    const arrive = 1 - birdK;                       // 1 = still high in the sky, 0 = down in the rows
    let y = 0, flap = 0;
    if (birdK >= 1) {
      bd.dz += S.tractorSpeed * sdt;                // standing on the ground, the plow pulls away
      if (bd.hop <= 0 && bd.dz > 6.6 + i * 0.35) { bd.hop = 0.7; bd.from = bd.dz; bd.to = 2.2 + ((i * 0.37) % 1) * 1.2; }
      if (bd.hop > 0) { bd.hop = Math.max(0, bd.hop - sdt); const u = 1 - bd.hop / 0.7; bd.dz = bd.from + (bd.to - bd.from) * u; y = Math.sin(u * Math.PI) * 0.7; flap = 1; }
    } else flap = 1;
    y += arrive * arrive * (leaving ? 9 : 7);
    b.position.set(bd.x + (leaving ? arrive * (i - 2) * 2.5 : arrive * (i - 2) * 1.2), y, plowZ - bd.dz - (leaving ? arrive * 6 : arrive * 3));
    b.rotation.y = leaving && arrive > 0.05 ? Math.PI * 0.85 : 0;
    const t = S.clockT * 18 + bd.ph;
    for (const [k, w] of wings.entries()) { w.rotation.z = flap ? (k ? -1 : 1) * Math.sin(t) * 0.8 : 0; w.rotation.y = flap ? 0 : (k ? 1.4 : -1.4); }   // folded along the back when standing
    body.rotation.x = flap ? -0.1 : Math.max(0, Math.sin(S.clockT * 3 + bd.ph * 2)) * 0.6;   // pecking for worms
  }
}
// What the caption says while the birds are following the plow (empty otherwise)
const plowCaption = () => birdHere > 2 && Math.floor(birdHere / 6) % 2 === 0 ? 'Birds follow the plow to find worms in the fresh dirt' : '';

// test hook (like window.__moon): the plowed rows and the birds
Object.defineProperty(window, '__plow', { get: () => ({ rows: furrows ? furrows.segs.count : 0, birds: birdK, here: birdHere, z: furrows && furrows.segs.count ? furrows.segs.userData[(segN - 1) % SEGS].z : null, b0: furrows ? furrows.birds[0].b.position.toArray().map(v => +v.toFixed(2)) : null }) });
export { buildPlowLife, plowCaption, runPlowLife, runTractor };
