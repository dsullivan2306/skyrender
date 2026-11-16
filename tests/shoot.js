// Click-through test harness for Skyrender.
// usage: node tests/shoot.js tests/scenarios/<name>.js        (env: PAGE=path/to/page.html, DPR=2)
// IPAD=1 runs it in WebKit (the engine inside Safari) at iPad Air size with touch, and saves shots to tests/shots-ipad/.
// Tests the built page (dist/index.html) by default, so run `npm run build` first (`npm test` does).
// The page is served from a tiny local web server, because browsers won't load modules from file://.
// A scenario exports default async ({ page, step, shot, drag, click, act }) => {}.
//   step(n)   advance the game clock n frames of 50 ms (the clock is stepped, so runs are repeatable)
//   shot(nm)  screenshot to tests/shots/<nm>.png and print the caption line
//   click(m)  press mode button m (0 plane, 1 robot, 2 train, 3 rocket, 4 truck, 5 tractor)
//   act(lbl)  press a button by its visible label
// Prints "errors [...]" at the end: any page error is a failure.
import { chromium, webkit } from 'playwright';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath, pathToFileURL } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const pagePath = path.resolve(process.env.PAGE || path.join(root, 'dist/index.html'));
if (!fs.existsSync(pagePath)) { console.error('no page at ' + pagePath + ' (run npm run build first)'); process.exit(1); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const serveDir = path.dirname(pagePath);
const server = http.createServer((req, res) => {
  const f = path.join(serveDir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(serveDir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/${path.basename(pagePath)}`;

const ipad = !!process.env.IPAD, shotDir = path.join(here, ipad ? 'shots-ipad' : 'shots');
fs.mkdirSync(shotDir, { recursive: true });
const browser = ipad ? await webkit.launch() : await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(ipad ? { viewport: { width: 1180, height: 820 }, deviceScaleFactor: +(process.env.DPR || 1), hasTouch: true }
  : { viewport: { width: 820, height: 560 }, deviceScaleFactor: +(process.env.DPR || 1) });
const errs = []; page.on('pageerror', e => errs.push(e.message));
// serve three.js locally if a page still loads it from the web (the old single file did); block web fonts
await page.route('**/three.min.js', r => r.fulfill({ body: fs.readFileSync(path.join(root, 'node_modules/three/build/three.min.js')), contentType: 'application/javascript' }));
await page.route('**fonts.g**', r => r.abort());
// Everything that could change from run to run is pinned, so the same scenario gives the same pictures every time:
// the clock is stepped, Math.random follows a fixed seed, timers fire on the stepped clock, CSS fades are off, and
// the blinking text cursor is hidden (it blinks on the real clock).
// This only affects the tests; the game itself stays random and real-time.
await page.addInitScript(() => {
  let t = 0; performance.now = () => t;
  let seed = 20261115;
  Math.random = () => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const timers = []; let tid = 0;
  window.setTimeout = (f, ms, ...a) => { timers.push({ id: ++tid, due: t + (+ms || 0), f, a }); return tid; };
  window.clearTimeout = id => { const i = timers.findIndex(x => x.id === id); if (i >= 0) timers.splice(i, 1); };
  const runTimers = () => { for (;;) { timers.sort((p, q) => p.due - q.due || p.id - q.id); if (!timers.length || timers[0].due > t) return; const x = timers.shift(); x.f(...x.a); } };
  document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }'; document.head.appendChild(s); });
  for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) for (const k of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
    const orig = C.prototype[k]; if (!orig) continue;
    C.prototype[k] = function (...a) { if (window.__fast) return; return orig.apply(this, a); };
  }
  window.__raf = null; window.requestAnimationFrame = f => { window.__raf = f; return 1; };
  window.__step = n => { window.__fast = true; for (let i = 0; i < n; i++) { if (i === n - 1) window.__fast = false; t += 50; runTimers(); const f = window.__raf; window.__raf = null; if (f) f(t); } window.__fast = false; };
});
await page.goto(url);
await page.waitForFunction(() => window.__raf);
const step = n => page.evaluate(n => window.__step(n), n);
const shot = async name => { await page.screenshot({ path: path.join(shotDir, name + '.png') }); console.log(name, '|', await page.$eval('#step', e => e.textContent)); };
const drag = async (dx, dy) => { await page.mouse.move(400, 200); await page.mouse.down(); await page.mouse.move(400 + dx, 200 + dy, { steps: 4 }); await page.mouse.up(); };
// on the iPad run, buttons are tapped with a finger instead of clicked
const click = m => ipad ? page.tap(`[data-mode="${m}"]`) : page.click(`[data-mode="${m}"]`);
const act = async label => { const b = page.getByRole('button', { name: label, exact: true }); await (ipad ? b.tap() : b.click()); };
if (ipad) page.click = (sel, opts) => page.tap(sel, opts);   // every press in a scenario is a finger tap on the iPad run
const scenario = (await import(pathToFileURL(path.resolve(process.argv[2])).href)).default;
await scenario({ page, step, shot, drag, click, act });
console.log('errors', errs);
await browser.close();
server.close();
if (errs.length) process.exit(1);
