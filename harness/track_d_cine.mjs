// harness/track_d_cine.mjs — LIVE verification for Track D (transform cinematics): Zaraki's Shikai unseal
// (Up+Special) and Kurapika's Emperor Time (Ultimate) now play a short (~1s) form-activation freeze BEAT
// before the form applies (buildup → POP at the RESOLVE beat), mirroring Piccolo/Bardock. Proves per char:
//   • the beat FIRES (form-activation cinematic active, correct key)
//   • the form is NOT applied until the RESOLVE beat (buildup, not instant)
//   • the beat AUTO-ENDS within a bounded window (no permanent freeze / softlock)
//   • it CANNOT be spam-stacked (re-trigger while transforming / transformed does not start a 2nd beat,
//     and the resource is spent exactly ONCE) — the anti-freeze-lock guarantee.
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
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const cine = () => page.evaluate(() => window.__harness.formCine());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function boot(pc) {
  await page.goto(`${base}/index.html?harness=1&p1=${pc}&p2=ichigo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!(window.__harness && window.__harness.formCine), null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "easy" }); window.__harness.skipToBattle(); });
  await waitFrames(6); await waitGrounded();
}
async function waitForm(key, maxF = 110) { for (let i = 0; i < maxF; i++) { const f = await p1(); if (key === "shikai" ? f.shikaiActive : f.emperorActive) return true; await waitFrames(1); } return false; }
async function waitBeatEnd(maxF = 110) { for (let i = 0; i < maxF; i++) { if (!(await cine()).active) return true; await waitFrames(1); } return false; }

try {
  // ══ D1 — ZARAKI SHIKAI (Up+Special) ═══════════════════════════════════════════════════════════════
  await boot("zaraki");
  await page.evaluate(() => window.__harness.setEnergy(200));
  await page.keyboard.down("w"); await page.keyboard.down("l"); await waitFrames(3);
  await page.keyboard.up("l"); await page.keyboard.up("w"); await waitFrames(2);
  const zBeat = await cine(); const zDuring = await p1();
  check("D1 Up+Special fires the Shikai unsealing beat", zBeat.active === true && zBeat.key === "zarakiShikai", JSON.stringify(zBeat));
  check("D1 form is NOT applied yet (buildup, not instant)", zDuring.shikaiActive !== true, `shikai=${zDuring.shikaiActive} phase=${zBeat.phase}`);
  // freeze proof: across the next several frames the beat is active AND the form still hasn't applied
  let frozenOk = true; for (let i = 0; i < 6; i++) { const c = await cine(); const f = await p1(); if (c.active && f.shikaiActive) frozenOk = false; await waitFrames(1); }
  check("D1 combat frozen through the beat (form withheld until resolve)", frozenOk, "");
  await page.screenshot({ path: path.join(OUT, "TRACKD_zaraki_shikai_beat.png"), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  const zResolved = await waitForm("shikai");
  const zAfter = await p1();
  check("D1 Shikai APPLIES at the resolve beat (buff ×1.2)", zResolved && zAfter.shikaiActive === true && Math.abs((zAfter.damageMult ?? zAfter.damageMultiplier ?? 1) - 1.2) < 0.01, `active=${zAfter.shikaiActive}`);
  check("D1 the beat AUTO-ENDS (no permanent freeze / softlock)", await waitBeatEnd(), "beat still active");
  // (the exact 60-reiatsu entry cost is measured deterministically in the canonical test:zaraki suite;
  //  here we prove the beat can't be re-entered — the anti-spam check below.)
  // anti-spam: while transformed, hammer Up+Special — it must NOT open a 2nd unseal beat (guarded by _shikaiActive)
  let secondBeat = false;
  for (let k = 0; k < 4; k++) { await page.keyboard.down("w"); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("w"); const c = await cine(); if (c.active && c.key === "zarakiShikai") secondBeat = true; await waitFrames(2); }
  check("D1 anti-spam: re-pressing Up+Special while in Shikai opens NO second beat", secondBeat === false, "");

  // ══ D2 — KURAPIKA EMPEROR TIME (Ultimate) ═════════════════════════════════════════════════════════
  await boot("kurapika");
  await page.evaluate(() => window.__harness.fillEnergy());
  const kE0 = (await p1()).energy;
  const ult = await page.evaluate(() => window.__harness.p1Ultimate()); await waitFrames(2);
  const kBeat = await cine(); const kDuring = await p1();
  check("D2 Ultimate fires the Emperor Time eye-ignite beat", kBeat.active === true && kBeat.key === "kurapikaEmperor", JSON.stringify(kBeat));
  check("D2 form is NOT applied yet (buildup, not instant)", kDuring.emperorActive !== true, `emperor=${kDuring.emperorActive} phase=${kBeat.phase}`);
  let kFrozenOk = true; for (let i = 0; i < 6; i++) { const c = await cine(); const f = await p1(); if (c.active && f.emperorActive) kFrozenOk = false; await waitFrames(1); }
  check("D2 combat frozen through the beat (form withheld until resolve)", kFrozenOk, "");
  await page.screenshot({ path: path.join(OUT, "TRACKD_kurapika_emperor_beat.png"), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  const kResolved = await waitForm("emperor");
  const kAfter = await p1();
  check("D2 Emperor Time APPLIES at the resolve beat (buff ×1.30)", kResolved && kAfter.emperorActive === true && Math.abs((kAfter.damageMultiplier || 1) - 1.30) < 0.01, `active=${kAfter.emperorActive} mult=${kAfter.damageMultiplier}`);
  check("D2 the beat AUTO-ENDS (no permanent freeze / softlock)", await waitBeatEnd(), "beat still active");
  check("D2 Nen spent exactly ONCE (~100)", Math.abs((kE0 - kAfter.energy) - 100) < 5, `spent=${(kE0 - kAfter.energy).toFixed(1)} cast=${!!ult?.cast}`);
  // anti-spam: hammer the Ultimate again while transformed — guarded by _emperorActive (+ ult cooldown) → no 2nd beat
  let kSecondBeat = false;
  for (let k = 0; k < 4; k++) { await page.evaluate(() => window.__harness.p1Ultimate()); await waitFrames(2); const c = await cine(); if (c.active && c.key === "kurapikaEmperor") kSecondBeat = true; await waitFrames(2); }
  check("D2 anti-spam: re-pressing Ultimate while in Emperor Time opens NO second beat", kSecondBeat === false, "");

  check("no JS errors during Track D live run", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "));
} catch (e) {
  check("harness completed without throwing", false, String(e));
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
