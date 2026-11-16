/** Whole-body pose + multi-frame clip playback (24fps-style holds on 60Hz). */
import { STATE, isSword } from "./combat.js";
import { clipFramesFor } from "./sprites.js";

export const POSE_STAND_H = 220;

const MOVE_POSE = {
  jab: { windup: "stance_a", active: "jab", recover: "stance_a" },
  flick: { windup: "stance_a", active: "jab", recover: "stance_a" },
  cross: { windup: "stance_b", active: "punch", recover: "stance_a" },
  hook: { windup: "stance_b", active: "punch", recover: "stance_a" },
  heavy: { windup: "stance_a", active: "punch", recover: "stance_a" },
  uppercut: { windup: "stance_b", active: "punch", recover: "stance_a" },
  gutPunch: { windup: "stance_b", active: "punch", recover: "stance_a" },
  sideKick: { windup: "stance_b", active: "jumpkick", recover: "stance_a" },
  kick: { windup: "stance_b", active: "highkick", recover: "stance_a" },
  sweep: { windup: "leanback", active: "highkick", recover: "stance_a" },
  roundhouse: { windup: "stance_b", active: "highkick", recover: "stance_a" },
  hookKick: { windup: "stance_b", active: "highkick", recover: "stance_a" },
  doubleKick: { windup: "jumpkick", active: "jumpkick", recover: "stance_a" },
  axeKick: { windup: "jumpkick", active: "highkick", recover: "stance_a" },
  slash: { windup: "sword_stance", active: "sword_slash", recover: "sword_stance" },
  slashOver: { windup: "sword_stance", active: "sword_slash", recover: "sword_stance" },
  slashHoriz: { windup: "sword_stance", active: "sword_slash", recover: "sword_stance" },
  spin: { windup: "sword_stance", active: "sword_slash", recover: "sword_stance" },
  special: { windup: "sword_stance", active: "sword_slash", recover: "sword_stance" },
  thrust: { windup: "sword_stance", active: "sword_thrust", recover: "sword_stance" },
  riposte: { windup: "sword_stance", active: "sword_thrust", recover: "sword_stance" },
  charge: { windup: "dash", active: "dash", recover: "dash" },
};

const MOVE_CLIP = {
  jab: "jab", flick: "jab",
  cross: "cross", heavy: "cross", gutPunch: "cross",
  hook: "hook",
  uppercut: "uppercut",
  kick: "highkick", sweep: "highkick", hookKick: "highkick",
  roundhouse: "roundhouse", axeKick: "roundhouse",
  sideKick: "jumpkick", doubleKick: "jumpkick",
  slash: "sword_slash", slashOver: "sword_slash", slashHoriz: "sword_slash",
  spin: "sword_slash", special: "sword_slash",
  thrust: "sword_thrust", riposte: "sword_thrust",
};

/** Tick holds at 60Hz (~2–3 ticks/frame, longer impact hold). */
export const CLIP_HOLDS = {
  // Relative weights. Impact is index 3. Windup/recover map onto these by state.
  jab: [6, 6, 6, 14, 6, 6],
  cross: [7, 7, 6, 14, 7, 6],
  hook: [7, 8, 7, 14, 6, 6],
  uppercut: [7, 8, 7, 16, 7, 6],
  highkick: [8, 8, 8, 16, 6, 6],
  roundhouse: [8, 8, 8, 16, 6, 6],
  jumpkick: [7, 8, 7, 16, 6, 7],
  block: [4, 6, 14, 8, 6],
  react: [2, 8, 6, 6, 12, 20],
  sword_slash: [8, 8, 8, 14, 7, 6],
  sword_thrust: [8, 9, 9, 14, 7, 6],
};

export function clipIdFor(fighter) {
  const st = fighter.state;
  if (st === STATE.BLOCK || st === "block" || st === "parry") {
    return isSword(fighter) ? null : "block";
  }
  if (st === STATE.HURT || st === "hurt" || st === STATE.KO || st === "ko" || st === "down" || st === "getup" || st === "knee") {
    return "react";
  }
  if (st === STATE.WINDUP || st === STATE.ACTIVE || st === STATE.RECOVER) {
    return MOVE_CLIP[fighter.move] || null;
  }
  return null;
}

export function advanceClip(fighter) {
  const id = clipIdFor(fighter);
  if (fighter._clipId !== id) {
    fighter._clipId = id;
    fighter.clipTime = 0;
  } else {
    fighter.clipTime = (fighter.clipTime || 0) + 1;
  }
}

export function clipIndexFor(fighter, nFrames) {
  const id = clipIdFor(fighter);
  if (!id || !nFrames) return 0;
  const last = nFrames - 1;
  if (id === "react") {
    if (fighter.state === STATE.KO || fighter.state === "ko" || fighter.state === "down") {
      if (fighter.airborne) return Math.min(4, last);
      return last;
    }
    if (fighter.state === "getup" || fighter.state === "knee") return Math.min(2, last);
    const style = fighter.reactStyle || (fighter.foldHit || fighter.airborne ? "fold" : "head");
    const t = fighter.stateTime || 0;
    if (style === "fold" || fighter.foldHit || fighter.airborne) {
      if (t < 3) return Math.min(2, last);
      if (t < 12) return Math.min(3, last);
      return Math.min(4, last);
    }
    // Head snap / stagger: jump straight to the wince on the contact frame.
    if (t < 10) return Math.min(1, last);
    return Math.min(2, last);
  }
  if (id === "block") {
    const t = fighter.stateTime || 0;
    if ((fighter.blockRecoil || 0) > 0 || t < 4) return Math.min(2, last);
    if (t < 10) return Math.min(3, last);
    return Math.min(last, 4);
  }
  let holds = (CLIP_HOLDS[id] || []).slice(0, nFrames);
  while (holds.length < nFrames) holds.push(4);
  const impact = Math.min(nFrames - 1, 3);
  const st = fighter.state;
  if (st === STATE.WINDUP) {
    const dur = Math.max(1, fighter.stateDur || 18);
    const u = Math.max(0, Math.min(0.999, (fighter.stateTime || 0) / dur));
    const preSum = holds.slice(0, impact).reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    const target = u * preSum;
    for (let i = 0; i < impact; i++) {
      acc += holds[i];
      if (target < acc) return i;
    }
    return Math.max(0, impact - 1);
  }
  if (st === STATE.ACTIVE) return impact;
  const dur = Math.max(1, fighter.stateDur || 16);
  const u = (fighter.stateTime || 0) / dur;
  if (u < 0.55) return impact;
  const post = [];
  for (let i = impact + 1; i < holds.length; i++) post.push(i);
  if (!post.length) return impact;
  const v = (u - 0.55) / 0.45;
  return post[Math.min(post.length - 1, Math.floor(v * post.length))];
}

/** Current clip cell to draw, or null to fall back to a 16-pose still. */
export function activeClipCell(fighter) {
  const id = clipIdFor(fighter);
  if (!id) return null;
  const pack = clipFramesFor(fighter.spriteKey, id);
  if (!pack) return null;
  const i = clipIndexFor(fighter, pack.frames.length);
  return { img: pack.img, frame: pack.frames[i], hue: pack.hue, clipId: id, index: i };
}

export function poseNameFor(fighter) {
  if (fighter.poseOverride) return fighter.poseOverride;
  const st = fighter.state;
  const mv = fighter.move;
  if (st === STATE.WINDUP || st === STATE.ACTIVE || st === STATE.RECOVER) {
    const plan = MOVE_POSE[mv];
    if (plan) {
      if (st === STATE.WINDUP) return armedIdle(fighter, plan.windup);
      if (st === STATE.ACTIVE) return plan.active;
      const dur = Math.max(1, fighter.stateDur || 8);
      if ((fighter.stateTime || 0) < Math.max(10, dur * 0.75)) return plan.active;
      return armedIdle(fighter, plan.recover);
    }
  }
  if (st === STATE.IDLE || st === "idle") {
    if (isSword(fighter)) return "sword_stance";
    return idleBounce(fighter);
  }
  if (st === "walk" || st === "dash" || st === "enter") return "dash";
  if (st === STATE.BLOCK || st === "block" || st === "parry") {
    return isSword(fighter) ? "sword_stance" : "block";
  }
  if (st === STATE.DODGE || st === "dodge" || st === "leanBack") return "leanback";
  if (st === STATE.HURT || st === "hurt") {
    if (fighter.foldHit || fighter.airborne) return "launch";
    return "hurt";
  }
  if (st === STATE.KO || st === "ko" || st === "down") {
    return fighter.airborne ? "launch" : "ko";
  }
  if (st === "getup" || st === "knee") return "hurt";
  if (st === "celebrate" || st === "victory") return "victory";
  if (isSword(fighter)) return "sword_stance";
  return "stance_a";
}

function armedIdle(fighter, name) {
  if (isSword(fighter) && (name === "stance_a" || name === "stance_b" || name === "block")) {
    return "sword_stance";
  }
  return name;
}

function idleBounce(f) {
  const t = f.animTime || 0;
  return (Math.floor(t / 18) % 2 === 0) ? "stance_a" : "stance_b";
}

/** Subtle whole-sprite squash/stretch, foot-anchored. Never splits the body. */
export function squashFor(fighter) {
  if (activeClipCell(fighter)) return { sx: 1, sy: 1 };
  const st = fighter.state;
  const dur = Math.max(1, fighter.stateDur || fighter.stateDuration || 8);
  const t = Math.max(0, Math.min(1, (fighter.stateTime || 0) / dur));
  if (st === STATE.WINDUP) {
    const k = 0.5 - 0.5 * Math.cos(t * Math.PI);
    return { sx: 1 - 0.07 * k, sy: 1 + 0.09 * k };
  }
  if (st === STATE.ACTIVE && t < 0.4) {
    const k = 1 - t / 0.4;
    return { sx: 1 + 0.08 * k, sy: 1 - 0.07 * k };
  }
  if (st === STATE.HURT && t < 0.5) {
    return { sx: 1.05, sy: 0.95 };
  }
  return { sx: 1, sy: 1 };
}

export function snapshotFrame(fighter, pose, size, squash) {
  return {
    x: fighter.x,
    y: fighter.y,
    facing: fighter.facing,
    pose,
    size,
    sx: squash?.sx || 1,
    sy: squash?.sy || 1,
    spriteKey: fighter.spriteKey,
    hue: fighter.spriteHue || 0,
  };
}
