/** Keyframed fighting clips. Times inside a phase are 0..1.
 *  Driven by combat phases so contact stays frame-accurate.
 *  Easy to retune: each clip is just a list of {t, ease, pose} keys.
 */
import { restBox, restSword, mergePose, evalKeys, emptyPose } from "./rig.js";

const BOX = restBox();
const SWORD = restSword();

function K(t, ease, pose) {
  return { t, ease, pose };
}

function clip(phases, { loop = false, rest = BOX, face = "angry", contact = "fist" } = {}) {
  return { phases, loop, rest, face, contact };
}

function loopClip(keys, duration, rest = BOX, face = "normal") {
  return { loop: true, duration, keys, rest, face };
}

// ---------------------------------------------------------------------------
// Idles / locomotion
// ---------------------------------------------------------------------------
const idleBox = loopClip([
  K(0, "sine", { hip: { y: 1 }, thighF: { rot: -0.22 }, shinF: { rot: 0.18 }, thighB: { rot: 0.28 }, armF: { rot: -1.05 }, forearmF: { rot: -0.85 } }),
  K(0.5, "sine", { hip: { y: -5 }, thighF: { rot: -0.32 }, shinF: { rot: 0.28 }, thighB: { rot: 0.18 }, armF: { rot: -1.12 }, forearmF: { rot: -0.9 }, torso: { rot: -0.1 } }),
  K(1, "sine", { hip: { y: 1 }, thighF: { rot: -0.22 }, shinF: { rot: 0.18 }, thighB: { rot: 0.28 }, armF: { rot: -1.05 }, forearmF: { rot: -0.85 } }),
], 28);

const idleSword = loopClip([
  K(0, "sine", { hip: { y: 1 }, armF: { rot: -1.25 }, forearmF: { rot: -0.35 }, weapon: { rot: -0.9 } }),
  K(0.5, "sine", { hip: { y: -4 }, armF: { rot: -1.32 }, forearmF: { rot: -0.28 }, weapon: { rot: -0.82 }, torso: { rot: -0.08 } }),
  K(1, "sine", { hip: { y: 1 }, armF: { rot: -1.25 }, forearmF: { rot: -0.35 }, weapon: { rot: -0.9 } }),
], 28, SWORD);

const walk = loopClip([
  K(0, "sine", { hip: { y: 0 }, thighF: { rot: -0.7 }, shinF: { rot: 0.25 }, thighB: { rot: 0.55 }, shinB: { rot: 0.15 }, armF: { rot: -0.4 }, armB: { rot: -1.1 }, torso: { rot: -0.12 } }),
  K(0.5, "sine", { hip: { y: -3 }, thighF: { rot: 0.55 }, shinF: { rot: 0.15 }, thighB: { rot: -0.7 }, shinB: { rot: 0.25 }, armF: { rot: -1.1 }, armB: { rot: -0.4 }, torso: { rot: 0.08 } }),
  K(1, "sine", { hip: { y: 0 }, thighF: { rot: -0.7 }, shinF: { rot: 0.25 }, thighB: { rot: 0.55 }, shinB: { rot: 0.15 }, armF: { rot: -0.4 }, armB: { rot: -1.1 }, torso: { rot: -0.12 } }),
], 16);

// Charge: extreme forward lean, arms trailing, then a streak into impact.
const charge = clip({
  windup: [
    K(0, "easeIn", { hip: { y: 10 }, torso: { rot: 0.25 }, armF: { rot: 0.6 }, armB: { rot: 0.7 }, thighF: { rot: 0.55 } }),
    K(1, "easeIn", { hip: { y: 12, x: -8 }, torso: { rot: 0.45 }, head: { rot: -0.25 }, armF: { rot: 1.1 }, forearmF: { rot: 0.4 }, armB: { rot: 1.2 }, thighF: { rot: 0.65 }, thighB: { rot: -0.55 } }),
  ],
  active: [
    K(0, "punch", { hip: { y: 2, x: 18 }, torso: { rot: -1.05 }, head: { rot: 0.25 }, armF: { rot: 1.25 }, armB: { rot: 1.35 }, forearmF: { rot: 0.5 }, thighF: { rot: -1.15 }, shinF: { rot: 0.45 }, thighB: { rot: 0.85 } }),
    K(1, "easeOut", { hip: { y: 2, x: 22 }, torso: { rot: -1.15 }, head: { rot: 0.3 }, armF: { rot: 1.35 }, armB: { rot: 1.4 }, thighF: { rot: -1.25 }, shinF: { rot: 0.3 } }),
  ],
  recover: [
    K(0, "easeOut", { hip: { x: 14, y: 2 }, torso: { rot: -0.7 }, armF: { rot: 0.8 }, armB: { rot: 0.9 } }),
    K(1, "easeInOut", { hip: { x: 6 }, torso: { rot: -0.3 } }),
  ],
}, { face: "angry" });

const dash = charge;

// ---------------------------------------------------------------------------
// Boxing
// ---------------------------------------------------------------------------
const jab = clip({
  windup: [
    K(0, "easeOut", {}),
    K(1, "easeOut", {
      hip: { y: 2, x: 4 }, torso: { rot: 0.15 },
      armF: { rot: -0.7 }, forearmF: { rot: -1.6 },
      armB: { rot: -0.4 }, thighF: { rot: -0.35 },
    }),
  ],
  active: [
    K(0, "punch", {
      hip: { y: 0, x: 22 }, torso: { rot: -0.55 }, head: { rot: -0.08 },
      armF: { rot: -1.65 }, forearmF: { rot: 0.08 }, handF: { rot: 0 },
      armB: { rot: 0.7 }, forearmB: { rot: 0.2 },
      thighF: { rot: -0.7 }, shinF: { rot: 0.15 }, thighB: { rot: 0.45 },
    }),
    K(1, "linear", {
      hip: { x: 20 }, torso: { rot: -0.5 },
      armF: { rot: -1.6 }, forearmF: { rot: 0.02 },
    }),
  ],
  recover: [
    K(0, "easeOut", { armF: { rot: -1.45 }, forearmF: { rot: -0.3 }, hip: { x: 8 } }),
    K(1, "easeInOut", {}),
  ],
}, { face: "angry", contact: "fist" });

const cross = clip({
  windup: [
    K(0, "easeIn", {}),
    K(1, "easeOut", {
      hip: { y: 4, x: -6, rot: 0.4 }, torso: { rot: 0.55 }, head: { rot: -0.25 },
      armB: { rot: 0.3 }, forearmB: { rot: -1.7 },
      armF: { rot: -1.4 }, forearmF: { rot: -1.1 },
      thighB: { rot: 0.55 }, thighF: { rot: -0.45 },
    }),
  ],
  active: [
    K(0, "punch", {
      hip: { y: 0, x: 20, rot: -0.45 }, torso: { rot: -0.85 }, head: { rot: 0.18 },
      armB: { rot: -1.65 }, forearmB: { rot: 0.08 }, handB: { rot: 0 },
      armF: { rot: 0.6 }, forearmF: { rot: 0.15 },
      thighF: { rot: -0.25 }, thighB: { rot: 0.5 },
    }),
    K(1, "linear", {
      hip: { x: 16, rot: -0.35 }, torso: { rot: -0.7 },
      armB: { rot: -1.58 }, forearmB: { rot: 0.0 },
    }),
  ],
  recover: [
    K(0, "easeOut", { hip: { x: 8, rot: -0.15 }, torso: { rot: -0.3 }, armB: { rot: -1.1 }, forearmB: { rot: -0.5 } }),
    K(1, "easeInOut", {}),
  ],
}, { face: "angry", contact: "fistB" });

const hook = clip({
  windup: [
    K(0, "easeIn", {}),
    K(1, "easeOut", {
      hip: { y: 4, rot: 0.45 }, torso: { rot: 0.7 }, head: { rot: -0.2 },
      armF: { rot: 0.55 }, forearmF: { rot: -1.8 },
      thighF: { rot: -0.25 },
    }),
  ],
  active: [
    K(0, "punch", {
      hip: { rot: -0.5, x: 14 }, torso: { rot: -0.75 }, head: { rot: 0.25 },
      armF: { rot: -2.15 }, forearmF: { rot: -0.55 },
      armB: { rot: 0.4 },
    }),
    K(1, "easeOut", {
      hip: { rot: -0.6, x: 12 }, torso: { rot: -0.85 },
      armF: { rot: -2.45 }, forearmF: { rot: -0.25 },
    }),
  ],
  recover: [
    K(0, "easeOut", { armF: { rot: -1.7 }, forearmF: { rot: -0.5 }, torso: { rot: -0.25 } }),
    K(1, "easeInOut", {}),
  ],
}, { face: "angry", contact: "fist" });

const uppercut = clip({
  windup: [
    K(0, "easeIn", {}),
    K(1, "easeOut", {
      hip: { y: 22 }, torso: { rot: 0.4 }, head: { rot: 0.2 },
      armF: { rot: 0.6 }, forearmF: { rot: -1.8 },
      thighF: { rot: -1.0 }, shinF: { rot: 1.4 }, thighB: { rot: -0.75 }, shinB: { rot: 1.2 },
    }),
  ],
  active: [
    K(0, "punch", {
      hip: { y: -16, x: 8 }, torso: { rot: -0.45 }, head: { rot: -0.3 },
      armF: { rot: -3.05 }, forearmF: { rot: -0.05 },
      thighF: { rot: -0.2 }, shinF: { rot: 0.1 }, thighB: { rot: 0.35 },
    }),
    K(1, "easeOut", {
      hip: { y: -12, x: 6 }, torso: { rot: -0.35 },
      armF: { rot: -2.85 }, forearmF: { rot: -0.12 },
    }),
  ],
  recover: [
    K(0, "easeOut", { hip: { y: 0 }, armF: { rot: -2.0 }, forearmF: { rot: -0.5 } }),
    K(1, "easeInOut", {}),
  ],
}, { face: "angry", contact: "fist" });

const heavy = hook;
const flick = jab;

// ---------------------------------------------------------------------------
// Kicks
// ---------------------------------------------------------------------------
const sideKick = clip({
  windup: [
    K(0, "easeIn", { hip: { y: 2 } }),
    K(0.55, "easeOut", {
      hip: { y: -10 }, torso: { rot: 0.2 },
      thighF: { rot: -2.1 }, shinF: { rot: 1.6 },
      armF: { rot: -0.2 }, armB: { rot: 0.6 },
    }),
    K(1, "easeIn", { hip: { y: -22, x: 6 }, thighF: { rot: -2.2 }, shinF: { rot: 1.3 }, torso: { rot: -0.25 } }),
  ],
  active: [
    K(0, "punch", {
      hip: { y: -36, x: 16 }, torso: { rot: -0.35 }, head: { rot: 0.12 },
      thighF: { rot: -1.65, sy: 1.4 }, shinF: { rot: 0.0, sy: 1.35 },
      thighB: { rot: 0.55 }, shinB: { rot: 0.25 },
      armF: { rot: 0.8 }, armB: { rot: -0.5 },
    }),
    K(1, "easeOut", {
      hip: { y: -30, x: 18 }, thighF: { rot: -1.85, sy: 1.35 }, shinF: { rot: -0.1, sy: 1.3 },
    }),
  ],
  recover: [
    K(0, "easeIn", { hip: { y: -6, x: 6 }, thighF: { rot: -0.9 }, shinF: { rot: 0.5 } }),
    K(1, "easeInOut", {}),
  ],
}, { face: "angry", contact: "kick" });

const kick = sideKick;

const sweep = clip({
  windup: [
    K(0, "easeIn", {}),
    K(1, "easeOut", {
      hip: { y: 20, rot: -0.5 }, torso: { rot: -0.65 }, head: { rot: 0.2 },
      thighF: { rot: 0.5 }, shinF: { rot: 0.25 },
      thighB: { rot: -1.4 }, shinB: { rot: 0.7 },
      armF: { rot: 0.4 }, armB: { rot: -1.1 },
    }),
  ],
  active: [
    K(0, "punch", {
      hip: { y: 18, rot: -0.8, x: 10 }, torso: { rot: -0.8 },
      thighB: { rot: -1.9, sy: 1.35 }, shinB: { rot: -0.05, sy: 1.3 },
      thighF: { rot: 0.75 },
    }),
    K(1, "easeOut", { hip: { rot: -1.0 }, thighB: { rot: -2.2, sy: 1.3 }, shinB: { rot: 0.1 } }),
  ],
  recover: [
    K(0, "easeIn", { hip: { y: 10, rot: -0.35 } }),
    K(1, "easeInOut", {}),
  ],
}, { face: "angry", contact: "kick" });

const roundhouse = clip({
  windup: [
    K(0, "easeIn", {}),
    K(0.6, "easeOut", {
      hip: { y: 4, rot: 0.8 }, torso: { rot: 0.65 }, head: { rot: -0.3 },
      thighF: { rot: -0.5 }, thighB: { rot: 0.25 },
      armF: { rot: 0.55 }, armB: { rot: -1.5 },
    }),
    K(1, "easeIn", { hip: { rot: 1.0, y: -6 }, thighF: { rot: -1.6 }, shinF: { rot: 1.2 }, torso: { rot: 0.75 } }),
  ],
  active: [
    K(0, "punch", {
      hip: { rot: -0.65, y: -16, x: 12 }, torso: { rot: -0.55 }, head: { rot: 0.35 },
      thighF: { rot: -3.05, sy: 1.45 }, shinF: { rot: -0.1, sy: 1.4 },
      thighB: { rot: 0.45 },
      armF: { rot: -0.3 }, armB: { rot: 0.7 },
    }),
    K(1, "easeOut", {
      hip: { rot: -0.95, x: 14, y: -12 }, torso: { rot: -0.7 },
      thighF: { rot: -3.25, sy: 1.4 }, shinF: { rot: 0.05, sy: 1.35 },
    }),
  ],
  recover: [
    K(0, "easeIn", { hip: { rot: -0.25, y: 4 }, thighF: { rot: -1.1 }, shinF: { rot: 0.6 } }),
    K(1, "easeInOut", {}),
  ],
}, { face: "angry", contact: "kick" });

const hookKick = clip({
  windup: [
    K(0, "easeIn", { hip: { rot: 0.3 } }),
    K(1, "easeOut", {
      hip: { rot: 1.4, y: -4 }, torso: { rot: 0.85 }, head: { rot: -0.4 },
      thighF: { rot: -1.1 }, shinF: { rot: 1.4 },
      armF: { rot: 0.8 }, armB: { rot: -0.3 },
    }),
  ],
  active: [
    K(0, "punch", {
      hip: { rot: -0.55, y: -18, x: 12 }, torso: { rot: -0.7 },
      thighF: { rot: -3.05, sy: 1.4 }, shinF: { rot: -0.15, sy: 1.35 },
      armB: { rot: 1.0 },
    }),
    K(1, "easeOut", { hip: { rot: -1.5, y: -14 }, torso: { rot: -0.9 }, thighF: { rot: -3.3, sy: 1.35 } }),
  ],
  recover: [
    K(0, "easeIn", { hip: { rot: -0.5 }, thighF: { rot: -1.1 } }),
    K(1, "easeInOut", {}),
  ],
}, { face: "angry", contact: "kick" });

const doubleKick = clip({
  windup: [
    K(0, "easeIn", { hip: { y: 6 } }),
    K(1, "easeOut", { hip: { y: -18, x: 6 }, thighF: { rot: -1.6 }, shinF: { rot: 1.3 }, thighB: { rot: -0.6 }, armF: { rot: 0.55 } }),
  ],
  active: [
    K(0, "punch", {
      hip: { y: -40, x: 14 }, torso: { rot: -0.3 },
      thighF: { rot: -1.75, sy: 1.4 }, shinF: { rot: 0, sy: 1.35 },
      thighB: { rot: -1.55, sy: 1.3 }, shinB: { rot: 0.05, sy: 1.25 },
    }),
    K(1, "easeOut", { hip: { y: -34, x: 16 }, thighF: { rot: -1.95, sy: 1.35 }, thighB: { rot: -1.7, sy: 1.25 } }),
  ],
  recover: [
    K(0, "easeIn", { hip: { y: -4 }, thighF: { rot: -0.7 } }),
    K(1, "easeInOut", {}),
  ],
}, { face: "angry", contact: "kick" });

const axeKick = clip({
  windup: [
    K(0, "easeIn", { hip: { y: 2 } }),
    K(0.45, "easeIn", { hip: { y: -28, rot: -1.6 }, torso: { rot: -1.0 }, thighF: { rot: -2.7 }, shinF: { rot: 0.2 }, armF: { rot: 1.2 } }),
    K(1, "easeOut", { hip: { y: -42, rot: -2.8 }, torso: { rot: -0.6 }, thighF: { rot: -0.4 }, shinF: { rot: 0.1 }, thighB: { rot: -2.8, sy: 1.3 } }),
  ],
  active: [
    K(0, "punch", {
      hip: { y: -10, rot: -3.2, x: 8 }, torso: { rot: 0.25 },
      thighF: { rot: 0.25 }, shinF: { rot: 0 },
      thighB: { rot: -3.0, sy: 1.45 }, shinB: { rot: 0, sy: 1.4 },
    }),
    K(1, "easeOut", { hip: { y: 8, rot: -3.35 }, thighB: { rot: -3.15, sy: 1.35 } }),
  ],
  recover: [
    K(0, "easeIn", { hip: { y: 10, rot: -0.5 }, thighB: { rot: -0.9 } }),
    K(1, "easeInOut", {}),
  ],
}, { face: "angry", contact: "kick" });

const gutPunch = clip({
  windup: [
    K(0, "easeIn", {}),
    K(1, "easeOut", {
      hip: { y: 8, x: -8, rot: 0.5 }, torso: { rot: 0.6 }, head: { rot: -0.15 },
      armB: { rot: 0.4 }, forearmB: { rot: -1.85 },
      thighF: { rot: -0.7 }, shinF: { rot: 0.25 }, thighB: { rot: 0.6 },
      armF: { rot: -0.9 },
    }),
  ],
  active: [
    K(0, "punch", {
      hip: { y: 10, x: 24, rot: -0.55 }, torso: { rot: -0.9 }, head: { rot: 0.28 },
      armB: { rot: -1.7 }, forearmB: { rot: 0.08 },
      thighF: { rot: -0.85 }, shinF: { rot: 0.15 }, thighB: { rot: 0.65 },
      armF: { rot: 0.35 }, forearmF: { rot: -1.1 },
    }),
    K(1, "easeOut", { hip: { x: 20, rot: -0.45 }, torso: { rot: -0.75 }, armB: { rot: -1.6 } }),
  ],
  recover: [
    K(0, "easeOut", { hip: { x: 10, y: 4 }, armB: { rot: -1.1 }, forearmB: { rot: -0.5 } }),
    K(1, "easeInOut", {}),
  ],
}, { face: "angry", contact: "fistB" });

// ---------------------------------------------------------------------------
// Defense
// ---------------------------------------------------------------------------
const block = clip({
  windup: [K(0, "easeOut", {}), K(1, "easeOut", {
    hip: { y: 6, x: -4 }, torso: { rot: 0.15 },
    armF: { rot: -1.75 }, forearmF: { rot: -1.45 },
    armB: { rot: -1.65 }, forearmB: { rot: -1.5 },
    head: { rot: 0.1 },
  })],
  active: [K(0, "linear", {
    hip: { y: 6, x: -4 }, armF: { rot: -1.8 }, forearmF: { rot: -1.5 },
    armB: { rot: -1.7 }, forearmB: { rot: -1.55 },
  }), K(1, "linear", {
    hip: { y: 6, x: -4 }, armF: { rot: -1.8 }, forearmF: { rot: -1.5 },
    armB: { rot: -1.7 }, forearmB: { rot: -1.55 },
  })],
  recover: [K(0, "easeOut", { armF: { rot: -1.3 } }), K(1, "easeInOut", {})],
}, { face: "angry" });

const parry = clip({
  windup: [K(0, "easeOut", {}), K(1, "easeOut", {
    hip: { x: -4, y: 2 }, torso: { rot: -0.15 },
    armF: { rot: -1.9 }, forearmF: { rot: -0.4 },
    armB: { rot: -0.6 }, weapon: { rot: -0.2 },
  })],
  active: [K(0, "punch", {
    hip: { x: 4 }, torso: { rot: -0.3 },
    armF: { rot: -1.5 }, forearmF: { rot: 0.05 },
    weapon: { rot: -0.2 },
  }), K(1, "linear", { armF: { rot: -1.4 }, forearmF: { rot: -0.1 } })],
  recover: [K(0, "easeOut", {}), K(1, "easeInOut", {})],
}, { face: "angry", rest: SWORD, contact: "blade" });

const dodge = clip({
  windup: [K(0, "easeOut", {}), K(1, "easeOut", {
    hip: { y: 22, x: -16 }, torso: { rot: 0.5 }, head: { rot: 0.35 },
    thighF: { rot: -1.0 }, shinF: { rot: 1.45 }, thighB: { rot: -0.8 }, shinB: { rot: 1.2 },
    armF: { rot: -0.7 }, armB: { rot: -0.5 },
  })],
  active: [K(0, "linear", {
    hip: { y: 24, x: -18 }, torso: { rot: 0.55 }, head: { rot: 0.4 },
    thighF: { rot: -1.05 }, shinF: { rot: 1.5 },
  }), K(1, "linear", { hip: { y: 22, x: -16 } })],
  recover: [K(0, "easeOut", { hip: { y: 8, x: -6 } }), K(1, "easeInOut", {})],
}, { face: "angry" });

const leanBack = clip({
  windup: [K(0, "easeOut", {}), K(1, "easeOut", {
    hip: { y: 6, x: -12 }, torso: { rot: 0.85 }, head: { rot: 0.5 },
    thighF: { rot: -0.7 }, shinF: { rot: 0.2 }, thighB: { rot: 0.7 },
    armF: { rot: -0.3 }, armB: { rot: 0.5 },
  })],
  active: [K(0, "linear", {
    hip: { x: -16, y: 6 }, torso: { rot: 1.05 }, head: { rot: 0.55 },
  }), K(1, "linear", { torso: { rot: 0.95 }, hip: { x: -16 } })],
  recover: [K(0, "easeOut", { torso: { rot: 0.3 } }), K(1, "easeInOut", {})],
}, { face: "angry" });

// ---------------------------------------------------------------------------
// Hits / KO
// ---------------------------------------------------------------------------
const hurt = clip({
  windup: [K(0, "linear", {}), K(1, "linear", {})],
  active: [
    K(0, "punch", {
      hip: { x: -16, y: 6 }, torso: { rot: 0.55 }, head: { rot: 0.9 },
      armF: { rot: 0.7 }, armB: { rot: 0.5 },
      thighF: { rot: -0.15 }, thighB: { rot: 0.5 },
    }),
    K(1, "easeOut", { hip: { x: -8, y: 3 }, torso: { rot: 0.3 }, head: { rot: 0.4 } }),
  ],
  recover: [K(0, "easeOut", { hip: { x: -4 }, head: { rot: 0.15 } }), K(1, "easeInOut", {})],
}, { face: "hurt" });

const hurtFold = clip({
  windup: [K(0, "linear", {}), K(1, "linear", {})],
  active: [
    K(0, "punch", {
      hip: { x: -10, y: 16 }, torso: { rot: 1.2 }, head: { rot: 0.95 },
      armF: { rot: -0.4 }, armB: { rot: -0.4 },
      thighF: { rot: -0.9 }, shinF: { rot: 1.35 }, thighB: { rot: -0.7 }, shinB: { rot: 1.15 },
    }),
    K(1, "easeOut", { hip: { x: -16, y: 18 }, torso: { rot: 1.25 }, head: { rot: 0.85 } }),
  ],
  recover: [K(0, "easeIn", { hip: { y: 8 }, torso: { rot: 0.5 } }), K(1, "easeInOut", {})],
}, { face: "hurt" });

const launch = clip({
  windup: [K(0, "linear", {}), K(1, "linear", {})],
  active: [
    K(0, "punch", {
      hip: { y: -6, rot: 0.6 }, torso: { rot: 0.8 }, head: { rot: 1.0 },
      armF: { rot: 1.5 }, armB: { rot: 1.1 },
      thighF: { rot: -1.0 }, thighB: { rot: 0.8 },
    }),
    K(1, "linear", { hip: { rot: 1.6 }, torso: { rot: 0.7 }, armF: { rot: 1.8 }, armB: { rot: 1.5 } }),
  ],
  recover: [K(0, "linear", { hip: { rot: 2.4 } }), K(1, "linear", { hip: { rot: 3.6 } })],
}, { face: "hurt" });

const tumble = loopClip([
  K(0, "linear", { hip: { rot: 0 }, armF: { rot: 1.5 }, armB: { rot: 1.0 }, thighF: { rot: -1.1 }, thighB: { rot: 1.1 }, torso: { rot: 0.4 }, head: { rot: 0.5 } }),
  K(0.5, "linear", { hip: { rot: 3.14 }, armF: { rot: 0.5 }, armB: { rot: 1.6 }, thighF: { rot: 1.1 }, thighB: { rot: -1.1 } }),
  K(1, "linear", { hip: { rot: 6.28 }, armF: { rot: 1.5 }, armB: { rot: 1.0 }, thighF: { rot: -1.1 }, thighB: { rot: 1.1 } }),
], 16, BOX, "hurt");

const down = loopClip([
  K(0, "sine", {
    hip: { y: 26, rot: 1.55 }, torso: { rot: 0.25 }, head: { rot: 0.5 },
    armF: { rot: 0.7 }, armB: { rot: 1.15 },
    thighF: { rot: 0.35 }, thighB: { rot: -0.5 },
  }),
  K(1, "sine", {
    hip: { y: 26, rot: 1.55 }, torso: { rot: 0.25 }, head: { rot: 0.55 },
    armF: { rot: 0.75 }, armB: { rot: 1.1 },
  }),
], 40, BOX, "ko");

const getup = clip({
  windup: [K(0, "easeIn", { hip: { y: 26, rot: 1.55 }, torso: { rot: 0.25 } }), K(1, "easeOut", { hip: { y: 16, rot: 0.7 }, torso: { rot: 0.45 } })],
  active: [K(0, "easeOut", { hip: { y: 10, rot: 0.3 } }), K(1, "easeOut", { hip: { y: 4, rot: 0 } })],
  recover: [K(0, "easeOut", { hip: { y: 2 } }), K(1, "easeInOut", {})],
}, { face: "angry" });

const ko = down;

const knee = loopClip([
  K(0, "sine", {
    hip: { y: 28 }, torso: { rot: 0.35 }, head: { rot: 0.15 },
    thighF: { rot: -0.25 }, shinF: { rot: 1.6 }, thighB: { rot: -1.25 }, shinB: { rot: 1.7 },
    armF: { rot: -0.9 }, armB: { rot: -0.9 },
  }),
  K(1, "sine", { hip: { y: 26 }, torso: { rot: 0.4 } }),
], 24, BOX, "angry");

// ---------------------------------------------------------------------------
// Sword
// ---------------------------------------------------------------------------
const slash = clip({
  windup: [
    K(0, "easeIn", {}),
    K(1, "easeOut", {
      hip: { y: 2, rot: 0.45 }, torso: { rot: 0.7 }, head: { rot: -0.2 },
      armF: { rot: 0.85 }, forearmF: { rot: -0.25 }, weapon: { rot: -0.2 },
      armB: { rot: -0.5 },
    }),
  ],
  active: [
    K(0, "punch", {
      hip: { rot: -0.5, x: 14 }, torso: { rot: -0.8 }, head: { rot: 0.15 },
      armF: { rot: -2.25 }, forearmF: { rot: -0.1 }, weapon: { rot: -0.25 },
    }),
    K(1, "easeOut", { hip: { rot: -0.6, x: 12 }, armF: { rot: -2.55 }, weapon: { rot: -0.3 } }),
  ],
  recover: [
    K(0, "easeOut", { armF: { rot: -1.6 }, weapon: { rot: -0.25 } }),
    K(1, "easeInOut", {}),
  ],
}, { rest: SWORD, face: "angry", contact: "blade" });

const slashOver = clip({
  windup: [
    K(0, "easeIn", {}),
    K(1, "easeOut", {
      hip: { y: 2, rot: 0.2 }, torso: { rot: 0.25 },
      armF: { rot: 1.4 }, forearmF: { rot: 0.25 }, weapon: { rot: -0.15 },
      head: { rot: -0.3 },
    }),
  ],
  active: [
    K(0, "punch", {
      hip: { x: 14, rot: -0.3 }, torso: { rot: -0.65 },
      armF: { rot: -2.45 }, forearmF: { rot: -0.2 }, weapon: { rot: -0.25 },
    }),
    K(1, "easeOut", { armF: { rot: -2.75 }, weapon: { rot: -0.3 } }),
  ],
  recover: [K(0, "easeOut", { armF: { rot: -1.5 } }), K(1, "easeInOut", {})],
}, { rest: SWORD, face: "angry", contact: "blade" });

const slashHoriz = slash;

const thrust = clip({
  windup: [
    K(0, "easeIn", {}),
    K(1, "easeOut", {
      hip: { y: 2, x: -8 }, torso: { rot: 0.2 },
      armF: { rot: -0.55 }, forearmF: { rot: -0.9 }, weapon: { rot: -0.15 },
      thighF: { rot: 0.25 },
    }),
  ],
  active: [
    K(0, "punch", {
      hip: { x: 24, y: 2 }, torso: { rot: -0.35 },
      armF: { rot: -1.6 }, forearmF: { rot: 0.05 }, weapon: { rot: -0.15 },
      thighF: { rot: -0.65 }, shinF: { rot: 0.1 },
    }),
    K(1, "easeOut", { hip: { x: 20 }, armF: { rot: -1.55 } }),
  ],
  recover: [K(0, "easeOut", { hip: { x: 8 } }), K(1, "easeInOut", {})],
}, { rest: SWORD, face: "angry", contact: "blade" });

const spin = clip({
  windup: [
    K(0, "easeIn", { hip: { rot: 0.25 } }),
    K(1, "easeOut", { hip: { rot: 1.15 }, torso: { rot: 0.5 }, armF: { rot: -0.3 }, weapon: { rot: -0.15 }, head: { rot: -0.25 } }),
  ],
  active: [
    K(0, "linear", { hip: { rot: -0.3, y: -4 }, armF: { rot: -2.15 }, weapon: { rot: -0.25 }, torso: { rot: -0.4 } }),
    K(0.5, "linear", { hip: { rot: -3.14 }, armF: { rot: -2.35 }, weapon: { rot: -0.25 } }),
    K(1, "easeOut", { hip: { rot: -6.2 }, armF: { rot: -1.7 }, weapon: { rot: -0.25 } }),
  ],
  recover: [K(0, "easeOut", { hip: { rot: 0.1 } }), K(1, "easeInOut", {})],
}, { rest: SWORD, face: "angry", contact: "blade" });

const special = slashOver;

const riposte = thrust;

// ---------------------------------------------------------------------------
const enter = clip({
  windup: [K(0, "easeOut", { hip: { y: -40 }, armF: { rot: 0.4 }, armB: { rot: 0.4 } }), K(1, "easeIn", { hip: { y: 4 } })],
  active: [K(0, "easeOut", { hip: { y: 2 } }), K(1, "linear", {})],
  recover: [K(0, "linear", {}), K(1, "easeInOut", {})],
}, { face: "normal" });

const celebrate = loopClip([
  K(0, "sine", { hip: { y: 0 }, armF: { rot: -2.6 }, armB: { rot: -2.4 }, head: { rot: -0.1 } }),
  K(0.5, "sine", { hip: { y: -8 }, armF: { rot: -2.9 }, armB: { rot: -2.7 } }),
  K(1, "sine", { hip: { y: 0 }, armF: { rot: -2.6 }, armB: { rot: -2.4 } }),
], 20, BOX, "normal");

export const CLIPS = {
  idle: idleBox,
  idle_box: idleBox,
  idle_sword: idleSword,
  walk, charge, dash,
  jab, flick, cross, hook, heavy, uppercut, gutPunch,
  sideKick, kick, sweep, roundhouse, hookKick, doubleKick, axeKick,
  block, parry, dodge, leanBack, slip: dodge, duck: dodge,
  hurt, hurtFold, launch, tumble, down, getup, ko, knee,
  slash, slashOver, slashHoriz, thrust, spin, special, riposte,
  enter, celebrate,
};

export function clipNameFor(fighter) {
  const st = fighter.state;
  const mv = fighter.move;
  if (st === "idle") return fighter.weapon === "sword" ? "idle_sword" : "idle_box";
  if (st === "walk") return "walk";
  if (st === "enter") return "enter";
  if (st === "celebrate") return "celebrate";
  if (st === "ko") return fighter.airborne ? "tumble" : "down";
  if (st === "hurt") {
    if (fighter.foldHit) return "hurtFold";
    if (fighter.airborne) return "launch";
    return "hurt";
  }
  if (st === "block") return fighter.weapon === "sword" ? "parry" : "block";
  if (st === "dodge") return fighter.dodgeStyle === "lean" ? "leanBack" : "dodge";
  if (st === "dash") return "charge";
  if (st === "getup") return "getup";
  if (st === "knee") return "knee";
  if (mv && CLIPS[mv]) return mv;
  if (st === "windup" || st === "active" || st === "recover") {
    if (mv && CLIPS[mv]) return mv;
  }
  return fighter.weapon === "sword" ? "idle_sword" : "idle_box";
}

export function poseFor(fighter) {
  const name = clipNameFor(fighter);
  const clip = CLIPS[name] || idleBox;
  const rest = clip.rest || (fighter.weapon === "sword" ? SWORD : BOX);

  if (clip.loop) {
    const dur = clip.duration || 24;
    const t = ((fighter.animTime || fighter.stateTime || 0) % dur) / dur;
    return evalKeys(clip.keys, t, rest);
  }

  const phase = fighter.state === "block" || fighter.state === "dodge" || fighter.state === "dash"
    ? phaseFromTimed(fighter, clip)
    : (fighter.state === "windup" ? "windup"
      : fighter.state === "active" ? "active"
      : fighter.state === "recover" ? "recover"
      : fighter.state === "hurt" ? "active"
      : fighter.state === "enter" ? "windup"
      : fighter.state === "getup" ? (fighter.stateTime < fighter.stateDur * 0.4 ? "windup" : fighter.stateTime < fighter.stateDur * 0.75 ? "active" : "recover")
      : "recover");

  const keys = clip.phases?.[phase] || clip.phases?.active || clip.keys;
  const t = fighter.stateDur > 0 ? fighter.stateTime / fighter.stateDur : 0;
  return evalKeys(keys, t, rest);
}

function phaseFromTimed(fighter, clip) {
  const t = fighter.stateDur > 0 ? fighter.stateTime / fighter.stateDur : 0;
  if (t < 0.12 && clip.phases?.windup) return "windup";
  if (t > 0.9 && clip.phases?.recover) return "recover";
  return "active";
}

export function faceFor(fighter, clip) {
  if (fighter.state === "ko") return "ko";
  if (fighter.state === "hurt" || fighter.airborne && fighter.state !== "idle") return "hurt";
  if (clip?.face) return clip.face;
  if (fighter.state === "windup" || fighter.state === "active") return "angry";
  return "normal";
}

export function contactKind(fighter) {
  const clip = CLIPS[clipNameFor(fighter)];
  return clip?.contact || (fighter.weapon === "sword" ? "blade" : "fist");
}
