// Jasper's idea: rovers on the planets. Land on Mars; the rover watches, then wakes up, zaps a rock with its
// laser, drives over rocks to drill another and leave a sample tube, and looks at the old rover asleep nearby.
export default async ({ page, step, shot, act }) => {
  const cap = () => page.$eval('#step', e => e.textContent);
  const P = () => page.evaluate(() => window.__planets);
  const must = (ok, why, v) => { if (!ok) throw new Error(why + ' ' + JSON.stringify(v)); };
  const until = async (ok, why, max = 1200) => { for (let i = 0; i < max; i += 5) { const v = await P(); if (ok(v, await cap())) return v; await step(5); } throw new Error(why + ' ' + JSON.stringify(await P()) + ' ' + await cap()); };
  const shown = label => page.evaluate(l => [...document.querySelectorAll('#acts button')].some(b => b.textContent === l && !b.hidden && b.offsetParent), label);
  await page.click('#sound'); await page.click('#sound');
  await step(320); await act('Fly to space'); await step(260);
  must(!(await shown('Rover')), 'no Rover button up in space', {});
  await act('Mars'); await until(v => v.at === 'mars' && !v.to, 'arrives at Mars');
  await act('Land on Mars'); await until(v => v.mars === 'ground', 'lands on Mars');
  must(await shown('Rover'), 'a Rover button on Mars', {});
  await step(40); await shot('rover-1');                              // the rover parked, watching Skyrender
  await act('Rover'); await step(20); let c = await cap(); must(c.startsWith('The rover wakes up'), 'the rover wakes up', c);
  let p = await until(v => v.rover.mode === 'zap' && v.rover.zaps > 3 && v.rover.spark > 0.6, 'zaps a rock'); await shot('rover-2');
  c = await cap(); must(c.includes('laser'), 'the laser caption', c);
  p = await until(v => v.rover.mode === 'drive' && v.rover.tracks > 40, 'drives off, leaving tracks'); await shot('rover-3');
  p = await until(v => v.rover.mode === 'drill' && v.rover.arm > 0.98, 'reaches out to drill'); await step(30); await shot('rover-4');
  p = await until(v => v.rover.tubes === 1 && v.rover.mode !== 'drill', 'leaves a sample tube', 1500);
  p = await until(v => v.rover.mode === 'look', 'goes to see the old rover', 1500); await step(40); await shot('rover-5');
  c = await cap(); must(c.includes('solar panels'), 'the old rover caption', c);
  // the astronauts come out too, and the rover keeps working; Take off parks it
  await act('Astronauts'); await until(v => v.working === 2, 'astronauts at work beside the rover');
  await act('Take off'); p = await until(v => !v.onMars && !v.mars, 'back up to space');
  must(p.rover.mode === 'park', 'the rover parks when Skyrender leaves', p.rover);
  must(!(await shown('Rover')), 'no Rover button after taking off', {});
  console.log('rover checks passed');
};
