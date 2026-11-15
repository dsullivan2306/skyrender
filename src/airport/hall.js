import * as THREE from 'three';
import { groundSet } from '../world/setup.js';
import { makePerson, makeSuitcase, signTex } from '../people/people.js';

// ---------- inside the airport: Jasper Junction Airport's big terminal hall ----------
// A doll-house cutaway (glass roof frame, no lid) so you can look down inside. It rises up at the end
// of the runway; the plane can roll in through the big glass gate doors.
const hallSet = new THREE.Group(); groundSet.add(hallSet); hallSet.visible = false;
const hall = { Z: 10, D: 26, W: 28, travelers: [], bags: [], doors: [] };
{
  const S = (c, r = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const add = (geo, mat, x, y, z, parent = hallSet) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const { Z, D, W } = hall, WH = 7, OW = 12, OH = 6;
  // checkered terrazzo floor
  const fc = document.createElement('canvas'); fc.width = fc.height = 128; const fg = fc.getContext('2d');
  fg.fillStyle = '#d9d2c4'; fg.fillRect(0, 0, 128, 128); fg.fillStyle = '#a99f8e'; fg.fillRect(0, 0, 64, 64); fg.fillRect(64, 64, 64, 64);
  const ft = new THREE.CanvasTexture(fc); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(W / 2, D / 2);
  add(B(W, 0.12, D), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.4 }), 0, 0.06, Z + D / 2);
  // yellow lead-in line the plane follows to its parking spot
  add(B(0.25, 0.13, D - 4), S(0xe8b93a, 0.7), 0, 0.065, Z + D / 2 - 1);
  const wallM = S(0xeae6dc), frameM = S(0x5c6266, 0.4);
  const glassM = new THREE.MeshStandardMaterial({ color: 0x9fc4d8, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
  add(B(W, WH, 0.4), wallM, 0, WH / 2, Z + D);                                                  // back wall
  for (const sx of [-1, 1]) {
    add(B(0.4, 2.2, D), wallM, sx * W / 2, 1.1, Z + D / 2);                                     // low side walls
    add(B(0.1, WH - 2.2, D), glassM, sx * W / 2, 2.2 + (WH - 2.2) / 2, Z + D / 2);              // tall side windows
    add(B(0.3, WH - 2.2, 0.25), frameM, sx * W / 2, 2.2 + (WH - 2.2) / 2, Z + D / 2);
    // front glass wall beside the gate opening
    const fw = (W - OW) / 2;
    add(B(fw, WH, 0.12), glassM, sx * (OW / 2 + fw / 2), WH / 2, Z);
    for (let k = 0; k <= 3; k++) add(B(0.2, WH, 0.25), frameM, sx * (OW / 2 + k * fw / 3), WH / 2, Z);
  }
  add(B(OW, WH - OH, 0.4), wallM, 0, OH + (WH - OH) / 2, Z);                                    // header over the gate
  for (const k of [0, 6]) add(B(W, 0.2, 0.25), frameM, 0, WH, Z + k * D / 6);                    // open roof, just the rim, so you can look in
  for (const sx of [-1, 1]) add(B(0.25, 0.2, D), frameM, sx * W / 2, WH, Z + D / 2);
  // sliding glass gate doors: two halves that slide apart
  for (const sx of [-1, 1]) {
    const dg = new THREE.Group(); dg.position.set(sx * OW / 4, 0, Z); hallSet.add(dg); hall.doors.push({ g: dg, sx, x0: sx * OW / 4 });
    add(B(OW / 2 - 0.1, OH, 0.1), glassM, 0, OH / 2, 0, dg);
    add(B(OW / 2, 0.2, 0.2), frameM, 0, OH - 0.1, 0, dg); add(B(0.2, OH, 0.2), frameM, sx * (OW / 4 - 0.1), OH / 2, 0, dg);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 0.9), new THREE.MeshStandardMaterial({ map: signTex('JASPER JUNCTION AIRPORT', '#1f4f8a', '#ffffff', 1024, 92, 64), roughness: 0.7 }));
  sign.position.set(0, OH + 0.5, Z - 0.22); sign.rotation.y = Math.PI; hallSet.add(sign);
  // departures board on the back wall
  const bc = document.createElement('canvas'); bc.width = 1024; bc.height = 512; const bg = bc.getContext('2d');
  const drawBoard = () => {
    bg.fillStyle = '#14181d'; bg.fillRect(0, 0, 1024, 512);
    bg.fillStyle = '#e8b93a'; bg.font = '800 56px Karla, Arial, sans-serif'; bg.fillText('DEPARTURES', 40, 72);
    const rows = [['SKY 1', 'SKYRENDER SPACEPORT', 'BOARDING', '#7ddc6a'], ['SKY 5', 'JASPER JUNCTION', 'ON TIME', '#f2f2ee'], ['SKY 7', "JASPER'S FARM", 'ON TIME', '#f2f2ee'], ['SKY 9', 'THE MOON', 'DELAYED', '#ff7a5a'], ['SKY 12', 'NASHVILLE', 'ON TIME', '#f2f2ee']];
    bg.font = '700 40px Karla, Arial, sans-serif';
    rows.forEach(([f, to, st, c], i) => { const y = 150 + i * 72; bg.fillStyle = '#e8b93a'; bg.fillText(f, 40, y); bg.fillStyle = '#f2f2ee'; bg.fillText(to, 230, y); bg.fillStyle = c; bg.fillText(st, 760, y); });
  };
  drawBoard(); const bt = new THREE.CanvasTexture(bc);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawBoard(); bt.needsUpdate = true; });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.2), new THREE.MeshStandardMaterial({ map: bt, emissive: 0xffffff, emissiveMap: bt, emissiveIntensity: 0.6 }));
  board.position.set(0, 4.6, Z + D - 0.22); board.rotation.y = Math.PI; hallSet.add(board);
  // check-in counters on the left with SKYRENDER AIR signs
  const ctr = signTex('SKYRENDER AIR', '#7a2430', '#f3efe6', 512, 110, 66);
  for (let i = 0; i < 3; i++) {
    const z = Z + 13 + i * 3.6;
    add(B(1.2, 1.1, 2.6), S(0x7a2430, 0.5), 10.5, 0.55, z); add(B(1.3, 0.08, 2.7), S(0x2b2f33), 10.5, 1.12, z);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshStandardMaterial({ map: ctr })); sg.position.set(12.2, 2.4, z); sg.rotation.y = -Math.PI / 2; hallSet.add(sg);
    const agent = makePerson({ shirt: 0x7a2430, pants: 0x1b2a4a, skin: [0xd9a47a, 0x8c5a3c, 0xf0c8a0][i], hair: [0x2d2a26, 0x8a5a2a, 0x1d1b19][i] }); agent.position.set(11.6, 0.12, z); agent.rotation.y = -Math.PI / 2; hallSet.add(agent);
  }
  // gate seats on the right
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
    const x = -7 - r * 1.6, z = Z + 6 + c * 1.0;
    add(B(0.8, 0.12, 0.8), S(0x2f5d8a, 0.6), x, 0.5, z); add(B(0.12, 0.6, 0.8), S(0x2f5d8a, 0.6), x - 0.38, 0.8, z); add(B(0.1, 0.45, 0.1), frameM, x, 0.25, z);
  }
  const gate = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.8), new THREE.MeshStandardMaterial({ map: signTex('GATE 1', '#1f4f8a', '#ffffff', 384, 128, 80) }));
  gate.position.set(-6, 5.6, Z + 0.25); hallSet.add(gate);
  // baggage carousel in the back corner, suitcases riding round and round
  const cx = -8.5, cz = Z + D - 5;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.45, 8, 40), S(0x3a3f45, 0.5)); ring.rotation.x = Math.PI / 2; ring.scale.set(1, 0.55, 1); ring.position.set(cx, 0.55, cz); hallSet.add(ring);
  add(B(4, 0.8, 1.4), S(0x8d9196), cx, 0.4, cz);
  const bagC = [0xd94a5a, 0x2f8a6a, 0xf2c94c, 0x3f6e9a, 0x6b4f35, 0xa64ac9, 0x1d1d1d, 0xe07f3a];
  for (let i = 0; i < 8; i++) { const b = add(B(0.55, 0.38, 0.7), S(bagC[i], 0.5), 0, 0, 0); hall.bags.push({ m: b, a: i / 8 * Math.PI * 2, cx, cz }); }
}

// travelers and pilots walk loops around the hall, each pulling a suitcase
{
  const { Z } = hall, V = (x, z) => new THREE.Vector3(x, 0.12, z);
  const loops = [
    [V(6, Z + 3), V(9, Z + 12), V(8.5, Z + 22), V(6, Z + 24), V(5.6, Z + 12)],
    [V(-5.6, Z + 3), V(-6, Z + 14), V(-11, Z + 17), V(-12, Z + 5), V(-8, Z + 2.5)],
    [V(5.8, Z + 23), V(-5.8, Z + 24), V(-12, Z + 23), V(-5.8, Z + 24.5), V(6, Z + 24.2), V(12, Z + 24)]
  ].map(pts => new THREE.CatmullRomCurve3(pts, true));
  const look = [[0x3f6e9a, 0x2d3440], [0xd9a93a, 0x5b4636], [0x6b8f5a, 0x3a3f47], [0xa64a6a, 0x2d3440], [0x5a5f9a, 0x5b4636], [0xe07f3a, 0x2d3440], [0x2f8a6a, 0x3a3f47]];
  const skins = [0xd9a47a, 0x8c5a3c, 0xf0c8a0, 0x6b4630], hairs = [0x2d2a26, 0x8a5a2a, 0x1d1b19, 0xc9a24a];
  for (let i = 0; i < 10; i++) {
    const pilot = i % 4 === 3;                                                    // every fourth one is a pilot
    const p = pilot ? makePerson({ shirt: 0xf4f4f2, pants: 0x1b2a4a, hat: true, skin: skins[i % 4], hair: hairs[(i + 1) % 4] })
                    : makePerson({ shirt: look[i % 7][0], pants: look[i % 7][1], skin: skins[i % 4], hair: hairs[i % 4] });
    if (pilot) for (const sx of [-1, 1]) { const ep = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.14), new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: 0.6, roughness: 0.3 })); ep.position.set(sx * 0.16, 0.96, 0); p.add(ep); }
    const bag = makeSuitcase(pilot ? 0x1d1d1d : [0xd94a5a, 0x2f8a6a, 0xf2c94c, 0x3f6e9a, 0xa64ac9, 0x8a6a4a][i % 6]);
    bag.position.set(0.32, 0, -0.55); bag.rotation.x = -0.35; p.add(bag);
    p.userData.arms[1].rotation.x = 0;
    hallSet.add(p);
    hall.travelers.push({ p, curve: loops[i % 3], off: i * 0.137 % 1, speed: (pilot ? 0.9 : 0.75 + (i % 3) * 0.12), pilot });
  }
}

export { hall, hallSet };
