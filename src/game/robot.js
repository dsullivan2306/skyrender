import { sun } from '../world/setup.js';
import { sfx } from '../audio/audio.js';
import { S, lerpJ, rig } from './state.js';

// The robot, every frame, on top of its pose: waving, GIANT and tiny sizes, and marching in place.
// k(id) is how far each toggle has eased in (0 to 1), from applyToggles in game/core.js.
function runRobot(dt, k) {
  const w = k('wave');
  if (w > 0) {                                        // right arm swings up and waves
    rig.named.uaR.rotation.y -= 2.3 * w;
    rig.named.faR.rotation.x += (0.6 + Math.sin(S.clockT * 9) * 0.45) * w;
  }
  // Size: GIANT grows and slides out extra detail; tiny shrinks and packs parts away
  const kb = k('big'), ks = k('small'), N = rig.named;
  const scale = 1 + 1.3 * kb - 0.58 * ks;
  rig.bot.scale.setScalar(scale);
  for (const b of rig.sizeBits.big) b.g.position.lerpVectors(b.from, b.to, kb);
  for (const w of N.wings) { w.j.rotation.z -= w.s * 0.6 * kb; w.j.rotation.y += w.s * 1.05 * ks; }   // battle wings spread wide / fold down like a cape
  for (const j of [...N.pauldrons, ...N.nozzles, ...N.ears, ...N.hips]) lerpJ(j, j.userData.stow, ks);
  lerpJ(rig.mask, rig.mask.userData.poses[1], ks);
  const sh = 8 * Math.max(1, scale);
  if (sun.shadow.camera.right !== sh) { Object.assign(sun.shadow.camera, { left: -sh, right: sh, top: sh, bottom: -sh, far: 40 * Math.max(1, scale) }); sun.shadow.camera.updateProjectionMatrix(); }
  // March in place: each thigh lifts while its knee bends back the same amount, so the foot
  // rises and comes down flat. A thump every time a foot lands; the body rocks side to side.
  if (S.parkMoving && S.plan.to === 1) S.blend.march = 1;
  const mk = k('march');
  if (mk > 0) {
    S.marchPh += dt * 4.4;
    for (const [i, L] of rig.named.legs.entries()) {
      const wave = Math.sin(S.marchPh + i * Math.PI), lift = Math.max(0, wave) * 0.75 * mk;
      L.thigh.rotation.x -= lift; L.knee.rotation.x += lift;
      if (L.was > 0 && wave <= 0 && mk > 0.5) { sfx.stomp(); S.stompK = scale; }
      L.was = wave;
    }
    rig.joints[0].rotation.z += Math.sin(S.marchPh) * 0.035 * mk;
  } else S.marchPh = 0;
}

export { runRobot };
