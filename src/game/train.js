import { S } from './state.js';
import { sfx } from '../audio/audio.js';
const RAIL = 12;                                   // rail length: the wheels clack over each joint

// The Skyrender train, every frame: waits at Jasper Junction, then pulls out and chugs along.
// Its steam is in game/puffs.js; the big driving wheels and side rods turn in the main loop
// (the truck and tractor use the same wheels). Its buttons and captions are in game/core.js.
function runTrain(dt, sdt, live) {
  // Train: steam at the platform, then pulls out of the station
  const t0 = S.trainT, d0 = S.stationTravel;
  if (S.plan.to === 2 && live) S.trainT += sdt;
  if (t0 < 2.5 && S.trainT >= 2.5 && !S.on.stop) sfx.whistle('SS');   // two short toots: here we go
  const wantSpeed = S.plan.to === 2 && live && S.trainT > 2.5 && !S.on.stop ? 8 : 0;
  S.trainSpeed += (wantSpeed - S.trainSpeed) * Math.min(1, dt * (wantSpeed > S.trainSpeed ? 0.35 : 1.6));
  if (S.trainSpeed < 0.01) S.trainSpeed = 0;
  S.stationTravel += S.trainSpeed * sdt;
  if (Math.floor(S.stationTravel / RAIL) !== Math.floor(d0 / RAIL)) sfx.clack();   // clickety-clack
}

export { runTrain };
