import * as THREE from 'three';

const stage = document.getElementById('stage');
const scrub = document.getElementById('scrub');
const stepLabel = document.getElementById('step');
const countdown = document.getElementById('countdown');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 900);
const hemi = new THREE.HemisphereLight(0xf2f5f7, 0x50585e, 0.85); scene.add(hemi);
const nightGlow = [];             // scenery lamps that shine brighter after dark: [material, day intensity]
const glow = (m, k) => { nightGlow.push([m, k]); return m; };
const sun = new THREE.DirectionalLight(0xfff3e0, 0.95);
sun.position.set(6, 12, 7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
scene.add(sun);
const rim = new THREE.DirectionalLight(0xbfd2e6, 0.4); rim.position.set(-7, 5, -8); scene.add(rim);

// ---------- environment: sky always, ground when it stands or rolls ----------
const dusk = matchMedia('(prefers-color-scheme: dark)').matches &&
  document.documentElement.getAttribute('data-theme') !== 'light';
const PAL = dusk
  ? { top: 0x1e2c42, horizon: 0x6b7a8c, grass: 0x3a4533, pad: 0x55585a, hill: 0x2f3a33, cloud: 0xb9c2cc, pine: 0x28352b, ballast: 0x5a5852, runway: 0x3c3d3f }
  : { top: 0x6f9cc6, horizon: 0xdde7ec, grass: 0x8b9c6a, pad: 0x9a9b95, hill: 0x75876a, cloud: 0xffffff, pine: 0x4d6246, ballast: 0x8f8a80, runway: 0x55575a };
const horizon = new THREE.Color(PAL.horizon);
scene.fog = new THREE.Fog(horizon, 45, 170);

const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color(PAL.top) }, bottom: { value: horizon } },
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = normalize(vP).y; gl_FragColor = vec4(mix(bottom, top, pow(max(h, 0.0), 0.55)), 1.0); }'
}));
sky.renderOrder = -1;
scene.add(sky);

// Ground set: rises into place for robot, train and rocket; drops away when the plane flies.
const groundSet = new THREE.Group();
scene.add(groundSet);
const grass = new THREE.Mesh(new THREE.CircleGeometry(170, 48), new THREE.MeshStandardMaterial({ color: PAL.grass, roughness: 1 }));
grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; groundSet.add(grass);

// Landing pad: sinks under the grass when the tracks come up
const padSet = new THREE.Group(); groundSet.add(padSet);
const pad = new THREE.Mesh(new THREE.CircleGeometry(8, 48), new THREE.MeshStandardMaterial({ color: PAL.pad, roughness: 0.95 }));
pad.rotation.x = -Math.PI / 2; pad.position.y = 0.01; pad.receiveShadow = true; padSet.add(pad);
const ring = new THREE.Mesh(new THREE.RingGeometry(6.6, 6.8, 64), new THREE.MeshStandardMaterial({ color: 0xe8e7e2, roughness: 0.8 }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; padSet.add(ring);
for (const a of [0, Math.PI / 2]) {
  const j = new THREE.Mesh(new THREE.PlaneGeometry(16, 0.05), new THREE.MeshStandardMaterial({ color: 0x5f615e }));
  j.rotation.set(-Math.PI / 2, 0, a); j.position.y = 0.015; padSet.add(j);
}

const skyTop0 = new THREE.Color(PAL.top), skyBot0 = new THREE.Color(PAL.horizon), fog0 = new THREE.Color(PAL.horizon);

export { PAL, camera, countdown, dusk, fog0, glow, grass, groundSet, hemi, nightGlow, padSet, reduceMotion, renderer, rim, scene, scrub, sky, skyBot0, skyTop0, stage, stepLabel, sun };
