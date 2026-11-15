// Compares every screenshot in tests/shots/ with the approved one in tests/baseline/.
// The test runs are repeatable (see tests/shoot.js), so any changed pixel means the game looks different.
// usage: node tests/compare.js            compare, write red-marked copies of changed shots to tests/compare/
//        node tests/compare.js --approve  make the current shots the new baseline (after looking at them)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const shots = path.join(here, 'shots'), base = path.join(here, 'baseline'), out = path.join(here, 'compare');
const pngs = dir => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort() : [];

if (process.argv.includes('--approve')) {
  fs.mkdirSync(base, { recursive: true });
  for (const f of pngs(base)) fs.unlinkSync(path.join(base, f));
  for (const f of pngs(shots)) fs.copyFileSync(path.join(shots, f), path.join(base, f));
  console.log('baseline approved:', pngs(base).length, 'shots');
  process.exit(0);
}

fs.mkdirSync(out, { recursive: true });
for (const f of pngs(out).filter(f => f.startsWith('diff-'))) fs.unlinkSync(path.join(out, f));
const changed = [], missing = [], added = pngs(shots).filter(f => !fs.existsSync(path.join(base, f)));
let same = 0;
for (const f of pngs(base)) {
  if (!fs.existsSync(path.join(shots, f))) { missing.push(f); continue; }
  const a = PNG.sync.read(fs.readFileSync(path.join(base, f))), b = PNG.sync.read(fs.readFileSync(path.join(shots, f)));
  if (a.width !== b.width || a.height !== b.height) { changed.push(f + ' (size changed)'); continue; }
  let n = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) { n++; b.data[i] = 255; b.data[i + 1] = 0; b.data[i + 2] = 0; b.data[i + 3] = 255; }
  }
  if (!n) { same++; continue; }
  changed.push(f + ' (' + n + ' pixels)');
  fs.writeFileSync(path.join(out, 'diff-' + f), PNG.sync.write(b));
}
console.log('screenshots: ' + same + ' match the baseline');
if (changed.length) console.log('changed: ' + changed.join(', ') + '\n  red marks the changed pixels in tests/compare/diff-*.png');
if (missing.length) console.log('no longer taken: ' + missing.join(', '));
if (added.length) console.log('new, not in the baseline yet: ' + added.join(', '));
if (changed.length || missing.length || added.length) {
  console.log('If the change is on purpose, look at the shots, then run: npm run baseline');
  process.exit(1);
}
