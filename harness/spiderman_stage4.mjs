// harness/spiderman_stage4.mjs — STAGE 4: Spider-Man ULTIMATE "Maximum Web".
// An INLINE freeze-cinematic on the LIVE fighter (no duplicate instance): triggerUltimate → executeSpidermanUltimate
// spends 100 web-fluid, holds the fanning web-net cast pose (spiderWebBridge), _maxWebTimer drives the
// screen-space web-net cinematic overlay (drawSpidermanMaxWebCinematic actually renders), and a guaranteed
// scaled payoff (~204 EFF) PINS the opponent on the strike beat. Screenshot mid-cinematic → harness/shots/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function setupAdjacent(gap = 70) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.42);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=spiderman`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  console.log("\n── ultimate declared (data contract) ──");
  const def = await page.evaluate(() => window.__harness.charDef("spiderman"));
  check("ultimate declared: Maximum Web", def?.ultimate?.name === "Maximum Web", `name=${def?.ultimate?.name}`);
  check("ultimate cost = 100", def?.ultimate?.cost === 100, `cost=${def?.ultimate?.cost}`);

  console.log("\n── fire the ultimate (inline freeze-cinematic, no dup instance) ──");
  await setupAdjacent(70); await waitGrounded();
  const en0 = (await p1()).energy, hp0 = (await p2()).health;
  const ult = await page.evaluate(() => window.__harness.p1Ultimate());
  await waitFrames(2);
  const probe0 = await page.evaluate(() => window.__harness.spidermanMaxWeb());
  check("ultimate fires (triggerUltimate → cast)", !!ult?.cast, `cast=${ult?.cast}`);
  check("held cast pose = spiderWebBridge (fanning web-net)", ult?.castMove === "spiderWebBridge" || probe0.castMove === "spiderWebBridge", `castMove=${ult?.castMove}/${probe0.castMove}`);
  check("spends 100 web-fluid", en0 - (await p1()).energy >= 98 && en0 - (await p1()).energy <= 102, `energy ${en0} → ${(await p1()).energy}`);
  check("Maximum Web cinematic timer engaged (~84)", probe0.timer > 60, `timer=${probe0.timer}/${probe0.max}`);
  check("web-net FX sheet loaded", probe0.bgLoaded, `bgLoaded=${probe0.bgLoaded}`);

  // mid-cinematic: overlay is actively rendering — capture the growing web-net over the foe
  await waitFrames(24);
  const probeMid = await page.evaluate(() => window.__harness.spidermanMaxWeb());
  await page.screenshot({ path: path.join(OUT, "spiderman_s4_maxweb.png") });
  check("cinematic OVERLAY actually renders (drawSpidermanMaxWebCinematic ran)", probeMid.renders > 0, `renders=${probeMid.renders}`);
  check("live fighter still holds the cast pose through the cinematic", probeMid.castMove === "spiderWebBridge", `castMove=${probeMid.castMove}`);

  // payoff: guaranteed scaled damage (~204 EFF) lands on the pinned opponent
  await waitFrames(50);
  const hp1 = (await p2()).health;
  check("guaranteed payoff lands (~204 EFF, big scaled nuke)", (hp0 - hp1) >= 150, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);

  console.log("\n── still exactly one Spider-Man (no duplicate cinematic instance) ──");
  const stillSpidey = (await p1()).key === "spiderman";
  check("P1 is still the LIVE Spider-Man (inline cinematic, no dup fighter)", stillSpidey, `key=${(await p1()).key}`);

  await waitFrames(30);
  const probeEnd = await page.evaluate(() => window.__harness.spidermanMaxWeb());
  check("cinematic ends cleanly (timer expired)", probeEnd.timer === 0, `timer=${probeEnd.timer}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Spider-Man Stage 4 (Maximum Web ultimate): ${PASS} passed, ${FAIL} failed — shot in harness/shots/spiderman_s4_maxweb.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
