import { home, homeSet } from '../home/home.js';
import { sfx } from '../audio/audio.js';
import { S, airborne, c01, linked, say, settled, sm } from './state.js';

// ---------- bedtime: put Skyrender away in its garage, or the robot in its house ----------
// parkState: 0 out playing, 1 going home, 2 put away for the night, 3 coming back out

const parkBtn = document.getElementById('park');
const dnBtn = document.getElementById('daynight');
const NAMES = ['Skyrender the jet', 'Skyrender the robot', 'the Skyrender train', 'the Skyrender rocket', 'the big rig', 'Skyfly', 'the rover', 'the Skyrender helicopter'];
const H_SWAP = 1.8, H_DOOR = 1.2, H_SPEED = 3.2, H_WALK = 2.2;   // the robot walks home a little slower, so its feet don't skate
const parkDrive = () => S.parkD / (S.parkRobot ? H_WALK : H_SPEED);
function startPark() {
  if (S.plan.to === 0) { S.parkQueued = false; linked.startBoarding(); return; }
  S.parkQueued = false; S.parkState = 1; S.parkT = 0; S.parkRobot = S.plan.to === 1;
  S.on = { size: 'medium' }; linked.buildActions(-1);
  S.launchT = 0; S.planeT = 0; S.planeTravel = 0;
  S.parkD = S.plan.to === 4 ? 21 : S.plan.to === 1 ? 10 : 14;                    // the big rig needs to pull all the way in
  homeSet.position.x = S.parkRobot ? -home.HOUSE_X : 0;                       // line up the right front door
  S.parkWasNight = S.night;
  parkBtn.textContent = 'Take it out'; parkBtn.setAttribute('aria-pressed', 'true');
  say(S.parkRobot ? 'Time to go home, robot!' : 'Heading home to the Skyrender Garage', 2);
}
function requestPark() {
  if (linked.board.active || linked.cab.active) return;
  if (S.parkState === 1 || S.parkState === 2) { S.parkState = 3; S.parkT = 0; say('Good morning! Out it comes', 2); sfx.garage(); return; }
  if (S.parkState === 3) return;
  if (airborne()) { S.pending = S.plan.to; S.parkQueued = true; linked.setButtons(); say('Landing first, then home', 2); return; }
  if (!settled()) { S.parkQueued = true; return; }
  startPark();
}
parkBtn.addEventListener('click', requestPark);
function runPark(dt) {
  if (S.parkQueued && S.pending === null && settled() && !airborne()) startPark();
  const D = parkDrive();
  if (S.parkState === 1 || S.parkState === 2) {
    S.parkT += dt;
    if (S.parkState === 1 && S.parkT > H_SWAP + H_DOOR + D + H_DOOR) {
      S.parkState = 2;
      if (!S.night) { S.night = true; dnBtn.textContent = 'Night'; dnBtn.setAttribute('aria-pressed', 'true'); }
      say(S.parkRobot ? 'Robot is home safe. Good night, Jasper!' : NAMES[S.plan.to][0].toUpperCase() + NAMES[S.plan.to].slice(1) + ' is parked in the garage. Good night, Jasper!', 4);
      sfx.goodnight();
    }
    if (S.parkState === 1 && S.parkT - dt < H_SWAP && S.parkT >= H_SWAP) sfx.garage();
    if (S.parkState === 1 && S.parkT - dt < H_SWAP + H_DOOR + D && S.parkT >= H_SWAP + H_DOOR + D) sfx.garage();
  } else if (S.parkState === 3) {
    S.parkT += dt;
    if (S.parkT > H_DOOR + D + H_DOOR + H_SWAP) {
      S.parkState = 0; S.parkZ = 0; S.homeK = 0;
      if (!S.parkWasNight && S.night) { S.night = false; dnBtn.textContent = 'Day'; dnBtn.setAttribute('aria-pressed', 'false'); }
      parkBtn.textContent = 'Put away'; parkBtn.setAttribute('aria-pressed', 'false');
      if (S.parkWant !== null) { const m = S.parkWant; S.parkWant = null; linked.go(m); }
    }
  }
  // turn the timeline into: how far home has risen, how open the door is, how far in the toy is
  let doorK = 0, z = 0, hk = 0;
  if (S.parkState === 1 || S.parkState === 2) {
    const t = S.parkState === 2 ? 1e9 : S.parkT;
    hk = c01(t / H_SWAP);
    const t2 = t - H_SWAP, t3 = t2 - H_DOOR, t4 = t3 - D;
    doorK = t2 < 0 ? 0 : t2 < H_DOOR ? t2 / H_DOOR : t3 < D ? 1 : 1 - c01(t4 / H_DOOR);
    z = sm(c01(t3 / D));
  } else if (S.parkState === 3) {
    const t1 = S.parkT, t2 = t1 - H_DOOR, t3 = t2 - D;
    doorK = t1 < H_DOOR ? t1 / H_DOOR : t2 < D ? 1 : 1 - c01(t3 / H_DOOR);
    z = 1 - sm(c01(t2 / D));
    hk = 1 - c01((t3 - H_DOOR) / H_SWAP);
  }
  S.homeK = hk; S.parkZ = z * S.parkD;
  S.parkMoving = (S.parkState === 1 || S.parkState === 3) && z > 0.001 && z < 0.999;
  home.garageDoor.position.y = sm(doorK) * home.DH * 0.92;               // roll the slats up into the header
  home.garageDoor.scale.y = 1 - 0.85 * sm(doorK);
  home.houseDoor.rotation.y = -1.7 * sm(doorK);
  for (const m of home.lights) m.emissiveIntensity = 0.25 + 1.6 * S.nightK * S.homeK;
}

export { H_SPEED, requestPark, runPark };
