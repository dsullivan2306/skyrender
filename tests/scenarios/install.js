// Home screen install: the page links a web app manifest and an iPad icon, and every icon loads at its stated size.
export default async ({ page, step, shot }) => {
  const r = await page.evaluate(async () => {
    const href = sel => { const e = document.querySelector(sel); return e && e.href; };
    const out = { problems: [] };
    const mUrl = href('link[rel="manifest"]'), touch = href('link[rel="apple-touch-icon"]');
    if (!mUrl) out.problems.push('no manifest link');
    if (!touch) out.problems.push('no apple-touch-icon link');
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"][content="yes"]')) out.problems.push('not set to open full screen on iPad');
    const size = src => new Promise(ok => { const im = new Image(); im.onload = () => ok(im.naturalWidth + 'x' + im.naturalHeight); im.onerror = () => ok('failed'); im.src = src; });
    if (mUrl) {
      const res = await fetch(mUrl); const m = await res.json();
      out.name = m.name; out.display = m.display; out.start = m.start_url;
      if (m.name !== 'Skyrender') out.problems.push('manifest name is ' + m.name);
      if (m.display !== 'standalone') out.problems.push('manifest display is ' + m.display);
      out.icons = [];
      for (const ic of m.icons) {
        const got = await size(new URL(ic.src, mUrl).href);
        out.icons.push(ic.src + ' ' + got);
        if (got === 'failed' || (ic.sizes !== 'any' && got !== ic.sizes)) out.problems.push(ic.src + ' is ' + got + ', manifest says ' + ic.sizes);
      }
    }
    if (touch) { out.touch = await size(touch); if (out.touch !== '180x180') out.problems.push('apple-touch-icon is ' + out.touch); }
    return out;
  });
  console.log('manifest', r.name, r.display, r.start, '| icons', (r.icons || []).join(', '), '| ipad icon', r.touch);
  await step(10);
  await shot('install-1');
  if (r.problems.length) throw new Error('install: ' + r.problems.join('; '));
};
