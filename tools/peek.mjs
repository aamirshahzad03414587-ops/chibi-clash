import { launch } from "./cdp.mjs";
import { writeFileSync } from "node:fs";
const url = process.argv[2], out = process.argv[3], script = process.argv[4] || "";
const b = await launch(url);
for (let i = 0; i < 60; i++) { if (await b.ev("!!(window.SF&&SF.ready)").catch(()=>false)) break; await b.sleep(200); }
await b.sleep(800);
const r = await b.ev(`(async()=>{${script}})()`);
if (r !== undefined) console.log(JSON.stringify(r).slice(0, 2000));
writeFileSync(out, await b.shot());
console.log("errors:", b.errors.slice(0, 10));
b.close(); process.exit(0);
