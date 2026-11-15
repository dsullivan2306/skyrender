// Jasper's ideas: the button opens a panel whose "Write a new idea" link goes to his idea box (a private claude.ai
// page Dad and Claude read directly); ideas saved on the iPad by the earlier version still show until removed; and
// the ideas that came true are listed, matching ones leaving the saved list. Reads well in light and dark.
const IDEA_BOX = 'https://claude.ai/artifact/FF7jNviYAGQburkFhaCpze';
export default async ({ page, step, shot }) => {
  const state = () => page.evaluate(() => ({
    open: !document.getElementById('ideas').hidden,
    href: document.getElementById('ideaWrite').href,
    waiting: [...document.querySelectorAll('.ideas-waiting li .ideas-words')].map(e => e.textContent),
    done: document.querySelectorAll('ol.ideas-list li').length,
    focus: document.activeElement.id || document.activeElement.textContent,
  }));
  const must = (ok, why, s) => { if (!ok) throw new Error(why + ' ' + JSON.stringify(s)); };
  must(await page.evaluate(() => !!document.getElementById('ideasBtn')), 'the ideas button should always show', {});
  await page.click('#ideasBtn'); await step(2);
  let s = await state(); must(s.open && s.focus === 'ideaWrite' && s.href === IDEA_BOX && s.waiting.length === 0, 'opens with Write a new idea, linked to the idea box', s);
  must(await page.$eval('#ideaWrite', a => a.target === '_blank'), 'the idea box opens in its own tab', s);
  await shot('ideas-1');
  await page.emulateMedia({ colorScheme: 'dark' }); await step(2); await shot('ideas-2'); await page.emulateMedia({ colorScheme: 'light' });
  // ideas saved on the iPad by the earlier version still show
  await page.evaluate(() => localStorage.setItem('skyrender-ideas-waiting', JSON.stringify([
    { words: 'Make the train fly to the moon', kind: 'new', when: '2026-11-15' }, { words: 'The tractor should be blue', kind: 'change', when: '2026-11-15' }])));
  await page.reload(); await page.waitForFunction(() => window.__raf); await page.click('#ideasBtn'); await step(2);
  s = await state(); must(s.waiting.length === 2 && s.waiting[1].startsWith('Change:'), 'saved ideas still show', s);
  // one comes true (this sample list is only for the test, never shown to Jasper)
  await page.evaluate(() => window.__ideasTest([{ words: 'Make the train fly to the moon', when: '2026-11-15', what: 'Test line: the train flies to the Moon' }]));
  await page.click('#ideasBtn'); await step(2);
  s = await state(); must(s.waiting.length === 1 && s.done === 1, 'the idea moved to came true', s);
  await shot('ideas-3');
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  s = await state(); must(s.waiting.length === 0, 'Remove takes it off the list', s);
  await page.getByRole('button', { name: 'Close', exact: true }).click(); await step(2);
  s = await state(); must(!s.open && s.focus === 'ideasBtn', 'closes back to the button', s);
  console.log('ideas checks passed');
};
