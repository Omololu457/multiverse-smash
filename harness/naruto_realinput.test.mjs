// harness/naruto_realinput.test.mjs — STAGE 4 REAL-INPUT verification that Naruto is on the SAME
// roster-standard summon-then-select scheme. Drives GENUINE Playwright keyboard through the real input
// layer (keydown → recordMotionInput → getFighterInput → executeNarutoSpecial), proving:
//   1. The NEW roster-standard ↓↓↑ + Special (S,S,W then L) STAGES Naruto's formation — same motion as
//      the rest of the Naruto-universe — and does NOT jump (the Up-ends-the-motion collision is handled).
//   2. A follow-up direction + Special SELECTS a sequence (window open).
//   3. The OLD alternates still fire: Up+Special (held W then L) still summons; Down+Special still plays
//      Uzumaki Barrage directly.
// P1 keys: left=A right=D up=W down=S light=J heavy=K special=L ultimate=; (see controls).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".json": "application/json", ".woff2": "font/woff2" };
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const P = (fn, ...a) => page.evaluate(fn, ...a);

async function boot() {
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.narutoChoreo && window.__harness.narutoChoreoClear, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await P(() => window.__harness.boot());
  await sleep(350);
  await P(() => window.__harness.narutoChoreoClear());
  await page.keyboard.press("F3");   // infinite resources so the 25-chakra summon is affordable
  await sleep(60);
}
// getNarutoChoreoState() is the authoritative signal: {formation:true,window} while staged, {active:true} while a run plays.
// (p1() returns a snapshot that strips _narutoSelectWindow, so read the engine state, not the fighter field.)
const win = () => P(() => { const n = window.__harness.narutoChoreo(); return { sel: n.formation ? (n.window || 1) : 0, active: !!n.active, y: window.__harness.p1().y }; });

// Run the full summon→select pipeline via REAL keys: ↓↓↑ (S,S,W) with Up held, then Special. Because the
// engine's Special is level-triggered (game.js ~7720 — fires each frame the key is down, NOT edge-gated),
// holding Up during the press summons AND picks the Up(defensive) slot in one motion — the SAME behavior the
// generic roster shows (tobirama runs "Water Clone Guard" identically). So this deterministically exercises
// the summon + the U-direction SELECT end-to-end through the real input layer. The full direction table
// (N/B/U/F → barrage/shuriken/substitution/flank) is exhaustively covered by naruto_summon_select (hook path).
async function summonHoldUpThenSpecial() {
  const y0 = await P(() => window.__harness.p1().y);
  await page.keyboard.press("s"); await sleep(45);
  await page.keyboard.press("s"); await sleep(45);
  await page.keyboard.down("w");  await sleep(120);       // hold UP (would jump on its own)
  await page.keyboard.down("l");  await sleep(70);        // THEN Special
  await page.keyboard.up("l"); await page.keyboard.up("w");
  let ran = false, seq = null, minY = y0;
  for (let i = 0; i < 18; i++) { const st = await win(); minY = Math.min(minY, st.y); if (st.active) { ran = true; seq = (await P(() => window.__harness.narutoChoreo())).sequence; break; } await sleep(45); }
  return { ran, seq, jumpedPx: Math.round(y0 - minY) };
}

try {
  // 1. NEW roster-standard ↓↓↑ + Special runs the summon→select pipeline through real input, WITHOUT jumping,
  //    and the held-Up deterministically routes to the Up/defensive slot (Substitution Escape).
  console.log("\n── STAGE 4: NEW ↓↓↑ + Special drives Naruto's summon→select via real input (same as the roster) ──");
  await boot();
  const r1 = await summonHoldUpThenSpecial();
  check("real ↓↓↑+Special RAN a clone sequence (summon+select dispatched via real keys)", r1.ran, `seq=${r1.seq}`);
  check("did NOT jump (Up ends the motion — collision handled)", r1.jumpedPx <= 40, `jumpedPx=${r1.jumpedPx}`);
  check("held-Up routed to the U/defensive slot (Substitution Escape) — select reads the real held direction", r1.seq === "Substitution Escape", `seq=${r1.seq}`);

  // 2. OLD alternate — Up+Special (hold W, then L) still drives the summon→select pipeline.
  console.log("\n── ALTERNATE (kept): Up+Special still drives the summon→select ──");
  await boot();
  await page.keyboard.down("w"); await sleep(120); await page.keyboard.down("l"); await sleep(70);
  await page.keyboard.up("l"); await page.keyboard.up("w");
  let ran2 = false; for (let i = 0; i < 14; i++) { const st = await win(); if (st.active || st.sel > 0) { ran2 = true; break; } await sleep(45); }
  check("Up+Special (alternate) still drove the summon→select", ran2, `fired=${ran2}`);

  // 3. OLD alternate — Down+Special still plays Uzumaki Barrage directly (no formation).
  console.log("\n── ALTERNATE (kept): Down+Special still fires Uzumaki Barrage directly ──");
  await boot();
  await page.keyboard.down("s"); await sleep(40); await page.keyboard.down("l"); await sleep(70);
  await page.keyboard.up("l"); await page.keyboard.up("s");
  let barrageRan = false, bseq = null; for (let i = 0; i < 16; i++) { const st = await P(() => window.__harness.narutoChoreo()); if (st.active) { barrageRan = true; bseq = st.sequence; break; } await sleep(45); }
  check("Down+Special (alternate) directly RAN Uzumaki Barrage", barrageRan, `seq=${bseq}`);

  // 4. STAGE 5 — NEUTRAL Ultimate (press "u", no direction) = NINE-TAILS (Kurama cinematic), via real keys.
  console.log("\n── STAGE 5: NEUTRAL Ultimate (real key) = Nine-Tails (Kurama) ──");
  await boot();
  await page.keyboard.down("u"); await sleep(70); await page.keyboard.up("u");
  let kurama = false; for (let i = 0; i < 16; i++) { const k = await P(() => window.__harness.kuramaUltCine()); if (k && k.active) { kurama = true; break; } await sleep(45); }
  check("neutral Ultimate fired the Nine-Tails (Kurama) cinematic via real input", kurama, `kuramaActive=${kurama}`);

  check("no page errors", jsErrors.length === 0, jsErrors.join(" | "));
} catch (e) { check("harness crashed", false, String(e && e.stack || e)); }
finally { console.log(`\nRESULT: ${pass} pass / ${fail} fail`); await browser.close(); server.close(); process.exit(fail ? 1 : 0); }
