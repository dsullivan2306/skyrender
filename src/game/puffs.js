import * as THREE from 'three';
import { scene } from '../world/setup.js';
import { puff } from '../scenery/sky.js';
import { sfx } from '../audio/audio.js';
import { S, box, rig, settled } from './state.js';

// Steam, smoke, dust and mist puffs: one pool of soft spheres shared by every mode.
// emitPuff() starts one; runPuffs() makes new ones for the train and the big rig and floats them all away.
const puffs = [];
function buildPuffs() {
  for (let i = 0; i < 46; i++) {
    const m = new THREE.Mesh(puff, new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 1, transparent: true, opacity: 0, depthWrite: false }));
    m.visible = false; scene.add(m); puffs.push({ m, life: 0 });
  }
}
let puffClock = 0, lastBeat = 0;
const stackTop = new THREE.Vector3();
const stackTip = new THREE.Vector3(0, 0, 0.5);
function emitPuff(big, from, color) {
  const p = puffs.find(q => q.life <= 0); if (!p) return;
  if (from && from.isVector3) p.m.position.copy(from);
  else if (from) { stackTop.copy(stackTip).applyMatrix4(from.matrixWorld); p.m.position.copy(stackTop); }
  else if (color) { box.getCenter(stackTop); p.m.position.set(stackTop.x + (Math.random() - 0.5) * 6, 0.6, stackTop.z + (Math.random() - 0.5) * 8); }
  else { rig.stack.getWorldPosition(stackTop); p.m.position.set(stackTop.x, stackTop.y + 0.4, stackTop.z); }
  p.m.material.color.setHex(color || 0xf2f2ee);
  p.life = 1; p.big = typeof big === 'number' ? big : big ? 1.6 : 1; p.m.visible = true;
}

function runPuffs(sdt) {
  // Steam: gentle puffs at the station, faster chuffs as the train speeds up
  const steamy = S.env.track > 0.99 && S.plan.to === 2;
  puffClock += sdt;
  // Steam drives the wheels, so the puffs keep the wheels' rhythm: four chuffs and two puffs per turn of
  // the big wheels once it's rolling; slow, lazy puffs while it waits at the station.
  const beat4 = Math.floor(S.crank / (Math.PI / 2));
  if (steamy && S.trainSpeed > 0.5) {
    if (beat4 !== lastBeat) { sfx.chuff(Math.min(1, S.trainSpeed / 6)); if (beat4 % 2 === 0 && puffClock >= 0.12) { emitPuff(S.trainSpeed < 1); puffClock = 0; } }
  } else if (steamy && puffClock >= 0.9) { emitPuff(true); puffClock = 0; }
  lastBeat = beat4;
  // Big rig: black smoke chugs out of the chrome stacks
  if (S.plan.to === 4 && settled() && S.on.smoke && !S.on.wreck && rig.truckBits.stacks) {
    S.smokeClock += sdt;
    if (S.smokeClock > 0.1) { S.smokeClock = 0; const st = rig.truckBits.stacks[Math.random() < 0.5 ? 0 : 1]; emitPuff(0.45 + Math.random() * 0.25, st, 0x3b3b3d); }
  }
  for (const p of puffs) {
    if (p.life <= 0) continue;
    p.life -= sdt * 0.42;
    p.m.position.y += sdt * (1.1 + 0.4 * p.big);
    p.m.position.z -= sdt * (S.trainSpeed * 0.95 + S.truckSpeed * 0.95 + S.tractorSpeed * 0.95 + 0.4);
    p.m.position.x += sdt * 0.15;
    const age = 1 - p.life;
    p.m.scale.setScalar((0.22 + age * 1.3) * p.big);
    p.m.material.opacity = 0.85 * Math.min(1, age * 6) * Math.max(0, p.life);
    if (p.life <= 0) p.m.visible = false;
  }
}

export { buildPuffs, emitPuff, runPuffs, stackTop };
