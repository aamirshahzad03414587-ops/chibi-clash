// Fake TikFinity on ws://127.0.0.1:21213 (started AFTER the page, to prove reconnect/backoff), TikFinity-shaped frames,
// then a 2-minute REAL-TIME soak (normal requestAnimationFrame loop, ?overlay=1) with the auto demo on.
// needs the 'ws' package: WS_DIR=/tmp/wsenv (npm i ws)
import { launch } from "./cdp.mjs";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
const require = createRequire((process.env.WS_DIR || "/tmp/wsenv") + "/x.js");
const { WebSocketServer } = require("ws");
const SOAK = +(process.env.SOAK || 120);
const b = await launch("http://127.0.0.1:8090/?overlay=1");
for (let i = 0; i < 60; i++) { if (await b.ev("!!(window.SF&&SF.ready)").catch(() => false)) break; await b.sleep(200); }
await b.sleep(2500);   // page retries while nothing listens
const before = await b.ev("SF.tf.state + ' wait=' + SF.tf.wait");
let wss = new WebSocketServer({ host: "127.0.0.1", port: 21213 });
let client = await new Promise((r) => wss.on("connection", r));
await b.sleep(300);
const st1 = await b.ev("SF.state().ref && SF.tf.state");
const send = (o) => client.send(JSON.stringify(o));
const U = (id, nick) => ({ uniqueId: id, nickname: nick, profilePictureUrl: "" });
send({ event: "chat", data: { ...U("aisha_01", "Aisha"), comment: "girl", msgId: "m1" } });
send({ event: "chat", data: { ...U("aisha_01", "Aisha"), comment: "girl", msgId: "m1" } });     // duplicate msgId -> ignored
send({ event: "like", data: { ...U("bilal_02", "Bilal"), likeCount: 15, msgId: "m2" } });
send({ event: "follow", data: { ...U("omar_03", "Omar"), msgId: "m3" } });                    // no HP, no join
send({ event: "gift", data: { ...U("aisha_01", "Aisha"), giftName: "Rose", diamondCount: 1, repeatCount: 3, giftType: 1, repeatEnd: false, msgId: "g1" } }); // streak running
send({ event: "gift", data: { ...U("aisha_01", "Aisha"), giftName: "Rose", diamondCount: 1, repeatCount: 5, giftType: 1, repeatEnd: true, msgId: "g2" } });  // final: 5 coins
send({ event: "gift", data: { ...U("bilal_02", "Bilal"), giftName: "Doughnut", diamondCount: 30, repeatCount: 1, giftType: 2, msgId: "g3" } });              // 30 coins
send({ event: "roomUser", data: { viewerCount: 321 } });
await b.sleep(1500);
const s = await b.ev("(() => { const s = SF.state(); return { roster: s.roster, fighters: s.fighters.map(f => [f.name, f.max, f.sword, f.gender]) }; })()");
// reconnect
client.terminate(); wss.close(); await b.sleep(2500);
const mid = await b.ev("SF.tf.state");
wss = new WebSocketServer({ host: "127.0.0.1", port: 21213 });
client = await new Promise((r, j) => { wss.on("connection", r); setTimeout(() => j(new Error("no reconnect")), 20000); });
await b.sleep(300);
const after = await b.ev("SF.tf.state");
console.log(JSON.stringify({ before, st1, mid, after, s }, null, 1));
const A = s.roster.find((p) => p.id === "aisha_01"), Bl = s.roster.find((p) => p.id === "bilal_02");
const ok = A && A.coins === 5 && A.bonus === 150 && A.gender === "female" && Bl && Bl.coins === 30 && Bl.bonus === 900 && !s.roster.find((p) => p.id === "omar_03") && after === "live";
console.log(ok ? "PASS tikfinity (dedupe, streak-final only, 30 HP/coin, follow no reward, reconnect)" : "FAIL tikfinity");
// real-time soak
await b.ev("SF.sim.auto = true; 0");
const t0 = Date.now(); let worst = 0, modes = new Set(), samples = [];
while (Date.now() - t0 < SOAK * 1000) {
  await b.sleep(10000);
  const p = await b.ev("(() => { const s = SF.state(); return { r: s.round, n: s.n, alive: s.fighters.length, w: s.waiting, p: SF.perf(), idle: Math.max(0, ...s.fighters.filter(f => !f.boss).map(f => f.touch)) }; })()");
  worst = Math.max(worst, p.r === 'fight' ? p.idle : 0); modes.add(p.p.mode); samples.push([p.r, p.n, p.alive, p.w, p.p.ms]);
}
writeFileSync("/tmp/rt-soak.png", await b.shot());
console.log(JSON.stringify({ samples, worstIdle: worst, fpsModes: [...modes], errors: b.errors.slice(0, 8) }));
console.log(!b.errors.length && worst < 8 ? "PASS real-time soak" : "FAIL real-time soak");
client.terminate(); wss.close(); b.close(); process.exit(0);
