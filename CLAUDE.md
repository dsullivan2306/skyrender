# Skyrender

A transforming toy built for Jasper (Daniel's son). One machine changes between seven modes: plane, robot, train, rocket, big rig (semi truck with the SKYRENDER trailer), Skyfly (farm tractor) and helicopter. Each mode has its own world, with toggles and surprises. Jasper comes up with most of the ideas, and some requests are typed by Jasper himself. Built with Three.js r128 and Vite. The page is `index.html`; the code is ES modules under `src/` (map below). The original single file is in git history as Checkpoint 0.

## Why Skyrender exists

In Daniel's words: "We are building something to make my son's brain expand and be on fire; not to impress anyone else, not to market to other kids, not to be anything it isn't. I want him to dream, be interested, learn, enjoy."

The goal behind each request: Jasper sees his own ideas become real. When choosing between two ways to build something, pick the one that makes him more curious, teaches him something true about how the world works, or invites him to imagine the next thing. Go deeper, not bigger. Never add anything to look impressive, chase attention or keep him hooked (no streaks, rewards, timers or nagging).

## Rules that never bend

- **One machine.** Every part of every mode exists in all forms. Parts unfold, slide, rotate or tuck away. Nothing pops in or vanishes. A new part has to be stored, hidden, inside the body in the other modes. `npm run test:rig` checks this numerically. It must pass, worst error near 1e-15.
- **Original IP only.** No Transformers or Hasbro names, logos or symbols. No Boeing, Tesla or Mack likeness. The truck is a generic American semi. Only the tractor is called Skyfly; everything else is Skyrender.
- **People stay safe.** Crashes, wrecks, the falling building and the bad guy are all fine, but nobody gets hurt. Airbags, police help, passengers shown safe.
- **Kid voice.** Captions and button labels are short, warm and concrete, written for Jasper to read. No italics anywhere: not in code comments shown to Daniel, not in captions, not in replies.
- **Look and feel.** Restrained, durable, modular: Japanese and Scandinavian restraint, soul over polish. Muted palette with the maroon accent `#7a2430`. No flash.
- **Light and dark both work.** The page has light and dark color tokens and must stay readable at phone width.

## Setup (first time)

`npm install`, then `npx playwright install chromium` (the browser the click-through tests drive). Requires Node 20.19 or newer (Vite 8).

- `npm run dev`: play it at http://localhost:5173 while editing; the page reloads on save.
- `npm run build`: builds the page into `dist/`. `npm run preview` serves that build.
- The built page needs a web server (browsers won't run modules from a double-clicked file).

## How work gets done

- **Before building a Jasper idea, ask four questions** and answer them in the commit message: (1) What would a top toy designer add that he didn't ask for? (2) What real-world detail would make it feel true (how a real ladder extends, what a real signal means)? (3) Which method or field does this best (animation timing, sound design, real procedures)? (4) What, besides my own opinion, shows it works (a test, a screenshot, how Jasper plays with it)? Use other fields to find methods, not to play characters.
- **Watching Jasper play beats any request.** When Daniel shares what Jasper did (pressed Crash! ten times, got bored in the cabin), treat it as the best input there is.
- **Jasper's privacy.** The project is public. Nothing about how Jasper plays ever leaves his iPad; nothing personal about him goes in the code beyond his first name.
- **Jasper's ideas reach us with no account.** In the game's "Jasper's ideas" panel he types a new idea or a change and taps "Send to Dad". The game locks it (`src/ideas/send.js`: AES-GCM, with the key locked by the RSA public key in `src/ideas/key.js`) and posts it to the ntfy.sh relay topic in `key.js` (kept 12 hours). Every hour `.github/workflows/idea-inbox.yml` copies new locked ideas into the `idea-inbox` branch. Only the private key at `~/.skyrender/idea-key.json` on Daniel's Mac unlocks them; never put it in the project. When Daniel says to check Jasper's ideas, run `node tools/read-ideas.mjs` (add `--json` for details). Build each new one, and in the same commit add it to `src/ideas/list.js` with his exact words (never made up), the date, and a short kid-voice `what` line; that also clears it from his Sent list. Also mirror it to the claude.ai idea box Daniel can see (https://claude.ai/artifact/FF7jNviYAGQburkFhaCpze, collection `ideas`, status `waiting`/`building`/`done`); Jasper never opens that page. GitHub pauses scheduled jobs after 60 days with no commits; if ideas stop arriving, run the workflow by hand (`gh workflow run idea-inbox.yml`).
- **One Jasper request = one git commit.** Quote his request in the commit message, in his words.
- **Run the tests before every commit:** `npm test` builds the page, then runs the rig check plus the click-through scenarios against `dist/`: all modes and every action button, garage and robot house, airport, plane cabin, reboarding, cancelled boarding, all the planets and the Mars landing (`planets.js`), the Mars rover (`rover.js`), Skyfly as a rover and the Moon landing (`skyfly-moon.js`), meteors on the Moon (`moon-storm.js`), the helicopter (`helicopter.js`: boarding, blades, every control, the landing places, flying home), the deeper worlds (`worlds.js`: crossing, water cannons, plow birds, wing lights, pendulum legs, arm pump), and the home screen install check (manifest and icons). Each scenario prints `errors []` on success. Last, `npm run test:shots` compares every screenshot with the approved one in `tests/baseline/`. `npm test` stops at the screenshot comparison when shots changed on purpose, and the iPad checks come after it: after `npm run baseline`, run `npm run test:ipad` too. To run one scenario (for example `npm run test:park`), run `npm run build` first.
- **Upload straight away:** after `npm test` passes and the commit is made, push to `main` (`git push`) without asking. Daniel gave this standing OK on 2026-11-15. The site updates about 2 minutes later; check the run with `gh run watch`. Anything beyond a normal push (force-push, rewriting history, changing GitHub settings) still needs his OK first.
- **iPad checks.** `npm test` also runs the all-modes, plane cabin and helicopter scenarios in WebKit (the engine inside Safari) at iPad Air size, pressing every button with a finger tap (`npm run test:ipad`, shots in `tests/shots-ipad/`, not compared). `npm run perf` measures the game's own work per frame in each mode (plus space with the astronauts out) at iPad pixel density; the 8 ms budget on Daniel's Mac is an estimate (an iPad is about twice as slow), so it reports rather than fails. After the smoothness pass (2026-11-15): 4 to 6 ms typical in every mode, all within budget, about 900 to 1,200 draws per frame. What made it quicker: hidden worlds skip their position math (`skipWhenHidden` in `core.js`), the toy's outline is measured only for parts that moved (`exactBox` in `rig.js`), and fixed parts with the same paint are joined into one shape (`mergeFixedParts` in `state.js`; any part the game reaches for by name stays separate). A new part the game moves or hides must be reachable from `rig` (for example `rig.named`), or it may get joined.
- **Screenshots are exact.** The test harness (`tests/shoot.js`) pins everything that could vary: a stepped clock, a seeded `Math.random`, timers on the stepped clock, and no CSS fades. It also skips all drawing except on the last frame of each `step(n)`, so anything drawn once (like Skyfly's photo) is blank unless the test uses `step(1)` across that frame. The same code gives the same pixels every run, and only in the tests; the game itself stays random and real-time. Any changed pixel means the game looks different. The compare step lists the changed shots and writes red-marked copies to `tests/compare/diff-*.png`. If the change is meant, look at those shots, run `npm run baseline` to approve them, and commit `tests/baseline/` with the change. If it isn't meant, it's a bug. The baseline was taken on Daniel's Mac; another machine may draw text slightly differently.
- **Changing an existing feature:** only the screenshots that show the change should differ. Look at each diff before approving.
- **Adding a feature:** add a scenario in `tests/scenarios/` that walks through it, add it to `npm test`, and approve its new shots with `npm run baseline`.
- **Big new worlds** (like the plane cabin) get their own scene, camera and UI panel so they don't tangle with the transforming toy.
- **Sound** is synthesized with Web Audio (`tone`, `noise`, `play` and the `sfx` object). No audio files.
- **Reporting back:** tell Daniel what Jasper will see in kid terms, then a short note for Dad on limits or trade-offs.

## Map of the code (src/)

`src/main.js` imports the modules in the order the old single file ran, top to bottom. Keep that order: a module may only import from modules listed above it in `main.js`. Building things in the same order keeps the seeded scenery and everything else exactly as before. Search for these anchors rather than trusting line numbers:

- `rig/rig.js`: the rig, pure and free of page globals (`tests/rigtest.js` imports it directly).
  - `buildRig(THREE)` builds the machine.
  - `J(parent, pivot, spec)` creates a joint with a pose per mode (`{p, r, S}`). A mode's pose can name another mode to borrow it (`rover: 'train'`).
  - `MODES` has a seventh shape, `rover` (index 6), with no mode button: Skyfly's Mars and Moon rover (back half flipped forward into side pods, wings folded into a flat deck, the six train wheels down, the right chrome stack as a mast with the nose on top as the camera head, the fists as front cameras). Joints without a rover pose keep the plane pose. Planner extras used only by the rover: `late` (move last on the way in, first on the way out), `first` (the reverse) and `bodyArc` (lift a body part up and over). The rig check covers all 8 shapes.
  - The helicopter (`heli`, index 7, mode button 7) reuses the wings (flipped up into a roof deck with the engines on top), the train's side rods (skids), the fin and stabilizers, and adds its own parts at the very end of `buildRig`: mast and four telescoping blades folded in the belly, tail boom and tail blades folded in the right tail cone, skid legs, windshield panes. They're made inside `quietly()` (their own random numbers, so nothing built later shifts), marked `heliOnly` (left out of the truck crash) and not drawn while fully stowed (`rig.heli.stowed`). `rig.heli` is the game's handle on them.
  - `planMorph` and `poseRig` blend between poses.
  - `fanPanel` builds the accordion panels.
- `rig/textures.js`: `makeTextures`, the livery artwork drawn on canvases.
- `world/setup.js`: page elements, renderer, scene, camera, lights, `PAL` colors, sky dome, ground and landing pad, `glow` for lamps that brighten at night.
- `scenery/`: one module per world, switched on by the `env` keys runway, track, pad, launch, road and farm. They scroll with `wrap()`.
  - `train.js` (railway, station), `runway.js` (airport outside), `launch.js` (spaceport), `road.js` (country road, interstate, `makeCar`), `buildings.js` (roadside buildings), `farm.js` (farm, animals, hay).
  - `nature.js` (hills, pines, trees, rocks, the seeded `rnd`), `seasons.js`, `sky.js` (birds, clouds), `space.js` (stars, planets, launch smoke).
- `people/people.js`: `makePerson`, `walkPose`, `signTex`, `makeSuitcase`: shared people and props.
- `airport/hall.js`: builds `hallSet`, the airport interior.
- `home/home.js`: builds `homeSet`, the garage and robot house.
- `audio/audio.js`: `tone`, `noise`, `play` and the `sfx` object.
- `game/state.js`: the shared state `S` (`S.plan`, `S.planeT`, `S.on.lights`, `S.parkState`, ...), the machine itself (`rig`, `flyer`), helpers (`ease`, `sm`, `c01`, `wrap`, `lerpJ`), `say`, `settled`, `airborne`, and `linked` (truck and cabin pieces the loop calls). Any module changes the toy by writing to `S`; no setters. It runs right before `core.js`, so the machine is built at the same moment as always.
- `game/puffs.js`: the shared puff pool: `emitPuff`, train steam, big rig smoke, and floating them away.
- One module per world, each called from the main loop at the same spot as always:
  - `game/plane.js`: takeoff and climb (`runPlane`), `planeCaption`, `PLANE_LIFT`, and `runHall` (airport interior: "See inside airport", "Go inside airport").
  - `game/rocket.js`: countdown and climb (`startRocket`), engines and flames, countdown numbers, swing arm, launch smoke, `launchCaption`, and the pad's water cannons (`buildDeluge`, `runDeluge`): water arcs onto the pad during the countdown, and the cloud at liftoff is explained as steam.
  - `game/train.js`: `runTrain`, and the railroad crossing halfway between stations (`buildCrossing`, `crossingCaption`, `crossingView`): flashing lights, bell, gates, the crossing whistle, a car that waits; the camera turns to watch. Test hook `window.__xing`.
  - `game/tractor.js`: `runTractor`, with the farm animals, and behind the plow (`buildPlowLife`, `runPlowLife`, `plowCaption`): dark plowed rows and birds that follow the plow. Test hook `window.__plow`.
  - The crossing, water cannons and plow birds are built at the start of `start()` in `core.js`, after everything else, so nothing older is built in a different order.
  - `game/robot.js`: `runRobot`: waving, GIANT and tiny sizes, marching.
  - `game/jr.js`: `flyJr`, Skyrender Jr.'s flight from the trailer and back.
  - `game/park.js`: bedtime: `requestPark`, `runPark` (garage and robot house; plane mode goes to boarding instead). It calls `go`, `buildActions` and `setButtons` back through `linked`.
  - `game/night.js`: Day/Night button, moon, headlight `beam`, `applyNight`, and `runSky` (sky blending into space). `buildNight()` is called from core so things are built at the same moment as always.
  - The big rig's driving is `runTruck` in `truck/truck.js`, reached through `linked`.
  - Order inside `game/`: `state.js`, then `puffs.js`, then the world modules, then `core.js`. A world module imports only from the ones before it and holds only functions at the top level; anything built (meshes, lights) goes in a build function core calls at the old spot, because build order changes the pictures.
- `game/core.js`: what ties the worlds together.
  - `startMorph` and `go`, mode and season buttons.
  - `ACTIONS`: per-mode action buttons. `doAction` (what each button does), `applyToggles` (overlays applied after `poseRig`), `S.on[id]` / `S.blend[id]`.
  - `caption()`: what the caption line says, by mode. Still to untangle: each world's buttons and captions could move into its world module.
  - Camera drag, the wheel crank shared by train, truck and tractor.
  - `function frame()`: the main loop. The camera fit is at the end. When `linked.cab.active` is true it renders `cabinScene` instead of the main scene.
  - `link()` puts the truck and cabin pieces the loop calls onto `linked`.
- `truck/truck.js`: traffic, buildings in a crash, crash timeline (a pure function of `crash.t`, so it can rewind), police, bad guy, airbag, sidewalk walkers.
- `cabin/cabin.js`: INSIDE SKYRENDER, the plane cabin world.
  - `cabinScene` and `cabinCam`: its own scene and camera.
  - Boarding: `startBoarding`, `runBoarding`, `noseTuck`.
  - `updateCabin`, the seat picker, bins and surprises, food cart, cockpit buttons (`NAMED` and `SILLY`), flight states (gate, taxi, roll, climb, cruise, descend, landed), clouds, night, rainbow.
  - `window.__cab` is a test hook.
- `space/moontrip.js`: Jasper's first idea. The huge cratered Moon (for the plane and the rocket; the small Moon in `scenery/space.js` is hidden), the Meteors button (rocks hit the Moon and paint new craters on its canvas texture), the astronauts on safety lines from the side door, and what they see: a round telescope window (the Moon's newest crater, the meteors hitting live, the ringed planet, Earth's edge) and the camera astronaut's photo, drawn by `drawMoonViews` right after the main scene (extra renders of the scene into render targets, then a flat overlay). The Moon's craters are painted on two canvases: colors and heights (bowls, rims, central peaks). Built last and reached through `linked` (`runMoonTrip`, `moonAction`). The plane's climb to space is `S.planeAlt` in `game/plane.js`; `showActions` in `core.js` shows Meteors and Astronauts only in space. Test hook `window.__moon`.
- `space/planets.js`: Jasper's second idea. All eight planets in a row in space (in order from the Sun, real colors, names; the old ringed giant and red planet in `scenery/space.js` became Saturn and Mars), a "Go to a planet" button for each (`goPlanet`: the planet grows out of its dot until it hangs big behind the plane, with its moons; Earth drops away below), true facts per planet in the caption (`planetCaption`), and Land (`landAction`): at Earth it flies home, at Mars it lands on the red ground, its own scene (`marsView().scene`; Skyrender itself is moved into it and back), where two astronauts hop out, walk, scoop rocks and take pictures. Fly to space off, or another mode, first flies home (`S.away` holds the plane up until then). The Moon trip reads `S.visit`, `S.homeMoonK` and `S.onMars`. Test hook `window.__planets`; scenario `tests/scenarios/planets.js`.
- `space/rover.js`: Jasper's third idea, rovers. Functions only; `planets.js` calls `makeRover` after the Mars walkers. A car-sized rover already lives on Mars (it isn't part of Skyrender, so the one-machine rule doesn't apply). It has six wheels on rocker and bogie beams that climb rocks, corner wheels that steer to turn on the spot, tread tracks (an InstancedMesh), a camera head that watches Skyrender land and then the astronauts, an invisible laser (sparks only), an arm that drills and drops sample tubes, and an old solar rover asleep under dust. The Rover button shows only on the Mars ground; Take off parks it. While it works the camera leans toward it (`marsView().rk` in `core.js`). Each planet's facts end with a true line about rovers. Scenario `tests/scenarios/rover.js`.
- Moon landing and Skyfly rover (Jasper's fourth idea, in `space/planets.js`). "Land on the Moon" shows in space at Earth. The landing machinery (`mars.phase`, `mars.where` = 'mars' or 'moon') sets Skyrender down in `moonG.scene`: black sky, Earth low in the sky, gray craters, no haze, and dust that falls in arcs. Astronauts and dust move into whichever ground scene is active. On the Moon the astronauts bunny-hop and leave footprints (an InstancedMesh). `S.onGround` (read by `moontrip.js`) is true on either ground. "Skyfly rover" (on either ground) plays `planMorph(rig, 6, 0)` (the rover shape) on top of the plane pose (`runSkyfly`, then `poseRig` again; the toy stays in plane mode, so nothing about the home worlds changes). It drives a loop of radius `SKY_R` with tire tracks, stops every so often to turn its camera head toward something and click (`SNAP`, `runSnap`, `aim`; `drawSnap`, called by the main loop right after the ground is drawn, renders the real picture once and shows it as the `#snap` print), and `S.groundDrive` turns the wheels. Turning it off, or Take off, drives home and plays the change backward first. `marsView()` gives core the drive offset (`fx`, `fz`, `yaw`) and the camera pull-back (`sk`). Scenario `tests/scenarios/skyfly-moon.js`.
- `space/storm.js`: Jasper's meteors on the Moon's ground. Functions only; `planets.js` builds it the first time it's needed (`theStorm`). `S.meteorStorm` is set when Meteors is pressed in space, or toggled by Meteors on the Moon (`meteorButton`); leaving Earth's neighborhood clears it. Rocks land only beyond Skyrender (x below -9), make no sound (a soft thump felt through boots), throw ballistic dust and leave craters. `S.on.stuck` and `S.on.fight` (`stormButton`, one or the other) send the walkers into extra modes in `runActs`: `stuckWait`, `stuck`, `pop`, `pull`, and `fight` (bumpers knock rocks off course, like DART). Nobody heads inside until they're free (`HELD`). Scenario `tests/scenarios/moon-storm.js`.
- `heli/`: Jasper's helicopter (mode 7). Functions only, all built the first time he picks it, so no other world changes. `heli.js` is the flying (`C` = the controls, `h` = how it's flying; lift is blade speed squared times the lift lever), the autopilot home, the crew walking aboard, blade poses and captions. `valley.js` is the valley (hospital roof pad, Lookout Mountain, Mirror Lake; `groundAt` says what's straight down); the toy stays in the middle and `groundSet` slides under it. `controls.js` is the on-screen levers, stick and pedals (keyboard too). `cockpit.js` is the view from the pilot's seat: the main scene drawn from the nose, then a small cockpit scene over it. Core calls `runHeli`, `heliPose`, `placeHeli`, `heliView` and `drawHeli` through `linked`; `S.heliAway` makes mode changes and bedtime wait until it has flown home and stopped its blades. Test hook `window.__heli`.
- `ideas/ideas.js` and `ideas/list.js`: the "Jasper's ideas" page (page only, no 3D). `window.__ideasTest` is a test hook.
- `style.css`: the page styles with the light and dark color tokens.

Outside `src/`: `public/` is copied as is into the built page. It holds `manifest.webmanifest` (home screen install) and the app icon: `icon.svg` is the team crest from `rig/textures.js`, and `npm run icons` redraws `icon-180.png` (iPad), `icon-192.png` and `icon-512.png` from it (`scripts/make-icons.js`).

Adding a feature: put new code in the module for that world. Shared values live on `S` in `game/state.js`. If the main loop has to call a truck or cabin function, export it from there and it reaches the loop through `link()`.

## Planned next steps (in order)

1. Done: split `skyrender.html` into modules with Vite, without changing behavior (screenshots matched the Checkpoint 0 baseline apart from the random parts).
2. Done: live at https://dsullivan2306.github.io/skyrender/ (GitHub project `dsullivan2306/skyrender`, public by Daniel's choice). Every push to `main` runs `.github/workflows/deploy.yml` (rig test, build, publish `dist/`), live about 2 minutes later. Installs to the iPad home screen from Safari (Share, Add to Home Screen). Commits are signed with the username and GitHub's private address; keep it that way. `gh` is installed at `~/.local/bin/gh`, and this repo's git config uses it to sign in.
3. Back to building Jasper's ideas, one commit each.

## Known limitations (already explained to Daniel)

- The tractor plow reads a bit like a plane tail.
- The farmer can't wave.
- The rocket relaunches after it's taken out of the garage.
- The plane auto-takes-off when the airport toggles are off.
- The plane nose tips up for boarding, but there's no modeled ramp or hold behind it; a fade into the cabin covers it.
- In the cockpit you can only look a little left, right, up and down.
- The helicopter can't crash: it rises over hills and roofs by itself, always lands softly, and won't sink in the lake.

## Open question for Daniel

A realism pass (better materials, lighting, maybe Blender-made models): on every mode, or one mode first? The plane interior is a natural first candidate.
