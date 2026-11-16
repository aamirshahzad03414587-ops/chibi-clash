import { ARENA, CONFIG, applyLayout } from "./config.js";
import { sfx } from "./audio.js";
import { TikFinityAdapter } from "./tikfinity.js";
import { World } from "./world.js";
import { setupUI } from "./ui.js";
import { loadSprites } from "./sprites.js";
import { requestAttack } from "./fighter.js";
import { beginMove, beginBlock, beginDodge, beginKo, beginHurt } from "./combat.js";

await loadSprites();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const params = new URLSearchParams(location.search);
const landscape = params.get("landscape") === "1";
applyLayout(landscape ? "landscape" : "portrait");
document.body.classList.toggle("landscape", landscape);

const world = new World(sfx);
world.setRoundTiming({
  roundSeconds: params.get("roundSeconds") || undefined,
  intermissionSeconds: params.get("intermissionSeconds") || undefined,
});

const adapter = new TikFinityAdapter({
  url: params.get("ws") || undefined,
  onEvent: (ev) => world.handleLiveEvent(ev),
  onStatus: (s) => ui.setStatus(s),
});

const ui = setupUI({ world, adapter });
adapter.start();

if (params.get("demo") === "1") {
  world.seedDemo(Number(params.get("fighters") || 10));
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resize();
window.addEventListener("resize", resize);

let acc = 0;
let last = performance.now();
const STEP = 1000 / 60;
let autostep = true;
let gameTicks = 0;
const scheduled = [];

function drawFrame() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  const scale = Math.min(w / ARENA.width, h / ARENA.height);
  const ox = (w - ARENA.width * scale) / 2;
  const oy = (h - ARENA.height * scale) / 2;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  world.draw(ctx, ARENA.width, ARENA.height);
  ctx.restore();
  ui.paint();
}

function runScheduled() {
  if (!scheduled.length) return;
  for (let i = scheduled.length - 1; i >= 0; i--) {
    if (gameTicks >= scheduled[i].tick) {
      const job = scheduled.splice(i, 1)[0];
      try { job.fn(); } catch (err) { console.error(err); }
    }
  }
}

function tickOnce() {
  world.tick();
  gameTicks += 1;
  runScheduled();
}

function frame(now) {
  if (!autostep) {
    requestAnimationFrame(frame);
    return;
  }
  const raw = Math.min(50, now - last);
  last = now;
  const speed = world.phase === "intermission" ? 1 : (world.slowMo || 1);
  acc += raw * speed;
  let ticks = 0;
  while (acc >= STEP && ticks < 5) {
    tickOnce();
    acc -= STEP;
    ticks += 1;
  }

  drawFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

function afterTicks(n, fn) {
  scheduled.push({ tick: gameTicks + Math.max(0, n), fn });
}

function stepVideoFrame(fps = 30) {
  const speed = world.phase === "intermission" ? 1 : (world.slowMo || 1);
  acc += (1000 / fps) * speed;
  let ticks = 0;
  while (acc >= STEP && ticks < 8) {
    tickOnce();
    acc -= STEP;
    ticks += 1;
  }
  if (typeof window.__chibi?.onAfterStep === "function") window.__chibi.onAfterStep();
  drawFrame();
  return { ticks, gameTicks, slowMo: world.slowMo, phase: world.phase };
}

window.__chibi = {
  world,
  adapter,
  CONFIG,
  ARENA,
  sfx,
  requestAttack,
  beginMove,
  beginBlock,
  beginDodge,
  beginKo,
  beginHurt,
  afterTicks,
  get gameTicks() { return gameTicks; },
  pause() {
    autostep = false;
    acc = 0;
  },
  resume() {
    if (autostep) return;
    autostep = true;
    last = performance.now();
    acc = 0;
  },
  stepVideoFrame,
  drawFrame,
  marks: [],
  director: world.director,
  pairs: world.pairs,
};

export { world, adapter };
