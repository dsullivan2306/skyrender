// Skyrender: Jasper's transforming toy.
// The modules below build the toy in the same order the old single file did, top to bottom.
// Keep that order: a module may only import from modules listed above it. The truck world and
// the plane cabin come last and are linked back into the main loop before the first frame.
import './world/setup.js';           // renderer, scene, camera, lights, sky dome, ground and landing pad
import './scenery/train.js';         // railway and Jasper Junction station
import './scenery/runway.js';        // airport runway, tower, terminal, hangar
import './scenery/nature.js';        // hills, pines, leafy trees, rocks (seeded, same every visit)
import './scenery/launch.js';        // Jasper Spaceport launch platform
import './scenery/road.js';          // country road, interstate, the little cars
import './people/people.js';         // people, sign textures, suitcases
import './scenery/buildings.js';     // roadside buildings that can topple
import './scenery/farm.js';          // the farm and its animals
import './airport/hall.js';          // inside the airport: the big terminal hall
import './home/home.js';             // the Skyrender Garage and the robot's house
import './scenery/seasons.js';       // falling petals, leaves, snow, and the seasons
import './scenery/sky.js';           // birds and clouds
import './scenery/space.js';         // stars, Earth, Moon, planets, launch smoke
import './rig/textures.js';          // livery artwork, drawn on canvases
import './audio/audio.js';           // synthesized sound
import { link, start } from './game/core.js';   // the toy itself: state, buttons, toggles, main loop
import * as truck from './truck/truck.js';       // traffic, crashes, police, walkers
import * as cabin from './cabin/cabin.js';       // INSIDE SKYRENDER: boarding and the plane cabin
import './ideas/ideas.js';
import * as moonTrip from './space/moontrip.js';  // Jasper's first idea: the huge Moon, meteors and astronauts
import * as planets from './space/planets.js';    // Jasper's second idea: all the planets, flying to them, landing on Mars

link({ ...truck, ...cabin, ...moonTrip, ...planets });
start();
