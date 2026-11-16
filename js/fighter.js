import { ARENA, CONFIG, formatHp } from "./config.js";
import {
  STATE,
  MOVES,
  beginMove,
  beginDodge,
  beginDash,
  beginBlock,
  canAct,
  inCancelWindow,
  tickAttackPhases,
  isInvulnerable,
  inRange,
  moveData,
  resolveMove,
  isSword,
  preferredRange,
  isAttackMove,
} from "./combat.js";
import { drawFighter as drawFighterArt } from "./art.js";
import { advanceClip } from "./frames.js";
import { assignSprite } from "./sprites.js";

const SKINS = ["#ffe0bd", "#f6c89a", "#e8b889", "#e0a070", "#c68642", "#8d5524", "#ffd5c8", "#d9a066", "#f3d1b0", "#b5703a"];
const HAIR_F = ["#2b1a12", "#5a3214", "#c44b1a", "#efc56a", "#1f1a18", "#d45d79", "#6b3fa0", "#f4c2c2", "#2c4c8c", "#7a1f4a", "#c0c5d4", "#3a2a6e"];
const HAIR_M = ["#1c1410", "#3a2310", "#6a3a14", "#d9b25f", "#111114", "#2a2a2a", "#4a2a10", "#24324a", "#5c2e16", "#c0c5d4"];
const BLAZERS = ["#2d3a6e", "#7a1f3a", "#2f5d4a", "#3a2a4a", "#1f2a3a", "#6b3a2a", "#3a4a8c", "#5a2a4a", "#245c6e", "#4a3a2a"];
const EYES_F = ["#5b3cff", "#2a8cff", "#2e9e6b", "#c45c1a", "#7a3a9a", "#d4488a", "#3a6ea5", "#c44b8a"];
const EYES_M = ["#3a4a8c", "#2a6a4a", "#6a3a14", "#2a4a6e", "#5a3a8a", "#1f4f7a", "#3a3a3a"];
const GLOVES = ["#ff5b8a", "#3db8ff", "#ff6b4a", "#f0c14a", "#c9a0ff", "#34d399"];

let nextLocalId = 1;

export function createFighter({
  uniqueId,
  nickname,
  gender,
  team,
  gifted = false,
  hpBonus = 0,
}) {
  const side = team === "sky" ? 1 : -1;
  const mid = ARENA.centerX;
  const inward = 120 + Math.random() * 280;
  const x = team === "sky" ? mid + inward : mid - inward;
  const y = ARENA.groundTop + 40 + Math.random() * (ARENA.groundBottom - ARENA.groundTop - 80);

  const palette = buildPalette(gender, uniqueId, team);
  const maxHp = CONFIG.combat.baseHp + hpBonus;
  const fighter = {
    id: uniqueId || `bot-${nextLocalId++}`,
    nickname: nickname || "Fighter",
    gender,
    team,
    palette,
    x,
    y,
    vx: 0,
    vy: 0,
    facing: -side,
    radius: 32,
    scale: 1,
    hp: maxHp,
    maxHp,
    coins: 0,
    kos: 0,
    gifted: Boolean(gifted),
    aura: false,
    crown: false,
    specialCharges: gifted ? 1 : 0,
    state: STATE.ENTER,
    move: null,
    stateTime: 0,
    stateDur: 22,
    hitstop: 0,
    flash: 0,
    comboHit: false,
    comboCount: 0,
    invuln: true,
    knock: 0,
    knockY: 0,
    aiClock: Math.floor(Math.random() * 40),
    aiBias: Math.random(),
    lastAction: 0,
    walkPhase: Math.random() * Math.PI * 2,
    bob: 0,
    spin: 0,
    stars: 0,
    enterT: 0,
    dead: false,
    celebrate: false,
    wantMove: null,
    parryUntil: 0,
    attackHandled: false,
    anticipating: false,
    look: pickLook(gender, uniqueId),
    spriteKey: null,
    spriteHue: 0,
    weapon: "gloves",
    swordTier: 0,
    upgradeT: 0,
    comboPlan: [],
    intent: "approach",
    airborne: false,
    groundY: y,
    foldHit: false,
    auraT: 0,
    afterimageT: 0,
    afterBuf: [],
    smearBuf: [],
    animTime: 0,
    scripted: false,
    dodgeStyle: "duck",
    breakTimer: 0,
    circleTimer: 0,
    joinedAt: performance.now(),
    damageDealt: 0,
    blocks: 0,
    comebacks: 0,
    hitsTakenStreak: 0,
    comebackT: 0,
    speedBuffT: 0,
    hpCarried: false,
    carryBadgeT: 0,
    lastEventAt: 0,
    reactStyle: "head",
    koedBy: null,
  };
  refreshPower(fighter);
  assignSprite(fighter);
  return fighter;
}

function hashStr(s) {
  let h = 2166136261;
  const str = String(s || "");
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick(arr, h, salt) {
  return arr[(h + salt) % arr.length];
}

function buildPalette(gender, id, team) {
  const h = hashStr(id + gender);
  const teamCol = CONFIG.teams[team]?.color || "#fff";
  const outfit = pick(BLAZERS, h, 11);
  return {
    skin: pick(SKINS, h, 3),
    hair: pick(gender === "male" ? HAIR_M : HAIR_F, h, 7),
    eye: pick(gender === "female" ? EYES_F : EYES_M, h, 23),
    outfit,
    outfit2: shadeHex(outfit, -24),
    skirt: pick(["#3a2a4a", "#2d3a6e", "#7a1f3a", "#4a3040", "#1f2a3a"], h, 29),
    shirt: pick(["#f6f3ee", "#fff8f0", "#eef2ff"], h, 5),
    sock: "#f4f0ea",
    tie: teamCol,
    glove: pick(GLOVES, h, 31),
    accent: teamCol,
    shoes: gender === "female" ? pick(["#2a1c18", "#7c3aed", "#5a2030", "#1e293b"], h, 13) : pick(["#2a221c", "#1e293b", "#3f2a1a", "#111827"], h, 17),
    outline: "#2a1a14",
  };
}

function pickLook(gender, id) {
  const h = hashStr(id + "look");
  if (gender === "female") {
    return {
      hair: ["ponytail", "bob", "twintails", "long"][h % 4],
      outfit: "blazer",
      lash: true,
      bow: h % 3 === 0,
    };
  }
  if (gender === "male") {
    return {
      hair: ["short", "spiky", "crop", "undercut"][h % 4],
      outfit: ["blazer", "hoodie", "blazer", "blazer"][h % 4],
      lash: false,
      bow: false,
    };
  }
  return {
    hair: ["short", "bob", "spiky"][h % 3],
    outfit: "blazer",
    lash: h % 2 === 0,
    bow: false,
  };
}

export function applyGift(fighter, diamonds) {
  const coins = Math.max(0, Math.round(Number(diamonds) || 0));
  if (coins <= 0) {
    refreshPower(fighter);
    return { upgraded: false };
  }
  // 1 coin = +30 HP, no cap — health keeps growing with gifts.
  const bonus = coins * CONFIG.combat.hpPerCoin;
  fighter.coins = (fighter.coins || 0) + coins;
  fighter.maxHp += bonus;
  fighter.hp += bonus;
  if (coins >= CONFIG.combat.specialDiamondThreshold) {
    fighter.specialCharges += 1;
  }
  if (coins >= CONFIG.combat.bigGiftDiamonds) {
    fighter.specialCharges += 2;
  }
  // Any gift upgrades gloves to a shiny sword.
  const upgraded = equipSword(fighter);
  fighter.gifted = true;
  refreshPower(fighter);
  return { upgraded };
}

export function equipSword(fighter) {
  const first = fighter.weapon !== "sword";
  fighter.weapon = "sword";
  if (first) fighter.upgradeT = 48;
  refreshSwordTier(fighter);
  return first;
}

export function refreshSwordTier(fighter) {
  const coins = fighter.coins || 0;
  if (fighter.weapon !== "sword") {
    fighter.swordTier = 0;
    return;
  }
  if (coins >= CONFIG.combat.bigGiftDiamonds) fighter.swordTier = 3;
  else if (coins >= CONFIG.combat.crownCoins) fighter.swordTier = 2;
  else fighter.swordTier = 1;
}

/** Scale, glow, and crown grow with stacked HP/coins, with a size cap. */
export function refreshPower(fighter) {
  const extra = Math.max(0, (fighter.maxHp || 0) - CONFIG.combat.baseHp);
  const coins = fighter.coins || Math.round(extra / Math.max(1, CONFIG.combat.hpPerCoin));
  fighter.coins = fighter.coins || coins;
  // Size barely grows with HP — glow and crown carry the “stacked gift” read.
  const cap = CONFIG.combat.maxScale ?? 1.08;
  fighter.scale = Math.min(cap, 1 + Math.min(0.08, extra / 4000));
  fighter.aura = coins >= CONFIG.combat.glowCoins || extra >= CONFIG.combat.glowCoins * CONFIG.combat.hpPerCoin;
  fighter.crown = coins >= CONFIG.combat.crownCoins || extra >= CONFIG.combat.crownCoins * CONFIG.combat.hpPerCoin;
  if (coins > 0) {
    fighter.weapon = "sword";
    fighter.gifted = true;
  }
  refreshSwordTier(fighter);
}


export function retargetFacing(fighter, enemy) {
  if (!enemy) return;
  if (fighter.state === STATE.KO || fighter.state === STATE.HURT) return;
  if (fighter.state === STATE.WINDUP || fighter.state === STATE.ACTIVE || fighter.state === STATE.RECOVER) return;
  fighter.facing = enemy.x >= fighter.x ? 1 : -1;
}

export function nearestEnemy(fighter, list) {
  const enemies = list.filter(
    (other) => other !== fighter && !other.dead && other.state !== STATE.KO && other.team !== fighter.team
  );
  if (!enemies.length) return null;
  const myRow = rowOf(fighter, list);
  const sameRow = enemies.filter((e) => rowOf(e, list) === myRow);
  const pool = sameRow.length ? sameRow : enemies;
  // Pair by lane (similar depth) so the crowd fights as several readable duels
  // instead of collapsing onto the single closest body.
  let best = null;
  let bestD = Infinity;
  for (const other of pool) {
    const d = Math.abs(other.y - fighter.y) * 1.7 + Math.abs(other.x - fighter.x) * 0.35;
    if (d < bestD) {
      bestD = d;
      best = other;
    }
  }
  return best;
}

// Per team: 5 featured up front, 5 in mid, the rest in the back row.
// All three rows fight — the front is just closer and easier to read.
// 5 depth rows of 3 lanes per team = 15, so all 30 stay readable
// on the tall stage (front row is closest / featured).
const LANES = 3;
const ROWS = 5;

function livingTeam(fighter, list) {
  return list
    .filter((f) => f.team === fighter.team && !f.dead && f.state !== STATE.KO)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

export function rowOf(fighter, list) {
  const team = livingTeam(fighter, list);
  const i = Math.max(0, team.indexOf(fighter));
  return Math.floor(i / LANES);
}

export function isOnFrontLine(fighter, list) {
  return rowOf(fighter, list) === 0;
}

const SLOT_COL_X = [240, 540, 840];
const SLOT_SEP = 88;

export function homeY(fighter, list) {
  if (fighter.slot) {
    return 1340 - fighter.slot.row * 248;
  }
  const team = livingTeam(fighter, list);
  const i = Math.max(0, team.indexOf(fighter));
  const row = Math.floor(i / LANES);
  const rowsUsed = Math.max(1, Math.ceil(Math.max(1, team.length) / LANES));
  const span = ARENA.groundBottom - ARENA.groundTop - 70;
  const t = rowsUsed <= 1 ? 0.88 : 0.94 - (row / Math.max(1, rowsUsed - 1)) * 0.86;
  return ARENA.groundTop + 30 + t * span;
}

export function homeX(fighter, list) {
  if (fighter.slot) {
    const mid = SLOT_COL_X[fighter.slot.lane] + ((fighter.slot.row % 2) ? 36 : 0);
    const side = fighter.team === "sky" ? 1 : -1;
    return mid + side * SLOT_SEP;
  }
  const side = fighter.team === "sky" ? 1 : -1;
  const team = livingTeam(fighter, list);
  const i = Math.max(0, team.indexOf(fighter));
  const lane = i % LANES;
  const half = Math.abs(ARENA.centerX - (side < 0 ? ARENA.leftMin : ARENA.rightMax));
  const inner = ARENA.mode === "portrait" ? 64 : 80;
  const outer = Math.max(inner + 40, Math.min(half - 32, ARENA.mode === "portrait" ? 220 : 400));
  const dist = inner + (lane / Math.max(1, LANES - 1)) * (outer - inner);
  return ARENA.centerX + side * dist;
}

export function tickFighter(fighter, world) {
  if (fighter.upgradeT > 0) fighter.upgradeT -= 1;
  if (fighter.auraT > 0) fighter.auraT -= 1;
  if (fighter.afterimageT > 0) fighter.afterimageT -= 1;
  if (fighter.comebackT > 0) fighter.comebackT -= 1;
  if (fighter.speedBuffT > 0) fighter.speedBuffT -= 1;
  if (fighter.carryBadgeT > 0) fighter.carryBadgeT -= 1;
  if (fighter.blockRecoil > 0) fighter.blockRecoil -= 1;

  // Airborne launch / tumble / bounce.
  if (fighter.airborne && fighter.hitstop <= 0) {
    fighter.vy = (fighter.vy || 0) + 0.48;
    fighter.y += fighter.vy;
    fighter.x += fighter.vx || 0;
    fighter.vx = (fighter.vx || 0) * 0.99;
    const floor = fighter.groundY != null ? fighter.groundY : fighter.y;
    if (fighter.y >= floor) {
      fighter.y = floor;
      if (fighter.vy > 3 && fighter.state === "ko") {
        fighter.vy *= -0.45;
        fighter.vx *= 0.7;
        world.spawnDustDome?.(fighter.x, fighter.y, 0.7);
        world.addShake?.(1.6, 6);
      } else {
        fighter.airborne = false;
        fighter.vy = 0;
        if (fighter.state === "ko") {
          fighter.move = "ko";
        } else if (fighter.hp > 0 && fighter.state !== "ko") {
          // Stay in hurt briefly, then they can get up.
          fighter.vx *= 0.4;
        }
      }
    }
  } else if (Math.abs(fighter.vx || 0) > 0.3 && fighter.state === "hurt") {
    // Slide on the feet — also kicked along in the grounded integrator below.
    if (world && (fighter.stateTime % 3 === 0)) world.spawnDustDome?.(fighter.x, fighter.y, 0.35);
  }

  if (fighter.hitstop > 0) {
    fighter.hitstop -= 1;
    if (fighter.flash > 0) fighter.flash -= 1;
    return;
  }

  fighter.stateTime += 1;
  fighter.animTime = (fighter.animTime || 0) + 1;
  advanceClip(fighter);
  if (fighter.flash > 0) fighter.flash -= 1;
  if (fighter.parryUntil > 0) fighter.parryUntil -= 1;
  if (fighter.breakTimer > 0) fighter.breakTimer -= 1;
  if (fighter.circleTimer > 0) fighter.circleTimer -= 1;

  // Airborne flight is integrated above. On the ground, only slide sideways
  // (don't re-apply or damp vertical velocity, which was killing launches).
  if (!fighter.airborne) {
    fighter.x += fighter.vx || 0;
    if (fighter.state !== "dash") {
      fighter.vx = (fighter.vx || 0) * 0.88;
      if (Math.abs(fighter.vx) < 0.12) fighter.vx = 0;
    }
    fighter.vy = 0;
  }
  if (fighter.knock) {
    fighter.x += fighter.knock;
    fighter.knock *= 0.78;
    if (Math.abs(fighter.knock) < 0.15) fighter.knock = 0;
  }

  clampToArena(fighter);

  if (fighter.state === STATE.ENTER) {
    fighter.enterT = Math.min(1, fighter.stateTime / Math.max(1, fighter.stateDur));
    const tx = homeX(fighter, world.fighters);
    const ty = homeY(fighter, world.fighters);
    if (fighter.enterFrom) {
      const u = fighter.enterT;
      const e = 1 - Math.pow(1 - u, 2);
      fighter.x = fighter.enterFrom.x + (tx - fighter.enterFrom.x) * e;
      fighter.y = fighter.enterFrom.y + (ty - fighter.enterFrom.y) * e;
    } else {
      fighter.x += (tx - fighter.x) * 0.18;
      fighter.y += (ty - fighter.y) * 0.18;
    }
    fighter.groundY = ty;
    fighter.facing = fighter.team === "rose" ? 1 : -1;
    if (fighter.stateTime >= fighter.stateDur) {
      fighter.state = STATE.IDLE;
      fighter.invuln = false;
      fighter.x = tx;
      fighter.y = ty;
    }
    return;
  }

  if (fighter.state === STATE.KO) {
    fighter.spin += 0.45;
    fighter.stars = Math.min(1, fighter.stateTime / 10);
    if (fighter.stateTime > 40) fighter.spin *= 0.92;
    const away = fighter.team === "sky" ? 1 : -1;
    fighter.x += away * 1.15;
    clampToArena(fighter);
    if (fighter.stateTime > 160) fighter.dead = true;
    return;
  }

  if (fighter.state === STATE.CELEBRATE) {
    fighter.bob = Math.sin(fighter.stateTime * 0.25) * 5;
    return;
  }

  if (fighter.state === STATE.HURT) {
    // Stagger / slide on the feet while the hit still reads.
    if (!fighter.airborne && Math.abs(fighter.vx || 0) > 0.2) {
      fighter.x += fighter.vx;
      fighter.vx *= 0.86;
    }
    if (fighter.stateTime >= fighter.stateDur) {
      fighter.state = STATE.IDLE;
      fighter.move = null;
      fighter.foldHit = false;
      fighter.reactStyle = "head";
      fighter.vx = 0;
    }
    return;
  }

  if (fighter.state === "getup" || fighter.state === "knee") {
    if (fighter.stateTime >= fighter.stateDur) {
      fighter.state = STATE.IDLE;
      fighter.move = null;
    }
    return;
  }

  if (fighter.state === STATE.DODGE) {
    const d = MOVES.dodge;
    const t = fighter.stateTime / d.frames;
    const step = (d.distance / d.frames) * Math.sin(t * Math.PI);
    fighter.x += fighter.dodgeDir * step;
    fighter.y += Math.sin(t * Math.PI * 2) * 0.4;
    fighter.invuln = isInvulnerable(fighter);
    if (fighter.stateTime >= d.frames) {
      fighter.state = STATE.IDLE;
      fighter.invuln = false;
    }
    clampToArena(fighter);
    return;
  }

  if (fighter.state === STATE.DASH) {
    const d = MOVES.dash;
    const t = fighter.stateTime / Math.max(1, fighter.stateDur || d.frames);
    const dist = fighter.move === "charge" ? (d.distance || 108) * 1.35 : d.distance;
    fighter.x += (fighter.vx || fighter.facing * (dist / Math.max(1, fighter.stateDur || d.frames))) * (fighter.move === "charge" ? 1 : (1 - t * 0.35));
    if (fighter.move !== "charge") fighter.x += fighter.facing * (dist / d.frames) * (1 - t * 0.35);
    if (fighter.stateTime >= (fighter.stateDur || d.frames)) {
      fighter.state = STATE.IDLE;
      fighter.vx = 0;
    }
    const mate = fighter.pairMate;
    if (mate && !mate.dead && Math.abs(fighter.x - mate.x) < 88) {
      const mid = (fighter.x + mate.x) / 2;
      const dir = fighter.x <= mate.x ? -1 : 1;
      fighter.x = mid + dir * 44;
      fighter.vx = 0;
    }
    clampToArena(fighter);
    return;
  }

  if (fighter.state === STATE.BLOCK) {
    if (fighter.stateTime >= fighter.stateDur) {
      fighter.state = STATE.IDLE;
      fighter.move = null;
    }
    return;
  }

  if (fighter.state === STATE.WINDUP || fighter.state === STATE.ACTIVE || fighter.state === STATE.RECOVER) {
    tickAttackPhases(fighter);
    // A little forward footwork on the active frames (lunge / thrust).
    if (fighter.state === STATE.ACTIVE) {
      const lunge = moveData(fighter.move).lunge || 1.2;
      fighter.x += fighter.facing * lunge;
      clampToArena(fighter);
    }
    // Continue a planned combo in the cancel window.
    if (inCancelWindow(fighter)) {
      const next = fighter.wantMove || (fighter.comboPlan && fighter.comboPlan[0]);
      if (next) {
        if (fighter.comboPlan && fighter.comboPlan[0] === next) fighter.comboPlan.shift();
        fighter.wantMove = fighter.comboPlan && fighter.comboPlan[0] ? fighter.comboPlan[0] : null;
        beginMove(fighter, next);
      }
    }
    return;
  }

  // Idle / walk — AI footwork and action choice.
  think(fighter, world);
}

function clampToArena(fighter) {
  const pad = 50;
  fighter.x = Math.max(ARENA.leftMin - 40, Math.min(ARENA.rightMax + 40, fighter.x));
  fighter.y = Math.max(ARENA.groundTop + pad, Math.min(ARENA.groundBottom - 10, fighter.y));
}

function think(fighter, world) {
  if (fighter.demoLock || fighter.scripted) {
    fighter.walkPhase += 0.22;
    fighter.bob = Math.sin(fighter.walkPhase) * 1.4;
    if (fighter.scripted && fighter.state === "dash") {
      // keep charge momentum
      return;
    }
    if (fighter.demoLock) {
      fighter.vx = 0;
      if (!fighter.airborne) fighter.vy = 0;
    }
    return;
  }
  const enemy = nearestEnemy(fighter, world.fighters);
  retargetFacing(fighter, enemy);
  fighter.aiClock -= 1;
  fighter.walkPhase += 0.22;

  const tx = homeX(fighter, world.fighters);
  const ty = homeY(fighter, world.fighters);
  // Keep a loose row, but let duels circle instead of snapping still.
  fighter.y += (ty - fighter.y) * 0.07;

  if (!enemy) {
    fighter.x += (tx - fighter.x) * 0.08;
    fighter.state = Math.abs(tx - fighter.x) > 14 ? STATE.WALK : STATE.IDLE;
    fighter.bob = Math.sin(fighter.walkPhase) * 1.4;
    fighter.facing = fighter.team === "sky" ? -1 : 1;
    fighter.intent = "approach";
    separate(fighter, world.fighters);
    return;
  }

  const dist = Math.hypot(enemy.x - fighter.x, (enemy.y - fighter.y) * 0.75);
  const incoming = isTelegraphed(enemy) && inRange(enemy, fighter, moveData(enemy.move).range + 20);
  const sword = isSword(fighter);
  const foeSword = isSword(enemy);
  const preferred = preferredRange(fighter);

  // Defense first when a wind-up is readable.
  if (incoming && canAct(fighter) && fighter.aiClock <= 0) {
    const roll = hashish(fighter, world.tickId);
    const heavyIn = ["hook", "uppercut", "slash", "thrust", "spin", "special", "heavy"].includes(enemy.move);
    if (sword && (heavyIn || roll < 0.45)) {
      if (roll < 0.55) {
        beginBlock(fighter); // parry stance, then riposte
        scheduleAi(fighter, 18);
        return;
      }
    }
    if (!sword && foeSword) {
      // Dodge inside a sword's reach.
      if (roll < 0.55) {
        beginDodge(fighter, Math.sign(enemy.x - fighter.x) || fighter.facing);
        world.sfx.dodge();
        fighter.intent = "exchange";
        scheduleAi(fighter, 8);
        return;
      }
    }
    if (heavyIn) {
      if (roll < 0.38) {
        beginDodge(fighter, enemy.x < fighter.x ? 1 : -1);
        world.sfx.dodge();
        return;
      }
      if (roll < 0.78) {
        beginBlock(fighter);
        return;
      }
    } else if (roll < 0.32) {
      beginBlock(fighter);
      return;
    }
  }

  if (inCancelWindow(fighter) && fighter.wantMove) {
    beginMove(fighter, fighter.wantMove);
    fighter.wantMove = null;
    return;
  }

  if (!canAct(fighter)) return;

  const busy = world.fighters.filter(
    (f) => f.state === STATE.WINDUP || f.state === STATE.ACTIVE
  ).length;

  const dx = enemy.x - fighter.x;
  const side = Math.sign(dx) || fighter.facing;
  const towardLane = (ty - fighter.y) * 0.14;

  // Stay loosely near the row's home X so the midfield does not collapse.
  fighter.x += (tx - fighter.x) * 0.03;

  // Footwork: approach, circle, exchange, break apart.
  if (!fighter.intent) fighter.intent = "approach";
  if (fighter.intent === "break" || fighter.breakTimer > 0) {
    fighter.intent = "break";
    fighter.state = STATE.WALK;
    fighter.x -= side * CONFIG.combat.walkSpeed * 0.95;
    fighter.y += towardLane + Math.sin(fighter.walkPhase * 0.5) * 0.5;
    if (fighter.breakTimer <= 0 && dist > preferred + 10) {
      fighter.intent = "circle";
      fighter.circleTimer = 28 + Math.floor(fighter.aiBias * 30);
    }
  } else if (dist > preferred + 22) {
    fighter.intent = "approach";
    fighter.state = STATE.WALK;
    fighter.x += side * CONFIG.combat.walkSpeed * (sword ? 1.05 : foeSword ? 1.2 : 1);
    fighter.y += towardLane + Math.sign(enemy.y - fighter.y) * 0.15;
    if (dist > 260 && fighter.aiClock <= 0 && Math.random() < 0.16) {
      beginDash(fighter);
      world.sfx.dash();
      scheduleAi(fighter, 20);
      return;
    }
  } else if (dist < preferred - (sword ? 28 : 16)) {
    // Sword users step out; glove users may stay inside a blade's reach.
    if (sword || !foeSword) {
      fighter.state = STATE.WALK;
      fighter.x -= side * CONFIG.combat.walkSpeed * 0.85;
      fighter.y += towardLane;
    } else {
      fighter.intent = "exchange";
      fighter.state = STATE.IDLE;
    }
  } else if (fighter.intent === "circle" || fighter.circleTimer > 0) {
    fighter.intent = "circle";
    fighter.state = STATE.WALK;
    const orbit = Math.sin(fighter.walkPhase * 0.35 + fighter.aiBias * 6);
    fighter.y += towardLane + orbit * 0.85;
    fighter.x += (preferred - dist) * 0.08 * side * -0.15;
    fighter.bob = Math.sin(fighter.walkPhase) * 1.4;
    if (fighter.circleTimer <= 0) fighter.intent = "exchange";
  } else {
    fighter.state = STATE.IDLE;
    fighter.bob = Math.sin(fighter.walkPhase) * 1.6;
    fighter.y += towardLane + Math.sin(fighter.walkPhase * 0.35 + fighter.aiBias * 6) * 0.25;
  }

  separate(fighter, world.fighters);

  if (fighter.aiClock > 0) return;
  if (busy >= CONFIG.combat.maxConcurrentAttacks) {
    if (fighter.intent === "exchange") {
      fighter.intent = "circle";
      fighter.circleTimer = 16;
    }
    scheduleAi(fighter, 8 + Math.floor(fighter.aiBias * 16));
    return;
  }

  const canSpecial =
    sword &&
    (fighter.specialCharges > 0 || fighter.hp >= fighter.maxHp * 0.85 || fighter.gifted) &&
    dist <= MOVES.special.range + 8;

  if (canSpecial && dist <= MOVES.special.range && Math.random() < 0.18) {
    if (fighter.specialCharges > 0) fighter.specialCharges -= 1;
    beginMove(fighter, "special");
    world.sfx.special();
    fighter.intent = "break";
    fighter.breakTimer = 36;
    scheduleAi(fighter, 30);
    return;
  }

  const inBox = dist <= (sword ? MOVES.slash.range + 10 : MOVES.jab.range + 8);
  const inThrust = sword && dist <= MOVES.thrust.range + 6;

  if (inBox || inThrust) {
    startCombo(fighter, world, { inThrust, far: !inBox && inThrust });
    return;
  }

  if (fighter.intent !== "break") {
    fighter.intent = "approach";
  }
  scheduleAi(fighter, 10 + Math.floor(fighter.aiBias * 18));
}

function startCombo(fighter, world, { inThrust = false, far = false } = {}) {
  const sword = isSword(fighter);
  let plan;
  const r = Math.random();
  if (sword) {
    if (far || (inThrust && r < 0.4)) plan = ["thrust"];
    else if (r < 0.4) plan = ["slash", "slash", "spin"];
    else if (r < 0.7) plan = ["slash", "thrust"];
    else plan = ["slash", "spin"];
  } else {
    if (r < 0.22) plan = ["jab", "jab", "flick", "hook"];
    else if (r < 0.4) plan = ["jab", "cross", "hook"];
    else if (r < 0.55) plan = ["jab", "cross", "uppercut"];
    else if (r < 0.7) plan = ["sideKick", "jab", "cross"];
    else if (r < 0.85) plan = ["jab", "sweep", "roundhouse"];
    else plan = ["cross", "gutPunch"];
  }
  const first = plan.shift();
  fighter.comboPlan = plan;
  fighter.wantMove = plan[0] || null;
  fighter.intent = "exchange";
  beginMove(fighter, first);
  if (sword) world.sfx.slash?.();
  fighter.breakTimer = 32 + Math.floor(Math.random() * 16);
  // After the last hit they will break apart once recover ends.
  scheduleAi(fighter, 18 + Math.floor(Math.random() * 14));
}

function isTelegraphed(enemy) {
  return enemy.state === STATE.WINDUP || (enemy.state === STATE.ACTIVE && enemy.stateTime <= 1);
}

function scheduleAi(fighter, frames) {
  fighter.aiClock = frames;
  fighter.lastAction = fighter.aiClock;
}

function hashish(fighter, tick) {
  const n = Math.sin(fighter.aiBias * 999 + tick * 0.17) * 10000;
  return n - Math.floor(n);
}

function separate(fighter, list) {
  for (const other of list) {
    if (other === fighter) continue;
    const dx = fighter.x - other.x;
    const dy = fighter.y - other.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const pad = other.state === STATE.KO ? 1.05 : 1.45;
    const min = (fighter.radius + other.radius) * pad;
    if (dist < min) {
      const push = (min - dist) * 0.45;
      fighter.x += (dx / dist) * push * 0.7;
      fighter.y += (dy / dist) * push * 1.15;
    }
  }
}

export function requestAttack(fighter, name = "jab") {
  if (fighter.state === STATE.KO || fighter.dead) return false;
  if (inCancelWindow(fighter) || canAct(fighter)) {
    if (name === "special" && fighter.specialCharges > 0) fighter.specialCharges -= 1;
    if (name === "dodge") {
      beginDodge(fighter, -fighter.facing);
      return true;
    }
    if (name === "dash") {
      beginDash(fighter);
      return true;
    }
    if (name === "block") {
      beginBlock(fighter);
      return true;
    }
    beginMove(fighter, resolveMove(fighter, name));
    return true;
  }
  fighter.wantMove = resolveMove(fighter, name);
  return false;
}


export function drawFighter(ctx, fighter, opts) {
  return drawFighterArt(ctx, fighter, opts);
}

export function fighterDepth(fighter) {
  return fighter.y;
}

function shadeHex(hex, amt) {
  const raw = String(hex || "#888").replace("#", "");
  if (raw.length !== 6) return hex;
  const n = parseInt(raw, 16);
  let r = (n >> 16) + amt;
  let g = ((n >> 8) & 255) + amt;
  let b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
