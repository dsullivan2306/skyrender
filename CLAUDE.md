# Skyrender

A transforming toy built for Jasper (Daniel's son). One machine changes between six modes: plane, robot, train, rocket, big rig (semi truck with the SKYRENDER trailer) and Skyfly (farm tractor). Each mode has its own world, with toggles and surprises. Jasper comes up with most of the ideas, and some requests are typed by Jasper himself. Built with Three.js r128 and Vite. The page is `index.html`; the code is ES modules under `src/` (map below). The original single file is in git history as Checkpoint 0.

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
- **Jasper's ideas page.** Every idea of Jasper's that we build gets an entry in `src/ideas/list.js` in the same commit: his words exactly as Daniel gives them (never made up), the date, and one short kid-voice line about what it does. The button appears once the list has an entry.
- **One Jasper request = one git commit.** Quote his request in the commit message, in his words.
- **Run the tests before every commit:** `npm test` builds the page, then runs the rig check plus the click-through scenarios against `dist/`: all modes and every action button, garage and robot house, airport, plane cabin, reboarding, cancelled boarding, and the home screen install check (manifest and icons). Each scenario prints `errors []` on success. Last, `npm run test:shots` compares every screenshot with the approved one in `tests/baseline/`. To run one scenario (for example `npm run test:park`), run `npm run build` first.
- **Upload straight away:** after `npm test` passes and the commit is made, push to `main` (`git push`) without asking. Daniel gave this standing OK on 2026-11-15. The site updates about 2 minutes later; check the run with `gh run watch`. Anything beyond a normal push (force-push, rewriting history, changing GitHub settings) still needs his OK first.
- **iPad checks.** `npm test` also runs the all-modes and plane cabin scenarios in WebKit (the engine inside Safari) at iPad Air size, pressing every button with a finger tap (`npm run test:ipad`, shots in `tests/shots-ipad/`, not compared). `npm run perf` measures the game's own work per frame in each mode at iPad pixel density; the 8 ms budget on Daniel's Mac is an estimate (an iPad is about twice as slow), so it reports rather than fails. After the smoothness pass (2026-11-15): 4 to 6 ms typical in every mode, all within budget, about 900 to 1,200 draws per frame. What made it quicker: hidden worlds skip their position math (`skipWhenHidden` in `core.js`), the toy's outline is measured only for parts that moved (`exactBox` in `rig.js`), and fixed parts with the same paint are joined into one shape (`mergeFixedParts` in `state.js`; any part the game reaches for by name stays separate). A new part the game moves or hides must be reachable from `rig` (for example `rig.named`), or it may get joined.
- **Screenshots are exact.** The test harness (`tests/shoot.js`) pins everything that could vary: a stepped clock, a seeded `Math.random`, timers on the stepped clock, and no CSS fades. The same code gives the same pixels every run, and only in the tests; the game itself stays random and real-time. Any changed pixel means the game looks different. The compare step lists the changed shots and writes red-marked copies to `tests/compare/diff-*.png`. If the change is meant, look at those shots, run `npm run baseline` to approve them, and commit `tests/baseline/` with the change. If it isn't meant, it's a bug. The baseline was taken on Daniel's Mac; another machine may draw text slightly differently.
- **Changing an existing feature:** only the screenshots that show the change should differ. Look at each diff before approving.
- **Adding a feature:** add a scenario in `tests/scenarios/` that walks through it, add it to `npm test`, and approve its new shots with `npm run baseline`.
- **Big new worlds** (like the plane cabin) get their own scene, camera and UI panel so they don't tangle with the transforming toy.
- **Sound** is synthesized with Web Audio (`tone`, `noise`, `play` and the `sfx` object). No audio files.
- **Reporting back:** tell Daniel what Jasper will see in kid terms, then a short note for Dad on limits or trade-offs.

## Map of the code (src/)

`src/main.js` imports the modules in the order the old single file ran, top to bottom. Keep that order: a module may only import from modules listed above it in `main.js`. Building things in the same order keeps the seeded scenery and everything else exactly as before. Search for these anchors rather than trusting line numbers:

- `rig/rig.js`: the rig, pure and free of page globals (`tests/rigtest.js` imports it directly).
  - `buildRig(THREE)` builds the machine.
  - `J(parent, pivot, spec)` creates a joint with a pose per mode (`{p, r, S}`).
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
  - `game/rocket.js`: countdown and climb (`startRocket`), engines and flames, countdown numbers, swing arm, launch smoke, `launchCaption`.
  - `game/train.js`: `runTrain`. `game/tractor.js`: `runTractor`, with the farm animals.
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

## Open question for Daniel

A realism pass (better materials, lighting, maybe Blender-made models): on every mode, or one mode first? The plane interior is a natural first candidate.
