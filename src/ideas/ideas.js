// "Jasper's ideas": where Jasper types his next idea (or a change), saves it, and sends it to Dad, and where
// every idea of his that became part of Skyrender is listed in his words, with the day it came true.
// It's there so he can see that his ideas become real things.
// Saved ideas stay on this iPad (localStorage) until he taps "Send to Dad"; nothing is sent anywhere else.
import { IDEAS } from './list.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const day = iso => { const [y, m, d] = iso.split('-').map(Number); return MONTHS[m - 1] + ' ' + d + ', ' + y; };
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const same = (a, b) => a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ');
const KEY = 'skyrender-ideas-waiting';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const store = list => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* private mode: they just won't be remembered */ } };
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

function buildIdeas(cameTrue = IDEAS) {
  const name = document.querySelector('.bar .name');
  if (!name) return;
  // an idea that came true leaves the waiting list by itself (matched on his exact words)
  let waiting = load().filter(w => !cameTrue.some(c => same(c.words, w.words)));
  store(waiting);

  const btn = el('button', 'ideas-btn', "Jasper's ideas");
  btn.type = 'button'; btn.id = 'ideasBtn'; btn.setAttribute('aria-haspopup', 'dialog');
  name.after(btn);
  const panel = el('div'); panel.id = 'ideas'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', "Jasper's ideas");

  // ---- type the next idea ----
  const ask = el('label', 'ideas-title', 'What should Skyrender do next?'); ask.htmlFor = 'ideaText';
  const kinds = el('div', 'seg ideas-kind'); kinds.setAttribute('role', 'group'); kinds.setAttribute('aria-label', 'Kind of idea');
  let kind = 'new';
  for (const [k, label] of [['new', 'New idea'], ['change', 'Change something']]) {
    const b = el('button', null, label); b.type = 'button'; b.dataset.kind = k; b.setAttribute('aria-pressed', String(k === kind));
    b.addEventListener('click', () => { kind = k; kinds.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.kind === k))); text.placeholder = k === 'new' ? 'Type your idea here' : 'What should be different?'; });
    kinds.appendChild(b);
  }
  const text = el('textarea', 'ideas-text'); text.id = 'ideaText'; text.rows = 3; text.maxLength = 600; text.placeholder = 'Type your idea here';
  const save = el('button', null, 'Save my idea'); save.type = 'button'; save.id = 'ideaSave';
  const note = el('p', 'ideas-note'); note.setAttribute('aria-live', 'polite');

  // ---- waiting to be built ----
  const waitHead = el('p', 'ideas-head', 'Waiting for Dad');
  const waitList = el('ul', 'ideas-list ideas-waiting');
  const send = el('button', null, 'Send to Dad'); send.type = 'button'; send.id = 'ideaSend';
  const copyBox = el('textarea', 'ideas-text ideas-copy'); copyBox.readOnly = true; copyBox.hidden = true; copyBox.rows = 4; copyBox.setAttribute('aria-label', 'Your ideas, ready to copy');

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
  const row = el('div', 'ideas-actions'); row.append(save);
  const closeRow = el('div', 'ideas-actions'); closeRow.append(close);
  panel.append(ask, kinds, text, row, note, waitHead, waitList, send, copyBox, doneHead, doneList, closeRow);
  document.body.appendChild(panel);

  const drawWaiting = () => {
    waitList.textContent = '';
    waitHead.hidden = send.hidden = !waiting.length;
    waiting.forEach((w, i) => {
      const li = el('li');
      const words = el('p', 'ideas-words', (w.kind === 'change' ? 'Change: ' : '') + '"' + w.words + '"');
      const rm = el('button', 'ideas-remove', 'Remove'); rm.type = 'button';
      rm.addEventListener('click', () => { waiting.splice(i, 1); store(waiting); drawWaiting(); note.textContent = 'Removed.'; });
      const meta = el('p', 'ideas-when', 'Saved on ' + day(w.when) + (w.sent ? ' · sent to Dad' : ''));
      li.append(words, meta, rm); waitList.appendChild(li);
    });
  };
  drawWaiting();

  save.addEventListener('click', () => {
    const words = text.value.trim();
    if (!words) { note.textContent = 'Type your idea first.'; text.focus(); return; }
    waiting.push({ words, kind, when: today() }); store(waiting); drawWaiting();
    text.value = ''; note.textContent = 'Saved! Tap "Send to Dad" so he can build it.';
  });
  const message = () => "Jasper's " + (waiting.length > 1 ? 'ideas' : 'idea') + ' for Skyrender:\n' +
    waiting.map(w => '- ' + (w.kind === 'change' ? 'Change: ' : '') + w.words + ' (' + day(w.when) + ')').join('\n');
  send.addEventListener('click', async () => {
    const msg = message();
    const sent = () => { waiting.forEach(w => { w.sent = true; }); store(waiting); drawWaiting(); };
    if (navigator.share) {                                   // the iPad's share sheet: Messages, Mail, and so on
      try { await navigator.share({ title: "Jasper's ideas for Skyrender", text: msg }); sent(); note.textContent = 'Sent! Dad will read it.'; return; }
      catch (e) { if (e && e.name === 'AbortError') { note.textContent = 'Not sent yet.'; return; } }
    }
    try { await navigator.clipboard.writeText(msg); sent(); note.textContent = 'Copied! Paste it in a message to Dad.'; return; } catch { /* fall through */ }
    copyBox.hidden = false; copyBox.value = msg; copyBox.focus(); copyBox.select();
    note.textContent = 'Copy this and send it to Dad.';
  });

  const show = v => { panel.hidden = !v; btn.setAttribute('aria-expanded', String(v)); if (v) text.focus({ preventScroll: true }); else btn.focus(); };
  btn.addEventListener('click', () => show(panel.hidden));
  close.addEventListener('click', () => show(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) show(false); });
}

buildIdeas();
// test hook (like window.__cab): tests/scenarios/ideas.js shows the page with a sample came-true list
window.__ideasTest = list => { document.getElementById('ideasBtn')?.remove(); document.getElementById('ideas')?.remove(); buildIdeas(list); };
export { buildIdeas };
