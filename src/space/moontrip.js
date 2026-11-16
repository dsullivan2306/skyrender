// Jasper's idea (November 15, 2026): "When the plane gets up to space there will be a huge moon with craters and
// there will be a button that makes huge meteors and astronauts that study space."
//
// The huge Moon (seen from the plane and the rocket), the Meteors button (space rocks that hit the Moon and leave
// new craters, which is how the Moon got its craters), and the astronauts who float out of the plane's door on
// safety lines to study it. Built last, after everything else, and reached by the main loop through `linked`.
// Nobody is ever hurt: the meteors fly far from the plane and the astronauts are always tied on.
import * as THREE from 'three';
import { scene } from '../world/setup.js';
import { moonMat } from '../scenery/space.js';
import { makePerson } from '../people/people.js';
import { sfx } from '../audio/audio.js';
import { S, c01, ease, flyer, rig, say, sm } from '../game/state.js';

// its own random numbers, so the rest of the toy's randomness is untouched
let ms = 0x51ed;
const mrnd = () => { ms = (ms + 0x6D2B79F5) | 0; let x = Math.imul(ms ^ (ms >>> 15), 1 | ms); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

// ---------- the huge Moon ----------
// Grey highlands, dark "seas" of old lava, and craters everywhere: the Moon has no air or weather to wear them away.
const W = 1024, H = 512;
const moonCanvas = document.createElement('canvas'); moonCanvas.width = W; moonCanvas.height = H;
const mg = moonCanvas.getContext('2d');
function crater(x, y, r, fresh) {
  for (const dx of [-W, 0, W]) {                   // draw across the seam so craters wrap around the globe
    const cx = x + dx;
    if (cx + r * 3 < 0 || cx - r * 3 > W) continue;
    if (fresh) {                                   // a new crater throws out bright rays of dust
      mg.strokeStyle = 'rgba(232,230,222,0.45)'; mg.lineWidth = Math.max(1, r * 0.18);
      for (let k = 0; k < 10; k++) { const a = mrnd() * Math.PI * 2, L = r * (1.8 + mrnd() * 2.2); mg.beginPath(); mg.moveTo(cx + Math.cos(a) * r, y + Math.sin(a) * r * 0.9); mg.lineTo(cx + Math.cos(a) * L, y + Math.sin(a) * L * 0.9); mg.stroke(); }
    }
    mg.fillStyle = fresh ? '#5a5953' : 'rgba(70,70,66,0.55)'; mg.beginPath(); mg.arc(cx, y, r, 0, Math.PI * 2); mg.fill();      // the floor, in shadow
    mg.strokeStyle = fresh ? '#e4e2da' : 'rgba(215,213,205,0.7)'; mg.lineWidth = Math.max(1, r * 0.22);                     // the sunlit rim
    mg.beginPath(); mg.arc(cx, y, r, Math.PI * 0.9, Math.PI * 1.9); mg.stroke();
    mg.strokeStyle = 'rgba(40,40,38,0.5)'; mg.beginPath(); mg.arc(cx, y, r, Math.PI * 1.95, Math.PI * 0.85); mg.stroke();
  }
}
mg.fillStyle = '#a3a29b'; mg.fillRect(0, 0, W, H);
for (let i = 0; i < 9; i++) {                      // the dark seas (maria)
  const cx = mrnd() * W, cy = 120 + mrnd() * 270, n = 5 + mrnd() * 6;
  for (let k = 0; k < n; k++) { mg.fillStyle = 'rgba(92,92,88,0.5)'; mg.beginPath(); mg.ellipse(cx + (mrnd() - 0.5) * 140, cy + (mrnd() - 0.5) * 90, 30 + mrnd() * 70, 20 + mrnd() * 45, mrnd() * 3, 0, Math.PI * 2); mg.fill(); }
}
for (let i = 0; i < 420; i++) crater(mrnd() * W, 20 + mrnd() * (H - 40), 2 + Math.pow(mrnd(), 3) * 26, false);
for (let i = 0; i < 3; i++) crater(mrnd() * W, 80 + mrnd() * 350, 9 + mrnd() * 6, true);     // a few young ray craters
const moonTex = new THREE.CanvasTexture(moonCanvas); moonTex.anisotropy = 4;
const MOON_R = 42, MOON_POS = new THREE.Vector3(-58, 26, -96);
const bigMoonMat = new THREE.MeshStandardMaterial({ map: moonTex, bumpMap: moonTex, bumpScale: 2.2, roughness: 1, transparent: true, opacity: 0, fog: false });
const bigMoon = new THREE.Mesh(new THREE.SphereGeometry(MOON_R, 96, 64), bigMoonMat);
bigMoon.position.copy(MOON_POS); bigMoon.rotation.y = 0.6;
const trip = new THREE.Group(); trip.visible = false; trip.add(bigMoon); scene.add(trip);
moonMat.visible = false;                           // the small far-off Moon gives way to the huge one

// ---------- meteors ----------
// Space rocks are called meteoroids; they only glow as "meteors" when they rush through air. These ones hit the Moon.
const rockMat = new THREE.MeshStandardMaterial({ color: 0x6b5f52, roughness: 1, flatShading: true });
const dustMat = new THREE.MeshBasicMaterial({ color: 0xc9c5bb, transparent: true, opacity: 0, depthWrite: false, fog: false });
const rocks = [], dusts = [];
for (let i = 0; i < 6; i++) {
  const g = new THREE.DodecahedronGeometry(1, 1), p = g.attributes.position;
  for (let k = 0; k < p.count; k++) { const f = 0.75 + mrnd() * 0.5; p.setXYZ(k, p.getX(k) * f, p.getY(k) * f, p.getZ(k) * f); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, rockMat); m.visible = false; trip.add(m);
  rocks.push({ m, live: false, t: 0, dur: 3, from: new THREE.Vector3(), mid: new THREE.Vector3(), to: new THREE.Vector3(), spin: new THREE.Vector3(), wait: 0 });
  const d = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), dustMat.clone()); d.visible = false; trip.add(d); dusts.push({ m: d, t: 1 });
}
let newCraters = 0;
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
function launchMeteors() {
  rocks.forEach((r, i) => {
    r.live = true; r.t = 0; r.wait = i * 0.4; r.dur = 2.8 + mrnd() * 1.0;
    r.from.set(130 + mrnd() * 40, 40 + mrnd() * 40, -10 + mrnd() * 40);                  // far out on the other side, well away from Skyrender
    _v.copy(r.from).sub(MOON_POS).normalize().lerp(_w.set(mrnd() - 0.5, mrnd() - 0.5, mrnd() * 0.6 + 0.4), 0.45).normalize();
    r.to.copy(MOON_POS).addScaledVector(_v, MOON_R);                                     // a spot on the Moon's near side
    r.mid.copy(r.from).lerp(r.to, 0.5).add(_w.set(0, 18 + mrnd() * 14, 0));
    r.spin.set(mrnd() * 3, mrnd() * 3, mrnd() * 3);
    r.m.scale.setScalar(2.2 + mrnd() * 1.8);
  });
}
function impact(at) {
  const d = dusts.find(x => x.t >= 1) || dusts[0];
  d.t = 0; d.m.position.copy(at); d.m.visible = true;
  // paint a new crater where it hit (sphere texture: u around the equator, v from the north pole down)
  _v.copy(at); bigMoon.worldToLocal(_v).normalize();
  const u = ((Math.atan2(_v.z, -_v.x) / (Math.PI * 2)) % 1 + 1) % 1, vv = Math.acos(THREE.MathUtils.clamp(_v.y, -1, 1)) / Math.PI;
  crater(u * W, vv * H, 7 + mrnd() * 7, true); moonTex.needsUpdate = true;
  newCraters++;
  say(newCraters % 2 ? 'Crash! A brand new crater. That\'s how the Moon got its craters' : 'No boom: space has no air to carry the sound', 3.2);
}

// ---------- astronauts ----------
// Two astronauts float out of the side door on safety lines: one studies the Moon through a telescope,
// the other takes pictures. Their spacesuits carry air to breathe.
const suit = 0xf1f1ec;
const astronauts = [0, 1].map(i => {
  const p = makePerson({ shirt: suit, pants: 0xe4e4de, skin: i ? 0x8d5a3b : 0xe0b08a, hair: 0x2d2a26 });
  const white = new THREE.MeshStandardMaterial({ color: suit, roughness: 0.6 });
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 14), white); helmet.position.y = 1.08; p.add(helmet);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.195, 18, 12, -0.9, 1.8, 0.9, 1.1), new THREE.MeshStandardMaterial({ color: 0xc9a043, metalness: 0.9, roughness: 0.2 }));
  visor.position.y = 1.08; visor.rotation.y = Math.PI / 2; p.add(visor);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.14), white); pack.position.set(0, 0.76, -0.17); p.add(pack);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.01), new THREE.MeshStandardMaterial({ color: 0x7a2430 })); flag.position.set(-0.17, 0.92, 0.04); flag.rotation.y = -Math.PI / 2; p.add(flag);
  let tool, flash = null;
  if (i === 0) {                                   // a telescope, pointed at the Moon
    tool = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.5 }));
    tool.rotation.x = Math.PI / 2; tool.position.set(0.08, 0.98, 0.32);
  } else {                                         // a camera with a flash
    tool = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.1), new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.5 }));
    tool.position.set(0, 0.9, 0.22);
    flash = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0 });
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.02), flash); f.position.set(0.04, 0.95, 0.28); p.add(f);
  }
  p.add(tool);
  p.userData.arms[0].rotation.x = p.userData.arms[1].rotation.x = -1.1;   // both hands on the instrument
  const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(16 * 3), 3));
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xe8d7a0 }));
  p.visible = line.visible = false; flyer.add(p); flyer.add(line);
  return { p, line, flash, off: i ? new THREE.Vector3(4.8, -0.7, 1.9) : new THREE.Vector3(3.2, 1.0, -1.3), ph: i * 2.1 };
});
const FACTS = ['Astronauts study the Moon\'s craters through a telescope', 'Safety lines keep the astronauts close to Skyrender',
  'Spacesuits carry air to breathe, because space has none', 'Beep! Astronauts talk by radio, since sound can\'t travel through space'];
let factT = 0, fact = 0, clock = 0;
const door = new THREE.Vector3(), moonLocal = new THREE.Vector3();

function inSpace(sp) { return S.plan.to === 0 && sp > 0.9 && S.pending === null; }
let lastSp = 0;

// A button press from the plane's action buttons
function moonAction(id) {
  if (id === 'space') {
    if (S.on.space) say(S.planeT >= 14 ? 'Rocket power on! Wings need air, so Skyrender uses rockets to reach space' : 'Up to space once Skyrender is cruising', 3);
    else say('Heading back down to the clouds', 2);
  }
  if (id === 'meteors') {
    if (lastSp > 0.8) { launchMeteors(); say('Meteoroids! Huge space rocks zooming toward the Moon', 3); }
    else say('Meteors fly out in space. Tap Fly to space first', 2.6);
  }
  if (id === 'astro') {
    if (S.on.astro && lastSp > 0.8) { say('Astronauts float out the door on their safety lines', 2.8); S.on.door = true; markDoor(); }
    else if (S.on.astro) say('The astronauts go out once Skyrender is in space', 2.6);
    else say('Astronauts, back inside!', 2);
  }
}
function markDoor() { for (const b of document.querySelectorAll('#acts button')) if (b.textContent === 'Open door') b.setAttribute('aria-pressed', 'true'); }

// Every frame (sp: 0 in the sky, 1 in space)
function runMoonTrip(dt, sp) {
  lastSp = sp; clock += dt;
  trip.visible = sp > 0.001;
  bigMoonMat.opacity = sp;
  // meteors
  for (const r of rocks) {
    if (!r.live) continue;
    if (r.wait > 0) { r.wait -= dt; continue; }
    r.t += dt / r.dur; const k = Math.min(1, r.t), a = 1 - k;
    r.m.visible = trip.visible;
    r.m.position.set(a * a * r.from.x + 2 * a * k * r.mid.x + k * k * r.to.x, a * a * r.from.y + 2 * a * k * r.mid.y + k * k * r.to.y, a * a * r.from.z + 2 * a * k * r.mid.z + k * k * r.to.z);
    r.m.rotation.x += r.spin.x * dt; r.m.rotation.y += r.spin.y * dt; r.m.rotation.z += r.spin.z * dt;
    if (k >= 1) { r.live = false; r.m.visible = false; impact(r.to); }
  }
  for (const d of dusts) {
    if (d.t >= 1) continue;
    d.t = Math.min(1, d.t + dt / 1.8);
    d.m.scale.setScalar(1 + 9 * ease(d.t)); d.m.material.opacity = 0.8 * (1 - d.t); d.m.visible = d.t < 1 && trip.visible;
  }
  // astronauts: out only in space, back in before the plane comes down
  const want = S.on.astro && S.on.space && inSpace(sp) ? 1 : 0;   // they come back in as soon as it's time to head down
  S.astroK += (want - S.astroK) * Math.min(1, dt * 0.6);
  if (Math.abs(want - S.astroK) < 0.002) S.astroK = want;
  const k = sm(c01(S.astroK)), show = S.astroK > 0.01;
  if (show) {
    rig.sideDoor.getWorldPosition(door); flyer.worldToLocal(door);
    const side = Math.sign(door.x) || 1;
    moonLocal.copy(MOON_POS); flyer.worldToLocal(moonLocal);
    for (const a of astronauts) {
      const p = a.p; p.visible = a.line.visible = true;
      p.position.set(door.x + side * a.off.x * k, door.y + a.off.y * k - 0.6 + Math.sin(clock * 0.7 + a.ph) * 0.15 * k, door.z + a.off.z * k);
      p.lookAt(MOON_POS); p.rotateX(-0.25 + Math.sin(clock * 0.5 + a.ph) * 0.08);
      p.userData.legs[0].rotation.x = 0.35 + Math.sin(clock * 0.6 + a.ph) * 0.15; p.userData.legs[1].rotation.x = -0.2;
      if (a.flash) a.flash.emissiveIntensity = Math.sin(clock * 1.3) > 0.97 ? 4 : 0;     // snap!
      // the safety line: from the door to the backpack, in a lazy curve (no gravity to pull it straight down)
      const pos = a.line.geometry.attributes.position;
      for (let n = 0; n < 16; n++) {
        const t = n / 15, bx = door.x + (p.position.x - door.x) * t, by = door.y + (p.position.y + 0.76 - door.y) * t, bz = door.z + (p.position.z - door.z) * t;
        const sag = Math.sin(t * Math.PI) * (0.9 + 0.3 * Math.sin(clock * 0.8 + a.ph));
        pos.setXYZ(n, bx + side * sag * 0.3, by - sag * 0.4, bz + sag * 0.5);
      }
      pos.needsUpdate = true;
    }
    if (want && S.astroK > 0.9) { factT -= dt; if (factT <= 0) { factT = 6; say(FACTS[fact++ % FACTS.length], 4); sfx.quindar(); } }
  } else { for (const a of astronauts) a.p.visible = a.line.visible = false; factT = 1.5; }
  window.__moon = { craters: newCraters, astroK: S.astroK, meteorsFlying: rocks.filter(r => r.live).length };
}

export { moonAction, runMoonTrip };
