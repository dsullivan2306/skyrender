import * as THREE from 'three';
import { fog0, hemi, rim, scene, sky, skyBot0, skyTop0, sun, nightGlow } from '../world/setup.js';
import { cloudMat } from '../scenery/sky.js';
import { atmoMat, earth, earthMat, giant, moonMat, planetMats, space, spaceBot, spaceTop, starMat } from '../scenery/space.js';
import { S, clamp01, ease, rig, say } from './state.js';

// Day and night, and the sky: the Day/Night button, the moon, warm windows, the headlight beam,
// and the sky fading to black with stars and planets as the rocket reaches space.
let dnBtn, NIGHT, DAY, skyTopNow, nightMoonMat, nightMoon, craterMat, beam, skyBotNow;
function buildNight() {
  dnBtn = document.getElementById('daynight');
  dnBtn.addEventListener('click', () => {
    S.night = !S.night; dnBtn.textContent = S.night ? 'Night' : 'Day'; dnBtn.setAttribute('aria-pressed', String(S.night));
    say(S.night ? 'Good night, Jasper!' : 'Good morning, Jasper!', 2);
  });
  NIGHT = { top: new THREE.Color(0x070d1c), bot: new THREE.Color(0x1d2840), moonLight: new THREE.Color(0xa9bbe6), hemiSky: new THREE.Color(0x6f80b0), cloud: new THREE.Color(0x8a93a6), win: new THREE.Color(0xffc870) };
  DAY = { sun: sun.color.clone(), hemiSky: hemi.color.clone(), cloud: cloudMat.color.clone() };
  skyTopNow = new THREE.Color(); skyBotNow = new THREE.Color();
  // A moon hangs in the night sky (the sky dome follows the camera, so it stays far away)
  nightMoonMat = new THREE.MeshBasicMaterial({ color: 0xf3efe2, transparent: true, opacity: 0, fog: false, depthWrite: false });
  nightMoon = new THREE.Mesh(new THREE.CircleGeometry(7, 32), nightMoonMat);
  nightMoon.position.set(-70, 95, -115); nightMoon.lookAt(0, 0, 0); nightMoon.renderOrder = -1; sky.add(nightMoon);
  craterMat = new THREE.MeshBasicMaterial({ color: 0xd8d2c0, transparent: true, opacity: 0, fog: false, depthWrite: false });
  for (const [x, y, r] of [[-2, 1.5, 1.4], [2.4, -1.2, 1.1], [0.6, 3.4, 0.7], [-1, -3, 0.9]]) { const c = new THREE.Mesh(new THREE.CircleGeometry(r, 16), craterMat); c.position.set(x, y, 0.05); nightMoon.add(c); }
  // Headlight beam: lights the road or rails ahead when the lamps are on after dark
  beam = new THREE.SpotLight(0xfff0d0, 0, 26, 0.42, 0.55, 1.2);
  scene.add(beam, beam.target);
}
function applyNight(n, sp) {
  skyTopNow.copy(skyTop0).lerp(NIGHT.top, n); skyBotNow.copy(skyBot0).lerp(NIGHT.bot, n);
  hemi.intensity = 0.85 - 0.4 * n; hemi.color.copy(DAY.hemiSky).lerp(NIGHT.hemiSky, n);
  sun.intensity = 0.95 - 0.4 * n; sun.color.copy(DAY.sun).lerp(NIGHT.moonLight, n);
  rim.intensity = 0.4 - 0.15 * n;
  cloudMat.color.copy(DAY.cloud).lerp(NIGHT.cloud, n); cloudMat.emissiveIntensity = 0.25 - 0.12 * n;
  for (const [m, k0] of nightGlow) m.emissiveIntensity = k0 * (1 + 2.2 * n);
  nightMoonMat.opacity = craterMat.opacity = n * (1 - sp);
  rig.M.glass.emissive.copy(NIGHT.win); rig.M.glass.emissiveIntensity = 0.55 * n;     // warm light in the windows
  rig.M.visor.emissiveIntensity *= 1 + 1.5 * n;
}

// Every frame: ease toward day or night, and blend the sky toward space (sp: 0 sky, 1 space).
function runSky(dt, air, sp) {
  // Sky fades to black, stars, Earth and the other planets come up
  S.nightK += ((S.night ? 1 : 0) - S.nightK) * Math.min(1, dt * 1.5);
  applyNight(ease(clamp01(S.nightK)), sp);
  sky.material.uniforms.top.value.copy(skyTopNow).lerp(spaceTop, sp);
  sky.material.uniforms.bottom.value.copy(skyBotNow).lerp(spaceBot, sp);
  scene.fog.color.copy(fog0).lerp(NIGHT.bot, ease(clamp01(S.nightK))).lerp(spaceBot, sp);
  scene.fog.near = 45 - 20 * air;                    // the ground fades into haze as the plane climbs
  scene.fog.far = 170 - 95 * air + sp * 3000;
  starMat.opacity = Math.max(sp, 0.85 * ease(clamp01(S.nightK)));
  space.visible = sp > 0;
  earthMat.opacity = sp; atmoMat.opacity = 0.35 * sp; moonMat.opacity = sp;
  for (const m of planetMats) m.opacity = sp;
  earth.rotation.y += dt * 0.02; giant.rotation.y += dt * 0.03;
}

export { beam, buildNight, runSky };
