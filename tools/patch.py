#!/usr/bin/env python3
"""Builds clash-live/game.js from the original stick-fight game.js (stickref) + CHIBI CLASH changes.
Every replacement must match exactly once, so a changed source fails loudly instead of silently."""
import sys
SRC = '/workspace/stickref/game.js'; DST = '/workspace/clash-live/game.js'
s = open(SRC, encoding='utf-8').read()
def R(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit(f'PATCH FAIL ({n} matches, want {count}): {old[:90]!r}')
    s = s.replace(old, new)

# ---------- header
R("/* STICK FIGHT - free-for-all stickman pit for TikTok LIVE.\n   A like or a comment drops you in at 50 HP (once). Follow is 100 HP. Gifts add 50 HP per coin.\n   Events come from server.js over WebSocket (or the test buttons). */",
  "/* CHIBI CLASH - free-for-all chibi brawl for TikTok LIVE Studio (PC, 1080x1920 Link source).\n   Fight engine (motion, choreography, hits, reactions, effects) = the original STICK FIGHT game.js, unchanged.\n   Hybrid changes: chibi skin (chibi.js), TikFinity local events (live.js), 30 fighting + 80 reserved, 5:00 rounds,\n   1 coin = +30 HP, gift swords, KING crown, BOSS, FINAL RUSH, results board, carry-over. No server needed. */")
# ---------- no saved TikTok name / no phone flow
R("(function rememberUser() {\n  if (QS.has('manual')) return;", "(function rememberUser() {\n  return;   // CHIBI CLASH: no name flow; events come from TikFinity on this PC\n  if (QS.has('manual')) return;")
R("const USER = cleanName(QS.get('user'));", "const USER = '';\nconst OVERLAY = QS.has('overlay') || QS.has('clean');   // ?overlay=1: clean stream picture, no test panel")
# ---------- settings defaults
R("game: { roundSeconds: 90, likeHp: 50, followHp: 100, giftMultiplier: 50, maxFighters: 24, heroHp: 50, fighterSize: 1.1, damage: 1, suddenDeathDamage: 2, slowMotion: true, sound: true, volume: 0.8, refereeVoice: true, refereeVolume: 1, title: 'STICK FIGHT' },",
  "game: { roundSeconds: 300, likeHp: 50, followHp: 0, giftMultiplier: 30, maxFighters: 30, heroHp: 50, fighterSize: 1.1, damage: 1, suddenDeathDamage: 1.5, finalRushSeconds: 30, bossEvery: 90, bossSeconds: 25, slowMotion: true, sound: true, volume: 0.8, refereeVoice: false, refereeVolume: 1, title: 'CHIBI CLASH' },")
R("  live: { mode: 'simulator', username: '' }\n};", "  live: { mode: 'connecting', username: '' }\n};")
R("return clamp(Number.isFinite(n) && n > 0 ? n : 24, 8, 40);", "return clamp(Number.isFinite(n) && n > 0 ? n : 30, 8, 40);")
# ---------- chipmunk voices (his effort/pain samples pitched up)
R("  kiai: (a, o, t, p) => smp(a, o, t, 'effort', 0.55, clamp(p, 0.86, 1.12), 0.04),\n  kiai2: (a, o, t, p) => smp(a, o, t, 'effort', 0.46, clamp(p * 1.06, 0.86, 1.18), 0.04),\n  grunt: (a, o, t, p) => smp(a, o, t, 'pain', 0.5, clamp(p, 0.88, 1.12), 0.04),",
  "  kiai: (a, o, t, p) => smp(a, o, t, 'effort', 0.5, CHIP * clamp(p, 0.86, 1.12), 0.05),          // chipmunk 'hup!'\n  kiai2: (a, o, t, p) => smp(a, o, t, 'effort', 0.42, CHIP * clamp(p * 1.06, 0.86, 1.18), 0.05),\n  grunt: (a, o, t, p) => smp(a, o, t, 'pain', 0.46, CHIP * clamp(p, 0.88, 1.12), 0.05),")
R("  ko: (a, o, t, p) => { smp(a, o, t, 'body', 1, 0.65); smp(a, o, t + 0.05, 'pain', 0.55, 0.85, 0.03); smp(a, o, t + 0.9, 'fall', 1); },",
  "  ko: (a, o, t, p) => { smp(a, o, t, 'body', 1, 0.65); smp(a, o, t + 0.05, 'pain', 0.5, CHIP * 0.95, 0.03); smp(a, o, t + 0.9, 'fall', 1); },")
R("const SB = { buf: {}, last: {}, ready: null, ok: false };", "const SB = { buf: {}, last: {}, ready: null, ok: false };\nconst CHIP = 1.6;   // voice pitch-up for the chibi chipmunk barks")
# ---------- no /tts server: referee voice off (static VO clips in sounds/vo still play)
R("function refereeSay(text) {\n  if (!text || S.game.refereeVoice === false) return;", "function refereeSay(text) {\n  return;   // CHIBI CLASH: the /tts voice needed the old server. Static trash-talk clips (sounds/vo) still play.\n  if (!text || S.game.refereeVoice === false) return;")
# ---------- TikTok-safe: no lightning flashes, impact frames at most every 2.5 s
R("    WX.flash = 1; WX.bolt = makeBolt();", "    WX.flash = 0; WX.bolt = null;   // CHIBI CLASH: no lightning flashes (photosensitivity / TikTok safety)")
R("  if (!force && (fx.impactCd > 0 || crowdSize() >= 5)) return;\n  fx.impact = { x, y, t: dur, dur, mode }; fx.impactCd = 1.6;",
  "  if (fx.impactCd > 0 || (!force && crowdSize() >= 5)) return;\n  fx.impact = { x, y, t: dur, dur, mode }; fx.impactCd = 2.5;")
# ---------- fairness: swords look great but hit like gloves (+~10% over a jab-cross), gift HP is the gift reward
R("  const dmg = Math.max(1, Math.round(h.dmg * (A ? A.dmgMul() : 1) * DMG_SCALE * dmgMods(D)));\n  D.hp -= dmg; D.flash = 0.08;",
  "  const dmg = Math.max(1, Math.round(h.dmg * (h.sword ? 0.72 : 1) * toughMul(D) * (A ? A.dmgMul() : 1) * DMG_SCALE * dmgMods(D)));\n  D.hp -= dmg; D.flash = 0.08;\n  try { statHit(A, D, dmg); } catch (e) {}")
# ---------- KO bookkeeping (credit only to the fighter who landed the last hit), boss never counts as a fighter
R("  if (A) A.kills++;\n  addFeed(", "  if (A) A.kills++;\n  try { statKO(A, D); } catch (e) {}\n  addFeed(")
R("  tryDropQueued();\n  const others = fighters.filter((f) => f.alive).length;", "  tryDropQueued();\n  const others = fighters.filter((f) => f.alive && !f.boss).length;")
R("function aliveCount() { return fighters.reduce((n, f) => n + (f.alive ? 1 : 0), 0); }", "function aliveCount() { return fighters.reduce((n, f) => n + (f.alive && !f.boss ? 1 : 0), 0); }")
R("  for (const f of fighters) if (f.alive && !f.giant) f.ts = s;", "  for (const f of fighters) if (f.alive && !f.giant && !f.boss) f.ts = s;")
# ---------- 1 s spawn shield after landing (blinks while protected)
R("    if (T.invulnUntilLand) { T.invulnUntilLand = false; T.invuln = 0; }", "    if (T.invulnUntilLand) { T.invulnUntilLand = false; T.invuln = 1.0; }")
# ---------- players: gender + look + sword carry
R("    baseHp, bonusHp: 0, coins: 0, wins: 0,\n    fighter: null, queued: false, eliminated: false, avatarUrl: '', avatarRec: null\n  };",
  "    baseHp, bonusHp: 0, coins: 0, wins: 0,\n    fighter: null, queued: false, eliminated: false, avatarUrl: '', avatarRec: null,\n    gender: '', look: null, lastSeen: clock, kos: 0, taken: 0, dealt: 0, lowest: 1, joinedAt: clock\n  };")
R("function makePlayer(ev, baseHp) {\n  return {", "function makePlayer(ev, baseHp) {\n  return withLook({")
R("    gender: '', look: null, lastSeen: clock, kos: 0, taken: 0, dealt: 0, lowest: 1, joinedAt: clock\n  };", "    gender: '', look: null, lastSeen: clock, kos: 0, taken: 0, dealt: 0, lowest: 1, joinedAt: clock\n  }, ev);")
R("  f.avatarRec = p.avatarRec || null;\n  f.lastTouch = clock;", "  f.avatarRec = p.avatarRec || null;\n  f.look = p.look; if (swordTierOf(p)) { f.setWeapon('sword'); f.swordTier = swordTierOf(p); }\n  f.lastTouch = clock;")
R("    this.weapon = w; this.heavyBlade = w === 'sword' && this.team === 1;", "    this.weapon = w; this.heavyBlade = false;   // every gift sword is the same length (fair)")
# ---------- comments: girl/boy pick
R("function onComment(ev) {\n  const id = pid(ev);\n  let p = roster.get(id);\n  if (p) {\n    rememberNick(p, ev);",
  "function onComment(ev) {\n  const id = pid(ev);\n  let p = roster.get(id);\n  if (p) {\n    rememberNick(p, ev);\n    pickGender(p, ev);")
# ---------- follow: no HP, no join (thank-you line only)
R("function onFollow(ev) {\n  const id = pid(ev);", "function onFollow(ev) {\n  addFeed([[String(ev.nick || 'someone').slice(0, 18), '#7fb2ff'], [' followed — thank you!', '#c9d6ff']], 5);\n  return;   // CHIBI CLASH: follows give no HP and do not join\n  const id = pid(ev);")
R("  if (!p || t === 'gift' || t === 'follow') return true;", "  if (t === 'follow') return false;\n  if (!p || t === 'gift') return true;")
# ---------- gifts: 30 HP per coin, sword tiers
R("  const reward = coins * GIFT_X() * count;   // 50 HP per coin: Rose = 50, 10 coins = 500, 100 coins = 5,000",
  "  const reward = coins * GIFT_X() * count;   // 30 HP per coin: Rose = 30, 10 coins = 300, 100 coins = 3,000")
R("  p.bonusHp += reward;\n  p.coins += coins * count;", "  p.bonusHp += reward;\n  const tier0 = swordTierOf(p);\n  p.coins += coins * count; p.lastSeen = clock;")
R("    f.maxHp += reward; f.hp += reward; f.giftDmg = 1; f.name = p.nick;", "    f.maxHp += reward; f.hp += reward; f.giftDmg = 1; f.name = p.nick;\n    giveSword(f, p, tier0);")
R("    if (reward >= 100 && round.state === 'fight' && talk.life < 0.4) callout(p.nick, '+' + formatHp(reward) + ' HP', '#ffd84a', 92, 1.5);\n  } else if", "    if (reward >= 300 && round.state === 'fight' && talk.life < 0.4) callout(p.nick, '+' + formatHp(reward) + ' HP', '#ffd84a', 92, 1.5);\n  } else if")
R("      spawned.giftDmg = 1; spawned.auraT = Math.max(spawned.auraT, 2.4);\n      if (reward >= 100", "      spawned.giftDmg = 1; spawned.auraT = Math.max(spawned.auraT, 2.4); giveSword(spawned, p, 0);\n      if (reward >= 300")
# ---------- events: remember who is present
R("function dispatchEvent(ev) {\n  if (!ev || !ev.type) return;", "function dispatchEvent(ev) {\n  if (!ev || !ev.type) return;\n  if (ev.type === 'like' || ev.type === 'chat' || ev.type === 'comment' || ev.type === 'gift' || ev.type === 'join') { const q = roster.get(pid(ev)); if (q) { q.lastSeen = clock; if (q.fighter && q.fighter.alive) CUR_AR = q.fighter.ar | 0; } }")
# ---------- rounds: FINAL RUSH + highest HP at 5:00, boss, king, results
R("""    const limit = G_().roundSeconds || 90;
    if (!round.sudden && round.time > limit) {
      round.sudden = true; round.sdT = 0;
      callout('SUDDEN DEATH!', 'HITS HIT HARDER', '#ff4545', 120, 1.6);
      sfx('sudden'); shake(12);
    }""", """    const limit = G_().roundSeconds || 300, rush = G_().finalRushSeconds ?? 30;
    if (!round.sudden && round.time > limit - rush) {
      round.sudden = true; round.sdT = 0;
      callout('FINAL RUSH!', 'LAST ' + rush + ' SECONDS · HITS x' + (G_().suddenDeathDamage ?? 1.5), '#ff4545', 120, 1.8);
      sfx('sudden'); sfx('crowd'); shake(12);
    }
    updateBoss(dt); updateKing();
    if (round.time >= limit) { round.timeUp = true; endRound(topHpFighter()); return; }""")
R("    if (alive.length <= 1 && round.startedWith >= 2 && round.t > 0.45 && !waitQ.length) {", "    const fightersLeft = alive.filter((f) => !f.boss);\n    if (fightersLeft.length <= 1 && round.startedWith >= 2 && round.t > 0.45 && !waitQ.length) {")
R("      if (timeCtl.slowT <= 0.08) endRound(alive[0] || null);", "      if (timeCtl.slowT <= 0.08) endRound(fightersLeft[0] || null);")
R("  if (round.state === 'end' && round.t > 6.6) openNextRound();", "  if (round.state === 'end' && round.t > RESULTS_SECONDS) openNextRound();")
R("  bullets.length = 0; bombs.length = 0; strikeQueue.length = 0; planes.length = 0;\n  for (const f of fighters) if (f.alive) f.invuln = 99;\n  clearGiftsExceptChampion();",
  "  bullets.length = 0; bombs.length = 0; strikeQueue.length = 0; planes.length = 0;\n  removeBoss('');\n  for (const f of fighters) if (f.alive) f.invuln = 99;\n  try { buildResults(); } catch (e) { showErr('results', e); }\n  carryOver();")
R("  round.sudden = false; round.sdT = 0; round.winnerF = null; round.winner = -1; round.startedWith = 0;\n  endSetPiece();",
  "  round.sudden = false; round.sdT = 0; round.winnerF = null; round.winner = -1; round.startedWith = 0;\n  round.timeUp = false; round.results = null; round.bossAt = G_().bossEvery || 90; round.bosses = 0; round.slayer = null; KING.f = null;\n  for (const q of roster.values()) { q.kos = 0; q.taken = 0; q.dealt = 0; q.lowest = 1; q.outAt = 0; q.place = 0; }\n  ELIM.length = 0;\n  endSetPiece();")
R("    const champLine = champName + ' wins! ' + champName + ' stays on as champion!';", "    const champLine = champName + (round.timeUp ? ' wins on HP!' : ' is the last one standing!');")
# ---------- drawing: chibi skin on the same joints
R("function fillBody(J, s, color, g = 0) {\n  if (!J || !J.head || !J.hip) return;", "function fillBody(J, s, color, g = 0) {\n  if (!J || !J.head || !J.hip) return;\n  return chibiSilhouette(DC, J, s, color, g);   // CHIBI CLASH: ghosts / impact frames use the chibi outline")
R("function drawRagdoll(r) {\n  const J = {}; RD_KEYS.forEach((k, i) => (J[k] = r.pts[i])); J.hr = r.hr;\n  drawBody(J, r.team, r.s, r.flash > 0, clamp(r.life, 0, 1));\n}",
  "function drawRagdoll(r) {\n  const J = {}; RD_KEYS.forEach((k, i) => (J[k] = r.pts[i])); J.hr = r.hr;\n  if (!r.look) { drawBody(J, r.team, r.s, r.flash > 0, clamp(r.life, 0, 1)); return; }\n  ctx.globalAlpha = clamp(r.life, 0, 1);\n  drawChibi(ctx, J, r.s, r.face || 1, r.look, { flash: r.flash > 0, expr: 'ko' });\n  ctx.globalAlpha = 1;\n}")
R("  return { pts, cons, team: f.team, s: f.s, life: 5, pdt: dt0, hr: J.hr, flash: 0.12 };", "  return { pts, cons, team: f.team, s: f.s, life: 5, pdt: dt0, hr: J.hr, flash: 0.12, look: f.look, face: f.face, ar: f.ar | 0 };")
R("  drawBody(J, f.team, s, f.flash > 0, blink ? 0.7 : 1);\n  drawWeapon(f);\n  drawEyes(f);\n  if (!lying) { drawFace(f); if (ta > 0.01 || f.talk) drawMouth(f, ta); }",
  "  if (f.look) {\n    if (f === KING.f) drawKingGlow(f);\n    ctx.globalAlpha = blink ? 0.7 : 1;\n    drawChibi(ctx, J, s, f.face * (f.spinFace || 1), f.look, { flash: f.flash > 0, expr: chibiExpr(f, lying), talk: ta });\n    ctx.globalAlpha = 1;\n  } else drawBody(J, f.team, s, f.flash > 0, blink ? 0.7 : 1);\n  drawWeapon(f);\n  drawEyes(f);\n  if (!lying && !f.look) { drawFace(f); if (ta > 0.01 || f.talk) drawMouth(f, ta); }\n  if (f === KING.f && !lying) drawKingCrown(f);")
R("  if (f.weapon === 'sword') {\n    const tip = J.sw, h = J.hF;", "  if (f.weapon === 'sword' && f.swordTier && !sil) { drawTierSword(ctx, J.hF, J.sw, s, f.swordTier, clock); return; }\n  if (f.weapon === 'sword') {\n    const tip = J.sw, h = J.hF;")
R("this.eyeTr.push({ x: J.head.x + fc * hr * 0.42, y: J.head.y - hr * 0.12 });", "this.eyeTr.push(this.look ? chibiEyePos(J, fc) : { x: J.head.x + fc * hr * 0.42, y: J.head.y - hr * 0.12 });")
R("function avatarReady(f) {", "function avatarReady(f) {\n  return false;   // CHIBI CLASH: the chibi face is the face (no profile photo on the head)")
R("const WEAPON_NAMES = { sword: 'KATANA',", "const WEAPON_NAMES = { sword: 'SWORD',")
# name tags sit above the bigger chibi head
R("    const top = Math.min(f.J.head.y, f.J.hF.y, f.J.hB.y, f.J.fF.y, f.J.fB.y) - f.J.hr - 8;", "    const top = Math.min(f.J.head.y - f.J.hr * 2.6, f.J.hF.y - f.J.hr, f.J.hB.y - f.J.hr, f.J.fF.y - f.J.hr, f.J.fB.y - f.J.hr) - 8;")
R("    if (f.weapon !== 'fists') { ctx.font = '17px Russo, Arial'; ctx.fillStyle = '#ffd84a'; ctx.fillText(WEAPON_NAMES[f.weapon]", "    if (f.boss) { ctx.font = '22px Bangers, Impact'; ctx.fillStyle = '#d6b4ff'; ctx.fillText('BOSS · ' + Math.max(0, Math.ceil(bossLeft(f))) + 's', p.x, ty - fs - 10); }\n    else if (f.weapon !== 'fists') { ctx.font = '17px Russo, Arial'; ctx.fillStyle = '#ffd84a'; ctx.fillText((f.swordTier >= 3 ? 'LEGEND ' : f.swordTier >= 2 ? 'ROYAL ' : '') + WEAPON_NAMES[f.weapon]")
# ---------- HUD text
R("  const phase = round.state === 'lobby' ? 'LOBBY' : round.state === 'countdown' ? 'GET READY' : round.state === 'end' ? 'WINNER' : round.sudden ? 'SUDDEN DEATH' : 'FIGHTING';\n  const fullLine = queued >= WAIT_MAX;\n  const info = (round.n > 0 ? 'ROUND ' + round.n + '   ·   ' : '') + alive + ' FIGHTING   ·   WAITING ' + queued + '/' + WAIT_MAX + (fullLine ? ' FULL' : '');",
  "  const phase = round.state === 'lobby' ? 'LOBBY' : round.state === 'countdown' ? 'GET READY' : round.state === 'end' ? 'WINNER' : round.sudden ? 'FINAL RUSH' : 'FIGHTING';\n  const fullLine = queued >= WAIT_MAX;\n  const left = Math.max(0, (G_().roundSeconds || 300) - (round.state === 'fight' ? round.time : 0)), clockTxt = Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');\n  const info = (round.n > 0 ? 'ROUND ' + round.n + '  ·  ' : '') + (round.state === 'fight' || round.state === 'countdown' ? clockTxt + '  ·  ' : '') + alive + ' LEFT  ·  RESERVED ' + queued + '/' + WAIT_MAX + (fullLine ? ' FULL' : '');")
R("  outlined(info, W / 2, 112, ifs + 'px Russo, Arial, sans-serif', fullLine ? '#ffb15a' : (phase === 'SUDDEN DEATH' ? '#ff6060' : '#d5def8'), '#000', 5);", "  outlined(info, W / 2, 112, ifs + 'px Russo, Arial, sans-serif', fullLine ? '#ffb15a' : (phase === 'FINAL RUSH' ? '#ff6060' : '#d5def8'), '#000', 5);")
R("  const legend = 'LIKE / COMMENT = ' + likeHp + ' HP    ·    FOLLOW = ' + followHp + ' HP    ·    GIFT = ' + mul + ' / COIN';", "  const legend = 'LIKE / COMMENT = JOIN ' + likeHp + ' HP    ·    GIFT = +' + mul + ' HP / COIN + SWORD';")
R("  outlined('1 COIN → ' + formatHp(mul) + '      ·      100 COINS → ' + formatHp(mul * 100), W / 2, 190, '22px Russo, Arial, sans-serif', '#ffe08a', '#000', 4);", "  outlined('comment  girl  or  boy  to pick your fighter   ·   10 coins = ' + formatHp(mul * 10) + ' HP', W / 2, 190, '22px Russo, Arial, sans-serif', '#ffe08a', '#000', 4);")
R("  outlined('LAST ONE STANDING WINS', W / 2, VIEW_BOT + 40,", "  outlined(round.sudden && round.state === 'fight' ? 'FINAL RUSH · MOST HP WINS AT 0:00' : 'LAST ONE STANDING WINS', W / 2, VIEW_BOT + 40,")
R("    outlined('Comment or like joins at ' + likeHp + ' HP. Follow is ' + followHp + '. Gifts are ' + mul + ' HP per coin.', W / 2, 930,", "    outlined('Comment or like joins at ' + likeHp + ' HP. Gifts add ' + mul + ' HP per coin.', W / 2, 930,")
R("  if (round.state === 'end' && round.t > 0.3) {\n    const w = round.winnerF;", "  if (round.state === 'end' && round.t > 0.3 && round.results) drawResults();\n  else if (round.state === 'end' && round.t > 0.3) {\n    const w = round.winnerF;")
R("  let label, color;\n  if (m === 'live') { label = '● Connected to LIVE'; color = '#7dffb0'; }\n  else if (m === 'simulator') { label = '● test mode'; color = '#ffd23f'; }",
  "  let label, color;\n  if (OVERLAY || MANUAL) { label = ''; color = '#000'; }\n  else if (m === 'live') { label = '● TikFinity connected'; color = '#7dffb0'; }\n  else if (m === 'simulator') { label = '● test mode'; color = '#ffd23f'; }")
R("  else { label = '● Connecting...'; color = '#d5def8'; }", "  else { label = '● waiting for TikFinity'; color = '#d5def8'; }")
R("  const title = G_().title || 'STICK FIGHT';", "  const title = G_().title || 'CHIBI CLASH';")
# ---------- test panel / keys
R("  if (QS.has('clean') || MANUAL || USER || TOUCH_UI) panel.classList.add('hidden');\n  if (TOUCH_UI && !QS.has('clean') && !MANUAL) {", "  if (OVERLAY || MANUAL) panel.classList.add('hidden');\n  if (false) {")
R("const SIM_GIFTS = [[1, 'KeyQ', 'Rose'], [10, 'KeyE', 'TikTok'], [100, 'KeyR', 'Galaxy'], [500, 'KeyT', 'Lion']];", "const SIM_GIFTS = [[1, 'KeyQ', 'Rose'], [10, 'KeyE', 'Doughnut'], [100, 'KeyR', 'Hat'], [500, 'KeyT', 'Lion']];")
R("function simCommentNew() { const u = faceFor(newFake()); sim.last = u; onEvent({ type: 'chat', ...u, text: 'join' }); return u; }",
  "function simCommentNew(text = 'join') { const u = faceFor(newFake()); sim.last = u; onEvent({ type: 'chat', ...u, text }); return u; }")
R("  else if (r < 0.48) simFollowNew();\n  else if (r < 0.58) simFollowLast();", "  else if (r < 0.48) simCommentNew(pick(['girl', 'boy', 'hi', 'lets go']));\n  else if (r < 0.58) simCommentAgain();")
R("    else if (e.code === 'KeyF') followBtn();\n    else if (e.code === 'KeyG') followLastBtn();",
  "    else if (e.code === 'KeyF') followBtn();\n    else if (e.code === 'KeyY') simCommentNew('girl');\n    else if (e.code === 'KeyU') simCommentNew('boy');\n    else if (e.code === 'KeyB') spawnBoss(true);\n    else if (e.code === 'KeyX') { const v = fighters.filter((f) => f.alive && !f.boss); if (v.length) SF.knockOut(pick(v).name); }")
R("  bind('followLastBtn', followLastBtn);", "  bind('followLastBtn', followLastBtn);\n  bind('girlBtn', () => simCommentNew('girl')); bind('boyBtn', () => simCommentNew('boy')); bind('bossBtn', () => spawnBoss(true));")
# ---------- boot: local settings, TikFinity, no tap screen, no service worker
R("    const r = await fetch('/settings.json' + UQ, { cache: 'no-store' });", "    const r = await fetch('settings.json', { cache: 'no-store' });")
R("      S.live = j.live || S.live;", "      S.live = { mode: 'connecting', username: '' };")
R("  safe('panel', setupPanel); safe('live', updateLiveInfo); safe('ws', connectWS);", "  safe('panel', setupPanel); safe('live', updateLiveInfo); if (!MANUAL && !QS.has('notikfinity')) safe('tikfinity', connectTikFinity);")
R("  safe('start', setupStart);\n", "")
R("  safe('sw', registerSW);\n", "")
R("    cam, duel, timeCtl, ready: true, soundsReady: () => loadSamples(), bubble, audioLogAll: () => AU.log,",
  "    cam, duel, timeCtl, ready: true, soundsReady: () => loadSamples(), bubble, audioLogAll: () => AU.log, renderAudio, spawnBoss, results: () => round.results, king: () => KING.f && KING.f.name, tf: TF,")
R("    fighters: fighters.filter((f) => f.alive).map((f) => ({ id: f.viewerId, name: f.name, hp: Math.round(f.hp), max: Math.round(f.maxHp), dmg: +((f.giftDmg || 1).toFixed(2)) })),",
  "    fighters: fighters.filter((f) => f.alive).map((f) => ({ id: f.viewerId, name: f.name, hp: Math.round(f.hp), max: Math.round(f.maxHp), boss: !!f.boss, sword: f.swordTier || 0, gender: f.look && f.look.gender, inv: +f.invuln.toFixed(2), mv: f.mv ? f.mv.name : '', touch: +(clock - (f.lastTouch || 0)).toFixed(1), ar: f.ar | 0 })),\n      split: SPLIT.mode, final: SPLIT.final, time: +round.time.toFixed(1), sudden: round.sudden, clock: +clock.toFixed(2),")
R("roster: [...roster.values()].map((pl) => ({ id: pl.id, nick: pl.nick, base: pl.baseHp, bonus: pl.bonusHp, queued: !!pl.queued, eliminated: !!pl.eliminated })),",
  "roster: [...roster.values()].map((pl) => ({ id: pl.id, nick: pl.nick, base: pl.baseHp, bonus: pl.bonusHp, coins: pl.coins, queued: !!pl.queued, eliminated: !!pl.eliminated, kos: pl.kos, gender: pl.gender })),")

R("  if (QS.has('round')) S.game.roundSeconds = +QS.get('round');", "  if (QS.has('round')) S.game.roundSeconds = +QS.get('round');\n  if (QS.has('rush')) S.game.finalRushSeconds = +QS.get('rush');\n  if (QS.has('boss')) S.game.bossEvery = +QS.get('boss');")
# ---------- SPLIT ARENAS (top/bottom), fair gifts, no talking
R("const VIEW_TOP = 220, VIEW_BOT = 1768, VIEW_CY = 994;", "const VIEW_TOP = 112, VIEW_BOT = 1844, VIEW_CY = 978;   // CHIBI CLASH: slim HUD, max arena space")
R("  ctx.translate(W / 2, VIEW_CY); ctx.rotate(V.r); ctx.scale(V.z, V.z); ctx.translate(-V.x, -V.y);\n}", "  ctx.translate(VC.x, VC.y); ctx.rotate(V.r); ctx.scale(V.z, V.z); ctx.translate(-V.x, -V.y);\n}")
R("  return { x: W / 2 + dx * c - dy * s, y: VIEW_CY + dx * s + dy * c };", "  return { x: VC.x + dx * c - dy * s, y: VC.y + dx * s + dy * c };")
R("function render() {\n  ctx.setTransform(1, 0, 0, 1, 0, 0);", "function render() {\n  if (splitView()) { renderSplit(); return; }\n  VC.x = W / 2; VC.y = VIEW_CY;\n  ctx.setTransform(1, 0, 0, 1, 0, 0);")
R("  autoSim(rdt);\n  updateCamera(rdt);", "  autoSim(rdt);\n  try { updateSplit(rdt); } catch (e) { showErr('split', e); }\n  updateCamera(rdt);")
R("  updateDirector(dt);\n  for (const f of fighters) if (f.alive && f.brain) f.brain.update(dt);\n  for (const f of fighters) if (f.alive) f.update(dt);",
  "  CUR_AR = duel.sp && duel.sp.a ? duel.sp.a.ar | 0 : 0; updateDirector(dt);\n  for (const f of fighters) if (f.alive && f.brain) { CUR_AR = f.ar | 0; f.brain.update(dt); }\n  for (const f of fighters) if (f.alive) { CUR_AR = f.ar | 0; f.update(dt); }")
R("  for (const r of ragdolls) updateRagdoll(r, dt);\n  for (let i = ragdolls.length - 1;", "  for (const r of ragdolls) { CUR_AR = r.ar | 0; updateRagdoll(r, dt); }\n  for (let i = ragdolls.length - 1;")
R("function addPart(p) { if (parts.length < partMax()) parts.push(p); }", "function addPart(p) { if (parts.length < partMax()) { p.ar = CUR_AR; parts.push(p); } }")
R("    if (layer === 'back' ? p.k !== 'cloud' : p.k === 'cloud') continue;\n    const a = clamp(p.life / p.max, 0, 1);", "    if (layer === 'back' ? p.k !== 'cloud' : p.k === 'cloud') continue;\n    if (PAR >= 0 && p.ar !== PAR) continue;\n    const a = clamp(p.life / p.max, 0, 1);")
R("  texts.push({ x, y, text: String(text), color, size, life, max: life, oy: 0, vy: -150 });", "  texts.push({ x, y, text: String(text), color, size, life, max: life, oy: 0, vy: -150, ar: CUR_AR });")
R("    let best = this._foe && this._foe !== this && this._foe.alive ? this._foe : null;", "    let best = this._foe && this._foe !== this && this._foe.alive && (this._foe.ar | 0) === (this.ar | 0) ? this._foe : null;")
R("      if (e === this || !e.alive) continue;\n      const d = Math.abs(e.x - this.x)", "      if (e === this || !e.alive || (e.ar | 0) !== (this.ar | 0)) continue;   // split arenas: only foes in my arena\n      const d = Math.abs(e.x - this.x)")
R("      const a = live[i], b = live[j];\n      if ((a.mv && a.mv.d.pass)", "      const a = live[i], b = live[j];\n      if ((a.ar | 0) !== (b.ar | 0)) continue;\n      if ((a.mv && a.mv.d.pass)")
R("  const alive = fighters.filter((f) => f.alive);\n  const left = WALL_L + 160, right = WALL_R - 160;", "  const alive = fighters.filter((f) => f.alive && (f.ar | 0) === SPAWN_AR);\n  const left = WALL_L + 160, right = WALL_R - 160;")
R("  const xs = fighters.filter((f) => f.alive).map((f) => f.x)", "  const xs = fighters.filter((f) => f.alive && (f.ar | 0) === SPAWN_AR).map((f) => f.x)")
R("function spawnDrop(p, announce) {", "function spawnDrop(p, announce) {\n  SPAWN_AR = pickArena(); CUR_AR = SPAWN_AR;   // split arenas: the one with fewer fighters")
R("    face: x < W / 2 ? 1 : -1, scale: arenaScale(aliveCount() + 1),", "    face: x < W / 2 ? 1 : -1, scale: arenaScale(),")
R("  f.look = p.look; if (swordTierOf(p))", "  f.ar = SPAWN_AR; f.look = p.look; if (swordTierOf(p))")
R("  n = n || aliveCount() || 1;", "  n = n || (SPLIT.mode === 'split' ? Math.ceil(aliveCount() / 2) : aliveCount()) || 1;")
R("  if (n <= 2) return BASE_S;\n  if (n <= 4) return BASE_S * 0.84;\n  if (n <= 8) return BASE_S * 0.7;\n  return BASE_S * 0.56;\n}", "  if (SPLIT.mode === 'split') return BASE_S * (n <= 4 ? 0.96 : n <= 8 ? 0.9 : 0.82);   // split arenas: each half has its own fighters, a size bigger\n  if (SPLIT.final) return BASE_S * (n <= 2 ? 1 : n <= 4 ? 0.9 : n <= 8 ? 0.8 : 0.68);   // FINAL ARENA: fewer fighters, bigger\n  if (n <= 2) return BASE_S;\n  if (n <= 4) return BASE_S * 0.84;\n  if (n <= 8) return BASE_S * 0.7;\n  return BASE_S * 0.56;\n}")
R("    else if (waitQ.length < WAIT_MAX) enqueue(p);\n  }\n  refitScale();\n}", "    else if (waitQ.length < WAIT_MAX) enqueue(p);\n  }\n  splitAfterRoster();\n  refitScale();\n}")
R("[' cannot join — 24 fighting and ' + WAIT_MAX + ' waiting are full', '#ff8080']", "[' cannot join — ' + pitMax() + ' fighting and ' + WAIT_MAX + ' reserved are full', '#ff8080']")
R("    p.x = clamp(p.x, 70, W - 70);", "    p.x = clamp(p.x, 130, W - 130);   // wide plates never clip at the edge")
R("function drawHUD() {\n", "function drawHUD() {\n  return drawSlimHUD();   // CHIBI CLASH: slim top bar + one-line ticker\n")
# no talking: no speech bubbles, no voice clips, no taunt lines, no banner, no toasts
R("function bubble(f, text, emo = '', o = {}) {\n", "function bubble(f, text, emo = '', o = {}) {\n  return 0;   // CHIBI CLASH: no talking / taunt bubbles\n")
R("function sayLine(h, text, o = {}) {\n", "function sayLine(h, text, o = {}) {\n  return 0;   // CHIBI CLASH: no voice lines\n")
R("async function loadVO(dec, fmt) {\n", "async function loadVO(dec, fmt) {\n  VO.man = null; return;   // CHIBI CLASH: voice clips removed from the bundle\n")
R("function playVO(ac, master, t, k, v) {", "function playVO(ac, master, t, k, v) {\n  return;")
R("function showTalk(kind, o = {}) {\n", "function showTalk(kind, o = {}) {\n  return false;   // CHIBI CLASH: no referee / taunt lines\n")
R("function trashTalk() {\n", "function trashTalk() {\n  return;\n")
R("function ttGift(team, healAmt) {\n", "function ttGift(team, healAmt) {\n  return;\n")
R("function drawBubbles() {\n", "function drawBubbles() {\n  return;\n")
R("function drawTalkBanner() {\n", "function drawTalkBanner() {\n  return;\n")
R("function toast(text, team) {", "function toast(text, team) { return;")
R("function impactFrame(x, y, dur = 0.07, force = false, mode = '') {", "function impactFrame(x, y, dur = 0.07, force = false, mode = '') {\n  return;   // CHIBI CLASH: no full-screen black/white impact frames (TikTok-safe, no flashing)")
# ---------- new systems (inserted before boot)
HYB = open('/workspace/clash-live/tools/hybrid_systems.js', encoding='utf-8').read()
R("// ============================================================ boot\n", HYB + "\n// ============================================================ boot\n")
open(DST, 'w', encoding='utf-8').write(s)
print('patched OK', len(s))
