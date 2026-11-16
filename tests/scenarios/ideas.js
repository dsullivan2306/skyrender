// Jasper's ideas: he types an idea or a change and taps Send to Dad. It leaves locked (his words never travel in the
// open), the key on Dad's Mac unlocks it, it waits on the iPad and sends itself when there's no internet, it stays
// after a reload, and an idea that comes true leaves the Sent list. Reads well in light and dark.
// The relay is faked here, so tests never send anything for real.
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
export default async ({ page, step, shot }) => {
  const posts = []; let online = true;
  await page.route('https://ntfy.sh/**', r => { if (!online) return r.abort(); posts.push({ url: r.request().url(), body: r.request().postData() }); return r.fulfill({ status: 200, body: '{}' }); });
  const state = () => page.evaluate(() => ({
    open: !document.getElementById('ideas').hidden,
    sent: [...document.querySelectorAll('.ideas-waiting li')].map(li => li.textContent),
    done: document.querySelectorAll('ol.ideas-list li').length,
    note: document.querySelector('.ideas-note').textContent,
    focus: document.activeElement.id || document.activeElement.textContent,
  }));
  const must = (ok, why, s) => { if (!ok) throw new Error(why + ' ' + JSON.stringify(s)); };
  const settle = async () => { for (let i = 0; i < 20; i++) { await page.waitForTimeout(100); await step(1); } };
  must(await page.evaluate(() => !!document.getElementById('ideasBtn')), 'the ideas button should always show', {});
  await page.click('#ideasBtn'); await step(2);
  let s = await state(); must(s.open && s.focus === 'ideaText', 'opens with the typing box ready', s);
  await page.click('#ideaSend'); s = await state(); must(s.note === 'Type your idea first.', 'an empty idea is not sent', s);
  await page.fill('#ideaText', 'Make the train fly to the moon'); await page.click('#ideaSend'); await settle();
  s = await state(); must(s.note.startsWith('Sent!') && posts.length === 1 && s.sent[0].includes('Sent on'), 'sent to Dad', { s, posts: posts.length });
  const key = (await import('../../src/ideas/key.js'));
  must(posts[0].url.startsWith('https://ntfy.sh/' + key.IDEA_TOPIC), 'goes to the idea relay', posts[0].url);
  must(!posts[0].body.includes('train') && JSON.parse(posts[0].body).v === 1, 'the idea travels locked', posts[0].body.slice(0, 80));
  // the key on Dad's Mac unlocks it (skipped on a machine without the key)
  const keyFile = os.homedir() + '/.skyrender/idea-key.json';
  if (fs.existsSync(keyFile)) {
    const { subtle } = crypto.webcrypto, b = JSON.parse(posts[0].body), unb64 = x => Uint8Array.from(Buffer.from(x, 'base64'));
    const priv = await subtle.importKey('jwk', JSON.parse(fs.readFileSync(keyFile, 'utf8')).privateKey, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
    const aes = await subtle.importKey('raw', await subtle.decrypt({ name: 'RSA-OAEP' }, priv, unb64(b.k)), { name: 'AES-GCM' }, false, ['decrypt']);
    const idea = JSON.parse(new TextDecoder().decode(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(b.iv) }, aes, unb64(b.c))));
    must(idea.words === 'Make the train fly to the moon' && idea.kind === 'new' && idea.id, 'Dad\'s key unlocks it', idea);
    console.log('unlocked with Dad\'s key:', idea.words);
  } else console.log('(no key on this machine; unlock check skipped)');
  // no internet: it waits on the iPad, then sends by itself
  online = false;
  await page.getByRole('button', { name: 'Change something', exact: true }).click();
  await page.fill('#ideaText', 'The tractor should be blue'); await page.click('#ideaSend'); await settle();
  s = await state(); must(s.note.startsWith('Saved.') && s.sent[1].includes('Waiting to send'), 'waits when offline', s);
  await shot('ideas-1');
  await page.emulateMedia({ colorScheme: 'dark' }); await step(2); await shot('ideas-2'); await page.emulateMedia({ colorScheme: 'light' });
  online = true; await page.evaluate(() => dispatchEvent(new Event('online'))); await settle();
  s = await state(); must(posts.length === 2 && s.sent[1].includes('Sent on') && s.sent[1].startsWith('Change:'), 'sends itself when the internet is back', { s, posts: posts.length });
  // still there after closing and coming back
  await page.reload(); await page.waitForFunction(() => window.__raf); await page.click('#ideasBtn'); await step(2);
  s = await state(); must(s.sent.length === 2 && posts.length === 2, 'kept on the iPad, not sent twice', { s, posts: posts.length });
  // one comes true (this sample list is only for the test, never shown to Jasper)
  await page.evaluate(() => window.__ideasTest([{ words: 'Make the train fly to the moon', when: '2026-11-15', what: 'Test line: the train flies to the Moon' }]));
  await page.click('#ideasBtn'); await step(2);
  s = await state(); must(s.sent.length === 1 && s.done === 1, 'the idea moved to came true', s);
  await shot('ideas-3');
  await page.getByRole('button', { name: 'Close', exact: true }).click(); await step(2);
  s = await state(); must(!s.open && s.focus === 'ideasBtn', 'closes back to the button', s);
  console.log('ideas checks passed');
};
