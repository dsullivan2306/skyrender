// Jasper's idea (November 21, 2026): "When Jasper presses meteors and then goes on the moon there will still be
// meteors and the astronauts will be stuck or fighting there are buttons for both of those things"
//
// The meteor storm on the Moon's ground. With no air the rocks don't glow or leave tails, nothing makes a sound, and
// dust flies out in arcs and drops straight back, leaving a new crater that stays. Rocks only ever come down on the
// far side of Skyrender, well away from everyone. Functions only; planets.js builds it the first time it's needed.
import * as THREE from 'three';
import { sfx } from '../audio/audio.js';

const G = 1.25;                                     // the Moon's pull (a sixth of Earth's) at the toy's scale
const ROCKS = 6, GRAINS = 1400, CRATERS = 40;
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), _z = new THREE.Vector3(0, 0, 1);

function makeStorm(scene, glowTex) {
  let seed = 0x51a7;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const rockM = new THREE.MeshStandardMaterial({ color: 0xa1978a, roughness: 1, flatShading: true, emissive: 0x1c1a17 });
  const rocks = [];
  for (let i = 0; i < ROCKS; i++) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), rockM); m.castShadow = true; m.visible = false; scene.add(m);
    rocks.push({ m, mode: 'idle', t: 0, dur: 1, size: 1, strike: false, aimed: false, from: new THREE.Vector3(), to: new THREE.Vector3(), vel: new THREE.Vector3(), spin: new THREE.Vector3() });
  }
  const flash = () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); s.visible = false; scene.add(s); return s; };
  const flashes = [0, 1, 2, 3].map(() => ({ s: flash(), t: 1, size: 4 }));
  const pos = new Float32Array(GRAINS * 3).fill(-50), vel = new Float32Array(GRAINS * 3), life = new Float32Array(GRAINS);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xb9b6ae, size: 0.13 })); pts.frustumCulled = false; scene.add(pts);
  // new craters: they stay (there's no wind or rain to wear them away)
  const rimG = new THREE.TorusGeometry(1, 0.17, 7, 28); rimG.rotateX(-Math.PI / 2); rimG.scale(1, 0.4, 1);
  const pitG = new THREE.CircleGeometry(0.95, 24); pitG.rotateX(-Math.PI / 2);
  const rims = new THREE.InstancedMesh(rimG, new THREE.MeshStandardMaterial({ color: 0xaaa8a2, roughness: 1 }), CRATERS); rims.castShadow = rims.receiveShadow = true;
  const pits = new THREE.InstancedMesh(pitG, new THREE.MeshStandardMaterial({ color: 0x5d5c58, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), CRATERS);
  for (const m of [rims, pits]) { m.count = 0; m.frustumCulled = false; scene.add(m); }
  // the bumpers: little rockets the astronauts launch
  const bumpers = [0, 1, 2].map(() => {
    const g = new THREE.Group(), b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 12).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe6e4dc, roughness: 0.6 }));
    const n = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 12).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7a2430, roughness: 0.6 })); n.position.z = 0.35;
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffc98a, blending: THREE.AdditiveBlending, depthWrite: false })); f.position.z = -0.4; f.scale.setScalar(0.9);
    g.add(b, n, f); g.scale.setScalar(1.7); g.visible = false; scene.add(g);
    return { g, live: false, t: 0, dur: 1.3, from: new THREE.Vector3(), to: new THREE.Vector3(), rock: null };
  });
  // the dust that piles up around the astronauts' legs
  const pileM = new THREE.MeshStandardMaterial({ color: 0x8b8a85, roughness: 1 });
  const piles = [0, 1].map(() => { const g = new THREE.SphereGeometry(1, 16, 7, 0, Math.PI * 2, 0, Math.PI / 2), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const j = 1 + 0.16 * Math.sin(p.getX(k) * 7) * Math.cos(p.getZ(k) * 5); p.setXYZ(k, p.getX(k) * j, p.getY(k), p.getZ(k) * j); }
    g.computeVertexNormals(); const m = new THREE.Mesh(g, pileM); m.castShadow = m.receiveShadow = true; m.visible = false; scene.add(m); return m; });
  return { rnd, rocks, flashes, pos, vel, life, geo, rims, pits, bumpers, piles, grain: 0, craters: 0, hits: 0, bumps: 0, fired: 0, wait: 0.6, striking: false, buried: false, buryT: -1, targets: null, sinceHit: 99 };
}
function grain(St, at, v, life) {
  const i = St.grain++ % GRAINS;
  St.pos[i * 3] = at.x; St.pos[i * 3 + 1] = Math.max(0.05, at.y); St.pos[i * 3 + 2] = at.z;
  St.vel[i * 3] = v.x; St.vel[i * 3 + 1] = v.y; St.vel[i * 3 + 2] = v.z; St.life[i] = life;
}
function flashAt(St, at, size) { const f = St.flashes.find(x => x.t >= 1) || St.flashes[0]; f.t = 0; f.size = size; f.s.position.copy(at); f.s.visible = true; }
function launch(St, strike) {
  const r = St.rocks.find(x => x.mode === 'idle'); if (!r) return null;
  const q = St.rnd;
  r.mode = 'fall'; r.t = 0; r.strike = strike; r.aimed = false; r.size = strike ? 1.5 : 0.9 + q() * 1.0; r.dur = strike ? 2.6 : 4.6 + q() * 0.8;
  if (strike) r.to.set(-9, 0, 15); else r.to.set(-15 - q() * 32, 0, -16 + q() * 34);    // always beyond Skyrender, never near anyone
  // in low from the right, so they cross the part of the sky Jasper can see
  r.from.set(r.to.x - 24 - q() * 14, 13 + q() * 7, r.to.z - 52 - q() * 14);
  r.spin.set(q() * 3 - 1.5, q() * 3 - 1.5, q() * 3 - 1.5);
  r.m.scale.set(r.size, r.size * 0.8, r.size * 0.9); r.m.position.copy(r.from); r.m.visible = true;
  return r;
}
const along = (r, t, out) => { const u = Math.min(1, t / r.dur); return out.copy(r.from).lerp(r.to, u * (0.75 + 0.25 * u)); };
function hit(St, r) {
  const q = St.rnd, n = 110;
  for (let k = 0; k < n; k++) { const a = q() * Math.PI * 2, o = 1 + q() * 2.6 * r.size, up = 1.2 + q() * 3.2; grain(St, r.to, _v.set(Math.cos(a) * o, up, Math.sin(a) * o), 9); }
  flashAt(St, r.to, 5 * r.size);
  const i = St.craters++ % CRATERS, R = r.size * 1.9;
  _m.compose(_v.set(r.to.x, 0.04, r.to.z), _q.identity(), _s.set(R, R, R)); St.rims.setMatrixAt(i, _m);
  _m.compose(_v.set(r.to.x, 0.03, r.to.z), _q, _s); St.pits.setMatrixAt(i, _m);
  for (const m of [St.rims, St.pits]) { m.count = Math.min(CRATERS, St.craters); m.instanceMatrix.needsUpdate = true; }
  r.mode = 'idle'; r.m.visible = false; St.hits++; St.sinceHit = 0; sfx.thump();
  if (r.strike && St.targets) {                    // thrown dust flies a very long way on the Moon
    for (const t of St.targets) for (let k = 0; k < 110; k++) {
      const T = 1.9 + q() * 0.5; _w.set(t.x + (q() - 0.5) * 1.3, 0, t.z + (q() - 0.5) * 1.3).sub(r.to).divideScalar(T); _w.y = G * T / 2; grain(St, r.to, _w, 9);
    }
    St.buryT = 1.9;
  }
}
// The strike that gets the astronauts stuck: one rock, far off, whose dust reaches the two spots.
function strike(St, targets) { if (St.striking) return; if (launch(St, true)) { St.striking = true; St.buried = false; St.targets = targets.map(t => t.clone()); } }
// Launch a bumper from a spot at the next rock. True if one was launched.
function fire(St, from) {
  const b = St.bumpers.find(x => !x.live); if (!b) return false;
  const r = St.rocks.filter(x => x.mode === 'fall' && !x.aimed && !x.strike && x.t > 0.9 && x.dur - x.t > 1.9).sort((x, y) => y.t / y.dur - x.t / x.dur)[0]; if (!r) return false;
  r.aimed = true; b.live = true; b.t = 0; b.rock = r; b.from.copy(from); along(r, r.t + b.dur, b.to); b.g.visible = true; b.g.position.copy(from); St.fired++; sfx.quindar();
  return true;
}
function runStorm(St, dt, on) {
  St.sinceHit += dt;
  if (on && (St.wait -= dt) <= 0) { if (St.rocks.filter(r => r.mode === 'fall').length < 4) launch(St, false); St.wait = 1.1 + St.rnd() * 0.8; }
  if (St.buryT >= 0 && (St.buryT -= dt) < 0) { St.buried = true; St.striking = false; }
  for (const r of St.rocks) {
    if (r.mode === 'idle') continue;
    r.t += dt; r.m.rotation.x += r.spin.x * dt; r.m.rotation.y += r.spin.y * dt; r.m.rotation.z += r.spin.z * dt;
    if (r.mode === 'fall') { along(r, r.t, r.m.position); if (r.t >= r.dur) hit(St, r); }
    else { r.m.position.addScaledVector(r.vel, dt); if (r.t > 9) { r.mode = 'idle'; r.m.visible = false; } }   // bumped: sails off, far away
  }
  for (const b of St.bumpers) {
    if (!b.live) continue;
    b.t += dt; const u = Math.min(1, b.t / b.dur), k = u * (0.4 + 0.6 * u);
    _v.copy(b.g.position); b.g.position.copy(b.from).lerp(b.to, k); b.g.position.y += Math.sin(u * Math.PI) * 1.5;
    _w.copy(b.g.position).sub(_v); if (_w.lengthSq() > 1e-8) b.g.quaternion.setFromUnitVectors(_z, _w.normalize());
    if (u >= 1) {
      b.live = false; b.g.visible = false;
      const r = b.rock; r.mode = 'bumped'; r.t = 0; r.vel.copy(r.to).sub(r.from).normalize().multiplyScalar(9); r.vel.y = 9; r.vel.x -= 12; r.spin.multiplyScalar(2.5); St.bumps++;
      flashAt(St, b.to, 3.2);
      for (let n = 0; n < 40; n++) grain(St, b.to, _v.set(St.rnd() * 5 - 2.5, St.rnd() * 4 - 1, St.rnd() * 5 - 2.5), 9);
    }
  }
  for (const f of St.flashes) { if (f.t >= 1) continue; f.t = Math.min(1, f.t + dt / 0.5); f.s.material.opacity = 1 - f.t; f.s.scale.setScalar(f.size * (0.6 + f.t)); if (f.t >= 1) f.s.visible = false; }
  let moved = false;
  for (let i = 0; i < GRAINS; i++) {
    if (St.life[i] <= 0) continue;
    moved = true; St.life[i] -= dt; const j = i * 3;
    St.vel[j + 1] -= G * dt; St.pos[j] += St.vel[j] * dt; St.pos[j + 1] += St.vel[j + 1] * dt; St.pos[j + 2] += St.vel[j + 2] * dt;
    if (St.pos[j + 1] < 0 || St.life[i] <= 0) { St.life[i] = 0; St.pos[j + 1] = -50; }    // lands and is part of the ground again
  }
  if (moved) St.geo.attributes.position.needsUpdate = true;
}
// k: 0 none, 1 up to the knees. Once there's been a pile, a low mound stays.
function pile(St, i, at, k) {
  const m = St.piles[i]; if (k > 0) { m.visible = true; m.position.set(at.x, 0, at.z); }
  m.scale.set(0.45 + 0.2 * k, Math.max(0.04, 0.34 * k), 0.45 + 0.2 * k);
}

export { fire, makeStorm, pile, runStorm, strike };
