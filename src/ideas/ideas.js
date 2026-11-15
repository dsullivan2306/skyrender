// "Jasper's ideas": a page listing every idea of his that became part of Skyrender, in his words,
// with the day it came true. It's there so he can see that his ideas become real things.
import { IDEAS } from './list.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const day = iso => { const [y, m, d] = iso.split('-').map(Number); return MONTHS[m - 1] + ' ' + d + ', ' + y; };

function buildIdeas(list = IDEAS) {
  const name = document.querySelector('.bar .name');
  if (!name || !list.length) return;                 // nothing to show yet
  const btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'ideasBtn'; btn.className = 'ideas-btn';
  btn.textContent = "Jasper's ideas"; btn.setAttribute('aria-haspopup', 'dialog');
  name.after(btn);
  const panel = document.createElement('div');
  panel.id = 'ideas'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', "Jasper's ideas");
  const title = document.createElement('p'); title.className = 'ideas-title';
  title.textContent = list.length === 1 ? 'Your idea came true!' : 'Your ' + list.length + ' ideas came true!';
  const ol = document.createElement('ol'); ol.className = 'ideas-list';
  for (const it of list) {
    const li = document.createElement('li');
    const words = document.createElement('p'); words.className = 'ideas-words'; words.textContent = '"' + it.words + '"';
    const what = document.createElement('p'); what.className = 'ideas-what'; what.textContent = it.what;
    const when = document.createElement('p'); when.className = 'ideas-when'; when.textContent = 'Came true on ' + day(it.when);
    li.append(words, what, when); ol.appendChild(li);
  }
  const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close';
  const row = document.createElement('div'); row.className = 'ideas-actions'; row.appendChild(close);
  panel.append(title, ol, row);
  document.body.appendChild(panel);
  const show = v => { panel.hidden = !v; btn.setAttribute('aria-expanded', String(v)); if (v) close.focus(); else btn.focus(); };
  btn.addEventListener('click', () => show(panel.hidden));
  close.addEventListener('click', () => show(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) show(false); });
}

buildIdeas();
// test hook (like window.__cab): tests/scenarios/ideas.js shows the page with a sample list
window.__ideasTest = list => { document.getElementById('ideasBtn')?.remove(); document.getElementById('ideas')?.remove(); buildIdeas(list); };
export { buildIdeas };
