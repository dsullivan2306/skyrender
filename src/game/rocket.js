import * as THREE from 'three';
import { reduceMotion, countdown } from '../world/setup.js';
import { launchSet, swingArm } from '../scenery/launch.js';
import { smoke, smokeMat } from '../scenery/space.js';
import { sfx } from '../audio/audio.js';
import { S, clamp01, rig, say, settled } from './state.js';
import { emitPuff } from './puffs.js';

// The Skyrender rocket: countdown on the pad at Jasper Spaceport, ignition, liftoff, through the clouds
// and into space. Its pieces run from the main loop at the same spots as always.
const LT = 18;

function launchCaption() {
  if (S.launchT < 3) return delugeK > 0.3 ? 'Countdown! Water sprays the pad to soak up the roar' : 'Rocket mode. Countdown!';
  if (S.launchT < 4.5) return 'Ignition!';
  if (S.alt < 6) return 'Liftoff!';
  if (S.alt < 60) return 'Clearing the launch tower';
  if (S.alt < 220) return 'Punching through the clouds';
  if (S.alt < 620) return 'Leaving the atmosphere';
  return 'In space! It\'s silent here: no air to carry sound';
}
const altitude = t => { const u = Math.max(0, t - 4.5); return Math.min(900, 2.2 * Math.pow(u, 2.6)); };

// Every frame: count up on the pad and climb. Returns onPad, and sp (0 in the sky, 1 in space).
function startRocket(sdt, live) {
  // Rocket: countdown starts by itself once the rocket is standing on the pad
  const onPad = S.plan.to === 3 && live && S.pending === null;
  if (onPad) S.launchT = Math.min(LT, S.launchT + sdt);
  S.alt = S.plan.to === 3 && (settled() || S.pending !== null) ? altitude(S.launchT) : 0;
  const sp = clamp01((S.alt - 150) / 450);             // 0 = sky, 1 = space
  return { onPad, sp };
}
function runSwingArm(dt) {
  // The swing arm stays at the hatch until the countdown (or until Jasper swings it away)
  const armWant = S.plan.to === 3 && settled() && !S.on.arm && S.launchT < 1.2 ? 1 : 0;
  S.armK += (armWant - S.armK) * Math.min(1, dt * 1.5);
  swingArm.rotation.y = -1.45 * (1 - S.armK);
}
function runEngines(dt, onPad, sp) {
  // Engines: countdown -> ignition -> full burn -> gentle cruise in orbit
  if (onPad) S.thrust = S.launchT < 3 ? 0 : S.launchT < 4.5 ? (S.launchT - 3) / 1.5 : sp >= 1 ? Math.max(0.35, S.thrust - dt * 0.5) : 1;
  else S.thrust = S.pending !== null && S.plan.to === 3 ? 0.6 : S.parkMoving && S.plan.to === 3 ? 0.3 : 0;
  const flick = reduceMotion ? 1 : 0.85 + Math.random() * 0.3;
  for (const f of rig.flames) {
    f.visible = S.thrust > 0.01;
    const w = 0.5 + 0.5 * S.thrust;
    f.scale.set(w * flick, w * flick, S.thrust * flick * (S.launchT > 4.5 ? 1.25 : 1));
  }
}
function runCountdown(onPad) {
  const counting = onPad && S.launchT < 3;
  const cd = counting ? String(3 - Math.floor(S.launchT)) : (onPad && S.launchT < 5.5 && S.launchT >= 3 ? 'Blast off!' : '');
  if (countdown.textContent !== cd) { if (cd) sfx.beep(cd === 'Blast off!'); countdown.textContent = cd; }
}
function runLaunchSmoke(onPad) {
  // Launch smoke billows at ignition and stays on the pad as it climbs away
  const puffK = S.plan.to === 3 && (onPad || S.pending !== null) ? clamp01((S.launchT - 3) / 3) : 0;
  smokeMat.opacity = 0.75 * puffK * (1 - clamp01((S.launchT - 10) / 6));
  for (const m of smoke) {
    m.visible = puffK > 0;
    const d = m.userData.d + puffK * 7;
    m.position.set(Math.cos(m.userData.a) * d, 0.6 + puffK * 1.2, Math.sin(m.userData.a) * d);
    m.scale.setScalar(m.userData.s * (0.4 + puffK * 2.2));
  }
}

// Sound suppression, the way real launch pads do it: a few seconds before ignition, big water cannons
// (rainbirds) flood the pad around the engines. The water soaks up the roar so the rocket doesn't shake
// itself apart, and most of the huge white cloud at liftoff is that water turning to steam.
const NOZ = 6, DROPS = 64;
let deluge = null, delugeK = 0, mistT = 0, steamSaid = false;
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc3 = new THREE.Vector3(), vel = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
function buildDeluge() {
  const steel = new THREE.MeshStandardMaterial({ color: 0x7d8287, roughness: 0.4, metalness: 0.7 });
  const nozzles = [];
  for (let i = 0; i < NOZ; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3, x = Math.cos(a) * 3, z = Math.sin(a) * 3;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); launchSet.add(g);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.5, 8), steel); post.position.y = 0.25; post.castShadow = true; g.add(post);
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.5, 8), steel); gun.position.set(0, 0.55, 0.12); gun.rotation.x = 1.0; gun.castShadow = true; g.add(gun);
    nozzles.push(new THREE.Vector3(x * 0.92, 0.68, z * 0.92));
  }
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshStandardMaterial({ color: 0xb9d7e8, roughness: 0.15, transparent: true, opacity: 0.8, depthWrite: false }), NOZ * DROPS);
  drops.visible = false; launchSet.add(drops);
  const seeds = [];
  for (let i = 0; i < NOZ * DROPS; i++) seeds.push({ n: i % NOZ, ph: ((i * 0.618034) % 1), sx: Math.sin(i * 12.9898) * 0.25, sy: Math.cos(i * 4.1414) * 0.15 });
  deluge = { drops, nozzles, seeds };
}
function runDeluge(sdt, onPad) {
  if (!deluge) return;
  const want = onPad && S.launchT > 0.4 && S.launchT < 9 ? 1 : 0;
  if (want && delugeK === 0) sfx.deluge();
  delugeK = want ? Math.min(1, delugeK + sdt * 1.5) : Math.max(0, delugeK - sdt * 0.8);
  if (!onPad) steamSaid = false;
  else if (!steamSaid && S.launchT > 5.2) { steamSaid = true; say('That big white cloud is steam from all that water', 3.8); }
  deluge.drops.visible = delugeK > 0.01 && launchSet.visible;
  if (!deluge.drops.visible) return;
  // each drop flies in an arc from its rainbird to the base of the rocket, over and over
  for (let i = 0; i < deluge.seeds.length; i++) {
    const s = deluge.seeds[i], from = deluge.nozzles[s.n];
    const u = (s.ph + S.clockT * 0.85) % 1;
    const at = (uu, out) => {                     // where along its arc a drop is when it's uu of the way
      out.copy(from).multiplyScalar(1 - uu * 0.82);
      out.x += s.sx * uu * (from.z / 3); out.z -= s.sx * uu * (from.x / 3);
      out.y = from.y * (1 - uu) + 0.12 * uu + (1.5 + s.sy) * 4 * uu * (1 - uu);
      return out;
    };
    at(u, v3); vel.copy(at(Math.min(1, u + 0.02), vel)).sub(v3).normalize();
    q.setFromUnitVectors(Z, vel);                 // stretched along the way it flies, so the drops read as streams
    const k = delugeK * (u < 0.1 ? u / 0.1 : 1);
    sc3.set(k, k, k * 3.2);
    m4.compose(v3, q, sc3); deluge.drops.setMatrixAt(i, m4);
  }
  deluge.drops.instanceMatrix.needsUpdate = true;
  // where the water hits the hot pad, mist rises
  if (S.launchT < 4.5 && S.alt < 0.5) { mistT -= sdt; if (mistT <= 0) { mistT = S.launchT > 3 ? 0.08 : 0.22; const n = deluge.nozzles[Math.floor(S.clockT * 7) % NOZ]; v3.copy(n).multiplyScalar(0.25); v3.y = 0.4; emitPuff(0.7, v3.clone(), 0xeef3f6); } }
}

export { buildDeluge, runDeluge, LT, launchCaption, runCountdown, runEngines, runLaunchSmoke, runSwingArm, startRocket };
