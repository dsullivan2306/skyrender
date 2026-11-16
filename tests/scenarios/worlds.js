// Deeper worlds: true details that grow out of what each mode already does.
// Rocket: water cannons flood the pad before ignition; the white cloud is mostly steam.
// Tractor: the plow leaves dark rows of fresh dirt, and birds follow it to find worms.
// Plane: red light on the left wing, green on the right. Robot: big legs swing slow, small ones fast.
// Train: the railroad crossing between stations: lights, bell, gates, the crossing whistle, a car that waits.
export default async ({ page, step, shot, click, act, drag }) => {
  const cap = () => page.$eval('#step', e => e.textContent);
  const must = (ok, why, v) => { if (!ok) throw new Error(why + ' ' + JSON.stringify(v)); };
  const until = async (ok, why, max = 900) => { for (let i = 0; i < max; i += 5) { const c = await cap(); if (ok(c)) return c; await step(5); } throw new Error(why + ' ' + await cap()); };
  await page.click('#sound'); await page.click('#sound');
  await click(2);
  await until(c => c.startsWith('Crossing ahead'), 'the crossing lights come on');
  must(await page.evaluate(() => window.__sfx.includes('xingBell')), 'the crossing bell rings', {});
  for (let i = 0; i < 200 && (await page.evaluate(() => window.__xing)).gate < 0.5; i++) await step(2);
  await shot('w-train-1');                                         // the gates on their way down
  await until(c => c.startsWith('The gates are down'), 'the gates come down');
  must(await page.evaluate(() => window.__sfx.lastIndexOf('whistle') > 0), 'the engineer blows the crossing whistle', {});
  must((await page.evaluate(() => window.__xing)).carX < 5.5, 'the car waits at the stop line', await page.evaluate(() => window.__xing));
  await step(8); await shot('w-train-2');
  await until(c => c.startsWith('The gates go up'), 'gates go up once the train has passed');
  await until(c => c.startsWith('Gates up. Now the car'), 'the car drives across');
  await step(10); await shot('w-train-3');
  // the rocket: the rainbirds open during the countdown, and the cloud at liftoff is steam
  await click(3);
  await until(c => c.startsWith('Countdown! Water'), 'water sprays the pad before ignition');
  must(await page.evaluate(() => window.__sfx.includes('deluge')), 'the rush of water', {});
  await step(14); await shot('w-rocket-1');
  await until(c => c.startsWith('That big white cloud is steam'), 'the steam explained after liftoff');
  // the tractor: plow down, the rows darken behind it, birds come; plow up and they fly away
  await click(5); await step(300); await act('Plow');
  await until(c => c.startsWith('Birds follow the plow'), 'birds come to follow the plow');
  let p = await page.evaluate(() => window.__plow); must(p.rows > 5 && p.birds === 1, 'plowed rows behind, birds down in them', p);
  await drag(150, 60); await step(2); await shot('w-farm-1');
  await act('Plow'); await step(60); p = await page.evaluate(() => window.__plow); must(p.birds === 0, 'plow up: the birds fly off', p);
  // the plane: wing lights, red on the left and green on the right
  await click(0); await step(420); await act('Flash lights'); await step(2);
  let c = await cap(); must(c.startsWith('Red light on the left wing'), 'the wing lights explained', c);
  // the robot: marching GIANT is slow, tiny is quick, and the caption says why
  await click(1); await step(420); await act('March'); await act('Big'); await step(60);
  c = await cap(); must(c.startsWith('GIANT legs swing slowly'), 'giant pendulum legs', c);
  await act('Small'); await step(60); c = await cap(); must(c.startsWith('Tiny legs swing fast'), 'tiny pendulum legs', c);
  // the big rig: the air horn, and the arm pump
  await click(4); await step(420); await act('Air horn'); await step(2);
  c = await cap(); must(c.includes('Pump your arm'), 'the arm pump', c);
};
