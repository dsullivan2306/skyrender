// Sound happens at the right moments (tests can't listen, so they read window.__sfx and window.__mix).
export default async ({ page, step, click, act }) => {
  await page.click('#sound'); await page.click('#sound');                  // a tap starts audio, as on the iPad
  const asked = () => page.evaluate(() => window.__sfx.splice(0));
  const mix = () => page.evaluate(() => window.__mix);
  const want = (list, name, why) => { if (!list.includes(name)) throw new Error('no ' + name + ' ' + why + ' (got ' + list.join(',') + ')'); };
  await click(2); await step(420); let s = await asked(); want(s, 'whistle', 'as the train pulls out');
  await step(200); s = await asked(); want(s, 'clack', 'over the rail joints'); want(s, 'chuff', 'from the engine');
  if (s.includes('whistle')) throw new Error('the departure whistle should blow once, not keep going');
  await act('Stop train'); s = await asked(); want(s, 'airBrake', 'when the train stops');
  await click(4); await step(420); await asked();
  await act('Stop truck'); s = await asked(); want(s, 'airBrake', 'when the big rig stops');
  await act('Stop truck'); await step(120); let m = await mix(); if (!(m.eng > 0.5 && m.engHz > 30)) throw new Error('big rig engine not running: ' + JSON.stringify(m));
  await act('Lights'); s = await asked(); want(s, 'switchOn', 'for the lights');
  await act('Open trailer'); s = await asked(); want(s, 'latch', 'for the trailer doors');
  await click(5); await step(420); m = await mix(); if (!(m.birds > 0)) throw new Error('no birds at the farm');
  await click(3); await step(900); m = await mix(); console.log('rocket in space, roar', m.roar.toFixed(3), '| caption:', await page.$eval('#step', e => e.textContent));
  if (m.roar > 0.001 || m.birds || m.wind) throw new Error('space should be silent: ' + JSON.stringify(m));
  console.log('sound checks passed');
};
