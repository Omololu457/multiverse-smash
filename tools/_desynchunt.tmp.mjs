// TEMP desync hunt: a laptop page vs a CPU-throttled "phone" page, a full match with specials/ultimates, comparing
// state on every shared frame; prints the first divergence and the state timeline around it.
//   node tools/_desynchunt.tmp.mjs [p1Char] [p2Char] [throttle]
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { startLanServer } from "../net/lanServer.mjs";

const ROOT = path.resolve(".");
const [P1 = "goku", P2 = "naruto", THR = "4"] = process.argv.slice(2);
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json", ".ogg": "audio/ogg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".wav": "audio/wav" };
const fsrv = await new Promise((r) => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]), fp = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(fp, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) });
const PORT = 8799;
const relay = startLanServer({ port: PORT, relay: true, log: () => {} });
await new Promise((r) => relay.wss.once("listening", r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
async function open(label, vp) {
  const ctx = await browser.newContext({ viewport: vp }); const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log(`  [${label}] pageerror`, e.message));
  await p.goto(`http://127.0.0.1:${fsrv.address().port}/index.html?harness=1&relay=${encodeURIComponent(`ws://127.0.0.1:${PORT}`)}`, { waitUntil: "load", timeout: 180000 });
  await p.waitForFunction(() => window.__harness && window.__harness.online, null, { timeout: 120000 });
  await p.mouse.click(vp.width / 2, vp.height / 2);
  return p;
}
const host = await open("laptop", { width: 1440, height: 900 });
const join = await open("phone", { width: 844, height: 390 });
if (+THR > 1) { const c = await join.context().newCDPSession(join); await c.send("Emulation.setCPUThrottlingRate", { rate: +THR }); }
await host.evaluate(() => window.__harness.online.hostStart());
await host.waitForFunction(() => ["waiting", "ready"].includes(window.__harness.online.status()), null, { timeout: 20000 });
await join.evaluate((u) => window.__harness.online.join(u), `ws://127.0.0.1:${PORT}`);
await host.waitForFunction(() => window.__harness.online.status() === "ready", null, { timeout: 20000 });
await sleep(1500);
await host.evaluate(([a, b]) => window.__harness.online.hostStartMatch(a, b, null), [P1, P2]);
await join.waitForFunction(() => window.__harness.online.isActive(), null, { timeout: 20000 });
console.log("delay", await host.evaluate(() => window.__harness.online.inputDelay()), await join.evaluate(() => window.__harness.online.inputDelay()));

const HS = new Map(), JS = new Map(), timeline = { h: [], j: [] };
const seqH = ["d", "j", "j", "k", "l", "s", "l", "u", "i", "o", "p", ";"], seqJ = ["a", "j", "k", "l", "w", "l", "u", "k", "i", ";", "o"];
const t0 = Date.now(); let firstBad = null, endedH = false, endedJ = false;
for (let i = 0; Date.now() - t0 < +(process.env.SECS || 240) * 1000 && !(endedH && endedJ); i++) {
  const kh = seqH[i % seqH.length], kj = seqJ[(i * 7) % seqJ.length];
  await Promise.all([host.keyboard.down(kh), join.keyboard.down(kj)]);
  await sleep(40);
  await Promise.all([host.keyboard.up(kh), join.keyboard.up(kj)]);
  if (i % 5 === 0) { await host.keyboard.down("d"); await join.keyboard.down("a"); await sleep(150); await host.keyboard.up("d"); await join.keyboard.up("a"); }
  const [a, b] = await Promise.all([host, join].map((p) => p.evaluate(() => ({ s: window.__harness.online.syncProbe2(), g: window.__harness.online.state(), act: window.__harness.online.isActive() })).catch(() => null)));
  if (a?.s) { HS.set(a.s.frame + ":" + a.s.round, a.s); if (timeline.h.at(-1)?.g !== a.s.g) timeline.h.push({ g: a.s.g, fr: a.s.frame, rd: a.s.round, t: Date.now() - t0 }) }
  if (b?.s) { JS.set(b.s.frame + ":" + b.s.round, b.s); if (timeline.j.at(-1)?.g !== b.s.g) timeline.j.push({ g: b.s.g, fr: b.s.frame, rd: b.s.round, t: Date.now() - t0 }) }
  if (a && !a.act && a.g !== "battle") endedH = endedH || /victory|matchEnd|start/i.test(a.g);
  if (b && !b.act && b.g !== "battle") endedJ = endedJ || /victory|matchEnd|start/i.test(b.g);
  if (!firstBad) for (const [k, s] of HS) { const o = JS.get(k); if (o && JSON.stringify(o.f) !== JSON.stringify(s.f)) { firstBad = { k, h: s, j: o }; break } }
  if (i % 50 === 0) console.log(`t=${Math.round((Date.now() - t0) / 1000)}s host ${a?.s?.g} f${a?.s?.frame} r${a?.s?.round} hp${a?.s?.f?.map((x) => x[2])} | phone ${b?.s?.g} f${b?.s?.frame} r${b?.s?.round} hp${b?.s?.f?.map((x) => x[2])} | lag ${(a?.s?.frame ?? 0) - (b?.s?.frame ?? 0)}f`);
}
let shared = 0, bad = 0;
for (const [k, s] of HS) { const o = JS.get(k); if (!o) continue; shared++; if (JSON.stringify(o.f) !== JSON.stringify(s.f)) bad++ }
console.log("shared", shared, "mismatched", bad);
if (firstBad) console.log("FIRST DIVERGENCE", JSON.stringify(firstBad));
console.log("timeline host ", JSON.stringify(timeline.h));
console.log("timeline phone", JSON.stringify(timeline.j));
const st = await Promise.all([host, join].map((p) => p.evaluate(() => window.__harness.online.netStats()).catch(() => null)));
console.log("netStats", JSON.stringify(st));
await browser.close(); fsrv.close(); await relay.close(); process.exit(0);
