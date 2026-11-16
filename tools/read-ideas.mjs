// Unlocks Jasper's ideas on Dad's Mac. Reads locked ideas from the relay (the last 12 hours) and from the
// idea-inbox branch (everything the hourly GitHub job collected), unlocks them with ~/.skyrender/idea-key.json,
// drops repeats, and lists them oldest first, marking the ones already in src/ideas/list.js as came true.
// usage: node tools/read-ideas.mjs          (add --json for machine-readable output)
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { IDEAS } from '../src/ideas/list.js';
const { subtle } = crypto.webcrypto;
const keyFile = process.env.SKYRENDER_KEY || os.homedir() + '/.skyrender/idea-key.json';
if (!fs.existsSync(keyFile)) { console.error('No key at ' + keyFile + '. Only Dad\'s Mac can unlock the ideas.'); process.exit(1); }
const { topic, privateKey } = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
const priv = await subtle.importKey('jwk', privateKey, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
const unb64 = s => Uint8Array.from(Buffer.from(s, 'base64'));
async function unlock(b) {
  const raw = await subtle.decrypt({ name: 'RSA-OAEP' }, priv, unb64(b.k));
  const aes = await subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
  return JSON.parse(new TextDecoder().decode(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(b.iv) }, aes, unb64(b.c))));
}
const locked = [];
// 1. the relay: anything from the last 12 hours
try {
  const res = await fetch('https://ntfy.sh/' + topic + '/json?poll=1&since=all');
  for (const line of (await res.text()).split('\n')) { try { const m = JSON.parse(line); if (m.event === 'message') locked.push(JSON.parse(m.message)); } catch {} }
} catch { console.error('(relay not reachable; using the inbox only)'); }
// 2. the inbox branch: everything collected so far
try {
  execFileSync('git', ['fetch', '-q', 'origin', 'idea-inbox'], { stdio: 'ignore' });
  const files = execFileSync('git', ['ls-tree', '--name-only', 'FETCH_HEAD', 'inbox/'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  for (const f of files) { try { locked.push(JSON.parse(execFileSync('git', ['show', 'FETCH_HEAD:' + f], { encoding: 'utf8' })).locked); } catch {} }
} catch { console.error('(no idea-inbox branch yet)'); }
const ideas = new Map(); let unreadable = 0;
for (const b of locked) { try { const i = await unlock(b); if (i && i.id && i.words && !i.words.startsWith('TEST from Claude')) ideas.set(i.id, i); } catch { unreadable++; } }   // Claude's own end-to-end checks are skipped
const same = (a, b) => a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ');
const list = [...ideas.values()].sort((a, b) => String(a.when).localeCompare(String(b.when)))
  .map(i => ({ ...i, cameTrue: IDEAS.some(c => same(c.words, i.words)) }));
if (process.argv.includes('--json')) console.log(JSON.stringify(list, null, 2));
else {
  if (!list.length) console.log('No ideas from Jasper yet.');
  for (const i of list) console.log((i.cameTrue ? '[came true] ' : '[new]       ') + String(i.when).slice(0, 10) + '  ' + (i.kind === 'change' ? 'Change: ' : '') + i.words);
}
if (unreadable) console.error(unreadable + ' message(s) could not be unlocked (not from the game; ignored).');
