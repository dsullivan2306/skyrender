import { reduceMotion, countdown } from '../world/setup.js';
import { swingArm } from '../scenery/launch.js';
import { smoke, smokeMat } from '../scenery/space.js';
import { sfx } from '../audio/audio.js';
import { S, clamp01, rig, settled } from './state.js';

// The Skyrender rocket: countdown on the pad at Jasper Spaceport, ignition, liftoff, through the clouds
// and into space. Its pieces run from the main loop at the same spots as always.
const LT = 18;

function launchCaption() {
  if (S.launchT < 3) return 'Rocket mode. Countdown!';
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

export { LT, launchCaption, runCountdown, runEngines, runLaunchSmoke, runSwingArm, startRocket };
