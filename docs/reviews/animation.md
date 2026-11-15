# Animation review

## What already works

The way the toy plans its moves is the real strength. Small parts tuck away, the body hinges, and new parts come out, with groups overlapping so the motion ripples; the accordion panels open one fold at a time, which shows the one-machine idea better than any caption. Small true touches are everywhere: gear doors open just before the wheels pass, side rods ride the crank pins, the rocket climbs slowly then faster, the train pulls away gently and brakes harder, the crash rewinds along the same paths, and the scrubber lets Jasper drag through any change like a magnifying glass.

A read-only timing check (no build, no tests): plane to robot is 11.4 seconds with 23 captions, each up for 0.4 seconds on average. Plane to big rig is 12.1 seconds with 30 captions, about 0.3 seconds each, and up to 150 parts moving at once. No change ever holds still for a moment.

## Suggestions, best value first

**1. One step at a time**
- Jasper notices: each caption stays up long enough to read to him, and matches what moves.
- Change: when `planMorph` builds `steps`, keep a step only if it starts 1.6 seconds or more after the last one kept (about 7 per change). While paused or scrubbing, `caption()` still shows every step. The `sfx.click` on each caption thins out with it.
- Why: a child follows one cause and effect at a time; three captions a second is noise.
- Effort: small. Verify: rerun the timing check; watch whether he points at the part named.

**2. Short pauses between phases**
- Jasper notices: the plane sits, pauses, stands up as a robot, and he has a beat to see "it's a robot now" before the little parts come out.
- Change: in `planMorph`, replace the 0.5 second overlap `OV` with gaps: `startB = endA + 0.3`, `startC = endB + 0.6`. About 2 seconds longer.
- Why: a held silhouette registers before details steal attention.
- Effort: small. Verify: `test:rig` (end poses unchanged), scrub screenshot at `endB`.

**3. Camera holds still and faces the action**
- Jasper notices: the side the captions describe stays in view while it transforms.
- Change: in `frame()`, add `&& settled()` to the auto-orbit (`theta += dt * 0.1`). While morphing and not dragged, ease `theta` toward 0.9 (front-right three-quarter), or about 2.2 for the big rig so the trailer unfolds toward him.
- Why: staging means the moving part is visible when it moves; over 11 seconds the camera now drifts round to the far side.
- Effort: small. Verify: mid-morph screenshots in `all-modes.js`.

**4. Wheels on the ground turn with the ground**
- Jasper notices: the trailer wheels spin as the big rig drives, and nothing spins in place while parking.
- Change: `rig.wheels` turn only with `S.trainSpeed`, so the trailer bogies skid down the road; use `trainSpeed + truckSpeed`. When parking, `S.crank` adds a constant `H_SPEED` while the drive eases with `sm()`; use the real speed (change in `S.parkZ` over `dt`).
- Why: rolling contact is the first thing kids check on a vehicle.
- Effort: small. Verify: watch it; stills cannot show spin.

**5. Steam chuffs line up with the wheels**
- Jasper notices: each puff comes as the big wheels push, slow at the station, quick at speed.
- Change: in `runPuffs`, fire the puff and `sfx.chuff` whenever `Math.floor(S.crank / Math.PI)` changes (twice per wheel turn), keeping the 0.12 second minimum, instead of the free-running `puffNext` timer.
- Why: one shared rhythm shows that steam drives the wheels.
- Effort: small. Verify: watch the departure from Jasper Junction.

**6. Heavy parts move heavy, small parts move quick**
- Jasper notices: the big body swings slow and steady; vents, nozzles and fists snap out neatly.
- Change: all segments use one cubic `ease`. Tag segments with the joint `kind` in `planMorph`; in `poseRig` give `body` a slower start (quintic in-out) and `acc` a quick start with soft stop (`1 - (1-t)^3`).
- Why: how a thing starts and stops is how the eye judges its weight.
- Effort: small. Verify: `test:rig`; side-by-side viewing.

**7. A click when things lock**
- Jasper notices: a soft clack when the smokestack halves meet or the toe blocks lock, and one gentle settle when the change is done.
- Change: mark `lock: true` on `st`, `cc`, `toeB`, `heel`, `fist`. In `frame()`, play a short low `tone` when `S.tt` crosses a lock segment's `t1`. When `S.tt` reaches `S.plan.T`, set `S.stompK = 0.5` to reuse the stomp dip.
- Why: a sound at the moment of contact ties cause to effect. No overshoot, so halves never cross.
- Effort: small to medium. Verify: by ear.

**8. The robot's feet stop skating on the walk home**
- Jasper notices: the robot really walks into its house instead of gliding.
- Change: it marches in place (`marchPh` 4.4 per second) while moving at `H_SPEED` 3.2, so each planted foot slides about 2 units a step. For the robot, slow the drive to about 1.2 and swing the lifted thigh forward a little, scaled to speed.
- Why: a planted foot with the body passing over it is what reads as walking.
- Effort: medium. Verify: watch `park`; `p6-robot-walk.png` cannot show sliding.

**9. Big robot moves slow, tiny robot moves quick**
- Jasper notices: GIANT stomps and waves slowly; tiny scurries.
- Change: multiply the march rate (4.4) and wave rate (9) by `1 / Math.sqrt(scale)`; let the forearm wave lag the arm lift slightly.
- Why: it is true physics (long limbs swing slower, like a long pendulum), and he can test it.
- Effort: small. Verify: switch Small, Medium, Big while marching.

**10. The farmer climbs, he does not grow**
- Jasper notices: the farmer climbs up and over into his seat.
- Change: he now slides straight while scaling from 0.4 to 1 in plain view. Add an `arc` value to the joint spec; in `poseRig` add `arc * 4k(1-k)` to height (exactly zero at both ends, so the rig test stays exact). Finish the scale in the first 40 percent, while he is still inside.
- Why: living things move in arcs, and a person swelling up breaks the one-machine feel.
- Effort: medium. Verify: scrub screenshots into Skyfly.

**11. Little tractor wheels spin faster**
- Jasper notices: Skyfly's small front wheels spin faster than the giant back ones.
- Change: all drivers share `S.crank`, sized for a 0.4 wheel; Skyfly's tires are about 0.5 front and 0.82 back. Store each tire radius in `driverSet` and, in tractor mode only, turn by `0.4 / radius` of the crank. Train mode stays locked for the side rods.
- Why: a true fact about the world he can watch.
- Effort: small to medium. Verify: watch it.

**12. The nose stays up while climbing**
- Jasper notices: the jet points up as it climbs and levels off at the clouds.
- Change: `pitch` in `frame()` returns to level about 5 seconds after liftoff while the climb runs 7. Rise over 1.5 seconds, hold, then level as `air` nears 1.
- Why: a plane climbs because it points up.
- Effort: small. Verify: screenshot at `planeT` about 11.

## Could not judge from code and stills

- Rotations blend each angle separately; the wing move into train (order ZYX) and the robot head's slide-and-turn may pass through the body midway. Scrub slowly.
- The robot rears up on its hip and the ground snap lifts it each frame, so the tail may scrape forward. Watch the first two seconds.
- Which way the march rock leans (it should lean over the planted foot).
- Frame rate on his device, and whether he reads captions or listens to you.
- Reverse changes (robot to plane) show fewer captions because many parts lack `stowSay`.
