// tiny headless-Chrome driver over CDP (no npm deps)
import { spawn, execSync } from "node:child_process";
import { rmSync } from "node:fs";
export async function launch(url, { port = 9300, W = 1080, H = 1920 } = {}) {
  try { execSync(`pkill -f "remote-debugging-port=${port}" || true`, { stdio: "ignore" }); } catch {}
  const ud = `/tmp/cl-chrome-${port}`; try { rmSync(ud, { recursive: true, force: true }); } catch {}
  const chrome = spawn("/usr/bin/google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
    `--window-size=${W},${H}`, `--remote-debugging-port=${port}`, `--user-data-dir=${ud}`, "--autoplay-policy=no-user-gesture-required",
    "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--force-device-scale-factor=1", "about:blank"], { stdio: "ignore" });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let page;
  for (let i = 0; i < 80 && !page; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); page = l.find((t) => t.type === "page"); } catch {} if (!page) await sleep(150); }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pend = new Map(); const errors = []; const logs = [];
  ws.onmessage = (e) => { const m = JSON.parse(e.data);
    if (m.method === "Runtime.consoleAPICalled") { const t = (m.params.args || []).map((a) => a.value ?? a.description ?? "").join(" "); if (m.params.type === "error") errors.push(t); else logs.push(t); }
    if (m.method === "Runtime.exceptionThrown") errors.push("EXC " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, (m) => m.error ? rej(new Error(method + JSON.stringify(m.error))) : res(m.result)); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable"); await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url });
  const ev = async (expression) => { const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error("eval: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result?.value; };
  const shot = async (fmt = "png", quality) => Buffer.from((await send("Page.captureScreenshot", { format: fmt, quality, captureBeyondViewport: false })).data, "base64");
  const close = () => { try { ws.close(); } catch {} chrome.kill("SIGKILL"); };
  return { ev, shot, send, close, errors, logs, sleep };
}
