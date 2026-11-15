import * as THREE from 'three';
import { buildRig, planMorph } from '../rig/rig.js';
import { scene } from '../world/setup.js';
import { makeTextures } from '../rig/textures.js';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Smoothness: the toy is over a thousand little parts, and the browser draws each one separately. Parts that
// are fixed to the same moving piece and painted the same are joined into one shape, so they're drawn at once.
// Nothing moves or looks different: every joint, and every part the game moves, shows or hides by itself, stays.
function mergeFixedParts(rig) {
  const named = new Set();                         // parts the game reaches for by name stay separate
  const seen = new Set();
  const visit = (v, depth) => {
    if (!v || typeof v !== 'object' || depth > 5 || seen.has(v)) return; seen.add(v);
    if (v.isObject3D) { named.add(v); visit(v.userData, depth + 1); return; }
    if (v.isMaterial || v.isTexture || v.isBufferGeometry || ArrayBuffer.isView(v)) return;
    for (const k in v) visit(v[k], depth + 1);
  };
  for (const k in rig) if (k !== 'bot') visit(rig[k], 0);
  rig.bot.traverse(o => { if (o.userData) for (const k in o.userData) { const v = o.userData[k]; if (v && v.isObject3D) named.add(v); } });
  const groups = new Map();
  rig.bot.traverse(o => {
    if (!o.isMesh || named.has(o) || o.children.length || !o.visible || Array.isArray(o.material) || o.material.transparent || o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return;
    o.updateMatrix();
    if (o.matrix.determinant() <= 0) return;      // mirrored parts would turn inside out
    const g = o.geometry, attrs = Object.keys(g.attributes).sort().join(',');
    const key = [o.parent.id, o.material.id, o.castShadow, o.receiveShadow, o.renderOrder, !!g.index, attrs, g.groups.length].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  });
  let before = 0, after = 0;
  for (const list of groups.values()) {
    before += list.length;
    if (list.length < 2) { after += list.length; continue; }
    const geo = BufferGeometryUtils.mergeBufferGeometries(list.map(o => o.geometry.clone().applyMatrix4(o.matrix)));
    if (!geo) { after += list.length; continue; }
    const m = new THREE.Mesh(geo, list[0].material);
    m.castShadow = list[0].castShadow; m.receiveShadow = list[0].receiveShadow; m.renderOrder = list[0].renderOrder;
    const parent = list[0].parent; for (const o of list) parent.remove(o); parent.add(m);
    after++;
  }
  rig.merged = { before, after };
}

// The toy's shared state, in one place. Every part of the game reads and changes it through S
// (S.planeT, S.on.lights, ...), so any module can move the toy along without setters.
// This file runs right before game/core.js, so the machine is built at the same moment as always.

const rig = buildRig(THREE, makeTextures());
mergeFixedParts(rig);
const flyer = new THREE.Group();          // bob and bank while airborne, rumble on the rails
scene.add(flyer);
flyer.add(rig.bot);
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = t => Math.min(1, Math.max(0, t));
const wrap = (z, L) => ((z + L) % (2 * L) + 2 * L) % (2 * L) - L;
const lerp = THREE.MathUtils.lerp, sm = t => t * t * (3 - 2 * t), c01 = t => Math.min(1, Math.max(0, t));
// Toggles act on top of the current pose, easing in and out
const lerpJ = (j, pose, k) => {
  if (k <= 0) return;
  j.position.x += (pose.P[0] - j.position.x) * k; j.position.y += (pose.P[1] - j.position.y) * k; j.position.z += (pose.P[2] - j.position.z) * k;
  j.rotation.x += (pose.R[0] - j.rotation.x) * k; j.rotation.y += (pose.R[1] - j.rotation.y) * k; j.rotation.z += (pose.R[2] - j.rotation.z) * k;
};

// What the ground looks like in each mode: runway, railway with station, or landing pad
const ENV = [
  { runway: 1, track: 0, pad: 0, launch: 0, road: 0, farm: 0 },   // plane: on the runway
  { runway: 0, track: 0, pad: 1, launch: 0, road: 0, farm: 0 },   // robot: standing on the pad
  { runway: 0, track: 1, pad: 0, launch: 0, road: 0, farm: 0 },   // train: at Jasper Junction
  { runway: 0, track: 0, pad: 0, launch: 1, road: 0, farm: 0 },   // rocket: Jasper Spaceport
  { runway: 0, track: 0, pad: 0, launch: 0, road: 1, farm: 0 },   // truck: country road
  { runway: 0, track: 0, pad: 0, launch: 0, road: 0, farm: 1 }    // tractor: Jasper's farm
];

const S = {
  // transforming
  mode: 0,                        // last mode it fully reached
  plan: planMorph(rig, 0, null), tt: 0,
  paused: false, scrubbing: false, speed: 1,
  env: { ...ENV[0] }, envFrom: { ...ENV[0] },
  pending: null,                  // a mode to change to once it has landed
  // rocket
  launchT: 0, alt: 0, thrust: 0, orbitRoll: 0, armK: 1,
  // plane
  planeT: 0, planeSpeed: 0, planeTravel: 0,
  // train
  trainT: 0, trainSpeed: 0, stationTravel: 0, crank: 0,
  // big rig
  truckT: 0, truckSpeed: 0, roadTravel: 0, hop: 0, smokeClock: 0,
  crash: null,                    // the crash in progress, run by truck/truck.js
  // tractor
  tractorT: 0, tractorSpeed: 0, farmTravel: 0, plowDust: 0, tractorPuff: 0, sprayClock: 0,
  // Skyrender Jr.
  jrPhase: 0, jrU: 0, jrLoop: 0, jrW: 0, jrDoor: 0,
  // toggles: which are switched on, and how far each has animated
  on: { size: 'medium' }, blend: {},
  // robot
  marchPh: 0, stompK: 0, snapY: 0,
  flash: null,                    // a short caption that takes over for a moment ("Toot toot!")
  travel: 0, clockT: 0,
  // day and night
  night: false, nightK: 0,
  // the airport hall
  hallK: 0, driveK: 0, viewK: 0, hallZ: 0, hallDoorK: 0,
  // bedtime: parkState 0 out playing, 1 going home, 2 put away for the night, 3 coming back out
  parkState: 0, parkT: 0, parkQueued: false, parkWant: null, parkZ: 0, homeK: 0, parkWasNight: false, parkD: 12, parkRobot: false, parkMoving: false,
};
S.tt = S.plan.T;

// Pieces of the truck world and the plane cabin that the main loop calls. Those modules are built after
// game/core.js, so main.js hands them over with link() (in core.js) before the first frame.
const linked = {};
const box = new THREE.Box3();           // the toy's bounding box this frame, measured in the main loop

const settled = () => S.tt >= S.plan.T;
const targetMode = () => S.pending ?? S.plan.to;
const airborne = () => settled() && ((S.plan.to === 3 && S.launchT > 4.5) || (S.plan.to === 0 && S.planeT > 2));
function say(text, secs = 1.6) { S.flash = { text, until: S.clockT + secs }; }

export { ENV, S, box, airborne, c01, clamp01, ease, flyer, lerp, lerpJ, linked, rig, say, settled, sm, targetMode, wrap };
