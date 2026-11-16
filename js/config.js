// Tunable game and stream settings for Chibi Clash.

export const CONFIG = {
  title: "Chibi Clash",
  subtitle: "Like, comment, gift, or follow to join!",

  ws: {
    url: "ws://127.0.0.1:21213/",
    reconnectMs: 1500,
  },

  gender: {
    // Viewers can pick a look by comment. All matching is case-insensitive
    // and ignores punctuation. Add extra words here if you want more aliases.
    femaleWords: [
      "girl", "female", "woman", "lady", "gal", "she", "her",
      "f", "g", "♀", "princess", "queen",
    ],
    maleWords: [
      "boy", "male", "man", "guy", "lad", "he", "him",
      "m", "b", "♂", "prince", "king",
    ],
    // If a comment does not pick, we guess from the nickname, then
    // fall back to this: "neutral" or "random".
    fallback: "random",
  },

  teams: {
    rose: { id: "rose", name: "Rose", color: "#ff5b8a", dark: "#a51d4a" },
    sky: { id: "sky", name: "Sky", color: "#3db8ff", dark: "#155a96" },
    // Viewers can also claim a team in chat.
    roseWords: ["rose", "pink", "red", "left", "1"],
    skyWords: ["sky", "blue", "right", "2"],
  },

  combat: {
    // Active fighters in the arena at once. Everyone here is in the fight
    // (featured duels in front, the rest in back rows).
    arenaSize: 30,
    maxFighters: 30,
    // Viewers past the cap wait here. When someone is KO'd, the next seat enters.
    queueSize: 80,
    // Each round is 5 minutes, then a short results board and the next round.
    roundSeconds: 300,
    intermissionSeconds: 10,
    maxConcurrentAttacks: 30,
    baseHp: 100,
    walkSpeed: 2.15,
    // 1 TikTok gift diamond (coin) = +30 HP, with no HP cap.
    hpPerCoin: 30,
    // Gift diamonds needed to instantly fire a special (Roses are 1 diamond).
    specialDiamondThreshold: 10,
    bigGiftDiamonds: 100,
    likeJabEvery: 1,
    // Visual size: glow and crown grow with gifts; body scale stays almost flat.
    maxScale: 1.08,
    glowCoins: 3,
    crownCoins: 10,
  },

  // Fair-play knobs. Copy on screen stays neutral — no pay-to-win wording.
  fair: {
    swordDamageCap: 1.15,       // blades deal at most +15% vs the matching glove move
    gloveStartupScale: 0.82,    // glove fighters wind up a little faster
    swordEvadeChance: 0.36,     // gloves may slip or counter a blade
    comebackHits: 3,            // hits taken in a row before a guaranteed counter window
    comebackTicks: 96,
    likeBoostTicks: 150,        // ~2.5s speed burst, capped
    likeBoostMax: 180,
    commentBoostTicks: 120,
    incomingLog: 0.35,          // damage scale vs stacked HP: 1 + k*log2(maxHp/base)
    incomingCap: 2.5,
    carryWindowMs: 120000,      // ~2 minutes of recent activity still counts as present
    pairHpBand: 0.35,           // matchmaking prefers similar max HP
  },

  moves: {
    // Times are 60Hz ticks. Anticipation is ~8–12 frames at 30fps (16–24 ticks).
    // hitstop is the visible contact hold (~6–10 frames at 30fps = 12–20 ticks).
    jab: {
      startup: 18, active: 4, recovery: 16, hitstop: 12, knockback: 14,
      damage: 6, hitstun: 22, blockstun: 10, range: 78, cancelWindow: 8,
      shake: 0, lunge: 2.2, kit: "gloves", zone: "face", fightGap: 104,
    },
    cross: {
      startup: 20, active: 4, recovery: 18, hitstop: 14, knockback: 22,
      damage: 10, hitstun: 26, blockstun: 12, range: 86, cancelWindow: 7,
      shake: 1.0, lunge: 2.6, kit: "gloves", zone: "body", fightGap: 108,
    },
    hook: {
      startup: 22, active: 4, recovery: 18, hitstop: 14, knockback: 26,
      damage: 13, hitstun: 28, blockstun: 12, range: 82, cancelWindow: 0,
      shake: 1.6, lunge: 2.0, kit: "gloves", zone: "face", fightGap: 112,
    },
    uppercut: {
      startup: 22, active: 4, recovery: 20, hitstop: 16, knockback: 34,
      damage: 16, hitstun: 32, blockstun: 14, range: 76, cancelWindow: 0,
      shake: 2.0, lunge: 2.2, kit: "gloves", zone: "face", fightGap: 102,
    },
    sideKick: {
      startup: 22, active: 4, recovery: 20, hitstop: 16, knockback: 28,
      damage: 12, hitstun: 26, blockstun: 12, range: 102, cancelWindow: 0,
      shake: 1.6, lunge: 3.0, kit: "gloves", jump: true, zone: "body", fightGap: 128,
    },
    kick: {
      startup: 22, active: 4, recovery: 20, hitstop: 16, knockback: 28,
      damage: 12, hitstun: 26, blockstun: 12, range: 102, cancelWindow: 0,
      shake: 1.6, lunge: 2.8, kit: "gloves", zone: "body", fightGap: 126,
    },
    sweep: {
      startup: 20, active: 4, recovery: 18, hitstop: 14, knockback: 22,
      damage: 8, hitstun: 24, blockstun: 12, range: 96, cancelWindow: 6,
      shake: 1.0, lunge: 2.2, kit: "gloves", low: true, zone: "legs", fightGap: 124,
    },
    roundhouse: {
      startup: 24, active: 4, recovery: 20, hitstop: 16, knockback: 34,
      damage: 15, hitstun: 30, blockstun: 14, range: 108, cancelWindow: 0,
      shake: 2.0, lunge: 2.4, kit: "gloves", high: true, zone: "face", fightGap: 130,
    },
    hookKick: {
      startup: 24, active: 4, recovery: 20, hitstop: 16, knockback: 32,
      damage: 15, hitstun: 30, blockstun: 14, range: 110, cancelWindow: 0,
      shake: 1.8, lunge: 2.0, kit: "gloves", high: true, zone: "face", fightGap: 130,
    },
    doubleKick: {
      startup: 22, active: 5, recovery: 20, hitstop: 16, knockback: 30,
      damage: 14, hitstun: 28, blockstun: 12, range: 106, cancelWindow: 0,
      shake: 1.8, lunge: 3.2, kit: "gloves", jump: true, zone: "body", fightGap: 128,
    },
    axeKick: {
      startup: 24, active: 4, recovery: 22, hitstop: 16, knockback: 36,
      damage: 18, hitstun: 32, blockstun: 14, range: 100, cancelWindow: 0,
      shake: 2.2, lunge: 2.4, kit: "gloves", high: true, zone: "face", fightGap: 126,
    },
    gutPunch: {
      startup: 24, active: 4, recovery: 22, hitstop: 18, knockback: 48,
      damage: 20, hitstun: 40, blockstun: 16, range: 86, cancelWindow: 0,
      shake: 3.0, lunge: 3.0, kit: "gloves", launch: true, shockwave: true, zone: "gut", fightGap: 106,
    },
    flick: {
      startup: 16, active: 3, recovery: 14, hitstop: 12, knockback: 10,
      damage: 4, hitstun: 18, blockstun: 8, range: 76, cancelWindow: 6,
      shake: 0, lunge: 2.0, kit: "gloves", zone: "face", fightGap: 100,
    },
    charge: {
      startup: 16, active: 8, recovery: 14, hitstop: 12, knockback: 20,
      damage: 8, hitstun: 18, blockstun: 8, range: 96, cancelWindow: 0,
      shake: 1.2, lunge: 4.0, kit: "any", zone: "body", fightGap: 120,
    },
    heavy: {
      startup: 22, active: 4, recovery: 18, hitstop: 14, knockback: 26,
      damage: 13, hitstun: 28, blockstun: 12, range: 82, cancelWindow: 0,
      shake: 1.6, lunge: 2.0, kit: "gloves", zone: "body", fightGap: 106,
    },
    // Swords: extra reach and style. Damage is capped in fairDamage().
    slash: {
      startup: 24, active: 5, recovery: 20, hitstop: 14, knockback: 24,
      damage: 12, hitstun: 26, blockstun: 12, range: 118, cancelWindow: 8,
      shake: 1.4, lunge: 2.2, kit: "sword", zone: "body", fightGap: 138,
    },
    thrust: {
      startup: 26, active: 4, recovery: 20, hitstop: 14, knockback: 30,
      damage: 14, hitstun: 28, blockstun: 12, range: 136, cancelWindow: 0,
      shake: 1.6, lunge: 3.6, kit: "sword", zone: "body", fightGap: 148,
    },
    spin: {
      startup: 28, active: 6, recovery: 24, hitstop: 16, knockback: 36,
      damage: 18, hitstun: 32, blockstun: 16, range: 124, cancelWindow: 0,
      shake: 2.0, lunge: 0.8, kit: "sword", allAround: true, zone: "body", fightGap: 140,
    },
    special: {
      startup: 28, active: 6, recovery: 24, hitstop: 16, knockback: 48,
      damage: 18, hitstun: 36, blockstun: 16, range: 136, cancelWindow: 0,
      shake: 2.4, lunge: 2.8, kit: "sword", allAround: true, zone: "body", fightGap: 146,
    },
    dodge: { frames: 22, invulnStart: 2, invulnEnd: 16, distance: 96 },
    dash: { frames: 14, distance: 100 },
    parryWindow: 6,
    swordParryWindow: 8,
  },

  ko: {
    hitstop: 16,
    slowMo: 0.38,
    slowMoFrames: 64,
    letterbox: true,
  },

  camera: {
    punchInZoom: 1.65,
    clashZoom: 1.58,
    closeZoom: 1.55,
    mediumZoom: 1.18,
    wideZoom: 1.0,
    pullZoom: 0.98,
    demo: {
      punchInZoom: 3.7,
      clashZoom: 3.4,
      closeZoom: 3.15,
      mediumZoom: 2.25,
      wideZoom: 1.2,
      pullZoom: 0.98,
    },
  },

  fx: {
    particleMax: 80,
    dustMax: 22,
    trailMax: 12,
    shockwaveMax: 6,
  },

  audio: {
    defaultVolume: 0.7,
  },
};

const PORTRAIT = {
  mode: "portrait",
  width: 1080,
  height: 1920,
  // Floor sits in the middle of the tall frame, leaving the top for HUD
  // and about the bottom 25% clear for TikTok's comment overlay.
  groundTop: 360,
  groundBottom: 1320,
  leftMin: 70,
  leftMax: 500,
  rightMin: 580,
  rightMax: 1010,
  centerX: 540,
};

const LANDSCAPE = {
  mode: "landscape",
  width: 1920,
  height: 1080,
  groundTop: 300,
  groundBottom: 900,
  leftMin: 160,
  leftMax: 860,
  rightMin: 1060,
  rightMax: 1760,
  centerX: 960,
};

// Default is TikTok-native 9:16 (1080x1920). Use applyLayout("landscape")
// or ?landscape=1 for 16:9.
export const ARENA = { ...PORTRAIT };

export function applyLayout(mode) {
  const next = mode === "landscape" ? LANDSCAPE : PORTRAIT;
  Object.assign(ARENA, next);
  return ARENA;
}

export function formatHp(n) {
  const v = Math.max(0, Math.round(Number(n) || 0));
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
