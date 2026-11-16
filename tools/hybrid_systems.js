// ============================================================ CHIBI CLASH hybrid systems
// looks (girl/boy), gift swords, KO stats, KING crown, BOSS, results board, carry-over
const RESULTS_SECONDS = 11;
const ELIM = [];                 // players in the order they were knocked out this round
const KING = { f: null };
function withLook(p, ev) {
  const g = resolveGender({ comment: ev && ev.text, nickname: p.nick, existing: p.gender }).gender;
  p.gender = g; p.look = makeLook(p.id, g, (TEAMS[p.color] || TEAMS[2]).body);
  return p;
}
function pickGender(p, ev) {
  const g = genderFromComment(ev && ev.text);
  if (!g || g === p.gender) return;
  p.gender = g; p.look = makeLook(p.id, g, (TEAMS[p.color] || TEAMS[2]).body);
  const f = p.fighter && p.fighter.alive ? p.fighter : null;
  if (f) { f.look = p.look; ring(f.x, f.cy(), 80, '#ff9ad4', 0.35, 5); }
  addFeed([[p.nick, TEAMS[p.color].ui], [g === 'female' ? ' is a girl fighter now' : ' is a boy fighter now', '#ff9ad4']], 5);
}
function swordTierOf(p) { const c = (p && p.coins) || 0; return c >= 100 ? 3 : c >= 10 ? 2 : c >= 1 ? 1 : 0; }
function giveSword(f, p, tier0) {
  const t = swordTierOf(p); if (!t || !f) return;
  if (f.weapon !== 'sword') f.setWeapon('sword');
  f.swordTier = t;
  if (t > (tier0 || 0)) {
    floatText(f.x, f.y - 290 * f.s, t >= 3 ? 'LEGEND SWORD!' : t >= 2 ? 'ROYAL SWORD!' : 'SHINY SWORD!', t >= 3 ? '#ffd34d' : '#bfe9ff', t >= 2 ? 42 : 34, 1.5);
    sparks(f.x, f.cy() - 40 * f.s, 1, 18, ['#ffffff', '#ffe27a', '#bfe9ff'], 1.2); sfx('swing', f.x, 0.8);
  }
}
function statHit(A, D, dmg) {
  if (D && D.user) { D.user.taken += dmg; D.user.lowest = Math.min(D.user.lowest ?? 1, Math.max(0, D.hp) / Math.max(1, D.maxHp)); }
  if (A && A.user) A.user.dealt += dmg;
}
function statKO(A, D) {
  if (A && A.user && A !== D) A.user.kos = (A.user.kos || 0) + 1;   // credit only to the fighter who landed the last hit
  if (D && D.user) { D.user.outAt = round.time; const i = ELIM.indexOf(D.user); if (i >= 0) ELIM.splice(i, 1); ELIM.push(D.user); }
  if (D && D.boss) {
    round.slayer = A && A.user ? A.user : null;
    callout('BOSS DOWN!', A ? A.name + ' +30 HP' : '', '#d6b4ff', 120, 1.8);
    sfx('fanfare'); sfx('crowd');
    if (A && A.alive) { A.maxHp += 30; A.hp += 30; healFx(A); floatText(A.x, A.y - 260 * A.s, '+30 HP', '#4dff88', 38, 1.3); }
  }
}
function topHpFighter() {
  let best = null;
  // settings.json timeUpRanking: 'hp' (default, the shown rule: most HP) or 'effective' (HP / damage-taken multiplier, kinder to free players)
  const v = (f) => (G_().timeUpRanking === 'effective' ? f.hp / toughMul(f) : f.hp);
  for (const f of fighters) if (f.alive && !f.boss && (!best || v(f) > v(best))) best = f;
  return best;
}
// ---------- KING: the fighter with the most KOs this round wears the crown
function updateKing() {
  let best = KING.f && KING.f.alive && KING.f.user ? KING.f : null, bk = best ? best.user.kos : 0;
  for (const f of fighters) {
    if (!f.alive || f.boss || !f.user) continue;
    const k = f.user.kos || 0;
    if (k > bk) { best = f; bk = k; }
  }
  if (bk < 1) best = null;
  if (best !== KING.f) {
    KING.f = best;
    if (best && round.state === 'fight' && clock - (KING.at || -9) > 3) { KING.at = clock; floatText(best.x, best.y - 300 * best.s, 'NEW KING!', '#ffd84a', 44, 1.4); addFeed([[best.name, TEAMS[best.team].ui], [' is the KING 👑', '#ffd84a']], 6); }
  }
}
function drawKingGlow(f) {
  const g = ctx.createRadialGradient(f.x, f.y, 4, f.x, f.y, 90 * f.s);
  g.addColorStop(0, 'rgba(255,216,74,0.55)'); g.addColorStop(1, 'rgba(255,216,74,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(f.x, f.y, 90 * f.s, 22 * f.s, 0, 0, TAU); ctx.fill();
}
function drawKingCrown(f) {
  if (!f.J) return;
  const H = chibiHead(f.J), k = f.s * 1.7, bob = Math.sin(clock * 4) * 3 * f.s;
  const x = H.x - 14 * k, y = H.y - H.R * (f.look && f.look.gender === 'male' ? 1.32 : 1.02) + bob;
  ctx.save(); ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1b1016'; ctx.lineWidth = 5 * f.s;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4 * k, y - 10 * k); ctx.lineTo(x + 9 * k, y - 4 * k); ctx.lineTo(x + 14 * k, y - 12 * k); ctx.lineTo(x + 19 * k, y - 4 * k); ctx.lineTo(x + 24 * k, y - 10 * k); ctx.lineTo(x + 28 * k, y); ctx.closePath(); ctx.stroke();
  drawCrown(x, y, k, '#ffd84a');
  ctx.fillStyle = '#ff2d6f'; ctx.beginPath(); ctx.arc(x + 14 * k, y - 3.5 * k, 2.2 * k, 0, TAU); ctx.fill();
  ctx.restore();
}
function chibiExpr(f, lying) {
  const m = f.mv;
  if (lying || (m && m.d && m.d.hurt)) return 'hurt';
  if (round.state === 'end' && f === round.winnerF) return 'happy';
  if (m && /victory|cheer|bow|taunt|shrug/.test(m.name)) return 'happy';
  if (m && m.d && m.d.hits) return 'angry';
  if (f.hp < f.maxHp * 0.3) return 'worried';
  if (f.combo >= 2 || f.boss) return 'angry';
  return 'normal';
}
// ---------- BOSS: every ~90 s a CPU boss drops in for 25 s. HP is capped, it hits like everyone else,
// it never counts as a fighter (does not block the last-one-standing win), and the KO earns +30 HP.
function bossNow() { return fighters.find((f) => f.alive && f.boss) || null; }
function bossLeft(f) { return (G_().bossSeconds || 25) - (round.time - (f.bossT || 0)); }
function spawnBoss(force) {
  if (bossNow() || round.state !== 'fight') return null;
  const c = arCounts(), ar = SPLIT.mode === 'merging' ? SPLIT.keep : SPLIT.mode === 'split' ? (c[1] > c[0] ? 1 : 0) : 0;   // the busier arena gets the boss
  const n = SPLIT.mode === 'split' ? c[ar] : aliveCount(); if (!force && n < 3) return null;
  SPAWN_AR = ar; CUR_AR = ar;
  const x = safeEdgeX(), sc = Math.min(arenaScale(n + 1) * 1.6, BASE_S * 1.45);
  const f = new Fighter(6, { x, y: FLOOR - 520, hp: clamp(35 * n, 150, 700), invuln: 99, dropIn: true, face: x < W / 2 ? 1 : -1, scale: sc, name: 'BOSS' });
  f.ar = ar; f.boss = true; f.look = bossLook(); f.invulnUntilLand = true; f.bossT = round.time; f.lastTouch = clock; f.ts = sc;
  fighters.push(f); round.bosses = (round.bosses || 0) + 1;
  callout('BOSS INCOMING!', 'KO IT FOR +30 HP', '#d6b4ff', 120, 1.8);
  sfx('sudden', null, 0.6); sfx('crowd'); shake(10);
  addFeed([['BOSS', '#d6b4ff'], [' dropped in — ' + Math.round(f.hp) + ' HP', '#d6b4ff']], 6);
  return f;
}
function removeBoss(reason) {
  for (const f of fighters) if (f.alive && f.boss) {
    f.alive = false; f.hidden = true;
    smoke(f.x, f.cy(), 1.4); ring(f.x, f.cy(), 120, '#d6b4ff', 0.4, 6);
    if (reason) { callout('BOSS ESCAPED!', '', '#d6b4ff', 100, 1.4); addFeed([['BOSS', '#d6b4ff'], [' escaped', '#c9d6ff']], 5); }
  }
}
function updateBoss() {
  const b = bossNow(), limit = G_().roundSeconds || 300, every = G_().bossEvery || 90, life = G_().bossSeconds || 25;
  if (b) { if (bossLeft(b) <= 0) removeBoss('escaped'); return; }
  if (round.bossAt && round.time >= round.bossAt) {
    round.bossAt += every;
    if (limit - round.time > life + 15) spawnBoss(false);
  }
}
// ---------- results board
function buildResults() {
  const w = round.winnerF && !round.winnerF.boss ? round.winnerF : null;
  const standing = fighters.filter((f) => f.alive && !f.boss && f.user).sort((a, b) => (b === w) - (a === w) || b.hp - a.hp);
  const seen = new Set(), rows = [];
  for (const f of standing) { if (seen.has(f.user)) continue; seen.add(f.user); rows.push({ nick: f.user.nick, kos: f.user.kos || 0, hp: Math.round(f.hp), out: false, color: TEAMS[f.team].ui, p: f.user }); }
  for (let i = ELIM.length - 1; i >= 0; i--) { const p = ELIM[i]; if (seen.has(p)) continue; seen.add(p); rows.push({ nick: p.nick, kos: p.kos || 0, hp: 0, out: true, color: TEAMS[p.color].ui, p }); }
  rows.forEach((r, i) => { r.place = i + 1; r.p.place = i + 1; });
  const all = rows.map((r) => r.p), awards = [];
  const most = all.slice().sort((a, b) => (b.kos || 0) - (a.kos || 0))[0];
  if (most && most.kos > 0) awards.push(['MOST KOs', most.nick, most.kos + ' KO' + (most.kos > 1 ? 's' : '')]);
  const tank = all.filter((p) => p.taken > 0).sort((a, b) => b.taken - a.taken)[0];
  if (tank) awards.push(['IRON WALL', tank.nick, formatHp(tank.taken) + ' dmg taken']);
  const back = rows.filter((r) => !r.out && r.p.lowest < 0.35).sort((a, b) => a.p.lowest - b.p.lowest)[0];
  if (back) awards.push(['BEST COMEBACK', back.nick, 'from ' + Math.max(1, Math.round(back.p.lowest * 100)) + '% HP']);
  if (round.slayer) awards.push(['BOSS SLAYER', round.slayer.nick, '+30 HP']);
  round.results = { title: round.timeUp ? "TIME'S UP · MOST HP WINS" : 'LAST ONE STANDING', winner: w ? { nick: w.name, kos: (w.user && w.user.kos) || 0, hp: Math.round(w.hp), color: TEAMS[w.team].ui } : null, rows, awards, total: rows.length };
}
function drawResults() {
  const R = round.results, k = clamp((round.t - 0.3) * 1.6, 0, 1), e = 1 - Math.pow(1 - k, 3);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(3,4,12,${0.55 * e})`; ctx.fillRect(0, VIEW_TOP, W, VIEW_BOT - VIEW_TOP);
  ctx.translate(W / 2, 1010); ctx.scale(lerp(0.85, 1, e), lerp(0.85, 1, e)); ctx.globalAlpha = e;
  const top = -540, bh = 1180;
  ctx.fillStyle = 'rgba(10,12,26,0.95)'; roundRect(-490, top, 980, bh, 34); ctx.fill();
  ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 7; ctx.stroke();
  outlined('ROUND ' + round.n + ' RESULTS', 0, top + 70, '56px Bangers, Impact, sans-serif', '#ffffff', '#2f7bff', 10);
  outlined(R.title, 0, top + 112, '28px Russo, Arial, sans-serif', '#ffd84a', '#000', 5);
  // winner card
  const wy = top + 150;
  ctx.fillStyle = 'rgba(255,216,74,0.14)'; roundRect(-450, wy, 900, 170, 24); ctx.fill(); ctx.strokeStyle = 'rgba(255,216,74,0.8)'; ctx.lineWidth = 3; ctx.stroke();
  if (R.winner) {
    drawCrown(-36, wy + 62, 2.6, '#ffd84a');
    let nfs = 78; ctx.font = nfs + 'px Bangers, Impact, sans-serif';
    while (nfs > 40 && ctx.measureText(R.winner.nick).width > 820) { nfs -= 4; ctx.font = nfs + 'px Bangers, Impact, sans-serif'; }
    outlined(R.winner.nick, 0, wy + 128, nfs + 'px Bangers, Impact, sans-serif', '#ffffff', R.winner.color, 9);
    outlined('WINNER  ·  ' + R.winner.kos + ' KO' + (R.winner.kos === 1 ? '' : 's') + '  ·  ' + formatHp(R.winner.hp) + ' HP left', 0, wy + 160, '26px Russo, Arial, sans-serif', '#ffd84a', '#000', 5);
  } else outlined('NO WINNER', 0, wy + 110, '70px Bangers, Impact, sans-serif', '#ffffff', '#000', 8);
  // placements
  let y = wy + 222;
  ctx.textAlign = 'left';
  outlined('#', -430, y, '24px Russo, Arial', '#8ea3d6', '#000', 3); outlined('FIGHTER', -370, y, '24px Russo, Arial', '#8ea3d6', '#000', 3);
  ctx.textAlign = 'right'; outlined('KOs', 250, y, '24px Russo, Arial', '#8ea3d6', '#000', 3); outlined('HP', 430, y, '24px Russo, Arial', '#8ea3d6', '#000', 3);
  y += 14;
  const show = R.rows.slice(0, 10);
  show.forEach((r, i) => {
    const ry = y + 44 + i * 46, a = clamp((round.t - 0.6 - i * 0.08) * 4, 0, 1);
    ctx.globalAlpha = e * a;
    if (i % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(-450, ry - 32, 900, 44); }
    ctx.textAlign = 'left';
    outlined(String(r.place), -430, ry, '30px Bangers, Impact', r.place === 1 ? '#ffd84a' : r.place <= 3 ? '#e6ebf5' : '#9fb0d8', '#000', 4);
    const nm = r.nick.length > 18 ? r.nick.slice(0, 17) + '…' : r.nick;
    outlined(nm, -370, ry, '30px Russo, Arial', r.color, '#000', 5);
    ctx.textAlign = 'right';
    outlined(String(r.kos), 250, ry, '30px Russo, Arial', r.kos ? '#ffd84a' : '#9fb0d8', '#000', 4);
    outlined(r.out ? 'KO' : formatHp(r.hp), 430, ry, '28px Russo, Arial', r.out ? '#ff8080' : '#7dffb0', '#000', 4);
  });
  ctx.globalAlpha = e;
  if (R.total > show.length) { ctx.textAlign = 'center'; outlined('+ ' + (R.total - show.length) + ' more fighters', 0, y + 44 + show.length * 46, '22px Russo, Arial', '#8ea3d6', '#000', 3); }
  // awards
  const ay = top + bh - 30 - Math.ceil(R.awards.length / 2) * 92;
  R.awards.forEach((aw, i) => {
    const cx = (i % 2 ? 1 : -1) * 225, cy = ay + Math.floor(i / 2) * 92;
    ctx.fillStyle = 'rgba(47,123,255,0.18)'; roundRect(cx - 215, cy, 430, 80, 16); ctx.fill(); ctx.strokeStyle = '#2f7bff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = 'center';
    outlined(aw[0], cx, cy + 26, '24px Bangers, Impact', '#7fb2ff', '#000', 4);
    const nm = aw[1].length > 16 ? aw[1].slice(0, 15) + '…' : aw[1];
    outlined(nm + '  ·  ' + aw[2], cx, cy + 60, '23px Russo, Arial', '#ffffff', '#000', 4);
  });
  ctx.textAlign = 'center';
  const nx = Math.max(0, Math.ceil(RESULTS_SECONDS - round.t));
  outlined('NEXT ROUND IN ' + nx + '  ·  GIFT HP + SWORDS CARRY OVER IF YOU STAY', 0, top + bh + 44, '24px Russo, Arial', '#ffe08a', '#000', 5);
  ctx.restore(); ctx.globalAlpha = 1; ctx.textAlign = 'center';
}
// ---------- carry-over: gift HP + sword stay if you are still here (fighting, in the reserved seats,
// or you liked / commented / gifted in the last 2 minutes). Everyone else resets to base.
function carryOver() {
  for (const p of roster.values()) {
    const here = (p.fighter && p.fighter.alive) || p.queued || clock - (p.lastSeen || 0) < 120;
    if (here) { p.eliminated = false; p.carried = p.bonusHp > 0; }
    else { p.bonusHp = 0; p.coins = 0; p.carried = false; }
  }
}
// ---------- FAIR GIFTS: '1 coin = +30 HP' stays the shown rule, but damage taken grows with stacked HP (log-scaled),
// so a big gifter is strong but beatable. Effective HP = 120 * (1 + 0.6 * log2(maxHp / 120)) above 120 HP;
// every hit taken is multiplied by maxHp / effectiveHp (the HP bar still shows the real numbers).
// 80 HP (1 coin) -> 80 · 200 HP -> 173 · 350 HP (10 coins) -> 231 · 1,550 HP -> 386 · 3,050 HP (100 coins) -> 456 · 15,050 HP (500) -> 622
const FAIR_BASE = 120, FAIR_K = 0.6;
function effHp(maxHp) { return maxHp <= FAIR_BASE ? maxHp : FAIR_BASE * (1 + FAIR_K * Math.log2(maxHp / FAIR_BASE)); }
function toughMul(D) {
  if (!D || D.boss || !(D.maxHp > FAIR_BASE)) return 1;
  return Math.max(1, D.maxHp / effHp(D.maxHp));
}

// ---------- SPLIT ARENAS: two equal arenas stacked (A top, B bottom), up to 15 each, same engine.
// Fighters only see foes in their own arena. Joiners and refills go to the arena with fewer fighters.
// Endgame (queue empty and one arena has 2 or fewer, or 8 or fewer in total): MERGE into one FINAL ARENA.
var CUR_AR = 0, SPAWN_AR = 0, PAR = -1;
var VC = { x: W / 2, y: VIEW_CY };
var SPLIT = { mode: 'single', final: false, keep: 0, anim: 1 };
const AC = [{ x: W / 2, y: FLOOR - 300, z: 1.2, ready: false }, { x: W / 2, y: FLOOR - 300, z: 1.2, ready: false }];
const AR_NAMES = ['ARENA A', 'ARENA B'];
function splitAllowed() { return QS.get('split') !== '0'; }
function splitView() { return SPLIT.mode === 'split' || SPLIT.mode === 'merging' || SPLIT.final; }   // FINAL ARENA uses the same locked view, full height
function arCounts() {
  const c = [0, 0];
  for (const f of fighters) if (f.alive && !f.boss) c[f.ar | 0]++;
  return c;
}
function pickArena() {
  if (SPLIT.mode === 'merging') return SPLIT.keep;
  if (SPLIT.mode !== 'split') return 0;
  const c = arCounts();
  return c[1] < c[0] ? 1 : 0;
}
function splitRects() {
  const y0 = VIEW_TOP, y1 = VIEW_BOT, mid0 = (y0 + y1) / 2;
  let mid = mid0;
  if (SPLIT.final && SPLIT.mode === 'single') mid = y1;
  if (SPLIT.mode === 'merging') { const e = EASE.io(clamp(SPLIT.anim, 0, 1)); mid = lerp(mid0, SPLIT.keep === 0 ? y1 : y0, e); }
  return [{ x: 0, y: y0, w: W, h: mid - y0 }, { x: 0, y: mid, w: W, h: y1 - mid }];
}
function enterSplit() {
  const list = fighters.filter((f) => f.alive && !f.boss).sort((a, b) => a.x - b.x);
  list.forEach((f, i) => { f.ar = i % 2; f._foe = null; });
  for (const f of fighters) if (f.alive && f.boss) f.ar = 0;
  SPLIT.mode = 'split'; SPLIT.anim = 1; AC[0].ready = AC[1].ready = false;
  refitScale();
}
function toSingle() {
  for (const f of fighters) { f.ar = 0; f._foe = null; }
  for (const r of ragdolls) r.ar = 0;
  SPLIT.mode = 'single'; SPLIT.anim = 1;
  refitScale();
}
function splitAfterRoster() {   // new round: decide the layout and lay each arena out evenly
  SPLIT.final = false;
  const list = fighters.filter((f) => f.alive && !f.boss);
  if (list.length >= 9 && splitAllowed()) {
    SPLIT.mode = 'split'; SPLIT.anim = 1; AC[0].ready = AC[1].ready = false;
    const g = [[], []]; list.forEach((f, i) => { f.ar = i % 2; g[f.ar].push(f); });
    for (const arr of g) arr.forEach((f, i) => { f.x = layoutX(i, arr.length); f.face = f.x < W / 2 ? 1 : -1; });
  } else { SPLIT.mode = 'single'; SPLIT.anim = 1; for (const f of list) f.ar = 0; }
}
function startMerge() {
  const c = arCounts();
  SPLIT.keep = c[0] >= c[1] ? 0 : 1; SPLIT.mode = 'merging'; SPLIT.anim = 0;
  callout('FINAL ARENA!', 'LAST ONE STANDING WINS', '#ffd84a', 120, 2.2);
  sfx('fanfare'); sfx('crowd');
  addFeed([['FINAL ARENA', '#ffd84a'], [' · ' + (c[0] + c[1]) + ' fighters left in one arena', '#ffffff']], 6);
}
function finishMerge() {
  const keep = SPLIT.keep, movers = fighters.filter((f) => f.alive && (f.ar | 0) !== keep);
  const stay = fighters.filter((f) => f.alive && (f.ar | 0) === keep);
  for (const f of fighters) { f.ar = 0; f._foe = null; }
  for (const r of ragdolls) r.ar = 0;
  for (const p of parts) p.ar = 0;
  for (const t of texts) t.ar = 0;
  const xs = stay.map((f) => f.x);
  for (const f of movers) {
    const pts = [WALL_L + 120, ...xs.slice().sort((a, b) => a - b), WALL_R - 120];
    let best = W / 2, gap = -1;
    for (let i = 0; i < pts.length - 1; i++) { const g = pts[i + 1] - pts[i]; if (g > gap) { gap = g; best = (pts[i] + pts[i + 1]) / 2; } }
    best = clamp(best, WALL_L + 120, WALL_R - 120); xs.push(best);
    f.x = best; f.y = FLOOR - 430; f.vx = 0; f.vy = 0; f.onGround = false; f.mv = null; f.scripted = false; f.held = false;
    f.dropIn = true; f.invuln = 99; f.invulnUntilLand = true; f.face = f.x < W / 2 ? 1 : -1;
  }
  const A = AC[keep];
  if (keep) Object.assign(AC[0], { x: A.x, y: A.y, z: A.z });
  cam.x = A.x; cam.y = A.y; cam.z = A.z; cam.vx = cam.vy = cam.vz = 0; cam.ko = null; cam.focus = null;
  SPLIT.mode = 'single'; SPLIT.final = true; SPLIT.anim = 1;
  refitScale();
}
function updateSplit(rdt) {
  const n = aliveCount();
  if (round.state === 'lobby' || round.state === 'countdown') {
    SPLIT.final = false;
    if (SPLIT.mode === 'single' && n >= 9 && splitAllowed()) enterSplit();
    else if (SPLIT.mode === 'split' && n <= 6) toSingle();
  } else if (round.state === 'fight') {
    if (SPLIT.mode === 'single' && !SPLIT.final && n >= 12 && splitAllowed()) enterSplit();
    else if (SPLIT.mode === 'split' && !waitQ.length) { const c = arCounts(); if (Math.min(c[0], c[1]) <= 2 || n <= 8) startMerge(); }
  }
  if (SPLIT.mode === 'merging') { SPLIT.anim += rdt / 0.9; if (SPLIT.anim >= 1) finishMerge(); }
  if (!splitView()) return;
  // locked, calm cameras: slow pan to the middle of each arena's fighters, zoom by head count, floor near the bottom
  const R = splitRects();
  for (let ar = 0; ar < 2; ar++) {
    const A = AC[ar], list = fighters.filter((f) => f.alive && !f.hidden && (f.ar | 0) === ar), m = list.length;
    if (SPLIT.final && SPLIT.mode === 'single') {   // FINAL ARENA: frame the survivors, calm springs, floor at 80% of the screen
      if (ar) continue;
      let x1 = 1e9, x2 = -1e9, ms = BASE_S; for (const f of list) { x1 = Math.min(x1, f.x); x2 = Math.max(x2, f.x); ms = Math.max(ms, f.s); }
      const bw = m ? x2 - x1 + 300 * ms : W, tz = clamp(W * 0.95 / bw, 1.25, 2.1);
      const half = W / 2 / tz, tx = clamp(m ? (x1 + x2) / 2 : W / 2, half - 60, W + 60 - half), ty = FLOOR - (R[0].h * 0.3) / tz;
      const k = 1 - Math.exp(-rdt * 1.3), kz = 1 - Math.exp(-rdt * 0.9);
      A.x += (tx - A.x) * k; A.z += (tz - A.z) * kz; A.y += (ty - A.y) * k; A.ready = true;
      continue;
    }
    const tz = m >= 9 ? 1.16 : m >= 5 ? 1.24 : m >= 1 ? 1.34 : 1.16;
    let tx = m ? list.reduce((s, f) => s + f.x, 0) / m : W / 2; tx = lerp(W / 2, tx, 0.6);
    const half = W / 2 / tz; tx = clamp(tx, half - 60, W + 60 - half);
    const ty = FLOOR - (R[ar].h / 2 - 96) / tz;
    const k = A.ready ? 1 - Math.exp(-rdt * 1.1) : 1, kz = A.ready ? 1 - Math.exp(-rdt * 0.8) : 1;
    A.x += (tx - A.x) * k; A.z += (tz - A.z) * kz; A.y += (ty - A.y) * (SPLIT.mode === 'merging' ? 1 : k); A.ready = true;
  }
}
function renderPass(ar, R) {
  const V = AC[ar], z = V.z;
  VC.x = W / 2; VC.y = R.y + R.h / 2;
  cam.V = { x: V.x, y: V.y, z, r: 0 };
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.beginPath(); ctx.rect(0, R.y, W, R.h); ctx.clip();
  // backdrop: copy the visible slice of the cached sky + arena floor
  const wx0 = V.x - VC.x / z, wy0 = V.y - (VC.y - R.y) / z, ww = W / z, wh = R.h / z, rk = rasterScale();
  ctx.drawImage(bg, (wx0 + BGM) * rk, (wy0 + BGM) * rk, ww * rk, wh * rk, 0, R.y, W, R.h);
  if (!arenaReady) buildArena();
  { const ax = Math.max(wx0, AR.x0), ay = Math.max(wy0, AR.y0), ax1 = Math.min(wx0 + ww, AR.x0 + AR.w), ay1 = Math.min(wy0 + wh, AR.y0 + AR.h);
    if (ax1 > ax && ay1 > ay) { const sx = arenaC.width / AR.w, sy = arenaC.height / AR.h;
      ctx.drawImage(arenaC, (ax - AR.x0) * sx, (ay - AR.y0) * sy, (ax1 - ax) * sx, (ay1 - ay) * sy, (ax - wx0) * z, R.y + (ay - wy0) * z, (ax1 - ax) * z, (ay1 - ay) * z); } }
  ctx.translate(VC.x, VC.y); ctx.scale(z, z); ctx.translate(-V.x, -V.y); CHIBI.zoom = z; PAR = ar;
  if (fx.tintT > 0) { ctx.fillStyle = `rgba(6,4,14,${Math.min(0.72, fx.tintT * 3)})`; ctx.fillRect(-1000, -1000, W + 2000, H + 2000); }
  const rds = ragdolls.filter((r) => (r.ar | 0) === ar), fs = fighters.filter((f) => f.alive && !f.hidden && (f.ar | 0) === ar);
  for (const r of rds) drawShadow(r.pts[2].x, r.pts[2].y, r.s, clamp(r.life, 0, 1));
  for (const f of fs) drawShadow(f.x, f.y, f.s);
  for (const r of rds) drawRagdoll(r);
  drawParticles('back');
  for (const f of fs) if (!f.giant) drawFighter(f);
  for (const f of fs) if (f.giant) drawFighter(f);
  drawParticles();
  PAR = -1; CHIBI.zoom = 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  drawTagsHalf(ar, R, fs);
  if (SPLIT.mode === 'split') {   // arena chip
    const lbl = AR_NAMES[ar] + ' · ' + fs.filter((f) => !f.boss).length;
    ctx.font = '30px Bangers, Impact, sans-serif'; const lw = ctx.measureText(lbl).width + 30;
    ctx.fillStyle = 'rgba(5,6,13,0.78)'; roundRect(14, R.y + 12, lw, 42, 12); ctx.fill();
    ctx.strokeStyle = ar ? '#ff8a5c' : '#5cc8ff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.textAlign = 'left'; outlined(lbl, 29, R.y + 44, '30px Bangers, Impact, sans-serif', ar ? '#ffb48f' : '#9fe0ff', '#000', 5);
  }
  ctx.restore();
}
function drawTagsHalf(ar, R, list) {
  const V = cam.V, toS = (x, y) => ({ x: VC.x + (x - V.x) * V.z, y: VC.y + (y - V.y) * V.z });
  const n = list.length; if (!n && !texts.length) return;
  const fsz = n > 10 ? 19 : n > 6 ? 21 : 24, font = fsz + 'px Russo, Arial, sans-serif';
  ctx.font = font; ctx.textBaseline = 'alphabetic';
  const items = list.filter((f) => f.J).map((f) => {
    const top = Math.min(f.J.head.y - f.J.hr * 2.6, f.J.hF.y - f.J.hr, f.J.hB.y - f.J.hr) - 6;
    const p = toS(f.x, top);
    const nm = (f === KING.f ? '👑 ' : '') + (f.boss ? 'BOSS' : (n > 10 ? String(f.name).slice(0, 9) : shortNick(f.name)));
    const label = nm + ' ' + formatHp(Math.max(0, f.hp));
    return { f, hx: p.x, hy: p.y, x: p.x, y: p.y, label, w: ctx.measureText(label).width + 18 };
  }).sort((a, b) => a.hx - b.hx);
  const levels = n > 9 ? 3 : n > 4 ? 2 : 1, step = fsz + 18;
  items.forEach((it, i) => { it.lv = i % levels; });
  for (let lv = 0; lv < levels; lv++) {
    const row = items.filter((it) => it.lv === lv);
    for (let i = 1; i < row.length; i++) { const a = row[i - 1], b = row[i], m = a.x + (a.w + b.w) / 2 + 4; if (b.x < m) b.x = m; }
    for (let i = row.length - 1; i >= 0; i--) { const b = row[i], lim = i === row.length - 1 ? W - b.w / 2 - 6 : row[i + 1].x - (row[i + 1].w + b.w) / 2 - 4; if (b.x > lim) b.x = lim; }
    for (const b of row) b.x = Math.max(b.x, b.w / 2 + 6);
  }
  const hs = items.filter((it) => it.f.onGround).map((it) => it.hy).sort((a, b) => a - b);
  const base = hs.length ? hs[Math.floor(hs.length * 0.25)] : (items[0] ? items[0].hy : R.y + R.h / 2);   // aligned rows: one baseline per arena
  for (const it of items) it.y = clamp(Math.min(base, it.hy) - 10 - it.lv * step, R.y + fsz + 66, R.y + R.h - 20);
  // leader lines first, then plates
  ctx.lineWidth = 2;
  for (const it of items) if (Math.abs(it.x - it.hx) > 8 || it.lv) { ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(it.x, it.y + 9); ctx.lineTo(it.hx, Math.max(it.y + 9, Math.min(it.hy, R.y + R.h - 8))); ctx.stroke(); }
  ctx.textAlign = 'center';
  for (const it of items) {
    const f = it.f, t = TEAMS[f.team] || TEAMS[0], hp = clamp(f.hp / Math.max(1, f.maxHp), 0, 1);
    const x = Math.round(it.x), y = Math.round(it.y), w = it.w, top = y - fsz - 3;
    ctx.globalAlpha = 0.95; ctx.fillStyle = f.boss ? '#2a1640' : t.panel; roundRect(x - w / 2, top, w, fsz + 16, 8); ctx.fill();
    ctx.strokeStyle = f.boss ? '#d6b4ff' : f.swordTier >= 2 ? '#ffd84a' : t.ui; ctx.lineWidth = f.swordTier ? 3 : 2; ctx.stroke();
    ctx.font = font; ctx.fillStyle = f.boss ? '#ecdcff' : t.text; ctx.fillText(it.label, x, y);
    ctx.fillStyle = '#000'; ctx.fillRect(x - w / 2 + 6, y + 4, w - 12, 6);
    ctx.fillStyle = hp > 0.5 ? '#3dff7a' : hp > 0.25 ? '#ffd23f' : '#ff4040'; ctx.fillRect(x - w / 2 + 6, y + 4, Math.max(2, (w - 12) * hp), 6);
    ctx.globalAlpha = 1;
    if (f.combo >= 3) {
      const sc = 1 + Math.max(0, f.comboPop) * 2;
      ctx.save(); ctx.translate(clamp(it.hx, 90, W - 90), Math.max(R.y + 110, top - 22)); ctx.scale(sc, sc); ctx.rotate(-0.08);
      outlined(f.combo + ' HITS!', 0, 0, '34px Bangers, Impact', '#ffd84a', '#000', 6); ctx.restore();
    }
  }
  for (const t of texts) {
    if ((t.ar | 0) !== ar) continue;
    const p = toS(t.x, t.y), a = clamp(t.life / t.max * 1.5, 0, 1), pop = 1 + Math.max(0, t.life - t.max + 0.12) * 4;
    const y = clamp(p.y + t.oy, R.y + 90, R.y + R.h - 20), x = clamp(p.x, 110, W - 110);
    ctx.globalAlpha = a; outlined(t.text, x, y, `${Math.round(t.size * pop)}px Bangers, Impact, sans-serif`, t.color, '#000', 5);
  }
  ctx.globalAlpha = 1;
}
function renderSplit() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#04050f'; ctx.fillRect(0, 0, W, H);
  const R = splitRects(), saveV = cam.V;
  if (R[0].h > 2) renderPass(0, R[0]);
  if (R[1].h > 2) renderPass(1, R[1]);
  cam.V = saveV; VC.x = W / 2; VC.y = VIEW_CY;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const y = R[1].y;
  if (y > VIEW_TOP + 2 && y < VIEW_BOT - 2) { ctx.fillStyle = '#05060d'; ctx.fillRect(0, y - 5, W, 10); ctx.fillStyle = '#ffd84a'; ctx.fillRect(0, y - 2, W, 4); }
  drawHUD();
}
// ---------- slim HUD: one title/info row + one rule row on top, a one-line ticker at the bottom
function drawSlimHUD() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(4,5,14,0.97)'; ctx.fillRect(0, 0, W, VIEW_TOP); ctx.fillStyle = '#ffd84a'; ctx.fillRect(0, VIEW_TOP - 3, W, 3);
  const title = G_().title || 'CHIBI CLASH';
  ctx.textAlign = 'left'; outlined(title, 18, 54, '48px Bangers, Impact, sans-serif', '#ffffff', '#2f7bff', 10);
  const limit = G_().roundSeconds || 300, left = Math.max(0, limit - (round.state === 'fight' ? round.time : 0));
  const clk = Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
  ctx.textAlign = 'right';
  outlined((round.n > 0 ? 'R' + round.n + '  ' : '') + clk, W - 18, 54, '48px Bangers, Impact, sans-serif', round.sudden && round.state === 'fight' ? '#ff6060' : '#ffffff', '#000', 8);
  const alive = aliveCount(), q = waitQ.length, full = q >= WAIT_MAX;
  const info = alive + ' LEFT  ·  RESERVED ' + q + '/' + WAIT_MAX + (full ? ' FULL' : '');
  ctx.textAlign = 'center'; let ifs = 28; ctx.font = ifs + 'px Russo, Arial';
  while (ifs > 18 && ctx.measureText(info).width > 470) { ifs--; ctx.font = ifs + 'px Russo, Arial'; }
  outlined(info, W / 2 + 40, 50, ifs + 'px Russo, Arial, sans-serif', full ? '#ffb15a' : '#d5def8', '#000', 5);
  const rule = 'LIKE / COMMENT = JOIN ' + LIKE_HP() + ' HP   ·   GIFT = +' + GIFT_X() + ' HP PER COIN + SWORD';
  let rfs = 26; ctx.font = rfs + 'px Russo, Arial';
  while (rfs > 16 && ctx.measureText(rule).width > W - 30) { rfs--; ctx.font = rfs + 'px Russo, Arial'; }
  outlined(rule, W / 2, 94, rfs + 'px Russo, Arial, sans-serif', '#ffe08a', '#000', 5);
  if (!OVERLAY && !MANUAL) {
    const m = S.live.mode, lab = m === 'live' ? '● TikFinity connected' : '● waiting for TikFinity';
    ctx.textAlign = 'left'; outlined(lab, 18, 16, '14px Russo, Arial', m === 'live' ? '#7dffb0' : '#d5def8', '#000', 3);
  }
  if (SPLIT.final && round.state === 'fight') {
    ctx.fillStyle = 'rgba(5,6,13,0.78)'; roundRect(14, VIEW_TOP + 12, 210, 42, 12); ctx.fill(); ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 3; ctx.stroke();
    ctx.textAlign = 'left'; outlined('FINAL ARENA', 29, VIEW_TOP + 44, '30px Bangers, Impact, sans-serif', '#ffd84a', '#000', 5);
  }
  // bottom ticker
  ctx.fillStyle = 'rgba(5,8,22,0.97)'; ctx.fillRect(0, VIEW_BOT, W, H - VIEW_BOT); ctx.fillStyle = '#ffd84a'; ctx.fillRect(0, VIEW_BOT, W, 3);
  ctx.textAlign = 'center';
  const phase = round.state === 'fight' && round.sudden ? 'FINAL RUSH · MOST HP WINS AT 0:00' : SPLIT.final ? 'FINAL ARENA · LAST ONE STANDING WINS' : 'LAST ONE STANDING WINS · MOST HP AT 0:00';
  outlined(phase, W / 2, VIEW_BOT + 32, '28px Bangers, Impact, sans-serif', '#ffd84a', '#000', 5);
  const it = feed[feed.length - 1];
  if (it) {
    const text = it.parts.map((p) => p[0]).join('').replace(/\s+/g, ' ').trim();
    ctx.globalAlpha = clamp(it.life, 0, 1);
    outlined(text.length > 52 ? text.slice(0, 51) + '…' : text, W / 2, VIEW_BOT + 64, '22px Russo, Arial, sans-serif', '#ffffff', '#000', 4);
    ctx.globalAlpha = 1;
  }
  // centre-screen moments
  if (round.state === 'lobby' && alive < 2) {
    outlined(alive === 0 ? 'COMMENT OR LIKE TO JOIN' : 'NEED ONE MORE FIGHTER', W / 2, VIEW_CY - 20, '64px Bangers, Impact, sans-serif', '#ffffff', '#1340a8', 10);
    outlined('Comment or like joins at ' + LIKE_HP() + ' HP. Gifts add ' + GIFT_X() + ' HP per coin.', W / 2, VIEW_CY + 50, '26px Russo, Arial, sans-serif', '#ffd84a', '#000', 5);
  }
  if (round.state === 'countdown') {
    const n = Math.max(1, 3 - Math.floor(round.t / 0.8)), fr = (round.t % 0.8) / 0.8;
    ctx.globalAlpha = 1 - fr * 0.55;
    outlined(String(n), W / 2, VIEW_CY + 70, Math.round(200 * (1.25 - fr * 0.25)) + 'px Bangers, Impact, sans-serif', '#ffffff', '#1340a8', 14);
    ctx.globalAlpha = 1;
  }
  if (round.state === 'end' && round.t > 0.3 && round.results) drawResults();
  for (let i = 0; i < callouts.length; i++) {
    const c = callouts[i], age = c.max - c.life, k = clamp(age * 6, 0, 1), a = clamp(c.life * 3, 0, 1);
    const y = VIEW_CY - 10 - (callouts.length - 1 - i) * 130;
    ctx.globalAlpha = a;
    ctx.save(); ctx.translate(W / 2, y); ctx.scale(lerp(1.4, 1, k), lerp(1.4, 1, k));
    let fs = Math.min(c.size, 120); ctx.font = fs + 'px Bangers, Impact, sans-serif';
    while (ctx.measureText(c.text).width > 980 && fs > 36) { fs -= 4; ctx.font = fs + 'px Bangers, Impact, sans-serif'; }
    outlined(c.text, 0, 0, fs + 'px Bangers, Impact, sans-serif', c.color, '#000', 10);
    if (c.sub) outlined(c.sub, 0, 54, '40px Bangers, Impact, sans-serif', '#ffd84a', '#000', 7);
    ctx.restore();
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'center';
}
