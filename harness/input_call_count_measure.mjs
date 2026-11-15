// harness/input_call_count_measure.mjs — MEASURES how many times getFighterInput() runs per fighter per
// logic frame in a REAL match (Playwright drives the actual game loop). Diagnostic for the "double buffer
// drain" bug: every call that CONSUMES advances the input buffers by one frame, so N consuming calls per
// frame shrink INPUT_BUFFER_FRAMES to ~10/N real frames.
//
// Uses input.js's trace hook (globalThis.__inputTrace) keyed by the logic-frame clock (beginInputFrame).
// Prints, per scenario and per player: calls/frame and CONSUMING calls/frame (min / max / most common),
// plus the call-site lines. Writes docs/input/call_counts_<label>.json. Usage:
//   node harness/input_call_count_measure.mjs [label]
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const LABEL = process.argv[2] || "measure";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json", ".ogg": "audio/ogg", ".webp": "image/webp" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"] });

async function frames(page, n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 30000, polling: 16 }); }

function summarize(rows) {
  const out = {};
  for (const pn of [1, 2]) {
    const byFrame = new Map();
    for (const r of rows) if (r.pn === pn) {
      const e = byFrame.get(r.frame) || { calls: 0, consumed: 0, callers: new Set() };
      e.calls++; if (r.consumed) e.consumed++; e.callers.add(r.caller); byFrame.set(r.frame, e);
    }
    const vals = [...byFrame.values()];
    const hist = k => { const h = {}; for (const v of vals) h[v[k]] = (h[v[k]] || 0) + 1; return h; };
    const callers = {}; for (const r of rows) if (r.pn === pn) callers[r.caller] = (callers[r.caller] || 0) + 1;
    out["P" + pn] = vals.length ? {
      framesSampled: vals.length,
      callsPerFrame: { min: Math.min(...vals.map(v => v.calls)), max: Math.max(...vals.map(v => v.calls)), hist: hist("calls") },
      consumingPerFrame: { min: Math.min(...vals.map(v => v.consumed)), max: Math.max(...vals.map(v => v.consumed)), hist: hist("consumed") },
      callerLines: callers,
    } : { framesSampled: 0, note: "no calls this window" };
  }
  return out;
}

async function scenario(name, { p1 = "goku", p2 = "goku", setup = null, holdKeys = [], nFrames = 40 }) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("pageerror", e => console.log("  ⚠️ pageerror:", e.message));
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 20000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await frames(page, 20);
  for (const k of holdKeys) await page.keyboard.down(k);
  // Setup runs INSIDE the page and is re-applied by an interval so stun can't decay mid-sample.
  await page.evaluate((src) => {
    window.__inputTrace = [];
    if (src) { const fn = new Function("H", src); fn(window.__harness); window.__measureTimer = setInterval(() => fn(window.__harness), 50); }
  }, setup);
  await frames(page, nFrames);
  const rows = await page.evaluate(() => { const t = window.__inputTrace; window.__inputTrace = undefined; clearInterval(window.__measureTimer); return t; });
  for (const k of holdKeys) await page.keyboard.up(k);
  await page.close();
  // Drop the first/last partially-sampled frame.
  const fs_ = [...new Set(rows.map(r => r.frame))].sort((a, b) => a - b);
  const keep = new Set(fs_.slice(1, -1));
  const res = summarize(rows.filter(r => keep.has(r.frame)));
  console.log(`\n── ${name} (${p1} vs ${p2}${holdKeys.length ? `, holding ${holdKeys.join("+")}` : ""})`);
  for (const [who, s] of Object.entries(res)) {
    if (!s.framesSampled) { console.log(`   ${who}: ${s.note}`); continue; }
    console.log(`   ${who}: calls/frame ${s.callsPerFrame.min}-${s.callsPerFrame.max} ${JSON.stringify(s.callsPerFrame.hist)} | consuming/frame ${s.consumingPerFrame.min}-${s.consumingPerFrame.max} ${JSON.stringify(s.consumingPerFrame.hist)} | game.js lines ${JSON.stringify(s.callerLines)}`);
  }
  return { name, p1, p2, holdKeys, ...res };
}

const results = [];
try {
  results.push(await scenario("NEUTRAL", {}));
  results.push(await scenario("HITSTUN (both)", { setup: "H.setHitstun(200,'p1'); H.setHitstun(200,'p2')" }));
  results.push(await scenario("BLOCKSTUN (both)", { setup: "H.setBlockstun(200,'p1'); H.setBlockstun(200,'p2')" }));
  // Reversal checks. Resources zeroed / Special held so each check reads input but cannot fire (worst case).
  results.push(await scenario("REVERSAL: Tobirama Water Flicker check, hitstun", { p1: "tobirama", setup: "H.setHitstun(200,'p1')" }));
  results.push(await scenario("REVERSAL: Tobirama Water Flicker check, hitstun, Special held, 0 chakra", { p1: "tobirama", holdKeys: ["l"], setup: "H.setHitstun(200,'p1'); H.setP1Energy && H.setP1Energy(0)" }));
  results.push(await scenario("REVERSAL: Green Arrow Extraction check, hitstun, Special held", { p1: "green_arrow", holdKeys: ["l"], setup: "H.setHitstun(200,'p1'); H.setP1Energy && H.setP1Energy(0)" }));
  results.push(await scenario("REVERSAL: Combo Breaker check, hitstun, foe combo>=3", { setup: "H.setHitstun(200,'p1'); H.setCombo('p2',5)" }));
  results.push(await scenario("REVERSAL: Sasuke Counter Swap check, blockstun, Special held", { p1: "sasuke_sensei", holdKeys: ["l"], setup: "H.setBlockstun(200,'p1'); H.setP1Energy && H.setP1Energy(0)" }));
} finally {
  await browser.close(); server.close();
}
fs.mkdirSync(path.join(ROOT, "docs", "input"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "docs", "input", `call_counts_${LABEL}.json`), JSON.stringify(results, null, 2));
console.log(`\nwrote docs/input/call_counts_${LABEL}.json`);
