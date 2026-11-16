// Real-time frame-rate probe: 30 fighters in the split arenas, 5 s of rAF timing (headless software rendering).
import { launch } from "./cdp.mjs";
const b = await launch("http://127.0.0.1:8090/?notikfinity=1&overlay=1" + (process.argv[2] || ""));
for (let i = 0; i < 60; i++) { if (await b.ev("!!(window.SF&&SF.ready)").catch(() => false)) break; await b.sleep(200); }
const r = await b.ev(`(async () => {
  for (let i = 0; i < 40; i++) SF.event({ type: 'chat', id: 'p' + i, nick: 'player_' + i, text: i % 2 ? 'girl' : 'boy' });
  await new Promise((r) => setTimeout(r, 1500));
  const t = []; let last = performance.now(); const end = last + 5000;
  await new Promise((res) => { const f = (now) => { t.push(now - last); last = now; if (now < end) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  t.sort((a, b) => a - b); const s = SF.state();
  return { frames: t.length, fps: +(t.length / 5).toFixed(1), median: +t[t.length >> 1].toFixed(1), p95: +t[Math.floor(t.length * 0.95)].toFixed(1), alive: s.fighters.length, split: s.split };
})()`);
console.log(JSON.stringify(r), "errors:", b.errors.slice(0, 3));
b.close(); process.exit(0);
