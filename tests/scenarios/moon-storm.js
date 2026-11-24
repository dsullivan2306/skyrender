// Jasper's idea: "When Jasper presses meteors and then goes on the moon there will still be meteors and the astronauts
// will be stuck or fighting there are buttons for both of those things". Press Meteors in space, land on the Moon: they
// keep falling, far from everyone. Fight meteors: bumpers knock rocks off course. Astronauts stuck: dust buries their
// boots; tap again and one pulls the other free. Then the same from Take off and from Skyfly, and a storm begun and
// stopped on the Moon itself.
export default async ({ page, step, shot, act }) => {
  const cap = () => page.$eval('#step', e => e.textContent);
  const P = () => page.evaluate(() => window.__planets);
  const must = (ok, why, v) => { if (!ok) throw new Error(why + ' ' + JSON.stringify(v)); };
  let near = 99;
  const until = async (ok, why, max = 1500) => { for (let i = 0; i < max; i += 5) { const v = await P(); near = Math.min(near, v.storm.nearest); if (ok(v, await cap())) return v; await step(5); } throw new Error(why + ' ' + JSON.stringify(await P()) + ' ' + await cap()); };
  const shown = label => page.evaluate(l => [...document.querySelectorAll('#acts button')].some(b => b.textContent === l && !b.hidden && b.offsetParent), label);
  const pressed = label => page.evaluate(l => [...document.querySelectorAll('#acts button')].find(b => b.textContent === l).getAttribute('aria-pressed'), label);
  await page.click('#sound'); await page.click('#sound');
  await step(320); await act('Fly to space'); await step(260);
  await act('Meteors'); await step(20);
  await act('Land on the Moon'); let p = await until(v => v.mars === 'ground', 'lands on the Moon');
  must(p.storm.on, 'the meteors are still on', p.storm); must(await pressed('Meteors') === 'true', 'Meteors shows as on', {});
  must(await shown('Astronauts stuck') && await shown('Fight meteors'), 'a button for each', {});
  p = await until(v => v.storm.hits >= 2 && v.storm.falling >= 2, 'meteors land'); await shot('storm-1');
  // fighting
  await act('Fight meteors'); must(await pressed('Astronauts') === 'true', 'the astronauts come out by themselves', {});
  p = await until(v => v.storm.fired >= 2, 'bumpers launched', 2500); await step(10); await shot('storm-2');
  p = await until(v => v.storm.bumps >= 3, 'rocks knocked off course', 2500); let c = await cap(); must(c.length > 0, 'a caption', c);
  // stuck: one button turns the other off
  await act('Astronauts stuck'); must(await pressed('Fight meteors') === 'false', 'one or the other', {});
  p = await until(v => v.storm.modes.every(m => m === 'stuck') && v.storm.piles.every(k => k === 1), 'both astronauts stuck', 2500); await step(15); await shot('storm-3');
  await act('Astronauts stuck'); p = await until(v => v.storm.modes[1] === 'pull' && v.storm.modes[0] === 'stuck', 'one gets out and pulls the other', 2500); await step(40); await shot('storm-4');
  c = await cap(); must(c.includes('pull'), 'the pulling caption', c);
  p = await until(v => v.storm.modes[0] === 'pop', 'the commander pops free'); p = await until(v => v.working === 2, 'back to work', 2500);
  // Take off while they're stuck: they get free and climb in first
  await act('Astronauts stuck'); await until(v => v.storm.modes.every(m => m === 'stuck'), 'stuck again', 2500);
  await act('Skyfly rover'); p = await until(v => v.walkersOut === 0 && v.skyfly.on, 'free, inside, and Skyfly changes', 3500);
  must(!(await shown('Fight meteors')), 'storm buttons rest while Skyfly drives', {});
  await act('Skyfly rover'); await until(v => !v.skyfly.on, 'plane again', 3000);
  await act('Fight meteors'); await until(v => v.storm.modes[0] === 'fight', 'fighting again', 2500);
  await act('Meteors'); await step(5); must(!(await P()).storm.on, 'Meteors again stops the storm', {});
  must(!(await shown('Fight meteors')), 'no storm, no storm buttons', {});
  await until(v => v.working === 2, 'back to work after the storm', 2500);
  await act('Meteors'); await step(5); await act('Astronauts stuck'); await until(v => v.storm.modes.every(m => m === 'stuck'), 'stuck a third time', 2500);
  await act('Take off'); p = await until(v => !v.onMoon && !v.mars, 'free, inside, and up to space', 4000);
  must(p.walkersOut === 0, 'nobody left behind', p); must(near > 9, 'no meteor lands near an astronaut', near);
  console.log('nearest meteor to an astronaut', near.toFixed(1)); console.log('moon storm checks passed');
};
