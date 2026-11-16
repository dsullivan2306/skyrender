// Jasper's first idea: the plane flies up to space, a huge Moon with craters, a Meteors button whose rocks hit the
// Moon and leave new craters, and astronauts on safety lines who float out to study space, then everyone comes home.
export default async ({ page, step, shot, click, act }) => {
  const cap = () => page.$eval('#step', e => e.textContent);
  const moon = () => page.evaluate(() => window.__moon);
  const must = (ok, why, v) => { if (!ok) throw new Error(why + ' ' + JSON.stringify(v)); };
  await page.click('#sound'); await page.click('#sound');                // start audio, as a tap on the iPad would
  await step(320); let c = await cap(); must(c.startsWith('Cruising'), 'cruising above the clouds first', c);
  await act('Fly to space'); await step(10); c = await cap(); must(c.startsWith('Rocket power'), 'rocket power caption', c);
  await step(170); c = await cap(); must(c.startsWith('In space!'), 'reaches space', c);
  await shot('moon-1');
  await act('Meteors'); await step(40); let m = await moon(); must(m.meteorsFlying > 0, 'meteors on their way', m);
  await shot('moon-2');
  await step(130); m = await moon(); must(m.craters === 6 && m.meteorsFlying === 0, 'every meteor made a new crater', m);
  await shot('moon-3');
  await act('Astronauts'); await step(160); m = await moon(); must(m.astroK > 0.9, 'astronauts floated out', m);
  c = await cap(); console.log('astronaut caption:', c);
  must(await page.evaluate(() => window.__sfx.includes('quindar')), 'radio beep before the astronauts speak', {});
  await shot('moon-4');
  await act('Fly to space'); await step(60); m = await moon(); must(m.astroK < 0.5, 'astronauts head back in first', m);
  await step(400); c = await cap(); must(c.startsWith('Cruising'), 'back down to the clouds', c);
  m = await moon(); must(m.astroK === 0, 'everyone is back inside', m);
  await click(1); await step(900); c = await cap(); must(c.startsWith('Robot'), 'still transforms after the trip', c);
  console.log('moon trip checks passed');
};
