// Jasper's idea (November 15, 2026): "When the plane gets up to space there will be a huge moon with craters and
// there will be a button that makes huge meteors and astronauts that study space."
//
// The huge Moon (seen from the plane and the rocket), the Meteors button (space rocks that hit the Moon and leave
// new craters, which is how the Moon got its craters), and the astronauts who float out of the plane's door on
// safety lines to study it. Built last, after everything else, and reached by the main loop through `linked`.
// Nobody is ever hurt: the meteors fly far from the plane and the astronauts are always tied on.
import * as THREE from 'three';
import { camera, renderer, scene } from '../world/setup.js';
import { earth, giant, moonMat } from '../scenery/space.js';
import { makePerson } from '../people/people.js';
import { sfx } from '../audio/audio.js';
import { S, c01, ease, flyer, rig, say, sm } from '../game/state.js';

// its own random numbers, so the rest of the toy's randomness is untouched
let ms = 0x51ed;
const mrnd = () => { ms = (ms + 0x6D2B79F5) | 0; let x = Math.imul(ms ^ (ms >>> 15), 1 | ms); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

// ---------- the huge Moon ----------
// Grey highlands, dark smooth "seas" of old lava (with fewer craters, because they're younger), and craters
// everywhere: the Moon has no air or weather to wear them away. Each crater is a bowl with a raised rim, and the big
// ones have a mountain in the middle, where the ground bounced back up after the hit. Two pictures paint it: the
// colors (fresh craters are bright, because new dust hasn't been darkened by sunlight yet) and the heights, which
// the sunlight shades. Drawn in a 1024 x 512 plan at twice that sharpness.
const W = 1024, H = 512, CS = 2;
const moonCanvas = document.createElement('canvas'); moonCanvas.width = W * CS; moonCanvas.height = H * CS;
const mg = moonCanvas.getContext('2d'); mg.scale(CS, CS);
const hCanvas = document.createElement('canvas'); hCanvas.width = W * CS; hCanvas.height = H * CS;
const hg = hCanvas.getContext('2d'); hg.scale(CS, CS);
const blob = (g, x, y, rx, ry, rot, stops) => {      // a soft-edged oval
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(rx, ry);
  const r = g.createRadialGradient(0, 0, 0, 0, 0, 1); for (const [o, c] of stops) r.addColorStop(o, c);
  g.fillStyle = r; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore();
};
function crater(x, y, r, fresh) {
  for (const dx of [-W, 0, W]) {                   // draw across the seam so craters wrap around the globe
    const cx = x + dx;
    if (cx + r * 4 < 0 || cx - r * 4 > W) continue;
    // heights: a bowl below the ground, a raised rim, and a central peak in the big ones
    blob(hg, cx, y, r * 1.55, r * 1.55, 0, [[0, 'rgba(50,50,50,0.9)'], [0.32, 'rgba(62,62,62,0.88)'], [0.6, 'rgba(228,228,228,0.92)'], [0.8, 'rgba(165,165,165,0.45)'], [1, 'rgba(128,128,128,0)']]);
    if (r > 9) blob(hg, cx, y, r * 0.22, r * 0.22, 0, [[0, 'rgba(200,200,200,0.85)'], [1, 'rgba(70,70,70,0)']]);
    // colors
    if (fresh) {
      blob(mg, cx, y, r * 3.2, r * 3.0, 0, [[0, 'rgba(236,234,226,0.55)'], [0.4, 'rgba(230,228,220,0.25)'], [1, 'rgba(230,228,220,0)']]);   // bright thrown-out dust
      for (let k = 0; k < 14; k++) {             // rays: long thin streaks of dust, fading with distance
        const a = mrnd() * Math.PI * 2, L = r * (3 + mrnd() * 5), wd = r * (0.12 + mrnd() * 0.16);
        const ex = cx + Math.cos(a) * L, ey = y + Math.sin(a) * L * 0.9, nx = -Math.sin(a) * wd, ny = Math.cos(a) * wd;
        const gr = mg.createLinearGradient(cx, y, ex, ey); gr.addColorStop(0, 'rgba(238,236,228,0.5)'); gr.addColorStop(1, 'rgba(238,236,228,0)');
        mg.fillStyle = gr; mg.beginPath(); mg.moveTo(cx + nx, y + ny); mg.lineTo(ex, ey); mg.lineTo(cx - nx, y - ny); mg.fill();
      }
      blob(mg, cx, y, r * 1.05, r * 1.05, 0, [[0, 'rgba(150,148,140,1)'], [0.7, 'rgba(176,174,166,1)'], [0.9, 'rgba(232,230,222,1)'], [1, 'rgba(232,230,222,0)']]);
    } else {
      blob(mg, cx, y, r * 1.5, r * 1.5, 0, [[0, 'rgba(60,60,56,0.16)'], [0.55, 'rgba(60,60,56,0.08)'], [0.66, 'rgba(225,223,215,0.16)'], [1, 'rgba(225,223,215,0)']]);
    }
  }
}
mg.fillStyle = '#a5a49d'; mg.fillRect(0, 0, W, H);
hg.fillStyle = '#808080'; hg.fillRect(0, 0, W, H);
for (let i = 0; i < 9000; i++) {                   // fine dust and pebbles everywhere
  const v = 120 + mrnd() * 70 | 0; mg.fillStyle = `rgba(${v},${v},${v - 6},0.18)`; mg.fillRect(mrnd() * W, mrnd() * H, 0.6 + mrnd(), 0.6 + mrnd());
}
const seas = [];
for (let i = 0; i < 10; i++) {                     // the dark seas (maria), most of them on the side Skyrender sees
  const cx = i < 5 ? 110 + mrnd() * 330 : mrnd() * W, cy = i < 5 ? 320 + mrnd() * 110 : 120 + mrnd() * 270, n = 5 + mrnd() * 6;
  for (let k = 0; k < n; k++) {
    const s = { x: cx + (mrnd() - 0.5) * 140, y: cy + (mrnd() - 0.5) * 90, rx: 30 + mrnd() * 70, ry: 20 + mrnd() * 45, rot: mrnd() * 3 };
    seas.push(s);
    for (const dx of [-W, 0, W]) blob(mg, s.x + dx, s.y, s.rx * 1.3, s.ry * 1.3, s.rot, [[0, 'rgba(78,78,75,0.66)'], [0.65, 'rgba(78,78,75,0.52)'], [1, 'rgba(78,78,75,0)']]);
  }
}
const inSea = (x, y) => seas.some(s => { const c = Math.cos(-s.rot), n = Math.sin(-s.rot), dx = x - s.x, dy = y - s.y, u = (dx * c - dy * n) / s.rx, v = (dx * n + dy * c) / s.ry; return u * u + v * v < 1; });
for (let i = 0; i < 520; i++) {
  const x = mrnd() * W, y = 20 + mrnd() * (H - 40), r = 1.5 + Math.pow(mrnd(), 3) * 28;
  if (inSea(x, y) && mrnd() < 0.7) continue;      // the seas are smoother
  crater(x, y, r, false);
}
for (let i = 0; i < 3; i++) crater(mrnd() * W, 80 + mrnd() * 350, 7 + mrnd() * 5, true);     // a few young ray craters
const moonTex = new THREE.CanvasTexture(moonCanvas); moonTex.anisotropy = 4;
const moonBump = new THREE.CanvasTexture(hCanvas);
const MOON_R = 42, MOON_POS = new THREE.Vector3(-58, 26, -96);
const bigMoonMat = new THREE.MeshStandardMaterial({ map: moonTex, bumpMap: moonBump, bumpScale: 2.4, roughness: 1, transparent: true, opacity: 0, fog: false });
const bigMoon = new THREE.Mesh(new THREE.SphereGeometry(MOON_R, 96, 64), bigMoonMat);
bigMoon.position.copy(MOON_POS); bigMoon.rotation.y = 0.6;
const trip = new THREE.Group(); trip.visible = false; trip.add(bigMoon); scene.add(trip);
moonMat.visible = false;                           // the small far-off Moon gives way to the huge one
let moonDirty = false, moonWait = 0;               // new craters go to the screen at most 4 times a second

// ---------- meteors ----------
// Space rocks are called meteoroids; they only glow as "meteors" when they rush through air. Out here they're dark,
// sunlit rocks that speed up as the Moon's gravity pulls them in, shedding grains of dust behind them.
const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
function rockGeo(seed) {
  const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position, col = [];
  const a = [mrnd() * 6, mrnd() * 6, mrnd() * 6];
  for (let k = 0; k < p.count; k++) {
    const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
    const n = 1 + 0.22 * Math.sin(x * 3.1 + a[0]) * Math.cos(y * 2.7 + a[1]) + 0.12 * Math.sin(z * 5.3 + a[2] + seed) + (mrnd() - 0.5) * 0.08;
    p.setXYZ(k, x * n * 1.15, y * n * 0.85, z * n);
    const shade = 0.32 + 0.18 * n + (mrnd() - 0.5) * 0.06;
    col.push(shade * 1.05, shade * 0.95, shade * 0.85);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  return g;
}
const rocks = [];
for (let i = 0; i < 6; i++) {
  const m = new THREE.Mesh(rockGeo(i), rockMat); m.visible = false; trip.add(m);
  rocks.push({ m, live: false, t: 0, dur: 3, wait: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), side: new THREE.Vector3(), spin: new THREE.Vector3(), shed: 0 });
}
// Dust: one pool of glowing grains for the rocks' trails and for what an impact throws out.
const MAXG = 900;
const gPos = new Float32Array(MAXG * 3), gCol = new Float32Array(MAXG * 3), gVel = new Float32Array(MAXG * 3), gLife = new Float32Array(MAXG), gMax = new Float32Array(MAXG), gGrav = new Uint8Array(MAXG), gBright = new Float32Array(MAXG);
const grainGeo = new THREE.BufferGeometry();
grainGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3)); grainGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 3));
const grains = new THREE.Points(grainGeo, new THREE.PointsMaterial({ size: 1.1, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
grains.frustumCulled = false; trip.add(grains);
let gNext = 0;
function grain(p, v, life, moonPull, bright) {
  const i = gNext; gNext = (gNext + 1) % MAXG;
  gPos[i * 3] = p.x; gPos[i * 3 + 1] = p.y; gPos[i * 3 + 2] = p.z;
  gVel[i * 3] = v.x; gVel[i * 3 + 1] = v.y; gVel[i * 3 + 2] = v.z;
  gLife[i] = gMax[i] = life; gGrav[i] = moonPull ? 1 : 0; gBright[i] = bright;
}
// The flash: telescopes on Earth really see quick flashes like this when space rocks hit the Moon.
const flashTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,250,235,1)'); r.addColorStop(0.25, 'rgba(255,225,170,0.7)'); r.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const flashes = [0, 1, 2].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false })); s.visible = false; trip.add(s); return { s, t: 1 }; });
let newCraters = 0;
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _n = new THREE.Vector3(), _t1 = new THREE.Vector3(), _t2 = new THREE.Vector3();
// Staged for Jasper's view: rocks come in from the right edge of the screen, pass well behind the plane, and hit
// the part of the Moon he can see.
const camF = new THREE.Vector3(), camR = new THREE.Vector3(), camU = new THREE.Vector3(), toy = new THREE.Vector3();
function launchMeteors() {
  camera.getWorldDirection(camF); camR.crossVectors(camF, _w.set(0, 1, 0)).normalize(); camU.crossVectors(camR, camF);
  flyer.getWorldPosition(toy);
  rocks.forEach((r, i) => {
    r.live = true; r.t = 0; r.wait = i * 0.45 + mrnd() * 0.2; r.dur = 2.4 + mrnd() * 0.8; r.shed = 0;
    r.from.copy(toy).addScaledVector(camR, 55 + mrnd() * 20).addScaledVector(camU, 8 + mrnd() * 22).addScaledVector(camF, 30 + mrnd() * 25);
    _v.copy(camera.position).sub(MOON_POS).normalize().addScaledVector(camU, -0.45).addScaledVector(camR, -0.2)
      .add(_w.set(mrnd() - 0.5, mrnd() - 0.5, mrnd() - 0.5).multiplyScalar(0.5)).normalize();
    r.to.copy(MOON_POS).addScaledVector(_v, MOON_R);                                     // a spot on the Moon's face he can see
    r.side.copy(camU).multiplyScalar(6 + mrnd() * 10);                                   // a gentle arc on the way in
    r.spin.set((mrnd() - 0.5) * 4, (mrnd() - 0.5) * 4, (mrnd() - 0.5) * 4);
    r.m.scale.setScalar(2.6 + mrnd() * 2.6); r.m.rotation.set(mrnd() * 6, mrnd() * 6, mrnd() * 6);
  });
  watchHits = 6;                                   // if the astronauts are out, the telescope swings over to watch
}
function impact(at, size) {
  const f = flashes.find(x => x.t >= 1) || flashes[0];
  f.t = 0; f.s.position.copy(at); f.s.visible = true; f.size = 10 + size * 4;
  // with no air, nothing billows: the dust flies out in perfect arcs and falls back slowly (the Moon's gravity is weak)
  _n.copy(at).sub(MOON_POS).normalize();
  _t1.set(0, 1, 0).cross(_n).normalize(); _t2.copy(_n).cross(_t1);
  for (let k = 0; k < 140; k++) {
    const a = mrnd() * Math.PI * 2, out = 6 + mrnd() * 14, up = 5 + mrnd() * 16;
    _v.copy(_n).multiplyScalar(up).addScaledVector(_t1, Math.cos(a) * out).addScaledVector(_t2, Math.sin(a) * out);
    grain(at, _v, 2.2 + mrnd() * 1.8, true, 0.75 + mrnd() * 0.25);
  }
  // paint the new crater where it hit (sphere texture: u around the equator, v from the north pole down)
  _v.copy(at); bigMoon.worldToLocal(_v).normalize();
  const u = ((Math.atan2(_v.z, -_v.x) / (Math.PI * 2)) % 1 + 1) % 1, vv = Math.acos(THREE.MathUtils.clamp(_v.y, -1, 1)) / Math.PI;
  crater(u * W, vv * H, 5 + size * 2, true); moonDirty = true; lastHit.copy(at); hasHit = true;
  newCraters++;
  const lines = ['Flash! Telescopes on Earth really see flashes like this when rocks hit the Moon',
    'A brand new crater. That\'s how the Moon got all its craters', 'No air, so no dust cloud: the dust flies out in perfect arcs', 'No boom: space has no air to carry sound'];
  if (newCraters % 2) say(lines[((newCraters - 1) / 2) % lines.length], 3.4);
}

// ---------- astronauts ----------
// Two astronauts push off from the side door on safety lines. Without gravity, a body relaxes into a float pose:
// arms drift up and forward, knees bend. One studies the Moon through a telescope, the other takes pictures.
// The commander wears red stripes, like real crews, so you can tell them apart. Little jetpack puffs steer them.
const suitMat = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.75 });
const greyMat = new THREE.MeshStandardMaterial({ color: 0x8d9296, roughness: 0.6 });
const visorMat = new THREE.MeshStandardMaterial({ color: 0xc89b3c, metalness: 0.55, roughness: 0.18, emissive: 0x3a2a08, emissiveIntensity: 0.6 });
const stripeMat = new THREE.MeshStandardMaterial({ color: 0x7a2430, roughness: 0.7 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.5 });
const cap = (r, len, mat) => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 14), mat); c.position.y = -len / 2; g.add(c);
  const e = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat); e.position.y = -len; g.add(e); return g; };
function makeAstronaut(stripes) {
  const a = new THREE.Group(), body = new THREE.Group(); a.add(body);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.62, 16), suitMat); torso.position.y = 0.95; body.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.08), greyMat); chest.position.set(0, 1.0, 0.24); body.add(chest);   // controls on the chest
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.24), suitMat); pack.position.set(0, 1.02, -0.32); body.add(pack);    // life support backpack
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 16), suitMat); helmet.position.y = 1.45; body.add(helmet);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.255, 20, 14, Math.PI / 2 - 1.0, 2.0, 0.75, 1.25), visorMat); visor.position.y = 1.45; body.add(visor);   // gold visor, facing forward
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.05), greyMat); lamp.position.set(0.17, 1.62, 0.12); body.add(lamp);
  if (stripes) for (const y of [0.78, 1.12]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.25, 0.05, 16), stripeMat); s.position.y = y; body.add(s); }
  const limbs = {};
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 0.33, 1.18, 0); body.add(sh);
    const up = cap(0.085, 0.3, suitMat); sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
    const fo = cap(0.075, 0.28, suitMat); el.add(fo);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), greyMat); glove.position.y = -0.36; el.add(glove);
    const hip = new THREE.Group(); hip.position.set(sx * 0.13, 0.65, 0); body.add(hip);
    const th = cap(0.105, 0.36, suitMat); hip.add(th);
    const kn = new THREE.Group(); kn.position.y = -0.36; hip.add(kn);
    const sn = cap(0.095, 0.34, suitMat); kn.add(sn);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.26), greyMat); boot.position.set(0, -0.44, 0.04); kn.add(boot);
    if (stripes) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12), stripeMat); s.position.y = -0.12; hip.add(s); }
    limbs[sx] = { sh, el, hip, kn };
  }
  a.userData = { body, limbs };
  return a;
}
// a safety line: a chain of short white pieces, so it reads at any size
const lineMat = new THREE.MeshStandardMaterial({ color: 0xe9dfb8, roughness: 0.8 });
const SEG = 18;
function makeTether() { const g = new THREE.Group(); for (let i = 0; i < SEG; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6), lineMat); g.add(s); } return g; }
// jetpack puffs: tiny bursts of gas that steer them (real jetpacks use little jets of nitrogen)
const MAXP = 120;
const pPos = new Float32Array(MAXP * 3), pVel = new Float32Array(MAXP * 3), pLife = new Float32Array(MAXP), pCol = new Float32Array(MAXP * 3);
const puffGeo = new THREE.BufferGeometry(); puffGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); puffGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const jetPuffs = new THREE.Points(puffGeo, new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
jetPuffs.frustumCulled = false; flyer.add(jetPuffs);
let pNext = 0;
function jetPuff(p, dir) {
  for (let k = 0; k < 6; k++) {
    const i = pNext; pNext = (pNext + 1) % MAXP;
    pPos[i * 3] = p.x; pPos[i * 3 + 1] = p.y; pPos[i * 3 + 2] = p.z;
    pVel[i * 3] = dir.x * 2 + (mrnd() - 0.5) * 0.6; pVel[i * 3 + 1] = dir.y * 2 + (mrnd() - 0.5) * 0.6; pVel[i * 3 + 2] = dir.z * 2 + (mrnd() - 0.5) * 0.6;
    pLife[i] = 0.6;
  }
}
// close to true size: a person is about half as tall as an airliner's body is wide (a little bigger here, to read)
const ASTRO_SCALE = 0.8;
const crew = [
  { a: makeAstronaut(true), tether: makeTether(), tool: 'telescope', station: new THREE.Vector3(-1.0, 2.1, 2.2), ph: 0, delay: 0 },
  { a: makeAstronaut(false), tether: makeTether(), tool: 'camera', station: new THREE.Vector3(1.7, 1.5, 2.9), ph: 2.1, delay: 0.18 },
];
for (const c of crew) {
  const { limbs } = c.a.userData;
  let tool, flash = null;
  if (c.tool === 'telescope') {
    tool = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.7, 14), darkMat); tube.rotation.x = Math.PI / 2; tool.add(tube);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 16), greyMat); ring.position.z = 0.35; tool.add(ring);
    tool.position.set(0, 1.36, 0.42);
  } else {
    tool = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.12), darkMat); tool.position.set(0, 1.12, 0.36);
    flash = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0 });
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.02), flash); f.position.set(0.05, 1.17, 0.43); c.a.userData.body.add(f);
  }
  c.a.userData.body.add(tool); c.flash = flash; c.tool3d = tool;
  c.a.scale.setScalar(ASTRO_SCALE); c.a.visible = c.tether.visible = false; flyer.add(c.a); flyer.add(c.tether);
}
const FACTS = ['Astronauts study the Moon\'s craters through a telescope', 'Safety lines keep the astronauts tied to Skyrender',
  'With no gravity, bodies float like this: arms up, knees bent', 'Red stripes show who the commander is',
  'Say cheese! The astronaut is taking Skyrender\'s picture', 'Spacesuits carry air to breathe, because space has none', 'Beep! Astronauts talk by radio, since sound can\'t travel through space'];
let factT = 0, fact = 0, clock = 0;
const door = new THREE.Vector3(), hand = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion();
const moonL = new THREE.Vector3(), camL = new THREE.Vector3(), look = new THREE.Vector3(), _m4 = new THREE.Matrix4();

function inSpace(sp) { return S.plan.to === 0 && sp > 0.9 && S.pending === null; }
let lastSp = 0;

// A button press from the plane's action buttons
function moonAction(id) {
  if (id === 'space') {
    if (S.on.space) say(S.planeT >= 14 ? 'Rocket power on! Wings need air, so Skyrender uses rockets to reach space' : 'Up to space once Skyrender is cruising', 3);
    else say('Heading back down to the clouds', 2);
  }
  if (id === 'meteors') {
    if (lastSp > 0.8) { launchMeteors(); say('Meteoroids! Huge space rocks falling toward the Moon', 3); }
    else say('Meteors fly out in space. Tap Fly to space first', 2.6);
  }
  if (id === 'astro') {
    if (S.on.astro && lastSp > 0.8) { say('The astronauts push off from the door, tied on with safety lines', 2.8); S.on.door = true; markDoor(); }
    else if (S.on.astro) say('The astronauts go out once Skyrender is in space', 2.6);
    else say('Astronauts, back inside!', 2);
  }
}
function markDoor() { for (const b of document.querySelectorAll('#acts button')) if (b.textContent === 'Open door') b.setAttribute('aria-pressed', 'true'); }

function pose(c, k, t) {
  // float pose: arms forward and up, elbows bent, knees bent; drifting slowly. Hands on the instrument once out.
  const L = c.a.userData.limbs, drift = Math.sin(t * 0.5 + c.ph) * 0.12, hold = sm(c01((k - 0.7) / 0.3));
  for (const sx of [-1, 1]) {
    const l = L[sx];
    l.sh.rotation.set(-0.7 - 0.45 * hold + drift * sx * (1 - hold), 0, sx * (0.35 - 0.2 * hold));
    l.el.rotation.set(-0.6 - 0.75 * hold, 0, -sx * 0.5 * hold);
    l.hip.rotation.set(-0.55 + drift * 0.5 * sx, 0, sx * 0.12);
    l.kn.rotation.set(0.9 + drift * 0.4, 0, 0);
  }
}
function placeTether(c, from, to, t) {
  // a slack line: no gravity pulls it straight down, so it drifts in a lazy curve that sways
  const segs = c.tether.children, sag = from.distanceTo(to) * 0.18;
  let px = from.x, py = from.y, pz = from.z;
  for (let i = 1; i <= SEG; i++) {
    const u = i / SEG, b = Math.sin(u * Math.PI) * sag;
    const x = from.x + (to.x - from.x) * u + Math.sin(t * 0.7 + c.ph + u * 3) * b * 0.5;
    const y = from.y + (to.y - from.y) * u - b * 0.6;
    const z = from.z + (to.z - from.z) * u + Math.cos(t * 0.6 + c.ph + u * 2) * b * 0.4;
    const s = segs[i - 1]; _a.set(px, py, pz); _b.set(x, y, z);
    s.position.copy(_a).add(_b).multiplyScalar(0.5);
    const len = _a.distanceTo(_b); s.scale.set(1, Math.max(0.001, len), 1);
    _q.setFromUnitVectors(_up, _b.sub(_a).normalize()); s.quaternion.copy(_q);
    px = x; py = y; pz = z;
  }
}

// Every frame (sp: 0 in the sky, 1 in space)
function runMoonTrip(dt, sp) {
  lastSp = sp; clock += dt;
  moonWait -= dt; if (moonDirty && moonWait <= 0) { moonTex.needsUpdate = moonBump.needsUpdate = true; moonDirty = false; moonWait = 0.25; }
  trip.visible = sp > 0.001;
  bigMoonMat.opacity = sp;
  // meteors: speeding up as the Moon pulls them in, shedding grains
  for (const r of rocks) {
    if (!r.live) continue;
    if (r.wait > 0) { r.wait -= dt; continue; }
    r.t += dt / r.dur; const k = Math.min(1, r.t), e = Math.pow(k, 1.7), bend = Math.sin(k * Math.PI);
    r.m.visible = trip.visible;
    r.m.position.copy(r.from).lerp(r.to, e).addScaledVector(r.side, bend);
    r.m.rotation.x += r.spin.x * dt; r.m.rotation.y += r.spin.y * dt; r.m.rotation.z += r.spin.z * dt;
    r.shed += dt; while (r.shed > 0.02) { r.shed -= 0.02; grain(r.m.position, _v.set((mrnd() - 0.5) * 0.8, (mrnd() - 0.5) * 0.8, (mrnd() - 0.5) * 0.8), 1.2, false, 0.45); }
    if (k >= 1) { r.live = false; r.m.visible = false; impact(r.to, r.m.scale.x); }
  }
  // grains: trail dust drifts and fades; impact dust flies in arcs and falls back to the Moon
  for (let i = 0; i < MAXG; i++) {
    if (gLife[i] <= 0) { gCol[i * 3] = gCol[i * 3 + 1] = gCol[i * 3 + 2] = 0; continue; }
    gLife[i] -= dt;
    if (gGrav[i]) { _v.set(MOON_POS.x - gPos[i * 3], MOON_POS.y - gPos[i * 3 + 1], MOON_POS.z - gPos[i * 3 + 2]).normalize().multiplyScalar(9 * dt);
      gVel[i * 3] += _v.x; gVel[i * 3 + 1] += _v.y; gVel[i * 3 + 2] += _v.z; }
    gPos[i * 3] += gVel[i * 3] * dt; gPos[i * 3 + 1] += gVel[i * 3 + 1] * dt; gPos[i * 3 + 2] += gVel[i * 3 + 2] * dt;
    const f = Math.max(0, gLife[i] / gMax[i]) * gBright[i];       // sunlit grey dust, fading out
    gCol[i * 3] = f; gCol[i * 3 + 1] = f * 0.95; gCol[i * 3 + 2] = f * 0.86;
  }
  grainGeo.attributes.position.needsUpdate = true; grainGeo.attributes.color.needsUpdate = true;
  for (const f of flashes) {
    if (f.t >= 1) continue;
    f.t = Math.min(1, f.t + dt / 0.6);
    f.s.material.opacity = f.t < 0.12 ? f.t / 0.12 : 1 - (f.t - 0.12) / 0.88; f.s.scale.setScalar(f.size * (0.6 + 0.6 * f.t)); f.s.visible = f.t < 1 && trip.visible;
  }
  // astronauts: out only in space, back in before the plane comes down
  const want = S.on.astro && S.on.space && inSpace(sp) ? 1 : 0;
  S.astroK += (want - S.astroK) * Math.min(1, dt * 0.45);
  if (Math.abs(want - S.astroK) < 0.002) S.astroK = want;
  const show = S.astroK > 0.01;
  if (show) {
    rig.sideDoor.getWorldPosition(door); flyer.worldToLocal(door);
    moonL.copy(MOON_POS); flyer.worldToLocal(moonL); camL.copy(camera.position); flyer.worldToLocal(camL);
    for (const c of crew) {
      const k = c01((S.astroK - c.delay) / (1 - c.delay)), ek = ease(k), a = c.a;
      a.visible = c.tether.visible = k > 0.001;
      if (!a.visible) continue;
      // push off from the door, drift out and up on a curve, settle at a station on the near side
      _a.copy(door).lerp(c.station, ek); _a.y += Math.sin(k * Math.PI) * 1.2;
      _a.y += Math.sin(clock * 0.6 + c.ph) * 0.12 * k; _a.x += Math.cos(clock * 0.45 + c.ph) * 0.1 * k;
      a.position.copy(_a);
      // face where they're going while drifting out, then turn to study the Moon
      if (c.tool === 'camera') look.copy(camL); else { look.copy(aim); flyer.worldToLocal(look); look.lerp(camL, 0.3); }
      _m4.lookAt(a.position, k < 0.85 ? c.station : look, _up); a.quaternion.setFromRotationMatrix(_m4); a.rotateY(Math.PI);
      a.rotateZ(Math.sin(clock * 0.4 + c.ph) * 0.08 + (1 - k) * 0.6); a.rotateX(-0.2 + Math.sin(clock * 0.35 + c.ph) * 0.06);
      pose(c, k, clock);
      if (c.flash) c.flash.emissiveIntensity = k > 0.95 && Math.sin(clock * 1.3) > 0.985 ? 5 : 0;       // snap!
      // small jetpack puffs as they slow down at their station
      if (k > 0.55 && k < 0.98 && mrnd() < dt * 8) { hand.set(0, 1.0, -0.5).applyQuaternion(a.quaternion).multiplyScalar(ASTRO_SCALE).add(a.position); jetPuff(hand, _b.copy(c.station).sub(door).normalize()); }
      // safety line from the door to the backpack
      hand.set(0, 1.0, -0.45).applyQuaternion(a.quaternion).multiplyScalar(ASTRO_SCALE).add(a.position);
      placeTether(c, door, hand, clock);
    }
    if (want && S.astroK > 0.9) {
      factT -= dt;
      if (factT <= 0) {
        factT = 6; tick++;
        if (tick % 2 && watchHits <= 0) { if (tick > 1) look_i = (look_i + 1) % LOOKS.length; say(LOOKS[look_i].line(), 4.4); } else say(FACTS[fact++ % FACTS.length], 4);
        sfx.quindar();
      }
    }
  } else { for (const c of crew) c.a.visible = c.tether.visible = false; factT = 2; }
  runViews(dt, want);
  for (let i = 0; i < MAXP; i++) {
    if (pLife[i] <= 0) { pCol[i * 3] = pCol[i * 3 + 1] = pCol[i * 3 + 2] = 0; continue; }
    pLife[i] -= dt; const f = Math.max(0, pLife[i] / 0.6) * 0.9;
    pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
    pCol[i * 3] = pCol[i * 3 + 1] = pCol[i * 3 + 2] = f;
  }
  puffGeo.attributes.position.needsUpdate = true; puffGeo.attributes.color.needsUpdate = true;
  jetPuffs.visible = show;
  window.__moon = { craters: newCraters, astroK: S.astroK, meteorsFlying: rocks.filter(r => r.live).length, scope: scopeK, looking: watchHits > 0 ? 'meteors' : LOOKS[look_i].name, photos, photoUp: photoT >= 0 && photoT < PHOTO_HOLD };
}

// ---------- what the astronauts see ----------
// While the astronauts are out, a round window shows the view through the telescope: the Moon up close (Jasper's
// newest crater, if he made one, or the rocks hitting it, live), a ringed planet, and Earth's edge with its thin
// blue air. A telescope makes faraway things look big by gathering their light into a narrow view. Every so often
// the other astronaut's camera flashes and their picture of the commander at work drops in, then floats away.
const LOOKS = [
  { name: 'moon', fov: 13, line: () => hasHit ? 'Through the telescope: your new crater, up close. See the mountain in the middle?' : 'Through the telescope: Moon craters up close. Big ones have a mountain in the middle' },
  { name: 'planet', fov: 28, line: () => 'Through the telescope: the ringed planet. Its rings are billions of chunks of ice and rock' },
  { name: 'earth', fov: 30, line: () => 'Through the telescope: home! That thin blue line is all the air wrapped around Earth' },
];
let look_i = 0, tick = 0, watchHits = 0, hasHit = false, scopeK = 0, photoT = -1, photoCool = 4, photos = 0, lastFlash = false;
const lastHit = new THREE.Vector3(), aim = new THREE.Vector3(-58, 26, -96), aimTo = new THREE.Vector3(), eye = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
const PHOTO_HOLD = 4.2;
const scopeRT = new THREE.WebGLRenderTarget(384, 384), photoRT = new THREE.WebGLRenderTarget(400, 300);
const scopeCam = new THREE.PerspectiveCamera(13, 1, 0.5, 1500), photoCam = new THREE.PerspectiveCamera(50, 4 / 3, 0.1, 1500);
const hud = new THREE.Scene(), hudCam = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10);
const flat = (geo, opts) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, ...opts })); hud.add(m); return m; };
const lensEdge = flat(new THREE.CircleGeometry(1.1, 64), { color: 0x7a2430 });
const lensRim = flat(new THREE.CircleGeometry(1.07, 64), { color: 0x2b2f33 });
const lens = flat(new THREE.CircleGeometry(1, 64), { map: scopeRT.texture });
const card = new THREE.Group(); hud.add(card);
const cardBack = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xefe9da, transparent: true, depthTest: false, depthWrite: false })); card.add(cardBack);
const cardPic = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: photoRT.texture, transparent: true, depthTest: false, depthWrite: false })); card.add(cardPic);
lensEdge.renderOrder = 0; lensRim.renderOrder = 1; lens.renderOrder = 2; cardBack.renderOrder = 3; cardPic.renderOrder = 4;

function lookPoint(out) {
  const L = watchHits > 0 ? 'meteors' : LOOKS[look_i].name;
  if (L === 'meteors') return out.copy(rocks[0].to);
  if (L === 'moon') return hasHit ? out.copy(lastHit) : out.copy(eye).sub(MOON_POS).normalize().multiplyScalar(MOON_R).add(MOON_POS);
  if (L === 'planet') return giant.getWorldPosition(out);
  // Earth's edge: the line where the ground meets black space, ahead of Skyrender
  earth.getWorldPosition(_c); const R = earth.geometry.parameters.radius;
  _d.copy(_c).sub(eye); const dist = _d.length(); _d.normalize();
  camera.getWorldDirection(_v); _v.addScaledVector(_d, -_v.dot(_d)).normalize();
  const a = Math.asin(Math.min(1, R / dist));
  return out.copy(_d).multiplyScalar(Math.cos(a)).addScaledVector(_v, Math.sin(a)).multiplyScalar(dist).add(eye);
}
function runViews(dt, want) {
  const scope = crew[0], cam = crew[1];
  const atStation = want && scope.a.visible && S.astroK > 0.95;
  scopeK += ((atStation ? 1 : 0) - scopeK) * Math.min(1, dt * 2.5); if (scopeK < 0.002) scopeK = 0;
  if (watchHits > 0 && !rocks.some(r => r.live)) watchHits -= dt;      // keep watching a moment after the last hit
  if (!scope.a.visible) { watchHits = 0; return; }
  scope.tool3d.getWorldPosition(eye);
  lookPoint(aimTo);
  if (scopeK < 0.05) aim.copy(aimTo); else aim.lerp(aimTo, Math.min(1, dt * 1.6));   // aimed before the window opens, then swings smoothly
  const fov = watchHits > 0 ? 22 : LOOKS[look_i].fov;
  scopeCam.fov += (fov - scopeCam.fov) * Math.min(1, dt * 1.6); scopeCam.updateProjectionMatrix();
  scopeCam.position.copy(eye).addScaledVector(_d.copy(aim).sub(eye).normalize(), 0.5); scopeCam.lookAt(aim);
  // the camera astronaut's flash: snap a picture of Skyrender now and then
  photoCool -= dt;
  const flashing = cam.flash && cam.flash.emissiveIntensity > 0;
  if (flashing && !lastFlash && photoCool <= 0 && atStation) {
    photoT = 0; photoCool = 13; photos++;
    // a picture of the commander at work, with Skyrender's wing and space behind
    crew[0].a.getWorldPosition(_c); _c.y += 0.9 * ASTRO_SCALE;
    cam.tool3d.getWorldPosition(photoCam.position); photoCam.position.addScaledVector(_d.copy(photoCam.position).sub(_c).normalize(), -0.6);
    photoCam.lookAt(_c);
    say('Click! A picture of the commander studying space', 2.6);
  }
  lastFlash = flashing;
  if (photoT >= 0) { photoT += dt; if (photoT > PHOTO_HOLD + 0.6) photoT = -1; }
}
const _sz = new THREE.Vector2();
// Called by the main loop right after it draws the scene
function drawMoonViews() {
  const showScope = scopeK > 0.01 && trip.visible, showPhoto = photoT >= 0 && trip.visible;
  if (!showScope && !showPhoto) return;
  const info = renderer.info.autoReset, sh = renderer.shadowMap.autoUpdate, au = scene.autoUpdate;
  renderer.info.autoReset = false; renderer.shadowMap.autoUpdate = false; scene.autoUpdate = false;   // the main draw already did this work
  const hide = (c, v) => { c.a.visible = c.tether.visible = v; };
  if (showScope) { hide(crew[0], false); renderer.setRenderTarget(scopeRT); renderer.render(scene, scopeCam); hide(crew[0], true); }
  if (showPhoto) { hide(crew[1], false); renderer.setRenderTarget(photoRT); renderer.render(scene, photoCam); hide(crew[1], true); }   // the picture, from where it was taken
  renderer.setRenderTarget(null);
  // lay out the round telescope window in the top left, and the picture beside it (below it on a narrow screen)
  renderer.getSize(_sz); const w = _sz.x, h = _sz.y;
  hudCam.right = w; hudCam.top = h; hudCam.updateProjectionMatrix();
  const R = Math.max(50, Math.min(105, Math.min(w, h) * 0.15)), cx = 18 + R * 1.1, cy = h - 18 - R * 1.1, k = ease(scopeK);
  for (const m of [lensEdge, lensRim, lens]) { m.position.set(cx, cy, 0); m.scale.setScalar(R * Math.max(0.001, k)); m.visible = showScope; }
  card.visible = showPhoto;
  if (showPhoto) {
    // dropped on top of the telescope window's lower right corner, like a photo on a desk
    const pw = R * 1.7, ph = pw * 0.75;
    const drop = ease(c01(photoT / 0.35)), fade = 1 - c01((photoT - PHOTO_HOLD) / 0.6);
    card.position.set(cx + R * 0.9, cy - R * 0.75 + (1 - drop) * 40 + (1 - fade) * 30, 0); card.rotation.z = -0.07 + (1 - drop) * 0.12;
    cardBack.scale.set(pw + 12, ph + 22, 1); cardBack.position.y = -4; cardPic.scale.set(pw, ph, 1);
    cardBack.material.opacity = cardPic.material.opacity = drop * fade;
  }
  renderer.autoClear = false; renderer.clearDepth(); renderer.render(hud, hudCam); renderer.autoClear = true;
  renderer.info.autoReset = info; renderer.shadowMap.autoUpdate = sh; scene.autoUpdate = au;
}

export { drawMoonViews, moonAction, runMoonTrip };
