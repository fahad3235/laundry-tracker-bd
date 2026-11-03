// Headless-Chrome smoke test via raw CDP against stock headless_shell.
// Run: node tests/smoke.mjs  (from the project dir)
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, "..");
const CHROME = process.env.HOME + "/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell";
const PORT = 9333;
const PAGE = "file://" + ROOT + "/index.html?asof=2026-11-03";

let passed = 0, failed = 0;
function check(name, cond, extra = "") {
  if (cond) { passed++; console.log("ok - " + name); }
  else { failed++; console.log("FAIL - " + name + " " + extra); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Minimal CDP client over websocket using built-in WebSocket (node >=22).
async function main() {
  const proc = spawn(CHROME, [`--remote-debugging-port=${PORT}`, "--no-sandbox", "--disable-gpu", "about:blank"],
    { stdio: "ignore", detached: true });
  try {
    let targets = null;
    for (let i = 0; i < 50 && !targets; i++) {
      await sleep(200);
      try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { /* retry */ }
    }
    check("chrome DevTools endpoint up", !!targets?.webSocketDebuggerUrl);
    if (!targets?.webSocketDebuggerUrl) return;
    const ws = new WebSocket(targets.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    let seq = 0; const pending = new Map();
    const consoleLog = []; const pageErrors = [];
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
      if (d.method === "Runtime.consoleAPICalled") consoleLog.push(d.params);
      if (d.method === "Runtime.exceptionThrown") pageErrors.push(d.params.exceptionDetails?.exception?.description || "exception");
      if (d.method === "Log.entryAdded") pageErrors.push(d.params.entry.text);
    };
    const send = (method, params = {}, sessionId) => new Promise((res) => {
      const id = ++seq; pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
    const t = await send("Target.createTarget", { url: PAGE });
    check("target created", !!t.result?.targetId, JSON.stringify(t));
    const tid = t.result.targetId;
    const s = await send("Target.attachToTarget", { targetId: tid, flatten: true });
    const sid = s.result?.sessionId;
    await send("Runtime.enable", {}, sid);
    await send("Page.enable", {}, sid);
    await send("Log.enable", {}, sid);
    await sleep(1500);
    const ev = async (expr) => {
      const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true }, sid);
      return r.result?.result?.value;
    };
    check("title", (await ev("document.title")) === "Laundry Tracker BD");
    check("heading renders", (await ev("document.querySelector('h1').textContent")) === "Laundry Tracker BD");
    check("4 stat boxes", (await ev("document.querySelectorAll('.stat').length")) === 4);
    check("empty state shown", (await ev("document.querySelector('#bundleList').textContent.includes('No bundles yet')")) === true);
    check("no page errors on load", pageErrors.length === 0, JSON.stringify(pageErrors));
    // Fill + submit a bundle: 3 shirts + 2 pants, cost 450, given 2026-11-01 pickup 2026-11-03 (due today at asof)
    await ev(`document.querySelector('#shop').value='Dhaka Laundry';
      document.querySelector('#givenDate').value='2026-11-01';
      document.querySelector('#pickupDate').value='2026-11-03';
      document.querySelector('#cost').value='450';
      document.querySelector('input[data-cat="shirt"]').value='3';
      document.querySelector('input[data-cat="pant"]').value='2';
      document.querySelector('#bundleForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));`);
    await sleep(400);
    check("bundle card appears", (await ev("document.querySelectorAll('#bundleList .card').length")) === 1);
    check("card shows shop + 5 items", (await ev("document.querySelector('#bundleList .card').textContent")).includes("Dhaka Laundry") &&
      (await ev("document.querySelector('#bundleList .card').textContent")).includes("5"));
    check("dashboard pending=1, items=5", (await ev("document.querySelector('#statPending').textContent")) === "1" &&
      (await ev("document.querySelector('#statItems').textContent")) === "5");
    check("due-today badge at asof", (await ev("document.querySelector('#bundleList .card').textContent")).includes("Due today"));
    await send("Page.reload", {}, sid); await sleep(1200);
    check("persistence across reload", (await ev("document.querySelectorAll('#bundleList .card').length")) === 1);
    // BN toggle
    await ev("document.querySelector('#langBtn').click();"); await sleep(300);
    check("BN toggle changes heading text", (await ev("document.querySelector('[data-i18n=\"dashboard\"]').textContent")) === "ড্যাশবোর্ড");
    check("BN digits on pending stat", (await ev("document.querySelector('#statPending').textContent")) === "১");
    // Validation: empty shop
    await ev(`localStorage.clear(); location.reload();`); await sleep(1200);
    await ev(`document.querySelector('#shop').value='';
      document.querySelector('#cost').value='10';
      document.querySelector('input[data-cat="shirt"]').value='1';
      document.querySelector('#bundleForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));`);
    await sleep(300);
    check("empty shop rejected inline", (await ev("document.querySelector('#formMsg').textContent")).length > 0 &&
      (await ev("document.querySelectorAll('#bundleList .card').length")) === 0);
    // 390px no horizontal overflow
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, sid);
    await sleep(500);
    check("390px no overflow", (await ev("document.documentElement.scrollWidth <= 390")) === true,
      "scrollWidth=" + (await ev("document.documentElement.scrollWidth")));
    check("no page errors overall", pageErrors.length === 0, JSON.stringify(pageErrors));
    ws.close();
  } finally {
    try { process.kill(-proc.pid, "SIGKILL"); } catch { /* already dead */ }
  }
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error("smoke harness error:", e); process.exit(2); });
