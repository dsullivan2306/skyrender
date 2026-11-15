// ---------- sound: everything is synthesized with Web Audio, nothing to download ----------
let actx = null, master = null, noiseBuf = null, rumbleGain = null, rumbleFilter = null, soundOn = true;
function audio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    actx = new AC(); master = actx.createGain(); master.gain.value = 0.55; master.connect(actx.destination);
    const len = actx.sampleRate * 2; noiseBuf = actx.createBuffer(1, len, actx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = actx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    rumbleFilter = actx.createBiquadFilter(); rumbleFilter.type = 'lowpass'; rumbleFilter.frequency.value = 180;
    rumbleGain = actx.createGain(); rumbleGain.gain.value = 0;
    src.connect(rumbleFilter); rumbleFilter.connect(rumbleGain); rumbleGain.connect(master); src.start();
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
addEventListener('pointerdown', () => audio(), { once: false, passive: true });
function tone(f, t0, dur, type, vol, f2) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.setValueAtTime(vol, t0 + dur * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(t0, dur, freq, vol, type) {
  const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  s.buffer = noiseBuf; f.type = type || 'bandpass'; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
}
const play = fn => { if (!soundOn || !audio()) return; fn(actx.currentTime); };
const sfx = {
  honk: () => play(t => { for (const o of [0, 0.3]) { tone(370, t + o, 0.22, 'square', 0.11); tone(466, t + o, 0.22, 'square', 0.09); } }),
  whistle: () => play(t => { for (const f of [587, 740, 880]) tone(f, t, 1.3, 'sine', 0.07, f * 1.015); noise(t, 1.3, 2400, 0.04); }),
  chuff: v => play(t => noise(t, 0.2, 500, 0.1 * v, 'lowpass')),
  click: () => play(t => { noise(t, 0.05, 3200, 0.07, 'highpass'); tone(200, t, 0.07, 'square', 0.04, 110); }),
  whirr: dur => play(t => tone(110, t, dur, 'sawtooth', 0.025, 360)),
  beep: hi => play(t => tone(hi ? 1046 : 784, t, hi ? 0.4 : 0.15, 'sine', 0.14)),
  size: up => play(t => { tone(up ? 90 : 520, t, 0.9, 'sawtooth', 0.05, up ? 420 : 110); tone(up ? 180 : 1040, t, 0.9, 'sine', 0.06, up ? 840 : 220); }),
  airhorn: () => play(t => { for (const o of [0, 0.55]) for (const f of [185, 233, 277]) tone(f, t + o, o ? 0.9 : 0.45, 'sawtooth', 0.045); }),
  crash: () => play(t => { noise(t, 1.2, 300, 0.5, 'lowpass'); noise(t, 0.5, 2500, 0.25); for (let i = 0; i < 7; i++) tone(300 + Math.random() * 900, t + 0.05 + i * 0.09, 0.25, 'square', 0.04, 120 + Math.random() * 200); }),
  siren: () => play(t => { for (let i = 0; i < 6; i++) tone(i % 2 ? 620 : 880, t + i * 0.45, 0.45, 'square', 0.035, i % 2 ? 880 : 620); }),
  skid: () => play(t => { noise(t, 0.8, 1400, 0.18); tone(700, t, 0.8, 'sawtooth', 0.025, 500); tone(311, t + 0.1, 0.5, 'square', 0.04); }),
  jet: () => play(t => { tone(260, t, 2.2, 'sawtooth', 0.03, 900); noise(t, 2.2, 1800, 0.08); }),
  farm: () => play(t => {
    tone(150, t, 1.0, 'sawtooth', 0.06, 115); tone(152, t, 1.0, 'square', 0.025, 118);                               // moo
    for (let i = 0; i < 3; i++) { noise(t + 1.1 + i * 0.16, 0.1, 900, 0.18); tone(420, t + 1.1 + i * 0.16, 0.08, 'square', 0.04, 300); }   // oink oink
    for (let i = 0; i < 8; i++) tone(900 - i * 60 + (i % 2) * 120, t + 1.7 + i * 0.07, 0.08, 'sawtooth', 0.04);       // neigh
  }),
  garage: () => play(t => { noise(t, 1.1, 260, 0.12, 'lowpass'); for (let i = 0; i < 9; i++) tone(90 + (i % 2) * 20, t + i * 0.12, 0.1, 'square', 0.025); }),
  goodnight: () => play(t => { [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.28, 0.9, 'sine', 0.07)); }),
  ding: () => play(t => { tone(1175, t, 0.5, 'sine', 0.08); tone(880, t + 0.32, 0.7, 'sine', 0.08); }),
  surprise: () => play(t => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.07, 0.25, 'triangle', 0.06)); }),
  rumbleHit: () => play(t => { noise(t, 1.2, 180, 0.3, 'lowpass'); tone(60, t, 1.0, 'sine', 0.2, 40); }),
  stomp: () => play(t => { tone(75, t, 0.28, 'sine', 0.4, 38); noise(t, 0.18, 260, 0.25, 'lowpass'); tone(160, t, 0.06, 'square', 0.05, 90); })
};
const soundBtn = document.getElementById('sound');
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn; soundBtn.textContent = soundOn ? 'Sound on' : 'Sound off'; soundBtn.setAttribute('aria-pressed', String(soundOn));
  if (rumbleGain) rumbleGain.gain.value = 0;
});

export { actx, noise, play, rumbleFilter, rumbleGain, sfx, soundOn, tone };
