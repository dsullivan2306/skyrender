import * as THREE from 'three';
import { grass, groundSet, reduceMotion, scene, stage } from '../world/setup.js';
import { makeSuitcase, walkPose } from '../people/people.js';
import { birdSet, cloudSet, puff } from '../scenery/sky.js';
import { season } from '../scenery/seasons.js';
import { sfx } from '../audio/audio.js';
import { S, c01, ease, lerpJ, rig, say, settled, sm } from '../game/state.js';
import { quietly } from '../rig/rig.js';
import { EDGE, HOSP, LAKE, MTN, buildValley, groundAt, runValley, stillTrees } from './valley.js';
import { buildControls } from './controls.js';
import { buildCockpit, crewMember, drawCockpit, greet, runCockpit, tapCockpit } from './cockpit.js';

// Jasper's idea: "Skyrender is going to be a great amazing helicopter and the crew will be boarding just like the plane
// and I will control the flight and blade". He flies it himself, with the same controls a real pilot has:
//   Blades (the throttle): how fast the rotor spins. Too slow and it can't lift.
//   Lift (the collective): tips every blade more or less, to go up or down. The middle notch is a hover.
//   the stick (the cyclic): leans the spinning blades, and the helicopter goes the way they lean.
//   the pedals: the tail blades push sideways to turn. Stop them and the body spins the other way from the blades.
// Nothing can go wrong: with the blades turned off in the air it floats down like a maple seed, the way real ones do,
// and every landing is soft. Built the first time he picks the helicopter; nothing else in the toy changes.
const C = { throttle: 0, lever: 0, sx: 0, sy: 0, pedal: 0, touched: false };
const h = { x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, yaw: 0, vyaw: 0, rpm: 0, spin: 0, tailSpin: 0, pitch: 0, roll: 0, up: 0, agl: 0, landed: true, floor: { y: 0, kind: 'pad', place: 'home' }, auto: null,
  crewIn: false, board: null, inside: false, doorK: 0, wind: 0, t: 0, flew: false, wasUp: false, up2: 0, seen: {}, edge: 0, rise: 0, k: 0, sinkT: 0 };
let V = null, ui = null, K = null, dust = null, blob = null, crew = null, crewSet = null;
const FULL_TURN = Math.PI * 2;
const on = () => S.plan.to === 7;
const flying = () => on() && settled() && !S.parkState;

function build() {
  quietly(() => {
    V = buildValley(); ui = buildControls(C); K = buildCockpit();
    blob = new THREE.Mesh(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1c2018, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); blob.visible = false; scene.add(blob);
    dust = []; for (let i = 0; i < 44; i++) { const m = new THREE.Mesh(puff, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0, depthWrite: false })); m.visible = false; scene.add(m); dust.push({ m, t: 9, life: 1, vx: 0, vz: 0, vy: 0 }); }
    // the crew that walks out: co-pilot, crew chief and medic, then a small captain in a maroon helmet who boards last
    crewSet = new THREE.Group(); crewSet.visible = false; scene.add(crewSet);
    crew = [[0x56624a, 0x8c5a3c, 0x2d2a26, 0xf2f2ee, 0x1d1d1d, 1], [0x56624a, 0xd9a47a, 0x6b4a2a, 0xf2f2ee, 0x4a4f45, 1], [0x7a3b34, 0x6b4630, 0x1d1b19, 0xf2f2ee, 0xb3312b, 1], [0x3f5a78, 0xf0c8a0, 0xa9805a, 0x7a2430, 0x7a2430, 0.78]].map(([suit, skin, hair, helmet, bagC, size]) => {
      const p = crewMember(suit, skin, hair, helmet), bag = makeSuitcase(bagC); bag.position.set(0.32, 0, -0.42); bag.rotation.x = -0.3; bag.scale.setScalar(0.8); p.add(bag); p.scale.setScalar(size); crewSet.add(p); return p;
    });
  });
  h.k = 0;
}
// back on the home pad, blades stopped
function heliReset() {
  Object.assign(h, { x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, yaw: 0, vyaw: 0, rpm: 0, spin: 0, tailSpin: 0, pitch: 0, roll: 0, agl: 0, landed: true, auto: null, board: null, inside: false, wind: 0, flew: false, wasUp: false, edge: 0, rise: 0, sinkT: 0, crewIn: on() ? h.crewIn : false });
  h.floor = { y: 0, kind: 'pad', place: 'home' };
  Object.assign(C, { throttle: 0, lever: 0, sx: 0, sy: 0, pedal: 0, touched: false });
}
const home = () => Math.hypot(h.x, h.z) < 0.02 && h.y < 0.001;
const nice = { home: 'the home landing pad', hospital: 'the hospital roof', mountain: 'the top of Lookout Mountain' };
const ARRIVE = {
  home: ['Home again! A perfect landing', 'Back on the home pad. Nice flying, Captain Jasper!'],
  hospital: ['Landed on the hospital roof! Helicopters can land right where help is needed', 'The white cross and the red H tell pilots: hospital here'],
  mountain: ['On top of Lookout Mountain! On tall mountains the air is thin, so blades have to work harder', 'The windsock shows which way the wind blows. Pilots always look for it']
};

function heliAct(id) {
  if (!flying() || S.pending !== null) return;
  if (id === 'crew') startBoard();
  if (id === 'inside') seat(S.on.inside);
  if (id === 'tail') say(S.on.tail ? (h.agl > 0.3 ? 'No tail blades! The big blades spin one way, so the body spins the other way' : 'Tail blades stopped. Take off and see what happens!') : 'Tail blades on. They push sideways to hold the body still', 3.6);
  if (id === 'fhome') { if ((h.landed && h.floor.place === 'home') || h.auto) say(h.auto ? 'Already on the way home' : 'We are home!', 1.8); else { h.auto = 'home'; say('The autopilot flies home to the landing pad', 2.6); } }
  if (id === 'lights') say(S.on.lights ? 'Searchlight on. Crews use it to find people at night' : 'Lights off', 2.4);
  if (id === 'door') say(S.on.door ? 'The side door slides back' : 'Door shut', 1.6);
}
// ---------- the crew: they walk up from the front, staying low, and climb in by the side door ----------
const STEP = 0.8, WALK = 5.6;
function startBoard() {
  if (h.board) return;
  if (!h.landed) { say('Land first, then the crew can walk out', 2.4); return; }
  if (!h.floor.place || h.floor.place === 'lake') { say('Find a landing pad with an H for the crew', 2.6); return; }
  h.board = { dir: h.crewIn ? -1 : 1, t: 0, wait: true }; C.throttle = 0; C.lever = 0;
  if (h.rpm > 0.06) say('Blades off first! The crew waits until they stop', 2.6);
  else say(h.board.dir > 0 ? 'Crew, time to board!' : 'Everybody out, watch your step', 2);
}
const path = [new THREE.Vector3(4.6, 0, 6.2), new THREE.Vector3(2.3, 0, 3.2), new THREE.Vector3(1.15, 0, 1.5), new THREE.Vector3(0.78, 0.55, 1.42), new THREE.Vector3(0.3, 0.55, 1.4)];
const leg = [0, 0.4, 0.72, 0.9, 1];
function runBoard(dt) {
  const b = h.board; crewSet.visible = !!b;
  if (!b) { h.doorK = Math.max(0, h.doorK - dt * 1.4); return; }
  crewSet.position.set(0, h.floor.y, 0); crewSet.rotation.y = h.yaw;
  if (b.wait && h.rpm < 0.03) { b.wait = false; sfx.latch(); if (b.dir > 0) say('The crew walks up from the front, where the pilot can see them', 3.2); }
  if (!b.wait) { b.t += dt; h.doorK = Math.min(1, h.doorK + dt * 1.2); }
  const total = STEP * (crew.length - 1) + WALK + 0.6;
  crew.forEach((p, i) => {
    const u0 = c01((b.t - 0.5 - i * STEP) / WALK), u = b.dir > 0 ? u0 : 1 - u0, n = Math.min(3, leg.findIndex((l, k) => k < 4 && u <= leg[k + 1])), k = n < 0 ? 1 : (u - leg[Math.max(0, n)]) / (leg[Math.max(0, n) + 1] - leg[Math.max(0, n)]), a = path[Math.max(0, n)], c = path[Math.max(0, n) + 1];
    const spread = (1 - c01(u / 0.4)) * 0.8;
    p.position.lerpVectors(a, c, c01(k)); p.position.x += (i - 1.5) * spread; p.position.z += ((i % 2) * 0.7) * spread;
    const dx = (c.x - a.x) * b.dir, dz = (c.z - a.z) * b.dir, moving = u0 > 0 && u0 < 1;
    p.visible = u < 0.995;
    const low = sm(c01((u - 0.28) / 0.14));                  // bending low near the blades, even when they're stopped
    p.rotation.set(0, Math.atan2(dx, dz), 0); p.rotation.order = 'YXZ'; p.rotation.x = 0.32 * low * (u < 0.9 ? 1 : 0.4);
    walkPose(p, b.t * 8 + i, moving ? 1 : 0);
    if (!moving && b.t < 0.5 + i * STEP && b.dir > 0) p.rotation.y = Math.PI * 1.15;
  });
  if (b.t > total) {
    h.board = null; h.crewIn = b.dir > 0; sfx.latch();
    if (h.crewIn) { say('Everybody is aboard, seat belts on. You have the controls, Captain Jasper!', 4); enter(); } else say('Crew out. See you next flight!', 2.4);
  }
}
// ---------- sitting inside ----------
const fadeEl = () => document.getElementById('cabFade');
function seat(inside) { if (h.inside === inside) return; h.inside = inside; S.on.inside = inside; K.yaw = 0; K.pitch = -0.16; if (inside) say(h.crewIn ? 'In the pilot\'s seat. Drag to look around, even back at the crew' : 'In the pilot\'s seat. The crew can still board', 3); else say('Looking from outside', 1.4); press('inside', inside); }
function press(id, v) { const b = document.querySelector(`#acts [data-id="${id}"]`); if (b) b.setAttribute('aria-pressed', String(v)); }
function enter() { const f = fadeEl(); f.style.opacity = '1'; setTimeout(() => { if (flying() && S.pending === null) { h.inside = true; S.on.inside = true; press('inside', true); K.yaw = 0; K.pitch = -0.16; } f.style.opacity = '0'; }, 420); }
const heliInside = () => h.inside && flying();
let down = null;
function heliPointer(kind, e) {          // dragging turns your head; a tap greets the crew
  if (kind === 'down') down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY };
  else if (kind === 'move' && down) { K.yaw = Math.max(-2.9, Math.min(2.9, K.yaw + (e.clientX - down.lx) * 0.006)); K.pitch = Math.max(-0.9, Math.min(0.6, K.pitch + (e.clientY - down.ly) * 0.004)); down.lx = e.clientX; down.ly = e.clientY; }
  else if (kind === 'up' && down) { const far = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null; if (far < 8) { const line = tapCockpit(K, e.clientX, e.clientY); if (line) { say(line, 3.4); sfx.click(); } } }
}

// ---------- flying ----------
// How hard the blades pull up compared with the weight: faster blades pull more (speed times itself), and so does
// more tip on each blade. Close to the ground the pushed-down air makes a cushion that helps.
const pull = () => h.rpm * h.rpm * C.lever * 2 * (1 + 0.2 * Math.exp(-h.agl / 1.6));
function autopilot(dt) {
  const d = Math.hypot(h.x, h.z), a = h;
  C.sx = C.sy = C.pedal = 0;
  if (a.board) { a.board.wait = false; return; }
  if (a.landed && a.floor.place === 'home' && d > 0.02) {   // on the home pad, but not in the middle: it rolls over on little ground wheels, as real skids do
    C.throttle = C.lever = 0; if (a.rpm < 0.05) { const st = Math.min(d, 2.6 * dt); a.x -= a.x / d * st; a.z -= a.z / d * st; } return;
  }
  if (d > 0.02 || a.y > 0.001) {                           // not home yet
    C.throttle = 1;
    if (a.rpm < 0.85 && a.landed) { C.lever = 0; return; }
    const over = groundAt(V, a.x, a.z).y, tx = d > 1 ? -a.x / d : 0, tz = d > 1 ? -a.z / d : 0;
    const ahead = Math.max(over, ...[5, 10, 16].map(q => q < d ? groundAt(V, a.x + tx * q, a.z + tz * q).y : 0));
    const cruise = d < 1.2 ? 0 : Math.max(9, ahead + 5);
    C.lever = 0.5 + Math.max(-0.28, Math.min(0.34, (cruise - a.y) * 0.1)); a.landed = false;
    const want = d < 1.2 ? (a.y < 0.8 ? 2.2 : 3.4) : 5; a.y += Math.max(-want * dt, Math.min(6 * dt, cruise - a.y)); a.y = Math.max(d < 1.2 ? 0 : over, a.y);
    if (a.y > ahead + 2 || d < 1.2) { const v = Math.min(24, d * 1.1 + 0.6), st = Math.min(d, v * dt); if (d > 0) { a.x -= a.x / d * st; a.z -= a.z / d * st; } a.vx = tx * v; a.vz = tz * v; } else { a.vx *= 0.9; a.vz *= 0.9; }
    const wy = d > 4 ? Math.atan2(tx, tz) : Math.round(a.yaw / FULL_TURN) * FULL_TURN, dy = ((wy - a.yaw) % FULL_TURN + FULL_TURN * 1.5) % FULL_TURN - Math.PI;
    a.yaw += dy * Math.min(1, dt * 2.4);
    a.vy = 0; a.pitch += ((d > 4 ? 0.16 : 0) - a.pitch) * Math.min(1, dt * 3); a.roll += (-dy * 0.2 - a.roll) * Math.min(1, dt * 3);
    if (a.y < 0.02 && d < 0.02) { a.y = 0; a.x = a.z = 0; a.landed = true; a.vx = a.vz = 0; sfx.lock(); }
  } else {
    h.landed = true; C.lever = 0; C.throttle = 0; h.x = h.z = h.y = h.vx = h.vz = h.vy = 0;
    const dy = ((-h.yaw) % FULL_TURN + FULL_TURN * 1.5) % FULL_TURN - Math.PI;
    h.yaw += dy * Math.min(1, dt * 4); if (Math.abs(dy) < 0.004) h.yaw = 0;
    if (S.pending === null) { h.auto = null; say('Home! The autopilot turned off', 2.2); }
  }
}
function fly(dt) {
  const L = pull();
  if (h.landed) {
    h.vx = h.vz = h.vy = h.vyaw = 0; h.y = h.floor.y; h.pitch += (0 - h.pitch) * Math.min(1, dt * 5); h.roll += (0 - h.roll) * Math.min(1, dt * 5);
    if (L > 1.015 && !h.board && h.floor.kind !== 'water') { h.landed = false; h.vy = 0.25; h.flew = true; h.sinkT = 0; if (!h.seen.lift) { h.seen.lift = 1; } say('Liftoff! Each blade is a little wing that pushes air down', 3.2); }
    return;
  }
  // up and down
  const off = h.rpm < 0.7 && C.throttle < 0.4;                                   // engine off: floating down like a maple seed
  h.vy += (9 * (L - 1) - 1.8 * h.vy) * dt;
  if (off) h.vy = Math.max(h.vy, -3.1);
  const gap = h.y - h.floor.y;
  if (gap < 3) h.vy = Math.max(h.vy, -0.9 - gap * 1.1);                           // always a soft landing
  if (h.y > 30 && h.vy > 0) h.vy *= Math.max(0, 1 - (h.y - 30) / 6);
  // forward, back and sideways: the blades lean, so they pull that way too
  const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw), rx = -fz, rz = fx;           // which way is forward, and which way is right
  const bite = c01(h.rpm * 1.4 - 0.3);
  const ax = (fx * C.sy * 9.2 + rx * C.sx * 6.4) * bite, az = (fz * C.sy * 9.2 + rz * C.sx * 6.4) * bite, push = C.sx || C.sy ? 0.68 : 1.15;
  h.vx += (ax - h.vx * push) * dt; h.vz += (az - h.vz * push) * dt;
  // look ahead: rise over hills, trees and roofs instead of bumping into them
  let need = -1; const sp = Math.hypot(h.vx, h.vz);
  for (const q of [0.35, 0.8, 1.3]) { const g = groundAt(V, h.x + h.vx * q, h.z + h.vz * q), up = g.y + (g.kind === 'trees' ? 0.7 : g.kind === 'water' ? 1.1 : sp > 2.5 ? 1.2 : 0); if (g.y > h.floor.y + 0.5 || g.kind === 'trees') need = Math.max(need, up); }
  h.rise += ((need > h.y + 0.05 ? 1 : 0) - h.rise) * Math.min(1, dt * 4);
  if (need > h.y) { h.y += Math.min(need - h.y, Math.max(1.5, (need - h.y) * 2.2) * dt); const slow = c01((need - h.y) / 4); h.vx *= 1 - slow * Math.min(1, dt * 4.5); h.vz *= 1 - slow * Math.min(1, dt * 4.5); h.vy = Math.max(h.vy, 0); }
  // the edge of the valley: turn back gently
  const r = Math.hypot(h.x, h.z); h.edge += ((r > EDGE - 6 ? 1 : 0) - h.edge) * Math.min(1, dt * 3);
  if (r > EDGE - 8) { const k = (r - (EDGE - 8)) * 1.6; h.vx -= h.x / r * k * dt * 3; h.vz -= h.z / r * k * dt * 3; }
  h.x += h.vx * dt; h.z += h.vz * dt; h.y += h.vy * dt;
  // turning: the pedals change how hard the tail blades push. Going fast, a sideways push makes a banked turn.
  const ahead = h.vx * fx + h.vz * fz, tailOff = S.on.tail;
  const wantYaw = (tailOff ? -0.95 * c01(h.rpm) : -C.pedal * 1.05 * c01(h.rpm * 1.5)) - C.sx * c01(Math.abs(ahead) / 9) * 0.75;
  h.vyaw += (wantYaw - h.vyaw) * Math.min(1, dt * (tailOff ? 0.8 : 3)); h.yaw += h.vyaw * dt;
  // the body tips along with the blades
  const slip = h.vx * rx + h.vz * rz;
  h.pitch += (C.sy * 0.2 * bite + ahead * 0.006 - h.pitch) * Math.min(1, dt * 3.5); h.roll += (C.sx * 0.2 * bite + slip * 0.006 - h.roll) * Math.min(1, dt * 3.5);
  // touching down
  h.floor = groundAt(V, h.x, h.z);
  const soft = h.floor.y + (h.floor.kind === 'water' ? 1.0 : h.floor.kind === 'trees' ? 0.7 : 0);
  if (h.y <= soft) {
    if (h.y < soft - 0.02) h.y += Math.min(soft - h.y, 3 * dt); else h.y = soft;
    h.vy = Math.max(h.vy, 0);
    if (h.floor.kind === 'water') { h.sinkT += dt; if (h.sinkT > 0.4 && L < 1) { C.lever = Math.max(C.lever, 0.5); C.throttle = Math.max(C.throttle, 0.95); } }
    else if (h.floor.kind === 'trees') { if (L < 1) { C.lever = Math.max(C.lever, 0.5); C.throttle = Math.max(C.throttle, 0.95); } }
    else if (Math.hypot(h.vx, h.vz) < 1.6 || L < 0.9) {
      h.landed = true; h.y = h.floor.y; sfx.lock(); S.stompK = Math.max(S.stompK, 0.5); C.sx = C.sy = 0;
      const p = h.floor.place, lines = p && ARRIVE[p]; if (lines) { h.seen[p] = (h.seen[p] || 0) + 1; say(lines[(h.seen[p] - 1) % lines.length], 4); } else say(h.off ? 'Down softly, with no engine at all!' : 'A soft landing', 2.4);
    }
  } else h.sinkT = 0;
  h.off = off;
}
function heliCaption() {
  if (h.auto) return 'Autopilot: flying home to the landing pad';
  if (h.board) return h.board.wait ? 'Waiting for the blades to stop, so the crew is safe' : h.board.dir > 0 ? (h.board.t < 4 ? 'The crew bends low and walks up from the front' : 'Over the skid and in through the side door') : 'The crew climbs out';
  const rpm = h.rpm, L = pull();
  if (h.landed) {
    if (C.throttle < 0.05 && rpm > 0.05) return 'Blades slowing down';
    if (rpm < 0.02 && C.throttle < 0.05) return h.crewIn ? 'Ready, Captain Jasper! Slide Blades up' : 'Helicopter mode! Board the crew, or slide Blades up';
    if (C.lever > 0.6 && rpm < 0.72) return 'Too slow to lift! Give it more blades';
    if (rpm < C.throttle - 0.04) return 'Blades spinning faster and faster';
    if (rpm < 0.72) return 'The blades sagged when they were still. Spinning pulls them out straight';
    return C.lever < 0.3 ? 'Blades at full speed. Now slide Lift up past the middle' : 'Almost! A little more lift';
  }
  if (h.edge > 0.5) return 'That\'s the edge of the valley. Turn around to see home';
  if (S.on.tail && rpm > 0.4) return 'Spinning! With no tail blades, the body turns the other way from the big blades';
  if (h.off) return 'Engine off! The air rushing up spins the blades, like a maple seed floating down';
  if (h.floor.kind === 'water' && h.agl < 1.6) return 'Hovering just over the water. The blade wind makes rings';
  if (h.floor.kind === 'trees' && h.agl < 1.6) return 'Right over the treetops! Find a clear spot to land';
  if (h.rise > 0.4) return 'Up and over!';
  if (h.floor.place === 'lake' && h.agl < 5) return 'Blade wind pushes rings across Mirror Lake. The ducks scoot away';
  const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw), ahead = h.vx * fx + h.vz * fz, slip = -h.vx * fz + h.vz * fx, sp = Math.hypot(h.vx, h.vz);
  if (Math.hypot(h.x - HOSP.x, h.z - HOSP.z) < 12 && h.y > HOSP.h) return 'Over the hospital. Ease Lift down to land on the roof';
  if (Math.hypot(h.x - MTN.x, h.z - MTN.z) < 8 && h.y > MTN.h) return 'Over Lookout Mountain. Ease Lift down to land on the H';
  if (rpm < 0.8 && h.vy < -0.5) return 'Slower blades pull less. Sinking!';
  if (ahead < -2.2) return 'Flying backward! Airplanes can\'t do that';
  if (Math.abs(slip) > 3 && Math.abs(slip) > Math.abs(ahead)) return 'Sliding sideways! The blades lean and pull that way';
  if (ahead > 8) return 'Zoom! Nose down, blades leaning forward';
  if (ahead > 2) return 'The blades lean forward, so the helicopter goes forward';
  if (Math.abs(h.vyaw) > 0.4) return 'The tail blades push sideways and the nose swings around';
  if (h.vy > 1.2) return 'Going up! More lift tips every blade to push more air';
  if (h.vy < -0.8) return 'Going down, nice and easy';
  return h.y > 24 ? 'Way up high! Look for the hospital, the mountain and the lake' : 'Hovering, like a hummingbird. Push the stick to go somewhere';
}

// ---------- blade wind: dust, snow or spray swirls out from under it ----------
let dustClock = 0;
function runDust(dt) {
  const near = h.wind; dustClock -= dt;
  if (near > 0.08 && dustClock <= 0 && !reduceMotion) {
    dustClock = 0.05 / near;
    const d = dust.find(q => q.t >= q.life);
    if (d) {
      const a = Math.random() * FULL_TURN, r = 1.6 + Math.random() * 1.6, sp = (3.5 + Math.random() * 3.5) * near;
      d.t = 0; d.life = 0.9 + Math.random() * 0.8; d.vx = Math.cos(a + 0.5) * sp; d.vz = Math.sin(a + 0.5) * sp; d.vy = 0.4 + Math.random() * 0.5; d.x = h.x + Math.cos(a) * r; d.z = h.z + 0.75 + Math.sin(a) * r; d.y = h.floor.y + 0.15; d.big = 0.14 + Math.random() * 0.16;
      d.m.material.color.setHex(h.floor.kind === 'water' ? 0xeaf4f8 : season === 'Winter' ? 0xffffff : h.floor.kind === 'pad' ? 0xc9c5ba : 0xb9ae84); d.m.visible = true; d.a = h.floor.kind === 'pad' ? 0.14 : 0.32;
    }
  }
  for (const d of dust) {
    if (d.t >= d.life) { d.m.visible = false; continue; }
    d.t += dt; const u = d.t / d.life; d.x += d.vx * dt; d.z += d.vz * dt; d.y += d.vy * dt * u; d.vx *= 1 - dt * 0.9; d.vz *= 1 - dt * 0.9;
    d.m.position.set(d.x - h.x, d.y, d.z - h.z); const ds = d.big * (1 + u * 2.6); d.m.scale.set(ds, ds * 0.45, ds); d.m.material.opacity = d.a * Math.min(1, u * 5) * (1 - u);
  }
}

// ---------- every frame ----------
function runHeli(dt, sdt, live) {
  const want = on() && !S.parkState ? 1 : 0;
  if (on() && !V) build();
  if (!V) return;
  if (on() && !settled()) heliReset();
  h.t += dt;
  const playing = on() && live, busy = S.pending !== null || h.auto;
  if (S.pending !== null && on()) { h.auto = 'home'; if (h.inside) seat(false); }
  if (on() && S.parkState) { h.inside = false; }
  if (playing) ui.readKeys(dt);
  if (playing || (on() && S.pending !== null)) {
    h.floor = groundAt(V, h.x, h.z);
    // the blades speed up and slow down gradually: they're heavy
    const airUp = !h.landed && C.throttle < h.rpm ? 0.6 : 0;                      // in the air, the wind rushing past keeps them turning
    const goal = Math.max(C.throttle, airUp), rate = h.auto ? 0.5 : goal > h.rpm ? 0.2 : h.landed ? 0.26 : 0.1;
    const before = h.rpm; h.rpm += Math.max(-rate * sdt, Math.min(rate * sdt, goal - h.rpm)); if (h.rpm < 0.002 && goal === 0) h.rpm = 0;
    if (before === 0 && h.rpm > 0) sfx.heliStart();
    if (busy) autopilot(sdt); else fly(sdt);
    h.agl = Math.max(0, h.y - h.floor.y);
    runBoard(sdt);
  } else if (!on()) { h.doorK = Math.max(0, h.doorK - dt * 2); crewSet.visible = false; h.rpm = 0; }
  // the rotor: a brake brings it to rest pointing straight back, ready to fold
  const om = h.rpm * 19;
  if (h.rpm > 0.12) h.spin += om * sdt;
  else { const rest = Math.ceil(h.spin / FULL_TURN - 1e-6) * FULL_TURN; if (C.throttle > 0.02 && on()) h.spin += Math.max(om, 0.5) * sdt; else h.spin = Math.min(rest, h.spin + Math.max(om, Math.min(2.2, (rest - h.spin) * 2.4 + 0.15)) * sdt); if (rest - h.spin < 1e-3 && C.throttle <= 0.02) h.spin = 0; }
  h.tailSpin += (S.on.tail && on() ? 0 : h.rpm * 24) * sdt; if (!on() || !settled()) { h.spin = 0; h.tailSpin = 0; }
  if (h.rpm === 0 && h.tailSpin) { h.tailSpin %= FULL_TURN; h.tailSpin *= 1 - Math.min(1, dt * 6); if (h.tailSpin < 0.002) h.tailSpin = 0; }
  S.heliAway = on() && settled() && !S.parkState && (!home() || h.rpm > 0 || h.spin !== 0 || !!h.board || h.yaw !== 0 || (h.auto && S.pending !== null && h.rpm > 0));
  S.heliRpm = on() ? h.rpm : 0;
  if (S.pending === null && h.auto && home() && h.rpm === 0) h.auto = null;

  // the valley rises around the landing pad, and slides by as he flies
  const vk = settled() ? want : want * ease(c01(S.tt / S.plan.T));
  h.k += (vk - h.k) * Math.min(1, dt * 2.2); if (h.k < 0.002 && !want) h.k = 0;
  V.set.visible = h.k > 0.002; V.set.scale.y = Math.max(0.001, sm(h.k));
  V.homeH.visible = on() && S.env.pad > 0.97;
  const gx = on() ? h.x : 0, gz = on() ? h.z : 0;
  groundSet.position.x = -gx; groundSet.position.z = -gz; grass.position.x = gx; grass.position.z = gz;
  cloudSet.position.x = -gx * 0.3; cloudSet.position.z = -gz * 0.3; birdSet.position.x = -gx * 0.6; birdSet.position.z = -gz * 0.6;
  h.wind = on() ? h.rpm * h.rpm * c01(1 - h.agl / 6.5) * (0.35 + 0.65 * c01(C.lever * 1.6)) : 0;
  if (V.set.visible) runValley(V, dt, { x: h.x, z: h.z, wind: h.wind, place: h.floor.place }); else if (!on() && h.still !== 1) { stillTrees(); h.still = 1; }
  if (on()) h.still = 0;
  runDust(dt);
  // a soft shadow on the ground far below, so he can see where he'll land
  const dark = on() ? c01((h.agl - 2) / 4) * 0.3 * (1 - 0.6 * S.nightK) : 0; blob.visible = dark > 0.01;
  if (blob.visible) { blob.material.opacity = dark; blob.position.set(0, h.floor.y + 0.09, 0.4); const b = 1.7 + h.agl * 0.05; blob.scale.set(b, 1, b * 1.35); }

  // what's on the screen
  const show = playing && S.pending === null && !h.auto && !h.board;
  const pct = Math.round(h.rpm * 100);
  ui.draw(show, { blades: pct + '%', lift: C.lever > 0.53 ? 'Up' : C.lever < 0.47 ? 'Down' : 'Hover' });
  if (on()) {
    const set = (id, f) => { const b = document.querySelector(`#acts [data-id="${id}"]`); if (b) f(b); };
    set('crew', b => { const t = h.crewIn ? 'Crew gets off' : 'Board the crew'; if (b.textContent !== t) b.textContent = t; b.hidden = !h.landed || !!h.board || !!h.auto; });
    set('inside', b => { b.hidden = !!h.board; });
    set('door', b => { b.hidden = !!h.board || !h.landed; if (b.hidden && S.on.door) { S.on.door = false; press('door', false); } });
    set('fhome', b => { b.hidden = (h.landed && h.floor.place === 'home') || !!h.auto; });
  }
  if (heliInside()) runCockpit(K, dt, { rpm: h.rpm, spin: h.spin, agl: h.agl, speed: Math.hypot(h.vx, h.vz), roll: h.roll, pitch: h.pitch, yaw: h.yaw, x: h.x, z: h.z, crewIn: h.crewIn, t: h.t, still: reduceMotion }, C, ease(c01(S.nightK)), flyerRef);
}
let flyerRef = null;
// after the rig is posed: the blades spin, sag, lift and twist
function heliPose() {
  const R = rig.heli; if (!R) return;
  if (!on() || !V || !settled()) { R.spin.rotation.y = 0; R.tilt.rotation.set(0, 0, 0); R.tailSpin.rotation.x = 0; for (const f of R.flaps) f.rotation.set(0, 0, 0); R.disc.visible = false; R.swash.position.y = -0.14; if (h.doorK > 0) lerpJ(rig.sideDoor, rig.sideDoor.userData.poses[2], sm(h.doorK)); return; }
  R.spin.rotation.y = h.spin; R.tailSpin.rotation.x = h.tailSpin;
  const lean = c01(h.rpm * 1.3);
  R.tilt.rotation.x += (C.sy * 0.11 * lean - R.tilt.rotation.x) * 0.15; R.tilt.rotation.z += (C.sx * 0.11 * lean - R.tilt.rotation.z) * 0.15;
  const load = h.rpm * h.rpm * C.lever;                              // still blades sag; spinning pulls them straight; lifting bends them up
  const sag = 0.06 * (1 - c01(h.rpm * 2.2)) - 0.075 * load;
  for (const f of R.flaps) { f.rotation.x = sag; f.rotation.z = -0.02 - 0.34 * C.lever; }                   // more lift twists every blade
  R.swash.position.y = -0.17 + 0.06 * C.lever;
  R.disc.visible = h.rpm > 0.25; R.disc.material.opacity = 0.16 * c01((h.rpm - 0.25) / 0.6); R.disc.scale.setScalar(1);
  if (h.doorK > 0) lerpJ(rig.sideDoor, rig.sideDoor.userData.poses[2], sm(h.doorK));
}
// puts the whole toy in the air; it turns around its mast
function placeHeli(flyer, beam) {
  flyerRef = flyer;
  if (!V || !on()) { if (flyer.rotation.order !== 'XYZ') flyer.rotation.order = 'XYZ'; return; }
  flyer.rotation.order = 'YXZ';
  const bob = h.landed || reduceMotion ? 0 : Math.sin(h.t * 1.3) * 0.05, mz = 0.75;
  flyer.position.y += h.y + bob; flyer.rotation.y += h.yaw; flyer.rotation.x += h.pitch; flyer.rotation.z += h.roll + (h.landed || reduceMotion ? 0 : Math.sin(h.t * 0.9) * 0.008);
  flyer.position.x += -Math.sin(h.yaw) * mz; flyer.position.z += mz - Math.cos(h.yaw) * mz;
  if (settled() && !reduceMotion && h.rpm > 0.1 && h.rpm < 0.5 && h.landed) flyer.position.x += Math.sin(h.t * 31) * 0.006;        // it rocks a little as the blades get going
  const f = [Math.sin(h.yaw), Math.cos(h.yaw)];
  beam.position.set(f[0] * 2.4, h.y + 0.5, f[1] * 2.4); beam.target.position.set(f[0] * 11, Math.max(h.floor.y, h.y - 5), f[1] * 11);
  flyer.updateMatrixWorld();
}
function heliView() { const up = on() && settled() && !S.parkState; return { on: up, chase: up && (h.rpm > 0.3 || !h.landed) && !S.on.tail, yaw: h.yaw, zoom: up ? c01(h.agl / 6) * 0.35 : 0 }; }
function drawHeli() { drawCockpit(K, scene); }

window.__heli = { h, C, get crew() { return crew ? crew.map(p => ({ v: p.visible, x: p.position.x, z: p.position.z })) : []; }, get look() { return K ? { yaw: K.yaw, pitch: K.pitch } : null; }, set look(v) { K.yaw = v.yaw; K.pitch = v.pitch; }, greet: i => greet(K.crew[i]), ground: (x, z) => groundAt(V, x, z), place: (x, y, z) => { h.x = x; h.z = z; h.y = y; h.landed = false; h.floor = groundAt(V, x, z); }, get dust() { return dust ? dust.filter(d => d.m.visible).length : 0; }, get rings() { return V ? V.rings.filter(r => r.visible).length : 0; }, get ducks() { return V ? V.ducks.map(d => [d.d.position.x, d.d.position.z]) : []; }, rig: rig.heli };

export { drawHeli, heliAct, heliCaption, heliInside, heliPointer, heliPose, heliReset, heliView, placeHeli, runHeli };
