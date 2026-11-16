// Jasper's idea (November 16, 2026): "Whenever the plane gets to space it's not going to just be the three planets and
// earth there are going to be all of the planets in the solar system and buttons that jasper can press to go on the
// planets earth and mars and study the planets"
//
// In space, all eight planets hang in a row just above Earth's edge, in order from the Sun, with their real colors,
// their names, and sizes in the right order (Jupiter biggest, Mercury smallest). A "Go to" button for each planet
// flies Skyrender there: the planet you leave sinks away, the stars slide past, and the new one rises up below with
// its own moons. Each planet has true things to read about it while you're there, and the astronauts' telescope
// studies whichever planet you're at. Land works on the two planets Jasper named: at Earth it flies home to Jasper
// Junction; at Mars it sets Skyrender down on the red ground, its own little world, where the astronauts hop out
// (they weigh less than half as much there) and scoop up rocks to study. Gas planets have no ground to land on.
// Built last, after everything else, and reached by the main loop through `linked`.
import * as THREE from 'three';
import { stage } from '../world/setup.js';
import { atmo, atmoMat, canvasTex, earth, earthMat, giant, planetMats, redPlanet, ringM, space, stars } from '../scenery/space.js';
import { S, c01, ease, flyer, rig, say, sm } from '../game/state.js';
import { sfx } from '../audio/audio.js';
import { ASTRO_SCALE, makeAstronaut } from './moontrip.js';

let ps = 0x9a17;                                   // its own random numbers, so nothing else's randomness changes
const prnd = () => { ps = (ps + 0x6D2B79F5) | 0; let x = Math.imul(ps ^ (ps >>> 15), 1 | ps); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const spots = (g, w, h, n, rMin, rMax, colors, seed) => {   // soft round marks: craters, storms, dark patches
  let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) { g.fillStyle = colors[i % colors.length]; g.beginPath(); g.arc(r() * w, h * 0.08 + r() * h * 0.84, (rMin + r() * (rMax - rMin)) * w / 512, 0, Math.PI * 2); g.fill(); }
};
const bandsOf = (g, w, h, cols, seed) => { let s = seed, y = 0; while (y < h) { s = (s * 16807) % 2147483647; const bh = h * (0.03 + (s % 1000) / 1000 * 0.07); g.fillStyle = cols[(s >> 4) % cols.length]; g.fillRect(0, y, w, bh + 1); y += bh; } };

// The planets, in order from the Sun. r: size in the row; az/el: where in the sky (degrees); trip: how long a real
// spaceship took; atmo: the glow of its air (color, how thick). Every fact is true.
const PLANETS = [
  { id: 'mercury', name: 'Mercury', r: 1.6, az: 214, el: -9.8, atmo: [0, 0],
    trip: 'A real spaceship took almost 7 years to get here',
    arrive: 'Mercury! The planet closest to the Sun',
    facts: ['Mercury has almost no air, so its sky is black even in the daytime', 'A year on Mercury is only 88 days long', 'Mercury is covered in craters, a lot like our Moon', 'Mercury has no moons at all'],
    scope: 'Through the telescope: Mercury\'s craters, baked by the Sun',
    draw: (g, w, h) => { g.fillStyle = '#8f8a84'; g.fillRect(0, 0, w, h); spots(g, w, h, 90, 3, 16, ['rgba(70,66,62,0.45)', 'rgba(190,185,178,0.35)'], 5); } },
  { id: 'venus', name: 'Venus', r: 3.2, az: 220, el: -10.2, atmo: [0xf3d58a, 1.6],
    trip: 'A real spaceship takes about 5 months to get here',
    arrive: 'Venus! Wrapped in thick yellow clouds',
    facts: ['Venus is the hottest planet, hotter than a pizza oven', 'Thick clouds hide the ground on Venus all the time', 'Venus spins backward, so the Sun rises in the west there', 'Venus has no moons at all'],
    scope: 'Through the telescope: the cloud tops of Venus. Nobody can see the ground',
    draw: (g, w, h) => { g.fillStyle = '#e6cf98'; g.fillRect(0, 0, w, h); bandsOf(g, w, h, ['rgba(214,182,112,0.35)', 'rgba(244,228,186,0.4)', 'rgba(205,170,100,0.25)'], 21);
      g.globalAlpha = 0.25; spots(g, w, h, 24, 20, 60, ['#f6e9c4', '#cfae6c'], 8); g.globalAlpha = 1; } },
  { id: 'earth', name: 'Earth', r: 3.4, az: 226, el: -10.6, atmo: [0x6fb2ff, 1],
    trip: '',
    arrive: 'Home! Earth, the only planet we know with oceans and life',
    facts: [],
    scope: '',
    draw: null },
  { id: 'mars', name: 'Mars', r: 2.2, az: 232, el: -11, atmo: [0xe8a07a, 0.5], land: true,
    trip: 'A real spaceship takes about 7 months to get here',
    arrive: 'Mars, the red planet! Tap Land to go down',
    facts: ['Mars is red because its dust is full of rust', 'Mars has the tallest volcano we know of, about two and a half times taller than Mount Everest', 'Mars has two tiny moons, Phobos and Deimos', 'A day on Mars is just 37 minutes longer than a day on Earth', 'The white spots at the top and bottom are ice caps'],
    scope: 'Through the telescope: the dark line is a canyon as long as America is wide',
    draw: (g, w, h) => { g.fillStyle = '#b5543a'; g.fillRect(0, 0, w, h); spots(g, w, h, 160, 2, 9, ['rgba(120,48,30,0.35)', 'rgba(214,128,92,0.3)', 'rgba(150,70,44,0.3)'], 9);
      spots(g, w, h, 8, 30, 60, ['rgba(110,44,28,0.22)'], 13);
      g.fillStyle = '#efe2d6'; g.fillRect(0, 0, w, h * 0.06); g.fillRect(0, h * 0.95, w, h * 0.05);
      g.fillStyle = 'rgba(80,30,20,0.6)'; g.fillRect(w * 0.12, h * 0.52, w * 0.2, h * 0.018);
      g.fillStyle = 'rgba(232,170,130,0.8)'; g.beginPath(); g.arc(w * 0.62, h * 0.42, w * 0.02, 0, Math.PI * 2); g.fill(); } },
  { id: 'jupiter', name: 'Jupiter', r: 7.5, az: 240, el: -11.4, atmo: [0xe8d6b0, 0.6],
    trip: 'A real spaceship took about 5 years to get here',
    arrive: 'Jupiter, the biggest planet of all',
    facts: ['More than 1,000 Earths could fit inside Jupiter', 'The Great Red Spot is a storm bigger than the whole Earth', 'Jupiter is made of gas. There\'s no ground to land on', 'Jupiter\'s four big moons are Io, Europa, Ganymede and Callisto'],
    scope: 'Through the telescope: Jupiter\'s stripes are bands of clouds racing around',
    draw: (g, w, h) => { bandsOf(g, w, h, ['#e8dcc4', '#c9a57a', '#efe6d2', '#b98a5e', '#e3d3b4', '#a8734a', '#efe2c8', '#c49c74'], 33);
      g.fillStyle = '#c0603e'; g.beginPath(); g.ellipse(w * 0.62, h * 0.62, w * 0.055, h * 0.05, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(240,220,190,0.7)'; g.lineWidth = Math.max(1, w / 256); g.stroke(); } },
  { id: 'saturn', name: 'Saturn', r: 6.3, az: 249, el: -11.8, atmo: [0xeedcae, 0.6],
    trip: 'A real spaceship took about 7 years to get here',
    arrive: 'Saturn and its giant rings!',
    facts: ['Saturn\'s rings are billions of chunks of ice and rock', 'Saturn is so light for its size, it would float in a giant bathtub', 'Saturn is made of gas, so there\'s no ground to land on', 'Saturn\'s biggest moon, Titan, has orange haze for a sky'],
    scope: 'Through the telescope: the rings, made of ice chunks as small as sand and as big as a house',
    draw: (g, w, h) => bandsOf(g, w, h, ['#e3cf9e', '#d6bb83', '#ead9ad', '#c9a86f', '#efe0b8', '#d2b47c'], 3) },
  { id: 'uranus', name: 'Uranus', r: 4.3, az: 257, el: -12.2, atmo: [0x9fe6ea, 0.8],
    trip: 'A real spaceship took eight and a half years to get here',
    arrive: 'Uranus, the planet tipped over on its side',
    facts: ['Uranus spins tipped on its side, like a ball rolling along', 'Uranus is blue-green because of a gas called methane', 'Uranus is so cold, its clouds are made of ice'],
    scope: 'Through the telescope: smooth blue-green clouds, colder than any freezer',
    draw: (g, w, h) => { g.fillStyle = '#a6d9dc'; g.fillRect(0, 0, w, h); bandsOf(g, w, h, ['rgba(255,255,255,0.06)', 'rgba(60,140,150,0.07)', 'rgba(0,0,0,0)'], 44); } },
  { id: 'neptune', name: 'Neptune', r: 4.1, az: 264, el: -12.6, atmo: [0x5d86ff, 0.8],
    trip: 'A real spaceship took 12 years to get here',
    arrive: 'Neptune, the planet farthest from the Sun',
    facts: ['Neptune has the fastest winds of any planet', 'One year on Neptune lasts 165 Earth years', 'Neptune\'s big moon Triton goes around it backward'],
    scope: 'Through the telescope: a dark storm and fast white clouds',
    draw: (g, w, h) => { g.fillStyle = '#3d64c8'; g.fillRect(0, 0, w, h); bandsOf(g, w, h, ['rgba(30,50,140,0.25)', 'rgba(120,160,240,0.15)', 'rgba(0,0,0,0)'], 55);
      g.fillStyle = '#233c86'; g.beginPath(); g.ellipse(w * 0.4, h * 0.6, w * 0.05, h * 0.04, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.7)'; for (const [x, y] of [[0.46, 0.55], [0.7, 0.35], [0.2, 0.7]]) { g.beginPath(); g.ellipse(w * x, h * y, w * 0.035, h * 0.008, 0, 0, Math.PI * 2); g.fill(); } } },
];
const BY = Object.fromEntries(PLANETS.map(p => [p.id, p]));
const dir = (az, el, d, out = new THREE.Vector3()) => { const a = az * Math.PI / 180, e = el * Math.PI / 180; return out.set(d * Math.cos(e) * Math.cos(a), d * Math.sin(e), d * Math.cos(e) * Math.sin(a)); };

// ---------- the row of planets ----------
const row = new THREE.Group(); space.add(row);
const myMats = [];                                 // faded with space (in planetMats), and dimmed while flying between planets
const mat = m => { planetMats.push(m); myMats.push(m); return m; };
const labelTex = text => canvasTex(512, 128, (g, w, h) => {
  g.font = '600 64px Karla, "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillText(text, w / 2 + 2, h / 2 + 3); g.fillStyle = '#efe9da'; g.fillText(text, w / 2, h / 2);
});
const dots = {};
const earthTex = earthMat.map;
for (const p of PLANETS) {
  const at = dir(p.az, p.el, 240);
  let m;
  if (p.id === 'saturn') {                         // the old ringed giant, now Saturn, moves into its place in the row
    m = giant; m.position.copy(at); m.scale.setScalar(p.r / 22);
    ringM.position.copy(at); ringM.scale.setScalar(p.r / 22);
  } else if (p.id === 'mars') {
    m = redPlanet; m.position.copy(at); m.scale.setScalar(p.r / 11);
  } else {
    const tex = p.id === 'earth' ? earthTex : canvasTex(256, 128, p.draw);
    m = new THREE.Mesh(new THREE.SphereGeometry(p.r, 32, 20), mat(new THREE.MeshStandardMaterial({ map: tex, roughness: 1, emissive: 0x1a1a1a, emissiveIntensity: 0.3, transparent: true, opacity: 0, fog: false })));
    m.position.copy(at); row.add(m);
  }
  const label = new THREE.Sprite(mat(new THREE.SpriteMaterial({ map: labelTex(p.name), transparent: true, opacity: 0, depthWrite: false, fog: false })));
  label.scale.set(16, 4, 1); label.position.copy(at); label.position.y -= p.r + (p.id === 'saturn' ? 4.5 : 3.2); row.add(label);
  dots[p.id] = { m, label, at };
}
dots.earth.m.visible = dots.earth.label.visible = false;   // we start next to Earth: it's the big one below
// the Sun: a glow at the start of the row
const glowTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,248,220,1)'); gr.addColorStop(0.25, 'rgba(255,226,150,0.7)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
const sunAt = dir(206, -9.2, 240);
const sunBall = new THREE.Mesh(new THREE.SphereGeometry(5, 24, 16), mat(new THREE.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: 0, fog: false })));
sunBall.position.copy(sunAt); row.add(sunBall);
const sunGlow = new THREE.Sprite(mat(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false, fog: false })));
sunGlow.scale.setScalar(34); sunGlow.position.copy(sunAt); row.add(sunGlow);
const sunLabel = new THREE.Sprite(mat(new THREE.SpriteMaterial({ map: labelTex('Sun'), transparent: true, opacity: 0, depthWrite: false, fog: false })));
sunLabel.scale.set(16, 4, 1); sunLabel.position.copy(sunAt); sunLabel.position.y -= 8.5; row.add(sunLabel);

// ---------- each planet's moons, near Skyrender while it's there ----------
const moonsOf = {};
const lumpy = (r, color, seed) => { const geo = new THREE.IcosahedronGeometry(r, 1), p = geo.attributes.position, v = new THREE.Vector3();
  let s = seed; for (let i = 0; i < p.count; i++) { s = (s * 16807) % 2147483647; v.fromBufferAttribute(p, i).multiplyScalar(0.85 + (s % 1000) / 1000 * 0.3); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals(); return new THREE.Mesh(geo, mat(new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true, transparent: true, opacity: 0, fog: false }))); };
const ball = (r, color) => new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat(new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: true, opacity: 0, fog: false })));
for (const [id, list] of Object.entries({
  mars: [[lumpy(2.4, 0x7d6a5c, 7), 216, 6, 110], [lumpy(1.3, 0x8f7d6c, 11), 255, 8, 140]],                 // Phobos and Deimos: little potato moons
  jupiter: [[ball(2.6, 0xd9c45a), 251, 1.5, 175], [ball(2.3, 0xe0d8c4), 257, 1.8, 180], [ball(3.6, 0x9c9286), 220, 0.8, 175], [ball(3.3, 0x6e655c), 213, 0.5, 180]],   // Io, Europa, Ganymede, Callisto, in a line the way Galileo saw them
  saturn: [[ball(3.4, 0xd9a54a), 214, 5, 170]],                                                              // Titan, orange with haze
  uranus: [[ball(1.8, 0x9e9a96), 254, 5, 150]],                                                              // Titania
  neptune: [[ball(2.5, 0xcdb8b0), 218, 5, 150]],                                                             // Triton
})) {
  const g = new THREE.Group(); g.visible = false; space.add(g);
  for (const [m, az, el, d] of list) { dir(az, el, d, m.position); g.add(m); }
  moonsOf[id] = g;
}
// The planet Skyrender is visiting hangs big behind it, where our Moon is at home. Flying there, it grows out of its
// dot in the row, the way a planet gets bigger and bigger as a spaceship gets close.
const BIG_AT = dir(236, 1, 170), BIG_R = { mercury: 12, venus: 18, mars: 15, jupiter: 27, saturn: 21, uranus: 17, neptune: 17 };
const bigMat = new THREE.MeshStandardMaterial({ roughness: 1, emissive: 0x1a1410, emissiveIntensity: 0.35, transparent: true, opacity: 0, fog: false });
const big = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), bigMat); big.visible = false; space.add(big);
// Saturn's rings around it: a huge, thin band with a dark gap
const bigRingTex = canvasTex(512, 8, (g, w) => { for (let x = 0; x < w; x++) { const a = (x > w * 0.62 && x < w * 0.66) ? 0.05 : 0.3 + 0.55 * Math.abs(Math.sin(x * 0.07) * Math.sin(x * 0.023)); g.fillStyle = `rgba(232,214,176,${a.toFixed(2)})`; g.fillRect(x, 0, 1, 8); } });
const bigRingGeo = new THREE.RingGeometry(1.3, 2.3, 160, 1);
{ const rp = bigRingGeo.attributes.position, uv = bigRingGeo.attributes.uv, v = new THREE.Vector3();
  for (let i = 0; i < rp.count; i++) { v.fromBufferAttribute(rp, i); uv.setXY(i, (v.length() - 1.3) / 1.0, 0.5); } }
const bigRing = new THREE.Mesh(bigRingGeo, new THREE.MeshBasicMaterial({ map: bigRingTex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false }));
bigRing.rotation.set(-Math.PI / 2 + 0.35, 0.25, 0); bigRing.visible = false; big.add(bigRing);
big.rotation.z = 0.12;

// the big planet below: Earth's sphere wears whichever planet Skyrender is visiting (drawn sharp, the first time)
const bigTex = {};
const texOf = id => bigTex[id] || (bigTex[id] = canvasTex(1024, 512, BY[id].draw));
const EARTH_Y = earth.position.y;

// ---------- Mars: the ground, its own little world ----------
const mars = { scene: new THREE.Scene(), active: false, phase: null, t: 0, y: 0, landedT: 0 };
{
  const M = mars.scene;
  M.background = new THREE.Color(0xd8a47a); M.fog = new THREE.Fog(0xd8a47a, 50, 300);
  // the sky: butterscotch in the daytime, because fine red dust floats in the thin air
  const skyGeo = new THREE.SphereGeometry(400, 32, 16), col = [], p = skyGeo.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = Math.max(0, p.getY(i) / 400); const top = new THREE.Color(0xb98a66), bot = new THREE.Color(0xe6bb8f); const c = bot.lerp(top, Math.pow(u, 0.6)); col.push(c.r, c.g, c.b); }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  M.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
  // a small, pale Sun (Mars is farther away, so the Sun looks smaller), and the two little moons
  const sunS = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.9 }));
  sunS.position.set(150, 210, 120); sunS.scale.setScalar(40); M.add(sunS);
  const moonM = new THREE.MeshBasicMaterial({ color: 0x9a8c80, fog: false });
  const ph = new THREE.Mesh(new THREE.SphereGeometry(3.2, 14, 10), moonM); ph.position.set(-160, 150, -200); M.add(ph);
  const de = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 8), moonM); de.position.set(90, 190, -260); M.add(de);
  M.add(new THREE.HemisphereLight(0xf0c9a0, 0x7a3e28, 0.6));
  const sun = new THREE.DirectionalLight(0xffe6cc, 0.95); sun.position.set(9, 14, 7); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 }); M.add(sun);
  // red dusty ground with darker patches
  const gt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#b4643f'; g.fillRect(0, 0, w, h);
    let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 260; i++) { g.fillStyle = ['rgba(140,70,40,0.35)', 'rgba(200,128,88,0.3)', 'rgba(110,52,30,0.3)'][i % 3]; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 9, 0, Math.PI * 2); g.fill(); } });
  gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(60, 60);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ map: gt, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; M.add(ground);
  // rocks everywhere: Mars rocks are dark under the red dust
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), 220);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < 220; i++) {
    const a = prnd() * Math.PI * 2, d = 7 + Math.pow(prnd(), 1.5) * 140, s = 0.12 + prnd() * (0.25 + d / 120);
    v.set(Math.cos(a) * d, s * 0.3, Math.sin(a) * d); q.setFromEuler(e.set(prnd() * 3, prnd() * 3, prnd() * 3)); sc.set(s, s * (0.6 + prnd() * 0.4), s * (0.8 + prnd() * 0.5));
    rocks.setMatrixAt(i, m4.compose(v, q, sc)); rocks.setColorAt(i, c.setHSL(0.04 + prnd() * 0.02, 0.35 + prnd() * 0.2, 0.18 + prnd() * 0.16));
  }
  rocks.castShadow = true; rocks.receiveShadow = true; M.add(rocks);
  // craters with raised rims, and low hills on the far horizon
  const rimM = new THREE.MeshStandardMaterial({ color: 0xa65a38, roughness: 1 }), pitM = new THREE.MeshStandardMaterial({ color: 0x8f4a2e, roughness: 1 });
  for (const [x, z, r] of [[-16, -12, 5], [22, -30, 8], [-40, 26, 11], [30, 18, 4]]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.16, 8, 40), rimM); rim.rotation.x = -Math.PI / 2; rim.scale.z = 0.35; rim.position.set(x, 0.05, z); rim.receiveShadow = true; M.add(rim);
    const pit = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 32), pitM); pit.rotation.x = -Math.PI / 2; pit.position.set(x, 0.02, z); M.add(pit);
  }
  const hillM = new THREE.MeshStandardMaterial({ color: 0xb06a48, roughness: 1, flatShading: true });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + prnd() * 0.3, d = 170 + prnd() * 60;
    const h = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hillM); h.scale.set(30 + prnd() * 40, 8 + prnd() * 16, 25 + prnd() * 25); h.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); M.add(h); }
  // dust kicked up by the rockets on the way down and back up
  mars.dust = [];
  const dustM = new THREE.MeshStandardMaterial({ color: 0xc98a62, roughness: 1, transparent: true, opacity: 0, depthWrite: false });
  for (let i = 0; i < 28; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), dustM.clone()); d.visible = false; M.add(d); mars.dust.push({ m: d, life: 0, a: 0, v: 0 }); }
}
const fade = document.createElement('div');
Object.assign(fade.style, { position: 'fixed', inset: '0', background: '#2a1a12', opacity: '0', pointerEvents: 'none', zIndex: '1' });
(stage.parentNode || document.body).insertBefore(fade, stage.nextSibling);
let dustI = 0;
function kickDust(r) {
  const d = mars.dust[dustI++ % mars.dust.length], a = prnd() * Math.PI * 2;
  d.life = 1; d.a = a; d.v = r; d.m.visible = true; d.m.position.set(Math.cos(a) * 1.5, 0.4, Math.sin(a) * 1.5);
}

// ---------- the Mars astronauts: hop down from the door, bounce along, scoop up rocks, take pictures ----------
const sampleM = new THREE.MeshStandardMaterial({ color: 0x5e3524, roughness: 1, flatShading: true });
const walkers = [true, false].map((stripes, i) => {
  const a = makeAstronaut(stripes); a.scale.setScalar(ASTRO_SCALE); a.visible = false; mars.scene.add(a);
  const L = a.userData.limbs, body = a.userData.body;
  let flash = null;
  if (i === 1) {                                   // the camera astronaut
    const cam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.12), new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.5 })); cam.position.set(0, 1.42, 0.36); body.add(cam);
    flash = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0 });
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.02), flash); f.position.set(0.05, 1.47, 0.43); body.add(f);
  }
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09, 0), sampleM); rock.position.y = -0.4; rock.visible = false; L[1].el.add(rock);
  const route = i === 0 ? [[2.7, 3.2], [3.0, 1.6], [2.5, 4.4]] : [[4.3, 2.6], [4.7, 4.6], [4.5, 1.2]];    // beside the nose, on the door's side
  return { a, L, body, flash, rock, route, mode: 'in', u: 0, wait: i * 1.3, spot: 0, work: 0, pos: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3(), ph: 0, side: 1 };
});
const doorW = new THREE.Vector3(), _v = new THREE.Vector3();
function limbs(w, k) {                             // k: { hip, knee, arm, elbow } per side, from a pose
  for (const sx of [-1, 1]) { const l = w.L[sx], p = k(sx); l.hip.rotation.set(p[0], 0, sx * 0.08); l.kn.rotation.set(p[1], 0, 0); l.sh.rotation.set(p[2], 0, sx * 0.22); l.el.rotation.set(p[3], 0, 0); }
}
function runWalkers(dt, want) {
  rig.sideDoor.getWorldPosition(doorW);
  let out = 0;
  for (const [i, w] of walkers.entries()) {
    const side = doorW.x >= 0 ? 1 : -1, base = _v.set(doorW.x + side * 1.4, 0, doorW.z + i * 1.1 - 0.5);
    const spotAt = (s, out2) => out2.set(side * w.route[s][0], 0, w.route[s][1]);
    if (w.mode === 'in') {
      w.a.visible = false; w.rock.visible = false;
      if (want) { w.wait -= dt; if (w.wait <= 0) { w.mode = 'hopOut'; w.u = 0; w.from.copy(doorW); w.to.copy(base); } }
      else w.wait = i * 1.3;
      continue;
    }
    out++; w.a.visible = true;
    if (!want && w.mode !== 'back' && w.mode !== 'hopIn') { w.mode = 'back'; w.to.copy(base); }
    let bob = 0;
    if (w.mode === 'hopOut' || w.mode === 'hopIn') {
      // low gravity: a slow, floaty hop between the door and the ground
      w.u = Math.min(1, w.u + dt / 1.5);
      w.pos.copy(w.from).lerp(w.to, w.u); w.pos.y += Math.sin(w.u * Math.PI) * 1.1;
      limbs(w, sx => [-0.6, 0.9, -1.1, -0.4]);
      if (w.u >= 1) { if (w.mode === 'hopOut') { w.mode = 'walk'; w.to.copy(spotAt(w.spot, w.to)); } else { w.mode = 'in'; w.wait = i * 1.3; } }
    } else if (w.mode === 'walk' || w.mode === 'back') {
      // a bouncy lope: on Mars you weigh less than half as much, so every step floats
      _v.copy(w.to).sub(w.pos); _v.y = 0; const d = _v.length();
      if (d < 0.08) {
        if (w.mode === 'back') { w.mode = 'hopIn'; w.u = 0; w.from.copy(w.pos); w.to.copy(doorW); }
        else { w.mode = 'work'; w.work = 0; }
      } else {
        w.pos.addScaledVector(_v.normalize(), Math.min(d, dt * 1.3));
        w.a.rotation.y = Math.atan2(_v.x, _v.z);
        w.ph += dt * 5.2; bob = Math.abs(Math.sin(w.ph)) * 0.28;
        limbs(w, sx => { const s = Math.sin(w.ph + (sx > 0 ? 0 : Math.PI)); return [-0.25 - s * 0.45, 0.35 + Math.max(0, s) * 0.5, s * 0.5 - 0.15, -0.35]; });
      }
      w.pos.y = 0;
    } else if (w.mode === 'work') {
      w.work += dt;
      if (i === 0) {                               // kneel and scoop up a rock to take home and study
        const reach = sm(c01(w.work / 0.8)) * (1 - sm(c01((w.work - 5.4) / 0.6)));
        bob = -0.38 * reach;
        limbs(w, sx => sx > 0 ? [-1.5 * reach, 1.6 * reach, -0.2 - (0.9 + Math.sin(w.work * 3) * 0.25 * c01((w.work - 1) / 0.5) * (w.work < 3 ? 1 : 0)) * reach, -0.3]
          : [0.15 * reach, 1.9 * reach, -0.2 - 0.4 * reach, -0.3]);
        w.rock.visible = w.work > 3;
        if (w.work > 3 && w.work < 5.4) w.L[1].sh.rotation.x = -0.2 - 1.6 * sm(c01((w.work - 3) / 0.6));   // holds it up to look
      } else {                                     // take pictures of the commander at work
        const up = sm(c01(w.work / 0.6)) * (1 - sm(c01((w.work - 5.4) / 0.6)));
        limbs(w, sx => [0, 0.1, -1.3 * up, -1.0 * up]);
        _v.copy(walkers[0].pos).sub(w.pos); w.a.rotation.y = Math.atan2(_v.x, _v.z);
        w.flash.emissiveIntensity = up > 0.95 && (w.work % 2.6) > 2.4 ? 5 : 0;
      }
      if (w.work > 6) { w.spot = (w.spot + 1) % w.route.length; w.mode = 'walk'; w.to.copy(spotAt(w.spot, w.to)); w.rock.visible = false; }
    }
    w.a.position.copy(w.pos); w.a.position.y += bob;
  }
  return out;
}

// ---------- flying between planets, landing, and the buttons ----------
const TRAVEL = 4.6;
let at = 'earth', to = null, travelT = 0, arrivedT = 0, factClock = 0, waitAstro = false;
const travelK = () => to ? travelT : 0;
function wear(id) {                                // dress the big planet behind Skyrender, and show its moons
  const p = BY[id];
  if (id !== 'earth') { bigMat.map = texOf(id); bigMat.needsUpdate = true; bigRing.visible = id === 'saturn'; }
  for (const [k, g] of Object.entries(moonsOf)) g.visible = k === id;
  for (const q of PLANETS) dots[q.id].m.visible = dots[q.id].label.visible = q.id !== id;
  ringM.visible = id !== 'saturn';
  S.visit = id;
  S.visitScope = p.scope; S.visitName = p.name; S.homeDot = dots.earth.at; S.bigAt = BIG_AT; S.bigR = BIG_R[id] || 0;
}
function goPlanet(id) {
  if (mars.active || mars.phase) { say('Take off from Mars first', 2.4); return; }
  if (to) return;
  if (id === at) { say(id === 'earth' ? 'We\'re right here at Earth. Pick another planet!' : 'We\'re already at ' + BY[id].name, 2.4); return; }
  to = id; travelT = 0; sfx.whirr(1.2);
}
function landAction() {
  if (to) return;
  if (mars.active && mars.phase === 'ground') { mars.phase = 'up'; mars.t = 0; S.on.astro = false; markOff('Astronauts'); return; }
  if (at === 'earth') { S.on.space = false; markOff('Fly to space'); say('Down we go, home to Jasper Junction', 2.6); return; }
  if (at === 'mars' && !mars.phase) {
    if (S.astroK > 0.02 || S.on.astro) { S.on.astro = false; markOff('Astronauts'); waitAstro = true; say('Astronauts, back inside! Then down to Mars', 2.6); }
    mars.phase = 'down'; mars.t = 0; return;
  }
}
function markOff(label) { for (const b of document.querySelectorAll('#acts button')) if (b.textContent === label) b.setAttribute('aria-pressed', 'false'); }

function setActive(on) {
  if (on === mars.active) return;
  mars.active = on;
  if (on) mars.scene.add(flyer); else space.parent.add(flyer);   // Skyrender itself goes down to Mars and back
}

// Every frame (sp: 0 in the sky, 1 in space), right after the sky and before the Moon trip
function runPlanets(dt, sp) {
  factClock += dt;
  // anything that means "go home" (Fly to space off, or a new mode picked) takes Skyrender back to Earth first
  const wantHome = S.plan.to !== 0 || !S.on.space || S.pending !== null;
  if (wantHome && !to) {
    if (mars.active && mars.phase === 'ground') { mars.phase = 'up'; mars.t = 0; }
    else if (!mars.phase && at !== 'earth' && sp > 0.5) { to = 'earth'; travelT = 0; }
  }
  // flying between planets: the one you leave falls back into the row (Earth drops away below), the stars slide
  // past, and the new one grows out of its dot until it hangs big behind Skyrender (Earth rises back up below)
  let grow = at === 'earth' ? 0 : 1, sink = at === 'earth' ? 0 : 1;
  if (to) {
    travelT = Math.min(1, travelT + dt / TRAVEL);
    const leave = ease(c01(travelT / 0.5)), come = ease(c01((travelT - 0.5) / 0.5));
    if (travelT >= 0.5 && at !== to) { at = to; wear(at); }
    if (travelT < 0.5) { grow = at === 'earth' ? 0 : 1 - leave; sink = at === 'earth' ? leave : 1; }
    else { grow = at === 'earth' ? 0 : come; sink = at === 'earth' ? 1 - come : 1; }
    stars.rotation.y += dt * 0.5 * Math.sin(travelT * Math.PI);
    if (travelT >= 1) { to = null; arrivedT = 0; factClock = 0; }
  } else arrivedT += dt;
  earth.position.y = atmo.position.y = EARTH_Y - 420 * sink;
  earthMat.opacity = sp * (1 - sink); atmoMat.opacity = 0.35 * sp * (1 - sink);
  big.visible = at !== 'earth' && sp > 0.001 && grow > 0.001;
  if (big.visible) {
    const d = dots[at], g2 = grow * grow * (3 - 2 * grow);
    big.position.copy(d.at).lerp(BIG_AT, g2); big.scale.setScalar(BY[at].r + (BIG_R[at] - BY[at].r) * g2);
    d.m.visible = d.label.visible = g2 < 0.02;   // the dot becomes the big planet
    bigMat.opacity = sp; bigRing.material.opacity = 0.9 * sp * g2;
    big.rotation.y += dt * 0.03;
  }
  for (const [k, g] of Object.entries(moonsOf)) if (g.visible) for (const m of g.children) m.material.opacity = sp * c01(grow * 2 - 1);
  S.homeMoonK = at === 'earth' && !to ? Math.min(1, (S.homeMoonK ?? 1) + dt) : Math.max(0, (S.homeMoonK ?? 1) - dt * 1.5);
  S.away = at !== 'earth' || !!to || !!mars.phase || mars.active;
  // landing on Mars and taking off again
  if (mars.phase === 'down') {
    if (waitAstro && S.astroK > 0.02) { fade.style.opacity = '0'; }
    else {
      waitAstro = false; mars.t += dt; const t = mars.t;
      fade.style.opacity = String(t < 1.4 ? t / 1.4 : Math.max(0, 1 - (t - 1.4) / 1.2));
      if (t >= 1.4) setActive(true);
      mars.y = 10 * (1 - ease(c01((t - 1.4) / 3.8)));
      if (mars.active && mars.y < 3.5 && mars.y > 0.02 && prnd() < dt * 18) kickDust(1 + (3.5 - mars.y));
      if (t >= 5.2) { mars.phase = 'ground'; mars.y = 0; mars.landedT = 0; say('Touchdown on Mars!', 2.6); sfx.lock(); }
    }
  } else if (mars.phase === 'ground') {
    mars.landedT += dt;
  } else if (mars.phase === 'up') {
    const outNow = walkers.some(w => w.mode !== 'in');
    if (!outNow) {
      mars.t += dt; const t = mars.t;
      mars.y = 12 * ease(c01(t / 2.6));
      if (mars.y < 4 && prnd() < dt * 18) kickDust(2 + mars.y);
      fade.style.opacity = String(t < 2 ? 0 : t < 3 ? t - 2 : Math.max(0, 1 - (t - 3) / 1.2));
      if (t >= 3) { setActive(false); mars.y = 0; }
      if (t >= 4.2) { mars.phase = null; fade.style.opacity = '0'; arrivedT = 0; }
    }
  }
  S.onMars = mars.active;
  for (const d of mars.dust) {
    if (d.life <= 0) continue;
    d.life -= dt * 0.55; const age = 1 - d.life;
    d.m.position.x += Math.cos(d.a) * d.v * dt * 2; d.m.position.z += Math.sin(d.a) * d.v * dt * 2; d.m.position.y += dt * 0.5;
    d.m.scale.setScalar(0.5 + age * 2.4); d.m.material.opacity = 0.7 * Math.min(1, age * 5) * Math.max(0, d.life);
    if (d.life <= 0) d.m.visible = false;
  }
  const out = mars.active ? runWalkers(dt, S.on.astro && mars.phase === 'ground') : 0;
  window.__planets = { at, to, travel: travelT, mars: mars.phase || (mars.active ? 'ground' : null), onMars: mars.active, walkersOut: out,
    working: walkers.filter(w => w.mode === 'work').length };
}

// The caption while traveling, at another planet, or on Mars (empty: the plane's own caption shows)
const MARS_WALK = ['Hop! On Mars you weigh less than half as much, so every step is bouncy', 'The commander scoops up Mars rocks to study back home', 'Click! A picture of the commander at work on Mars'];
const MARS_GROUND = ['On Mars! The sky is butterscotch because of red dust in the air', 'Sunsets on Mars are blue', 'Those two little moons in the sky are Phobos and Deimos', 'Tap Astronauts to go out and study the rocks'];
function planetCaption() {
  if (S.plan.to !== 0) return '';
  if (to) return to === 'earth' ? 'Flying home to Earth!' : travelT < 0.75 ? 'Flying to ' + BY[to].name + '! ' + BY[to].trip : BY[to].arrive;
  if (mars.phase === 'down') return waitAstro ? '' : mars.t < 1.4 ? 'Landing on Mars!' : 'Down through the thin Mars air. Rockets slow Skyrender down';
  if (mars.phase === 'up') return walkers.some(w => w.mode !== 'in') ? 'Astronauts, back inside! Then up we go' : 'Rockets on! Back up to space';
  if (mars.active) {
    const k = Math.floor(mars.landedT / 6);
    if (walkers.some(w => w.mode !== 'in')) return k % 2 ? MARS_WALK[(k >> 1) % MARS_WALK.length] : BY.mars.facts[(k >> 1) % BY.mars.facts.length];
    return mars.landedT < 3 ? 'Touchdown on Mars!' : MARS_GROUND[k % MARS_GROUND.length];
  }
  if (S.planeAlt < 600 || !S.on.space) return '';
  const p = BY[at];
  if (at === 'earth') return arrivedT > 4 && Math.floor(arrivedT / 7) % 3 === 1 ? 'All eight planets, in a row from the Sun. Tap one to fly there' : '';
  if (arrivedT < 4) return p.arrive;
  const f = Math.floor((arrivedT - 4) / 6);
  return p.facts[f % p.facts.length];
}
// What the buttons should show: in space, the planet row; Land at Earth and Mars, Take off on Mars
const planetUI = () => ({ at, to, landed: mars.active && mars.phase === 'ground', busy: !!mars.phase && mars.phase !== 'ground', canLand: !to && !mars.phase && (at === 'earth' || at === 'mars') });
const marsView = () => ({ on: mars.active, y: mars.y, scene: mars.scene });

wear('earth');
export { PLANETS, goPlanet, landAction, marsView, planetCaption, planetUI, runPlanets };
