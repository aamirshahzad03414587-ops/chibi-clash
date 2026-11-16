/**
 * Authored front-duel sequences. Times are in 60Hz game ticks from
 * sequence start. Edit this file to retune choreography without
 * touching the renderer.
 *
 * Fields:
 *   t        tick
 *   a / b    move name for fighter A (left/rose) or B (right/sky)
 *   cam      "wide" | "medium" | "close" | "clash" | "pull"
 *   slowMo   0..1 game speed (1 = normal)
 *   note     label for the demo timeline
 *   fx       "shockwave" | "dustDome" | "aura" | "flash"
 *   fold     defender folds on the next contact
 *   launch   next contact launches
 *   gift     "a" | "b"  — grant a sword with sparkle
 *   both     move both do
 *   hp       { a, b } set remaining hp
 */
export const DEMO_SEQUENCE = [
  { t: 0, cam: "medium", note: "Facing off" },
  { t: 18, both: "charge", cam: "medium", note: "Charge — dash with a forward lean", fx: "speedlines" },
  { t: 44, a: "sideKick", b: "block", cam: "close", note: "Jumping side kick, blocked" },
  // Burst rhythm: fast-fast-fast-fast... PAUSE... heavy. Never even 1-2-3.
  { t: 74, a: "jab", cam: "close", note: "Punch flurry starts" },
  { t: 84, a: "jab" },
  { t: 93, a: "flick" },
  { t: 102, a: "hook" },
  { t: 112, a: "sweep", note: "Low sweep after the burst" },
  { t: 140, note: "Micro-pause" },
  { t: 158, a: "cross", b: "parry", cam: "close", slowMo: 0.42, note: "Slow-mo parry — straight right vs left arm" },
  { t: 200, slowMo: 1, cam: "close" },
  { t: 210, a: "roundhouse", cam: "close", note: "High roundhouse, head snap" },
  { t: 250, a: "hookKick", note: "Spinning hook kick, slide back" },
  { t: 292, a: "gutPunch", b: "hurtFold", cam: "close", slowMo: 0.38, fx: "shockwave", launch: true, fold: true, note: "Deep-step gut punch, shockwave, launch" },
  { t: 360, slowMo: 1, cam: "medium" },
  { t: 390, b: "getup", note: "B gets up" },
  { t: 430, gift: "a", note: "Gift — A upgrades to a shiny sword" },
  { t: 470, a: "slashOver", b: "leanBack", cam: "close", note: "Overhead slash, lean-back evade, glowing trails" },
  { t: 510, a: "slash", b: "leanBack", note: "Rapid slashes, still evading" },
  { t: 545, gift: "b", note: "B also gets a sword" },
  { t: 575, a: "slash", b: "slash", cam: "clash", note: "Blade clash — tight camera, sparks" },
  { t: 615, a: "slash", b: "parry", cam: "clash", note: "Parry and deflect" },
  { t: 655, a: "thrust", cam: "close" },
  { t: 695, a: "spin", cam: "medium", note: "Spin slash" },
  { t: 745, both: "cross", cam: "close", fx: "flash", note: "Mutual cross-counter, both skid back" },
  { t: 800, cam: "medium", restage: true, note: "Both recover, camera holds" },
  { t: 820, b: "knee", fx: "aura", restage: true, note: "Comeback — B on one knee, team aura" },
  { t: 860, b: "charge", fx: "afterimages", cam: "medium", note: "Dash as a light streak with afterimages" },
  { t: 890, b: "doubleKick", cam: "close", note: "Flying double kick" },
  { t: 925, b: "axeKick", restage: true, note: "Forward flip into an axe kick" },
  { t: 970, a: "gutPunch", cam: "close", slowMo: 0.4, fx: "shockwave", launch: true, fold: true, hp: { b: 8 }, restage: true, note: "Finisher wind-up / gut punch, camera punch-in" },
  { t: 1040, slowMo: 0.42, cam: "close", ko: "b", note: "KO — launched, bounce, tumble, swirl eyes" },
  { t: 1120, slowMo: 1, cam: "pull", note: "Pull back to the busy arena" },
];

/** Shorter looping exchanges used by live front-row AI (not the demo). */
export const LIVE_EXCHANGES = [
  {
    id: "burst_box",
    kit: "gloves",
    burst: true,
    steps: [
      { t: 0, a: "jab" },
      { t: 0, a: "jab" },
      { t: 0, a: "hook" },
    ],
  },
  {
    id: "kick_string",
    kit: "gloves",
    steps: [
      { t: 0, a: "sideKick", b: "block" },
      { t: 0, a: "roundhouse" },
      { t: 0, b: "hookKick" },
    ],
  },
  {
    id: "gut_launch",
    kit: "gloves",
    steps: [
      { t: 0, a: "jab" },
      { t: 0, a: "cross" },
      { t: 0, a: "gutPunch", launch: true, fold: true },
    ],
  },
  {
    id: "single_cross",
    kit: "gloves",
    steps: [
      { t: 0, a: "cross", b: "block" },
      { t: 0, b: "hook" },
    ],
  },
  {
    id: "jump_axe",
    kit: "gloves",
    steps: [
      { t: 0, a: "doubleKick", b: "block" },
      { t: 0, a: "axeKick" },
    ],
  },
  {
    id: "sword_clash",
    kit: "sword",
    steps: [
      { t: 0, a: "slash", b: "leanBack" },
      { t: 0, a: "slashOver", b: "parry" },
      { t: 0, a: "thrust" },
    ],
  },
  {
    id: "sword_thrust",
    kit: "sword",
    steps: [
      { t: 0, a: "slash", b: "block" },
      { t: 0, a: "thrust" },
    ],
  },
];
