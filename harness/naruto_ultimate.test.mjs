// harness/naruto_ultimate.test.mjs — Naruto's Ultimate (STAGE 5, 2026-10-07).
// Verifies: NEUTRAL Ultimate = NINE-TAILS (Kurama Avatar / Tailed Beast Bomb cinematic — NOT the clone
// choreography); DOWN + Ultimate = the SAME Nine-Tails, kept as the explicit alternate. Uzumaki Two Thousand
// Combo was MOVED to the summon→Ultimate (swarm) slot: pressing Ultimate while a clone formation is staged
// fires it. Nothing deleted — the Two Thousand Combo sequence still runs, just from the swarm slot. Uzumaki
// Barrage (Down+Special) is unaffected.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const P = (fn, ...a) => page.evaluate(fn, ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const boot = async () => { await page.waitForFunction(() => !!window.__harness && !!window.__harness.narutoUltimate, null, { timeout: 15000 }); await page.mouse.click(640, 360); await P(() => window.__harness.boot()); };
const clear = () => P(() => window.__harness.narutoChoreoClear());
const pollActive = async () => { for (let i = 0; i < 12; i++) { const st = await P(() => window.__harness.narutoChoreo()); if (st.active) return st; await sleep(30); } return await P(() => window.__harness.narutoChoreo()); };

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
  await boot();
  await sleep(400);

  console.log("\n── SWARM: summon → Ultimate = Uzumaki Two Thousand Combo (the relocated TTC) ──");
  await clear();
  await P(() => window.__harness.narutoSummon()); await sleep(60);
  const swOk = await P(() => window.__harness.narutoUltimate("N"));   // Ultimate while the formation is staged → swarm
  check("Ultimate-during-formation fired", swOk === true, `ret=${swOk}`);
  const sw = await pollActive();
  check("summon → Ultimate starts the Two Thousand Combo choreography (swarm slot)", sw.active === true && sw.sequence === "Two Thousand Combo", JSON.stringify({ active: sw.active, seq: sw.sequence }));
  check("its clone bodies render as Naruto", sw.bodies && sw.bodies.length >= 1 && sw.bodies.every(b => b.rosterKey === "naruto"), `n=${sw.bodies?.length}`);
  await sleep(900);

  console.log("\n── Uzumaki Barrage direct (Down+Special) still works ──");
  await clear();
  const bOk = await P(() => window.__harness.narutoBarrage());
  const bst = await pollActive();
  check("Uzumaki Barrage direct (Down+Special) still fires it", bOk === true && bst.sequence === "Uzumaki Barrage", `seq=${bst.sequence}`);
  await sleep(900);

  // Kurama is a multi-second cinematic — run these LAST so they can't block the choreography checks above.
  console.log("\n── NEUTRAL Ultimate → NINE-TAILS (Kurama Avatar, NOT the choreography) ──");
  await clear();
  const nOk = await P(() => window.__harness.narutoUltimate("N"));
  check("neutral Ultimate fired", nOk === true, `ret=${nOk}`);
  let neutralChoreo = false;
  for (let i = 0; i < 12; i++) { const s = await P(() => window.__harness.narutoChoreo()); if (s.active) { neutralChoreo = true; break; } await sleep(30); }
  check("neutral Ultimate is the Nine-Tails cinematic, NOT the clone choreography", neutralChoreo === false, "");
  await sleep(900);

  console.log("\n── DOWN + Ultimate → Nine-Tails (kept as the alternate) ──");
  await clear();
  const dOk = await P(() => window.__harness.narutoUltimate("D"));
  check("Down+Ultimate (alternate) fired", dOk === true, `ret=${dOk}`);
  let downChoreo = false;
  for (let i = 0; i < 12; i++) { const s = await P(() => window.__harness.narutoChoreo()); if (s.active) { downChoreo = true; break; } await sleep(30); }
  check("Down+Ultimate (alternate) is the Nine-Tails cinematic, NOT the choreography", downChoreo === false, "");

  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("test crashed", false, String(e && e.stack || e));
} finally {
  console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
