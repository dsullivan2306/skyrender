import * as THREE from 'three';
import { S, clamp01, ease, rig, say, settled } from './state.js';

// ---------- Skyrender Jr.: rolls out the back, takes off, loops around the big rig, lands back inside ----------
// Paths are in the big body's own frame (it lies level in big rig mode), so Jr. keeps up with the truck.
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const jrHome = V3(0, 0.04, -6.2);
const jrOut = new THREE.CatmullRomCurve3([jrHome, V3(0, 0.04, -9), V3(0, 0.04, -12.6), V3(0, 0.7, -15.2), V3(1.2, 2.4, -17.6), V3(0, 3.8, -18.4)]);
const jrRing = new THREE.CatmullRomCurve3([V3(0, 3.8, -18.4), V3(-4.5, 4.3, -15.5), V3(-5.5, 4.8, -6), V3(-4.5, 4.8, 3), V3(0, 4.6, 7), V3(4.5, 4.8, 3), V3(5.5, 4.6, -6), V3(4.5, 4.2, -15.5)], true);
const jrPos = new THREE.Vector3(), jrTan = new THREE.Vector3(), jrPrevTan = new THREE.Vector3(0, 0, -1), jrQ = new THREE.Quaternion(), _m = new THREE.Matrix4();
let jrRoll = 0;
const OUT_T = 4.5, RING_T = 14;
function flyJr(dt) {
  const J = rig.jr.j, home = S.plan.to === 4 && settled() && !S.parkState;
  if (!home) { S.jrPhase = 0; S.jrU = 0; S.jrLoop = 0; }
  // phase 1 = rolling out and climbing, 2 = looping, 3 = finishing the lap to line up, 4 = landing and rolling back in
  if (home && S.on.jr) { if (S.jrPhase === 0) { S.jrPhase = 1; } else if (S.jrPhase === 3) S.jrPhase = 2; else if (S.jrPhase === 4) S.jrPhase = 1; }
  if (home && !S.on.jr) { if (S.jrPhase === 1) S.jrPhase = 4; else if (S.jrPhase === 2) S.jrPhase = 3; }
  if (S.jrPhase === 1) { S.jrU = Math.min(1, S.jrU + dt / OUT_T); if (S.jrU >= 1) { S.jrPhase = 2; S.jrLoop = 0; } }
  else if (S.jrPhase === 2 || S.jrPhase === 3) {
    const before = S.jrLoop; S.jrLoop += dt / RING_T;
    if (S.jrPhase === 3 && !S.on.wreck && Math.floor(S.jrLoop) > Math.floor(before)) { S.jrPhase = 4; S.jrU = 1; S.jrLoop = 0; }
    S.jrLoop %= 1;
  } else if (S.jrPhase === 4) { S.jrU = Math.max(0, S.jrU - dt / OUT_T); if (S.jrU <= 0) { S.jrPhase = 0; say('Jr. is safe back in the trailer', 2); } }
  S.jrW += ((S.jrPhase ? 1 : 0) - S.jrW) * Math.min(1, dt * 4);
  const flying = S.jrPhase === 2 || S.jrPhase === 3 ? 1 : clamp01((S.jrU - 0.4) / 0.25);
  for (const w of rig.jr.wings) w.g.rotation.y = w.s * Math.PI / 2 * 0.92 * (1 - ease(clamp01(S.jrPhase === 2 || S.jrPhase === 3 ? 1 : (S.jrU - 0.25) / 0.3)));
  rig.jr.gear.position.y = 0.09 * ease(flying); rig.jr.gear.visible = flying < 0.98;
  rig.jr.flame.visible = S.jrPhase !== 0 && (S.jrPhase !== 1 && S.jrPhase !== 4 || S.jrU > 0.2);
  rig.jr.flame.scale.setScalar(0.8 + Math.random() * 0.4);
  if (S.jrW < 0.001) return;
  if (!home) { J.position.lerp(jrPos, S.jrW); J.quaternion.slerp(jrQ, S.jrW); return; }   // swoop home if the mode changes mid-flight
  const curve = S.jrPhase === 2 || S.jrPhase === 3 ? jrRing : jrOut, u = S.jrPhase === 2 || S.jrPhase === 3 ? S.jrLoop : ease(S.jrU);
  curve.getPointAt(Math.min(0.9999, u), jrPos); curve.getTangentAt(Math.min(0.9999, u), jrTan);
  // bank into the turns: how fast the heading is swinging sideways
  const turn = jrPrevTan.x * jrTan.z - jrPrevTan.z * jrTan.x; jrPrevTan.copy(jrTan);
  jrRoll += (THREE.MathUtils.clamp(-turn * 40, -0.8, 0.8) * flying - jrRoll) * Math.min(1, dt * 3);
  _m.lookAt(jrTan, new THREE.Vector3(), new THREE.Vector3(0, 1, 0)); jrQ.setFromRotationMatrix(_m);
  jrQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), jrRoll));
  J.position.lerp(jrPos, S.jrW); J.quaternion.slerp(jrQ, S.jrW);
}

export { flyJr };
