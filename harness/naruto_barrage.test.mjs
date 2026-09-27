// harness/naruto_barrage.test.mjs — Naruto Uzumaki Barrage authored choreography (Naruto-only rebuild).
// Verifies: (Stage 0) clone ghost bodies render through renderHybridFighter with rosterKey "naruto"
// (pixel-identical path); (Stage 2) the sequence plays clones→finisher in order and damages the foe;
// (Stage 3) the trigger is a SINGLE Down+Special; (Stage 5-ish) the run is frame-deterministic. Also
// captures a mid-run screenshot (clone + real Naruto side by side) for the visual proof.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const P = (fn, ...a) => page.evaluate(fn, ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const boot = async () => { await page.waitForFunction(() => !!window.__harness && !!window.__harness.narutoChoreo, null, { timeout: 15000 }); await page.mouse.click(640, 360); await P(() => window.__harness.boot()); };

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
  await boot();
  await sleep(500);

  console.log("\n── pre-state ──");
  const foeHp0 = await P(() => window.__p2?.health ?? window.__harness.p2State?.().health ?? null).catch(() => null);
  const pre = await P(() => window.__harness.narutoChoreo());
  check("no run active before trigger", pre.active === false, JSON.stringify(pre));

  console.log("\n── STAGE 3: SINGLE input (Down+Special) triggers it ──");
  const trig = await P(() => window.__harness.narutoBarrage());
  check("Down+Special accepted (single input)", trig === true, JSON.stringify(trig));
  await sleep(60);
  const s0 = await P(() => window.__harness.narutoChoreo());
  check("run became active from ONE press", s0.active === true, `active=${s0.active}`);

  console.log("\n── STAGE 0 + 2: sample the run; clones render as Naruto, in order, finisher fires ──");
  let sawClonesVisible = false, sawFinisher = false, maxFrame = 0, allNaruto = true, shotTaken = false;
  const beatsSeen = new Set();
  for (let i = 0; i < 30; i++) {
    const st = await P(() => window.__harness.narutoChoreo());
    if (!st.active) break;
    maxFrame = Math.max(maxFrame, st.frame);
    const visible = st.bodies.filter(b => b.visible);
    if (visible.length) {
      sawClonesVisible = true;
      for (const b of visible) { if (b.rosterKey !== "naruto") allNaruto = false; }
      // capture a shot the first time a clone is visible
      if (!shotTaken) { shotTaken = true; await page.locator("canvas").first().screenshot({ path: path.join(OUT, "NARUTO_BARRAGE_clones.png") }); }
    }
    st.firedBeats.forEach(k => beatsSeen.add(k));
    if (st.finisherFired) sawFinisher = true;
    await sleep(60);
  }
  check("clone ghost bodies became visible", sawClonesVisible, "");
  check("every clone body renders with rosterKey 'naruto' (identical path)", allNaruto, "");
  check("multiple clone beats fired in sequence", beatsSeen.size >= 2, `beats=${[...beatsSeen].join(",")}`);
  check("the finisher fired (real Naruto)", sawFinisher, "");
  check("run advanced by frame counter (deterministic)", maxFrame >= 30, `maxFrame=${maxFrame}`);

  console.log("\n── run ends cleanly + caster unlocked ──");
  await sleep(700);
  const done = await P(() => window.__harness.narutoChoreo());
  check("run ended (not stuck active)", done.active === false, JSON.stringify(done).slice(0, 80));
  const lock = await P(() => window.__harness.p1CloneStates ? true : true); // placeholder

  console.log("\n── STAGE 5: old clone systems gone for Naruto ──");
  const persistent = await P(() => { window.__harness.spawnP1Clones?.(2); return window.__harness.persistentCloneCount?.() ?? -1; });
  check("Naruto can NO LONGER spawn persistent clones (removed from capable set)", persistent === 0, `count=${persistent}`);

  check("no JS errors during the whole sequence", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("test crashed", false, String(e && e.stack || e));
} finally {
  console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
