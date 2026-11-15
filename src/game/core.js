import * as THREE from 'three';
import { buildRig, exactBox, planMorph, poseRig } from '../rig/rig.js';
import { camera, countdown, fog0, groundSet, hemi, nightGlow, padSet, reduceMotion, renderer, rim, scene, scrub, sky, skyBot0, skyTop0, stage, stepLabel, sun } from '../world/setup.js';
import { POST, TIE, postSet, stationSet, tieSet, trackSet } from '../scenery/train.js';
import { DASH, airportScenery, airportSet, dashSet } from '../scenery/runway.js';
import { scrollers } from '../scenery/nature.js';
import { launchSet, swingArm } from '../scenery/launch.js';
import { FENCE, I_DASH, I_POST, I_SIGN, LANE_DASH, fenceSet, iDash, iPosts, iProps, interSet, laneSet, roadProps, roadSet } from '../scenery/road.js';
import { walkPose } from '../people/people.js';
import { BLD_PERIOD, cBld, iBld, iBldFar } from '../scenery/buildings.js';
import { FARM_P, animals, farmMove, farmSet } from '../scenery/farm.js';
import { hall, hallSet } from '../airport/hall.js';
import { home, homeSet } from '../home/home.js';
import { SEASON_ORDER, applySeason, fallActive, fallGeo, fallPos, fallSeed, fallSpeed, fallers, season } from '../scenery/seasons.js';
import { birdSet, cloudMat, cloudSet, clouds, flocks, puff } from '../scenery/sky.js';
import { atmoMat, earth, earthMat, giant, moonMat, planetMats, smoke, smokeMat, space, spaceBot, spaceTop, starMat } from '../scenery/space.js';
import { makeTextures } from '../rig/textures.js';
import { actx, rumbleFilter, rumbleGain, sfx, soundOn } from '../audio/audio.js';

// The truck world (truck/truck.js) and the plane cabin (cabin/cabin.js) are built after this file runs,
// in the same order as before the split. The main loop still needs some of their pieces, so main.js
// hands them over with link() before the first frame.
let cab, board, cabinScene, cabinCam, cabCaption, startBoarding, runBoarding, noseTuck, updateCabin,
  cabPointerDown, cabPointerMove, cabPointerUp, cabWheel;                                  // from cabin/cabin.js
let startCrash, scatter, hitNow, veer, wreckPose, moveTraffic, runCrash, runWalkers;        // from truck/truck.js
function link(parts) {
  ({ cab, board, cabinScene, cabinCam, cabCaption, startBoarding, runBoarding, noseTuck, updateCabin,
    cabPointerDown, cabPointerMove, cabPointerUp, cabWheel,
    startCrash, scatter, hitNow, veer, wreckPose, moveTraffic, runCrash, runWalkers } = parts);
}
// Other modules can read these but not reassign them, so they change them through setters.
let crash = null;                                    // the crash in progress, run by truck/truck.js
const setCrash = c => { crash = c; };
const setOn = v => { on = v; };
const setPlaneT = v => { planeT = v; };

const rig = buildRig(THREE, makeTextures());
const flyer = new THREE.Group();          // bob and bank while airborne, rumble on the rails
scene.add(flyer);
flyer.add(rig.bot);
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = t => Math.min(1, Math.max(0, t));
const wrap = (z, L) => ((z + L) % (2 * L) + 2 * L) % (2 * L) - L;
const skipBox = new Set(); rig.flames.forEach(g => g.traverse(o => { if (o.isMesh) skipBox.add(o); }));
rig.jr.j.traverse(o => { if (o.isMesh) skipBox.add(o); });      // Jr. flies off on its own; don't frame or ground on it

// What the ground looks like in each mode: runway, railway with station, or landing pad
const ENV = [
  { runway: 1, track: 0, pad: 0, launch: 0, road: 0, farm: 0 },   // plane: on the runway
  { runway: 0, track: 0, pad: 1, launch: 0, road: 0, farm: 0 },   // robot: standing on the pad
  { runway: 0, track: 1, pad: 0, launch: 0, road: 0, farm: 0 },   // train: at Jasper Junction
  { runway: 0, track: 0, pad: 0, launch: 1, road: 0, farm: 0 },   // rocket: Jasper Spaceport
  { runway: 0, track: 0, pad: 0, launch: 0, road: 1, farm: 0 },   // truck: country road
  { runway: 0, track: 0, pad: 0, launch: 0, road: 0, farm: 1 }    // tractor: Jasper's farm
];

// ---------- state ----------
let mode = 0;                     // last mode it fully reached
let plan = planMorph(rig, 0, null), tt = plan.T;
let paused = false, scrubbing = false, speed = 1;
let env = { ...ENV[0] }, envFrom = { ...ENV[0] };
let launchT = 0, alt = 0, thrust = 0, pending = null, orbitRoll = 0;
const LT = 18;
let planeT = 0, planeSpeed = 0, planeTravel = 0;
let trainT = 0, trainSpeed = 0, stationTravel = 0, crank = 0;
let truckT = 0, truckSpeed = 0, roadTravel = 0, hop = 0, armK = 1;
let tractorT = 0, tractorSpeed = 0, farmTravel = 0, plowDust = 0, tractorPuff = 0, sprayClock = 0;
// Fun toggles for each mode. 'toggle' buttons stay on or off; 'press' buttons do something once.
const ACTIONS = [
  [{ id: 'door', label: 'Open door' }, { id: 'gear', label: 'Gear up' }, { id: 'lights', label: 'Flash lights' }, { id: 'peek', label: 'See inside airport' }, { id: 'goin', label: 'Go inside airport' }, { id: 'board', label: 'Board the plane', press: true }],
  [{ id: 'size', seg: [['small', 'Small'], ['medium', 'Medium'], ['big', 'Big']] }, { id: 'wave', label: 'Wave' }, { id: 'march', label: 'March' }, { id: 'mask', label: 'Mask off' }, { id: 'hatch', label: 'Close hatch' }],
  [{ id: 'whistle', label: 'Whistle', press: true }, { id: 'stop', label: 'Stop train' }, { id: 'lamp', label: 'Lamp off' }],
  [{ id: 'arm', label: 'Swing arm away' }, { id: 'launch', label: 'Launch now', press: true }],
  [{ id: 'horn', label: 'Air horn', press: true }, { id: 'smoke', label: 'Smokestacks' }, { id: 'tdoors', label: 'Open trailer' }, { id: 'jr', label: 'Launch Jr.' }, { id: 'lights', label: 'Lights' }, { id: 'inter', label: 'Interstate' }, { id: 'stop', label: 'Stop truck' }, { id: 'wreck', label: 'Crash!' }],
  [{ id: 'honk', label: 'Honk', press: true }, { id: 'plow', label: 'Plow' }, { id: 'spray', label: 'Spray' }, { id: 'moo', label: 'Animal sounds', press: true }, { id: 'cab', label: 'Open cab' }, { id: 'lights', label: 'Lights' }, { id: 'stop', label: 'Stop tractor' }]
];
let jrPhase = 0, jrU = 0, jrLoop = 0, jrW = 0, jrDoor = 0;
let on = { size: 'medium' }, blend = {}, marchPh = 0, stompK = 0, snapY = 0, smokeClock = 0;          // which toggles are switched on, and how far each has animated
let flash = null;                 // a short caption that takes over for a moment ("Toot toot!")
let travel = 0, clockT = 0;
const box = new THREE.Box3(), center = new THREE.Vector3();
const target3 = new THREE.Vector3(0, 1.2, 0);

const settled = () => tt >= plan.T;
const targetMode = () => pending ?? plan.to;
const airborne = () => settled() && ((plan.to === 3 && launchT > 4.5) || (plan.to === 0 && planeT > 2));

function startMorph(m) {
  plan = planMorph(rig, m, settled() ? mode : null);
  envFrom = { ...env }; tt = 0; paused = false;
  if (m === 0) { planeT = 0; planeTravel = 0; }
  if (m === 2) { trainT = 0; stationTravel = 0; }
  if (m === 4) { truckT = 0; }
  if (m === 5) { tractorT = 0; }
  on = { size: 'medium' }; buildActions(-1);
  if (reduceMotion) tt = plan.T;
  sfx.whirr(Math.min(plan.T, 2.5));
  setButtons();
}
function go(m) {
  if (parkState) { if (parkState !== 3) { parkState = 3; parkT = 0; sfx.garage(); } parkWant = m; return; }
  if (pending !== null) { pending = m === plan.to ? null : m; setButtons(); return; }
  if (settled() && plan.to === m) {                          // same button again: launch / take off again
    if (m === 3 && launchT > 0) { if (launchT > 4.5) launchT = 0; }
    if (m === 0 && planeT > 0) { if (planeT > 2) { pending = 0; setButtons(); } }
    return;
  }
  if (airborne()) { pending = m; setButtons(); return; }    // land first, then transform
  launchT = 0; planeT = 0;
  startMorph(m);
}

// Plane: wait on the runway, roll, lift off, climb above the clouds
const PLANE_LIFT = 7;
function planeCaption() {
  if (on.goin) return hallK < 0.95 ? 'Jasper Junction Airport rises up' : driveK < 0.02 ? 'The big glass doors slide open' : driveK < 0.99 ? 'Rolling inside the airport' : 'Parked inside at Gate 1. Travelers and pilots hurry by with their suitcases';
  if (on.peek) return 'Inside Jasper Junction Airport: travelers and pilots pulling suitcases';
  if (planeT < 2) return 'Plane mode, lined up on the runway';
  if (planeT < PLANE_LIFT) return 'Rolling down the runway';
  if (planeT < PLANE_LIFT + 2.5) return 'Liftoff!';
  if (planeT < PLANE_LIFT + 7) return 'Climbing into the sky';
  return 'Cruising above the clouds';
}
function launchCaption() {
  if (launchT < 3) return 'Rocket mode. Countdown!';
  if (launchT < 4.5) return 'Ignition!';
  if (alt < 6) return 'Liftoff!';
  if (alt < 60) return 'Clearing the launch tower';
  if (alt < 220) return 'Punching through the clouds';
  if (alt < 620) return 'Leaving the atmosphere';
  return 'In space! Floating past the planets';
}
const altitude = t => { const u = Math.max(0, t - 4.5); return Math.min(900, 2.2 * Math.pow(u, 2.6)); };

function caption() {
  if (flash && flash.until > clockT) return flash.text;
  if (cab.active) return cabCaption();
  if (board.active) return 'Travelers climb aboard with their suitcases';
  if (parkState === 1) return homeK < 1 ? 'Heading home...' : parkZ < 0.5 ? (parkRobot ? 'The front door opens' : 'The garage door rolls up') : parkZ < parkD - 0.1 ? (parkRobot ? 'Robot marches into his house' : 'Pulling into the garage') : 'Closing up for the night';
  if (parkState === 2) return parkRobot ? 'Robot is home. Sweet dreams!' : 'All parked. Sweet dreams!';
  if (parkState === 3) return 'Coming back out to play';
  if (pending !== null) return plan.to === 0 ? 'Coming in to land' : 'Coming back down to the pad';
  if (!settled()) {
    let text = 'Transforming';
    for (const s of plan.steps) if (tt >= s.at) text = s.label;
    return text;
  }
  if (plan.to === 0) return planeCaption();
  if (plan.to === 3) return launchCaption();
  if (plan.to === 2) return trainT < 2.5 ? 'All aboard at Jasper Junction!' : on.stop ? (trainSpeed > 0.5 ? 'Brakes on, slowing down' : 'Stopped on the tracks') : trainSpeed < 5 ? 'Departing the station' : 'Chugging down the tracks';
  if (plan.to === 5) return tractorT < 1.5 ? 'Skyfly the tractor, ready for farm work!' : on.plow ? 'Skyfly plows the field for Jasper\'s farm' : tractorSpeed < 0.3 ? 'Skyfly is parked by the pasture' : 'Skyfly rolls down the farm lane past the animals';
  if (plan.to === 4) return truckT < 1.5 ? 'Big rig mode. Buckle up!' : on.wreck ? 'Wrecked! Press Crash! again to rebuild' : jrPhase === 2 ? 'Skyrender Jr. flies loops around the big rig' : jrPhase === 4 ? 'Jr. lines up and lands back in the trailer' : (blend.inter || 0) > 0.5 ? 'Rolling down Interstate 65 toward Exit 5' : 'Hauling Skyrender freight down the country road';
  return 'Robot mode, passengers in the chest cockpit';
}

const modeBtns = [...document.querySelectorAll('[data-mode]')];
function setButtons() { modeBtns.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.mode === targetMode()))); }
modeBtns.forEach(b => b.addEventListener('click', () => go(+b.dataset.mode)));
addEventListener('keydown', e => {
  if (e.target !== document.body) return;
  if (e.key >= '1' && e.key <= '6') go(+e.key - 1);
});
// ---------- season button ----------
const seasonBtn = document.getElementById('season');
seasonBtn.addEventListener('click', () => {
  applySeason(SEASON_ORDER[(SEASON_ORDER.indexOf(season) + 1) % 4]);
  seasonBtn.textContent = season;
});
applySeason('Summer');

// ---------- day / night ----------
let night = false, nightK = 0;
// ---------- the airport hall: rises up, the plane rolls in, people walk around with suitcases ----------
let hallK = 0, driveK = 0, viewK = 0, hallZ = 0, hallDoorK = 0;
const HALL_D = 16;                                       // how far the plane rolls in
function runHall(dt) {
  const want = plan.to === 0 && (on.peek || on.goin) && !parkState ? 1 : 0;
  hallK += (want - hallK) * Math.min(1, dt * 0.9);
  const canDrive = on.goin && hallK > 0.95 && pending === null && planeT === 0 && settled();
  hallDoorK += ((on.goin && hallK > 0.9 ? 1 : 0) - hallDoorK) * Math.min(1, dt * 1.5);
  driveK = Math.min(1, Math.max(0, driveK + (canDrive && hallDoorK > 0.9 ? 1 : -1) * dt * 3.0 / HALL_D));
  hallZ = sm(driveK) * HALL_D;
  viewK += (((on.peek || (on.goin && driveK > 0.2)) && hallK > 0.5 ? 1 : 0) - viewK) * Math.min(1, dt * 1.2);
  hallSet.visible = hallK > 0.001; hallSet.scale.y = Math.max(0.001, sm(hallK));
  airportScenery.scale.y = Math.max(0.001, 1 - sm(hallK)); airportScenery.visible = hallK < 0.999;
  for (const d of hall.doors) d.g.position.x = d.x0 + d.sx * 3.1 * sm(hallDoorK);
  if (!hallSet.visible) return;
  for (const b of hall.bags) { const a = b.a + clockT * 0.35; b.m.position.set(b.cx + Math.cos(a) * 2.6, 0.9, b.cz + Math.sin(a) * 1.43); b.m.rotation.y = -a; }
  for (const t of hall.travelers) {
    const u = ((clockT * t.speed / t.curve.getLength() + t.off) % 1 + 1) % 1;
    const pos = t.curve.getPointAt(u), tan = t.curve.getTangentAt(u);
    t.p.position.copy(pos); t.p.rotation.set(0, Math.atan2(tan.x, tan.z), 0);
    walkPose(t.p, clockT * 7 * t.speed + t.off * 9, 1);
    t.p.userData.arms[1].rotation.x = 0.35;                                   // holding the suitcase handle behind
  }
}

// ---------- bedtime: put Skyrender away in its garage, or the robot in its house ----------
// parkState: 0 out playing, 1 going home, 2 put away for the night, 3 coming back out
let parkState = 0, parkT = 0, parkQueued = false, parkWant = null, parkZ = 0, homeK = 0, parkWasNight = false, parkD = 12, parkRobot = false;
const parkBtn = document.getElementById('park');
const NAMES = ['Skyrender the jet', 'Skyrender the robot', 'the Skyrender train', 'the Skyrender rocket', 'the big rig', 'Skyfly'];
const H_SWAP = 1.8, H_DOOR = 1.2, H_SPEED = 3.2;
const parkDrive = () => parkD / H_SPEED;
function startPark() {
  if (plan.to === 0) { parkQueued = false; startBoarding(); return; }
  parkQueued = false; parkState = 1; parkT = 0; parkRobot = plan.to === 1;
  on = { size: 'medium' }; buildActions(-1);
  launchT = 0; planeT = 0; planeTravel = 0;
  parkD = plan.to === 4 ? 21 : plan.to === 1 ? 10 : 14;                    // the big rig needs to pull all the way in
  homeSet.position.x = parkRobot ? -home.HOUSE_X : 0;                       // line up the right front door
  parkWasNight = night;
  parkBtn.textContent = 'Take it out'; parkBtn.setAttribute('aria-pressed', 'true');
  say(parkRobot ? 'Time to go home, robot!' : 'Heading home to the Skyrender Garage', 2);
}
function requestPark() {
  if (board.active || cab.active) return;
  if (parkState === 1 || parkState === 2) { parkState = 3; parkT = 0; say('Good morning! Out it comes', 2); sfx.garage(); return; }
  if (parkState === 3) return;
  if (airborne()) { pending = plan.to; parkQueued = true; setButtons(); say('Landing first, then home', 2); return; }
  if (!settled()) { parkQueued = true; return; }
  startPark();
}
parkBtn.addEventListener('click', requestPark);
function runPark(dt) {
  if (parkQueued && pending === null && settled() && !airborne()) startPark();
  const D = parkDrive();
  if (parkState === 1 || parkState === 2) {
    parkT += dt;
    if (parkState === 1 && parkT > H_SWAP + H_DOOR + D + H_DOOR) {
      parkState = 2;
      if (!night) { night = true; dnBtn.textContent = 'Night'; dnBtn.setAttribute('aria-pressed', 'true'); }
      say(parkRobot ? 'Robot is home safe. Good night, Jasper!' : NAMES[plan.to][0].toUpperCase() + NAMES[plan.to].slice(1) + ' is parked in the garage. Good night, Jasper!', 4);
      sfx.goodnight();
    }
    if (parkState === 1 && parkT - dt < H_SWAP && parkT >= H_SWAP) sfx.garage();
    if (parkState === 1 && parkT - dt < H_SWAP + H_DOOR + D && parkT >= H_SWAP + H_DOOR + D) sfx.garage();
  } else if (parkState === 3) {
    parkT += dt;
    if (parkT > H_DOOR + D + H_DOOR + H_SWAP) {
      parkState = 0; parkZ = 0; homeK = 0;
      if (!parkWasNight && night) { night = false; dnBtn.textContent = 'Day'; dnBtn.setAttribute('aria-pressed', 'false'); }
      parkBtn.textContent = 'Put away'; parkBtn.setAttribute('aria-pressed', 'false');
      if (parkWant !== null) { const m = parkWant; parkWant = null; go(m); }
    }
  }
  // turn the timeline into: how far home has risen, how open the door is, how far in the toy is
  let doorK = 0, z = 0, hk = 0;
  if (parkState === 1 || parkState === 2) {
    const t = parkState === 2 ? 1e9 : parkT;
    hk = c01(t / H_SWAP);
    const t2 = t - H_SWAP, t3 = t2 - H_DOOR, t4 = t3 - D;
    doorK = t2 < 0 ? 0 : t2 < H_DOOR ? t2 / H_DOOR : t3 < D ? 1 : 1 - c01(t4 / H_DOOR);
    z = sm(c01(t3 / D));
  } else if (parkState === 3) {
    const t1 = parkT, t2 = t1 - H_DOOR, t3 = t2 - D;
    doorK = t1 < H_DOOR ? t1 / H_DOOR : t2 < D ? 1 : 1 - c01(t3 / H_DOOR);
    z = 1 - sm(c01(t2 / D));
    hk = 1 - c01((t3 - H_DOOR) / H_SWAP);
  }
  homeK = hk; parkZ = z * parkD;
  parkMoving = (parkState === 1 || parkState === 3) && z > 0.001 && z < 0.999;
  home.garageDoor.position.y = sm(doorK) * home.DH * 0.92;               // roll the slats up into the header
  home.garageDoor.scale.y = 1 - 0.85 * sm(doorK);
  home.houseDoor.rotation.y = -1.7 * sm(doorK);
  for (const m of home.lights) m.emissiveIntensity = 0.25 + 1.6 * nightK * homeK;
}
let parkMoving = false;
const dnBtn = document.getElementById('daynight');
dnBtn.addEventListener('click', () => {
  night = !night; dnBtn.textContent = night ? 'Night' : 'Day'; dnBtn.setAttribute('aria-pressed', String(night));
  say(night ? 'Good night, Jasper!' : 'Good morning, Jasper!', 2);
});
const NIGHT = { top: new THREE.Color(0x070d1c), bot: new THREE.Color(0x1d2840), moonLight: new THREE.Color(0xa9bbe6), hemiSky: new THREE.Color(0x6f80b0), cloud: new THREE.Color(0x8a93a6), win: new THREE.Color(0xffc870) };
const DAY = { sun: sun.color.clone(), hemiSky: hemi.color.clone(), cloud: cloudMat.color.clone() };
const skyTopNow = new THREE.Color(), skyBotNow = new THREE.Color();
// A moon hangs in the night sky (the sky dome follows the camera, so it stays far away)
const nightMoonMat = new THREE.MeshBasicMaterial({ color: 0xf3efe2, transparent: true, opacity: 0, fog: false, depthWrite: false });
const nightMoon = new THREE.Mesh(new THREE.CircleGeometry(7, 32), nightMoonMat);
nightMoon.position.set(-70, 95, -115); nightMoon.lookAt(0, 0, 0); nightMoon.renderOrder = -1; sky.add(nightMoon);
const craterMat = new THREE.MeshBasicMaterial({ color: 0xd8d2c0, transparent: true, opacity: 0, fog: false, depthWrite: false });
for (const [x, y, r] of [[-2, 1.5, 1.4], [2.4, -1.2, 1.1], [0.6, 3.4, 0.7], [-1, -3, 0.9]]) { const c = new THREE.Mesh(new THREE.CircleGeometry(r, 16), craterMat); c.position.set(x, y, 0.05); nightMoon.add(c); }
// Headlight beam: lights the road or rails ahead when the lamps are on after dark
const beam = new THREE.SpotLight(0xfff0d0, 0, 26, 0.42, 0.55, 1.2);
scene.add(beam, beam.target);
function applyNight(n, sp) {
  skyTopNow.copy(skyTop0).lerp(NIGHT.top, n); skyBotNow.copy(skyBot0).lerp(NIGHT.bot, n);
  hemi.intensity = 0.85 - 0.4 * n; hemi.color.copy(DAY.hemiSky).lerp(NIGHT.hemiSky, n);
  sun.intensity = 0.95 - 0.4 * n; sun.color.copy(DAY.sun).lerp(NIGHT.moonLight, n);
  rim.intensity = 0.4 - 0.15 * n;
  cloudMat.color.copy(DAY.cloud).lerp(NIGHT.cloud, n); cloudMat.emissiveIntensity = 0.25 - 0.12 * n;
  for (const [m, k0] of nightGlow) m.emissiveIntensity = k0 * (1 + 2.2 * n);
  nightMoonMat.opacity = craterMat.opacity = n * (1 - sp);
  rig.M.glass.emissive.copy(NIGHT.win); rig.M.glass.emissiveIntensity = 0.55 * n;     // warm light in the windows
  rig.M.visor.emissiveIntensity *= 1 + 1.5 * n;
}

// ---------- per-mode toggle buttons ----------
const actsEl = document.getElementById('acts');
let actsFor = -2;
function buildActions(m) {
  if (m === actsFor) return;
  actsFor = m; actsEl.textContent = '';
  if (m < 0) return;
  for (const a of ACTIONS[m]) {
    if (a.seg) {                                     // a row of choices where exactly one is picked
      const row = document.createElement('div'); row.className = 'seg'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Robot size');
      for (const [val, label] of a.seg) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
        b.setAttribute('aria-pressed', String(on[a.id] === val));
        b.addEventListener('click', () => { setSize(val); row.querySelectorAll('button').forEach((x, i) => x.setAttribute('aria-pressed', String(a.seg[i][0] === val))); });
        row.appendChild(b);
      }
      actsEl.appendChild(row); continue;
    }
    const b = document.createElement('button'); b.type = 'button'; b.textContent = a.label;
    if (!a.press) b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => doAction(a, b));
    actsEl.appendChild(b);
  }
}
function setSize(val) {
  if (on.size === val) return;
  const grow = val === 'big' || (val === 'medium' && on.size === 'small');
  on.size = val;
  say(val === 'big' ? 'GIANT Skyrender! Cannons, knee guards and power lights out' : val === 'small' ? 'Tiny Skyrender! Armor packs away, wings tuck in' : 'Back to regular size', 2.4);
  sfx.size(grow);
}
function say(text, secs = 1.6) { flash = { text, until: clockT + secs }; }
function doAction(a, b) {
  if (!a.press) { on[a.id] = !on[a.id]; b.setAttribute('aria-pressed', String(on[a.id])); }
  if (a.id === 'whistle') { for (let i = 0; i < 4; i++) setTimeout(() => emitPuff(true), i * 110); say('Toot toot!'); sfx.whistle(); }
  if (a.id === 'peek') say(on.peek ? 'Peeking inside Jasper Junction Airport' : 'Back out to the runway', 2);
  if (a.id === 'goin') { say(on.goin ? 'Skyrender rolls into the airport through the big glass doors' : 'Skyrender rolls back out to the runway', 2.4); if ((on.goin || on.peek) && planeT > 0) { pending = 0; setButtons(); } }
  if (a.id === 'peek' && on.peek && planeT > 0) { pending = 0; setButtons(); }
  if (a.id === 'board') requestPark();
  if (a.id === 'honk') { hop = 1; say('Beep beep!'); sfx.honk(); }
  if (a.id === 'moo') { say(['Moo! Oink oink! Neigh!', 'Moooo! Oink! Neeeigh!'][Math.random() < 0.5 ? 0 : 1], 2.2); sfx.farm(); for (const a2 of animals) a2.c.userData.hop = 1; }
  if (a.id === 'plow' && plan.to === 5) say(on.plow ? 'Plow down! Digging nice straight rows' : 'Plow up', 1.8);
  if (a.id === 'spray') say(on.spray ? 'Sprayer booms on. Watering the crops!' : 'Sprayer off', 1.8);
  if (a.id === 'cab') say(on.cab ? 'Cab doors open. Hi, farmer!' : 'Cab doors shut', 1.6);
  if (a.id === 'horn') { hop = 0.6; say('HONK HONK!'); sfx.airhorn(); }
  if (a.id === 'wreck') {
    if (on.wreck) {
      if ((blend.wreck || 0) < 0.05 && !crash) startCrash();
      else if (crash) crash.back = false;
      if (!crash) { scatter(); hitNow(); }
    }
    else { say('Putting Skyrender back together...', 2.2); sfx.whirr(1.6); }
  }
  if (a.id === 'tdoors') say(on.tdoors ? 'Trailer doors swing open. Look who rides inside!' : 'Trailer doors latched', 2);
  if (a.id === 'stop' && plan.to === 4) say(on.stop ? 'Brakes on. The big rig stops' : 'Rolling again', 1.8);
  if (a.id === 'inter') say(on.inter ? 'Up the on-ramp and onto the interstate!' : 'Off at Exit 5, back to the country road', 2.4);
  if (a.id === 'jr') { say(on.jr ? 'Skyrender Jr. rolls out the back for takeoff!' : 'Jr. is coming home', 2.2); if (on.jr) sfx.jet(); }
  if (a.id === 'launch' && plan.to === 3 && settled() && launchT < 3) { launchT = 3; on.arm = true; }
  if (a.id === 'wave' && on.wave) say('Hi Jasper!', 2);
  if (a.id === 'march' && on.march) say('Stomp, stomp, stomp!', 2);
}
// The scrubber drags back and forth through the current transformation and holds where you leave it.
scrub.addEventListener('input', () => {
  if (pending !== null) return;
  scrubbing = true; paused = true; launchT = 0; planeT = 0; trainT = 0;
  tt = scrub.value / 1000 * plan.T;
});
scrub.addEventListener('change', () => { scrubbing = false; });

let fitScale = 1;
let theta = 0.9, phi = 1.15, radius = 17, dragging = false, lastX = 0, lastY = 0, idle = 0;
stage.addEventListener('pointerdown', e => { if (cab.active) { cabPointerDown(e); stage.setPointerCapture(e.pointerId); return; } dragging = true; lastX = e.clientX; lastY = e.clientY; stage.setPointerCapture(e.pointerId); });
stage.addEventListener('pointermove', e => {
  if (cab.active) { cabPointerMove(e); return; }
  if (!dragging) return;
  theta -= (e.clientX - lastX) * 0.008;
  phi = Math.min(1.5, Math.max(0.25, phi - (e.clientY - lastY) * 0.006));
  lastX = e.clientX; lastY = e.clientY; idle = 0;
});
stage.addEventListener('pointerup', e => { dragging = false; if (cab.active) cabPointerUp(e); });
stage.addEventListener('wheel', e => { e.preventDefault(); if (cab.active) { cabWheel(e); return; } radius = Math.min(32, Math.max(8, radius + e.deltaY * 0.012)); }, { passive: false });

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
  camera.aspect = w / h; camera.fov = w < h ? 54 : 36;
  // Lift the model clear of the control bar at the bottom of the screen
  const bar = document.querySelector('.bar');
  camera.setViewOffset(w, h, 0, Math.round((bar ? bar.offsetHeight : 0) * 0.3), w, h);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- steam puffs from the smokestack ----------
const puffs = [];
for (let i = 0; i < 46; i++) {
  const m = new THREE.Mesh(puff, new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 1, transparent: true, opacity: 0, depthWrite: false }));
  m.visible = false; scene.add(m); puffs.push({ m, life: 0 });
}
let puffClock = 0, puffNext = 0;
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

// Toggles act on top of the current pose, easing in and out
const lerpJ = (j, pose, k) => {
  if (k <= 0) return;
  j.position.x += (pose.P[0] - j.position.x) * k; j.position.y += (pose.P[1] - j.position.y) * k; j.position.z += (pose.P[2] - j.position.z) * k;
  j.rotation.x += (pose.R[0] - j.rotation.x) * k; j.rotation.y += (pose.R[1] - j.rotation.y) * k; j.rotation.z += (pose.R[2] - j.rotation.z) * k;
};

const lerp = THREE.MathUtils.lerp, sm = t => t * t * (3 - 2 * t), c01 = t => Math.min(1, Math.max(0, t));

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
  const J = rig.jr.j, home = plan.to === 4 && settled() && !parkState;
  if (!home) { jrPhase = 0; jrU = 0; jrLoop = 0; }
  // phase 1 = rolling out and climbing, 2 = looping, 3 = finishing the lap to line up, 4 = landing and rolling back in
  if (home && on.jr) { if (jrPhase === 0) { jrPhase = 1; } else if (jrPhase === 3) jrPhase = 2; else if (jrPhase === 4) jrPhase = 1; }
  if (home && !on.jr) { if (jrPhase === 1) jrPhase = 4; else if (jrPhase === 2) jrPhase = 3; }
  if (jrPhase === 1) { jrU = Math.min(1, jrU + dt / OUT_T); if (jrU >= 1) { jrPhase = 2; jrLoop = 0; } }
  else if (jrPhase === 2 || jrPhase === 3) {
    const before = jrLoop; jrLoop += dt / RING_T;
    if (jrPhase === 3 && !on.wreck && Math.floor(jrLoop) > Math.floor(before)) { jrPhase = 4; jrU = 1; jrLoop = 0; }
    jrLoop %= 1;
  } else if (jrPhase === 4) { jrU = Math.max(0, jrU - dt / OUT_T); if (jrU <= 0) { jrPhase = 0; say('Jr. is safe back in the trailer', 2); } }
  jrW += ((jrPhase ? 1 : 0) - jrW) * Math.min(1, dt * 4);
  const flying = jrPhase === 2 || jrPhase === 3 ? 1 : clamp01((jrU - 0.4) / 0.25);
  for (const w of rig.jr.wings) w.g.rotation.y = w.s * Math.PI / 2 * 0.92 * (1 - ease(clamp01(jrPhase === 2 || jrPhase === 3 ? 1 : (jrU - 0.25) / 0.3)));
  rig.jr.gear.position.y = 0.09 * ease(flying); rig.jr.gear.visible = flying < 0.98;
  rig.jr.flame.visible = jrPhase !== 0 && (jrPhase !== 1 && jrPhase !== 4 || jrU > 0.2);
  rig.jr.flame.scale.setScalar(0.8 + Math.random() * 0.4);
  if (jrW < 0.001) return;
  if (!home) { J.position.lerp(jrPos, jrW); J.quaternion.slerp(jrQ, jrW); return; }   // swoop home if the mode changes mid-flight
  const curve = jrPhase === 2 || jrPhase === 3 ? jrRing : jrOut, u = jrPhase === 2 || jrPhase === 3 ? jrLoop : ease(jrU);
  curve.getPointAt(Math.min(0.9999, u), jrPos); curve.getTangentAt(Math.min(0.9999, u), jrTan);
  // bank into the turns: how fast the heading is swinging sideways
  const turn = jrPrevTan.x * jrTan.z - jrPrevTan.z * jrTan.x; jrPrevTan.copy(jrTan);
  jrRoll += (THREE.MathUtils.clamp(-turn * 40, -0.8, 0.8) * flying - jrRoll) * Math.min(1, dt * 3);
  _m.lookAt(jrTan, new THREE.Vector3(), new THREE.Vector3(0, 1, 0)); jrQ.setFromRotationMatrix(_m);
  jrQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), jrRoll));
  J.position.lerp(jrPos, jrW); J.quaternion.slerp(jrQ, jrW);
}
function applyToggles(dt) {
  for (const id of ['door', 'gear', 'wave', 'march', 'mask', 'hatch', 'gate', 'tdoor', 'tdoors', 'wreck', 'big', 'small', 'inter', 'plow', 'cab']) {
    let want = settled() && plan.to === 1 && (id === 'big' || id === 'small') ? (on.size === id ? 1 : 0) : settled() && on[id] ? 1 : 0;
    if (id === 'wreck' && crash && !crash.hit) want = 0;
    blend[id] = (blend[id] || 0) + (want - (blend[id] || 0)) * Math.min(1, dt * (id === 'inter' ? 0.9 : 3));
  }
  const k = id => ease(clamp01(blend[id]));
  lerpJ(rig.sideDoor, rig.sideDoor.userData.poses[2], k('door'));
  for (const g of rig.named.gear) lerpJ(g, g.userData.stow, k('gear'));
  lerpJ(rig.mask, rig.mask.userData.poses[0], k('mask'));
  for (const d of rig.named.hatch) lerpJ(d, d.userData.poses[0], k('hatch'));
  for (const g of rig.truckBits.gateTops) g.j.rotation.z += -g.s * 1.5 * k('gate');     // top of the tailgate folds down
  for (const d of rig.truckBits.doors) d.j.rotation.y += -d.s * 1.1 * k('tdoor');       // cab doors swing out on their front hinges
  jrDoor += ((plan.to === 4 && settled() && (on.tdoors || jrPhase) ? 1 : 0) - jrDoor) * Math.min(1, dt * 3);
  for (const d of rig.truckBits.trailerDoors) d.j.rotation.y += -d.s * 2.7 * ease(clamp01(jrDoor)); // trailer doors swing wide open
  wreckPose(blend.wreck || 0);
  // Tractor: plow digs in, cab doors swing open
  for (const th of rig.named.thighs) th.rotation.x -= 0.075 * k('plow');
  for (const d of rig.tractorBits.cabDoors) d.j.rotation.y += -d.s * 1.2 * k('cab');
  flyJr(dt);
  moveTraffic(dt); runCrash(dt); runWalkers(dt);
  const w = k('wave');
  if (w > 0) {                                        // right arm swings up and waves
    rig.named.uaR.rotation.y -= 2.3 * w;
    rig.named.faR.rotation.x += (0.6 + Math.sin(clockT * 9) * 0.45) * w;
  }
  // Size: GIANT grows and slides out extra detail; tiny shrinks and packs parts away
  const kb = k('big'), ks = k('small'), N = rig.named;
  const scale = 1 + 1.3 * kb - 0.58 * ks;
  rig.bot.scale.setScalar(scale);
  for (const b of rig.sizeBits.big) b.g.position.lerpVectors(b.from, b.to, kb);
  for (const w of N.wings) { w.j.rotation.z -= w.s * 0.6 * kb; w.j.rotation.y += w.s * 1.05 * ks; }   // battle wings spread wide / fold down like a cape
  for (const j of [...N.pauldrons, ...N.nozzles, ...N.ears, ...N.hips]) lerpJ(j, j.userData.stow, ks);
  lerpJ(rig.mask, rig.mask.userData.poses[1], ks);
  const sh = 8 * Math.max(1, scale);
  if (sun.shadow.camera.right !== sh) { Object.assign(sun.shadow.camera, { left: -sh, right: sh, top: sh, bottom: -sh, far: 40 * Math.max(1, scale) }); sun.shadow.camera.updateProjectionMatrix(); }
  // March in place: each thigh lifts while its knee bends back the same amount, so the foot
  // rises and comes down flat. A thump every time a foot lands; the body rocks side to side.
  if (parkMoving && plan.to === 1) blend.march = 1;
  const mk = k('march');
  if (mk > 0) {
    marchPh += dt * 4.4;
    for (const [i, L] of rig.named.legs.entries()) {
      const wave = Math.sin(marchPh + i * Math.PI), lift = Math.max(0, wave) * 0.75 * mk;
      L.thigh.rotation.x -= lift; L.knee.rotation.x += lift;
      if (L.was > 0 && wave <= 0 && mk > 0.5) { sfx.stomp(); stompK = scale; }
      L.was = wave;
    }
    rig.joints[0].rotation.z += Math.sin(marchPh) * 0.035 * mk;
  } else marchPh = 0;
}

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const sdt = dt * speed;
  clockT += dt;

  // ---- advance the transformation (or come home from the sky first) ----
  if (pending !== null) {
    if (plan.to === 3) launchT = Math.max(0, launchT - sdt * 4);
    if (plan.to === 0) planeT = Math.max(0, planeT - sdt * (planeT > PLANE_LIFT ? 2.5 : 1.2));
    const down = plan.to === 3 ? launchT === 0 : planeT <= 0;
    if (down) { const m = pending; pending = null; launchT = 0; planeT = 0; if (m !== plan.to) startMorph(m); else setButtons(); }
  } else if (!paused && tt < plan.T) {
    tt = Math.min(plan.T, tt + sdt);
  }
  if (settled()) mode = plan.to;
  if (!scrubbing) scrub.value = Math.round(clamp01(tt / plan.T) * 1000);
  poseRig(rig, plan, tt, ease);
  if (settled()) buildActions(parkState || parkQueued ? -1 : plan.to);
  runPark(dt); runHall(dt);
  applyToggles(dt);
  noseTuck(); runBoarding(dt);

  // ---- the world blends along with the transformation ----
  const k = ease(clamp01(tt / plan.T)), goal = ENV[plan.to];
  for (const key in env) env[key] = envFrom[key] + (goal[key] - envFrom[key]) * k;
  const live = settled() && !paused && !parkState;

  // Plane: takeoff roll, liftoff and climb
  if (plan.to === 0 && live && pending === null && !on.peek && !on.goin && !board.active && !cab.active && board.k < 0.01) planeT = Math.min(60, planeT + sdt);
  const roll = clamp01((planeT - 2) / (PLANE_LIFT - 2));
  planeSpeed = plan.to === 0 ? (planeT < 2 ? 0 : 6 + 22 * Math.min(1, roll * 1.2)) : 0;
  const air = plan.to === 0 ? ease(clamp01((planeT - PLANE_LIFT) / 7)) : 0;
  planeTravel += planeSpeed * sdt * (1 - air);

  // Rocket: countdown starts by itself once the rocket is standing on the pad
  const onPad = plan.to === 3 && live && pending === null;
  if (onPad) launchT = Math.min(LT, launchT + sdt);
  alt = plan.to === 3 && (settled() || pending !== null) ? altitude(launchT) : 0;
  const sp = clamp01((alt - 150) / 450);             // 0 = sky, 1 = space

  // Train: steam at the platform, then pulls out of the station
  if (plan.to === 2 && live) trainT += sdt;
  const wantSpeed = plan.to === 2 && live && trainT > 2.5 && !on.stop ? 8 : 0;
  trainSpeed += (wantSpeed - trainSpeed) * Math.min(1, dt * (wantSpeed > trainSpeed ? 0.35 : 1.6));
  if (trainSpeed < 0.01) trainSpeed = 0;
  stationTravel += trainSpeed * sdt;
  crank += (trainSpeed + truckSpeed + tractorSpeed * 0.6 + (parkMoving && plan.to !== 1 && plan.to !== 3 ? H_SPEED * (parkState === 3 ? -1 : 1) : 0)) / 0.4 * sdt;      // the same big wheels drive the train and the truck
  for (const w of rig.wheels) w.rotation.x += trainSpeed / 0.22 * sdt;
  for (const d of rig.drivers) d.w.rotation.x = crank + d.phase;
  for (const r of rig.rods) {                         // side rods ride around with the crank pins
    const a = crank + r.phase, kk = env.track;
    r.j.position.y += 0.2 * (Math.cos(a) - 1) * kk;
    r.j.position.z += 0.2 * Math.sin(a) * kk;
  }

  // Tractor: putters slowly down the farm lane; the plow kicks up dirt
  if (plan.to === 5 && live) tractorT += sdt;
  const wantTractor = plan.to === 5 && live && tractorT > 1.5 && !on.stop ? (on.plow ? 2.2 : 3.6) : 0;
  tractorSpeed += (wantTractor - tractorSpeed) * Math.min(1, dt * 0.8);
  if (tractorSpeed < 0.01) tractorSpeed = 0;
  farmTravel += tractorSpeed * sdt;
  farmMove.position.z = wrap(-farmTravel, FARM_P / 2);
  if (plan.to === 5 && settled()) {                                    // little puffs from the exhaust stack
    tractorPuff += sdt;
    if (tractorPuff > (tractorSpeed > 0.3 ? 0.35 : 0.8)) { tractorPuff = 0; rig.stack.getWorldPosition(stackTop); stackTop.y += 0.45; stackTop.x = 0; emitPuff(0.45, stackTop.clone(), 0x4a4a4a); }
  }
  if (plan.to === 5 && settled() && on.spray) {                       // fine mist along both sprayer booms
    sprayClock += sdt;
    if (sprayClock > 0.05) { sprayClock = 0;
      const w = rig.named.wings[Math.random() < 0.5 ? 0 : 1]; const sp = 0.6 + Math.random() * 3.0;
      stackTop.set(w.s * sp, -0.1, -1.0 - sp * 0.2).applyMatrix4(w.j.matrixWorld); emitPuff(0.22, stackTop.clone(), 0xd8ecf7); }
  }
  if (plan.to === 5 && on.plow && tractorSpeed > 0.3) { plowDust += sdt; if (plowDust > 0.18) { plowDust = 0; for (const f of rig.named.feet) emitPuff(0.5, f, 0x7a5a3a); } }
  for (const a of animals) {                                          // grazing, wandering, wiggling
    const c = a.c, ud = c.userData, t = clockT + a.ph;
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

  // Truck: buckle up, then cruise down the road
  if (plan.to === 4 && live) truckT += sdt;
  let wantTruck = plan.to === 4 && live && truckT > 1.5 && !on.wreck && !on.stop ? 10 + 6 * (blend.inter || 0) : 0;
  if (crash && crash.wait) wantTruck = Math.max(12, wantTruck);           // keep rolling toward the building
  if (crash && crash.type === 'bld' && !crash.wait) truckSpeed = 0;
  truckSpeed += (wantTruck - truckSpeed) * Math.min(1, dt * (wantTruck > truckSpeed ? 0.5 : 1.8));
  if (truckSpeed < 0.01) truckSpeed = 0;
  roadTravel += truckSpeed * sdt;
  laneSet.position.z = -(roadTravel % LANE_DASH);
  fenceSet.position.z = -(roadTravel % FENCE);
  roadProps.position.z = wrap(-roadTravel, 60);
  cBld.position.z = iBld.position.z = iBldFar.position.z = wrap(-roadTravel, BLD_PERIOD / 2);
  iDash.position.z = -(roadTravel % I_DASH); iPosts.position.z = -(roadTravel % I_POST); iProps.position.z = wrap(-roadTravel, I_SIGN / 2);

  // Everything on the ground slides past whatever is moving
  const groundSpeed = trainSpeed + truckSpeed + tractorSpeed + planeSpeed * (1 - air);
  travel += groundSpeed * sdt;
  tieSet.position.z = -(stationTravel % TIE);
  postSet.position.z = -(stationTravel % POST);
  stationSet.position.z = wrap(-stationTravel, 160);
  dashSet.position.z = -(planeTravel % DASH);
  airportScenery.position.z = wrap(-planeTravel, 160);
  for (const s of scrollers) s.obj.position.z = wrap(s.z0 - travel * s.k, s.L);

  groundSet.position.y = -90 * air * air - alt - 0.2 * env.track;
  groundSet.visible = alt < 400 && air < 0.98;
  const away = 1 - sm(homeK);
  homeSet.scale.y = Math.max(0.001, sm(homeK)); homeSet.visible = homeK > 0.001;
  trackSet.scale.y = Math.max(0.001, env.track * away); trackSet.visible = env.track * away > 0.001;
  airportSet.scale.y = Math.max(0.001, env.runway * away); airportSet.visible = env.runway * away > 0.001;
  padSet.position.y = -0.3 * (1 - env.pad * away);
  launchSet.scale.y = Math.max(0.001, env.launch * away); launchSet.visible = env.launch * away > 0.001;
  const ik = ease(clamp01(blend.inter || 0));                 // country road sinks away as the interstate rises
  roadSet.scale.y = Math.max(0.001, env.road * (1 - ik) * away); roadSet.visible = env.road * (1 - ik) * away > 0.001;
  interSet.scale.y = Math.max(0.001, env.road * ik * away); interSet.visible = env.road * ik * away > 0.001;
  farmSet.scale.y = Math.max(0.001, env.farm * away); farmSet.visible = env.farm * away > 0.001;
  // The swing arm stays at the hatch until the countdown (or until Jasper swings it away)
  const armWant = plan.to === 3 && settled() && !on.arm && launchT < 1.2 ? 1 : 0;
  armK += (armWant - armK) * Math.min(1, dt * 1.5);
  swingArm.rotation.y = -1.45 * (1 - armK);
  cloudSet.position.y = 40 * (1 - air) - alt * 0.7;
  cloudSet.visible = alt < 500;
  cloudMat.opacity = 0.5 + 0.5 * air;
  const cruise = (air * 16 + groundSpeed * 0.3) * speed;
  for (const c of clouds) { c.position.z -= cruise * dt; if (c.position.z < -70) c.position.z += 140; }

  // Birds circle overhead; when the plane is flying they stream past at its height
  birdSet.position.y = 6 * (1 - air) - alt * 0.9;
  birdSet.visible = alt < 300;
  for (const f of flocks) {
    f.a += f.w * dt;
    f.cz = wrap(f.cz - cruise * dt * 0.8, 60);
    const fx = f.cx + Math.cos(f.a) * f.r, fz = f.cz + Math.sin(f.a) * f.r, fy = f.cy * (1 - air) + air * (8 + Math.sin(f.a * 2) * 3);
    const heading = Math.atan2(-Math.sin(f.a) * f.w, Math.cos(f.a) * f.w);
    for (const b of f.birds) {
      const o = b.userData.off, c = Math.cos(heading), s = Math.sin(heading);
      b.position.set(fx + o[0] * c + o[2] * s, fy + o[1], fz - o[0] * s + o[2] * c);
      b.rotation.y = heading;
      const flap = Math.sin(clockT * 9 + b.userData.ph) * 0.65;
      b.userData.L.rotation.z = flap; b.userData.R.rotation.z = -flap;
    }
  }

  // Sky fades to black, stars, Earth and the other planets come up
  nightK += ((night ? 1 : 0) - nightK) * Math.min(1, dt * 1.5);
  applyNight(ease(clamp01(nightK)), sp);
  sky.material.uniforms.top.value.copy(skyTopNow).lerp(spaceTop, sp);
  sky.material.uniforms.bottom.value.copy(skyBotNow).lerp(spaceBot, sp);
  scene.fog.color.copy(fog0).lerp(NIGHT.bot, ease(clamp01(nightK))).lerp(spaceBot, sp);
  scene.fog.near = 45 - 20 * air;                    // the ground fades into haze as the plane climbs
  scene.fog.far = 170 - 95 * air + sp * 3000;
  starMat.opacity = Math.max(sp, 0.85 * ease(clamp01(nightK)));
  space.visible = sp > 0;
  earthMat.opacity = sp; atmoMat.opacity = 0.35 * sp; moonMat.opacity = sp;
  for (const m of planetMats) m.opacity = sp;
  earth.rotation.y += dt * 0.02; giant.rotation.y += dt * 0.03;

  // Engines: countdown -> ignition -> full burn -> gentle cruise in orbit
  const counting = onPad && launchT < 3;
  if (onPad) thrust = launchT < 3 ? 0 : launchT < 4.5 ? (launchT - 3) / 1.5 : sp >= 1 ? Math.max(0.35, thrust - dt * 0.5) : 1;
  else thrust = pending !== null && plan.to === 3 ? 0.6 : parkMoving && plan.to === 3 ? 0.3 : 0;
  const flick = reduceMotion ? 1 : 0.85 + Math.random() * 0.3;
  for (const f of rig.flames) {
    f.visible = thrust > 0.01;
    const w = 0.5 + 0.5 * thrust;
    f.scale.set(w * flick, w * flick, thrust * flick * (launchT > 4.5 ? 1.25 : 1));
  }
  rig.M.glow.emissiveIntensity = 0.35 + 2.5 * thrust + 0.6 * planeSpeed / 28;
  const lampOn = (env.track > 0.5 && !on.lamp) || ((plan.to === 4 || plan.to === 5) && on.lights && !on.wreck);
  rig.M.marker.emissiveIntensity = (plan.to === 4 || plan.to === 5) && on.lights ? (on.wreck ? (Math.sin(clockT * 8) > 0 ? 2.5 : 0.1) : 1.8) : 0.35;   // hazards blink after a crash
  rig.M.tail.emissiveIntensity = plan.to === 4 && on.lights ? 1.6 : 0.5;
  rig.M.head.emissiveIntensity = lampOn ? 2.2 : 0;
  rig.M.head.color.setHex(lampOn ? 0xfff6dc : 0x6e6c66);             // an unlit lens is dull grey, not white
  const nk = ease(clamp01(nightK));
  beam.intensity += ((lampOn ? 3.2 * nk : 0) - beam.intensity) * Math.min(1, dt * 6);
  const strobe = plan.to === 0 && on.lights && Math.sin(clockT * 12) > 0.6;
  rig.M.navR.emissiveIntensity = rig.M.navG.emissiveIntensity = strobe ? 3 : 0.6;
  rig.M.beacon.emissiveIntensity = plan.to === 0 && on.lights ? (Math.sin(clockT * 7) > 0 ? 2.5 : 0.2) : 0.8;
  const cd = counting ? String(3 - Math.floor(launchT)) : (onPad && launchT < 5.5 && launchT >= 3 ? 'Blast off!' : '');
  if (countdown.textContent !== cd) { if (cd) sfx.beep(cd === 'Blast off!'); countdown.textContent = cd; }

  // Launch smoke billows at ignition and stays on the pad as it climbs away
  const puffK = plan.to === 3 && (onPad || pending !== null) ? clamp01((launchT - 3) / 3) : 0;
  smokeMat.opacity = 0.75 * puffK * (1 - clamp01((launchT - 10) / 6));
  for (const m of smoke) {
    m.visible = puffK > 0;
    const d = m.userData.d + puffK * 7;
    m.position.set(Math.cos(m.userData.a) * d, 0.6 + puffK * 1.2, Math.sin(m.userData.a) * d);
    m.scale.setScalar(m.userData.s * (0.4 + puffK * 2.2));
  }

  // ---- set it down: lowest part rests on the ground, or wheel treads on the rail tops ----
  flyer.position.set(0, 0, 0); flyer.rotation.set(0, 0, 0);
  rig.bot.position.y = 0;
  flyer.updateMatrixWorld(true);                           // measure with the flight group back at the origin
  box.copy(exactBox(THREE, rig.bot, skipBox)); box.getCenter(center);
  if ((blend.wreck || 0) > 0.001) { rig.bot.position.y = snapY; center.y += snapY; }   // wrecked pieces settle on the road
  else { rig.bot.position.y = snapY = -box.min.y - 0.03 * env.track; center.y -= box.min.y; }      // flanges dip just inside the rails
  beam.position.set(0, 1.1, box.max.z - 0.3); beam.target.position.set(0, 0, box.max.z + 9);

  const rumble = reduceMotion ? 0 : Math.min(1, trainSpeed / 8 + (air < 0.05 ? planeSpeed / 28 : 0));
  const pitch = plan.to === 0 ? -0.13 * Math.sin(Math.PI * clamp01((planeT - PLANE_LIFT + 0.8) / 6)) : 0;   // nose up at liftoff
  flyer.position.y = air * (8 + Math.sin(clockT * 0.9) * 0.25) + Math.abs(Math.sin(clockT * 11)) * 0.012 * rumble;
  flyer.rotation.z = air * Math.sin(clockT * 0.45) * 0.05 + Math.sin(clockT * 9) * 0.002 * rumble;
  flyer.rotation.x = pitch + air * Math.sin(clockT * 0.7) * 0.02;
  const shake = reduceMotion || !onPad ? 0 : thrust * (1 - sp) * 0.06;
  flyer.position.x = (Math.random() - 0.5) * shake; flyer.position.z = (Math.random() - 0.5) * shake;
  // In orbit the rocket turns slowly and steadily
  if (plan.to === 3 && settled() && sp > 0 && !reduceMotion) orbitRoll += sp * dt * 0.12; else if (launchT === 0) orbitRoll = 0;
  flyer.rotation.y = orbitRoll + veer.yaw; flyer.position.x += veer.x; flyer.position.z += parkZ + hallZ;
  if (stompK > 0) { stompK = Math.max(0, stompK - dt * 6); if (!reduceMotion) flyer.position.y -= Math.sin(Math.min(1, stompK) * Math.PI) * 0.025 * stompK; }
  if (hop > 0) { hop = Math.max(0, hop - dt * 1.8); flyer.position.y += Math.abs(Math.sin(hop * Math.PI * 3)) * 0.18 * hop; }
  center.y += flyer.position.y;

  // Petals, leaves or snow drift down around the toy (not up in the sky)
  fallers.visible = fallActive > 0 && air < 0.3 && alt < 30;
  if (fallers.visible) {
    fallers.position.set(target3.x, 0, target3.z);
    const sway = season === 'Winter' ? 0.25 : 0.9;
    for (let i = 0; i < fallActive; i++) {
      let y = fallPos[i * 3 + 1] - fallSpeed * dt * (0.7 + (fallSeed[i] % 1) * 0.6);
      if (y < 0) y += 22;
      fallPos[i * 3 + 1] = y;
      fallPos[i * 3] += Math.sin(clockT * 1.3 + fallSeed[i]) * sway * dt;
      fallPos[i * 3 + 2] -= groundSpeed * sdt;              // blow past when moving
      if (fallPos[i * 3 + 2] < -25) fallPos[i * 3 + 2] += 50;
    }
    fallGeo.attributes.position.needsUpdate = true;
  }
  sky.position.copy(camera.position);

  // Steam: gentle puffs at the station, faster chuffs as the train speeds up
  const steamy = env.track > 0.99 && plan.to === 2;
  puffClock += sdt;
  if (steamy && puffClock >= puffNext) { emitPuff(trainSpeed < 1); if (trainSpeed > 0.5) sfx.chuff(Math.min(1, trainSpeed / 6)); puffClock = 0; puffNext = trainSpeed > 0.5 ? Math.max(0.12, 1.4 / (trainSpeed / 0.4) * Math.PI) : 0.9; }
  // Big rig: black smoke chugs out of the chrome stacks
  if (plan.to === 4 && settled() && on.smoke && !on.wreck && rig.truckBits.stacks) {
    smokeClock += sdt;
    if (smokeClock > 0.1) { smokeClock = 0; const st = rig.truckBits.stacks[Math.random() < 0.5 ? 0 : 1]; emitPuff(0.45 + Math.random() * 0.25, st, 0x3b3b3d); }
  }
  for (const p of puffs) {
    if (p.life <= 0) continue;
    p.life -= sdt * 0.42;
    p.m.position.y += sdt * (1.1 + 0.4 * p.big);
    p.m.position.z -= sdt * (trainSpeed * 0.95 + truckSpeed * 0.95 + tractorSpeed * 0.95 + 0.4);
    p.m.position.x += sdt * 0.15;
    const age = 1 - p.life;
    p.m.scale.setScalar((0.22 + age * 1.3) * p.big);
    p.m.material.opacity = 0.85 * Math.min(1, age * 6) * Math.max(0, p.life);
    if (p.life <= 0) p.m.visible = false;
  }

  for (const f of rig.fans) f.rotation.z += dt * (5 + 14 * planeSpeed / 28 + 10 * air);
  if (rumbleGain && soundOn) {                         // rocket roar, jet whoosh, truck engine
    const roar = thrust * (1 - 0.7 * sp), jet = plan.to === 0 ? 0.25 * Math.min(1, planeSpeed / 28 + air) : 0, eng = 0.18 * truckSpeed / 10;
    rumbleGain.gain.setTargetAtTime(cab.active ? 0.1 + 0.35 * (cab.engine || 0) : Math.min(0.9, roar * 0.8 + jet + eng), actx.currentTime, 0.15);
    rumbleFilter.frequency.setTargetAtTime(roar > 0.05 ? 260 + 300 * roar : jet > 0.05 ? 900 : 140, actx.currentTime, 0.2);
  }
  const text = caption();
  if (stepLabel.textContent !== text) { stepLabel.textContent = text; if (!settled() && pending === null) sfx.click(); }

  target3.lerp(center, 1 - Math.exp(-dt * 3));
  if (viewK > 0.001) { const vk = sm(viewK); target3.x += (0 - target3.x) * vk; target3.z += (hall.Z + hall.D * 0.4 - target3.z) * vk; target3.y += (1.5 - target3.y) * vk; }
  if (homeK > 0) { const dk = sm(homeK); target3.x += (0 - target3.x) * dk * 0.6; target3.z += (home.GZ - 2 - target3.z) * dk * 0.6; target3.y += (5 - target3.y) * dk * 0.5; }
  if (sp > 0 || air > 0) target3.y = center.y;
  // Pull back for tall poses (the rocket on the pad) so the whole toy stays in frame
  const tallest = box.max.y - box.min.y;
  const span = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
  const want = Math.max(1, 0.7 * tallest / Math.tan(camera.fov * Math.PI / 360) / 17, span / 11, 1 + 1.0 * sm(homeK)) * (1 - sm(viewK)) + 1.7 * sm(viewK);
  fitScale += (want - fitScale) * (1 - Math.exp(-dt * 2));
  idle += dt;
  if (!dragging && idle > 2 && !reduceMotion && homeK < 0.01) theta += dt * (0.1 - 0.06 * viewK);
  if (viewK > 0.01 && !dragging) phi += (0.78 - phi) * Math.min(1, dt * 1.2) * viewK;   // look down into the airport
  if (homeK > 0.01 && !dragging) {                    // at bedtime, swing around to look at the front door
    const want = Math.PI - 0.55; let d = ((want - theta) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    theta += d * Math.min(1, dt * 1.6) * homeK;
    phi += (1.12 - phi) * Math.min(1, dt * 1.2) * homeK;
  }
  const rr = radius * fitScale;
  const ph = phi + (1.42 - phi) * sp;                // in orbit, look out toward the horizon and the planets
  camera.position.set(
    target3.x + rr * Math.sin(ph) * Math.sin(theta),
    target3.y + rr * Math.cos(ph),
    target3.z + rr * Math.sin(ph) * Math.cos(theta));
  camera.lookAt(target3);
  if (cab.active) { updateCabin(dt); renderer.render(cabinScene, cabinCam); } else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
// Start the toy: called by main.js once every module is built and linked.
function start() {
  setButtons();
  frame();
}

export { blend, buildActions, c01, clockT, crash, emitPuff, jrPhase, lerp, link, on, plan, planeT, rig, say, setCrash, setOn, setPlaneT, sm, start, truckSpeed };
