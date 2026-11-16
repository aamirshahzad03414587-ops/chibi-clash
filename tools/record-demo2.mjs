// Demo 2: split arenas (A top / B bottom) -> KO + refill -> gift swords -> merge into the FINAL ARENA -> results.
// Deterministic: the game clock is stepped 1/30 s per frame (?manual); the game's sound log is rendered offline.
// To keep the clip ~30 s: 20 seats instead of 30 (so 3 of 23 wait and refill), and extra KOs are forced (SF.knockOut)
// in the smaller arena once the reserved queue is empty, so the merge comes sooner.
import { launch } from "./cdp.mjs";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
const FR = "/tmp/cl-frames2", OUT = "/workspace/clash-live-demo2.mp4", MAXF = +(process.env.MAXF || 1100);
rmSync(FR, { recursive: true, force: true }); mkdirSync(FR, { recursive: true });
mkdirSync("/workspace/clash-live/docs", { recursive: true });
const b = await launch("http://127.0.0.1:8090/?manual=1&round=20&rush=7&boss=999");
for (let i = 0; i < 60; i++) { if (await b.ev("!!(window.SF&&SF.ready)").catch(() => false)) break; await b.sleep(200); }
await b.ev("SF.soundsReady()");
const BASE = ['Ayesha_k', 'Bilal786', 'Hira22', 'KingSaad', 'Noor.ae', 'Usman_7', 'LunaStar', 'ShadowAce', 'Sana.art', 'Faisal_FC', 'ZaraKhan', 'Raza_Gaming', 'Fatima_09', 'DarkKnight', 'SilverGirl', 'Hamza.x', 'Mustafa_x', 'GamerUAE', 'Ali_99', 'ninja_pk', 'Maryam.k', 'Omar_7', 'Zoya22'];
const PROTECT = ['Hira22', 'KingSaad'];
const script = {
  0: `S.game.maxFighters = 20; ${JSON.stringify(BASE)}.forEach((n, i) => SF.event({ type: i % 3 === 2 ? 'like' : 'chat', id: 'd' + i, nick: n, text: i % 2 ? 'boy' : 'girl', count: 1 }))`,
  130: `SF.event({ type: 'gift', id: 'd2', nick: 'Hira22', giftName: 'Doughnut', coins: 10, count: 1 })`,
  175: `SF.event({ type: 'gift', id: 'd3', nick: 'KingSaad', giftName: 'Hat', coins: 100, count: 1 })`,
};
let endAt = -1, n = 0, mergeAt = -1, kos = 0;
const shots = { 220: "docs/screen-split.png" };
for (let f = 0; f < MAXF; f++) {
  if (script[f]) await b.ev("(() => { " + script[f] + "; return 0; })()");
  if (f >= 260 && f % 18 === 0 && mergeAt < 0) {   // speed-up: extra KOs while both arenas are still up and the queue is empty
    await b.ev(`(() => { const s = SF.state(); if (s.split !== 'split' || s.waiting) return 0; const c = [0, 0]; s.fighters.forEach((x) => { if (!x.boss) c[x.ar]++; });
      const ar = c[0] <= c[1] ? 0 : 1; const v = s.fighters.filter((x) => !x.boss && x.ar === ar && !${JSON.stringify(PROTECT)}.includes(x.name) && x.inv <= 0);
      if (v.length) SF.knockOut(v[Math.floor(v.length / 2)].name); return 0; })()`);
    kos++;
  }
  const st = await b.ev(`(() => { SF.step(1, 30); const s = SF.state(); return s.round + '|' + s.split + '|' + s.final; })()`);
  const [rs, sp, fin] = st.split('|');
  const jpg = await b.shot("jpeg", 92);
  writeFileSync(`${FR}/f${String(n).padStart(5, "0")}.jpg`, jpg); n++;
  if (shots[f]) writeFileSync("/workspace/clash-live/" + shots[f], await b.shot("png"));
  if (fin === 'true' && mergeAt < 0) mergeAt = f;
  if (mergeAt >= 0 && f === mergeAt + 75) writeFileSync("/workspace/clash-live/docs/screen-final-arena.png", await b.shot("png"));
  if (rs === "end" && endAt < 0) endAt = f;
  if (endAt >= 0 && f === endAt + 70) writeFileSync("/workspace/clash-live/docs/screen-results.png", await b.shot("png"));
  if (endAt >= 0 && f >= endAt + 120) break;
}
const dur = n / 30;
const wav = await b.ev(`(async () => await SF.renderAudio(${dur}, 0))()`);
const log = await b.ev(`SF.audioLogAll().length`);
writeFileSync("/tmp/cl-audio2.wav", Buffer.from(wav, "base64"));
console.log({ frames: n, dur, mergeAt, endAt, forcedKoChecks: kos, sounds: log, errors: b.errors.slice(0, 5) });
b.close();
execSync(`ffmpeg -y -loglevel error -framerate 30 -i ${FR}/f%05d.jpg -i /tmp/cl-audio2.wav -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart ${OUT}`);
console.log(execSync(`ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration -of compact ${OUT}`).toString());
process.exit(0);
