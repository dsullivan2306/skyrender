export default async ({ page, step, shot, click }) => {
  const order = [5, 4, 2, 0, 5, 3, 1, 5, 4, 0, 2, 3, 5, 1, 2, 4, 3, 0, 1, 5, 0];
  for (const m of order) {
    await click(m); await step(420);
    const n = await page.$$eval('#acts > *', b => b.length);
    for (let i = 1; i <= n; i++) { const sel = `#acts > :nth-child(${i})`; if ((await page.$eval(sel, e => e.textContent)) === 'Board the plane') continue; await page.click(sel); await step(25); }
    await shot('all-' + m);
  }
  await page.click('#daynight'); await click(5); await step(700); await shot('night-farm');
};
