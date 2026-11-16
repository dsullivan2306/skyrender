import * as THREE from 'three';
import { groundSet, scene, sky } from '../world/setup.js';
import { rnd } from './nature.js';
import { puff } from './sky.js';

// ---------- space: stars, Earth, Moon (fade in on the way up) ----------

const spaceTop = new THREE.Color(0x02030a), spaceBot = new THREE.Color(0x0a1026);
const starPos = [];
for (let i = 0; i < 1400; i++) {
  const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
  starPos.push(170 * r * Math.cos(a), 170 * u, 170 * r * Math.sin(a));
}
const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
const stars = new THREE.Points(starGeo, starMat); stars.renderOrder = -1; sky.add(stars);

const earthTex = (() => {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#1f4f86'; g.fillRect(0, 0, 1024, 512);
  let es = 11; const er = () => (es = (es * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) {                       // continents: clusters of soft blobs
    const cx = er() * 1024, cy = 90 + er() * 330, n = 6 + er() * 10;
    for (let k = 0; k < n; k++) {
      g.fillStyle = k % 3 ? '#4f7a3e' : '#8a7a4c';
      g.beginPath(); g.ellipse(cx + (er() - 0.5) * 120, cy + (er() - 0.5) * 70, 12 + er() * 40, 8 + er() * 26, er() * 3, 0, Math.PI * 2); g.fill();
    }
  }
  g.fillStyle = '#eef3f6'; g.fillRect(0, 0, 1024, 26); g.fillRect(0, 486, 1024, 26);   // ice caps
  g.globalAlpha = 0.55; g.fillStyle = '#ffffff';
  for (let i = 0; i < 120; i++) { g.beginPath(); g.ellipse(er() * 1024, er() * 512, 20 + er() * 70, 4 + er() * 10, er() * 0.6, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
})();
const space = new THREE.Group(); space.visible = false; scene.add(space);
const earthMat = new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.9, emissive: 0x0a1a33, emissiveIntensity: 0.4, transparent: true, opacity: 0, fog: false });
const earth = new THREE.Mesh(new THREE.SphereGeometry(260, 64, 40), earthMat);
earth.position.set(0, -305, -40); space.add(earth);
const atmoMat = new THREE.MeshBasicMaterial({ color: 0x6fb2ff, transparent: true, opacity: 0, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
const atmo = new THREE.Mesh(new THREE.SphereGeometry(272, 64, 40), atmoMat); atmo.position.copy(earth.position); space.add(atmo);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xcfcfc8, roughness: 1, transparent: true, opacity: 0, fog: false, flatShading: true });
const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(9, 2), moonMat); moon.position.set(-90, 60, -150); space.add(moon);

// Saturn (pale gold bands and its rings) and Mars (rusty red, white ice caps). space/planets.js lines them up
// with the other planets, in order from the Sun.
const planetMats = [];
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t; };
const giantTex = canvasTex(512, 256, (g, w, h) => {
  const bands = ['#e3cf9e', '#d6bb83', '#ead9ad', '#c9a86f', '#efe0b8', '#d2b47c', '#e6d2a2', '#bf9d66', '#ecdcb0'];
  let y = 0; let ps = 3;
  while (y < h) { const bh = 8 + ((ps = (ps * 16807) % 2147483647) % 22); g.fillStyle = bands[(ps >> 3) % bands.length]; g.fillRect(0, y, w, bh); y += bh; }
});
const giantMat = new THREE.MeshStandardMaterial({ map: giantTex, roughness: 1, emissive: 0x2a1a0a, emissiveIntensity: 0.4, transparent: true, opacity: 0, fog: false });
const giant = new THREE.Mesh(new THREE.SphereGeometry(22, 48, 32), giantMat);
giant.position.set(165, 12, -105); giant.rotation.z = 0.35; space.add(giant); planetMats.push(giantMat);
const ringTex = canvasTex(256, 8, (g, w) => {
  for (let x = 0; x < w; x++) { const a = 0.25 + 0.6 * Math.abs(Math.sin(x * 0.11) * Math.sin(x * 0.037)); g.fillStyle = `rgba(232,212,170,${a.toFixed(2)})`; g.fillRect(x, 0, 1, 8); }
});
const ringGeo = new THREE.RingGeometry(29, 46, 96, 1);
const rp = ringGeo.attributes.position, ruv = ringGeo.attributes.uv, tv = new THREE.Vector3();
for (let i = 0; i < rp.count; i++) { tv.fromBufferAttribute(rp, i); ruv.setXY(i, (tv.length() - 29) / 17, 0.5); }   // map the bands across the ring
const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false });
const ringM = new THREE.Mesh(ringGeo, ringMat); ringM.position.copy(giant.position); ringM.rotation.set(-1.25, 0.25, 0.35); space.add(ringM); planetMats.push(ringMat);
const redTex = canvasTex(256, 128, (g, w, h) => {
  g.fillStyle = '#b5543a'; g.fillRect(0, 0, w, h);
  let ps = 9; const r = () => (ps = (ps * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 40; i++) { g.fillStyle = r() > 0.5 ? 'rgba(120,48,30,0.6)' : 'rgba(214,128,92,0.5)'; g.beginPath(); g.arc(r() * w, r() * h, 3 + r() * 12, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#efe2d6'; g.fillRect(0, 0, w, 7); g.fillRect(0, h - 5, w, 5);
  g.fillStyle = 'rgba(80,30,20,0.55)'; g.fillRect(40, h * 0.52, 90, 4);           // Valles Marineris, a canyon as long as America is wide
});
const redMat = new THREE.MeshStandardMaterial({ map: redTex, roughness: 1, transparent: true, opacity: 0, fog: false });
const redPlanet = new THREE.Mesh(new THREE.SphereGeometry(11, 32, 20), redMat);
redPlanet.position.set(-125, 9, 120); space.add(redPlanet); planetMats.push(redMat);

// Launch smoke: billows out across the pad at ignition
const smokeMat = new THREE.MeshStandardMaterial({ color: 0xd8d6d0, roughness: 1, transparent: true, opacity: 0, depthWrite: false });
const smoke = [];
for (let i = 0; i < 18; i++) {
  const m = new THREE.Mesh(puff, smokeMat);
  const a = i / 18 * Math.PI * 2 + rnd() * 0.3;
  m.userData = { a, d: 1 + rnd() * 1.5, s: 0.8 + rnd() * 0.8 };
  m.visible = false; groundSet.add(m); smoke.push(m);
}

export { atmo, atmoMat, canvasTex, earth, earthMat, giant, giantMat, moonMat, planetMats, redMat, redPlanet, ringM, ringMat, smoke, smokeMat, space, spaceBot, spaceTop, starMat, stars };
