# Skyrender

A transforming toy built for Jasper (Daniel's son). One machine changes between six modes: plane, robot, train, rocket, big rig (semi truck with the SKYRENDER trailer) and Skyfly (farm tractor). Each mode has its own world, with toggles and surprises. Jasper comes up with most of the ideas, and some requests are typed by Jasper himself. Built with Three.js r128 and Vite. The page is `index.html`; the code is ES modules under `src/` (map below). The original single file is in git history as Checkpoint 0.

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

- **One Jasper request = one git commit.** Quote his request in the commit message, in his words.
- **Run the tests before every commit:** `npm test` builds the page, then runs the rig check plus the click-through scenarios against `dist/`: all modes and every action button, garage and robot house, airport, plane cabin, reboarding, cancelled boarding, and the home screen install check (manifest and icons). Each scenario prints `errors []` on success. Last, `npm run test:shots` compares every screenshot with the approved one in `tests/baseline/`. To run one scenario (for example `npm run test:park`), run `npm run build` first.
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
- `game/core.js`: the toy itself. Its state is shared by almost everything in it, so it stays one module.
  - State, `startMorph` and `go`, captions, mode and season buttons, day and night.
  - `runHall` (airport interior: "See inside airport", "Go inside airport").
  - `startPark` / `runPark` (garage and robot house; plane mode redirects to boarding instead).
  - `ACTIONS`: per-mode action buttons. `doAction`, `applyToggles` (overlays applied after `poseRig`), `on[id]` / `blend[id]`.
  - Camera drag, steam puffs, Skyrender Jr. (`flyJr`).
  - `function frame()`: the main loop. The camera fit is at the end. When `cab.active` is true it renders `cabinScene` instead of the main scene.
  - `link()` receives the truck and cabin pieces the loop calls. Other modules change core state through setters (`setCrash`, `setOn`, `setPlaneT`), because an imported variable can only be read.
- `truck/truck.js`: traffic, buildings in a crash, crash timeline (a pure function of `crash.t`, so it can rewind), police, bad guy, airbag, sidewalk walkers.
- `cabin/cabin.js`: INSIDE SKYRENDER, the plane cabin world.
  - `cabinScene` and `cabinCam`: its own scene and camera.
  - Boarding: `startBoarding`, `runBoarding`, `noseTuck`.
  - `updateCabin`, the seat picker, bins and surprises, food cart, cockpit buttons (`NAMED` and `SILLY`), flight states (gate, taxi, roll, climb, cruise, descend, landed), clouds, night, rainbow.
  - `window.__cab` is a test hook.
- `style.css`: the page styles with the light and dark color tokens.

Outside `src/`: `public/` is copied as is into the built page. It holds `manifest.webmanifest` (home screen install) and the app icon: `icon.svg` is the team crest from `rig/textures.js`, and `npm run icons` redraws `icon-180.png` (iPad), `icon-192.png` and `icon-512.png` from it (`scripts/make-icons.js`).

Adding a feature: put new code in the module for that world. If the main loop has to call it, export it and add it to `link()` in `game/core.js` (or, if it only reads core state, import from `game/core.js`).

## Planned next steps (in order)

1. Done: split `skyrender.html` into modules with Vite, without changing behavior (screenshots matched the Checkpoint 0 baseline apart from the random parts).
2. Free hosting at a fixed link: GitHub Pages through a GitHub Actions workflow that builds and deploys on every push to `main`. Done so far: home screen install (web app manifest and the crest icon) and the workflow `.github/workflows/deploy.yml` (rig test, build, publish `dist/`). Waiting on Daniel: a GitHub account and sign-in, whether the code may be public, and whether "Jasper" stays in place names. Ask before creating the repository or pushing anything.
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
