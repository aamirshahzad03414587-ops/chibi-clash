import { CONFIG, formatHp, formatTime } from "./config.js";
import { sfx } from "./audio.js";
import { fakeUser } from "./tikfinity.js";

const NAMES = [
  ["Lina", "girl"],
  ["Zaid", "boy"],
  ["Nora", "girl"],
  ["Hugo", "boy"],
  ["Mei", "girl"],
  ["Alex", ""],
];

export function setupUI({ world, adapter }) {
  const params = new URLSearchParams(location.search);
  const overlay = params.get("overlay") === "1" || params.get("overlay") === "true";
  document.body.classList.toggle("overlay", overlay);
  if (params.get("mute") === "1") sfx.setMuted(true);

  const $ = (id) => document.getElementById(id);
  const volume = $("volume");
  const mute = $("mute");
  const status = $("ws-status");
  const log = $("event-log");

  if (volume) {
    volume.value = String(Math.round(sfx.volume * 100));
    volume.addEventListener("input", () => {
      sfx.ensure();
      sfx.setVolume(Number(volume.value) / 100);
      if (sfx.volume > 0 && sfx.muted) {
        sfx.setMuted(false);
        if (mute) mute.checked = false;
      }
    });
  }
  if (mute) {
    mute.checked = sfx.muted;
    mute.addEventListener("change", () => {
      sfx.ensure();
      sfx.setMuted(mute.checked);
    });
  }

  $("btn-clear")?.addEventListener("click", () => world.clear());
  $("btn-sim-girl")?.addEventListener("click", () => simChat(world, "girl"));
  $("btn-sim-boy")?.addEventListener("click", () => simChat(world, "boy"));
  $("btn-sim-like")?.addEventListener("click", () => {
    sfx.ensure();
    const f = randomLive(world);
    const user = f ? { uniqueId: f.id, nickname: f.nickname } : fakeUser(freshName("like"));
    world.handleLiveEvent({ type: "like", user, likeCount: 2 });
  });
  $("btn-sim-follow")?.addEventListener("click", () => {
    sfx.ensure();
    world.handleLiveEvent({ type: "follow", user: fakeUser(freshName("follow")) });
  });
  $("btn-sim-gift1")?.addEventListener("click", () => simGift(world, "Rose", 1));
  $("btn-sim-gift10")?.addEventListener("click", () => simGift(world, "Roses", 10));
  $("btn-sim-gift100")?.addEventListener("click", () => simGift(world, "Galaxy", 100));
  $("btn-add-110")?.addEventListener("click", () => {
    sfx.ensure();
    world.addSimulatedViewers(110);
  });
  $("btn-end-round")?.addEventListener("click", () => world.endRound("manual"));

  document.addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (e.key === "m" || e.key === "M") {
      const muted = sfx.toggleMute();
      if (mute) mute.checked = muted;
    }
    if (e.key === "t" || e.key === "T") {
      document.body.classList.toggle("show-test");
      sfx.ensure();
    }
  });

  const unlock = () => sfx.ensure();
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });

  return {
    overlay,
    setStatus(s) {
      if (!status) return;
      status.dataset.state = s.state;
      status.textContent = s.detail;
    },
    paint() {
      const c = world.counts();
      setText("score-rose", world.scores.rose);
      setText("score-sky", world.scores.sky);
      setText("count-rose", c.rose);
      setText("count-sky", c.sky);

      const timer = $("timer");
      const label = $("timer-label");
      const left = world.roundTimeLeft();
      if (timer) {
        timer.textContent = formatTime(left);
        timer.classList.toggle("warn", world.phase === "fighting" && left <= 60);
        timer.classList.toggle("urgent", world.phase === "fighting" && left <= 15);
      }
      if (label) {
        label.textContent = world.phase === "intermission"
          ? `Next round in`
          : `Round ${world.roundIndex}`;
      }

      const ticker = $("ticker");
      if (ticker) {
        const ev = world.events[0];
        ticker.textContent = ev ? ev.text : CONFIG.subtitle;
      }

      const qCount = $("queue-count");
      const qNames = $("queue-names");
      if (qCount) qCount.textContent = `${world.queue.length}/${CONFIG.combat.queueSize}`;
      if (qNames) {
        qNames.innerHTML = world.queue
          .slice(0, 3)
          .map((s, i) => `<li><span class="nm">${i + 1}. ${escapeHtml(s.nickname)}</span></li>`)
          .join("") || `<li><span class="nm">Waiting for reserve seats…</span></li>`;
      }
      const full = $("seats-full");
      if (full) {
        const show = Boolean(world.fullMessage);
        full.hidden = !show;
        if (show) full.textContent = world.fullMessage;
      }

      const board = world.leaderboard();
      paintList("lb-hp", board.byHp, (f) => formatHp(f.hp), "stat");
      paintList("lb-kos", board.byKos, (f) => String(f.kos || 0), "ko");

      const win = $("winner");
      if (win) win.hidden = true; // canvas results board is the on-screen source of truth
      const sides = document.querySelector(".sidecards");
      const top = document.querySelector(".topbar");
      const hideHud = world.phase === "intermission" && world.winner;
      if (sides) sides.style.display = hideHud ? "none" : "";
      if (top) top.style.visibility = hideHud ? "hidden" : "";
      document.body.classList.toggle("results-on", !!hideHud);
      for (const sel of [".hint", "#hint", ".join-hint", ".howto", ".hotkey-hint"]) {
        document.querySelectorAll(sel).forEach((el) => { el.style.visibility = hideHud ? "hidden" : ""; });
      }

      if (log) {
        log.innerHTML = world.events
          .map((e) => `<li>${escapeHtml(e.text)}</li>`)
          .join("");
      }
    },
  };
}

function paintList(id, list, stat, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = (list || [])
    .map((f) => `<li><span class="nm">${escapeHtml(f.nickname)}</span><span class="${cls}">${stat(f)}</span></li>`)
    .join("") || `<li><span class="nm">—</span></li>`;
}

function reasonLine(w) {
  const parts = [w.reason];
  parts.push(`Rose ${w.roseSurvivors} vs Sky ${w.skySurvivors}`);
  return parts.join(" · ");
}

function mvpLine(w) {
  const bits = [];
  if (w.mvp) bits.push(`Top HP: ${w.mvp.nickname} (${formatHp(w.mvp.hp)})`);
  if (w.koKing && (w.koKing.kos || 0) > 0) bits.push(`Most KOs: ${w.koKing.nickname} (${w.koKing.kos})`);
  return bits.join(" · ");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function randomLive(world) {
  const live = world.liveFighters();
  return live[Math.floor(Math.random() * live.length)];
}

function freshName(prefix) {
  const [name] = NAMES[Math.floor(Math.random() * NAMES.length)];
  return `${name}${prefix ? "" : ""}${Math.floor(Math.random() * 900 + 10)}`;
}

function simChat(world, word) {
  sfx.ensure();
  const display = word === "girl" ? `Lina${Math.floor(Math.random() * 90)}` : `Zaid${Math.floor(Math.random() * 90)}`;
  world.handleLiveEvent({
    type: "chat",
    user: fakeUser(display),
    comment: word,
  });
}

function simGift(world, giftName, coins) {
  sfx.ensure();
  const f = randomLive(world);
  const user = f ? { uniqueId: f.id, nickname: f.nickname } : fakeUser(freshName());
  world.handleLiveEvent({
    type: "gift",
    user,
    giftName,
    diamonds: coins,
    repeatCount: coins === 10 ? 10 : 1,
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { CONFIG };
