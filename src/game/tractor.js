import { FARM_P, animals, farmMove } from '../scenery/farm.js';
import { S, rig, settled, wrap } from './state.js';
import { emitPuff, stackTop } from './puffs.js';

// Skyfly the tractor, every frame: drives down the farm lane, puffs from the exhaust, sprays, plows,
// and the farm animals graze, wander and hop. Its buttons and captions are in game/core.js.
function runTractor(dt, sdt, live) {
  // Tractor: putters slowly down the farm lane; the plow kicks up dirt
  if (S.plan.to === 5 && live) S.tractorT += sdt;
  const wantTractor = S.plan.to === 5 && live && S.tractorT > 1.5 && !S.on.stop ? (S.on.plow ? 2.2 : 3.6) : 0;
  S.tractorSpeed += (wantTractor - S.tractorSpeed) * Math.min(1, dt * 0.8);
  if (S.tractorSpeed < 0.01) S.tractorSpeed = 0;
  S.farmTravel += S.tractorSpeed * sdt;
  farmMove.position.z = wrap(-S.farmTravel, FARM_P / 2);
  if (S.plan.to === 5 && settled()) {                                    // little puffs from the exhaust stack
    S.tractorPuff += sdt;
    if (S.tractorPuff > (S.tractorSpeed > 0.3 ? 0.35 : 0.8)) { S.tractorPuff = 0; rig.stack.getWorldPosition(stackTop); stackTop.y += 0.45; stackTop.x = 0; emitPuff(0.45, stackTop.clone(), 0x4a4a4a); }
  }
  if (S.plan.to === 5 && settled() && S.on.spray) {                       // fine mist along both sprayer booms
    S.sprayClock += sdt;
    if (S.sprayClock > 0.05) { S.sprayClock = 0;
      const w = rig.named.wings[Math.random() < 0.5 ? 0 : 1]; const sp = 0.6 + Math.random() * 3.0;
      stackTop.set(w.s * sp, -0.1, -1.0 - sp * 0.2).applyMatrix4(w.j.matrixWorld); emitPuff(0.22, stackTop.clone(), 0xd8ecf7); }
  }
  if (S.plan.to === 5 && S.on.plow && S.tractorSpeed > 0.3) { S.plowDust += sdt; if (S.plowDust > 0.18) { S.plowDust = 0; for (const f of rig.named.feet) emitPuff(0.5, f, 0x7a5a3a); } }
  for (const a of animals) {                                          // grazing, wandering, wiggling
    const c = a.c, ud = c.userData, t = S.clockT + a.ph;
    ud.hop = Math.max(0, ud.hop - dt * 1.5);
    if (ud.kind === 'horse') { const ang = t * 0.25; c.position.set(a.x0 + Math.cos(ang) * 1.6, 0, a.z0 + Math.sin(ang) * 3); c.rotation.y = -ang; }
    else if (ud.kind === 'pig') { const ang = t * 0.6; c.position.set(a.x0 + Math.cos(ang) * 0.6, 0, a.z0 + Math.sin(ang) * 0.8); c.rotation.y = -ang; }
    else c.rotation.y = a.a0 + Math.sin(t * 0.15) * 0.4;
    const moving = ud.kind !== 'cow';
    ud.legs.forEach((l, i) => l.rotation.x = moving ? Math.sin(t * (ud.kind === 'pig' ? 12 : 7) + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.5 : 0)) * 0.45 : 0);
    ud.neck.rotation.x = (ud.kind === 'horse' ? -0.7 : 0) + (ud.kind === 'cow' ? 0.35 + Math.sin(t * 0.8) * 0.35 : Math.sin(t * 3) * 0.08);
    ud.tail.rotation.z = Math.sin(t * 4) * 0.4;
    c.position.y = Math.abs(Math.sin(ud.hop * Math.PI * 2)) * 0.35 * ud.hop;
  }
}

export { runTractor };
