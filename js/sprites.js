const BASE = new URL("../assets/", import.meta.url);

export const CHARACTER_KEYS = {
  female: ["f1", "f2", "f3", "f4"],
  male: ["m1", "m2", "m3", "m4"],
};

/** Fallback: f3/f4/m3/m4 reuse a fully-drawn sheet with a hue shift. */
export const SHEET_ALIAS = {
  f1: { sheet: "f1", hue: 0 },
  f2: { sheet: "f2", hue: 0 },
  f3: { sheet: "f1", hue: 28 },
  f4: { sheet: "f2", hue: -22 },
  m1: { sheet: "m1", hue: 0 },
  m2: { sheet: "m2", hue: 0 },
  m3: { sheet: "m1", hue: 32 },
  m4: { sheet: "m2", hue: -26 },
};

export const images = {
  f1: null, f2: null, f3: null, f4: null,
  m1: null, m2: null, m3: null, m4: null,
  glove: null, sword: null, swordOrnate: null,
};

export const poseSheets = {}; // sheet key -> Image (f1,f2,m1,m2)
export const animSheets = {}; // sheet key -> multi-frame anim atlas
export let poseManifest = null;
export let clipManifest = null;
export let manifest = null;
export let spritesReady = false;

function loadImage(url) {
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  return img.decode().catch(() => new Promise((resolve, reject) => {
    if (img.complete && img.naturalWidth > 0) return resolve();
    img.onload = resolve;
    img.onerror = () => reject(new Error("failed to load " + img.src));
  })).then(() => img);
}

export async function loadSprites() {
  const res = await fetch(new URL("poses/frames.json", BASE));
  poseManifest = await res.json();
  manifest = poseManifest;

  const jobs = [];
  const stills = ["f1", "f2", "f3", "f4", "m1", "m2", "m3", "m4", "glove", "sword"];
  const FILES = {
    f1: "f1", f2: "f2", f3: "f3", f4: "f4",
    m1: "m1", m2: "m2", m3: "m3", m4: "m4",
    glove: "glove", sword: "sword", swordOrnate: "sword-ornate",
  };
  for (const key of Object.keys(FILES)) {
    jobs.push(loadImage(new URL(`${FILES[key]}.png`, BASE).href).then((img) => { images[key] = img; }));
  }
  for (const key of ["f1", "m1", "f2", "m2"]) {
    const rel = poseManifest.characters?.[key]?.file || `poses/${key}-sheet.png`;
    // file in json is "assets/poses/..." which is relative to the game root, not assets/
    const url = rel.startsWith("assets/")
      ? new URL("../" + rel, BASE)
      : new URL(rel, BASE);
    jobs.push(loadImage(url.href).then((img) => { poseSheets[key] = img; }));
  }
  // Multi-frame move strips (f2/m2; f4/m4 reuse with hue). Missing clips fall back to 16-pose sheets.
  try {
    const cres = await fetch(new URL("poses/clips.json", BASE));
    clipManifest = await cres.json();
    for (const key of Object.keys(clipManifest.characters || {})) {
      const rel = clipManifest.characters[key].file || `poses/${key}-anim.png`;
      const url = rel.startsWith("assets/")
        ? new URL("../" + rel, BASE)
        : new URL(rel, BASE);
      jobs.push(loadImage(url.href).then((img) => { animSheets[key] = img; }));
    }
  } catch (err) {
    console.warn("clips.json not loaded", err);
    clipManifest = { characters: {} };
  }

  await Promise.all(jobs);
  spritesReady = true;
  return images;
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

export function assignSprite(fighter) {
  const female = fighter.gender === "female";
  const keys = female ? CHARACTER_KEYS.female : CHARACTER_KEYS.male;
  const h = hashStr(fighter.id + fighter.gender);
  // Featured demo pair always uses the fully-drawn looks
  const nick = String(fighter.nickname || "").toLowerCase();
  if (nick === "aisha") fighter.spriteKey = "f2";
  else if (nick === "hamza") fighter.spriteKey = "m2";
  else fighter.spriteKey = keys[h % keys.length];
  const alias = SHEET_ALIAS[fighter.spriteKey] || { hue: 0 };
  fighter.spriteHue = alias.hue + ((h >>> 8) % 5 - 2) * (alias.hue ? 0 : 8);
  if (alias.hue) fighter.spriteHue = alias.hue;
  return fighter;
}

export function sheetKeyFor(fighter) {
  const key = fighter.spriteKey || (fighter.gender === "female" ? "f1" : "m1");
  return (SHEET_ALIAS[key] || { sheet: key }).sheet;
}

export function poseFrame(fighter, poseName) {
  const sheetKey = sheetKeyFor(fighter);
  const pack = poseManifest?.characters?.[sheetKey];
  const fr = pack?.frames?.[poseName] || pack?.frames?.stance_a;
  const img = poseSheets[sheetKey];
  return { img, fr, sheetKey, poseName };
}

export function spriteInfo(fighter) {
  const key = fighter.spriteKey || (fighter.gender === "female" ? "f1" : "m1");
  return {
    key,
    sheetKey: sheetKeyFor(fighter),
    img: images[key],
    hue: fighter.spriteHue || 0,
  };
}

const CLIP_FALLBACK = {
  hook: "cross",
  uppercut: "cross",
  roundhouse: "highkick",
  sword_thrust: "sword_slash",
};

export function clipFramesFor(spriteKey, clipId) {
  const alias = SHEET_ALIAS[spriteKey] || { sheet: spriteKey, hue: 0 };
  const sheetKey = alias.sheet;
  const chars = clipManifest?.characters || {};
  let frames = chars[sheetKey]?.clips?.[clipId];
  let used = clipId;
  if ((!frames || !frames.length) && CLIP_FALLBACK[clipId]) {
    used = CLIP_FALLBACK[clipId];
    frames = chars[sheetKey]?.clips?.[used];
  }
  const img = animSheets[sheetKey];
  if (!frames || !frames.length || !img) return null;
  return { img, frames, hue: alias.hue || 0, clipId: used, sheetKey };
}
