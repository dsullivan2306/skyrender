import * as THREE from 'three';

// ---------- people: walkers, police officers and the occasional bad guy ----------
const makePerson = (o = {}) => {
  const S = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
  const shirt = S(o.shirt ?? 0x3f6e9a), pants = S(o.pants ?? 0x2d3440), skin = S(o.skin ?? 0xd9a47a), hair = S(o.hair ?? 0x2d2a26);
  const g = new THREE.Group(), legs = [], arms = [];
  for (const sx of [-1, 1]) {
    const lp = new THREE.Group(); lp.position.set(sx * 0.09, 0.5, 0); g.add(lp); legs.push(lp);
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.5, 0.15), pants); l.position.y = -0.25; l.castShadow = true; lp.add(l);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.22), S(0x1d1d1d)); shoe.position.set(0, -0.48, 0.04); lp.add(shoe);
    const ap = new THREE.Group(); ap.position.set(sx * 0.2, 0.92, 0); g.add(ap); arms.push(ap);
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.4, 0.11), shirt); a.position.y = -0.2; ap.add(a);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), skin); hand.position.y = -0.42; ap.add(hand);
  }
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.46, 0.2), shirt); body.position.y = 0.72; body.castShadow = true; g.add(body);
  if (o.stripes) for (const y of [0.56, 0.68, 0.8, 0.92]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.04, 0.21), S(0xf2f2ee)); st.position.y = y; g.add(st); }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), skin); head.position.y = 1.08; g.add(head);
  const hr = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 8, 0, Math.PI * 2, 0, 1.3), hair); hr.position.y = 1.1; g.add(hr);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), S(0x111111)); e.position.set(sx * 0.045, 1.1, 0.115); g.add(e); }
  if (o.hat) {                                                       // police cap with a gold badge
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 14), S(0x1b2a4a)); cap.position.y = 1.2; g.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.1), S(0x111111)); brim.position.set(0, 1.17, 0.12); g.add(brim);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.02), new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: 0.7, roughness: 0.3 })); badge.position.set(0.08, 0.84, 0.105); g.add(badge);
  }
  if (o.mask) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.02), S(0x111111)); m.position.set(0, 1.11, 0.12); g.add(m);
    const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.128, 14, 8, 0, Math.PI * 2, 0, 1.2), S(0x161616)); beanie.position.y = 1.12; g.add(beanie); }
  g.userData = { legs, arms };
  return g;
};
// swing legs and arms; amount 0 = standing still
const walkPose = (p, phase, amount) => {
  const a = Math.sin(phase) * 0.6 * amount;
  p.userData.legs[0].rotation.x = a; p.userData.legs[1].rotation.x = -a;
  p.userData.arms[0].rotation.x = -a * 0.8; p.userData.arms[1].rotation.x = a * 0.8;
};

const signTex = (text, bg, fg, w = 512, h = 128, size = 64) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const draw = () => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = `800 ${size}px Karla, "Helvetica Neue", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4); };
  draw(); const t = new THREE.CanvasTexture(c);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { draw(); t.needsUpdate = true; });
  return t;
};

// a rolling suitcase: box, pull handle and two little wheels
const makeSuitcase = color => {
  const g = new THREE.Group(), S = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.6, 0.24), S(color)); b.position.y = 0.36; b.castShadow = true; g.add(b);
  for (const x of [-0.12, 0.12]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.03), S(0x9aa0a6)); r.position.set(x, 0.86, -0.02); g.add(r); const w = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10).rotateZ(Math.PI / 2), S(0x1d1d1d)); w.position.set(x * 1.3, 0.05, -0.08); g.add(w); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.05), S(0x2b2f33)); top.position.set(0, 1.07, -0.02); g.add(top);
  return g;
};

export { makePerson, makeSuitcase, signTex, walkPose };
