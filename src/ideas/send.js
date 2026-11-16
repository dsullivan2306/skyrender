// Sending one of Jasper's ideas to Dad and Claude, with no account and no sign-in.
// The idea is locked (encrypted) here with the public lock in key.js, so only the key on Dad's Mac can read it,
// then posted to a free message relay (ntfy.sh). Every hour a GitHub job copies new locked ideas into the
// project's idea-inbox branch, so none are lost; tools/read-ideas.mjs unlocks them on Dad's Mac.
// How the lock works: a fresh random key (AES-GCM) locks the words; the public lock (RSA-OAEP) locks that key.
import { IDEA_LOCK, IDEA_TOPIC } from './key.js';

const b64 = buf => { let s = ''; for (const x of new Uint8Array(buf)) s += String.fromCharCode(x); return btoa(s); };
async function lock(text) {
  const subtle = crypto.subtle;
  const pub = await subtle.importKey('jwk', IDEA_LOCK, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const aes = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = await subtle.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(text));
  const k = await subtle.encrypt({ name: 'RSA-OAEP' }, pub, await subtle.exportKey('raw', aes));
  return JSON.stringify({ v: 1, k: b64(k), iv: b64(iv), c: b64(c) });
}
// Resolves true once the relay has it.
async function sendIdea(idea) {
  const body = await lock(JSON.stringify(idea));
  const res = await fetch('https://ntfy.sh/' + IDEA_TOPIC + '?title=' + encodeURIComponent('Jasper sent a Skyrender idea'), { method: 'POST', body });
  return res.ok;
}

export { lock, sendIdea };
