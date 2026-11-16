// Jasper's second idea: all the planets in space, a button for each that flies Skyrender there, studying them
// (facts, the telescope), landing on Mars (astronauts hop out and scoop up rocks), and flying home to Earth.
export default async ({ page, step, shot, act }) => {
  const cap = () => page.$eval('#step', e => e.textContent);
  const P = () => page.evaluate(() => window.__planets);
  const must = (ok, why, v) => { if (!ok) throw new Error(why + ' ' + JSON.stringify(v)); };
  const until = async (ok, why, max = 900) => { for (let i = 0; i < max; i += 5) { const v = await P(); if (ok(v, await cap())) return v; await step(5); } throw new Error(why + ' ' + JSON.stringify(await P()) + ' ' + await cap()); };
  await page.click('#sound'); await page.click('#sound');
  await step(320); await act('Fly to space'); await step(260);
  let p = await P(); must(p.at === 'earth' && !p.to, 'starts at Earth', p);
  must(await page.evaluate(() => [...document.querySelectorAll('.seg.planets button')].map(b => b.textContent).join()) === 'Mercury,Venus,Earth,Mars,Jupiter,Saturn,Uranus,Neptune', 'a button for every planet', {});
  await shot('planets-1');                                             // the whole row, in order from the Sun
  await act('Jupiter'); await step(20); let c = await cap(); must(c.startsWith('Flying to Jupiter! A real spaceship'), 'flying there', c);
  p = await until(v => v.at === 'jupiter' && !v.to, 'arrives at Jupiter'); await shot('planets-2');
  await step(120); c = await cap(); must(c.includes('Earths could fit inside Jupiter') || c.includes('Great Red Spot') || c.includes('gas'), 'true facts about Jupiter', c);
  // the astronauts study Jupiter through the telescope
  await act('Astronauts'); for (let i = 0; i < 80 && (await page.evaluate(() => window.__moon.scope)) < 0.9; i++) await step(5);
  must((await page.evaluate(() => window.__moon.scope)) > 0.9, 'the telescope window opens at Jupiter', {});
  await step(10); await shot('planets-3');
  await act('Astronauts'); await act('Saturn'); p = await until(v => v.at === 'saturn' && !v.to, 'arrives at Saturn'); await shot('planets-4');
  // Mars: land, the astronauts hop out and get to work, then take off again
  await act('Mars'); p = await until(v => v.at === 'mars' && !v.to, 'arrives at Mars');
  await act('Land on Mars'); p = await until(v => v.mars === 'ground', 'lands on Mars', 1200);
  must(p.onMars, 'on the Mars ground', p); await step(20); await shot('planets-5');
  await act('Astronauts'); p = await until(v => v.working === 2, 'both astronauts at work on Mars', 1200); await step(30); await shot('planets-6');
  await act('Take off'); p = await until(v => !v.onMars && !v.mars, 'back up to space from Mars', 1200);
  must(p.at === 'mars', 'still at Mars after taking off', p);
  // home again, and down to the airport's sky
  await act('Earth'); p = await until(v => v.at === 'earth' && !v.to, 'home to Earth');
  await act('Neptune'); p = await until(v => v.at === 'neptune' && !v.to, 'off to Neptune'); await shot('planets-7');
  await act('Fly to space'); p = await until((v, c2) => v.at === 'earth' && c2.startsWith('Cruising'), 'Fly to space off: home to Earth, then down to the clouds', 1500);
  console.log('planets checks passed');
};
