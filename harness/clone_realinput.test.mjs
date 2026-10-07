// harness/clone_realinput.test.mjs — REAL-INPUT verification of the clone-choreography kits.
// Unlike the prior tests (which set _specialHeldDir + called triggerSpecial directly, bypassing input.js),
// this drives GENUINE Playwright keyboard down/up through the real input layer (keydown → recordMotionInput
// → getFighterInput → dispatch). It explicitly exercises the suspected collision: the ↓↓↑ summon motion
// ends in UP (= jump), so "hold Up then press Special" must summon GROUNDED without leaping.
//
// P1 keys: down=S up=W special=L. The summon motion ↓↓↑ = S,S,W; then Special=L.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".json": "application/json", ".woff2": "font/woff2" };
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const P = (fn, ...a) => page.evaluate(fn, ...a);

const FULL = ["tobirama", "minato", "hashirama", "hiruzen", "kakashi", "itachi", "madara", "boruto", "pain"];
const LIGHT = ["sasuke", "obito"];

async function boot(char) {
  await page.goto(`${base}/index.html?harness=1&p1=${char}&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.cloneChoreo, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await P(() => window.__harness.boot());
  await sleep(350);
  await P(() => window.__harness.cloneChoreo.clear("p1"));
  await page.keyboard.press("F3");   // infinite resources (real training hotkey) so the 25-chakra summon is affordable
  await sleep(60);
}
// The user's exact case: HOLD Up, THEN press Special a few frames later. Must summon without jumping.
async function summonHoldThenSpecial() {
  const y0 = await P(() => window.__harness.p1().y);
  await page.keyboard.press("s"); await sleep(45);
  await page.keyboard.press("s"); await sleep(45);
  await page.keyboard.down("w");  await sleep(120);     // hold UP (would jump on its own)
  await page.keyboard.down("l");  await sleep(70);      // THEN Special
  await page.keyboard.up("l"); await page.keyboard.up("w");
  let staged = false, minY = y0;
  for (let i = 0; i < 16; i++) { const st = await P(() => { const s = window.__harness.p1(); const c = window.__harness.cloneChoreo.state("p1"); return { y: s.y, formation: c.formation, active: c.active, n: c.bodies ? c.bodies.length : 0, allChar: c.bodies ? c.bodies.every(b => b.sheetSource === "renderHybridFighter") : false }; }); if (st.formation || st.active) staged = true; minY = Math.min(minY, st.y); await sleep(45); }
  return { staged, jumpedPx: Math.round(y0 - minY) };
}

try {
  // ══ FULL-KIT roster: SUMMON via real "hold Up then Special" (the collision) ══
  console.log("\n── FULL-KIT: summon formation via REAL ↓↓↑ + Special (hold Up then Special) ──");
  for (const char of FULL) {
    await boot(char);
    const r = await summonHoldThenSpecial();
    check(`${char}: real ↓↓↑+Special STAGED the formation`, r.staged, `staged=${r.staged} jumpedPx=${r.jumpedPx}`);
    check(`${char}: did NOT jump (Up+Special collision handled)`, r.jumpedPx <= 20, `jumpedPx=${r.jumpedPx}`);
  }

  // ══ A concrete SELECT through real input (tobirama → Neutral = Pure Attack), PROMPTLY within the window ══
  console.log("\n── SELECT via real input (tobirama: formation → Special = Pure Attack) ──");
  await boot("tobirama");
  // stage the formation (hold Up then Special), then select IMMEDIATELY (the window is ~60 frames)
  await page.keyboard.press("s"); await sleep(45); await page.keyboard.press("s"); await sleep(45);
  await page.keyboard.down("w"); await sleep(120); await page.keyboard.down("l"); await sleep(70); await page.keyboard.up("l"); await page.keyboard.up("w");
  let staged = false; for (let i = 0; i < 8; i++) { const st = await P(() => window.__harness.cloneChoreo.state("p1")); if (st.formation || st.active) { staged = true; break; } await sleep(45); }
  await page.keyboard.press("l");  // neutral Special while staged → pick Pure Attack
  let played = false, seq = null;
  for (let i = 0; i < 16; i++) { const st = await P(() => window.__harness.cloneChoreo.state("p1")); if (st.active) { played = true; seq = st.sequence; break; } await sleep(45); }
  check("tobirama: formation staged then a neutral Special PLAYS a sequence (real input)", played, `staged=${staged} seq=${seq}`);

  // ══ LIGHT-KIT (Sasuke/Obito): direct ↓↓↑ + Special fires a move (no formation) without jumping ══
  console.log("\n── LIGHT-KIT: direct ↓↓↑ + Special (no formation overload) ──");
  for (const char of LIGHT) {
    await boot(char);
    const r = await summonHoldThenSpecial();   // for light kits this directly fires the primary move
    check(`${char}: real ↓↓↑+Special fired a clone move`, r.staged, `staged=${r.staged} jumpedPx=${r.jumpedPx}`);
    check(`${char}: did NOT jump`, r.jumpedPx <= 20, `jumpedPx=${r.jumpedPx}`);
  }

  // ══ NARUTO (his own narutoChoreography engine): real Down+Special = Uzumaki Barrage (no up → no jump) ══
  console.log("\n── NARUTO (narutoChoreography): real Down+Special = Uzumaki Barrage ──");
  await boot("naruto");
  const ny0 = await P(() => window.__harness.p1().y);
  await page.keyboard.down("s"); await sleep(40); await page.keyboard.down("l"); await sleep(70);   // Down+Special
  await page.keyboard.up("l"); await page.keyboard.up("s");
  let nActive = false, nSeq = null, nMinY = ny0;
  for (let i = 0; i < 16; i++) { const st = await P(() => { const c = window.__harness.narutoChoreo(); const s = window.__harness.p1(); return { active: c.active, seq: c.sequence, y: s.y }; }); if (st.active) { nActive = true; nSeq = st.seq; } nMinY = Math.min(nMinY, st.y); await sleep(45); }
  check("naruto: real Down+Special fired Uzumaki Barrage (choreography)", nActive, `seq=${nSeq} jumpedPx=${Math.round(ny0 - nMinY)}`);

  check("no JS errors across the whole run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { check("test crashed", false, String(e && e.stack || e)); }
finally { console.log(`\nRESULT: ${pass} pass / ${fail} fail`); await browser.close(); server.close(); process.exit(fail ? 1 : 0); }
