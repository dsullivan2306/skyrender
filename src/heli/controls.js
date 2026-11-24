// The helicopter's controls on the screen (Jasper's idea: "I will control the flight and blade"). They're the same
// ones a real pilot has: a throttle for how fast the blades spin, a lift lever (pilots call it the collective), a stick
// (the cyclic) and two foot pedals. Page only, no 3D. Built the first time Jasper picks the helicopter.
function buildControls(C) {
  const root = document.createElement('div'); root.id = 'heli'; root.hidden = true; root.setAttribute('role', 'group'); root.setAttribute('aria-label', 'Helicopter controls');
  const left = document.createElement('div'), right = document.createElement('div'); left.className = 'heli-side'; right.className = 'heli-side heli-right'; root.append(left, right);

  // a lever that slides up and down and stays where you leave it
  const lever = (key, label, hint, notch) => {
    const w = document.createElement('div'); w.className = 'lever';
    const val = document.createElement('span'), track = document.createElement('div'), knob = document.createElement('div'), name = document.createElement('span');
    val.className = 'lever-val'; track.className = 'lever-track'; knob.className = 'lever-knob'; name.className = 'lever-name'; name.textContent = label;
    track.tabIndex = 0; track.setAttribute('role', 'slider'); track.setAttribute('aria-label', label + ': ' + hint); track.setAttribute('aria-orientation', 'vertical'); track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', '100');
    track.dataset.lever = key;
    if (notch !== undefined) { const n = document.createElement('div'); n.className = 'lever-notch'; n.style.bottom = `calc(${notch * 100}% - 1px)`; track.append(n); }
    track.append(knob); w.append(val, track, name);
    let held = false;
    const at = e => { const r = track.getBoundingClientRect(), pad = 20; let v = 1 - (e.clientY - r.top - pad) / (r.height - pad * 2); v = Math.max(0, Math.min(1, v)); if (notch !== undefined && Math.abs(v - notch) < 0.06) v = notch; C[key] = v; C.touched = true; };
    track.addEventListener('pointerdown', e => { held = true; track.setPointerCapture(e.pointerId); at(e); e.preventDefault(); });
    track.addEventListener('pointermove', e => { if (held) at(e); });
    for (const ev of ['pointerup', 'pointercancel']) track.addEventListener(ev, () => { held = false; });
    track.addEventListener('keydown', e => { const d = { ArrowUp: 0.05, ArrowDown: -0.05, PageUp: 0.2, PageDown: -0.2, Home: -1, End: 1 }[e.key]; if (d) { C[key] = Math.max(0, Math.min(1, Math.round((C[key] + d) * 100) / 100)); C.touched = true; e.preventDefault(); e.stopPropagation(); } });
    return { w, draw(text) { const v = C[key], s = Math.round(v * 100); knob.style.bottom = `calc(${v} * (100% - 40px))`; if (val.textContent !== text) val.textContent = text; if (track.getAttribute('aria-valuenow') !== String(s)) { track.setAttribute('aria-valuenow', String(s)); } track.setAttribute('aria-valuetext', text); } };
  };
  const blades = lever('throttle', 'Blades', 'how fast the blades spin'), lift = lever('lever', 'Lift', 'up and down', 0.5);
  left.append(blades.w, lift.w);

  // the stick springs back to the middle when you let go
  const stick = document.createElement('div'), knob = document.createElement('div'); stick.className = 'stick'; knob.className = 'stick-knob';
  stick.setAttribute('role', 'application'); stick.setAttribute('aria-label', 'Stick: push it the way you want to go'); stick.tabIndex = 0; stick.dataset.stick = '1';
  for (const c of ['n', 'e', 's', 'w']) { const t = document.createElement('span'); t.className = 'stick-tick ' + c; stick.append(t); }
  stick.append(knob);
  let sid = null;
  const move = e => { const r = stick.getBoundingClientRect(), R = r.width / 2 - 22; let x = (e.clientX - r.left - r.width / 2) / R, y = -(e.clientY - r.top - r.height / 2) / R; const d = Math.hypot(x, y); if (d > 1) { x /= d; y /= d; } C.sx = x; C.sy = y; C.touched = true; };
  stick.addEventListener('pointerdown', e => { sid = e.pointerId; stick.setPointerCapture(sid); move(e); e.preventDefault(); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === sid) move(e); });
  for (const ev of ['pointerup', 'pointercancel']) stick.addEventListener(ev, e => { if (e.pointerId === sid) { sid = null; C.sx = C.sy = 0; } });
  const pedals = document.createElement('div'); pedals.className = 'pedals';
  for (const [d, label] of [[-1, 'Turn left'], [1, 'Turn right']]) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.className = 'pedal';
    b.addEventListener('pointerdown', e => { C.pedal = d; b.setPointerCapture(e.pointerId); b.classList.add('down'); });
    for (const ev of ['pointerup', 'pointercancel']) b.addEventListener(ev, () => { if (C.pedal === d) C.pedal = 0; b.classList.remove('down'); });
    b.addEventListener('contextmenu', e => e.preventDefault());
    pedals.append(b);
  }
  right.append(stick, pedals);

  // on a keyboard: arrows are the stick, W and S the lift lever, Q and E the blades, A and D the pedals
  const keys = new Set(), typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
  addEventListener('keydown', e => { if (root.hidden || typing(e) || e.metaKey || e.ctrlKey || e.altKey) return; const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault(); keys.add(k); });
  addEventListener('keyup', e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
  addEventListener('blur', () => keys.clear());
  let keyed = false;
  const readKeys = dt => {
    const on = (a, b) => (keys.has(a) ? 1 : 0) - (keys.has(b) ? 1 : 0);
    const x = on('ArrowRight', 'ArrowLeft'), y = on('ArrowUp', 'ArrowDown'), p = on('d', 'a');
    if (x || y || p) { keyed = true; C.sx = x; C.sy = y; C.pedal = p; C.touched = true; } else if (keyed) { keyed = false; C.sx = C.sy = C.pedal = 0; }
    const l = on('w', 's'), b = on('e', 'q');
    if (l) { C.lever = Math.max(0, Math.min(1, C.lever + l * dt * 0.6)); C.touched = true; }
    if (b) { C.throttle = Math.max(0, Math.min(1, C.throttle + b * dt * 0.8)); C.touched = true; }
  };
  document.body.append(root);
  const bar = document.querySelector('.bar');
  const draw = (show, info) => {
    if (root.hidden === show) { root.hidden = !show; document.body.classList.toggle('in-heli', show); if (!show) { keys.clear(); C.sx = C.sy = C.pedal = 0; sid = null; } }
    if (!show) return;
    const h = bar.offsetHeight + 'px'; if (root.style.bottom !== h) { root.style.bottom = h; document.documentElement.style.setProperty('--bar', h); }
    blades.draw(info.blades); lift.draw(info.lift);
    knob.style.transform = `translate(calc(-50% + ${(C.sx * (stick.clientWidth / 2 - 22)).toFixed(1)}px), calc(-50% + ${(-C.sy * (stick.clientWidth / 2 - 22)).toFixed(1)}px))`;
  };
  return { root, draw, readKeys };
}
export { buildControls };
