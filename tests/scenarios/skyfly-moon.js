// Jasper's idea: "Skyfly turns into a rover on mars there's a button on mars to make him turn into the rover and
// you can go on the moon". On Mars, Skyrender changes into Skyfly and drives a loop, leaving tire tracks, then drives
// back and changes into the plane again. At Earth, land on the Moon: black sky, Earth up above, astronauts hop like
// bunnies and leave footprints, and Skyfly can be a Moon rover too. Jasper's change: "Instead of skyfly being a
// tractor on mars it's a rover takeing pictures of it": the smokestack becomes a camera mast, and Skyfly stops to take
// pictures (the rover on Mars, Earth from the Moon).
export default async ({ page, step, shot, act }) => {
  const cap = () => page.$eval('#step', e => e.textContent);
  const P = () => page.evaluate(() => window.__planets);
  const must = (ok, why, v) => { if (!ok) throw new Error(why + ' ' + JSON.stringify(v)); };
  const until = async (ok, why, max = 1500) => { for (let i = 0; i < max; i += 5) { const v = await P(); if (ok(v, await cap())) return v; await step(5); } throw new Error(why + ' ' + JSON.stringify(await P()) + ' ' + await cap()); };
  const shown = label => page.evaluate(l => [...document.querySelectorAll('#acts button')].some(b => b.textContent === l && !b.hidden && b.offsetParent), label);
  await page.click('#sound'); await page.click('#sound');
  await step(320); await act('Fly to space'); await step(260);
  must(await shown('Land on the Moon'), 'a Land on the Moon button at Earth', {});
  // Mars: Skyfly rover
  await act('Mars'); await until(v => v.at === 'mars' && !v.to, 'arrives at Mars');
  must(!(await shown('Land on the Moon')), 'no Moon landing away from Earth', {});
  await act('Land on Mars'); await until(v => v.mars === 'ground', 'lands on Mars');
  must(await shown('Skyfly rover'), 'a Skyfly rover button on Mars', {});
  await act('Astronauts'); await until(v => v.walkersOut === 2, 'astronauts out');
  await act('Skyfly rover'); let p = await until(v => v.skyfly.on && v.walkersOut === 0, 'astronauts go back in, then Skyfly starts to change');
  let c;
  must(!(await shown('Astronauts')) && !(await shown('Open door')), 'astronaut and door buttons hide while Skyfly is a rover', {});
  p = await until(v => v.skyfly.on && v.skyfly.t > v.skyfly.T * 0.5, 'Skyfly changing'); await shot('sky-1');
  p = await until(v => v.skyfly.cam === 1, 'the camera mast goes up');
  p = await until(v => v.skyfly.photos === 1 && v.skyfly.snap > 2, 'Skyfly stops and takes a picture');
  c = await cap(); must(c.startsWith('Click!') && c.includes('rover'), 'a picture of the rover', c); await step(10); await shot('sky-photo');
  p = await until(v => v.skyfly.v > 1 && v.skyfly.a > 1.4, 'Skyfly drives a loop on Mars'); await shot('sky-2');
  c = await cap(); must(c.startsWith('Skyfly') || c.includes('Skyfly') || c.includes('batteries'), 'Skyfly rover caption', c);
  must(p.skyfly.tracks > 10, 'tire tracks in the dust', p.skyfly);
  await act('Skyfly rover'); p = await until(v => !v.skyfly.on, 'drives home and changes back into the plane', 2500);
  must(p.skyfly.a === 0, 'back at the landing spot', p.skyfly);
  await act('Take off'); await until(v => !v.onMars && !v.mars, 'back up to space');
  await act('Earth'); await until(v => v.at === 'earth' && !v.to, 'home to Earth');
  // the Moon
  await act('Land on the Moon'); p = await until(v => v.mars === 'ground', 'lands on the Moon');
  must(p.onMoon && !p.onMars, 'on the Moon', p); must(!(await shown('Rover')), 'the Mars rover stays on Mars', {});
  await step(20); await shot('moonland-1');
  await act('Astronauts'); p = await until(v => v.working === 2, 'astronauts at work on the Moon');
  must(p.prints >= 6, 'footprints in the Moon dust', p); await step(20); await shot('moonland-2');
  await act('Skyfly rover'); p = await until(v => v.skyfly.photos === 2 && v.skyfly.snap > 2, 'Skyfly takes a picture on the Moon', 2500);
  c = await cap(); must(c.includes('Earth'), 'a picture of Earth', c); await step(10); await shot('moonland-3');
  p = await until(v => v.skyfly.v > 1 && v.skyfly.a > 2.2, 'Skyfly drives on the Moon', 2500);
  c = await cap(); must(c.length > 0, 'a Moon rover caption', c);
  // Take off while driving: Skyfly drives back, changes into the plane, then up
  await act('Take off'); p = await until(v => !v.onMoon && !v.mars, 'back up to space from the Moon', 3000);
  must(!p.skyfly.on && p.at === 'earth', 'plane again, at Earth', p);
  console.log('skyfly and moon checks passed');
};
