import * as THREE from 'three';
import { dusk, fog0, grass, scene, skyBot0, skyTop0 } from '../world/setup.js';
import { branches, canopies, hillMat, leafMats, pineMat, rnd, snowCaps } from './nature.js';

// ---------- falling things: petals, leaves, snow ----------
const FALL_N = 500;
const fallGeo = new THREE.BufferGeometry();
const fallPos = new Float32Array(FALL_N * 3), fallCol = new Float32Array(FALL_N * 3), fallSeed = new Float32Array(FALL_N);
for (let i = 0; i < FALL_N; i++) { fallPos[i * 3] = (rnd() - 0.5) * 50; fallPos[i * 3 + 1] = rnd() * 22; fallPos[i * 3 + 2] = (rnd() - 0.5) * 50; fallSeed[i] = rnd() * 10; }
fallGeo.setAttribute('position', new THREE.BufferAttribute(fallPos, 3));
fallGeo.setAttribute('color', new THREE.BufferAttribute(fallCol, 3));
const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 2, 16, 16, 15); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
const fallMat = new THREE.PointsMaterial({ size: 0.25, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, opacity: 0.95 });
const fallers = new THREE.Points(fallGeo, fallMat); fallers.frustumCulled = false; scene.add(fallers);

// ---------- seasons ----------
const SEASONS = {
  Spring: { grass: 0x7f9f55, hill: 0x6d8c5c, pine: 0x4d6a46, leaves: [0xf2b8c6, 0xf6d3dc, 0x9cc96b], top: 0x7fb0d8, horizon: 0xe4eef2, fall: [0xf4c1cf, 0xffffff], fallN: 160, size: 0.2, speed: 0.6 },
  Summer: { grass: 0x678a45, hill: 0x58764b, pine: 0x3f5f3c, leaves: [0x5d8a43, 0x4f7d3a, 0x6f9a4c], top: 0x5f97c9, horizon: 0xdbe8ee, fall: [0xfff3a8], fallN: 0, size: 0.15, speed: 0.4 },
  Fall:   { grass: 0x7a6b40, hill: 0x6e5a38, pine: 0x45583c, leaves: [0xd9782e, 0xb8432a, 0xe0b23a], top: 0x7d9cbd, horizon: 0xe8dccb, fall: [0xd9782e, 0xb8432a, 0xe0b23a], fallN: 260, size: 0.38, speed: 0.9 },
  Winter: { grass: 0xe4eaee, hill: 0xd6dfe4, pine: 0x55705f, leaves: null, top: 0x9fb4c8, horizon: 0xe9eef2, fall: [0xffffff], fallN: 500, size: 0.22, speed: 1.2 }
};
const SEASON_ORDER = ['Spring', 'Summer', 'Fall', 'Winter'];
let season = 'Summer', fallActive = 0, fallSpeed = 0.4;
const dim = c => { const col = new THREE.Color(c); return dusk ? col.multiplyScalar(0.45) : col; };
function applySeason(name) {
  season = name; const S = SEASONS[name];
  grass.material.color.copy(dim(S.grass)); hillMat.color.copy(dim(S.hill)); pineMat.color.copy(dim(S.pine));
  if (S.leaves) S.leaves.forEach((c, i) => leafMats[i].color.copy(dim(c)));
  canopies.forEach(c => c.visible = !!S.leaves); branches.forEach(b => b.visible = !S.leaves);
  snowCaps.forEach(c => c.visible = name === 'Winter');
  if (!dusk) { skyTop0.set(S.top); skyBot0.set(S.horizon); fog0.set(S.horizon); }
  fallActive = S.fallN; fallSpeed = S.speed; fallMat.size = S.size;
  const tmp = new THREE.Color();
  for (let i = 0; i < FALL_N; i++) { tmp.set(S.fall[i % S.fall.length]); fallCol[i * 3] = tmp.r; fallCol[i * 3 + 1] = tmp.g; fallCol[i * 3 + 2] = tmp.b; }
  fallGeo.attributes.color.needsUpdate = true;
  fallGeo.setDrawRange(0, fallActive);
}

export { SEASON_ORDER, applySeason, fallActive, fallGeo, fallPos, fallSeed, fallSpeed, fallers, season };
