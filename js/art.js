import { ARENA, formatHp, CONFIG } from "./config.js";
import { STATE, isSword } from "./combat.js";
import { spritesReady, poseFrame, images } from "./sprites.js";
import { poseNameFor, squashFor, snapshotFrame, POSE_STAND_H, activeClipCell } from "./frames.js";

const BODY_H = 118;
// Packed standing height is ~220px in a 300px cell with ground at 262.
const DRAW_PX = 144;

export function fighterDrawScale(fighter, { featured = false } = {}) {
  // One consistent size for every row. Featured zoom is not used in the live arena.
  const size = (fighter.scale || 1) * (featured ? 1.04 : 1);
  return { size, draw: size * (DRAW_PX / POSE_STAND_H) };
}

function frameNormScale(fighter, fr) {
  if (!fr) return 1;
  const body = (fr.footY ?? fr.ay ?? 262) - (fr.topY ?? 40);
  if (fighter._standBody == null) {
    const idle = poseFrame(fighter, "stance_a")?.fr;
    fighter._standBody = idle
      ? ((idle.footY ?? idle.ay ?? 262) - (idle.topY ?? 40))
      : 220;
  }
  const stand = fighter._standBody || 220;
  // Airborne / KO / crouched poses keep the character's standing scale (don't stretch a lying body).
  if (body < stand * 0.82) return POSE_STAND_H / Math.max(160, stand);
  return POSE_STAND_H / Math.max(160, body);
}

function poseAnchorY(fighter, fr) {
  if (!fr) return 262;
  if (fighter.airborne && fr.footY != null) return fr.footY;
  return fr.ay;
}

function applyHue(ctx, hue) {
  if (hue) ctx.filter = `hue-rotate(${hue}deg) saturate(1.05)`;
  else ctx.filter = "none";
}

export function drawPoseSprite(ctx, fighter, pose, sizeInfo, squash, { ghost = false, alpha = 1, cell = null } = {}) {
  const pack = cell || poseFrame(fighter, pose);
  const img = pack.img;
  const fr = pack.frame || pack.fr;
  if (!img || !fr || !spritesReady) {
    ctx.save();
    ctx.fillStyle = ghost ? "rgba(255,255,255,0.4)" : "#fff";
    ctx.strokeStyle = "#2a1a14";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y - 70 * sizeInfo.size, 28 * sizeInfo.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return null;
  }
  const ax = fr.ax;
  const ay = poseAnchorY(fighter, fr);
  const sx = (squash?.sx || 1);
  const sy = (squash?.sy || 1);
  const nrm = frameNormScale(fighter, fr);
  const s = sizeInfo.draw * nrm;
  fighter._normS = s;
  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.scale(fighter.facing * s * sx, s * sy);
  ctx.globalAlpha = alpha;
  const hue = (cell && cell.hue != null) ? cell.hue : (fighter.spriteHue || 0);
  if (!ghost) applyHue(ctx, hue);
  else {
    applyHue(ctx, fighter.spriteHue || 0);
    ctx.filter = (ctx.filter === "none" ? "" : ctx.filter + " ") + "brightness(1.3) saturate(0.6)";
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, fr.x, fr.y, fr.w, fr.h, -ax, -ay, fr.w, fr.h);
  if (!ghost && (fighter.flash || 0) > 0) {
    ctx.globalAlpha = Math.min(0.55, 0.18 + fighter.flash * 0.05);
    ctx.filter = "brightness(2.4) saturate(0.35)";
    ctx.drawImage(img, fr.x, fr.y, fr.w, fr.h, -ax, -ay, fr.w, fr.h);
  }
  ctx.restore();
  // World-space contact + visible top of the sticker (not the empty cell)
  const topY = (fr.topY != null) ? fr.topY : Math.max(0, ay - 220);
  const top = fighter.y + (topY - ay) * s * sy;
  const contact = worldContact(fighter, fr, s, sx, sy, ay);
  return { top, contact, fr, ax, ay, s };
}

function worldContact(fighter, fr, s, sx, sy, ay) {
  const ax = fr.ax;
  const lx = (fr.cx - ax) * sx;
  const ly = (fr.cy - ay) * sy;
  return {
    x: fighter.x + fighter.facing * lx * s,
    y: fighter.y + ly * s,
  };
}

export function drawFighter(ctx, fighter, { featured = false } = {}) {
  const sizeInfo = fighterDrawScale(fighter, { featured });
  const size = sizeInfo.size;
  const pose = poseNameFor(fighter);
  const squash = squashFor(fighter);
  const cell = activeClipCell(fighter);
  fighter.poseName = pose;
  fighter.drawSize = size;
  fighter._drawS = sizeInfo.draw;
  fighter._clipCell = cell;

  const frNow = cell ? cell.frame : poseFrame(fighter, pose).fr;
  const contactKindGuess = (cell && (cell.clipId || "").includes("sword")) || (pose && pose.includes("sword"))
    ? "blade"
    : ((pose || "").includes("kick") || (cell && (cell.clipId || "").includes("kick")) ? "kick" : "fist");
  if (frNow) {
    fighter.frameContact = worldContact(
      fighter,
      frNow,
      sizeInfo.draw,
      squash.sx,
      squash.sy,
      poseAnchorY(fighter, frNow),
    );
    fighter.frameContactKind = frNow.kind || contactKindGuess;
  }

  if (!fighter.smearBuf) fighter.smearBuf = [];
  const swinging = fighter.state === STATE.ACTIVE
    || fighter.state === STATE.DASH
    || fighter.state === "dash"
    || fighter.move === "spin"
    || fighter.move === "slash"
    || fighter.move === "slashOver"
    || fighter.move === "charge";
  if (swinging) {
    fighter.smearBuf.push(snapshotFrame(fighter, pose, sizeInfo, squash));
    if (fighter.smearBuf.length > 6) fighter.smearBuf.shift();
  } else if (fighter.smearBuf.length) {
    fighter.smearBuf.shift();
  }

  ctx.save();

  // Ground shadow
  const shadowW = 28 * size + (fighter.airborne ? 8 : 0);
  const shadowY = fighter.groundY != null ? fighter.groundY : fighter.y;
  ctx.save();
  ctx.translate(fighter.x, shadowY);
  ctx.scale(1, 0.28);
  ctx.fillStyle = `rgba(30, 16, 12, ${fighter.airborne ? 0.18 : 0.32})`;
  ctx.beginPath();
  ctx.arc(0, 0, shadowW, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Team / gift aura
  const aura = Math.max(fighter.auraT || 0, (fighter.coins || 0) >= CONFIG.combat.glowCoins ? 20 : 0);
  if (aura > 0) {
    const col = CONFIG.teams[fighter.team]?.color || "#fff";
    const a = 0.18 + 0.12 * Math.sin((fighter.animTime || 0) * 0.2);
    const g = ctx.createRadialGradient(fighter.x, fighter.y - 50 * size, 8, fighter.x, fighter.y - 40 * size, 70 * size);
    const glow = hexAlpha(col, a);
    g.addColorStop(0, col + "00");
    g.addColorStop(0.4, glow);
    g.addColorStop(1, hexAlpha(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(fighter.x, fighter.y - 40 * size, 48 * size, 70 * size, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Afterimages (comeback dash / gifted sword)
  if ((fighter.afterimageT || 0) > 0 && fighter.afterBuf && fighter.afterBuf.length) {
    for (let i = 0; i < fighter.afterBuf.length; i++) {
      const snap = fighter.afterBuf[i];
      const ghostF = Object.assign({}, fighter, {
        x: snap.x, y: snap.y, facing: snap.facing, spriteKey: snap.spriteKey, spriteHue: snap.hue,
      });
      drawPoseSprite(ctx, ghostF, snap.pose, snap.size, { sx: snap.sx, sy: snap.sy }, {
        ghost: true,
        alpha: 0.16 + 0.1 * (i / fighter.afterBuf.length),
      });
    }
  }

  // Motion smear: faded copies of the swinging pose, slightly trailing
  if (fighter.smearBuf && fighter.smearBuf.length) {
    for (let i = 0; i < fighter.smearBuf.length; i++) {
      const snap = fighter.smearBuf[i];
      const ghostF = Object.assign({}, fighter, {
        x: snap.x - fighter.facing * (fighter.smearBuf.length - i) * 10,
        y: snap.y,
        facing: snap.facing,
        spriteKey: snap.spriteKey,
        spriteHue: snap.hue,
      });
      drawPoseSprite(ctx, ghostF, snap.pose, snap.size, { sx: snap.sx, sy: snap.sy }, {
        ghost: true,
        alpha: 0.08 + 0.07 * (i / fighter.smearBuf.length),
      });
    }
  }

  const drawn = drawPoseSprite(ctx, fighter, pose, sizeInfo, squash, { alpha: 1, cell });
  fighter.spriteTop = drawn ? drawn.top : fighter.y - BODY_H * size;

  // Gifted swords stay visible on glove hurt / launch / KO when no sword react clip exists.
  if (isSword(fighter) && shouldOverlaySword(fighter, cell, pose)) {
    drawSwordOverlay(ctx, fighter, sizeInfo, squash);
  }

  // Upgrade sparkle burst
  if (fighter.upgradeT > 0) drawUpgradeBurst(ctx, fighter, size);

  // Crown for big gifters
  if (fighter.crown) {
    const hx = fighter.x;
    const hy = (fighter.spriteTop || fighter.y - 110 * size) - 16 * size;
    drawCrown(ctx, hx, hy, 14 * size);
  }

  ctx.restore();

  if (fighter.state === STATE.KO) {
    drawKoStars(ctx, fighter, size);
  }

  // Track afterimages
  if ((fighter.afterimageT || 0) > 0) {
    if (!fighter.afterBuf) fighter.afterBuf = [];
    fighter.afterBuf.push(snapshotFrame(fighter, pose, sizeInfo, squash));
    if (fighter.afterBuf.length > 5) fighter.afterBuf.shift();
  } else if (fighter.afterBuf && fighter.afterBuf.length) {
    fighter.afterBuf.shift();
  }

  fighter.animTime = (fighter.animTime || 0) + 1;
}

function hexAlpha(hex, a) {
  const raw = String(hex || "#fff").replace("#", "");
  const n = parseInt(raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function drawCrown(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#f6d056";
  ctx.strokeStyle = "#7a4e00";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.5);
  ctx.lineTo(-r, -r * 0.1);
  ctx.lineTo(-r * 0.5, r * 0.25);
  ctx.lineTo(0, -r * 0.7);
  ctx.lineTo(r * 0.5, r * 0.25);
  ctx.lineTo(r, -r * 0.1);
  ctx.lineTo(r, r * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawUpgradeBurst(ctx, fighter, size) {
  const t = fighter.upgradeT / 48;
  ctx.save();
  ctx.translate(fighter.x, fighter.y - 60 * size);
  ctx.globalAlpha = Math.max(0, t);
  ctx.strokeStyle = "#ffe08a";
  ctx.lineWidth = 3;
  const rad = (1 - t) * 50 * size + 20;
  ctx.beginPath();
  ctx.arc(0, 0, rad, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t * 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * rad * 0.7, Math.sin(a) * rad * 0.7);
    ctx.lineTo(Math.cos(a) * rad * 1.3, Math.sin(a) * rad * 1.3);
    ctx.stroke();
  }
  ctx.restore();
}

function roundedRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export const PLATE_W = 132;
export const PLATE_H = 50;

export function layoutNameplates(fighters) {
  const plates = [];
  for (const f of fighters) {
    if (f.dead && f.state !== "ko") continue;
    const top = f.spriteTop != null ? f.spriteTop : f.y - 144;
    // Just above this fighter's head — never up in the row behind.
    plates.push({ f, x: f.x, y: top - PLATE_H / 2 - 10, w: PLATE_W, h: PLATE_H });
  }
  for (const p of plates) {
    for (const o of fighters) {
      if (o === p.f || (o.dead && o.state !== "ko")) continue;
      if (o.y >= p.f.y - 24) continue; // only the row behind (smaller y)
      if (Math.abs((o.x || 0) - p.x) > 110) continue;
      const feet = o.y + 2;
      const plateTop = p.y - p.h / 2;
      if (plateTop < feet + 8) p.y = feet + 8 + p.h / 2;
    }
  }
  plates.sort((a, b) => a.y - b.y || a.x - b.x);
  for (let i = 0; i < plates.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = plates[i], b = plates[j];
      const ox = Math.abs(a.x - b.x) < (a.w + b.w) * 0.5 - 4;
      const oy = Math.abs(a.y - b.y) < (a.h + b.h) * 0.5 - 2;
      if (ox && oy) {
        const dir = a.x >= b.x ? 1 : -1;
        a.x += dir * 18;
        if (Math.abs(a.x - b.x) < (a.w + b.w) * 0.5 - 4) a.y = b.y + a.h + 6;
      }
    }
  }
  for (const p of plates) {
    p.f.plateX = p.x;
    p.f.plateY = p.y;
  }
  return plates;
}

export function drawNameplate(ctx, fighter, size, featured) {
  const nx = fighter.plateX != null ? fighter.plateX : fighter.x;
  const ny = fighter.plateY != null
    ? fighter.plateY
    : (fighter.spriteTop != null ? fighter.spriteTop : fighter.y - BODY_H * size) - 36;
  const name = String(fighter.nickname || "fighter").slice(0, 10);
  const w = PLATE_W;
  const h = PLATE_H;
  const team = CONFIG.teams[fighter.team]?.color || "#fff";
  ctx.save();
  ctx.translate(nx, ny);
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  roundedRectPath(ctx, -w / 2, -h / 2, w, h, 12);
  ctx.fillStyle = "rgba(8, 6, 10, 0.92)";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 3;
  ctx.strokeStyle = team;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 30px Fredoka, Nunito, ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.strokeText(name, 0, -8);
  ctx.fillText(name, 0, -8);
  const barW = w - 18;
  const hp = Math.max(0, fighter.hp / Math.max(1, fighter.maxHp));
  roundedRectPath(ctx, -barW / 2, 10, barW, 8, 3);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fill();
  roundedRectPath(ctx, -barW / 2, 10, Math.max(4, barW * hp), 8, 3);
  ctx.fillStyle = hp > 0.35 ? "#6fe07a" : "#f0c14a";
  if (hp <= 0.18) ctx.fillStyle = "#f06a6a";
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 11px Nunito, ui-sans-serif, sans-serif";
  ctx.fillText(formatHp(fighter.hp), 0, 14);
  if (fighter.hpCarried && (fighter.carryBadgeT || 0) > 0) {
    const bw = 108, bh = 16;
    roundedRectPath(ctx, -bw / 2, -h / 2 - 16, bw, bh, 8);
    ctx.fillStyle = "rgba(40, 28, 8, 0.92)";
    ctx.fill();
    ctx.strokeStyle = "#ffe08a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#ffe08a";
    ctx.font = "700 10px Nunito, ui-sans-serif, sans-serif";
    ctx.fillText("HP carried over", 0, -h / 2 - 8);
  }
  ctx.restore();
}

function drawKoStars(ctx, fighter, size) {
  const x = fighter.x;
  const y = (fighter.spriteTop != null ? fighter.spriteTop : fighter.y - 90 * size) + 8 * size;
  const t = fighter.stateTime || 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#ffe08a";
  ctx.strokeStyle = "#7a4e00";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const a = t * 0.08 + i * (Math.PI * 2 / 3);
    const r = 16 * size;
    star(ctx, Math.cos(a) * r, Math.sin(a) * r * 0.5, 4 * size);
  }
  ctx.restore();
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
    const b = a + Math.PI / 5;
    const fn = i === 0 ? "moveTo" : "lineTo";
    ctx[fn](x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(b) * r * 0.4, y + Math.sin(b) * r * 0.4);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function fighterContact(fighter, kind) {
  const cell = fighter._clipCell || activeClipCell(fighter);
  const pose = poseNameFor(fighter);
  const fr = cell ? cell.frame : poseFrame(fighter, pose).fr;
  if (!fr) return fighter.frameContact || { x: fighter.x + fighter.facing * 48, y: fighter.y - 55 };
  const squash = squashFor(fighter);
  const s = fighter._normS || fighter._drawS || fighterDrawScale(fighter).draw;
  return worldContact(fighter, fr, s, squash.sx, squash.sy, poseAnchorY(fighter, fr));
}

function shouldOverlaySword(fighter, cell, pose) {
  if (cell && String(cell.clipId || "").startsWith("sword_")) return false;
  if (pose && String(pose).startsWith("sword_")) return false;
  const st = fighter.state;
  return st === STATE.HURT || st === "hurt" || st === STATE.KO || st === "ko" || st === "down"
    || st === "getup" || st === "knee" || (cell && cell.clipId === "react");
}

function drawSwordOverlay(ctx, fighter, sizeInfo, squash) {
  const sw = images.swordOrnate || images.sword;
  if (!sw) return;
  const s = sizeInfo.draw;
  const sx = squash?.sx || 1;
  const sy = squash?.sy || 1;
  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.scale(fighter.facing * s * sx, s * sy);
  ctx.globalAlpha = 0.95;
  ctx.imageSmoothingEnabled = true;
  // Park the blade at the rear hip so it reads as "still armed" without floating off the sticker.
  ctx.rotate(-0.55);
  ctx.drawImage(sw, -8, -130, sw.width * 0.55, sw.height * 0.55);
  ctx.restore();
}

export { BODY_H };
