import { airportScenery } from '../scenery/runway.js';
import { walkPose } from '../people/people.js';
import { hall, hallSet } from '../airport/hall.js';
import { S, clamp01, ease, linked, settled, sm } from './state.js';

// Skyrender the jet: takeoff roll, liftoff and climb, its captions, and the airport hall that rises up
// for "See inside airport" and "Go inside airport". The plane cabin is its own world in cabin/cabin.js.
// Plane: wait on the runway, roll, lift off, climb above the clouds
const PLANE_LIFT = 7;
function planeCaption() {
  if (S.on.goin) return S.hallK < 0.95 ? 'Jasper Junction Airport rises up' : S.driveK < 0.02 ? 'The big glass doors slide open' : S.driveK < 0.99 ? 'Rolling inside the airport' : 'Parked inside at Gate 1. Travelers and pilots hurry by with their suitcases';
  if (S.on.peek) return 'Inside Jasper Junction Airport: travelers and pilots pulling suitcases';
  if (S.planeT < 2) return 'Plane mode, lined up on the runway';
  if (S.planeT < PLANE_LIFT) return 'Rolling down the runway';
  if (S.planeT < PLANE_LIFT + 2.5) return 'Liftoff!';
  if (S.planeT < PLANE_LIFT + 7) return 'Climbing into the sky';
  return 'Cruising above the clouds';
}

// ---------- the airport hall: rises up, the plane rolls in, people walk around with suitcases ----------

const HALL_D = 16;                                       // how far the plane rolls in
function runHall(dt) {
  const want = S.plan.to === 0 && (S.on.peek || S.on.goin) && !S.parkState ? 1 : 0;
  S.hallK += (want - S.hallK) * Math.min(1, dt * 0.9);
  const canDrive = S.on.goin && S.hallK > 0.95 && S.pending === null && S.planeT === 0 && settled();
  S.hallDoorK += ((S.on.goin && S.hallK > 0.9 ? 1 : 0) - S.hallDoorK) * Math.min(1, dt * 1.5);
  S.driveK = Math.min(1, Math.max(0, S.driveK + (canDrive && S.hallDoorK > 0.9 ? 1 : -1) * dt * 3.0 / HALL_D));
  S.hallZ = sm(S.driveK) * HALL_D;
  S.viewK += (((S.on.peek || (S.on.goin && S.driveK > 0.2)) && S.hallK > 0.5 ? 1 : 0) - S.viewK) * Math.min(1, dt * 1.2);
  hallSet.visible = S.hallK > 0.001; hallSet.scale.y = Math.max(0.001, sm(S.hallK));
  airportScenery.scale.y = Math.max(0.001, 1 - sm(S.hallK)); airportScenery.visible = S.hallK < 0.999;
  for (const d of hall.doors) d.g.position.x = d.x0 + d.sx * 3.1 * sm(S.hallDoorK);
  if (!hallSet.visible) return;
  for (const b of hall.bags) { const a = b.a + S.clockT * 0.35; b.m.position.set(b.cx + Math.cos(a) * 2.6, 0.9, b.cz + Math.sin(a) * 1.43); b.m.rotation.y = -a; }
  for (const t of hall.travelers) {
    const u = ((S.clockT * t.speed / t.curve.getLength() + t.off) % 1 + 1) % 1;
    const pos = t.curve.getPointAt(u), tan = t.curve.getTangentAt(u);
    t.p.position.copy(pos); t.p.rotation.set(0, Math.atan2(tan.x, tan.z), 0);
    walkPose(t.p, S.clockT * 7 * t.speed + t.off * 9, 1);
    t.p.userData.arms[1].rotation.x = 0.35;                                   // holding the suitcase handle behind
  }
}

// Every frame: roll, lift off and climb. Returns how far up it is (0 on the ground, 1 cruising).
function runPlane(sdt, live) {
  // Plane: takeoff roll, liftoff and climb
  if (S.plan.to === 0 && live && S.pending === null && !S.on.peek && !S.on.goin && !linked.board.active && !linked.cab.active && linked.board.k < 0.01) S.planeT = Math.min(60, S.planeT + sdt);
  const roll = clamp01((S.planeT - 2) / (PLANE_LIFT - 2));
  S.planeSpeed = S.plan.to === 0 ? (S.planeT < 2 ? 0 : 6 + 22 * Math.min(1, roll * 1.2)) : 0;
  const air = S.plan.to === 0 ? ease(clamp01((S.planeT - PLANE_LIFT) / 7)) : 0;
  S.planeTravel += S.planeSpeed * sdt * (1 - air);
  return air;
}

export { PLANE_LIFT, planeCaption, runHall, runPlane };
