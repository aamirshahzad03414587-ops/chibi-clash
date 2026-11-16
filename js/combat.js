import { CONFIG } from "./config.js";

export const MOVES = CONFIG.moves;

export const STATE = {
  IDLE: "idle",
  WALK: "walk",
  WINDUP: "windup",
  ACTIVE: "active",
  RECOVER: "recover",
  HURT: "hurt",
  BLOCK: "block",
  DODGE: "dodge",
  DASH: "dash",
  KO: "ko",
  ENTER: "enter",
  CELEBRATE: "celebrate",
};

const ATTACKS = new Set([
  "jab", "cross", "hook", "uppercut", "heavy", "flick", "gutPunch", "charge",
  "sideKick", "kick", "sweep", "roundhouse", "hookKick", "doubleKick", "axeKick",
  "slash", "slashOver", "slashHoriz", "thrust", "spin", "special",
]);

const KICKS = new Set([
  "sideKick", "kick", "sweep", "roundhouse", "hookKick", "doubleKick", "axeKick",
]);

const SWORD_FROM_GLOVE = {
  jab: "slash",
  cross: "slash",
  hook: "slash",
  uppercut: "spin",
  heavy: "slash",
};

const GLOVE_FROM_SWORD = {
  slash: "hook",
  thrust: "cross",
  spin: "uppercut",
  special: "uppercut",
};

export function isSword(fighter) {
  return fighter?.weapon === "sword";
}

export function resolveMove(fighter, name) {
  if (!name) return isSword(fighter) ? "slash" : "jab";
  if (name === "block" || name === "dodge" || name === "dash" || name === "charge") return name;
  if (KICKS.has(name) || name === "gutPunch" || name === "flick") return name;
  if (name === "slashOver" || name === "slashHoriz") return "slash";
  if (name === "heavy") return isSword(fighter) ? "slash" : "hook";
  if (isSword(fighter) && SWORD_FROM_GLOVE[name]) return SWORD_FROM_GLOVE[name];
  if (!isSword(fighter) && GLOVE_FROM_SWORD[name]) return GLOVE_FROM_SWORD[name];
  return name;
}

export function isAttackMove(name) {
  return ATTACKS.has(name);
}

export function moveData(name) {
  return MOVES[name] || MOVES.jab;
}

export function preferredRange(fighter) {
  if (isSword(fighter)) return (MOVES.slash.range + MOVES.thrust.range) * 0.38;
  return MOVES.jab.range * 0.85;
}

export function canAct(fighter) {
  return (
    fighter.state === STATE.IDLE ||
    fighter.state === STATE.WALK ||
    fighter.state === STATE.BLOCK
  );
}

export function inCancelWindow(fighter) {
  if (fighter.state !== STATE.RECOVER) return false;
  const move = moveData(fighter.move);
  if (!move.cancelWindow) return false;
  return fighter.stateTime <= move.cancelWindow && fighter.comboHit;
}

export function beginMove(fighter, name) {
  const resolved = resolveMove(fighter, name);
  const move = moveData(resolved);
  fighter.state = STATE.WINDUP;
  fighter.move = resolved;
  fighter.stateTime = 0;
  let start = move.startup;
  if (!isSword(fighter)) {
    let s = CONFIG.fair?.gloveStartupScale ?? 0.82;
    if ((fighter.speedBuffT || 0) > 0) s *= 0.88;
    start = Math.max(12, Math.round(start * s));
  }
  fighter.stateDur = start;
  fighter.comboHit = false;
  fighter.hitConnected = false;
  fighter.attackHandled = false;
  fighter.anticipating = true;
}

export function beginDodge(fighter, dir) {
  const d = MOVES.dodge;
  fighter.state = STATE.DODGE;
  fighter.move = "dodge";
  fighter.stateTime = 0;
  fighter.stateDur = d.frames;
  fighter.dodgeDir = dir || -fighter.facing;
  fighter.invuln = true;
}

export function beginDash(fighter) {
  const d = MOVES.dash;
  fighter.state = STATE.DASH;
  fighter.move = "dash";
  fighter.stateTime = 0;
  fighter.stateDur = d.frames;
}

export function beginBlock(fighter) {
  fighter.state = STATE.BLOCK;
  fighter.move = "block";
  fighter.stateTime = 0;
  fighter.stateDur = isSword(fighter) ? 22 : 18;
  fighter.parryUntil = isSword(fighter) ? MOVES.swordParryWindow : MOVES.parryWindow;
}

export function beginHurt(fighter, hitstun, fromX, style = "head") {
  fighter.state = STATE.HURT;
  fighter.move = "hurt";
  fighter.stateTime = 0;
  fighter.stateDur = Math.max(18, hitstun || 22);
  fighter.comboHit = false;
  fighter.reactStyle = style || "head";
  fighter.foldHit = style === "fold" || style === "gut" || fighter.foldHit;
  fighter.hitsTakenStreak = (fighter.hitsTakenStreak || 0) + 1;
  if (fromX != null) fighter.facing = fromX < fighter.x ? -1 : 1;
}

export function beginKo(fighter, fromX) {
  fighter.state = STATE.KO;
  fighter.move = "ko";
  fighter.stateTime = 0;
  fighter.stateDur = 180;
  fighter.hp = 0;
  fighter.invuln = true;
  fighter.spin = 0;
  if (fromX != null) fighter.facing = fromX < fighter.x ? -1 : 1;
}

export function tickAttackPhases(fighter) {
  if (fighter.state === STATE.WINDUP && fighter.stateTime >= fighter.stateDur) {
    const move = moveData(fighter.move);
    fighter.state = STATE.ACTIVE;
    fighter.stateTime = 0;
    fighter.stateDur = move.active;
    fighter.attackHandled = false;
    fighter.anticipating = false;
    return "impact";
  }
  if (fighter.state === STATE.ACTIVE && fighter.stateTime >= fighter.stateDur) {
    const move = moveData(fighter.move);
    fighter.state = STATE.RECOVER;
    fighter.stateTime = 0;
    fighter.stateDur = move.recovery;
    return "recover";
  }
  if (fighter.state === STATE.RECOVER && fighter.stateTime >= fighter.stateDur) {
    fighter.state = STATE.IDLE;
    fighter.move = null;
    fighter.comboHit = false;
    return "idle";
  }
  return null;
}

export function isInvulnerable(fighter) {
  if (fighter.invuln && fighter.state === STATE.DODGE) {
    const d = MOVES.dodge;
    return fighter.stateTime >= d.invulnStart && fighter.stateTime < d.invulnEnd;
  }
  if (fighter.state === STATE.KO || fighter.state === STATE.ENTER) return true;
  return false;
}

export function inRange(a, b, range) {
  const dx = a.x - b.x;
  const dy = (a.y - b.y) * 0.7;
  return Math.hypot(dx, dy) <= range + a.radius + b.radius * 0.15;
}

export function facingToward(a, b) {
  return (b.x - a.x) * a.facing > 0;
}

export function hitStrength(moveName) {
  if (moveName === "special" || moveName === "spin" || moveName === "uppercut" || moveName === "gutPunch" || moveName === "axeKick") return "special";
  if (
    moveName === "heavy" ||
    moveName === "hook" ||
    moveName === "slash" ||
    moveName === "slashOver" ||
    moveName === "thrust" ||
    moveName === "cross" ||
    moveName === "roundhouse" ||
    moveName === "hookKick" ||
    moveName === "sideKick" ||
    moveName === "doubleKick"
  ) {
    return "heavy";
  }
  return "light";
}

export function isKick(name) {
  return KICKS.has(name);
}

export function isLaunchMove(name) {
  const m = moveData(name);
  return !!(m && m.launch) || name === "gutPunch" || name === "uppercut" || name === "axeKick";
}

