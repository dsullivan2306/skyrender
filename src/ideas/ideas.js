// "Jasper's ideas": Jasper types his next idea (or a change) and taps "Send to Dad"; it goes straight to Dad and
// Claude, locked so only Dad's Mac can read it (see send.js). No account or sign-in. A copy stays on this iPad
// under "Sent to Dad" until it comes true; ideas that came true are listed in his words with the day.
// It's there so he can see that his ideas become real things.
import { IDEAS } from './list.js';
import { sendIdea } from './send.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const day = iso => { const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso); return isNaN(d) ? '' : MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); };
const same = (a, b) => a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ');
const KEY = 'skyrender-ideas-waiting', DRAFT = 'skyrender-idea-draft';
const load = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: not remembered */ } };
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

function buildIdeas(cameTrue = IDEAS) {
  const name = document.querySelector('.bar .name');
  if (!name) return;
  // ideas that came true leave the "sent" list by themselves (matched on his exact words)
  let mine = (load(KEY) || []).filter(w => !cameTrue.some(c => same(c.words, w.words)));
  for (const w of mine) { if (!w.id) w.id = newId(); if (w.sent === undefined) w.sent = false; }
  store(KEY, mine);

  const btn = el('button', 'ideas-btn', "Jasper's ideas");
  btn.type = 'button'; btn.id = 'ideasBtn'; btn.setAttribute('aria-haspopup', 'dialog');
  name.after(btn);
  const panel = el('div'); panel.id = 'ideas'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', "Jasper's ideas");

  // ---- type the next idea ----
  const ask = el('label', 'ideas-title', 'What should Skyrender do next?'); ask.htmlFor = 'ideaText';
  const kinds = el('div', 'seg ideas-kind'); kinds.setAttribute('role', 'group'); kinds.setAttribute('aria-label', 'Kind of idea');
  let kind = 'new';
  const text = el('textarea', 'ideas-text'); text.id = 'ideaText'; text.rows = 3; text.maxLength = 600; text.placeholder = 'Type your idea here';
  text.value = load(DRAFT) || '';
  text.addEventListener('input', () => store(DRAFT, text.value));
  for (const [k, label] of [['new', 'New idea'], ['change', 'Change something']]) {
    const b = el('button', null, label); b.type = 'button'; b.dataset.kind = k; b.setAttribute('aria-pressed', String(k === kind));
    b.addEventListener('click', () => { kind = k; kinds.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.kind === k))); text.placeholder = k === 'new' ? 'Type your idea here' : 'What should be different?'; text.focus(); });
    kinds.appendChild(b);
  }
  const send = el('button', 'ideas-send', 'Send to Dad'); send.type = 'button'; send.id = 'ideaSend';
  const row = el('div', 'ideas-actions ideas-left'); row.append(send);
  const note = el('p', 'ideas-note'); note.setAttribute('aria-live', 'polite');

  // ---- sent, waiting to be built ----
  const sentHead = el('p', 'ideas-head', 'Sent to Dad');
  const sentList = el('ul', 'ideas-list ideas-waiting');
  // ---- came true ----
  const doneHead = el('p', 'ideas-head');
  const doneList = el('ol', 'ideas-list');
  for (const it of cameTrue) {
    const li = el('li');
    li.append(el('p', 'ideas-words', '"' + it.words + '"'), el('p', 'ideas-what', it.what), el('p', 'ideas-when', 'Came true on ' + day(it.when)));
    doneList.appendChild(li);
  }
  doneHead.textContent = cameTrue.length === 0 ? 'Your ideas that come true will show up here.' : cameTrue.length === 1 ? 'Your idea came true!' : 'Your ' + cameTrue.length + ' ideas came true!';
  const close = el('button', null, 'Close'); close.type = 'button';
  const closeRow = el('div', 'ideas-actions'); closeRow.append(close);
  panel.append(ask, kinds, text, row, note, sentHead, sentList, doneHead, doneList, closeRow);
  document.body.appendChild(panel);

  const draw = () => {
    sentList.textContent = ''; sentHead.hidden = !mine.length;
    mine.forEach((w, i) => {
      const li = el('li');
      li.append(el('p', 'ideas-words', (w.kind === 'change' ? 'Change: ' : '') + '"' + w.words + '"'),
        el('p', 'ideas-when', (w.sent ? 'Sent on ' : 'Waiting to send, saved on ') + day(w.when)));
      if (!w.sent) {                                 // not sent yet (no internet): he can take it back
        const rm = el('button', 'ideas-remove', 'Remove'); rm.type = 'button';
        rm.addEventListener('click', () => { mine.splice(i, 1); store(KEY, mine); draw(); note.textContent = 'Removed.'; });
        li.append(rm);
      }
      sentList.appendChild(li);
    });
  };
  draw();

  // send anything not yet sent; ideas wait safely on the iPad when there's no internet, and go next time
  let busy = false;
  async function flush() {
    if (busy) return false; busy = true; let all = true;
    for (const w of mine) {
      if (w.sent) continue;
      try { if (await sendIdea({ id: w.id, words: w.words, kind: w.kind, when: w.when })) { w.sent = true; store(KEY, mine); } else all = false; }
      catch { all = false; }
    }
    busy = false; draw(); return all;
  }
  send.addEventListener('click', async () => {
    const words = text.value.trim();
    if (!words) { note.textContent = 'Type your idea first.'; text.focus(); return; }
    mine.push({ id: newId(), words, kind, when: new Date().toISOString(), sent: false }); store(KEY, mine);
    text.value = ''; store(DRAFT, ''); draw();
    send.disabled = true; note.textContent = 'Sending...';
    const ok = await flush();
    send.disabled = false;
    note.textContent = ok ? 'Sent! Dad and Claude will read it.' : "Saved. It will send by itself when the internet is back.";
  });
  if (mine.some(w => !w.sent)) setTimeout(flush, 3000);
  addEventListener('online', () => flush());

  const show = v => { panel.hidden = !v; btn.setAttribute('aria-expanded', String(v)); if (v) text.focus({ preventScroll: true }); else btn.focus(); };
  btn.addEventListener('click', () => show(panel.hidden));
  close.addEventListener('click', () => show(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) show(false); });
}

buildIdeas();
// test hook (like window.__cab): tests/scenarios/ideas.js shows the page with a sample came-true list
window.__ideasTest = list => { document.getElementById('ideasBtn')?.remove(); document.getElementById('ideas')?.remove(); buildIdeas(list); };
export { buildIdeas };
