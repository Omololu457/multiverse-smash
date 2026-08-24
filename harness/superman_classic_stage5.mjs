// harness/superman_classic_stage5.mjs
// STAGE 5 evidence: Superman (New 52) ULTIMATE "Heat Vision Barrage".
//   • p1Ultimate → cast=true, spends 100 Solar Energy, LIVE fighter holds the sustained-beam pose (supClsUlt, no dup)
//   • Superman ROCKETS forward toward the frozen foe (a real dash during the cinematic — the "infinite mass" wind-up)
//   • guaranteed direct-damage payoff CONNECTS (~330 raw → ~198 EFF) — range-independent, can't whiff
//   • cinematic ends → fighter recovers. Fired deterministically via __harness.p1Ultimate.
// Screenshots → harness/shots/superman_classic_stage5_*.png.
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
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `superman_classic_stage5_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=superman_classic`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + 150); await waitFrames(2);
  const hp0 = (await p2()).health;
  const en0 = (await p1()).energy;
  const x0 = (await p1()).x;

  console.log("\n── activation (deterministic p1Ultimate → live fighter) ──");
  const r = await page.evaluate(() => window.__harness.p1Ultimate());
  check("Heat Vision Barrage fires on the LIVE fighter (cast=true)", r?.cast === true, `cast=${r?.cast} castMove=${r?.castMove}`);
  check("caster holds the sustained-beam cast pose (castMove = supClsUlt)", r?.castMove === "supClsUlt", `castMove=${r?.castMove}`);
  const en1 = (await p1()).energy;
  check("ultimate spent the 100 Solar Energy cost", (en0 - en1) >= 95, `energy ${en0} → ${en1} (−${(en0 - en1).toFixed(0)})`);

  console.log("\n── live fighter holds the REAL sustained-beam cast + 3-beat guaranteed barrage ──");
  let castSheet = false, box = false, landed = false, hpAfter = hp0;
  for (let i = 0; i < 54; i++) {
    const g = await p1(); const sh = g.spriteSheet || "";
    if (sh.includes("superman_classic_ult_uniform")) castSheet = true;
    if (!sh.includes("superman_classic_")) box = true;
    hpAfter = (await p2()).health; if (hpAfter < hp0) landed = true;
    if (i === 10) await shot("beam"); if (i === 24) await shot("payoff");
    await waitFrames(1);
  }
  check("live fighter renders the Heat Vision Barrage beam cast (no box)", castSheet && !box, `castSheet=${castSheet} box=${box}`);
  check("guaranteed barrage CONNECTS (dummy takes damage)", landed, `hp ${hp0} → ${hpAfter} (−${(hp0 - hpAfter).toFixed(0)})`);
  check("payoff is ULTIMATE-tier (≥150 effective)", (hp0 - hpAfter) >= 150, `dmg=${(hp0 - hpAfter).toFixed(0)}`);

  console.log("\n── cinematic ends → fighter recovers ──");
  await waitFrames(40); await waitGrounded();
  const gEnd = await p1();
  check("fighter recovers to a normal action after the ult", (gEnd.spriteSheet || "").includes("superman_classic_") && gEnd.hasSpriteHandler, `action=${gEnd.spriteAction} sheet=${gEnd.spriteSheet}`);

  console.log("\n── no JS errors ──");
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
