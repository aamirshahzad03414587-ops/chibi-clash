/* CHIBI CLASH skin: draws an anime chibi (big head, hair, eyes, outfit, boxing gloves) on the SAME joints the
   stick-fight engine animates (head, neck, hip, eF/hF, eB/hB, kF/fF, kB/fB). The motion is untouched; only the look changes.
   Classic script, loaded before game.js. Uses game.js globals (ctx/DC, TAU, PI, paintGlove, clock) only at draw time. */
'use strict';
const CHIBI = {
  HEAD: 2.05,        // chibi head radius = engine head radius (15*s) x this
  UP: 0.78,          // head centre sits this many head-radii above the neck (overlaps the shoulders = chibi)
  OUT: '#1b1016'
};
const HAIR_F = ['#2b1d16', '#5a3a22', '#e8c46a', '#d9485f', '#ff8fc2', '#7b5cff', '#3b82f6', '#f2f2f2', '#ff9f43', '#16a085'];
const HAIR_M = ['#1c1a20', '#3a2a1e', '#6b4a2b', '#e0b84a', '#4a6cff', '#c0392b', '#2ecc71', '#dcdde1', '#8e44ad', '#ff7f50'];
const SKINS = ['#ffe0c7', '#f9d2b0', '#f1c19b', '#e0a982', '#c98e66', '#a8714f'];
const EYES = ['#3b82f6', '#16a34a', '#9333ea', '#dc2626', '#0ea5e9', '#a16207', '#db2777', '#0f766e'];
const PANTS_M = ['#1f2937', '#273449', '#3b2f2f', '#111827', '#2f3e46'];
const SHOES = ['#2a1c18', '#7c3aed', '#5a2030', '#1e293b', '#f8fafc', '#b91c1c'];
function chibiHash(str) { let h = 2166136261; str = String(str || ''); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function shade(hex, k) {   // k<1 darker, k>1 lighter
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (k <= 1) { r *= k; g *= k; b *= k; } else { const t = k - 1; r += (255 - r) * t; g += (255 - g) * t; b += (255 - b) * t; }
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}
// per-viewer look: outfit = their name-tag colour (TEAMS[color].body) so tag and body always match
function makeLook(id, gender, outfit) {
  const h = chibiHash(id + '|' + gender), g = gender === 'female' ? 'female' : 'male';
  const pick = (a, k) => a[(h >>> k) % a.length];
  const top = outfit || '#ff4d3a';
  return {
    gender: g, top, topD: shade(top, 0.62), trim: shade(top, 1.55),
    hair: pick(g === 'female' ? HAIR_F : HAIR_M, 3), skin: pick(SKINS, 7), eye: pick(EYES, 11),
    bottom: g === 'female' ? shade(top, 0.45) : pick(PANTS_M, 13), shoes: pick(SHOES, 17),
    style: (h >>> 19) % 2, boss: false
  };
}
function bossLook() {
  return { gender: 'male', top: '#6d28d9', topD: '#3b0f7a', trim: '#c4b5fd', hair: '#1a1024', skin: '#c7b8ff', eye: '#ff2a1c', bottom: '#1e1036', shoes: '#0b0612', style: 1, boss: true };
}
function chibiHead(J) {
  const ux0 = J.head.x - J.neck.x, uy0 = J.head.y - J.neck.y, L = Math.hypot(ux0, uy0) || 1, ux = ux0 / L, uy = uy0 / L;
  const R = (J.hr || 15) * CHIBI.HEAD;
  return { x: J.neck.x + ux * R * CHIBI.UP, y: J.neck.y + uy * R * CHIBI.UP, R, ang: Math.atan2(uy, ux) + Math.PI / 2 };
}
// where the eyes are (for the engine's glowing-eye streak)
function chibiEyePos(J, face) {
  const H = chibiHead(J), c = Math.cos(H.ang), s = Math.sin(H.ang), lx = face * H.R * 0.32, ly = H.R * 0.1;
  return { x: H.x + lx * c - ly * s, y: H.y + lx * s + ly * c };
}
function cbLimb(g, a, b, w, col, s) {
  if (!a || !b) return;
  g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
  g.strokeStyle = CHIBI.OUT; g.lineWidth = w + 5 * s; g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.stroke();
}
function cbShoe(g, k, f, face, col, s, lod) {
  if (!k || !f) return;
  const a = Math.atan2(f.y - k.y, f.x - k.x);
  g.save(); g.translate(f.x, f.y); g.rotate(a - Math.PI / 2 * face);
  g.fillStyle = CHIBI.OUT; g.beginPath(); g.ellipse(4 * s, 0, 14.5 * s, 10 * s, 0, 0, TAU); g.fill();
  g.fillStyle = col; g.beginPath(); g.ellipse(4 * s, 0, 12 * s, 7.6 * s, 0, 0, TAU); g.fill();
  if (!lod) { g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(8 * s, -3 * s, 4 * s, 1.8 * s, 0, 0, TAU); g.fill(); }
  g.restore();
}
// expression: normal | angry | hurt | ko | happy | worried ; talk 0..1 opens the mouth
function chibiFace(g, R, L, expr, talk, lod) {
  const ey = R * 0.1, eyes = [[R * 0.08, 1], [R * 0.56, 0.78]];
  g.lineCap = 'round'; g.lineJoin = 'round';
  // blush
  if (!lod) {
  g.fillStyle = 'rgba(255,110,140,0.35)';
  g.beginPath(); g.ellipse(R * 0.02, R * 0.42, R * 0.15, R * 0.07, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(R * 0.66, R * 0.4, R * 0.1, R * 0.06, 0, 0, TAU); g.fill();
  }
  g.strokeStyle = CHIBI.OUT; g.fillStyle = CHIBI.OUT;
  for (const [ex, k] of eyes) {
    const w = R * 0.15 * k, h = R * 0.22;
    if (expr === 'hurt') {
      g.lineWidth = R * 0.07; const d = ex > R * 0.3 ? -1 : 1;   // > <
      g.beginPath(); g.moveTo(ex - w * d, ey - h * 0.7); g.lineTo(ex + w * d, ey); g.lineTo(ex - w * d, ey + h * 0.7); g.stroke();
    } else if (expr === 'ko') {
      g.lineWidth = R * 0.05; g.beginPath();
      for (let i = 0; i <= 26; i++) { const a = i * 0.55 + clock * 8, r = (i / 26) * w * 1.3; const x = ex + Math.cos(a) * r, y = ey + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    } else if (expr === 'happy') {
      g.lineWidth = R * 0.07; g.beginPath(); g.arc(ex, ey + h * 0.35, w, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    } else {
      g.fillStyle = CHIBI.OUT; g.beginPath(); g.ellipse(ex, ey, w * 1.12, h * 1.08, 0, 0, TAU); g.fill();
      g.fillStyle = L.eye; g.beginPath(); g.ellipse(ex, ey + h * 0.12, w * 0.86, h * 0.84, 0, 0, TAU); g.fill();
      if (!lod) { g.fillStyle = L.eyeD || (L.eyeD = shade(L.eye, 0.45)); g.beginPath(); g.ellipse(ex, ey + h * 0.2, w * 0.45, h * 0.5, 0, 0, TAU); g.fill(); }
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex - w * 0.3, ey - h * 0.35, w * 0.36, 0, TAU); g.fill();
      if (!lod) { g.beginPath(); g.arc(ex + w * 0.35, ey + h * 0.4, w * 0.16, 0, TAU); g.fill(); }
      if (L.boss) { g.fillStyle = 'rgba(255,40,30,0.5)'; g.beginPath(); g.ellipse(ex, ey, w * 1.3, h * 1.2, 0, 0, TAU); g.fill(); }
    }
    if (expr === 'angry') {   // slanted brows
      g.strokeStyle = CHIBI.OUT; g.lineWidth = R * 0.075;
      g.beginPath(); g.moveTo(ex - w * 1.2, ey - h * 1.25); g.lineTo(ex + w * 1.2, ey - h * 0.85); g.stroke();
    } else if (expr === 'worried') {
      g.strokeStyle = CHIBI.OUT; g.lineWidth = R * 0.06;
      g.beginPath(); g.moveTo(ex - w * 1.1, ey - h * 0.95); g.lineTo(ex + w * 1.1, ey - h * 1.35); g.stroke();
    }
  }
  // mouth
  const mx = R * 0.38, my = R * 0.55;
  g.fillStyle = '#7a1f2b'; g.strokeStyle = CHIBI.OUT; g.lineWidth = R * 0.05;
  if (talk > 0.05 || expr === 'angry' || expr === 'hurt' || expr === 'happy') {
    const o = Math.max(talk, expr === 'happy' ? 0.55 : expr === 'hurt' ? 0.45 : 0.35);
    g.beginPath(); g.ellipse(mx, my, R * (0.1 + 0.05 * o), R * (0.04 + 0.13 * o), 0, 0, TAU); g.fill(); g.stroke();
    if (expr === 'angry') { g.fillStyle = '#fff'; g.fillRect(mx - R * 0.1, my - R * 0.05, R * 0.2, R * 0.05); }
  } else if (expr === 'ko') {
    g.beginPath(); g.moveTo(mx - R * 0.1, my); g.quadraticCurveTo(mx, my - R * 0.08, mx + R * 0.1, my); g.stroke();
  } else {
    g.beginPath(); g.arc(mx, my - R * 0.06, R * 0.09, 0.2, Math.PI - 0.2); g.stroke();
  }
  if (expr === 'worried') {   // sweat drop
    g.fillStyle = '#9fdcff'; g.strokeStyle = CHIBI.OUT; g.lineWidth = R * 0.03;
    g.beginPath(); g.moveTo(-R * 0.45, -R * 0.35); g.quadraticCurveTo(-R * 0.62, -R * 0.1, -R * 0.45, -R * 0.02); g.quadraticCurveTo(-R * 0.3, -R * 0.1, -R * 0.45, -R * 0.35); g.fill(); g.stroke();
  }
}
function chibiHairBack(g, R, L, flash) {
  const c = flash ? '#ffffff' : L.hair, d = flash ? '#ffffff' : shade(L.hair, 0.7);
  g.lineWidth = R * 0.09; g.strokeStyle = CHIBI.OUT;
  if (L.gender === 'female') {
    // twin tails hanging from both sides (style 0) or long hair down the back (style 1)
    const tails = L.style === 0 ? [[-0.92, -0.25, 1], [0.78, -0.42, 0.8]] : [[-0.7, 0.1, 1.25]];
    for (const [tx, ty, k] of tails) {
      g.fillStyle = d; g.beginPath();
      g.moveTo(R * tx, R * ty);
      g.bezierCurveTo(R * (tx - 0.55 * k), R * (ty + 0.5), R * (tx - 0.45 * k), R * (ty + 1.25 * k), R * (tx - 0.15), R * (ty + 1.55 * k));
      g.bezierCurveTo(R * (tx + 0.15), R * (ty + 1.1 * k), R * (tx + 0.25), R * (ty + 0.5), R * (tx + 0.18), R * ty);
      g.closePath(); g.fill(); g.stroke();
    }
    if (L.style === 0) for (const [tx, ty] of tails) {   // ribbons
      g.fillStyle = flash ? '#fff' : L.trim; g.beginPath(); g.ellipse(R * (tx + 0.02), R * (ty - 0.02), R * 0.2, R * 0.12, 0.5, 0, TAU); g.fill(); g.stroke();
    }
  } else {
    g.fillStyle = d; g.beginPath(); g.arc(-R * 0.08, -R * 0.05, R * 1.05, 0, TAU); g.fill(); g.stroke();
  }
}
function chibiHairFront(g, R, L, flash, lod) {
  const c = flash ? '#ffffff' : L.hair;
  g.fillStyle = c; g.strokeStyle = CHIBI.OUT; g.lineWidth = R * 0.08; g.lineJoin = 'round';
  g.beginPath();
  if (L.gender === 'female') {
    g.moveTo(-R * 1.06, R * 0.35);
    g.arc(0, 0, R * 1.07, Math.PI * 0.89, Math.PI * 1.97);
    // bangs: soft zigzag across the forehead (front = +x)
    const pts = [[1.02, 0.05], [0.8, -0.22], [0.66, 0.02], [0.45, -0.28], [0.26, -0.04], [0.06, -0.3], [-0.2, -0.12], [-0.5, -0.32], [-0.8, 0.05]];
    for (const [x, y] of pts) g.lineTo(R * x, R * y);
  } else {
    // spiky top: spikes poke out above and behind the skull
    g.moveTo(-R * 1.0, R * 0.25);
    const sp = [[-1.25, -0.05], [-0.95, -0.35], [-1.25, -0.75], [-0.6, -0.85], [-0.7, -1.3], [-0.15, -1.05], [0.05, -1.45], [0.35, -1.0], [0.8, -1.2], [0.8, -0.7], [1.22, -0.55], [1.0, -0.2]];
    for (const [x, y] of sp) g.lineTo(R * x, R * y);
    const bangs = [[0.92, 0.02], [0.72, -0.26], [0.55, -0.02], [0.36, -0.32], [0.15, -0.08], [-0.1, -0.34], [-0.35, -0.12], [-0.7, -0.3], [-0.85, 0.1]];
    for (const [x, y] of bangs) g.lineTo(R * x, R * y);
  }
  g.closePath(); g.fill(); g.stroke();
  if (!flash && !lod) {   // glossy highlight
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = R * 0.07; g.lineCap = 'round';
    g.beginPath(); g.arc(-R * 0.05, -R * 0.1, R * 0.78, Math.PI * 1.25, Math.PI * 1.5); g.stroke();
  }
  if (L.boss) {   // horns
    g.fillStyle = flash ? '#fff' : '#f5e6c8'; g.strokeStyle = CHIBI.OUT; g.lineWidth = R * 0.06;
    for (const sx of [-0.55, 0.45]) { g.beginPath(); g.moveTo(R * (sx - 0.15), -R * 0.85); g.quadraticCurveTo(R * (sx - 0.05), -R * 1.6, R * (sx + 0.25), -R * 1.55); g.quadraticCurveTo(R * (sx + 0.05), -R * 1.2, R * (sx + 0.18), -R * 0.8); g.closePath(); g.fill(); g.stroke(); }
  }
}
// MAIN: one chibi on the engine joints
function drawChibi(g, J, s, face, L, o = {}) {
  if (!J || !J.head || !J.hip || !L) return;
  if (!J.sh) J.sh = { x: J.neck.x + (J.hip.x - J.neck.x) * 0.1, y: J.neck.y + (J.hip.y - J.neck.y) * 0.1 };
  const fl = !!o.flash, F = (c) => (fl ? '#ffffff' : c);
  // level of detail: tiny crowd fighters skip blush, gloss and trims (keeps 30 fighters + the main stage smooth)
  const lod = s * (CHIBI.zoom || (typeof cam !== 'undefined' && cam.V ? cam.V.z : 1)) < 0.95;
  if (!L.skinD) { L.skinD = shade(L.skin, 0.82); L.bottomD = shade(L.bottom, 0.75); L.shoesD = shade(L.shoes, 0.75); }
  const ua = 17.2 * s, fa = 14.8 * s, th = 20.8 * s, sn = 17.2 * s;
  g.lineCap = 'round'; g.lineJoin = 'round';
  const girl = L.gender === 'female';
  // back arm + back leg (behind the body, darker)
  cbLimb(g, J.sh, J.eB, ua, F(L.topD), s); cbLimb(g, J.eB, J.hB, fa, F(L.skinD), s);
  cbLimb(g, J.hip, J.kB, th, F(girl ? L.skinD : L.bottomD), s); cbLimb(g, J.kB, J.fB, sn, F(girl ? L.skinD : L.bottomD), s);
  cbShoe(g, J.kB, J.fB, face, F(L.shoesD), s, lod);
  // torso
  cbLimb(g, J.sh, J.hip, 24 * s, F(L.top), s);
  const tx = J.hip.x - J.sh.x, ty = J.hip.y - J.sh.y, tl = Math.hypot(tx, ty) || 1, nx = -ty / tl * face, ny = tx / tl * face;
  if (!fl && !lod) {   // jacket zip / shirt trim on the front edge
    g.strokeStyle = girl ? L.trim : '#f4f4f4'; g.lineWidth = (girl ? 4 : 7) * s;
    g.beginPath(); g.moveTo(J.sh.x + tx * 0.18 - nx * 7 * s, J.sh.y + ty * 0.18 - ny * 7 * s); g.lineTo(J.sh.x + tx * 0.82 - nx * 7 * s, J.sh.y + ty * 0.82 - ny * 7 * s); g.stroke();
    g.strokeStyle = L.topD; g.lineWidth = 5 * s;   // belt
    g.beginPath(); g.moveTo(J.hip.x - tx / tl * 4 * s - nx * 12 * s, J.hip.y - ty / tl * 4 * s - ny * 12 * s); g.lineTo(J.hip.x - tx / tl * 4 * s + nx * 12 * s, J.hip.y - ty / tl * 4 * s + ny * 12 * s); g.stroke();
  }
  // front leg
  const legC = F(girl ? L.skin : L.bottom);
  cbLimb(g, J.hip, J.kF, th, legC, s); cbLimb(g, J.kF, J.fF, sn, legC, s);
  cbShoe(g, J.kF, J.fF, face, F(L.shoes), s, lod);
  if (girl) {   // skirt over both thighs, flares out along the spine direction
    const ux = tx / tl, uy = ty / tl, px = -uy, py = ux;
    const a = { x: J.hip.x - ux * 10 * s, y: J.hip.y - uy * 10 * s }, b = { x: J.hip.x + ux * 20 * s, y: J.hip.y + uy * 20 * s };
    g.fillStyle = F(L.bottom); g.strokeStyle = CHIBI.OUT; g.lineWidth = 3.5 * s;
    g.beginPath(); g.moveTo(a.x + px * 13 * s, a.y + py * 13 * s); g.lineTo(b.x + px * 24 * s, b.y + py * 24 * s);
    g.quadraticCurveTo(b.x + ux * 5 * s, b.y + uy * 5 * s, b.x - px * 24 * s, b.y - py * 24 * s); g.lineTo(a.x - px * 13 * s, a.y - py * 13 * s); g.closePath(); g.fill(); g.stroke();
    if (!fl && !lod) { g.strokeStyle = L.trim; g.lineWidth = 2.5 * s; g.beginPath(); g.moveTo(b.x + px * 21 * s, b.y + py * 21 * s); g.quadraticCurveTo(b.x + ux * 2 * s, b.y + uy * 2 * s, b.x - px * 21 * s, b.y - py * 21 * s); g.stroke(); }
  }
  // neck + head
  const H = chibiHead(J), R = H.R;
  cbLimb(g, J.sh, { x: (J.neck.x + H.x) / 2, y: (J.neck.y + H.y) / 2 }, 9 * s, F(L.skin), s);
  g.save(); g.translate(H.x, H.y); g.rotate(H.ang); g.scale(face, 1);
  chibiHairBack(g, R, L, fl);
  g.fillStyle = CHIBI.OUT; g.beginPath(); g.arc(0, 0, R + 3.2 * s, 0, TAU); g.fill();
  g.fillStyle = F(L.skin); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  if (!fl && !lod) { g.fillStyle = 'rgba(160,80,60,0.13)'; g.beginPath(); g.arc(-R * 0.18, R * 0.12, R * 0.9, Math.PI * 0.4, Math.PI * 1.2); g.fill(); }
  if (!fl) chibiFace(g, R, L, o.expr || 'normal', o.talk || 0, lod);
  chibiHairFront(g, R, L, fl, lod);
  g.restore();
  // front arm on top (guard sits in front of the chin like a boxer)
  cbLimb(g, J.sh, J.eF, ua, F(L.top), s); cbLimb(g, J.eF, J.hF, fa, F(L.skin), s);
  if (!o.noGloves) { paintGlove(J.eB, J.hB, s * 1.12); paintGlove(J.eF, J.hF, s * 1.12); }
}
// silhouette (ghosts / impact frames): same chibi outline in one colour
function chibiSilhouette(g, J, s, col, grow = 0) {
  if (!J || !J.head || !J.hip) return;
  if (!J.sh) J.sh = { x: J.neck.x + (J.hip.x - J.neck.x) * 0.1, y: J.neck.y + (J.hip.y - J.neck.y) * 0.1 };
  g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round';
  const L = (a, b, w) => { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineWidth = w + grow * 2; g.stroke(); };
  L(J.sh, J.eB, 17 * s); L(J.eB, J.hB, 15 * s); L(J.hip, J.kB, 21 * s); L(J.kB, J.fB, 17 * s); L(J.sh, J.hip, 24 * s);
  L(J.hip, J.kF, 21 * s); L(J.kF, J.fF, 17 * s); L(J.sh, J.eF, 17 * s); L(J.eF, J.hF, 15 * s);
  const H = chibiHead(J); g.beginPath(); g.arc(H.x, H.y, H.R + grow, 0, TAU); g.fill();
  for (const h of [J.hF, J.hB]) { g.beginPath(); g.arc(h.x, h.y, 13 * s + grow, 0, TAU); g.fill(); }
}
// gift swords: tier 1 shiny steel, tier 2 (10+ coins) gold guard + gem, tier 3 (100+ coins) radiant gold blade
function drawTierSword(g, h, tip, s, tier, t) {
  const ex = tip.x - h.x, ey = tip.y - h.y, l = Math.hypot(ex, ey) || 1, ux = ex / l, uy = ey / l, nx = -uy, ny = ux;
  const P = (a, b) => ({ x: h.x + ux * a + nx * b, y: h.y + uy * a + ny * b });
  const w = (tier >= 3 ? 7.5 : tier >= 2 ? 6.5 : 5.5) * s, base = 12 * s;
  if (tier >= 2) {   // soft glow
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = tier >= 3 ? 'rgba(255,214,90,0.35)' : 'rgba(140,200,255,0.3)'; g.lineWidth = w * 3.2; g.lineCap = 'round';
    g.beginPath(); const a = P(base, 0); g.moveTo(a.x, a.y); g.lineTo(tip.x, tip.y); g.stroke();
    g.globalCompositeOperation = 'source-over';
  }
  const b0 = P(base, w), b1 = P(l - w * 2.2, w), b2 = P(l, 0), b3 = P(l - w * 2.2, -w), b4 = P(base, -w);
  g.fillStyle = CHIBI.OUT; g.beginPath(); g.moveTo(b0.x, b0.y); g.lineTo(b1.x, b1.y); g.lineTo(b2.x, b2.y); g.lineTo(b3.x, b3.y); g.lineTo(b4.x, b4.y); g.closePath();
  g.lineWidth = 4 * s; g.strokeStyle = CHIBI.OUT; g.stroke();
  const gr = g.createLinearGradient(b0.x, b0.y, b4.x, b4.y);
  if (tier >= 3) { gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.5, '#ffd34d'); gr.addColorStop(1, '#c98a12'); }
  else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#cfe3f5'); gr.addColorStop(1, '#7d93ab'); }
  g.fillStyle = gr; g.fill();
  // moving shine
  const k = ((t * 0.9) % 1.4) - 0.2;
  if (k > 0 && k < 1) { const p = P(base + (l - base) * k, 0); g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(p.x, p.y, w * 1.1, w * 0.35, Math.atan2(uy, ux) + Math.PI / 2, 0, TAU); g.fill(); }
  // guard + grip
  const gc = tier >= 2 ? '#ffcc33' : '#b8c2cc';
  const ga = P(base * 0.8, 15 * s), gb = P(base * 0.8, -15 * s);
  g.strokeStyle = CHIBI.OUT; g.lineWidth = 9 * s; g.beginPath(); g.moveTo(ga.x, ga.y); g.lineTo(gb.x, gb.y); g.stroke();
  g.strokeStyle = gc; g.lineWidth = 5.5 * s; g.stroke();
  if (tier >= 2) { const c = P(base * 0.8, 0); g.fillStyle = tier >= 3 ? '#ff2d6f' : '#2f9bff'; g.beginPath(); g.arc(c.x, c.y, 5 * s, 0, TAU); g.fill(); g.strokeStyle = CHIBI.OUT; g.lineWidth = 2 * s; g.stroke(); }
  if (tier >= 3) {   // sparkles along the blade
    for (let i = 0; i < 3; i++) { const u = ((t * 0.7 + i / 3) % 1), p = P(base + (l - base) * u, Math.sin(t * 5 + i) * w * 1.6), r = (2 + 3 * Math.abs(Math.sin(t * 7 + i * 2))) * s;
      g.fillStyle = '#fffbe0'; g.beginPath(); g.moveTo(p.x, p.y - r * 2); g.lineTo(p.x + r * 0.5, p.y); g.lineTo(p.x, p.y + r * 2); g.lineTo(p.x - r * 0.5, p.y); g.closePath(); g.fill(); }
  }
}
