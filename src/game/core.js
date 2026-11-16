import * as THREE from 'three';
import { exactBox, planMorph, poseRig } from '../rig/rig.js';
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
import { setMix, sfx } from '../audio/audio.js';
import { ENV, S, airborne, box, c01, clamp01, ease, flyer, lerp, lerpJ, linked, rig, say, settled, sm, targetMode, wrap } from './state.js';
import { buildPuffs, emitPuff, runPuffs, stackTop } from './puffs.js';
import { runTractor } from './tractor.js';
import { buildCrossing, crossingCaption, crossingView, runTrain } from './train.js';
import { PLANE_LIFT, planeCaption, runHall, runPlane } from './plane.js';
import { flyJr } from './jr.js';
import { runRobot } from './robot.js';
import { H_SPEED, requestPark, runPark } from './park.js';
import { beam, buildNight, runSky } from './night.js';
import { buildDeluge, launchCaption, runCountdown, runDeluge, runEngines, runLaunchSmoke, runSwingArm, startRocket } from './rocket.js';

// The truck world (truck/truck.js) and the plane cabin (cabin/cabin.js) are built after this file runs,
// in the same order as before the split. The main loop still needs some of their pieces, so main.js
// hands them over with link() before the first frame. They're kept on `linked` (game/state.js).
function link(parts) { Object.assign(linked, parts); }

// Smoothness: three.js redoes the position math of every object every frame, even in worlds that aren't
// showing. These worlds skip it while hidden, and catch up the moment they come back into view.
const skipWhenHidden = function (force) { if (this.visible) THREE.Object3D.prototype.updateMatrixWorld.call(this, force); };
for (const set of [groundSet, homeSet, trackSet, airportSet, launchSet, roadSet, interSet, farmSet, hallSet, airportScenery, space, cloudSet, birdSet, fallers]) set.updateMatrixWorld = skipWhenHidden;
Object.assign(linked, { go, buildActions, setButtons });   // bedtime (game/park.js) calls these back

const skipBox = new Set(); rig.flames.forEach(g => g.traverse(o => { if (o.isMesh) skipBox.add(o); }));
rig.jr.j.traverse(o => { if (o.isMesh) skipBox.add(o); });      // Jr. flies off on its own; don't frame or ground on it

// Fun toggles for each mode. 'toggle' buttons stay on or off; 'press' buttons do something once.
const ACTIONS = [
  [{ id: 'door', label: 'Open door' }, { id: 'gear', label: 'Gear up' }, { id: 'lights', label: 'Flash lights' }, { id: 'peek', label: 'See inside airport' }, { id: 'goin', label: 'Go inside airport' }, { id: 'board', label: 'Board the plane', press: true }, { id: 'space', label: 'Fly to space' }, { id: 'meteors', label: 'Meteors', press: true }, { id: 'astro', label: 'Astronauts' }],
  [{ id: 'size', seg: [['small', 'Small'], ['medium', 'Medium'], ['big', 'Big']] }, { id: 'wave', label: 'Wave' }, { id: 'march', label: 'March' }, { id: 'mask', label: 'Mask off' }, { id: 'hatch', label: 'Close hatch' }],
  [{ id: 'whistle', label: 'Whistle', press: true }, { id: 'stop', label: 'Stop train' }, { id: 'lamp', label: 'Lamp off' }],
  [{ id: 'arm', label: 'Swing arm away' }, { id: 'launch', label: 'Launch now', press: true }],
  [{ id: 'horn', label: 'Air horn', press: true }, { id: 'smoke', label: 'Smokestacks' }, { id: 'tdoors', label: 'Open trailer' }, { id: 'jr', label: 'Launch Jr.' }, { id: 'lights', label: 'Lights' }, { id: 'inter', label: 'Interstate' }, { id: 'stop', label: 'Stop truck' }, { id: 'wreck', label: 'Crash!' }],
  [{ id: 'honk', label: 'Honk', press: true }, { id: 'plow', label: 'Plow' }, { id: 'spray', label: 'Spray' }, { id: 'moo', label: 'Animal sounds', press: true }, { id: 'cab', label: 'Open cab' }, { id: 'lights', label: 'Lights' }, { id: 'stop', label: 'Stop tractor' }]
];

const center = new THREE.Vector3();
const target3 = new THREE.Vector3(0, 1.2, 0);


function startMorph(m) {
  S.plan = planMorph(rig, m, settled() ? S.mode : null);
  S.envFrom = { ...S.env }; S.tt = 0; S.paused = false;
  if (m === 0) { S.planeT = 0; S.planeTravel = 0; S.planeAlt = 0; }
  if (m === 2) { S.trainT = 0; S.stationTravel = 0; }
  if (m === 4) { S.truckT = 0; }
  if (m === 5) { S.tractorT = 0; }
  S.on = { size: 'medium' }; buildActions(-1);
  if (reduceMotion) S.tt = S.plan.T;
  sfx.whirr(Math.min(S.plan.T, 2.5));
  setButtons();
}
function go(m) {
  if (S.parkState) { if (S.parkState !== 3) { S.parkState = 3; S.parkT = 0; sfx.garage(); } S.parkWant = m; return; }
  if (S.pending !== null) { S.pending = m === S.plan.to ? null : m; setButtons(); return; }
  if (settled() && S.plan.to === m) {                          // same button again: launch / take off again
    if (m === 3 && S.launchT > 0) { if (S.launchT > 4.5) S.launchT = 0; }
    if (m === 0 && S.planeT > 0) { if (S.planeT > 2) { S.pending = 0; setButtons(); } }
    return;
  }
  if (airborne()) { S.pending = m; setButtons(); return; }    // land first, then transform
  S.launchT = 0; S.planeT = 0;
  startMorph(m);
}

function caption() {
  if (S.flash && S.flash.until > S.clockT) return S.flash.text;
  if (linked.cab.active) return linked.cabCaption();
  if (linked.board.active) return 'Travelers climb aboard with their suitcases';
  if (S.parkState === 1) return S.homeK < 1 ? 'Heading home...' : S.parkZ < 0.5 ? (S.parkRobot ? 'The front door opens' : 'The garage door rolls up') : S.parkZ < S.parkD - 0.1 ? (S.parkRobot ? 'Robot marches into his house' : 'Pulling into the garage') : 'Closing up for the night';
  if (S.parkState === 2) return S.parkRobot ? 'Robot is home. Sweet dreams!' : 'All parked. Sweet dreams!';
  if (S.parkState === 3) return 'Coming back out to play';
  if (S.pending !== null) return S.plan.to === 0 ? 'Coming in to land' : 'Coming back down to the pad';
  if (!settled()) {
    let text = 'Transforming';
    for (const s of S.paused ? S.plan.allSteps : S.plan.steps) if (S.tt >= s.at) text = s.label;   // scrubbing shows every step
    return text;
  }
  if (S.plan.to === 0) return planeCaption();
  if (S.plan.to === 3) return launchCaption();
  if (S.plan.to === 2) return S.trainT < 2.5 ? 'All aboard at Jasper Junction!' : !S.on.stop && crossingCaption() ? crossingCaption() : S.on.stop ? (S.trainSpeed > 0.5 ? 'Brakes on, slowing down' : 'Stopped on the tracks') : S.trainSpeed < 5 ? 'Departing the station' : 'Chugging down the tracks';
  if (S.plan.to === 5) return S.tractorT < 1.5 ? 'Skyfly the tractor, ready for farm work!' : S.on.plow ? 'Skyfly plows the field for Jasper\'s farm' : S.tractorSpeed < 0.3 ? 'Skyfly is parked by the pasture' : 'Skyfly rolls down the farm lane past the animals';
  if (S.plan.to === 4) return S.truckT < 1.5 ? 'Big rig mode. Buckle up!' : S.on.wreck ? 'Wrecked! Press Crash! again to rebuild' : S.jrPhase === 2 ? 'Skyrender Jr. flies loops around the big rig' : S.jrPhase === 4 ? 'Jr. lines up and lands back in the trailer' : (S.blend.inter || 0) > 0.5 ? 'Rolling down Interstate 65 toward Exit 5' : 'Hauling Skyrender freight down the country road';
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

buildNight();                 // day and night: the moon, the headlight beam (game/night.js), built here as always

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
        b.setAttribute('aria-pressed', String(S.on[a.id] === val));
        b.addEventListener('click', () => { setSize(val); row.querySelectorAll('button').forEach((x, i) => x.setAttribute('aria-pressed', String(a.seg[i][0] === val))); });
        row.appendChild(b);
      }
      actsEl.appendChild(row); continue;
    }
    const b = document.createElement('button'); b.type = 'button'; b.textContent = a.label; b.dataset.id = a.id;
    if (!a.press) b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => doAction(a, b));
    actsEl.appendChild(b);
  }
}
// Some plane buttons only make sense in some places: Meteors and Astronauts in space; the airport buttons on the way there.
let actsShown = '';
function showActions(sp) {
  const space = S.plan.to === 0 && sp > 0.8, high = S.plan.to === 0 && S.planeAlt > 0;
  const key = space + '|' + high + '|' + actsFor; if (key === actsShown) return; actsShown = key;
  for (const b of actsEl.querySelectorAll('button[data-id]')) {
    const id = b.dataset.id;
    b.hidden = ((id === 'meteors' || id === 'astro') && !space) || ((id === 'peek' || id === 'goin' || id === 'board') && high);
  }
}
function setSize(val) {
  if (S.on.size === val) return;
  const grow = val === 'big' || (val === 'medium' && S.on.size === 'small');
  S.on.size = val;
  say(val === 'big' ? 'GIANT Skyrender! Cannons, knee guards and power lights out' : val === 'small' ? 'Tiny Skyrender! Armor packs away, wings tuck in' : 'Back to regular size', 2.4);
  sfx.size(grow);
}
// Every button answers: doors latch, hydraulics hum, switches click, the sprayer hisses.
const BTN_SFX = { door: 'latch', mask: 'latch', hatch: 'latch', tdoors: 'latch', cab: 'latch', gear: 'gear', lights: 'switch', lamp: 'switch', smoke: 'switch', arm: 'hydraulic', plow: 'hydraulic', spray: 'spray' };
const FARM_TALK = [['cow', 'Moo! A cow moos to call her calf'], ['pig', 'Oink oink! Pigs grunt to chat with each other'], ['horse', 'Neigh! A horse whinnies to say hello to its friends']];
let farmTalk = 0;
function doAction(a, b) {
  if (!a.press) { S.on[a.id] = !S.on[a.id]; b.setAttribute('aria-pressed', String(S.on[a.id])); }
  const snd = BTN_SFX[a.id]; if (snd === 'switch') sfx.switchOn(!!S.on[a.id]); else if (snd) sfx[snd]();
  if (a.id === 'stop' && S.on.stop && (S.plan.to === 4 || S.plan.to === 2)) sfx.airBrake(S.plan.to === 2);   // air brakes hiss; the train lets off steam
  if (a.id === 'whistle') { for (const ms of [0, 1080, 2160, 2640]) setTimeout(() => emitPuff(true), ms); say('Long, long, short, long: crossing ahead!', 3); sfx.whistle('LLSL'); }
  if (a.id === 'peek') say(S.on.peek ? 'Peeking inside Jasper Junction Airport' : 'Back out to the runway', 2);
  if (a.id === 'goin') { say(S.on.goin ? 'Skyrender rolls into the airport through the big glass doors' : 'Skyrender rolls back out to the runway', 2.4); if ((S.on.goin || S.on.peek) && S.planeT > 0) { S.pending = 0; setButtons(); } }
  if (a.id === 'peek' && S.on.peek && S.planeT > 0) { S.pending = 0; setButtons(); }
  if (a.id === 'board') requestPark();
  if (a.id === 'space' || a.id === 'meteors' || a.id === 'astro') linked.moonAction(a.id);
  if (a.id === 'honk') { S.hop = 1; say('Beep beep!'); sfx.honk(); }
  if (a.id === 'moo') {                              // each press, the next animal speaks up and hops
    const [kind, line] = FARM_TALK[farmTalk++ % FARM_TALK.length];
    say(line, 2.6); sfx[kind](); for (const a2 of animals) if (a2.c.userData.kind === kind) a2.c.userData.hop = 1;
  }
  if (a.id === 'plow' && S.plan.to === 5) say(S.on.plow ? 'Plow down! Digging nice straight rows' : 'Plow up', 1.8);
  if (a.id === 'spray') say(S.on.spray ? 'Sprayer booms on. Watering the crops!' : 'Sprayer off', 1.8);
  if (a.id === 'cab') say(S.on.cab ? 'Cab doors open. Hi, farmer!' : 'Cab doors shut', 1.6);
  if (a.id === 'horn') { S.hop = 0.6; say('HONK HONK!'); sfx.airhorn(); }
  if (a.id === 'wreck') {
    if (S.on.wreck) {
      if ((S.blend.wreck || 0) < 0.05 && !S.crash) linked.startCrash();
      else if (S.crash) S.crash.back = false;
      if (!S.crash) { linked.scatter(); linked.hitNow(); }
    }
    else { say('Putting Skyrender back together...', 2.2); sfx.whirr(1.6); }
  }
  if (a.id === 'tdoors') say(S.on.tdoors ? 'Trailer doors swing open. Look who rides inside!' : 'Trailer doors latched', 2);
  if (a.id === 'stop' && S.plan.to === 4) say(S.on.stop ? 'Brakes on. The big rig stops' : 'Rolling again', 1.8);
  if (a.id === 'inter') say(S.on.inter ? 'Up the on-ramp and onto the interstate!' : 'Off at Exit 5, back to the country road', 2.4);
  if (a.id === 'jr') { say(S.on.jr ? 'Skyrender Jr. rolls out the back for takeoff!' : 'Jr. is coming home', 2.2); if (S.on.jr) sfx.jet(); }
  if (a.id === 'launch' && S.plan.to === 3 && settled() && S.launchT < 3) { S.launchT = 3; S.on.arm = true; }
  if (a.id === 'wave' && S.on.wave) say('Hi Jasper!', 2);
  if (a.id === 'march' && S.on.march) say('Stomp, stomp, stomp!', 2);
}
// The scrubber drags back and forth through the current transformation and holds where you leave it.
scrub.addEventListener('input', () => {
  if (S.pending !== null) return;
  S.scrubbing = true; S.paused = true; S.launchT = 0; S.planeT = 0; S.trainT = 0;
  S.tt = scrub.value / 1000 * S.plan.T;
});
scrub.addEventListener('change', () => { S.scrubbing = false; });

let fitScale = 1;
let theta = 0.9, phi = 1.15, radius = 17, dragging = false, lastX = 0, lastY = 0, idle = 0;
stage.addEventListener('pointerdown', e => { if (linked.cab.active) { linked.cabPointerDown(e); stage.setPointerCapture(e.pointerId); return; } dragging = true; lastX = e.clientX; lastY = e.clientY; stage.setPointerCapture(e.pointerId); });
stage.addEventListener('pointermove', e => {
  if (linked.cab.active) { linked.cabPointerMove(e); return; }
  if (!dragging) return;
  theta -= (e.clientX - lastX) * 0.008;
  phi = Math.min(1.5, Math.max(0.25, phi - (e.clientY - lastY) * 0.006));
  lastX = e.clientX; lastY = e.clientY; idle = 0;
});
stage.addEventListener('pointerup', e => { dragging = false; if (linked.cab.active) linked.cabPointerUp(e); });
stage.addEventListener('wheel', e => { e.preventDefault(); if (linked.cab.active) { linked.cabWheel(e); return; } radius = Math.min(32, Math.max(8, radius + e.deltaY * 0.012)); }, { passive: false });

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

buildPuffs();                 // the steam puff pool (game/puffs.js), built here as always



function applyToggles(dt) {
  for (const id of ['door', 'gear', 'wave', 'march', 'mask', 'hatch', 'gate', 'tdoor', 'tdoors', 'wreck', 'big', 'small', 'inter', 'plow', 'cab']) {
    let want = settled() && S.plan.to === 1 && (id === 'big' || id === 'small') ? (S.on.size === id ? 1 : 0) : settled() && S.on[id] ? 1 : 0;
    if (id === 'wreck' && S.crash && !S.crash.hit) want = 0;
    S.blend[id] = (S.blend[id] || 0) + (want - (S.blend[id] || 0)) * Math.min(1, dt * (id === 'inter' ? 0.9 : 3));
  }
  const k = id => ease(clamp01(S.blend[id]));
  lerpJ(rig.sideDoor, rig.sideDoor.userData.poses[2], k('door'));
  for (const g of rig.named.gear) lerpJ(g, g.userData.stow, k('gear'));
  lerpJ(rig.mask, rig.mask.userData.poses[0], k('mask'));
  for (const d of rig.named.hatch) lerpJ(d, d.userData.poses[0], k('hatch'));
  for (const g of rig.truckBits.gateTops) g.j.rotation.z += -g.s * 1.5 * k('gate');     // top of the tailgate folds down
  for (const d of rig.truckBits.doors) d.j.rotation.y += -d.s * 1.1 * k('tdoor');       // cab doors swing out on their front hinges
  S.jrDoor += ((S.plan.to === 4 && settled() && (S.on.tdoors || S.jrPhase) ? 1 : 0) - S.jrDoor) * Math.min(1, dt * 3);
  for (const d of rig.truckBits.trailerDoors) d.j.rotation.y += -d.s * 2.7 * ease(clamp01(S.jrDoor)); // trailer doors swing wide open
  linked.wreckPose(S.blend.wreck || 0);
  // Tractor: plow digs in, cab doors swing open
  for (const th of rig.named.thighs) th.rotation.x -= 0.075 * k('plow');
  for (const d of rig.tractorBits.cabDoors) d.j.rotation.y += -d.s * 1.2 * k('cab');
  flyJr(dt);
  linked.moveTraffic(dt); linked.runCrash(dt); linked.runWalkers(dt);
  runRobot(dt, k);
}

let lastParkZ = 0;
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const sdt = dt * S.speed;
  S.clockT += dt;

  // ---- advance the transformation (or come home from the sky first) ----
  if (S.pending !== null) {
    if (S.plan.to === 3) S.launchT = Math.max(0, S.launchT - sdt * 4);
    if (S.plan.to === 0 && S.planeAlt <= 0) S.planeT = Math.max(0, S.planeT - sdt * (S.planeT > PLANE_LIFT ? 2.5 : 1.2));   // down from space first
    const down = S.plan.to === 3 ? S.launchT === 0 : S.planeT <= 0;
    if (down) { const m = S.pending; S.pending = null; S.launchT = 0; S.planeT = 0; if (m !== S.plan.to) startMorph(m); else setButtons(); }
  } else if (!S.paused && S.tt < S.plan.T) {
    const tt0 = S.tt;
    S.tt = Math.min(S.plan.T, S.tt + sdt);
    if (S.plan.locks.some(L => tt0 < L && S.tt >= L)) sfx.lock();          // a soft clack as parts lock into place
    if (S.tt >= S.plan.T && !reduceMotion) S.stompK = Math.max(S.stompK, 0.5);   // and one gentle settle when it's done
  }
  if (settled()) S.mode = S.plan.to;
  if (!S.scrubbing) scrub.value = Math.round(clamp01(S.tt / S.plan.T) * 1000);
  poseRig(rig, S.plan, S.tt, ease);
  if (settled()) buildActions(S.parkState || S.parkQueued ? -1 : S.plan.to);
  runPark(dt); runHall(dt);
  applyToggles(dt);
  linked.noseTuck(); linked.runBoarding(dt);

  // ---- the world blends along with the transformation ----
  const k = ease(clamp01(S.tt / S.plan.T)), goal = ENV[S.plan.to];
  for (const key in S.env) S.env[key] = S.envFrom[key] + (goal[key] - S.envFrom[key]) * k;
  const live = settled() && !S.paused && !S.parkState;

  const air = runPlane(sdt, live);            // 0 on the ground, 1 cruising above the clouds

  let { onPad, sp } = startRocket(sdt, live);
  if (S.plan.to === 0 && S.planeAlt > 0) { S.alt = S.planeAlt; sp = clamp01((S.alt - 150) / 450); }   // the plane in space   // sp: 0 in the sky, 1 in space

  runTrain(dt, sdt, live);
  const parkV = (S.parkZ - lastParkZ) / Math.max(dt, 1e-6); lastParkZ = S.parkZ;   // how fast it's really driving in or out
  S.crank += (S.trainSpeed + S.truckSpeed + S.tractorSpeed * 0.6 + (S.plan.to !== 1 && S.plan.to !== 3 ? parkV : 0)) / 0.4 * sdt;      // the same big wheels drive the train and the truck
  for (const w of rig.wheels) w.rotation.x += (S.trainSpeed + S.truckSpeed) / 0.22 * sdt;   // rail wheels under the trailer roll on the road too
  for (const d of rig.drivers) d.w.rotation.x = S.crank + d.phase;
  for (const r of rig.rods) {                         // side rods ride around with the crank pins
    const a = S.crank + r.phase, kk = S.env.track;
    r.j.position.y += 0.2 * (Math.cos(a) - 1) * kk;
    r.j.position.z += 0.2 * Math.sin(a) * kk;
  }

  runTractor(dt, sdt, live);

  linked.runTruck(dt, sdt, live);       // the big rig drives (truck/truck.js)

  // Everything on the ground slides past whatever is moving
  const groundSpeed = S.trainSpeed + S.truckSpeed + S.tractorSpeed + S.planeSpeed * (1 - air);
  S.travel += groundSpeed * sdt;
  tieSet.position.z = -(S.stationTravel % TIE);
  postSet.position.z = -(S.stationTravel % POST);
  stationSet.position.z = wrap(-S.stationTravel, 160);
  dashSet.position.z = -(S.planeTravel % DASH);
  airportScenery.position.z = wrap(-S.planeTravel, 160);
  for (const s of scrollers) s.obj.position.z = wrap(s.z0 - S.travel * s.k, s.L);

  groundSet.position.y = -90 * air * air - S.alt - 0.2 * S.env.track;
  groundSet.visible = S.alt < 400 && air < 0.98;
  const away = 1 - sm(S.homeK);
  homeSet.scale.y = Math.max(0.001, sm(S.homeK)); homeSet.visible = S.homeK > 0.001;
  trackSet.scale.y = Math.max(0.001, S.env.track * away); trackSet.visible = S.env.track * away > 0.001;
  airportSet.scale.y = Math.max(0.001, S.env.runway * away); airportSet.visible = S.env.runway * away > 0.001;
  padSet.position.y = -0.3 * (1 - S.env.pad * away);
  launchSet.scale.y = Math.max(0.001, S.env.launch * away); launchSet.visible = S.env.launch * away > 0.001;
  const ik = ease(clamp01(S.blend.inter || 0));                 // country road sinks away as the interstate rises
  roadSet.scale.y = Math.max(0.001, S.env.road * (1 - ik) * away); roadSet.visible = S.env.road * (1 - ik) * away > 0.001;
  interSet.scale.y = Math.max(0.001, S.env.road * ik * away); interSet.visible = S.env.road * ik * away > 0.001;
  farmSet.scale.y = Math.max(0.001, S.env.farm * away); farmSet.visible = S.env.farm * away > 0.001;
  runSwingArm(dt);
  cloudSet.position.y = 40 * (1 - air) - S.alt * 0.7;
  cloudSet.visible = S.alt < 500;
  cloudMat.opacity = 0.5 + 0.5 * air;
  const cruise = (air * 16 + groundSpeed * 0.3) * S.speed;
  for (const c of clouds) { c.position.z -= cruise * dt; if (c.position.z < -70) c.position.z += 140; }

  // Birds circle overhead; when the plane is flying they stream past at its height
  birdSet.position.y = 6 * (1 - air) - S.alt * 0.9;
  birdSet.visible = S.alt < 300;
  for (const f of flocks) {
    f.a += f.w * dt;
    f.cz = wrap(f.cz - cruise * dt * 0.8, 60);
    const fx = f.cx + Math.cos(f.a) * f.r, fz = f.cz + Math.sin(f.a) * f.r, fy = f.cy * (1 - air) + air * (8 + Math.sin(f.a * 2) * 3);
    const heading = Math.atan2(-Math.sin(f.a) * f.w, Math.cos(f.a) * f.w);
    for (const b of f.birds) {
      const o = b.userData.off, c = Math.cos(heading), s = Math.sin(heading);
      b.position.set(fx + o[0] * c + o[2] * s, fy + o[1], fz - o[0] * s + o[2] * c);
      b.rotation.y = heading;
      const flap = Math.sin(S.clockT * 9 + b.userData.ph) * 0.65;
      b.userData.L.rotation.z = flap; b.userData.R.rotation.z = -flap;
    }
  }

  runSky(dt, air, sp);
  linked.runMoonTrip(dt, sp);
  showActions(sp);          // the huge Moon, meteors and astronauts (space/moontrip.js)

  runEngines(dt, onPad, sp);
  rig.M.glow.emissiveIntensity = 0.35 + 2.5 * S.thrust + 0.6 * S.planeSpeed / 28;
  const lampOn = (S.env.track > 0.5 && !S.on.lamp) || ((S.plan.to === 4 || S.plan.to === 5) && S.on.lights && !S.on.wreck);
  rig.M.marker.emissiveIntensity = (S.plan.to === 4 || S.plan.to === 5) && S.on.lights ? (S.on.wreck ? (Math.sin(S.clockT * 8) > 0 ? 2.5 : 0.1) : 1.8) : 0.35;   // hazards blink after a crash
  rig.M.tail.emissiveIntensity = S.plan.to === 4 && S.on.lights ? 1.6 : 0.5;
  rig.M.head.emissiveIntensity = lampOn ? 2.2 : 0;
  rig.M.head.color.setHex(lampOn ? 0xfff6dc : 0x6e6c66);             // an unlit lens is dull grey, not white
  const nk = ease(clamp01(S.nightK));
  beam.intensity += ((lampOn ? 3.2 * nk : 0) - beam.intensity) * Math.min(1, dt * 6);
  const strobe = S.plan.to === 0 && S.on.lights && Math.sin(S.clockT * 12) > 0.6;
  rig.M.navR.emissiveIntensity = rig.M.navG.emissiveIntensity = strobe ? 3 : 0.6;
  rig.M.beacon.emissiveIntensity = S.plan.to === 0 && S.on.lights ? (Math.sin(S.clockT * 7) > 0 ? 2.5 : 0.2) : 0.8;
  runCountdown(onPad);

  runLaunchSmoke(onPad); runDeluge(sdt, onPad);

  // ---- set it down: lowest part rests on the ground, or wheel treads on the rail tops ----
  flyer.position.set(0, 0, 0); flyer.rotation.set(0, 0, 0);
  rig.bot.position.y = 0;
  flyer.updateMatrixWorld(true);                           // measure with the flight group back at the origin
  box.copy(exactBox(THREE, rig.bot, skipBox)); box.getCenter(center);
  if ((S.blend.wreck || 0) > 0.001) { rig.bot.position.y = S.snapY; center.y += S.snapY; }   // wrecked pieces settle on the road
  else { rig.bot.position.y = S.snapY = -box.min.y - 0.03 * S.env.track; center.y -= box.min.y; }      // flanges dip just inside the rails
  beam.position.set(0, 1.1, box.max.z - 0.3); beam.target.position.set(0, 0, box.max.z + 9);

  const rumble = reduceMotion ? 0 : Math.min(1, S.trainSpeed / 8 + (air < 0.05 ? S.planeSpeed / 28 : 0));
  // a plane climbs because it points up: nose rises at liftoff, holds through the climb, levels off at the clouds
  const pitch = S.plan.to === 0 ? -0.13 * ease(clamp01((S.planeT - PLANE_LIFT + 0.8) / 1.5)) * (1 - ease(clamp01((air - 0.75) / 0.25))) : 0;
  flyer.position.y = air * (8 + Math.sin(S.clockT * 0.9) * 0.25) + Math.abs(Math.sin(S.clockT * 11)) * 0.012 * rumble;
  flyer.rotation.z = air * Math.sin(S.clockT * 0.45) * 0.05 + Math.sin(S.clockT * 9) * 0.002 * rumble;
  flyer.rotation.x = pitch + air * Math.sin(S.clockT * 0.7) * 0.02;
  const shake = reduceMotion || !onPad ? 0 : S.thrust * (1 - sp) * 0.06;
  flyer.position.x = (Math.random() - 0.5) * shake; flyer.position.z = (Math.random() - 0.5) * shake;
  // In orbit the rocket turns slowly and steadily
  if (S.plan.to === 3 && settled() && sp > 0 && !reduceMotion) S.orbitRoll += sp * dt * 0.12; else if (S.launchT === 0) S.orbitRoll = 0;
  flyer.rotation.y = S.orbitRoll + linked.veer.yaw; flyer.position.x += linked.veer.x; flyer.position.z += S.parkZ + S.hallZ;
  if (S.stompK > 0) { S.stompK = Math.max(0, S.stompK - dt * 6); if (!reduceMotion) flyer.position.y -= Math.sin(Math.min(1, S.stompK) * Math.PI) * 0.025 * S.stompK; }
  if (S.hop > 0) { S.hop = Math.max(0, S.hop - dt * 1.8); flyer.position.y += Math.abs(Math.sin(S.hop * Math.PI * 3)) * 0.18 * S.hop; }
  center.y += flyer.position.y;

  // Petals, leaves or snow drift down around the toy (not up in the sky)
  fallers.visible = fallActive > 0 && air < 0.3 && S.alt < 30;
  if (fallers.visible) {
    fallers.position.set(target3.x, 0, target3.z);
    const sway = season === 'Winter' ? 0.25 : 0.9;
    for (let i = 0; i < fallActive; i++) {
      let y = fallPos[i * 3 + 1] - fallSpeed * dt * (0.7 + (fallSeed[i] % 1) * 0.6);
      if (y < 0) y += 22;
      fallPos[i * 3 + 1] = y;
      fallPos[i * 3] += Math.sin(S.clockT * 1.3 + fallSeed[i]) * sway * dt;
      fallPos[i * 3 + 2] -= groundSpeed * sdt;              // blow past when moving
      if (fallPos[i * 3 + 2] < -25) fallPos[i * 3 + 2] += 50;
    }
    fallGeo.attributes.position.needsUpdate = true;
  }
  sky.position.copy(camera.position);

  runPuffs(sdt);

  for (const f of rig.fans) f.rotation.z += dt * (5 + 14 * S.planeSpeed / 28 + 10 * air);
  // ---- sound: rushing air, engines, jet whine, and each world's quiet background ----
  {
    const inCab = linked.cab.active, cabEng = linked.cab.engine || 0;
    // space is silent: there's no air to carry sound. The engines light with a low rumble just before liftoff.
    const roar = inCab ? 0 : S.thrust * (1 - sp) + (onPad && S.launchT > 2 && S.launchT < 3 ? 0.2 * (S.launchT - 2) : 0);
    const jet = S.plan.to === 0 && !inCab ? 0.25 * Math.min(1, S.planeSpeed / 28 + air) : 0;
    const truckOn = S.plan.to === 4 && settled() && !S.on.wreck && !S.parkState, tractorOn = S.plan.to === 5 && settled() && !S.parkState;
    const spool = inCab ? cabEng : S.plan.to === 0 ? Math.min(1, S.planeSpeed / 28 + air) : 0;
    const ground = !inCab && S.alt < 30 && air < 0.5;
    setMix({
      roar: inCab ? 0.1 + 0.35 * cabEng : Math.min(0.9, roar * 0.8 + jet),
      rumbleHz: roar > 0.05 ? 260 + 300 * roar : jet > 0.05 ? 900 : 140,
      // diesels thump because each cylinder fires in turn; the slow tractor thumps slower
      engHz: truckOn ? 30 + 50 * Math.min(1, S.truckSpeed / 16) : 20 + 15 * Math.min(1, S.tractorSpeed / 3.6) + Math.sin(S.clockT * 7) * 1.5,
      eng: truckOn ? 0.6 + 0.4 * Math.min(1, S.truckSpeed / 16) : tractorOn ? 0.7 : 0,
      whineHz: 1800 + 1700 * spool, whine: spool > 0.02 ? 0.4 + 0.6 * spool : 0,
      wind: !inCab && air > 0.3 && sp < 0.5 ? air * (1 - 2 * sp) : 0,
      birds: ground && !S.night ? (S.env.farm > 0.5 ? 0.9 : 0.5) : 0,
      crickets: ground && S.night && S.env.pad < 0.5 && S.env.launch < 0.5 ? 0.8 : 0,
    }, dt);
  }
  const text = caption();
  if (stepLabel.textContent !== text) { stepLabel.textContent = text; if (!settled() && S.pending === null) sfx.click(); }

  target3.lerp(center, 1 - Math.exp(-dt * 3));
  if (S.viewK > 0.001) { const vk = sm(S.viewK); target3.x += (0 - target3.x) * vk; target3.z += (hall.Z + hall.D * 0.4 - target3.z) * vk; target3.y += (1.5 - target3.y) * vk; }
  if (S.homeK > 0) { const dk = sm(S.homeK); target3.x += (0 - target3.x) * dk * 0.6; target3.z += (home.GZ - 2 - target3.z) * dk * 0.6; target3.y += (5 - target3.y) * dk * 0.5; }
  const xv = crossingView(), xk = sm(xv.k);              // at the railroad crossing, look a little ahead to the gates
  if (xk > 0.001) { target3.z += (center.z + Math.max(-4, Math.min(16, xv.z)) * 0.55 - target3.z) * xk * 0.5; target3.x += (center.x + 1.5 - target3.x) * xk * 0.5; }
  if (sp > 0 || air > 0) target3.y = center.y;
  // Pull back for tall poses (the rocket on the pad) so the whole toy stays in frame
  const tallest = box.max.y - box.min.y;
  const span = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
  const want = Math.max(1, 0.7 * tallest / Math.tan(camera.fov * Math.PI / 360) / 17, span / 11, 1 + 1.0 * sm(S.homeK)) * (1 - sm(S.viewK)) + 1.7 * sm(S.viewK);
  fitScale += (want * (1 + 0.25 * xk) - fitScale) * (1 - Math.exp(-dt * 2));
  idle += dt;
  if (!dragging && idle > 2 && !reduceMotion && S.homeK < 0.01) {
    if (settled() && S.plan.to === 0 && sp > 0.5) {   // in space, the plane turns so the huge Moon is right behind it
      const d = ((0.6 - theta) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; theta += d * Math.min(1, dt * 0.5);
    } else if (settled() && xk > 0.05) {               // at the crossing, a front three-quarter view from the car's side
      const d = ((0.45 - theta) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; theta += d * Math.min(1, dt * 0.7) * xk;
      phi += (1.0 - phi) * Math.min(1, dt * 0.7) * xk;
    } else if (settled()) theta += dt * (0.1 - 0.06 * S.viewK);
    else {                                             // while it transforms, face the action: front three-quarter, trailer side for the big rig
      const want = S.plan.to === 4 ? 2.2 : 0.9, d = ((want - theta) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      theta += d * Math.min(1, dt * 0.8);
    }
  }
  if (S.viewK > 0.01 && !dragging) phi += (0.78 - phi) * Math.min(1, dt * 1.2) * S.viewK;   // look down into the airport
  if (S.homeK > 0.01 && !dragging) {                    // at bedtime, swing around to look at the front door
    const want = Math.PI - 0.55; let d = ((want - theta) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    theta += d * Math.min(1, dt * 1.6) * S.homeK;
    phi += (1.12 - phi) * Math.min(1, dt * 1.2) * S.homeK;
  }
  const rr = radius * fitScale;
  const ph = phi + (1.42 - phi) * sp;                // in orbit, look out toward the horizon and the planets
  camera.position.set(
    target3.x + rr * Math.sin(ph) * Math.sin(theta),
    target3.y + rr * Math.cos(ph),
    target3.z + rr * Math.sin(ph) * Math.cos(theta));
  camera.lookAt(target3);
  if (linked.cab.active) { linked.updateCabin(dt); renderer.render(linked.cabinScene, linked.cabinCam); } else { renderer.render(scene, camera); linked.drawMoonViews(); }
  requestAnimationFrame(frame);
}
// Start the toy: called by main.js once every module is built and linked.
function start() {
  buildCrossing();            // the railroad crossing (game/train.js), built last so everything before it is built as always
  buildDeluge();              // the launch pad's water cannons (game/rocket.js)
  setButtons();
  frame();
}

export { buildActions, link, start };
