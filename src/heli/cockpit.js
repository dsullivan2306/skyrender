import * as THREE from 'three';
import { renderer, camera, stage } from '../world/setup.js';
import { makePerson } from '../people/people.js';

// Inside the helicopter. The valley outside is the real one: the main scene is drawn from the nose, then this small
// scene (seats, windows, controls and crew) is drawn over it. Jasper has the pilot's seat, on the right, as in a real
// helicopter. Drag to look around, even behind at the crew. Functions only; heli.js builds it.
const M = (c, r = 0.8, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const SEAT = -0.46;                       // the pilot's seat: the right side is x below zero
const TALK = {
  copilot: ['Co-pilot: My stick moves when yours does. They are joined together!', 'Co-pilot: I read the map and watch the gauges for you, Captain.', 'Co-pilot: Look down by your feet. You can see the ground through the glass!'],
  chief: ['Crew chief: I look out the back and tell you the tail is clear.', 'Crew chief: Seat belts are on and the doors are shut, Captain.', 'Crew chief: I check every bolt on the blades before we fly.'],
  medic: ['Medic: I take care of people on the way to the hospital.', 'Medic: A helicopter can land where no car can go.', 'Medic: Smooth flying, Captain!']
};
// a flight suit and a helmet with a dark visor
function crewMember(suit, skin, hair, helmet = 0xf2f2ee) {
  const p = makePerson({ shirt: suit, pants: suit, skin, hair });
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.155, 18, 12, 0, Math.PI * 2, 0, 1.75), M(helmet, 0.35)); h.position.y = 1.11; p.add(h);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.27), M(0x7a2430)); stripe.position.set(0, 1.262, 0); p.add(stripe);
  const v = new THREE.Mesh(new THREE.SphereGeometry(0.158, 18, 8, Math.PI * 0.18, Math.PI * 0.64, 0.75, 0.55), M(0x22303a, 0.1, 0.4)); v.position.y = 1.11; p.add(v);
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.23), M(0x4a4f45)); vest.position.y = 0.8; p.add(vest);
  return p;
}
const sit = p => { p.userData.legs[0].rotation.x = p.userData.legs[1].rotation.x = -1.45; };

function buildCockpit() {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(62, 1, 0.04, 30);
  const hemi = new THREE.HemisphereLight(0xeef4f8, 0x55504a, 0.75), sun = new THREE.DirectionalLight(0xfff2dc, 0.7); sun.position.set(3, 6, 5); scene.add(hemi, sun);
  const add = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const dark = M(0x2b3034, 0.8), panelM = M(0x3a4046, 0.7), wall = M(0xd9d5ca, 0.85), frame = M(0x4a5056, 0.6), maroon = M(0x7a2430, 0.7), black = M(0x17191b, 0.7), steel = M(0x9aa0a6, 0.4, 0.6), seatM = M(0x4a3436, 0.9);
  const bar = (a, b, w, mat) => { const A = new THREE.Vector3(...a), C = new THREE.Vector3(...b), m = add(B(w, A.distanceTo(C), w), mat, 0, 0, 0); m.position.copy(A).add(C).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), C.clone().sub(A).normalize()); return m; };
  // floor, back wall, roof
  add(B(2.0, 0.06, 3.1), dark, 0, 0, -0.75); add(B(1.1, 0.06, 0.5), dark, 0, 0, 1.0);
  add(B(2.0, 1.9, 0.06), wall, 0, 0.95, -2.3);
  add(B(2.0, 0.07, 2.9), wall, 0, 1.86, -0.95);
  // doors and side windows
  for (const s of [1, -1]) {
    add(B(0.06, 0.72, 2.9), wall, s * 1.0, 0.36, -0.85); add(B(0.062, 0.08, 2.9), maroon, s * 0.998, 0.6, -0.85);
    add(B(0.06, 0.2, 2.9), wall, s * 1.0, 1.75, -0.85);
    for (const z of [0.52, -0.48, -0.66, -2.25]) add(B(0.07, 1.0, 0.1), wall, s * 1.0, 1.2, z);
    add(B(0.05, 0.05, 0.2), black, s * 0.95, 0.5, 0.1);                            // door handle
    // front corner posts, and the frame of the big windshield
    bar([s * 1.0, 0.62, 0.55], [s * 0.62, 0.5, 1.3], 0.06, frame);
    bar([s * 1.0, 1.72, 0.52], [s * 0.74, 1.62, 0.95], 0.06, frame); bar([s * 0.74, 1.62, 0.95], [s * 0.62, 0.5, 1.3], 0.055, frame);
    bar([s * 0.62, 0.5, 1.3], [s * 0.5, 0.02, 1.2], 0.05, frame);
  }
  bar([0, 1.66, 1.0], [0, 0.5, 1.36], 0.045, frame); bar([-0.74, 1.64, 0.97], [0.74, 1.64, 0.97], 0.06, frame); add(B(1.9, 0.06, 0.6), wall, 0, 1.79, 0.72).rotation.x = 0.22;
  bar([-0.62, 0.5, 1.3], [0.62, 0.5, 1.3], 0.05, frame); bar([-0.55, 0.02, 1.22], [0.55, 0.02, 1.22], 0.05, frame);
  // a faint shine on the glass
  const glass = new THREE.MeshBasicMaterial({ color: 0xcfe3ee, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const g1 = add(new THREE.PlaneGeometry(1.3, 1.2), glass, 0, 1.08, 1.16); g1.rotation.x = 0.3;

  // instrument panel, low and in the middle so you can see over it
  const panel = new THREE.Group(); panel.position.set(0, 0.68, 1.06); panel.rotation.x = -0.2; scene.add(panel);
  add(B(1.16, 0.36, 0.1), panelM, 0, 0, 0, panel); add(B(1.2, 0.03, 0.2), black, 0, 0.21, 0.03, panel);
  add(B(0.36, 0.62, 0.3), panelM, 0, -0.46, 0, panel);
  const gauges = [];
  const gauge = (x, y, w, h, draw) => { const c = document.createElement('canvas'); c.width = Math.round(w * 640); c.height = Math.round(h * 640); const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; const m = add(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }), x, y, -0.056, panel); m.rotation.y = Math.PI; gauges.push({ g: c.getContext('2d'), w: c.width, h: c.height, t, draw }); };
  const face = (g, w, h, title) => { g.fillStyle = '#14181b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#5a6268'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); g.fillStyle = '#e8e4d8'; g.font = '700 24px Karla, Arial, sans-serif'; g.textAlign = 'center'; if (title) g.fillText(title, w / 2, 30); };
  // blade speed: green is safe to fly, like the marks on a real gauge
  gauge(-0.4, 0, 0.3, 0.3, (g, w, h, s) => { face(g, w, h, 'BLADES'); const cx = w / 2, cy = h * 0.62, r = w * 0.34, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2, at = v => a0 + (a1 - a0) * v; g.lineWidth = 13; for (const [p, q2, c] of [[0, 0.72, '#8a8f93'], [0.72, 0.9, '#d9b43a'], [0.9, 1, '#4cb864']]) { g.strokeStyle = c; g.beginPath(); g.arc(cx, cy, r, at(p), at(q2)); g.stroke(); } g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(at(s.rpm)) * r, cy + Math.sin(at(s.rpm)) * r); g.stroke(); g.fillStyle = '#e8e4d8'; g.fillText(Math.round(s.rpm * 100) + '%', cx, h - 12); });
  // the little horizon: blue is sky, brown is ground, and it tips the way you tip
  gauge(-0.08, 0, 0.28, 0.3, (g, w, h, s) => { g.save(); g.beginPath(); g.rect(0, 0, w, h); g.clip(); g.translate(w / 2, h / 2); g.rotate(-s.roll); const p = -s.pitch * 260; g.fillStyle = '#4b86c8'; g.fillRect(-w, -h * 2, w * 2, h * 2 + p); g.fillStyle = '#8a6238'; g.fillRect(-w, p, w * 2, h * 2); g.strokeStyle = '#fff'; g.lineWidth = 3; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(-22, p + k * 24); g.lineTo(22, p + k * 24); g.stroke(); } g.restore(); g.strokeStyle = '#f2c94c'; g.lineWidth = 6; g.beginPath(); g.moveTo(w * 0.2, h / 2); g.lineTo(w * 0.4, h / 2); g.moveTo(w * 0.6, h / 2); g.lineTo(w * 0.8, h / 2); g.stroke(); });
  gauge(0.2, 0.08, 0.22, 0.14, (g, w, h, s) => { face(g, w, h, 'HOW HIGH'); g.font = '700 38px Karla, Arial, sans-serif'; g.fillText(Math.max(0, Math.round(s.agl * 10)) + ' ft', w / 2, h - 16); });
  gauge(0.2, -0.08, 0.22, 0.14, (g, w, h, s) => { face(g, w, h, 'HOW FAST'); g.font = '700 38px Karla, Arial, sans-serif'; g.fillText(Math.round(s.speed * 8) + ' mph', w / 2, h - 16); });
  // a moving map: home, hospital, mountain, lake and you
  gauge(0.45, 0, 0.24, 0.3, (g, w, h, s) => { face(g, w, h, ''); const px = x => w / 2 - x * 0.66, py = z => h / 2 - z * 0.66; for (const [x, z, c, r] of [[60, -62, '#4f86a6', 15], [64, 44, '#9a9284', 15], [4, 64, '#c8202e', 7], [0, 0, '#e8e4d8', 7]]) { g.fillStyle = c; g.beginPath(); g.arc(px(x), py(z), r, 0, 7); g.fill(); } g.fillStyle = '#14181b'; g.font = '800 11px Arial'; g.fillText('H', px(0), py(0) + 4); g.fillText('H', px(4), py(64) + 4); g.save(); g.translate(px(s.x), py(s.z)); g.rotate(-s.yaw); g.fillStyle = '#f2c94c'; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.fill(); g.restore(); });
  const lamps = []; for (let k = 0; k < 7; k++) lamps.push(add(B(0.035, 0.022, 0.02), new THREE.MeshStandardMaterial({ color: [0xd94a5a, 0xf2c94c, 0x4cb84c, 0x3a8fd9][k % 4], emissive: [0xd94a5a, 0xf2c94c, 0x4cb84c, 0x3a8fd9][k % 4], emissiveIntensity: 0.3 }), -0.45 + k * 0.15, -0.166, -0.055, panel));
  const compass = add(new THREE.SphereGeometry(0.03, 16, 12), black, 0, 1.585, 1.0);   // the little ball compass hangs on the middle post
  add(B(0.5, 0.05, 0.5), panelM, 0, 1.78, 0.1); for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) add(B(0.02, 0.05, 0.02), k % 3 ? steel : maroon, -0.2 + k * 0.08, 1.74, -0.05 + r * 0.12);   // overhead switches

  // seats
  const seat = (x, z, mine) => { const s = new THREE.Group(); s.position.set(x, 0, z); scene.add(s); add(B(0.46, 0.14, 0.46), seatM, 0, 0.4, 0, s); if (mine) return s; add(B(0.46, 0.72, 0.1), seatM, 0, 0.8, -0.24, s); add(B(0.26, 0.2, 0.09), seatM, 0, 1.26, -0.24, s); add(B(0.1, 0.36, 0.1), steel, 0, 0.18, 0, s); for (const sx of [-1, 1]) add(B(0.05, 0.62, 0.02), M(0xc9c2b0), sx * 0.12, 0.82, -0.18, s); return s; };
  seat(SEAT, 0.06, true); seat(-SEAT, 0.06); for (const x of [-0.55, 0.55]) seat(x, -1.85);

  // both sets of controls: they're joined, so the co-pilot's move when Jasper's do
  const sets = [SEAT, -SEAT].map(x => {
    const st = new THREE.Group(); st.position.set(x, 0.06, 0.62); scene.add(st); add(new THREE.CylinderGeometry(0.018, 0.022, 0.52, 10), steel, 0, 0.26, 0, st); add(new THREE.CylinderGeometry(0.032, 0.028, 0.17, 12), black, 0, 0.58, 0, st); add(B(0.03, 0.03, 0.03), M(0xc8202e), 0, 0.665, -0.02, st);
    const co = new THREE.Group(); co.position.set(x + 0.33, 0.3, -0.12); scene.add(co); add(new THREE.CylinderGeometry(0.022, 0.022, 0.5, 10).rotateX(Math.PI / 2), steel, 0, 0, 0.25, co);
    const grip = add(new THREE.CylinderGeometry(0.036, 0.036, 0.17, 14).rotateX(Math.PI / 2), black, 0, 0, 0.5, co); add(B(0.012, 0.05, 0.05), M(0xf2c94c), 0, 0.034, 0.5, co);   // the twist grip is the throttle: a yellow mark shows it turning
    const pd = [-1, 1].map(s => add(B(0.1, 0.14, 0.03), steel, x + s * 0.11, 0.16, 1.0));
    return { st, co, grip, pd };
  });
  // Jasper's own hands, in flight gloves, on his controls
  const glove = M(0x7a2430, 0.9), sleeve = M(0x56624a, 0.9);
  const hand = parent => { const h = new THREE.Group(); parent.add(h); add(new THREE.SphereGeometry(0.052, 12, 10).scale(0.95, 1.15, 1), glove, 0, 0, 0, h); return h; };
  const hR = hand(sets[0].st); hR.position.set(0, 0.57, -0.01); const hL = hand(sets[0].co); hL.position.set(0, 0.01, 0.48);
  const fore = (from, to) => { const m = add(new THREE.CylinderGeometry(0.045, 0.06, 1, 10), sleeve, 0, 0, 0); return () => { const a = from(), b = to(); const d = a.distanceTo(b); m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.set(1, d, 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); }; };
  const wp = o => o.getWorldPosition(new THREE.Vector3());
  const arms = [fore(() => new THREE.Vector3(SEAT - 0.2, 0.78, 0.12), () => wp(hR)), fore(() => new THREE.Vector3(SEAT + 0.22, 0.72, 0.0), () => wp(hL))];

  // the blades go around overhead, just as fast as the real ones
  const rotor = new THREE.Group(); rotor.position.set(0, 2.12, -0.5); scene.add(rotor);
  for (let k = 0; k < 4; k++) { const a = new THREE.Group(); a.rotation.y = k * Math.PI / 2 + Math.PI / 4; rotor.add(a); add(B(0.3, 0.03, 4.2), dark, 0, 0, 2.2, a); add(B(0.305, 0.035, 0.25), maroon, 0, 0, 4.0, a); }
  const blur = new THREE.Mesh(new THREE.RingGeometry(0.4, 4.3, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x4a4e52, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); rotor.add(blur);
  // the crew
  const crew = [['copilot', 0x56624a, 0x8c5a3c, 0x2d2a26, -SEAT, 0.08, 0], ['chief', 0x56624a, 0xd9a47a, 0x6b4a2a, -0.55, -1.83, 0], ['medic', 0x7a3b34, 0x6b4630, 0x1d1b19, 0.55, -1.83, 0]].map(([who, suit, skin, hair, x, z]) => {
    const p = crewMember(suit, skin, hair); sit(p); p.position.set(x, -0.03, z); scene.add(p); p.visible = false; p.traverse(o => { o.userData.who = who; });
    return { who, p, wave: 0, n: 0 };
  });
  return { scene, cam, hemi, sun, gauges, lamps, sets, crew, arms, compass, rotor, blur, yaw: 0, pitch: -0.16, draws: 0, mount: new THREE.Group() };
}

const _q = new THREE.Quaternion(), _turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI), _e = new THREE.Euler(0, 0, 0, 'YXZ'), eye = new THREE.Vector3(), EYE = new THREE.Vector3(-0.2, 0.3, 3.62);
// Every frame in the cockpit: s is how the helicopter is flying, C the controls, flyer the moving toy outside
function runCockpit(K, dt, s, C, night, flyer) {
  for (const t of K.sets) {
    t.st.rotation.x += (C.sy * 0.26 - t.st.rotation.x) * Math.min(1, dt * 9); t.st.rotation.z += (C.sx * 0.26 - t.st.rotation.z) * Math.min(1, dt * 9);
    t.co.rotation.x += (0.18 - 0.62 * C.lever - t.co.rotation.x) * Math.min(1, dt * 9); t.grip.parent.children.forEach((c, i) => { if (i === 2) { c.position.set(Math.sin(C.throttle * 2.2) * 0.034, Math.cos(C.throttle * 2.2) * 0.034, 0.5); } });
    t.pd.forEach((p, i) => { p.position.z += (1.0 + (i ? -1 : 1) * C.pedal * 0.06 - p.position.z) * Math.min(1, dt * 9); });
  }
  K.scene.updateMatrixWorld(); for (const a of K.arms) a();
  for (const c of K.crew) {
    c.p.visible = s.crewIn; c.wave = Math.max(0, c.wave - dt);
    c.p.userData.arms[1].rotation.x = c.wave > 0 ? -2.5 + Math.sin(c.wave * 12) * 0.3 : c.who === 'copilot' ? -1.0 : -0.5; c.p.userData.arms[0].rotation.x = c.who === 'copilot' ? -0.7 - 0.3 * C.lever : -0.5;
  }
  K.rotor.rotation.y = s.spin; K.rotor.position.y = 2.12 + 0.05 * s.rpm * C.lever; K.blur.material.opacity = 0.14 * Math.max(0, s.rpm - 0.25);
  K.lamps.forEach((l, i) => { l.material.emissiveIntensity = 0.25 + (s.rpm > 0.05 ? 0.6 : 0) + (i === Math.floor(s.t * 1.5) % 7 ? 0.5 : 0); });
  K.hemi.intensity = 0.75 - 0.5 * night; K.sun.intensity = 0.7 - 0.6 * night;
  { const g = K.gauges[K.draws++ % K.gauges.length]; g.draw(g.g, g.w, g.h, s); g.t.needsUpdate = true; }      // one gauge each frame, to keep it quick
  // the same head turn drives both cameras
  const cam = K.cam; cam.aspect = camera.aspect; cam.fov = camera.aspect < 1 ? 86 : 70;
  if (camera.view) cam.setViewOffset(camera.view.fullWidth, camera.view.fullHeight, camera.view.offsetX, camera.view.offsetY, camera.view.width, camera.view.height);
  cam.updateProjectionMatrix();
  const shake = s.rpm * 0.0018 * (s.still ? 0 : 1);
  _e.set(K.pitch, K.yaw, 0); _q.setFromEuler(_e);
  cam.position.set(SEAT * 0.5 + Math.sin(s.t * 47) * shake, 1.24 + Math.sin(s.t * 61) * shake, -0.22); cam.quaternion.copy(_turn).multiply(_q);
  K.out = K.out || new THREE.PerspectiveCamera(); const o = K.out; o.copy(cam); o.near = 0.1; o.far = 900; o.updateProjectionMatrix();
  eye.copy(EYE).applyMatrix4(flyer.matrixWorld); o.position.copy(eye); o.quaternion.copy(flyer.quaternion).multiply(_turn).multiply(_q);
}
function drawCockpit(K, scene) {
  renderer.render(scene, K.out);
  renderer.autoClear = false; renderer.clearDepth(); renderer.render(K.scene, K.cam); renderer.autoClear = true;
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
// tap a crew member and they wave and tell you about their job
function tapCockpit(K, x, y) {
  const r = stage.getBoundingClientRect(); ndc.set((x - r.left) / r.width * 2 - 1, 1 - (y - r.top) / r.height * 2); ray.setFromCamera(ndc, K.cam);
  for (const h of ray.intersectObjects(K.crew.filter(c => c.p.visible).map(c => c.p), true)) { const c = K.crew.find(q => q.who === h.object.userData.who); if (c) return greet(c); }
  return null;
}
function greet(c) { c.wave = 1.6; return TALK[c.who][c.n++ % TALK[c.who].length]; }

export { buildCockpit, crewMember, drawCockpit, greet, runCockpit, tapCockpit };
