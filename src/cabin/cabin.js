import * as THREE from 'three';
import { renderer, scene, stage } from '../world/setup.js';
import { makePerson, makeSuitcase, walkPose } from '../people/people.js';
import { noise, play, sfx, tone } from '../audio/audio.js';
import { S, rig, say, sm } from '../game/state.js';
import { buildActions } from '../game/core.js';

// =====================================================================================
// INSIDE SKYRENDER: a whole little world inside the plane.
// Boarding: the nose tucks up, travelers climb the stairs with their suitcases. Inside you
// pick each traveler's seat, open the overhead bins, serve food, and visit the cockpit,
// where almost every button does something. Like a lift-the-flap book: tap things to see.
// =====================================================================================
const cab = { active: false, view: 'cabin', flight: 'gate', flightT: 0, alt: 0, speed: 0, clouds: true, nightK: 0, night: false,
  seatbelt: false, shake: 0, wipers: 0, autopilot: false, rainbow: 0, rainbowOn: false, party: 0, lights: false, served: false, foodT: -1, coffee: false };
const board = { active: false, t: 0, out: false, k: 0, walkers: [] };
const cabinScene = new THREE.Scene();
const cabinCam = new THREE.PerspectiveCamera(42, 1, 0.05, 2500);
cabinScene.fog = new THREE.Fog(0xdde7ec, 80, 520);
const clickables = [];
const tappable = (obj, fn) => { obj.userData.onClick = fn; clickables.push(obj); return obj; };
const CS = (c, r = 0.75, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const cbox = (w, h, d, mat, x = 0, y = 0, z = 0, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; if (parent) parent.add(m); return m; };
const textPlate = (text, w, h, bg, fg, px = 64, cw = 256, ch = 96) => {
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.fillStyle = fg; g.font = `800 ${px}px Karla, "Helvetica Neue", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cw / 2, ch / 2 + 3);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), roughness: 0.7 }));
};

// ---------- light and sky ----------
const cHemi = new THREE.HemisphereLight(0xf4f7fa, 0x6a6458, 0.9); cabinScene.add(cHemi);
const cSun = new THREE.DirectionalLight(0xfff2dc, 0.65); cSun.position.set(30, 60, 20); cSun.castShadow = true; cSun.shadow.mapSize.set(2048, 2048);
Object.assign(cSun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 140 }); cabinScene.add(cSun);
const cSkyU = { top: { value: new THREE.Color(0x6f9cc6) }, bottom: { value: new THREE.Color(0xdde7ec) } };
const cSky = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: cSkyU,
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = normalize(vP).y; gl_FragColor = vec4(mix(bottom, top, pow(max(h, 0.0), 0.55)), 1.0); }' }));
cabinScene.add(cSky);
const cStars = new THREE.Points((() => { const g = new THREE.BufferGeometry(), p = []; for (let i = 0; i < 900; i++) { const u = Math.random() * 0.9 + 0.1, a = Math.random() * 6.283, r = Math.sqrt(1 - u * u); p.push(1100 * r * Math.cos(a), 1100 * u, 1100 * r * Math.sin(a)); } g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return g; })(),
  new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false }));
cabinScene.add(cStars);

// ---------- the world outside: an airport apron, a terminal, other planes, clouds ----------
const cWorld = new THREE.Group(); cabinScene.add(cWorld);
const grassM = CS(0x6f8c4c, 1), apronM = CS(0x7d7f7a, 0.95);
cbox(3000, 0.1, 3000, grassM, 0, -1.65, 0, cWorld);
cbox(80, 0.1, 400, apronM, -10, -1.58, 0, cWorld);
cbox(30, 0.12, 3000, CS(0x55575a, 0.9), 45, -1.57, 0, cWorld);                              // runway alongside
for (let z = -1400; z < 1400; z += 24) cbox(0.6, 0.13, 9, CS(0xf2f2ee), 45, -1.56, z, cWorld);
const terminal = new THREE.Group(); terminal.position.set(-34, -1.6, 0); cWorld.add(terminal);
cbox(16, 9, 120, CS(0xe6e1d6), 0, 4.5, 0, terminal);
for (let z = -56; z < 56; z += 3) cbox(0.2, 4, 2.2, CS(0x5b7d98, 0.2, 0.3), 8.05, 5, z, terminal);
const tsign = textPlate('JASPER JUNCTION AIRPORT', 30, 2.6, '#1f4f8a', '#ffffff', 60, 1024, 90); tsign.position.set(8.2, 10, 0); tsign.rotation.y = Math.PI / 2; terminal.add(tsign);
// jet bridge reaching out to Skyrender's front door
const bridge = new THREE.Group(); bridge.position.set(-26, -1.6, 9.3); cWorld.add(bridge);
const bridgeTube = cbox(1, 2.6, 2.6, CS(0xd9d4c7), 0, 3.0, 0, bridge); bridgeTube.geometry.translate(0.5, 0, 0);
cbox(0.5, 2.6, 0.5, CS(0x7d8286), 20, 1.3, 0, bridge);
// other planes parked at the gates and taxiing, each in its own colors
const otherJet = (body, tail, stripe) => {
  const g = new THREE.Group();
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 22, 20).rotateX(Math.PI / 2), CS(body, 0.5)); g.add(fus);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.6, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), CS(body, 0.5)); nose.position.z = 11; g.add(nose);
  const tc = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5, 18).rotateX(-Math.PI / 2), CS(body, 0.5)); tc.position.z = -13.5; g.add(tc);
  cbox(26, 0.3, 4.5, CS(body, 0.5), 0, -0.6, 1, g);
  cbox(9, 0.25, 2.5, CS(body, 0.5), 0, 0.6, -13.5, g);
  const fin = cbox(0.35, 5.5, 4, CS(tail, 0.5), 0, 3.6, -13.2, g); fin.rotation.x = -0.35;
  cbox(3.24, 0.4, 20, CS(stripe, 0.5), 0, 0, 0, g);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.8, 3.4, 16).rotateX(Math.PI / 2), CS(0xd8d8d8, 0.4)); e.position.set(sx * 5.5, -1.5, 2.5); g.add(e); }
  for (let z = -9; z < 9; z += 1.1) for (const sx of [-1, 1]) cbox(0.05, 0.35, 0.35, CS(0x1d2a33, 0.2), sx * 1.6, 0.5, z, g);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
};
const parkedJets = [[0x2f6db5, 0xf2c94c, 0xf2c94c, -14, 48, 0.3], [0xf2f2ee, 0x2f8a6a, 0x2f8a6a, -14, -42, -0.2], [0xf2f2ee, 0xd94a5a, 0x1d1d1d, 20, 70, 3.0]].map(([b, t, s, x, z, ry]) => {
  const j = otherJet(b, t, s); j.position.set(x, 1.7, z); j.rotation.y = ry; j.scale.setScalar(0.62); cWorld.add(j); return j;
});
const taxiJet = otherJet(0xf2b81c, 0x7a2430, 0x7a2430); taxiJet.scale.setScalar(0.62); taxiJet.position.set(45, 1.7, 0); cWorld.add(taxiJet);
const flyJet = otherJet(0xf2f2ee, 0x1f4f8a, 0x1f4f8a); flyJet.scale.setScalar(0.62); flyJet.visible = false; cabinScene.add(flyJet);
let flyJetT = -1, flyJetX = 30;
// clouds: soft white clusters
const cloudGrp = new THREE.Group(); cabinScene.add(cloudGrp);
const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.25 });
for (let i = 0; i < 110; i++) {
  const c = new THREE.Group(); const n = 3 + Math.floor(Math.random() * 4);
  for (let k = 0; k < n; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(4 + Math.random() * 5, 10, 8), cloudM); s.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 9); s.scale.y = 0.6; c.add(s); }
  c.position.set((Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 110), (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 900); c.userData.z0 = c.position.z; cloudGrp.add(c);
}
// rainbow arc (shows up when the RAINBOW button is pressed)
const rainbow = new THREE.Group(); rainbow.position.set(0, -60, 520); cabinScene.add(rainbow);
[0xe23b3b, 0xf28c28, 0xf2d43a, 0x4cb84c, 0x3a7be2, 0x5a3ab8, 0x9a3ab8].forEach((c, i) => {
  const t = new THREE.Mesh(new THREE.TorusGeometry(230 - i * 7, 3.6, 6, 60, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, fog: false })); rainbow.add(t);
});

// ---------- the cabin: a cut-away so you can look down inside ----------
const cabRoot = new THREE.Group(); cabinScene.add(cabRoot);
const ROWS = 8, ROW_Z = r => 7.2 - (r - 1) * 1.9, SEAT_X = { A: -1.5, B: -0.95, C: 0.95, D: 1.5 }, LETTERS = ['A', 'B', 'C', 'D'];
const wallIn = CS(0xe9e4da, 0.8), skinOut = CS(0xf4f3ef, 0.45), livery = CS(0x7a2430, 0.5), seatM = CS(0x2f4f86, 0.7), seatM2 = CS(0x7a2430, 0.7), carpet = CS(0x5a6470, 1), aisleM = CS(0x7a2430, 1);
cbox(4.6, 0.2, 21.6, carpet, 0, -0.1, -0.6, cabRoot);
cbox(0.9, 0.21, 19, aisleM, 0, -0.09, -0.8, cabRoot);
cbox(4.9, 0.6, 24.2, skinOut, 0, -0.5, 0.6, cabRoot);                                         // belly
// side walls with window holes at every row, white outside skin and a red stripe
const winZ = []; for (let r = 1; r <= ROWS; r++) winZ.push(ROW_Z(r) + 0.35);
for (const sx of [-1, 1]) {
  const x = sx * 2.2;
  cbox(0.14, 0.95, 21.6, wallIn, x, 0.47, -0.6, cabRoot);
  cbox(0.14, 0.8, 21.6, wallIn, x, 1.9, -0.6, cabRoot);
  cbox(0.08, 2.35, 21.6, skinOut, x + sx * 0.11, 1.1, -0.6, cabRoot);                        // outside skin (with holes cut where windows go, below)
  cbox(0.09, 0.16, 21.6, livery, x + sx * 0.16, 0.85, -0.6, cabRoot);
  let zPrev = 10.2;
  for (const wz of [...winZ].sort((a, b) => b - a)) {                                        // pillars between the windows
    const zA = wz + 0.3, zB = wz - 0.3;
    if (zPrev > zA) cbox(0.16, 0.55, zPrev - zA, wallIn, x, 1.225, (zPrev + zA) / 2, cabRoot);
    zPrev = zB;
  }
  cbox(0.16, 0.55, zPrev + 11.4, wallIn, x, 1.225, (zPrev - 11.4) / 2, cabRoot);
}
// the skin box above covers the window holes, so give each window a real see-through pane and frame
cabRoot.children.filter(m => m.material === skinOut && m.geometry.parameters.height > 2).forEach(m => { m.visible = false; });
for (const sx of [-1, 1]) {
  cbox(0.06, 0.95, 21.6, skinOut, sx * 2.32, 0.47, -0.6, cabRoot);
  cbox(0.06, 0.8, 21.6, skinOut, sx * 2.32, 1.9, -0.6, cabRoot);
}
const shades = [];
for (const sx of [-1, 1]) for (const wz of winZ) {
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.5), new THREE.MeshStandardMaterial({ color: 0xbfd9e8, transparent: true, opacity: 0.18, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.set(sx * 2.3, 1.22, wz); glass.rotation.y = Math.PI / 2; cabRoot.add(glass);
  const shade = cbox(0.03, 0.5, 0.56, CS(0xd8d2c6, 0.9), sx * 2.12, 1.72, wz, cabRoot); shade.userData.open = true; shades.push(shade);
  const hit = cbox(0.05, 0.6, 0.6, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), sx * 2.1, 1.22, wz, cabRoot);
  tappable(hit, () => { shade.userData.open = !shade.userData.open; sfx.click(); say(shade.userData.open ? 'Window shade up. Look outside!' : 'Window shade down', 1.4); });
}
// front bulkhead with the cockpit door, the galley and the front boarding door on the left
cbox(4.4, 2.3, 0.15, wallIn, 0, 1.15, 10.2, cabRoot).visible = true;
const ckDoor = new THREE.Group(); ckDoor.position.set(-0.45, 0, 10.12); cabRoot.add(ckDoor);
cbox(0.9, 2.0, 0.08, CS(0x8a929a, 0.5), 0.45, 1.0, 0, ckDoor);
const ckSign = textPlate('COCKPIT', 0.8, 0.2, '#1d2a33', '#f2f2ee', 56); ckSign.position.set(0.45, 1.75, -0.05); ckSign.rotation.y = Math.PI; ckDoor.add(ckSign);
tappable(ckDoor, () => setView('cockpit'));
// galley counters, ovens, coffee machine
for (const sx of [-1, 1]) {
  cbox(1.3, 1.0, 0.6, CS(0xb9bec2, 0.35, 0.5), sx * 1.45, 0.5, 9.75, cabRoot);
  cbox(1.3, 0.7, 0.5, CS(0x9aa0a6, 0.35, 0.5), sx * 1.45, 1.65, 9.8, cabRoot);
  for (let k = 0; k < 2; k++) cbox(0.5, 0.25, 0.05, CS(0x2b2f33, 0.3), sx * 1.45 + (k - 0.5) * 0.6, 1.65, 9.53, cabRoot);
}
const coffeeMaker = cbox(0.3, 0.35, 0.3, CS(0x2b2f33, 0.4), 1.6, 1.17, 9.7, cabRoot);
tappable(coffeeMaker, () => { say('Bubble bubble... fresh hot cocoa!', 2); sfx.click(); });
// rear lavatory with a door that says Occupied or Vacant
const lavZ = -9.6;
cbox(4.4, 2.3, 0.15, wallIn, 0, 1.15, lavZ - 1.2, cabRoot);
cbox(1.4, 2.3, 0.12, wallIn, -1.5, 1.15, lavZ + 0.2, cabRoot); cbox(1.4, 2.3, 0.12, wallIn, 1.5, 1.15, lavZ + 0.2, cabRoot);
const lavDoor = new THREE.Group(); lavDoor.position.set(-0.8, 0, lavZ + 0.2); cabRoot.add(lavDoor);
cbox(1.6, 2.0, 0.08, CS(0xcfd6da, 0.5), 0.8, 1.0, 0, lavDoor);
const toilet = new THREE.Group(); toilet.position.set(0, 0, lavZ - 0.5); cabRoot.add(toilet);
cbox(0.45, 0.45, 0.6, CS(0xf2f2ee, 0.3), 0, 0.22, 0, toilet); cbox(0.5, 0.06, 0.6, CS(0xf2f2ee, 0.3), 0, 0.47, 0.02, toilet); cbox(0.5, 0.6, 0.1, CS(0xf2f2ee, 0.3), 0, 0.75, -0.3, toilet);
let lavOpen = false;
tappable(lavDoor, () => { lavOpen = !lavOpen; sfx.click(); say(lavOpen ? 'The bathroom! Flush... WHOOOSH!' : 'Vacant', 1.6); if (lavOpen) play(t => noise(t + 0.3, 1.2, 600, 0.15)); });

// ---------- seats, with a number and letter on every headrest ----------
const seats = {};
for (let r = 1; r <= ROWS; r++) for (const L of LETTERS) {
  const g = new THREE.Group(); g.position.set(SEAT_X[L], 0, ROW_Z(r)); cabRoot.add(g);
  const m = r <= 2 ? seatM2 : seatM;
  cbox(0.5, 0.14, 0.5, m, 0, 0.45, 0, g); cbox(0.5, 0.75, 0.12, m, 0, 0.85, -0.24, g); cbox(0.07, 0.5, 0.06, CS(0x6f7477), 0, 0.2, 0, g);
  for (const ax of [-0.27, 0.27]) cbox(0.05, 0.08, 0.45, CS(0x3a3f45), ax, 0.65, 0, g);
  const head = textPlate(r + L, 0.36, 0.2, '#f2efe6', '#1d2a33', 70, 128, 72); head.position.set(0, 1.12, -0.17); g.add(head);
  const back = textPlate(r + L, 0.3, 0.16, '#f2efe6', '#1d2a33', 70, 128, 72); back.position.set(0, 1.12, -0.31); back.rotation.y = Math.PI; g.add(back);
  // fold-out tray table on an arm in front of the seat
  const tray = new THREE.Group(); tray.position.set(0, 0.68, 0.3); g.add(tray);
  const plate = cbox(0.42, 0.03, 0.3, CS(0x3a3f45, 0.6), 0, 0, 0.15, tray);
  const food = new THREE.Group(); food.position.set(0, 0.02, 0.15); tray.add(food); food.visible = false;
  cbox(0.3, 0.02, 0.22, CS(0xf4f4f2, 0.6), 0, 0.01, 0, food);
  cbox(0.13, 0.04, 0.09, CS(0xe0b26a), -0.06, 0.04, 0, food); cbox(0.13, 0.015, 0.09, CS(0x6aa84f), -0.06, 0.065, 0, food); cbox(0.13, 0.03, 0.09, CS(0xe0b26a), -0.06, 0.085, 0, food);
  const apple = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), CS(0xd23b3b, 0.5)); apple.position.set(0.07, 0.05, 0.05); food.add(apple);
  cbox(0.04, 0.08, 0.03, CS(0x3a8fd9, 0.5), 0.09, 0.06, -0.06, food);
  tray.rotation.x = -Math.PI / 2;                                                             // stowed upright
  seats[r + L] = { g, tray, food, taken: null, r, L };
}
// overhead bins: one over each pair of seats; the lids open up. Some hide surprises.
const bins = [];
const SURPRISES = [
  ['teddy', 'A teddy bear is taking a nap in here!'], ['kitten', 'Meow! A kitten in a travel carrier'], ['cake', 'A birthday cake! Who is having a birthday?'],
  ['jr', 'A little Skyrender Jr. toy!'], ['balloons', 'Balloons! Pop!'], ['puppy', 'Woof! A puppy in a carrier']
];
let surpriseI = 0;
for (let r = 1; r <= ROWS; r++) for (const sx of [-1, 1]) {
  const z = ROW_Z(r);
  const binG = new THREE.Group(); binG.position.set(sx * 1.8, 2.05, z - 0.05); cabRoot.add(binG);
  cbox(0.7, 0.05, 1.8, CS(0xdedad0), 0, -0.2, 0, binG); cbox(0.7, 0.05, 1.8, CS(0xcfcabd), 0, 0.2, 0, binG);
  cbox(0.05, 0.4, 1.8, CS(0xdedad0), sx * 0.35, 0, 0, binG);
  for (const zz of [-0.9, 0.9]) cbox(0.7, 0.4, 0.05, CS(0xdedad0), 0, 0, zz, binG);
  const rowTag = textPlate(String(r), 0.22, 0.16, '#1d2a33', '#f2efe6', 70, 96, 72); rowTag.position.set(-sx * 0.37, -0.12, 0.7); rowTag.rotation.y = -sx * Math.PI / 2; binG.add(rowTag);
  const lid = new THREE.Group(); lid.position.set(-sx * 0.36, 0.2, 0); binG.add(lid);
  cbox(0.05, 0.42, 1.78, CS(0xf2efe6, 0.6), 0, -0.21, 0, lid);
  const stash = new THREE.Group(); binG.add(stash);
  const surprise = (r + (sx > 0 ? 1 : 0)) % 3 === 0 ? SURPRISES[surpriseI++ % SURPRISES.length] : null;
  if (surprise) { buildSurprise(surprise[0], stash); stash.children.forEach(c => { c.position.multiplyScalar(0.7); c.scale.multiplyScalar(0.7); }); }
  const bin = { binG, lid, stash, open: 0, want: 0, surprise, sx, r };
  tappable(lid, () => { bin.want = bin.want ? 0 : 1; sfx.click(); if (bin.want && bin.surprise) { say(bin.surprise[1], 2.6); sfx.surprise(); } else if (bin.want) say('Overhead bin ' + r + (sx < 0 ? 'A-B' : 'C-D') + (bin.stash.children.length ? '' : ' is empty'), 1.4); });
  bins.push(bin);
}
function buildSurprise(kind, g) {
  if (kind === 'teddy') { const b = CS(0x9a6a3a, 1); const body = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), b); body.position.y = -0.1; g.add(body); const h = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), b); h.position.set(0, 0.08, 0.04); g.add(h); for (const x of [-0.07, 0.07]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), b); e.position.set(x, 0.16, 0.03); g.add(e); } }
  else if (kind === 'kitten' || kind === 'puppy') { cbox(0.5, 0.32, 0.4, CS(0x6b8fb0, 0.6), 0, -0.07, 0, g); const f = CS(kind === 'kitten' ? 0xe08a3a : 0xf2efe6, 1); const h = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), f); h.position.set(-0.27, -0.02, 0); g.add(h); for (const z of [-0.05, 0.05]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 6), f); e.position.set(-0.27, 0.09, z); g.add(e); } }
  else if (kind === 'cake') { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.16, 16), CS(0xf2b8c6, 0.6)); c.position.y = -0.14; g.add(c); for (let k = 0; k < 5; k++) { const cd = cbox(0.02, 0.08, 0.02, CS(0x3a8fd9), Math.cos(k * 1.26) * 0.1, -0.02, Math.sin(k * 1.26) * 0.1, g); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffc040 })); fl.position.set(cd.position.x, 0.03, cd.position.z); g.add(fl); } }
  else if (kind === 'jr') { cbox(0.08, 0.08, 0.4, CS(0xf4f3ef), 0, -0.15, 0, g); cbox(0.45, 0.02, 0.1, CS(0xf4f3ef), 0, -0.15, 0.03, g); cbox(0.02, 0.12, 0.08, CS(0x7a2430), 0, -0.08, -0.17, g); }
  else if (kind === 'balloons') { [0xd94a5a, 0xf2c94c, 0x3a8fd9].forEach((c, i) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), CS(c, 0.4)); b.position.set((i - 1) * 0.2, 0.0 + (i % 2) * 0.05, 0); b.scale.y = 1.2; g.add(b); }); }
}

// ---------- the cockpit: two pilots and LOTS of buttons ----------
const ck = new THREE.Group(); cabRoot.add(ck);
cbox(4.2, 0.2, 3.4, CS(0x3a3f45, 1), 0, -0.1, 11.9, ck);
for (const sx of [-1, 1]) { const w = cbox(0.14, 2.3, 3.4, wallIn, sx * 1.8, 1.15, 11.9, ck); w.rotation.y = sx * 0.28; const s = cbox(0.06, 2.3, 3.4, skinOut, sx * 1.92, 1.15, 11.9, ck); s.rotation.y = sx * 0.28; }
const ckCeil = cbox(3.4, 0.12, 2.6, CS(0x2b2f33, 0.6), 0, 2.45, 12.0, ck);                                    // cockpit ceiling with the overhead panel
const noseLow = cbox(2.8, 0.9, 0.6, skinOut, 0, 0.45, 13.5, ck);
// windshield: four panes in a frame, plus wipers
const wsGlass = new THREE.MeshStandardMaterial({ color: 0xbfd9e8, transparent: true, opacity: 0.12, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
const wipers = [];
[-1.05, -0.35, 0.35, 1.05].forEach((x, i) => {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.85), wsGlass); p.position.set(x, 1.85, 13.55); p.rotation.set(-0.35, x > 0 ? -0.12 * (i - 1.5) : -0.12 * (i - 1.5), 0); ck.add(p);
  if (i === 1 || i === 2) { const wp = new THREE.Group(); wp.position.set(x, 1.45, 13.42); ck.add(wp); cbox(0.03, 0.7, 0.03, CS(0x1d1d1d), 0, 0.35, 0, wp); wp.rotation.x = -0.35; wipers.push(wp); }
});
for (const x of [-1.4, -0.7, 0, 0.7, 1.4]) { const f = cbox(0.08, 0.95, 0.08, CS(0x2b2f33), x, 1.85, 13.55, ck); f.rotation.x = -0.35; }
cbox(3, 0.1, 0.1, CS(0x2b2f33), 0, 2.32, 13.4, ck); cbox(3, 0.1, 0.1, CS(0x2b2f33), 0, 1.42, 13.72, ck);
// instrument panel facing the pilots
const panel = new THREE.Group(); panel.position.set(0, 1.12, 12.95); panel.rotation.x = -0.45; ck.add(panel);
cbox(2.9, 0.6, 0.12, CS(0x30353b, 0.6), 0, 0, 0, panel);
cbox(2.9, 0.1, 0.35, CS(0x22262a, 0.8), 0, 0.33, 0.1, panel);                                  // glareshield
// screens drawn live on canvases: horizon, map, engines, radar
const screen = (x, y, draw) => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: t })); m.position.set(x, y, -0.065); m.rotation.y = Math.PI; panel.add(m);
  const s = { c, g: c.getContext('2d'), t, draw, mode: 0 }; screens.push(s); return s;
};
const screens = [];
const drawHorizon = (g, s) => { const p = cabRoot.rotation.x * 200, roll = cab.shake * Math.sin(S.clockT * 20) * 0.3; g.save(); g.translate(64, 64); g.rotate(roll); g.fillStyle = '#3a7bd5'; g.fillRect(-100, -100, 200, 100 + p); g.fillStyle = '#8a5a2a'; g.fillRect(-100, p, 200, 100); g.strokeStyle = '#fff'; g.lineWidth = 2; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(-14, p + k * 14); g.lineTo(14, p + k * 14); g.stroke(); } g.restore(); g.strokeStyle = '#f2c94c'; g.lineWidth = 4; g.beginPath(); g.moveTo(30, 64); g.lineTo(56, 64); g.lineTo(64, 72); g.lineTo(72, 64); g.lineTo(98, 64); g.stroke(); };
const drawMap = (g, s) => { g.fillStyle = '#0d1b24'; g.fillRect(0, 0, 128, 128); if (s.mode) { g.strokeStyle = '#2f8a4a'; for (let r = 20; r < 70; r += 16) { g.beginPath(); g.arc(64, 110, r, Math.PI, 0); g.stroke(); } g.fillStyle = '#4cd84c'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(30 + ((k * 37 + S.clockT * 6) % 70), 50 + (k * 13) % 50, 4 + k % 3, 0, 7); g.fill(); } g.fillStyle = '#f2c94c'; g.fillText('RADAR', 46, 14); return; } g.strokeStyle = '#3aa0ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(20, 110); g.quadraticCurveTo(60, 20, 110, 18); g.stroke(); const u = Math.min(1, cab.flightT / 60); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(20 + 90 * u, 110 - 92 * Math.sin(u * 1.57), 6, 0, 7); g.fill(); g.fillStyle = '#f2c94c'; g.font = '700 12px Arial'; g.fillText('JASPER JCT', 4, 124); g.fillText('SPACEPORT', 70, 12); };
const drawEngines = (g) => { g.fillStyle = '#111'; g.fillRect(0, 0, 128, 128); for (const [cx, k] of [[34, 0], [94, 1]]) { g.strokeStyle = '#555'; g.lineWidth = 6; g.beginPath(); g.arc(cx, 54, 24, Math.PI * 0.75, Math.PI * 2.25); g.stroke(); const v = 0.15 + cab.speed / 60 + Math.sin(S.clockT * 3 + k) * 0.02; g.strokeStyle = '#4cd84c'; g.beginPath(); g.arc(cx, 54, 24, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * Math.min(1, v)); g.stroke(); } g.fillStyle = '#f2f2ee'; g.font = '700 13px Arial'; g.fillText('ALT ' + Math.round(cab.alt * 100), 14, 104); g.fillText('SPD ' + Math.round(cab.speed * 6), 14, 120); };
const drawFuel = (g) => { g.fillStyle = '#111'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#f2f2ee'; g.font = '700 14px Arial'; g.fillText('FUEL', 46, 18); const f = 0.92 - cab.flightT * 0.002; g.fillStyle = '#3aa0ff'; g.fillRect(20, 110 - 80 * f, 36, 80 * f); g.fillRect(72, 110 - 80 * f, 36, 80 * f); g.strokeStyle = '#888'; g.strokeRect(20, 30, 36, 80); g.strokeRect(72, 30, 36, 80); };
screen(1.05, 0.02, drawHorizon); screen(0.55, 0.02, drawEngines); const mapScreen = screen(-0.55, 0.02, drawMap); screen(-1.05, 0.02, drawHorizon); screen(0, 0.02, drawFuel);
// pilots in their seats
const pilotSeat = (x) => { const g = new THREE.Group(); g.position.set(x, 0, 11.75); ck.add(g); cbox(0.6, 0.16, 0.6, CS(0x3a3f45), 0, 0.45, 0, g); cbox(0.6, 0.5, 0.14, CS(0x3a3f45), 0, 0.78, -0.3, g); return g; };
pilotSeat(-0.6); pilotSeat(0.6);
const sitPose = p => { p.userData.legs[0].rotation.x = p.userData.legs[1].rotation.x = -1.45; };
const mkPilot = (captain, skin) => {
  const p = makePerson({ shirt: 0xf4f4f2, pants: 0x1b2a4a, hat: true, skin, hair: captain ? 0x8a8a8a : 0x2d2a26 });
  for (const sx of [-1, 1]) for (let k = 0; k < (captain ? 4 : 3); k++) cbox(0.12, 0.012, 0.025, CS(0xd8b04a, 0.3, 0.6), sx * 0.16, 0.975, -0.05 + k * 0.03, p);
  sitPose(p); return p;
};
const captain = mkPilot(true, 0xd9a47a), firstOfficer = mkPilot(false, 0x8c5a3c);
captain.position.set(-0.6, 0.02, 11.72); firstOfficer.position.set(0.6, 0.02, 11.72); ck.add(captain, firstOfficer);
tappable(captain, () => { say(['Hi Jasper! I am Captain Sky.', 'The captain gives you a thumbs up!', 'Captain: Welcome aboard Skyrender Flight 1!'][Math.floor(Math.random() * 3)], 2.2); reach(captain, 1.0); });
tappable(firstOfficer, () => { say(['Hi! I am the co-pilot. I help fly the plane.', 'The co-pilot waves hello!', 'Co-pilot: All systems go!'][Math.floor(Math.random() * 3)], 2.2); reach(firstOfficer, 1.0); });
const reaches = [];
function reach(p, secs = 0.7) { reaches.push({ p, until: S.clockT + secs }); }
// control yokes in front of each pilot
const yokes = [-0.6, 0.6].map(x => { const y = new THREE.Group(); y.position.set(x, 0.95, 12.35); ck.add(y); cbox(0.06, 0.06, 0.4, CS(0x1d1d1d), 0, 0, -0.2, y); cbox(0.36, 0.06, 0.06, CS(0x1d1d1d), 0, 0.05, 0, y); for (const sx of [-1, 1]) cbox(0.06, 0.16, 0.06, CS(0x1d1d1d), sx * 0.18, 0.1, 0, y); return y; });
// center pedestal with the throttle levers
const ped = new THREE.Group(); ped.position.set(0, 0, 12.2); ck.add(ped);
cbox(0.5, 0.85, 1.0, CS(0x30353b, 0.6), 0, 0.42, 0, ped);
const throttles = [-0.1, 0.1].map(x => { const t = new THREE.Group(); t.position.set(x, 0.86, 0.1); ped.add(t); cbox(0.05, 0.28, 0.05, CS(0x9aa0a6, 0.3, 0.5), 0, 0.14, 0, t); cbox(0.1, 0.06, 0.12, CS(0x1d1d1d), 0, 0.28, 0, t); return t; });
const throttleHit = cbox(0.4, 0.45, 0.4, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), 0, 1.05, 12.3, ck);

// ---------- every cockpit button: named ones do big things, little ones hold surprises ----------
const BTN_COLORS = [0xd94a5a, 0xf2c94c, 0x4cb84c, 0x3a8fd9, 0xf2f2ee, 0xe07f3a, 0xa64ac9];
const ckButtons = [];
const addButton = (parent, x, y, z, color, label, action, w = 0.07, big = false) => {
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.15, roughness: 0.4 });
  const b = cbox(w, w * (big ? 0.7 : 1), 0.04, mat, x, y, z, parent);
  if (label) { const t = textPlate(label, Math.max(w * 1.6, label.length * 0.024), 0.035, '#30353b', '#f2f2ee', 40, Math.max(128, label.length * 28), 48); t.position.set(x, y - w * 0.5 - 0.03, z - 0.003); t.rotation.y = Math.PI; parent.add(t); }
  const btn = { b, mat, lit: 0, action };
  tappable(b, () => { btn.lit = 1; reach(x < 0 ? captain : firstOfficer); action(btn); });
  ckButtons.push(btn); return btn;
};
const beep = (f = 900) => play(t => tone(f, t, 0.08, 'square', 0.05));
const NAMED = [
  ['TAKE OFF', 0x4cb84c, () => startFlight()], ['LAND', 0xd94a5a, () => landFlight()], ['SEATBELT', 0xf2c94c, () => setSeatbelt(!cab.seatbelt)],
  ['WIPERS', 0x3a8fd9, () => { cab.wipers = 5; say('Swish swish! Windshield wipers', 1.8); }], ['LIGHTS', 0xf2f2ee, () => { cab.lights = !cab.lights; say(cab.lights ? 'Landing lights on' : 'Landing lights off', 1.6); }],
  ['PA', 0xe07f3a, () => announce()], ['RADIO', 0xa64ac9, () => radio()], ['AUTOPILOT', 0x4cb84c, () => { cab.autopilot = !cab.autopilot; say(cab.autopilot ? 'Autopilot on. The plane flies itself!' : 'Autopilot off. The pilots steer again', 2); }],
  ['BUMPY', 0xe07f3a, () => { cab.shake = 3; say('Bumpy air! Hold on to your juice!', 2); sfx.rumbleHit(); }], ['CLOUDS', 0xf2f2ee, () => setClouds(!cab.clouds)],
  ['RAINBOW', 0xd94a5a, () => { cab.rainbowOn = !cab.rainbowOn; say(cab.rainbowOn ? 'Look! A rainbow outside!' : 'Rainbow fades away', 2); }], ['NIGHT', 0x3a3f8a, () => setNight(!cab.night)],
  ['COFFEE', 0x8a5a2a, () => { cab.coffee = true; say('The flight attendant brings the pilots hot coffee', 2.2); }], ['CALL', 0xf2c94c, () => { sfx.ding(); say('Ding! A flight attendant is on the way', 1.8); }],
  ['PLANE!', 0x3a8fd9, () => { flyJetT = 0; flyJetX = 9 + Math.random() * 6; say('Another plane flies by! Wave!', 2); }], ['PARTY', 0xa64ac9, () => { cab.party = 5; say('Party lights in the cabin!', 2); sfx.surprise(); }],
  ['MAP', 0x4cb84c, () => { mapScreen.mode = 1 - mapScreen.mode; say(mapScreen.mode ? 'Weather radar' : 'Flight map', 1.4); }], ['FOOD', 0xe07f3a, () => serveFood()]
];
NAMED.forEach(([label, color, fn], i) => { const col = i % 9, row = Math.floor(i / 9); addButton(panel, -1.32 + col * 0.33, -0.17 - row * 0.1, -0.065, color, label, () => { beep(1100); fn(); }, 0.075, true); });
const SILLY = ['Beep boop!', 'The captain sneezes. ACHOO!', 'The co-pilot does a thumbs up', 'Ding dong!', 'Wiggle the wings!', 'A tiny song plays on the radio', 'Engines purr like kittens', 'Cookies for the pilots!', 'The co-pilot laughs', 'Boing!', 'Click clack!', 'Whoosh!', 'Blinky lights!', 'Buzz buzz!', 'Zoom zoom!'];
for (let row = 0; row < 3; row++) for (let col = 0; col < 14; col++) {
  const color = BTN_COLORS[(row * 5 + col * 3) % BTN_COLORS.length];
  addButton(panel, -1.32 + col * 0.2, 0.25 - row * 0.065, -0.065, color, null, () => {
    beep(400 + Math.random() * 900);
    if (Math.random() < 0.45) { const s = SILLY[Math.floor(Math.random() * SILLY.length)]; say(s, 1.6); if (s.startsWith('Wiggle')) cab.shake = 1.2; if (s.startsWith('A tiny song')) play(t => [523, 659, 784, 659, 523].forEach((f, k) => tone(f, t + k * 0.18, 0.16, 'triangle', 0.05))); }
  }, 0.045);
}
// overhead panel full of switches
const over = new THREE.Group(); over.position.set(0, 2.36, 12.2); over.rotation.x = Math.PI / 2 - 0.25; ck.add(over);
cbox(1.6, 1.1, 0.06, CS(0x30353b, 0.6), 0, 0, 0, over);
for (let row = 0; row < 5; row++) for (let col = 0; col < 8; col++) addButton(over, -0.66 + col * 0.19, -0.4 + row * 0.2, -0.04, BTN_COLORS[(row + col * 2) % 7], null, (b) => { beep(300 + row * 150 + col * 40); if (Math.random() < 0.3) say(SILLY[Math.floor(Math.random() * SILLY.length)], 1.5); }, 0.06);
tappable(throttleHit, () => { reach(captain); cab.flight === 'gate' || cab.flight === 'landed' ? startFlight() : cab.flight === 'cruise' ? landFlight() : null; });
const coffeeCups = [-0.85, 0.85].map(x => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 10), CS(0xf2f2ee, 0.4)); c.position.set(x, 1.38, 12.75); c.visible = false; ck.add(c); return c; });
const lightBeams = new THREE.Group(); cabRoot.add(lightBeams);
for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.ConeGeometry(3, 40, 20, 1, true).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide })); b.position.set(sx * 1.5, 0.2, 34); lightBeams.add(b); }
lightBeams.visible = false;
// seatbelt signs over the aisle
const beltSigns = [];
for (let r = 1; r <= ROWS; r += 2) { const s = textPlate('FASTEN SEATBELTS', 0.9, 0.16, '#30353b', '#555b60', 30, 384, 64); s.position.set(0, 2.35, ROW_Z(r) + 0.6); s.rotation.y = Math.PI; cabRoot.add(s); beltSigns.push(s); }

// ---------- flight attendants and the food cart ----------
const attendant = (shirt, skin, hair) => {
  const p = makePerson({ shirt, pants: shirt, skin, hair });
  const scarf = cbox(0.3, 0.08, 0.22, CS(0xd94a5a, 0.6), 0, 0.96, 0.02, p);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 14), CS(0x7a2430, 0.6)); hat.position.set(0, 1.22, -0.02); p.add(hat);
  return p;
};
const fa1 = attendant(0x1b2a4a, 0xf0c8a0, 0xc9a24a), fa2 = attendant(0x1b2a4a, 0x6b4630, 0x1d1b19);
fa1.position.set(-0.45, 0.02, 9.68); fa2.position.set(0.45, 0.02, 9.68); fa1.rotation.y = fa2.rotation.y = Math.PI; cabRoot.add(fa1, fa2);
let demoT = -1;
tappable(fa1, () => { say('Hello! Pick a traveler and choose their seat. Press Serve food when everyone is hungry!', 3); reach(fa1, 1.2); });
tappable(fa2, () => { demoT = 0; say('Safety demo: the exits are here, here and in the back!', 3); });
const cart = new THREE.Group(); cart.position.set(0, 0, 9.15); cart.visible = false; cabRoot.add(cart);
cbox(0.45, 0.9, 0.75, CS(0xc4c9cd, 0.3, 0.6), 0, 0.5, 0, cart);
for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10).rotateZ(Math.PI / 2), CS(0x1d1d1d)); w.position.set(sx * 0.17, 0.05, sz * 0.3); cart.add(w); }
cbox(0.3, 0.05, 0.22, CS(0xf4f4f2), 0, 0.98, 0.15, cart); cbox(0.05, 0.12, 0.05, CS(0x3a8fd9), 0.1, 1.04, -0.15, cart);
tappable(cart, () => serveFood());

// ---------- travelers: they walk on board, Jasper taps one and picks their seat ----------
const travelers = [];
const TRAVELER_LOOKS = [
  [0x3f6e9a, 0x2d3440, 0xd9a47a, 0x2d2a26, 0xd94a5a, 'Grandma Rose'], [0xd9a93a, 0x5b4636, 0x8c5a3c, 0x1d1b19, 0x2f8a6a, 'Mr. Tom'], [0x6b8f5a, 0x3a3f47, 0xf0c8a0, 0xc9a24a, 0xf2c94c, 'Lily'],
  [0xa64a6a, 0x2d3440, 0x6b4630, 0x1d1b19, 0x3f6e9a, 'Dr. Maya'], [0x5a5f9a, 0x5b4636, 0xd9a47a, 0x8a5a2a, 0xa64ac9, 'Sam'], [0xe07f3a, 0x2d3440, 0xf0c8a0, 0x2d2a26, 0x1d1d1d, 'Coach Ben'],
  [0x2f8a6a, 0x3a3f47, 0x8c5a3c, 0x2d2a26, 0xe07f3a, 'Aunt June'], [0xd94a5a, 0x2d3440, 0xd9a47a, 0xc9a24a, 0x6b4f35, 'Leo']
];
const QUEUE = i => new THREE.Vector3(-1.68 + i * 0.48, 0.02, 8.45 - (i % 2) * 0.3);
TRAVELER_LOOKS.forEach(([shirt, pants, skin, hair, bagC, name], i) => {
  const p = makePerson({ shirt, pants, skin, hair });
  const bag = makeSuitcase(bagC); bag.position.set(0.32, 0, -0.5); bag.rotation.x = -0.3; p.add(bag);
  const T = { p, bag, bagC, name, shirt, state: 'queue', seat: null, path: null, t: 0, wave: 0, id: i };
  p.position.copy(QUEUE(i)); p.rotation.y = Math.PI; p.visible = false;
  cabRoot.add(p); travelers.push(T);
  tappable(p, () => tapTraveler(T));
});
function tapTraveler(T) {
  if (T.state === 'queue') openSeatPicker(T);
  else if (T.state === 'seated') { T.wave = 1.5; say(T.name + ': ' + ['I love Skyrender!', 'Are we there yet?', 'Look out the window!', 'Thank you for my seat!', 'Yum, I hope there are cookies!', 'Wheee!'][Math.floor(Math.random() * 6)], 2.2); }
}
// seat picker card (HTML), built once
const picker = document.createElement('div'); picker.id = 'seatPick'; picker.setAttribute('role', 'dialog'); picker.setAttribute('aria-label', 'Choose a seat'); picker.hidden = true;
document.body.appendChild(picker);
let pickFor = null;
function openSeatPicker(T) {
  pickFor = T; picker.hidden = false; picker.textContent = '';
  const h = document.createElement('p'); h.className = 'pick-title'; h.innerHTML = '';
  const sw = document.createElement('span'); sw.className = 'pick-swatch'; sw.style.background = '#' + T.shirt.toString(16).padStart(6, '0'); h.appendChild(sw);
  h.appendChild(document.createTextNode('Pick a seat for ' + T.name)); picker.appendChild(h);
  const grid = document.createElement('div'); grid.className = 'pick-grid';
  ['', 'A', 'B', '', 'C', 'D'].forEach(t => { const c = document.createElement('span'); c.className = 'pick-head'; c.textContent = t; grid.appendChild(c); });
  for (let r = 1; r <= ROWS; r++) {
    const rn = document.createElement('span'); rn.className = 'pick-row'; rn.textContent = r; grid.appendChild(rn);
    ['A', 'B', null, 'C', 'D'].forEach(L => {
      if (!L) { const a = document.createElement('span'); a.className = 'pick-aisle'; grid.appendChild(a); return; }
      const s = seats[r + L], b = document.createElement('button'); b.type = 'button'; b.textContent = r + L;
      if (s.taken) { b.disabled = true; b.title = 'Taken by ' + s.taken.name; }
      b.addEventListener('click', () => { closePicker(); sendToSeat(T, r + L); });
      grid.appendChild(b);
    });
  }
  picker.appendChild(grid);
  const row = document.createElement('div'); row.className = 'pick-actions';
  const rnd = document.createElement('button'); rnd.type = 'button'; rnd.textContent = 'Surprise me';
  rnd.addEventListener('click', () => { const free = Object.keys(seats).filter(k => !seats[k].taken); if (free.length) { closePicker(); sendToSeat(T, free[Math.floor(Math.random() * free.length)]); } });
  const x = document.createElement('button'); x.type = 'button'; x.textContent = 'Close'; x.addEventListener('click', closePicker);
  row.append(rnd, x); picker.appendChild(row);
  say('Where should ' + T.name + ' sit?', 2);
}
function closePicker() { picker.hidden = true; pickFor = null; }
function sendToSeat(T, key) {
  const s = seats[key]; s.taken = T; T.seat = key; T.state = 'walking';
  const bin = bins.find(b => b.r === s.r && (b.sx < 0) === (s.L === 'A' || s.L === 'B'));
  const z = ROW_Z(s.r), start = T.p.position.clone();
  T.path = [start, new THREE.Vector3(0, 0.02, start.z), new THREE.Vector3(0, 0.02, z + 0.45), new THREE.Vector3(SEAT_X[s.L] * 0.5, 0.02, z + 0.45)];
  T.bin = bin; T.t = 0; T.leg = 0;
  say(T.name + ' heads to seat ' + key, 1.8); sfx.click();
}
function moveTravelers(dt) {
  for (const T of travelers) {
    const p = T.p;
    if (T.state === 'walking') {
      const a = T.path[T.leg], b = T.path[T.leg + 1], d = a.distanceTo(b) || 0.01;
      T.t += dt * 1.5 / d;
      const k = Math.min(1, T.t); p.position.lerpVectors(a, b, k);
      if (d > 0.02) p.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      walkPose(p, S.clockT * 9, 1);
      if (T.t >= 1) { T.leg++; T.t = 0; if (T.leg >= T.path.length - 1) { T.state = 'stowing'; T.t = 0; T.bin.want = 1; } }
    } else if (T.state === 'stowing') {                       // lift the suitcase up into the overhead bin
      T.t += dt;
      walkPose(p, 0, 0); p.rotation.y = T.bin.sx < 0 ? -Math.PI / 2 : Math.PI / 2;
      p.userData.arms[0].rotation.x = p.userData.arms[1].rotation.x = -2.6 * Math.min(1, T.t * 1.5);
      const k = Math.min(1, T.t / 1.1);
      if (k < 1) { T.bag.position.set(0.32 * (1 - k), 0.0 + 1.6 * k, -0.5 + 0.5 * k); T.bag.rotation.x = -0.3 * (1 - k); }
      else if (T.bag.parent === p) {                           // the suitcase settles inside the bin
        p.remove(T.bag); T.bin.stash.add(T.bag); T.bag.position.set(0, -0.22, -0.7 + (T.bin.stash.children.length % 4) * 0.42); T.bag.rotation.set(0, 0, Math.PI / 2); T.bag.scale.setScalar(0.6);
      }
      if (T.t > 1.6) { T.bin.want = 0; T.state = 'sitting'; T.t = 0; }
    } else if (T.state === 'sitting') {
      T.t += dt * 2; const s = seats[T.seat], k = Math.min(1, T.t);
      p.userData.arms[0].rotation.x = p.userData.arms[1].rotation.x = 0;
      p.position.set(THREE.MathUtils.lerp(SEAT_X[s.L] * 0.5, SEAT_X[s.L], k), 0.02, THREE.MathUtils.lerp(ROW_Z(s.r) + 0.45, ROW_Z(s.r) + 0.02, k));
      p.rotation.y = THREE.MathUtils.lerp(p.rotation.y, 0, k);
      p.userData.legs[0].rotation.x = p.userData.legs[1].rotation.x = -1.45 * k;
      if (k >= 1) { T.state = 'seated'; say(T.name + ' is in seat ' + T.seat + (cab.seatbelt ? ', seatbelt on!' : '!'), 1.8); sfx.ding(); if (travelers.every(t => t.state === 'seated' || !t.p.visible)) say('Everybody is in their seat! Ready for takeoff. Try the cockpit!', 3); }
    } else if (T.state === 'seated') {
      p.rotation.y = 0; p.userData.legs[0].rotation.x = p.userData.legs[1].rotation.x = -1.45;
      T.wave = Math.max(0, T.wave - dt);
      p.userData.arms[1].rotation.x = T.wave > 0 ? -2.6 + Math.sin(S.clockT * 12) * 0.3 : (cab.served ? -0.9 : 0);
      p.userData.arms[0].rotation.x = cab.served ? -0.9 + Math.sin(S.clockT * 4 + T.id) * 0.2 : 0;
      p.position.y = 0.02 + (cab.shake > 0 ? Math.abs(Math.sin(S.clockT * 18 + T.id)) * 0.06 * Math.min(1, cab.shake) : 0);
    } else if (T.state === 'queue') {
      walkPose(p, 0, 0); p.userData.arms[1].rotation.x = 0.3;
      p.position.y = 0.02 + Math.abs(Math.sin(S.clockT * 2 + T.id)) * 0.02;
    }
  }
}

// ---------- food, seatbelts, clouds, night ----------
function serveFood() {
  if (cab.foodT >= 0) return;
  if (cab.served) { cab.served = false; for (const k in seats) seats[k].food.visible = false; say('Trays cleaned up and tables folded away', 1.8); return; }
  cab.foodT = 0; say('Snack time! The flight attendants bring sandwiches, apples and juice', 2.6); sfx.ding();
}
function setSeatbelt(v) { cab.seatbelt = v; sfx.ding(); say(v ? 'Ding! Fasten your seatbelts' : 'Ding! You may walk around the cabin', 1.8);
  for (const s of beltSigns) { s.material.map.image.getContext('2d'); s.material.color.setHex(v ? 0xffe9a0 : 0xffffff); s.material.emissive = new THREE.Color(v ? 0xffb020 : 0x000000); s.material.emissiveIntensity = v ? 0.9 : 0; } }
function setClouds(v) { cab.clouds = v; say(v ? 'Clouds on' : 'Clouds off. Clear blue sky!', 1.6); updateCabUI(); }
function setNight(v) { cab.night = v; say(v ? 'Night flight. Look at the stars!' : 'Good morning! Daytime again', 2); updateCabUI(); }
function announce() {
  const lines = ['This is your captain speaking. Welcome aboard Skyrender Flight 1!', 'Captain here: we will fly over Jasper\'s Farm today. Wave to the cows!', 'Captain here: please keep your seatbelts on and enjoy your snack!', 'Captain here: look out the left window. That is Jasper Junction!'];
  say(lines[Math.floor(Math.random() * lines.length)], 3.4); play(t => { tone(660, t, 0.3, 'sine', 0.06); tone(880, t + 0.3, 0.4, 'sine', 0.06); });
}
function radio() {
  const lines = cab.flight === 'gate' ? ['Tower: Skyrender 1, you are cleared to taxi.', 'Tower: Skyrender 1, cleared for takeoff on runway 5!'] : ['Tower: Skyrender 1, climb and maintain cruising altitude.', 'Tower: Skyrender 1, traffic at three o\'clock. Another plane!', 'Tower: Skyrender 1, cleared to land. Welcome home!'];
  say(lines[Math.floor(Math.random() * lines.length)], 3); play(t => { noise(t, 0.25, 2000, 0.06); noise(t + 1.8, 0.2, 2000, 0.05); });
}
// takeoff and landing
function startFlight() {
  if (cab.flight !== 'gate' && cab.flight !== 'landed') return;
  cab.flight = 'taxi'; cab.flightT = 0; if (!cab.seatbelt) setSeatbelt(true);
  say('Pushing back and taxiing to the runway', 2.2); updateCabUI();
}
function landFlight() {
  if (cab.flight !== 'cruise' && cab.flight !== 'climb') return;
  cab.flight = 'descend'; cab.flightT = 0; say('Starting our descent. Coming in to land!', 2.2); updateCabUI();
}
let cabRollZ = 0;
function runFlight(dt) {
  cab.flightT += dt;
  const f = cab.flight, t = cab.flightT;
  let wantSpeed = 0, wantAlt = cab.alt, wantPitch = 0;
  if (f === 'gate' || f === 'landed') { wantSpeed = 0; wantAlt = 0; }
  else if (f === 'taxi') { wantSpeed = 3; if (t > 4) { cab.flight = 'roll'; cab.flightT = 0; say('Full power! Rolling down the runway', 2); } }
  else if (f === 'roll') { wantSpeed = 38; if (t > 4) { cab.flight = 'climb'; cab.flightT = 0; say('Liftoff! We are flying!', 2); sfx.surprise(); } }
  else if (f === 'climb') { wantSpeed = 45; wantAlt = 4; wantPitch = -0.1; if (t > 9) { cab.flight = 'cruise'; cab.flightT = 0; say('Cruising high above the clouds. Time for snacks?', 2.5); updateCabUI(); } }
  else if (f === 'cruise') { wantSpeed = 50; wantAlt = 4; }
  else if (f === 'descend') { wantSpeed = 34; wantAlt = 0; wantPitch = 0.05; if (cab.alt < 0.03) { cab.flight = 'landed'; cab.flightT = 0; say('Touchdown! Welcome to Jasper Junction. Thanks for flying Skyrender!', 3); sfx.ding(); updateCabUI(); } }
  cab.speed += (wantSpeed - cab.speed) * Math.min(1, dt * 0.4);
  cab.alt += (wantAlt - cab.alt) * Math.min(1, dt * (f === 'descend' ? 0.35 : 0.25));
  cabRoot.rotation.x += (wantPitch - cabRoot.rotation.x) * Math.min(1, dt * 1.2);
  cWorld.position.z = ((cWorld.position.z - cab.speed * dt) % 1200);                          // the ground slides past
  cWorld.position.y = -cab.alt * 120;
  bridge.scale.x = Math.max(0.05, 1 - Math.min(1, (f === 'gate' ? 0 : 1)) * 0.95);
  // clouds: up in the sky at the gate, all around once we are flying
  cloudGrp.visible = cab.clouds;
  cloudGrp.position.y = 140 - cab.alt * 36;
  for (const c of cloudGrp.children) { c.position.z -= cab.speed * dt * 0.9; if (c.position.z < -450) c.position.z += 900; }
  taxiJet.position.z = ((S.clockT * 6) % 300) - 150;
  // other planes fly by now and then once we are up high
  if (f === 'cruise' && flyJetT < 0 && Math.random() < dt / 14) { flyJetT = 0; flyJetX = (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 20); }
  if (flyJetT >= 0) { flyJetT += dt; flyJet.visible = true; flyJet.position.set(flyJetX, 2 + Math.sin(flyJetT) * 2, 260 - flyJetT * 70); if (flyJetT > 8) { flyJetT = -1; flyJet.visible = false; } }
  // shakes and wiggles
  cab.shake = Math.max(0, cab.shake - dt);
  cabRoot.position.y = cab.shake > 0 ? Math.sin(S.clockT * 23) * 0.04 * Math.min(1, cab.shake) : 0;
  cabRollZ += ((cab.shake > 0 ? Math.sin(S.clockT * 7) * 0.04 : 0) - cabRollZ) * Math.min(1, dt * 5); cabRoot.rotation.z = cabRollZ;
  cab.engine = Math.min(1, cab.speed / 45);
}

// ---------- views and controls ----------
let cTheta = 1.15, cPhi = 0.58, cRad = 28, cLookYaw = 0, cLookPitch = 0;
const cTarget = new THREE.Vector3(0, 0.6, 0.6), cTargetWant = new THREE.Vector3(0, 0.6, 0.6);
function setView(v) {
  cab.view = v; updateCabUI();
  if (v === 'cockpit') { say('In the cockpit! Tap any button. Lots of them do something', 2.6); ckDoorOpen = 1; }
  else say('Back in the cabin', 1.4);
}
let ckDoorOpen = 0;
function updateCabUI() {
  const ui = document.getElementById('cabinUI'); if (!ui) return;
  ui.querySelector('[data-c=cabin]').setAttribute('aria-pressed', String(cab.view === 'cabin'));
  ui.querySelector('[data-c=cockpit]').setAttribute('aria-pressed', String(cab.view === 'cockpit'));
  ui.querySelector('[data-c=fly]').textContent = cab.flight === 'cruise' || cab.flight === 'climb' ? 'Land' : 'Take off';
  ui.querySelector('[data-c=clouds]').setAttribute('aria-pressed', String(cab.clouds));
  ui.querySelector('[data-c=night]').setAttribute('aria-pressed', String(cab.night));
}
const cabinUI = document.createElement('div'); cabinUI.id = 'cabinUI'; cabinUI.setAttribute('role', 'group'); cabinUI.setAttribute('aria-label', 'Inside the plane'); cabinUI.hidden = true;
[['cabin', 'Cabin'], ['cockpit', 'Cockpit'], ['fly', 'Take off'], ['food', 'Serve food'], ['belt', 'Seatbelt sign'], ['clouds', 'Clouds'], ['night', 'Night flight'], ['exit', 'Get off the plane']].forEach(([k, label]) => {
  const b = document.createElement('button'); b.type = 'button'; b.dataset.c = k; b.textContent = label;
  if (['cabin', 'cockpit', 'clouds', 'night'].includes(k)) b.setAttribute('aria-pressed', 'false');
  b.addEventListener('click', () => {
    if (k === 'cabin' || k === 'cockpit') setView(k);
    if (k === 'fly') (cab.flight === 'cruise' || cab.flight === 'climb') ? landFlight() : startFlight();
    if (k === 'food') serveFood();
    if (k === 'belt') setSeatbelt(!cab.seatbelt);
    if (k === 'clouds') setClouds(!cab.clouds);
    if (k === 'night') setNight(!cab.night);
    if (k === 'exit') exitCabin();
  });
  cabinUI.appendChild(b);
});
document.body.appendChild(cabinUI);
const fade = document.createElement('div'); fade.id = 'cabFade'; document.body.appendChild(fade);

// ---------- boarding: the nose tucks up, stairs roll up, travelers climb aboard ----------
const boardSet = new THREE.Group(); scene.add(boardSet); boardSet.visible = false;
const stairs = new THREE.Group(); boardSet.add(stairs);
{
  const steel = CS(0xc4c9cd, 0.4, 0.4), tread = CS(0x5c6266, 0.8);
  for (let i = 0; i < 9; i++) cbox(1.0, 0.08, 0.36, tread, 0, 0.16 + i * 0.16, 2.9 - i * 0.32, stairs);
  for (const sx of [-1, 1]) { const rail = cbox(0.05, 0.05, 3.4, steel, sx * 0.5, 1.4, 1.6, stairs); rail.rotation.x = 0.46; for (let k = 0; k < 4; k++) cbox(0.04, 0.8, 0.04, steel, sx * 0.5, 0.6 + k * 0.38, 2.9 - k * 0.8, stairs); }
  cbox(1.4, 0.5, 2.0, CS(0xf2c94c, 0.6), 0, 0.25, 4.2, stairs);                              // little stair truck
  for (const sx of [-1, 1]) for (const z of [3.5, 4.9]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.15, 12).rotateZ(Math.PI / 2), CS(0x1d1d1d)); w.position.set(sx * 0.72, 0.22, z); stairs.add(w); }
}
const boardWalkers = TRAVELER_LOOKS.slice(0, 5).map(([shirt, pants, skin, hair, bagC], i) => {
  const p = makePerson({ shirt, pants, skin, hair }); const bag = makeSuitcase(bagC); bag.position.set(0.32, 0, -0.5); bag.rotation.x = -0.3; p.add(bag); boardSet.add(p); return p;
});
const boardPilots = [0, 1].map(i => { const p = makePerson({ shirt: 0xf4f4f2, pants: 0x1b2a4a, hat: true, skin: [0xd9a47a, 0x8c5a3c][i], hair: 0x2d2a26 }); const bag = makeSuitcase(0x1d1d1d); bag.position.set(0.32, 0, -0.5); bag.rotation.x = -0.3; p.add(bag); boardSet.add(p); return p; });
const noseAt = new THREE.Vector3();
function startBoarding() {
  if (board.active || cab.active) return;
  S.on = { size: 'medium' }; buildActions(-1); S.planeT = 0;
  board.active = true; board.t = 0; board.out = false;
  rig.bot.updateMatrixWorld(true); rig.head.getWorldPosition(noseAt);
  stairs.position.set(0, 0, noseAt.z - 0.2); stairs.rotation.y = 0;
  board.top = new THREE.Vector3(0, Math.max(0.6, noseAt.y - 0.25), noseAt.z + 0.1);
  stairs.scale.set(1, (board.top.y) / 1.45, 1);
  say('Time to board! The nose tucks up and the stairs roll in', 2.4);
}
function runBoarding(dt) {
  if (board.active && S.plan.to !== 0) { board.active = false; fade.style.opacity = '0'; }   // picked another mode mid-boarding: cancel
  if (!board.active) { board.k = Math.max(0, board.k - dt * 0.8); boardSet.visible = board.k > 0.01; stairs.position.y = -3 * (1 - board.k); return; }
  board.t += dt; const t = board.t;
  board.k = Math.min(1, t / 1.6); boardSet.visible = true; stairs.position.y = -3 * (1 - sm(board.k));
  const base = new THREE.Vector3(0, 0, board.top.z + 3.1), top = board.top;
  const all = [...boardPilots, ...boardWalkers];
  all.forEach((p, i) => {
    const t0 = 1.6 + i * 0.55, u = t - t0;
    const start = new THREE.Vector3(3.5 + (i % 2) * 0.7, 0, base.z + 5 + i * 0.9);
    let pos, vis = true, yaw;
    if (u < 0) { pos = start; yaw = Math.PI * 1.2; }
    else if (u < 2.2) { pos = start.clone().lerp(base, u / 2.2); yaw = Math.atan2(base.x - start.x, base.z - start.z); }
    else if (u < 3.6) { pos = base.clone().lerp(top, (u - 2.2) / 1.4); yaw = Math.PI; }
    else { pos = top; vis = false; yaw = Math.PI; }
    p.visible = vis; p.position.copy(pos); p.rotation.set(0, yaw, 0); walkPose(p, S.clockT * 9 + i, u > 0 && u < 3.6 ? 1 : 0);
  });
  const done = 1.6 + all.length * 0.55 + 3.8;
  if (t > done - 0.6) fade.style.opacity = String(Math.min(1, (t - done + 0.6) / 0.6));
  if (t > done) enterCabin();
}
function enterCabin() {
  board.active = false; cab.active = true; fade.style.opacity = '1';
  document.body.classList.add('in-cabin'); cabinUI.hidden = false;
  for (const T of travelers) { T.p.visible = true; }
  cab.view = 'cabin'; cTheta = 1.15; cPhi = 0.58; cRad = 28; updateCabUI();
  setTimeout(() => { fade.style.opacity = '0'; }, 60);
  say('Welcome aboard! Tap a traveler to choose their seat', 3.2);
}
function exitCabin() {
  closePicker(); fade.style.opacity = '1';
  setTimeout(() => {
    cab.active = false; document.body.classList.remove('in-cabin'); cabinUI.hidden = true;
    cab.flight = 'gate'; cab.alt = 0; cab.speed = 0; cab.flightT = 0; cab.served = false; cab.foodT = -1; cab.view = 'cabin';
    for (const k in seats) { seats[k].taken = null; seats[k].food.visible = false; seats[k].tray.rotation.x = -Math.PI / 2; }
    for (const b of bins) { b.want = 0; b.open = 0; }
    travelers.forEach((T, i) => {                       // everyone gets their suitcase back and lines up for the next flight
      if (T.bag.parent !== T.p) { T.bag.parent.remove(T.bag); T.p.add(T.bag); }
      T.bag.position.set(0.32, 0, -0.5); T.bag.rotation.set(-0.3, 0, 0); T.bag.scale.setScalar(1);
      T.state = 'queue'; T.seat = null; T.p.position.copy(QUEUE(i)); T.p.rotation.set(0, Math.PI, 0); walkPose(T.p, 0, 0);
    });
    board.k = 1; fade.style.opacity = '0';
    say('Thanks for flying Skyrender! See you next time', 2.6);
  }, 350);
}
// nose tuck: applied after the rig is posed each frame
function noseTuck() {
  const k = sm(Math.min(1, board.active ? board.t / 1.4 : board.k));
  if (k > 0.001 && S.plan.to === 0) rig.head.rotation.x -= 1.15 * k;
}

// ---------- pointer: drag to look around, tap things to make them happen ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let cDown = null;
function cabPointerDown(e) { cDown = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY }; }
function cabPointerMove(e) {
  if (!cDown) return;
  const dx = e.clientX - cDown.lx, dy = e.clientY - cDown.ly; cDown.lx = e.clientX; cDown.ly = e.clientY;
  if (cab.view === 'cabin') { cTheta -= dx * 0.008; cPhi = Math.min(1.35, Math.max(0.35, cPhi - dy * 0.006)); }
  else { cLookYaw = Math.max(-0.9, Math.min(0.9, cLookYaw - dx * 0.004)); cLookPitch = Math.max(-0.5, Math.min(0.5, cLookPitch + dy * 0.003)); }
}
function cabPointerUp(e) {
  if (!cDown) return;
  const moved = Math.hypot(e.clientX - cDown.x, e.clientY - cDown.y); cDown = null;
  if (moved > 8) return;
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, cabinCam);
  const hits = ray.intersectObjects(clickables, true);
  for (const h of hits) { let o = h.object; while (o && !o.userData.onClick) o = o.parent; if (o && o.visible !== false) { o.userData.onClick(); return; } }
}
function cabWheel(e) { if (cab.view === 'cabin') cRad = Math.min(26, Math.max(6, cRad + e.deltaY * 0.01)); }

// ---------- each frame inside the plane ----------
function updateCabin(dt) {
  runFlight(dt);
  moveTravelers(dt);
  for (const b of bins) { b.open += (b.want - b.open) * Math.min(1, dt * 5); b.lid.rotation.z = -b.sx * 1.6 * b.open; }
  for (const s of shades) s.position.y += ((s.userData.open ? 1.72 : 1.22) - s.position.y) * Math.min(1, dt * 6);
  lavDoor.rotation.y += ((lavOpen ? 1.4 : 0) - lavDoor.rotation.y) * Math.min(1, dt * 5);
  ckDoorOpen = cab.view === 'cockpit' ? 1 : Math.max(0, ckDoorOpen - dt);
  ckDoor.rotation.y += ((cab.view === 'cockpit' ? 1.5 : 0) - ckDoor.rotation.y) * Math.min(1, dt * 4);
  // food service: the cart rolls down the aisle and stops at every row with people in it
  cart.visible = cab.foodT >= 0;
  if (cab.foodT >= 0) {
    cab.foodT += dt;
    const rowsWithPeople = [...new Set(travelers.filter(t => t.state === 'seated').map(t => seats[t.seat].r))].sort((a, b) => a - b);
    const stops = rowsWithPeople.length ? rowsWithPeople : [1, 4, 8];
    const per = 2.2, total = stops.length * per + 3;
    const idx = Math.min(stops.length - 1, Math.floor(Math.max(0, cab.foodT - 1.2) / per));
    if (cab.foodT < 1.2) cart.position.z = 9 - (9 - (ROW_Z(stops[0]) + 0.9)) * (cab.foodT / 1.2);
    else if (cab.foodT < total - 1.8) {
      const zWant = ROW_Z(stops[idx]) + 0.9; cart.position.z += (zWant - cart.position.z) * Math.min(1, dt * 3);
      for (const L of LETTERS) { const s = seats[stops[idx] + L]; if (s.taken && s.taken.state === 'seated' && !s.food.visible && (cab.foodT - 1.2) % per > 1.0) { s.food.visible = true; play(t => tone(1200, t, 0.05, 'sine', 0.04)); } }
    } else cart.position.z += (9 - cart.position.z) * Math.min(1, dt * 1.5);
    fa1.position.set(-0.05, 0.02, cart.position.z + 0.55); fa1.rotation.y = Math.PI; walkPose(fa1, S.clockT * 8, cab.foodT < total - 0.5 ? 0.6 : 0);
    if (cab.foodT > total) { cab.foodT = -1; cab.served = true; fa1.position.set(-0.45, 0.02, 9.68); say('Everybody has a snack! Yum!', 2); }
  }
  for (const k in seats) { const s = seats[k], want = s.food.visible ? 0 : -Math.PI / 2; s.tray.rotation.x += (want - s.tray.rotation.x) * Math.min(1, dt * 6); }
  // safety demo arms
  if (demoT >= 0) { demoT += dt; const a = Math.sin(demoT * 3); fa2.userData.arms[0].rotation.set(-1.5, 0, -0.5 * a); fa2.userData.arms[1].rotation.set(-1.5, 0, 0.5 * a); if (demoT > 4) { demoT = -1; fa2.userData.arms[0].rotation.set(0, 0, 0); fa2.userData.arms[1].rotation.set(0, 0, 0); } }
  // pilots: reach for buttons, coffee, autopilot moving the yokes
  for (const p of [captain, firstOfficer]) { p.userData.arms[0].rotation.x = -0.9; p.userData.arms[1].rotation.x = -0.9; }
  for (let i = reaches.length - 1; i >= 0; i--) { const r = reaches[i]; if (S.clockT > r.until) { reaches.splice(i, 1); continue; } r.p.userData.arms[r.p === captain ? 1 : 0].rotation.x = -1.6 - Math.sin(S.clockT * 10) * 0.15; }
  yokes.forEach((y, i) => { y.rotation.z = cab.autopilot ? Math.sin(S.clockT * 1.3) * 0.25 : (cab.shake > 0 ? Math.sin(S.clockT * 15) * 0.2 : 0); y.position.z = 12.35 + (cab.flight === 'climb' ? -0.06 : 0); });
  throttles.forEach(t => t.rotation.x += ((cab.flight === 'roll' || cab.flight === 'climb' ? -0.7 : cab.flight === 'cruise' ? -0.45 : 0) - t.rotation.x) * Math.min(1, dt * 3));
  coffeeCups.forEach(c => c.visible = cab.coffee);
  cab.wipers = Math.max(0, cab.wipers - dt); wipers.forEach((w, i) => { w.rotation.z = cab.wipers > 0 ? Math.sin(S.clockT * 5 + i) * 0.9 : 0.9; });
  lightBeams.visible = cab.lights; ckCeil.visible = over.visible = cab.view === 'cockpit';
  for (const b of ckButtons) { b.lit = Math.max(0, b.lit - dt * 1.5); b.mat.emissiveIntensity = 0.15 + b.lit * 1.6 + (cab.night ? 0.25 : 0); }
  if (Math.floor(S.clockT * 10) % 2 === 0) for (const s of screens) { s.draw(s.g, s); s.t.needsUpdate = true; }
  // sky, stars, rainbow, party lights
  cab.nightK += ((cab.night ? 1 : 0) - cab.nightK) * Math.min(1, dt * 1.2);
  const n = cab.nightK, hi = Math.min(1, cab.alt / 4);
  cSkyU.top.value.setHex(0x6f9cc6).lerp(new THREE.Color(0x3d6fb8), hi).lerp(new THREE.Color(0x060b18), n);
  cSkyU.bottom.value.setHex(0xdde7ec).lerp(new THREE.Color(0xbcd4ea), hi).lerp(new THREE.Color(0x1a2440), n);
  cStars.material.opacity = n * 0.9; cabinScene.fog.color.copy(cSkyU.bottom.value);
  cSun.intensity = 0.65 - 0.45 * n; cHemi.intensity = 0.7 - 0.35 * n;
  cloudM.color.setHex(0xffffff).lerp(new THREE.Color(0x6a7590), n); cloudM.emissiveIntensity = 0.25 - 0.18 * n;
  cab.rainbow += ((cab.rainbowOn ? 1 : 0) - cab.rainbow) * Math.min(1, dt * 0.8);
  rainbow.children.forEach(m => m.material.opacity = 0.75 * cab.rainbow); rainbow.visible = cab.rainbow > 0.01;
  cab.party = Math.max(0, cab.party - dt);
  if (cab.party > 0) cHemi.color.setHSL((S.clockT * 0.8) % 1, 0.8, 0.65); else cHemi.color.setHex(0xf4f7fa);
  // camera
  if (cab.view === 'cabin') {
    cTargetWant.set(0, 0.6, 1.2);
    cTarget.lerp(cTargetWant, Math.min(1, dt * 3));
    cabinCam.position.set(cTarget.x + cRad * Math.sin(cPhi) * Math.sin(cTheta), cTarget.y + cRad * Math.cos(cPhi), cTarget.z + cRad * Math.sin(cPhi) * Math.cos(cTheta));
    cabinCam.lookAt(cTarget); cabinCam.fov = 42;
  } else {
    const eye = new THREE.Vector3(0, 2.0, 10.45).applyMatrix4(cabRoot.matrixWorld);
    cabinCam.position.lerp(eye, Math.min(1, dt * 4));
    const look = new THREE.Vector3(Math.sin(cLookYaw) * 3, 1.25 - cLookPitch * 3 - 0.1, 10.45 + Math.cos(cLookYaw) * 3).applyMatrix4(cabRoot.matrixWorld);
    cabinCam.lookAt(look); cabinCam.fov = 62;
  }
  cabinCam.aspect = stage.clientWidth / Math.max(1, stage.clientHeight); if (cabinCam.aspect < 1 && cab.view === 'cabin') cabinCam.fov = 58;
  cabinCam.updateProjectionMatrix();
  cSky.position.copy(cabinCam.position); cStars.position.copy(cabinCam.position);
}
window.__cab = { camSet: (t, p, r) => { cTheta = t; cPhi = p; cRad = r; }, cab, travelers, seats, bins, ckButtons, sendToSeat, tapTraveler, openSeatPicker, setView, cabinCam };
function cabCaption() {
  const waiting = travelers.filter(t => t.state === 'queue').length;
  if (cab.view === 'cockpit') return cab.flight === 'cruise' ? 'Cockpit: cruising high. Tap the buttons!' : cab.flight === 'gate' ? 'Cockpit: ready at the gate. Press TAKE OFF when everyone is seated' : 'Cockpit: ' + ({ taxi: 'taxiing to the runway', roll: 'rolling down the runway', climb: 'climbing into the sky', descend: 'coming in to land', landed: 'landed at Jasper Junction' }[cab.flight] || '');
  if (waiting) return waiting + ' traveler' + (waiting > 1 ? 's' : '') + ' waiting. Tap one to choose their seat';
  return { gate: 'Everyone is seated! Press Take off', taxi: 'Taxiing to the runway', roll: 'Rolling down the runway', climb: 'Climbing up, up, up!', cruise: 'Flying above the clouds. Tap bins, windows and people', descend: 'Coming in to land', landed: 'Landed! Get off the plane, or fly again' }[cab.flight];
}

export { board, cab, cabCaption, cabPointerDown, cabPointerMove, cabPointerUp, cabWheel, cabinCam, cabinScene, noseTuck, runBoarding, startBoarding, updateCabin };
