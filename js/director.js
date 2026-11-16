/** Plays authored combo sequences on a featured pair, in sync. */
import { DEMO_SEQUENCE, LIVE_EXCHANGES } from "./combos.js";
import { beginMove, beginBlock, beginDodge, beginHurt, beginKo, isSword, resolveMove } from "./combat.js";
import { applyGift, requestAttack } from "./fighter.js";
import { CONFIG } from "./config.js";

export function createDirector(world) {
  return {
    world,
    enabled: false,          // live featured duels
    demo: false,             // scripted demo recording
    t: 0,
    seq: DEMO_SEQUENCE,
    idx: 0,
    a: null,
    b: null,
    marks: [],
    cam: "medium",
    lastNote: "",
    pendingLaunch: false,
    pendingFold: false,
    done: false,

    startDemo(a, b, seq = DEMO_SEQUENCE) {
      this.demo = true;
      this.enabled = true;
      this.t = 0;
      this.idx = 0;
      this.a = a;
      this.b = b;
      this.seq = seq;
      this.marks = [];
      this.done = false;
      this.world.holdFeatured = true;
      this.world.simClock = true;
      this.world.roundTicksLeft = 295 * 60;
      this.world.camMode = "medium";
      this.world.camZoom = 2.15;
      if (a) a.scripted = true;
      if (b) b.scripted = true;
    },

    stop() {
      this.enabled = false;
      this.demo = false;
      this.world.holdFeatured = false;
      this.world.slowMo = 1;
      if (this.a) this.a.scripted = false;
      if (this.b) this.b.scripted = false;
    },

    tick() {
      if (!this.enabled) return;
      if (this.demo) this._tickDemo();
    },

    _tickDemo() {
      const a = this.a;
      const b = this.b;
      if (!a || !b) return;
      // Keep them on a readable front-center stage unless launched.
      this._stage(a, b);
      // Don't let a charge dash carry them through each other.
      const gap = Math.abs(a.x - b.x);
      if (gap < 88) {
        const mid = (a.x + b.x) / 2;
        if (a.state === "dash") { a.x = mid - 44; a.vx = 0; }
        if (b.state === "dash") { b.x = mid + 44; b.vx = 0; }
      }

      while (this.idx < this.seq.length && this.seq[this.idx].t <= this.t) {
        const ev = this.seq[this.idx++];
        this._apply(ev, a, b);
      }
      this.t += 1;
      if (this.idx >= this.seq.length && this.t > (this.seq[this.seq.length - 1]?.t || 0) + 80) {
        this.done = true;
      }
    },

    _apply(ev, a, b) {
      if (ev.note) {
        this.lastNote = ev.note;
        this.marks.push({ tick: this.t, t: +(this.t / 60).toFixed(2), label: ev.note });
      }
      if (ev.cam) {
        this.cam = ev.cam;
        this.world.camMode = ev.cam;
      }
      if (ev.slowMo != null) {
        this.world.slowMo = ev.slowMo;
        this.world.slowMoFrames = ev.slowMo < 1 ? 48 : 0;
        if (ev.slowMo < 1) this.world.letterbox = Math.max(this.world.letterbox, 0.85);
      }
      if (ev.hp) {
        if (ev.hp.a != null && a) a.hp = ev.hp.a;
        if (ev.hp.b != null && b) b.hp = ev.hp.b;
      }
      if (ev.fold) this.pendingFold = true;
      if (ev.launch) this.pendingLaunch = true;

      if (ev.restage) this._restage(a, b);
      if (ev.gift === "a") this._gift(a);
      if (ev.gift === "b") this._gift(b);

      if (ev.fx === "shockwave") this.world.spawnShockwave?.((a.x + b.x) / 2, (a.y + b.y) / 2 - 40, 1);
      if (ev.fx === "dustDome") this.world.spawnDustDome?.((a.x + b.x) / 2, Math.max(a.y, b.y), 1);
      if (ev.fx === "aura") {
        if (b) b.auraT = 90;
        if (a) a.auraT = 40;
      }
      if (ev.fx === "afterimages") {
        if (b) b.afterimageT = 48;
        if (a && ev.both) a.afterimageT = 48;
      }
      if (ev.fx === "flash") this.world.impactFlash = 4;
      if (ev.fx === "speedlines") this.world.speedLines = 24;

      if (ev.ko === "a" || ev.ko === "b" || ev.ko === true) {
        const loser = ev.ko === "a" ? a : b;
        const winner = loser === a ? b : a;
        this._forceKo(loser, winner);
      }

      if (ev.both) {
        this._move(a, ev.both);
        this._move(b, ev.both === "charge" ? "charge" : ev.both);
      }
      if (ev.a) this._move(a, ev.a);
      if (ev.b) this._move(b, ev.b);
    },

    _restage(a, b) {
      const Arena = this.world.arena || { width: 1080, groundBottom: 1320 };
      const y = (Arena.groundBottom || 1320) - 90;
      const mid = (Arena.width || 1080) / 2;
      for (const [f, side] of [[a, -1], [b, 1]]) {
        if (!f || f.dead || f.state === "ko") continue;
        f.x = mid + side * 70;
        f.y = y;
        f.groundY = y;
        f.vx = 0;
        f.vy = 0;
        f.airborne = false;
        f.facing = -side;
        f.aiClock = 40;
      }
    },

    _forceKo(loser, winner) {
      if (!loser || loser.state === "ko" || loser.dead) return;
      loser.hp = 0;
      const fromX = winner ? winner.x : loser.x - loser.facing * 40;
      beginKo(loser, fromX);
      loser.airborne = true;
      loser.groundY = loser.y;
      loser.vy = -12;
      loser.vx = ((loser === this.b) ? 1 : -1) * 7;
      loser.foldHit = true;
      loser.stars = 1;
      this.world.camMode = "close";
      this.world.slowMo = this.world.slowMo < 1 ? this.world.slowMo : 0.42;
      this.world.slowMoFrames = Math.max(this.world.slowMoFrames || 0, 48);
      this.world.letterbox = Math.max(this.world.letterbox || 0, 0.9);
      this.world.addShake?.(2.4, 12);
      this.world.floater?.(loser.x, loser.y - 120, "KO!", "#ffd166");
      if (winner) {
        winner.kos = (winner.kos || 0) + 1;
        this.world.scores[winner.team] += 1;
        this.world.pushEvent?.(`${winner.nickname} KOs ${loser.nickname}!`);
      }
    },

    _move(f, name) {
      if (!f || f.dead) return;
      if (name === "hurtFold") {
        f.foldHit = true;
        beginHurt(f, 28, this.a && f === this.b ? this.a.x : this.b?.x);
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
      if (name === "knee") {
        f.state = "knee";
        f.move = "knee";
        f.stateTime = 0;
        f.stateDur = 40;
        f.auraT = 80;
        return;
      }
      if (name === "charge") {
        f.state = "dash";
        f.move = "charge";
        f.stateTime = 0;
        f.stateDur = 22;
        f.afterimageT = Math.max(f.afterimageT || 0, 16);
        const other = f === this.a ? this.b : this.a;
        if (other) f.facing = other.x >= f.x ? 1 : -1;
        // Close most of a large gap so the dash actually meets the opponent.
        let speed = 7;
        if (other) {
          const meet = (f.x + other.x) / 2 - (f.facing || 1) * 44;
          speed = Math.max(7, Math.abs(meet - f.x) / 22);
        }
        f.vx = (f.facing || 1) * speed;
        return;
      }
      if (name === "block" || name === "parry") {
        beginBlock(f);
        return;
      }
      if (name === "dodge" || name === "slip" || name === "duck") {
        f.dodgeStyle = "duck";
        beginDodge(f, -f.facing);
        return;
      }
      if (name === "leanBack") {
        f.dodgeStyle = "lean";
        beginDodge(f, -f.facing);
        return;
      }
      // Force the move even if currently mid-recover so authored timing wins.
      f.state = "idle";
      f.wantMove = null;
      f.comboPlan = [];
      beginMove(f, name);
    },

    _gift(f) {
      if (!f) return;
      const first = f.weapon !== "sword";
      applyGift(f, 1);
      if (first) {
        f.upgradeT = 48;
        f.auraT = 60;
        this.world.floater?.(f.x, f.y - 130, "SWORD!", "#ffe08a");
        this.world.sparkle?.(f.x, f.y - 90, "#ffe08a", 18);
        this.world.pushEvent?.(`${f.nickname} sent Rose (+${CONFIG.combat.hpPerCoin} HP)!`);
      }
    },

    _stage(a, b) {
      const Arena = this.world.arena || { width: 1080, groundBottom: 1320 };
      const y = (Arena.groundBottom || 1320) - 90;
      const mid = (Arena.width || 1080) / 2;
      for (const f of [a, b]) {
        if (!f || f.dead || f.state === "ko" || f.airborne) continue;
        if (f.state === "dash" || f.state === "hurt") continue;
        const wantX = f === a ? mid - 70 : mid + 70;
        f.y += (y - f.y) * 0.25;
        const dx = wantX - f.x;
        if (f.state === "idle" || f.state === "knee" || f.state === "getup" || f.state === "block") {
          f.x += dx * 0.22;
        } else if (Math.abs(dx) > 120) {
          f.x += dx * 0.1;
        }
        f.facing = f === a ? 1 : -1;
        f.aiClock = 40;
      }
    },
  };
}

export function pickLiveExchange(fighter) {
  const kit = isSword(fighter) ? "sword" : "gloves";
  const pool = LIVE_EXCHANGES.filter((e) => e.kit === kit);
  return pool[Math.floor(Math.random() * pool.length)] || pool[0];
}

export { resolveMove, requestAttack };
