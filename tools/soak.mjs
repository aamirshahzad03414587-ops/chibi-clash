// 2-minute soak (game time, 30 fps steps) with simulated likes/comments/gifts + a boss: no console errors, no frozen fighters
import { launch } from "./cdp.mjs";
import { writeFileSync } from "node:fs";
const b = await launch("http://127.0.0.1:8090/?manual=1&round=150");
for (let i = 0; i < 60; i++) { if (await b.ev("!!(window.SF&&SF.ready)").catch(() => false)) break; await b.sleep(200); }
await b.sleep(500);
await b.ev(`for (let i = 0; i < 36; i++) SF.event({ type: 'chat', id: 'v' + i, nick: 'player_' + i, text: i % 2 ? 'girl' : 'boy' }); SF.sim.auto = true; 1`);
const samples = []; let maxIdle = 0, idleWho = '', rounds = new Set(), maxAlive = 0, bossSeen = false, frozen = 0;
const t0 = Date.now();
for (let sec = 0; sec < 240; sec++) {
  const s = await b.ev(`SF.step(30, 30); (() => { const s = SF.state(); return { r: s.round, n: s.n, alive: s.fighters.length, w: s.waiting, boss: s.fighters.some(f => f.boss), idle: s.fighters.filter(f => !f.boss).map(f => [f.name, f.touch]), time: s.time, sudden: s.sudden, king: SF.king(), perf: SF.perf().ms }; })()`);
  rounds.add(s.n); maxAlive = Math.max(maxAlive, s.alive); if (s.boss) bossSeen = true;
  if (s.r === 'fight') for (const [n, t] of s.idle) { if (t > maxIdle) { maxIdle = t; idleWho = n; } if (t > 8) frozen++; }
  if (sec % 20 === 0) samples.push({ sec, round: s.r, n: s.n, alive: s.alive, waiting: s.w, boss: s.boss, king: s.king, t: s.time });
  if (sec === 30) writeFileSync('/tmp/soak-30s.png', await b.shot());
}
console.log(JSON.stringify(samples));
console.log({ wallSec: (Date.now() - t0) / 1000, rounds: [...rounds], maxAlive, bossSeen, maxIdleSec: maxIdle, idleWho, frozenSamples: frozen, errors: b.errors.slice(0, 10) });
const ok = !b.errors.length && frozen === 0;
console.log(ok ? 'PASS soak' : 'FAIL soak');
b.close(); process.exit(ok ? 0 : 1);
