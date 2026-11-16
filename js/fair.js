/** Fair-play helpers: damage caps, comeback windows, presence / HP carry-over. */
import { CONFIG } from "./config.js";
import { isSword, moveData } from "./combat.js";

const GLOVE_REF = {
  slash: "hook",
  slashOver: "hook",
  slashHoriz: "hook",
  thrust: "cross",
  spin: "uppercut",
  special: "uppercut",
  riposte: "cross",
};

export function isFree(fighter) {
  return !fighter?.gifted && (fighter?.coins || 0) === 0 && fighter?.weapon !== "sword";
}

export function incomingScale(fighter) {
  const fair = CONFIG.fair || {};
  const base = CONFIG.combat.baseHp || 100;
  const ratio = Math.max(1, (fighter.maxHp || base) / base);
  const k = fair.incomingLog ?? 0.35;
  const cap = fair.incomingCap ?? 2.5;
  return Math.min(cap, 1 + k * Math.log2(ratio));
}

export function fairDamage(atk, vic, move) {
  let dmg = move?.damage ?? 6;
  if (isSword(atk)) {
    const refName = GLOVE_REF[atk.move] || "hook";
    const ref = moveData(refName).damage || dmg;
    const cap = (CONFIG.fair?.swordDamageCap ?? 1.15) * ref;
    dmg = Math.min(dmg, cap);
  }
  dmg = Math.max(1, Math.round(dmg * incomingScale(vic)));
  return dmg;
}

export function startupScale(fighter) {
  if (isSword(fighter)) return 1;
  let s = CONFIG.fair?.gloveStartupScale ?? 0.82;
  if ((fighter.speedBuffT || 0) > 0) s *= 0.88;
  return s;
}

export function hitZone(moveName, move) {
  if (move?.zone) return move.zone;
  const n = String(moveName || "");
  if (n === "gutPunch") return "gut";
  if (n === "sweep") return "legs";
  if (move?.high || /kick|hook|jab|flick|uppercut|roundhouse|axe/i.test(n)) return "face";
  return "body";
}

/** Deterministic 0..1 from ids + tick, so recordings stay stable. */
export function fairRoll(atk, vic, tick, salt = 0) {
  let h = 2166136261 ^ (tick || 0) ^ salt;
  const s = String(atk?.id || "") + ":" + String(vic?.id || "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/**
 * Gloves may slip or counter a blade. After 3 hits in a row, a free
 * player gets a guaranteed counter window.
 */
export function evadesOrCounters(atk, vic, tick) {
  if (!vic || vic.dead || vic.state === "ko") return null;
  if (vic.state === "block" || vic.state === "dodge") return null;
  const fair = CONFIG.fair || {};
  if ((vic.comebackT || 0) > 0 && isFree(vic)) return "counter";
  if (isSword(atk) && !isSword(vic)) {
    let chance = fair.swordEvadeChance ?? 0.36;
    if ((vic.speedBuffT || 0) > 0) chance += 0.08;
    if (fairRoll(atk, vic, tick, 11) < chance) {
      return fairRoll(atk, vic, tick, 23) < 0.45 ? "counter" : "dodge";
    }
  }
  return null;
}

export function grantComeback(fighter) {
  const need = CONFIG.fair?.comebackHits ?? 3;
  if ((fighter.hitsTakenStreak || 0) >= need) {
    fighter.comebackT = CONFIG.fair?.comebackTicks ?? 96;
    fighter.hitsTakenStreak = 0;
    fighter.comebacks = (fighter.comebacks || 0) + 1;
    return true;
  }
  return false;
}

export function grantSpeedBoost(fighter, ticks, { from } = {}) {
  if (!fighter) return false;
  const max = CONFIG.fair?.likeBoostMax ?? 180;
  const add = Math.max(1, ticks || 0);
  fighter.speedBuffT = Math.min(max, (fighter.speedBuffT || 0) + add);
  fighter.boostFrom = from || "boost";
  return true;
}

export function noteViewerEvent(world, uniqueId, kind = "event") {
  if (!uniqueId || !world) return;
  if (!world.viewerState) world.viewerState = new Map();
  const rec = world.viewerState.get(uniqueId) || emptyRecord(uniqueId);
  rec.lastEventAt = eventStamp(world);
  rec.lastKind = kind;
  world.viewerState.set(uniqueId, rec);
}

export function snapshotViewer(world, fighter, { seated = false, queued = false } = {}) {
  if (!world || !fighter) return;
  if (!world.viewerState) world.viewerState = new Map();
  const id = fighter.id || fighter.uniqueId;
  const rec = world.viewerState.get(id) || emptyRecord(id);
  rec.nickname = fighter.nickname || rec.nickname;
  rec.coins = fighter.coins || rec.coins || 0;
  rec.maxHp = fighter.maxHp ?? rec.maxHp;
  rec.hp = fighter.hp ?? rec.hp;
  rec.weapon = fighter.weapon || rec.weapon || "gloves";
  rec.swordTier = fighter.swordTier || 0;
  rec.gifted = !!fighter.gifted;
  rec.gender = fighter.gender;
  rec.team = fighter.team;
  rec.seated = seated;
  rec.queued = queued;
  if (seated || queued) rec.lastSeenAt = eventStamp(world);
  world.viewerState.set(id, rec);
}

export function shouldCarryOver(world, uniqueId) {
  if (!world || !uniqueId) return false;
  const rec = world.viewerState?.get(uniqueId);
  if (!rec) return false;
  if (rec.seated || rec.queued) return true;
  const now = eventStamp(world);
  const windowMs = CONFIG.fair?.carryWindowMs ?? 120000;
  if (rec.lastEventAt && now - rec.lastEventAt <= windowMs) return true;
  const started = world.roundStartedAt || 0;
  if (rec.lastEventAt && rec.lastEventAt >= started) return true;
  return false;
}

export function applyPresenceToFighter(world, fighter) {
  if (!fighter) return false;
  const id = fighter.id;
  const rec = world.viewerState?.get(id);
  const carry = shouldCarryOver(world, id);
  if (carry && rec && ((rec.coins || 0) > 0 || rec.weapon === "sword" || (rec.maxHp || 0) > CONFIG.combat.baseHp)) {
    fighter.coins = rec.coins || 0;
    fighter.maxHp = Math.max(CONFIG.combat.baseHp, rec.maxHp || CONFIG.combat.baseHp);
    fighter.hp = fighter.maxHp;
    fighter.weapon = rec.weapon || "gloves";
    fighter.swordTier = rec.swordTier || 0;
    fighter.gifted = !!rec.gifted;
    fighter.hpCarried = true;
    fighter.carryBadgeT = 240;
    return true;
  }
  // Inactive or no gift history — start this round even, gloves on.
  fighter.coins = 0;
  fighter.maxHp = CONFIG.combat.baseHp;
  fighter.hp = CONFIG.combat.baseHp;
  fighter.weapon = "gloves";
  fighter.swordTier = 0;
  fighter.gifted = false;
  fighter.hpCarried = false;
  fighter.carryBadgeT = 0;
  return false;
}

export function markRoundPresence(world) {
  if (!world.viewerState) world.viewerState = new Map();
  for (const rec of world.viewerState.values()) {
    rec.seated = false;
    rec.queued = false;
  }
  for (const f of world.fighters || []) {
    if (f.dead && f.state !== "ko") continue;
    snapshotViewer(world, f, { seated: true, queued: false });
  }
  for (const s of world.queue || []) {
    const rec = world.viewerState.get(s.uniqueId) || emptyRecord(s.uniqueId);
    rec.nickname = s.nickname;
    rec.coins = s.coins || rec.coins || 0;
    rec.queued = true;
    rec.seated = false;
    rec.lastSeenAt = eventStamp(world);
    world.viewerState.set(s.uniqueId, rec);
  }
}

export function computeAwards(roster, winner) {
  const alive = roster.filter((f) => !f.dead && f.state !== "ko" && (f.hp || 0) > 0);
  const byKos = roster.slice().sort((a, b) => (b.kos || 0) - (a.kos || 0) || (b.damageDealt || 0) - (a.damageDealt || 0));
  const byBlocks = roster.slice().sort((a, b) => (b.blocks || 0) - (a.blocks || 0));
  const byComeback = roster.slice().sort((a, b) => (b.comebacks || 0) - (a.comebacks || 0) || (b.kos || 0) - (a.kos || 0));
  const bySurvive = alive.slice().sort((a, b) => (b.hp || 0) - (a.hp || 0) || (b.kos || 0) - (a.kos || 0));
  const pick = (list, pred) => list.find(pred) || null;
  return {
    winner: winner?.mvp || bySurvive[0] || byKos[0] || null,
    mostKos: pick(byKos, (f) => (f.kos || 0) > 0),
    bestComeback: pick(byComeback, (f) => (f.comebacks || 0) > 0),
    ironWall: pick(byBlocks, (f) => (f.blocks || 0) > 0),
    survivor: bySurvive[0] || null,
  };
}

function emptyRecord(id) {
  return {
    id,
    coins: 0,
    maxHp: CONFIG.combat.baseHp,
    hp: CONFIG.combat.baseHp,
    weapon: "gloves",
    swordTier: 0,
    gifted: false,
    lastEventAt: 0,
    seated: false,
    queued: false,
  };
}

function eventStamp(world) {
  if (world?.simClock) return (world.tickId || 0) * (1000 / 60);
  return performance.now();
}
