import { ARENA, CONFIG, formatHp, formatTime } from "./config.js";
import { resolveGender, teamFromComment } from "./gender.js";
import {
  STATE,
  MOVES,
  moveData,
  inRange,
  facingToward,
  isInvulnerable,
  beginHurt,
  beginKo,
  beginMove,
  beginDodge,
  beginBlock,
  hitStrength,
  isSword,
  isAttackMove,
  isLaunchMove,
} from "./combat.js";
import { fighterContact, layoutNameplates, drawNameplate } from "./art.js";
import { createDirector } from "./director.js";
import { createPairManager } from "./pairs.js";
import { drawResultsBoard } from "./results.js";
import {
  fairDamage, evadesOrCounters, grantComeback, grantSpeedBoost,
  noteViewerEvent, snapshotViewer, markRoundPresence, applyPresenceToFighter, shouldCarryOver,
  computeAwards, hitZone, isFree,
} from "./fair.js";
import {
  createFighter,
  applyGift,
  refreshPower,
  tickFighter,
  drawFighter,
  nearestEnemy,
  requestAttack,
  fighterDepth,
  isOnFrontLine,
} from "./fighter.js";

export class World {
  constructor(sfx) {
    this.sfx = sfx;
    if (sfx) {
      sfx.onCue = (name) => {
        this.audioLog = this.audioLog || [];
        this.audioLog.push({ tick: this.tickId || 0, name });
      };
    }
    this.fighters = [];
    this.particles = [];
    this.floaters = [];
    this.events = [];
    this.scores = { rose: 0, sky: 0 };
    this.tickId = 0;
    this.shake = 0;
    this.shakeDur = 0;
    this.camZoom = 1;
    this.camX = 0;
    this.camY = 0;
    this.slowMo = 1;
    this.slowMoFrames = 0;
    this.letterbox = 0;
    this.featuredId = null;
    this.koFreeze = 0;
    this.clouds = makeClouds();
    this.t = 0;
    this.demo = false;
    this.queue = [];
    this.phase = "fighting";
    this.roundIndex = 1;
    this.roundSeconds = CONFIG.combat.roundSeconds;
    this.intermissionSeconds = CONFIG.combat.intermissionSeconds;
    this.roundEndsAt = performance.now() + this.roundSeconds * 1000;
    this.roundTicksLeft = this.roundSeconds * 60;
    this.simClock = false;
    this.intermissionEndsAt = 0;
    this.winner = null;
    this.fullMessage = "";
    this.fullUntil = 0;
    this.quietJoin = false;
    this.shockwaves = [];
    this.dust = [];
    this.trails = []; // {pts:[{x,y}], life, color}
    this.camMode = "wide";
    this.camFocusX = ARENA.width / 2;
    this.camFocusY = ARENA.height / 2;
    this.camTargetZoom = 1;
    this.speedLines = 0;
    this.impactFlash = 0;
    this.holdFeatured = false;
    this.director = createDirector(this);
    this.pairs = createPairManager(this);
    this.pendingFold = false;
    this.pendingLaunch = false;
    this.arena = ARENA;
    this.viewerState = new Map();
    this.banners = [];
    this.audioLog = [];
    this.roundStartedAt = performance.now();
  }

  setRoundTiming({ roundSeconds, intermissionSeconds } = {}) {
    if (roundSeconds != null) this.roundSeconds = Math.max(5, Number(roundSeconds) || this.roundSeconds);
    if (intermissionSeconds != null) {
      this.intermissionSeconds = Math.max(2, Number(intermissionSeconds) || this.intermissionSeconds);
    }
    if (this.phase === "fighting") {
      this.roundEndsAt = performance.now() + this.roundSeconds * 1000;
      this.roundTicksLeft = this.roundSeconds * 60;
    }
  }

  liveFighters() {
    return this.fighters.filter((f) => !f.dead && f.state !== STATE.KO);
  }

  liveCount() {
    return this.liveFighters().length;
  }

  counts() {
    const living = this.fighters.filter((f) => f.state !== STATE.KO && !f.dead);
    return {
      rose: living.filter((f) => f.team === "rose").length,
      sky: living.filter((f) => f.team === "sky").length,
      total: living.length,
    };
  }

  pickTeam(preferred) {
    if (preferred === "rose" || preferred === "sky") return preferred;
    const c = this.counts();
    if (c.rose < c.sky) return "rose";
    if (c.sky < c.rose) return "sky";
    return Math.random() < 0.5 ? "rose" : "sky";
  }

  findUser(uniqueId) {
    return this.findLive(uniqueId);
  }

  findLive(uniqueId) {
    return this.fighters.find((f) => f.id === uniqueId && !f.dead && f.state !== STATE.KO);
  }

  findQueued(uniqueId) {
    return this.queue.find((s) => s.uniqueId === uniqueId);
  }

  handleLiveEvent(ev) {
    if (!ev || !ev.user) return;
    const { uniqueId, nickname } = ev.user;
    if (ev.type === "chat") {
      this._onChat(uniqueId, nickname, ev.comment);
    } else if (ev.type === "like") {
      this._onLike(uniqueId, nickname, ev.likeCount);
    } else if (ev.type === "gift") {
      this._onGift(uniqueId, nickname, ev);
    } else if (ev.type === "follow" || ev.type === "subscribe") {
      const result = this._joinViewer(uniqueId, nickname, null, null, { silent: false });
      if (result.status === "joined" || result.status === "active") {
        if (result.fighter && ev.type === "subscribe") result.fighter.specialCharges += 1;
        noteViewerEvent(this, uniqueId, "follow");
        if (result.status === "joined") this.pushEvent(`${nickname} followed and jumped in!`);
      }
    } else if (ev.type === "share") {
      // Share is not a listed join trigger; only dash if already in the fight.
      const f = this.findLive(uniqueId);
      if (f) {
        requestAttack(f, "dash");
        this.sfx.dash();
      }
    } else if (ev.type === "joinRoom") {
      // Quiet: just arriving in the LIVE does not join, and we never send
      // chat, likes, or gifts back to TikTok.
    }
  }

  _onChat(uniqueId, nickname, comment) {
    const teamPick = teamFromComment(comment);
    const result = this._joinViewer(uniqueId, nickname, comment, teamPick, { silent: false });
    if (result.status === "queued") {
      this._applySeatComment(result.seat, comment, teamPick);
      return;
    }
    if (result.status === "full") return;
    const f = result.fighter;
    if (!f) return;
    if (result.status === "joined") this.pushEvent(`${f.nickname} hops in!`);
    noteViewerEvent(this, uniqueId, "chat");
    if (isFree(f) && grantSpeedBoost(f, CONFIG.fair?.commentBoostTicks || 120, { from: "chat" })) {
      this.floater(f.x, f.y - 130, "Boost!", "#ffe08a");
    }
    const picked = resolveGender({ comment, nickname, existing: f.gender });
    if (picked.source === "comment" && picked.gender !== f.gender) {
      Object.assign(f, lookPatch(picked.gender, f.id));
      this.pushEvent(`${f.nickname} switched to a ${picked.gender} look`);
    }
    if (teamPick && teamPick !== f.team) {
      f.team = teamPick;
      f.palette.accent = CONFIG.teams[teamPick].color;
    }
    requestAttack(f, "jab");
  }

  _onLike(uniqueId, nickname, likeCount) {
    const result = this._joinViewer(uniqueId, nickname, null, null, { silent: false });
    if (result.status !== "joined" && result.status !== "active") return;
    const f = result.fighter;
    if (!f) return;
    noteViewerEvent(this, uniqueId, "like");
    if (isFree(f) && grantSpeedBoost(f, CONFIG.fair?.likeBoostTicks || 150, { from: "like" })) {
      this.floater(f.x, f.y - 130, "Boost!", "#c8f5ff");
    }
    const n = Math.max(1, Math.min(3, Math.round((likeCount || 1) / Math.max(1, CONFIG.combat.likeJabEvery))));
    requestAttack(f, n >= 3 ? "heavy" : "jab");
  }

  _onGift(uniqueId, nickname, ev) {
    const coins = ev.diamonds || 0;
    const result = this._joinViewer(uniqueId, nickname, null, null, { silent: false, gifted: coins >= CONFIG.combat.specialDiamondThreshold });
    noteViewerEvent(this, uniqueId, "gift");
    if (result.status === "queued") {
      result.seat.coins = (result.seat.coins || 0) + coins;
      if (!this.quietJoin) this.sfx.gift();
      this.pushEvent(`${nickname} sent ${ev.giftName} (${coins}) — reserved, +${coins * CONFIG.combat.hpPerCoin} HP when they enter`);
      return;
    }
    if (result.status === "full") return;
    const f = result.fighter;
    if (!f) return;
    const giftResult = applyGift(f, coins);
    if (!this.quietJoin) this.sfx.gift();
    this.sparkle(f.x, f.y - 80, CONFIG.teams[f.team].color, 14);
    this.pushEvent(`${nickname} sent ${ev.giftName} (+${formatHp(coins * CONFIG.combat.hpPerCoin)} HP)!`);
    if (giftResult && giftResult.upgraded) {
      if (!this.quietJoin) this.sfx.upgrade?.();
      this.floater(f.x, f.y - 130, "SWORD!", "#ffe08a");
      this.sparkle(f.x, f.y - 90, "#ffe08a", 18);
      this.pushBanner(f.nickname, "Sword ready", 90);
    }
    if (coins >= CONFIG.combat.specialDiamondThreshold) {
      requestAttack(f, "special");
      this.sfx.special();
    } else {
      requestAttack(f, "slash");
    }
  }

  _applySeatComment(seat, comment, teamPick) {
    if (!seat) return;
    const picked = resolveGender({ comment, nickname: seat.nickname });
    if (picked.source === "comment") seat.comment = comment;
    if (teamPick) seat.teamPick = teamPick;
  }

  /**
   * Like, comment, gift, or follow can all join.
   * If the 30-person arena is full, the viewer gets a reserved seat (up to 80).
   * We never bump a living fighter to make room.
   */
  _joinViewer(uniqueId, nickname, comment, teamPick, { silent = false, gifted = false } = {}) {
    if (this.phase !== "fighting") {
      // During the winner screen, new joiners wait in the reserve queue.
      const existingQ = this.findQueued(uniqueId);
      if (existingQ) return { status: "queued", queued: true, seat: existingQ };
      return this._reserveSeat(uniqueId, nickname, comment, teamPick);
    }
    const live = this.findLive(uniqueId);
    if (live) return { status: "active", fighter: live };
    const queued = this.findQueued(uniqueId);
    if (queued) return { status: "queued", queued: true, seat: queued };
    this._reap();
    if (this.liveCount() < CONFIG.combat.arenaSize) {
      const fighter = this._spawnFighter({ uniqueId, nickname, comment, teamPick, gifted, coins: 0, silent });
      if (!this.director?.demo && this.liveCount() >= 4 && this.pairs && !this.pairs.enabled) {
        this.pairs.enable();
        this.pairs.placeAtHomes({ skipEnter: false });
      } else if (this.pairs?.enabled) {
        this.pairs.rebuild();
      }
      return { status: "joined", fighter };
    }
    return this._reserveSeat(uniqueId, nickname, comment, teamPick);
  }

  _reserveSeat(uniqueId, nickname, comment, teamPick) {
    const already = this.findQueued(uniqueId);
    if (already) return { status: "queued", queued: true, seat: already };
    if (this.queue.length >= CONFIG.combat.queueSize) {
      this._seatsFull(nickname);
      return { status: "full" };
    }
    const seat = {
      uniqueId,
      nickname,
      comment: comment || "",
      teamPick: teamPick || null,
      coins: 0,
      reservedAt: performance.now(),
    };
    this.queue.push(seat);
    this.pushEvent(`${nickname} reserved a seat (${this.queue.length}/${CONFIG.combat.queueSize})`);
    return { status: "queued", queued: true, seat };
  }

  _spawnFighter({ uniqueId, nickname, comment, teamPick, gifted = false, coins = 0, silent = false }) {
    const gender = resolveGender({ comment, nickname }).gender;
    const team = this.pickTeam(teamPick);
    const f = createFighter({
      uniqueId,
      nickname,
      gender,
      team,
      gifted: gifted || coins >= CONFIG.combat.specialDiamondThreshold,
      hpBonus: 0,
    });
    if (coins) applyGift(f, coins);
    else refreshPower(f);
    this.fighters.push(f);
    if (!silent && !this.quietJoin) {
      this.sfx.join();
      this.sparkle(f.x, f.y - 40, "#fff", 10);
    }
    return f;
  }

  _ensureFighter(uniqueId, nickname, comment, hpBonus = 0, teamPick = null, gifted = false, { silent = false } = {}) {
    // Kept for demo/test helpers. Does not evict living fighters.
    const result = this._joinViewer(uniqueId, nickname, comment, teamPick, { silent, gifted });
    if (result.fighter) {
      if (hpBonus) {
        result.fighter.maxHp += hpBonus;
        result.fighter.hp += hpBonus;
        refreshPower(result.fighter);
      }
      return result.fighter;
    }
    if (result.seat && hpBonus) {
      result.seat.coins += Math.round(hpBonus / CONFIG.combat.hpPerCoin);
    }
    return null;
  }

  _promoteFromQueue() {
    if (this.phase !== "fighting") return;
    if (this.pairs?.enabled && this.pairs.pendingFills && this.pairs.pendingFills.length) {
      const delaying = this.pairs.pendingFills.filter((v) => v.after > 0).length;
      const ready = this.pairs.pendingFills.filter((v) => !v.after || v.after <= 0).length;
      const deficit = CONFIG.combat.arenaSize - this.liveCount();
      if (ready === 0 && delaying >= deficit) return;
    }
    while (this.liveCount() < CONFIG.combat.arenaSize && this.queue.length) {
      const seat = this.queue.shift();
      const f = this._spawnFighter({
        uniqueId: seat.uniqueId,
        nickname: seat.nickname,
        comment: seat.comment,
        teamPick: seat.teamPick,
        coins: seat.coins || 0,
        silent: this.liveCount() > 8,
      });
      if (this.pairs?.enabled) {
        const list = this.pairs.pendingFills || [];
        const idx = list.findIndex((v) => !v.after || v.after <= 0);
        const vac = idx >= 0 ? list.splice(idx, 1)[0] : null;
        if (vac) this.pairs.fillSlot(vac.slot, vac.team, f);
        else this.pairs.rebuild();
      }
      this.pushEvent(`${f.nickname} enters from the reserve queue!`);
    }
  }

  _seatsFull(nickname) {
    this.fullMessage = "Seats are full — thanks for watching! Please try again next round.";
    this.fullUntil = performance.now() + 4000;
    this.pushEvent(`Seats full — ${nickname} will have to wait for the next round.`);
  }

  _leastActive() {
    const kos = this.fighters.filter((f) => f.state === STATE.KO || f.dead);
    if (kos.length) return kos[0];
    return this.fighters.slice().sort((a, b) => a.joinedAt - b.joinedAt)[0];
  }

  _remove(f) {
    this.fighters = this.fighters.filter((x) => x !== f);
  }

  _reap() {
    this.fighters = this.fighters.filter((f) => !f.dead);
  }

  pushEvent(text) {
    this.events.unshift({ text, t: performance.now() });
    this.events = this.events.slice(0, 8);
  }

  tick() {
    this.tickId += 1;
    this.t += 1;
    const now = performance.now();
    if (this.fullUntil && now > this.fullUntil) {
      this.fullMessage = "";
      this.fullUntil = 0;
    }

    if (this.phase === "intermission") {
      this._tickParticles();
      this._decayShake();
      this._tickBanners();
      for (const f of this.fighters) {
        if (f.state === STATE.CELEBRATE || f.state === STATE.KO) tickFighter(f, this);
      }
      if (this.simClock || this.director?.demo) {
        this.intermissionTicksLeft = (this.intermissionTicksLeft || 0) - 1;
        if (this.intermissionTicksLeft <= 0) this.startNextRound();
      } else if (now >= this.intermissionEndsAt) this.startNextRound();
      return;
    }

    if (this.simClock || this.director?.demo) {
      this.roundTicksLeft -= 1;
      if (this.roundTicksLeft <= 0) {
        this.endRound("time");
        return;
      }
    } else if (now >= this.roundEndsAt) {
      this.endRound("time");
      return;
    }

    if (this.slowMoFrames > 0) {
      this.slowMoFrames -= 1;
      if (this.slowMoFrames <= 0) this.slowMo = 1;
    }
    if (this.koFreeze > 0 && !this.pairs?.enabled) {
      this.koFreeze -= 1;
      this._tickParticles();
      this._decayShake();
      this._promoteFromQueue();
      return;
    }
    if (this.pairs?.enabled) this.koFreeze = 0;

    if (this.pairs?.enabled && !this.director?.demo) this.pairs.tick();
    else this.director?.tick();
    for (const f of this.fighters) tickFighter(f, this);
    this._resolveHits();
    this._tickTrails();
    this._tickParticles();
    this._decayShake();
    this._updateFeatured();
    this._promoteFromQueue();
    this._checkRound();
    this._reap();
    if (this.speedLines > 0) this.speedLines -= 1;
    if (this.impactFlash > 0) this.impactFlash -= 1;
    this._tickBanners();
  }

  _resolveHits() {
    const attackers = this.fighters.filter((f) => f.state === STATE.ACTIVE && !f.attackHandled);
    for (const atk of attackers) {
      const move = moveData(atk.move);
      // Active frames already ticking; the first active frame is the impact.
      if (atk.stateTime > 1) continue;
      atk.attackHandled = true;
      let landed = false;
      for (const vic of this.fighters) {
        if (vic === atk || vic.team === atk.team) continue;
        if (vic.state === STATE.KO || vic.dead) continue;
        if (!inRange(atk, vic, move.range)) continue;
        const around = move.allAround || atk.move === "special" || atk.move === "spin";
        if (!facingToward(atk, vic) && !around) continue;
        this._applyHit(atk, vic, move);
        landed = true;
      }
      if (!landed && isAttackMove(atk.move)) {
        // Whiff: no sound of impact, just a quiet miss.
      }
    }
  }

  _applyHit(atk, vic, move) {
    if (isInvulnerable(vic)) {
      this.sparkle(vic.x, vic.y - 50, "#fff", 4);
      return;
    }

    const pt = fighterContact(atk) || { x: (atk.x + vic.x) / 2, y: vic.y - 50 };

    // Mutual cross-counter: both attacks connect in the same beat.
    if (
      vic.state === STATE.ACTIVE &&
      isAttackMove(vic.move) &&
      inRange(vic, atk, (moveData(vic.move).range || 70))
    ) {
      const dir = Math.sign(vic.x - atk.x) || 1;
      atk.hitstop = vic.hitstop = 8;
      atk.hp -= Math.max(4, Math.round((moveData(vic.move).damage || 8) * 0.7));
      vic.hp -= Math.max(4, Math.round((move.damage || 8) * 0.7));
      atk.knock = -dir * 3.2;
      vic.knock = dir * 3.2;
      atk.vx = -dir * 4;
      vic.vx = dir * 4;
      beginHurt(atk, 18, vic.x);
      beginHurt(vic, 18, atk.x);
      this.sparkle(pt.x, pt.y, "#fff4a8", 18);
      this.impactFlash = 3;
      this.addShake(3, 8);
      this.floater((atk.x + vic.x) / 2, vic.y - 110, "COUNTER!", "#ffe08a");
      this.sfx.hit();
      this.sfx.clash?.();
      return;
    }

    // Blade clash: two swords meeting mid-swing.
    const clashing =
      isSword(atk) &&
      isSword(vic) &&
      (vic.state === "active" || (vic.state === "windup" && vic.stateTime >= vic.stateDur * 0.45));
    if (clashing) {
      atk.hitstop = 8;
      vic.hitstop = 8;
      atk.state = "recover";
      vic.state = "recover";
      atk.stateTime = 0;
      vic.stateTime = 0;
      atk.stateDur = (move.recovery || 12) + 8;
      vic.stateDur = 14;
      vic.attackHandled = true;
      const dir = Math.sign(vic.x - atk.x) || 1;
      atk.knock = -dir * 2.2;
      vic.knock = dir * 2.2;
      this.sfx.clash?.();
      this.sparkle((atk.x + vic.x) / 2, (atk.y + vic.y) / 2 - 50, "#fff4a8", 16);
      this.floater((atk.x + vic.x) / 2, vic.y - 100, "CLASH!", "#ffe08a");
      return;
    }

    // Close the last inches so the fist, foot, or blade overlaps the target.
    const contact = this._ensureContact(atk, vic, move);
    const midX = contact.x;
    const midY = contact.y;

    if (vic.state === STATE.BLOCK) {
      const parry = vic.parryUntil > 0;
      if (parry) {
        atk.hitstop = 12;
        vic.hitstop = 12;
        atk.state = STATE.RECOVER;
        atk.stateTime = 0;
        atk.stateDur = move.recovery + 10;
        this.sfx.parry();
        if (isSword(atk) && isSword(vic)) this.sfx.clash?.();
        this.sparkle(midX, midY, "#fff4a8", 12);
        this.floater(midX, midY - 40, "PARRY!", "#ffe08a");
        beginMove(vic, isSword(vic) ? "thrust" : "cross");
        return;
      }
      const chip = Math.max(1, Math.round(fairDamage(atk, vic, move) * 0.25));
      vic.hp = Math.max(1, vic.hp - chip);
      atk.damageDealt = (atk.damageDealt || 0) + chip;
      vic.flash = 6;
      vic.blockRecoil = 12;
      vic.blocks = (vic.blocks || 0) + 1;
      const stop = Math.max(12, Math.round((move.hitstop || 12) * 0.7));
      atk.hitstop = stop;
      vic.hitstop = stop;
      const dir = Math.sign(vic.x - atk.x) || atk.facing;
      vic.vx = dir * 2.2;
      this.sfx.block();
      this.sparkle(midX, midY, "#cfe8ff", 10);
      this.floater(midX, midY - 36, "BLOCK!", "#cfe8ff");
      return;
    }

    // Gloves may slip a blade; free players get a guaranteed counter after 3 hits.
    const evade = evadesOrCounters(atk, vic, this.tickId);
    if (evade) {
      const dir = Math.sign(vic.x - atk.x) || atk.facing;
      vic.dodgeStyle = "lean";
      beginDodge(vic, dir);
      vic.vx = dir * 3.4;
      atk.hitstop = 10;
      this.sfx.dodge?.();
      this.sparkle(midX, midY, "#fff", 6);
      this.floater(vic.x, vic.y - 110, evade === "counter" ? "COUNTER!" : "DODGE!", "#ffe08a");
      if (evade === "counter") {
        vic.comebackT = Math.max(vic.comebackT || 0, 48);
        vic.wantMove = isSword(vic) ? "thrust" : "cross";
        vic.comebacks = (vic.comebacks || 0) + 1;
      }
      return;
    }

    const dmg = fairDamage(atk, vic, move);
    vic.hp -= dmg;
    atk.damageDealt = (atk.damageDealt || 0) + dmg;
    atk.hitsTakenStreak = 0;
    const isKo = vic.hp <= 0;
    const stop = isKo ? Math.max(16, CONFIG.ko.hitstop) : Math.max(12, move.hitstop || 12);
    atk.hitstop = stop;
    vic.hitstop = stop;
    vic.flash = 8;
    atk.comboHit = true;
    atk.comboCount = (atk.comboCount || 0) + 1;

    const dir = Math.sign(vic.x - atk.x) || atk.facing;
    const zone = hitZone(atk.move, move);
    const style = (move.launch || zone === "gut" || atk.move === "gutPunch") ? "fold" : "head";
    vic.vx = dir * Math.max(2.4, (move.knockback || 16) / 8);
    if (isKo) vic.vx = dir * Math.max(6, (move.knockback || 24) / 3.5);

    const strength = hitStrength(atk.move);
    const launch = !!(move.launch || isLaunchMove(atk.move) || this.director?.pendingLaunch || this.pendingLaunch);
    if (this.director?.pendingFold || this.pendingFold || atk.move === "gutPunch") vic.foldHit = true;
    if (launch || isKo) {
      vic.airborne = true;
      vic.groundY = vic.y;
      vic.vy = isKo ? -16 : -12;
      vic.vx = dir * (isKo ? 10 : 7.2);
      this.spawnDustDome(vic.x, vic.y, isKo ? 1.4 : 0.9);
      if (this.director) this.director.pendingLaunch = false;
      this.pendingLaunch = false;
    } else if ((move.knockback || 0) >= 24) {
      this.spawnDustDome(vic.x, vic.y, 0.55);
    }
    if (move.shockwave || atk.move === "gutPunch" || isKo) {
      this.spawnShockwave(midX, midY, isKo ? 1.4 : 1);
      if (!this._liveArena()) this.impactFlash = 3;
    }
    if (this.director) this.director.pendingFold = false;
    this.pendingFold = false;

    this.sparkle(midX, midY, "#fff6c0", isKo ? 14 : 10);
    this._contactBurst(midX, midY, isKo ? 1.3 : 1);
    this.lastImpact = { tick: this.tickId, x: midX, y: midY, move: atk.move, atk: atk.nickname, vic: vic.nickname, ko: isKo };
    this.impactLog = this.impactLog || [];
    this.impactLog.push(this.lastImpact);

    if (isKo) {
      beginKo(vic, atk.x);
      vic.koedBy = atk.id;
      atk.kos = (atk.kos || 0) + 1; // only the fighter who landed the final hit
      this.scores[atk.team] += 1;
      this.sfx.ko();
      this.sfx.punch();
      this._impactFx(midX, midY, "special", 16);
      this.addShake(move.shake + 2.2, 12);
      if (this._liveArena()) {
        this.slowMo = 1;
        this.slowMoFrames = 0;
        this.koFreeze = 0;
        this.letterbox = 0;
        this.camMode = "wide";
        this.pairs.onKo(vic, atk);
      } else {
        this.slowMo = CONFIG.ko.slowMo;
        this.slowMoFrames = CONFIG.ko.slowMoFrames;
        this.koFreeze = 8;
        this.letterbox = 1;
        this.camMode = "close";
      }
      this.featuredId = atk.id;
      vic.stars = 1;
      this.floater(vic.x, vic.y - 120, "KO!", "#ffd166");
      this.pushEvent(`${atk.nickname} KOs ${vic.nickname}!`);
    } else {
      beginHurt(vic, move.hitstun, atk.x, style);
      if (grantComeback(vic) && isFree(vic)) {
        this.floater(vic.x, vic.y - 140, "Counter window!", "#ffe08a");
        vic.auraT = Math.max(vic.auraT || 0, 50);
      }
      if (isSword(atk)) this.sfx.slash?.();
      else if (strength === "light") this.sfx.jab();
      else this.sfx.punch();
      this.sfx.hit();
      this._impactFx(midX, midY, strength, strength === "light" ? 6 : 10);
      this.addShake(move.shake || 0, 6);
      this.floater(midX, midY - 36, `-${dmg}`, "#fff");
    }
  }

  _liveArena() {
    return !!(this.pairs?.enabled && !this.director?.demo);
  }

  _ensureContact(atk, vic, move) {
    const size = vic.drawSize || 1;
    const zone = hitZone(atk.move, move);
    const kick = /kick|roundhouse|sweep|axe/i.test(atk.move || "");
    const hook = atk.move === "hook";
    let ty = vic.y - 72 * size;
    if (zone === "face") ty = vic.y - (kick ? 124 : 118) * size;
    else if (zone === "gut") ty = vic.y - 48 * size;
    else if (zone === "legs") ty = vic.y - 22 * size;
    // Aim at the near side of the target, not their mid-spine, so limbs reach without bodies merging.
    const face = atk.facing || Math.sign(vic.x - atk.x) || 1;
    const tx = vic.x - face * 18 * size;
    const tip = fighterContact(atk) || { x: atk.x + face * (kick ? 86 : 56), y: atk.y - (kick && zone === "face" ? 118 : 70) };
    const dx = (tx - tip.x);
    const maxNudge = kick ? 36 : 28;
    atk.x += Math.max(-maxNudge, Math.min(maxNudge, dx));
    const minSep = kick ? 118 : (hook ? 102 : 96);
    if (face > 0 && atk.x > vic.x - minSep) atk.x = vic.x - minSep;
    if (face < 0 && atk.x < vic.x + minSep) atk.x = vic.x + minSep;
    const tip2 = fighterContact(atk) || { x: atk.x + face * (kick ? 90 : 58), y: ty };
    return { x: tip2.x, y: ty };
  }

  _impactFx(x, y, strength, n) {
    const count = this.fighters.length > 14 ? Math.ceil(n * 0.55) : n;
    this.sparkle(x, y, strength === "special" ? "#ffe08a" : "#fff", count);
  }

  _contactBurst(x, y, scale = 1) {
    this.shockwaves = this.shockwaves || [];
    this.shockwaves.push({ x, y, r: 6, max: 26 * scale, life: 14, color: "#fff4a0" });
    this.sparkle(x, y, "#ffe08a", 8);
  }

  sparkle(x, y, color, n) {
    const cap = (CONFIG.fx && CONFIG.fx.particleMax) || 80;
    if (this.particles.length > cap) this.particles.splice(0, this.particles.length - cap);
    const count = this.pairs?.enabled ? Math.min(n, 8) : n;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1.2 + Math.random() * 3.4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 1.2,
        life: 18 + Math.random() * 10,
        max: 24,
        color,
        r: 2 + Math.random() * 3,
        star: Math.random() < 0.45,
      });
    }
  }

  floater(x, y, text, color) {
    this.floaters.push({ x, y, text, color, life: 40, max: 40 });
  }

  addShake(amp, dur) {
    if (this._liveArena()) return; // the board stays still in the live 30-fighter view
    if (amp >= this.shake) {
      this.shake = amp;
      this.shakeDur = dur;
    }
  }

  pushBanner(title, sub = "", life = 90) {
    this.banners = this.banners || [];
    this.banners.push({ title, sub, life, max: life });
    if (this.banners.length > 3) this.banners.shift();
  }

  _decayShake() {
    if (this.shakeDur > 0) {
      this.shakeDur -= 1;
      this.shake *= 0.82;
      if (this.shakeDur <= 0 || this.shake < 0.08) this.shake = 0;
    } else {
      this.shake = 0;
    }
    if (this.letterbox > 0 && this.slowMoFrames <= 0) {
      this.letterbox = Math.max(0, this.letterbox - 0.04);
    }
  }

  _tickParticles() {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.life -= 1;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.y -= 0.9;
      f.life -= 1;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
  }

  _updateFeatured() {
    if (this._liveArena()) {
      this.camMode = "wide";
      this.camZoom = 1;
      this.camTargetZoom = 1;
      this.camFocusX = ARENA.width / 2;
      this.camFocusY = ARENA.height / 2;
      this.letterbox = 0;
      this.featuredId = null;
      return;
    }
    const demo = !!(this.director && this.director.demo);
    const cam = (demo && CONFIG.camera?.demo) ? CONFIG.camera.demo : (CONFIG.camera || {});
    if (this.pairs?.enabled && !demo) {
      let fx = ARENA.width / 2;
      let fy = ARENA.height / 2;
      let targetZoom = cam.wideZoom || 1;
      const pin = this.pairs.punchInT > 0 ? this.pairs.punchFocus : null;
      const pa = pin && (pin.a || pin.b);
      const pb = pin && (pin.a && pin.b ? (pin.a === pa ? pin.b : pin.a) : null);
      if (pa) {
        const u = this.pairs.punchInT / Math.max(1, this.pairs.punchDur || 58);
        // Ease in, hold, ease out so the full arena stays the default view.
        const hold = u > 0.18 && u < 0.82 ? 1 : (u <= 0.18 ? u / 0.18 : (1 - u) / 0.18);
        targetZoom = 1 + ((cam.punchInZoom || 1.65) - 1) * Math.max(0, Math.min(1, hold));
        const xs = [pa, pb].filter(Boolean);
        fx = xs.reduce((s, f) => s + f.x, 0) / xs.length;
        fy = xs.reduce((s, f) => s + f.y, 0) / xs.length - 40;
        this.featuredId = pa.id;
      } else {
        this.featuredId = null;
        this.camMode = "wide";
      }
      this.camTargetZoom = targetZoom;
      const zoomK = Math.abs(targetZoom - this.camZoom) > 0.2 ? 0.22 : 0.12;
      this.camZoom += (targetZoom - this.camZoom) * zoomK;
      this.camFocusX += (fx - this.camFocusX) * 0.14;
      this.camFocusY += (fy - this.camFocusY) * 0.14;
      return;
    }

    const clashes = [];
    for (const f of this.fighters) {
      if (f.state === STATE.WINDUP || f.state === STATE.ACTIVE || f.state === STATE.HURT) {
        const e = nearestEnemy(f, this.fighters);
        if (e) clashes.push({ f, d: Math.hypot(f.x - e.x, f.y - e.y) });
      }
    }
    clashes.sort((a, b) => a.d - b.d);
    if (clashes[0] && !this.holdFeatured) this.featuredId = clashes[0].f.id;
    const mode = this.camMode || "wide";
    let targetZoom = cam[mode + "Zoom"] || (mode === "close" ? 1.55 : mode === "clash" ? 1.7 : mode === "medium" ? 1.22 : mode === "pull" ? 0.92 : 1);
    if (this.slowMoFrames > 0 && mode === "close") targetZoom = Math.max(targetZoom, cam.punchInZoom || 1.85);
    this.camTargetZoom = targetZoom;
    const zoomK = Math.abs(targetZoom - this.camZoom) > 0.2 ? 0.3 : 0.14;
    this.camZoom += (targetZoom - this.camZoom) * zoomK;

    let fx = ARENA.width / 2, fy = (ARENA.groundTop + ARENA.groundBottom) / 2 + 80;
    const dir = this.director;
    const pair = dir && dir.demo ? [dir.a, dir.b].filter(Boolean) : null;
    if (pair && pair.length) {
      fx = pair.reduce((s, f) => s + f.x, 0) / pair.length;
      fy = pair.reduce((s, f) => s + f.y, 0) / pair.length - 78;
      this.featuredId = dir.a?.id || this.featuredId;
    } else if (this.featuredId) {
      const f = this.fighters.find((x) => x.id === this.featuredId);
      if (f) { fx = f.x; fy = f.y - 50; }
    }
    this.camFocusX += (fx - this.camFocusX) * 0.12;
    this.camFocusY += (fy - this.camFocusY) * 0.12;
  }

  _checkRound() {
    if (this.phase !== "fighting") return;
    const c = this.counts();
    // An empty opening must not end the round — the stream waits the full
    // timer for likes, comments, gifts, or follows. A wipe only counts after
    // both teams have actually fought (there is at least one KO).
    if (c.total === 0) return;
    if ((c.rose === 0 || c.sky === 0) && (this.scores.rose + this.scores.sky) > 0) {
      this.endRound("wipe");
    }
  }

  roundTimeLeft() {
    if (this.phase === "intermission") {
      if (this.simClock || this.director?.demo) {
        return Math.max(0, (this.intermissionTicksLeft || 0) / 60);
      }
      return Math.max(0, (this.intermissionEndsAt - performance.now()) / 1000);
    }
    if (this.simClock || this.director?.demo) {
      return Math.max(0, this.roundTicksLeft / 60);
    }
    return Math.max(0, (this.roundEndsAt - performance.now()) / 1000);
  }

  leaderboard() {
    const people = this.fighters.filter((f) => !f.dead);
    const byHp = people.slice().sort((a, b) => b.hp - a.hp || b.kos - a.kos).slice(0, 5);
    const byKos = people.slice().sort((a, b) => b.kos - a.kos || b.hp - a.hp).slice(0, 5);
    return { byHp, byKos };
  }

  decideWinner() {
    const living = this.liveFighters();
    const rose = living.filter((f) => f.team === "rose");
    const sky = living.filter((f) => f.team === "sky");
    const all = this.fighters.filter((f) => !f.dead);
    const mvp = all.slice().sort((a, b) => b.hp - a.hp || (b.kos || 0) - (a.kos || 0))[0] || null;
    const koKing = all.slice().sort((a, b) => (b.kos || 0) - (a.kos || 0) || b.hp - a.hp)[0] || null;
    const roseHp = rose.reduce((s, f) => s + f.hp, 0);
    const skyHp = sky.reduce((s, f) => s + f.hp, 0);

    let team = "draw";
    let reason = "even match";
    if (rose.length === 0 && sky.length > 0) {
      team = "sky";
      reason = sky.length === 1 ? "last standing" : "last team standing";
    } else if (sky.length === 0 && rose.length > 0) {
      team = "rose";
      reason = rose.length === 1 ? "last standing" : "last team standing";
    } else if (rose.length > sky.length) {
      team = "rose";
      reason = "more survivors";
    } else if (sky.length > rose.length) {
      team = "sky";
      reason = "more survivors";
    } else if (roseHp > skyHp) {
      team = "rose";
      reason = "most HP";
    } else if (skyHp > roseHp) {
      team = "sky";
      reason = "most HP";
    } else if (this.scores.rose > this.scores.sky) {
      team = "rose";
      reason = "most KOs";
    } else if (this.scores.sky > this.scores.rose) {
      team = "sky";
      reason = "most KOs";
    }

    const champ = team === "draw"
      ? mvp
      : (living.filter((f) => f.team === team).sort((a, b) => b.hp - a.hp)[0] || mvp);

    const roster = this.fighters.filter((f) => f.id).map((f) => ({
      id: f.id,
      nickname: f.nickname,
      team: f.team,
      gender: f.gender,
      spriteKey: f.spriteKey,
      spriteHue: f.spriteHue,
      hp: f.hp,
      maxHp: f.maxHp,
      kos: f.kos || 0,
      damageDealt: f.damageDealt || 0,
      blocks: f.blocks || 0,
      comebacks: f.comebacks || 0,
      dead: !!f.dead,
      state: f.state,
      weapon: f.weapon,
    }));
    const awards = computeAwards(roster, { mvp: champ });
    if (!awards.winner) awards.winner = champ;
    return {
      team,
      reason,
      mvp: champ,
      koKing,
      awards,
      roster,
      roseSurvivors: rose.length,
      skySurvivors: sky.length,
      roseHp,
      skyHp,
      scores: { ...this.scores },
      round: this.roundIndex,
    };
  }

  endRound(_why = "time") {
    if (this.phase === "intermission") return;
    markRoundPresence(this);
    this.winner = this.decideWinner();
    this.phase = "intermission";
    this.intermissionSeconds = Math.max(10, this.intermissionSeconds || 10);
    this.intermissionEndsAt = performance.now() + this.intermissionSeconds * 1000;
    this.intermissionTicksLeft = this.intermissionSeconds * 60;
    this.slowMo = 1;
    this.slowMoFrames = 0;
    this.koFreeze = 0;
    this.letterbox = 0;
    this.camMode = "wide";
    this.camZoom = 1;
    const w = this.winner;
    if (w.team === "draw") this.pushEvent(`Round ${w.round} ends in a draw (${w.reason}).`);
    else this.pushEvent(`${CONFIG.teams[w.team].name} wins round ${w.round} — ${w.reason}!`);
    this.sfx.roundEnd?.();
    for (const f of this.liveFighters()) {
      if (w.team === "draw" || f.team === w.team) {
        f.state = STATE.CELEBRATE;
        f.stateTime = 0;
      }
    }
  }

  startNextRound() {
    const leftover = this.queue.slice();
    const previous = this.fighters.filter((f) => f.id);
    this.fighters = [];
    this.particles = [];
    this.floaters = [];
    this.scores = { rose: 0, sky: 0 };
    this.winner = null;
    this.phase = "fighting";
    this.roundIndex += 1;
    this.roundEndsAt = performance.now() + this.roundSeconds * 1000;
    this.roundTicksLeft = this.roundSeconds * 60;
    this.letterbox = 0;
    this.featuredId = 0;
    this.featuredId = null;
    this.roundStartedAt = this.simClock ? (this.tickId || 0) * (1000 / 60) : performance.now();
    // Queued viewers get the first seats in the new round.
    this.queue = leftover;
    this._promoteFromQueue();
    // Anyone from last round who is not already queued may fill leftover seats,
    // then unused spots become reserved seats (up to 80).
    for (const f of previous) {
      if (this.findLive(f.id) || this.findQueued(f.id)) continue;
      if (this.liveCount() < CONFIG.combat.arenaSize) {
        this._spawnFighter({
          uniqueId: f.id,
          nickname: f.nickname,
          comment: f.gender === "female" ? "girl" : f.gender === "male" ? "boy" : "",
          teamPick: f.team,
          silent: true,
        });
      } else if (this.queue.length < CONFIG.combat.queueSize) {
        this.queue.push({
          uniqueId: f.id,
          nickname: f.nickname,
          comment: f.gender === "female" ? "girl" : f.gender === "male" ? "boy" : "",
          teamPick: f.team,
          coins: 0,
          reservedAt: performance.now(),
        });
      }
    }
    for (const f of this.fighters) applyPresenceToFighter(this, f);
    // Queued seats keep coins only if that viewer is still present.
    for (const s of this.queue) {
      if (!shouldCarryOver(this, s.uniqueId)) s.coins = 0;
    }
    if (this.pairs) {
      this.pairs.enable();
      this.pairs.placeAtHomes({ skipEnter: true });
    }
    this.pushEvent(`Round ${this.roundIndex} — fight!`);
  }

  addShakeForTest(n) {
    this.addShake(n, 8);
  }

  seedDemo(n = 10) {
    this.addSimulatedViewers(n, { fromSeed: true });
    this.pushEvent("Demo fight started — connect TikFinity to use live events.");
    this.demo = true;
    if (n >= 16 && !this.director?.demo) {
      this.pairs.enable();
      this.pairs.placeAtHomes({ skipEnter: true });
    }
  }

  seedArena30(n = 30, reserved = 0) {
    this.director.enabled = false;
    this.director.demo = false;
    this.simClock = true;
    this.quietJoin = true;
    this.addSimulatedViewers(n, { fromSeed: false });
    if (reserved) this.addSimulatedViewers(reserved, { fromSeed: false });
    this.quietJoin = false;
    const clean = ["Aisha","Hamza","Sofia","Omar","Mia","Liam","Zara","Noah","Fatima","Aamir","Chloe","Yusuf","Priya","Daniel","Layla","Bilal","Nora","Hugo","Mei","Zaid"];
    this.fighters.forEach((f, i) => { if (clean[i]) f.nickname = clean[i]; });
    const reserveNames = ["Rina","Ken","Emi","Jin","Sana","Bo","Ivy","Jae","Pia","Taro","Nia","Max"];
    this.queue.forEach((s, i) => { s.nickname = reserveNames[i % reserveNames.length] + (i >= reserveNames.length ? String(i) : ""); });
    this.pairs.enable();
    this.pairs.placeAtHomes({ skipEnter: true });
    this.camMode = "wide";
    this.camZoom = 1;
    this.camFocusX = ARENA.width / 2;
    this.camFocusY = ARENA.height / 2;
    this.pushEvent("30-fighter arena — all pairs fighting.");
    this.demo = true;
    return {
      fighters: this.fighters.length,
      live: this.liveCount(),
      queued: this.queue.length,
      pairs: this.pairs.pairs.length,
    };
  }

  addSimulatedViewers(n, { fromSeed = false } = {}) {
    const prevQuiet = this.quietJoin;
    this.quietJoin = true;
    const first = [
      ["Aisha", "girl"], ["Hamza", "boy"], ["Sofia", "girl"], ["Omar", "boy"],
      ["Mia", "girl"], ["Liam", "boy"], ["Zara", "girl"], ["Noah", "boy"],
      ["Fatima", "girl"], ["Aamir", "boy"], ["Chloe", "girl"], ["Yusuf", "boy"],
      ["Priya", "girl"], ["Daniel", "boy"], ["Layla", "girl"], ["Bilal", "boy"],
      ["Nora", "girl"], ["Hugo", "boy"], ["Mei", "girl"], ["Zaid", "boy"],
    ];
    const modes = ["like", "chat", "follow", "like", "chat", "gift1", "follow", "like", "gift10", "chat"];
    const stamp = Math.floor(performance.now() % 1e9);
    for (let i = 0; i < n; i++) {
      const [base, word] = first[i % first.length];
      const nickname = i < first.length && !fromSeed ? base : `${base}${i + 1}`;
      const uniqueId = `sim-${stamp}-${i}-${nickname}`;
      const comment = i % 2 === 0 ? "girl" : "boy";
      const mode = modes[i % modes.length];
      if (mode === "like") {
        this.handleLiveEvent({ type: "like", user: { uniqueId, nickname }, likeCount: 2 });
      } else if (mode === "follow") {
        this.handleLiveEvent({ type: "follow", user: { uniqueId, nickname } });
      } else if (mode === "gift1") {
        this.handleLiveEvent({ type: "gift", user: { uniqueId, nickname }, giftName: "Rose", diamonds: 1, repeatCount: 1 });
      } else if (mode === "gift10") {
        this.handleLiveEvent({ type: "gift", user: { uniqueId, nickname }, giftName: "Roses", diamonds: 10, repeatCount: 10 });
      } else if (mode === "gift100") {
        this.handleLiveEvent({ type: "gift", user: { uniqueId, nickname }, giftName: "Galaxy", diamonds: 100, repeatCount: 1 });
      } else {
        this.handleLiveEvent({ type: "chat", user: { uniqueId, nickname }, comment: word || comment });
      }
    }
    // A couple of mid-size gifts so HP variety and swords appear without crowding the board.
    const live = this.liveFighters();
    if (live.length && !fromSeed) {
      for (const f of live.slice(0, 2)) {
        const was = f.weapon;
        applyGift(f, 10);
        refreshPower(f);
        if (was !== "sword") f.upgradeT = 0;
      }
    }
    this.quietJoin = prevQuiet;
  }

  clear() {
    this.fighters = [];
    this.queue = [];
    this.particles = [];
    this.floaters = [];
    this.scores = { rose: 0, sky: 0 };
    this.demo = false;
    this.winner = null;
    this.phase = "fighting";
    this.roundEndsAt = performance.now() + this.roundSeconds * 1000;
    this.roundTicksLeft = this.roundSeconds * 60;
    this.fullMessage = "";
    this.pushEvent("Arena cleared.");
  }

  draw(ctx, w, h) {
    const live = this._liveArena();
    const sx = (!live && this.shake) ? (Math.random() - 0.5) * 0.4 * this.shake : 0;
    const sy = (!live && this.shake) ? (Math.random() - 0.5) * 2 * this.shake : 0;
    const zoom = live ? 1 : this.camZoom;
    const fx = live ? ARENA.width / 2 : this.camFocusX;
    const fy = live ? ARENA.height / 2 : this.camFocusY;

    ctx.save();
    ctx.translate(sx, sy);
    this._drawBackdrop(ctx, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-fx, -fy);

    this._drawArena(ctx, w, h);
    if (!this._liveArena()) this._drawSpeedLines(ctx, w, h);

    const list = this.fighters.slice().sort((a, b) => fighterDepth(a) - fighterDepth(b));
    for (const f of list) {
      const dir = this.director;
      const isFeatured = !!(dir && dir.demo && dir.a && dir.b && (f.id === dir.a.id || f.id === dir.b.id));
      drawFighter(ctx, f, { featured: isFeatured && !live });
    }
    layoutNameplates(list);
    if (this.phase !== "intermission") {
      for (const f of list) drawNameplate(ctx, f, f.drawSize || 1, false);
    }
    this._drawParticles(ctx);
    this._drawTrails(ctx);
    this._drawShockwaves(ctx);
    this._drawDust(ctx);

    ctx.restore();
    ctx.restore();

    if (this.impactFlash > 0 && !this._liveArena()) {
      ctx.fillStyle = `rgba(255, 250, 230, ${0.16 * this.impactFlash / 4})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (this.letterbox > 0.01 && !this._liveArena()) {
      const bar = (ARENA.mode === "portrait" ? 90 : 56) * this.letterbox;
      ctx.fillStyle = `rgba(10, 6, 12, ${0.72 * this.letterbox})`;
      ctx.fillRect(0, 0, w, bar);
      ctx.fillRect(0, h - bar, w, bar);
    }

    this._drawBanners(ctx, w, h);
    if (this.phase === "intermission" && this.winner) {
      drawResultsBoard(ctx, w, h, this);
    }
  }

  _tickBanners() {
    if (!this.banners) return;
    for (const b of this.banners) b.life -= 1;
    this.banners = this.banners.filter((b) => b.life > 0);
  }

  _drawBanners(ctx, w, h) {
    if (!this.banners || !this.banners.length) return;
    const b = this.banners[this.banners.length - 1];
    const a = Math.min(1, b.life / 12, (b.max - b.life) / 10 + 0.7);
    const bw = 520, bh = 64;
    const x = (w - bw) / 2, y = 96;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.fillStyle = "rgba(10, 8, 14, 0.88)";
    ctx.strokeStyle = "#ffe08a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, bw, bh, 16) : ctx.rect(x, y, bw, bh);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffe08a";
    ctx.font = "800 22px Fredoka, Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(b.title || ""), w / 2, y + (b.sub ? 22 : 32));
    if (b.sub) {
      ctx.fillStyle = "#fff";
      ctx.font = "700 14px Nunito, sans-serif";
      ctx.fillText(String(b.sub), w / 2, y + 44);
    }
    ctx.restore();
  }

  _drawBackdrop(ctx, w, h) {
    const portrait = ARENA.mode === "portrait";
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#8ed0ff");
    g.addColorStop(0.18, "#ffd4a8");
    g.addColorStop(0.38, "#ffb197");
    g.addColorStop(0.62, "#d98970");
    g.addColorStop(1, "#5a3228");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Sun sits in the upper sky, not on the right edge (TikTok UI lives there).
    const sunX = portrait ? w * 0.5 : w * 0.7;
    const sunY = portrait ? h * 0.1 : h * 0.15;
    const sun = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, portrait ? 220 : 180);
    sun.addColorStop(0, "rgba(255, 244, 190, 0.95)");
    sun.addColorStop(1, "rgba(255, 180, 120, 0)");
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, portrait ? 220 : 180, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    for (const c of this.clouds) {
      const x = ((c.x + this.t * c.spd) % (w + 300)) - 150;
      const y = Math.min(c.y, ARENA.groundTop - 80);
      drawCloud(ctx, x, y, c.s, c.a);
    }
    ctx.restore();

    // Distant hills just above the floor
    const hillBase = ARENA.groundTop + 8;
    ctx.fillStyle = "rgba(90, 40, 60, 0.2)";
    ctx.beginPath();
    ctx.moveTo(0, hillBase);
    for (let i = 0; i <= 12; i++) {
      const x = (w / 12) * i;
      const y = ARENA.groundTop - 28 - Math.abs(Math.sin(i * 0.85)) * 48;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, hillBase);
    ctx.closePath();
    ctx.fill();
  }

  _drawArena(ctx, w, h) {
    const top = ARENA.groundTop;
    const bot = ARENA.groundBottom;
    const topInset = ARENA.mode === "portrait" ? 168 : 88;
    const botInset = ARENA.mode === "portrait" ? 48 : 22;
    const tl = topInset, tr = w - topInset, bl = botInset, br = w - botInset;

    // Quiet apron under the floor so TikTok comments have a calm background.
    ctx.fillStyle = "#5a3224";
    ctx.fillRect(0, bot, w, h - bot);
    const fade = ctx.createLinearGradient(0, bot, 0, bot + 80);
    fade.addColorStop(0, "rgba(90, 50, 36, 0.5)");
    fade.addColorStop(1, "rgba(90, 50, 36, 0)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, bot, w, 90);

    const floor = ctx.createLinearGradient(0, top, 0, bot);
    floor.addColorStop(0, "#e8b97a");
    floor.addColorStop(0.45, "#e0a45e");
    floor.addColorStop(1, "#c97a40");
    ctx.fillStyle = floor;
    ctx.beginPath();
    ctx.moveTo(tl, top);
    ctx.lineTo(tr, top);
    ctx.lineTo(br, bot);
    ctx.lineTo(bl, bot);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(90, 40, 20, 0.35)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Perspective planks
    ctx.strokeStyle = "rgba(255, 230, 200, 0.12)";
    ctx.lineWidth = 2;
    for (let i = 1; i <= 6; i++) {
      const t = i / 7;
      const y = top + (bot - top) * t;
      const x0 = tl + (bl - tl) * t;
      const x1 = tr + (br - tr) * t;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 12]);
    ctx.beginPath();
    ctx.moveTo(ARENA.centerX, top + 8);
    ctx.lineTo(ARENA.centerX, bot - 8);
    ctx.stroke();
    ctx.setLineDash([]);
    const midY = top + (bot - top) * 0.62;
    const radX = ARENA.mode === "portrait" ? 70 : 120;
    const radY = ARENA.mode === "portrait" ? 36 : 44;
    ctx.beginPath();
    ctx.ellipse(ARENA.centerX, midY, radX, radY, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Team washes follow the trapezoid
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tl, top);
    ctx.lineTo(ARENA.centerX, top);
    ctx.lineTo(ARENA.centerX, bot);
    ctx.lineTo(bl, bot);
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 91, 138, 0.12)";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ARENA.centerX, top);
    ctx.lineTo(tr, top);
    ctx.lineTo(br, bot);
    ctx.lineTo(ARENA.centerX, bot);
    ctx.closePath();
    ctx.fillStyle = "rgba(61, 184, 255, 0.12)";
    ctx.fill();
    ctx.restore();

    // Flags at the far edge of the stage, inset from the screen sides.
    drawFlag(ctx, tl + 36, top - 8, CONFIG.teams.rose.color, "ROSE");
    drawFlag(ctx, tr - 36, top - 8, CONFIG.teams.sky.color, "SKY");

    ctx.fillStyle = "#8d4a2a";
    ctx.fillRect(0, bot, w, 16);
  }

  _drawParticles(ctx) {
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.star) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? p.r + 2 : p.r * 0.45;
          const ang = (i / 10) * Math.PI * 2;
          ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    for (const f of this.floaters) {
      const a = Math.max(0, f.life / f.max);
      ctx.globalAlpha = a;
      ctx.font = "800 22px Nunito, Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(40,20,20,0.5)";
      ctx.lineWidth = 4;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
  }
  spawnShockwave(x, y, power = 1) {
    const cap = (CONFIG.fx && CONFIG.fx.shockwaveMax) || 6;
    if (this.shockwaves.length >= cap) this.shockwaves.shift();
    this.shockwaves.push({ x, y, r: 8, max: 90 * power, life: 22, power });
    this.addShake(this.pairs?.enabled ? 1.2 * power : 3.2 * power, this.pairs?.enabled ? 6 : 10);
  }

  spawnDustDome(x, y, power = 1) {
    const cap = (CONFIG.fx && CONFIG.fx.dustMax) || 22;
    const n = this.pairs?.enabled ? Math.ceil(8 * power) : Math.ceil(14 * power);
    for (let i = 0; i < n; i++) {
      const a = Math.PI + Math.random() * Math.PI;
      const s = 1.5 + Math.random() * 3.5 * power;
      this.dust.push({
        x, y: y - 4,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s * 0.4 - 0.4,
        r: 6 + Math.random() * 10,
        life: 22 + Math.random() * 16,
        max: 32,
      });
    }
    if (this.dust.length > cap) this.dust.splice(0, this.dust.length - cap);
  }

  _tickTrails() {
    const SWING = new Set(["slash", "slashOver", "slashHoriz", "spin", "special", "thrust", "riposte"]);
    for (const f of this.fighters) {
      const swinging = isSword(f) && (f.state === STATE.ACTIVE || f.state === STATE.WINDUP) && SWING.has(f.move);
      if (swinging) {
        const tip = fighterContact(f, "blade");
        if (!f._trail) f._trail = { pts: [], life: 18, color: "#fff6c8" };
        const last = f._trail.pts[f._trail.pts.length - 1];
        if (last) {
          const dx = tip.x - last.x, dy = tip.y - last.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 8) {
            const n = Math.min(5, Math.floor(dist / 8));
            for (let i = 1; i <= n; i++) {
              const u = i / (n + 1);
              f._trail.pts.push({ x: last.x + dx * u, y: last.y + dy * u });
            }
          }
        }
        f._trail.pts.push({ x: tip.x, y: tip.y });
        if (f._trail.pts.length > 22) f._trail.pts.splice(0, f._trail.pts.length - 22);
        f._trail.life = 18;
        if (!this.trails.includes(f._trail)) this.trails.push(f._trail);
      }
    }
    for (const t of this.trails) t.life -= 1;
    this.trails = this.trails.filter((t) => t.life > 0 && t.pts.length);
    for (const d of this.dust) {
      d.x += d.vx; d.y += d.vy; d.vy += 0.08; d.life -= 1; d.r *= 1.03;
    }
    this.dust = this.dust.filter((d) => d.life > 0);
    for (const s of this.shockwaves) {
      s.r += (s.max - s.r) * 0.18;
      s.life -= 1;
    }
    this.shockwaves = this.shockwaves.filter((s) => s.life > 0);
  }

  _drawTrails(ctx) {
    for (const t of this.trails) {
      if (t.pts.length < 2) continue;
      const fade = Math.max(0, t.life / 18);
      const pts = t.pts;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(255, 240, 200, 0.95)";
      ctx.shadowBlur = 16;
      // Smooth crescent: quadratic midpoints along the blade-tip path,
      // tapered wide in the middle and sharp at the ends.
      const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const m = mid(pts[i - 1], pts[i]);
        ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, m.x, m.y);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.globalAlpha = 0.55 * fade;
      ctx.strokeStyle = t.color || "#fff6c8";
      ctx.lineWidth = 14;
      ctx.stroke();
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();
    }
  }

  _drawShockwaves(ctx) {
    for (const s of this.shockwaves) {
      const a = Math.max(0, s.life / 22);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.globalAlpha = 0.55 * a;
      ctx.strokeStyle = "rgba(255, 252, 230, 0.9)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, s.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.2 * a;
      ctx.beginPath();
      ctx.arc(0, 0, s.r * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  _drawDust(ctx) {
    for (const d of this.dust) {
      const a = Math.max(0, d.life / d.max);
      ctx.fillStyle = `rgba(150, 110, 80, ${0.35 * a})`;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.r, d.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawSpeedLines(ctx, w, h) {
    if (!this.speedLines) return;
    const a = Math.min(1, this.speedLines / 24);
    ctx.save();
    ctx.strokeStyle = `rgba(255, 250, 235, ${0.35 * a})`;
    ctx.lineWidth = 2;
    const midY = this.camFocusY || h / 2;
    for (let i = 0; i < 18; i++) {
      const y = midY - 220 + i * 26 + (i % 3) * 8;
      const x0 = (this.camFocusX || w / 2) - 400;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + 180 + (i % 5) * 40, y);
      ctx.stroke();
    }
    ctx.restore();
  }

}

function lookPatch(gender, id) {
  const tmp = createFighter({ uniqueId: id, nickname: "x", gender, team: "rose" });
  return { look: tmp.look, palette: tmp.palette, gender };
}

function makeClouds() {
  const list = [];
  for (let i = 0; i < 7; i++) {
    list.push({
      x: Math.random() * 1920,
      y: 60 + Math.random() * 220,
      s: 0.6 + Math.random() * 1.1,
      spd: 0.12 + Math.random() * 0.18,
      a: 0.35 + Math.random() * 0.25,
    });
  }
  return list;
}

function drawCloud(ctx, x, y, s, a) {
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.beginPath();
  ctx.arc(x, y, 28 * s, 0, Math.PI * 2);
  ctx.arc(x + 30 * s, y - 10 * s, 24 * s, 0, Math.PI * 2);
  ctx.arc(x + 58 * s, y, 30 * s, 0, Math.PI * 2);
  ctx.arc(x + 28 * s, y + 8 * s, 22 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawFlag(ctx, x, y, color, label) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#5a3318";
  ctx.fillRect(-3, -70, 6, 80);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(3, -70);
  ctx.lineTo(64, -54);
  ctx.lineTo(3, -38);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "800 11px Nunito, sans-serif";
  ctx.fillText(label, 10, -50);
  ctx.restore();
}
