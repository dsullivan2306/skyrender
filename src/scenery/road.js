import * as THREE from 'three';
import { groundSet } from '../world/setup.js';
import { m4 } from './train.js';

// ---------- country road for the truck ----------
const roadSet = new THREE.Group(); groundSet.add(roadSet);
const ROAD_X = 1.05, LANE_DASH = 4, FENCE = 3;
{
  const S = (c, r = 0.95) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const road = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.03, 260), S(0x4a4b4d)); road.position.set(ROAD_X, 0.015, 0); road.receiveShadow = true; roadSet.add(road);
  for (const dx of [-2.45, 2.45]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 260), S(0xa89f8c)); sh.position.set(ROAD_X + dx, 0.01, 0); roadSet.add(sh); }
  for (const dx of [-2.05, 2.05]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.032, 260), S(0xf1efe6, 0.8)); l.position.set(ROAD_X + dx, 0.017, 0); roadSet.add(l); }
}
const laneSet = new THREE.Group(); roadSet.add(laneSet);
{
  const n = 260 / LANE_DASH;
  const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.034, 2), new THREE.MeshStandardMaterial({ color: 0xe8b93a, roughness: 0.8 }), n);
  for (let i = 0; i < n; i++) dash.setMatrixAt(i, m4.makeTranslation(ROAD_X, 0.018, -130 + i * LANE_DASH));
  laneSet.add(dash);
}
const fenceSet = new THREE.Group(); roadSet.add(fenceSet);
{
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 });
  const n = Math.round(260 / FENCE);
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), wood, n);
  for (let i = 0; i < n; i++) posts.setMatrixAt(i, m4.makeTranslation(-2.6, 0.55, -130 + i * FENCE));
  posts.castShadow = true; fenceSet.add(posts);
  for (const y of [0.45, 0.85]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 260), wood); rail.position.set(-2.58, y, 0); roadSet.add(rail); }
}
// roadside things that pass by: a mailbox and a sign pointing to Jasper Junction
const roadProps = new THREE.Group(); roadSet.add(roadProps);
{
  const S = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
  const mb = new THREE.Group(); mb.position.set(-1.9, 0, 10); roadProps.add(mb);
  mb.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), S(0x6b5139)).translateY(0.5));
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.45, 14, 1, false, 0, Math.PI), S(0x2f5d4a)); body.rotation.set(Math.PI / 2, 0, 0); body.position.y = 1.0; mb.add(body);
  mb.add(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.45), S(0x2f5d4a)).translateY(0.94));
  const sg = new THREE.Group(); sg.position.set(-2.0, 0, -18); roadProps.add(sg);
  sg.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.08), S(0x777777)).translateY(1.1));
  const c = document.createElement('canvas'); c.width = 512; c.height = 192; const g = c.getContext('2d');
  const draw = () => { g.fillStyle = '#2f5d4a'; g.fillRect(0, 0, 512, 192); g.strokeStyle = '#efe9da'; g.lineWidth = 8; g.strokeRect(8, 8, 496, 176);
    g.fillStyle = '#efe9da'; g.font = '600 56px Karla, "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'center'; g.fillText('Jasper Junction', 256, 88); g.font = '600 48px Karla, Arial, sans-serif'; g.fillText('2 mi  →', 256, 152); };
  draw(); const tx = new THREE.CanvasTexture(c);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { draw(); tx.needsUpdate = true; });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.8, side: THREE.DoubleSide }));
  face.position.y = 2.0; face.rotation.y = Math.PI; sg.add(face);
}

// ---------- interstate: two lanes each way, a grass median with a concrete barrier, guard rail ----------
const interSet = new THREE.Group(); groundSet.add(interSet); interSet.visible = false;
const I_DASH = 9, I_POST = 4, I_SIGN = 80;
const I_LANES = { ours: [0, 2.25], theirs: [6.6, 8.85] };     // lane centers (x); we drive in the right lane
const iDash = new THREE.Group(), iPosts = new THREE.Group(), iProps = new THREE.Group(); interSet.add(iDash, iPosts, iProps);
{
  const S = (c, r = 0.95) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const asphalt = S(0x3f4042), shoulder = S(0x8d8a82), white = S(0xf1efe6, 0.8), yellow = S(0xe8b93a, 0.8), concrete = S(0xb9b6ae, 0.9);
  const strip = (w, x, mat, y = 0.015, h = 0.03) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 260), mat); m.position.set(x, y, 0); m.receiveShadow = true; interSet.add(m); return m; };
  strip(4.6, 1.12, asphalt); strip(4.6, 7.72, asphalt);
  strip(0.7, -1.5, shoulder, 0.01, 0.02); strip(0.5, 3.67, shoulder, 0.01, 0.02); strip(0.5, 5.18, shoulder, 0.01, 0.02); strip(0.7, 10.38, shoulder, 0.01, 0.02);
  strip(0.1, -1.12, white, 0.017, 0.032); strip(0.1, 3.36, yellow, 0.017, 0.032); strip(0.1, 5.48, yellow, 0.017, 0.032); strip(0.1, 9.96, white, 0.017, 0.032);
  const barrier = strip(0.32, 4.42, concrete, 0.42, 0.84); barrier.castShadow = true;
  strip(0.5, 4.42, concrete, 0.06, 0.12);
  const n = Math.round(260 / I_DASH);
  const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.034, 3), white, n * 2);
  for (let i = 0; i < n; i++) { dash.setMatrixAt(i, m4.makeTranslation(1.12, 0.018, -130 + i * I_DASH)); dash.setMatrixAt(n + i, m4.makeTranslation(7.72, 0.018, -130 + i * I_DASH)); }
  iDash.add(dash);
  // guard rail on the right side
  const steel = S(0xaab0b4, 0.4), m = Math.round(260 / I_POST);
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.75, 0.1), S(0x7d8286, 0.6), m);
  for (let i = 0; i < m; i++) posts.setMatrixAt(i, m4.makeTranslation(-2.3, 0.37, -130 + i * I_POST));
  posts.castShadow = true; iPosts.add(posts);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 260), steel); rail.position.set(-2.22, 0.62, 0); interSet.add(rail);
  // big green overhead sign
  const c = document.createElement('canvas'); c.width = 1024; c.height = 300; const g = c.getContext('2d');
  const draw = () => {
    g.fillStyle = '#1f6b47'; g.fillRect(0, 0, 1024, 300); g.strokeStyle = '#f2f2ee'; g.lineWidth = 10; g.strokeRect(12, 12, 1000, 276);
    g.fillStyle = '#f2f2ee'; g.font = '700 84px Karla, "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'left';
    g.fillText('Jasper Junction', 230, 140); g.font = '700 58px Karla, "Helvetica Neue", Arial, sans-serif'; g.fillText('Spaceport  12 mi', 230, 232);
    // interstate shield
    g.fillStyle = '#f2f2ee'; g.beginPath(); g.moveTo(60, 70); g.lineTo(190, 70); g.lineTo(196, 150); g.quadraticCurveTo(190, 230, 125, 260); g.quadraticCurveTo(60, 230, 54, 150); g.closePath(); g.fill();
    g.fillStyle = '#1d4f9a'; g.beginPath(); g.moveTo(66, 110); g.lineTo(184, 110); g.lineTo(188, 150); g.quadraticCurveTo(183, 222, 125, 250); g.quadraticCurveTo(67, 222, 62, 150); g.closePath(); g.fill();
    g.fillStyle = '#c8202e'; g.fillRect(64, 76, 122, 30);
    g.fillStyle = '#f2f2ee'; g.font = '800 70px Karla, Arial, sans-serif'; g.textAlign = 'center'; g.fillText('65', 125, 205);
    g.fillStyle = '#e8b93a'; g.fillRect(860, 30, 140, 56); g.fillStyle = '#1f2a24'; g.font = '800 40px Karla, Arial, sans-serif'; g.fillText('EXIT 5', 930, 72);
  };
  draw(); const tx = new THREE.CanvasTexture(c);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { draw(); tx.needsUpdate = true; });
  const gantry = new THREE.Group(); iProps.add(gantry);
  for (const x of [-2.6, 3.9]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6.6, 0.22), steel); p.position.set(x, 3.3, 0); p.castShadow = true; gantry.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.3, 0.3), steel); beam.position.set(0.65, 6.4, 0); gantry.add(beam);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.35), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.7, side: THREE.DoubleSide }));
  sign.position.set(0.9, 5.55, 0.18); gantry.add(sign);
  const back = new THREE.Mesh(new THREE.BoxGeometry(4.7, 1.45, 0.06), S(0x5c6266)); back.position.set(0.9, 5.55, 0.12); gantry.add(back);
  for (const z of [-I_SIGN / 2]) { const mk = new THREE.Group(); mk.position.set(-1.95, 0, z); iProps.add(mk);
    mk.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.06), S(0x6f7477)).translateY(0.55));
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.24), S(0x1f6b47)); plate.position.y = 1.0; mk.add(plate); }
}

// ---------- traffic: little cars, a van, a school bus and an old pickup ----------
// Each car: outer group sits on the ground and turns; inner group holds the body around its middle
// so it can roll over cleanly in a crash.
const makeCar = (kind, color) => {
  const S = (c, r = 0.5, m = 0.2) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const paint = S(color, 0.4, 0.3), glass = S(0x1d2a33, 0.15, 0.5), tire = S(0x161616, 0.9, 0), chrome = S(0xc9ccce, 0.3, 0.8);
  const headM = new THREE.MeshStandardMaterial({ color: 0xfff3d6, emissive: 0xfff0c8, emissiveIntensity: 0.5 });
  const tailM = new THREE.MeshStandardMaterial({ color: 0x8a1a1a, emissive: 0xff2a1a, emissiveIntensity: 0.6 });
  const D = { sedan: [1.35, 0.55, 3.3, 0.45, 1.6], suv: [1.45, 0.75, 3.5, 0.55, 2.0], van: [1.45, 1.35, 3.7, 0, 0], bus: [1.6, 1.6, 6.4, 0, 0], pickup: [1.4, 0.6, 3.6, 0.5, 1.2] }[kind];
  const [W, bodyH, L, cabH, cabL] = D, wheelR = kind === 'bus' ? 0.36 : 0.3;
  const H2 = (wheelR * 0.9 + bodyH + cabH) / 2;
  const outer = new THREE.Group(), inner = new THREE.Group(); inner.position.y = H2; outer.add(inner);
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y - H2, z); m.castShadow = true; inner.add(m); return m; };
  const base = wheelR * 0.9;
  add(new THREE.BoxGeometry(W, bodyH, L), paint, 0, base + bodyH / 2, 0);
  if (kind === 'van' || kind === 'bus') {
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.02, bodyH * 0.32, L * 0.82), glass, s * (W / 2 + 0.005), base + bodyH * 0.72, -0.05);
    add(new THREE.BoxGeometry(W * 0.86, bodyH * 0.36, 0.02), glass, 0, base + bodyH * 0.7, L / 2 + 0.005);
    if (kind === 'bus') { for (const s of [-1, 1]) for (const y of [0.42, 0.48]) add(new THREE.BoxGeometry(0.02, 0.05, L * 0.98), S(0x1c1c1c), s * (W / 2 + 0.006), base + bodyH * y, 0);
      const st = add(new THREE.BoxGeometry(0.03, 0.3, 0.3), S(0xc8202e), W / 2 + 0.05, base + bodyH * 0.6, L / 2 - 1.0); }
  } else {
    const cz = kind === 'pickup' ? L * 0.12 : -L * 0.05;
    add(new THREE.BoxGeometry(W * 0.86, cabH, cabL), glass, 0, base + bodyH + cabH / 2, cz);
    add(new THREE.BoxGeometry(W * 0.88, 0.05, cabL * 0.85), paint, 0, base + bodyH + cabH, cz);
    if (kind === 'pickup') add(new THREE.BoxGeometry(W * 0.9, 0.06, L * 0.4), S(0x222222), 0, base + bodyH + 0.01, -L * 0.28);
  }
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(0.22, 0.1, 0.04), headM, s * W * 0.32, base + bodyH * 0.6, L / 2 + 0.01);
    add(new THREE.BoxGeometry(0.22, 0.1, 0.04), tailM, s * W * 0.34, base + bodyH * 0.6, -L / 2 - 0.01);
    for (const z of [L * 0.32, -L * 0.32]) { const w = add(new THREE.CylinderGeometry(wheelR, wheelR, 0.22, 16).rotateZ(Math.PI / 2), tire, s * (W / 2 - 0.08), wheelR, z); }
  }
  add(new THREE.BoxGeometry(W * 0.9, 0.12, 0.08), chrome, 0, base + 0.08, L / 2 + 0.03);
  outer.userData = { kind, L, W, H: H2 * 2, inner, headM, tailM };
  return outer;
};

export { FENCE, I_DASH, I_LANES, I_POST, I_SIGN, LANE_DASH, fenceSet, iDash, iPosts, iProps, interSet, laneSet, makeCar, roadProps, roadSet };
