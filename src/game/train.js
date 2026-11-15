import { S } from './state.js';

// The Skyrender train, every frame: waits at Jasper Junction, then pulls out and chugs along.
// Its steam is in game/puffs.js; the big driving wheels and side rods turn in the main loop
// (the truck and tractor use the same wheels). Its buttons and captions are in game/core.js.
function runTrain(dt, sdt, live) {
  // Train: steam at the platform, then pulls out of the station
  if (S.plan.to === 2 && live) S.trainT += sdt;
  const wantSpeed = S.plan.to === 2 && live && S.trainT > 2.5 && !S.on.stop ? 8 : 0;
  S.trainSpeed += (wantSpeed - S.trainSpeed) * Math.min(1, dt * (wantSpeed > S.trainSpeed ? 0.35 : 1.6));
  if (S.trainSpeed < 0.01) S.trainSpeed = 0;
  S.stationTravel += S.trainSpeed * sdt;
}

export { runTrain };
