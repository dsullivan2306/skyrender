// Deeper worlds: true details that grow out of what each mode already does.
// Train: the railroad crossing between stations: lights, bell, gates, the crossing whistle, a car that waits.
export default async ({ page, step, shot, click }) => {
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
};
