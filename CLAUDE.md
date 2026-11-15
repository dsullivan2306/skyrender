# Skyrender

A transforming toy built for Jasper (Daniel's son). One machine changes between six modes: plane, robot, train, rocket, big rig (semi truck with the SKYRENDER trailer) and Skyfly (farm tractor). Each mode has its own world, with toggles and surprises. Jasper comes up with most of the ideas, and some requests are typed by Jasper himself. Built with Three.js r128, no build step yet. Until the split (below) is done, everything lives in `skyrender.html`.

## Rules that never bend

- **One machine.** Every part of every mode exists in all forms. Parts unfold, slide, rotate or tuck away. Nothing pops in or vanishes. A new part has to be stored, hidden, inside the body in the other modes. `npm run test:rig` checks this numerically. It must pass, worst error near 1e-15.
- **Original IP only.** No Transformers or Hasbro names, logos or symbols. No Boeing, Tesla or Mack likeness. The truck is a generic American semi. Only the tractor is called Skyfly; everything else is Skyrender.
- **People stay safe.** Crashes, wrecks, the falling building and the bad guy are all fine, but nobody gets hurt. Airbags, police help, passengers shown safe.
- **Kid voice.** Captions and button labels are short, warm and concrete, written for Jasper to read. No italics anywhere: not in code comments shown to Daniel, not in captions, not in replies.
- **Look and feel.** Restrained, durable, modular: Japanese and Scandinavian restraint, soul over polish. Muted palette with the maroon accent `#7a2430`. No flash.
- **Light and dark both work.** The page has light and dark color tokens and must stay readable at phone width.

## Setup (first time)

`npm install`, then `npx playwright install chromium` (the browser the click-through tests drive). Requires Node 18 or newer.

## How work gets done

- **One Jasper request = one git commit.** Quote his request in the commit message, in his words.
- **Run the tests before every commit:** `npm test` runs the rig check plus the click-through scenarios: all modes and every action button, garage and robot house, airport, plane cabin, reboarding and cancelled boarding. Each scenario prints `errors []` on success. Look at the screenshots in `tests/shots/` for anything visual you changed.
- **Changing an existing feature:** run the related scenario before and after, and compare the screenshots.
- **Adding a feature:** add a scenario in `tests/scenarios/` that walks through it.
- **Big new worlds** (like the plane cabin) get their own scene, camera and UI panel so they don't tangle with the transforming toy.
- **Sound** is synthesized with Web Audio (`tone`, `noise`, `play` and the `sfx` object). No audio files.
- **Reporting back:** tell Daniel what Jasper will see in kid terms, then a short note for Dad on limits or trade-offs.

## Map of the current single file (skyrender.html)

Search for these anchors rather than trusting line numbers:

- `const MODES` through `function exactBox`: the rig.
  - `buildRig(THREE)` builds the machine.
  - `J(parent, pivot, spec)` creates a joint with a pose per mode (`{p, r, S}`).
  - `planMorph` and `poseRig` blend between poses.
  - `fanPanel` builds the accordion panels.
  - The rig is pure. It's eval'd by `tests/rigtest.js`, so keep it free of page globals.
- `makePerson`, `walkPose`, `signTex`, `makeSuitcase`: shared people and props.
- Scenery groups per mode, switched on by the `env` keys runway, track, pad, launch, road and farm. They scroll with `wrap()`.
- The truck world: traffic, buildings, crash timeline (a pure function of `crash.t`, so it can rewind), police, bad guy, airbag.
- The farm: animals, hay and the farmer.
- `hallSet` / `runHall`: the airport interior ("See inside airport", "Go inside airport").
- `homeSet` / `startPark` / `runPark`: the garage and robot house. Plane mode redirects to boarding instead.
- `ACTIONS`: per-mode action buttons. `doAction`, `applyToggles` (overlays applied after `poseRig`), `on[id]` / `blend[id]`.
- `INSIDE SKYRENDER`: the plane cabin world.
  - `cabinScene` and `cabinCam`: its own scene and camera.
  - Boarding: `startBoarding`, `runBoarding`, `noseTuck`.
  - `updateCabin`, the seat picker, bins and surprises, food cart, cockpit buttons (`NAMED` and `SILLY`), flight states (gate, taxi, roll, climb, cruise, descend, landed), clouds, night, rainbow.
  - `window.__cab` is a test hook.
- `function frame()`: the main loop.
  - The camera fit is at the end.
  - When `cab.active` is true it renders `cabinScene` instead of the main scene.

## Planned next steps (in order)

1. Split `skyrender.html` into modules with Vite, without changing behavior.
   - Suggested modules: `rig/`, `scenery/` (one per mode), `people/`, `home/`, `airport/`, `cabin/`, `audio/`, `ui/`, `main.js`.
   - Update `tests/rigtest.js` to import the rig module directly, and point `tests/shoot.js` at the built page (`PAGE=dist/index.html`).
   - Prove nothing changed:
     - Before the split, `npm test` passes. Save the screenshots as a baseline.
     - After the split, `npm test` passes again.
     - Screenshots match the baseline. Pixel-diff them; small differences in random elements like clouds and traffic are expected, so check those by eye.
2. Free hosting at a fixed link: GitHub Pages through a GitHub Actions workflow that builds and deploys on every push to `main`. Make it installable to the home screen (web app manifest and icon) so Jasper can open it like an app.
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
