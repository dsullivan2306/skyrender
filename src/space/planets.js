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
import { planMorph, poseRig } from '../rig/rig.js';
import { makeRover, roverCaption, runRover } from './rover.js';
import { fire, makeStorm, pile, runStorm, strike } from './storm.js';

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
    facts: ['Mercury has almost no air, so its sky is black even in the daytime', 'A year on Mercury is only 88 days long', 'Mercury is covered in craters, a lot like our Moon', 'Mercury has no moons at all', 'No rover has been to Mercury. In the daytime it gets hot enough to melt metal'],
    scope: 'Through the telescope: Mercury\'s craters, baked by the Sun',
    draw: (g, w, h) => { g.fillStyle = '#8f8a84'; g.fillRect(0, 0, w, h); spots(g, w, h, 90, 3, 16, ['rgba(70,66,62,0.45)', 'rgba(190,185,178,0.35)'], 5); } },
  { id: 'venus', name: 'Venus', r: 3.2, az: 220, el: -10.2, atmo: [0xf3d58a, 1.6],
    trip: 'A real spaceship takes about 5 months to get here',
    arrive: 'Venus! Wrapped in thick yellow clouds',
    facts: ['Venus is the hottest planet, hotter than a pizza oven', 'Thick clouds hide the ground on Venus all the time', 'Venus spins backward, so the Sun rises in the west there', 'Venus has no moons at all', 'No rover has driven on Venus. Landers there lasted two hours at most before the heat stopped them'],
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
    facts: ['Mars is red because its dust is full of rust', 'Mars has the tallest volcano we know of, about two and a half times taller than Mount Everest', 'Mars has two tiny moons, Phobos and Deimos', 'A day on Mars is just 37 minutes longer than a day on Earth', 'The white spots at the top and bottom are ice caps', 'Rovers have been driving on Mars since 1997. Land, then tap Rover to meet one'],
    scope: 'Through the telescope: the dark line is a canyon as long as America is wide',
    draw: (g, w, h) => { g.fillStyle = '#b5543a'; g.fillRect(0, 0, w, h); spots(g, w, h, 160, 2, 9, ['rgba(120,48,30,0.35)', 'rgba(214,128,92,0.3)', 'rgba(150,70,44,0.3)'], 9);
      spots(g, w, h, 8, 30, 60, ['rgba(110,44,28,0.22)'], 13);
      g.fillStyle = '#efe2d6'; g.fillRect(0, 0, w, h * 0.06); g.fillRect(0, h * 0.95, w, h * 0.05);
      g.fillStyle = 'rgba(80,30,20,0.6)'; g.fillRect(w * 0.12, h * 0.52, w * 0.2, h * 0.018);
      g.fillStyle = 'rgba(232,170,130,0.8)'; g.beginPath(); g.arc(w * 0.62, h * 0.42, w * 0.02, 0, Math.PI * 2); g.fill(); } },
  { id: 'jupiter', name: 'Jupiter', r: 7.5, az: 240, el: -11.4, atmo: [0xe8d6b0, 0.6],
    trip: 'A real spaceship took about 5 years to get here',
    arrive: 'Jupiter, the biggest planet of all',
    facts: ['More than 1,000 Earths could fit inside Jupiter', 'The Great Red Spot is a storm bigger than the whole Earth', 'Jupiter is made of gas. There\'s no ground to land on', 'Jupiter\'s four big moons are Io, Europa, Ganymede and Callisto', 'No rover could drive on Jupiter. There are just clouds that get thicker and thicker'],
    scope: 'Through the telescope: Jupiter\'s stripes are bands of clouds racing around',
    draw: (g, w, h) => { bandsOf(g, w, h, ['#e8dcc4', '#c9a57a', '#efe6d2', '#b98a5e', '#e3d3b4', '#a8734a', '#efe2c8', '#c49c74'], 33);
      g.fillStyle = '#c0603e'; g.beginPath(); g.ellipse(w * 0.62, h * 0.62, w * 0.055, h * 0.05, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(240,220,190,0.7)'; g.lineWidth = Math.max(1, w / 256); g.stroke(); } },
  { id: 'saturn', name: 'Saturn', r: 6.3, az: 249, el: -11.8, atmo: [0xeedcae, 0.6],
    trip: 'A real spaceship took about 7 years to get here',
    arrive: 'Saturn and its giant rings!',
    facts: ['Saturn\'s rings are billions of chunks of ice and rock', 'Saturn is so light for its size, it would float in a giant bathtub', 'Saturn is made of gas, so there\'s no ground to land on', 'Saturn\'s biggest moon, Titan, has orange haze for a sky', 'A rover would sink into Saturn. But a flying robot is going to visit Titan'],
    scope: 'Through the telescope: the rings, made of ice chunks as small as sand and as big as a house',
    draw: (g, w, h) => bandsOf(g, w, h, ['#e3cf9e', '#d6bb83', '#ead9ad', '#c9a86f', '#efe0b8', '#d2b47c'], 3) },
  { id: 'uranus', name: 'Uranus', r: 4.3, az: 257, el: -12.2, atmo: [0x9fe6ea, 0.8],
    trip: 'A real spaceship took eight and a half years to get here',
    arrive: 'Uranus, the planet tipped over on its side',
    facts: ['Uranus spins tipped on its side, like a ball rolling along', 'Uranus is blue-green because of a gas called methane', 'Uranus is so cold, its clouds are made of ice', 'Only one spaceship has ever visited Uranus, and it just flew past'],
    scope: 'Through the telescope: smooth blue-green clouds, colder than any freezer',
    draw: (g, w, h) => { g.fillStyle = '#a6d9dc'; g.fillRect(0, 0, w, h); bandsOf(g, w, h, ['rgba(255,255,255,0.06)', 'rgba(60,140,150,0.07)', 'rgba(0,0,0,0)'], 44); } },
  { id: 'neptune', name: 'Neptune', r: 4.1, az: 264, el: -12.6, atmo: [0x5d86ff, 0.8],
    trip: 'A real spaceship took 12 years to get here',
    arrive: 'Neptune, the planet farthest from the Sun',
    facts: ['Neptune has the fastest winds of any planet', 'One year on Neptune lasts 165 Earth years', 'Neptune\'s big moon Triton goes around it backward', 'Only one spaceship has ever visited Neptune, and it just flew past'],
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
const mars = { scene: new THREE.Scene(), active: false, phase: null, t: 0, y: 0, landedT: 0, where: 'mars' };   // where: 'mars' or 'moon'
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
// ---------- the Moon's ground (Jasper's idea: "you can go on the moon") ----------
// No air, so: a black sky even in the daytime, no haze (far hills look as sharp as near ones), extra dark
// shadows, and Earth hanging in the sky. It has its own random numbers, so Mars and everything else stay the same.
const moonG = { scene: new THREE.Scene() };
{
  let ms = 0x3c11; const mrnd = () => { ms = (ms + 0x6D2B79F5) | 0; let x = Math.imul(ms ^ (ms >>> 15), 1 | ms); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const M = moonG.scene;
  M.background = new THREE.Color(0x030405);
  const home = new THREE.Mesh(new THREE.SphereGeometry(16, 40, 24), new THREE.MeshStandardMaterial({ map: earthTex, roughness: 1, emissive: 0x334466, emissiveIntensity: 0.5 }));
  // Earth, low in the sky where the camera looks while on the ground
  home.position.set(-300 * Math.sin(1.42), 27, -300 * Math.cos(1.42)); home.scale.setScalar(0.5); home.rotation.y = 2.2; M.add(home);
  const sunS = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1 }));
  sunS.position.set(160, 120, -210); sunS.scale.setScalar(30); M.add(sunS);
  M.add(new THREE.HemisphereLight(0x9aa6b8, 0x2a2a2a, 0.22));          // a little light bounced off the ground and from Earth
  const sun = new THREE.DirectionalLight(0xffffff, 1.35); sun.position.set(10, 8, -9); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 }); M.add(sun);
  const gt = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#8d8c88'; g.fillRect(0, 0, w, h);
    let s2 = 7; const r = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 300; i++) { g.fillStyle = ['rgba(60,60,58,0.3)', 'rgba(170,170,165,0.3)', 'rgba(95,95,92,0.35)'][i % 3]; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 8, 0, Math.PI * 2); g.fill(); } });
  gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(60, 60);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ map: gt, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; M.add(ground);
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), 180);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < 180; i++) {
    const a = mrnd() * Math.PI * 2, d = 8 + Math.pow(mrnd(), 1.5) * 140, s3 = 0.1 + mrnd() * (0.22 + d / 130);
    v.set(Math.cos(a) * d, s3 * 0.3, Math.sin(a) * d); q.setFromEuler(e.set(mrnd() * 3, mrnd() * 3, mrnd() * 3)); sc.set(s3, s3 * (0.6 + mrnd() * 0.4), s3 * (0.8 + mrnd() * 0.5));
    rocks.setMatrixAt(i, m4.compose(v, q, sc)); rocks.setColorAt(i, c.setHSL(0.1, 0.03, 0.3 + mrnd() * 0.2));
  }
  rocks.castShadow = true; rocks.receiveShadow = true; M.add(rocks);
  // craters everywhere, big and small: nothing wears them away (no wind, no rain)
  const rimM = new THREE.MeshStandardMaterial({ color: 0x9c9b97, roughness: 1 }), pitM = new THREE.MeshStandardMaterial({ color: 0x74736f, roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const a = mrnd() * Math.PI * 2, d = 13 + mrnd() * 120, r = 1.2 + mrnd() * (2 + d / 18), x = Math.cos(a) * d, z = Math.sin(a) * d;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.15, 8, 36), rimM); rim.rotation.x = -Math.PI / 2; rim.scale.z = 0.35; rim.position.set(x, 0.05, z); rim.receiveShadow = rim.castShadow = true; M.add(rim);
    const pit = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 30), pitM); pit.rotation.x = -Math.PI / 2; pit.position.set(x, 0.02, z); M.add(pit);
  }
  const hillM = new THREE.MeshStandardMaterial({ color: 0x8a8984, roughness: 1, flatShading: true });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + mrnd() * 0.3, d = 170 + mrnd() * 60;
    const h = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hillM); h.scale.set(30 + mrnd() * 40, 3 + mrnd() * 5, 25 + mrnd() * 25); h.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); M.add(h); }
  // footprints: on the Moon they can last for millions of years
  const fpGeo = new THREE.CircleGeometry(1, 12); fpGeo.rotateX(-Math.PI / 2); fpGeo.scale(0.09, 1, 0.16);
  moonG.prints = new THREE.InstancedMesh(fpGeo, new THREE.MeshStandardMaterial({ color: 0x55544f, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 400);
  moonG.prints.count = 0; moonG.laid = 0; M.add(moonG.prints);
}
const fade = document.createElement('div');
Object.assign(fade.style, { position: 'fixed', inset: '0', background: '#2a1a12', opacity: '0', pointerEvents: 'none', zIndex: '1' });
(stage.parentNode || document.body).insertBefore(fade, stage.nextSibling);
let dustI = 0;
function kickDust(r) {
  const d = mars.dust[dustI++ % mars.dust.length], a = prnd() * Math.PI * 2;
  d.life = 1; d.a = a; d.v = r; d.m.visible = true; d.m.position.set(Math.cos(a) * 1.5, 0.4, Math.sin(a) * 1.5);
  d.vy = 1.6 + prnd() * 1.4; d.tt = 0;
}
const onMoon = () => mars.where === 'moon';
const groundScene = () => onMoon() ? moonG.scene : mars.scene;
function printAt(w) {                              // two boot prints side by side: on the Moon they hop with both feet
  const g = moonG, m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(_up, w.a.rotation.y), sc = new THREE.Vector3(1, 1, 1);
  for (const sx of [-1, 1]) {
    _p.set(Math.cos(w.a.rotation.y) * sx * 0.13, 0.012, -Math.sin(w.a.rotation.y) * sx * 0.13).add(w.pos); _p.y = 0.012;
    g.prints.setMatrixAt(g.laid % 400, m4.compose(_p, q, sc)); g.laid++;
  }
  g.prints.count = Math.min(400, g.laid); g.prints.instanceMatrix.needsUpdate = true;
}
const _up = new THREE.Vector3(0, 1, 0), _p = new THREE.Vector3();

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
// ---------- meteors on the Moon's ground (Jasper's idea, space/storm.js) ----------
// S.meteorStorm: Jasper pressed Meteors. Two buttons say what the astronauts do about it: stuck, or fight.
let storm = null, team = { rel: false }, actK = 0;
const theStorm = () => storm || (storm = makeStorm(moonG.scene, glowTex));
const stormAct = () => !(onMoon() && S.meteorStorm && mars.phase === 'ground') ? null : S.on.fight ? 'fight' : S.on.stuck ? 'stuck' : null;
const POST = [[3.0, 4.9], [4.0, 2.7]];              // where they stand: beside the nose, with a clear view of the sky
function stopActs() { for (const [id, l] of [['stuck', 'Astronauts stuck'], ['fight', 'Fight meteors']]) if (S.on[id]) { S.on[id] = false; markOff(l); } }
function meteorButton() {                          // Meteors pressed on the Moon: start the storm, or stop it
  S.meteorStorm = !S.meteorStorm; if (!S.meteorStorm) stopActs();
  say(S.meteorStorm ? 'Meteors! They come down far away, on the other side of Skyrender' : 'No more meteors. The sky is quiet', 3);
}
function stormButton(id) {                         // Astronauts stuck, or Fight meteors: one or the other
  const other = id === 'stuck' ? 'fight' : 'stuck';
  if (S.on[id] && S.on[other]) { S.on[other] = false; markOff(other === 'fight' ? 'Fight meteors' : 'Astronauts stuck'); }
  if (S.on[id] && !S.on.astro) { S.on.astro = true; const b = document.querySelector('#acts button[data-id="astro"]'); if (b) b.setAttribute('aria-pressed', 'true'); }
  if (id === 'stuck') say(S.on.stuck ? 'A big one is coming down, far away. Watch the dust!' : 'Here comes help!', 2.6);
  else say(S.on.fight ? 'Astronauts to the rescue! Bump those rocks away' : 'Good work. Back to studying the Moon', 2.6);
}
function makeLauncher(w) {                         // it rides behind the backpack and slides up onto the shoulder
  const g = new THREE.Group(), tube = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.15, 16).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd9d6cc, roughness: 0.6 }));
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.1, 16).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7a2430, roughness: 0.6 })); ring.position.z = 0.5;
  g.add(tube, ring); w.body.add(g); w.tube = g;
}
const HELD = ['stuck', 'pop', 'pull'];             // modes that finish before an astronaut can head back inside
function runActs(w, i, dt, act, side, next) {      // the storm modes; returns how far the body is off the ground
  const other = walkers[1 - i]; let bob = 0;
  w.work += dt;
  if (w.mode === 'fight') {
    if (!w.tube) makeLauncher(w);
    w.tubeK = THREE.MathUtils.clamp((w.tubeK || 0) + dt / 0.7 * (act === 'fight' ? 1 : -1), 0, 1);
    const k = sm(w.tubeK); w.tube.visible = w.tubeK > 0; w.tube.position.set(-0.36, 0.98 + 0.42 * k, -0.52 + 0.62 * k); w.tube.rotation.x = -1.57 + 1.2 * k;
    w.kick = Math.max(0, (w.kick || 0) - dt * 1.6);
    w.a.rotation.y = Math.atan2(-side * 9, -20);   // toward where the rocks come from
    w.body.rotation.x = -0.22 * sm(w.kick);
    limbs(w, sx => [sx > 0 ? 0.3 * k : -0.45 * k, sx > 0 ? 0.3 * k : 0.5 * k, -1.25 * k - 0.1, sx < 0 ? -1.25 * k : -0.75 * k]);
    bob = -0.08 * k;
    if (act === 'fight' && k > 0.98 && w.work > 1.6 + i * 1.1) { w.tube.localToWorld(_v.set(0, 0, 0.7)); if (fire(storm, _v)) { w.kick = 1; w.work = i * 1.1 - 0.4; } }
    if (act !== 'fight' && w.tubeK <= 0) { w.body.rotation.x = 0; next(w); }
  } else if (w.mode === 'stuckWait') {
    w.a.rotation.y = Math.atan2(-9 - w.pos.x, 15 - w.pos.z);
    limbs(w, sx => [0, 0.1, sx > 0 ? -2.4 : -0.5, -0.5]);                                       // points up at it
    if (act !== 'stuck') next(w);
    else if (other.mode === 'stuckWait' && !storm.striking && !storm.buried) strike(storm, walkers.map(x => x.pos));
    else if (storm.buried) { w.mode = 'stuck'; w.work = 0; w.pileK = 0; }
  } else if (w.mode === 'stuck') {
    w.pileK = Math.min(1, w.pileK + dt / 0.7); pile(storm, i, w.pos, w.pileK);
    const s = Math.sin(w.work * 5 + i), tug = Math.max(0, Math.sin(w.work * 1.7 + i * 2));       // wiggle, then a big tug
    const reach = i === 0 && other.mode === 'pull';
    if (reach) { _v.copy(other.pos).sub(w.pos); w.a.rotation.y = Math.atan2(_v.x, _v.z); }
    w.body.rotation.z = s * 0.13; w.body.rotation.x = reach ? 0.25 : 0.12 * tug; bob = -0.1 + 0.05 * tug;
    limbs(w, sx => [-0.05, 0.1, reach ? -1.5 : -0.5 - 0.9 * tug + s * sx * 0.5, reach ? -0.1 : -0.6]);
    if (act !== 'stuck') team.rel = true;
    if (!team.rel) w.freeT = 0;
    else {
      w.freeT = (w.freeT || 0) + dt;
      const alone = other.mode === 'in' || (other.mode !== 'stuck' && other.mode !== 'pop' && other.mode !== 'pull' && other.dest !== 'pull');
      // the second astronaut wiggles loose, then pulls the commander out
      if (i === 1 ? w.freeT > 1.8 : (other.mode === 'pull' && other.work > 2.9) || (alone && w.freeT > 1.8)) {
        w.mode = 'pop'; w.work = 0; w.from.copy(w.pos); w.to.copy(w.pos); w.to.x += side * 0.9; w.to.z += i ? -0.6 : 0.4; w.body.rotation.x = w.body.rotation.z = 0; sfx.lock();
      }
    }
  } else if (w.mode === 'pop') {                   // out it comes: a slow, floaty hop, because the Moon pulls so gently
    const u = Math.min(1, w.work / 1.6); w.pos.copy(w.from).lerp(w.to, u); w.pos.y = 0; bob = Math.sin(u * Math.PI) * 0.9;
    pile(storm, i, w.from, Math.max(0.2, 1 - u * 2));
    limbs(w, () => [-0.6, 0.9, -2.0, -0.4]);
    if (u >= 1) {
      if (i === 1 && other.mode === 'stuck') { w.mode = 'walk'; w.dest = 'pull'; w.to.copy(other.pos); w.to.x += side * 0.5; w.to.z -= 1.1; }
      else next(w);
    }
  } else if (w.mode === 'pull') {                  // three heaves, hand in hand
    _v.copy(other.pos).sub(w.pos); w.a.rotation.y = Math.atan2(_v.x, _v.z);
    const h = Math.max(0, Math.sin(w.work * Math.PI * 2 / 1.1 - 0.6));
    w.body.rotation.x = -0.4 * h; limbs(w, sx => [0.2 * h - sx * 0.2, 0.25, -1.5, -0.1]);
    if (other.mode !== 'stuck') { if (w.doneT === undefined) w.doneT = w.work; if (w.work > w.doneT + 1.2) { w.doneT = undefined; w.body.rotation.x = 0; next(w); } }
  }
  if (!walkers.some(x => x.mode === 'stuck')) { if (team.rel) { team.rel = false; storm.buried = false; } }
  return bob;
}
function limbs(w, k) {                             // k: { hip, knee, arm, elbow } per side, from a pose
  for (const sx of [-1, 1]) { const l = w.L[sx], p = k(sx); l.hip.rotation.set(p[0], 0, sx * 0.08); l.kn.rotation.set(p[1], 0, 0); l.sh.rotation.set(p[2], 0, sx * 0.22); l.el.rotation.set(p[3], 0, 0); }
}
function runWalkers(dt, want) {
  rig.sideDoor.getWorldPosition(doorW);
  let out = 0;
  const act = want ? stormAct() : null;
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
    const next = w2 => { w2.mode = 'walk'; w2.dest = null; w2.to.copy(spotAt(w2.spot, w2.to)); };
    if (!want && w.mode !== 'back' && w.mode !== 'hopIn' && !HELD.includes(w.mode) && w.dest !== 'pull' && !(w.mode === 'fight' && w.tubeK > 0)) { w.mode = 'back'; w.dest = null; w.body.rotation.set(0, 0, 0); w.to.copy(base); }
    if ((w.mode === 'walk' || w.mode === 'work') && w.dest !== 'pull' && (w.dest || null) !== act) {      // called to the storm, or done with it
      if (act) { w.mode = 'walk'; w.dest = act; w.to.set(side * POST[i][0], 0, POST[i][1]); w.rock.visible = false; if (w.flash) w.flash.emissiveIntensity = 0; } else next(w);
    }
    let bob = 0;
    if (w.mode === 'hopOut' || w.mode === 'hopIn') {
      // low gravity: a slow, floaty hop between the door and the ground
      w.u = Math.min(1, w.u + dt / 1.5);
      w.pos.copy(w.from).lerp(w.to, w.u); w.pos.y += Math.sin(w.u * Math.PI) * (onMoon() ? 1.6 : 1.1);
      limbs(w, sx => [-0.6, 0.9, -1.1, -0.4]);
      if (w.u >= 1) { if (w.mode === 'hopOut') { w.mode = 'walk'; w.to.copy(spotAt(w.spot, w.to)); } else { w.mode = 'in'; w.wait = i * 1.3; } }
    } else if (w.mode === 'walk' || w.mode === 'back') {
      // a bouncy lope: on Mars you weigh less than half as much, so every step floats
      _v.copy(w.to).sub(w.pos); _v.y = 0; const d = _v.length();
      if (d < 0.08) {
        if (w.mode === 'back') { w.mode = 'hopIn'; w.u = 0; w.from.copy(w.pos); w.to.copy(doorW); }
        else { w.mode = w.dest === 'stuck' ? 'stuckWait' : w.dest || 'work'; if (w.dest === 'pull') w.dest = null; w.work = 0; }
      } else {
        w.pos.addScaledVector(_v.normalize(), Math.min(d, dt * 1.3));
        w.a.rotation.y = Math.atan2(_v.x, _v.z);
        if (onMoon()) {                            // on the Moon you weigh one sixth as much: hop like a bunny, both feet together
          const s0 = Math.sin(w.ph); w.ph += dt * 3.4; const s = Math.sin(w.ph);
          bob = Math.abs(s) * 0.5;
          if (s0 * s < 0) printAt(w);              // land, and leave footprints
          limbs(w, () => { const k = 1 - Math.abs(s); return [-0.3 - 0.35 * k, 0.25 + 0.6 * k, -0.5 + 0.2 * Math.abs(s), -0.5]; });
        } else {
          w.ph += dt * 5.2; bob = Math.abs(Math.sin(w.ph)) * 0.28;
          limbs(w, sx => { const s = Math.sin(w.ph + (sx > 0 ? 0 : Math.PI)); return [-0.25 - s * 0.45, 0.35 + Math.max(0, s) * 0.5, s * 0.5 - 0.15, -0.35]; });
        }
      }
      w.pos.y = 0;
    } else if (w.mode !== 'work') {
      bob = runActs(w, i, dt, act, side, next);
    } else {
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

// ---------- the rover: it already lives on Mars (Jasper's next idea, space/rover.js) ----------
const rover = makeRover(mars.scene, glowTex);
const watchAt = new THREE.Vector3();
let roverK = 0;                                     // the camera leans toward the rover while it works

// ---------- Skyfly turns into a rover (Jasper's idea: "Skyfly turns into a rover on mars") ----------
// On the ground on Mars or the Moon, the plane changes into Skyfly the rover (Jasper's next change: "he's going to be
// a real rover"): the back half flips forward into two side pods, the wings fold into a flat top deck, six wheels drop
// down, and a chrome pole stretches up into a mast with the nose on top as the camera head. It's the rig's 'rover'
// shape, so every part is the toy's own. Then it drives a slow loop around the landing spot and back. Pressing again
// drives home first, then changes back into the plane.
const SKY_R = 4.5, TAU = Math.PI * 2;
const sky = { plan: null, t: 0, a: 0, v: 0, driveT: 0, wheels: null, laid: { mars: 0, moon: 0 }, pan: Math.PI, goT: 0, snapT: -1, shot: false, nextSnap: 5, photos: 0, n: { mars: 0, moon: 0 }, target: null };
const skyTracks = {};
for (const [k, sc] of [['mars', mars.scene], ['moon', moonG.scene]]) {
  const g = new THREE.PlaneGeometry(0.5, 0.12); g.rotateX(-Math.PI / 2);
  const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: k === 'moon' ? 0x5f5e5a : 0x8a4227, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 900);
  m.count = 0; sc.add(m); skyTracks[k] = m;
}
const skyPose = () => ({ x: SKY_R - SKY_R * Math.cos(sky.a), z: SKY_R * Math.sin(sky.a), yaw: sky.a });
function skyStamp() {                              // tire tracks under Skyfly's big wheels
  const m = skyTracks[mars.where], n = sky.laid, k = mars.where, m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(_up, sky.a), sc = new THREE.Vector3(1, 1, 1);
  const { x, z } = skyPose(), c = Math.cos(sky.a), s2 = Math.sin(sky.a);
  for (const wl of sky.wheels) {
    _p.set(x + wl.x * c + wl.z * s2, 0.014, z - wl.x * s2 + wl.z * c);
    m.setMatrixAt(n[k] % 900, m4.compose(_p, q, sc)); n[k]++;
  }
  m.count = Math.min(900, n[k]); m.instanceMatrix.needsUpdate = true;
}
let lastStampA = 0, skyK = 0;                      // skyK: the camera pulls back while Skyfly drives
function runSkyfly(dt) {
  const want = !!S.on.skyfly && mars.active && mars.phase === 'ground';
  const inside = walkers.every(w => w.mode === 'in');
  if (want && !inside && S.on.astro) { S.on.astro = false; markOff('Astronauts'); }
  if (want && !sky.plan) for (const id of ['door', 'gear', 'lights']) if (S.on[id]) { S.on[id] = false; const b = document.querySelector('#acts button[data-id="' + id + '"]'); if (b) b.setAttribute('aria-pressed', 'false'); }
  const ready = inside && (S.blend.door || 0) < 0.01 && (S.blend.gear || 0) < 0.01;   // door shut and wheels down first
  sky.v = 0;
  if (want && (sky.plan || ready)) {
    if (!sky.plan) { sky.plan = planMorph(rig, 6, 0); sky.t = 0; sky.driveT = 0; sky.goT = 0; sky.nextSnap = 5; sky.snapT = -1; sfx.whirr(Math.min(sky.plan.T, 2.5)); }
    if (sky.t < sky.plan.T) step(dt);
    else if (!runSnap(dt)) {
      if (!sky.wheels) measureWheels();
      sky.driveT += dt; sky.v = Math.min(1.2, (sky.goT += dt) * 0.8); sky.a += sky.v * dt / SKY_R;
    }
  } else if (sky.plan) {
    sky.snapT = -1; sky.shot = false;
    if (sky.a > 0) {                               // drive back round to the landing spot first
      const goal = Math.ceil(sky.a / TAU - 1e-9) * TAU, left = (goal - sky.a) * SKY_R;
      sky.v = Math.min(1.2, left * 0.6 + 0.2); sky.a = Math.min(goal, sky.a + sky.v * dt / SKY_R);
      if (sky.a >= goal) { sky.a = 0; lastStampA = 0; }
    } else step(-dt);                              // then change back into the plane
  }
  if (sky.v > 0 && Math.abs(sky.a - lastStampA) * SKY_R > 0.3) { lastStampA = sky.a; skyStamp(); }
  S.groundDrive = sky.v;
  skyK += ((sky.plan ? 1 : 0) - skyK) * Math.min(1, dt * 0.8);
  if (sky.plan) poseRig(rig, sky.plan, sky.t, ease);
  aim(dt);
  if (sky.plan && sky.t <= 0) sky.plan = null;
}

// ---------- Skyfly's camera ----------
// Jasper's change: "Instead of skyfly being a tractor on mars it's a rover takeing pictures of it". Every few turns of
// the loop Skyfly stops, the camera head on top of its mast turns to look at something, and click.
const SNAP = {
  mars: [{ at: () => rover.pos, up: 0.6, say: 'Click! Skyfly takes a picture of the rover. Hello, friend!' },
    { at: () => rover.oldAt, up: 0, say: 'Click! A picture of the old rover, asleep under the dust' },
    { at: () => _t.set(26, 4, -34), up: 0, say: 'Click! The red hills. A picture takes minutes to get from Mars to Earth' }],
  moon: [{ at: () => _t.set(-300 * Math.sin(1.42), 27, -300 * Math.cos(1.42)), up: 0, say: 'Click! A picture of Earth. That\'s home!' },
    { at: () => _t.set(24, 2, -30), up: 0, say: 'Click! The gray hills. From the Moon, a picture gets to Earth in about one second' }] };
const _t = new THREE.Vector3(), _tl = new THREE.Vector3();
function runSnap(dt) {                             // true while Skyfly is stopped for a picture
  if (sky.snapT < 0) {
    if (sky.driveT < sky.nextSnap) return false;
    const L = SNAP[mars.where]; sky.target = L[sky.n[mars.where]++ % L.length]; sky.snapT = 0; sky.shot = false;
  }
  sky.snapT += dt;
  if (sky.snapT >= 1.8 && !sky.shot) { sky.shot = true; takePhoto(); }
  if (sky.snapT > 4) { sky.snapT = -1; sky.nextSnap = sky.driveT + 8; sky.goT = 0; }
  return true;
}
function aim(dt) {                                 // the camera head turns to face what it takes a picture of
  if (!sky.plan || sky.t < sky.plan.T) { sky.pan = Math.PI; return; }
  const head = rig.head;
  let want = Math.PI;                              // facing forward
  if (sky.snapT >= 0 && sky.target) {
    flyer.updateMatrixWorld(true);
    head.parent.worldToLocal(_tl.copy(sky.target.at()));
    want = Math.atan2(-(_tl.x - head.position.x), -(_tl.z - head.position.z));
    while (want - sky.pan > Math.PI) want -= Math.PI * 2;
    while (want - sky.pan < -Math.PI) want += Math.PI * 2;
  }
  sky.pan += (want - sky.pan) * Math.min(1, dt * 2.5);
  head.rotation.y = sky.pan;
}
function takePhoto() {                             // click!
  sky.photos++; sfx.click();
}
function step(d) {                                 // play the change forward or backward, with the soft clacks
  const t0 = sky.t; sky.t = Math.max(0, Math.min(sky.plan.T, sky.t + d));
  if (sky.plan.locks.some(L => (t0 < L && sky.t >= L) || (t0 > L && sky.t <= L))) sfx.lock();
  if (d < 0 && t0 === sky.plan.T) sfx.whirr(Math.min(sky.plan.T, 2.5));
}
function measureWheels() {                         // where Skyfly's wheels touch the ground, measured from the toy itself
  flyer.updateMatrixWorld(true);
  const v = new THREE.Vector3(), list = [];
  for (const d of rig.drivers) { d.w.getWorldPosition(v); flyer.worldToLocal(v); if (v.y < 0.9) list.push({ x: v.x, z: v.z }); }
  sky.wheels = list.length ? list : [{ x: -1, z: 0 }, { x: 1, z: 0 }];
}
const skyStepLabel = () => { let l = ''; for (const st of sky.plan.steps) if (st.at <= sky.t) l = st.label; return l; };

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
  if (mars.active || mars.phase) { say(onMoon() ? 'Take off from the Moon first' : 'Take off from Mars first', 2.4); return; }
  if (to) return;
  if (id === at) { say(id === 'earth' ? 'We\'re right here at Earth. Pick another planet!' : 'We\'re already at ' + BY[id].name, 2.4); return; }
  to = id; travelT = 0; sfx.whirr(1.2);
}
function takeOff() { mars.phase = 'up'; mars.t = 0; stopActs(); for (const [id, l] of [['astro', 'Astronauts'], ['rover', 'Rover'], ['skyfly', 'Skyfly rover']]) { S.on[id] = false; markOff(l); } }
function landAction(where) {
  if (to) return;
  if (mars.active && mars.phase === 'ground') { takeOff(); return; }
  if (mars.phase) return;
  const go = w => {
    mars.where = w;
    if (S.astroK > 0.02 || S.on.astro) { S.on.astro = false; markOff('Astronauts'); waitAstro = true; say('Astronauts, back inside! Then down to ' + (w === 'moon' ? 'the Moon' : 'Mars'), 2.6); }
    mars.phase = 'down'; mars.t = 0;
  };
  if (where === 'moon') { if (at === 'earth') go('moon'); return; }
  if (at === 'earth') { S.on.space = false; markOff('Fly to space'); say('Down we go, home to Jasper Junction', 2.6); return; }
  if (at === 'mars') go('mars');
}
function markOff(label) { for (const b of document.querySelectorAll('#acts button')) if (b.textContent === label) b.setAttribute('aria-pressed', 'false'); }

function setActive(on) {
  if (on === mars.active) return;
  mars.active = on;
  if (!on) { space.parent.add(flyer); return; }    // Skyrender itself goes down to Mars or the Moon, and back
  const sc = groundScene(); sc.add(flyer);
  for (const w of walkers) sc.add(w.a);
  for (const d of mars.dust) { sc.add(d.m); d.m.material.color.setHex(onMoon() ? 0x9b9a95 : 0xc98a62); }
}

// Every frame (sp: 0 in the sky, 1 in space), right after the sky and before the Moon trip
function runPlanets(dt, sp) {
  factClock += dt;
  // anything that means "go home" (Fly to space off, or a new mode picked) takes Skyrender back to Earth first
  const wantHome = S.plan.to !== 0 || !S.on.space || S.pending !== null;
  if (wantHome && !to) {
    if (mars.active && mars.phase === 'ground') takeOff();
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
      if (S.on.gear) { S.on.gear = false; const b = document.querySelector('#acts button[data-id="gear"]'); if (b) b.setAttribute('aria-pressed', 'false'); }   // wheels down to land
      fade.style.opacity = String(t < 1.4 ? t / 1.4 : Math.max(0, 1 - (t - 1.4) / 1.2));
      if (t >= 1.4) setActive(true);
      mars.y = 10 * (1 - ease(c01((t - 1.4) / 3.8)));
      if (mars.active && mars.y < 3.5 && mars.y > 0.02 && prnd() < dt * 18) kickDust(1 + (3.5 - mars.y));
      if (t >= 5.2) { mars.phase = 'ground'; mars.y = 0; mars.landedT = 0; say(onMoon() ? 'Touchdown on the Moon!' : 'Touchdown on Mars!', 2.6); sfx.lock(); }
    }
  } else if (mars.phase === 'ground') {
    mars.landedT += dt;
  } else if (mars.phase === 'up') {
    const outNow = walkers.some(w => w.mode !== 'in') || !!sky.plan;   // astronauts in, and Skyfly back into the plane
    if (!outNow) {
      mars.t += dt; const t = mars.t;
      mars.y = 12 * ease(c01(t / 2.6));
      if (mars.y < 4 && prnd() < dt * 18) kickDust(2 + mars.y);
      fade.style.opacity = String(t < 2 ? 0 : t < 3 ? t - 2 : Math.max(0, 1 - (t - 3) / 1.2));
      if (t >= 3) { setActive(false); mars.y = 0; }
      if (t >= 4.2) { mars.phase = null; fade.style.opacity = '0'; arrivedT = 0; }
    }
  }
  S.onGround = mars.active;
  for (const d of mars.dust) {
    if (d.life <= 0) continue;
    if (onMoon()) {                                // no air: each grain flies in an arc and falls straight back, no cloud
      d.tt += dt; const y = 0.4 + d.vy * d.tt - 0.8 * d.tt * d.tt;
      d.m.position.x += Math.cos(d.a) * d.v * dt * 3; d.m.position.z += Math.sin(d.a) * d.v * dt * 3; d.m.position.y = Math.max(0, y);
      d.m.scale.setScalar(0.16); d.m.material.opacity = 0.9;
      if (y <= 0) { d.life = 0; d.m.visible = false; }
      continue;
    }
    d.life -= dt * 0.55; const age = 1 - d.life;
    d.m.position.x += Math.cos(d.a) * d.v * dt * 2; d.m.position.z += Math.sin(d.a) * d.v * dt * 2; d.m.position.y += dt * 0.5;
    d.m.scale.setScalar(0.5 + age * 2.4); d.m.material.opacity = 0.7 * Math.min(1, age * 5) * Math.max(0, d.life);
    if (d.life <= 0) d.m.visible = false;
  }
  if (!S.on.space || at !== 'earth') S.meteorStorm = false;
  if (S.on.skyfly || !S.on.astro) stopActs();       // astronauts inside: the storm buttons rest
  if (mars.active && onMoon() && (S.meteorStorm || storm)) runStorm(theStorm(), dt, !!S.meteorStorm);
  if (storm && storm.buried && !walkers.some(w => w.mode === 'stuck' || w.mode === 'stuckWait')) storm.buried = false;
  actK += ((mars.active && (stormAct() || walkers.some(w => HELD.includes(w.mode))) ? 1 : 0) - actK) * Math.min(1, dt * 0.8);
  const out = mars.active ? runWalkers(dt, S.on.astro && mars.phase === 'ground' && !sky.plan) : 0;
  runSkyfly(dt);
  if (mars.active && !onMoon()) {                   // the rover watches Skyrender land, then the astronauts
    const w = walkers.find(w2 => w2.mode !== 'in');
    if (w) watchAt.copy(w.pos).setY(1); else { const sp2 = skyPose(); watchAt.set(sp2.x, mars.y + 1.2, sp2.z); }
    runRover(rover, dt, !!S.on.rover && mars.phase === 'ground', watchAt);
  }
  roverK += ((mars.active && !onMoon() && S.on.rover && mars.phase === 'ground' ? 1 : 0) - roverK) * Math.min(1, dt * 0.8);
  window.__planets = { at, to, travel: travelT, mars: mars.phase || (mars.active ? 'ground' : null), onMars: mars.active && !onMoon(), onMoon: mars.active && onMoon(), walkersOut: out,
    skyfly: { on: !!sky.plan, t: sky.t, T: sky.plan ? sky.plan.T : 0, a: sky.a, v: sky.v, tracks: sky.laid[mars.where], cam: sky.plan && sky.t >= sky.plan.T ? 1 : 0, photos: sky.photos, snap: sky.snapT }, prints: moonG.laid,
    storm: { on: !!S.meteorStorm, hits: storm ? storm.hits : 0, bumps: storm ? storm.bumps : 0, fired: storm ? storm.fired : 0, modes: walkers.map(w => w.mode), piles: walkers.map(w => w.pileK || 0), falling: storm ? storm.rocks.filter(r => r.mode === 'fall').length : 0,
      nearest: storm ? Math.min(...storm.rocks.filter(r => r.mode !== 'idle').map(r => Math.min(...walkers.map(w => r.to.distanceTo(w.pos)))), 99) : 99 },
    working: walkers.filter(w => w.mode === 'work').length,
    rover: { mode: rover.mode, stop: rover.stop, zaps: rover.zaps, spark: rover.spark.material.opacity, tubes: rover.tubes, tracks: rover.laid, arm: rover.armK } };
}

// The caption while traveling, at another planet, or on Mars (empty: the plane's own caption shows)
const MARS_WALK = ['Hop! On Mars you weigh less than half as much, so every step is bouncy', 'The commander scoops up Mars rocks to study back home', 'Click! A picture of the commander at work on Mars'];
const MARS_GROUND = ['On Mars! The sky is butterscotch because of red dust in the air', 'Sunsets on Mars are blue', 'Those two little moons in the sky are Phobos and Deimos', 'Tap Astronauts to go out and study the rocks'];
const MOON_WALK = ['Hop hop! On the Moon you weigh one sixth as much, so astronauts hop like bunnies', 'Footprints on the Moon can last millions of years. No wind or rain wipes them away', 'The commander picks up Moon rocks to study back home', 'Click! A picture of the commander on the Moon'];
const MOON_FACTS = ['Twelve astronauts have walked on the Moon', 'Moon dust is as fine as flour, and it sticks to everything', 'A day on the Moon lasts about a month'];
const MOON_GROUND = ['On the Moon! The sky is black even in the daytime, because the Moon has no air', 'That\'s Earth up there. From the Moon, Earth stays in the same spot in the sky', 'Shadows on the Moon are extra dark. There\'s no air to spread the light around', 'Tap Astronauts to go out and explore'];
const SKY_DRIVE = {
  mars: ['Skyfly, Mars rover! Six wheels, a flat top, and a camera up high on a mast, like a real rover', 'Engines need oxygen to burn fuel. Mars air has almost none, so Skyfly runs on batteries', 'Real rovers have cameras low on the front too. They spot rocks before the wheels bump them', 'Real Mars rovers go slow and careful, slower than you walk', 'Look at Skyfly\'s tracks in the dust'],
  moon: ['Skyfly, Moon rover! Astronauts drove buggies on the Moon too, back in 1971 and 1972', 'There\'s no air at all on the Moon, so Skyfly runs on batteries, like the real Moon buggies', 'The real Moon buggies had wire wheels. Rubber tires could crack in the Moon\'s cold', 'Skyfly\'s tracks will stay on the Moon for a very long time. There\'s no wind to blow them away'] };
function skyCaption() {
  const place = onMoon() ? 'Moon' : 'Mars';
  if (S.on.skyfly && !sky.plan) return walkers.some(w => w.mode !== 'in') ? 'Astronauts, back inside! Then Skyfly can change' : 'Skyfly turns into a ' + place + ' rover!';
  if (!sky.plan) return '';
  if (!S.on.skyfly) return sky.a > 0 ? 'Skyfly drives back to the landing spot' : 'Skyfly turns back into the plane';
  if (sky.t < sky.plan.T) return sky.t < 1.2 ? 'Skyfly turns into a ' + place + ' rover!' : skyStepLabel() || 'Skyfly turns into a ' + place + ' rover!';
  if (sky.snapT >= 0 && sky.target) return sky.shot ? sky.target.say : 'Skyfly stops. The camera turns to look';
  const L = SKY_DRIVE[mars.where]; return L[Math.floor(sky.driveT / 6) % L.length];
}
const STORM = ['Meteors don\'t glow here. They only glow rushing through air, and the Moon has none', 'You can\'t hear them land. But you can feel the ground shake through your boots', 'This is how the Moon got all its craters', 'Dust flies out in arcs and drops straight back. No air to make a cloud', 'Tap Fight meteors or Astronauts stuck'];
const FIGHT = ['Astronauts launch little bumpers to knock the rocks off course', 'In 2022 a real spacecraft named DART bumped an asteroid, and its path changed', 'A small bump is enough, if you do it early', 'The launcher pushes back when it fires, so they stand with one foot forward'];
const STUCK = ['Stuck! Moon dust up to their knees. Tap again to help them out', 'The rock hit far away. With no air to slow it, Moon dust flies a long, long way', 'Moon dust is sharp and grabby, like tiny bits of broken glass', 'On Apollo 15 a drill got stuck in the Moon. Two astronauts had to pull it out together'];
function stormCaption() {
  const m = walkers.map(w => w.mode), k = Math.floor(mars.landedT / 5);
  if (m[1] === 'pull') return m[0] === 'stuck' ? 'Hold on tight! One, two, three, pull!' : 'Free! Teamwork did it';
  if (m.includes('pop') || walkers[1].dest === 'pull') return 'One is out! Now go help the commander';
  if (m.includes('stuck')) return team.rel ? 'Wiggle, wiggle. The boots are coming loose' : STUCK[k % STUCK.length];
  if (m.includes('stuckWait')) return 'A big one is coming down, far away. Watch the dust!';
  if (m.includes('fight') && S.on.fight) return storm.bumps ? FIGHT[k % FIGHT.length] : FIGHT[0];
  return S.meteorStorm && !(k % 2) ? STORM[(k >> 1) % STORM.length] : '';
}
function planetCaption() {
  if (S.plan.to !== 0) return '';
  if (to) return to === 'earth' ? 'Flying home to Earth!' : travelT < 0.75 ? 'Flying to ' + BY[to].name + '! ' + BY[to].trip : BY[to].arrive;
  if (mars.phase === 'down') return waitAstro ? '' : mars.t < 1.4 ? (onMoon() ? 'Landing on the Moon!' : 'Landing on Mars!') : onMoon() ? (mars.y < 3.5 ? 'Moon dust flies out and falls straight back down. No air to make a dust cloud' : 'No air on the Moon, so only rockets can slow Skyrender down') : 'Down through the thin Mars air. Rockets slow Skyrender down';
  if (mars.phase === 'up') return sky.plan ? (sky.a > 0 ? 'Skyfly drives back. Then it turns into the plane and up we go' : 'Skyfly turns back into the plane. Then up we go') : walkers.some(w => w.mode !== 'in') ? 'Astronauts, back inside! Then up we go' : 'Rockets on! Back up to space';
  if (mars.active) {
    const sc = skyCaption(); if (sc) return sc;
    if (onMoon()) { const c = stormCaption(); if (c) return c; }
    if (S.on.rover && !onMoon()) { const c = roverCaption(rover); if (c) return c; }
    const k = Math.floor(mars.landedT / 6), [walk, facts, ground] = onMoon() ? [MOON_WALK, MOON_FACTS, MOON_GROUND] : [MARS_WALK, BY.mars.facts, MARS_GROUND];
    if (walkers.some(w => w.mode !== 'in')) return k % 2 ? walk[(k >> 1) % walk.length] : facts[(k >> 1) % facts.length];
    return mars.landedT < 3 ? (onMoon() ? 'Touchdown on the Moon!' : 'Touchdown on Mars!') : ground[k % ground.length];
  }
  if (S.planeAlt < 600 || !S.on.space) return '';
  const p = BY[at];
  if (at === 'earth') return arrivedT > 4 && Math.floor(arrivedT / 7) % 3 === 1 ? 'All eight planets, in a row from the Sun. Tap one to fly there' : '';
  if (arrivedT < 4) return p.arrive;
  const f = Math.floor((arrivedT - 4) / 6);
  return p.facts[f % p.facts.length];
}
// What the buttons should show: in space, the planet row; Land at Earth and Mars, Take off on Mars
const planetUI = () => ({ at, to, landed: mars.active && mars.phase === 'ground', busy: !!mars.phase && mars.phase !== 'ground', canLand: !to && !mars.phase && (at === 'earth' || at === 'mars'),
  where: mars.active || mars.phase ? mars.where : null, skyfly: !!sky.plan || !!S.on.skyfly, storm: !!S.meteorStorm });
const marsView = () => { const p = skyPose(); return { on: mars.active, y: mars.y, scene: groundScene(), rk: Math.max(roverK, actK), rx: actK > roverK ? 3.4 : rover.pos.x, rz: actK > roverK ? 5 : rover.pos.z,
  follow: walkers.some(w => w.mode !== 'in') ? 0.3 : sky.plan ? 0.2 : 0.5, sk: skyK, fx: sky.plan ? p.x : 0, fz: sky.plan ? p.z : 0, yaw: sky.plan ? p.yaw : 0 }; };

wear('earth');
export { PLANETS, goPlanet, landAction, marsView, meteorButton, planetCaption, planetUI, runPlanets, stormButton };
