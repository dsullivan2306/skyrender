// Draws the home-screen icons (PNG) from public/icon.svg. Run after changing the SVG: npm run icons
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const pub = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const svg = fs.readFileSync(path.join(pub, 'icon.svg'), 'utf8');
const browser = await chromium.launch();
for (const size of [180, 192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.screenshot({ path: path.join(pub, `icon-${size}.png`) });
  await page.close();
  console.log('icon-' + size + '.png');
}
await browser.close();
