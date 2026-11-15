// Skyrender rig. Every piece hangs off its parent by one hinge or one slide, so nothing ever detaches.
// Each joint stores a pose for every mode. A transformation between ANY two modes is planned on the
// fly from wherever the toy is right now: small accessories tuck away first, the big body sections
// hinge into place, then the new mode's accessories deploy.
const MODES = ['plane', 'robot', 'train', 'rocket', 'truck', 'tractor'];

function buildRig(THREE, tex) {
  const H = Math.PI / 2, PI = Math.PI;
  const DS = THREE.DoubleSide;
  const M = {
    white:  new THREE.MeshStandardMaterial({ color: 0xe8e7e2, roughness: 0.55, metalness: 0.1, side: DS }),
    grey:   new THREE.MeshStandardMaterial({ color: 0x9aa1a5, roughness: 0.6, metalness: 0.3 }),
    livery: new THREE.MeshStandardMaterial({ color: 0x7a2430, roughness: 0.55, metalness: 0.1, side: DS }),
    gun:    new THREE.MeshStandardMaterial({ color: 0x3a3e42, roughness: 0.7, metalness: 0.5, side: DS }),
    dark:   new THREE.MeshStandardMaterial({ color: 0x1c2024, roughness: 0.8, metalness: 0.3, side: DS }),
    glass:  new THREE.MeshStandardMaterial({ color: 0x1d2a33, roughness: 0.15, metalness: 0.5 }),
    tire:   new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.95 }),
    steel:  new THREE.MeshStandardMaterial({ color: 0x8d9196, roughness: 0.35, metalness: 0.8 }),
    brass:  new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.3, metalness: 0.85 }),
    iron:   new THREE.MeshStandardMaterial({ color: 0x23262a, roughness: 0.6, metalness: 0.4, side: DS }),
    coal:   new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95, flatShading: true }),
    beacon: new THREE.MeshStandardMaterial({ color: 0x8a1a1a, emissive: 0xff2a1a, emissiveIntensity: 0.8 }),
    navR:   new THREE.MeshStandardMaterial({ color: 0x8a1a1a, emissive: 0xff2a1a, emissiveIntensity: 0.6 }),
    navG:   new THREE.MeshStandardMaterial({ color: 0x1a6a2a, emissive: 0x2aff5a, emissiveIntensity: 0.6 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x191919, roughness: 0.9 }),
    paint:  new THREE.MeshStandardMaterial({ color: 0x9c2b2b, roughness: 0.35, metalness: 0.2, side: DS }),
    wood:   new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.9 }),
    tail:   new THREE.MeshStandardMaterial({ color: 0x8a1a1a, emissive: 0xff2a1a, emissiveIntensity: 0.5 }),
    marker: new THREE.MeshStandardMaterial({ color: 0xc9821e, emissive: 0xffa21a, emissiveIntensity: 0.35 }),
    tape:   new THREE.MeshStandardMaterial({ color: 0xc8202e, roughness: 0.5 }),
    window: new THREE.MeshStandardMaterial({ color: 0xa9c4d2, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.32, side: DS, depthWrite: false }),

    lamp:   new THREE.MeshStandardMaterial({ color: 0xf3d7a0, emissive: 0xe9b35f, emissiveIntensity: 0.6, roughness: 0.4 }),
    head:   new THREE.MeshStandardMaterial({ color: 0xf6f0dc, emissive: 0xfff3cf, emissiveIntensity: 0.15, roughness: 0.3 }),
    glow:   new THREE.MeshStandardMaterial({ color: 0x5a3a2a, emissive: 0xff7a2a, emissiveIntensity: 0.35, roughness: 0.5 }),
    visor:  new THREE.MeshStandardMaterial({ color: 0x5a1010, emissive: 0xff3326, emissiveIntensity: 0.1, roughness: 0.3 })
  };

  // ---------- geometry helpers ----------
  const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); return m;
  };
  const tube = (rF, rB, len, mat) => {                   // along Z, radius rF at +z
    const g = new THREE.CylinderGeometry(rF, rB, len, 28); g.rotateX(H);
    return new THREE.Mesh(g, mat);
  };
  const arc = (r, len, t0, t1, mat) => {                 // partial tube; angle 0 = belly, +H = right side
    const g = new THREE.CylinderGeometry(r, r, len, 24, 1, true, t0, t1 - t0); g.rotateX(H);
    return new THREE.Mesh(g, mat);
  };
  const decal = (map, w, h, pos, n, u) => {
    if (!map) return new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    const N = new THREE.Vector3(...n).normalize(), U = new THREE.Vector3(...u).normalize();
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(U, N), U, N));
    m.position.set(...pos); return m;
  };
  // A slice of one big picture, so artwork can span many hinged panels and line up when they unfold
  const sliceDecal = (map, w, h, pos, n, u, u0, u1, v0, v1) => {
    if (!map) return new THREE.Group();
    const m = decal(map, w, h, pos, n, u);
    m.material.transparent = false; m.material.depthWrite = true;
    const uv = m.geometry.attributes.uv;
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0); uv.needsUpdate = true;
    return m;
  };
  // Half tube: side +1 = right half (x >= 0). Gunmetal inner plate and end caps show the "mechanism".
  const shell = (side, rF, rB, len, windows) => {
    const g = new THREE.Group();
    const cg = new THREE.CylinderGeometry(rF, rB, len, 20, 1, true, side > 0 ? 0 : PI, PI); cg.rotateX(H);
    g.add(new THREE.Mesh(cg, M.white));
    const pg = new THREE.BufferGeometry(), L = len / 2;
    pg.setAttribute('position', new THREE.Float32BufferAttribute([0, -rB, -L, 0, rB, -L, 0, rF, L, 0, -rB, -L, 0, rF, L, 0, -rF, L], 3));
    pg.computeVertexNormals(); g.add(new THREE.Mesh(pg, M.gun));
    for (const [r, z] of [[rF, L], [rB, -L]]) {
      const c = new THREE.Mesh(new THREE.CircleGeometry(r, 16, side > 0 ? -H : H, PI), M.gun); c.position.z = z; g.add(c);
    }
    const rMid = (rF + rB) / 2;
    g.add(box(0.03, 0.07, len * 0.96, M.livery, side * (rMid - 0.01), 0.04, 0));
    if (windows) for (let z = -L + 0.18; z < L - 0.1; z += 0.26) g.add(box(0.03, 0.09, 0.09, M.glass, side * (rMid - 0.015), 0.22, z));
    return g;
  };
  const wingGeo = (side, span, root, tip, sweep, thick) => {
    const s = new THREE.Shape();
    s.moveTo(0, root / 2); s.lineTo(side * span, root / 2 - sweep);
    s.lineTo(side * span, root / 2 - sweep - tip); s.lineTo(0, -root / 2); s.lineTo(0, root / 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
    g.rotateX(H); g.translate(0, thick / 2, 0); return g;
  };
  const gear = (strut, wheelR, twin) => {
    const g = new THREE.Group();
    g.add(box(0.08, strut, 0.08, M.grey, 0, -strut / 2, 0));
    const wg = new THREE.CylinderGeometry(wheelR, wheelR, 0.14, 18); wg.rotateZ(H);
    for (const x of twin ? [-0.12, 0.12] : [0]) { const w = new THREE.Mesh(wg, M.tire); w.position.set(x, -strut, 0); g.add(w); }
    return g;
  };
  const passenger = (shirt, skin, hair, pants) => {
    const g = new THREE.Group();
    const S = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
    const sh = S(shirt), sk = S(skin), ha = S(hair), pa = S(pants);
    g.add(box(0.18, 0.04, 0.2, M.gun, 0, -0.02, 0), box(0.18, 0.32, 0.04, M.gun, 0, 0.14, -0.1));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.18, 12), sh).translateY(0.11));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), sk).translateY(0.27));
    const hr = new THREE.Mesh(new THREE.SphereGeometry(0.069, 14, 8, 0, PI * 2, 0, 1.4), ha); hr.position.y = 0.285; g.add(hr);
    g.add(box(0.02, 0.02, 0.01, M.dark, -0.025, 0.28, 0.062), box(0.02, 0.02, 0.01, M.dark, 0.025, 0.28, 0.062));
    g.add(box(0.12, 0.05, 0.15, pa, 0, 0.03, 0.07), box(0.12, 0.13, 0.05, pa, 0, -0.03, 0.14));
    g.add(box(0.035, 0.13, 0.04, sh, 0.085, 0.12, 0.03), box(0.035, 0.13, 0.04, sh, -0.085, 0.12, 0.03));
    return g;
  };
  // Rocket exhaust: additive cones pointing -z. Hidden until ignition.
  const flames = [];
  const fOuter = new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  const fInner = new THREE.MeshBasicMaterial({ color: 0xfff1b8, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const flame = (r, len) => {
    const g = new THREE.Group();
    for (const [rr, ll, mat] of [[r, len, fOuter], [r * 0.55, len * 0.6, fInner]]) {
      const c = new THREE.ConeGeometry(rr, ll, 18, 1, true); c.rotateX(-H); c.translate(0, 0, -ll / 2);
      g.add(new THREE.Mesh(c, mat));
    }
    g.visible = false; flames.push(g); return g;
  };
  // Rail wheel truck: two flanged steel wheels in a side frame. Origin = truck center.
  const wheels = [];
  const truck = side => {
    const g = new THREE.Group();
    const wg = new THREE.CylinderGeometry(0.22, 0.22, 0.08, 22); wg.rotateZ(H);
    const fg = new THREE.CylinderGeometry(0.25, 0.25, 0.025, 22); fg.rotateZ(H);
    for (const z of [-0.28, 0.28]) {
      const w = new THREE.Group(); w.position.set(0, 0, z);
      w.add(new THREE.Mesh(wg, M.steel));
      const flange = new THREE.Mesh(fg, M.steel); flange.position.x = -side * 0.05; w.add(flange);   // flange on the inside
      for (let k = 0; k < 3; k++) { const sp = box(0.09, 0.3, 0.04, M.gun); sp.rotation.x = k * PI / 3; w.add(sp); }
      g.add(w); wheels.push(w);
    }
    g.add(box(0.05, 0.16, 0.9, M.gun, side * 0.07, 0.04, 0));          // side frame
    g.add(box(0.06, 0.04, 0.5, M.livery, side * 0.1, 0.1, 0));
    g.add(box(0.1, 0.12, 0.16, M.dark, side * 0.07, 0.17, 0));          // spring box
    return g;
  };

  // ---------- joint system ----------
  // J(parent, pivot, spec). spec.plane / .robot / .train / .rocket = { p: slide from pivot, r: euler };
  // anything left out falls back to the plane pose. kind: 'body' moves in the middle of a morph,
  // 'acc' tucks into spec.stow first and deploys last, 'pulse' opens only while spec.pulse moves.
  // ord sets the order parts move in; say[mode] / stowSay are the on-screen captions.
  const joints = [];
  const mk = (pv, q) => ({ P: [pv[0] + q.p[0], pv[1] + q.p[1], pv[2] + q.p[2]], R: q.r.slice(), S: q.S.slice() });
  const J = (parent, pivot, spec = {}) => {
    const g = new THREE.Group();
    if (spec.order) g.rotation.order = spec.order;
    const base = { p: (spec.plane && spec.plane.p) || [0, 0, 0], r: (spec.plane && spec.plane.r) || [0, 0, 0], S: (spec.plane && spec.plane.S) || [1, 1, 1] };
    const full = q => mk(pivot, { p: (q && q.p) || base.p, r: (q && q.r) || base.r, S: (q && q.S) || base.S });
    g.userData = {
      poses: MODES.map(m => full(spec[m])),
      stow: spec.stow ? full(spec.stow) : full(base),
      open: spec.open ? full(spec.open) : null,
      kind: spec.kind || 'body', ord: spec.ord ?? 5, pulse: spec.pulse || null,
      say: spec.say || {}, stowSay: spec.stowSay || null, lock: !!spec.lock, arc: spec.arc || 0
    };
    const p0 = g.userData.poses[0];
    g.position.set(...p0.P); g.rotation.set(...p0.R); g.scale.set(...p0.S);
    parent.add(g); joints.push(g);
    return g;
  };

  // Telescoping rail truck: a hanger slides down, then the wheel truck slides down out of it.
  const railTruck = (parent, s, pivot, label, trailer) => {
    const tk = trailer ? { truck: { p: [0, -0.75, 0] } } : {};
    const hg = J(parent, pivot, { kind: 'acc', ord: 1, train: { p: [0, -0.6, 0] }, ...tk, say: { train: label, truck: trailer && s > 0 ? 'Rail wheels drop down as the trailer bogies' : null } });
    hg.add(box(0.08, 0.5, 0.3, M.gun), box(0.09, 0.06, 0.32, M.livery, 0, -0.2, 0));
    const t = J(hg, [0, 0, 0], { kind: 'acc', ord: 1, train: { p: [0, -0.57, 0] }, ...(trailer ? { truck: { p: [0, -0.68, 0] } } : {}) });
    t.add(truck(s));
  };

  // Big steam driving wheel: steel tire, red spoked center, counterweight and crank pin.
  const drivers = [];
  const driverWheel = (side, phase) => {
    const w = new THREE.Group();
    const tire = new THREE.CylinderGeometry(0.4, 0.4, 0.09, 30); tire.rotateZ(H);
    w.add(new THREE.Mesh(tire, M.steel));
    const fl = new THREE.CylinderGeometry(0.43, 0.43, 0.02, 30); fl.rotateZ(H);
    const flange = new THREE.Mesh(fl, M.steel); flange.position.x = -side * 0.04; w.add(flange);
    const ctr = new THREE.CylinderGeometry(0.34, 0.34, 0.1, 30); ctr.rotateZ(H);
    w.add(new THREE.Mesh(ctr, M.livery));
    for (let k = 0; k < 10; k++) { const sp = box(0.03, 0.62, 0.035, M.iron, side * 0.055); sp.rotation.x = k * PI / 10; w.add(sp); }
    const hub = new THREE.CylinderGeometry(0.08, 0.08, 0.14, 16); hub.rotateZ(H); w.add(new THREE.Mesh(hub, M.iron));
    const cw = box(0.03, 0.12, 0.3, M.iron, side * 0.06, -0.22, 0); w.add(cw);                    // counterweight
    const pin = new THREE.CylinderGeometry(0.035, 0.035, 0.12, 10); pin.rotateZ(H);
    const p = new THREE.Mesh(pin, M.brass); p.position.set(side * 0.08, 0.2, 0); w.add(p);         // crank pin
    drivers.push({ w, phase });
    return w;
  };
  // Tractor tires: fat knobby rubber folded flat around the hub, they pump up around the red wheels
  const tractorTire = (parent, s, R, tube, label) => {
    const t = J(parent, [0, 0, 0], { kind: 'acc', ord: 1.2, plane: { S: [0.6, 0.06, 0.06] }, tractor: { S: [1, 1, 1] }, say: { tractor: label } });
    const g = new THREE.TorusGeometry(R, tube, 12, 36); g.rotateY(H);
    t.add(new THREE.Mesh(g, M.rubber));
    for (let k = 0; k < 18; k++) {                                                  // chevron tread lugs
      const a = k / 18 * PI * 2, lug = box(0.07, 0.07, tube * 0.9, M.rubber, s * (k % 2 ? 0.07 : -0.07), Math.cos(a) * (R + tube * 0.92), Math.sin(a) * (R + tube * 0.92));
      lug.rotation.x = -a; t.add(lug);
    }
    return t;
  };
  const driverSet = (parent, s, pivot, label, truckZ, truckLabel, tr) => {
    const tk = truckZ == null ? {} : { truck: { p: [s * 0.3, -0.5, truckZ] } };
    const tt = tr ? { tractor: { p: tr.hg } } : {};
    const hg = J(parent, pivot, { kind: 'acc', ord: 1, train: { p: [s * 0.06, -0.5, 0] }, ...tk, ...tt, say: { train: label, truck: truckLabel || null, tractor: tr ? tr.label : null } });
    hg.add(box(0.07, 0.5, 0.22, M.iron));
    const wj = J(hg, [0, 0, 0], { kind: 'acc', ord: 1, train: { p: [0, -0.49, 0] }, ...(truckZ == null ? {} : { truck: { p: [s * 0.25, -0.49, 0] } }), ...(tr ? { tractor: { p: tr.wj } } : {}) });
    const w = driverWheel(s, s > 0 ? 0 : H);          // left and right cranks set a quarter turn apart, like a real engine
    wj.add(w);
    if (tr) tractorTire(w, s, tr.R, tr.tube, tr.tireLabel);
  };
  // Classic truck wheel: fat black tire, whitewall, chrome hubcap.
  const truckWheels = [];
  const truckWheel = s => {
    const w = new THREE.Group();
    const t = new THREE.CylinderGeometry(0.4, 0.4, 0.22, 28); t.rotateZ(H); w.add(new THREE.Mesh(t, M.rubber));
    const ww = new THREE.CylinderGeometry(0.3, 0.3, 0.226, 28); ww.rotateZ(H); w.add(new THREE.Mesh(ww, M.white));
    const hub = new THREE.CylinderGeometry(0.2, 0.2, 0.232, 24); hub.rotateZ(H); w.add(new THREE.Mesh(hub, M.livery));
    const cap = new THREE.SphereGeometry(0.11, 16, 10); cap.scale(0.5, 1, 1); const c = new THREE.Mesh(cap, M.steel); c.position.x = s * 0.12; w.add(c);
    for (let k = 0; k < 5; k++) { const lug = box(0.02, 0.03, 0.03, M.steel, s * 0.118, Math.cos(k * 1.257) * 0.15, Math.sin(k * 1.257) * 0.15); w.add(lug); }
    truckWheels.push(w);
    return w;
  };
  // Wheel on a two-stage telescoping axle, plus a rounded fender that slides out over it
  const truckCorner = (parent, s, pivot, front, label) => {
    const ax = J(parent, pivot, { kind: 'acc', ord: 1, truck: { p: [s * 0.25, -0.5, 0] }, say: { truck: label } });
    ax.add(box(0.45, 0.08, 0.08, M.iron, s * 0.0, 0, 0));
    const wj = J(ax, [0, 0, 0], { kind: 'acc', ord: 1, truck: { p: [s * 0.34, -0.49, 0] } });
    wj.add(truckWheel(s));
    const fp = [pivot[0] - s * 0.16, pivot[1] - 0.05, pivot[2]];
    const fd = J(parent, fp, { kind: 'acc', ord: 2, truck: { p: [s * 0.75, -0.94, 0] } });
    const fg = new THREE.CylinderGeometry(0.5, 0.5, 0.36, 22, 1, true, 0.12, PI - 0.24); fg.rotateZ(H);
    fd.add(new THREE.Mesh(fg, M.paint));
    if (front) {
      const ring = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 18); ring.rotateX(H);
      const r = new THREE.Mesh(ring, M.steel); r.position.set(0, 0.33, 0.3); fd.add(r);
      const lens = new THREE.CircleGeometry(0.085, 18); const l = new THREE.Mesh(lens, M.head); l.position.set(0, 0.33, 0.342); fd.add(l);
    }
  };
  // Half of something round, so two halves (one in each body half) can meet in the middle.
  const halfTube = (side, rTop, rBot, h, mat) => {
    const g = new THREE.Group();
    const cg = new THREE.CylinderGeometry(rTop, rBot, h, 18, 1, true, side > 0 ? 0 : PI, PI);
    g.add(new THREE.Mesh(cg, mat));
    return g;
  };

  const bot = new THREE.Group();
  const fans = [];
  // Size parts: extra detail stored inside the shells, slid out only when the robot goes GIANT
  const sizeBits = { big: [], small: {} };
  const bigPart = (parent, from, to, ...meshes) => {
    const g = new THREE.Group(); g.position.set(...from); meshes.forEach(m => g.add(m)); parent.add(g);
    sizeBits.big.push({ g, from: new THREE.Vector3(...from), to: new THREE.Vector3(...to) }); return g;
  };
  const rods = [];
  const navLights = [];
  const named = { gear: [], hatch: [] };
  let stackJ = null;

  // =====================================================================
  // ROOT (hip line of the fuselage). Rears up for robot and rocket, lies flat for plane and train.
  // =====================================================================
  const root = J(bot, [0, 0, 0], {
    robot: { r: [-H, 0, 0] }, rocket: { r: [-H, 0, 0] }, ord: 0,
    say: { robot: 'Nose lifts, the whole plane rears up onto its tail', plane: 'Body levels out', truck: 'Body levels out onto the road', train: 'Body lies down flat on the rails', rocket: 'Swings upright onto the launch pad' }
  });

  // ---------- torso (wing box) ----------
  root.add(tube(0.55, 0.55, 1.0, M.white).translateZ(0.5));
  root.add(arc(0.55, 0.8, 0.8, H - 0.5, M.white).translateZ(1.4), arc(0.55, 0.8, H + 0.5, 2 * PI - 0.8, M.white).translateZ(1.4));
  root.add(arc(0.5, 0.8, 0.8, H - 0.5, M.dark).translateZ(1.4), arc(0.5, 0.8, H + 0.5, 2 * PI - 0.8, M.dark).translateZ(1.4));
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.55, 28), M.white); cap.position.z = 1.8; root.add(cap);
  const cap2 = new THREE.Mesh(new THREE.CircleGeometry(0.5, 28), M.dark); cap2.position.z = 1.0; root.add(cap2);
  root.add(box(0.44, 0.12, 0.85, M.gun, 0, -0.52, 0.52));                                   // belly fairing -> abdomen
  root.add(box(0.08, 0.06, 0.06, M.lamp, 0.15, -0.59, 0.9), box(0.08, 0.06, 0.06, M.lamp, -0.15, -0.59, 0.9));
  root.add(decal(tex && tex.emblem, 0.36, 0.36, [0, -0.59, 0.28], [0, -1, 0], [0, 0, 1]));
  root.add(box(0.03, 0.07, 1.0, M.livery, 0.54, 0.04, 0.5), box(0.03, 0.07, 1.8, M.livery, -0.54, 0.04, 0.9));
  root.add(box(0.08, 0.05, 0.08, M.beacon, 0, 0.56, 0.4));                                   // beacon
  for (const s of [1, -1]) {
    root.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), M.gun).translateX(s * 0.28).translateZ(-0.1));   // hip balls
    root.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 16), M.gun).translateX(s * 0.5).translateZ(1.8)); // shoulder knuckles
  }

  // Chest vents: three louvers that tilt open in robot mode
  [-0.12, 0, 0.12].forEach((x, i) => {
    const v = J(root, [x, -0.59, 0.55], { kind: 'acc', ord: 8, robot: { r: [0, 0, 0.8] }, say: { robot: i === 0 ? 'Chest vents open' : null } });
    v.add(box(0.08, 0.02, 0.6, M.dark));
  });

  // Main gear (down in plane mode) and its bay doors, which open only while the wheels pass through
  for (const s of [1, -1]) {
    const g = named.gear[named.gear.push(null) - 1] = J(root, [s * 0.35, -0.15, 0.9], {
      kind: 'acc', ord: 0, stow: { r: [H, 0, 0] }, robot: { r: [H, 0, 0] }, train: { r: [H, 0, 0] }, rocket: { r: [H, 0, 0] }, truck: { p: [s * 0.4, -0.15, -3.8], r: [0, 0, 0] },
      say: { plane: s > 0 ? 'Landing gear swings down' : null, truck: s > 0 ? 'Plane landing gear becomes the trailer\'s landing legs' : null }, stowSay: s > 0 ? 'Landing gear swings up into the belly' : null
    });
    g.add(gear(0.55, 0.2, true));
    const hx = s * 0.565 * Math.sin(0.95), hy = -0.565 * Math.cos(0.95);
    const d = J(root, [hx, hy, 0.525], { kind: 'pulse', pulse: g, open: { r: [0, 0, s * 1.5] } });
    const door = arc(0.565, 0.85, s > 0 ? 0.45 : -0.95, s > 0 ? 0.95 : -0.45, M.white); door.position.set(-hx, -hy, 0); d.add(door);
  }

  // Middle rail trucks: drop straight down out of the belly for train mode
  for (const s of [1, -1]) {
    driverSet(root, s, [s * 0.3, 0, 1.3], null);
    driverSet(root, s, [s * 0.3, 0, 0.4], null, -2.3, null, { hg: [s * 0.35, -0.15, -1.15], wj: [s * 0.4, -0.15, 0], R: 0.6, tube: 0.22, label: s > 0 ? 'Big back wheels swing out' : null, tireLabel: s > 0 ? 'Giant tractor tires pump up' : null });
    // Side rod: ties the three driving wheels together; it rides around with the crank pins
    const rod = J(root, [s * 0.3, 0, 0.9], { kind: 'acc', ord: 1.5, train: { p: [s * 0.15, -0.79, 0.4] }, say: { train: s > 0 ? 'Side rods hook the driving wheels together' : null } });
    rod.add(box(0.04, 0.07, 1.86, M.steel), box(0.05, 0.1, 0.1, M.brass, 0, 0, 0.9), box(0.05, 0.1, 0.1, M.brass, 0, 0, 0), box(0.05, 0.1, 0.1, M.brass, 0, 0, -0.9));
    rods.push({ j: rod, phase: s > 0 ? 0 : H });
  }

  // Hip armor: side panels that flare out over the hip joints
  for (const s of [1, -1]) {
    const hp = J(root, [s * 0.565, 0, 0.45], { kind: 'acc', ord: 4, robot: { r: [0, -s * 0.45, 0] }, say: { robot: s > 0 ? 'Hip armor flares out' : null } });
    (named.hips = named.hips || []).push(hp);
    const panel = arc(0.57, 0.45, s > 0 ? H - 0.2 : -H - 0.45, s > 0 ? H + 0.45 : -H + 0.2, M.white);
    panel.position.set(-s * 0.565, 0, -0.225); hp.add(panel);
    hp.add(box(0.03, 0.05, 0.4, M.livery, 0.005 * s, 0.12, -0.225));
  }

  // Chest hatch: gull-wing doors
  for (const s of [1, -1]) {
    const hx = s * 0.565 * Math.sin(0.8), hy = -0.565 * Math.cos(0.8);
    const d = named.hatch[named.hatch.push(null) - 1] = J(root, [hx, hy, 1.4], {
      kind: 'acc', ord: 9, robot: { r: [0, 0, s * 1.9] },
      say: { robot: s > 0 ? 'Chest hatch opens' : null }, stowSay: s > 0 ? 'Chest hatch closes' : null
    });
    const door = arc(0.565, 0.8, s > 0 ? 0 : -0.8, s > 0 ? 0.8 : 0, M.white); door.position.set(-hx, -hy, 0); d.add(door);
    d.add(box(0.03, 0.03, 0.8, M.livery, -hx + s * 0.24, -hy - 0.51, 0));
  }
  // Side door: slides back so you can see the passengers riding the train
  const sd = J(root, [0, 0, 1.4], {
    kind: 'acc', ord: 6, train: { p: [0, 0, -0.82] },
    say: { train: 'Side door slides open, the passengers are driving' }, stowSay: 'Side door slides shut'
  });
  sd.add(arc(0.565, 0.8, H - 0.5, H + 0.5, M.white));
  sd.add(box(0.03, 0.07, 0.8, M.livery, 0.566, 0.04, 0));
  sd.add(box(0.02, 0.38, 0.02, M.dark, 0.57, 0, 0.38), box(0.02, 0.38, 0.02, M.dark, 0.57, 0, -0.38));
  sd.add(box(0.03, 0.1, 0.1, M.glass, 0.567, 0.2, 0.15), box(0.03, 0.1, 0.1, M.glass, 0.567, 0.2, -0.15));

  // Steam dome and sand dome: brass domes that rise out of the boiler top
  for (const [z, name] of [[0.85, 'Steam dome and sand dome rise out of the boiler'], [0.15, null]]) {
    const d = J(root, [0, 0, z], { kind: 'acc', ord: 2.5, train: { p: [0, 0.55, 0] }, say: { train: name } });
    d.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.2, 20), M.brass));
    d.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 10, 0, PI * 2, 0, H), M.brass).translateY(0.1));
  }
  // Cab roof: hidden flat in the cabin ceiling, rises on four posts over the passengers
  const cab = J(root, [0, 0, 1.4], { kind: 'acc', ord: 3.5, train: { p: [0, 0.95, 0] }, say: { train: 'Cab roof lifts up over the passengers' } });
  cab.add(box(1.0, 0.05, 0.95, M.iron), box(1.04, 0.03, 0.99, M.livery, 0, -0.035, 0));
  for (const x of [-0.3, 0.3]) for (const z of [-0.4, 0.4]) cab.add(box(0.04, 0.42, 0.04, M.iron, x, -0.23, z));
  // ---------- truck body: accordion panels folded up inside the cabin ----------
  // Each panel is a chain of hinged segments stacked like a folded map inside the closed part of the
  // fuselage. In truck mode the stack slides out to its spot, the segments swing open one by one,
  // and the top half of each flips up. Nothing appears from nowhere: you can watch every fold.
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const truckBits = { doors: [], gateTops: [] };
  // o.parts: 1 = a single flat panel, 2 = folded in half, 3 = Z-folded in thirds (tall trailer walls)
  const fanPanel = o => {
    const m = o.parts || (o.fold ? 2 : 1), h = o.H / m, W = o.W || 0.06;
    const eps = o.n > 5 ? 0.006 : 0.03;                 // long chains fold almost flat so the stack stays inside
    const geo = (g, i, j) => {
      if (o.frame) o.frame(g, i, j > 0, h, o.L, j); else g.add(box(W, h, o.L, o.mat || M.paint, 0, h / 2, -o.L / 2));
      if (o.deco) o.deco(g, i, j > 0, h, o.L, j);
    };
    const md = o.mode || 'truck';
    const first = J(root, o.stow, { kind: 'acc', ord: o.ord, plane: { r: o.stowR || [0, 0, 0] }, [md]: { p: sub3(o.P, o.stow), r: o.R || [0, 0, 0] }, say: { [md]: o.label || null } });
    let prev = null; const tops = [], segs = [];
    for (let i = 0; i < o.n; i++) {
      const seg = i === 0 ? first : J(prev, [0, 0, -o.L], { kind: 'acc', ord: o.ord + 0.05 * i, plane: { r: [0, PI - eps, 0] }, [md]: { r: [0, 0, 0] } });
      geo(seg, i, 0); segs.push(seg);
      let under = seg;
      for (let j = 1; j < m; j++) {
        const up = J(under, [0, h, 0], { kind: 'acc', ord: o.ord + 0.3 + 0.1 * j, plane: { r: [0, 0, (j % 2 ? 1 : -1) * (PI - 0.03)] }, [md]: { r: [0, 0, 0] } });
        geo(up, i, j); if (j === 1) tops.push(up); under = up;
      }
      prev = seg;
    }
    return { first, tops, segs };
  };
  const BELT = 0.95, ROOF = 1.9;
  const flat = s => [0, 0, -s * H];          // panel lies flat, opening outward from its hinge
  const across = s => [0, s * H, 0];         // panel stands across the truck, opening toward the middle
  // Trailer box: 10.6 long, 2.1 wide, 2.6 tall, hitched over the tractor's back wheels
  const TZ = -0.9, TN = 10, TL = 1.06, TB = -0.25, TH = 2.6, TW = 1.05;
  truckBits.trailerDoors = []; truckBits.markers = [];
  const outer = (s, W) => s * (W / 2 + 0.004);
  for (const s of [1, -1]) {
    const inV = [s * 0.2, -0.38, 0.95];       // where the folded stacks wait, inside the closed fuselage

    // ----- trailer -----
    fanPanel({ s, stow: inV, P: [0, TB, TZ], R: flat(s), n: TN, L: TL, H: 1.09, fold: true, W: 0.06, mat: M.gun, ord: 1.0,
      label: s > 0 ? 'Trailer floor slides out and unfolds, ten panels long' : null });
    fanPanel({ s, stow: inV, P: [s * TW, TB, TZ], n: TN, L: TL, H: TH, parts: 3, W: 0.07, mat: M.white, ord: 1.2,
      label: s > 0 ? 'Trailer walls unfold, each panel opening up in thirds' : null,
      deco: (g, i, up, h, L, j) => {
        const u0 = s > 0 ? i / TN : 1 - (i + 1) / TN, u1 = s > 0 ? (i + 1) / TN : 1 - i / TN;
        g.add(sliceDecal(tex && tex.trailer, L, h, [outer(s, 0.07), h / 2, -L / 2], [s, 0, 0], [0, 1, 0], u0, u1, j / 3, (j + 1) / 3));
        if (j === 0) g.add(box(0.09, 0.07, L, M.gun, 0, 0.035, -L / 2));
        if (j === 2) {
          g.add(box(0.09, 0.06, L, M.gun, 0, h - 0.03, -L / 2));
          if (i % 3 === 0 || i === TN - 1) { const mk = box(0.05, 0.08, 0.1, i === TN - 1 ? M.tail : M.marker, s * 0.05, h - 0.14, i === TN - 1 ? -L + 0.08 : -L / 2); g.add(mk); }
        }
      } });
    fanPanel({ s, stow: inV, P: [s * TW, TB, TZ], R: across(s), n: 1, L: TW, H: TH, parts: 3, W: 0.07, mat: M.white, ord: 1.4,
      label: s > 0 ? 'Front wall of the trailer folds across' : null });
    fanPanel({ s, stow: inV, P: [0, TB + TH, TZ], R: flat(s), n: TN, L: TL, H: 1.09, fold: true, W: 0.06, mat: M.white, ord: 1.6,
      label: s > 0 ? 'Roof unfolds over the whole trailer' : null });
    const door = fanPanel({ s, stow: inV, P: [s * TW, TB, TZ - TN * TL], R: across(s), n: 1, L: TW, H: TH, parts: 3, W: 0.07, mat: M.white, ord: 1.8,
      label: s > 0 ? 'Back doors swing shut' : null,
      deco: (g, i, up, h, L, j) => {
        const x = outer(s, 0.07) + s * 0.01;
        for (const z of [-0.3, -0.72]) g.add(box(0.025, h, 0.035, M.steel, x, h / 2, z));             // lock rods
        g.add(box(0.03, 0.12, 0.05, M.dark, x, h * 0.5, -0.04));                                      // hinge
        for (let k = 0; k < 6; k++) {                                                                 // red and white reflective tape
          const tz = -0.09 - k * 0.165;
          if (j === 0) g.add(box(0.02, 0.07, 0.15, k % 2 ? M.white : M.tape, x, 0.14, tz));
          if (j === 2) g.add(box(0.02, 0.07, 0.15, k % 2 ? M.white : M.tape, x, h - 0.1, tz));
        }
        if (j === 0) { g.add(box(0.03, 0.14, 0.22, M.tail, x, 0.4, -0.2)); g.add(box(0.03, 0.08, 0.12, M.marker, x, 0.4, -0.45)); }
        if (j === 1 && s > 0) g.add(decal(tex && tex.emblem, 0.55, 0.55, [x + s * 0.005, h / 2, -0.55], [s, 0, 0], [0, 1, 0]));
      } });
    truckBits.trailerDoors.push({ j: door.first, s });

    // ----- tractor -----
    const cabLow = fanPanel({ s, stow: inV, P: [s * 0.95, -0.62, 2.05], n: 2, L: 0.825, H: 1.57, fold: true, ord: 3, label: s > 0 ? 'Cab doors unfold' : null,
      deco: (g, i, up, h, L) => {
        if (up && i === 0) { g.add(box(0.03, 0.04, 0.16, M.steel, s * 0.04, h - 0.3, -0.7)); g.add(decal(tex && tex.emblem, 0.42, 0.42, [s * 0.032, h * 0.35, -0.42], [s, 0, 0], [0, 1, 0])); }
      } });
    const cabUp = fanPanel({ s, stow: inV, P: [s * 0.95, BELT, 2.05], n: 2, L: 0.825, H: ROOF - BELT, ord: 3.4,
      frame: (g, i, up, h, L) => {
        g.add(box(0.06, 0.06, L, M.paint, 0, h - 0.03, -L / 2));
        if (i === 0) g.add(box(0.06, h, 0.08, M.paint, 0, h / 2, -0.04));
        g.add(box(0.06, h, 0.08, M.paint, 0, h / 2, -L + 0.04));
      } });
    truckBits.doors.push({ j: cabLow.first, s }, { j: cabUp.first, s });
    // Sleeper box behind the cab, so the drivers can nap on long hauls
    fanPanel({ s, stow: inV, P: [s * 0.95, -0.55, 0.38], n: 1, L: 1.0, H: ROOF + 0.55, parts: 3, W: 0.06, ord: 3.5, label: s > 0 ? 'Sleeper walls unfold behind the cab' : null,
      deco: (g, i, up, h, L, j) => {
        if (j === 2) g.add(box(0.07, 0.24, 0.36, M.window, 0, h * 0.45, -0.5));
        if (j === 1) g.add(box(0.07, 0.07, L, M.livery, 0, h * 0.25, -L / 2));
      } });
    fanPanel({ s, stow: inV, P: [s * 0.95, -0.55, -0.62], R: across(s), n: 1, L: 0.95, H: ROOF + 0.55, parts: 3, W: 0.06, ord: 3.7 });
    fanPanel({ s, stow: inV, P: [0, ROOF, 2.05], R: flat(s), n: 3, L: 0.89, H: 0.95, W: 0.07, ord: 3.9, label: s > 0 ? 'Roof unfolds over the cab and sleeper' : null,
      deco: (g, i) => { if (i === 0) for (const y of [0.15, 0.45]) g.add(box(0.06, 0.09, 0.07, M.marker, -s * 0.05, y, -0.1)); } });
    fanPanel({ s, stow: inV, P: [0, BELT, 3.6], R: flat(s), n: 2, L: 0.775, H: 0.62, W: 0.06, ord: 4.2, label: s > 0 ? 'Long hood unfolds over the engine' : null,
      deco: (g, i, up, h, L) => { g.add(box(0.15, 0.04, L, M.paint, s * 0.075, h - 0.02, -L / 2)); if (s > 0) g.add(box(0.04, 0.04, L, M.steel, -s * 0.03, 0.02, -L / 2)); } });
    fanPanel({ s, stow: inV, P: [s * 1.0, -0.45, 3.6], n: 2, L: 0.725, H: 1.25, fold: true, W: 0.06, ord: 4.5, label: s > 0 ? 'Front fenders unfold over the wheels' : null });
    fanPanel({ s, stow: inV, P: [s * 0.59, 0.8, 3.6], R: flat(s), n: 2, L: 0.725, H: 0.42, W: 0.05, ord: 4.7 });
    fanPanel({ s, stow: inV, P: [s * 1.0, -0.45, 3.6], R: across(s), n: 1, L: 0.41, H: 1.25, fold: true, W: 0.05, ord: 4.8 });
    fanPanel({ s, stow: inV, P: [s * 0.59, -0.45, 3.62], R: across(s), n: 1, L: 0.59, H: 1.4, fold: true, W: 0.04, mat: M.steel, ord: 5 });
    // Frame deck with the fifth wheel the trailer hooks onto, rear fenders and mud flaps
    fanPanel({ s, stow: inV, P: [0, -0.42, -0.62], R: flat(s), n: 2, L: 1.0, H: 0.72, W: 0.07, mat: M.gun, ord: 2.4,
      deco: (g, i) => { if (i === 1) g.add(box(0.1, 0.45, 0.7, M.dark, -s * 0.06, 0.24, -0.5)); } });
    fanPanel({ s, stow: inV, P: [s * 0.62, -0.42, -1.3], R: flat(s), n: 1, L: 1.2, H: 0.55, W: 0.05, mat: M.dark, ord: 2.6 });
    fanPanel({ s, stow: inV, P: [s * 1.15, -1.33, -2.6], R: across(s), n: 1, L: 0.5, H: 0.9, W: 0.03, mat: M.rubber, ord: 2.7,
      deco: (g, i, up, h, L) => g.add(decal(tex && tex.emblem, 0.34, 0.34, [s * 0.02, h * 0.55, -L / 2], [s, 0, 0], [0, 1, 0])) });

    // Chrome exhaust stacks: stored lying down inside the body, stand up and telescope tall
    const ex = J(root, [s * 0.3, 0.05, 0.55], { kind: 'acc', ord: 5.6, truck: { p: [s * 0.79, 0.4, -0.85], r: [-H, 0, 0] },
      say: { truck: s > 0 ? 'Chrome smokestacks stand up beside the sleeper' : null } });
    const pipe = (r, mat) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.9, 16).rotateX(H), mat);
    ex.add(pipe(0.075, M.steel), box(0.2, 0.03, 0.5, M.dark, 0, 0, -0.1));
    const ex1 = J(ex, [0, 0, 0], { kind: 'acc', ord: 5.7, truck: { p: [0, 0, 0.88] } }); ex1.add(pipe(0.066, M.steel));
    const ex2 = J(ex1, [0, 0, 0], { kind: 'acc', ord: 5.8, truck: { p: [0, 0, 0.88] } }); ex2.add(pipe(0.058, M.steel));
    const lip = new THREE.Mesh(new THREE.CircleGeometry(0.05, 14), M.dark); lip.position.z = 0.451; ex2.add(lip);
    (truckBits.stacks = truckBits.stacks || []).push(ex2);
    // Fuel tanks slide out under the doors
    const ft = J(root, [s * 0.22, -0.1, 0.5], { kind: 'acc', ord: 5.5, truck: { p: [s * 0.93, -0.75, 0.65] }, say: { truck: s > 0 ? 'Shiny fuel tanks slide out under the doors' : null } });
    ft.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 22).rotateX(H), M.steel));
    for (const z of [-0.3, 0.3]) { const st = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.018, 6, 22), M.dark); st.position.z = z; ft.add(st); }
    const wsj = J(root, [s * 0.2, 0, 0.5], { kind: 'acc', ord: 5.3, plane: { r: [0, s * H, 0] }, truck: { p: [s * 0.27, 1.42, 1.53], r: [-0.2, 0, 0] }, say: { truck: s > 0 ? 'Windshield swings into place' : null } });
    wsj.add(box(0.92, 0.86, 0.025, M.window), box(0.94, 0.04, 0.05, M.steel, 0, 0.44, 0), box(0.94, 0.04, 0.05, M.steel, 0, -0.44, 0));
    if (s < 0) { const sw = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 8, 22), M.iron); sw.position.set(0.22, -0.3, -0.35); sw.rotation.x = -1.0; wsj.add(sw); }
  }

  // ---------- SKYFLY the farm tractor: a red hood, a glass cab and fenders, all folded inside like the truck ----------
  const tDecal = (map, w, h, pos, n, u, u0, u1, v0, v1) => {
    if (!map) return new THREE.Group();
    const m = decal(map, w, h, pos, n, u), uv = m.geometry.attributes.uv;
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0); uv.needsUpdate = true; return m;
  };
  const tractorBits = { cabDoors: [] };
  {
    const HT = 0.62, HB = -0.45, HW = 0.62, HZ = 3.4, CZ = 0.3, CB = 0.62, CT = 2.22;
    for (const s of [1, -1]) {
      const inV = [s * 0.2, -0.38, 0.95];
      // hood sides wear the SKYFLY name, spread across three panels
      fanPanel({ mode: 'tractor', s, stow: inV, P: [s * HW, HB, HZ], n: 3, L: (HZ - CZ) / 3, H: HT - HB, fold: true, W: 0.06, ord: 3, label: s > 0 ? 'Red hood sides unfold over the engine' : null,
        deco: (g, i, up, h, L, j) => {
          const u0 = s > 0 ? i / 3 : 1 - (i + 1) / 3, u1 = s > 0 ? (i + 1) / 3 : 1 - i / 3;
          g.add(tDecal(tex && tex.skyfly, L, h, [s * 0.034, h / 2, -L / 2], [s, 0, 0], [0, 1, 0], u0, u1, j / 2, (j + 1) / 2));
          if (j === 0) for (let k = 0; k < 3; k++) g.add(box(0.07, 0.04, 0.5, M.dark, 0, 0.15 + k * 0.1, -L / 2));          // engine vents
        } });
      fanPanel({ mode: 'tractor', s, stow: inV, P: [0, HT, HZ], R: flat(s), n: 3, L: (HZ - CZ) / 3, H: HW + 0.03, W: 0.06, ord: 3.3, label: s > 0 ? 'Hood top unfolds' : null,
        deco: (g, i) => { if (s > 0) g.add(box(0.07, 0.06, (HZ - CZ) / 3, M.livery, -s * 0.01, 0.03, -(HZ - CZ) / 6)); } });
      // chrome grille across the front
      fanPanel({ mode: 'tractor', s, stow: inV, P: [s * HW, HB, HZ + 0.02], R: across(s), n: 1, L: HW, H: HT - HB, fold: true, W: 0.05, mat: M.steel, ord: 3.5,
        deco: (g, i, up, h, L) => { for (let k = 0; k < 4; k++) g.add(box(0.03, 0.05, L - 0.08, M.dark, -s * 0.035, 0.08 + k * h / 4.2, -L / 2)); } });
      // cab: glass walls in red frames, floor and a roof
      const frame = (g, i, up, h, L, glassy) => {
        g.add(box(0.06, 0.06, L, M.paint, 0, h - 0.03, -L / 2), box(0.06, 0.06, L, M.paint, 0, 0.03, -L / 2));
        g.add(box(0.06, h, 0.07, M.paint, 0, h / 2, -0.035), box(0.06, h, 0.07, M.paint, 0, h / 2, -L + 0.035));
        g.add(box(0.025, h - 0.1, L - 0.1, M.window, 0, h / 2, -L / 2));
      };
      const side = fanPanel({ mode: 'tractor', s, stow: inV, P: [s * HW, CB, CZ], n: 1, L: 1.5, H: CT - CB, fold: true, W: 0.06, ord: 4, frame, label: s > 0 ? 'Glass cab unfolds around the seat' : null });
      tractorBits.cabDoors.push({ j: side.first, s });
      fanPanel({ mode: 'tractor', s, stow: inV, P: [s * HW, CB, CZ], R: across(s), n: 1, L: HW, H: CT - CB, fold: true, W: 0.06, ord: 4.1, frame });
      fanPanel({ mode: 'tractor', s, stow: inV, P: [s * HW, CB, CZ - 1.5], R: across(s), n: 1, L: HW, H: CT - CB, fold: true, W: 0.06, ord: 4.2, frame });
      fanPanel({ mode: 'tractor', s, stow: inV, P: [0, CB, CZ + 0.05], R: flat(s), n: 2, L: 0.8, H: HW, W: 0.06, mat: M.gun, ord: 3.8 });
      fanPanel({ mode: 'tractor', s, stow: inV, P: [0, CT, CZ + 0.15], R: flat(s), n: 2, L: 0.9, H: HW + 0.12, W: 0.07, ord: 4.4, label: s > 0 ? 'Cab roof unfolds' : null,
        deco: (g, i) => { if (i === 0) g.add(box(0.06, 0.1, 0.07, M.marker, -s * 0.06, HW - 0.05, -0.1)); } });
      // big curved-look fenders over the back wheels
      fanPanel({ mode: 'tractor', s, stow: inV, P: [s * HW, CB + 0.02, CZ + 0.3], R: flat(s), n: 2, L: 1.0, H: 0.75, W: 0.06, ord: 3.9, label: s > 0 ? 'Fenders unfold over the giant wheels' : null });
      fanPanel({ mode: 'tractor', s, stow: inV, P: [s * (HW + 0.75), CB + 0.05, CZ + 0.3], n: 2, L: 1.0, H: 0.3, W: 0.05, ord: 3.95,
        deco: (g, i, up, h, L) => { if (i === 0) g.add(decal(tex && tex.emblem, 0.26, 0.26, [s * 0.03, h / 2, -0.5], [s, 0, 0], [0, 1, 0])); } });
    }
    // The farmer: rides folded up in the cabin floor, then sits up in the tractor seat
    const farmer = J(root, [0, -0.15, 0.55], { kind: 'acc', ord: 6, arc: 0.7, tractor: { p: [0, 0.82, -0.95] }, plane: { S: [0.4, 0.4, 0.4] }, tractor_S: 1,
      say: { tractor: 'The farmer climbs up into the driver seat' } });
    farmer.userData.poses[MODES.indexOf('tractor')].S = [1, 1, 1];
    const fm = passenger(0xb3312b, 0xe0b08a, 0x6b4a2a, 0x2f4f86); fm.scale.setScalar(2.1); farmer.add(fm);
    const FS = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
    const straw = FS(0xe2c46a);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 20), straw); brim.position.y = 0.66; farmer.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.14, 16), straw); crown.position.y = 0.74; farmer.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.03, 16), FS(0x7a2430)); band.position.y = 0.69; farmer.add(band);
    for (const x of [-0.08, 0.08]) farmer.add(box(0.05, 0.3, 0.02, FS(0x2f4f86), x, 0.3, 0.07));        // overall straps
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 8, 22), M.iron); wheel.position.set(0, 0.5, 0.38); wheel.rotation.x = -0.9; farmer.add(wheel);
    farmer.add(box(0.04, 0.04, 0.3, M.iron, 0, 0.38, 0.5));
    tractorBits.farmer = farmer;
  }

  // Passengers on swivel seats: they turn to face out of the chest hatch in robot mode
  const riders = [[1, 0x3f6e9a, 0xd9a47a, 0x2d2a26, 0x3a3f47], [-1, 0xd9a93a, 0x8c5a3c, 0x1d1b19, 0x5b4636]];
  for (const [s, shirt, skin, hair, pants] of riders) {
    const seat = J(root, [s * 0.25, -0.3, 1.3], {
      kind: 'acc', ord: 10, robot: { p: [0, -0.02, -0.25], r: [H, 0, 0] }, truck: { p: [0, 1.1, 0] },
      say: { robot: s > 0 ? 'Two passengers swivel into the chest cockpit' : null, truck: s > 0 ? 'Passengers scoot up into the cab' : null }, stowSay: s > 0 ? 'Passengers swivel back into the cabin' : null
    });
    seat.add(passenger(shirt, skin, hair, pants));
  }

  // ---------- wings ----------
  // Euler order ZYX: the wing sweeps back first, then rolls about the body. In train mode that turns
  // each wing into a tall side skirt with its jet engine riding on the outside.
  const teSlope = 0.7 / 3.7;
  for (const s of [1, -1]) {
    const w = J(root, [s * 0.5, -0.2, 0.9], {
      order: 'ZYX', ord: 4,
      plane: { r: [0, 0, s * 0.06] }, tractor: { p: [0, 0.9, -3.1], r: [0, 0, s * 0.03] }, robot: { r: [0, 0, s * 1.5] }, rocket: { r: [0, s * 0.73, 0] },
      train: { p: [s * 0.12, 0.6, -0.12], r: [0, s * 1.384, s * H] }, truck: { p: [-s * 0.5, s > 0 ? 0.8 : 0.84, -3.0], r: [0, s * 1.384, 0] },
      say: { robot: s > 0 ? 'Wings hinge back into a jet pack' : null, plane: s > 0 ? 'Wings swing out wide' : null,
             train: s > 0 ? 'Wings sweep back into the coal tender walls' : null, truck: s > 0 ? 'Wings fold flat and ride inside the trailer as cargo' : null, rocket: s > 0 ? 'Wings sweep back into big rocket fins' : null, tractor: s > 0 ? 'Wings slide back into long sprayer booms' : null }
    });
    (named.wings = named.wings || []).push({ j: w, s });
    w.add(new THREE.Mesh(wingGeo(s, 3.7, 1.8, 0.5, 2.0, 0.09), M.white));
    w.add(box(0.08, 0.22, 0.7, M.grey, s * 1.1, -0.14, 0.3));                              // pylon
    w.add(decal(tex && tex.emblem, 0.8, 0.8, [s * 2.05, -0.052, -0.78], [0, -1, 0], [0, 0, 1]));
    w.add(decal(tex && tex.emblem, 0.8, 0.8, [s * 1.6, 0.052, -0.55], [0, 1, 0], [s, 0, 0]));

    // Flap: hinged along the trailing edge, lowered for landing
    const fx = 1.4, fz = -0.9 - teSlope * fx;
    const fh = new THREE.Group(); fh.position.set(s * fx, 0, fz); fh.rotation.y = s * Math.atan(teSlope); w.add(fh);
    const flap = J(fh, [0, 0, 0], { kind: 'acc', ord: 1, plane: { r: [-0.6, 0, 0] }, stow: { r: [0, 0, 0] }, robot: { r: [0, 0, 0] }, train: { r: [0, 0, 0] }, rocket: { r: [0, 0, 0] }, truck: { r: [Math.PI, 0, 0] }, say: { plane: s > 0 ? 'Flaps lower for landing' : null }, stowSay: s > 0 ? 'Flaps tuck in' : null });
    flap.add(box(1.6, 0.03, 0.34, M.white, 0, 0, -0.17), box(1.6, 0.012, 0.02, M.dark, 0, 0.02, -0.01));

    // Winglet: folds flat for robot and train
    const wl = J(w, [s * 3.7, 0.02, -1.35], {
      kind: 'acc', ord: 1.5, plane: { r: [0, 0, -s * 0.3] }, stow: { r: [0, 0, -s * H] },
      robot: { r: [0, 0, -s * H] }, train: { r: [0, 0, -s * H] }, truck: { r: [0, 0, -s * H] },
      say: { plane: s > 0 ? 'Winglets flip up' : null, rocket: s > 0 ? 'Winglets flip up' : null }, stowSay: s > 0 ? 'Winglets fold flat' : null
    });
    wl.add(box(0.05, 0.5, 0.4, M.livery, 0, 0.25, 0));
    const nav = box(0.07, 0.07, 0.07, s > 0 ? M.navG : M.navR, 0, 0.02, 0.22); wl.add(nav); navLights.push(nav);

    // Engine: rides the wing, swivels to keep pointing the right way in every mode
    const e = J(w, [s * 1.1, -0.35, 0.35], {
      ord: 4.5, train: { r: [0, -s * 1.384, 0] }, truck: { r: [0, -s * 1.384, 0] }, rocket: { r: [0, -s * 0.73, 0] },
      say: { train: s > 0 ? 'Jet engines swing around into water tanks' : null, truck: null, rocket: s > 0 ? 'Engines swivel to point straight down' : null }
    });
    e.add(tube(0.32, 0.26, 1.3, M.white));
    e.add(box(0.03, 0.08, 1.1, M.livery, 0.32, 0, 0), box(0.03, 0.08, 1.1, M.livery, -0.32, 0, 0));
    const intake = tube(0.28, 0.28, 0.04, M.dark); intake.position.z = 0.64; e.add(intake);
    const fan = new THREE.Group();
    for (let i = 0; i < 8; i++) { const b = box(0.04, 0.5, 0.02, M.grey); b.rotation.z = i * PI / 8; fan.add(b); }
    fan.position.z = 0.6; e.add(fan); fans.push(fan);
    const nz = J(e, [0, 0, -0.78], {
      kind: 'acc', ord: 2, robot: { p: [0, 0, -0.35] }, rocket: { p: [0, 0, -0.35] },
      say: { robot: s > 0 ? 'Thruster nozzles extend' : null, rocket: s > 0 ? 'Booster nozzles extend' : null }, stowSay: s > 0 ? 'Nozzles slide back in' : null
    });
    (named.nozzles = named.nozzles || []).push(nz);
    nz.add(tube(0.2, 0.08, 0.3, M.gun));
    const sleeve = tube(0.21, 0.21, 0.4, M.gun); sleeve.position.z = 0.3; nz.add(sleeve);
    const ew = tube(0.14, 0.14, 0.02, M.glow); ew.position.z = -0.16; nz.add(ew);
    nz.add(flame(0.17, 2.2).translateZ(-0.15));
  }

  // ---------- arms (forward fuselage halves) ----------
  for (const s of [1, -1]) {
    const ua = J(root, [s * 0.55, 0, 1.8], {
      ord: 5, robot: { r: [0, s * PI, 0] },
      say: { robot: s > 0 ? 'Front cabin splits and swings down into arms' : null }
    });
    const uShell = shell(s, 0.55, 0.55, 0.9, true).translateX(-s * 0.55).translateZ(0.45);
    uShell.add(box(0.02, 0.42, 0.24, M.dark, s * 0.545, 0.02, -0.15), box(0.025, 0.38, 0.2, M.white, s * 0.55, 0.02, -0.15));
    uShell.add(decal(tex && tex.emblem, 0.42, 0.42, [-s * 0.012, 0, 0.05], [-s, 0, 0], [0, 0, -1]));
    ua.add(uShell);

    driverSet(ua, s, [-s * 0.25, 0, 0.4], s > 0 ? 'Big red driving wheels drop down' : null, 0.75, s > 0 ? 'The train\'s big red wheels slide out to the four corners' : null, { hg: [s * 0.2, -0.3, 0.7], wj: [s * 0.25, -0.32, 0], R: 0.4, tube: 0.1, label: s > 0 ? 'Front wheels tuck in under the nose' : null });

    // Shoulder armor block rides up out of the upper arm
    const pd = J(ua, [-s * 0.25, 0, 0.35], { kind: 'acc', ord: 5, robot: { p: [0, 0, -0.6] }, say: { robot: s > 0 ? 'Shoulder armor slides up' : null } });
    pd.add(box(0.3, 0.46, 0.5, M.gun), box(0.31, 0.1, 0.3, M.livery, 0, 0, -0.1));
    (named.pauldrons = named.pauldrons || []).push(pd);
    // GIANT: a shoulder cannon rises out of the armor block, then its barrel telescopes forward
    const cg = new THREE.CylinderGeometry(0.075, 0.085, 0.4, 14);
    const cannon = bigPart(pd, [0, 0, 0], [0, 0, -0.34], new THREE.Mesh(cg, M.gun), box(0.2, 0.14, 0.16, M.dark, 0, 0.12, 0));
    const barrel = bigPart(cannon, [0, 0, 0], [0, -0.32, 0], new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 12), M.grey));
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12), M.glow); muzzle.position.y = -0.21; barrel.add(muzzle);

    const fa = J(ua, [-s * 0.55, -0.55, 0.9], { ord: 6, robot: { r: [0.5, 0, 0] }, say: { robot: s > 0 ? 'Elbows bend' : null } });
    if (s > 0) { named.uaR = ua; named.faR = fa; }
    const fShell = shell(s, 0.42, 0.55, 0.9, true).translateY(0.55).translateZ(0.45);
    for (const z of [-0.2, -0.05, 0.1]) fShell.add(box(0.012, 0.18, 0.05, M.dark, -s * 0.012, 0.15, z));
    fa.add(fShell);

    const fist = J(fa, [s * 0.19, 0.62, 0.6], { lock: true,
      kind: 'acc', ord: 7, robot: { p: [0, 0, 0.55], r: [0, 0, s * H] }, truck: { p: [0, -0.75, 0.45] },
      say: { robot: s > 0 ? 'Fists slide out and twist into place' : null, truck: s > 0 ? 'Robot fists slide out front as the bumper' : null }, stowSay: s > 0 ? 'Fists pull back in' : null
    });
    fist.add(box(0.34, 0.36, 0.42, M.gun));
    fist.add(box(0.36, 0.1, 0.08, M.dark, 0, 0.1, 0.2), box(0.36, 0.1, 0.08, M.dark, 0, -0.04, 0.2));
    fist.add(box(0.08, 0.14, 0.22, M.gun, -s * 0.19, -0.1, 0.08));

    // Front rail trucks live in the forearms
    railTruck(fa, s, [s * 0.36, 0.55, 0.35], s > 0 ? 'Little front wheels drop down' : null);

    // Cowcatcher half: hidden in the forearm, slides down and forward; the two halves meet in a V
    const cc = J(fa, [0, 0.55, 0.45], { lock: true,
      kind: 'acc', ord: 3, train: { p: [0, -0.8, 0.65], r: [0, s * 0.5, 0] }, truck: { p: [0, 0.2, 0.52] },
      say: { train: s > 0 ? 'Cowcatcher slides out under the nose' : null, truck: s > 0 ? 'Cowcatcher halves line up flat as the grille' : null }, stowSay: s > 0 ? 'Cowcatcher tucks away' : null
    });
    cc.add(box(0.38, 0.5, 0.05, M.livery, s * 0.19, 0, 0));
    for (const y of [-0.15, 0, 0.15]) cc.add(box(0.36, 0.04, 0.06, M.iron, s * 0.19, y, 0.01));

    // Truck front wheel, fender and chrome grille half

    // Smokestack half: the two halves rise out of the forearms and meet as one round stack
    const st = J(fa, [0, 0.55, 0.6], { lock: true,
      kind: 'acc', ord: 2, train: { p: [0, 0.72, 0] }, tractor: { p: [0, 0.72, 0] },
      say: { train: s > 0 ? 'Smokestack halves rise up and lock together' : null, tractor: s > 0 ? 'Smokestack halves rise up through the hood' : null }, stowSay: s > 0 ? 'Smokestack halves sink back in' : null
    });
    if (s > 0) stackJ = st;
    st.add(halfTube(s, 0.17, 0.13, 0.55, M.iron));
    st.add(halfTube(s, 0.22, 0.2, 0.08, M.iron).translateY(0.3));
    st.add(halfTube(s, 0.225, 0.225, 0.03, M.brass).translateY(0.25));
    const sc = new THREE.Mesh(new THREE.CircleGeometry(0.2, 18, s > 0 ? -H : H, PI), M.dark); sc.rotation.x = -H; sc.position.y = 0.32; st.add(sc);
    // Headlamp half
    const hl = J(fa, [0, 0.55, 0.78], { kind: 'acc', ord: 2.2, train: { p: [0, 0.5, 0] }, tractor: { p: [s * 0.45, 0.2, 0.25] }, truck: { p: [s * 0.8, 0.3, 0.14] }, say: { train: s > 0 ? 'Big headlamp pops up' : null, truck: s > 0 ? 'The locomotive headlamp splits into two headlights' : null } });
    hl.add(box(0.11, 0.2, 0.2, M.iron, s * 0.055, 0, 0), box(0.09, 0.14, 0.02, M.head, s * 0.05, 0, 0.105), box(0.12, 0.03, 0.24, M.brass, s * 0.06, 0.11, 0));

    if (s > 0) {
      const ng = named.gear[named.gear.push(null) - 1] = J(fa, [0.12, 0.35, 0.65], {
        kind: 'acc', ord: 0, stow: { r: [H, 0, 0] }, robot: { r: [H, 0, 0] }, train: { r: [H, 0, 0] }, rocket: { r: [H, 0, 0] }, truck: { r: [H, 0, 0] }
      });
      ng.add(gear(0.5, 0.18, false));
    }
  }

  // ---------- legs (rear fuselage halves): hip slide, hip pitch, knee, ankle ----------
  for (const s of [1, -1]) {
    const leg = J(root, [0, 0, 0], {
      ord: 1, robot: { p: [s * 0.14, 0, 0] }, truck: { p: [s * 0.5, 0.25, -7.5] }, tractor: { p: [s * 0.1, -0.1, -1.6], r: [0, -s * 0.3, 0] },
      say: { robot: s > 0 ? 'Rear cabin splits into two legs' : null, truck: s > 0 ? 'Legs slide way back to carry the trailer' : null, tractor: s > 0 ? 'Back half slides out and becomes the plow' : null }
    });
    const thigh = J(leg, [0, 0, 0], { ord: 8, robot: { r: [-0.3, 0, 0] }, tractor: { r: [-0.16, 0, 0] }, say: { robot: s > 0 ? 'Knees flex into a battle stance' : null, tractor: s > 0 ? 'Plow tips down behind the tractor' : null } });
    (named.thighs = named.thighs || []).push(thigh);
    const tShell = shell(s, 0.55, 0.55, 1.3, true).translateZ(-0.65);
    tShell.add(decal(tex && tex.word, 1.15, 0.15, [s * 0.565, -0.14, 0.02], [s, 0, 0], [0, 1, 0]));
    tShell.add(box(0.02, 0.12, 0.18, M.dark, s * 0.12, 0.6, 0.2));
    thigh.add(tShell);
    railTruck(thigh, s, [s * 0.36, 0, -0.75], null, true);
    const coal = J(thigh, [s * 0.22, 0, -0.65], { kind: 'acc', ord: 3, train: { p: [0, 0.42, 0] }, truck: { p: [0, 0.8, 0] }, say: { train: s > 0 ? 'Coal heaps up in the tender' : null, truck: s > 0 ? 'The train\'s coal rides along in the truck bed' : null } });
    for (let k = 0; k < 7; k++) {
      const lump = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11 + (k % 3) * 0.03, 0), M.coal);
      lump.position.set(s * (0.04 * (k % 3) - 0.04), 0.06 + 0.05 * (k % 2), -0.4 + k * 0.13); lump.rotation.set(k, k * 2, 0); coal.add(lump);
    }
    const kc = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.5, 20).rotateZ(H), M.gun);
    kc.position.set(s * 0.25, 0, -1.3); thigh.add(kc);                                        // knee axle

    const knee = J(thigh, [0, 0, -1.3], { ord: 8, robot: { r: [0.6, 0, 0] } });
    named.legs = named.legs || []; named.legs.push({ thigh, knee, s });
    const sShell = shell(s, 0.55, 0.55, 1.3, true); sShell.position.set(0, 0, -0.65);
    sShell.add(box(0.34, 0.05, 0.4, M.gun, s * 0.2, -0.54, 0.4), box(0.2, 0.02, 0.16, M.livery, s * 0.2, -0.57, 0.4));
    for (const z of [0.05, -0.1, -0.25]) sShell.add(box(0.26, 0.02, 0.06, M.dark, s * 0.2, 0.545, z));
    knee.add(sShell);
    // GIANT: knee guards slide forward out of the shins
    bigPart(knee, [s * 0.27, -0.28, -0.3], [s * 0.27, -0.6, -0.3], box(0.3, 0.06, 0.45, M.gun), box(0.06, 0.07, 0.3, M.livery, 0, -0.005, 0), box(0.2, 0.065, 0.04, M.glow, 0, -0.005, -0.18));

    // Rear rail trucks live in the shins
    railTruck(knee, s, [s * 0.36, 0, -0.7], null, true);

    // Robot feet: a heel block and a toe block ride inside each shin and slide out
    // under the ankle, standing level on the stabilizer soles.
    const heel = J(knee, [s * 0.27, 0, -0.35], { lock: true, kind: 'acc', ord: 2.6, robot: { p: [-s * 0.05, 0.2154, -2.3841], r: [1.2708, 0, 0] },
      say: { robot: s > 0 ? 'Heel blocks slide down out of the shins' : null }, stowSay: s > 0 ? 'Feet slide back up into the shins' : null });
    heel.add(box(0.46, 0.26, 0.45, M.gun, 0, -0.01, 0), box(0.47, 0.08, 0.04, M.dark, 0, 0, -0.22), box(0.04, 0.1, 0.3, M.livery, s * 0.22, 0.02, 0));
    const toeB = J(knee, [s * 0.27, 0, -1.0], { lock: true, kind: 'acc', ord: 2.5, robot: { p: [-s * 0.05, -0.2861, -1.579], r: [1.2708, 0, 0] },
      say: { robot: s > 0 ? 'Toe blocks slide out and lock in front' : null } });
    toeB.add(box(0.48, 0.28, 0.55, M.gun));
    for (const x of [-0.08, 0.08]) toeB.add(box(0.025, 0.02, 0.3, M.dark, x, 0.145, 0.12), box(0.025, 0.2, 0.02, M.dark, x, 0.03, 0.28));
    toeB.add(box(0.5, 0.06, 0.06, M.dark, 0, -0.12, 0.27));

    // Tail fin halves: calves in robot, a flat roof spoiler on the train, splayed fins on the rocket
    const fj = J(knee, [0, 0.5, -0.6], {
      kind: 'acc', ord: 2, robot: { p: [s * 0.2, -0.98, 0.2], S: [1, 0.62, 0.55] }, tractor: { p: [s * 0.2, -0.98, 0.2], S: [1, 0.62, 0.55] }, train: { p: [0, -1.45, 0] }, rocket: { r: [0, 0, -s * 0.7] },
      say: { robot: s > 0 ? 'Tail fin halves slide away inside the shins' : null, train: s > 0 ? 'Tail fin slides down into the body' : null, truck: null,
             rocket: s > 0 ? 'Tail fins angle out for stability' : null }, stowSay: s > 0 ? 'Tail fin halves close up' : null
    });
    const fs = new THREE.Shape();
    fs.moveTo(0, 0); fs.lineTo(1.4, 0); fs.lineTo(2.2, 1.5); fs.lineTo(1.6, 1.5); fs.lineTo(0, 0);
    const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.04, bevelEnabled: false });
    fg.rotateY(H); if (s < 0) fg.translate(-0.04, 0, 0);
    const fin = new THREE.Mesh(fg, M.livery); fin.position.z = 0.6; fj.add(fin);
    fj.add(decal(tex && tex.emblem, 0.55, 0.55, [s * 0.045, 0.72, -0.75], [s, 0, 0], [0, 1, 0]));

    // Foot = tail cone half
    const foot = J(knee, [0, 0, -1.9], {
      ord: 3, say: {}
    });
    named.feet = named.feet || []; named.feet.push(foot);
    foot.add(shell(s, 0.55, 0.12, 1.2, false));


    const sj = J(foot, [s * 0.15, 0.1, -0.2], {
      ord: 3.5, robot: { p: [(s > 0 ? 0.1 : -0.16) - s * 0.15, -s * 0.25 - 0.1, 0.95], r: [s * H, 0, -H] }, train: { r: [0, 0, -s * H] }, truck: { r: [0, -s * H, 0] }, tractor: { r: [0, 0, -s * 0.5] },
      say: { robot: s > 0 ? 'Stabilizers fold away inside the ankles' : null, train: s > 0 ? 'Stabilizers fold down into a rear skirt' : null, truck: null }
    });
    sj.add(new THREE.Mesh(wingGeo(s, 1.3, 0.8, 0.3, 0.7, 0.06), M.white));

    if (s < 0) {
      // Rocket bell: stored inside the wide end of the tail cone, slides out the back
      const bell = J(foot, [-0.22, 0, 0.4], {
        kind: 'acc', ord: 2, rocket: { p: [0.22, 0, -1.2] },
        say: { rocket: 'Rocket nozzle slides out of the tail' }, stowSay: 'Rocket nozzle slides back in'
      });
      bell.add(tube(0.12, 0.3, 0.5, M.gun));
      const lip = tube(0.31, 0.31, 0.05, M.livery); lip.position.z = -0.24; bell.add(lip);
      bell.add(tube(0.1, 0.1, 0.02, M.glow));
      bell.add(flame(0.32, 4.0).translateZ(-0.26));
    }
  }

  // ---------- cargo boxes: flat-packed in the belly, they pop open into SKYRENDER boxes in the trailer ----------
  // Stacked two high on top of the legs at the back, on both sides of the aisle Jr. drives down.
  const cargo = [];
  {
    const faceMat = tex && tex.box ? new THREE.MeshStandardMaterial({ map: tex.box, roughness: 0.9 }) : new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.9 });
    const tape = new THREE.MeshStandardMaterial({ color: 0xc8a676, roughness: 0.6 });
    let k = 0;
    for (const s of [1, -1]) for (const z of [-11.0, -10.45, -9.9]) for (const y of [1.03, 1.49]) {
      const pivot = [s * 0.2, -0.1, 0.3 + (k % 6) * 0.1];
      const bj = J(root, pivot, { kind: 'acc', ord: 1.5 + k * 0.01, plane: { S: [0.25, 0.04, 0.25] }, truck: { p: [s * 0.78 - pivot[0], y - pivot[1], z - pivot[2]], r: [0, (k % 3) * 0.04 - 0.04, 0], S: [1, 1, 1] },
        say: { truck: k === 0 ? 'Flat-packed SKYRENDER boxes pop open in the trailer' : null } });
      bj.add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.5), faceMat));
      bj.add(box(0.47, 0.012, 0.08, tape, 0, 0.222, 0));
      cargo.push(bj); k++;
    }
  }
  // Driver's airbag: folded flat in the steering column, only pops out in a crash
  const airbag = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 14), new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.8 }));
  airbag.position.set(-0.25, 1.05, 1.47); airbag.scale.setScalar(0.001); airbag.visible = false; root.add(airbag);

  // ---------- Skyrender Jr.: a tiny copy of the jet that rides inside the big body ----------
  // Folded small in the cabin floor in every mode. In big rig mode it rolls back to ride in the
  // trailer, and from there it can drive out the back doors and fly loops around the truck.
  const jrJ = J(root, [0, -0.12, 0.6], { kind: 'acc', ord: 0.9, plane: { S: [1.25, 1.25, 1.25] }, truck: { p: [0, 0.16, -6.8], r: [0, PI, 0] },
    say: { truck: 'Skyrender Jr., a tiny jet, rolls back to ride in the trailer' } });
  const jr = { j: jrJ, wings: [], gear: null, glow: [] };
  {
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.72, 16).rotateX(H), M.white); jrJ.add(fus);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 16).rotateX(H), M.white); nose.position.z = 0.49; jrJ.add(nose);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 16).rotateX(-H), M.white); tail.position.z = -0.47; jrJ.add(tail);
    jrJ.add(box(0.13, 0.05, 0.12, M.glass, 0, 0.06, 0.4));                                  // cockpit windows
    for (const x of [-1, 1]) jrJ.add(box(0.01, 0.025, 0.66, M.livery, x * 0.09, 0, 0));      // stripes
    const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(0.28, 0); fs.lineTo(0.4, 0.26); fs.lineTo(0.28, 0.26); fs.lineTo(0, 0);
    const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.02, bevelEnabled: false }); fg.rotateY(H); fg.translate(-0.01, 0, 0);
    const fin = new THREE.Mesh(fg, M.livery); fin.position.set(0, 0.07, -0.22); jrJ.add(fin);
    for (const x of [-1, 1]) jrJ.add(decal(tex && tex.emblem, 0.13, 0.13, [x * 0.012, 0.19, -0.42], [x, 0, 0], [0, 1, 0]));
    for (const s of [1, -1]) {
      const st = new THREE.Mesh(wingGeo(s, 0.2, 0.14, 0.06, 0.1, 0.015), M.white); st.position.set(s * 0.04, 0.02, -0.42); jrJ.add(st);
      const w = new THREE.Group(); w.position.set(s * 0.07, -0.03, 0.08); jrJ.add(w);
      w.add(new THREE.Mesh(wingGeo(s, 0.5, 0.3, 0.1, 0.26, 0.02), M.white));
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.2, 12).rotateX(H), M.white); eng.position.set(s * 0.2, -0.05, -0.02); w.add(eng);
      const eg = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), M.glow); eg.position.set(s * 0.2, -0.05, -0.121); eg.rotation.y = PI; w.add(eg); jr.glow.push(eg);
      w.add(box(0.03, 0.03, 0.03, s > 0 ? M.navG : M.navR, s * 0.5, 0.01, -0.12));
      w.rotation.y = s * H * 0.92;                                                           // folded back along the body
      jr.wings.push({ g: w, s });
    }
    const gear = new THREE.Group(); jrJ.add(gear); jr.gear = gear;
    for (const [x, z] of [[0, 0.33], [0.1, -0.08], [-0.1, -0.08]]) {
      gear.add(box(0.015, 0.1, 0.015, M.grey, x, -0.12, z));
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12).rotateZ(H), M.tire); wh.position.set(x, -0.17, z); gear.add(wh);
    }
    const jf = new THREE.Group(); jf.position.z = -0.58; jrJ.add(jf);
    for (const [rr, ll, mat] of [[0.06, 0.5, fOuter], [0.035, 0.3, fInner]]) { const c = new THREE.ConeGeometry(rr, ll, 14, 1, true); c.rotateX(-H); c.translate(0, 0, -ll / 2); jf.add(new THREE.Mesh(c, mat)); }
    jf.visible = false; jr.flame = jf;
  }

  // ---------- head (the nose) ----------
  const head = J(root, [0, 0, 3.6], {
    ord: 7, robot: { p: [0, -0.3, -1.3], r: [-H, 0, 0] }, train: { p: [0, 0, -0.95] }, truck: { p: [0, 0, -1.1] }, tractor: { p: [0, 0, -1.45] },
    say: { tractor: 'Nose slides back under the tractor hood', robot: 'Nose folds back, revealing the face', plane: 'Face folds away into the nose', train: 'Nose slides back into the boiler, leaving a smokebox door', truck: 'Nose slides back under the hood', rocket: 'Face folds away into the nose cone' }
  });
  const ngeo = new THREE.CylinderGeometry(0.1, 0.42, 1.1, 28); ngeo.rotateX(H); ngeo.translate(0, 0, 0.55);
  head.add(new THREE.Mesh(ngeo, M.white));
  for (const x of [-0.1, 0.1]) { const w = box(0.14, 0.06, 0.12, M.glass, x, 0.28, 0.3); w.rotation.x = -0.4; head.add(w); }
  for (const x of [-0.3, 0.3]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6).rotateX(H), M.grey); p.position.set(x, 0.05, 0.3); head.add(p); }  // pitot tubes
  for (const x of [-0.17, 0.17]) { const l = box(0.15, 0.08, 0.06, M.head, x, -0.12, 0.6); l.rotation.y = x > 0 ? 0.3 : -0.3; head.add(l); }   // headlights
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.42, 28), M.gun); face.rotation.y = PI; head.add(face);
  head.add(box(0.5, 0.09, 0.04, M.visor, 0, -0.1, -0.03));
  for (const s of [-1, 1]) { const h = box(0.06, 0.3, 0.06, M.livery, s * 0.26, -0.34, -0.04); h.rotation.z = s * 0.4; head.add(h); }

  const mask = J(head, [0, 0.14, -0.025], { kind: 'acc', ord: 6, plane: { p: [0, 0, 0.14] }, robot: { p: [0, 0, 0] }, say: { robot: 'Battle mask slides into place' } });
  mask.add(box(0.26, 0.12, 0.03, M.dark), box(0.2, 0.015, 0.035, M.grey, 0, 0.02, 0), box(0.2, 0.015, 0.035, M.grey, 0, -0.02, 0));

  for (const s of [1, -1]) {
    const ear = J(head, [s * 0.4, 0, 0.05], { kind: 'acc', ord: 6, robot: { r: [H * 0.8, 0, 0] }, say: { robot: s > 0 ? 'Antenna fins flip up' : null } });
    ear.add(box(0.03, 0.1, 0.35, M.livery, 0, 0, 0.175));
    (named.ears = named.ears || []).push(ear);
    bigPart(ear, [0, 0, 0.18], [0, 0, 0.46], box(0.02, 0.05, 0.3, M.livery), box(0.04, 0.04, 0.04, M.glow, 0, 0, 0.15));   // GIANT: antennas telescope taller
  }

  // GIANT: a row of power lights slides out of the belly armor
  bigPart(root, [0, -0.43, 0.72], [0, -0.6, 0.72], box(0.42, 0.05, 0.16, M.gun), ...[-0.14, 0, 0.14].map(x => box(0.09, 0.03, 0.08, M.glow, x, -0.02, 0)));
  bot.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
  const headJ = head;
  const cur = joints.map(j => ({ P: j.userData.poses[0].P.slice(), R: j.userData.poses[0].R.slice(), S: j.userData.poses[0].S.slice() }));
  return { bot, joints, cur, fans, flames, wheels, drivers, rods, truckWheels, navLights, M, head: headJ, stack: stackJ, sideDoor: sd, mask, named, truckBits, sizeBits, jr, cargo, airbag, tractorBits };
}

// ---------- morph planner ----------
// Build a plan from the current pose of every joint to `to` (a mode index).
function planMorph(rig, to, fromMode) {
  const EPS = 1e-4;
  const eq = (a, b) => a.P.every((v, i) => Math.abs(v - b.P[i]) < EPS) && a.R.every((v, i) => Math.abs(v - b.R[i]) < EPS) && a.S.every((v, i) => Math.abs(v - b.S[i]) < EPS);
  const copy = p => ({ P: p.P.slice(), R: p.R.slice(), S: p.S.slice() });
  const from = rig.cur.map(copy);
  const target = MODES[to];
  const A = [], B = [], C = [];
  rig.joints.forEach((j, i) => {
    const u = j.userData;
    if (u.kind === 'pulse') return;
    const cur = from[i], tgt = u.poses[to];
    if (eq(cur, tgt)) return;
    if (u.kind === 'acc') {
      if (!eq(cur, u.stow)) A.push({ i, a: cur, b: u.stow, ord: u.ord, label: u.stowSay, w: 'light', arc: u.arc, scale: 'last' });
      if (!eq(u.stow, tgt)) C.push({ i, a: u.stow, b: tgt, ord: u.ord, label: u.say[target], w: 'light', lock: u.lock, arc: u.arc, scale: u.arc ? 'first' : null });
    } else B.push({ i, a: cur, b: tgt, ord: u.ord, label: u.say[target], w: 'heavy', lock: u.lock });
  });
  // Parts sharing an `ord` move together; groups follow one another with overlap.
  const stagger = (list, t0, desc, per) => {
    if (!list.length) return t0;
    const ords = [...new Set(list.map(s => s.ord))].sort((x, y) => desc ? y - x : x - y);
    const G = ords.length, len = (0.8 + Math.min(per * G, 6.5)) * 0.88;   // a touch quicker, to pay for the holds between phases
    const d = Math.min(1, Math.max(0.3, 1.8 / G));
    for (const s of list) {
      const k = ords.indexOf(s.ord);
      const st = G === 1 ? 0 : k / (G - 1) * (1 - d);
      s.t0 = t0 + st * len; s.t1 = s.t0 + d * len;
    }
    return t0 + len;
  };
  // Leaving robot mode undoes the robot unfold in reverse order.
  const reverse = to !== 1 && (fromMode === 1 || fromMode == null);
  // Short holds between phases: little parts tuck away, a beat, the body changes shape, a beat to see
  // the new outline, then the details come out.
  const HOLD_AB = 0.15, HOLD_BC = 0.3;
  const endA = stagger(A, 0, true, 0.4);
  const startB = A.length ? endA + HOLD_AB : 0;
  const endB = stagger(B, startB, reverse, 0.6);
  const startC = B.length ? endB + HOLD_BC : Math.max(0, startB);
  const endC = stagger(C, startC, false, 0.4);
  const segs = rig.joints.map(() => []);
  for (const s of [...A, ...B, ...C]) segs[s.i].push(s);
  // Pulse doors open just before their part moves and close right after.
  rig.joints.forEach((j, i) => {
    const u = j.userData;
    if (u.kind !== 'pulse') return;
    const ref = segs[rig.joints.indexOf(u.pulse)];
    const closed = u.poses[0];
    let last = from[i];
    for (const r of ref) {
      segs[i].push({ a: last, b: u.open, t0: Math.max(0, r.t0 - 0.4), t1: r.t0 + 0.05 });
      segs[i].push({ a: u.open, b: closed, t0: r.t1, t1: r.t1 + 0.4 });
      last = closed;
    }
    if (!ref.length && !eq(last, closed)) segs[i].push({ a: last, b: closed, t0: 0, t1: 0.4 });
  });
  for (const list of segs) list.sort((x, y) => x.t0 - y.t0);
  const T = Math.max(endA, endB, endC, ...segs.flat().map(s => s.t1), 0.01);
  const allSteps = [...A, ...B, ...C].filter(s => s.label).map(s => ({ at: s.t0, label: s.label })).sort((x, y) => x.at - y.at);
  // While it plays, a caption stays up at least a second, long enough for a fast reader; scrubbing shows every step.
  const steps = []; for (const st of allSteps) if (!steps.length || st.at - steps[steps.length - 1].at >= 1.0) steps.push(st);
  const locks = [...B, ...C].filter(s => s.lock).map(s => s.t1).sort((x, y) => x - y);   // moments parts click into place
  return { to, from, segs, steps, allSteps, locks, T };
}

// Pose every joint at time t (seconds) into a plan.
function poseRig(rig, plan, t, ease) {
  const c01 = x => Math.min(1, Math.max(0, x));
  rig.joints.forEach((j, i) => {
    let v = plan.from[i];
    for (const s of plan.segs[i]) {
      if (t <= s.t0) break;
      const u = c01((t - s.t0) / (s.t1 - s.t0));
      const k = s.w === 'heavy' ? (u < 0.5 ? 16 * u ** 5 : 1 - (-2 * u + 2) ** 5 / 2) : s.w === 'light' ? 1 - (1 - u) ** 3 : ease(u);
      // a climbing figure: up and over on an arc (zero at both ends, so poses stay exact), full size while still hidden
      const ks = s.arc ? (s.scale === 'first' ? c01(k / 0.4) : c01((k - 0.6) / 0.4)) : k;
      v = {
        P: s.a.P.map((x, n) => x + (s.b.P[n] - x) * k + (n === 1 && s.arc ? s.arc * 4 * k * (1 - k) : 0)),
        R: s.a.R.map((x, n) => x + (s.b.R[n] - x) * k),
        S: s.a.S.map((x, n) => x + (s.b.S[n] - x) * ks)
      };
      if (k < 1) break;
    }
    j.position.set(v.P[0], v.P[1], v.P[2]); j.rotation.set(v.R[0], v.R[1], v.R[2]); j.scale.set(v.S[0], v.S[1], v.S[2]);
    rig.cur[i] = v;
  });
  // Visor glows only while the face is showing
  const hk = c01(-rig.cur[rig.joints.indexOf(rig.head)].R[0] / (Math.PI / 2));
  rig.M.visor.emissiveIntensity = 0.1 + 1.8 * Math.pow(hk, 3);
}
// Exact world-space bounds from vertices (Box3.setFromObject in r128 pads rotated boxes).
// The toy's exact outline: the box around every corner point of every part, as placed right now.
// To keep it quick, each part remembers its own box and only measures again when it has moved, and each
// shape is measured from its distinct corner points (shapes repeat corners where faces meet). The result is
// exactly the same box, because a box around boxes is the box around all their points.
const boxCache = new WeakMap(), cornerCache = new WeakMap();
function corners(pos) {
  let c = cornerCache.get(pos);
  if (c && c.version === pos.version) return c.pts;
  const seen = new Set(), pts = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), k = x + ',' + y + ',' + z;
    if (!seen.has(k)) { seen.add(k); pts.push(x, y, z); }
  }
  c = { version: pos.version, pts: new Float32Array(pts) }; cornerCache.set(pos, c);
  return c.pts;
}
function exactBox(THREE, root, skip) {
  const box = new THREE.Box3(), v = new THREE.Vector3();
  root.traverse(o => {
    if (!o.isMesh || (skip && skip.has(o))) return;
    const pos = o.geometry.attributes.position, e = o.matrixWorld.elements;
    let c = boxCache.get(o);
    if (!c || c.pos !== pos || c.version !== pos.version || c.e.some((x, n) => x !== e[n])) {
      const pts = corners(pos), b = new THREE.Box3();
      for (let i = 0; i < pts.length; i += 3) b.expandByPoint(v.set(pts[i], pts[i + 1], pts[i + 2]).applyMatrix4(o.matrixWorld));
      c = { pos, version: pos.version, e: e.slice(), b }; boxCache.set(o, c);
    }
    if (!c.b.isEmpty()) box.union(c.b);
  });
  return box;
}

export { MODES, buildRig, exactBox, planMorph, poseRig };
