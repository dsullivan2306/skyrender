// How smoothly does Skyrender run? Plays each mode in WebKit (the engine inside Safari) at iPad Air size
// and pixel density, on the real clock, and measures how long the game's own work takes each frame.
// usage: node tests/perf.js      (run npm run build first; npm test does)
// The budget is for this Mac: an iPad is roughly twice as slow, so 8 ms here leaves room for 60 frames
// a second there (16.7 ms per frame). GPU drawing time isn't counted; watch Jasper's iPad for that.
import { webkit } from 'playwright';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, '../dist');
const BUDGET_MS = 8;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const f = path.join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname.replace(/\/$/, '/index.html')));
  if (!f.startsWith(dist) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.route('**fonts.g**', r => r.abort());
await page.addInitScript(() => {
  window.__perf = []; const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = f => raf(t => { const a = performance.now(); f(t); window.__perf.push([t, performance.now() - a]); });
});
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
const measure = async (name, setup) => {
  await setup(); await page.waitForTimeout(3500);          // let the transformation finish
  await page.evaluate(() => { window.__perf = []; });
  await page.waitForTimeout(3000);
  const p = await page.evaluate(() => window.__perf);
  const work = p.map(x => x[1]), gaps = p.slice(1).map((x, i) => x[0] - p[i][0]);
  const r = { name, work50: pct(work, 0.5), work95: pct(work, 0.95), fps: gaps.length ? 1000 / pct(gaps, 0.5) : 0 };
  console.log(`${name.padEnd(16)} game work ${r.work50.toFixed(1)} ms typical, ${r.work95.toFixed(1)} ms slowest 5% | ${r.fps.toFixed(0)} frames a second here`);
  return r;
};
const MODES = ['Plane', 'Robot', 'Train', 'Rocket', 'Truck', 'Tractor'];
const results = [];
for (const [i, m] of MODES.entries()) results.push(await measure(m, () => page.tap(`[data-mode="${i}"]`)));
results.push(await measure('Truck crash', async () => { await page.tap('[data-mode="4"]'); await page.waitForTimeout(3500); await page.getByRole('button', { name: 'Crash!', exact: true }).tap(); }));
results.push(await measure('Airport inside', async () => { await page.tap('[data-mode="0"]'); await page.waitForTimeout(3500); await page.getByRole('button', { name: 'Go inside airport', exact: true }).tap(); }));
await browser.close(); server.close();
const over = results.filter(r => r.work95 > BUDGET_MS);
console.log(over.length ? 'over budget (' + BUDGET_MS + ' ms): ' + over.map(r => r.name).join(', ') : 'all within the ' + BUDGET_MS + ' ms budget');
console.log('errors', errs);
// Over budget is reported, not failed: the budget is an estimate until we know how Jasper's iPad feels.
if (errs.length) process.exit(1);
