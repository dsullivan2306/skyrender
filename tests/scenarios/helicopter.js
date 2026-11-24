// Jasper's idea: "Skyrender is going to be a great amazing helicopter and the crew will be boarding just like the plane
// and I will control the flight and blade". Uses the real controls on the screen: drags the Blades and Lift levers and
// the stick, holds the pedals, boards the crew, sits inside, and lands on the hospital and the mountain. Checks that
// slow blades can't lift, that turning the blades off in the air is safe, and that other modes wait for it to fly home.
export default async ({ page, step, shot, act, click }) => {
  const cap = () => page.$eval('#step', e => e.textContent);
  const H = () => page.evaluate(() => { const g = window.__heli, { h, C } = g; return { x: h.x, z: h.z, y: h.y, vx: h.vx, vz: h.vz, vy: h.vy, yaw: h.yaw, rpm: h.rpm, spin: h.spin, agl: h.agl, landed: h.landed, place: h.floor.place, kind: h.floor.kind, crewIn: h.crewIn, inside: h.inside, off: !!h.off, auto: h.auto, board: h.board && { ...h.board }, C: { ...C }, dust: g.dust, rings: g.rings, flap: g.rig.flaps[0].rotation.x, twist: g.rig.flaps[0].rotation.z }; });
  const must = (ok, why, v) => { if (!ok) throw new Error(why + ' ' + JSON.stringify(v)); };
  const until = async (ok, why, max = 1200, by = 5) => { for (let i = 0; i < max; i += by) { const v = await H(); if (ok(v)) return v; await step(by); } throw new Error(why + ' ' + JSON.stringify(await H()) + ' ' + await cap()); };
  const shown = label => page.evaluate(l => [...document.querySelectorAll('#acts button')].some(b => b.textContent === l && !b.hidden && b.offsetParent), label);
  const rest = () => page.mouse.move(400, 60);
  // drag a lever to a height from 0 (bottom) to 1 (top)
  const lever = async (key, v) => { const b = await (await page.$(`[data-lever="${key}"]`)).boundingBox(), x = b.x + b.width / 2, at = u => b.y + 20 + (1 - u) * (b.height - 40); await page.mouse.move(x, at(0.4)); await page.mouse.down(); await page.mouse.move(x, at(v), { steps: 3 }); await page.mouse.up(); await rest(); };
  const stick = async (dx, dy) => { const b = await (await page.$('[data-stick]')).boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx * 50, y - dy * 50, { steps: 3 }); };
  const letGo = async () => { await page.mouse.up(); await rest(); };
  const put = (x, y, z) => page.evaluate(([x, y, z]) => { const h = window.__heli.h; h.x = x; h.y = y; h.z = z; h.vx = h.vy = h.vz = 0; h.landed = false; }, [x, y, z]);

  await step(20); await click(7); await step(70); await shot('heli-1'); await step(75); await shot('heli-2'); await step(260); await rest(); await step(10); await shot('heli-3');
  let v = await H(), c;
  must(v.landed && v.rpm === 0 && v.flap > 0.03, 'on the pad, blades still and sagging', v);
  must(await page.$eval('#heli', e => !e.hidden), 'the controls show', {});

  // the crew boards
  await act('Board the crew'); await rest(); await step(55); must(!(await shown('Board the crew')), 'no boarding twice', {}); await shot('heli-board-1');
  await step(70); await shot('heli-board-2');
  v = await until(q => q.crewIn && q.inside, 'the crew is aboard and Jasper sits inside'); await page.waitForTimeout(200); await step(20); await shot('heli-inside');
  c = await page.evaluate(() => window.__heli.greet(0)); must(c.includes('joined together'), 'the co-pilot talks', c);
  await page.evaluate(() => { window.__heli.look = { yaw: 2.75, pitch: -0.15 }; }); await step(5); await shot('heli-crew'); await page.evaluate(() => { window.__heli.look = { yaw: 0, pitch: -0.16 }; });

  // the blades: too slow can't lift, fast enough can
  await lever('throttle', 0.55); await until(q => Math.abs(q.rpm - q.C.throttle) < 0.02, 'blades reach the speed he picked');
  await lever('lever', 1); await step(60); v = await H(); must(v.landed && v.y === 0, 'slow blades can\'t lift', v); c = await cap(); must(c.startsWith('Too slow'), 'says why', c);
  await lever('lever', 0); await lever('throttle', 1); v = await until(q => q.rpm > 0.99, 'full speed'); must(v.landed, 'still down with the lever down', v); must(v.flap < 0.01, 'spinning pulls the blades straight', v);
  const flat = v.twist; await lever('lever', 0.8); v = await until(q => !q.landed && q.y > 5, 'lifts off'); must(v.twist < flat - 0.2, 'more lift twists the blades', v); c = v;
  await lever('lever', 0.5); v = await until(q => Math.abs(q.vy) < 0.15, 'hovers in the middle notch'); must(v.y > 5, 'hovering up high', v);
  // the stick, from inside and from outside
  await stick(0, 1); await step(50); v = await H(); must(v.vz > 5, 'stick forward flies forward', v); await shot('heli-fly-in'); await letGo(); await act('Sit inside'); await rest(); await step(70);
  v = await H(); must(!v.inside && Math.hypot(v.vx, v.vz) < 2, 'lets go and it slows to a hover', v); await shot('heli-fly');
  await stick(0, -1); await step(60); v = await H(); must(v.vz < -3, 'flies backward', v); c = await cap(); must(c.includes('backward'), 'says so', c); await letGo(); await step(80);
  await stick(1, 0); await step(40); v = await H(); must(v.vx < -2, 'slides to its right', v); await letGo(); await step(80);
  const yaw0 = (await H()).yaw, pb = await page.getByRole('button', { name: 'Turn left', exact: true }).boundingBox(); await page.mouse.move(pb.x + 20, pb.y + 10); await page.mouse.down(); await step(30); v = await H(); must(v.yaw > yaw0 + 0.6, 'the left pedal turns it left', v); await letGo(); await step(40);
  // no tail blades: the body spins
  const y1 = (await H()).yaw; await act('Stop tail blades'); await rest(); await step(80); v = await H(); must(v.yaw < y1 - 1.5, 'without tail blades the body turns the other way', v); c = await cap(); must(c.includes('tail blades'), 'says why', c); await act('Stop tail blades'); await rest(); await step(60); v = await H();
  const y2 = v.yaw; await step(40); v = await H(); must(Math.abs(v.yaw - y2) < 0.1, 'tail blades hold it still', v);

  // places: the hospital roof, the lake, the mountain, over a hill, and the edge of the valley
  await put(4, 15, 64); await lever('lever', 0.3); v = await until(q => q.landed, 'lands on the hospital roof'); must(v.place === 'hospital' && Math.abs(v.y - 12) < 0.01, 'on the roof', v); await step(60); await shot('heli-hospital');
  await lever('lever', 0.7); await until(q => q.y > 14, 'takes off from the roof');
  await put(60, 3, -62); await lever('lever', 0.44); await step(70); v = await H(); must(v.rings > 1 && v.dust > 3, 'blade wind makes rings and spray', v); await shot('heli-lake');
  await lever('lever', 0); await step(120); v = await H(); must(!v.landed && v.y > 0.9 && v.kind === 'water', 'never sinks in the lake', v);
  await put(64, 26, 44); await lever('lever', 0.3); v = await until(q => q.landed, 'lands on the mountain'); must(v.place === 'mountain', 'on top', v); await step(60); await shot('heli-mountain');
  await lever('lever', 0.5); await put(-60, 3, 60); await page.evaluate(() => { window.__heli.h.yaw = 0; }); await stick(0, 1); await step(120); v = await H(); let g = await page.evaluate(() => { const { h } = window.__heli; return window.__heli.ground(h.x, h.z).y; }); must(v.y >= g - 0.3, 'goes up and over a hill', { ...v, g });
  await step(400); v = await H(); must(Math.hypot(v.x, v.z) < 134, 'stays in the valley', v); await letGo();

  // blades off in the air: floats down like a maple seed and lands softly
  await put(16, 20, 20); await page.evaluate(() => { window.__heli.h.yaw = 0; }); await lever('lever', 0.5); await lever('throttle', 0); await step(90); v = await H(); c = await cap(); must(v.off && v.vy > -3.3 && v.rpm > 0.5 && c.includes('maple seed'), 'floats down, blades still turning', { ...v, c }); await shot('heli-maple');
  let hard = 0; for (let i = 0; i < 300; i += 5) { v = await H(); if (v.landed) break; hard = v.agl < 0.15 ? Math.min(hard, v.vy) : hard; await step(5); } must(v.landed && hard > -1.3, 'a soft landing with no engine', { ...v, hard });
  must(await shown('Open door'), 'the door can open on the ground', {});
  await act('Crew gets off'); await step(3); c = await cap(); must((await H()).board === null && c.includes('pad'), 'the crew only gets off on a pad', c);

  // fly home, let the crew off
  await act('Fly home'); await rest(); v = await until(q => q.auto === null && q.landed && q.place === 'home', 'the autopilot flies home', 2000); await until(q => q.rpm === 0, 'blades stop');
  await act('Crew gets off'); await rest(); await step(100); await shot('heli-off'); v = await until(q => !q.board && !q.crewIn, 'the crew gets off');
  // another mode has to wait until it has flown home and stopped its blades
  await lever('throttle', 1); await until(q => q.rpm > 0.99, 'spins up again'); await lever('lever', 0.7); await until(q => q.y > 6, 'up'); await put(-40, 10, -30);
  await click(2); await step(5); c = await cap(); must(c.includes('Flying home'), 'flies home first', c);
  for (let i = 0; i < 1200; i += 10) { await step(10); if (!(await cap()).includes('Flying home')) break; }
  v = await H(); must(v.x === 0 && v.z === 0 && v.rpm === 0 && v.spin === 0, 'home, blades stopped and lined up to fold', v); must(await page.$eval('#heli', e => e.hidden), 'controls put away', {});
  await step(420); c = await cap(); must(c.includes('station') || c.includes('track') || c.includes('aboard'), 'then changes into the train', c); await shot('heli-train');
  // and bedtime from the air
  await click(7); await step(420); await lever('throttle', 1); await until(q => q.rpm > 0.99, 'spins up'); await lever('lever', 0.8); await until(q => q.y > 4, 'up'); await page.click('#park'); await rest();
  for (let i = 0; i < 2400; i += 20) { await step(20); if ((await cap()).includes('parked') || (await cap()).includes('Sweet dreams')) break; } c = await cap(); must(c.includes('parked') || c.includes('Sweet dreams'), 'parks in the garage for the night', c); await step(120); await shot('heli-night');
  console.log('helicopter checks passed');
};
