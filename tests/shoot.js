// Click-through test harness for Skyrender.
// usage: node tests/shoot.js tests/scenarios/<name>.js        (env: PAGE=path/to/page.html, DPR=2)
// A scenario exports async ({ page, step, shot, drag, click, act }) => {}.
//   step(n)   advance the game clock n frames of 50 ms (the clock is stepped, so runs are repeatable)
//   shot(nm)  screenshot to tests/shots/<nm>.png and print the caption line
//   click(m)  press mode button m (0 plane, 1 robot, 2 train, 3 rocket, 4 truck, 5 tractor)
//   act(lbl)  press a button by its visible label
// Prints "errors [...]" at the end: any page error is a failure.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
(async () => {
  fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 820, height: 560 }, deviceScaleFactor: +(process.env.DPR || 1) });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  // serve three.js locally so tests run offline; block web fonts
  await page.route('**/three.min.js', r => r.fulfill({ body: fs.readFileSync(path.join(root, 'node_modules/three/build/three.min.js')), contentType: 'application/javascript' }));
  await page.route('**fonts.g**', r => r.abort());
  await page.addInitScript(() => {
    let t = 0; performance.now = () => t;
    for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) for (const k of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const orig = C.prototype[k]; if (!orig) continue;
      C.prototype[k] = function (...a) { if (window.__fast) return; return orig.apply(this, a); };
    }
    window.__raf = null; window.requestAnimationFrame = f => { window.__raf = f; return 1; };
    window.__step = n => { window.__fast = true; for (let i = 0; i < n; i++) { if (i === n - 1) window.__fast = false; t += 50; const f = window.__raf; window.__raf = null; if (f) f(t); } window.__fast = false; };
  });
  await page.goto('file://' + path.resolve(process.env.PAGE || path.join(root, 'skyrender.html')));
  await page.waitForFunction(() => window.__raf);
  const step = n => page.evaluate(n => window.__step(n), n);
  const shot = async name => { await page.screenshot({ path: path.join(__dirname, 'shots', name + '.png') }); console.log(name, '|', await page.$eval('#step', e => e.textContent)); };
  const drag = async (dx, dy) => { await page.mouse.move(400, 200); await page.mouse.down(); await page.mouse.move(400 + dx, 200 + dy, { steps: 4 }); await page.mouse.up(); };
  const click = m => page.click(`[data-mode="${m}"]`);
  const act = async label => { await page.getByRole('button', { name: label, exact: true }).click(); };
  await require(path.resolve(process.argv[2]))({ page, step, shot, drag, click, act });
  console.log('errors', errs);
  await browser.close();
  if (errs.length) process.exit(1);
})();
