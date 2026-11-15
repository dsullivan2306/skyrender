// Checks the "one machine" rule numerically: morph between every pair of the 6 modes and confirm
// every joint lands exactly on its target pose. Pass = worst error near 1e-15.
// usage: node tests/rigtest.js [path/to/page.html]
const THREE = require('three'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'skyrender.html'), 'utf8');
const s = html.indexOf('\nconst MODES'), e = html.indexOf('\nfunction exactBox');
if (s < 0 || e < 0) { console.error('could not find rig code (const MODES ... function exactBox)'); process.exit(1); }
eval(html.slice(s, e) + '\n;global.buildRig=buildRig;global.planMorph=planMorph;global.poseRig=poseRig;global.MODES=MODES;');
const rig = buildRig(THREE, null), ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const err = m => Math.max(...rig.joints.map((j, i) => { const a = rig.cur[i], b = j.userData.kind === 'pulse' ? j.userData.poses[0] : j.userData.poses[m]; return Math.max(...a.P.map((v, k) => Math.abs(v - b.P[k])), ...a.R.map((v, k) => Math.abs(v - b.R[k]))); }));
let worst = 0; const N = MODES.length;
for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) { let q = planMorph(rig, a, null); poseRig(rig, q, q.T + 1, ease); q = planMorph(rig, b, a); poseRig(rig, q, q.T + 1, ease); worst = Math.max(worst, err(b)); }
console.log('modes', N, 'all pairs, worst error', worst.toExponential(1));
if (worst > 1e-9) process.exit(1);
