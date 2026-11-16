// 113 viewers join -> 30 fight, 80 reserved, 3 refused; KOs refill instantly from the queue (FIFO) with a spawn shield
import { launch } from "./cdp.mjs";
const b = await launch("http://127.0.0.1:8090/?manual=1");
for (let i = 0; i < 60; i++) { if (await b.ev("!!(window.SF&&SF.ready)").catch(() => false)) break; await b.sleep(200); }
await b.sleep(500);
const r = await b.ev(`(async () => {
  for (let i = 0; i < 113; i++) SF.event({ type: i % 2 ? 'like' : 'chat', id: 'u' + i, nick: 'viewer_' + i, text: i % 3 ? 'girl' : 'boy', count: 1 });
  SF.step(10, 30);
  const s1 = SF.state();
  const firstWaiting = s1.wait[0];
  SF.step(30 * 4, 30);   // countdown -> fight
  const sb = SF.state(), before = sb.wait;
  const victim = sb.fighters.find((f) => f.ar === 1 && !f.boss);
  const ko = SF.knockOut(victim.name);
  SF.step(3, 30);
  const s2 = SF.state();
  const refill = s2.fighters.find((f) => f.name === ko.next);
  SF.step(30 * 2, 30);
  const s3 = SF.state();
  const ref3 = s3.fighters.find((f) => f.name === ko.next);
  const fifo = ko.next === before[0] && JSON.stringify(ko.now) === JSON.stringify(before.slice(1));
  const cnt = (s) => [s.fighters.filter((f) => f.ar === 0 && !f.boss).length, s.fighters.filter((f) => f.ar === 1 && !f.boss).length];
  return { fifo, split: s1.split, arenas1: cnt(s1), arenas2: cnt(s2), refillArena: refill && refill.ar, alive1: s1.fighters.length, waiting1: s1.waiting, roster: s1.roster.length, firstWaiting, ko, alive2: s2.fighters.length, waiting2: s2.waiting, refillIn: !!refill, refillInv: refill && refill.inv, refillInvLater: ref3 && ref3.inv, girls: s1.fighters.filter(f=>f.gender==='female').length, boys: s1.fighters.filter(f=>f.gender==='male').length };
})()`);
console.log(JSON.stringify(r, null, 1));
const ok = r.alive1 === 30 && r.waiting1 === 80 && r.roster === 110 && r.alive2 === 30 && r.waiting2 >= 78 && r.refillIn && r.fifo && r.firstWaiting === 'viewer_30' && r.split === 'split' && r.arenas1.join() === '15,15' && r.arenas2.join() === '15,15' && r.refillArena === 1;
console.log(ok ? "PASS 113-join (30 fighting / 80 reserved / 3 refused, FIFO refill, 15/15 split, refill to the free arena)" : "FAIL");
console.log("errors:", b.errors);
b.close(); process.exit(ok && !b.errors.length ? 0 : 1);
