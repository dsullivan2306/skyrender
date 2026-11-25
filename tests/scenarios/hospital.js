// Jasper's idea: "Whenever helicopter land on the ground of the hospital there will be a button that will allow the
// helicopter to be able to fly in the hospital there will be some stuff in the hospital that is going to be used as
// hospital stuff". Lands on the front pad, the grass and the roof, checks the button shows only there, goes in (Skyrender
// shrinks), flies with the real controls, and uses everything: scale, rolling bed, X-ray, Grandpa's bed and heart
// monitor, mail tubes, baby room, and the MRI line it can't cross. Then out by the doors and by the elevator, and checks
// that other modes and bedtime bring it out and home first.
export default async ({ page, step, shot, act, click }) => {
  const cap = () => page.$eval('#step', e => e.textContent);
  const H = () => page.evaluate(() => { const g = window.__heli, { h, C, R } = g; return { x: h.x, z: h.z, y: h.y, vx: h.vx, vz: h.vz, vy: h.vy, yaw: h.yaw, rpm: h.rpm, landed: h.landed, place: h.floor.place, kind: h.floor.kind, inside: h.inside, phase: R.phase, s: R.s, auto: h.auto, C: { ...C }, hosp: g.hosp }; });
  const must = (ok, why, v) => { if (!ok) throw new Error(why + ' ' + JSON.stringify(v)); };
  const until = async (ok, why, max = 1200, by = 5) => { for (let i = 0; i < max; i += by) { const v = await H(); if (ok(v)) return v; await step(by); } throw new Error(why + ' ' + JSON.stringify(await H()) + ' ' + await cap()); };
  const shown = label => page.evaluate(l => [...document.querySelectorAll('#acts button')].some(b => b.textContent === l && !b.hidden && b.offsetParent), label);
  const rest = () => page.mouse.move(400, 60);
  const lever = async (key, v) => { const b = await (await page.$(`[data-lever="${key}"]`)).boundingBox(), x = b.x + b.width / 2, at = u => b.y + 20 + (1 - u) * (b.height - 40); await page.mouse.move(x, at(0.4)); await page.mouse.down(); await page.mouse.move(x, at(v), { steps: 3 }); await page.mouse.up(); await rest(); };
  const stick = async (dx, dy) => { const b = await (await page.$('[data-stick]')).boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx * 50, y - dy * 50, { steps: 3 }); };
  const letGo = async () => { await page.mouse.up(); await rest(); };
  const put = (x, y, z, yaw) => page.evaluate(([x, y, z, yaw]) => { const h = window.__heli.h; h.x = x; h.y = y; h.z = z; h.vx = h.vy = h.vz = 0; h.landed = false; if (yaw !== null) { h.yaw = yaw; h.vyaw = 0; } }, [x, y, z, yaw ?? null]);
  // put it over something, at full blades, and let the lift lever settle it down
  const landOn = async (x, z, place, yaw) => { const v0 = await H(); if (v0.C.throttle < 1) { await lever('throttle', 1); await until(q => q.rpm > 0.95, 'spins up'); } await put(x, 10, z, yaw); await lever('lever', 0.35); const v = await until(q => q.landed, 'lands on ' + place); must(v.place === place, 'on ' + place, v); await rest(); return v; };
  const asked = () => page.evaluate(() => window.__sfx.splice(0));

  await step(20); await click(7); await step(405); await rest();
  must(!(await shown('Fly in the hospital')), 'no button at home', {});
  // the front pad
  await lever('throttle', 1); await until(q => q.rpm > 0.99, 'spins up'); await put(4, 8, 45, 0); await lever('lever', 0.3); let v = await until(q => q.landed, 'lands in front'); must(v.place === 'yard', 'on the front pad', v); await step(60);
  must(await shown('Fly in the hospital'), 'the button shows on the front pad', v); await shot('hosp-yard');
  await act('Fly in the hospital'); await rest(); await step(22); v = await H(); must(v.phase === 'shrink' && v.s < 0.9 && v.s > 0.1, 'shrinking', v); await shot('hosp-shrink');
  v = await until(q => q.phase === 'in', 'inside'); await step(70); await shot('hosp-in'); must(v.landed && v.y === 0 && v.s === 1, 'on the floor inside', v);
  must(await shown('Go outside'), 'a way out', {}); must(!(await shown('Board the crew')), 'no boarding in here', {});
  await lever('lever', 0.62); await until(q => q.y > 5, 'takes off'); await lever('lever', 0.5); await stick(0, 1); await step(50); await shot('hosp-fly'); await letGo(); await step(60);

  await landOn(-36, 20, 'scale', 0.4); await lever('lever', 0); await step(70); v = await H(); must(v.hosp.weight === 42, 'weighs 42', v.hosp); await shot('hosp-scale');
  await lever('lever', 0.3); await step(10); v = await H(); must(v.landed && v.hosp.weight < 20 && v.hosp.weight > 3, 'lift makes it lighter on the scale', v.hosp);
  await landOn(34, 16, 'desk', -0.4); await act('Say hello'); await rest(); await step(40); await shot('hosp-desk');
  await landOn(-14, 16, 'bed', 0); await act('Ride the bed'); await rest(); await until(q => q.hosp.ride > 0.2, 'rolls'); await shot('hosp-ride'); await until(q => q.hosp.ride > 0.4, 'rolls on'); v = await H(); must(v.y === 6 && v.z > 60, 'riding on the bed', v); v = await until(q => q.hosp.ride === null, 'back', 1600); must(Math.abs(v.x + 14) < 1 && v.landed, 'back where it started', v);

  // X-rays: from above, from the side, and a hand
  await landOn(-32, 46, 'xray', -Math.PI / 2); await page.evaluate(() => { window.__heli.h.yaw = 0; }); await act('Take an X-ray'); await rest(); await until(q => q.hosp.shots === 1, 'shoots', 600, 1); await step(1); await step(8); v = await H(); must(v.hosp.shades > 10, 'a real picture with many shades', v.hosp); await shot('hosp-xray-1');
  await until(q => q.rpm < 0.02, 'stopped'); await step(120); await act('X-ray from the side'); await rest(); await until(q => q.hosp.shots === 2, 'shoots', 600, 1); await step(1); await step(8); await shot('hosp-xray-2');
  await step(120); await act('X-ray a hand'); await rest(); await until(q => q.hosp.shots === 3, 'shoots', 600, 1); await step(1); await step(8); v = await H(); must(v.hosp.bones === 27, '27 bones', v.hosp); await shot('hosp-xray-3'); await step(200);

  // Grandpa
  await landOn(29, 54, 'table', Math.PI * 0.75); await step(40); await act('Bed up'); await rest(); await step(80); v = await H(); must(v.hosp.bedK > 0.9 && v.hosp.heart > 75, 'sits up, happy heart', v.hosp); await shot('hosp-grandpa'); must((await asked()).includes('monitor'), 'the monitor beeps', {});
  await act('Bed down'); await rest(); await step(60);
  // the mail tubes
  await landOn(-36, 82, 'tube', -Math.PI / 2); await step(30); await act('Send medicine'); await rest(); await step(22); v = await H(); must(v.hosp.capsule && v.hosp.mail > 0.1, 'on its way', v.hosp); await shot('hosp-tube'); v = await until(q => q.hosp.mail < 0, 'it arrives');
  // the babies
  await landOn(28, 84, 'mat', Math.PI / 2); await step(50); v = await H(); must(v.hosp.open > 0.7, 'the blades woke the babies', v.hosp); await shot('hosp-babies'); await lever('throttle', 0); await act('Play lullaby'); await rest(); await until(q => q.hosp.open < 0.1, 'asleep again'); let c = await cap(); must(c.includes('asleep') || c.includes('soft song') || c.includes('Soft'), 'says so', c); await step(60); await shot('hosp-lullaby');
  // it won't land on a baby or on Grandpa
  await lever('throttle', 1); await until(q => q.rpm > 0.99, 'spins up'); await put(38, 12, 41); await lever('lever', 0.3); await step(160); v = await H(); must(!v.landed && v.y > 9.5, 'never lands on Grandpa', v);
  // the MRI line
  await put(0, 8, 70, 0); await lever('lever', 0.5); await stick(0, 1); await step(160); v = await H(); must(v.z <= 91.01, 'stays behind the yellow line', v); c = await cap(); must(c.includes('MRI'), 'says why', c); await shot('hosp-mri'); await letGo();
  // walls: it never gets through, and a wall in front of the camera fades
  await put(34, 8, 40, 0); await stick(0, 1); await step(160); v = await H(); must(v.z < 62, 'a wall stops it', v); await letGo();
  await put(34, 8, 74, 0); await step(40); v = await H(); must(v.hosp.walls[2] < 0.3, 'the wall in front of the camera fades', v.hosp.walls);
  await put(0, 8, 50, 0.3); await act('Sit inside'); await rest(); await step(40); await shot('hosp-seat'); await act('Sit inside'); await rest();
  await page.click('#daynight'); await rest(); await step(120); await shot('hosp-night'); await page.click('#daynight'); await rest();

  // out through the front doors
  await put(0, 6, 22, Math.PI); await stick(0, 1); await until(q => q.phase === 'fadeout', 'flies out the doors', 400); await letGo(); await step(14); await step(12); v = await H(); must(v.phase === 'grow', 'growing', v); await until(q => q.phase === null, 'full size'); await step(30); v = await H(); must(v.place === 'yard' && v.landed && v.s === 1, 'on the front pad again', v); await shot('hosp-out');
  // in from the roof, by elevator, and back up
  await lever('throttle', 1); await until(q => q.rpm > 0.99, 'spins up'); await put(4, 16, 64, 0); await lever('lever', 0.3); await until(q => q.landed, 'on the roof'); await act('Fly in the hospital'); await rest(); await until(q => q.phase === 'in', 'in by elevator'); await step(30); v = await H(); must(v.x === -34, 'at the elevator', v); await shot('hosp-elevator'); must((await asked()).includes('ding'), 'ding', {});
  await put(-34, 6, 30, 0); await step(30); await put(-34, 6, 9, 0); await lever('lever', 0.35); await until(q => q.phase === 'grow', 'rides up', 600); v = await until(q => q.phase === null, 'on the roof', 200); must(v.place === 'hospital' && v.y === 12, 'back on the roof', v);
  // on the grass by the hospital too
  await lever('lever', 0.6); await until(q => q.y > 14, 'up'); await put(-11, 4, 60, 0); await lever('lever', 0.3); v = await until(q => q.landed, 'on the grass', 400); must(await shown('Fly in the hospital'), 'the button shows on the grass too', v);
  // another mode: out of the hospital, home, then change
  await act('Fly in the hospital'); await rest(); await until(q => q.phase === 'in', 'in again'); await click(2); await step(5); c = await cap(); must(c.includes('Flying home') || c.includes('front doors'), 'flies home first', c);
  for (let i = 0; i < 2400; i += 10) { await step(10); v = await H(); if (v.phase === null && v.x === 0 && v.z === 0 && v.rpm === 0) break; }
  await step(420); c = await cap(); must(c.includes('station') || c.includes('track') || c.includes('aboard') || c.includes('Chugging'), 'then changes into the train', c); await shot('hosp-train');
  // and bedtime from inside
  await click(7); await step(420); await lever('throttle', 1); await until(q => q.rpm > 0.99, 'spins up'); await put(4, 4, 45, 0); await lever('lever', 0.3); await until(q => q.landed, 'front pad'); await act('Fly in the hospital'); await rest(); await until(q => q.phase === 'in', 'in'); await page.click('#park'); await rest();
  for (let i = 0; i < 3000; i += 20) { await step(20); c = await cap(); if (c.includes('parked') || c.includes('Sweet dreams')) break; } must(c.includes('parked') || c.includes('Sweet dreams'), 'parks for the night', c);
  console.log('hospital checks passed');
};
