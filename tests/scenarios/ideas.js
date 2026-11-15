// Jasper's ideas: he types an idea or a change, saves it (it stays after a reload), sends it to Dad, can remove
// one, and an idea that comes true moves from "waiting" to the came-true list. Reads well in light and dark.
export default async ({ page, step, shot }) => {
  const state = () => page.evaluate(() => ({
    open: !document.getElementById('ideas').hidden,
    waiting: [...document.querySelectorAll('.ideas-waiting li .ideas-words')].map(e => e.textContent),
    done: document.querySelectorAll('ol.ideas-list li').length,
    note: document.querySelector('.ideas-note').textContent,
    focus: document.activeElement.id || document.activeElement.textContent,
  }));
  const must = (ok, why, s) => { if (!ok) throw new Error(why + ' ' + JSON.stringify(s)); };
  must(await page.evaluate(() => !!document.getElementById('ideasBtn')), 'the ideas button should always show', {});
  await page.click('#ideasBtn'); await step(2);
  let s = await state(); must(s.open && s.focus === 'ideaText', 'opens with the typing box ready', s);
  await page.click('#ideaSave'); s = await state(); must(s.note === 'Type your idea first.', 'an empty idea is not saved', s);
  await page.fill('#ideaText', 'Make the train fly to the moon'); await page.click('#ideaSave');
  await page.getByRole('button', { name: 'Change something', exact: true }).click();
  await page.fill('#ideaText', 'The tractor should be blue'); await page.click('#ideaSave');
  s = await state(); must(s.waiting.length === 2 && s.waiting[1].startsWith('Change:') && s.note.startsWith('Saved!'), 'two ideas saved', s);
  // still there after closing the page and coming back
  await page.reload(); await page.waitForFunction(() => window.__raf); await page.click('#ideasBtn'); await step(2);
  s = await state(); must(s.waiting.length === 2, 'saved ideas stay on the iPad', s);
  await page.click('#ideaSend'); await step(2);
  s = await state(); console.log('send:', s.note);
  must(['Sent! Dad will read it.', 'Copied! Paste it in a message to Dad.', 'Copy this and send it to Dad.'].includes(s.note), 'Send to Dad answers', s);
  if (s.note.startsWith('Copy this')) must(await page.$eval('.ideas-copy', e => e.value.includes('Make the train fly to the moon')), 'the copy box holds the ideas', s);
  await shot('ideas-1');
  await page.emulateMedia({ colorScheme: 'dark' }); await step(2); await shot('ideas-2'); await page.emulateMedia({ colorScheme: 'light' });
  // an idea that comes true leaves the waiting list (this sample list is only for the test, never shown to Jasper)
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
