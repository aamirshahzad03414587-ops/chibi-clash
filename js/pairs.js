/**
 * One choreography director per slotted duel. 5 rows × 3 lanes = 15 pairs.
 * Live 30-fighter play uses this instead of the featured front-duel director.
 */
import { CONFIG, ARENA } from "./config.js";
import { LIVE_EXCHANGES } from "./combos.js";
import { beginMove, beginBlock, beginDodge, beginHurt, beginKo, STATE, moveData } from "./combat.js";
import { applyGift, refreshPower } from "./fighter.js";

const MIN_GAP = 100;
const ROWS = 5;
const LANES = 3;
const COL_X = [240, 540, 840];
const FIGHT_SEP = 88;

export function slotWorldX(slot, team) {
  const mid = COL_X[slot.lane] + ((slot.row % 2) ? 36 : 0);
  const side = team === "sky" ? 1 : -1;
  return mid + side * FIGHT_SEP;
}

export function slotWorldY(slot) {
  // Even pitch so large name tags sit in the gap between rows.
  const front = 1340;
  const pitch = 248;
  return front - slot.row * pitch;
}

export function createPairManager(world) {
  const mgr = {
    enabled: false,
    pairs: [],
    punchInT: 0,
    punchDur: 0,
    punchFocus: null,
    nextSeq: 0,

    enable() {
      this.enabled = true;
      this.pendingFills = this.pendingFills || [];
      if (world.director) {
        world.director.enabled = false;
        world.director.demo = false;
      }
      world.camMode = "wide";
      world.camZoom = 1;
      world.camTargetZoom = 1;
      world.camFocusX = ARENA.width / 2;
      world.camFocusY = ARENA.height / 2;
      world.koFreeze = 0;
      world.slowMo = 1;
      world.slowMoFrames = 0;
      this.rebuild();
    },

    disable() {
      this.enabled = false;
      this.pairs = [];
      this.punchInT = 0;
      this.punchFocus = null;
    },

    rebuild() {
      const living = world.fighters.filter((f) => !f.dead && f.state !== STATE.KO);
      for (const f of living) {
        if (f.slot) continue;
      }
      const used = new Set(
        world.fighters.filter((f) => f.slot && !f.dead).map((f) => `${f.team}-${f.slot.row}-${f.slot.lane}`)
      );
      const rose = living.filter((f) => f.team === "rose" && !f.slot);
      const sky = living.filter((f) => f.team === "sky" && !f.slot);
      const empty = [];
      for (let row = 0; row < ROWS; row++) {
        for (let lane = 0; lane < LANES; lane++) {
          if (!used.has(`rose-${row}-${lane}`)) empty.push({ team: "rose", row, lane });
          if (!used.has(`sky-${row}-${lane}`)) empty.push({ team: "sky", row, lane });
        }
      }
      const take = { rose: rose.slice(), sky: sky.slice() };
      for (const seat of empty) {
        const pool = take[seat.team];
        if (!pool || !pool.length) continue;
        const f = pool.shift();
        f.slot = { row: seat.row, lane: seat.lane };
      }
      // Any leftover living fighters get a leftover seat if one remains.
      this._syncPairs();
    },

    _syncPairs() {
      const keyOf = (s) => (s ? `${s.row}-${s.lane}` : "");
      const byKey = new Map();
      for (const f of world.fighters) {
        if (f.dead || !f.slot) continue;
        const k = keyOf(f.slot);
        if (!byKey.has(k)) byKey.set(k, { row: f.slot.row, lane: f.slot.lane, rose: null, sky: null });
        const slot = byKey.get(k);
        if (f.team === "rose") slot.rose = f;
        else slot.sky = f;
      }
      const prev = new Map(this.pairs.map((p) => [`${p.row}-${p.lane}`, p]));
      const next = [];
      for (const slot of byKey.values()) {
        const k = `${slot.row}-${slot.lane}`;
        const old = prev.get(k);
        const a = slot.rose;
        const b = slot.sky;
        if (!a && !b) continue;
        if (old && old.a === a && old.b === b) {
          next.push(old);
          continue;
        }
        const pair = old && (old.a === a || old.b === b) ? old : this._newPair(slot, a, b);
        pair.a = a;
        pair.b = b;
        pair.row = slot.row;
        pair.lane = slot.lane;
        if (a) a.pairMate = b || null;
        if (b) b.pairMate = a || null;
        if (a) a.scripted = true;
        if (b) b.scripted = true;
        next.push(pair);
      }
      this.pairs = next;
    },

    _newPair(slot, a, b) {
      const offset = (slot.row * 37 + slot.lane * 53 + this.nextSeq * 11) % 90;
      const pair = {
        row: slot.row,
        lane: slot.lane,
        a,
        b,
        t: -offset,
        idx: 0,
        seq: this._pickSeq(a, b, slot),
        pause: 0,
        flips: (slot.row + slot.lane) % 2,
      };
      this.nextSeq += 1;
      return pair;
    },

    _pickSeq(a, b, slot) {
      const swords = (a && a.weapon === "sword") || (b && b.weapon === "sword");
      const pool = LIVE_EXCHANGES.filter((s) => swords || s.kit !== "sword");
      const list = pool.length ? pool : LIVE_EXCHANGES;
      const i = (slot.row * 3 + slot.lane + this.nextSeq) % list.length;
      return list[i];
    },

    requestPunchIn(a, b, ticks = 90) {
      // Live arena never moves the camera. A banner calls out the moment instead.
      const name = a?.nickname || b?.nickname || "Fighter";
      world.pushBanner?.(name, b?.nickname ? `${name} vs ${b.nickname}` : "Highlight", 90);
    },

    giftSword(f) {
      if (!f) return;
      const first = f.weapon !== "sword";
      applyGift(f, 1);
      refreshPower(f);
      if (first) {
        f.upgradeT = 48;
        f.auraT = 70;
        world.floater?.(f.x, f.y - 130, "SWORD!", "#ffe08a");
        world.sparkle?.(f.x, f.y - 90, "#ffe08a", 12);
        world.pushEvent?.(`${f.nickname} upgrades to a sword!`);
      }
      world.pushBanner?.(f.nickname, "Sword ready", 90);
    },

    placeAtHomes({ skipEnter = true } = {}) {
      for (const f of world.fighters) f.slot = null;
      const rose = world.fighters.filter((f) => f.team === "rose" && !f.dead).sort((a, b) => (a.maxHp || 0) - (b.maxHp || 0));
      const sky = world.fighters.filter((f) => f.team === "sky" && !f.dead).sort((a, b) => (a.maxHp || 0) - (b.maxHp || 0));
      const n = Math.max(rose.length, sky.length);
      for (let i = 0; i < n && i < ROWS * LANES; i++) {
        const row = Math.floor(i / LANES);
        const lane = i % LANES;
        if (rose[i]) rose[i].slot = { row, lane };
        if (sky[i]) sky[i].slot = { row, lane };
      }
      this.rebuild();
      for (const f of world.fighters) {
        if (!f.slot || f.dead) continue;
        f.x = slotWorldX(f.slot, f.team);
        f.y = slotWorldY(f.slot);
        f.groundY = f.y;
        f.vx = 0;
        f.vy = 0;
        f.airborne = false;
        f.facing = f.team === "rose" ? 1 : -1;
        if (skipEnter && (f.state === STATE.ENTER || f.state === "enter")) {
          f.state = STATE.IDLE;
          f.invuln = false;
          f.stateTime = 0;
        }
      }
    },

    onKo(loser, winner) {
      if (!this.enabled || !loser) return;
      const slot = loser.slot ? { ...loser.slot } : null;
      const team = loser.team;
      world.pushBanner?.(winner?.nickname || "KO", `${winner?.nickname || "Fighter"} takes the KO`, 80);
      // Winner stays; vacated slot is filled from the queue shortly after the KO.
      loser._vacateSlot = slot;
      loser._vacateTeam = team;
      if (slot) {
        this.pendingFills = this.pendingFills || [];
        this.pendingFills.push({ slot, team, after: 28 });
      }
    },

    fillSlot(slot, team, fighter) {
      if (!fighter || !slot) return;
      fighter.slot = { row: slot.row, lane: slot.lane };
      const home = { x: slotWorldX(fighter.slot, fighter.team), y: slotWorldY(fighter.slot) };
      const edgeX = fighter.team === "sky" ? ARENA.rightMax + 40 : ARENA.leftMin - 40;
      fighter.enterFrom = { x: edgeX, y: home.y };
      fighter.x = edgeX;
      fighter.y = home.y;
      fighter.groundY = home.y;
      fighter.state = STATE.ENTER;
      fighter.stateTime = 0;
      fighter.stateDur = 54;
      fighter.invuln = true;
      fighter.scripted = true;
      fighter.facing = fighter.team === "rose" ? 1 : -1;
      this._syncPairs();
    },

    tick() {
      if (!this.enabled) return;
      if (this.pendingFills) {
        for (const fill of this.pendingFills) {
          if (fill.after > 0) fill.after -= 1;
        }
      }
      if (this.punchInT > 0) {
        this.punchInT -= 1;
        if (this.punchInT <= 0) {
          this.punchFocus = null;
          world.camMode = "wide";
        }
      }
      this._syncPairs();
      this._markPlates();
      for (const pair of this.pairs) this._tickPair(pair);
    },

    _markPlates() {
      for (const f of world.fighters) if (!f.dead) f.showPlate = true;
    },

    _busy(f) {
      if (!f || f.dead) return true;
      if ((f.hitstop || 0) > 0) return true;
      const st = f.state;
      return st === STATE.WINDUP || st === STATE.ACTIVE || st === STATE.RECOVER
        || st === STATE.HURT || st === STATE.KO || st === STATE.DASH || st === "dash"
        || st === STATE.DODGE || st === "dodge" || st === STATE.ENTER || st === "enter";
    },

    _tickPair(pair) {
      const a = pair.a;
      const b = pair.b;
      this._stepIn(a, b);
      this._keepGap(a, b, /*fighting*/ this._busy(a) || this._busy(b));
      this._holdLane(a);
      this._holdLane(b);
      if (a && b) {
        if (!a.airborne && a.state !== STATE.KO) a.facing = b.x >= a.x ? 1 : -1;
        if (!b.airborne && b.state !== STATE.KO) b.facing = a.x >= b.x ? 1 : -1;
      }
      if (!a || !b || a.state === STATE.KO || b.state === STATE.KO || a.state === STATE.ENTER || b.state === STATE.ENTER) {
        return;
      }
      // Strict turn-taking: wait until both are idle after a move, then a short beat.
      if (this._busy(a) || this._busy(b)) {
        pair.sawBusy = true;
        return;
      }
      if (pair.sawBusy) {
        pair.sawBusy = false;
        const burst = pair.burstLeft > 0;
        pair.beat = burst ? 26 + (pair.lane % 8) : 78 + ((pair.row * 13 + pair.lane * 9) % 42);
      }
      if ((pair.beat || 0) > 0) {
        pair.beat -= 1;
        return;
      }
      if (!pair.seq) {
        pair.seq = this._pickSeq(a, b, pair);
        pair.idx = 0;
        pair.burstLeft = pair.seq?.burst ? (pair.seq.steps.length || 0) : 0;
      }
      const steps = pair.seq.steps || [];
      if (pair.idx >= steps.length) {
        pair.flips = 1 - (pair.flips || 0);
        pair.seq = this._pickSeq(a, b, { row: pair.row, lane: pair.lane + pair.flips + this.nextSeq });
        pair.idx = 0;
        pair.burstLeft = pair.seq?.burst ? (pair.seq.steps.length || 0) : 0;
        pair.beat = 20;
        return;
      }
      this._apply(pair, steps[pair.idx++]);
      if (pair.burstLeft > 0) pair.burstLeft -= 1;
      pair.sawBusy = true; // start the wait as soon as the move begins
    },

    _stepIn(a, b) {
      if (!a || !b) return;
      const atk = (a.state === STATE.WINDUP || a.state === STATE.ACTIVE) ? a
        : (b.state === STATE.WINDUP || b.state === STATE.ACTIVE) ? b : null;
      if (!atk || atk.airborne) return;
      const vic = atk === a ? b : a;
      const md = moveData(atk.move || "");
      const gap = atk._fightGap || md.fightGap || 110;
      const face = Math.sign(vic.x - atk.x) || atk.facing || 1;
      const desired = vic.x - face * gap;
      const k = atk.state === STATE.WINDUP ? 0.32 : 0.45;
      atk.x += (desired - atk.x) * k;
      // Keep torsos apart so a kick or hook can reach without bodies merging.
      const minSep = Math.max(96, gap - 6);
      if (face > 0 && atk.x > vic.x - minSep) atk.x = vic.x - minSep;
      if (face < 0 && atk.x < vic.x + minSep) atk.x = vic.x + minSep;
    },

    _apply(pair, ev) {
      const a = pair.flips ? pair.b : pair.a;
      const b = pair.flips ? pair.a : pair.b;
      if (ev.fold) world.director && (world.director.pendingFold = true);
      if (ev.launch) world.director && (world.director.pendingLaunch = true);
      // Even with the featured director disabled, _applyHit still reads world.director flags.
      if (ev.fold) world.pendingFold = true;
      if (ev.launch) world.pendingLaunch = true;
      if (ev.both && ev.both === "charge") {
        this._move(a, "charge", b);
        this._move(b, "charge", a);
      } else if (ev.both) {
        this._move(a, ev.both, b);
      }
      if (ev.a) this._move(a, ev.a, b);
      if (ev.b) this._move(b, ev.b, a);
    },

    _move(f, name, other) {
      if (!f || f.dead || f.state === STATE.KO) return;
      if (name === "hurtFold") {
        f.foldHit = true;
        beginHurt(f, 28, other?.x);
        return;
      }
      if (name === "getup") {
        f.state = "getup";
        f.move = "getup";
        f.stateTime = 0;
        f.stateDur = 32;
        f.airborne = false;
        f.vy = 0;
        return;
      }
      if (name === "charge") {
        f.state = "dash";
        f.move = "charge";
        f.stateTime = 0;
        f.stateDur = 18;
        f.afterimageT = Math.max(f.afterimageT || 0, 12);
        if (other) f.facing = other.x >= f.x ? 1 : -1;
        const meet = other ? ((f.x + other.x) / 2 - (f.facing || 1) * (MIN_GAP / 2)) : f.x + f.facing * 40;
        const speed = Math.max(5, Math.abs(meet - f.x) / 18);
        f.vx = (f.facing || 1) * speed;
        return;
      }
      if (name === "block" || name === "parry") {
        beginBlock(f);
        return;
      }
      if (name === "leanBack" || name === "dodge" || name === "slip" || name === "duck") {
        f.dodgeStyle = name === "leanBack" ? "lean" : "duck";
        beginDodge(f, -f.facing);
        return;
      }
      f.state = STATE.IDLE;
      f.wantMove = null;
      f.comboPlan = [];
      beginMove(f, name);
      const md = moveData(f.move || name);
      f._fightGap = md.fightGap || 90;
    },

    _keepGap(a, b, fighting = false) {
      if (!a || !b) return;
      if (a.airborne || b.airborne) return;
      if (fighting) return; // let the strike close the last inches
      const gap = Math.abs(a.x - b.x);
      if (gap >= MIN_GAP) return;
      const mid = (a.x + b.x) / 2;
      const left = a.x <= b.x ? a : b;
      const right = left === a ? b : a;
      left.x = mid - MIN_GAP / 2;
      right.x = mid + MIN_GAP / 2;
      if (left.state === "dash") left.vx = 0;
      if (right.state === "dash") right.vx = 0;
    },

    _holdLane(f) {
      if (!f || !f.slot || f.dead || f.airborne) return;
      if (f.state === STATE.KO || f.state === STATE.ENTER || f.state === "enter") return;
      const hx = slotWorldX(f.slot, f.team);
      const hy = slotWorldY(f.slot);
      f.groundY = hy;
      if (f.state === STATE.IDLE || f.state === STATE.WALK || f.state === "idle") {
        f.x += (hx - f.x) * 0.08;
        f.y += (hy - f.y) * 0.12;
      } else if (f.state !== "dash") {
        f.y += (hy - f.y) * 0.06;
      }
    },
  };
  return mgr;
}

// Used by fighter homeX/homeY when a slot is assigned.
export { COL_X, FIGHT_SEP, ROWS, LANES };
