/** 2D cutout skeletal rig (Spine/DragonBones-style) for chibi fighters. */

export const BONE_NAMES = [
  "root", "hip", "torso", "neck", "head", "hairBack",
  "shoulderF", "armF", "forearmF", "handF",
  "shoulderB", "armB", "forearmB", "handB",
  "thighF", "shinF", "footF",
  "thighB", "shinB", "footB",
  "weapon",
];

/** Rest offsets in a shared character space (pixels at scale=1).
 *  Hip is the origin. Y is down in canvas space. */
export const BIND = {
  hip:        { x: 0,   y: -36,  len: 0 },
  torso:      { x: 0,   y: -6,   len: 36 },
  neck:       { x: 0,   y: -34,  len: 6 },
  head:       { x: 0,   y: -6,   len: 40 },
  hairBack:   { x: 0,   y: -8,   len: 0 },
  shoulderF:  { x: 14,  y: -28,  len: 0 },
  armF:       { x: 0,   y: 0,    len: 22 },
  forearmF:   { x: 0,   y: 22,   len: 24 },
  handF:      { x: 0,   y: 22,   len: 8 },
  shoulderB:  { x: -13, y: -27,  len: 0 },
  armB:       { x: 0,   y: 0,    len: 22 },
  forearmB:   { x: 0,   y: 22,   len: 24 },
  handB:      { x: 0,   y: 22,   len: 8 },
  thighF:     { x: 7,   y: 2,    len: 22 },
  shinF:      { x: 0,   y: 22,   len: 24 },
  footF:      { x: 0,   y: 22,   len: 7 },
  thighB:     { x: -7,  y: 2,    len: 22 },
  shinB:      { x: 0,   y: 22,   len: 24 },
  footB:      { x: 0,   y: 22,   len: 7 },
  weapon:     { x: 0,   y: 2,    len: 64 },
};

export const PARENT = {
  hip: "root",
  torso: "hip",
  neck: "torso",
  head: "neck",
  hairBack: "head",
  shoulderF: "torso",
  armF: "shoulderF",
  forearmF: "armF",
  handF: "forearmF",
  shoulderB: "torso",
  armB: "shoulderB",
  forearmB: "armB",
  handB: "forearmB",
  thighF: "hip",
  shinF: "thighF",
  footF: "shinF",
  thighB: "hip",
  shinB: "thighB",
  footB: "shinB",
  weapon: "handF",
};

/** Draw order, back → front, for a character facing right (front = near camera). */
export const Z_ORDER = [
  // hairBack omitted: illustrated heads already include hair.
  "armB", "forearmB", "handB",
  "thighB", "shinB",
  "torso",
  "thighF", "shinF",
  "armF", "forearmF", "handF",
  "weapon",
  "head",
];

export function emptyPose() {
  const p = {};
  for (const n of BONE_NAMES) p[n] = { rot: 0, x: 0, y: 0 };
  return p;
}

/** Boxing guard rest pose. Facing right, rot 0 = down (limbs) or upright (torso/head). */
export function restBox() {
  const p = emptyPose();
  p.hip.y = 2;
  p.torso.rot = -0.08;
  p.head.rot = 0.04;
  // Front (near) arm = lead jab hand, held up
  p.armF.rot = -1.05;
  p.forearmF.rot = -0.85;
  p.handF.rot = -0.15;
  // Rear arm guard
  p.armB.rot = -0.7;
  p.forearmB.rot = -1.15;
  p.handB.rot = -0.1;
  // Lead foot slightly forward
  p.thighF.rot = -0.22;
  p.shinF.rot = 0.18;
  p.thighB.rot = 0.28;
  p.shinB.rot = -0.08;
  p.weapon.rot = -0.4;
  return p;
}

export function restSword() {
  const p = restBox();
  p.armF.rot = -1.25;
  p.forearmF.rot = -0.35;
  p.handF.rot = 0.15;
  p.weapon.rot = -0.25;
  p.armB.rot = -0.55;
  p.forearmB.rot = -0.7;
  p.torso.rot = -0.05;
  return p;
}

export function mergePose(base, over) {
  const out = {};
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(over || {})]);
  for (const k of keys) {
    const a = base?.[k] || {};
    const b = over?.[k] || {};
    out[k] = {
      rot: b.rot != null ? b.rot : (a.rot || 0),
      x: b.x != null ? b.x : (a.x || 0),
      y: b.y != null ? b.y : (a.y || 0),
      sy: b.sy != null ? b.sy : (a.sy != null ? a.sy : 1),
    };
  }
  return out;
}

export function lerpPose(a, b, t) {
  const out = {};
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  const u = Math.max(0, Math.min(1, t));
  for (const k of keys) {
    const A = a?.[k] || {};
    const B = b?.[k] || {};
    out[k] = {
      rot: (A.rot || 0) + ((B.rot || 0) - (A.rot || 0)) * u,
      x: (A.x || 0) + ((B.x || 0) - (A.x || 0)) * u,
      y: (A.y || 0) + ((B.y || 0) - (A.y || 0)) * u,
      sy: (A.sy != null ? A.sy : 1) + (((B.sy != null ? B.sy : 1) - (A.sy != null ? A.sy : 1)) * u),
    };
  }
  return out;
}

export function ease(t, name = "linear") {
  const x = Math.max(0, Math.min(1, t));
  if (name === "easeIn") return x * x;
  if (name === "easeOut") return 1 - (1 - x) * (1 - x);
  if (name === "easeInOut" || name === "smooth") return x * x * (3 - 2 * x);
  if (name === "sine") return 0.5 - 0.5 * Math.cos(x * Math.PI);
  if (name === "punch") {
    // Overshoot a little past 1 then settle.
    const c = 1.7;
    return 1 + (2.70158 * c + 1.5) * (x - 1) ** 3 + 2.70158 * c * (x - 1) ** 2;
  }
  if (name === "snap") return x < 0.2 ? x * 0.3 : 0.06 + (x - 0.2) * 1.175;
  return x;
}

/** Interpolate a list of {t, ease, pose} keys, t in [0,1]. */
export function evalKeys(keys, t, rest) {
  if (!keys || !keys.length) return rest || emptyPose();
  const list = keys;
  if (t <= list[0].t) return mergePose(rest, list[0].pose);
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i];
    const b = list[i + 1];
    if (t <= b.t || i === list.length - 2) {
      const span = Math.max(1e-4, b.t - a.t);
      const u = ease((t - a.t) / span, b.ease || a.ease || "easeInOut");
      return lerpPose(mergePose(rest, a.pose), mergePose(rest, b.pose), u);
    }
  }
  return mergePose(rest, list[list.length - 1].pose);
}

/**
 * Solve world transforms. `facing` is +1 (right) or -1 (left).
 * Returns a map of bone -> {x, y, rot, sx, sy}.
 */
export function solve(pose, facing = 1, scale = 1, originX = 0, originY = 0) {
  const world = {};
  const f = facing >= 0 ? 1 : -1;
  world.root = { x: originX, y: originY, rot: 0, sx: f * scale, sy: scale };

  const order = [
    "hip", "torso", "neck", "head", "hairBack",
    "shoulderF", "armF", "forearmF", "handF",
    "shoulderB", "armB", "forearmB", "handB",
    "thighF", "shinF", "footF",
    "thighB", "shinB", "footB",
    "weapon",
  ];

  for (const name of order) {
    const parName = PARENT[name];
    const par = world[parName] || world.root;
    const bind = BIND[name] || { x: 0, y: 0 };
    const p = pose[name] || { rot: 0, x: 0, y: 0 };
    const lx = (bind.x + (p.x || 0));
    const ly = (bind.y + (p.y || 0));
    const c = Math.cos(par.rot);
    const s = Math.sin(par.rot);
    // Parent sx may be negative (facing). Apply local in parent space.
    const px = lx * (par.sx < 0 ? -1 : 1);
    world[name] = {
      x: par.x + (px * c - ly * s) * Math.abs(par.sx) / (Math.abs(par.sx) || 1) * Math.abs(par.sx),
      y: par.y + (px * s + ly * c) * Math.abs(par.sy),
      rot: par.rot + (p.rot || 0) * (par.sx < 0 ? -1 : 1),
      sx: par.sx,
      sy: par.sy,
    };
    // Simpler, more correct: transform using parent scale signs.
    const sx = par.sx, sy = par.sy;
    world[name].x = par.x + (lx * sx * Math.cos(par.rot) / Math.sign(sx || 1) * Math.sign(sx || 1));
  }

  // Redo with a clean matrix to avoid the messy first pass.
  const clean = {};
  clean.root = { x: originX, y: originY, rot: 0, sx: f * scale, sy: scale };
  function apply(name) {
    const parName = PARENT[name] || "root";
    const par = clean[parName] || clean.root;
    const bind = BIND[name] || { x: 0, y: 0 };
    const p = pose[name] || { rot: 0, x: 0, y: 0 };
    const lx = bind.x + (p.x || 0);
    const ly = bind.y + (p.y || 0);
    const c = Math.cos(par.rot);
    const s = Math.sin(par.rot);
    // Local x is mirrored when facing left so "forward" stays toward the opponent.
    const mx = lx * Math.sign(par.sx || 1);
    const my = ly;
    const localSy = p.sy != null ? p.sy : 1;
    const magx = Math.abs(par.sx);
    const magy = Math.abs(par.sy);
    clean[name] = {
      x: par.x + (mx * c - my * s) * magx,
      y: par.y + (mx * s + my * c) * magy,
      rot: par.rot + (p.rot || 0) * Math.sign(par.sx || 1),
      sx: par.sx,
      sy: par.sy * localSy,
    };
  }
  for (const name of order) apply(name);
  return clean;
}

export function tip(world, bone, length) {
  const b = world[bone];
  if (!b) return { x: 0, y: 0 };
  const len = length != null ? length : (BIND[bone]?.len || 16);
  return {
    x: b.x + Math.sin(b.rot) * len * Math.abs(b.sx) * Math.sign(b.sx || 1) * 0
      + Math.cos(b.rot - Math.PI / 2) * len * Math.abs(b.sy),
    y: b.y + Math.sin(b.rot - 0) * 0 + Math.sin(b.rot + Math.PI / 2) * 0
      + Math.sin(b.rot) * len * Math.abs(b.sy),
  };
}

/** A point `len` pixels along the bone's natural "down" axis (the part's +y). */
export function along(world, bone, len) {
  const b = world[bone];
  if (!b) return { x: 0, y: 0 };
  // Part extends along the local +y of the bone, which after rotation is
  // (sin(rot), cos(rot)) wait: rot=0 should go down, i.e. +y.
  // x' = 0*cos - y*sin = 0, y' = 0*sin + y*cos = y. That's only if rot is
  // around a y-down identity... ctx.rotate(rot): x' = x cos - y sin, y' = x sin + y cos.
  // Local (0, len): x' = -len sin(rot), y' = len cos(rot).
  // rot=0 → (0, len) down. rot=-PI/2 → (len, 0) to the right. Yes.
  const s = Math.abs(b.sy);
  return {
    x: b.x + (-Math.sin(b.rot)) * len * s,
    y: b.y + (Math.cos(b.rot)) * len * s,
  };
}

export function contactPoint(world, kind = "fist") {
  if (kind === "sword" || kind === "blade") return along(world, "weapon", BIND.weapon.len);
  if (kind === "foot" || kind === "kick") return along(world, "shinF", BIND.shinF.len + 6);
  if (kind === "fistB") return along(world, "forearmB", BIND.forearmB.len + 6);
  return along(world, "forearmF", BIND.forearmF.len + 6);
}

/**
 * Draw every cutout part. `images` is {head, hairBack, torso, armU, armF, thigh, shin, glove, sword}.
 * `prevWorld` (optional) is last frame's solve() for motion smears.
 */
export function drawRig(ctx, world, images, {
  expression = "normal",
  weapon = "gloves",
  swordTier = 1,
  smearWorlds = [],
  hue = 0,
  ghost = false,
  scale = 1,
} = {}) {
  const partFor = {
    hairBack: images.hairBack,
    torso: images.torso,
    armF: images.armU,
    forearmF: images.armF,
    armB: images.armU,
    forearmB: images.armF,
    thighF: images.thigh,
    shinF: images.shin,
    thighB: images.thigh,
    shinB: images.shin,
    head: images[`head_${expression}`] || images.head_normal || images.head,
  };

  const pivots = images.pivots || {};
  function pivot(name, img) {
    const key = name.startsWith("head") ? (images.exprKey || "head_normal") : (
      name === "forearmF" || name === "forearmB" ? "armF" :
      name === "armF" || name === "armB" ? "armU" :
      name === "thighF" || name === "thighB" ? "thigh" :
      name === "shinF" || name === "shinB" ? "shin" :
      name
    );
    const p = pivots[key] || pivots[name];
    if (p) return p;
    if (!img) return { x: 0, y: 0 };
    if (name === "torso") return { x: img.naturalWidth / 2, y: img.naturalHeight * 0.88 };
    if (name.startsWith("head") || name === "hairBack") {
      return { x: img.naturalWidth / 2, y: img.naturalHeight * 0.82 };
    }
    return { x: img.naturalWidth / 2, y: img.naturalHeight * 0.12 };
  }

  function drawPart(name, wld, alpha = 1) {
    if (name === "handF" || name === "handB" || name === "footF" || name === "footB") return;
    if (name === "weapon") return;
    const img = partFor[name];
    if (!img || !img.complete || !img.naturalWidth) return;
    const b = wld[name] || world[name];
    if (!b) return;
    const pv = pivot(name, img);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.scale(Math.sign(b.sx || 1), 1);
    const s = Math.abs(b.sy) * partScale(name, img);
    ctx.scale(s, s);
    ctx.drawImage(img, -pv.x, -pv.y);
    ctx.restore();
  }

  function partScale(name, img) {
    const pv = pivot(name, img);
    const bind = BIND[name] || BIND.armF;
    if (name === "head" || name === "hairBack") {
      // Chibi head should be about 52px tall at scale=1 (pivot near the neck).
      const above = Math.max(20, pv.y);
      return 54 / above;
    }
    if (name === "torso") {
      const above = Math.max(20, pv.y);
      return 38 / above;
    }
    // Limbs: distance from pivot to the far end of the art == bind length.
    const ext = Math.max(8, img.naturalHeight - pv.y);
    return (bind.len || 18) / ext;
  }

  // Motion smears — ghost copies of fast limbs only, behind the live pose.
  if (smearWorlds && smearWorlds.length) {
    const smearParts = ["armF", "forearmF", "armB", "forearmB", "thighF", "shinF", "weapon"];
    for (let i = 0; i < smearWorlds.length; i++) {
      const sw = smearWorlds[i];
      const a = 0.12 + 0.1 * (i / smearWorlds.length);
      ctx.save();
      ctx.globalAlpha = a;
      for (const n of smearParts) {
        if (n === "weapon") {
          drawWeapon(ctx, sw, images, weapon, swordTier, 1);
        } else {
          drawPart(n, sw, 1);
        }
      }
      ctx.restore();
    }
  }

  ctx.save();
  if (hue) ctx.filter = `hue-rotate(${hue}deg)`;
  if (ghost) ctx.globalAlpha *= 0.45;

  for (const name of Z_ORDER) {
    if (name === "weapon") {
      if (weapon === "sword") drawWeapon(ctx, world, images, weapon, swordTier, 1);
      else drawGloves(ctx, world, images);
      continue;
    }
    if (name === "handF" || name === "handB") {
      if (weapon === "gloves") continue;
      continue;
    }
    drawPart(name, world, 1);
  }
  ctx.filter = "none";
  ctx.restore();
}

function drawGloves(ctx, world, images) {
  const img = images.glove;
  if (!img || !img.complete || !img.naturalWidth) return;
  for (const hand of ["forearmF", "forearmB"]) {
    const tipP = along(world, hand, BIND[hand].len);
    const b = world[hand];
    if (!b) continue;
    const s = Math.abs(b.sy) * 0.42;
    ctx.save();
    ctx.translate(tipP.x, tipP.y);
    ctx.rotate(b.rot);
    ctx.scale(Math.sign(b.sx || 1) * s, s);
    ctx.drawImage(img, -img.naturalWidth * 0.5, -img.naturalHeight * 0.45);
    ctx.restore();
  }
}

function drawWeapon(ctx, world, images, weapon, tier, alpha) {
  const img = (tier >= 2 && images.swordOrnate) ? images.swordOrnate : images.sword;
  if (!img || !img.complete || !img.naturalWidth) return;
  const b = world.weapon || world.handF || world.forearmF;
  if (!b) return;
  // The art is a vertical blade, pommel at the top, crossguard ~y=42/160,
  // tip at the bottom — the same local +y the bone uses (rot 0 = down).
  const pvY = img.naturalHeight * 0.26;
  const ext = Math.max(8, img.naturalHeight - pvY);
  const s = Math.abs(b.sy) * ((BIND.weapon.len || 64) / ext);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(b.x, b.y);
  ctx.rotate(b.rot);
  ctx.scale(Math.sign(b.sx || 1) * s, s);
  ctx.shadowColor = "rgba(255, 230, 140, 0.75)";
  ctx.shadowBlur = 14;
  ctx.drawImage(img, -img.naturalWidth * 0.5, -pvY);
  ctx.restore();
}

export function cloneWorld(w) {
  const o = {};
  for (const k of Object.keys(w || {})) {
    const b = w[k];
    o[k] = { x: b.x, y: b.y, rot: b.rot, sx: b.sx, sy: b.sy };
  }
  return o;
}
