# Skyrender sound review

## What already works

Most big moments already answer Jasper with a sound, and several are true to life: the train whistle is a chord like real chime whistles, the tower radio crackles, the call button is a high-low airline chime. Levels are mostly soft, and the cockpit's silly buttons already change pitch each press, so they never grate. What's missing is the quiet layer underneath: worlds sound alike between presses, many buttons are silent, and every repeat is an exact copy.

## Every current sound

| Moment | How it's made | Verdict |
|---|---|---|
| Transform starts | `sfx.whirr`: soft sawtooth sliding 110 to 360 Hz | Good. Same every time |
| Each step caption while transforming | `sfx.click` | Good ratchet feel |
| Garage door, put away and take out | `sfx.garage`: low hiss plus 9 pulses | Good |
| Parked, good night | `sfx.goodnight`: four rising sine notes | Warm. Keep |
| Robot Small / Medium / Big | `sfx.size`: sweep up or down | Clear. Keep |
| Robot march | `sfx.stomp`: 75 Hz thump | Good; nearly silent on phones |
| Train whistle | `sfx.whistle`: chord plus steam hiss | True and lovely |
| Train chuff | `sfx.chuff`: one filtered puff | Identical every beat |
| Tractor honk | `sfx.honk`: two square-wave beeps | Fine; a bit buzzy |
| Big rig air horn | `sfx.airhorn`: three-note sawtooth chord | True. Keep |
| Animal sounds | `sfx.farm`: moo, oinks, neigh | Charming |
| Launch Jr. | `sfx.jet` | Good |
| Countdown 3, 2, 1, Blast off | `sfx.beep` | Clear, but the sharpest sound in the toy (loud tone near 1,000 Hz, where ears are most sensitive) |
| Rocket roar, jet, truck engine | one shared filtered-noise bed in `frame()` | Works, but the rocket roars in space, the truck sounds like wind, tractor and train have no engine |
| Truck crash | `sfx.skid`, `sfx.crash`, `sfx.siren` | Exciting; the siren is harsh and starts at full volume |
| Cockpit buttons | `beep` in cabin.js | Good; silly buttons vary pitch |
| Call, seatbelt, food, touchdown | `sfx.ding` | Call is true; a seatbelt sign is one chime |
| Captain's PA, tower radio | chime; noise crackle | True details. Keep |
| Liftoff, party, bin surprise | `sfx.surprise` arpeggio | Fine |
| Bathroom flush, snack plinks, BUMPY | noise, tiny tone, `sfx.rumbleHit` | Fun |
| Silent | gear, doors, hatch, lights, plow, spray, brakes, swing arm, passing cars, every world's background | The biggest gap |

## Suggestions, best first

First, one small test helper: wrap each `sfx` function so it records its name in `window.__sfx` (before the sound-on check), and have `frame()` record the engine levels in `window.__mix`. Tests can't listen, but they can assert that a sound was asked for at the right moment. Daniel listens for the rest.

**1. Space goes quiet.**
Jasper hears: the roar fades to nothing as the rocket leaves the sky.
Change: in `frame()`, multiply `roar` by `(1 - sp)` so the bed reaches zero in orbit. Caption: "Shh. Space is quiet. No air to carry sound."
True thing: sound needs air to travel.
Effort: small. Check: `__mix` gain is 0 in orbit.

**2. Air brakes hiss.**
Jasper hears: "Pssshhh" when the big rig or train stops.
Change: new `sfx.airBrake()`: highpass noise at 3 kHz, 0.6 s, level 0.06; for the train, a softer 1.5 kHz steam hiss. Call from `doAction` when `stop` turns on.
True thing: big trucks stop with air, which is why they hiss.
Effort: small. Check: `__sfx` contains `airBrake` after clicking Stop truck.

**3. No two sounds exactly alike.**
Jasper hears: honks, chuffs and beeps that feel alive instead of copied.
Change: in `play()`, pick a pitch factor (plus or minus 3%) and level factor (0.9 to 1.1) that `tone()` and `noise()` use. Chords stay in tune because it's shared per call.
Effort: small. Check: two `play` calls get different factors.

**4. Gentler for small ears.**
Jasper hears: nothing jarring, even when the crash, siren and engine overlap.
Change: add a `DynamicsCompressorNode` after `master` (threshold -20 dB, ratio 4, release 0.25 s). Halve `sfx.beep` to 0.07. Lowpass the honk and siren at about 2 kHz to take the buzz off.
Effort: small. Check: Daniel plays the crash on a phone and a laptop.

**5. Whistles that mean something.**
Jasper hears: two short toots as the train pulls out; Whistle plays long, long, short, long.
Change: give `sfx.whistle` a pattern argument; `runTrain` plays two short ones when the train starts moving.
True thing: trains talk in whistles. Two short means "here we go"; long, long, short, long means "coming to a crossing."
Effort: small. Check: `__sfx` shows two whistles within 3 seconds of departure.

**6. A real chuff, and clickety-clack.**
Jasper hears: "chuff-a chuff-a," then "clack-clack" over the rail joints.
Change: `sfx.chuff` accents every fourth beat and varies its filter from 400 to 650 Hz. `runPuffs` adds two tiny clicks (highpass noise, 0.03 s) each time `stationTravel` passes a rail length.
True thing: a steam engine puffs four times per wheel turn; rails have gaps.
Effort: medium. Check: count clacks per distance in `__sfx`.

**7. Each engine sounds like itself.**
Jasper hears: the big rig's deep diesel rumble, the tractor's slow putt-putt.
Change: a second engine bus: a sawtooth at the firing rate through a 300 Hz lowpass. Big rig 30 Hz idling to 80 Hz moving; tractor 20 to 35 Hz with a slight wobble. Harmonics keep it audible on phones.
True thing: diesels thump because each cylinder fires in turn; slower engines thump slower.
Effort: medium. Check: `__mix` engine pitch rises with `truckSpeed`.

**8. Cars go "neee-owww".**
Jasper hears: a passing car's pitch drop as it goes by.
Change: in truck.js, when a car passes the cab, play noise plus a soft tone gliding 12% down over 0.6 s, panned across with a `StereoPanner`. At most one per 3 seconds, level 0.04.
True thing: the Doppler effect.
Effort: medium. Check: `__sfx` logs `passBy` on the interstate.

**9. The plane really takes off.**
Jasper hears: engines whine up, a rumble on the runway, a "clunk" as the wheels fold, a tire chirp at touchdown.
Change: a quiet sine whine, 1.8 to 3.5 kHz, following `cab.engine` and `planeSpeed`. `sfx.gear()` (thunk plus whirr) after liftoff and on the Gear button; `sfx.chirp()` at touchdown.
True thing: jets whine from spinning fans and roar from rushing air.
Effort: medium. Check: `__sfx` order is gear after liftoff, chirp at landed.

**10. Each world has a quiet background.**
Jasper hears: birds at the farm, crickets at night, wind above the clouds, a soft station hum.
Change: a new `ambience(env, night)`: chirps (sine 3 to 5 kHz, 60 ms) at random 4 to 12 second gaps, crickets as 4.5 kHz pulses, wind as drifting bandpass noise. Level about 0.015, fading between worlds.
True thing: every place has its own sound.
Effort: medium. Check: `__mix` shows farm ambience on in farm mode, off in space.

**11. Every button answers.**
Jasper hears: a clunk for doors, a hum for the plow and swing arm, a click for lights, a hiss for the sprayer.
Change: four small functions (`latch`, `hydraulic`, `switch`, `spray`) called from `doAction`.
Effort: medium. Check: `__sfx` grows by one for every toggle in the all-modes scenario.

**12. A truer countdown and arriving siren.**
Jasper hears: soft ticks for 3, 2, 1, engines rumbling before "Blast off"; the siren growing as police arrive.
Change: soften `sfx.beep`; start a low roar from `launchT` 2; ramp the siren up over 2 seconds.
True thing: rocket engines light just before liftoff; things far away sound quieter.
Effort: small. Check: `__mix` gain above zero before "Blast off".
