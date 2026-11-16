import * as THREE from 'three';
import { trackSet } from '../scenery/train.js';
import { makeCar } from '../scenery/road.js';
import { signTex } from '../people/people.js';
import { S, wrap } from './state.js';
import { sfx } from '../audio/audio.js';
const RAIL = 12;                                   // rail length: the wheels clack over each joint

// The railroad crossing halfway between stations, the way a real one works: when the train comes near,
// the red lights flash one after the other and the bell rings; a few seconds later the gates come down.
// The engineer blows long, long, short, long. Cars wait behind the gates; the gates stay down until the
// whole train has gone by, then they go up, the lights stop, and the car drives across.
const XING_Z = 78;                                 // where it sits along the 160-long loop of scenery (the station is at 0)
const WARN = 34, CLEAR = -7, STOP = 5.3;                       // the lights come on this far ahead, and stay on until the train is this far past
let xing = null, xingD = 999, warnT = 0, gateK = 0, bellT = 0, carX = 13, carV = 0, whistled = false, viewK = 0;

function buildCrossing() {
  const g = new THREE.Group(); trackSet.add(g);
  const M = (c, r = 0.85, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const add = (geo, mat, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  // the road: asphalt that fades out into the grass at both ends, a yellow center line and white stop lines
  const rc = document.createElement('canvas'); rc.width = 1024; rc.height = 128;
  const r2 = rc.getContext('2d'), fade = r2.createLinearGradient(0, 0, 1024, 0);
  fade.addColorStop(0, 'rgba(74,74,72,0)'); fade.addColorStop(0.08, 'rgba(74,74,72,1)'); fade.addColorStop(0.92, 'rgba(74,74,72,1)'); fade.addColorStop(1, 'rgba(74,74,72,0)');
  r2.fillStyle = fade; r2.fillRect(0, 0, 1024, 128);
  const px = x => (x + 9.5) / 22 * 1024;           // road x to canvas x
  r2.fillStyle = '#d9b43a'; r2.fillRect(px(-7.5), 61, px(-2.7) - px(-7.5), 3); r2.fillRect(px(2.7), 61, px(10.5) - px(2.7), 3);
  r2.fillStyle = '#e8e2d0'; r2.fillRect(px(3.4), 0, 10, 62); r2.fillRect(px(-3.4) - 10, 66, 10, 62);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(22, 3.2), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(rc), transparent: true, roughness: 0.95 }));
  road.rotation.x = -Math.PI / 2; road.position.set(1.5, 0.016, 0); road.receiveShadow = true; g.add(road);
  // the crossing deck sits level with the rail tops, with a ramp up from the road on each side
  const asphalt = M(0x4a4a48, 0.95);
  add(new THREE.BoxGeometry(3.0, 0.2, 3.2), M(0x8d8a84), 0, 0.1, 0);
  const railTop = M(0xa7abb0, 0.3, 0.85);
  for (const x of [-0.36, 0.36]) add(new THREE.BoxGeometry(0.07, 0.006, 3.2), railTop, x, 0.203, 0);
  for (const s of [-1, 1]) { const ramp = add(new THREE.BoxGeometry(1.13, 0.04, 3.2), asphalt, s * 2.05, 0.09, 0); ramp.rotation.z = -s * 0.166; }
  // two signals, each on the driver's right: a crossbuck, two red lights facing each way, and a gate arm
  const white = M(0xf3efe6, 0.6), black = M(0x1d1d1d, 0.6), metal = M(0x9a9ea2, 0.4, 0.6);
  const lamps = [], arms = [];
  const buck = (txt) => new THREE.MeshStandardMaterial({ map: signTex(txt, '#f3efe6', '#1d1d1d', 512, 96, 64), side: THREE.DoubleSide, roughness: 0.7 });
  for (const s of [1, -1]) {                       // s = 1: the signal for cars coming from the +x side
    const mast = new THREE.Group(); mast.position.set(s * 1.95, 0, -s * 2.6); g.add(mast);
    add(new THREE.CylinderGeometry(0.05, 0.06, 2.5, 10), metal, 0, 1.25, 0, mast);
    add(new THREE.BoxGeometry(0.3, 0.12, 0.3), M(0x8d8a84), 0, 0.06, 0, mast);
    for (const [txt, a] of [['RAILROAD', 0.62], ['CROSSING', -0.62]]) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.22), buck(txt)); b.position.set(a > 0 ? 0.07 : 0.085, 2.3, 0); b.rotation.set(0, Math.PI / 2, a); mast.add(b);
    }
    add(new THREE.BoxGeometry(0.06, 0.06, 0.9), black, 0, 1.75, 0, mast);
    for (const face of [1, -1]) for (const k of [0, 1]) {   // a pair of lights facing each way down the road
      const z = (k ? 0.36 : -0.36);
      const back = add(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 20).rotateZ(Math.PI / 2), black, face * 0.06, 1.75, z, mast); back.castShadow = false;
      const lens = new THREE.MeshStandardMaterial({ color: 0x5a1414, emissive: 0xff2a1a, emissiveIntensity: 0, roughness: 0.3 });
      add(new THREE.SphereGeometry(0.08, 12, 8, 0, Math.PI), lens, face * 0.08, 1.75, z, mast).rotation.y = face * Math.PI / 2;
      add(new THREE.BoxGeometry(0.06, 0.03, 0.22), black, face * 0.11, 1.85, z, mast);   // the little hood over each light
      lamps.push({ m: lens, k });
    }
    // the gate arm: white and red stripes, a counterweight behind the pivot; it points up until it's needed
    const pivot = new THREE.Group(); pivot.position.set(0, 0.95, 0); mast.add(pivot);
    const sc = document.createElement('canvas'); sc.width = 256; sc.height = 16; const sg = sc.getContext('2d');
    for (let i = 0; i < 8; i++) { sg.fillStyle = i % 2 ? '#a3262e' : '#f3efe6'; sg.fillRect(i * 32, 0, 32, 16); }
    const stripe = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(sc), roughness: 0.6 });
    add(new THREE.BoxGeometry(0.07, 0.07, 2.3), stripe, 0.08, 0, s * 1.2, pivot);
    add(new THREE.BoxGeometry(0.16, 0.2, 0.3), M(0x6a6e72, 0.5, 0.4), 0.08, 0, -s * 0.2, pivot);
    for (const z of [0.9, 1.7]) {
      const l = new THREE.MeshStandardMaterial({ color: 0x5a1414, emissive: 0xff2a1a, emissiveIntensity: 0, roughness: 0.3 });
      add(new THREE.SphereGeometry(0.04, 8, 6), l, 0.08, 0.06, s * z, pivot); lamps.push({ m: l, k: z > 1 ? 1 : 0 });
    }
    arms.push({ pivot, s });
  }
  // a car comes along and waits at the stop line on its side of the road
  const car = makeCar('sedan', 0x5d7a8c); car.rotation.y = -Math.PI / 2; car.position.set(13, 0.016, -0.8); g.add(car);
  xing = { g, lamps, arms, car };
}

function setGates(k) {                             // 0 = up, 1 = down across the road
  const a = (1 - k) * 1.5;
  for (const { pivot, s } of xing.arms) pivot.rotation.x = -s * a;
}

// The Skyrender train, every frame: waits at Jasper Junction, then pulls out and chugs along.
// Its steam is in game/puffs.js; the big driving wheels and side rods turn in the main loop
// (the truck and tractor use the same wheels). Its buttons and captions are in game/core.js.
function runTrain(dt, sdt, live) {
  // Train: steam at the platform, then pulls out of the station
  const t0 = S.trainT, d0 = S.stationTravel;
  if (S.plan.to === 2 && live) S.trainT += sdt;
  if (t0 < 2.5 && S.trainT >= 2.5 && !S.on.stop) sfx.whistle('SS');   // two short toots: here we go
  const wantSpeed = S.plan.to === 2 && live && S.trainT > 2.5 && !S.on.stop ? 8 : 0;
  S.trainSpeed += (wantSpeed - S.trainSpeed) * Math.min(1, dt * (wantSpeed > S.trainSpeed ? 0.35 : 1.6));
  if (S.trainSpeed < 0.01) S.trainSpeed = 0;
  S.stationTravel += S.trainSpeed * sdt;
  if (Math.floor(S.stationTravel / RAIL) !== Math.floor(d0 / RAIL)) sfx.clack();   // clickety-clack
  runCrossing(dt, sdt);
}

function runCrossing(dt, sdt) {
  if (!xing) return;
  xingD = wrap(XING_Z - S.stationTravel, 80);     // how far ahead of the engine the crossing is
  xing.g.position.z = xingD;
  const here = S.env.track > 0.5 && trackSet.visible;
  const warn = here && xingD < WARN && xingD > CLEAR;
  // the engineer starts the crossing whistle about four seconds out, and the last long blast lasts until the engine is there, while the train is moving
  if (warn && !whistled && xingD < 30 && S.trainSpeed > 2 && S.plan.to === 2) { whistled = true; sfx.whistle('LLSL'); }
  if (xingD > WARN + 5 || xingD < CLEAR - 5) whistled = false;
  warnT = warn ? warnT + sdt : 0;
  const want = warn && warnT > 1.2 ? 1 : 0;        // a few seconds of flashing before the gates start down
  gateK += Math.sign(want - gateK) * Math.min(Math.abs(want - gateK), sdt / 2.4);   // real gates take several seconds
  setGates(gateK * gateK * (3 - 2 * gateK));
  const flashing = warn || gateK > 0.02;           // the lights keep flashing until the gates are all the way up
  const ph = Math.floor(S.clockT * 1.8) % 2;       // each light about 55 times a minute, taking turns
  for (const l of xing.lamps) l.m.emissiveIntensity = flashing && l.k === ph ? 2.6 : 0;
  if (flashing && here && S.plan.to === 2) { bellT -= sdt; if (bellT <= 0) { bellT = 0.45; sfx.xingBell(); } } else bellT = 0;
  // the car: pulls up and stops at the line while the lights flash, then drives across once the gates are up
  if (xingD > 40 || xingD < -45) { carX = 13; carV = 0; }
  else if (!flashing && xingD < 0) { carV = Math.min(5, carV + sdt * 2.2); carX -= carV * sdt; }   // gates up: off it goes
  else { carV = Math.min(4, Math.max(0, (carX - STOP) * 1.2)); carX = Math.max(STOP, carX - carV * sdt); }
  xing.car.position.x = carX;
  // the camera turns to watch while the crossing does its job (it lets go as soon as the car has crossed)
  const watch = S.plan.to === 2 && here && (warn || gateK > 0.02 || (xingD < 0 && carX < STOP && carX > -6)) ? 1 : 0;
  viewK += (watch - viewK) * Math.min(1, dt * 1.2);
  xing.car.visible = carX > -10 && carX < 12.9;
}

// How much the camera should look at the crossing (0 to 1), and where it is
const crossingView = () => ({ k: viewK, z: xingD });

// What the caption line says near the crossing (empty when there's nothing to say)
function crossingCaption() {
  if (!xing || S.env.track < 0.5) return '';
  if (warnT > 0 && gateK < 0.95 && xingD > 0) return 'Crossing ahead! Red lights flash and the bell rings';
  if (gateK > 0.95) return 'The gates are down. The car waits for the train to pass';
  if (gateK > 0.02 && xingD < 0) return 'The gates go up after the whole train has passed';
  if (xingD < 0 && carV > 0.5 && carX < STOP) return 'Gates up. Now the car can cross the tracks';
  return '';
}

// test hook (like window.__moon): where the crossing is and what it's doing
Object.defineProperty(window, '__xing', { get: () => ({ d: xingD, gate: gateK, carX, view: viewK }) });
export { buildCrossing, crossingCaption, crossingView, runTrain };
