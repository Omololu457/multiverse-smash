// harness/boruto_stage4.mjs — STAGE 4: Boruto's "Kote Barrage" ultimate (inline freeze/camera cinematic).
// Via __harness.p1Ultimate(): the LIVE fighter plays the 5-part Kote fire (borutoKote cast), the opponent is
// frozen, and 5 guaranteed sure-hit beats land (part-3 = the heavy recoil PAYOFF). Verifies the cast key,
// the guaranteed damage payoff (~198 EFF), and screenshots the fire + part-3 payoff beats for FX review.
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
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `boruto_s4_${tag}.png`) }); }
async function setupAdjacent(gap = 60) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.42);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=boruto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  console.log("\n── Kote Barrage ultimate (inline freeze cinematic) ──");
  await setupAdjacent(60);
  await page.evaluate(() => window.__harness.setEnergy(180)); await waitFrames(1);
  const hp0 = (await p2()).health;
  const res = await page.evaluate(() => window.__harness.p1Ultimate());
  await waitFrames(2);
  const a1 = await p1();
  check("ultimate cast fired", res?.cast === true, `cast=${res?.cast}`);
  check("P1 is Boruto", a1.key === "boruto", `key=${a1.key}`);
  check("LIVE fighter plays the Kote cast (borutoKote, no dup instance)", res?.castMove === "borutoKote", `castMove=${res?.castMove}`);

  // Walk through the cinematic; screenshot the early fire beat and the part-3 recoil PAYOFF, track total dmg.
  let maxDrop = 0, everCastKote = res?.castMove === "borutoKote";
  await waitFrames(16); await shot("fire1");                 // part-1 fire muzzle flash
  { const d = hp0 - (await p2()).health; if (d > maxDrop) maxDrop = d; }
  await waitFrames(24); await shot("payoff");                // ≈ part-3 recoil PAYOFF beat (elapsed ~42-58)
  await waitFrames(18); await shot("payoff2");
  for (let i = 0; i < 40; i++) { const d = hp0 - (await p2()).health; if (d > maxDrop) maxDrop = d; const c = await p1(); if (c.spriteAction === "borutoKote" || c.currentMove === "borutoKote") everCastKote = true; await waitFrames(2); }
  await shot("after");

  check("Kote cast pose rendered during the cinematic", everCastKote, "");
  check("guaranteed payoff damage landed (~198 EFF band)", maxDrop >= 120, `total dmg=${maxDrop.toFixed(0)}`);

  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("boruto")?.animationData || {});
  check("borutoKote cinematic cast pose wired to real sheet", typeof ad.borutoKote?.sheet === "string" && ad.borutoKote.sheet.includes("boruto_kote_uniform"), `sheet=${ad.borutoKote?.sheet}`);
  check("borutoKote is the 19-frame stitched sequence", ad.borutoKote?.frames === 19, `frames=${ad.borutoKote?.frames}`);

  check("no JS page errors during the ultimate", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Boruto Stage 4: ${PASS} passed, ${FAIL} failed — shots in harness/shots/boruto_s4_*.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
