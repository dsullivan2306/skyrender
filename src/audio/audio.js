// ---------- sound: everything is synthesized with Web Audio, nothing to download ----------
// Sound has its own random numbers (arnd), separate from Math.random, so changing a sound never changes
// what you see (and the exact-screenshot tests stay exact).
let aseed = 0x5eed;
const arnd = () => { aseed = (aseed + 0x6D2B79F5) | 0; let x = Math.imul(aseed ^ (aseed >>> 15), 1 | aseed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

let actx = null, master = null, soft = null, noiseBuf = null, rumbleGain = null, rumbleFilter = null, soundOn = true;
let engOsc = null, engGain = null, whineOsc = null, whineGain = null, windGain = null, windFilter = null;
function audio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    actx = new AC(); master = actx.createGain(); master.gain.value = 0.55;
    // gentle on small ears: a compressor keeps the crash, siren and engines from piling up loud
    const comp = actx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.25;
    master.connect(comp); comp.connect(actx.destination);
    soft = actx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 2000; soft.connect(master);   // takes the buzz off horns and sirens
    const len = actx.sampleRate * 2; noiseBuf = actx.createBuffer(1, len, actx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = arnd() * 2 - 1;
    const loop = () => { const s = actx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(0, arnd() * 2); return s; };
    // the rushing-air bed: rocket roar and jet whoosh
    rumbleFilter = actx.createBiquadFilter(); rumbleFilter.type = 'lowpass'; rumbleFilter.frequency.value = 180;
    rumbleGain = actx.createGain(); rumbleGain.gain.value = 0;
    loop().connect(rumbleFilter); rumbleFilter.connect(rumbleGain); rumbleGain.connect(master);
    // the engine bus: a buzz at the cylinders' firing rate, darkened, so diesels thump and the tractor putts
    engOsc = actx.createOscillator(); engOsc.type = 'sawtooth'; engOsc.frequency.value = 30;
    const engLow = actx.createBiquadFilter(); engLow.type = 'lowpass'; engLow.frequency.value = 300;
    engGain = actx.createGain(); engGain.gain.value = 0;
    engOsc.connect(engLow); engLow.connect(engGain); engGain.connect(master); engOsc.start();
    // jet fan whine: a thin high hum that rises as the engines spool up
    whineOsc = actx.createOscillator(); whineOsc.type = 'sine'; whineOsc.frequency.value = 1800;
    whineGain = actx.createGain(); whineGain.gain.value = 0;
    whineOsc.connect(whineGain); whineGain.connect(master); whineOsc.start();
    // wind, for high above the clouds
    windFilter = actx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 500; windFilter.Q.value = 0.7;
    windGain = actx.createGain(); windGain.gain.value = 0;
    loop().connect(windFilter); windFilter.connect(windGain); windGain.connect(master);
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
addEventListener('pointerdown', () => audio(), { once: false, passive: true });

// No two sounds exactly alike: each play() picks one small pitch and level change shared by all its notes,
// so chords stay in tune but a honk or chuff never repeats exactly.
let vp = 1, vg = 1;
function tone(f, t0, dur, type, vol, f2, dest, pan) {
  const o = actx.createOscillator(), g = actx.createGain(); vol *= vg;
  o.type = type; o.frequency.setValueAtTime(f * vp, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2 * vp, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.setValueAtTime(vol, t0 + dur * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(pan || dest || master); o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(t0, dur, freq, vol, type, pan) {
  const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(); vol *= vg;
  s.buffer = noiseBuf; f.type = type || 'bandpass'; f.frequency.value = freq * vp;
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(pan || master); s.start(t0, arnd()); s.stop(t0 + dur + 0.05);
}
// A voice, the way animals (and people) make one: a buzz from the throat, shaped by the mouth into vowels.
// The buzz is a sawtooth whose pitch follows f0; three resonances (formants) follow form, which sets the vowel.
// f0: [[fraction of dur, Hz], ...]; form: [[fraction of dur, [F1, F2, F3]], ...]; vib in semitones; rough is a growl rate.
function voice(t, { dur, f0, form, vol, vib = 0, vibHz = 5, rough = 0, breath = 0 }) {
  const ramp = (param, pts, pick) => pts.forEach(([u, v], i) => i ? param.linearRampToValueAtTime(pick(v), t + u * dur) : param.setValueAtTime(pick(v), t));
  const o = actx.createOscillator(); o.type = 'sawtooth'; ramp(o.frequency, f0, hz => hz * vp);
  const stop = t + dur + 0.05;
  if (vib) { const l = actx.createOscillator(), lg = actx.createGain(); l.frequency.value = vibHz; lg.gain.value = vib * 100; l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(stop); }
  const sum = actx.createGain();
  [[6, 1], [9, 0.55], [12, 0.25]].forEach(([q, level], k) => {
    const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q; ramp(f.frequency, form, F => F[k]);
    const g = actx.createGain(); g.gain.value = level; o.connect(f); f.connect(g); g.connect(sum);
  });
  let out = sum;
  if (rough) {                                     // a growl: the loudness flutters quickly, like a pig's grunt
    const r = actx.createGain(), am = actx.createOscillator(), ag = actx.createGain();
    r.gain.value = 0.55; am.frequency.value = rough; ag.gain.value = 0.45; am.connect(ag); ag.connect(r.gain); am.start(t); am.stop(stop);
    sum.connect(r); out = r;
  }
  const env = actx.createGain(), v = vol * vg;
  env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(v, t + Math.min(0.09, dur * 0.25));
  env.gain.setValueAtTime(v, t + dur * 0.7); env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  out.connect(env); env.connect(master); o.start(t); o.stop(stop);
  if (breath) noise(t, dur, form[0][1][1], breath, 'bandpass');
}
const play = fn => {
  if (!soundOn || !audio()) return;
  vp = 1 + (arnd() - 0.5) * 0.06; vg = 0.9 + arnd() * 0.2;
  fn(actx.currentTime); vp = 1; vg = 1;
};
// a short whistle blast: long ones are 0.9 s, short ones 0.3 s
const blast = (t, long) => { const d = long ? 0.9 : 0.3; for (const f of [587, 740, 880]) tone(f, t, d, 'sine', 0.07, f * 1.015); noise(t, d, 2400, 0.04); return d + 0.18; };
let beat = 0;
const sfx = {
  honk: () => play(t => { for (const o of [0, 0.3]) { tone(370, t + o, 0.22, 'square', 0.11, 0, soft); tone(466, t + o, 0.22, 'square', 0.09, 0, soft); } }),
  // Trains talk in whistles: two short means "here we go"; long, long, short, long means "coming to a crossing".
  whistle: (pattern = 'LLSL') => play(t => { let o = 0; for (const c of pattern) o += blast(t + o, c === 'L'); }),
  // a steam engine puffs four times per wheel turn; the first of the four is the strongest
  chuff: v => play(t => { const acc = beat++ % 4 === 0; noise(t, acc ? 0.24 : 0.18, 400 + arnd() * 250, 0.1 * v * (acc ? 1.25 : 0.8), 'lowpass'); }),
  // the crossing bell: a bright ding with a ring above it, over and over while the lights flash
  xingBell: () => play(t => { tone(1320, t, 0.32, 'triangle', 0.03); tone(2640, t, 0.18, 'sine', 0.01); }),
  clack: () => play(t => { noise(t, 0.03, 3000, 0.05, 'highpass'); noise(t + 0.11, 0.03, 2800, 0.045, 'highpass'); }),   // wheels over a rail joint
  // the radio beep astronauts hear before someone speaks (the real one is 2,525 hertz)
  quindar: () => play(t => tone(2525, t, 0.25, 'sine', 0.03)),
  click: () => play(t => { noise(t, 0.05, 3200, 0.07, 'highpass'); tone(200, t, 0.07, 'square', 0.04, 110); }),
  lock: () => play(t => { tone(140, t, 0.09, 'triangle', 0.09, 90); noise(t, 0.04, 1800, 0.05, 'highpass'); }),       // parts meeting and locking
  whirr: dur => play(t => tone(110, t, dur, 'sawtooth', 0.025, 360)),
  // the rainbirds open: a rush of water across the pad
  // the Mars rover: its laser makes a row of tiny snaps on a rock (a real rover's microphone recorded them),
  // its drill buzzes, and its wheel motors hum as it sets off
  zap: () => play(t => { for (let i = 0; i < 8; i++) noise(t + i * 0.16, 0.012, 3400, 0.05, 'highpass'); }),
  drill: () => play(t => { tone(180, t, 2.6, 'square', 0.012, 200); noise(t, 2.6, 1400, 0.02, 'bandpass'); }),
  roverGo: () => play(t => tone(420, t, 0.6, 'sine', 0.02, 640)),
  deluge: () => play(t => { noise(t, 6, 900, 0.05, 'bandpass'); noise(t, 6, 2600, 0.02, 'highpass'); }),
  beep: hi => play(t => tone(hi ? 1046 : 784, t, hi ? 0.4 : 0.12, 'sine', 0.07)),
  size: up => play(t => { tone(up ? 90 : 520, t, 0.9, 'sawtooth', 0.05, up ? 420 : 110); tone(up ? 180 : 1040, t, 0.9, 'sine', 0.06, up ? 840 : 220); }),
  airhorn: () => play(t => { for (const o of [0, 0.55]) for (const f of [185, 233, 277]) tone(f, t + o, o ? 0.9 : 0.45, 'sawtooth', 0.045); }),
  // big trucks stop with air, which is why they hiss; a train lets off steam instead
  airBrake: steam => play(t => noise(t, steam ? 0.9 : 0.6, steam ? 1500 : 3000, steam ? 0.045 : 0.06, 'highpass')),
  crash: () => play(t => { noise(t, 1.2, 300, 0.5, 'lowpass'); noise(t, 0.5, 2500, 0.25); for (let i = 0; i < 7; i++) tone(300 + arnd() * 900, t + 0.05 + i * 0.09, 0.25, 'square', 0.04, 120 + arnd() * 200); }),
  // the siren starts far away and grows as the police arrive (far things sound quieter)
  siren: () => play(t => { for (let i = 0; i < 6; i++) tone(i % 2 ? 620 : 880, t + i * 0.45, 0.45, 'square', 0.035 * Math.min(1, 0.25 + i * 0.25), i % 2 ? 880 : 620, soft); }),
  skid: () => play(t => { noise(t, 0.8, 1400, 0.18); tone(700, t, 0.8, 'sawtooth', 0.025, 500); tone(311, t + 0.1, 0.5, 'square', 0.04); }),
  jet: () => play(t => { tone(260, t, 2.2, 'sawtooth', 0.03, 900); noise(t, 2.2, 1800, 0.08); }),
  // a passing car: its pitch drops as it goes by (the Doppler effect), moving from one ear to the other
  passBy: side => play(t => {
    let pan = null;
    if (actx.createStereoPanner) { pan = actx.createStereoPanner(); pan.pan.setValueAtTime(side * 0.8, t); pan.pan.linearRampToValueAtTime(-side * 0.8, t + 0.7); pan.connect(master); }
    tone(330, t, 0.7, 'triangle', 0.04, 290, null, pan); noise(t, 0.7, 700, 0.03, 'bandpass', pan);
  }),
  gear: () => play(t => { tone(120, t, 0.5, 'sawtooth', 0.03, 200); tone(70, t + 0.5, 0.15, 'sine', 0.12, 45); noise(t + 0.5, 0.08, 900, 0.06); }),   // whirr, then clunk
  chirp: () => play(t => { noise(t, 0.12, 2200, 0.07); noise(t + 0.15, 0.1, 2000, 0.05); }),          // tires touching the runway
  latch: () => play(t => { tone(180, t, 0.07, 'square', 0.035, 120); noise(t, 0.05, 1200, 0.05); }),  // doors and hatches
  hydraulic: () => play(t => { tone(95, t, 0.8, 'sawtooth', 0.025, 140); noise(t, 0.8, 600, 0.02, 'lowpass'); }),
  switchOn: on => play(t => tone(on ? 1500 : 1100, t, 0.04, 'square', 0.025)),
  spray: () => play(t => noise(t, 1.0, 5000, 0.03, 'highpass')),
  // Farm animals, each with its own voice. A cow's low "mmm-ooo" opens from closed lips to a wide vowel;
  // a pig grunts through its nose in short, rough bursts; a horse's whinny leaps high and shakes, then it snorts.
  cow: () => play(t => voice(t, { dur: 1.5, vol: 0.4, vib: 0.15, vibHz: 4.5, breath: 0.012,
    f0: [[0, 100], [0.2, 128], [0.7, 120], [1, 88]],
    form: [[0, [250, 600, 2200]], [0.25, [600, 1000, 2400]], [0.75, [700, 1150, 2500]], [1, [330, 700, 2200]]] })),
  pig: () => play(t => { for (let i = 0; i < 3; i++) voice(t + i * 0.24, { dur: 0.17, vol: 0.38, rough: 48, breath: 0.035,
    f0: [[0, 200], [0.3, 175], [1, 115]], form: [[0, [520, 1500, 2600]], [1, [420, 1200, 2400]]] }); }),
  horse: () => play(t => {
    voice(t, { dur: 1.3, vol: 0.28, vib: 1.3, vibHz: 11, f0: [[0, 420], [0.12, 900], [0.35, 820], [0.7, 600], [1, 360]],
      form: [[0, [800, 1600, 2800]], [1, [600, 1300, 2500]]] });
    noise(t + 1.38, 0.22, 650, 0.12, 'lowpass'); noise(t + 1.64, 0.18, 520, 0.09, 'lowpass');   // snort
  }),
  garage: () => play(t => { noise(t, 1.1, 260, 0.12, 'lowpass'); for (let i = 0; i < 9; i++) tone(90 + (i % 2) * 20, t + i * 0.12, 0.1, 'square', 0.025); }),
  goodnight: () => play(t => { [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.28, 0.9, 'sine', 0.07)); }),
  ding: () => play(t => { tone(1175, t, 0.5, 'sine', 0.08); tone(880, t + 0.32, 0.7, 'sine', 0.08); }),
  surprise: () => play(t => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.07, 0.25, 'triangle', 0.06)); }),
  rumbleHit: () => play(t => { noise(t, 1.2, 180, 0.3, 'lowpass'); tone(60, t, 1.0, 'sine', 0.2, 40); }),
  stomp: () => play(t => { tone(75, t, 0.28, 'sine', 0.4, 38); noise(t, 0.18, 260, 0.25, 'lowpass'); tone(160, t, 0.06, 'square', 0.05, 90); }),
  // ambience: a bird's chirp, a cricket's trill
  bird: () => play(t => { const f = 3000 + arnd() * 2000; for (let i = 0; i < 2 + Math.floor(arnd() * 3); i++) tone(f * (1 + i * 0.08), t + i * 0.09, 0.06, 'sine', 0.012, f * 1.2); }),
  cricket: () => play(t => { for (let i = 0; i < 6; i++) tone(4500, t + i * 0.05, 0.03, 'sine', 0.01); }),
};
// test hook: tests can't listen, so every sound asked for is written down in window.__sfx (newest last)
window.__sfx = [];
for (const k of Object.keys(sfx)) { const f = sfx[k]; sfx[k] = (...a) => { window.__sfx.push(k); if (window.__sfx.length > 400) window.__sfx.shift(); return f(...a); }; }

// The continuous sounds, set every frame by the main loop: engines, jet whine, wind, birds and crickets.
// mix: { roar, rumbleHz, engHz, eng, whineHz, whine, wind, birds, crickets } (levels 0 to about 1)
let nextBird = 3, nextCricket = 2;
const sent = {};                                  // the last level sent for each continuous sound
function setMix(m, dt) {
  window.__mix = m;
  if (!actx || !soundOn) return;
  const t = actx.currentTime;
  // only tell the audio system about real changes: sending every level every frame piles up work (and Safari queues it)
  const set = (k, param, v, tc) => { const old = sent[k]; if (old !== undefined && Math.abs(v - old) <= Math.max(1e-4, Math.abs(old) * 0.02)) return; sent[k] = v; param.setTargetAtTime(v, t, tc); };
  set('roar', rumbleGain.gain, m.roar, 0.15); set('rumbleHz', rumbleFilter.frequency, m.rumbleHz, 0.2);
  set('engHz', engOsc.frequency, m.engHz, 0.3); set('eng', engGain.gain, m.eng * 0.06, 0.3);
  set('whineHz', whineOsc.frequency, m.whineHz, 0.4); set('whine', whineGain.gain, m.whine * 0.012, 0.4);
  set('wind', windGain.gain, m.wind * 0.05, 0.8); set('windHz', windFilter.frequency, 400 + 300 * Math.sin(t * 0.3), 1);
  nextBird -= dt; nextCricket -= dt;
  if (m.birds > 0 && nextBird <= 0) { nextBird = 4 + arnd() * 8; if (arnd() < m.birds) sfx.bird(); }
  if (m.crickets > 0 && nextCricket <= 0) { nextCricket = 0.8 + arnd() * 2.5; if (arnd() < m.crickets) sfx.cricket(); }
}
function silence() { if (!actx) return; for (const g of [rumbleGain, engGain, whineGain, windGain]) { g.gain.cancelScheduledValues(0); g.gain.value = 0; } for (const k in sent) delete sent[k]; }

const soundBtn = document.getElementById('sound');
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn; soundBtn.textContent = soundOn ? 'Sound on' : 'Sound off'; soundBtn.setAttribute('aria-pressed', String(soundOn));
  silence();
});

export { actx, noise, play, rumbleFilter, rumbleGain, setMix, sfx, soundOn, tone };
