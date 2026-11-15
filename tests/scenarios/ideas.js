// Jasper's ideas page: hidden while the list is empty; with ideas it opens, lists them, closes, and reads well in light and dark.
export default async ({ page, step, shot }) => {
  const real = await page.evaluate(() => !!document.getElementById('ideasBtn'));
  console.log('button shown with the real list:', real);
  // a sample list, only for this test (never shown to Jasper)
  await page.evaluate(() => window.__ideasTest([
    { words: 'Sample idea one', when: '2026-11-14', what: 'Test line about what it does' },
    { words: 'Sample idea two, a little longer to check that it wraps nicely on a phone', when: '2026-11-15', what: 'Another test line' },
  ]));
  await page.click('#ideasBtn'); await step(2);
  const open = await page.evaluate(() => ({ hidden: document.getElementById('ideas').hidden, items: document.querySelectorAll('.ideas-list li').length, title: document.querySelector('.ideas-title').textContent, focus: document.activeElement.textContent }));
  console.log('open', JSON.stringify(open));
  if (open.hidden || open.items !== 2 || open.focus !== 'Close') throw new Error('ideas page did not open properly');
  await shot('ideas-1');
  await page.emulateMedia({ colorScheme: 'dark' }); await step(2); await shot('ideas-2');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.getByRole('button', { name: 'Close', exact: true }).click(); await step(2);
  const closed = await page.evaluate(() => ({ hidden: document.getElementById('ideas').hidden, focus: document.activeElement.id }));
  console.log('closed', JSON.stringify(closed));
  if (!closed.hidden || closed.focus !== 'ideasBtn') throw new Error('ideas page did not close properly');
};
