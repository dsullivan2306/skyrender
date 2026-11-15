import * as THREE from 'three';
import { glow, groundSet } from '../world/setup.js';
import { signTex } from '../people/people.js';

// ---------- home: the Skyrender Garage for the vehicles and a house for the robot ----------
// Rises out of the ground at bedtime. The garage door sits straight ahead of the toy; the whole
// set slides sideways so the robot's house door lines up instead when it's the robot going home.
const homeSet = new THREE.Group(); groundSet.add(homeSet); homeSet.visible = false;
const home = { garageDoor: null, houseDoor: null, GZ: 7, GD: 22, HZ: 7, HD: 10, HOUSE_X: -17, lights: [] };
{
  const S = (c, r = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const add = (geo, mat, x, y, z, parent = homeSet) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const warm = glow(new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffc870, emissiveIntensity: 0.25 }), 0.25);
  home.lights.push(warm);
  // driveway, lawn and a stone path to the robot's front door
  add(B(13, 0.04, 40), S(0xb9b5ab), 0, 0.02, -8);
  add(B(60, 0.03, 60), S(0x7f9c5c), -6, 0.01, 0).receiveShadow = true;
  for (let i = 0; i < 9; i++) add(B(2.2, 0.05, 1.1), S(0xa39d90), home.HOUSE_X + (i % 2) * 0.4, 0.03, -14 + i * 2.3);
  // ----- the garage: a tall, deep building with one big roll-up door -----
  const { GZ, GD } = home, GW = 14, GH = 12.5, DW = 11, DH = 11;
  const wallM = S(0xe9e4d8), trimM = S(0x7a2430), roofM = S(0x3d4247);
  add(B(GW, GH, 0.4), wallM, 0, GH / 2, GZ + GD);                                        // back wall
  for (const sx of [-1, 1]) add(B(0.4, GH, GD), wallM, sx * GW / 2, GH / 2, GZ + GD / 2); // side walls
  for (const sx of [-1, 1]) add(B((GW - DW) / 2, GH, 0.4), wallM, sx * (DW / 2 + (GW - DW) / 4), GH / 2, GZ);   // front wall beside the door
  add(B(DW, GH - DH, 0.4), wallM, 0, DH + (GH - DH) / 2, GZ);                             // header over the door
  add(B(GW + 0.3, 0.5, 0.5), trimM, 0, DH + 0.25, GZ - 0.1);                              // red trim band
  for (const sx of [-1, 1]) add(B(0.5, DH, 0.5), trimM, sx * (DW / 2 + 0.25), DH / 2, GZ - 0.1);
  // gable roof
  const rs = new THREE.Shape(); rs.moveTo(-GW / 2 - 0.5, 0); rs.lineTo(0, 4); rs.lineTo(GW / 2 + 0.5, 0); rs.closePath();
  const rg = new THREE.ExtrudeGeometry(rs, { depth: GD + 1, bevelEnabled: false }); rg.translate(0, GH, GZ - 0.5);
  const roof = new THREE.Mesh(rg, roofM); roof.castShadow = true; homeSet.add(roof);
  add(B(GW, 0.2, GD), S(0x8d8a82), 0, 0.05, GZ + GD / 2);                                // garage floor
  for (const sx of [-1, 1]) for (const z of [0.3, 0.6]) add(B(0.1, 2.2, 3), warm, sx * (GW / 2 + 0.21), 7, GZ + GD * z);   // side windows
  const lamp = add(B(0.8, 0.3, 0.4), warm, 0, GH - 0.35, GZ - 0.4);
  // sign with the crest
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.2), new THREE.MeshStandardMaterial({ map: signTex('SKYRENDER GARAGE', '#7a2430', '#f3efe6', 1024, 140, 92), roughness: 0.7 }));
  sign.position.set(0, GH - 0.65, GZ - 0.22); sign.rotation.y = Math.PI; homeSet.add(sign);
  // roll-up door: horizontal slats that slide up into the header
  const door = new THREE.Group(); door.position.set(0, 0, GZ - 0.05); homeSet.add(door);
  const slatM = S(0xf4f1ea, 0.6), lineM = S(0xb8b3a6);
  for (let i = 0; i < 10; i++) { add(B(DW - 0.1, DH / 10 - 0.04, 0.12), slatM, 0, DH / 20 + i * DH / 10, 0, door); add(B(DW - 0.1, 0.05, 0.14), lineM, 0, i * DH / 10, 0, door); }
  add(B(1.4, 0.18, 0.2), S(0x5c6266), 0, 0.9, -0.1, door);                                // handle
  home.garageDoor = door; home.DH = DH;
  // ----- the robot's house: a cozy cottage with a big front door -----
  const hx = home.HOUSE_X, HZ = home.HZ, HD = home.HD, HW = 9, HH = 7, RW = 3.8, RH = 5.8;
  const hwall = S(0xcfdde3), hroof = S(0x7a2430);
  const hg = new THREE.Group(); hg.position.x = hx; homeSet.add(hg);
  add(B(HW, HH, 0.35), hwall, 0, HH / 2, HZ + HD, hg);
  for (const sx of [-1, 1]) add(B(0.35, HH, HD), hwall, sx * HW / 2, HH / 2, HZ + HD / 2, hg);
  for (const sx of [-1, 1]) add(B((HW - RW) / 2, HH, 0.35), hwall, sx * (RW / 2 + (HW - RW) / 4), HH / 2, HZ, hg);
  add(B(RW, HH - RH, 0.35), hwall, 0, RH + (HH - RH) / 2, HZ, hg);
  const hs = new THREE.Shape(); hs.moveTo(-HW / 2 - 0.6, 0); hs.lineTo(0, 3.6); hs.lineTo(HW / 2 + 0.6, 0); hs.closePath();
  const hrg = new THREE.ExtrudeGeometry(hs, { depth: HD + 1.2, bevelEnabled: false }); hrg.translate(0, HH, HZ - 0.6);
  const hr = new THREE.Mesh(hrg, hroof); hr.castShadow = true; hg.add(hr);
  add(B(0.9, 2.6, 0.9), S(0x8a5a44), -2.6, HH + 2, HZ + HD * 0.6, hg);                   // chimney
  add(B(HW, 0.15, HD), S(0x9a8a74), 0, 0.05, HZ + HD / 2, hg);
  for (const sx of [-1, 1]) { add(B(1.4, 1.5, 0.12), warm, sx * 3.1, 3.8, HZ - 0.2, hg); add(B(1.6, 0.15, 0.4), S(0xf2efe6), sx * 3.1, 2.95, HZ - 0.35, hg);
    add(B(1.5, 0.35, 0.45), S(0x6b4f35), sx * 3.1, 2.7, HZ - 0.45, hg); for (let f = 0; f < 4; f++) add(new THREE.SphereGeometry(0.12, 8, 6), S([0xd94a5a, 0xf2c94c, 0xa64ac9, 0xf2efe6][f]), sx * 3.1 - 0.5 + f * 0.33, 2.95, HZ - 0.5, hg); }
  add(B(0.5, 0.35, 0.3), warm, 2.6, 5.4, HZ - 0.3, hg);                                  // porch light
  const hsign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.8), new THREE.MeshStandardMaterial({ map: signTex("SKYRENDER'S HOUSE", '#2f5d4a', '#f3efe6', 768, 130, 74), roughness: 0.7 }));
  hsign.position.set(0, RH + 0.55, HZ - 0.2); hsign.rotation.y = Math.PI; hg.add(hsign);
  // front door hinged on its left edge, with a round window and a knob
  const hdoor = new THREE.Group(); hdoor.position.set(-RW / 2, 0, HZ - 0.05); hg.add(hdoor);
  add(B(RW, RH, 0.18), S(0x3d6b8a, 0.6), RW / 2, RH / 2, 0, hdoor);
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), warm); win.position.set(RW / 2, RH * 0.72, -0.1); win.rotation.y = Math.PI; hdoor.add(win);
  add(new THREE.SphereGeometry(0.12, 10, 8), S(0xd8b04a, 0.3), RW - 0.4, 2.6, -0.15, hdoor);
  home.houseDoor = hdoor;
  // mailbox by the path
  const mb = new THREE.Group(); mb.position.set(hx + 3.2, 0, -6); homeSet.add(mb);
  add(B(0.12, 1.1, 0.12), S(0x6b5139), 0, 0.55, 0, mb);
  add(B(0.45, 0.4, 0.7), S(0x7a2430), 0, 1.2, 0, mb);
}

export { home, homeSet };
