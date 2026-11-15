// "Jasper's ideas": a button in the game that opens Jasper's idea box, and the list of his ideas that became
// part of Skyrender, in his words, with the day each came true. It's there so he can see his ideas become real.
// The idea box is a private page on claude.ai (IDEA_BOX below) with its own small database: what he types there
// goes straight to Dad and Claude, who read it directly; nothing goes through this game.
// Ideas saved in the game's earlier version stay on the iPad (localStorage) and are shown until removed.
import { IDEAS } from './list.js';

const IDEA_BOX = 'https://claude.ai/artifact/FF7jNviYAGQburkFhaCpze';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const day = iso => { const [y, m, d] = iso.split('-').map(Number); return MONTHS[m - 1] + ' ' + d + ', ' + y; };
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

  // ---- write the next idea: opens the idea box ----
  const ask = el('p', 'ideas-title', 'What should Skyrender do next?');
  const write = el('a', 'ideas-write', 'Write a new idea'); write.id = 'ideaWrite';
  write.href = IDEA_BOX; write.target = '_blank'; write.rel = 'noopener';
  const hint = el('p', 'ideas-when', 'Your idea goes straight to Dad and Claude.');
  const note = el('p', 'ideas-note'); note.setAttribute('aria-live', 'polite');

  // ---- waiting to be built ----
  const waitHead = el('p', 'ideas-head', 'Saved on this iPad (type these into the idea box)');
  const waitList = el('ul', 'ideas-list ideas-waiting');

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
  panel.append(ask, write, hint, note, waitHead, waitList, doneHead, doneList, closeRow);
  document.body.appendChild(panel);

  const drawWaiting = () => {
    waitList.textContent = '';
    waitHead.hidden = !waiting.length;
    waiting.forEach((w, i) => {
      const li = el('li');
      const words = el('p', 'ideas-words', (w.kind === 'change' ? 'Change: ' : '') + '"' + w.words + '"');
      const rm = el('button', 'ideas-remove', 'Remove'); rm.type = 'button';
      rm.addEventListener('click', () => { waiting.splice(i, 1); store(waiting); drawWaiting(); note.textContent = 'Removed.'; });
      const meta = el('p', 'ideas-when', 'Saved on ' + day(w.when));
      li.append(words, meta, rm); waitList.appendChild(li);
    });
  };
  drawWaiting();

  const show = v => { panel.hidden = !v; btn.setAttribute('aria-expanded', String(v)); if (v) write.focus({ preventScroll: true }); else btn.focus(); };
  btn.addEventListener('click', () => show(panel.hidden));
  close.addEventListener('click', () => show(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) show(false); });
}

buildIdeas();
// test hook (like window.__cab): tests/scenarios/ideas.js shows the page with a sample came-true list
window.__ideasTest = list => { document.getElementById('ideasBtn')?.remove(); document.getElementById('ideas')?.remove(); buildIdeas(list); };
export { buildIdeas };
