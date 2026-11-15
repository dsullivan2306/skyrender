import * as THREE from 'three';

// ---------- livery artwork (drawn, not loaded) ----------
function makeTextures() {
  const mk = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const tx = new THREE.CanvasTexture(c); tx.anisotropy = 4; return { tx, c, draw };
  };
  // Original team crest: a robot face inside a hexagonal badge.
  const emblem = mk(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = 118;
    const cream = '#efe9da', red = '#7a2430', dark = '#1c2024';
    g.beginPath();
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; g.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a)); }
    g.closePath(); g.fillStyle = red; g.fill(); g.lineWidth = 11; g.strokeStyle = cream; g.stroke();
    g.fillStyle = cream;
    // swept ear fins
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(cx + s * 54, cy - 6); g.lineTo(cx + s * 92, cy - 62); g.lineTo(cx + s * 84, cy + 8); g.lineTo(cx + s * 60, cy + 26); g.closePath(); g.fill();
    }
    // center crest blade
    g.beginPath(); g.moveTo(cx - 9, cy - 46); g.lineTo(cx, cy - 92); g.lineTo(cx + 9, cy - 46); g.closePath(); g.fill();
    // helmet: rounded dome tapering into a squared jaw
    g.beginPath();
    g.moveTo(cx - 56, cy - 4);
    g.quadraticCurveTo(cx - 58, cy - 62, cx, cy - 64);
    g.quadraticCurveTo(cx + 58, cy - 62, cx + 56, cy - 4);
    g.lineTo(cx + 46, cy + 56); g.lineTo(cx + 22, cy + 78); g.lineTo(cx - 22, cy + 78); g.lineTo(cx - 46, cy + 56);
    g.closePath(); g.fill();
    // visor band with a glowing line
    g.fillStyle = dark;
    g.beginPath(); g.moveTo(cx - 48, cy - 14); g.lineTo(cx + 48, cy - 14); g.lineTo(cx + 40, cy + 12); g.lineTo(cx - 40, cy + 12); g.closePath(); g.fill();
    g.fillStyle = '#ff5a3c'; g.fillRect(cx - 34, cy - 4, 68, 6);
    // brow notch and mouth grille
    g.fillStyle = red; g.beginPath(); g.moveTo(cx - 12, cy - 14); g.lineTo(cx, cy - 30); g.lineTo(cx + 12, cy - 14); g.closePath(); g.fill();
    g.fillStyle = dark;
    for (const x of [-16, 0, 16]) g.fillRect(cx + x - 4, cy + 34, 8, 28);
  });
  const word = mk(1024, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#7a2430';
    g.font = '600 92px Karla, "Helvetica Neue", Arial, sans-serif';
    g.textBaseline = 'middle';
    const text = 'SKYRENDER', gap = 14;
    let total = 0; for (const ch of text) total += g.measureText(ch).width + gap;
    let x = (w - total + gap) / 2;
    for (const ch of text) { g.fillText(ch, x, h / 2 + 4); x += g.measureText(ch).width + gap; }
  });
  // Redraw the title once the web font has loaded
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => {
    word.draw(word.c.getContext('2d'), word.c.width, word.c.height); word.tx.needsUpdate = true;
  });
  // Embossed letters across the truck's tailgate
  const tailgate = mk(1024, 220, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#efe9da'; g.font = '700 170px Karla, "Helvetica Neue", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const txt = 'JASPER', gap = 40; let total = 0; for (const ch of txt) total += g.measureText(ch).width + gap;
    let x = (w - total + gap) / 2;
    g.textAlign = 'left'; for (const ch of txt) { g.fillText(ch, x, h / 2 + 8); x += g.measureText(ch).width + gap; }
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { tailgate.draw(tailgate.c.getContext('2d'), tailgate.c.width, tailgate.c.height); tailgate.tx.needsUpdate = true; });
  // Trailer side artwork: one picture spread across all ten folding wall panels
  const trailer = mk(2048, 512, (g, w, h) => {
    const cream = '#f3efe6', red = '#7a2430', dark = '#22262b';
    g.fillStyle = cream; g.fillRect(0, 0, w, h);
    // maroon swoosh rising from the front bottom like a wing
    g.fillStyle = red;
    g.beginPath(); g.moveTo(0, h * 0.78); g.quadraticCurveTo(w * 0.35, h * 0.86, w, h * 0.6); g.lineTo(w, h * 0.72); g.quadraticCurveTo(w * 0.4, h * 0.95, 0, h * 0.9); g.closePath(); g.fill();
    g.fillStyle = dark; g.fillRect(0, h * 0.93, w, h * 0.07);
    // red and white reflective tape along the bottom rail
    for (let x = 0, k = 0; x < w; x += 64, k++) { g.fillStyle = k % 2 ? '#ffffff' : '#c8202e'; g.fillRect(x, h * 0.88, 64, h * 0.045); }
    // crest
    g.drawImage(emblem.c, 70, h * 0.13, 300, 300);
    // big name
    g.fillStyle = red; g.strokeStyle = dark; g.lineWidth = 6;
    g.font = '800 220px Karla, "Helvetica Neue", Arial, sans-serif'; g.textBaseline = 'middle';
    const txt = 'SKYRENDER', gap = 26; let total = 0; for (const ch of txt) total += g.measureText(ch).width + gap;
    let x = 430 + (w - 430 - total) / 2;
    for (const ch of txt) { g.strokeText(ch, x, h * 0.42); g.fillText(ch, x, h * 0.42); x += g.measureText(ch).width + gap; }
    g.fillStyle = dark; g.font = '700 46px Karla, "Helvetica Neue", Arial, sans-serif';
    g.fillText('JASPER JUNCTION FREIGHT CO.', 440, h * 0.68);
    g.font = '700 40px Karla, "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'right';
    g.fillText('FLEET No. 5', w - 60, h * 0.1); g.textAlign = 'left';
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { trailer.draw(trailer.c.getContext('2d'), trailer.c.width, trailer.c.height); trailer.tx.needsUpdate = true; });
  // Cardboard cargo box with the name stamped on every side
  const boxTex = mk(512, 512, (g, w, h) => {
    g.fillStyle = '#b5895a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(90,60,30,${0.05 + Math.random() * 0.06})`; g.fillRect(0, Math.random() * h, w, 2); }
    g.strokeStyle = '#6e4f2e'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
    g.drawImage(emblem.c, w / 2 - 90, 70, 180, 180);
    g.fillStyle = '#7a2430'; g.font = '800 78px Karla, "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('SKYRENDER', w / 2, 320);
    g.fillStyle = '#3d2a17'; g.font = '700 34px Karla, "Helvetica Neue", Arial, sans-serif'; g.fillText('THIS SIDE UP  ↑↑', w / 2, 410);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { boxTex.draw(boxTex.c.getContext('2d'), boxTex.c.width, boxTex.c.height); boxTex.tx.needsUpdate = true; });
  // SKYFLY lettering for the tractor hood (white letters, a gold stripe, on a clear background)
  const skyfly = mk(1024, 360, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#e8b93a'; g.fillRect(0, h * 0.78, w, h * 0.06);
    g.drawImage(emblem.c, 40, 40, 200, 200);
    g.fillStyle = '#f6f2e8'; g.strokeStyle = '#3a1418'; g.lineWidth = 8;
    g.font = '800 170px Karla, "Helvetica Neue", Arial, sans-serif'; g.textBaseline = 'middle';
    g.strokeText('SKYFLY', 270, 150); g.fillText('SKYFLY', 270, 150);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { skyfly.draw(skyfly.c.getContext('2d'), skyfly.c.width, skyfly.c.height); skyfly.tx.needsUpdate = true; });
  return { emblem: emblem.tx, word: word.tx, tailgate: tailgate.tx, trailer: trailer.tx, box: boxTex.tx, skyfly: skyfly.tx };
}

export { makeTextures };
